const Order = require('../models/OrderModel');
const Butler = require('../models/ButlerModel');
const moment = require('moment');
const short = require('short-uuid');
const Transaction = require('../models/TransactionModel');
const User = require('../models/UserModel');
const {
    sendNotificationsAllApp,
} = require('../controllers/NotificationController');
const { sendPlaceOrderEmail } = require('../controllers/EmailController');
const MarketingModel = require('../models/MarketingModel');
const ShopModel = require('../models/ShopModel');
const ProductModel = require('../models/ProductModel');
const { DistanceInfoGoogleWithWayPoints } = require('../lib/getDistanceInfo');
const ObjectId = require('mongoose').Types.ObjectId;

exports.getCancelObject = ({
    canceledBy = 'automatically',
    userId = null,
    cancelReasonId = null,
    otherReason = null,
    shopId = null,
    deliveryBoyId = null,
    sellerId = null,
    adminId = null,
    shopCancelType = null,
}) => {
    if (cancelReasonId === '') {
        cancelReasonId = null;
    }

    return {
        canceledBy: canceledBy,
        userId: userId,
        shopId: shopId,
        sellerId: sellerId,
        deliveryBoyId: deliveryBoyId,
        adminId: adminId,
        cancelReason: cancelReasonId,
        otherReason: otherReason,
        shopCancelType: shopCancelType,
    };
};

