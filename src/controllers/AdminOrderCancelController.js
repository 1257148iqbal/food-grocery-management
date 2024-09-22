const {
    errorHandler,
    errorResponse,
    successResponse,
} = require('../helpers/apiResponse');
const {
    OrderCancel,
    getCancelObject,
    userMoneyRefund,
    getFullOrderInformation,
    createTransaction,
} = require('../helpers/orderHelper');
const Order = require('../models/OrderModel');
const Shop = require('../models/ShopModel');
const Transaction = require('../models/TransactionModel');
const User = require('../models/UserModel');
const { sendNotificationForRefundOrder } = require('./NotificationController');
const { sendPlaceOrderEmail } = require('./EmailController');
const moment = require('moment');
const short = require('short-uuid');
const { transactionForReward } = require('./RewardSettingController');
const CartModel = require('../models/CartModel');
const Product = require('../models/ProductModel');
const { checkShopCapacity } = require('../helpers/checkShopCapacity');
const FlagModel = require('../models/FlagModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const { areebaPaymentGateway } = require('../lib/areebaPaymentGateway');
const ObjectId = require('mongoose').Types.ObjectId;

exports.adminCancelOrder = async (req, res) => {
    try {
        let { orderId, cancelReasonId, otherReason } = req.body;
        const { userType } = req.query;

        if (!cancelReasonId && !otherReason) {
            return errorResponse(
                res,
                'need a cancel reason . Please give proper reason to cancel'
            );
        }

        const order = await Order.findById(orderId).populate([
            {
                path: 'cart',
            },
            {
                path: 'products',
                populate: [
                    {
                        path: 'product',
                    },
                ],
            },
        ]);
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (['delivered', 'refused', 'cancelled'].includes(order.orderStatus)) {
            return errorResponse(
                res,
                `Order has already been ${order.orderStatus}, so it cannot be canceled.`
            );
        }

        if (
            userType === 'shop' &&
            ['preparing', 'ready_to_pickup', 'order_on_the_way'].includes(
                order.orderStatus
            )
        ) {
            return errorResponse(
                res,
                `Order has already been ${order.orderStatus}, so it cannot be canceled.`
            );
        }

        await cancelOrderFunc(req, order, userType);

        const updatedOrder = await getFullOrderInformation(order._id);

        successResponse(res, {
            message: 'Order cancelled successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (err) {
        return errorHandler(res, err);
    }
};

exports.shopCancelOrder = async (req, res) => {
    try {
        const { orderId, cancelReasonId, otherReason } = req.body;

        if (!cancelReasonId && !otherReason) {
            return errorResponse(
                res,
                'need a cancel reason . Please give proper reason to cancel'
            );
        }

        const order = await Order.findById(orderId).populate([
            {
                path: 'cart',
            },
            {
                path: 'products',
                populate: [
                    {
                        path: 'product',
                    },
                ],
            },
        ]);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (
            [
                'preparing',
                'ready_to_pickup',
                'order_on_the_way',
                'delivered',
                'refused',
                'cancelled',
            ].includes(order.orderStatus)
        ) {
            return errorResponse(res, 'Action Not Approved');
        }

        await cancelOrderFunc(req, order, 'shop');

        const updatedOrder = await getFullOrderInformation(order._id);

        successResponse(res, {
            message: 'Order cancelled successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

const cancelOrderFunc = async (req, order, cancelBy) => {
    const adminId = req.adminId;
    const shopId = req.shopId;

    const {
        logUser = [], // ["rider", "shop", "user"]
        cancelReasonId,
        otherReason,
        isEndorseLoss, // true, false
        endorseLoss, // { baseCurrency_shopLoss: 11, secondaryCurrency_shopLoss: 110, baseCurrency_adminLoss: 11, secondaryCurrency_adminLoss: 110}
        inEndorseLossDeliveryFeeIncluded, // true, false
    } = req.body;

    let shopTransaction = null;
    let adminTransaction = null;

    // For Endorse Loss feature
    if (isEndorseLoss) {
        if (endorseLoss?.baseCurrency_shopLoss) {
            shopTransaction = await createTransaction({
                order,
                account: 'shop',
                type: 'shopEndorseLoss',
                amount: endorseLoss.baseCurrency_shopLoss,
                secondaryCurrency_amount:
                    endorseLoss.secondaryCurrency_shopLoss,
                adminNote: 'Shop loss money for endorse loss',
            });
        }
        if (endorseLoss?.baseCurrency_adminLoss) {
            adminTransaction = await createTransaction({
                order,
                account: 'admin',
                type: 'adminEndorseLoss',
                amount: endorseLoss.baseCurrency_adminLoss,
                secondaryCurrency_amount:
                    endorseLoss.secondaryCurrency_adminLoss,
                adminNote: 'Admin loss money for endorse loss',
            });
        }
    }

    // For add delivery fee to shop earning when self rider
    if (inEndorseLossDeliveryFeeIncluded && order.orderFor === 'specific') {
        shopTransaction = await createTransaction({
            order,
            account: 'shop',
            type: 'sellerGetDeliveryFeeFromCancelOrder',
            amount: order.summary.baseCurrency_riderFeeWithFreeDelivery,
            secondaryCurrency_amount:
                order.summary.secondaryCurrency_riderFeeWithFreeDelivery,
            adminNote: 'Shop get delivery fee for cancel order endorse loss',
        });
    }

    // For replacement order feature
    if (order.isReplacementOrder && cancelBy === 'admin') {
        if (
            order?.replacementOrderCut?.baseCurrency_shopCutForReplacement !== 0
        ) {
            await createTransaction({
                order,
                account: 'shop',
                type: 'shopGetForCancelReplacementOrder',
                amount: order.replacementOrderCut
                    .baseCurrency_shopCutForReplacement,
                secondaryCurrency_amount:
                    order.replacementOrderCut
                        .secondaryCurrency_shopCutForReplacement,
                adminNote:
                    'Shop get replacement order cut for cancel replaced order',
            });
        }
        if (
            order?.replacementOrderCut?.baseCurrency_adminCutForReplacement !==
            0
        ) {
            await createTransaction({
                order,
                account: 'admin',
                type: 'adminGetForCancelReplacementOrder',
                amount: order.replacementOrderCut
                    .baseCurrency_adminCutForReplacement,
                secondaryCurrency_amount:
                    order.replacementOrderCut
                        .secondaryCurrency_adminCutForReplacement,
                adminNote:
                    'Admin get replacement order cut for cancel replaced order',
            });
        }
    }

    // Product Stock feature
    for (let element of order?.products) {
        if (element.product.isStockEnabled) {
            await Product.updateOne(
                { _id: element.product._id },
                {
                    $inc: {
                        stockQuantity: element.quantity,
                    },
                }
            );
        }
    }

    //*** Operations feature set flag start ***/
    if (logUser.length > 0) {
        if (logUser.includes('user')) {
            const userFlag = await FlagModel.create({
                orderId: order._id,
                user: order.user,
                type: 'user',
                flaggedType: 'cancelled',
                flaggedReason: 'others',
                otherReason,
            });

            await User.updateOne(
                { _id: order.user },
                {
                    $push: {
                        flags: userFlag._id,
                    },
                }
            );
        }

        if (logUser.includes('rider')) {
            const riderFlag = await FlagModel.create({
                orderId: order._id,
                delivery: order.deliveryBoy,
                type: 'delivery',
                flaggedType: 'cancelled',
                flaggedReason: 'others',
                otherReason,
            });

            await DeliveryBoyModel.updateOne(
                { _id: order.deliveryBoy },
                {
                    $push: {
                        flags: riderFlag._id,
                    },
                }
            );
        }

        if (logUser.includes('shop')) {
            const shopFlag = await FlagModel.create({
                orderId: order._id,
                shop: order.shop,
                type: 'shop',
                flaggedType: 'cancelled',
                flaggedReason: 'others',
                otherReason,
            });

            await Shop.updateOne(
                { _id: order.shop },
                {
                    $push: {
                        flags: shopFlag._id,
                    },
                }
            );
        }
    }
    //*** Operations feature set flag end ***/

    const cancelObject = getCancelObject({
        canceledBy: cancelBy,
        adminId: adminId,
        shopId: shopId,
        cancelReasonId: cancelReasonId,
        otherReason: otherReason,
        shopCancelType:
            cancelBy === 'admin'
                ? null
                : ['schedule', 'placed', 'accepted_delivery_boy'].includes(
                      order.orderStatus
                  )
                ? 'rejected'
                : 'canceled',
    });

    // Areeba payment gateway integration
    if (order.summary.baseCurrency_card > 0) {
        for (const element of order?.cart?.cartItems) {
            if (element?.summary?.baseCurrency_card > 0) {
                const newTransactionId = ObjectId();
                const voidPutData = {
                    apiOperation: 'VOID',
                    transaction: {
                        targetTransactionId: element?.areebaCard?.transactionId,
                    },
                };

                const { data: voidData } = await areebaPaymentGateway(
                    element?.areebaCard?.orderId,
                    newTransactionId,
                    voidPutData
                );

                if (voidData?.result == 'ERROR')
                    return errorResponse(res, voidData?.error?.explanation);
            }
        }
    }

    await OrderCancel({
        orderId: order._id,
        cancelObject,
        cancelShopTnx: shopTransaction ? shopTransaction._id : null,
        adminCancelTnx: adminTransaction ? adminTransaction._id : null,
        isEndorseLoss,
        endorseLoss,
        inEndorseLossDeliveryFeeIncluded,
    });

    // For Adjust free delivery
    if (inEndorseLossDeliveryFeeIncluded) {
        const newOrder = await Order.findById(order._id);

        newOrder.adminCharge.baseCurrency_adminChargeFromDelivery = Number(
            newOrder.adminCharge.baseCurrency_adminChargeFromDelivery ||
                0 +
                    newOrder.freeDeliveryCut
                        .baseCurrency_dropLossForFreeDelivery ||
                0
        );

        newOrder.adminCharge.secondaryCurrency_adminChargeFromDelivery = Number(
            newOrder.adminCharge.secondaryCurrency_adminChargeFromDelivery ||
                0 +
                    newOrder.freeDeliveryCut
                        .secondaryCurrency_dropLossForFreeDelivery ||
                0
        );

        newOrder.adminCharge.baseCurrency_totalAdminCharge = Number(
            newOrder.adminCharge.baseCurrency_totalAdminCharge ||
                0 +
                    newOrder.freeDeliveryCut
                        .baseCurrency_dropLossForFreeDelivery ||
                0
        );

        newOrder.adminCharge.secondaryCurrency_totalAdminCharge = Number(
            newOrder.adminCharge.secondaryCurrency_totalAdminCharge ||
                0 +
                    newOrder.freeDeliveryCut
                        .secondaryCurrency_dropLossForFreeDelivery ||
                0
        );

        newOrder.adminCharge.baseCurrency_totalAdminCharge = Number(
            newOrder.adminCharge.baseCurrency_totalAdminCharge ||
                0 +
                    newOrder.freeDeliveryCut
                        .baseCurrency_dropLossForFreeDelivery ||
                0
        );

        newOrder.adminCharge.secondaryCurrency_totalAdminCharge = Number(
            newOrder.adminCharge.secondaryCurrency_totalAdminCharge ||
                0 +
                    newOrder.freeDeliveryCut
                        .secondaryCurrency_dropLossForFreeDelivery ||
                0
        );

        newOrder.freeDeliveryCut.baseCurrency_dropLossForFreeDelivery = 0;

        newOrder.freeDeliveryCut.secondaryCurrency_dropLossForFreeDelivery = 0;

        newOrder.freeDeliveryCut.baseCurrency_freeDeliveryAdminCut = 0;

        newOrder.freeDeliveryCut.secondaryCurrency_freeDeliveryAdminCut = 0;

        await newOrder.save();
    }

    // Check shop order capacity
    await checkShopCapacity(order.shop);
};

// Refund feature after delivered order
exports.refundAfterDeliveredOrderByAdmin = async (req, res) => {
    try {
        const adminId = req.adminId;
        let {
            orderId,
            refundType,
            partialPayment = {},
            logUser, // ["rider", "shop", "user"]
            flaggedReason,
            otherReason,
        } = req.body;

        const order = await Order.findById(orderId).populate([
            {
                path: 'cart',
            },
        ]);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (order.isRefundedAfterDelivered) {
            return errorResponse(res, 'Order is already refunded');
        }

        if (!['delivered'].includes(order.orderStatus)) {
            return errorResponse(res, `Order is not delivered`);
        }

        if (!['full', 'partial'].includes(refundType)) {
            return errorResponse(res, `Invalid refund type`);
        }

        const userTransaction = [];

        for (const key in partialPayment) {
            if (typeof partialPayment[key] === 'string') {
                partialPayment[key] = parseFloat(partialPayment[key]);
            }
        }

        const shopRiderTips =
            order.orderFor === 'specific' && refundType === 'full'
                ? order.summary.baseCurrency_riderTip
                : 0;

        const baseCurrency_adminCut =
            partialPayment?.adminOrderRefund +
            partialPayment?.adminDeliveryRefund;
        const baseCurrency_adminVatCut = partialPayment?.adminVat;
        const baseCurrency_shopCut = partialPayment?.shop - shopRiderTips;
        const baseCurrency_deliveryBoyCut = 0;

        const secondaryCurrency_adminCut =
            partialPayment?.adminOrderRefund * order.shopExchangeRate +
            partialPayment?.adminDeliveryRefund * order.adminExchangeRate;
        const secondaryCurrency_adminVatCut =
            baseCurrency_adminVatCut * order.shopExchangeRate;
        const secondaryCurrency_shopCut =
            baseCurrency_shopCut * order.shopExchangeRate;
        const secondaryCurrency_deliveryBoyCut = 0;

        if (refundType === 'full') {
            for (const element of order?.cart?.cartItems) {
                if (
                    element?.summary?.baseCurrency_card ||
                    element?.summary?.baseCurrency_wallet ||
                    element?.summary?.baseCurrency_cash
                ) {
                    let transaction = await userMoneyRefund(
                        order,
                        element?.user,
                        element?.summary?.baseCurrency_card +
                            element?.summary?.baseCurrency_wallet +
                            element?.summary?.baseCurrency_cash -
                            element?.summary?.baseCurrency_riderTip -
                            order.baseCurrency_pendingSubscriptionFee,
                        element?.summary?.secondaryCurrency_card +
                            element?.summary?.secondaryCurrency_wallet +
                            element?.summary?.secondaryCurrency_cash -
                            element?.summary?.secondaryCurrency_riderTip -
                            order.secondaryCurrency_pendingSubscriptionFee,
                        'Amount Refund for reported order',
                        'Amount Refund for reported order by User',
                        baseCurrency_adminCut,
                        baseCurrency_adminVatCut,
                        baseCurrency_shopCut,
                        baseCurrency_deliveryBoyCut,
                        secondaryCurrency_adminCut,
                        secondaryCurrency_adminVatCut,
                        secondaryCurrency_shopCut,
                        secondaryCurrency_deliveryBoyCut
                    );
                    userTransaction.push(transaction._id);
                }
            }

            await createTransaction({
                order,
                account: 'shop',
                type: 'refundedAfterDeliveredOrderShopCut',
                amount: baseCurrency_shopCut,
                secondaryCurrency_amount: secondaryCurrency_shopCut,
                adminNote:
                    'Admin refund reported order and cut from shop earning',
                userNote:
                    'Admin refund reported order and cut from shop earning',
                isRefund: true,
                adminBy: adminId,
                vat: baseCurrency_adminVatCut,
                secondaryCurrency_vat: secondaryCurrency_adminVatCut,
            });

            await createTransaction({
                order,
                account: 'admin',
                type: 'refundedAfterDeliveredOrderAdminCut',
                amount: baseCurrency_adminCut,
                secondaryCurrency_amount: secondaryCurrency_adminCut,
                adminNote:
                    'Admin refund reported order and cut from admin earning',
                userNote:
                    'Admin refund reported order and cut from admin earning',
                isRefund: true,
                adminBy: adminId,
                vat: baseCurrency_adminVatCut,
                secondaryCurrency_vat: secondaryCurrency_adminVatCut,
                baseCurrency_adminDeliveryRefund:
                    partialPayment?.adminDeliveryRefund,
                secondaryCurrency_adminDeliveryRefund:
                    partialPayment?.adminDeliveryRefund *
                    order.adminExchangeRate,
            });
        } else if (refundType === 'partial') {
            const TotalPartialRefundAmount =
                baseCurrency_adminCut +
                baseCurrency_adminVatCut +
                baseCurrency_shopCut +
                baseCurrency_deliveryBoyCut;

            const secondaryCurrency_TotalPartialRefundAmount =
                secondaryCurrency_adminCut +
                secondaryCurrency_adminVatCut +
                secondaryCurrency_shopCut +
                secondaryCurrency_deliveryBoyCut;

            const transaction = await userMoneyRefund(
                order,
                order.user,
                TotalPartialRefundAmount,
                secondaryCurrency_TotalPartialRefundAmount,
                'Amount Refund for reported order',
                'Amount Refund for reported order by User',
                baseCurrency_adminCut,
                baseCurrency_adminVatCut,
                baseCurrency_shopCut,
                baseCurrency_deliveryBoyCut,
                secondaryCurrency_adminCut,
                secondaryCurrency_adminVatCut,
                secondaryCurrency_shopCut,
                secondaryCurrency_deliveryBoyCut,
                true
            );

            userTransaction.push(transaction._id);

            if (baseCurrency_shopCut) {
                await createTransaction({
                    order,
                    account: 'shop',
                    type: 'refundedAfterDeliveredOrderShopCut',
                    amount: baseCurrency_shopCut,
                    secondaryCurrency_amount: secondaryCurrency_shopCut,
                    adminNote:
                        'Admin refund reported order and cut from shop earning',
                    userNote:
                        'Admin refund reported order and cut from shop earning',
                    isRefund: true,
                    adminBy: adminId,
                    vat: baseCurrency_adminVatCut,
                    secondaryCurrency_vat: secondaryCurrency_adminVatCut,
                });

                // await Transaction.create({
                //     order: order._id,
                //     autoTrxId: `${moment().format(
                //         'DDMMYYHmmss'
                //     )}${short().new()}`,
                //     account: 'shop',
                //     type: 'refundedAfterDeliveredOrderShopCut',
                //     paymentMethod: order.paymentMethod,
                //     status: 'success',
                //     user: order.user,
                //     shop: order.shop._id,
                //     seller: order.seller,
                //     deliveryBoy: order.deliveryBoy,
                //     summary: order.summary,
                //     amount: baseCurrency_shopCut,
                //     secondaryCurrency_amount: secondaryCurrency_shopCut,
                //     adminNote:
                //         'Admin refund reported order and cut from shop earning',
                //     userNote:
                //         'Admin refund reported order and cut from shop earning',
                //     isRefund: true,
                //     remark: '',
                //     adminBy: adminId,
                //     paidCurrency: order.paidCurrency,
                //     orderType: order.shop.shopType,
                // });
            }

            if (baseCurrency_adminCut) {
                await createTransaction({
                    order,
                    account: 'admin',
                    type: 'refundedAfterDeliveredOrderAdminCut',
                    amount: baseCurrency_adminCut,
                    secondaryCurrency_amount: secondaryCurrency_adminCut,
                    adminNote:
                        'Admin refund reported order and cut from admin earning',
                    userNote:
                        'Admin refund reported order and cut from admin earning',
                    isRefund: true,
                    adminBy: adminId,
                    vat: baseCurrency_adminVatCut,
                    secondaryCurrency_vat: secondaryCurrency_adminVatCut,
                    baseCurrency_adminDeliveryRefund:
                        partialPayment?.adminDeliveryRefund,
                    secondaryCurrency_adminDeliveryRefund:
                        partialPayment?.adminDeliveryRefund *
                        order.adminExchangeRate,
                });

                // await Transaction.create({
                //     order: order._id,
                //     autoTrxId: `${moment().format(
                //         'DDMMYYHmmss'
                //     )}${short().new()}`,
                //     account: 'admin',
                //     type: 'refundedAfterDeliveredOrderAdminCut',
                //     paymentMethod: order.paymentMethod,
                //     status: 'success',
                //     user: order.user,
                //     shop: order.shop._id,
                //     seller: order.seller,
                //     deliveryBoy: order.deliveryBoy,
                //     summary: order.summary,
                //     amount: baseCurrency_adminCut,
                //     secondaryCurrency_amount: secondaryCurrency_adminCut,
                //     adminNote:
                //         'Admin refund reported order and cut from admin earning',
                //     userNote:
                //         'Admin refund reported order and cut from admin earning',
                //     isRefund: true,
                //     remark: '',
                //     adminBy: adminId,
                //     vat: baseCurrency_adminVatCut,
                //     paidCurrency: order.paidCurrency,
                //     orderType: order.shop.shopType,
                //     baseCurrency_adminDeliveryRefund:
                //         partialPayment?.adminDeliveryRefund,
                //     secondaryCurrency_adminDeliveryRefund:
                //         partialPayment?.adminDeliveryRefund *
                //         order.adminExchangeRate,
                // });
            }
        }

        //*** Operations feature set flag start ***/
        let flagIds = [];

        if (logUser.includes('user')) {
            const userFlag = await FlagModel.create({
                orderId,
                user: order.user,
                type: 'user',
                flaggedType: 'refunded',
                flaggedReason,
                otherReason,
                replacement: 'without',
                refund: 'with',
            });

            await User.updateOne(
                { _id: order.user },
                {
                    $push: {
                        flags: userFlag._id,
                    },
                }
            );

            flagIds.push(userFlag._id);
        }

        if (logUser.includes('rider')) {
            const riderFlag = await FlagModel.create({
                orderId,
                delivery: order.deliveryBoy,
                type: 'delivery',
                flaggedType: 'refunded',
                flaggedReason,
                otherReason,
                replacement: 'without',
                refund: 'with',
            });

            await DeliveryBoyModel.updateOne(
                { _id: order.deliveryBoy },
                {
                    $push: {
                        flags: riderFlag._id,
                    },
                }
            );

            flagIds.push(riderFlag._id);
        }

        if (logUser.includes('shop')) {
            const shopFlag = await FlagModel.create({
                orderId,
                shop: order.shop,
                type: 'shop',
                flaggedType: 'refunded',
                flaggedReason,
                otherReason,
                replacement: 'without',
                refund: 'with',
            });

            await Shop.updateOne(
                { _id: order.shop },
                {
                    $push: {
                        flags: shopFlag._id,
                    },
                }
            );

            flagIds.push(shopFlag._id);
        }
        //*** Operations feature set flag end ***/

        await Order.updateOne(
            { _id: order._id },
            {
                $set: {
                    isRefundedAfterDelivered: true,
                    refundedAfterDeliveredAt: new Date(),
                    userRefundTnx: userTransaction,
                    // isShopPayoutCreated: false,
                    flaggedAt: new Date(),
                },
                $addToSet: {
                    flag: { $each: flagIds },
                    flaggedReason,
                },
            }
        );

        await sendNotificationForRefundOrder(order);

        successResponse(res, {
            message: 'Order refunded successfully',
        });
    } catch (err) {
        return errorHandler(res, err);
    }
};