exports.OrderCancel = async ({
    orderId,
    cancelObject,
    userCancelTnx = [],
    cancelShopTnx = null,
    cancelDeliveryTnx = null,
    adminCancelTnx = null,
    Model = Order,
    refundType = 'full',
    isEndorseLoss = false,
    endorseLoss,
    inEndorseLossDeliveryFeeIncluded = false,
}) => {
    await Model.updateOne(
        { _id: orderId },
        {
            $set: {
                orderStatus: 'cancelled',
                cancelledAt: new Date(),
                orderCancel: cancelObject,
                userCancelTnx,
                cancelShopTnx,
                cancelDeliveryTnx,
                adminCancelTnx,
                refundType,
                isEndorseLoss,
                endorseLoss,
                inEndorseLossDeliveryFeeIncluded,
            },
        }
    );

    let updatedOrder;

    if (Model == Order) {
        updatedOrder = await this.getFullOrderInformation(orderId);
    } else {
        updatedOrder = await this.getFullOrderInformationForButler(orderId);
    }

    await sendNotificationsAllApp(updatedOrder);
    // await sendPlaceOrderEmail(orderId);

    //*** Create trip summary start ***/
    if (
        updatedOrder?.deliveryBoy &&
        updatedOrder?.orderTripSummary?.length > 3
    ) {
        const riderOrder = await Order.findOne({
            deliveryBoy: updatedOrder?.deliveryBoy?._id,
            orderStatus: {
                $in: [
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
        }).populate([
            {
                path: 'user',
            },
            {
                path: 'shop',
            },
        ]);

        console.log('***riderOrder -->', riderOrder);
        if (riderOrder) {
            const { distance, duration, legs, overview_polyline } =
                await DistanceInfoGoogleWithWayPoints({
                    origin: {
                        latitude:
                            updatedOrder.deliveryBoy.location.coordinates[1],
                        longitude:
                            updatedOrder.deliveryBoy.location.coordinates[0],
                    },
                    destination: {
                        latitude:
                            riderOrder.dropOffLocation.location.coordinates[1],
                        longitude:
                            riderOrder.dropOffLocation.location.coordinates[0],
                    },
                    waypoints: [
                        {
                            latitude: riderOrder.shop.location.coordinates[1],
                            longitude: riderOrder.shop.location.coordinates[0],
                        },
                    ],
                });

            const orderTripSummary = [
                {
                    name: updatedOrder.deliveryBoy.name,
                    address: updatedOrder.deliveryBoy.address,
                    latitude: updatedOrder.deliveryBoy.location.coordinates[1],
                    longitude: updatedOrder.deliveryBoy.location.coordinates[0],
                    type: 'rider',
                    deliveryBoy: updatedOrder.deliveryBoy._id,
                    order: [riderOrder._id],
                    totalDistance: distance,
                    totalDuration: duration,
                    total_overview_polyline: overview_polyline,
                    distance: legs[0].distance,
                    duration: legs[0].duration,
                    overview_polyline: legs[0].overview_polyline,
                },
                {
                    name: riderOrder.shop.shopName,
                    address: riderOrder.shop.address.address,
                    latitude: riderOrder.shop.location.coordinates[1],
                    longitude: riderOrder.shop.location.coordinates[0],
                    type: 'shop',
                    shopType: riderOrder.shop.shopType,
                    shop: riderOrder.shop._id,
                    order: [riderOrder._id],
                    distance: legs[1].distance,
                    duration: legs[1].duration,
                    overview_polyline: legs[1].overview_polyline,
                },
                {
                    name: riderOrder.user.name,
                    address: riderOrder.dropOffLocation.address,
                    latitude:
                        riderOrder.dropOffLocation.location.coordinates[1],
                    longitude:
                        riderOrder.dropOffLocation.location.coordinates[0],
                    type: 'user',
                    user: riderOrder.user._id,
                    order: [riderOrder._id],
                },
            ];

            console.log('***orderTripSummary-->', orderTripSummary);
            riderOrder.orderTripSummary = orderTripSummary;

            await riderOrder.save();
        }
    }
    //*** Create trip summary end ***/
};

exports.createTransaction = async ({
    order,
    account,
    type,
    amount,
    secondaryCurrency_amount,
    adminNote = null,
    userNote = null,
    isRefund = false,
    adminBy = null,
    vat,
    secondaryCurrency_vat,
    baseCurrency_adminDeliveryRefund,
    secondaryCurrency_adminDeliveryRefund,
}) => {
    const transaction = await Transaction.create({
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        order: order._id,
        account: account, // shop | user | deliveryBoy | drop
        type: type,
        paymentMethod: order.paymentMethod, // card | cash | wallet
        status: 'success',
        user: order.user, // _id
        shop: order.shop, // _id
        seller: order.seller, // _id
        deliveryBoy: order.deliveryBoy, // _id
        summary: order.summary, // product amount information
        amount: amount, // base on type
        secondaryCurrency_amount: secondaryCurrency_amount,
        adminNote,
        userNote,
        isRefund,
        adminBy,
        vat,
        secondaryCurrency_vat,
        paidCurrency: order.paidCurrency,
        orderType: order.orderType,
        baseCurrency_adminDeliveryRefund,
        secondaryCurrency_adminDeliveryRefund,
    });
    return transaction;
};

exports.userMoneyRefund = async (
    order,
    user,
    amount,
    secondaryCurrency_amount,
    userNote,
    adminNote,
    baseCurrency_adminCut = 0,
    baseCurrency_adminVatCut = 0,
    baseCurrency_shopCut = 0,
    baseCurrency_deliveryBoyCut = 0,
    secondaryCurrency_adminCut = 0,
    secondaryCurrency_adminVatCut = 0,
    secondaryCurrency_shopCut = 0,
    secondaryCurrency_deliveryBoyCut = 0,
    isPartialRefund = false
) => {
    const transaction = await Transaction.create({
        order: order._id,
        user: user,
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        amount: amount,
        secondaryCurrency_amount: secondaryCurrency_amount,
        userNote: userNote,
        adminNote: adminNote,
        account: 'user',
        type: 'userCancelOrderGetWallet',
        status: 'success',
        orderId: order._id,
        paymentMethod: order.paymentMethod,
        isRefund: true,
        baseCurrency_adminCut,
        baseCurrency_adminVatCut,
        baseCurrency_shopCut,
        baseCurrency_deliveryBoyCut,
        secondaryCurrency_adminCut,
        secondaryCurrency_adminVatCut,
        secondaryCurrency_shopCut,
        secondaryCurrency_deliveryBoyCut,
        isPartialRefund,
        paidCurrency: order.paidCurrency,
    });

    await User.updateOne(
        { _id: user },
        {
            $inc: {
                tempBalance: amount,
            },
        }
    );
    return transaction;
};

exports.getFullOrderInformation = async orderId => {
    const order = await Order.findOne({ _id: orderId }).populate([
        {
            path: 'marketings',
        },
        {
            path: 'user',
            select: 'name email phone_number profile_photo orderCompleted',
        },
        {
            path: 'users',
            select: 'name email phone_number profile_photo',
        },
        {
            path: 'deliveryBoy',
        },
        {
            path: 'transactionsDeliveryBoy',
        },
        {
            path: 'transactionsDrop',
        },
        {
            path: 'transactionsStore',
        },
        {
            path: 'transactionHistory',
        },
        {
            path: 'seller',
        },
        {
            path: 'shop',
            select: '-banner -products -flags -reviews -categories',
        },
        {
            path: 'deliveryAddress',
        },
        {
            path: 'orderDeliveryCharge',
        },
        {
            path: 'transactions',
        },
        {
            path: 'userCancelTnx',
        },
        {
            path: 'cancelShopTnx',
        },
        {
            path: 'cancelDeliveryTnx',
        },
        {
            path: 'adminCancelTnx',
        },
        {
            path: 'orderCancel.userId',
        },
        {
            path: 'orderCancel.cancelReason',
        },
        {
            path: 'orderCancel.deliveryBoyId',
        },
        {
            path: 'orderCancel.adminId',
        },
        {
            path: 'orderCancel.sellerId',
        },
        {
            path: 'orderCancel.shopId',
        },
        {
            path: 'products',
            populate: [
                {
                    path: 'product',
                    select: 'name',
                },
                {
                    path: 'addons.product',
                    select: 'name',
                },
            ],
        },
        {
            path: 'cart',
            populate: [
                {
                    path: 'cartItems.user',
                },
                {
                    path: 'creator',
                },
            ],
        },
        {
            path: 'originalOrder',
        },
        {
            path: 'adjustOrderRequest',
            populate: [
                {
                    path: 'suggestedProducts.product',
                },
                {
                    path: 'replacedProducts.product',
                },
            ],
        },
    ]);

    return order;
};

exports.getFullOrderInformationForButler = async orderId => {
    const order = await Butler.findOne({ _id: orderId }).populate([
        {
            path: 'user',
            select: 'name email phone_number profile_photo',
        },
        {
            path: 'deliveryBoy',
        },
        {
            path: 'transactionsDeliveryBoy',
        },
        {
            path: 'transactionsDrop',
        },
        {
            path: 'transactionHistory',
        },
        {
            path: 'orderDeliveryCharge',
        },
        {
            path: 'transactions',
        },
        {
            path: 'userCancelTnx',
        },
        {
            path: 'cancelDeliveryTnx',
        },
        {
            path: 'adminCancelTnx',
        },
        {
            path: 'orderCancel.userId',
        },
        {
            path: 'orderCancel.cancelReason',
        },
        {
            path: 'orderCancel.deliveryBoyId',
        },
        {
            path: 'orderCancel.adminId',
        },
    ]);

    return order;
};

exports.checkMarketingSpendLimit = async order => {
    const marketings = await MarketingModel.find({
        shop: ObjectId(order.shop),
        deletedAt: null,
        isActive: true,
        status: 'active',
    });

    if (order.summary.baseCurrency_discount > 0) {
        const percentageMarketings = marketings?.filter(
            marketing => marketing.type === 'percentage'
        );
        for (const percentageMarketing of percentageMarketings) {
            if (percentageMarketing.spendLimit > 0) {
                const startDateTime = moment(
                    new Date(percentageMarketing.duration.start)
                )
                    .startOf('day')
                    .toDate();
                const endDateTime = moment(
                    new Date(percentageMarketing.duration.end)
                )
                    .endOf('day')
                    .toDate();

                const sumOfOrderDiscount = await Order.aggregate([
                    {
                        $match: {
                            marketings: {
                                $in: [percentageMarketing._id],
                            },
                            orderStatus: {
                                $in: ['delivered'],
                            },
                            createdAt: {
                                $gte: startDateTime,
                                $lte: endDateTime,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: '',
                            baseCurrency_discountAdminCut: {
                                $sum: {
                                    $sum: [
                                        '$discountCut.baseCurrency_discountAdminCut',
                                    ],
                                },
                            },
                            baseCurrency_discountShopCut: {
                                $sum: {
                                    $sum: [
                                        '$discountCut.baseCurrency_discountShopCut',
                                    ],
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                ]);

                let totalSumOfOrderDiscount = 0;

                if (percentageMarketing.creatorType === 'admin') {
                    totalSumOfOrderDiscount = sumOfOrderDiscount[0]
                        ? sumOfOrderDiscount[0].baseCurrency_discountAdminCut
                        : 0;
                } else {
                    totalSumOfOrderDiscount = sumOfOrderDiscount[0]
                        ? sumOfOrderDiscount[0].baseCurrency_discountShopCut
                        : 0;
                }

                if (totalSumOfOrderDiscount >= percentageMarketing.spendLimit) {
                    await MarketingModel.updateOne(
                        { _id: percentageMarketing._id },
                        {
                            $set: {
                                deletedAt: new Date(),
                                isActive: false,
                                status: 'inactive',
                            },
                        }
                    );

                    await ShopModel.updateOne(
                        { _id: percentageMarketing.shop },
                        {
                            sortingOrder: 0,
                            $pull: {
                                marketings: percentageMarketing._id,
                            },
                        }
                    );

                    for (const product of percentageMarketing.products) {
                        await ProductModel.updateOne(
                            { _id: { $in: product.product } },
                            {
                                $pull: {
                                    marketing: percentageMarketing._id,
                                },
                            }
                        );

                        const findProduct = await ProductModel.findById(
                            product.product
                        ).populate('marketing');

                        const discountPercentage = findProduct.marketing.reduce(
                            (accumulator, marketing) => {
                                if (marketing.isActive) {
                                    const marketingProduct =
                                        marketing.products.find(
                                            item =>
                                                item.product.toString() ===
                                                product.product.toString()
                                        );

                                    return (
                                        accumulator +
                                        marketingProduct.discountPercentage
                                    );
                                }
                                return accumulator + 0;
                            },
                            0
                        );
                        const discount = findProduct.marketing.reduce(
                            (accumulator, marketing) => {
                                if (marketing.isActive) {
                                    const marketingProduct =
                                        marketing.products.find(
                                            item =>
                                                item.product.toString() ===
                                                product.product.toString()
                                        );

                                    return (
                                        accumulator + marketingProduct.discount
                                    );
                                }
                                return accumulator + 0;
                            },
                            0
                        );

                        const discountPrice = findProduct.price - discount;

                        findProduct.discountPercentage = discountPercentage;
                        findProduct.discount = discount;
                        findProduct.discountPrice = discountPrice;
                        await findProduct.save();
                    }
                }
            }
        }
    }

    if (order.summary.baseCurrency_doubleMenuItemPrice > 0) {
        const doubleMenuMarketing = marketings?.find(
            marketing => marketing.type === 'double_menu'
        );

        if (doubleMenuMarketing.spendLimit > 0) {
            const startDateTime = moment(
                new Date(doubleMenuMarketing.duration.start)
            )
                .startOf('day')
                .toDate();
            const endDateTime = moment(
                new Date(doubleMenuMarketing.duration.end)
            )
                .endOf('day')
                .toDate();

            const sumOfOrderDoubleMenuCut = await Order.aggregate([
                {
                    $match: {
                        marketings: {
                            $in: [doubleMenuMarketing._id],
                        },
                        orderStatus: {
                            $in: ['delivered'],
                        },
                        createdAt: {
                            $gte: startDateTime,
                            $lte: endDateTime,
                        },
                    },
                },
                {
                    $group: {
                        _id: '',
                        // adminCut: {
                        //     $sum: {
                        //         $sum: [
                        //             '$doubleMenuCut.baseCurrency_doubleMenuAdminCut',
                        //         ],
                        //     },
                        // },
                        adminCut: {
                            $sum: {
                                $sum: [
                                    '$doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceAdmin',
                                ],
                            },
                        },
                        shopCut: {
                            $sum: {
                                $sum: [
                                    '$doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceShop',
                                ],
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
            ]);

            const adminCutForDoubleMenu = sumOfOrderDoubleMenuCut[0]
                ? sumOfOrderDoubleMenuCut[0].adminCut
                : 0;

            const shopCutForDoubleMenu = sumOfOrderDoubleMenuCut[0]
                ? sumOfOrderDoubleMenuCut[0].shopCut
                : 0;

            if (doubleMenuMarketing.creatorType === 'admin') {
                if (adminCutForDoubleMenu >= doubleMenuMarketing.spendLimit) {
                    // await MarketingModel.updateOne(
                    //     { _id: doubleMenuMarketing._id },
                    //     {
                    //         $set: {
                    //             isActive: false,
                    //             status: 'inactive',
                    //             marketingPausedAt: new Date(),
                    //         },
                    //     }
                    // );
                    await MarketingModel.updateOne(
                        { _id: doubleMenuMarketing._id },
                        {
                            $set: {
                                deletedAt: new Date(),
                                isActive: false,
                                status: 'inactive',
                            },
                        }
                    );

                    await ShopModel.updateOne(
                        { _id: doubleMenuMarketing.shop },
                        {
                            sortingOrder: 0,
                            $pull: {
                                marketings: doubleMenuMarketing._id,
                            },
                        }
                    );

                    const productsId = doubleMenuMarketing.products?.map(
                        product => product.product.toString()
                    );
                    await ProductModel.updateMany(
                        { _id: { $in: productsId } },
                        {
                            $pull: {
                                marketing: doubleMenuMarketing._id,
                            },
                        }
                    );
                }
            } else {
                if (shopCutForDoubleMenu >= doubleMenuMarketing.spendLimit) {
                    await MarketingModel.updateOne(
                        { _id: doubleMenuMarketing._id },
                        {
                            $set: {
                                deletedAt: new Date(),
                                isActive: false,
                                status: 'inactive',
                            },
                        }
                    );

                    await ShopModel.updateOne(
                        { _id: doubleMenuMarketing.shop },
                        {
                            sortingOrder: 0,
                            $pull: {
                                marketings: doubleMenuMarketing._id,
                            },
                        }
                    );

                    const productsId = doubleMenuMarketing.products?.map(
                        product => product.product.toString()
                    );
                    await ProductModel.updateMany(
                        { _id: { $in: productsId } },
                        {
                            $pull: {
                                marketing: doubleMenuMarketing._id,
                            },
                        }
                    );
                }
            }
        }
    }

    if (order.summary.baseCurrency_riderFee < 1) {
        const freeDeliveryMarketing = marketings?.find(
            marketing => marketing.type === 'free_delivery'
        );

        if (freeDeliveryMarketing?.spendLimit > 0) {
            const startDateTime = moment(
                new Date(freeDeliveryMarketing.duration.start)
            )
                .startOf('day')
                .toDate();
            const endDateTime = moment(
                new Date(freeDeliveryMarketing.duration.end)
            )
                .endOf('day')
                .toDate();

            const sumOfOrderFreeDelivery = await Order.aggregate([
                {
                    $match: {
                        marketings: {
                            $in: [freeDeliveryMarketing._id],
                        },
                        orderStatus: {
                            $in: ['delivered'],
                        },
                        createdAt: {
                            $gte: startDateTime,
                            $lte: endDateTime,
                        },
                    },
                },
                {
                    $group: {
                        _id: '',
                        adminLossForFreeDelivery: {
                            $sum: {
                                $sum: [
                                    '$freeDeliveryCut.baseCurrency_dropLossForFreeDelivery',
                                ],
                            },
                        },
                        shopLossForFreeDelivery: {
                            $sum: {
                                $sum: [
                                    '$freeDeliveryCut.baseCurrency_shopLossForFreeDelivery',
                                ],
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
            ]);

            const totalAdminLossForFreeDelivery = sumOfOrderFreeDelivery[0]
                ? sumOfOrderFreeDelivery[0].adminLossForFreeDelivery
                : 0;
            const totalShopLossForFreeDelivery = sumOfOrderFreeDelivery[0]
                ? sumOfOrderFreeDelivery[0].shopLossForFreeDelivery
                : 0;

            const totalSpendForFreeDelivery =
                totalAdminLossForFreeDelivery + totalShopLossForFreeDelivery;

            if (totalSpendForFreeDelivery >= freeDeliveryMarketing.spendLimit) {
                await MarketingModel.updateOne(
                    { _id: freeDeliveryMarketing._id },
                    {
                        $set: {
                            deletedAt: new Date(),
                            isActive: false,
                            status: 'inactive',
                        },
                    }
                );

                await ShopModel.updateOne(
                    { _id: freeDeliveryMarketing.shop },
                    {
                        freeDelivery: false,
                        sortingOrder: 0,
                        $pull: {
                            marketings: freeDeliveryMarketing._id,
                        },
                    }
                );
            }
        }
    }

    if (order.isRedeemReward) {
        const rewardMarketing = marketings?.find(
            marketing => marketing.type === 'reward'
        );

        if (rewardMarketing?.spendLimit > 0) {
            const startDateTime = moment(
                new Date(rewardMarketing.duration.start)
            )
                .startOf('day')
                .toDate();
            const endDateTime = moment(new Date(rewardMarketing.duration.end))
                .endOf('day')
                .toDate();

            const sumOfOrderReward = await Order.aggregate([
                {
                    $match: {
                        marketings: {
                            $in: [rewardMarketing._id],
                        },
                        orderStatus: {
                            $in: ['delivered'],
                        },
                        createdAt: {
                            $gte: startDateTime,
                            $lte: endDateTime,
                        },
                    },
                },
                {
                    $group: {
                        _id: '',
                        shopCut: {
                            $sum: { $sum: ['$rewardRedeemCut.rewardShopCut'] },
                        },
                        adminCut: {
                            $sum: { $sum: ['$rewardRedeemCut.rewardAdminCut'] },
                        },
                        count: { $sum: 1 },
                    },
                },
            ]);

            const totalSumOfOrderRewardShopCut = sumOfOrderReward[0]
                ? sumOfOrderReward[0].shopCut
                : 0;
            const totalSumOfOrderRewardAdminCut = sumOfOrderReward[0]
                ? sumOfOrderReward[0].adminCut
                : 0;

            if (rewardMarketing.creatorType === 'admin') {
                if (
                    totalSumOfOrderRewardAdminCut >= rewardMarketing.spendLimit
                ) {
                    await MarketingModel.updateOne(
                        { _id: rewardMarketing._id },
                        {
                            $set: {
                                deletedAt: new Date(),
                                isActive: false,
                                status: 'inactive',
                            },
                        }
                    );

                    await ShopModel.updateOne(
                        { _id: rewardMarketing.shop },
                        {
                            sortingOrder: 0,
                            $pull: {
                                marketings: rewardMarketing._id,
                            },
                        }
                    );

                    const productsId = rewardMarketing.products?.map(product =>
                        product.product.toString()
                    );
                    await ProductModel.updateMany(
                        { _id: { $in: productsId } },
                        {
                            $pull: {
                                marketing: rewardMarketing._id,
                            },
                            $unset: {
                                rewardCategory: 1,
                                rewardBundle: 1,
                                reward: 1,
                            },
                        }
                    );
                }
            } else {
                if (
                    totalSumOfOrderRewardShopCut >= rewardMarketing.spendLimit
                ) {
                    await MarketingModel.updateOne(
                        { _id: rewardMarketing._id },
                        {
                            $set: {
                                deletedAt: new Date(),
                                isActive: false,
                                status: 'inactive',
                            },
                        }
                    );

                    await ShopModel.updateOne(
                        { _id: rewardMarketing.shop },
                        {
                            sortingOrder: 0,
                            $pull: {
                                marketings: rewardMarketing._id,
                            },
                        }
                    );

                    const productsId = rewardMarketing.products?.map(product =>
                        product.product.toString()
                    );
                    await ProductModel.updateMany(
                        { _id: { $in: productsId } },
                        {
                            $pull: {
                                marketing: rewardMarketing._id,
                            },
                            $unset: {
                                rewardCategory: 1,
                                rewardBundle: 1,
                                reward: 1,
                            },
                        }
                    );
                }
            }
        }
    }
};

exports.applyExchangeRateInOrderSummary = (
    summary,
    shopExchangeRate,
    adminExchangeRate,
    shopInfo
) => {


    if (shopInfo.haveOwnDeliveryBoy) {
        summary.secondaryCurrency_riderFee =
            summary.baseCurrency_riderFee * shopExchangeRate;

        summary.secondaryCurrency_riderTip =
            summary.baseCurrency_riderTip * shopExchangeRate;

        summary.secondaryCurrency_riderFeeWithFreeDelivery =
            summary.baseCurrency_riderFeeWithFreeDelivery * shopExchangeRate;
    } else {
        summary.secondaryCurrency_riderFee =
            summary.baseCurrency_riderFee * adminExchangeRate;

        summary.secondaryCurrency_riderTip =
            summary.baseCurrency_riderTip * adminExchangeRate;

        summary.secondaryCurrency_riderFeeWithFreeDelivery =
            summary.baseCurrency_riderFeeWithFreeDelivery * adminExchangeRate;
    }

    summary.secondaryCurrency_productAmount =
        summary.baseCurrency_productAmount * shopExchangeRate;

    summary.secondaryCurrency_totalAmount =
        summary.secondaryCurrency_productAmount +
        summary.secondaryCurrency_riderFee;

    summary.secondaryCurrency_discount =
        summary.baseCurrency_discount * shopExchangeRate;

    summary.secondaryCurrency_vat = summary.baseCurrency_vat * shopExchangeRate;

    // summary.secondaryCurrency_wallet = (
    //     summary.baseCurrency_wallet * averageExchangeRate
    // );

    // summary.secondaryCurrency_card = (
    //     summary.baseCurrency_card * averageExchangeRate
    // );

    // summary.secondaryCurrency_cash = (
    //     summary.baseCurrency_cash * averageExchangeRate
    // );

    summary.reward.secondaryCurrency_amount =
        summary.reward.baseCurrency_amount * shopExchangeRate;

    summary.secondaryCurrency_doubleMenuItemPrice =
        summary.baseCurrency_doubleMenuItemPrice * shopExchangeRate;

    summary.secondaryCurrency_couponDiscountAmount =
        summary.baseCurrency_couponDiscountAmount * adminExchangeRate;

    summary.secondaryCurrency_punchMarketingDiscountAmount =
        summary.baseCurrency_punchMarketingDiscountAmount * shopExchangeRate ||
        0;

    return summary;
};

exports.applyExchangeRateInOrderAdminCharge = (
    adminCharge_,
    shopExchangeRate,
    adminExchangeRate
) => {
    adminCharge_.baseCurrency_adminChargeFromOrder =
        adminCharge_.dropChargeFromOrder;
    adminCharge_.secondaryCurrency_adminChargeFromOrder =
        adminCharge_.dropChargeFromOrder * shopExchangeRate;

    adminCharge_.baseCurrency_adminChargeFromDelivery =
        adminCharge_.dropChargeFromDelivery;
    adminCharge_.secondaryCurrency_adminChargeFromDelivery =
        adminCharge_.dropChargeFromDelivery * adminExchangeRate;

    adminCharge_.baseCurrency_totalAdminCharge = adminCharge_.totalDropAmount;
    adminCharge_.secondaryCurrency_totalAdminCharge =
        adminCharge_.secondaryCurrency_adminChargeFromOrder +
        adminCharge_.secondaryCurrency_adminChargeFromDelivery;

    return adminCharge_;
};

exports.applyExchangeRateInOrderVatAmount = (vatAmount, shopExchangeRate) => {
    vatAmount.secondaryCurrency_vatForShop =
        vatAmount.baseCurrency_vatForShop * shopExchangeRate;

    vatAmount.secondaryCurrency_vatForAdmin =
        vatAmount.baseCurrency_vatForAdmin * shopExchangeRate;

    return vatAmount;
};

exports.applyExchangeRateInOrderRewardRedeemCut = (
    rewardRedeemCut,
    shopExchangeRate
) => {
    rewardRedeemCut.baseCurrency_rewardAdminCut =
        rewardRedeemCut.rewardAdminCut;
    rewardRedeemCut.secondaryCurrency_rewardAdminCut =
        rewardRedeemCut.rewardAdminCut * shopExchangeRate;

    rewardRedeemCut.baseCurrency_rewardShopCut = rewardRedeemCut.rewardShopCut;
    rewardRedeemCut.secondaryCurrency_rewardShopCut =
        rewardRedeemCut.rewardShopCut * shopExchangeRate;

    return rewardRedeemCut;
};

exports.applyExchangeRateInOrderDiscountCut = (
    discountCut,
    shopExchangeRate
) => {
    discountCut.baseCurrency_discountAdminCut = discountCut.discountAdminCut;
    discountCut.secondaryCurrency_discountAdminCut =
        discountCut.discountAdminCut * shopExchangeRate;

    discountCut.baseCurrency_discountShopCut = discountCut.discountShopCut;
    discountCut.secondaryCurrency_discountShopCut =
        discountCut.discountShopCut * shopExchangeRate;

    return discountCut;
};
exports.applyExchangeRateInOrderDoubleMenuItemPrice = (
    doubleMenuItemPrice,
    shopExchangeRate
) => {
    doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceAdmin =
        doubleMenuItemPrice.doubleMenuItemPriceAdmin;
    doubleMenuItemPrice.secondaryCurrency_doubleMenuItemPriceAdmin =
        doubleMenuItemPrice.doubleMenuItemPriceAdmin * shopExchangeRate;

    doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceShop =
        doubleMenuItemPrice.doubleMenuItemPriceShop;
    doubleMenuItemPrice.secondaryCurrency_doubleMenuItemPriceShop =
        doubleMenuItemPrice.doubleMenuItemPriceShop * shopExchangeRate;

    return doubleMenuItemPrice;
};
exports.applyExchangeRateInOrderDoubleMenuCut = (
    doubleMenuCut,
    shopExchangeRate
) => {
    doubleMenuCut.baseCurrency_doubleMenuAdminCut =
        doubleMenuCut.doubleMenuAdminCut;
    doubleMenuCut.secondaryCurrency_doubleMenuAdminCut =
        doubleMenuCut.doubleMenuAdminCut * shopExchangeRate;

    doubleMenuCut.baseCurrency_doubleMenuShopCut =
        doubleMenuCut.doubleMenuShopCut;
    doubleMenuCut.secondaryCurrency_doubleMenuShopCut =
        doubleMenuCut.doubleMenuShopCut * shopExchangeRate;

    return doubleMenuCut;
};

exports.applyExchangeRateInOrderFreeDeliveryCut = (
    freeDeliveryCut,
    shopExchangeRate,
    adminExchangeRate,
    shopInfo
) => {
    if (shopInfo.haveOwnDeliveryBoy) {
        freeDeliveryCut.secondaryCurrency_freeDeliveryAdminCut =
            freeDeliveryCut.baseCurrency_freeDeliveryAdminCut *
            shopExchangeRate;

        freeDeliveryCut.secondaryCurrency_dropLossForFreeDelivery =
            freeDeliveryCut.baseCurrency_dropLossForFreeDelivery *
            shopExchangeRate;

        freeDeliveryCut.secondaryCurrency_freeDeliveryShopCut =
            freeDeliveryCut.baseCurrency_freeDeliveryShopCut * shopExchangeRate;

        freeDeliveryCut.secondaryCurrency_shopLossForFreeDelivery =
            freeDeliveryCut.baseCurrency_shopLossForFreeDelivery *
            shopExchangeRate;
    } else {
        freeDeliveryCut.secondaryCurrency_freeDeliveryAdminCut =
            freeDeliveryCut.baseCurrency_freeDeliveryAdminCut *
            adminExchangeRate;

        freeDeliveryCut.secondaryCurrency_dropLossForFreeDelivery =
            freeDeliveryCut.baseCurrency_dropLossForFreeDelivery *
            adminExchangeRate;

        freeDeliveryCut.secondaryCurrency_freeDeliveryShopCut =
            freeDeliveryCut.baseCurrency_freeDeliveryShopCut *
            adminExchangeRate;

        freeDeliveryCut.secondaryCurrency_shopLossForFreeDelivery =
            freeDeliveryCut.baseCurrency_shopLossForFreeDelivery *
            adminExchangeRate;
    }

    return freeDeliveryCut;
};

exports.applyExchangeRateInOrderCouponDiscountCut = (
    couponDiscountCut,
    shopExchangeRate
) => {
    couponDiscountCut.secondaryCurrency_couponAdminCut =
        couponDiscountCut.baseCurrency_couponAdminCut * shopExchangeRate;

    couponDiscountCut.secondaryCurrency_couponShopCut =
        couponDiscountCut.baseCurrency_couponShopCut * shopExchangeRate;

    return couponDiscountCut;
};
