const Order = require('../models/OrderModel');
const Butler = require('../models/ButlerModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const UniqueId = require('../models/UniqueIdModel');
const Address = require('../models/AddressModel');
const Product = require('../models/ProductModel');
const moment = require('moment');
const {
    errorResponse,
    errorHandler,
    successResponse,
    scriptResponse,
} = require('../helpers/apiResponse');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const TransactionModel = require('../models/TransactionModel');
const ShopModel = require('../models/ShopModel');
const OrderDeliveryCharge = require('../models/OrderDeliveryCharge');
const UserModel = require('../models/UserModel');
const FlagModel = require('../models/FlagModel');
const ReviewModel = require('../models/ReviewModel');
const CardModel = require('../models/CardModel');
const RewardSettingModel = require('../models/RewardSettingModel');
const Flutterwave = require('flutterwave-node-v3');
const open = require('open');
const util = require('util');
const axios = require('axios').default;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const short = require('short-uuid');
const shortid = require('shortid');
const FlutterTransaction = require('../models/FlutterTransaction');
const { getUserBalance } = require('../helpers/BalanceQuery');
const GlobalDropCharge = require('../models/GlobalDropCharge');
const flw = new Flutterwave(PUBLIC_KEY, SECRET_KEY);
const {
    sendNotificationsAllApp,
    pushNotificationForChat,
    sendNotificationsDeliveryBoyUpdated,
    pushNotificationForCoupon,
    sendNotificationsDeliveryAddressUpdated,
    sendNotificationsAdjustOrder,
} = require('./NotificationController');
const ObjectId = require('mongoose').Types.ObjectId;
const Admin = require('../models/AdminModel');
const AppSetting = require('../models/AppSetting');
const SellerModel = require('../models/SellerModel');
const {
    getCancelObject,
    OrderCancel,
    checkMarketingSpendLimit,
    getFullOrderInformation,
    applyExchangeRateInOrderAdminCharge,
    applyExchangeRateInOrderVatAmount,
    applyExchangeRateInOrderRewardRedeemCut,
    applyExchangeRateInOrderDiscountCut,
    applyExchangeRateInOrderDoubleMenuItemPrice,
    applyExchangeRateInOrderDoubleMenuCut,
    applyExchangeRateInOrderSummary,
    applyExchangeRateInOrderFreeDeliveryCut,
    getFullOrderInformationForButler,
    createTransaction,
    applyExchangeRateInOrderCouponDiscountCut,
} = require('../helpers/orderHelper');
const { sendPlaceOrderEmail } = require('./EmailController');
const { getRendomString } = require('../helpers/utility');
const {
    DistanceInfoGoogle,
    DistanceInfoGoogleWithWayPoints,
} = require('../lib/getDistanceInfo');
const {
    calculateDropShareFromDeliveryCharge,
} = require('../helpers/deliveryCharge');
const { priceValidate } = require('../helpers/priceValidator');
const { transactionForReward } = require('./RewardSettingController');
const CartModel = require('../models/CartModel');
const ReferralSettingModel = require('../models/ReferralSettingModel');
const CouponModel = require('../models/CouponModel');
const ZoneModel = require('../models/ZoneModel');
const { checkShopCapacity } = require('../helpers/checkShopCapacity');
const {
    checkNearByDeliveryBoyShu,
    notifyForUrgentOrder,
    notifyForAdjustOrder,
    checkNearByDeliveryBoy,
    notifiycancelOrder,
} = require('../config/socket');
const MarketingModel = require('../models/MarketingModel');
const OrderModel = require('../models/OrderModel');
const {
    getOrderFinancialBreakdown,
} = require('../helpers/getOrderFinancialBreakdown');
const { DateTime } = require('luxon');
const AdjustOrderRequest = require('../models/AdjustOrderRequest');
const SubscriptionModel = require('../models/SubscriptionModel');
const {
    checkPlusUserProductMarketing,
} = require('../helpers/checkPlusUserMarketing');
const { checkCouponValidity } = require('../helpers/checkCouponValidity');
const { getRiderCashInHand } = require('./FinancialController');
const { calcActiveTime } = require('./DeliveryBoyController');
const DeliveryBoyTimeModel = require('../models/DeliveryBoyTimeModel');
const UserPunchMarketingModel = require('../models/UserPunchMarketingModel');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const {
    removeRiderFromInvalidOrder,
} = require('../helpers/removeRiderFromInvalidOrder');
const AreebaCardModel = require('../models/AreebaCardModel');
const { areebaPaymentGateway } = require('../lib/areebaPaymentGateway');
const OrderRequestModel = require('../models/OrderRequestModel');
const { applyExchangeRate } = require('../helpers/applyExchangeRate');
const {
    avgOrderTimeAfterDelivery,
} = require('../helpers/avgOrderTimeAfterDelivery.js');
const {
    calculateEarnings,
    calculateSecondaryPrice,
} = require('../helpers/utils.js');
const { adminExchangeRate } = require('../helpers/adminExchnageRate.js');
const AttributeModel = require('../models/AttributeModel.js');
const AttributeItemModel = require('../models/AttributeItemModel.js');

exports.getFiveOrder = async (req, res) => {
    try {
        const { userId } = req.query;

        const orders = await Order.find({ users: { $in: userId } })
            .sort({ createdAt: -1 })
            .limit(5);

        successResponse(res, {
            message: 'Successfully get',
            data: orders,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserAndShopOFOrderForDeliveryApp = async (req, res) => {
    try {
        let { startDate, endDate } = req.query;
        const deliveryBoyId = req.deliveryBoyId;

        let config = {
            deliveryBoy: ObjectId(deliveryBoyId),
            orderStatus: 'delivered',
        };

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        const storeInfos = await Order.aggregate([
            {
                $match: config,
            },
            {
                $lookup: {
                    from: 'shops',
                    localField: 'shop',
                    foreignField: '_id',
                    as: 'storeInfo',
                },
            },
            {
                $unwind: '$storeInfo',
            },
            {
                $project: {
                    _id: '$storeInfo._id',
                    name: '$storeInfo.shopName',
                },
            },
        ]);
        const userInfos = await Order.aggregate([
            {
                $match: config,
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo',
                },
            },
            {
                $unwind: '$userInfo',
            },
            {
                $project: {
                    _id: '$userInfo._id',
                    name: '$userInfo.name',
                },
            },
        ]);

        const key = 'name';

        const uniqUser = [...new Map(userInfos.map(i => [i[key], i])).values()];
        const uniqStore = [
            ...new Map(storeInfos.map(i => [i[key], i])).values(),
        ];

        successResponse(res, {
            message: 'Successfully get',
            data: {
                uniqUser,
                uniqStore,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.checkOrderDistance = async (shop, user) => {
    const appSetting = await AppSetting.findOne();
    const km = appSetting ? appSetting.nearByShopKm : 10;
    // const maxDistanceInMeters = 1000 * km;

    let distance = await getDistance(
        user.latitude,
        user.longitude,
        shop.latitude,
        shop.longitude,
        'k'
    );

    if (distance === 0) {
        return true;
    }

    if (!distance) {
        // distance = 1;
        return false;
    }

    if (distance > km) {
        return false;
    }

    return true;
};

const orderCountInDetails = async order => {
    await UserModel.updateMany(
        { _id: { $in: order.users } },
        { $inc: { orderCompleted: 1 } }
    ).exec();
    await avgOrderTimeAfterDelivery(order.shop);
    // await ShopModel.updateOne(
    //     { _id: order.shop },
    //     { $inc: { totalOrder: 1 } }
    // ).exec();
    await DeliveryBoyModel.updateOne(
        { _id: order.deliveryBoy },
        { $inc: { totalOrder: 1 } }
    ).exec();
    await SellerModel.updateOne(
        { _id: order.seller },
        { $inc: { totalOrder: 1 } }
    ).exec();
};

const orderAfterDeliveredWork = async (order, paidCurrency) => {
    // update Urgent and late order count
    if (['urgent'].includes(order.errorOrderType)) {
        notifyForUrgentOrder(order, false);
    }

    // Inc order count
    await orderCountInDetails(order);

    // Subscription feature
    if (order.baseCurrency_pendingSubscriptionFee) {
        const transaction = await TransactionModel.create({
            user: order.user,
            amount: order.baseCurrency_pendingSubscriptionFee,
            secondaryCurrency_amount:
                order.secondaryCurrency_pendingSubscriptionFee,
            userNote: 'Subscription Payment Completed',
            adminNote: `User payment for subscription by using cash`,
            account: 'user',
            type: 'userPayForSubscription',
            status: 'success',
            paymentMethod: 'cash',
            paidCurrency: paidCurrency,
        });

        await SubscriptionModel.updateOne(
            {
                user: order.user,
                subscriptionStatus: 'ongoing',
                paymentMethod: 'cash',
                paymentStatus: 'pending',
            },
            {
                $set: {
                    paymentStatus: 'paid',
                    paidCurrency: paidCurrency,
                },
                $push: {
                    transactions: transaction._id,
                },
            }
        );
    }

    // Replacement order feature
    if (order.isReplacementOrder) {
        await Order.updateOne(
            { _id: order.originalOrder },
            {
                $set: {
                    replacementOrderDelivered: true,
                },
            }
        );
    }

    if (
        order.isRedeemReward ||
        order.summary.baseCurrency_riderFee < 1 ||
        order.summary.baseCurrency_discount > 0 ||
        order.summary.baseCurrency_doubleMenuItemPrice > 0
    ) {
        await checkMarketingSpendLimit(order);
    }

    if (order?.coupon?.couponType === 'referral_code') {
        const referralSetting = await ReferralSettingModel.findOne({});
        const duration = referralSetting?.sender_referralDuration || 30;
        const referralCode = await this.generateReferralCode();
        const startDate = new Date(new Date().setHours(0, 0, 0, 0));
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const endDate = new Date(today.setDate(today.getDate() + duration));

        const coupon = await CouponModel.create({
            couponName: referralCode,
            couponType: 'individual_user',
            couponUsers: [order?.coupon?.couponReferralUser],
            couponDiscountType: referralSetting?.sender_referralDiscountType,
            couponValue: referralSetting?.sender_referralDiscount,
            couponMinimumOrderValue:
                referralSetting?.sender_referralMinimumOrderValue,
            couponUserLimit: 1,
            referralCouponUsedBy: order.user,
            referralCouponUsedOnOrder: order._id,
            couponDuration: {
                start: startDate,
                end: endDate,
            },
        });
        await UserModel.updateOne(
            { _id: order?.coupon?.couponReferralUser },
            {
                $push: {
                    coupons: coupon._id,
                },
            }
        );

        await pushNotificationForCoupon(coupon);
    }

    // check is coupon use new account or old
    if (order?.coupon) {
        const userTotalOrders = await Order.count({
            user: order.user,
            orderStatus: 'delivered',
        });

        if (userTotalOrders === 1) {
            await CouponModel.updateOne(
                { _id: order?.coupon?._id },
                { $inc: { couponUsedNewAccount: 1 } }
            );
        }
    }

    // Update all order transaction paidCurrency
    if (paidCurrency !== 'baseCurrency') {
        await TransactionModel.updateMany(
            {
                order: order._id,
            },
            {
                paidCurrency: paidCurrency,
            }
        );
    }

    // Check rider cash settlement limit
    if (
        order.orderFor === 'global' &&
        order.deliveryBoy &&
        order.summary.baseCurrency_cash > 0
    ) {
        const appSetting = await AppSetting.findOne({}).select(
            'riderBOBCashSettlementLimit'
        );
        const riderBOBCashSettlementLimit =
            appSetting?.riderBOBCashSettlementLimit || 0;

        if (riderBOBCashSettlementLimit > 0) {
            const findRiderOngoingOrders = await Order.countDocuments({
                deliveryBoy: ObjectId(order.deliveryBoy),
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
            });

            if (findRiderOngoingOrders < 1) {
                const { riderCashInHand } = await getRiderCashInHand({
                    riderId: order.deliveryBoy,
                });

                if (riderCashInHand >= riderBOBCashSettlementLimit) {
                    const rider = await DeliveryBoyModel.findById(
                        order.deliveryBoy
                    ).select('liveStatus');

                    if (rider.liveStatus !== 'offline') {
                        const lastOnline = rider.lastOnline || new Date();

                        const total = calcActiveTime(lastOnline, new Date());
                        await DeliveryBoyTimeModel.create({
                            delivery: order.deliveryBoy,
                            Date: new Date(),
                            timeIn: lastOnline,
                            timeOut: moment(new Date()).format(
                                'DD MMM YYYY hh:mm A'
                            ),
                            activeTotal: total,
                        });
                    }

                    await DeliveryBoyModel.findByIdAndUpdate(
                        order.deliveryBoy,
                        {
                            $set: {
                                liveStatus: 'offline',
                                isCashSettlementLimitReached: true,
                            },
                        }
                    );
                }
            }
        }
    }

    // Punch marketing feature
    // if (order.punchMarketingApplied) { // Check this in future
    const userPunchMarketing = await UserPunchMarketingModel.findOne({
        user: order.user,
        shop: order.shop,
        status: 'ongoing',
    });

    if (userPunchMarketing) {
        userPunchMarketing.completedOrders++;
        if (
            userPunchMarketing.completedOrders >=
            userPunchMarketing.punchTargetOrders
        ) {
            userPunchMarketing.expiredDate = moment().add(
                userPunchMarketing.punchCouponDuration,
                'days'
            );
            userPunchMarketing.status = 'completed';
        }

        await userPunchMarketing.save();
    }
    //  }
    if (order.summary.baseCurrency_punchMarketingDiscountAmount > 0) {
        await UserPunchMarketingModel.updateOne(
            {
                user: order.user,
                shop: order.shop,
                status: 'completed',
            },
            {
                $set: {
                    status: 'applied',
                    appliedAt: new Date(),
                    baseCurrency_punchMarketingDiscountAmount:
                        order.summary.baseCurrency_punchMarketingDiscountAmount,
                    secondaryCurrency_punchMarketingDiscountAmount:
                        order.summary
                            .secondaryCurrency_punchMarketingDiscountAmount,
                },
            }
        );
    }

    // Track user repeatedOrderAt
    const users = await UserModel.find({
        _id: { $in: order.users },
        orderCompleted: 2,
    });
    if (users.length > 0) {
        const usersId = users.map(user => user._id);
        await UserModel.updateMany(
            { _id: { $in: usersId } },
            {
                $set: {
                    repeatedOrderAt: new Date(),
                },
            }
        );
    }
};

exports.deliveryManAcceptOrder = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const {
            orderId,
            acceptedLocation: { longitude, latitude },
        } = req.body;

        // order check
        const order = await Order.findOne({ _id: orderId });

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        const { sta, message } = await deliveryBoyAcceptedWork(
            order,
            deliveryBoyId
        );
        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsDeliveryBoyUpdated(updatedOrder);

        // await sendNotificationsAllApp(updatedOrder);

        res.status(200).json({
            status: true,
            message: 'Order accepted successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

const deliveryBoyAcceptedWork = async (order, deliveryBoyId, admin = false) => {
    try {
        if (!admin) {
            if (
                order?.deliveryBoy &&
                order?.deliveryBoy?.toString() === deliveryBoyId.toString()
            ) {
                return new Error('Order has been allocated to you already.');
            }

            if (
                !['placed', 'preparing', 'ready_to_pickup'].includes(
                    order.orderStatus
                ) ||
                order?.deliveryBoy
            ) {
                return {
                    sta: false,
                    message: `Order has already been ${order?.orderStatus}`,
                };
            }
        }

        if (order.orderFor === 'specific') {
            return {
                sta: false,
                message: "Delivery Boy can't accepted this order",
            };
        }

        let newTimeline = order.timeline;
        const acceptedDeliveryBoyTimeline = newTimeline.find(
            timeline => timeline.status === 'accepted_delivery_boy'
        );
        acceptedDeliveryBoyTimeline.active = true;
        acceptedDeliveryBoyTimeline.createdAt = new Date();

        const deliveryBoy = await DeliveryBoyModel.findOne({
            _id: deliveryBoyId,
        });

        const shopInfo = await ShopModel.findOne({
            _id: order.shop,
        });

        const userInfo = await UserModel.findOne({
            _id: order.user,
        });

        let deliveryBoyShopDistance;
        let delivered_time;
        let orderTripSummary = [];

        const riderFirstOrder = await Order.findOne({
            deliveryBoy: deliveryBoyId,
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

        if (
            order?.isReplacementOrder &&
            order?.replacementOrderDeliveryInfo?.deliveryType ===
            'shop-customer-shop'
        ) {
            // For replacement order feature
            deliveryBoyShopDistance = await DistanceInfoGoogle({
                origin: {
                    latitude: deliveryBoy?.location?.coordinates?.[1],
                    longitute: deliveryBoy?.location?.coordinates?.[0],
                },
                distination: {
                    latitude: shopInfo.location?.coordinates?.[1],
                    longitute: shopInfo.location?.coordinates?.[0],
                },
            });

            // Calculate delivered_time
            if (order.preparingTime > 0) {
                if (
                    Number(deliveryBoyShopDistance?.duration?.value) / 60 >
                    order.preparingTime
                ) {
                    delivered_time = new Date();
                    delivered_time.setMinutes(
                        delivered_time.getMinutes() +
                        Number(order.userShopDistance?.duration?.value) /
                        60 +
                        Number(deliveryBoyShopDistance?.duration?.value) /
                        60
                    );
                }
            } else {
                if (
                    Number(deliveryBoyShopDistance?.duration?.value) / 60 >
                    15
                ) {
                    delivered_time = new Date();
                    delivered_time.setMinutes(
                        delivered_time.getMinutes() +
                        Number(order.userShopDistance?.duration?.value) /
                        60 +
                        Number(deliveryBoyShopDistance?.duration?.value) /
                        60
                    );
                }
            }

            //*** Create trip summary start ***/
            const { distance, duration, legs, overview_polyline } =
                await DistanceInfoGoogleWithWayPoints({
                    origin: {
                        latitude: deliveryBoy.location?.coordinates?.[1],
                        longitude: deliveryBoy.location?.coordinates?.[0],
                    },
                    destination: {
                        latitude:
                            order.pickUpLocation.location?.coordinates?.[1],
                        longitude:
                            order.pickUpLocation.location?.coordinates?.[0],
                    },
                    waypoints: [
                        {
                            latitude:
                                order.pickUpLocation.location?.coordinates?.[1],
                            longitude:
                                order.pickUpLocation.location?.coordinates?.[0],
                        },
                        {
                            latitude:
                                order.dropOffLocation.location
                                    ?.coordinates?.[1],
                            longitude:
                                order.dropOffLocation.location
                                    ?.coordinates?.[0],
                        },
                    ],
                });

            orderTripSummary = [
                {
                    name: deliveryBoy.name,
                    address: deliveryBoy.address,
                    latitude: deliveryBoy.location?.coordinates?.[1],
                    longitude: deliveryBoy.location?.coordinates?.[0],
                    type: 'rider',
                    deliveryBoy: deliveryBoy._id,
                    order: [order._id],
                    totalDistance: distance,
                    totalDuration: duration,
                    total_overview_polyline: overview_polyline,
                    distance: legs?.[0].distance,
                    duration: legs?.[0].duration,
                    overview_polyline: legs?.[0].overview_polyline,
                },
                {
                    name: shopInfo.shopName,
                    address: shopInfo.address.address,
                    latitude: shopInfo.location.coordinates?.[1],
                    longitude: shopInfo.location.coordinates?.[0],
                    type: 'shop',
                    shopType: shopInfo.shopType,
                    shop: shopInfo._id,
                    order: [order._id],
                    distance: legs?.[1].distance,
                    duration: legs?.[1].duration,
                    overview_polyline: legs?.[1].overview_polyline,
                },
                {
                    name: userInfo.name,
                    address: order.dropOffLocation.address,
                    latitude: order.dropOffLocation.location.coordinates?.[1],
                    longitude: order.dropOffLocation.location.coordinates?.[0],
                    type: 'user',
                    user: userInfo._id,
                    order: [order._id],
                    distance: legs?.[2].distance,
                    duration: legs?.[2].duration,
                    overview_polyline: legs?.[2].overview_polyline,
                },
                {
                    name: shopInfo.shopName,
                    address: shopInfo.address.address,
                    latitude: shopInfo.location.coordinates?.[1],
                    longitude: shopInfo.location.coordinates?.[0],
                    type: 'shop',
                    shopType: shopInfo.shopType,
                    shop: shopInfo._id,
                    order: [order._id],
                },
            ];
            //*** Create trip summary end ***/
        } else {
            deliveryBoyShopDistance = await DistanceInfoGoogle({
                origin: {
                    latitude: deliveryBoy.location.coordinates?.[1],
                    longitute: deliveryBoy.location.coordinates?.[0],
                },
                distination: {
                    latitude: shopInfo.location.coordinates?.[1],
                    longitute: shopInfo.location.coordinates?.[0],
                },
            });

            // Calculate delivered_time
            if (order.preparingTime > 0) {
                if (
                    Number(deliveryBoyShopDistance?.duration?.value) / 60 >
                    order.preparingTime
                ) {
                    delivered_time = new Date();
                    delivered_time.setMinutes(
                        delivered_time.getMinutes() +
                        Number(order.userShopDistance?.duration?.value) /
                        60 +
                        Number(deliveryBoyShopDistance?.duration?.value) /
                        60
                    );
                }
            } else {
                if (
                    Number(deliveryBoyShopDistance?.duration?.value) / 60 >
                    15
                ) {
                    delivered_time = new Date();
                    delivered_time.setMinutes(
                        delivered_time.getMinutes() +
                        Number(order.userShopDistance?.duration?.value) /
                        60 +
                        Number(deliveryBoyShopDistance?.duration?.value) /
                        60
                    );
                }
            }

            //*** Create trip summary start ***/

            if (!riderFirstOrder) {
                const { distance, duration, legs, overview_polyline } =
                    await DistanceInfoGoogleWithWayPoints({
                        origin: {
                            latitude: deliveryBoy.location.coordinates?.[1],
                            longitude: deliveryBoy.location.coordinates?.[0],
                        },
                        destination: {
                            latitude:
                                order.dropOffLocation.location.coordinates?.[1],
                            longitude:
                                order.dropOffLocation.location.coordinates?.[0],
                        },
                        waypoints: [
                            {
                                latitude: shopInfo.location.coordinates?.[1],
                                longitude: shopInfo.location.coordinates?.[0],
                            },
                        ],
                    });

                orderTripSummary = [
                    {
                        name: deliveryBoy.name,
                        address: deliveryBoy.address,
                        latitude: deliveryBoy.location.coordinates?.[1],
                        longitude: deliveryBoy.location.coordinates?.[0],
                        type: 'rider',
                        deliveryBoy: deliveryBoy._id,
                        order: [order._id],
                        totalDistance: distance,
                        totalDuration: duration,
                        total_overview_polyline: overview_polyline,
                        distance: legs?.[0].distance,
                        duration: legs?.[0].duration,
                        overview_polyline: legs?.[0].overview_polyline,
                    },
                    {
                        name: shopInfo.shopName,
                        address: shopInfo.address.address,
                        latitude: shopInfo.location.coordinates?.[1],
                        longitude: shopInfo.location.coordinates?.[0],
                        type: 'shop',
                        shopType: shopInfo.shopType,
                        shop: shopInfo._id,
                        order: [order._id],
                        distance: legs?.[1].distance,
                        duration: legs?.[1].duration,
                        overview_polyline: legs?.[1].overview_polyline,
                    },
                    {
                        name: userInfo.name,
                        address: order.dropOffLocation.address,
                        latitude:
                            order.dropOffLocation.location.coordinates?.[1],
                        longitude:
                            order.dropOffLocation.location.coordinates?.[0],
                        type: 'user',
                        user: userInfo._id,
                        order: [order._id],
                    },
                ];
            } else {
                const isRiderInDeliveredFirstDeliveryBoyList =
                    order?.deliveredFirstDeliveryBoyList?.find(
                        riderId =>
                            riderId.toString() === deliveryBoyId.toString()
                    );
                const isRiderInDeliveredSecondDeliveryBoyList =
                    order?.deliveredSecondDeliveryBoyList?.find(
                        riderId =>
                            riderId.toString() === deliveryBoyId.toString()
                    );

                if (
                    !isRiderInDeliveredFirstDeliveryBoyList &&
                    !isRiderInDeliveredSecondDeliveryBoyList
                ) {
                    // if (
                    //     riderFirstOrder.shop._id.toString() ===
                    //     shopInfo._id.toString() &&
                    //     riderFirstOrder.dropOffLocation.address.toString() ===
                    //     order.dropOffLocation.address.toString()
                    // ) {
                    //     const { distance, duration, legs, overview_polyline } =
                    //         await DistanceInfoGoogleWithWayPoints({
                    //             origin: {
                    //                 latitude:
                    //                     deliveryBoy.location.coordinates?.[1],
                    //                 longitude:
                    //                     deliveryBoy.location.coordinates?.[0],
                    //             },
                    //             destination: {
                    //                 latitude:
                    //                     order.dropOffLocation.location
                    //                         .coordinates?.[1],
                    //                 longitude:
                    //                     order.dropOffLocation.location
                    //                         .coordinates?.[0],
                    //             },
                    //             waypoints: [
                    //                 {
                    //                     latitude:
                    //                         shopInfo.location.coordinates?.[1],
                    //                     longitude:
                    //                         shopInfo.location.coordinates?.[0],
                    //                 },
                    //             ],
                    //         });

                    //     orderTripSummary = [
                    //         {
                    //             name: deliveryBoy.name,
                    //             address: deliveryBoy.address,
                    //             latitude: deliveryBoy.location.coordinates?.[1],
                    //             longitude:
                    //                 deliveryBoy.location.coordinates?.[0],
                    //             type: 'rider',
                    //             deliveryBoy: deliveryBoy._id,
                    //             order: [riderFirstOrder._id, order._id],
                    //             totalDistance: distance,
                    //             totalDuration: duration,
                    //             total_overview_polyline: overview_polyline,
                    //             distance: legs?.[0].distance,
                    //             duration: legs?.[0].duration,
                    //             overview_polyline: legs?.[0].overview_polyline,
                    //         },
                    //         {
                    //             name: shopInfo.shopName,
                    //             address: shopInfo.address.address,
                    //             latitude: shopInfo.location.coordinates?.[1],
                    //             longitude: shopInfo.location.coordinates?.[0],
                    //             type: 'shop',
                    //             shopType: shopInfo.shopType,
                    //             shop: shopInfo._id,
                    //             order: [riderFirstOrder._id, order._id],
                    //             distance: legs?.[1].distance,
                    //             duration: legs?.[1].duration,
                    //             overview_polyline: legs?.[1].overview_polyline,
                    //         },
                    //         {
                    //             name: userInfo.name,
                    //             address: order.dropOffLocation.address,
                    //             latitude:
                    //                 order.dropOffLocation.location
                    //                     .coordinates?.[1],
                    //             longitude:
                    //                 order.dropOffLocation.location
                    //                     .coordinates?.[0],
                    //             type: 'user',
                    //             user: userInfo._id,
                    //             order: [riderFirstOrder._id, order._id],
                    //             twoOrdersContainInSameUser: true,
                    //         },
                    //     ];
                    // } else

                    if (
                        riderFirstOrder.shop._id.toString() ===
                        shopInfo._id.toString()
                    ) {
                        const { distance, duration, legs, overview_polyline } =
                            await DistanceInfoGoogleWithWayPoints({
                                origin: {
                                    latitude:
                                        deliveryBoy.location.coordinates?.[1],
                                    longitude:
                                        deliveryBoy.location.coordinates?.[0],
                                },
                                destination: {
                                    latitude:
                                        order.dropOffLocation.location
                                            .coordinates?.[1],
                                    longitude:
                                        order.dropOffLocation.location
                                            .coordinates?.[0],
                                },
                                waypoints: [
                                    {
                                        latitude:
                                            shopInfo.location.coordinates?.[1],
                                        longitude:
                                            shopInfo.location.coordinates?.[0],
                                    },
                                    {
                                        latitude:
                                            riderFirstOrder.dropOffLocation
                                                .location.coordinates?.[1],
                                        longitude:
                                            riderFirstOrder.dropOffLocation
                                                .location.coordinates?.[0],
                                    },
                                ],
                            });

                        orderTripSummary = [
                            {
                                name: deliveryBoy.name,
                                address: deliveryBoy.address,
                                latitude: deliveryBoy.location.coordinates?.[1],
                                longitude:
                                    deliveryBoy.location.coordinates?.[0],
                                type: 'rider',
                                deliveryBoy: deliveryBoy._id,
                                order: [riderFirstOrder._id, order._id],
                                totalDistance: distance,
                                totalDuration: duration,
                                total_overview_polyline: overview_polyline,
                                distance: legs?.[0].distance,
                                duration: legs?.[0].duration,
                                overview_polyline: legs?.[0].overview_polyline,
                            },
                            {
                                name: shopInfo.shopName,
                                address: shopInfo.address.address,
                                latitude: shopInfo.location.coordinates?.[1],
                                longitude: shopInfo.location.coordinates?.[0],
                                type: 'shop',
                                shopType: shopInfo.shopType,
                                shop: shopInfo._id,
                                order: [riderFirstOrder._id, order._id],
                                distance: legs?.[1].distance,
                                duration: legs?.[1].duration,
                                overview_polyline: legs?.[1].overview_polyline,
                            },
                            {
                                name: riderFirstOrder.user.name,
                                address:
                                    riderFirstOrder.dropOffLocation.address,
                                latitude:
                                    riderFirstOrder.dropOffLocation.location
                                        .coordinates?.[1],
                                longitude:
                                    riderFirstOrder.dropOffLocation.location
                                        .coordinates?.[0],
                                type: 'user',
                                user: riderFirstOrder.user._id,
                                order: [riderFirstOrder._id],
                                distance: legs?.[2].distance,
                                duration: legs?.[2].duration,
                                overview_polyline: legs?.[2].overview_polyline,
                            },
                            {
                                name: userInfo.name,
                                address: order.dropOffLocation.address,
                                latitude:
                                    order.dropOffLocation.location
                                        .coordinates?.[1],
                                longitude:
                                    order.dropOffLocation.location
                                        .coordinates?.[0],
                                type: 'user',
                                user: userInfo._id,
                                order: [order._id],
                            },
                        ];
                    }
                    // else if (
                    //     riderFirstOrder.dropOffLocation.address.toString() ===
                    //     order.dropOffLocation.address.toString()
                    // ) {
                    //     const { distance, duration, legs, overview_polyline } =
                    //         await DistanceInfoGoogleWithWayPoints({
                    //             origin: {
                    //                 latitude:
                    //                     deliveryBoy.location.coordinates?.[1],
                    //                 longitude:
                    //                     deliveryBoy.location.coordinates?.[0],
                    //             },
                    //             destination: {
                    //                 latitude:
                    //                     order.dropOffLocation.location
                    //                         .coordinates?.[1],
                    //                 longitude:
                    //                     order.dropOffLocation.location
                    //                         .coordinates?.[0],
                    //             },
                    //             waypoints: [
                    //                 {
                    //                     latitude:
                    //                         riderFirstOrder.shop.location
                    //                             .coordinates?.[1],
                    //                     longitude:
                    //                         riderFirstOrder.shop.location
                    //                             .coordinates?.[0],
                    //                 },
                    //                 {
                    //                     latitude:
                    //                         shopInfo.location.coordinates?.[1],
                    //                     longitude:
                    //                         shopInfo.location.coordinates?.[0],
                    //                 },
                    //             ],
                    //         });

                    //     orderTripSummary = [
                    //         {
                    //             name: deliveryBoy.name,
                    //             address: deliveryBoy.address,
                    //             latitude: deliveryBoy.location.coordinates?.[1],
                    //             longitude:
                    //                 deliveryBoy.location.coordinates?.[0],
                    //             type: 'rider',
                    //             deliveryBoy: deliveryBoy._id,
                    //             order: [riderFirstOrder._id, order._id],
                    //             totalDistance: distance,
                    //             totalDuration: duration,
                    //             total_overview_polyline: overview_polyline,
                    //             distance: legs?.[0].distance,
                    //             duration: legs?.[0].duration,
                    //             overview_polyline: legs?.[0].overview_polyline,
                    //         },
                    //         {
                    //             name: riderFirstOrder.shop.shopName,
                    //             address: riderFirstOrder.shop.address.address,
                    //             latitude:
                    //                 riderFirstOrder.shop.location
                    //                     .coordinates?.[1],
                    //             longitude:
                    //                 riderFirstOrder.shop.location
                    //                     .coordinates?.[0],
                    //             type: 'shop',
                    //             shopType: riderFirstOrder.shop.shopType,
                    //             shop: riderFirstOrder.shop._id,
                    //             order: [riderFirstOrder._id],
                    //             distance: legs?.[1].distance,
                    //             duration: legs?.[1].duration,
                    //             overview_polyline: legs?.[1].overview_polyline,
                    //         },
                    //         {
                    //             name: shopInfo.shopName,
                    //             address: shopInfo.address.address,
                    //             latitude: shopInfo.location.coordinates?.[1],
                    //             longitude: shopInfo.location.coordinates?.[0],
                    //             type: 'shop',
                    //             shopType: shopInfo.shopType,
                    //             shop: shopInfo._id,
                    //             order: [order._id],
                    //             distance: legs?.[2].distance,
                    //             duration: legs?.[2].duration,
                    //             overview_polyline: legs?.[2].overview_polyline,
                    //         },
                    //         {
                    //             name: userInfo.name,
                    //             address: order.dropOffLocation.address,
                    //             latitude:
                    //                 order.dropOffLocation.location
                    //                     .coordinates?.[1],
                    //             longitude:
                    //                 order.dropOffLocation.location
                    //                     .coordinates?.[0],
                    //             type: 'user',
                    //             user: userInfo._id,
                    //             order: [riderFirstOrder._id, order._id],
                    //             twoOrdersContainInSameUser: true,
                    //         },
                    //     ];
                    // }
                    else {
                        const { distance, duration, legs, overview_polyline } =
                            await DistanceInfoGoogleWithWayPoints({
                                origin: {
                                    latitude:
                                        deliveryBoy.location.coordinates?.[1],
                                    longitude:
                                        deliveryBoy.location.coordinates?.[0],
                                },
                                destination: {
                                    latitude:
                                        order.dropOffLocation.location
                                            .coordinates?.[1],
                                    longitude:
                                        order.dropOffLocation.location
                                            .coordinates?.[0],
                                },
                                waypoints: [
                                    {
                                        latitude:
                                            riderFirstOrder.shop.location
                                                .coordinates?.[1],
                                        longitude:
                                            riderFirstOrder.shop.location
                                                .coordinates?.[0],
                                    },
                                    {
                                        latitude:
                                            shopInfo.location.coordinates?.[1],
                                        longitude:
                                            shopInfo.location.coordinates?.[0],
                                    },
                                    {
                                        latitude:
                                            riderFirstOrder.dropOffLocation
                                                .location.coordinates?.[1],
                                        longitude:
                                            riderFirstOrder.dropOffLocation
                                                .location.coordinates?.[0],
                                    },
                                ],
                            });

                        orderTripSummary = [
                            {
                                name: deliveryBoy.name,
                                address: deliveryBoy.address,
                                latitude: deliveryBoy.location.coordinates?.[1],
                                longitude:
                                    deliveryBoy.location.coordinates?.[0],
                                type: 'rider',
                                deliveryBoy: deliveryBoy._id,
                                order: [riderFirstOrder._id, order._id],
                                totalDistance: distance,
                                totalDuration: duration,
                                total_overview_polyline: overview_polyline,
                                distance: legs?.[0].distance,
                                duration: legs?.[0].duration,
                                overview_polyline: legs?.[0].overview_polyline,
                            },
                            {
                                name: riderFirstOrder.shop.shopName,
                                address: riderFirstOrder.shop.address.address,
                                latitude:
                                    riderFirstOrder.shop.location
                                        .coordinates?.[1],
                                longitude:
                                    riderFirstOrder.shop.location
                                        .coordinates?.[0],
                                type: 'shop',
                                shopType: riderFirstOrder.shop.shopType,
                                shop: riderFirstOrder.shop._id,
                                order: [riderFirstOrder._id],
                                distance: legs?.[1].distance,
                                duration: legs?.[1].duration,
                                overview_polyline: legs?.[1].overview_polyline,
                            },
                            {
                                name: shopInfo.shopName,
                                address: shopInfo.address.address,
                                latitude: shopInfo.location.coordinates?.[1],
                                longitude: shopInfo.location.coordinates?.[0],
                                type: 'shop',
                                shopType: shopInfo.shopType,
                                shop: shopInfo._id,
                                order: [order._id],
                                distance: legs?.[2].distance,
                                duration: legs?.[2].duration,
                                overview_polyline: legs?.[2].overview_polyline,
                            },
                            {
                                name: riderFirstOrder.user.name,
                                address:
                                    riderFirstOrder.dropOffLocation.address,
                                latitude:
                                    riderFirstOrder.dropOffLocation.location
                                        .coordinates?.[1],
                                longitude:
                                    riderFirstOrder.dropOffLocation.location
                                        .coordinates?.[0],
                                type: 'user',
                                user: riderFirstOrder.user._id,
                                order: [riderFirstOrder._id],
                                distance: legs?.[3].distance,
                                duration: legs?.[3].duration,
                                overview_polyline: legs?.[3].overview_polyline,
                            },
                            {
                                name: userInfo.name,
                                address: order.dropOffLocation.address,
                                latitude:
                                    order.dropOffLocation.location
                                        .coordinates?.[1],
                                longitude:
                                    order.dropOffLocation.location
                                        .coordinates?.[0],
                                type: 'user',
                                user: userInfo._id,
                                order: [order._id],
                            },
                        ];
                    }
                } else if (isRiderInDeliveredFirstDeliveryBoyList) {
                    const { distance, duration, legs, overview_polyline } =
                        await DistanceInfoGoogleWithWayPoints({
                            origin: {
                                latitude: deliveryBoy.location.coordinates?.[1],
                                longitude:
                                    deliveryBoy.location.coordinates?.[0],
                            },
                            destination: {
                                latitude:
                                    order.dropOffLocation.location
                                        .coordinates?.[1],
                                longitude:
                                    order.dropOffLocation.location
                                        .coordinates?.[0],
                            },
                            waypoints: [
                                {
                                    latitude:
                                        riderFirstOrder.shop.location
                                            .coordinates?.[1],
                                    longitude:
                                        riderFirstOrder.shop.location
                                            .coordinates?.[0],
                                },
                                {
                                    latitude:
                                        riderFirstOrder.dropOffLocation.location
                                            .coordinates?.[1],
                                    longitude:
                                        riderFirstOrder.dropOffLocation.location
                                            .coordinates?.[0],
                                },
                                {
                                    latitude:
                                        shopInfo.location.coordinates?.[1],
                                    longitude:
                                        shopInfo.location.coordinates?.[0],
                                },
                            ],
                        });

                    orderTripSummary = [
                        {
                            name: deliveryBoy.name,
                            address: deliveryBoy.address,
                            latitude: deliveryBoy.location.coordinates?.[1],
                            longitude: deliveryBoy.location.coordinates?.[0],
                            type: 'rider',
                            deliveryBoy: deliveryBoy._id,
                            order: [riderFirstOrder._id, order._id],
                            totalDistance: distance,
                            totalDuration: duration,
                            total_overview_polyline: overview_polyline,
                            distance: legs?.[0].distance,
                            duration: legs?.[0].duration,
                            overview_polyline: legs?.[0].overview_polyline,
                        },
                        {
                            name: riderFirstOrder.shop.shopName,
                            address: riderFirstOrder.shop.address.address,
                            latitude:
                                riderFirstOrder.shop.location.coordinates?.[1],
                            longitude:
                                riderFirstOrder.shop.location.coordinates?.[0],
                            type: 'shop',
                            shopType: riderFirstOrder.shop.shopType,
                            shop: riderFirstOrder.shop._id,
                            order: [riderFirstOrder._id],
                            distance: legs?.[1].distance,
                            duration: legs?.[1].duration,
                            overview_polyline: legs?.[1].overview_polyline,
                        },
                        {
                            name: riderFirstOrder.user.name,
                            address: riderFirstOrder.dropOffLocation.address,
                            latitude:
                                riderFirstOrder.dropOffLocation.location
                                    .coordinates?.[1],
                            longitude:
                                riderFirstOrder.dropOffLocation.location
                                    .coordinates?.[0],
                            type: 'user',
                            user: riderFirstOrder.user._id,
                            order: [riderFirstOrder._id],
                            distance: legs?.[2].distance,
                            duration: legs?.[2].duration,
                            overview_polyline: legs?.[2].overview_polyline,
                        },
                        {
                            name: shopInfo.shopName,
                            address: shopInfo.address.address,
                            latitude: shopInfo.location.coordinates?.[1],
                            longitude: shopInfo.location.coordinates?.[0],
                            type: 'shop',
                            shopType: shopInfo.shopType,
                            shop: shopInfo._id,
                            order: [order._id],
                            distance: legs?.[3].distance,
                            duration: legs?.[3].duration,
                            overview_polyline: legs?.[3].overview_polyline,
                        },
                        {
                            name: userInfo.name,
                            address: order.dropOffLocation.address,
                            latitude:
                                order.dropOffLocation.location.coordinates?.[1],
                            longitude:
                                order.dropOffLocation.location.coordinates?.[0],
                            type: 'user',
                            user: userInfo._id,
                            order: [order._id],
                        },
                    ];
                } else if (isRiderInDeliveredSecondDeliveryBoyList) {
                    const { distance, duration, legs, overview_polyline } =
                        await DistanceInfoGoogleWithWayPoints({
                            origin: {
                                latitude: deliveryBoy.location.coordinates?.[1],
                                longitude:
                                    deliveryBoy.location.coordinates?.[0],
                            },
                            destination: {
                                latitude:
                                    riderFirstOrder.dropOffLocation.location
                                        .coordinates?.[1],
                                longitude:
                                    riderFirstOrder.dropOffLocation.location
                                        .coordinates?.[0],
                            },
                            waypoints: [
                                {
                                    latitude:
                                        shopInfo.location.coordinates?.[1],
                                    longitude:
                                        shopInfo.location.coordinates?.[0],
                                },
                                {
                                    latitude:
                                        order.dropOffLocation.location
                                            .coordinates?.[1],
                                    longitude:
                                        order.dropOffLocation.location
                                            .coordinates?.[0],
                                },
                                {
                                    latitude:
                                        riderFirstOrder.shop.location
                                            .coordinates?.[1],
                                    longitude:
                                        riderFirstOrder.shop.location
                                            .coordinates?.[0],
                                },
                            ],
                        });

                    orderTripSummary = [
                        {
                            name: deliveryBoy.name,
                            address: deliveryBoy.address,
                            latitude: deliveryBoy.location.coordinates?.[1],
                            longitude: deliveryBoy.location.coordinates?.[0],
                            type: 'rider',
                            deliveryBoy: deliveryBoy._id,
                            order: [order._id, riderFirstOrder._id],
                            totalDistance: distance,
                            totalDuration: duration,
                            total_overview_polyline: overview_polyline,
                            distance: legs?.[0].distance,
                            duration: legs?.[0].duration,
                            overview_polyline: legs?.[0].overview_polyline,
                        },
                        {
                            name: shopInfo.shopName,
                            address: shopInfo.address.address,
                            latitude: shopInfo.location.coordinates?.[1],
                            longitude: shopInfo.location.coordinates?.[0],
                            type: 'shop',
                            shopType: shopInfo.shopType,
                            shop: shopInfo._id,
                            order: [order._id],
                            distance: legs?.[1].distance,
                            duration: legs?.[1].duration,
                            overview_polyline: legs?.[1].overview_polyline,
                        },
                        {
                            name: userInfo.name,
                            address: order.dropOffLocation.address,
                            latitude:
                                order.dropOffLocation.location.coordinates?.[1],
                            longitude:
                                order.dropOffLocation.location.coordinates?.[0],
                            type: 'user',
                            user: userInfo._id,
                            order: [order._id],
                            distance: legs?.[2].distance,
                            duration: legs?.[2].duration,
                            overview_polyline: legs?.[2].overview_polyline,
                        },
                        {
                            name: riderFirstOrder.shop.shopName,
                            address: riderFirstOrder.shop.address.address,
                            latitude:
                                riderFirstOrder.shop.location.coordinates?.[1],
                            longitude:
                                riderFirstOrder.shop.location.coordinates?.[0],
                            type: 'shop',
                            shopType: riderFirstOrder.shop.shopType,
                            shop: riderFirstOrder.shop._id,
                            order: [riderFirstOrder._id],
                            distance: legs?.[3].distance,
                            duration: legs?.[3].duration,
                            overview_polyline: legs?.[3].overview_polyline,
                        },
                        {
                            name: riderFirstOrder.user.name,
                            address: riderFirstOrder.dropOffLocation.address,
                            latitude:
                                riderFirstOrder.dropOffLocation.location
                                    .coordinates?.[1],
                            longitude:
                                riderFirstOrder.dropOffLocation.location
                                    .coordinates?.[0],
                            type: 'user',
                            user: riderFirstOrder.user._id,
                            order: [riderFirstOrder._id],
                        },
                    ];
                }

                // riderFirstOrder.orderTripSummary = orderTripSummary;
                // await riderFirstOrder.save();
            }
            //*** Create trip summary end ***/
        }

        //*** Only for checking with updated order Start ***/
        if (!admin) {
            const checkOrder = await Order.findOne({ _id: order._id }).select(
                'orderStatus'
            );

            if (
                checkOrder &&
                (!['placed', 'preparing', 'ready_to_pickup'].includes(
                    checkOrder?.orderStatus
                ) ||
                    checkOrder?.deliveryBoy)
            ) {
                return {
                    sta: false,
                    message: `Order has already been ${checkOrder?.orderStatus}`,
                };
            }
        }

        // Check delivery boy order limitation
        const readyOrders = await Order.countDocuments({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: ['ready_to_pickup', 'order_on_the_way'],
            },
        });
        const ongoingOrders = await Order.countDocuments({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: ['accepted_delivery_boy', 'preparing'],
            },
        });
        const butlers = await Butler.countDocuments({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: ['accepted_delivery_boy', 'order_on_the_way'],
            },
        });
        const replacementOrders = await Order.countDocuments({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: [
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
            isReplacementOrder: true,
            'replacementOrderDeliveryInfo.deliveryType': 'shop-customer-shop',
        });

        if (
            ongoingOrders > 1 ||
            readyOrders > 0 ||
            butlers > 0 ||
            replacementOrders > 0
        ) {
            return {
                sta: false,
                message: `Delivery Boy isn't available right now.`,
            };
        }
        //*** Only for checking with updated order End ***/

        if (
            admin &&
            [
                'accepted_delivery_boy',
                'preparing',
                'ready_to_pickup',
                'order_on_the_way',
            ].includes(order.orderStatus) &&
            order?.deliveryBoy
        ) {
            await Order.updateOne(
                {
                    _id: order._id,
                },
                {
                    deliveryBoy: deliveryBoyId,
                    $set: {
                        deliveryBoyShopDistance: deliveryBoyShopDistance,
                        orderTripSummary: orderTripSummary,
                        delivered_time: delivered_time,
                    },
                }
            );
        } else if (
            ['preparing', 'ready_to_pickup'].includes(order.orderStatus) &&
            !order?.deliveryBoy
        ) {
            await Order.updateOne(
                {
                    _id: order._id,
                },
                {
                    deliveryBoy: deliveryBoyId,
                    timeline: newTimeline,
                    accepted_delivery_boyAt: new Date(),
                    $push: {
                        orderActivity: admin
                            ? {
                                note: 'Admin assign delivery Boy',
                                activityBy: 'deliveryBoy',
                                deliveryBoy: deliveryBoyId,
                                createdAt: new Date(),
                            }
                            : {
                                note: 'Accepted Order by delivery Boy',
                                activityBy: 'deliveryBoy',
                                deliveryBoy: deliveryBoyId,
                                createdAt: new Date(),
                            },
                    },
                    $set: {
                        deliveryBoyShopDistance: deliveryBoyShopDistance,
                        orderTripSummary: orderTripSummary,
                        delivered_time: delivered_time,
                    },
                }
            );
        } else {
            await Order.updateOne(
                {
                    _id: order._id,
                },
                {
                    orderStatus: 'accepted_delivery_boy',
                    deliveryBoy: deliveryBoyId,
                    timeline: newTimeline,
                    accepted_delivery_boyAt: new Date(),
                    $push: {
                        orderActivity: admin
                            ? {
                                note: 'Admin assign delivery Boy',
                                activityBy: 'deliveryBoy',
                                deliveryBoy: deliveryBoyId,
                                createdAt: new Date(),
                            }
                            : {
                                note: 'Accepted Order by delivery Boy',
                                activityBy: 'deliveryBoy',
                                deliveryBoy: deliveryBoyId,
                                createdAt: new Date(),
                            },
                    },
                    $set: {
                        deliveryBoyShopDistance: deliveryBoyShopDistance,
                        orderTripSummary: orderTripSummary,
                        delivered_time: delivered_time,
                    },
                }
            );
        }

        // Update rider first order trip summary
        if (riderFirstOrder) {
            riderFirstOrder.orderTripSummary = orderTripSummary;
            await riderFirstOrder.save();
        }

        // for clear delivery boy remaining request orders list
        // await Order.updateMany(
        //     {
        //         orderStatus: {
        //             $in: ['placed', 'preparing'],
        //         },
        //         deliveryBoy: { $exists: false },
        //         deliveryBoyList: {
        //             $in: [deliveryBoyId],
        //         },
        //     },
        //     {
        //         $pull: {
        //             deliveryBoyList: deliveryBoyId,
        //         },
        //     }
        // );
        // await Butler.updateMany(
        //     {
        //         orderStatus: 'placed',
        //         deliveryBoy: { $exists: false },
        //         deliveryBoyList: {
        //             $in: [deliveryBoyId],
        //         },
        //     },
        //     {
        //         $pull: {
        //             deliveryBoyList: deliveryBoyId,
        //         },
        //     }
        // );
        await removeRiderFromInvalidOrder(deliveryBoyId);

        return {
            sta: true,
            message: 'Order accepted successfully',
        };
    } catch (error) {
        return {
            sta: false,
            message: error.message,
        };
    }
};

async function getDistance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = (Math.PI * lat1) / 180;
    var radlat2 = (Math.PI * lat2) / 180;
    var theta = lon1 - lon2;
    var radtheta = (Math.PI * theta) / 180;
    var dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == 'K') {
        dist = dist * 1.609344;
    }
    if (unit == 'N') {
        dist = dist * 0.8684;
    }
    dist = parseFloat(dist.toFixed(4));
    return dist;
}

exports.getOrderListForAdmin = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            type,
            startDate,
            endDate,
            searchKey,
            user,
            deliveryBoy,
            shop,
            orderType,
            seller,
            model, // order || butler
            zoneId,
            paidCurrency,
            errorOrderType, // null || urgent || replacement
            sortByRating,
        } = req.query;

        if (type == 'requested') {
            requestOrderShops(req, res, shop, seller);
        } else {
            let config = {};

            // if (startDate && endDate) {
            //     config = {
            //         ...config,
            //         createdAt: {
            //                 $gte: DateTime.fromISO(startDate).toUTC().toJSDate(),
            //                 $lt: (endDate
            //                     ? DateTime.fromISO(endDate)
            //                           .toUTC()
            //                           .plus({ days: 1 })
            //                     : DateTime.utc()
            //                 ).toJSDate(),
            //             },
            //         };
            // }

            if (startDate && endDate) {
                // const startDateTime = DateTime.fromISO(startDate)
                //     .toUTC()
                //     .toJSDate();
                // const endDateTime = endDate
                //     ? DateTime.fromISO(endDate)
                //           .toUTC()
                //           .plus({ days: 1 })
                //           .toJSDate()
                //     : DateTime.utc().toJSDate();
                const startDateTime = moment(new Date(startDate))
                    .startOf('day')
                    .toDate();
                const endDateTime = moment(new Date(endDate))
                    .endOf('day')
                    .toDate();

                const dateFilter = {
                    $gte: startDateTime,
                    $lte: endDateTime,
                };

                config[
                    type === 'scheduled'
                        ? 'createdAt'
                        : type === 'delivered'
                            ? 'deliveredAt'
                            : type === 'cancelled'
                                ? 'cancelledAt'
                                : 'order_placedAt'
                ] = dateFilter;
            }

            if (type && type == 'preparing') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['preparing'],
                    },
                };
            }
            if (type && type == 'ready_to_pickup') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['ready_to_pickup'],
                    },
                };
            }
            if (type && type == 'order_on_the_way') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['order_on_the_way'],
                    },
                };
            }

            if (type && type === 'scheduled') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['schedule'],
                    },
                };
            }
            if (type && type === 'ongoing') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: [
                            'placed',
                            'accepted_delivery_boy',
                            'preparing',
                            'ready_to_pickup',
                            'order_on_the_way',
                        ],
                    },
                };
            }
            if (type && type === 'delivered') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['delivered'],
                    },
                    // replacementOrder: { $exists: false },
                    replacementOrderDelivered: false,
                };
            }
            if (type && type === 'cancelled') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['refused', 'cancelled'],
                    },
                };
            }
            if (type && type === 'low-rating') {
                config = {
                    ...config,
                    // reviews: {
                    //     $elemMatch: {
                    //         $exists: true,
                    //     },
                    // },
                    'reviews.rating': { $lt: 3 },
                };
            }
            if (type && type === 'flagged') {
                config = {
                    ...config,
                    flag: {
                        $elemMatch: {
                            $exists: true,
                        },
                    },
                };
            }

            if (user) {
                config.user = user;
            }

            if (seller) {
                config.seller = seller;
            }

            if (deliveryBoy) {
                config.deliveryBoy = deliveryBoy;
            }

            if (shop) {
                config.shop = shop;
            }

            if (
                orderType &&
                [
                    'food',
                    'grocery',
                    'pharmacy',
                    'coffee',
                    'flower',
                    'pet',
                ].includes(orderType)
            ) {
                config.orderType = orderType;
            }

            if (
                paidCurrency &&
                ['baseCurrency', 'secondaryCurrency'].includes(paidCurrency)
            ) {
                config = {
                    ...config,
                    paidCurrency,
                    $or: [
                        {
                            $and: [
                                { refundType: 'partial' },
                                { orderStatus: 'cancelled' },
                            ],
                        },
                        {
                            $and: [{ orderStatus: 'delivered' }],
                        },
                    ],
                };
            }

            if (errorOrderType && ['urgent'].includes(errorOrderType)) {
                config = {
                    ...config,
                    errorOrderType,
                };
            }

            if (errorOrderType && ['null'].includes(errorOrderType)) {
                config = {
                    ...config,
                    errorOrderType: null,
                    isReplacementOrder: false,
                };
            }

            if (errorOrderType && ['replacement'].includes(errorOrderType)) {
                config = {
                    ...config,
                    isReplacementOrder: true,
                };
            }

            if (searchKey) {
                const newQuery = searchKey.split(/[ ,]+/);
                const orderIDSearchQuery = newQuery.map(str => ({
                    orderId: RegExp(str, 'i'),
                }));

                const autoGenIdQ = newQuery.map(str => ({
                    autoGenId: RegExp(str, 'i'),
                }));

                const noteSearchQuery = newQuery.map(str => ({
                    note: RegExp(str, 'i'),
                }));

                config = {
                    ...config,
                    $and: [
                        {
                            $or: [
                                { $and: orderIDSearchQuery },
                                { $and: noteSearchQuery },
                                { $and: autoGenIdQ },
                            ],
                        },
                    ],
                };
            }

            if (zoneId) {
                const zone = await ZoneModel.findById(zoneId);

                if (!zone) return errorResponse(res, 'Zone not found');

                config = {
                    ...config,
                    location: { $geoWithin: { $geometry: zone.zoneGeometry } },
                };
            }

            let countData = await Order.countDocuments(config);
            let countDataButler = await Butler.countDocuments(config);

            if (model === 'order') {
                countDataButler = 0;
            } else if (model === 'butler') {
                countData = 0;
            }

            const paginate = await paginationMultipleModel({
                page,
                pageSize,
                total: countData + countDataButler,
                pagingRange: 5,
            });

            let orderList = await Order.find(config).populate([
                {
                    path: 'shop',
                    select: '-password',
                },
                {
                    path: 'user',
                    select: '-password',
                },
                {
                    path: 'users',
                    select: '-password',
                },
                {
                    path: 'deliveryBoy',
                    select: '-password',
                },
                {
                    path: 'chats.user',
                },
                {
                    path: 'chats.deliveryBoy',
                },
                {
                    path: 'flag',
                    populate: 'user shop delivery',
                },
                {
                    path: 'orderCancel',
                    populate: 'cancelReason',
                },
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'deliveryBoyList',
                    select: '-password',
                },
                {
                    path: 'rejectedDeliveryBoy',
                    select: '-password',
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
                    path: 'userCancelTnx',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'userRefundTnx',
                },
                {
                    path: 'orderDeliveryCharge',
                },
                {
                    path: 'adjustOrderRequest',
                    populate: [
                        {
                            path: 'replacedProducts.product',
                        },
                    ],
                },
                {
                    path: 'originalOrder',
                    populate: [
                        {
                            path: 'shop',
                            select: '-password',
                        },
                        {
                            path: 'user',
                            select: '-password',
                        },
                        {
                            path: 'users',
                            select: '-password',
                        },
                        {
                            path: 'deliveryBoy',
                            select: '-password',
                        },
                        {
                            path: 'chats.user',
                        },
                        {
                            path: 'chats.deliveryBoy',
                        },
                        {
                            path: 'flag',
                            populate: 'user shop delivery',
                        },
                        {
                            path: 'orderCancel',
                            populate: 'cancelReason',
                        },
                        {
                            path: 'seller',
                            select: '-password',
                        },
                        {
                            path: 'deliveryBoyList',
                            select: '-password',
                        },
                        {
                            path: 'rejectedDeliveryBoy',
                            select: '-password',
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
                            path: 'userCancelTnx',
                        },
                        {
                            path: 'marketings',
                        },
                        {
                            path: 'userRefundTnx',
                        },
                        {
                            path: 'orderDeliveryCharge',
                        },
                        {
                            path: 'adjustOrderRequest',
                            populate: [
                                {
                                    path: 'replacedProducts.product',
                                },
                            ],
                        },
                    ],
                },
            ]);

            let butlerList = await Butler.find(config).populate([
                {
                    path: 'user',
                    select: '-password',
                },
                {
                    path: 'deliveryBoy',
                    select: '-password',
                },
                {
                    path: 'chats.user',
                },
                {
                    path: 'chats.deliveryBoy',
                },
                {
                    path: 'flag',
                    populate: 'user delivery',
                },
                {
                    path: 'orderCancel',
                    populate: 'cancelReason',
                },
                {
                    path: 'deliveryBoyList',
                    select: '-password',
                },
                {
                    path: 'rejectedDeliveryBoy',
                    select: '-password',
                },
                {
                    path: 'orderDeliveryCharge',
                },
            ]);

            if (model === 'order') {
                butlerList = [];
            } else if (model === 'butler') {
                orderList = [];
            }

            // let list = [];

            // if (sortBy.toUpperCase() === 'DESC') {
            //     list = [...orderList, ...butlerList].sort(
            //         (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            //     );
            // } else {
            //     list = [...orderList, ...butlerList].sort(
            //         (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            //     );
            // }

            const keySelector =
                type === 'scheduled'
                    ? 'createdAt'
                    : type === 'delivered'
                        ? 'deliveredAt'
                        : type === 'cancelled'
                            ? 'cancelledAt'
                            : 'order_placedAt';

            let list = [...orderList, ...butlerList].sort((a, b) => {
                let keyA = new Date(a[keySelector]);
                let keyB = new Date(b[keySelector]);

                if (sortByRating) {
                    keyA =
                        a?.reviews?.length &&
                            a?.reviews[0]?.type === 'shop' &&
                            a?.reviews[0]?.rating
                            ? a?.reviews[0]?.rating
                            : 0;
                    keyB =
                        b?.reviews?.length &&
                            b?.reviews[0]?.type === 'shop' &&
                            b?.reviews[0]?.rating
                            ? b?.reviews[0]?.rating
                            : 0;

                    return sortByRating.toUpperCase() === 'DESC'
                        ? keyB - keyA
                        : keyA - keyB;
                }

                return sortBy.toUpperCase() === 'DESC'
                    ? keyB - keyA
                    : keyA - keyB;
            });

            list = list.slice(
                paginate.offset,
                paginate.offset + paginate.limit
            );

            for (const order of list) {
                if (!order?.isButler) {
                    getOrderFinancialBreakdown(order);
                }
            }

            successResponse(res, {
                message: 'Successfully get orders',
                data: {
                    orders: list,
                    paginate,
                },
            });
        }
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** For getting deliveryBoy shop rating ***/
exports.getDeliveryBoyShopRating = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            deliveryBoyId,
        } = req.query;

        const rider = await DeliveryBoyModel.findById(deliveryBoyId);
        if (!rider) {
            return errorResponse(res, 'Rider not found');
        }

        let dateConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            dateConfig = {
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        let config = {
            ...dateConfig,
            shopRateToRider: {
                $in: ['like', 'dislike'],
            },
            deliveryBoy: deliveryBoyId,
        };

        let orders = await Order.find(config)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'shop',
                    select: '-password',
                },
                {
                    path: 'user',
                    select: '-password',
                },
                {
                    path: 'users',
                    select: '-password',
                },
                {
                    path: 'deliveryBoy',
                    select: '-password',
                },
                {
                    path: 'chats.user',
                },
                {
                    path: 'chats.deliveryBoy',
                },
                {
                    path: 'flag',
                    populate: 'user shop delivery',
                },
                {
                    path: 'orderCancel',
                    populate: 'cancelReason',
                },
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'deliveryBoyList',
                    select: '-password',
                },
                {
                    path: 'rejectedDeliveryBoy',
                    select: '-password',
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
                    path: 'userCancelTnx',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'userRefundTnx',
                },
            ])
            .lean();

        if (searchKey) {
            orders = orders.filter(order => {
                const searchTerm = searchKey.toLowerCase();

                return (
                    order?.user?.name?.toLowerCase().includes(searchTerm) ||
                    order?.shop?.shopName?.toLowerCase().includes(searchTerm) ||
                    order?.orderId?.toLowerCase().includes(searchTerm) ||
                    order?.autoGenId?.toLowerCase().includes(searchTerm) ||
                    order?.note?.toLowerCase().includes(searchTerm)
                );
            });
        }
        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: orders.length,
            pagingRange,
        });

        const list = orders.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        const likeConfig = {
            ...dateConfig,
            shopRateToRider: {
                $in: ['like'],
            },
            deliveryBoy: deliveryBoyId,
        };
        const positive = await Order.countDocuments(likeConfig);

        const dislikeConfig = {
            ...dateConfig,
            shopRateToRider: {
                $in: ['dislike'],
            },
            deliveryBoy: deliveryBoyId,
        };
        const negative = await Order.countDocuments(dislikeConfig);

        successResponse(res, {
            message: 'Successfully get rider shop rating',
            data: {
                positive,
                negative,
                orders: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** For getting deliveryBoy customer rating ***/
exports.getDeliveryBoyCustomerRating = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            deliveryBoyId,
        } = req.query;

        const rider = await DeliveryBoyModel.findById(deliveryBoyId);
        if (!rider) {
            return errorResponse(res, 'Rider not found');
        }

        let dateConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            dateConfig = {
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        let config = {
            ...dateConfig,
            deliveryBoy: deliveryBoyId,
            type: 'deliveryBoy',
        };

        let reviews = await ReviewModel.find(config)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'user',
                    select: '-password',
                },
                {
                    path: 'order',
                    populate: [
                        {
                            path: 'shop',
                            select: '-password',
                        },
                    ],
                },
            ])
            .lean();

        if (searchKey) {
            reviews = reviews.filter(review => {
                const searchTerm = searchKey.toLowerCase();

                return (
                    review?.user?.name?.toLowerCase().includes(searchTerm) ||
                    review?.order?.shop?.shopName
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    review?.order?.orderId
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    review?.order?.autoGenId
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    review?.order?.note?.toLowerCase().includes(searchTerm)
                );
            });
        }
        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: reviews.length,
            pagingRange,
        });

        const list = reviews.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully get rider customer rating',
            data: {
                reviews: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getNewOrderListForUserApp = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            type = 'placed',
        } = req.query;

        let config = {
            orderStatus: 'placed',
        };

        const paginate = await pagination({
            page,
            pageSize,
            model: Order,
            condition: config,
            pagingRange: 5,
        });

        const orders = await Order.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'shop',
                    select: '-password',
                },
                {
                    path: 'user',
                    select: '-password',
                },
                {
                    path: 'users',
                    select: '-password',
                },
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'deliveryBoy',
                    select: '-password',
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
            ]);

        successResponse(res, {
            message: 'Successfully get order list',
            data: {
                orders,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getDeliveryManOrderListForUserApp = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, sortBy = 'DESC', type } = req.query;

        let config = {
            deletedAt: null,
        };

        if (type) {
            config.orderStatus = type;
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: Order,
            condition: config,
            pagingRange: 5,
        });

        const orders = await Order.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'shop',
                },
                {
                    path: 'user',
                },
                {
                    path: 'users',
                },
            ]);

        successResponse(res, {
            message: 'Successfully get order list',
            data: {
                orders,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderListForDeliveryBoy = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            type,
            startDate,
            endDate,
            filterStore,
            filterUser,
        } = req.query;

        const deliveryBoyId = req.deliveryBoyId;

        if (
            !type ||
            !['requested', 'active', 'completed', 'cancelled'].includes(type)
        ) {
            return errorResponse(res, 'Invalid type');
        }

        // type = >
        // 1. requested
        // 2. active order
        // 3. completed order
        // 4. cancelled order

        let config = {};

        if (type && type == 'requested') {
            config = {
                ...config,
                orderStatus: {
                    $in: ['placed', 'preparing', 'ready_to_pickup'],
                },
                deliveryBoy: { $exists: false },
                deliveryBoyList: {
                    $in: [deliveryBoyId],
                },
                rejectedDeliveryBoy: {
                    $nin: [deliveryBoyId],
                },
            };
        }

        if (type && type == 'active') {
            config = {
                ...config,
                deliveryBoy: deliveryBoyId,
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
            };
        }

        if (type && type == 'completed') {
            config = {
                ...config,
                deliveryBoy: deliveryBoyId,
                orderStatus: {
                    $in: ['delivered', 'refused'],
                },
            };
            if (filterStore.length >= 3) {
                const listOfStors = JSON.parse(filterStore);
                config = {
                    ...config,
                    shop: {
                        $in: listOfStors,
                    },
                };
            }
            if (filterUser.length >= 3) {
                const listOfUsers = JSON.parse(filterUser);
                config = {
                    ...config,
                    user: {
                        $in: listOfUsers,
                    },
                };
            }
        }

        if (type && type == 'cancelled') {
            config = {
                ...config,
                deliveryBoy: deliveryBoyId,
                orderStatus: 'cancelled',
            };
        }

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            const dateFilter = {
                $gte: startDateTime,
                $lte: endDateTime,
            };

            config[
                type === 'completed'
                    ? 'deliveredAt'
                    : type === 'cancelled'
                        ? 'cancelledAt'
                        : 'order_placedAt'
            ] = dateFilter;

            // config = {
            //     ...config,
            //     createdAt: {
            //         $gte: startDateTime,
            //         $lte: endDateTime,
            //     },
            // };
        }

        const orders = await Order.find(config)
            .sort({ order_placedAt: sortBy })
            .populate([
                {
                    path: 'shop',
                    select: '-banner',
                },
                {
                    path: 'user',
                    select: '-shops -address -favoritesProducts -favoritesShops',
                },
                {
                    path: 'users',
                    select: '-shops -address -favoritesProducts -favoritesShops',
                },
                {
                    path: 'deliveryBoy',
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
            ]);

        const butlers = await Butler.find(config)
            .sort({ order_placedAt: sortBy })
            .populate([
                {
                    path: 'user',
                    select: '-shops -address -favoritesProducts -favoritesShops',
                },
                {
                    path: 'deliveryBoy',
                },
            ]);

        let list = [...orders, ...butlers].sort(
            (a, b) => new Date(b.order_placedAt) - new Date(a.order_placedAt)
        );

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        const newOrders = list.map(order => {
            const newOrder = order.toObject();
            newOrder.paymentStatusOrginal = order.paymentStatus;
            newOrder.paymentStatus =
                order.paymentStatus === 'pending'
                    ? 'cash'
                    : order.paymentStatus;
            return newOrder;
        });

        successResponse(res, {
            message: 'Successfully get orders',
            data: {
                orders: newOrders,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const requestOrderShops = async (req, res, shopId, sellerId) => {
    try {
        const { page = 1, pageSize = 50 } = req.query;

        let config = {
            orderStatus: { $in: ['placed', 'accepted_delivery_boy'] },
            // shop: shopId,
            // errorOrderType: null,
        };

        if (sellerId) {
            config.seller = sellerId;
        } else {
            config.shop = shopId;
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: Order,
            condition: config,
            pagingRange: 5,
        });

        const orders = await Order.find(config)
            .sort({ order_placedAt: 'asc' })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'shop',
                    select: '-password',
                },
                {
                    path: 'user',
                    select: '-password',
                },
                {
                    path: 'users',
                    select: '-password',
                },
                {
                    path: 'deliveryBoy',
                    select: '-password',
                },
                {
                    path: 'chats.user',
                },
                {
                    path: 'chats.deliveryBoy',
                },
                {
                    path: 'flag',
                    populate: 'user shop delivery',
                },
                {
                    path: 'orderCancel',
                    populate: 'cancelReason',
                },
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'deliveryBoyList',
                    select: '-password',
                },
                {
                    path: 'rejectedDeliveryBoy',
                    select: '-password',
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
                    path: 'userCancelTnx',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'userRefundTnx',
                },
                {
                    path: 'orderDeliveryCharge',
                },
                {
                    path: 'deliveryAddress',
                },
            ]);

        return successResponse(res, {
            message: 'Successfully get orders',
            data: {
                orders: orders,
                paginate,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.getOrderListForShop = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            type,
            startDate,
            endDate,
            searchKey,
        } = req.query;

        const shopId = req.shopId;

        if (
            !type &&
            ![
                'requested',
                'orders-in-progress',
                'ready-for-pickup',
                'orders-on-the-way',
                'completed',
                'cancelled',
                'delivered',
                'refused',
            ].includes(type)
        ) {
            return errorResponse(res, 'Invalid type');
        }

        // type = >
        // 1. requested (placed or accepted_delivery_boy)
        // 2. orders-in-progress order (preparing)
        // 3. ready-for-pickup order (ready_to_pickup)
        // 4. orders-on-the-way order (order_on_the_way)
        // 5. completed order ('delivered', 'refused', 'cancelled')
        // 6. cancelled order (cancelled)
        // 7. delivered order (delivered)
        // 8. refused order (refused)

        let config = {
            shop: shopId,
        };

        if (type == 'requested') {
            requestOrderShops(req, res, shopId);
        } else {
            if (type && type == 'orders-in-progress') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['preparing'],
                    },
                };
            }

            if (type && type == 'ready-for-pickup') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['ready_to_pickup'],
                    },
                };
            }

            if (type && type == 'orders-on-the-way') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['order_on_the_way'],
                    },
                };
            }

            if (type && type == 'completed') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['delivered', 'refused', 'cancelled'],
                    },
                };
            }

            if (type && type == 'delivered') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['delivered'],
                    },
                };
            }
            if (type && type == 'cancelled') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['cancelled'],
                    },
                };
            }
            if (type && type == 'refused') {
                config = {
                    ...config,
                    orderStatus: {
                        $in: ['refused'],
                    },
                };
            }

            if (startDate && endDate) {
                const startDateTime = moment(new Date(startDate))
                    .startOf('day')
                    .toDate();
                const endDateTime = moment(
                    endDate ? new Date(endDate) : new Date()
                )
                    .endOf('day')
                    .toDate();

                const dateFilter = {
                    $gte: startDateTime,
                    $lte: endDateTime,
                };

                config[
                    type === 'delivered'
                        ? 'deliveredAt'
                        : type === 'cancelled'
                            ? 'cancelledAt'
                            : type === 'completed'
                                ? 'deliveredAt' || 'cancelledAt'
                                : 'order_placedAt'
                ] = dateFilter;

                // config = {
                //     ...config,
                //     createdAt: {
                //         $gte: startDateTime,
                //         $lte: endDateTime,
                //     },
                // };
            }

            if (searchKey) {
                const newQuery = searchKey.split(/[ ,]+/);
                const orderIDSearchQuery = newQuery.map(str => ({
                    orderId: RegExp(str, 'i'),
                }));

                const autoGenIdQ = newQuery.map(str => ({
                    autoGenId: RegExp(str, 'i'),
                }));

                const noteSearchQuery = newQuery.map(str => ({
                    note: RegExp(str, 'i'),
                }));

                config = {
                    ...config,
                    $and: [
                        {
                            $or: [
                                { $and: orderIDSearchQuery },
                                { $and: noteSearchQuery },
                                { $and: autoGenIdQ },
                            ],
                        },
                    ],
                };
            }

            const paginate = await pagination({
                page,
                pageSize,
                model: Order,
                condition: config,
                pagingRange: 5,
            });

            const orders = await Order.find(config)
                .sort({ order_placedAt: sortBy })
                .skip(paginate.offset)
                .limit(paginate.limit)
                .populate([
                    {
                        path: 'shop',
                        select: '-banner',
                    },
                    {
                        path: 'user',
                        select: '-shops -address -favoritesProducts -favoritesShops -password',
                    },
                    {
                        path: 'users',
                        select: '-shops -address -favoritesProducts -favoritesShops -password',
                    },
                    {
                        path: 'deliveryBoy',
                    },
                    {
                        path: 'seller',
                    },
                    {
                        path: 'deliveryAddress',
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

            successResponse(res, {
                message: 'Successfully get orders',
                data: {
                    orders,
                    paginate,
                },
            });
        }
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.orderSingleDetails = async (req, res) => {
    try {
        const plusUser = req.plusUser;
        const { id } = req.query;

        if (!id) return errorResponse(res, 'id is required');

        let commonConfig = { _id: id };

        let order = await Order.findOne(commonConfig).populate([
            {
                path: 'user',
                select: 'name email phone_number profile_photo',
            },
            {
                path: 'users',
                select: 'name email phone_number profile_photo',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
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
                select: '-password',
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
                path: 'chats.user',
            },
            {
                path: 'chats.deliveryBoy',
            },
            {
                path: 'flag',
                populate: 'user shop delivery',
            },
            {
                path: 'deliveryBoyList',
            },
            {
                path: 'rejectedDeliveryBoy',
            },
            {
                path: 'cart',
                populate: [
                    {
                        path: 'cartItems.user',
                    },
                    {
                        path: 'cartItems.products.product',
                        populate: 'marketing',
                    },
                    {
                        path: 'creator',
                    },
                ],
            },
            {
                path: 'adjustOrderRequest',
                populate: [
                    {
                        path: 'suggestedProducts.product',
                        populate: ['marketing', 'addons'],
                    },
                    {
                        path: 'replacedProducts.product',
                    },
                ],
            },
        ]);

        if (!order) {
            order = await Butler.findOne(commonConfig).populate([
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
                {
                    path: 'chats.user',
                },
                {
                    path: 'chats.deliveryBoy',
                },
                {
                    path: 'flag',
                    populate: 'user delivery',
                },
                {
                    path: 'deliveryBoyList',
                },
                {
                    path: 'rejectedDeliveryBoy',
                },
            ]);

            if (!order) {
                return errorResponse(res, 'Order not found');
            }
        }

        if (!order?.isButler) {
            const shopExchangeRate = order?.shop?.shopExchangeRate || 0;
            if (
                (shopExchangeRate !== 0 || !plusUser) &&
                order?.adjustOrderRequest?.suggestedProducts?.length
            ) {
                for (let product of order?.adjustOrderRequest
                    ?.suggestedProducts) {
                    if (!plusUser) {
                        await checkPlusUserProductMarketing(product.product);
                    }

                    if (shopExchangeRate !== 0) {
                        product.product = await applyExchangeRate(
                            product.product,
                            shopExchangeRate
                        );
                    }
                }
            }
        }

        successResponse(res, {
            message: 'Successfully get Order',
            data: {
                order,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleOrderById = async (req, res) => {
    try {
        const { orderId } = req.query;

        let order = await Order.findById(orderId)
            .populate([
                {
                    path: 'user',
                    select: 'name email phone_number profile_photo orderCompleted',
                },
                {
                    path: 'deliveryBoy',
                    select: 'name image email number',
                },
                {
                    path: 'shop',
                    select: 'shopName phone_number email shopLogo',
                },
                {
                    path: 'flag',
                    // select: 'comment type isRefused isAutomatic isDelay isResolved flaggedReason otherReason replacement refund',
                },
                {
                    path: 'cart',
                    populate: [
                        {
                            path: 'cartItems.user',
                            select: 'name profile_photo',
                        },
                        {
                            path: 'creator',
                            select: 'name profile_photo',
                        },
                    ],
                    select: 'name creator cartType cartItems paymentPreferences deliveryFeePreferences maxAmountPerGuest specialInstruction',
                },
                {
                    path: 'userRefundTnx',
                    select: 'type amount secondaryCurrency_amount isPartialRefund baseCurrency_adminCut secondaryCurrency_adminCut baseCurrency_adminVatCut secondaryCurrency_adminVatCut baseCurrency_deliveryBoyCut secondaryCurrency_deliveryBoyCut baseCurrency_shopCut secondaryCurrency_shopCut baseCurrency_adminDeliveryRefund secondaryCurrency_adminDeliveryRefund',
                },
                {
                    path: 'adjustOrderRequest',
                    populate: [
                        {
                            path: 'suggestedProducts.product',
                            select: 'name price images  rewardBundle reward discountPercentage discountPrice discount',
                        },
                        {
                            path: 'replacedProducts.product',
                            select: 'name price images  rewardBundle reward discountPercentage discountPrice discount',
                        },
                    ],
                },
            ])
            .select({
                orderId: 1,
                user: 1,
                orderStatus: 1,
                accepted_delivery_boyAt: 1,
                preparingAt: 1,
                ready_to_pickupAt: 1,
                order_on_the_wayAt: 1,
                deliveredAt: 1,
                cancelledAt: 1,
                deliveryBoy: 1,
                shop: 1,
                orderCancel: 1,
                paymentMethod: 1,
                selectedPaymentMethod: 1,
                selectPos: 1,
                orderFor: 1,
                pickUpLocation: 1,
                dropOffLocation: 1,
                summary: 1,
                productsDetails: 1,
                timeline: 1,
                note: 1,
                deliveryBoyNote: 1,
                preparingTime: 1,
                adminCharge: 1,
                baseCurrency_adminCommission: 1,
                secondaryCurrency_adminCommission: 1,
                baseCurrency_riderFee: 1,
                secondaryCurrency_riderFee: 1,
                baseCurrency_shopEarnings: 1,
                secondaryCurrency_shopEarnings: 1,
                type: 1,
                scheduleDate: 1,
                reviews: 1,
                shopRated: 1,
                deliveryBoyRated: 1,
                flag: 1,
                deliveredMinutes: 1,
                delivered_time: 1,
                vatAmount: 1,
                rewardPoints: 1,
                rewardRedeemCut: 1,
                baseCurrency_rewardRedeemCashback: 1,
                secondaryCurrency_rewardRedeemCashback: 1,
                isRedeemReward: 1,
                discountCut: 1,
                isDiscount: 1,
                doubleMenuItemPrice: 1,
                doubleMenuCut: 1,
                isDoubleMenu: 1,
                specialInstruction: 1,
                cart: 1,
                couponDetails: 1,
                isRefundedAfterDelivered: 1,
                refundedAfterDeliveredAt: 1,
                userRefundTnx: 1,
                leaveAtDoorImage: 1,
                bringChangeAmount: 1,
                adminExchangeRate: 1,
                shopExchangeRate: 1,
                baseCurrency: 1,
                secondaryCurrency: 1,
                refundType: 1,
                paidCurrency: 1,
                freeDeliveryCut: 1,
                errorOrderType: 1,
                isOrderLate: 1,
                errorOrderReason: 1,
                isReplacementOrder: 1,
                isReplacementItemPickFromUser: 1,
                replacementOrderDelivered: 1,
                replacementOrderDeliveryInfo: 1,
                replacementOrderCut: 1,
                adminPercentage: 1,
                isEndorseLoss: 1,
                inEndorseLossDeliveryFeeIncluded: 1,
                endorseLoss: 1,
                isOrderAdjusted: 1,
                adjustOrderRequest: 1,
                adjustOrderRequestAt: 1,
                baseCurrency_pendingSubscriptionFee: 1,
                secondaryCurrency_pendingSubscriptionFee: 1,
                createdAt: 1,
            });

        if (!order) {
            order = await Butler.findById(orderId)
                .populate([
                    {
                        path: 'user',
                        select: 'name email phone_number profile_photo',
                    },
                    {
                        path: 'deliveryBoy',
                        select: 'name image',
                    },
                    {
                        path: 'flag',
                        select: 'comment type isRefused isAutomatic isDelay isResolved flaggedReason otherReason replacement refund',
                    },
                ])
                .select({
                    orderId: 1,
                    user: 1,
                    orderStatus: 1,
                    deliveryBoy: 1,
                    orderCancel: 1,
                    orderType: 1,
                    paymentMethod: 1,
                    selectedPaymentMethod: 1,
                    selectPos: 1,
                    orderFor: 1,
                    pickUpLocation: 1,
                    dropOffLocation: 1,
                    summary: 1,
                    itemDescription: 1,
                    products: 1,
                    timeline: 1,
                    note: 1,
                    deliveryBoyNote: 1,
                    adminCharge: 1,
                    baseCurrency_adminCommission: 1,
                    secondaryCurrency_adminCommission: 1,
                    baseCurrency_riderFee: 1,
                    secondaryCurrency_riderFee: 1,
                    type: 1,
                    scheduleDate: 1,
                    reviews: 1,
                    deliveryBoyRated: 1,
                    flag: 1,
                    deliveredMinutes: 1,
                    delivered_time: 1,
                    isButler: 1,
                    rewardPoints: 1,
                    bringChangeAmount: 1,
                    adminExchangeRate: 1,
                    baseCurrency: 1,
                    secondaryCurrency: 1,
                    orderTripSummary: 1,
                    paidCurrency: 1,
                    errorOrderType: 1,
                    isOrderLate: 1,
                    errorOrderReason: 1,
                    paymentOn: 1,
                    createdAt: 1,
                });

            if (!order) {
                return errorResponse(res, 'Order not found');
            }
        }

        successResponse(res, {
            message: 'Successfully get Order',
            data: {
                order,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deliveryManCompletedOrder = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const {
            orderId,
            pos,
            paidCurrency = 'baseCurrency',
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        } = req.body;

        // orderType = 'food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'

        // order check
        const order = await Order.findOne({ _id: orderId })
            .populate('coupon')
            .lean();

        if (order.deliveryBoy != deliveryBoyId) {
            return errorResponse(res, 'delivery boy not permitted ');
        }

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        const { sta, message } = await deliveryManCompletedOrderWork(
            order,
            pos,
            paidCurrency,
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        );

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(updatedOrder);

        res.status(200).json({
            status: true,
            message: 'Order Delivered successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

exports.deliveryManCompletedOrderRefused = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const { orderId, pos } = req.body;

        // orderType = 'food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'

        // order check
        const order = await Order.findOne({ _id: orderId }).lean();

        if (order.deliveryBoy != deliveryBoyId) {
            return errorResponse(res, 'delivery boy not permitted ');
        }

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        const { sta, message } = await deliveryManCompletedOrderWorkRefuse(
            order,
            pos
        );

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(updatedOrder);

        res.status(200).json({
            status: true,
            message: 'Order Refused successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

const deliveryManCompletedOrderWork = async (
    order,
    pos,
    paidCurrency,
    baseCurrency_collectCash,
    secondaryCurrency_collectCash,
    baseCurrency_receivedCash,
    secondaryCurrency_receivedCash,
    baseCurrency_returnedCash,
    secondaryCurrency_returnedCash,
) => {
    try {
        if (!order.deliveryBoy) {
            return {
                sta: false,
                message: 'You need to assign a rider first',
            };
        }

        if (order.orderStatus !== 'order_on_the_way') {
            if (
                ['delivered', 'refused', 'cancelled'].includes(
                    order.orderStatus
                )
            ) {
                return {
                    sta: false,
                    message: `Order has already been ${order?.orderStatus}`,
                };
            } else {
                return {
                    sta: false,
                    message: `Please wait until order_on_the_way`,
                };
            }
        }

        let newTimeline = order.timeline;
        newTimeline.pop();
        newTimeline.push({
            title: 'Order Delivered',
            status: 'delivered',
            note: 'Order Delivered',
            active: true,
            createdAt: new Date(),
        });

        // update order with new timeline & history

        let transactionList = [];
        let transactionDeliveryBoy = null;
        let transaction = null;
        let transactionShop = null;
        let transactionDrop = null;

        if (order.paymentMethod === 'cash') {
            if (order.orderFor === 'global') {
                if (pos) {
                    transaction = await userOrderCreateTransection(
                        order,
                        order.user,
                        order.summary.baseCurrency_cash,
                        order.summary.secondaryCurrency_cash,
                        order.summary,
                        order.paymentMethod,
                        'Cash With POS'
                    );

                    transactionDrop = await addDropBalanceForOrder(order);

                    transactionShop = await shopBalanceAddForOrder(order);

                    transactionDeliveryBoy =
                        await deliveryBoyBalanceAddForOrder(
                            order,
                            'deliveryBoyOrderDelivered',
                            'success',
                            true
                        );

                    if (transaction) {
                        transactionList.push(transaction._id);
                    }
                    if (transactionDrop) {
                        transactionList.push(transactionDrop._id);
                    }
                    if (transactionShop) {
                        transactionList.push(transactionShop._id);
                    }
                    if (transactionDeliveryBoy) {
                        transactionList.push(transactionDeliveryBoy._id);
                    }
                } else {
                    transactionDrop = await addDropBalanceForOrder(order);

                    transactionShop = await shopBalanceAddForOrder(order);

                    transactionDeliveryBoy =
                        await deliveryBoyBalanceAddForOrder(
                            order,
                            'deliveryBoyOrderDeliveredCash',
                            'success',
                            false,
                            baseCurrency_collectCash,
                            secondaryCurrency_collectCash,
                            baseCurrency_receivedCash,
                            secondaryCurrency_receivedCash,
                            baseCurrency_returnedCash,
                            secondaryCurrency_returnedCash,
                        );

                    if (transactionDrop) {
                        transactionList.push(transactionDrop._id);
                    }
                    if (transactionShop) {
                        transactionList.push(transactionShop._id);
                    }
                    if (transactionDeliveryBoy) {
                        transactionList.push(transactionDeliveryBoy._id);
                    }
                }
            } else {
                transactionShop = await shopBalanceAddForOrder(
                    order,
                    'success', // status
                    'sellerGetPaymentFromOrderCash', // tnx type
                    'store' // delivery boy
                );
                // for less from unsettle amount
                await shopCashInHandFc(order);

                if (transactionShop) {
                    transactionList.push(transactionShop._id);
                }
            }
        } else {
            if (order.orderFor === 'global') {
                transactionDrop = await addDropBalanceForOrder(order);

                transactionShop = await shopBalanceAddForOrder(order);

                transactionDeliveryBoy = await deliveryBoyBalanceAddForOrder(
                    order,
                    'deliveryBoyOrderDelivered'
                );

                if (transactionDrop) {
                    transactionList.push(transactionDrop._id);
                }
                if (transactionShop) {
                    transactionList.push(transactionShop._id);
                }
                if (transactionDeliveryBoy) {
                    transactionList.push(transactionDeliveryBoy._id);
                }
            } else {
                transactionDrop = await addDropBalanceForOrder(order);

                transactionShop = await shopBalanceAddForOrder(order);

                if (transactionDrop) {
                    transactionList.push(transactionDrop._id);
                }
                if (transactionShop) {
                    transactionList.push(transactionShop._id);
                }
            }
        }

        //*** Calc user wallet and card start***/
        const orderCart = await CartModel.findById(order.cart);

        if (orderCart) {
            for (const element of orderCart.cartItems) {
                // for wallet
                if (element?.summary?.baseCurrency_wallet > 0) {
                    const transactionUser = await TransactionModel.create({
                        user: element.user,
                        amount: element.summary.baseCurrency_wallet,
                        secondaryCurrency_amount:
                            element.summary.secondaryCurrency_wallet,
                        userNote: 'Order Payment Completed',
                        adminNote: 'User order pay throw wallet',
                        account: 'user',
                        type: 'userPayBeforeReceivedOrderByWallet',
                        status: 'success',
                        orderId: order._id,
                        paidCurrency: order.paidCurrency,
                        isUserWalletRelated: true,
                    });

                    transactionList.push(transactionUser._id);
                    transaction = transaction ? transaction : transactionUser;

                    await UserModel.updateOne(
                        { _id: element.user },
                        {
                            $inc: {
                                tempBalance:
                                    -element.summary.baseCurrency_wallet,
                            },
                        }
                    );
                }

                // for card
                if (element?.summary?.baseCurrency_card > 0) {
                    const transactionUser = await userOrderCreateTransection(
                        order,
                        element.user,
                        element.summary.baseCurrency_card,
                        element.summary.secondaryCurrency_card,
                        element.summary,
                        element.paymentMethod,
                        element.cardTypeString,
                        element.cardId
                    );

                    transactionList.push(transactionUser._id);
                    transaction = transaction ? transaction : transactionUser;

                    // Areeba payment gateway integration
                    const newTransactionId = ObjectId();
                    const currency = 'USD';

                    const capturePutData = {
                        apiOperation: 'CAPTURE',
                        transaction: {
                            amount: element?.summary?.baseCurrency_card,
                            currency: currency,
                        },
                    };

                    const { data: captureData } = await areebaPaymentGateway(
                        element?.areebaCard?.orderId,
                        newTransactionId,
                        capturePutData
                    );

                    if (captureData?.result == 'ERROR')
                        return errorResponse(
                            res,
                            captureData?.error?.explanation
                        );
                }

                // for redeem reward
                if (element?.summary?.reward?.baseCurrency_amount > 0) {
                    const transactionForRedeemReward =
                        await transactionForReward({
                            order: order,
                            user: element.user,
                            amount: element.summary.reward.baseCurrency_amount,
                            rewardPoints: element.summary.reward.points,
                            summary: element.summary,
                            type: 'userRedeemRewardPoints',
                            userNote: 'User redeem reward points for order',
                        });

                    transactionList.push(transactionForRedeemReward._id);
                }

                if (element?.summary) {
                    element.isPaid = true;
                }
            }

            await orderCart.save();
        }
        //*** Calc user wallet and card end***/

        // get total delivery time take to complete a order
        const format = 'YYYY-MM-DD H:mm:ss';
        const currentDate = moment(new Date()).format(format);
        const recevingDate = moment(new Date(order.order_placedAt)).format(
            format
        );
        const differ = new Date(currentDate) - new Date(recevingDate);
        let minutes = parseInt(differ / (1000 * 60));

        let transactionForGetReward;
        if (order?.rewardPoints > 0) {
            const cartDetails = await CartModel.findById(order.cart);

            for (const element of cartDetails?.cartItems) {
                if (element.isPaid && element?.rewardPoints > 0) {
                    transactionForGetReward = await transactionForReward({
                        order: order,
                        user: element.user,
                        amount:
                            element?.summary?.baseCurrency_cash +
                            element?.summary?.baseCurrency_card +
                            element?.summary?.baseCurrency_wallet,
                        rewardPoints: element?.rewardPoints,
                        summary: element.summary,
                        type: 'userGetRewardPoints',
                        userNote: 'User get reward points for order',
                    });

                    if (transactionForGetReward) {
                        transactionList.push(transactionForGetReward._id);
                    }
                }
            }
        }

        await Order.updateOne(
            { _id: order._id },
            {
                $set: {
                    orderStatus: 'delivered',
                    deliveredAt: new Date(),
                    paymentStatus: 'paid',
                    timeline: newTimeline,
                    deliveredMinutes: minutes || 0,
                    paidCurrency: paidCurrency,
                    baseCurrency_collectCash,
                    secondaryCurrency_collectCash,
                    baseCurrency_receivedCash,
                    secondaryCurrency_receivedCash,
                    baseCurrency_returnedCash,
                    secondaryCurrency_returnedCash,
                    transactions: transaction ? transaction?._id : null,
                    transactionsDrop: transactionDrop
                        ? transactionDrop?._id
                        : null,
                    transactionsStore: transactionShop
                        ? transactionShop?._id
                        : null,
                    transactionsDeliveryBoy: transactionDeliveryBoy
                        ? transactionDeliveryBoy?._id
                        : null,
                    transactionHistory: transactionList,
                },
                $push: {
                    orderActivity: {
                        note:
                            order.orderFor === 'global'
                                ? 'Order Delivered'
                                : 'Order delivered by shop rider',
                        activityBy: 'deliveryBoy',
                        deliveryBoy: order.deliveryBoy,
                        createdAt: new Date(),
                    },
                },
            }
        );

        await orderAfterDeliveredWork(order, paidCurrency);

        return {
            sta: true,
            message: 'Order updated',
        };
    } catch (error) {
        return {
            sta: false,
            message: error.message,
        };
    }
};

const deliveryManCompletedOrderWorkRefuse = async (res, order, pos) => {
    if (!order.deliveryBoy) {
        return {
            sta: false,
            message: 'You need to assign a rider first',
        };
    }

    let newTimeline = order.timeline;
    newTimeline.pop();
    newTimeline.push({
        title: 'Order refused',
        status: 'refused',
        note: 'Order refused',
        active: true,
        createdAt: new Date(),
    });

    // update order with new timeline & history

    let transectionList = [];
    let transactionDeliveryBoy = null;
    let transaction = null;
    let transactionShop = null;
    let transactionDrop = null;

    if (order.paymentMethod == 'cash') {
        // only drop deleryBoy delivered food
        if (order.deliveryBoy) {
            if (pos) {
                transactionShop = await shopBalanceAddForOrder(
                    order,
                    'success',
                    'sellerGetPaymentFromOrderRefused'
                );

                transactionDeliveryBoy = await deliveryBoyBalanceAddForOrder(
                    order,
                    'deliveryBoyOrderDeliveredCashRefused'
                );

                transectionList = [transactionShop._id];

                if (transactionDeliveryBoy) {
                    transectionList.push(transactionDeliveryBoy._id);
                }
            } else {
                transactionDeliveryBoy = await TransactionModel.create({
                    order: order._id,
                    autoTrxId: `${moment().format(
                        'DDMMYYHmmss'
                    )}${short().new()}`,
                    account: 'deliveryBoy',
                    type: 'deliveryBoyOrderDeliveredCashRefused',
                    paymentMethod: 'cash',
                    pos: pos ? true : false,
                    status: 'success',
                    deliveryBoyHand: true,
                    user: order.user,
                    shop: order.shop,
                    seller: order.seller,
                    deliveryBoy: order.deliveryBoy,
                    summary: order.summary,
                    amount: order.baseCurrency_riderFee,
                    secondaryCurrency_amount: order.secondaryCurrency_riderFee,
                    shopGet: order.baseCurrency_shopEarnings,
                    deliveryBoyGet: order.baseCurrency_riderFee,
                    unSettleAmount: order.baseCurrency_riderFee,
                    dropGet: order.adminCharge.baseCurrency_totalAdminCharge,
                    adminCharge: order.adminCharge,
                    dropGetFromShop:
                        order.adminCharge.baseCurrency_adminChargeFromOrder,
                    dropGetFromDeliveryBoy:
                        order.adminCharge.baseCurrency_adminChargeFromDelivery,
                    sendToDropAmount: 0,
                    paidCurrency: order.paidCurrency,
                });

                transactionShop = await shopBalanceAddForOrder(
                    order,
                    'success',
                    'sellerGetPaymentFromOrderRefused'
                );

                if (transactionDeliveryBoy) {
                    transectionList.push(transactionDeliveryBoy._id);
                }

                if (transactionShop) {
                    transectionList.push(transactionShop._id);
                }
            }
        }
    }

    // get total delivery time take to complete a order
    const format = 'YYYY-MM-DD H:mm:ss';
    const currentDate = moment(new Date()).format(format);
    const recevingDate = moment(new Date(order.order_placedAt)).format(format);
    const differ = new Date(currentDate) - new Date(recevingDate);
    let minutes = parseInt(differ / (1000 * 60));

    await Order.updateOne(
        { _id: order._id },
        {
            orderStatus: 'refused',
            refusedAt: new Date(),
            timeline: newTimeline,
            $push: {
                orderActivity: {
                    note: 'Order refused',
                    activityBy: 'deliveryBoy',
                    deliveryBoy: order.deliveryBoy,
                    createdAt: new Date(),
                },
            },
            $set: {
                transactionHistory: transectionList,
                transactions: transaction?._id,
                transactionsStore: transactionShop?._id,
                transactionsDeliveryBoy: transactionDeliveryBoy
                    ? transactionDeliveryBoy?._id
                    : null,
                deliveredMinutes: minutes || 0,
            },
        }
    );

    return {
        sta: true,
        message: 'Order updated',
    };
};

exports.deliveryManPickOrder = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const { orderId } = req.body;

        // order timeline update
        const order = await Order.findOne({ _id: orderId }).lean();

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (deliveryBoyId != order.deliveryBoy) {
            return errorResponse(res, 'you are not allowed to pick this order');
        }

        const { sta, message } = await deliveryBoyPickOrderWork(order);

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(updatedOrder);

        res.status(200).json({
            status: true,
            message: 'Order Picked successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

const deliveryBoyPickOrderWork = async order => {
    try {
        if (order.orderStatus !== 'ready_to_pickup') {
            if (
                [
                    'order_on_the_way',
                    'delivered',
                    'refused',
                    'cancelled',
                ].includes(order.orderStatus)
            ) {
                return {
                    sta: false,
                    message: `Order has already been ${order?.orderStatus}`,
                };
            } else {
                return {
                    sta: false,
                    message: `Please wait until ready_to_pickup`,
                };
            }
        }

        let newTimeline = order.timeline;

        newTimeline[4] = {
            title: 'Order on the way',
            status: 'order_on_the_way',
            note: 'Order on the way',
            active: true,
            createdAt: new Date(),
        };

        // Calculate delivered_time
        let delivered_time = new Date();
        delivered_time.setMinutes(
            delivered_time.getMinutes() +
            Number(order.userShopDistance?.duration?.value) / 60
        );

        if (order.orderFor === 'global') {
            await Order.updateOne(
                { _id: order._id },
                {
                    orderStatus: 'order_on_the_way',
                    timeline: newTimeline,
                    order_on_the_wayAt: new Date(),
                    delivered_time: delivered_time,
                    $push: {
                        orderActivity: {
                            note: 'Order Picked',
                            activityBy: 'deliveryBoy',
                            deliveryBoy: order.deliveryBoy,
                            createdAt: new Date(),
                        },
                    },
                }
            );
        } else {
            await Order.updateOne(
                { _id: order._id },
                {
                    orderStatus: 'order_on_the_way',
                    timeline: newTimeline,
                    order_on_the_wayAt: new Date(),
                    delivered_time: delivered_time,
                    $push: {
                        orderActivity: {
                            note: order?.deliveryBoy
                                ? 'Order Picked by shop rider'
                                : 'Shop sent his delivery boy',
                            activityBy: order?.deliveryBoy
                                ? 'deliveryBoy'
                                : 'shop',
                            deliveryBoy: order?.deliveryBoy || order.shop,
                            createdAt: new Date(),
                        },
                    },
                }
            );
        }

        return {
            sta: true,
            message: 'Order updated',
        };
    } catch (error) {
        return {
            sta: false,
            message: error.message,
        };
    }
};

exports.updateOrderStatusByAdmin = async (req, res) => {
    try {
        let {
            orderId,
            orderStatus,
            deliveryBoy,
            paidCurrency = 'baseCurrency',
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            time,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        } = req.body;

        const order = await Order.findOne({ _id: orderId })
            .populate('coupon')
            .lean();

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (orderStatus === 'accepted_delivery_boy') {
            if (deliveryBoy) {
                const { sta, message } = await deliveryBoyAcceptedWork(
                    order,
                    deliveryBoy,
                    true
                );
                if (!sta) {
                    return errorResponse(res, message);
                }
            } else {
                return errorResponse(res, 'select a delivery boy');
            }
        } else if (orderStatus === 'preparing') {
            if (!time) {
                const findShop = await ShopModel.findById(order.shop).select(
                    'defaultPreparationTime'
                );
                time = findShop.defaultPreparationTime;
            }

            const { sta, message } = await shopAcceptedOrderWork(
                order,
                order.shop,
                time,
                deliveryBoy,
                true
            );

            if (!sta) {
                return errorResponse(res, message);
            }
        } else if (orderStatus === 'ready_to_pickup') {
            const { sta, message } = await orderReadyByShopWork(order, false);

            if (!sta) {
                return errorResponse(res, message);
            }
        } else if (orderStatus === 'order_on_the_way') {
            const { sta, message } = await deliveryBoyPickOrderWork(order);

            if (!sta) {
                return errorResponse(res, message);
            }
        } else if (orderStatus === 'replacement_item_on_the_way') {
            const { sta, message } = await pickReplacementItemWork(order);

            if (!sta) {
                return errorResponse(res, message);
            }
        } else if (orderStatus === 'delivered') {
            if (order.orderFor === 'specific') {
                const { sta, message } = await orderDeliveredByShopWork(
                    order,
                    paidCurrency,
                    baseCurrency_collectCash,
                    secondaryCurrency_collectCash,
                    baseCurrency_receivedCash,
                    secondaryCurrency_receivedCash,
                    baseCurrency_returnedCash,
                    secondaryCurrency_returnedCash,
                );

                if (!sta) {
                    return errorResponse(res, message);
                }
            } else if (order.orderFor === 'global') {
                const { sta, message } = await deliveryManCompletedOrderWork(
                    order,
                    false,
                    paidCurrency,
                    baseCurrency_collectCash,
                    secondaryCurrency_collectCash,
                    baseCurrency_receivedCash,
                    secondaryCurrency_receivedCash,
                    baseCurrency_returnedCash,
                    secondaryCurrency_returnedCash,
                );

                if (!sta) {
                    return errorResponse(res, message);
                }
            }
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        if (orderStatus === 'accepted_delivery_boy') {
            await sendNotificationsDeliveryBoyUpdated(
                updatedOrder,
                'acceptedFromAdmin'
            );
        } else {
            await sendNotificationsAllApp(updatedOrder);
        }

        return res.json({
            message: 'Order Updated',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.userOrdersforAdmin = async (req, res) => {
    try {
        const { userId, page = 1, pageSize = 50 } = req.query;

        let whereConfig = {
            users: { $in: userId },
        };

        const orders = await Order.find(whereConfig).populate([
            {
                path: 'shop',
            },
            {
                path: 'user',
            },
            {
                path: 'users',
            },
            {
                path: 'deliveryBoy',
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
        ]);

        var paginate = await pagination({
            page,
            pageSize,
            model: Order,
            condition: whereConfig,
            pagingRange: 5,
        });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                orders,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deliveryBoyOrdersforAdmin = async (req, res) => {
    try {
        const { deliveryId, page = 1, pageSize = 50 } = req.query;

        let whereConfig = {
            deliveryBoy: deliveryId,
            orderStatus: 'delivered',
        };

        const orders = await Order.find(whereConfig).populate([
            {
                path: 'shop',
            },
            {
                path: 'user',
            },
            {
                path: 'users',
            },
            {
                path: 'deliveryBoy',
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
        ]);

        var paginate = await pagination({
            page,
            pageSize,
            model: Order,
            condition: whereConfig,
            pagingRange: 5,
        });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                orders,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.acceptedOrderForShop = async (req, res) => {
    try {
        const { orderId, shopId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        const shopInfo = await ShopModel.findById(shopId);

        let newTimeline = [
            {
                ...order.timeline[0],
            },
            {
                ...order.timeline[1],
            },
            {
                title: 'Shop Accepted order',
                status: 'preparing',
                note: 'Shop Accepted order',
                active: true,
                createdAt: new Date(),
            },
            {
                ...order.timeline[3],
            },
            {
                ...order.timeline[4],
            },
            {
                ...order.timeline[5],
            },
        ];

        let orderActivity = {
            note: 'Shop Accepted the order',
            activityBy: 'shop',
            shop: shop,
            createdAt: new Date(),
        };

        await Order.updateOne(
            {
                _id: orderId,
            },
            {
                orderStatus: 'preparing',
                shop: shopInfo._id,
                seller: shopInfo.seller,
                timeline: newTimeline,
                $push: {
                    orderActivity: orderActivity,
                },
            }
        );

        return res.json({
            message: 'Order Updated',
            status: true,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.acceptedOrderByShop = async (req, res) => {
    try {
        const { orderId, time, deliveryBoyId } = req.body;
        const shopId = req.shopId;

        const order = await Order.findById(orderId);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        const { sta, message } = await shopAcceptedOrderWork(
            order,
            shopId,
            time,
            deliveryBoyId
        );

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(updatedOrder);

        return res.json({
            message: 'Order Updated',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const shopAcceptedOrderWork = async (
    order,
    shopId,
    time,
    deliveryBoyId,
    admin = false
) => {
    try {
        const shopInfo = await ShopModel.findById(shopId);

        if (!['placed', 'accepted_delivery_boy'].includes(order.orderStatus)) {
            return {
                sta: false,
                message: `Order has already been ${order?.orderStatus}`,
            };
        }

        let newTimeline = order.timeline;

        if (shopInfo.haveOwnDeliveryBoy) {
            newTimeline[1] = {
                ...newTimeline[1],
                active: true,
                createdAt: new Date(),
            };
        }

        newTimeline[2] = {
            ...newTimeline[2],
            active: true,
            createdAt: new Date(),
        };

        if (order.orderFor === 'global' && order.orderStatus === 'placed') {
            const temp = newTimeline[1];
            newTimeline[1] = newTimeline[2];
            newTimeline[2] = temp;
        }

        // Calculate delivered_time
        let delivered_time;
        if (time) {
            if (
                order.orderFor === 'global' &&
                order?.deliveryBoyShopDistance &&
                Number(order?.deliveryBoyShopDistance?.duration?.value) / 60 >
                Number(time)
            ) {
                delivered_time = new Date();
                delivered_time.setMinutes(
                    delivered_time.getMinutes() +
                    Number(order.userShopDistance?.duration?.value) / 60 +
                    Number(order.deliveryBoyShopDistance?.duration?.value) /
                    60
                );
            } else {
                if (
                    order.isReplacementOrder &&
                    order.replacementOrderDeliveryInfo.deliveryType ===
                    'shop-customer-shop'
                ) {
                    // For replacement order feature
                    delivered_time = new Date();
                    delivered_time.setMinutes(
                        delivered_time.getMinutes() +
                        Number(order.userShopDistance?.duration?.value) /
                        60 +
                        Number(order.userShopDistance?.duration?.value) /
                        60 +
                        Number(time)
                    );
                } else {
                    delivered_time = new Date();
                    delivered_time.setMinutes(
                        delivered_time.getMinutes() +
                        Number(order.userShopDistance?.duration?.value) /
                        60 +
                        Number(time)
                    );
                }
            }
        }

        //*** Create trip summary start ***/
        let orderTripSummary;
        if (shopInfo.haveOwnDeliveryBoy) {
            const deliveryBoy = await DeliveryBoyModel.findById(deliveryBoyId);
            const userInfo = await UserModel.findOne({
                _id: order.user,
            });

            if (
                order.isReplacementOrder &&
                order.replacementOrderDeliveryInfo.deliveryType ===
                'shop-customer-shop'
            ) {
                const { distance, duration, legs, overview_polyline } =
                    await DistanceInfoGoogleWithWayPoints({
                        origin: {
                            latitude: shopInfo.location.coordinates[1],
                            longitude: shopInfo.location.coordinates[0],
                        },
                        destination: {
                            latitude: shopInfo.location.coordinates[1],
                            longitude: shopInfo.location.coordinates[0],
                        },
                        waypoints: [
                            {
                                latitude:
                                    order.dropOffLocation.location
                                        .coordinates[1],
                                longitude:
                                    order.dropOffLocation.location
                                        .coordinates[0],
                            },
                        ],
                    });

                orderTripSummary = [
                    {
                        name: deliveryBoy?.name || shopInfo.shopName,
                        address: shopInfo.address.address,
                        latitude: shopInfo.location.coordinates[1],
                        longitude: shopInfo.location.coordinates[0],
                        type: 'rider',
                        deliveryBoy: deliveryBoy?._id,
                        order: [order._id],
                        totalDistance: distance,
                        totalDuration: duration,
                        total_overview_polyline: overview_polyline,
                        distance: legs[0].distance,
                        duration: legs[0].duration,
                        overview_polyline: legs[0].overview_polyline,
                    },
                    {
                        name: userInfo.name,
                        address: order.dropOffLocation.address,
                        latitude: order.dropOffLocation.location.coordinates[1],
                        longitude:
                            order.dropOffLocation.location.coordinates[0],
                        type: 'user',
                        user: userInfo._id,
                        order: [order._id],
                        distance: legs[1].distance,
                        duration: legs[1].duration,
                        overview_polyline: legs[1].overview_polyline,
                    },
                    {
                        name: deliveryBoy?.name || shopInfo.shopName,
                        address: shopInfo.address.address,
                        latitude: shopInfo.location.coordinates[1],
                        longitude: shopInfo.location.coordinates[0],
                        type: 'rider',
                        deliveryBoy: deliveryBoy?._id,
                        order: [order._id],
                    },
                ];
            } else {
                const { distance, duration, legs, overview_polyline } =
                    await DistanceInfoGoogleWithWayPoints({
                        origin: {
                            latitude: shopInfo.location.coordinates[1],
                            longitude: shopInfo.location.coordinates[0],
                        },
                        destination: {
                            latitude:
                                order.dropOffLocation.location.coordinates[1],
                            longitude:
                                order.dropOffLocation.location.coordinates[0],
                        },
                        waypoints: [],
                    });

                orderTripSummary = [
                    {
                        name: deliveryBoy?.name || shopInfo.shopName,
                        address: shopInfo.address.address,
                        latitude: shopInfo.location.coordinates[1],
                        longitude: shopInfo.location.coordinates[0],
                        type: 'rider',
                        deliveryBoy: deliveryBoy?._id,
                        order: [order._id],
                        totalDistance: distance,
                        totalDuration: duration,
                        total_overview_polyline: overview_polyline,
                        distance: legs[0].distance,
                        duration: legs[0].duration,
                        overview_polyline: legs[0].overview_polyline,
                    },
                    {
                        name: userInfo.name,
                        address: order.dropOffLocation.address,
                        latitude: order.dropOffLocation.location.coordinates[1],
                        longitude:
                            order.dropOffLocation.location.coordinates[0],
                        type: 'user',
                        user: userInfo._id,
                        order: [order._id],
                    },
                ];
            }
        }
        //*** Create trip summary end ***/

        await Order.updateOne(
            {
                _id: order._id,
            },
            {
                $set: {
                    orderStatus: 'preparing',
                    shop: shopInfo._id,
                    seller: shopInfo.seller,
                    timeline: newTimeline,
                    preparingAt: new Date(),
                    preparingTime: time,
                    delivered_time: delivered_time,
                    // for separate rider
                    deliveryBoy: deliveryBoyId,
                    orderTripSummary: orderTripSummary,
                },
                $push: {
                    orderActivity: {
                        note: 'Shop Accepted the order',
                        activityBy: 'shop',
                        shop: shopInfo,
                        createdAt: new Date(),
                    },
                },
            }
        );

        return {
            sta: true,
            message: 'Order updated',
        };
    } catch (error) {
        return {
            sta: false,
            message: error.message,
        };
    }
};

exports.updatePreparingTime = async (req, res) => {
    try {
        const { orderId, time } = req.body;
        const shopId = req.shopId;

        const order = await Order.findById(orderId);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (shopId.toString() !== order.shop.toString()) {
            return errorResponse(res, 'You are not valid shop');
        }

        const updatePreparingTime = order?.preparingTime + time;

        // Calculate delivered_time
        const delivered_time = order.delivered_time;
        delivered_time.setMinutes(delivered_time.getMinutes() + time);

        // Calculate delivered_time
        // let delivered_time;
        // if (time) {
        //     if (
        //         order.orderFor === 'global' &&
        //         order.deliveryBoy &&
        //         Number(order?.deliveryBoyShopDistance?.duration?.value) / 60 >
        //             Number(time)
        //     ) {
        //         delivered_time = new Date(order.preparingAt);
        //         delivered_time.setMinutes(
        //             delivered_time.getMinutes() +
        //                 Number(order.userShopDistance?.duration?.value) / 60 +
        //                 Number(order.deliveryBoyShopDistance?.duration?.value) /
        //                     60
        //         );
        //     } else {
        //         delivered_time = new Date(order.preparingAt);
        //         delivered_time.setMinutes(
        //             delivered_time.getMinutes() +
        //                 Number(order.userShopDistance?.duration?.value) / 60 +
        //                 Number(time)
        //         );
        //     }
        // }

        await Order.updateOne(
            { _id: orderId },
            {
                preparingTime: updatePreparingTime,
                delivered_time: delivered_time,
            }
        );

        const updatedOrder = await getFullOrderInformation(order._id);

        successResponse(res, {
            message: 'Successfully updated preparing time',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.orderOnTheWayByShop = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (order.orderStatus !== 'preparing') {
            return errorResponse(
                res,
                `Order has already been ${order?.orderStatus}`
            );
        }

        let newTimeline = order.timeline;

        newTimeline[4] = {
            title: 'Order on the way',
            status: 'order_on_the_way',
            note: 'Order on the way',
            active: true,
            createdAt: new Date(),
        };

        await Order.updateOne(
            { _id: order._id },
            {
                orderStatus: 'order_on_the_way',
                timeline: newTimeline,
                order_on_the_wayAt: new Date(),
                $push: {
                    orderActivity: {
                        note: 'Shop sent his delivery boy',
                        activityBy: 'shop',
                        deliveryBoy: order.shop,
                        createdAt: new Date(),
                    },
                },
            }
        );

        const updatedOrder = await getFullOrderInformation(order._id);

        return res.json({
            message: 'Order Updated',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.orderReadyByShop = async (req, res) => {
    try {
        const { orderId, isPickup } = req.body;
        const shopId = req.shopId;

        const order = await Order.findById(orderId);
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (shopId != String(order.shop)) {
            return errorResponse(res, 'Shop not access this order');
        }

        const { sta, message } = await orderReadyByShopWork(order, isPickup);

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(updatedOrder);

        return res.json({
            message: 'Order Updated',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const orderReadyByShopWork = async (order, isPickup) => {
    try {
        if (order.orderFor === 'global' && !order.deliveryBoy) {
            return {
                sta: false,
                message: 'please wait until rider accepting',
            };
        }

        if (order.orderStatus !== 'preparing') {
            return {
                sta: false,
                message: `Order has already been ${order?.orderStatus}`,
            };
        }

        let shopId = order.shop;

        const shopInfo = await ShopModel.findById(shopId);
        let newTimeline;
        let orderActivity;

        // For calculate shop delay time
        const expectedTime = moment(order.preparingAt).add(
            order.preparingTime,
            'minutes'
        );
        const expectedTimeDifference = expectedTime.diff(moment(), 'minutes');
        const isShopDelay = expectedTimeDifference < 0;
        const shopDelayTime = isShopDelay
            ? Math.abs(expectedTimeDifference)
            : 0;

        if (isPickup === 'yes') {
            newTimeline = [...order.timeline];
            newTimeline[3] = {
                title: 'Order ready for pickup',
                status: 'ready_to_pickup',
                note: 'Order ready for pickup',
                active: true,
                createdAt: new Date(),
            };
            newTimeline[4] = {
                title: 'Order on the way',
                status: 'order_on_the_way',
                note: 'Order on the way',
                active: true,
                createdAt: new Date(),
            };

            orderActivity = {
                note: 'Shop ready the order for pickup',
                activityBy: 'shop',
                shop: shopInfo,
                createdAt: new Date(),
            };

            // Calculate delivered_time
            let delivered_time = new Date();
            delivered_time.setMinutes(
                delivered_time.getMinutes() +
                Number(order.userShopDistance?.duration?.value) / 60
            );

            await Order.updateOne(
                {
                    _id: order._id,
                },
                {
                    orderStatus: 'order_on_the_way',
                    shop: shopInfo._id,
                    seller: shopInfo.seller,
                    timeline: newTimeline,
                    order_on_the_wayAt: new Date(),
                    ready_to_pickupAt: new Date(),
                    delivered_time: delivered_time,
                    isShopDelay,
                    shopDelayTime,
                    $push: {
                        orderActivity: orderActivity,
                    },
                }
            );
        } else {
            newTimeline = [...order.timeline];
            newTimeline[3] = {
                title: 'Order ready for pickup',
                status: 'ready_to_pickup',
                note: 'Order ready for pickup',
                active: true,
                createdAt: new Date(),
            };

            orderActivity = {
                note: 'Shop ready the order for pickup',
                activityBy: 'shop',
                shop: shopInfo,
                createdAt: new Date(),
            };

            await Order.updateOne(
                {
                    _id: order._id,
                },
                {
                    orderStatus: 'ready_to_pickup',
                    ready_to_pickupAt: new Date(),
                    shop: shopInfo._id,
                    seller: shopInfo.seller,
                    timeline: newTimeline,
                    isShopDelay,
                    shopDelayTime,
                    $push: {
                        orderActivity: orderActivity,
                    },
                }
            );
        }

        // Check shop order capacity
        await checkShopCapacity(order.shop);

        return {
            sta: true,
            message: 'Order updated',
        };
    } catch (error) {
        return {
            sta: false,
            message: error.message,
        };
    }
};
exports.orderDeliveredByShop = async (req, res) => {
    try {
        const {
            orderId,
            paidCurrency = 'baseCurrency',
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        } = req.body;
        const shopId = req.shopId;

        const order = await Order.findById(orderId).populate('coupon');
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (shopId != String(order.shop)) {
            return errorResponse(res, 'Shop not access this order');
        }

        const { sta, message } = await orderDeliveredByShopWork(
            order,
            paidCurrency,
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        );

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(updatedOrder);

        return res.json({
            message: 'Order Updated',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const orderDeliveredByShopWork = async (
    order,
    paidCurrency,
    baseCurrency_collectCash,
    secondaryCurrency_collectCash,
    baseCurrency_receivedCash,
    secondaryCurrency_receivedCash,
    baseCurrency_returnedCash,
    secondaryCurrency_returnedCash,
) => {
    try {
        if (order.orderStatus !== 'order_on_the_way') {
            if (
                ['delivered', 'refused', 'cancelled'].includes(
                    order.orderStatus
                )
            ) {
                return {
                    sta: false,
                    message: `Order has already been ${order?.orderStatus}`,
                };
            } else {
                return {
                    sta: false,
                    message: `Please wait until order_on_the_way`,
                };
            }
        }

        let shopId = order.shop;

        const shopInfo = await ShopModel.findById(shopId);

        let newTimeline = order.timeline;
        newTimeline.pop();
        newTimeline.push({
            title: 'Order Delivered',
            status: 'delivered',
            note: 'Order Delivered',
            active: true,
            createdAt: new Date(),
        });

        let orderActivity = {
            note: 'Shop delivered the order',
            activityBy: 'shop',
            shop: shopInfo,
            createdAt: new Date(),
        };

        let transactionList = [];
        let transactionShop = null;
        let transactionDrop = null;

        //*** All calculation happen after delivered feature  ***/
        if (order.paymentMethod === 'cash') {
            if (order.orderFor === 'specific') {
                transactionShop = await shopBalanceAddForOrder(
                    order,
                    'success',
                    'sellerGetPaymentFromOrderCash',
                    'store'
                );
                // for less from unsettle amount
                await shopCashInHandFc(order);

                if (transactionShop) {
                    transactionList.push(transactionShop._id);
                }
            }
        } else {
            if (order.orderFor === 'specific') {
                transactionShop = await shopBalanceAddForOrder(order);
                transactionDrop = await addDropBalanceForOrder(order);

                if (transactionDrop) {
                    transactionList.push(transactionDrop._id);
                }
                if (transactionShop) {
                    transactionList.push(transactionShop._id);
                }
            }
        }

        //*** Calc user wallet and card start***/
        const orderCart = await CartModel.findById(order.cart);

        if (orderCart) {
            for (const element of orderCart.cartItems) {
                // for wallet
                if (element?.summary?.baseCurrency_wallet > 0) {
                    const transactionUser = await TransactionModel.create({
                        user: element.user,
                        amount: element.summary.baseCurrency_wallet,
                        secondaryCurrency_amount:
                            element.summary.secondaryCurrency_wallet,
                        userNote: 'Order Payment Completed',
                        adminNote: 'User order pay throw wallet',
                        account: 'user',
                        type: 'userPayBeforeReceivedOrderByWallet',
                        status: 'success',
                        orderId: order._id,
                        paidCurrency: order.paidCurrency,
                        isUserWalletRelated: true,
                    });

                    transactionList.push(transactionUser._id);

                    await UserModel.updateOne(
                        { _id: element.user },
                        {
                            $inc: {
                                tempBalance:
                                    -element.summary.baseCurrency_wallet,
                            },
                        }
                    );
                }

                // for card
                if (element?.summary?.baseCurrency_card > 0) {
                    const transactionUser = await userOrderCreateTransection(
                        order,
                        element.user,
                        element.summary.baseCurrency_card,
                        element.summary.secondaryCurrency_card,
                        element.summary,
                        element.paymentMethod,
                        element.cardTypeString,
                        element.cardId
                    );

                    transactionList.push(transactionUser._id);

                    // Areeba payment gateway integration
                    const newTransactionId = ObjectId();
                    const currency = 'USD';

                    const capturePutData = {
                        apiOperation: 'CAPTURE',
                        transaction: {
                            amount: element?.summary?.baseCurrency_card,
                            currency: currency,
                        },
                    };

                    const { data: captureData } = await areebaPaymentGateway(
                        element?.areebaCard?.orderId,
                        newTransactionId,
                        capturePutData
                    );

                    if (captureData?.result == 'ERROR')
                        return errorResponse(
                            res,
                            captureData?.error?.explanation
                        );
                }

                // for redeem reward
                if (element?.summary?.reward?.baseCurrency_amount > 0) {
                    const transactionForRedeemReward =
                        await transactionForReward({
                            order: order,
                            user: element.user,
                            amount: element.summary.reward.baseCurrency_amount,
                            rewardPoints: element.summary.reward.points,
                            summary: element.summary,
                            type: 'userRedeemRewardPoints',
                            userNote: 'User redeem reward points for order',
                        });

                    transactionList.push(transactionForRedeemReward._id);
                }

                element.isPaid = true;
            }
            await orderCart.save();
        }
        //*** Calc user wallet and card end***/

        // get total delivery time take to complete a order
        const format = 'YYYY-MM-DD H:mm:ss';
        const currentDate = moment(new Date()).format(format);
        const recevingDate = moment(new Date(order.order_placedAt)).format(
            format
        );
        const differ = new Date(currentDate) - new Date(recevingDate);
        let minutes = parseInt(differ / (1000 * 60));

        let transactionForGetReward;
        if (order?.rewardPoints > 0) {
            const cartDetails = await CartModel.findById(order.cart);

            for (const element of cartDetails?.cartItems) {
                if (element.isPaid) {
                    transactionForGetReward = await transactionForReward({
                        order: order,
                        user: element.user,
                        amount:
                            element?.summary?.baseCurrency_cash +
                            element?.summary?.baseCurrency_card +
                            element?.summary?.baseCurrency_wallet,
                        rewardPoints: element?.rewardPoints,
                        summary: element.summary,
                        type: 'userGetRewardPoints',
                        userNote: 'User get reward points for order',
                    });

                    if (transactionForGetReward) {
                        transactionList.push(transactionForGetReward._id);
                    }
                }
            }
        }

        await Order.updateOne(
            {
                _id: order._id,
            },
            {
                $set: {
                    orderStatus: 'delivered',
                    deliveredAt: new Date(),
                    paymentStatus: 'paid',
                    timeline: newTimeline,
                    deliveredMinutes: minutes || 0,
                    paidCurrency: paidCurrency,
                    baseCurrency_collectCash,
                    secondaryCurrency_collectCash,
                    baseCurrency_receivedCash,
                    secondaryCurrency_receivedCash,
                    baseCurrency_returnedCash,
                    secondaryCurrency_returnedCash,
                    transactionHistory: transactionList,
                    transactionsStore: transactionShop
                        ? transactionShop?._id
                        : null,
                    transactionsDrop: transactionDrop
                        ? transactionDrop?._id
                        : null,
                },
                $push: {
                    orderActivity: orderActivity,
                },
            }
        );

        await orderAfterDeliveredWork(order, paidCurrency);

        return {
            sta: true,
            message: 'Order updated',
        };
    } catch (error) {
        return {
            sta: false,
            message: error.message,
        };
    }
};

exports.orderListForSeller = async (req, res) => {
    try {
        const {
            sellerId,
            page = 1,
            pageSize = 50,
            startDate,
            endDate,
        } = req.query;

        let whereConfig = {
            seller: sellerId,
        };

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            whereConfig = {
                ...whereConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        const orders = await Order.find(whereConfig).populate([
            {
                path: 'user',
            },
            {
                path: 'users',
            },
            {
                path: 'shop',
            },
            {
                path: 'deliveryBoy',
            },
            {
                path: 'seller',
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
        ]);

        let paginate = await pagination({
            page,
            pageSize,
            model: Order,
            condition: whereConfig,
            pagingRange: 5,
        });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                orders,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getDeliveryCharge = async (req, res) => {
    try {
        const {
            shopId,
            latitude,
            longitude,
            creatorId: providedCreatorId,
        } = req.query;
        const userId = req.userId;

        const creatorId = providedCreatorId || userId;

        if (!shopId || !creatorId)
            return errorResponse(res, 'shopId and creatorId are required');

        if (!latitude || !longitude)
            return errorResponse(res, 'latitude and longitude are required');

        const { order_delivery_charge, status, message } =
            await getDeliveryChargeFunc(shopId, creatorId, latitude, longitude);

        if (!status) {
            return errorResponse(res, message);
        }

        return res.status(200).json({
            status: true,
            message: 'Delivery charge',
            data: {
                order_delivery_charge,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getDeliveryChargeFunc = async (shopId, userId, latitude, longitude) => {
    const user = await UserModel.findOne({ _id: userId });
    const subscribedUser = user.isSubscribed;

    const shop = await ShopModel.findOne({ _id: shopId }).populate(
        'seller marketings'
    );

    if (!shop) {
        return {
            order_delivery_charge: {},
            status: false,
            message: 'shop not found',
        };
    }

    // total distance between to place pick & drop
    let distance = await getDistance(
        latitude,
        longitude,
        shop.location.coordinates[1],
        shop.location.coordinates[0],
        'k'
    );

    if (!distance) {
        distance = 1;
    }

    let dropChargeId = null;

    let distanceSelectObject = null;
    let deliveryRange = [];
    let freeDeliveryMarketing = shop?.marketings?.find(
        marketing =>
            marketing.type === 'free_delivery' &&
            marketing.isActive === true &&
            marketing.status === 'active'
    );

    const globalDropCharge = await GlobalDropCharge.findOne({});
    if (globalDropCharge) {
        deliveryRange = globalDropCharge.deliveryRange;
        dropChargeId = globalDropCharge._id;
    }

    let deliveryFee = 0;
    let exchangeRate = (await adminExchangeRate()) ?? 0;
    let deliveryFeeWithFreeDelivery = 0;
    let deliveryPersonCut = 0;
    let dropGetFromDeliveryFee = 0;
    let shopCut = 0;
    let dropCut = 0;
    let shopLossForFreeDelivery = 0;
    let dropLossForFreeDelivery = 0;
    let subscriptionDeliveryFee = 0;

    if (shop.haveOwnDeliveryBoy) {
        exchangeRate = shop?.shopExchangeRate;
        deliveryFee = freeDeliveryMarketing
            ? 0
            : subscribedUser
                ? 0
                : shop.deliveryFee;
        deliveryFeeWithFreeDelivery = shop.deliveryFee;
        shopLossForFreeDelivery = freeDeliveryMarketing ? shop.deliveryFee : 0;
        dropCut =
            !freeDeliveryMarketing && subscribedUser ? shop.deliveryFee : 0;
        dropLossForFreeDelivery =
            !freeDeliveryMarketing && subscribedUser ? shop.deliveryFee : 0;
        dropGetFromDeliveryFee =
            !freeDeliveryMarketing && subscribedUser ? -shop.deliveryFee : 0;
        subscriptionDeliveryFee =
            !freeDeliveryMarketing && subscribedUser ? shop.deliveryFee : 0;
    } else {
        if (deliveryRange.length > 0) {
            let found = deliveryRange.find(item => {
                return distance >= item.from && distance <= item.to;
            });

            if (!found) {
                found = deliveryRange[deliveryRange.length - 1];
            }

            distanceSelectObject = found;
            if (found) {
                if (
                    freeDeliveryMarketing &&
                    freeDeliveryMarketing?.creatorType === 'shop'
                ) {
                    shopCut = found.charge;
                    shopLossForFreeDelivery = found.charge;
                }
                if (
                    freeDeliveryMarketing &&
                    freeDeliveryMarketing?.creatorType === 'admin'
                ) {
                    dropCut = found.deliveryPersonCut;
                    dropLossForFreeDelivery = found.charge;
                }
                if (!freeDeliveryMarketing && subscribedUser) {
                    dropCut = found.deliveryPersonCut;
                    dropLossForFreeDelivery = found.charge;
                    subscriptionDeliveryFee = found.charge;
                }

                deliveryFee = freeDeliveryMarketing
                    ? 0
                    : subscribedUser
                        ? 0
                        : found.charge;
                deliveryFeeWithFreeDelivery = found.charge;
                deliveryPersonCut = found.deliveryPersonCut;
                dropGetFromDeliveryFee =
                    deliveryFee - deliveryPersonCut + shopCut;
            }
        }
    }

    const order_delivery_charge = await OrderDeliveryCharge.create({
        deliveryFee: deliveryFee,

        // if shop has own delivery boy then the exchange rate will be admin exchnage rate otherwise shop exchange rate
        secondaryDeliveryFee: calculateSecondaryPrice(
            deliveryFee,
            exchangeRate ?? 0
        ),

        distance: distance,
        deliveryBoyFee: deliveryPersonCut,
        dropFee: dropGetFromDeliveryFee,
        dropChargeId: dropChargeId,
        selectedRangeItem: distanceSelectObject
            ? distanceSelectObject?._id
            : null,
        userLocation: [longitude, latitude],
        shopLocation: shop.location.coordinates,
        shop: shop._id,
        shopCut,
        dropCut,
        deliveryFeeWithFreeDelivery,
        shopLossForFreeDelivery,
        dropLossForFreeDelivery,
        subscriptionDeliveryFee,
    });

    return { order_delivery_charge, status: true, message: '' };
};

exports.orderPaymentGenerate = async (req, res) => {
    try {
        const userId = req.userId;
        let {
            cardId,
            pin,
            amount,
            orderDeliveryAddressId,
            creatorSummary,
            products,
            cartId,
            type,
            scheduleDate,
        } = req.body;

        if (!orderDeliveryAddressId) {
            return errorResponse(res, 'orderDeliveryAddressId is required');
        }

        const deliveryAddress = await Address.findOne({
            _id: orderDeliveryAddressId,
        });

        if (!deliveryAddress) {
            return errorResponse(res, 'DeliveryAddress not found');
        }

        const checkingOrderValidity = await checkingPlaceOrderValidity(
            userId,
            deliveryAddress,
            creatorSummary,
            products,
            cartId,
            type,
            scheduleDate
        );
        if (checkingOrderValidity)
            return errorResponse(res, checkingOrderValidity);

        if (!cardId) {
            return res.json({
                status: false,
                message: 'Please fill all fields',
            });
        }

        const user = await UserModel.findById(userId).select(
            'name gender phone_number email'
        );

        const card = await CardModel.findOne({ _id: cardId });

        // check pin have or not in cardModel
        if (card.pins?.length.length > 0 && !pin) {
            // get last pin
            pin = card.pins[card.pins.length - 1];
        }

        if (card.pins.length.length <= 0 && !pin) {
            return res.json({
                status: false,
                message: 'Please enter a pin',
                error_type: 'empty_pin',
            });
        }

        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;

        const cardInformation = {
            card_number: card.card_number,
            cvv: card.cvv,
            expiry_month: card.expiry_month,
            expiry_year: card.expiry_year,
            currency: card.currency || 'NGN',
            amount,
            fullname: user.name,
            email: user.email,
            phone_number: user.phone_number,
            tx_ref,
            // redirect_url: null,
            enckey: ENCRYPTION_KEY,
        };

        if (card.mode === 'pin') {
            let payload2 = cardInformation;
            payload2.authorization = {
                mode: 'pin',
                // fields: ['pin'],
                pin: pin,
            };

            //return res.json({payload2})

            const reCallCharge = await flw.Charge.card(payload2);

            if (reCallCharge.status === 'error') {
                if (reCallCharge.message.includes('Invalid PIN')) {
                    return res.json({
                        status: false,
                        message: reCallCharge.message,
                        error_type: 'invalid_pin',
                    });
                }

                return res.json({
                    status: false,
                    message: reCallCharge.message,
                });
            }

            // check pin have in card.pins in mongoose
            if (card.pins.length.length > 0) {
                if (card.pins[card.pins.length - 1] !== pin) {
                    await CardModel.updateOne(
                        { _id: cardId },
                        { $push: { pins: pin } }
                    );
                }
            } else {
                // update CardModel in pin add
                await CardModel.updateOne(
                    { _id: cardId },
                    { $push: { pins: pin } }
                );
            }

            const flutterTransaction = await FlutterTransaction.create({
                user: userId,
                flutterWave: reCallCharge,
                cardInfo: {
                    cardId,
                    card_number: card.card_number,
                    cvv: card.cvv,
                    expiry_month: card.expiry_month,
                    expiry_year: card.expiry_year,
                    currency: cardInformation.currency,
                    amount: cardInformation.amount,
                    validationType: card.mode,
                    pin,
                    tx_ref,
                },
                type: 'order',
            });

            return res.json({
                status: reCallCharge.status == 'success' ? true : false,
                message:
                    reCallCharge.status == 'success'
                        ? 'payment generate'
                        : reCallCharge.message,
                data: {
                    flw: reCallCharge,
                    flutter: flutterTransaction,
                },
                error_type:
                    reCallCharge.status == 'success'
                        ? null
                        : reCallCharge.message,
            });
        } else {
            return res.json({
                status: false,
                message: 'security type not others. contact to support',
            });
        }
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.orderCompletePayment = async (req, res) => {
    try {
        const userId = req.userId;
        const { card } = req.body;
        const { token, token_id, otp, defaultPayment } = card;

        if (!otp) {
            return res.json({
                status: false,
                message: 'please enter your otp',
                error_type: 'otp_empty',
            });
        }

        const flutterTransaction = await FlutterTransaction.findOne({
            _id: token_id,
            token: token,
        });

        if (!flutterTransaction) {
            return res.json({
                status: false,
                message: 'Transaction not found',
            });
        }

        const flw_ref = flutterTransaction.flutterWave.data.flw_ref;

        const callValidate = await flw.Charge.validate({
            otp: otp,
            flw_ref: flw_ref,
        });

        if (callValidate.status === 'success') {
            flutterTransaction.status = 'success';
            await flutterTransaction.save();

            // set balance to user

            const amount = flutterTransaction.flutterWave.data.amount;

            const cardTypeString = callValidate.data.card.issuer;

            await CardModel.updateOne(
                { _id: flutterTransaction.cardInfo.cardId },
                {
                    $set: {
                        cardTypeString: cardTypeString,
                    },
                }
            );

            // place order now
            userPlaceOrderWithCard(
                req,
                res,
                flutterTransaction.cardInfo.cardId,
                cardTypeString
            );
        } else {
            return res.json({
                status: false,
                message: callValidate.message,
                error: callValidate.message,
                data: {
                    flw: callValidate,
                },
            });
        }
    } catch (error) {
        return errorHandler(res, error);
    }
};

// const checkingOrderHavePendingUser = async userId => {
//     const orders = await Order.find({
//         user: userId,
//         orderStatus: { $nin: ['delivered', 'cancelled', 'refused'] },
//     });

//     if (orders.length >= 3) {
//         return false;
//     }

//     return true;
// };
const checkingPlaceOrderValidity = async (
    userId,
    deliveryAddress,
    summary,
    products,
    cartId,
    type,
    scheduleDate
) => {
    //*** Checking User Info ***/
    const userInfo = await UserModel.findOne({
        _id: userId,
        deletedAt: null,
    });
    if (userInfo?.status !== 'active')
        return `Your account is ${userInfo?.status}. Please contact support.`;

    const orders = await OrderModel.countDocuments({
        user: userId,
        orderStatus: {
            $nin: ['delivered', 'cancelled', 'refused', 'schedule'],
        },
    });
    const butlerOrders = await Butler.countDocuments({
        user: userId,
        orderStatus: {
            $nin: ['delivered', 'cancelled', 'refused', 'schedule'],
        },
    });

    if (orders + butlerOrders >= 3)
        return 'You have 3 pending order. please complete your order first.';

    const { secondaryCurrency_availableBalance } = await getUserBalance(userId);

    if (secondaryCurrency_availableBalance < 0)
        return `You can't place any order, please check your balance.`;

    if (
        summary?.secondaryCurrency_wallet > 0 &&
        secondaryCurrency_availableBalance < summary.secondaryCurrency_wallet
    )
        return 'Insufficient wallet balance';

    // Checking user location zone
    const zoneConfig = {
        zoneGeometry: {
            $geoIntersects: {
                $geometry: {
                    type: 'Point',
                    coordinates: [
                        deliveryAddress?.longitude,
                        deliveryAddress?.latitude,
                    ],
                },
            },
        },
        zoneStatus: 'active',
    };
    const zone = await ZoneModel.findOne(zoneConfig);
    if (!zone) return 'User address is out of our service.';

    if (zone.zoneAvailability === 'busy')
        return 'Selected address is inside a busy zone.';

    //*** Checking Shop Info ***/
    const checkShop = await Product.findOne({
        _id: ObjectId(products[0].product),
    }).populate([
        {
            path: 'shop',
            populate: 'marketings',
            select: '-products',
        },
    ]);
    if (!checkShop) return ` ${products[0].product} Product not found.`;

    if (checkShop?.shop?.shopStatus !== 'active') return `Shop is inactive.`;
    if (checkShop?.shop?.liveStatus !== 'online')
        return `Shop is ${checkShop?.shop?.liveStatus}.`;

    if (type !== 'schedule') {
        const isShopOpen = checkShopOpeningHours(checkShop?.shop);
        if (!isShopOpen) return `Shop is closed.`;
    }

    if (type === 'schedule') {
        const isShopOpen = checkShopOpeningHours(checkShop?.shop, scheduleDate);
        if (!isShopOpen)
            return `Shop will close at the time you have selected.`;
    }

    const shopExchangeRate = checkShop?.shop?.shopExchangeRate;

    if (summary.baseCurrency_productAmount < checkShop?.shop?.minOrderAmount) {
        const currencySymbol = shopExchangeRate
            ? (await AppSetting.findOne({}).select('secondaryCurrency'))
                ?.secondaryCurrency?.code
            : (await AppSetting.findOne({}).select('baseCurrency'))
                ?.baseCurrency?.symbol;

        const minOrderAmount = shopExchangeRate
            ? checkShop?.shop?.minOrderAmount * shopExchangeRate
            : checkShop?.shop?.minOrderAmount;

        return shopExchangeRate
            ? `Your order amount must not be less than ${currencySymbol} ${minOrderAmount}.`
            : `Your order amount must not be less than ${currencySymbol}${minOrderAmount}.`;
    }

    //*** Checking shop and delivery distance ***/
    const distanceStatus = await this.checkOrderDistance(
        {
            latitude: checkShop?.shop?.location?.coordinates[1],
            longitude: checkShop?.shop?.location?.coordinates[0],
        },
        {
            latitude: deliveryAddress?.location?.coordinates[1],
            longitude: deliveryAddress?.location?.coordinates[0],
        }
    );

    if (!distanceStatus) {
        return 'Your selected address is out of shop range';
    }

    const userShopDistance = await DistanceInfoGoogle({
        origin: {
            latitude: checkShop?.shop?.location?.coordinates[1],
            longitute: checkShop?.shop?.location?.coordinates[0],
        },
        distination: {
            latitude: deliveryAddress?.location?.coordinates[1],
            longitute: deliveryAddress?.location?.coordinates[0],
        },
    });

    if (userShopDistance?.duration?.value == null) {
        return 'Your selected address is out of shop range';
    }

    //*** Checking free delivery marketing***/
    if (summary.baseCurrency_riderFee === 0) {
        const freeDeliveryMarketing = checkShop?.shop?.marketings?.find(
            marketing =>
                marketing.type === 'free_delivery' &&
                marketing.status === 'active' &&
                marketing.isActive
        );
        if (!freeDeliveryMarketing && !userInfo.isSubscribed)
            return 'Free delivery marketing is updated.';
    }

    //*** Checking Products Info ***/
    for (const element of products) {
        //Checking product info
        const product = await Product.findOne({
            _id: ObjectId(element.product),
        }).populate([
            {
                path: 'marketing',
            },
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        if (!product) return `${element.product} Product not found.`;

        if (product.status !== 'active')
            return `${product.name} product is inactive.`;

        if (product.productVisibility !== true)
            return `${product.name} product visibility is false.`;

        if (!userInfo.isSubscribed) {
            await checkPlusUserProductMarketing(product);
        }

        let finalAttributeItemPrice = 0;
        // check attributes info
        if (element?.attributes?.length) {
            const { status, attributeItemPrice } = productAttributeIsChange(
                product?.attributes,
                element?.attributes
            );

            if (status)
                return `${product.name} product attributes are updated.`;
            finalAttributeItemPrice = attributeItemPrice;
        }

        if (
            (product?.price + finalAttributeItemPrice).toFixed(2) !==
            element?.perProduct.toFixed(2)
        )
            return `${product.name} product price is updated.`;

        //Checking marketing info
        const productMarketingId = product?.marketing?.map(item =>
            item._id.toString()
        );
        if (
            element?.marketingId &&
            !productMarketingId.includes(element?.marketingId?.toString())
        )
            return `${product.name} product marketing is updated.`;

        const findActiveMarketing = product?.marketing?.some(
            item => item.status === 'active' && item.isActive
        );
        if (element?.marketingId && !findActiveMarketing)
            return `${product.name} product marketing is inactive.`;

        if (
            element?.marketingId &&
            product?.marketing[0]?.type === 'percentage' &&
            product?.discount.toFixed(2) !== element?.discount.toFixed(2)
        )
            return `${product.name} product discount is updated.`;

        if (
            element?.marketingId &&
            product?.marketing[0]?.type === 'double_menu' &&
            !element?.isDoubleDeal
        )
            return `${product.name} product buy1get1 is updated.`;

        if (
            element?.marketingId &&
            product?.marketing[0]?.type === 'reward' &&
            element?.reward?.amount &&
            product?.reward?.amount.toFixed(2) !==
            element?.reward?.amount.toFixed(2) &&
            product?.reward?.points.toFixed(2) !==
            element?.reward?.points.toFixed(2)
        )
            return `${product.name} product reward is updated.`;

        //Checking Stock
        if (
            product?.isStockEnabled &&
            product?.stockQuantity < element?.quantity
        )
            return `${product.name} is sold out.`;

        if (!product?.isStockEnabled && product?.stockQuantity < 1)
            return `${product.name} is sold out.`;
    }

    //*** Checking Cart Info ***/
    const cartDetails = await CartModel.findOne({
        _id: cartId,
        deletedAt: null,
    });
    if (!cartDetails) return `Cart not found.`;

    return false;
};

const productAttributeIsChange = (productAtt, elementAtt) => {
    // attributes: [
    //     {
    //         id: '5f9f1b1b1b1b1b1b1b1b1b1b',
    //         attributeItems: [
    //             {
    //                 id: '5f9f1b1b1b1b1b1b1b1b1b1b',
    //                 extraPrice: '20',
    //             },
    //         ],
    //     },
    // ];

    let attributeItemPrice = 0;
    for (const element of elementAtt) {
        const attribute = productAtt?.find(
            att => att?._id?.toString() == element?.id?.toString()
        );

        if (!attribute) {
            // return true;
            return { status: true, attributeItemPrice };
        }

        let itemPrice = 0;
        for (const itemElement of element?.attributeItems) {
            const item = attribute?.items?.find(
                item => item?._id == itemElement?.id
            );

            if (!item) {
                // return true;
                return { status: true, attributeItemPrice };
            }
            if (
                item?.extraPrice.toFixed(2) !==
                itemElement?.extraPrice.toFixed(2)
            ) {
                // return true;
                return { status: true, attributeItemPrice };
            }
            itemPrice += Number(item?.extraPrice);
        }
        attributeItemPrice += itemPrice;
    }

    return { status: false, attributeItemPrice };
};

// For replacement order feature
exports.adminPlaceOrder = async (req, res) => {
    try {
        const adminId = req.adminId;
        // replacementOrderDeliveryInfo = {
        //     deliveryType: 'shop-customer' || 'shop-customer-shop',
        //     baseCurrency_deliveryFee: 20,
        //     secondaryCurrency_deliveryFee: 200,
        //     baseCurrency_riderProfit: 10,
        //     secondaryCurrency_riderProfit: 100,
        //     baseCurrency_adminDeliveryProfit: 10,
        //     secondaryCurrency_adminDeliveryProfit: 100,
        //     baseCurrency_deliveryVat: 2,
        //     secondaryCurrency_deliveryVat: 20,
        // };
        // products = [
        //     {
        //         product: '',
        //         quantity: 2,
        //         perProduct: 100,
        //         totalProductAmount: 200,
        //         attributes: [{}],
        //         isProductPriceIncluded: true,
        //         totalReplacementProductAmount: 180,
        //     },
        // ];
        // replacementOrderCut = {
        //     baseCurrency_shopCutForReplacement: 11,
        //     secondaryCurrency_shopCutForReplacement: 110,
        //     baseCurrency_adminCutForReplacement: 11,
        //     secondaryCurrency_adminCutForReplacement: 110,
        // };
        // replacementAmount = {
        //     baseCurrency_shopReplacement: 11,
        //     secondaryCurrency_shopReplacement: 110,
        //     baseCurrency_adminReplacement: 11,
        //     secondaryCurrency_adminReplacement: 110,
        // };

        let {
            originalOrderId,
            products,
            replacementOrderDeliveryInfo,
            replacementOrderCut,
            logUser, // ["rider", "shop", "user"]
            flaggedReason, // "missing-item" || "wrong-item" || "others"
            otherReason,
            bringItemsForReplacementOrder,
            replacementAmount,
        } = req.body;

        const originalOrder = await Order.findById(originalOrderId).populate(
            'deliveryAddress shop user'
        );

        const adminExchangeRate = originalOrder.adminExchangeRate;
        const shopExchangeRate = originalOrder.shopExchangeRate;

        //Set order timeline
        const timeline = [
            {
                title: 'Order placed',
                status: 'placed',
                note: 'New Order placed',
                active: true,
                createdAt: new Date(),
            },
            {
                title: 'Accepted delivery boy',
                status: 'accepted_delivery_boy',
                note: 'Accepted delivery boy',
                active: false,
                createdAt: null,
            },
            {
                title: 'Preparing',
                status: 'preparing',
                note: 'Preparing',
                active: true,
                createdAt: new Date(),
            },
            {
                title: 'Ready to pickup',
                status: 'ready_to_pickup',
                note: 'Ready to Pickup',
                active: false,
                createdAt: null,
            },
            {
                title: 'Order on the way',
                status: 'order_on_the_way',
                note: 'Order on the way',
                active: false,
                createdAt: null,
            },
            {
                title: 'Delivered',
                status: 'delivered',
                note: 'Delivered',
                active: false,
                createdAt: null,
            },
        ];

        if (
            replacementOrderDeliveryInfo.deliveryType === 'shop-customer-shop'
        ) {
            timeline.splice(timeline.length - 1, 0, {
                title: 'Replacement item drop-off and pickup',
                status: 'replacement_item_on_the_way',
                note: 'Replacement item drop-off and pickup from user',
                active: false,
                createdAt: null,
            });
        }

        let orderActivity = [];
        orderActivity.push({
            note: 'replacement order placed',
            activityBy: 'admin',
            adminId: adminId,
            createdAt: new Date(),
        });

        //Generate unique order id
        const incOrder = await UniqueId.findOneAndUpdate(
            {},
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        let orderIdUnique = String(incOrder.count).padStart(6, '0');
        orderIdUnique = '' + moment().format('DDMMYY') + orderIdUnique;
        //orderIdUnique = getRendomString(3) + orderIdUnique;

        //Get all ordered products
        let productList = products.map(item => item.product);
        const productListData = await Product.find({
            _id: { $in: productList },
        });

        // set final product list
        let finalProductList = [];

        for (let element of products) {
            // original product information
            const product = productListData.find(
                item => item?._id == element?.product
            );
            // collect all information of single product
            const quantity = element.quantity;
            const perProductPrice = element.perProduct;
            const totalProductAmount = element.totalProductAmount;
            const selectedAttributesList = [];

            if (element?.attributes?.length > 0) {
                for (let singleAttr of element?.attributes) {
                    // original single attribute information
                    const selectedAttributeInfo = product?.attributes?.find(
                        item => item?._id == singleAttr?.id
                    );
                    const selectedItemsInfo = [];
                    for (let item of singleAttr?.attributeItems) {
                        const selectedItemInfo =
                            selectedAttributeInfo.items.find(
                                i => i?._id == item?.id
                            );
                        selectedItemsInfo.push(selectedItemInfo);
                    }
                    selectedAttributesList.push({
                        ...singleAttr,
                        data: selectedAttributeInfo._doc,
                        selectedItems: selectedItemsInfo,
                    });
                }
            }

            finalProductList.push({
                productId: product._id,
                productName: product.name,
                productSlug: product.slug,
                baseCurrency_productPrice: perProductPrice,
                secondaryCurrency_productPrice:
                    perProductPrice * shopExchangeRate,
                productQuantity: quantity,
                baseCurrency_finalPrice: totalProductAmount,
                secondaryCurrency_finalPrice:
                    totalProductAmount * shopExchangeRate,
                product: {
                    ...product._doc,
                },
                selectedAttributes: selectedAttributesList,
                shop: originalOrder.shop,
                isProductPriceIncluded: element.isProductPriceIncluded,
                totalReplacementProductAmount:
                    element.totalReplacementProductAmount,
            });
        }

        // Calculate delivered_time
        let delivered_time = new Date();

        if (replacementOrderDeliveryInfo.type === 'shop-customer-shop') {
            delivered_time.setMinutes(
                delivered_time.getMinutes() +
                Number(originalOrder.userShopDistance?.duration?.value) /
                60 +
                Number(originalOrder.userShopDistance?.duration?.value) /
                60 +
                15
            );
        } else {
            delivered_time.setMinutes(
                delivered_time.getMinutes() +
                Number(originalOrder.userShopDistance?.duration?.value) /
                60 +
                15
            );
        }

        //*** Create trip summary start ***/
        let pickUpLocation = originalOrder.pickUpLocation;
        const dropOffLocation = originalOrder.dropOffLocation;

        let orderTripSummary = [];
        if (replacementOrderDeliveryInfo.type === 'shop-customer-shop') {
            const { distance, duration, legs, overview_polyline } =
                await DistanceInfoGoogleWithWayPoints({
                    origin: {
                        latitude: originalOrder.shop.location.coordinates[1],
                        longitude: originalOrder.shop.location.coordinates[0],
                    },
                    destination: {
                        latitude: originalOrder.shop.location.coordinates[1],
                        longitude: originalOrder.shop.location.coordinates[0],
                    },
                    waypoints: [
                        {
                            latitude:
                                originalOrder.dropOffLocation.location
                                    .coordinates[1],
                            longitude:
                                originalOrder.dropOffLocation.location
                                    .coordinates[0],
                        },
                    ],
                });

            orderTripSummary = [
                {
                    name: originalOrder.shop.shopName,
                    address: originalOrder.shop.address.address,
                    latitude: originalOrder.shop.location.coordinates[1],
                    longitude: originalOrder.shop.location.coordinates[0],
                    type: 'shop',
                    shop: originalOrder.shop._id,
                    order: [originalOrder._id],
                    totalDistance: distance,
                    totalDuration: duration,
                    total_overview_polyline: overview_polyline,
                    distance: legs[0].distance,
                    duration: legs[0].duration,
                    overview_polyline: legs[0].overview_polyline,
                },
                {
                    name: originalOrder.user.name,
                    address: originalOrder.dropOffLocation.address,
                    latitude:
                        originalOrder.dropOffLocation.location.coordinates[1],
                    longitude:
                        originalOrder.dropOffLocation.location.coordinates[0],
                    type: 'user',
                    user: originalOrder.user._id,
                    order: [originalOrder._id],
                    distance: legs[1].distance,
                    duration: legs[1].duration,
                    overview_polyline: legs[1].overview_polyline,
                },
                {
                    name: originalOrder.shop.shopName,
                    address: originalOrder.shop.address.address,
                    latitude: originalOrder.shop.location.coordinates[1],
                    longitude: originalOrder.shop.location.coordinates[0],
                    type: 'shop',
                    shop: originalOrder.shop._id,
                    order: [originalOrder._id],
                },
            ];
        } else {
            const { distance, duration, legs, overview_polyline } =
                await DistanceInfoGoogleWithWayPoints({
                    origin: {
                        latitude: originalOrder.shop.location.coordinates[1],
                        longitude: originalOrder.shop.location.coordinates[0],
                    },
                    destination: {
                        latitude:
                            originalOrder.dropOffLocation.location
                                .coordinates[1],
                        longitude:
                            originalOrder.dropOffLocation.location
                                .coordinates[0],
                    },
                    waypoints: [],
                });

            orderTripSummary = [
                {
                    name: originalOrder.shop.shopName,
                    address: originalOrder.shop.address.address,
                    latitude: originalOrder.shop.location.coordinates[1],
                    longitude: originalOrder.shop.location.coordinates[0],
                    type: 'shop',
                    shop: originalOrder.shop._id,
                    order: [originalOrder._id],
                    totalDistance: distance,
                    totalDuration: duration,
                    total_overview_polyline: overview_polyline,
                    distance: legs[0].distance,
                    duration: legs[0].duration,
                    overview_polyline: legs[0].overview_polyline,
                },
                {
                    name: originalOrder.user.name,
                    address: originalOrder.dropOffLocation.address,
                    latitude:
                        originalOrder.dropOffLocation.location.coordinates[1],
                    longitude:
                        originalOrder.dropOffLocation.location.coordinates[0],
                    type: 'user',
                    user: originalOrder.user._id,
                    order: [originalOrder._id],
                },
            ];
        }
        //*** Create trip summary end ***/

        //*** Order Calculation start ***/
        const adminCharge = {
            baseCurrency_adminChargeFromOrder: 0,
            secondaryCurrency_adminChargeFromOrder: 0,
            baseCurrency_adminChargeFromDelivery:
                replacementOrderDeliveryInfo.baseCurrency_adminDeliveryProfit,
            secondaryCurrency_adminChargeFromDelivery:
                replacementOrderDeliveryInfo.secondaryCurrency_adminDeliveryProfit,
            baseCurrency_totalAdminCharge:
                replacementOrderDeliveryInfo.baseCurrency_adminDeliveryProfit,
            secondaryCurrency_totalAdminCharge:
                replacementOrderDeliveryInfo.secondaryCurrency_adminDeliveryProfit,
        };

        const summary = {
            baseCurrency_productAmount: 0,
            secondaryCurrency_productAmount: 0,
            baseCurrency_riderFee:
                replacementOrderDeliveryInfo.baseCurrency_deliveryFee,
            secondaryCurrency_riderFee:
                replacementOrderDeliveryInfo.secondaryCurrency_deliveryFee,
            baseCurrency_totalAmount:
                replacementOrderDeliveryInfo.baseCurrency_deliveryFee,
            secondaryCurrency_totalAmount:
                replacementOrderDeliveryInfo.secondaryCurrency_deliveryFee,
            baseCurrency_discount: 0,
            secondaryCurrency_discount: 0,
            baseCurrency_vat:
                replacementOrderDeliveryInfo.baseCurrency_deliveryVat,
            secondaryCurrency_vat:
                replacementOrderDeliveryInfo.secondaryCurrency_deliveryVat,
            baseCurrency_wallet: 0,
            secondaryCurrency_wallet: 0,
            baseCurrency_card: 0,
            secondaryCurrency_card: 0,
            baseCurrency_cash: 0,
            secondaryCurrency_cash: 0,
            reward: {
                points: 0,
                baseCurrency_amount: 0,
                secondaryCurrency_amount: 0,
            },
            baseCurrency_doubleMenuItemPrice: 0,
            secondaryCurrency_doubleMenuItemPrice: 0,
            baseCurrency_riderTip: 0,
            secondaryCurrency_riderTip: 0,
            baseCurrency_couponDiscountAmount: 0,
            secondaryCurrency_couponDiscountAmount: 0,
            baseCurrency_riderFeeWithFreeDelivery:
                replacementOrderDeliveryInfo.baseCurrency_deliveryFee,
            secondaryCurrency_riderFeeWithFreeDelivery:
                replacementOrderDeliveryInfo.secondaryCurrency_deliveryFee,
        };

        let baseCurrency_riderFee =
            replacementOrderDeliveryInfo.baseCurrency_riderProfit;
        let secondaryCurrency_riderFee =
            replacementOrderDeliveryInfo.secondaryCurrency_riderProfit;
        let baseCurrency_shopEarnings = 0;
        let secondaryCurrency_shopEarnings = 0;

        // Calculate Vat
        const vatAmount = {
            baseCurrency_vatForShop: 0,
            secondaryCurrency_vatForShop: 0,
            baseCurrency_vatForAdmin:
                replacementOrderDeliveryInfo.baseCurrency_deliveryVat,
            secondaryCurrency_vatForAdmin:
                replacementOrderDeliveryInfo.secondaryCurrency_deliveryVat,
        };

        if (originalOrder.orderFor === 'specific') {
            // adminCharge.baseCurrency_adminChargeFromDelivery = 0;
            // adminCharge.secondaryCurrency_adminChargeFromDelivery = 0;
            // adminCharge.baseCurrency_totalAdminCharge = 0;
            // adminCharge.secondaryCurrency_totalAdminCharge = 0;
            // baseCurrency_riderFee = 0;
            // secondaryCurrency_riderFee = 0;
            baseCurrency_shopEarnings =
                replacementOrderDeliveryInfo.baseCurrency_deliveryFee;
            secondaryCurrency_shopEarnings =
                replacementOrderDeliveryInfo.secondaryCurrency_deliveryFee;

            vatAmount.baseCurrency_vatForShop =
                replacementOrderDeliveryInfo.baseCurrency_deliveryVat;
            vatAmount.secondaryCurrency_vatForShop =
                replacementOrderDeliveryInfo.secondaryCurrency_deliveryVat;
            vatAmount.baseCurrency_vatForAdmin = 0;
            vatAmount.secondaryCurrency_vatForAdmin = 0;
        }

        //*** Order Calculation end ***/

        const orderData = {
            orderId: orderIdUnique,
            user: originalOrder.user._id,
            users: originalOrder.users,
            orderStatus: 'preparing',
            shop: originalOrder.shop._id,
            seller: originalOrder.seller,
            orderCancel: null,
            orderType: originalOrder.orderType,
            paymentMethod: 'wallet',
            selectPos: originalOrder.selectPos,
            orderFor: originalOrder.orderFor,
            paymentStatus: originalOrder.paymentStatus,
            deliveryAddress: originalOrder.deliveryAddress._id,
            pickUpLocation,
            dropOffLocation,
            summary,
            products,
            productsDetails: finalProductList,
            timeline,
            orderActivity,
            note: '',
            deliveryDistance: originalOrder.deliveryDistance,
            // orderDeliveryCharge: '',
            adminCharge: adminCharge,
            baseCurrency_adminCommission:
                adminCharge.baseCurrency_totalAdminCharge,
            secondaryCurrency_adminCommission:
                adminCharge.secondaryCurrency_totalAdminCharge,
            deliveryBoyNote: '',
            type: 'now',
            scheduleDate: null,
            baseCurrency_riderFee,
            secondaryCurrency_riderFee,
            baseCurrency_shopEarnings,
            secondaryCurrency_shopEarnings,
            searchingTime: new Date(),
            userShopDistance: originalOrder.userShopDistance,
            delivered_time,
            vatAmount,
            specialInstruction: '',
            location: originalOrder.shop.location,
            shopExchangeRate,
            adminExchangeRate,
            baseCurrency: originalOrder.baseCurrency,
            secondaryCurrency: originalOrder.secondaryCurrency,
            orderTripSummary,
            order_placedAt: new Date(),
            shopDeliveryMethod:
                originalOrder.orderFor === 'specific' ? 'own' : 'drop',
            paidCurrency: originalOrder.paidCurrency,
            isReplacementOrder: true,
            originalOrder: originalOrderId,
            replacementOrderDeliveryInfo,
            replacementOrderCut,
            bringItemsForReplacementOrder,
            replacementAmount,
            preparingAt: new Date(),
            preparingTime: originalOrder.shop.defaultPreparationTime
        };

        const order = await Order.create(orderData);

        //*** Find Rider Start***/
        await checkNearByDeliveryBoy(order._id);
        //*** Find Rider End***/

        //*** Operations feature set flag start ***/
        let flagIds = [];

        if (logUser.includes('user')) {
            const userFlag = await FlagModel.create({
                orderId: originalOrderId,
                user: originalOrder.user,
                type: 'user',
                flaggedType: 'replacement',
                flaggedReason,
                otherReason,
                replacement: 'with',
                productsDetails: finalProductList,
                replacementAmount,
                replacementOrderDeliveryInfo,
            });

            await UserModel.updateOne(
                { _id: originalOrder.user },
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
                orderId: originalOrderId,
                delivery: originalOrder.deliveryBoy,
                type: 'delivery',
                flaggedType: 'replacement',
                flaggedReason,
                otherReason,
                replacement: 'with',
                productsDetails: finalProductList,
                replacementAmount,
                replacementOrderDeliveryInfo,
            });

            await DeliveryBoyModel.updateOne(
                { _id: originalOrder.deliveryBoy },
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
                orderId: originalOrderId,
                shop: originalOrder.shop,
                type: 'shop',
                flaggedType: 'replacement',
                flaggedReason,
                otherReason,
                replacement: 'with',
                productsDetails: finalProductList,
                replacementAmount,
                replacementOrderDeliveryInfo,
            });

            await ShopModel.updateOne(
                { _id: originalOrder.shop },
                {
                    $push: {
                        flags: shopFlag._id,
                    },
                }
            );

            flagIds.push(shopFlag._id);
        }
        //*** Operations feature set flag end ***/

        // Set replacementOrder in originalOrder
        await Order.findByIdAndUpdate(originalOrderId, {
            $set: {
                replacementOrder: order._id,
                flaggedAt: new Date(),
            },
            $addToSet: {
                flag: { $each: flagIds },
                flaggedReason,
            },
        });

        // Calc replacement order cut
        let transactionHistory = [];
        if (replacementOrderCut.baseCurrency_shopCutForReplacement !== 0) {
            const transaction = await createTransaction({
                order,
                account: 'shop',
                type: 'replacementOrderShopCut',
                amount: replacementOrderCut.baseCurrency_shopCutForReplacement,
                secondaryCurrency_amount:
                    replacementOrderCut.secondaryCurrency_shopCutForReplacement,
                adminNote:
                    'Admin place replaced order and cut from shop earning',
            });
            transactionHistory.push(transaction);
        }
        if (replacementOrderCut.baseCurrency_adminCutForReplacement !== 0) {
            const transaction = await createTransaction({
                order,
                account: 'admin',
                type: 'replacementOrderAdminCut',
                amount: replacementOrderCut.baseCurrency_adminCutForReplacement,
                secondaryCurrency_amount:
                    replacementOrderCut.secondaryCurrency_adminCutForReplacement,
                adminNote:
                    'Admin place replaced order and cut from admin earning',
            });
            transactionHistory.push(transaction);
        }

        if (transactionHistory.length) {
            await Order.findByIdAndUpdate(order._id, {
                $set: {
                    transactionHistory,
                },
            });
        }

        // Check shop order capacity
        await checkShopCapacity(order.shop);

        const orderFullInformation = await getFullOrderInformation(order._id);

        // await sendPlaceOrderEmail(order._id);
        await sendNotificationsAllApp(orderFullInformation, true);

        res.status(200).json({
            status: true,
            message: 'Order placed successfully',
            data: {
                order: orderFullInformation,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.userPlaceOrderWithCash = async (req, res) => {
    try {
        const userId = req.userId;
        let {
            orderDeliveryAddressId,
            products,
            creatorSummary,
            cartId,
            summary,
            type,
            scheduleDate,
        } = req.body;

        const deliveryAddress = await Address.findOne({
            _id: orderDeliveryAddressId,
        });

        const checkingOrderValidity = await checkingPlaceOrderValidity(
            userId,
            deliveryAddress,
            creatorSummary,
            products,
            cartId,
            type,
            scheduleDate
        );
        if (checkingOrderValidity)
            return errorResponse(res, checkingOrderValidity);

        const order = await placeOrderFunc(req, deliveryAddress);

        const orderFullInformation = await getFullOrderInformation(order._id);

        if (
            orderFullInformation.user.orderCompleted < 1 &&
            summary.baseCurrency_cash > 50
        ) {
            const errorOrderReason = {
                errorReason: 'User first order exceeded $50 with cash.',
                errorAt: new Date(),
            };

            await Order.updateOne(
                {
                    _id: order._id,
                },
                {
                    $set: {
                        errorOrderType: 'urgent',
                    },
                    $push: {
                        errorOrderReason,
                    },
                }
            );

            orderFullInformation._doc.errorOrderType = 'urgent';
            orderFullInformation._doc.errorOrderReason.push(errorOrderReason);

            notifyForUrgentOrder(orderFullInformation);
        }

        await sendNotificationsAllApp(orderFullInformation);
        // await sendPlaceOrderEmail(order._id);

        res.status(200).json({
            status: true,
            message: 'Order placed successfully',
            data: {
                order: orderFullInformation,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const placeOrderFunc = async (req, deliveryAddress, cardId, cardTypeString) => {
    try {
        const userId = req.userId;
        let {
            orderType,
            orderDeliveryAddressId,
            products,
            deliveryBoyNote,
            order_delivery_charge_id,
            summary,
            paymentMethod,
            pos = 'no',
            type = 'now',
            scheduleDate,
            rewardPoints,
            specialInstruction,
            cartId,
            creatorSummary,
            creatorRewardPoints,
            couponId,
            bringChangeAmount,
            adminExchangeRate = 0,
            shopExchangeRate = 0,
            baseCurrency_pendingSubscriptionFee,
            secondaryCurrency_pendingSubscriptionFee,
            selectedPaymentMethod,
            areebaCard,
        } = req.body;

        //Store user last order address
        await Address.updateMany(
            { user: userId, primary: true },
            { $set: { primary: false } }
        );
        await Address.updateOne(
            {
                _id: orderDeliveryAddressId,
            },
            { $set: { primary: true } }
        );
        await UserModel.updateOne(
            { _id: userId },
            {
                location: {
                    type: 'Point',
                    coordinates: [
                        deliveryAddress.longitude,
                        deliveryAddress.latitude,
                    ],
                },
            }
        );

        // Find User Info
        const userInfo = await UserModel.findOne({
            _id: userId,
        });
        const subscribedUser = userInfo.isSubscribed;

        //Generate unique order id
        const incOrder = await UniqueId.findOneAndUpdate(
            {},
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        let orderIdUnique = String(incOrder.count).padStart(6, '0');
        orderIdUnique = '' + moment().format('DDMMYY') + orderIdUnique;
        // orderIdUnique = getRendomString(3) + orderIdUnique;

        //Set order timeline
        let timeline = [
            {
                title: 'Accepted delivery boy',
                status: 'accepted_delivery_boy',
                note: 'Accepted delivery boy',
                active: false,
                createdAt: null,
            },

            {
                title: 'Preparing',
                status: 'preparing',
                note: 'Preparing',
                active: false,
                createdAt: null,
            },
            {
                title: 'Ready to pickup',
                status: 'ready_to_pickup',
                note: 'Ready to Pickup',
                active: false,
                createdAt: null,
            },
            {
                title: 'Order on the way',
                status: 'order_on_the_way',
                note: 'Order on the way',
                active: false,
                createdAt: null,
            },
            {
                title: 'Delivered',
                status: 'delivered',
                note: 'Delivered',
                active: false,
                createdAt: null,
            },
        ];

        let orderActivity = [];
        //Check order is scheduled or not and update timeline according to it.
        if (type == 'schedule') {
            timeline.unshift(
                {
                    title: `Scheduled for ${scheduleDate}`,
                    status: 'schedule',
                    note: `Schedule Order will place at ${scheduleDate}`,
                    active: true,
                    createdAt: new Date(),
                },
                {
                    title: 'Order placed',
                    status: 'placed',
                    note: `Schedule Order placed`,
                    active: false,
                    createdAt: null,
                }
            );

            orderActivity.push({
                note: `Schedule Order placed ${scheduleDate}`,
                activityBy: 'user',
                userId: userId,
                createdAt: new Date(),
                scheduleDate,
            });
        } else {
            timeline.unshift({
                title: 'Order placed',
                status: 'placed',
                note: 'New Order placed',
                active: true,
                createdAt: new Date(),
            });

            orderActivity.push({
                note: 'user order placed',
                activityBy: 'user',
                userId: userId,
                createdAt: new Date(),
            });
        }

        //Get all ordered products
        let productList = products.map(item => item.product.toString());

        // get all selected product original information
        const productListData = await Product.find({
            _id: { $in: productList },
        }).populate([
            {
                path: 'marketing',
            },
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'marketings',
                select: '-products',
            },
            {
                path: 'seller',
            },
            {
                path: 'addons',
                populate: [
                    {
                        path: 'marketing',
                    },
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'shop',
                        select: '-products',
                    },
                    {
                        path: 'seller',
                    },
                ],
            },
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        let productsInfo = productListData;

        // validate actual product info and set final product list
        let finalProductList = [];
        let totalShopDiscount = 0;
        let totalAdminDiscount = 0;
        let subscriptionDiscount = 0;

        for (let element of products) {
            // original product information
            const product = productsInfo?.find(
                item => item?._id.toString() == element.product.toString()
            );

            if (!subscribedUser) {
                await checkPlusUserProductMarketing(product);
            }
            // collect all information of single product
            const quantity = element.quantity;
            const perProductPrice = Number(element.perProduct);
            const discountPerProduct = element.discount;
            const totalProductAmount = element.totalProductAmount;
            const totalDiscount_ = element.totalDiscount;
            const selectedAttributesList = [];

            if (element.attributes.length > 0) {
                for (let singleAttr of element.attributes) {
                    // original single attribute information
                    // const selectedAttributeInfo = product.attributes?.find(
                    //     item => item?._id == singleAttr?.id
                    // );
                    const selectedAttributeInfo = await AttributeModel.findById(
                        singleAttr?.id
                    )?.populate({
                        path: 'items',
                        model: 'attributeItems',
                    });
                    const selectedItemsInfo = [];
                    for (let item of singleAttr.attributeItems) {
                        // const selectedItemInfo =
                        //     selectedAttributeInfo?.items?.find(
                        //         i => i?._id == item?.id
                        //     );
                        const selectedItemInfo =
                            await AttributeItemModel.findById(item?.id);
                        selectedItemsInfo.push(selectedItemInfo);
                    }
                    selectedAttributesList.push({
                        ...singleAttr,
                        data: selectedAttributeInfo,
                        selectedItems: selectedItemsInfo,
                    });
                }
            }

            const marketingInfo = [];
            for (const marketing of product?.marketing) {
                const findMarketing = await MarketingModel.findById(
                    marketing?._id
                );
                if (findMarketing) marketingInfo.push(findMarketing);
            }

            let finalReward = {
                points: 0,
                baseCurrency_amount: 0,
                secondaryCurrency_amount: 0,
            };
            if (element?.reward) {
                finalReward.points = element?.reward?.points * quantity;
                finalReward.baseCurrency_amount =
                    element?.reward?.amount * quantity;
                finalReward.secondaryCurrency_amount =
                    element?.reward?.amount * quantity * shopExchangeRate;
            } else {
                finalReward = undefined;
            }

            const ownerInfo = await UserModel.findById(element.owner);

            // For dual marketing feature
            let shopDiscount = 0;
            let adminDiscount = 0;
            if (totalDiscount_ && !element?.isDoubleDeal) {
                // const shopDiscountMarketing = product.marketing.find(
                //     item =>
                //         item.type === 'percentage' &&
                //         item.creatorType === 'shop' &&
                //         item.isActive &&
                //         (!item.onlyForSubscriber || subscribedUser)
                // );
                // if (shopDiscountMarketing) {
                //     const findDiscountProduct = shopDiscountMarketing.products.find(
                //         item => item.product.toString() === product._id.toString()
                //     );
                //     shopDiscount = findDiscountProduct.discount * quantity;
                // }
                // const adminDiscountMarketing = product.marketing.find(
                //     item =>
                //         item.type === 'percentage' &&
                //         item.creatorType === 'admin' &&
                //         item.isActive &&
                //         (!item.onlyForSubscriber || subscribedUser)
                // );
                // if (adminDiscountMarketing) {
                //     const findDiscountProduct =
                //         adminDiscountMarketing.products.find(
                //             item =>
                //                 item.product.toString() === product._id.toString()
                //         );
                //     adminDiscount = findDiscountProduct.discount * quantity;
                //     subscriptionDiscount += adminDiscountMarketing.onlyForSubscriber
                //         ? adminDiscount
                //         : 0;
                // }

                const findDiscount = (type, creatorType) => {
                    const marketing = product.marketing.find(
                        item =>
                            item.type === type &&
                            item.creatorType === creatorType &&
                            item.isActive &&
                            (!item.onlyForSubscriber || subscribedUser)
                    );

                    if (marketing) {
                        const findDiscountProduct = marketing.products.find(
                            item =>
                                item.product.toString() ===
                                product._id.toString()
                        );

                        return findDiscountProduct.discount * quantity;
                    }

                    return 0;
                };

                shopDiscount = findDiscount('percentage', 'shop');
                adminDiscount = findDiscount('percentage', 'admin');

                const adminDiscountMarketing = product.marketing.some(
                    item =>
                        item.type === 'percentage' &&
                        item.creatorType === 'admin' &&
                        item.isActive &&
                        item.onlyForSubscriber
                );

                if (adminDiscountMarketing) {
                    subscriptionDiscount += adminDiscount;
                }
            }
            totalShopDiscount += shopDiscount;
            totalAdminDiscount += adminDiscount;
            finalProductList.push({
                productId: product._id,
                productName: product.name,
                productSlug: product.slug,
                baseCurrency_productPrice: perProductPrice,
                secondaryCurrency_productPrice:
                    perProductPrice * shopExchangeRate,
                baseCurrency_discount: discountPerProduct,
                secondaryCurrency_discount:
                    discountPerProduct * shopExchangeRate,
                baseCurrency_totalDiscount: totalDiscount_,
                secondaryCurrency_totalDiscount:
                    totalDiscount_ * shopExchangeRate,
                productQuantity: quantity,
                baseCurrency_finalPrice: totalProductAmount,
                secondaryCurrency_finalPrice:
                    totalProductAmount * shopExchangeRate,
                product: {
                    ...product._doc,
                },
                selectedAttributes: selectedAttributesList,
                shop: product.shop,
                marketing: marketingInfo,
                reward: element?.reward,
                finalReward: finalReward,
                isDoubleDeal: element?.isDoubleDeal || false,
                productSpecialInstruction:
                    element?.productSpecialInstruction || undefined,
                //Store who added this product when group cart
                owner: ownerInfo,
                shopDiscount,
                adminDiscount,
            });

            // Product Stock feature
            if (product.isStockEnabled) {
                await Product.updateOne(
                    { _id: product._id },
                    {
                        $inc: {
                            stockQuantity: -quantity,
                        },
                    }
                );
            }
        }
        // return;
        const shopInfo = finalProductList[0].product?.shop;
        const sellerInfo = finalProductList[0].product?.seller;

        //set pickup and drop off location
        let pickUpLocation = shopInfo.address;
        let dropOffLocation = deliveryAddress;

        const order_delivery_charge = await OrderDeliveryCharge.findOne({
            _id: order_delivery_charge_id,
        }).populate('dropChargeId');

        summary.baseCurrency_riderFeeWithFreeDelivery =
            order_delivery_charge.deliveryFeeWithFreeDelivery;

        // Calculate rider fee
        let deliveryBoyFee = order_delivery_charge.deliveryBoyFee;

        //Calculate admin charge
        let adminCharge_ = {
            dropChargeFromOrder: 0,
            dropChargeFromDelivery: order_delivery_charge.dropFee,
            totalDropAmount: 0,
        };

        const DROP_CHARGE = order_delivery_charge.dropChargeId;
        let adminPercentage = DROP_CHARGE?.dropPercentage;

        // Max discount per order feature
        if (summary?.baseCurrency_discount > 0) {
            const shopDiscountMarketing = shopInfo?.marketings?.find(
                marketing =>
                    marketing.type === 'percentage' &&
                    marketing.creatorType === 'shop' &&
                    marketing.isActive
            );
            const shopMaxDiscountLimit =
                shopDiscountMarketing?.maxDiscountPerOrder || 0;

            if (
                shopMaxDiscountLimit > 0 &&
                totalShopDiscount > shopMaxDiscountLimit
            ) {
                totalShopDiscount = shopMaxDiscountLimit;
            }

            const adminDiscountMarketing = shopInfo?.marketings?.find(
                marketing =>
                    marketing.type === 'percentage' &&
                    marketing.creatorType === 'admin' &&
                    marketing.isActive
            );
            const adminMaxDiscountLimit =
                adminDiscountMarketing?.maxDiscountPerOrder || 0;

            if (
                adminMaxDiscountLimit > 0 &&
                totalAdminDiscount > adminMaxDiscountLimit
            ) {
                totalAdminDiscount = adminMaxDiscountLimit;
                subscriptionDiscount =
                    subscriptionDiscount > 0 && adminMaxDiscountLimit;
            }
        }

        //Calc discount
        let discountCut = {
            discountAdminCut: 0,
            discountShopCut: 0,
        };
        let discountAfterAdjust = 0;
        let discountBeforeAdjust = 0;
        if (
            summary?.baseCurrency_discount.toFixed(2) !==
            (totalAdminDiscount + totalShopDiscount).toFixed(2)
        ) {
            console.log('********Discount is wrong********'); //This check only for developing purpose
            console.log(
                `${summary?.baseCurrency_discount} !== ${totalAdminDiscount + totalShopDiscount
                }`
            );
        }
        if (summary?.baseCurrency_discount > 0) {
            discountAfterAdjust = totalAdminDiscount;
            discountCut.discountAdminCut = totalAdminDiscount;
            discountBeforeAdjust = totalShopDiscount;
            discountCut.discountShopCut = totalShopDiscount;
        }

        // Store refer friend Information
        let referFriend;
        let couponDetails = {};
        if (couponId) {
            const checkCoupon = await CouponModel.findById(couponId).populate(
                'couponReferralUser'
            );
            couponDetails = { ...checkCoupon._doc };

            if (checkCoupon?.couponType === 'referral_code') {
                const referralSetting = await ReferralSettingModel.findOne({});
                const duration =
                    referralSetting?.receiver_referralDuration || 30;

                // const startDate = new Date(userInfo.createdAt); // Set the start date
                // startDate.setHours(0, 0, 0, 0);
                // const endDate = new Date(userInfo.createdAt);
                // endDate.setHours(0, 0, 0, 0);
                // const updatedEndDate = new Date(
                //     endDate.setDate(endDate.getDate() + duration)
                // );

                const inviteDate = moment(new Date(userInfo.createdAt));
                const expiryDate = moment(new Date(userInfo.createdAt)).add(
                    duration,
                    'days'
                );

                referFriend = {
                    sender: checkCoupon.couponReferralUser._id,
                    senderName: checkCoupon.couponReferralUser.name,
                    senderGetsType:
                        referralSetting?.sender_referralDiscountType,
                    senderGets: referralSetting?.sender_referralDiscount,
                    receiver: userId,
                    receiverName: userInfo.name,
                    receiverGetsType:
                        referralSetting?.receiver_referralDiscountType,
                    receiverGets: referralSetting?.receiver_referralDiscount,
                    inviteDate,
                    expiryDate,
                };
            }

            if (
                checkCoupon?.couponType === 'global' &&
                checkCoupon.onlyForNewUser
            ) {
                // From order table, at first it finds out the no. of orders which has been placed with the userId and couponId
                // If this no. is greater than or equal to maxNumberofOrdersForNewUsers it throws errors

                const usedCouponOrders = await OrderModel.countDocuments({
                    user: userId,
                    orderStatus: { $nin: ['cancelled', 'refused'] },
                    coupon: couponId,
                });

                if (
                    usedCouponOrders >=
                    checkCoupon?.maxNumberOfOrdersForNewUsers
                )
                    throw new Error(
                        'You exceeded max limit to use new user coupon'
                    );

                console.log('\nYou applied new user coupon successfully');
            }
        }

        // Calculate coupon discount
        let couponDiscountCut = {
            baseCurrency_couponAdminCut: 0,
            baseCurrency_couponShopCut: 0,
        };
        if (summary?.baseCurrency_couponDiscountAmount > 0) {
            if (couponDetails?.isShopPayEnabled) {
                couponDiscountCut.baseCurrency_couponShopCut =
                    summary?.baseCurrency_couponDiscountAmount;
            } else {
                couponDiscountCut.baseCurrency_couponAdminCut =
                    summary?.baseCurrency_couponDiscountAmount;
            }
        }

        if (sellerInfo.dropPercentage || sellerInfo.dropPercentage > 0) {
            const dropPercentageType = sellerInfo.dropPercentageType;
            adminPercentage = sellerInfo.dropPercentage;

            if (dropPercentageType == 'percentage') {
                // adminCharge_.dropChargeFromOrder =
                //     ((summary.baseCurrency_productAmount -
                //         discountBeforeAdjust -
                //         summary.reward.baseCurrency_amount) *
                //         adminPercentage) /
                //         100 -
                //     discountAfterAdjust;
                adminCharge_.dropChargeFromOrder =
                    ((summary.baseCurrency_productAmount -
                        discountBeforeAdjust -
                        couponDiscountCut.baseCurrency_couponShopCut) *
                        adminPercentage) /
                        100 -
                    discountAfterAdjust -
                    couponDiscountCut.baseCurrency_couponAdminCut;
            } else {
                adminCharge_.dropChargeFromOrder =
                    adminPercentage -
                    discountAfterAdjust -
                    couponDiscountCut.baseCurrency_couponAdminCut;
            }
        } else {
            if (DROP_CHARGE.dropPercentageType == 'percentage') {
                // adminCharge_.dropChargeFromOrder =
                //     ((summary.baseCurrency_productAmount -
                //         discountBeforeAdjust -
                //         summary.reward.baseCurrency_amount) *
                //         adminPercentage) /
                //         100 -
                //     discountAfterAdjust;
                adminCharge_.dropChargeFromOrder =
                    ((summary.baseCurrency_productAmount -
                        discountBeforeAdjust -
                        couponDiscountCut.baseCurrency_couponShopCut) *
                        adminPercentage) /
                        100 -
                    discountAfterAdjust -
                    couponDiscountCut.baseCurrency_couponAdminCut;
            } else {
                adminCharge_.dropChargeFromOrder =
                    adminPercentage -
                    discountAfterAdjust -
                    couponDiscountCut.baseCurrency_couponAdminCut;
            }
        }

        // Calc shop earnings
        let sellerEarnings = 0;

        if (shopInfo.haveOwnDeliveryBoy) {
            // sellerEarnings =
            //     summary.baseCurrency_totalAmount +
            //     order_delivery_charge.subscriptionDeliveryFee -
            //     summary.baseCurrency_discount -
            //     summary.reward.baseCurrency_amount -
            //     adminCharge_.dropChargeFromOrder;
            sellerEarnings =
                summary.baseCurrency_totalAmount +
                order_delivery_charge.subscriptionDeliveryFee -
                summary.baseCurrency_discount -
                couponDiscountCut.baseCurrency_couponShopCut -
                couponDiscountCut.baseCurrency_couponAdminCut -
                adminCharge_.dropChargeFromOrder;
        } else {
            // sellerEarnings =
            //     summary.baseCurrency_productAmount -
            //     summary.baseCurrency_discount -
            //     summary.reward.baseCurrency_amount -
            //     adminCharge_.dropChargeFromOrder -
            //     order_delivery_charge.shopCut;
            sellerEarnings =
                summary.baseCurrency_productAmount -
                summary.baseCurrency_discount -
                couponDiscountCut.baseCurrency_couponShopCut -
                couponDiscountCut.baseCurrency_couponAdminCut -
                adminCharge_.dropChargeFromOrder -
                order_delivery_charge.shopCut;
        }

        // Calculate reward redeem cut
        let rewardRedeemCut = {
            rewardAdminCut: 0,
            rewardShopCut: 0,
        };
        let baseCurrency_rewardRedeemCashback = 0;
        if (summary?.reward?.baseCurrency_amount > 0) {
            // const rewardSetting = await RewardSettingModel.findOne({});

            // baseCurrency_rewardRedeemCashback =
            //     (summary?.reward?.baseCurrency_amount *
            //         rewardSetting.adminCutForReward) /
            //     100;
            baseCurrency_rewardRedeemCashback =
                summary?.reward?.baseCurrency_amount;

            // let dropPercentage = DROP_CHARGE.dropPercentage;
            // if (sellerInfo.dropPercentage || sellerInfo.dropPercentage > 0) {
            //     dropPercentage = sellerInfo.dropPercentage;
            // }

            // const adminEarningWithoutReward =
            //     (summary.baseCurrency_productAmount * dropPercentage) / 100;
            // const adminEarningWithReward =
            //     ((summary.baseCurrency_productAmount -
            //         summary.reward.baseCurrency_amount) *
            //         dropPercentage) /
            //         100 -
            //     baseCurrency_rewardRedeemCashback;

            // rewardRedeemCut.rewardAdminCut =
            //     adminEarningWithoutReward - adminEarningWithReward;
            // rewardRedeemCut.rewardShopCut =
            //     summary?.reward?.baseCurrency_amount -
            //     rewardRedeemCut.rewardAdminCut;
            rewardRedeemCut.rewardAdminCut =
                summary?.reward?.baseCurrency_amount;
        }

        // Minus reward redeem cart from lyxa earning and shop earning
        adminCharge_.dropChargeFromOrder -= baseCurrency_rewardRedeemCashback;
        // sellerEarnings += baseCurrency_rewardRedeemCashback;

        // Calculate double_menu cut
        let doubleMenuMarketing = {};
        let doubleMenuItemPrice = {
            doubleMenuItemPriceAdmin: 0,
            doubleMenuItemPriceShop: 0,
        };
        let doubleMenuCut = {
            doubleMenuAdminCut: 0,
            doubleMenuShopCut: 0,
        };

        if (summary?.baseCurrency_doubleMenuItemPrice > 0) {
            doubleMenuMarketing = shopInfo?.marketings?.find(
                market => market.type === 'double_menu'
            );

            const adminGetFromDoubleMenuItemPrice =
                (summary.baseCurrency_doubleMenuItemPrice * adminPercentage) /
                100;

            const shopGetFromDoubleMenuItemPrice =
                summary?.baseCurrency_doubleMenuItemPrice -
                adminGetFromDoubleMenuItemPrice;

            if (doubleMenuMarketing?.creatorType === 'admin') {
                adminCharge_.dropChargeFromOrder -=
                    shopGetFromDoubleMenuItemPrice;
                sellerEarnings += shopGetFromDoubleMenuItemPrice;
                doubleMenuItemPrice.doubleMenuItemPriceAdmin =
                    summary?.baseCurrency_doubleMenuItemPrice;
                doubleMenuCut.doubleMenuAdminCut =
                    shopGetFromDoubleMenuItemPrice;
            } else {
                doubleMenuItemPrice.doubleMenuItemPriceShop =
                    summary?.baseCurrency_doubleMenuItemPrice;
                doubleMenuCut.doubleMenuShopCut = 0;
            }
        }

        // Punch marketing feature
        if (summary?.baseCurrency_punchMarketingDiscountAmount > 0) {
            sellerEarnings -= summary.baseCurrency_punchMarketingDiscountAmount;
            couponDiscountCut.baseCurrency_couponShopCut =
                summary.baseCurrency_punchMarketingDiscountAmount;
        }

        adminCharge_.totalDropAmount =
            adminCharge_.dropChargeFromOrder +
            adminCharge_.dropChargeFromDelivery;

        // Calculate Vat
        let vatAmount = {
            baseCurrency_vatForShop: 0,
            baseCurrency_vatForAdmin: 0,
        };
        const appSetting = await AppSetting.findOne({});
        // if (summary.baseCurrency_vat > 0) {
        //     vatAmount.baseCurrency_vatForShop =
        //         (sellerEarnings * appSetting?.vat) / 100;

        //     if (vatAmount.baseCurrency_vatForShop > summary.baseCurrency_vat) {
        //         vatAmount.baseCurrency_vatForShop = summary.baseCurrency_vat;
        //     }

        //     if (vatAmount.baseCurrency_vatForShop < 0) {
        //         vatAmount.baseCurrency_vatForShop = 0;
        //     }

        //     vatAmount.baseCurrency_vatForAdmin =
        //         summary.baseCurrency_vat - vatAmount.baseCurrency_vatForShop;
        // }
        if (appSetting?.vat > 0 && adminCharge_.dropChargeFromOrder > 0) {
            vatAmount.baseCurrency_vatForAdmin =
                (adminCharge_.dropChargeFromOrder * appSetting?.vat) / 100;

            sellerEarnings -= vatAmount.baseCurrency_vatForAdmin;
        }

        // Calculate Rider Tip
        if (shopInfo.haveOwnDeliveryBoy) {
            sellerEarnings += summary?.baseCurrency_riderTip || 0;
        } else {
            deliveryBoyFee += summary?.baseCurrency_riderTip || 0;
        }

        // Free delivery cut
        let freeDeliveryCut = {
            baseCurrency_freeDeliveryAdminCut: order_delivery_charge.dropCut,
            baseCurrency_dropLossForFreeDelivery:
                order_delivery_charge.dropLossForFreeDelivery,
            baseCurrency_freeDeliveryShopCut: order_delivery_charge.shopCut,
            baseCurrency_shopLossForFreeDelivery:
                order_delivery_charge.shopLossForFreeDelivery,
        };

        //*** Start apply exchange rate ***/
        summary = applyExchangeRateInOrderSummary(
            summary,
            shopExchangeRate,
            adminExchangeRate,
            shopInfo
        );
        creatorSummary.baseCurrency_riderFeeWithFreeDelivery = 0;
        creatorSummary = applyExchangeRateInOrderSummary(
            creatorSummary,
            shopExchangeRate,
            adminExchangeRate,
            shopInfo
        );
        adminCharge_ = applyExchangeRateInOrderAdminCharge(
            adminCharge_,
            shopExchangeRate,
            adminExchangeRate
        );
        vatAmount = applyExchangeRateInOrderVatAmount(
            vatAmount,
            shopExchangeRate
        );
        rewardRedeemCut = applyExchangeRateInOrderRewardRedeemCut(
            rewardRedeemCut,
            shopExchangeRate
        );
        discountCut = applyExchangeRateInOrderDiscountCut(
            discountCut,
            shopExchangeRate
        );
        doubleMenuItemPrice = applyExchangeRateInOrderDoubleMenuItemPrice(
            doubleMenuItemPrice,
            shopExchangeRate
        );
        doubleMenuCut = applyExchangeRateInOrderDoubleMenuCut(
            doubleMenuCut,
            shopExchangeRate
        );
        freeDeliveryCut = applyExchangeRateInOrderFreeDeliveryCut(
            freeDeliveryCut,
            shopExchangeRate,
            adminExchangeRate,
            shopInfo
        );
        couponDiscountCut = applyExchangeRateInOrderCouponDiscountCut(
            couponDiscountCut,
            shopExchangeRate
        );

        const baseCurrency_riderFee = deliveryBoyFee;
        const secondaryCurrency_riderFee = deliveryBoyFee * adminExchangeRate;

        const baseCurrency_shopEarnings = sellerEarnings;
        const secondaryCurrency_shopEarnings =
            sellerEarnings * shopExchangeRate;

        const secondaryCurrency_rewardRedeemCashback =
            baseCurrency_rewardRedeemCashback * shopExchangeRate;
        //*** End apply exchange rate ***/

        // Calculate user shop distance
        const userShopDistance = await DistanceInfoGoogle({
            origin: {
                latitude: shopInfo.location.coordinates[1],
                longitute: shopInfo.location.coordinates[0],
            },
            distination: {
                latitude: deliveryAddress.location.coordinates[1],
                longitute: deliveryAddress.location.coordinates[0],
            },
        });

        // Calculate delivered_time
        let delivered_time = new Date();
        delivered_time.setMinutes(
            delivered_time.getMinutes() +
            Number(userShopDistance?.duration?.value) / 60 +
            15
        );

        // For Group cart feature
        const cartDetails = await CartModel.findOne({
            _id: cartId,
            deletedAt: null,
        });
        if (!cartDetails) return;
        const users = cartDetails?.cartItems?.map(item => item.user);

        // Subscription Feature
        const subscriptionLoss = {
            baseCurrency_discount: subscriptionDiscount,
            secondaryCurrency_discount: subscriptionDiscount * shopExchangeRate,
            baseCurrency_doubleMenuDiscount:
                doubleMenuMarketing.onlyForSubscriber
                    ? doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceAdmin
                    : 0,
            secondaryCurrency_doubleMenuDiscount:
                doubleMenuMarketing.onlyForSubscriber
                    ? doubleMenuItemPrice.secondaryCurrency_doubleMenuItemPriceAdmin
                    : 0,
            baseCurrency_doubleMenuLoss: doubleMenuMarketing.onlyForSubscriber
                ? doubleMenuCut.baseCurrency_doubleMenuAdminCut
                : 0,
            secondaryCurrency_doubleMenuLoss:
                doubleMenuMarketing.onlyForSubscriber
                    ? doubleMenuCut.secondaryCurrency_doubleMenuAdminCut
                    : 0,
            baseCurrency_freeDelivery:
                order_delivery_charge.subscriptionDeliveryFee,
            secondaryCurrency_freeDelivery:
                order_delivery_charge.subscriptionDeliveryFee *
                (shopInfo.haveOwnDeliveryBoy
                    ? shopExchangeRate
                    : adminExchangeRate),
        };

        // Punch marketing feature
        let punchMarketingApplied = false;
        const punchMarketing = shopInfo?.marketings?.find(
            marketing =>
                marketing.type === 'punch_marketing' &&
                marketing.isActive &&
                marketing.status === 'active' &&
                marketing.deletedAt === null
        );

        if (
            punchMarketing &&
            !summary.baseCurrency_punchMarketingDiscountAmount
        ) {
            const actualProductAmount =
                summary.baseCurrency_productAmount -
                summary.baseCurrency_discount -
                summary.baseCurrency_couponDiscountAmount;
            if (punchMarketing.punchMinimumOrderValue <= actualProductAmount) {
                punchMarketingApplied = true;

                let userPunchMarketing = await UserPunchMarketingModel.findOne({
                    user: userId,
                    shop: shopInfo._id,
                    status: 'ongoing',
                });
                if (!userPunchMarketing) {
                    await UserPunchMarketingModel.create({
                        user: userId,
                        shop: shopInfo._id,
                        marketing: punchMarketing._id,
                        punchTargetOrders: punchMarketing.punchTargetOrders,
                        punchMinimumOrderValue:
                            punchMarketing.punchMinimumOrderValue,
                        punchDayLimit: punchMarketing.punchDayLimit,
                        punchCouponDiscountType:
                            punchMarketing.punchCouponDiscountType,
                        punchCouponValue: punchMarketing.punchCouponValue,
                        punchCouponDuration: punchMarketing.punchCouponDuration,
                        completedOrders: 0,
                        expiredDate: moment().add(
                            punchMarketing.punchDayLimit,
                            'days'
                        ),
                        status: 'ongoing',
                    });
                }
            }
        }

        const orderData = {
            orderId: orderIdUnique,
            user: userId,
            users,
            orderStatus: type === 'now' ? 'placed' : 'schedule',
            shop: shopInfo._id,
            seller: shopInfo.seller,
            orderCancel: null,
            orderType: orderType,
            paymentMethod: paymentMethod,
            selectPos: pos, // yes , no
            orderFor: shopInfo.haveOwnDeliveryBoy ? 'specific' : 'global',
            paymentStatus: 'pending',
            deliveryAddress: orderDeliveryAddressId,
            pickUpLocation: pickUpLocation,
            dropOffLocation: dropOffLocation,
            summary: summary,
            products: products,
            productsDetails: finalProductList,
            timeline: timeline,
            orderActivity: orderActivity,
            note: req.body.note,
            deliveryDistance: order_delivery_charge.distance,
            orderDeliveryCharge: order_delivery_charge_id,
            adminCharge: adminCharge_,
            baseCurrency_adminCommission:
                adminCharge_.baseCurrency_totalAdminCharge,
            secondaryCurrency_adminCommission:
                adminCharge_.secondaryCurrency_totalAdminCharge,
            deliveryBoyNote,
            type,
            scheduleDate: type === 'now' ? null : scheduleDate,
            baseCurrency_riderFee,
            secondaryCurrency_riderFee,
            baseCurrency_shopEarnings,
            secondaryCurrency_shopEarnings,
            searchingTime: new Date(),
            userShopDistance,
            delivered_time,
            vatAmount,
            rewardPoints,
            rewardRedeemCut,
            baseCurrency_rewardRedeemCashback,
            secondaryCurrency_rewardRedeemCashback,
            isRedeemReward: summary?.reward?.points > 0 ? true : false,
            marketings: shopInfo.marketings ? shopInfo.marketings : null,
            specialInstruction,
            cart: cartId,
            coupon: couponId,
            location: shopInfo.location,
            referFriend,
            discountCut,
            isDiscount: summary?.baseCurrency_discount > 0 ? true : false,
            doubleMenuItemPrice,
            doubleMenuCut,
            isDoubleMenu:
                summary?.baseCurrency_doubleMenuItemPrice > 0 ? true : false,
            bringChangeAmount,
            shopExchangeRate,
            adminExchangeRate,
            baseCurrency: appSetting?.baseCurrency,
            secondaryCurrency: appSetting?.secondaryCurrency,
            couponDetails,
            couponDiscountCut,
            order_placedAt: new Date(),
            freeDeliveryCut,
            adminPercentage,
            tagCuisines: [...shopInfo.tagsId, ...shopInfo.cuisineType],
            baseCurrency_pendingSubscriptionFee,
            secondaryCurrency_pendingSubscriptionFee,
            subscription: userInfo.subscription,
            subscriptionLoss,
            selectedPaymentMethod,
            // Punch marketing feature
            punchMarketingApplied,
        };

        if (shopInfo.haveOwnDeliveryBoy) {
            orderData.shopDeliveryMethod = 'own';
        }

        const order = await Order.create(orderData);

        // For Group cart feature
        const cartItem = cartDetails?.cartItems?.find(
            element => element.user.toString() === userId.toString()
        );
        cartItem.summary = creatorSummary;
        cartItem.rewardPoints = creatorRewardPoints;
        cartItem.paymentMethod = paymentMethod;
        cartItem.isPaid = false;
        cartItem.isReady = true;
        // Store card info for taking money after delivered
        if (paymentMethod === 'card') {
            cartItem.cardId = cardId;
            cartItem.cardTypeString = cardTypeString;
            delete areebaCard.token;
            cartItem.areebaCard = areebaCard;
        }
        cartDetails.deletedAt = new Date();

        await cartDetails.save();

        //*** Create trip summary start ***/
        const { distance, duration, legs, overview_polyline } =
            await DistanceInfoGoogleWithWayPoints({
                origin: {
                    latitude: shopInfo.location.coordinates[1],
                    longitude: shopInfo.location.coordinates[0],
                },
                destination: {
                    latitude: dropOffLocation.location.coordinates[1],
                    longitude: dropOffLocation.location.coordinates[0],
                },
                waypoints: [],
            });

        const orderTripSummary = [
            {
                name: shopInfo.shopName,
                address: shopInfo.address.address,
                latitude: shopInfo.location.coordinates[1],
                longitude: shopInfo.location.coordinates[0],
                type: 'shop',
                shop: shopInfo._id,
                order: [order._id],
                totalDistance: distance,
                totalDuration: duration,
                total_overview_polyline: overview_polyline,
                distance: legs[0].distance,
                duration: legs[0].duration,
                overview_polyline: legs[0].overview_polyline,
            },
            {
                name: userInfo.name,
                address: dropOffLocation.address,
                latitude: dropOffLocation.location.coordinates[1],
                longitude: dropOffLocation.location.coordinates[0],
                type: 'user',
                user: userInfo._id,
                order: [order._id],
            },
        ];

        await Order.findByIdAndUpdate(order._id, {
            $set: { orderTripSummary: orderTripSummary },
        });
        //*** Create trip summary end ***/

        //*** Find Rider Start***/
        if (type !== 'schedule') {
            await checkNearByDeliveryBoy(order._id);
        }
        //*** Find Rider End***/

        // Check shop order capacity
        await checkShopCapacity(order.shop);

        return order;
    } catch (error) {
        console.log(error);
    }
};

exports.userPlaceOrderWithWallet = async (req, res) => {
    try {
        const userId = req.userId;
        let {
            orderDeliveryAddressId,
            products,
            creatorSummary,
            cartId,
            type,
            scheduleDate,
        } = req.body;

        const deliveryAddress = await Address.findOne({
            _id: orderDeliveryAddressId,
        });

        const checkingOrderValidity = await checkingPlaceOrderValidity(
            userId,
            deliveryAddress,
            creatorSummary,
            products,
            cartId,
            type,
            scheduleDate
        );
        if (checkingOrderValidity)
            return errorResponse(res, checkingOrderValidity);

        const order = await placeOrderFunc(req, deliveryAddress);

        const orderFullInformation = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(orderFullInformation);
        // await sendPlaceOrderEmail(order._id);

        return res.status(200).json({
            status: true,
            message: 'Order placed successfully',
            data: {
                order: orderFullInformation,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const userPlaceOrderWithCard = async (req, res, cardId, cardTypeString) => {
    try {
        let { orderDeliveryAddressId } = req.body;

        const deliveryAddress = await Address.findOne({
            _id: orderDeliveryAddressId,
        });

        const order = await placeOrderFunc(
            req,
            deliveryAddress,
            cardId,
            cardTypeString
        );

        const orderFullInformation = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(orderFullInformation);
        // await sendPlaceOrderEmail(order._id);

        return res.status(200).json({
            status: true,
            message: 'Order placed successfully',
            data: {
                order: orderFullInformation,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.cancelOrderByUser = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, cancelReasonId, otherReason = 'No reason' } = req.body;

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
                    {
                        path: 'addons.product',
                    },
                ],
            },
        ]);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        // check proper user
        if (order.user.toString() !== userId) {
            return errorResponse(res, 'You are not a valid user');
        }

        if (
            !['schedule', 'placed', 'accepted_delivery_boy'].includes(
                order.orderStatus
            )
        ) {
            return errorResponse(res, "You Can't Cancel this Order");
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

        const cancelObject = getCancelObject({
            canceledBy: 'user',
            userId: order.user,
            cancelReasonId: cancelReasonId,
            otherReason: otherReason,
        });

        // Areeba payment gateway integration
        if (order.summary.baseCurrency_card > 0) {
            for (const element of order?.cart?.cartItems) {
                if (element?.summary?.baseCurrency_card > 0) {
                    const newTransactionId = ObjectId();

                    const voidPutData = {
                        apiOperation: 'VOID',
                        transaction: {
                            targetTransactionId:
                                element?.areebaCard?.transactionId,
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
        });

        // Check shop order capacity
        await checkShopCapacity(order.shop);

        const updatedOrder = await getFullOrderInformation(order._id);

        return successResponse(res, {
            message: 'Order cancelled successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addOrderCancelReasonForUserApp = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, cancelReasonId, otherReason } = req.body;

        if (!cancelReasonId && !otherReason) {
            return errorResponse(
                res,
                'need a cancel reason . Please give proper reason to cancel'
            );
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (order.orderStatus !== 'cancelled') {
            return errorResponse(res, 'Order is not cancelled order');
        }

        // check proper user
        if (order.user.toString() !== userId) {
            return errorResponse(res, 'You are not a valid user');
        }

        order.orderCancel.cancelReason = cancelReasonId;
        order.orderCancel.otherReason = cancelReasonId ? null : otherReason;

        await order.save();

        const updatedOrder = await getFullOrderInformation(order._id);

        return successResponse(res, {
            message: 'Order cancelled reason added',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.refundCardAmount = async (req, res) => {
    try {
        const { id } = req.body;

        const payload = { id: '908790', amount: '5000' };
        const response = await flw.Transaction.refund(payload);
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserOrderListForApp = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            type = 'upcoming', // upcoming & past
        } = req.query;

        let config = {
            users: { $in: userId },
        };
        let butlerConfig = {
            user: userId,
        };

        if (type === 'upcoming') {
            config = {
                ...config,
                orderStatus: [
                    'schedule',
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            };
            butlerConfig = {
                ...butlerConfig,
                orderStatus: [
                    'schedule',
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            };
        } else if (type === 'past') {
            config = {
                ...config,
                orderStatus: ['delivered', 'refused', 'cancelled'],
                replacementOrderDelivered: false,
            };
            butlerConfig = {
                ...butlerConfig,
                orderStatus: ['delivered', 'refused', 'cancelled'],
            };
        }

        const countData = await Order.countDocuments(config);
        const countDataButler = await Butler.countDocuments(butlerConfig);

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: countData + countDataButler,
            pagingRange: 5,
        });

        const orderList = await Order.find(config).populate([
            {
                path: 'user',
                select: 'name gender phone_number email status dob account_type',
            },
            {
                path: 'users',
                select: 'name gender phone_number email status dob account_type',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
            {
                path: 'shop',
                select: '-products -password',
            },
            {
                path: 'seller',
                select: '-password',
            },
            {
                path: 'transactions',
            },
            {
                path: 'userCancelTnx',
            },
            {
                path: 'transactionsDrop',
            },
            {
                path: 'transactionsStore',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'transactionHistory',
            },
            {
                path: 'orderDeliveryCharge',
            },
            {
                path: 'orderCancel',
                populate: 'cancelReason',
            },
            {
                path: 'cart',
                populate: [
                    {
                        path: 'cartItems.user',
                    },
                    {
                        path: 'cartItems.products.product',
                        populate: 'marketing',
                    },
                    {
                        path: 'creator',
                    },
                ],
            },
            {
                path: 'marketings',
            },
            {
                path: 'userRefundTnx',
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
            {
                path: 'originalOrder',
                populate: [
                    {
                        path: 'shop',
                        select: '-password',
                    },
                    {
                        path: 'user',
                        select: '-password',
                    },
                    {
                        path: 'users',
                        select: '-password',
                    },
                    {
                        path: 'deliveryBoy',
                        select: '-password',
                    },
                    {
                        path: 'chats.user',
                    },
                    {
                        path: 'chats.deliveryBoy',
                    },
                    {
                        path: 'flag',
                        populate: 'user shop delivery',
                    },
                    {
                        path: 'orderCancel',
                        populate: 'cancelReason',
                    },
                    {
                        path: 'seller',
                        select: '-password',
                    },
                    {
                        path: 'deliveryBoyList',
                        select: '-password',
                    },
                    {
                        path: 'rejectedDeliveryBoy',
                        select: '-password',
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
                        path: 'userCancelTnx',
                    },
                    {
                        path: 'marketings',
                    },
                    {
                        path: 'userRefundTnx',
                    },
                    {
                        path: 'orderDeliveryCharge',
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
                ],
            },
        ]);

        const butlerList = await Butler.find(butlerConfig).populate([
            {
                path: 'user',
                select: 'name gender phone_number email status dob account_type',
            },
            {
                path: 'deliveryBoy',
            },
            {
                path: 'transactions',
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
                path: 'orderCancel',
                populate: 'cancelReason',
            },
        ]);

        let list = [...orderList, ...butlerList].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                order: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserOrdersForApp = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            page = 1,
            pageSize = 50,
            type = 'upcoming', // upcoming & past
        } = req.query;

        let config = {
            users: { $in: userId },
        };
        let butlerConfig = {
            user: userId,
        };

        if (type === 'upcoming') {
            config = {
                ...config,
                orderStatus: [
                    'schedule',
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            };
            butlerConfig = {
                ...butlerConfig,
                orderStatus: [
                    'schedule',
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            };
        } else if (type === 'past') {
            config = {
                ...config,
                orderStatus: ['delivered', 'refused', 'cancelled'],
                replacementOrderDelivered: false,
            };
            butlerConfig = {
                ...butlerConfig,
                orderStatus: ['delivered', 'refused', 'cancelled'],
            };
        }

        const orderList = await Order.find(config)
            .populate([
                {
                    path: 'deliveryBoy',
                    select: 'name image',
                },
                {
                    path: 'shop',
                    select: 'shopName shopLogo',
                },
                {
                    path: 'cart',
                    populate: [
                        {
                            path: 'cartItems.user',
                            select: 'name profile_photo',
                        },
                        {
                            path: 'cartItems.products.product',
                            populate: {
                                path: 'marketing',
                                select: 'type products isActive status onlyForSubscriber',
                            },
                            select: 'name price unit unitQuantity images category subCategory status productVisibility deletedAt rewardBundle reward discountPercentage discountPrice discount dietary sortingOrder stockQuantity createdAt',
                        },
                        {
                            path: 'creator',
                            select: 'name profile_photo',
                        },
                    ],
                    select: 'name creator cartType cartItems paymentPreferences deliveryFeePreferences maxAmountPerGuest specialInstruction',
                },
                {
                    path: 'userRefundTnx',
                    select: 'type amount secondaryCurrency_amount vat',
                },
                {
                    path: 'adjustOrderRequest',
                    populate: [
                        {
                            path: 'suggestedProducts.product',
                            select: 'name price images  rewardBundle reward discountPercentage discountPrice discount',
                        },
                        {
                            path: 'replacedProducts.product',
                            select: 'name price images  rewardBundle reward discountPercentage discountPrice discount',
                        },
                    ],
                },
                {
                    path: 'originalOrder',
                    populate: [
                        {
                            path: 'deliveryBoy',
                            select: 'name image',
                        },
                        {
                            path: 'shop',
                            select: 'shopName shopLogo',
                        },
                        {
                            path: 'cart',
                            populate: [
                                {
                                    path: 'cartItems.user',
                                    select: 'name profile_photo',
                                },
                                {
                                    path: 'creator',
                                    select: 'name profile_photo',
                                },
                            ],
                            select: 'name creator cartType cartItems paymentPreferences deliveryFeePreferences maxAmountPerGuest specialInstruction',
                        },
                        {
                            path: 'userRefundTnx',
                            select: 'type amount secondaryCurrency_amount vat',
                        },
                        {
                            path: 'adjustOrderRequest',
                            populate: [
                                {
                                    path: 'suggestedProducts.product',
                                    select: 'name price images  rewardBundle reward discountPercentage discountPrice discount',
                                },
                                {
                                    path: 'replacedProducts.product',
                                    select: 'name price images  rewardBundle reward discountPercentage discountPrice discount',
                                },
                            ],
                        },
                    ],
                    select: {
                        orderId: 1,
                        orderStatus: 1,
                        deliveryBoy: 1,
                        shop: 1,
                        paymentMethod: 1,
                        selectedPaymentMethod: 1,
                        selectPos: 1,
                        pickUpLocation: 1,
                        dropOffLocation: 1,
                        summary: 1,
                        productsDetails: 1,
                        timeline: 1,
                        note: 1,
                        deliveryBoyNote: 1,
                        preparingTime: 1,
                        type: 1,
                        scheduleDate: 1,
                        reviews: 1,
                        shopRated: 1,
                        deliveryBoyRated: 1,
                        deliveredMinutes: 1,
                        delivered_time: 1,
                        rewardPoints: 1,
                        specialInstruction: 1,
                        cart: 1,
                        couponDetails: 1,
                        isRefundedAfterDelivered: 1,
                        userRefundTnx: 1,
                        leaveAtDoorImage: 1,
                        bringChangeAmount: 1,
                        adminExchangeRate: 1,
                        shopExchangeRate: 1,
                        baseCurrency: 1,
                        secondaryCurrency: 1,
                        refundType: 1,
                        orderTripSummary: 1,
                        paidCurrency: 1,
                        isReplacementOrder: 1,
                        isReplacementItemPickFromUser: 1,
                        replacementOrderDelivered: 1,
                        originalOrder: 1,
                        isOrderAdjusted: 1,
                        adjustOrderRequest: 1,
                        baseCurrency_pendingSubscriptionFee: 1,
                        secondaryCurrency_pendingSubscriptionFee: 1,
                        createdAt: 1,
                    },
                },
            ])
            .select({
                orderId: 1,
                orderStatus: 1,
                deliveryBoy: 1,
                shop: 1,
                paymentMethod: 1,
                selectedPaymentMethod: 1,
                selectPos: 1,
                pickUpLocation: 1,
                dropOffLocation: 1,
                summary: 1,
                productsDetails: 1,
                timeline: 1,
                note: 1,
                deliveryBoyNote: 1,
                preparingTime: 1,
                type: 1,
                scheduleDate: 1,
                reviews: 1,
                shopRated: 1,
                deliveryBoyRated: 1,
                deliveredMinutes: 1,
                delivered_time: 1,
                rewardPoints: 1,
                specialInstruction: 1,
                cart: 1,
                couponDetails: 1,
                isRefundedAfterDelivered: 1,
                userRefundTnx: 1,
                leaveAtDoorImage: 1,
                bringChangeAmount: 1,
                adminExchangeRate: 1,
                shopExchangeRate: 1,
                baseCurrency: 1,
                secondaryCurrency: 1,
                refundType: 1,
                orderTripSummary: 1,
                paidCurrency: 1,
                isReplacementOrder: 1,
                isReplacementItemPickFromUser: 1,
                replacementOrderDelivered: 1,
                originalOrder: 1,
                isOrderAdjusted: 1,
                adjustOrderRequest: 1,
                baseCurrency_pendingSubscriptionFee: 1,
                secondaryCurrency_pendingSubscriptionFee: 1,
                createdAt: 1,
            });

        const butlerList = await Butler.find(butlerConfig)
            .populate([
                {
                    path: 'deliveryBoy',
                    select: 'name image',
                },
            ])
            .select({
                orderId: 1,
                orderStatus: 1,
                deliveryBoy: 1,
                orderType: 1,
                paymentMethod: 1,
                selectedPaymentMethod: 1,
                selectPos: 1,
                pickUpLocation: 1,
                dropOffLocation: 1,
                summary: 1,
                itemDescription: 1,
                products: 1,
                timeline: 1,
                note: 1,
                deliveryBoyNote: 1,
                type: 1,
                scheduleDate: 1,
                reviews: 1,
                deliveryBoyRated: 1,
                deliveredMinutes: 1,
                delivered_time: 1,
                isButler: 1,
                bringChangeAmount: 1,
                adminExchangeRate: 1,
                baseCurrency: 1,
                secondaryCurrency: 1,
                orderTripSummary: 1,
                paidCurrency: 1,
                paymentOn: 1,
                createdAt: 1,
            });

        let list = [...orderList, ...butlerList].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Successfully get orders',
            data: {
                order: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTodayOrderListForStoreApp = async (req, res) => {
    try {
        const shopId = req.shopId;
        const { sortBy = 'DESC' } = req.query;

        let config = {
            shop: shopId,
            createdAt: {
                $gte: moment(new Date()).startOf('day'),
                $lte: moment(new Date()).endOf('day'),
            },
        };

        const list = await Order.find(config)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'user',
                    select: 'name gender phone_number email status dob account_type',
                },
                {
                    path: 'users',
                    select: 'name gender phone_number email status dob account_type',
                },
                {
                    path: 'deliveryBoy',
                },
                {
                    path: 'shop',
                    select: '-products',
                },
                {
                    path: 'seller',
                },
                {
                    path: 'transactions',
                },
                {
                    path: 'transactionsDrop',
                },
                {
                    path: 'transactionsStore',
                },
                {
                    path: 'deliveryAddress',
                },
                {
                    path: 'transactionHistory',
                },
                {
                    path: 'orderDeliveryCharge',
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
            ]);

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                order: list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.orderRatingForUserApp = async (req, res) => {
    try {
        const { orderId, rating, reviewDes, reviewTags, type } = req.body;

        if (type && !['shop', 'deliveryBoy'].includes(type))
            return errorResponse(res, `${type} is not a valid type`);

        const order = await Order.findById(orderId);

        if (!order) return errorResponse(res, 'Order not found');

        if (type === 'shop') {
            if (order.shopRated == true)
                return errorResponse(res, 'Already rated to shop');
        }
        if (type === 'deliveryBoy') {
            if (order.deliveryBoyRated == true)
                return errorResponse(res, 'Already rated to deliverBoy');
        }

        await Order.updateOne(
            { _id: orderId },
            {
                $push: {
                    reviews: {
                        type,
                        rating,
                        reviewDes,
                        reviewTags,
                    },
                },
                shopRated: type === 'shop' && true,
                deliveryBoyRated: type === 'deliveryBoy' && true,
            }
        );

        let reviewOfUser;

        if (type === 'shop') {
            for (const singleProduct of order.productsDetails) {
                reviewOfUser = await ReviewModel.create({
                    user: order.user,
                    product: singleProduct.productId,
                    shop: order.shop,
                    order: order._id,
                    type,
                    rating,
                    reviewDes,
                    reviewTags,
                    reviewVisibility: !reviewDes,
                });
            }

            const averageRateOfShop = await this.getAverageRate(
                order.shop,
                'shop'
            );
            await ShopModel.updateOne(
                { _id: order.shop },
                {
                    rating: Math.round(averageRateOfShop),
                    $push: {
                        reviews: reviewOfUser._id,
                    },
                }
            );
        }

        if (type === 'deliveryBoy') {
            reviewOfUser = await ReviewModel.create({
                user: order.user,
                deliveryBoy: order.deliveryBoy,
                order: order._id,
                type,
                rating,
                reviewDes,
                reviewTags,
                reviewVisibility: !reviewDes,
            });

            const averageRateOfDeliveryBoy = await this.getAverageRate(
                order.deliveryBoy,
                'deliveryBoy'
            );
            await DeliveryBoyModel.updateOne(
                { _id: order.deliveryBoy },
                {
                    rating: Math.round(averageRateOfDeliveryBoy),
                    $push: {
                        reviews: reviewOfUser._id,
                    },
                }
            );
        }

        const updatedOrder = await Order.findById(orderId).populate(
            'deliveryBoy shop'
        );

        successResponse(res, {
            message: 'Successfully Rated',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAverageRate = async (id, type) => {
    let config = {
        type: type,
    };

    if (type === 'shop') {
        config = {
            ...config,
            shop: ObjectId(id),
            // reviewVisibility: true,
        };
    }
    if (type === 'deliveryBoy') {
        config = {
            ...config,
            deliveryBoy: ObjectId(id),
        };
    }

    const average = await ReviewModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                rate: { $sum: { $sum: ['$rating'] } },
            },
        },
    ]);

    const totalCount = average[0] ? average[0].count : 0;
    const totalRate = average[0] ? average[0].rate : 0;

    const averageRate = totalRate / totalCount || 0;

    return averageRate;
};

exports.makeFlagOrderByAdmin = async (req, res) => {
    try {
        const {
            orderId,
            comment,
            user,
            shop,
            delivery,
            flaggedReason,
            otherReason,
            replacement,
            refund,
        } = req.body;

        const flagOrder = await Order.findById(orderId);

        if (!flagOrder) return errorResponse(res, 'Order not found');

        if (user) {
            let flag = await FlagModel.create({
                orderId,
                comment,
                user,
                type: 'user',
                flaggedType: 'normal',
                flaggedReason,
                otherReason,
                replacement,
                refund,
            });

            await UserModel.updateOne(
                { _id: user },
                {
                    $push: {
                        flags: flag._id,
                    },
                }
            );

            await Order.updateOne(
                { _id: orderId },
                {
                    $addToSet: {
                        flag: flag._id,
                        flaggedReason,
                    },
                    $set: {
                        flaggedAt: new Date(),
                    },
                }
            );
        }
        if (shop) {
            let flag = await FlagModel.create({
                orderId,
                comment,
                shop,
                type: 'shop',
                flaggedType: 'normal',
                flaggedReason,
                otherReason,
                replacement,
                refund,
            });

            await ShopModel.updateOne(
                { _id: shop },
                {
                    $push: {
                        flags: flag._id,
                    },
                }
            );

            await Order.updateOne(
                { _id: orderId },
                {
                    $addToSet: {
                        flag: flag._id,
                        flaggedReason,
                    },
                    $set: {
                        flaggedAt: new Date(),
                    },
                }
            );
        }
        if (delivery) {
            let flag = await FlagModel.create({
                orderId,
                comment,
                delivery,
                type: 'delivery',
                flaggedType: 'normal',
                flaggedReason,
                otherReason,
                replacement,
                refund,
            });

            await DeliveryBoyModel.updateOne(
                { _id: delivery },
                {
                    $push: {
                        flags: flag._id,
                    },
                }
            );

            await Order.updateOne(
                { _id: orderId },
                {
                    $addToSet: {
                        flag: flag._id,
                        flaggedReason,
                    },
                    $set: {
                        flaggedAt: new Date(),
                    },
                }
            );
        }

        const updatedFlagOrder = await Order.findById(orderId).populate([
            {
                path: 'shop',
                select: '-password',
            },
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'users',
                select: '-password',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
            {
                path: 'chats.user',
            },
            {
                path: 'chats.deliveryBoy',
            },
            {
                path: 'flag',
                populate: 'user shop delivery',
            },
            {
                path: 'orderCancel',
                populate: 'cancelReason',
            },
            {
                path: 'seller',
                select: '-password',
            },
            {
                path: 'deliveryBoyList',
                select: '-password',
            },
            {
                path: 'rejectedDeliveryBoy',
                select: '-password',
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
                path: 'userCancelTnx',
            },
            {
                path: 'marketings',
            },
            {
                path: 'userRefundTnx',
            },
            {
                path: 'orderDeliveryCharge',
            },
            {
                path: 'coupon',
            },
        ]);

        successResponse(res, {
            message: 'Successfully Flagged',
            data: {
                order: updatedFlagOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editOrderFlag = async (req, res) => {
    try {
        const {
            id,
            comment,
            user,
            shop,
            delivery,
            flaggedReason,
            otherReason,
            replacement,
            refund,
        } = req.body;

        const flag = await FlagModel.findById(id);

        if (!flag) return errorResponse(res, 'Flag Not found');

        await FlagModel.updateOne(
            { _id: id },
            {
                comment,
                shop: shop && shop,
                user: user && user,
                delivery: delivery && delivery,
                flaggedReason,
                otherReason,
                replacement,
                refund,
            }
        );

        // Find flag in shop
        const findShop = await ShopModel.findOne({
            _id: shop,
            flags: { $in: id },
        });

        // Find flag in user
        const findUser = await UserModel.findOne({
            _id: user,
            flags: { $in: id },
        });

        // Find flag in Delivery boy
        const findDelivery = await DeliveryBoyModel.findOne({
            _id: delivery,
            flags: { $in: id },
        });

        if (!shop && findShop) {
            await ShopModel.updateOne(
                { _id: shop },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        } else if (shop && !findShop) {
            await ShopModel.updateOne(
                { _id: shop },
                {
                    $push: {
                        flags: id,
                    },
                }
            );
        }

        if (!user && findUser) {
            await UserModel.updateOne(
                { _id: user },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        } else if (user && !findUser) {
            await UserModel.updateOne(
                { _id: user },
                {
                    $push: {
                        flags: id,
                    },
                }
            );
        }

        if (!delivery && findDelivery) {
            await DeliveryBoyModel.updateOne(
                { _id: delivery },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        } else if (delivery && !findDelivery) {
            await DeliveryBoyModel.updateOne(
                { _id: delivery },
                {
                    $push: {
                        flags: id,
                    },
                }
            );
        }

        const updatedFlag = await FlagModel.findById(id);

        successResponse(res, {
            message: 'flag Updated',
            data: updatedFlag,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteFlagFromAdmin = async (req, res) => {
    try {
        const { id } = req.body;

        const flag = await FlagModel.findById(id);

        if (flag.user) {
            await UserModel.updateOne(
                { _id: flag.user },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        } else if (flag.shop) {
            await ShopModel.updateOne(
                { _id: flag.shop },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        } else if (flag.delivery) {
            await DeliveryBoyModel.updateOne(
                { _id: flag.delivery },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        }

        await Order.updateOne(
            { _id: flag.orderId },
            {
                $pull: {
                    flag: id,
                },
            }
        );

        await FlagModel.findByIdAndDelete(id);

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.rejectOrderByDeliveryBoy = async (req, res) => {
    try {
        const { orderId } = req.body;
        const deliveryBoyId = req.deliveryBoyId;

        const order = await Order.findById(orderId);
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (
            order.deliveryBoy &&
            order.deliveryBoy.toString() === deliveryBoyId.toString()
        ) {
            return errorResponse(
                res,
                'Order has been allocated to you already.'
            );
        }

        if (!['placed', 'preparing'].includes(order.orderStatus)) {
            return errorResponse(res, 'Order can not be rejected');
        }

        await Order.updateOne(
            { _id: orderId },
            {
                $push: {
                    rejectedDeliveryBoy: deliveryBoyId,
                },
                $pull: {
                    deliveryBoyList: deliveryBoyId,
                },
            }
        );

        const updatedOrder = await getFullOrderInformation(order._id);

        if (!updatedOrder.deliveryBoyList.length && !updatedOrder.deliveryBoy) {
            checkNearByDeliveryBoyShu(order._id);
        }

        return res.json({
            message: 'Order Rejected',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.cancelOrderByDeliveryBoy = async (req, res) => {
    try {
        const { orderId, cancelReasonId, otherReason } = req.body;
        const deliveryBoyId = req.deliveryBoyId;

        if (!cancelReasonId && !otherReason) {
            return errorResponse(
                res,
                'need a cancel reason . Please give proper reason to cancel'
            );
        }

        const order = await Order.findOne({
            _id: orderId,
            deliveryBoy: deliveryBoyId,
        });
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (order.orderStatus !== 'accepted_delivery_boy') {
            return errorResponse(res, 'Order can not be canceled');
        }

        let newTimeline = order.timeline;
        const acceptedDeliveryBoyTimeline = newTimeline.find(
            timeline => timeline.status === 'accepted_delivery_boy'
        );
        acceptedDeliveryBoyTimeline.active = false;
        acceptedDeliveryBoyTimeline.createdAt = null;

        const cancelObject = getCancelObject({
            canceledBy: 'deliveryBoy',
            deliveryBoyId: order.deliveryBoy,
            cancelReasonId: cancelReasonId,
            otherReason: otherReason,
        });

        await Order.updateOne(
            { _id: orderId },
            {
                $push: {
                    canceledDeliveryBoy: deliveryBoyId,
                    rejectedDeliveryBoy: deliveryBoyId,
                    orderActivity: {
                        note: 'Canceled Order by delivery Boy',
                        activityBy: 'deliveryBoy',
                        deliveryBoy: deliveryBoyId,
                        createdAt: new Date(),
                    },
                },
                $pull: {
                    deliveryBoyList: deliveryBoyId,
                },
                $set: {
                    orderStatus: 'placed',
                    orderCancel: cancelObject,
                    deliveryBoy: null,
                    accepted_delivery_boyAt: null,
                    deliveryBoyShopDistance: null,
                    timeline: newTimeline,
                },
            }
        );

        const updatedOrder = await getFullOrderInformation(order._id);

        checkNearByDeliveryBoyShu(order._id);

        await sendNotificationsAllApp(updatedOrder);

        return res.json({
            message: 'Successfully order canceled',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const userOrderCreateTransection = async (
    order,
    userId,
    amount,
    secondaryCurrency_amount,
    summary,
    paymentMethod,
    cardTypeString,
    cardId = null
) => {
    try {
        const transaction = await TransactionModel.create({
            user: userId,
            amount: amount,
            secondaryCurrency_amount: secondaryCurrency_amount,
            summary: summary,
            userNote: 'Order Payment Completed',
            adminNote: `user payment for order by using ${cardTypeString}`,
            account: 'user',
            type: 'userPayForOrder',
            status: 'success',
            paymentMethod,
            paymentType: 'flutterWave',
            cardId: cardId,
            order: order._id,
            paidCurrency: order.paidCurrency,
            isUserWalletRelated: paymentMethod === 'wallet',
        });
        return transaction;
    } catch (error) {
        console.log(error);
    }
};

const shopBalanceAddForOrder = async (
    order,
    status = 'success',
    type = 'sellerGetPaymentFromOrder',
    deliveryBoyHave = 'drop' // drop & store
) => {
    let finalAmount = calculateEarnings(
        order?.baseCurrency_shopEarnings,
        order?.vatAmount?.baseCurrency_vatForShop
    );

    let secondaryCurrency_finalAmount = calculateEarnings(
        order?.secondaryCurrency_shopEarnings,
        order?.vatAmount?.secondaryCurrency_vatForShop
    );

    if (
        order.orderFor === 'specific' &&
        order.paymentMethod === 'cash' &&
        !order.isReplacementOrder
    ) {
        finalAmount = Number(order?.summary?.baseCurrency_cash ?? 0);
        secondaryCurrency_finalAmount = Number(
            order?.summary?.secondaryCurrency_cash ?? 0
        );
    }

    const findShop = await ShopModel.findById(order.shop).select('shopType');

    const tnx = await TransactionModel.create({
        order: order._id,
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        account: 'shop',
        type: type,
        paymentMethod: order.paymentMethod,
        pos: false,
        status: status,
        user: order.user,
        shop: order.shop,
        seller: order.seller,
        deliveryBoy: order.deliveryBoy,
        summary: order.summary,
        amount: finalAmount,
        secondaryCurrency_amount: secondaryCurrency_finalAmount,
        shopGet: order.baseCurrency_shopEarnings,
        deliveryBoyGet:
            deliveryBoyHave === 'drop' ? order.baseCurrency_riderFee : 0,
        unSettleAmount:
            deliveryBoyHave === 'store' && order.paymentMethod === 'cash'
                ? 0
                : order.baseCurrency_shopEarnings,
        dropGet: order.adminCharge.baseCurrency_totalAdminCharge,
        adminCharge: order.adminCharge,
        dropGetFromShop: order.adminCharge.baseCurrency_adminChargeFromOrder,
        baseCurrency_couponDiscountAmount:
            order.summary.baseCurrency_couponDiscountAmount,
        secondaryCurrency_couponDiscountAmount:
            order.summary.secondaryCurrency_couponDiscountAmount,
        paidCurrency: order.paidCurrency,
        orderType: findShop.shopType,
    });
    return tnx;
};

const addDropBalanceForOrder = async order => {
    // drop earning
    const transactionDrop = await TransactionModel.create({
        order: order._id,
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        account: 'admin',
        type: 'DropGetFromOrder',
        paymentMethod: order.paymentMethod,
        status: 'success',
        user: order.user,
        shop: order.shop,
        seller: order.seller,
        deliveryBoy: order.deliveryBoy,
        summary: order.summary,
        amount: order.adminCharge.baseCurrency_totalAdminCharge,
        secondaryCurrency_amount:
            order.adminCharge.secondaryCurrency_totalAdminCharge,
        shopGet: order.baseCurrency_shopEarnings,
        deliveryBoyGet: order.baseCurrency_riderFee,
        unSettleAmount: order.baseCurrency_shopEarnings,
        dropGet: order.adminCharge.baseCurrency_totalAdminCharge,
        adminCharge: order.adminCharge,
        dropGetFromShop: order.adminCharge.baseCurrency_adminChargeFromOrder,
        dropGetFromDeliveryBoy:
            order.adminCharge.baseCurrency_adminChargeFromDelivery,
        paidCurrency: order.paidCurrency,
    });

    return transactionDrop;
};

const deliveryBoyBalanceAddForOrder = async (
    order,
    type,
    status = 'success',
    pos = false,
    baseCurrency_collectCash = 0,
    secondaryCurrency_collectCash = 0,
    baseCurrency_receivedCash = 0,
    secondaryCurrency_receivedCash = 0,
    baseCurrency_returnedCash = 0,
    secondaryCurrency_returnedCash = 0,
) => {
    const transactionDeliveryBoy = await TransactionModel.create({
        order: order._id,
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        account: 'deliveryBoy',
        type: type,
        paymentMethod: order.paymentMethod,
        pos: pos,
        status: status,
        user: order.user,
        shop: order.shop,
        seller: order.seller,
        deliveryBoy: order.deliveryBoy,
        summary: order.summary,
        amount: order.baseCurrency_riderFee,
        secondaryCurrency_amount: order.secondaryCurrency_riderFee,
        shopGet: order.baseCurrency_shopEarnings,
        deliveryBoyGet: order.baseCurrency_riderFee,
        unSettleAmount: order.baseCurrency_riderFee,
        dropGet: order.adminCharge.baseCurrency_totalAdminCharge,
        adminCharge: order.adminCharge,
        dropGetFromShop: order.adminCharge.baseCurrency_adminChargeFromOrder,
        dropGetFromDeliveryBoy:
            order.adminCharge.baseCurrency_adminChargeFromDelivery,
        paidCurrency: order.paidCurrency,
        deliveryBoyHand:
            type === 'deliveryBoyOrderDeliveredCash' ? true : false,
        receivedAmount:
            type === 'deliveryBoyOrderDeliveredCash'
                ? order.summary.baseCurrency_cash
                : 0,
        secondaryCurrency_receivedAmount:
            type === 'deliveryBoyOrderDeliveredCash'
                ? order.summary.secondaryCurrency_cash
                : 0,
        sendToDropAmount:
            type === 'deliveryBoyOrderDeliveredCash'
                ? order.summary.baseCurrency_cash
                : 0, // add this field for adam request
        baseCurrency_collectCash,
        secondaryCurrency_collectCash,
        baseCurrency_collectCash_sc:
            baseCurrency_collectCash * order.shopExchangeRate,
        secondaryCurrency_collectCash_bc:
            secondaryCurrency_collectCash / order.shopExchangeRate || 0,
        baseCurrency_receivedCash,
        secondaryCurrency_receivedCash,
        baseCurrency_returnedCash,
        secondaryCurrency_returnedCash,
    });
    return transactionDeliveryBoy;
};

// const getFullOrderInformation = async orderId => {
//     const order = await Order.findOne({ _id: orderId }).populate([
//         {
//             path: 'marketings',
//         },
//         {
//             path: 'user',
//             select: 'name email phone_number profile_photo',
//         },
//         {
//             path: 'users',
//             select: 'name email phone_number profile_photo',
//         },
//         {
//             path: 'deliveryBoy',
//         },
//         {
//             path: 'transactionsDeliveryBoy',
//         },
//         {
//             path: 'transactionsDrop',
//         },
//         {
//             path: 'transactionsStore',
//         },
//         {
//             path: 'transactionHistory',
//         },
//         {
//             path: 'seller',
//         },
//         {
//             path: 'shop',
//             select: '-banner -products -flags -reviews -categories',
//         },
//         {
//             path: 'deliveryAddress',
//         },
//         {
//             path: 'orderDeliveryCharge',
//         },
//         {
//             path: 'transactions',
//         },
//         {
//             path: 'userCancelTnx',
//         },
//         {
//             path: 'cancelShopTnx',
//         },
//         {
//             path: 'cancelDeliveryTnx',
//         },
//         {
//             path: 'adminCancelTnx',
//         },
//         {
//             path: 'orderCancel.userId',
//         },
//         {
//             path: 'orderCancel.cancelReason',
//         },
//         {
//             path: 'orderCancel.deliveryBoyId',
//         },
//         {
//             path: 'orderCancel.adminId',
//         },
//         {
//             path: 'orderCancel.sellerId',
//         },
//         {
//             path: 'orderCancel.shopId',
//         },
//         {
//             path: 'products',
//             populate: [
//                 {
//                     path: 'product',
//                     select: 'name',
//                 },
//                 {
//                     path: 'addons.product',
//                     select: 'name',
//                 },
//             ],
//         },
//         {
//             path: 'cart',
//             populate: [
//                 {
//                     path: 'cartItems.user',
//                 },
//                 {
//                     path: 'creator',
//                 },
//             ],
//         },
//     ]);

//     return order;
// };

const shopCashInHandFc = async order => {
    const findShop = await ShopModel.findById(order.shop).select('shopType');

    const tnx = await TransactionModel.create({
        order: order._id,
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        account: 'shop',
        type: 'shopCashInHand',
        paymentMethod: order.paymentMethod,
        pos: order.selectPos === 'yes' ? true : false,
        status: 'success',
        user: order.user,
        shop: order.shop,
        seller: order.seller,
        deliveryBoy: order.deliveryBoy,
        summary: order.summary,
        amount:
            order.summary.baseCurrency_wallet > 0
                ? order.adminCharge?.baseCurrency_totalAdminCharge +
                order.vatAmount.baseCurrency_vatForAdmin +
                order.baseCurrency_pendingSubscriptionFee -
                order.summary.baseCurrency_wallet
                : order.adminCharge?.baseCurrency_totalAdminCharge +
                order.vatAmount.baseCurrency_vatForAdmin +
                order.baseCurrency_pendingSubscriptionFee,
        secondaryCurrency_amount:
            order.summary.secondaryCurrency_wallet > 0
                ? order.adminCharge?.secondaryCurrency_totalAdminCharge +
                order.vatAmount.secondaryCurrency_vatForAdmin +
                order.secondaryCurrency_pendingSubscriptionFee -
                order.summary.secondaryCurrency_wallet
                : order.adminCharge?.secondaryCurrency_totalAdminCharge +
                order.vatAmount.secondaryCurrency_vatForAdmin +
                order.secondaryCurrency_pendingSubscriptionFee,
        shopGet:
            order.baseCurrency_shopEarnings +
            order.vatAmount.baseCurrency_vatForShop,
        deliveryBoyGet: 0,
        unSettleAmount: 0,
        dropGet:
            order.adminCharge.baseCurrency_totalAdminCharge +
            order.vatAmount.baseCurrency_vatForAdmin +
            order.baseCurrency_pendingSubscriptionFee,
        adminCharge: order.adminCharge,
        dropGetFromShop: order.adminCharge.baseCurrency_adminChargeFromOrder,
        paidCurrency: order.paidCurrency,
        orderType: findShop.shopType,
    });

    return tnx;
};

exports.sendMessageToDeliveryBoy = async (req, res) => {
    try {
        const { orderId, message } = req.body;

        let Model = Order;
        let order = await Model.findOne({ _id: orderId }).populate(
            'user deliveryBoy'
        );

        if (!order) {
            Model = Butler;
            order = await Model.findOne({ _id: orderId }).populate(
                'user deliveryBoy'
            );

            if (!order) {
                return errorResponse(res, 'order not found');
            }
        }

        // update
        await Model.updateOne(
            { _id: orderId },
            {
                $push: {
                    chats: {
                        user: order.user._id,
                        deliveryBoy: order.deliveryBoy
                            ? order.deliveryBoy._id
                            : null,
                        shop: order.deliveryBoy ? null : order.shop,
                        message,
                        sender: 'user',
                    },
                },
            }
        );

        await pushNotificationForChat(
            order.deliveryBoy ? 'delivery' : 'shop',
            order.deliveryBoy ? order.deliveryBoy._id : order.shop,
            order,
            'chatWithRider',
            message
        );

        successResponse(res, {
            message: `Message sent`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendMessageToUser = async (req, res) => {
    try {
        const { orderId, message, type } = req.body;

        if (!['deliveryBoy', 'shop'].includes(type)) {
            return errorResponse(res, 'Invalid type');
        }

        let Model = Order;
        let order = await Model.findOne({ _id: orderId }).populate(
            'user deliveryBoy'
        );

        if (!order) {
            Model = Butler;
            order = await Model.findOne({ _id: orderId }).populate(
                'user deliveryBoy'
            );

            if (!order) {
                return errorResponse(res, 'order not found');
            }
        }

        if (order.deliveryBoy && type === 'shop') {
            return errorResponse(res, "shop can't send message to user");
        }

        if (!order.deliveryBoy && type === 'deliveryBoy') {
            return errorResponse(
                res,
                "Delivery Boy can't send message to user"
            );
        }

        // update
        await Model.updateOne(
            { _id: orderId },
            {
                $push: {
                    chats: {
                        user: order.user._id,
                        deliveryBoy: order.deliveryBoy
                            ? order.deliveryBoy._id
                            : null,
                        shop: order.deliveryBoy ? null : order.shop,
                        message,
                        sender: type,
                    },
                },
            }
        );

        await pushNotificationForChat(
            'user',
            order.user._id,
            order,
            'chatWithRider',
            message
        );

        successResponse(res, {
            message: `Message sent`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const userOrderCountUpdate = userId => {
    // add 1 in orderCompleted colum in UserModel
    UserModel.updateOne(
        { _id: userId },
        { $inc: { orderCompleted: 1 } }
    ).exec();
};

exports.getOrderChats = async (req, res) => {
    try {
        const { orderId } = req.query;

        if (!orderId) {
            return errorResponse(res, 'Order id is required');
        }

        let order = await Order.findOne({ _id: orderId })
            .populate([
                {
                    path: 'chats',
                    populate: [
                        {
                            path: 'user',
                            select: 'name email phone_number profile_photo',
                        },
                        {
                            path: 'deliveryBoy',
                            select: 'name image email number',
                        },
                        {
                            path: 'shop',
                            select: 'shopName phone_number email shopLogo shopBanner shopStatus liveStatus',
                        },
                    ],
                },
            ])
            .select('chats');

        if (!order) {
            order = await Butler.findOne({ _id: orderId })
                .populate([
                    {
                        path: 'chats',
                        populate: [
                            {
                                path: 'user',
                                select: 'name email phone_number profile_photo',
                            },
                            {
                                path: 'deliveryBoy',
                                select: 'name image email number',
                            },
                        ],
                    },
                ])
                .select('chats');

            if (!order) {
                return errorResponse(res, 'order not found');
            }
        }

        const chats = order?.chats;

        successResponse(res, {
            message: `Chats`,
            data: {
                chats,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderVat = async (req, res) => {
    try {
        const { amount } = req.query;

        if (!amount) {
            return errorResponse(res, 'Amount id is required');
        }

        // const appSetting = await AppSetting.findOne({});

        // const totalVAT = Number(amount) * (Number(appSetting?.vat) / 100);

        successResponse(res, {
            message: `Vat Successfully Calculated`,
            data: {
                // vat: totalVAT,
                vat: 0,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Shop can rate rider feature
exports.rateToRiderShopApp = async (req, res) => {
    try {
        const { orderId, shopRateToRider } = req.body;
        const shopId = req.shopId;

        const order = await Order.findById(orderId);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (shopId.toString() !== order.shop.toString()) {
            return errorResponse(res, 'You are not valid shop');
        }

        await Order.updateOne(
            { _id: orderId },
            {
                shopRateToRider: shopRateToRider,
            }
        );

        const updatedOrder = await getFullOrderInformation(order._id);

        successResponse(res, {
            message: 'Successfully rated',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Rider have to add image when leave at door address instruction
exports.addOrderImageByDeliveryBoy = async (req, res) => {
    try {
        const { orderId, leaveAtDoorImage } = req.body;
        const deliveryBoyId = req.deliveryBoyId;

        const order = await Order.findOne({
            _id: orderId,
            deliveryBoy: deliveryBoyId,
        });
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (order.orderStatus !== 'order_on_the_way') {
            return errorResponse(res, 'Wait for order_on_the_way');
        }

        await Order.updateOne(
            { _id: orderId },
            {
                leaveAtDoorImage: leaveAtDoorImage,
            }
        );

        const updatedOrder = await getFullOrderInformation(order._id);

        successResponse(res, {
            message: 'Successfully image added',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.generateReferralCode = async () => {
    let referralCode = shortid.generate();
    referralCode = referralCode
        .replace(/ /g, '')
        .toUpperCase()
        .trim()
        .substring(0, 6);

    return (await checkReferralCode(referralCode))
        ? await this.generateReferralCode()
        : referralCode;
};

const checkReferralCode = async referralCode => {
    const checkCoupon = await CouponModel.findOne({
        couponName: referralCode,
        deletedAt: null,
    });

    if (checkCoupon) return true;

    return false;
};

exports.getUrgentOrdersForSpecificAdmin = async (req, res) => {
    try {
        const adminId = req.adminId;
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            type,
            orderType,
        } = req.query;

        let config = {
            errorOrderType: 'urgent',
            assignedCustomerService: adminId,
        };

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (type && type === 'ongoing') {
            config = {
                ...config,
                orderStatus: {
                    $in: [
                        'placed',
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
            };
        }

        if (type && type === 'past') {
            config = {
                ...config,
                orderStatus: {
                    $in: ['delivered', 'refused', 'cancelled'],
                },
            };
        }

        if (
            orderType &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                orderType
            )
        ) {
            config.orderType = orderType;
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const orderIDSearchQuery = newQuery.map(str => ({
                orderId: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const noteSearchQuery = newQuery.map(str => ({
                note: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: orderIDSearchQuery },
                            { $and: noteSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        let orderList = await Order.find(config).populate([
            {
                path: 'shop',
                select: '-password',
            },
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'users',
                select: '-password',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
            {
                path: 'chats.user',
            },
            {
                path: 'chats.deliveryBoy',
            },
            {
                path: 'flag',
                populate: 'user shop delivery',
            },
            {
                path: 'orderCancel',
                populate: 'cancelReason',
            },
            {
                path: 'seller',
                select: '-password',
            },
            {
                path: 'deliveryBoyList',
                select: '-password',
            },
            {
                path: 'rejectedDeliveryBoy',
                select: '-password',
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
                path: 'userCancelTnx',
            },
            {
                path: 'marketings',
            },
            {
                path: 'userRefundTnx',
            },
            {
                path: 'orderDeliveryCharge',
            },
        ]);

        let butlerList = await Butler.find(config).populate([
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
            {
                path: 'chats.user',
            },
            {
                path: 'chats.deliveryBoy',
            },
            {
                path: 'flag',
                populate: 'user delivery',
            },
            {
                path: 'orderCancel',
                populate: 'cancelReason',
            },
            {
                path: 'deliveryBoyList',
                select: '-password',
            },
            {
                path: 'rejectedDeliveryBoy',
                select: '-password',
            },
            {
                path: 'orderDeliveryCharge',
            },
        ]);

        let list = [];

        if (sortBy.toUpperCase() === 'DESC') {
            list = [...orderList, ...butlerList].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
        } else {
            list = [...orderList, ...butlerList].sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Successfully get orders',
            data: {
                orders: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.acceptUrgentOrderBySpecificAdmin = async (req, res) => {
    try {
        const adminId = req.adminId;

        const { orderId } = req.body;

        let order = await Order.findOne({ _id: orderId });

        if (!order) {
            order = await Butler.findOne({ _id: orderId });
        }

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (order?.assignedCustomerService?.toString() !== adminId.toString()) {
            return errorResponse(res, 'you are not eligible');
        }

        let updatedOrder = order;

        if (order?.isButler) {
            await Butler.findByIdAndUpdate(orderId, {
                $set: {
                    isCustomerServiceAccepted: true,
                },
            });

            updatedOrder = await getFullOrderInformationForButler(order._id);
        } else {
            await Order.findByIdAndUpdate(orderId, {
                $set: {
                    isCustomerServiceAccepted: true,
                },
            });

            updatedOrder = await getFullOrderInformation(order._id);
        }

        successResponse(res, {
            message: 'Order Updated',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.getUrgentOrdersCount = async (req, res) => {
    try {
        const { startDate, endDate, orderType, assignedCustomerService } =
            req.query;

        let config = {
            orderStatus: {
                $in: [
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
            errorOrderType: 'urgent',
        };

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        // if (orderType && ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(orderType)) {
        //     config.orderType = orderType;
        // }

        if (assignedCustomerService) {
            config = {
                ...config,
                assignedCustomerService,
                isCustomerServiceAccepted: true,
            };
        }

        let urgentOrderCount = 0;

        if (orderType === 'butler') {
            urgentOrderCount = await Butler.countDocuments(config);
        } else if (
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                orderType
            )
        ) {
            config.orderType = orderType;

            urgentOrderCount = await Order.countDocuments(config);
        } else {
            const urgentButlerOrderCount = await Butler.countDocuments(config);
            const urgentNormalOrderCount = await Order.countDocuments(config);
            urgentOrderCount = urgentButlerOrderCount + urgentNormalOrderCount;
        }

        successResponse(res, {
            message: 'Successfully get',
            data: {
                urgentOrderCount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getLateOrdersCount = async (req, res) => {
    try {
        const { startDate, endDate, orderType } = req.query;

        let config = {
            orderStatus: {
                $in: [
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
            isOrderLate: true,
        };

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        let lateOrderCount = 0;

        if (orderType === 'butler') {
            lateOrderCount = await Butler.countDocuments(config);
        } else if (
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                orderType
            )
        ) {
            config.orderType = orderType;

            lateOrderCount = await Order.countDocuments(config);
        } else {
            const lateButlerOrderCount = await Butler.countDocuments(config);
            const lateNormalOrderCount = await Order.countDocuments(config);
            lateOrderCount = lateButlerOrderCount + lateNormalOrderCount;
        }

        successResponse(res, {
            message: 'Successfully get',
            data: {
                lateOrderCount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// For changing delivery address after order
exports.updateDeliveryAddressByAdmin = async (req, res) => {
    try {
        const { orderId, deliveryAddress } = req.body;

        const {
            address,
            nickname,
            apartment,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            note,
            tags,
            placeId,
            buildingName,
            deliveryOptions,
            addressLabel,
            instructions,
        } = deliveryAddress;

        const order = await Order.findOne({ _id: orderId }).populate([
            {
                path: 'shop',
                select: '-password',
            },
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
            {
                path: 'orderDeliveryCharge',
            },
        ]);

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (['delivered', 'refused', 'cancelled'].includes(order.orderStatus)) {
            return errorResponse(res, `Order already ${order.orderStatus}`);
        }

        if (order.isReplacementOrder) {
            return errorResponse(
                res,
                `You can't change replacement order delivery address.`
            );
        }

        // if (order.deliveryBoy && order.orderFor === 'global') {
        //     const riderOngoingOrders = await Order.find({
        //         deliveryBoy: order.deliveryBoy._id,
        //         orderStatus: {
        //             $in: [
        //                 'accepted_delivery_boy',
        //                 'preparing',
        //                 'ready_to_pickup',
        //                 'order_on_the_way',
        //             ],
        //         },
        //     });

        //     if (riderOngoingOrders.length > 1) {
        //         return errorResponse(res, 'Rider has another order.');
        //     }
        // }

        const zoneConfig = {
            zoneGeometry: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                },
            },
            zoneStatus: 'active',
        };

        const zone = await ZoneModel.findOne(zoneConfig);

        if (!zone)
            return errorResponse(
                res,
                'Selected address is out of our service.'
            );

        if (zone.zoneAvailability === 'busy')
            return errorResponse(
                res,
                'Selected address is inside a busy zone.'
            );

        const distanceStatus = await this.checkOrderDistance(
            {
                latitude: order?.shop?.location?.coordinates[1],
                longitude: order?.shop?.location?.coordinates[0],
            },
            {
                latitude: latitude,
                longitude: longitude,
            }
        );

        if (!distanceStatus) {
            return errorResponse(
                res,
                'Your selected address is out of shop range'
            );
        }

        const userShopDistance = await DistanceInfoGoogle({
            origin: {
                latitude: order.shop.location.coordinates[1],
                longitute: order.shop.location.coordinates[0],
            },
            distination: {
                latitude: latitude,
                longitute: longitude,
            },
        });
        if (userShopDistance?.duration?.value == null) {
            return errorResponse(
                res,
                'Your selected address is out of shop range'
            );
        }

        const { order_delivery_charge, status, message } =
            await getDeliveryChargeFunc(
                order.shop._id,
                order.user._id,
                latitude,
                longitude
            );

        if (!status) {
            return errorResponse(res, message);
        }

        // if (
        //     order.orderDeliveryCharge.deliveryFee !==
        //         order_delivery_charge.deliveryFee &&
        //     order.orderDeliveryCharge.selectedRangeItem !==
        //         order_delivery_charge.selectedRangeItem
        // ) {
        //     return errorResponse(
        //         res,
        //         'This order delivery address is not changeable.'
        //     );
        // }

        //*** Create user new address start ***//
        // await Address.updateMany(
        //     { user: order.user._id, primary: true },
        //     { $set: { primary: false } }
        // );

        const createAddress = await Address.create({
            // user: order.user._id,
            address,
            nickname,
            apartment,
            latitude,
            longitude,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            country,
            state,
            city,
            pin,
            note,
            tags,
            placeId,
            buildingName,
            deliveryOptions,
            addressLabel,
            instructions,
        });

        // await UserModel.updateOne(
        //     { _id: order.user._id },
        //     {
        //         $push: {
        //             address: createAddress._id,
        //         },
        //         location: {
        //             type: 'Point',
        //             coordinates: [longitude, latitude],
        //         },
        //     }
        // );

        //*** Create user new address end ***//

        // Calculate delivered_time
        let delivered_time = new Date(order.delivered_time);
        const deliveredTimeDiff =
            Number(userShopDistance?.duration?.value) / 60 -
            Number(order?.userShopDistance?.duration?.value) / 60;
        delivered_time.setMinutes(
            delivered_time.getMinutes() + deliveredTimeDiff
        );

        order.dropOffLocation = createAddress;
        order.deliveryAddress = createAddress._id;
        order.deliveryDistance = order_delivery_charge.distance;
        order.userShopDistance = userShopDistance;
        order.delivered_time = delivered_time;

        //*** Start Calculation for changing delivery address ***/
        order.adminCharge.baseCurrency_adminChargeFromDelivery =
            order_delivery_charge.dropFee;
        order.adminCharge.secondaryCurrency_adminChargeFromDelivery =
            order_delivery_charge.dropFee * order.adminExchangeRate;

        // const baseCurrency_totalAdminCharge =
        //     order.adminCharge.baseCurrency_totalAdminCharge +
        //     (order_delivery_charge.dropFee - order.orderDeliveryCharge.dropFee);
        // order.adminCharge.baseCurrency_totalAdminCharge =
        //     baseCurrency_totalAdminCharge;
        // order.adminCharge.secondaryCurrency_totalAdminCharge =
        //     baseCurrency_totalAdminCharge * order.adminExchangeRate;

        order.adminCharge.baseCurrency_totalAdminCharge =
            order.adminCharge.baseCurrency_adminChargeFromOrder +
            order.adminCharge.baseCurrency_adminChargeFromDelivery;
        order.adminCharge.secondaryCurrency_totalAdminCharge =
            order.adminCharge.secondaryCurrency_adminChargeFromOrder +
            order.adminCharge.secondaryCurrency_adminChargeFromDelivery;

        order.summary.baseCurrency_riderFee = order_delivery_charge.deliveryFee;
        order.summary.baseCurrency_riderFeeWithFreeDelivery =
            order_delivery_charge.deliveryFeeWithFreeDelivery;

        if (order.orderFor === 'specific') {
            const baseCurrency_shopEarnings =
                order.baseCurrency_shopEarnings +
                (order_delivery_charge.deliveryFee -
                    order.orderDeliveryCharge.deliveryFee);
            order.baseCurrency_shopEarnings = baseCurrency_shopEarnings;
            order.secondaryCurrency_shopEarnings =
                baseCurrency_shopEarnings * order.shopExchangeRate;

            order.summary.secondaryCurrency_riderFee =
                order_delivery_charge.deliveryFee * order.shopExchangeRate;

            order.summary.secondaryCurrency_riderFeeWithFreeDelivery =
                order_delivery_charge.deliveryFeeWithFreeDelivery *
                order.shopExchangeRate;
        } else {
            const baseCurrency_shopEarnings =
                order.baseCurrency_shopEarnings +
                (order.orderDeliveryCharge.shopCut -
                    order_delivery_charge.shopCut);
            order.baseCurrency_shopEarnings = baseCurrency_shopEarnings;
            order.secondaryCurrency_shopEarnings =
                baseCurrency_shopEarnings * order.shopExchangeRate;

            order.summary.secondaryCurrency_riderFee =
                order_delivery_charge.deliveryFee * order.adminExchangeRate;

            order.summary.secondaryCurrency_riderFeeWithFreeDelivery =
                order_delivery_charge.deliveryFeeWithFreeDelivery *
                order.adminExchangeRate;
        }

        order.summary.baseCurrency_totalAmount =
            order.summary.baseCurrency_productAmount +
            order.summary.baseCurrency_riderFee;
        order.summary.secondaryCurrency_totalAmount =
            order.summary.secondaryCurrency_productAmount +
            order.summary.secondaryCurrency_riderFee;

        const baseCurrency_riderFee =
            order.baseCurrency_riderFee +
            (order_delivery_charge.deliveryBoyFee -
                order.orderDeliveryCharge.deliveryBoyFee);
        order.baseCurrency_riderFee = baseCurrency_riderFee;
        order.secondaryCurrency_riderFee =
            baseCurrency_riderFee * order.adminExchangeRate;

        // Free delivery cut
        let freeDeliveryCut = {
            baseCurrency_freeDeliveryAdminCut: order_delivery_charge.dropCut,
            baseCurrency_dropLossForFreeDelivery:
                order_delivery_charge.dropLossForFreeDelivery,
            baseCurrency_freeDeliveryShopCut: order_delivery_charge.shopCut,
            baseCurrency_shopLossForFreeDelivery:
                order_delivery_charge.shopLossForFreeDelivery,
        };
        freeDeliveryCut = applyExchangeRateInOrderFreeDeliveryCut(
            freeDeliveryCut,
            order.shopExchangeRate,
            order.adminExchangeRate,
            order.shop
        );
        order.freeDeliveryCut = freeDeliveryCut;

        const deliveryFeeDiff =
            order_delivery_charge.deliveryFee -
            order.orderDeliveryCharge.deliveryFee;
        let secondaryCurrency_deliveryFeeDiff =
            deliveryFeeDiff * order.adminExchangeRate;
        if (order.orderFor === 'specific') {
            secondaryCurrency_deliveryFeeDiff =
                deliveryFeeDiff * order.shopExchangeRate;
        }

        // const appSetting = await AppSetting.findOne({});
        // const vat = appSetting?.vat || 0;

        // const totalVAT = (Math.abs(deliveryFeeDiff) * Number(vat)) / 100;
        // const secondaryCurrency_totalVAT =
        //     (Math.abs(secondaryCurrency_deliveryFeeDiff) * Number(vat)) / 100;

        if (deliveryFeeDiff > 0) {
            // order.summary.baseCurrency_vat =
            //     order.summary.baseCurrency_vat + totalVAT;
            // order.summary.secondaryCurrency_vat =
            //     order.summary.secondaryCurrency_vat +
            //     secondaryCurrency_totalVAT;

            if (order.paymentMethod === 'cash') {
                order.summary.baseCurrency_cash =
                    order.summary.baseCurrency_cash + deliveryFeeDiff;
                // + totalVAT;
                order.summary.secondaryCurrency_cash =
                    order.summary.secondaryCurrency_cash +
                    secondaryCurrency_deliveryFeeDiff;
                // + secondaryCurrency_totalVAT;
            } else if (order.paymentMethod === 'card') {
                order.summary.baseCurrency_card =
                    order.summary.baseCurrency_card + deliveryFeeDiff;
                // + totalVAT;
                order.summary.secondaryCurrency_card =
                    order.summary.secondaryCurrency_card +
                    secondaryCurrency_deliveryFeeDiff;
                // + secondaryCurrency_totalVAT;
            } else {
                order.summary.baseCurrency_wallet =
                    order.summary.baseCurrency_wallet + deliveryFeeDiff;
                // + totalVAT;
                order.summary.secondaryCurrency_wallet =
                    order.summary.secondaryCurrency_wallet +
                    secondaryCurrency_deliveryFeeDiff;
                // + secondaryCurrency_totalVAT;
            }
        } else if (deliveryFeeDiff < 0) {
            // order.summary.baseCurrency_vat =
            //     order.summary.baseCurrency_vat - totalVAT;
            // order.summary.secondaryCurrency_vat =
            //     order.summary.secondaryCurrency_vat -
            //     secondaryCurrency_totalVAT;

            if (order.summary.baseCurrency_cash >= Math.abs(deliveryFeeDiff)) {
                order.summary.baseCurrency_cash =
                    order.summary.baseCurrency_cash + deliveryFeeDiff;
                // - totalVAT;
                order.summary.secondaryCurrency_cash =
                    order.summary.secondaryCurrency_cash +
                    secondaryCurrency_deliveryFeeDiff;
                // - secondaryCurrency_totalVAT;
            } else if (
                order.summary.baseCurrency_card >= Math.abs(deliveryFeeDiff)
            ) {
                order.summary.baseCurrency_card =
                    order.summary.baseCurrency_card + deliveryFeeDiff;
                // - totalVAT;
                order.summary.secondaryCurrency_card =
                    order.summary.secondaryCurrency_card +
                    secondaryCurrency_deliveryFeeDiff;
                // - secondaryCurrency_totalVAT;
            } else {
                order.summary.baseCurrency_wallet =
                    order.summary.baseCurrency_wallet + deliveryFeeDiff;
                // - totalVAT;
                order.summary.secondaryCurrency_wallet =
                    order.summary.secondaryCurrency_wallet +
                    secondaryCurrency_deliveryFeeDiff;
                // - secondaryCurrency_totalVAT;
            }
        }

        order.orderDeliveryCharge = order_delivery_charge._id;

        // Calculate Vat
        // let vatAmount = {
        //     baseCurrency_vatForShop: 0,
        //     baseCurrency_vatForAdmin: 0,
        // };

        // if (order.summary.baseCurrency_vat > 0) {
        //     vatAmount.baseCurrency_vatForShop =
        //         (order.baseCurrency_shopEarnings * vat) / 100;

        //     if (
        //         vatAmount.baseCurrency_vatForShop >
        //         order.summary.baseCurrency_vat
        //     ) {
        //         vatAmount.baseCurrency_vatForShop =
        //             order.summary.baseCurrency_vat;
        //     }

        //     if (vatAmount.baseCurrency_vatForShop < 0) {
        //         vatAmount.baseCurrency_vatForShop = 0;
        //     }

        //     vatAmount.baseCurrency_vatForAdmin =
        //         order.summary.baseCurrency_vat -
        //         vatAmount.baseCurrency_vatForShop;
        // }

        // vatAmount = applyExchangeRateInOrderVatAmount(
        //     vatAmount,
        //     order.shopExchangeRate,
        //     order.adminExchangeRate,
        //     order.shop
        // );
        // order.vatAmount = vatAmount;

        await order.save();

        // Update Cart
        const cartDetails = await CartModel.findOne({
            _id: order.cart,
        });

        if (cartDetails) {
            const cartItem = cartDetails?.cartItems?.find(
                element => element.user.toString() === order.user._id.toString()
            );

            cartItem.summary.baseCurrency_riderFee =
                order.summary.baseCurrency_riderFee;
            cartItem.summary.secondaryCurrency_riderFee =
                order.summary.secondaryCurrency_riderFee;

            cartItem.summary.baseCurrency_totalAmount =
                cartItem.summary.baseCurrency_productAmount +
                cartItem.summary.baseCurrency_riderFee;
            cartItem.summary.secondaryCurrency_totalAmount =
                cartItem.summary.secondaryCurrency_productAmount +
                cartItem.summary.secondaryCurrency_riderFee;

            if (deliveryFeeDiff > 0) {
                // cartItem.summary.baseCurrency_vat =
                //     cartItem.summary.baseCurrency_vat + totalVAT;
                // cartItem.summary.secondaryCurrency_vat =
                //     cartItem.summary.secondaryCurrency_vat +
                //     secondaryCurrency_totalVAT;

                if (order.paymentMethod === 'cash') {
                    cartItem.summary.baseCurrency_cash =
                        cartItem.summary.baseCurrency_cash + deliveryFeeDiff;
                    // + totalVAT;
                    cartItem.summary.secondaryCurrency_cash =
                        cartItem.summary.secondaryCurrency_cash +
                        secondaryCurrency_deliveryFeeDiff;
                    // + secondaryCurrency_totalVAT;
                } else if (cartItem.paymentMethod === 'card') {
                    cartItem.summary.baseCurrency_card =
                        cartItem.summary.baseCurrency_card + deliveryFeeDiff;
                    // + totalVAT;
                    cartItem.summary.secondaryCurrency_card =
                        cartItem.summary.secondaryCurrency_card +
                        secondaryCurrency_deliveryFeeDiff;
                    // + secondaryCurrency_totalVAT;
                } else {
                    cartItem.summary.baseCurrency_wallet =
                        cartItem.summary.baseCurrency_wallet + deliveryFeeDiff;
                    // + totalVAT;
                    cartItem.summary.secondaryCurrency_wallet =
                        cartItem.summary.secondaryCurrency_wallet +
                        secondaryCurrency_deliveryFeeDiff;
                    // + secondaryCurrency_totalVAT;
                }
            } else if (deliveryFeeDiff < 0) {
                // cartItem.summary.baseCurrency_vat =
                //     cartItem.summary.baseCurrency_vat - totalVAT;
                // cartItem.summary.secondaryCurrency_vat =
                //     cartItem.summary.secondaryCurrency_vat -
                //     secondaryCurrency_totalVAT;

                if (
                    cartItem.summary.baseCurrency_cash >=
                    Math.abs(deliveryFeeDiff)
                ) {
                    cartItem.summary.baseCurrency_cash =
                        cartItem.summary.baseCurrency_cash + deliveryFeeDiff;
                    // - totalVAT;
                    cartItem.summary.secondaryCurrency_cash =
                        cartItem.summary.secondaryCurrency_cash +
                        secondaryCurrency_deliveryFeeDiff;
                    // - secondaryCurrency_totalVAT;
                } else if (
                    cartItem.summary.baseCurrency_card >=
                    Math.abs(deliveryFeeDiff)
                ) {
                    cartItem.summary.baseCurrency_card =
                        cartItem.summary.baseCurrency_card + deliveryFeeDiff;
                    // - totalVAT;
                    cartItem.summary.secondaryCurrency_card =
                        cartItem.summary.secondaryCurrency_card +
                        secondaryCurrency_deliveryFeeDiff;
                    // - secondaryCurrency_totalVAT;
                } else {
                    cartItem.summary.baseCurrency_wallet =
                        cartItem.summary.baseCurrency_wallet + deliveryFeeDiff;
                    // - totalVAT;
                    cartItem.summary.secondaryCurrency_wallet =
                        cartItem.summary.secondaryCurrency_wallet +
                        secondaryCurrency_deliveryFeeDiff;
                    // - secondaryCurrency_totalVAT;
                }
            }

            await cartDetails.save();
        }
        //*** End Calculation for changing delivery address ***/

        //*** Create trip summary start ***/
        let orderTripSummary;

        if (!order.deliveryBoy || order.orderFor === 'specific') {
            const { distance, duration, legs, overview_polyline } =
                await DistanceInfoGoogleWithWayPoints({
                    origin: {
                        latitude: order.shop.location.coordinates[1],
                        longitude: order.shop.location.coordinates[0],
                    },
                    destination: {
                        latitude: latitude,
                        longitude: longitude,
                    },
                    waypoints: [],
                });

            orderTripSummary = [
                {
                    name: order.shop.shopName,
                    address: order.shop.address.address,
                    latitude: order.shop.location.coordinates[1],
                    longitude: order.shop.location.coordinates[0],
                    type: 'shop',
                    shop: order.shop._id,
                    order: [order._id],
                    totalDistance: distance,
                    totalDuration: duration,
                    total_overview_polyline: overview_polyline,
                    distance: legs[0].distance,
                    duration: legs[0].duration,
                    overview_polyline: legs[0].overview_polyline,
                },
                {
                    name: order.user.name,
                    address: address,
                    latitude: latitude,
                    longitude: longitude,
                    type: 'user',
                    user: order.user._id,
                    order: [order._id],
                },
            ];

            await Order.findByIdAndUpdate(orderId, {
                $set: {
                    orderTripSummary: orderTripSummary,
                },
            });
        } else {
            const riderOngoingOrders = await Order.find({
                deliveryBoy: order.deliveryBoy._id,
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
                    populate: [
                        {
                            path: 'address',
                        },
                    ],
                },
                {
                    path: 'shop',
                },
                {
                    path: 'deliveryBoy',
                },
            ]);

            if (riderOngoingOrders.length && riderOngoingOrders.length < 2) {
                const { distance, duration, legs, overview_polyline } =
                    await DistanceInfoGoogleWithWayPoints({
                        origin: {
                            latitude: order.deliveryBoy.location.coordinates[1],
                            longitude:
                                order.deliveryBoy.location.coordinates[0],
                        },
                        destination: {
                            latitude: latitude,
                            longitude: longitude,
                        },
                        waypoints: [
                            {
                                latitude: order.shop.location.coordinates[1],
                                longitude: order.shop.location.coordinates[0],
                            },
                        ],
                    });

                orderTripSummary = [
                    {
                        name: order.deliveryBoy.name,
                        address: order.deliveryBoy.address,
                        latitude: order.deliveryBoy.location.coordinates[1],
                        longitude: order.deliveryBoy.location.coordinates[0],
                        type: 'rider',
                        deliveryBoy: order.deliveryBoy._id,
                        order: [order._id],
                        totalDistance: distance,
                        totalDuration: duration,
                        total_overview_polyline: overview_polyline,
                        distance: legs[0].distance,
                        duration: legs[0].duration,
                        overview_polyline: legs[0].overview_polyline,
                    },
                    {
                        name: order.shop.shopName,
                        address: order.shop.address.address,
                        latitude: order.shop.location.coordinates[1],
                        longitude: order.shop.location.coordinates[0],
                        type: 'shop',
                        shopType: order.shop.shopType,
                        shop: order.shop._id,
                        order: [order._id],
                        distance: legs[1].distance,
                        duration: legs[1].duration,
                        overview_polyline: legs[1].overview_polyline,
                    },
                    {
                        name: order.user.name,
                        address: address,
                        latitude: latitude,
                        longitude: longitude,
                        type: 'user',
                        user: order.user._id,
                        order: [order._id],
                    },
                ];

                await Order.findByIdAndUpdate(orderId, {
                    $set: {
                        orderTripSummary: orderTripSummary,
                    },
                });
            } else {
                const isRiderInDeliveredFirstDeliveryBoyList =
                    riderOngoingOrders[1]?.deliveredFirstDeliveryBoyList?.find(
                        riderId =>
                            riderId.toString() ===
                            riderOngoingOrders[1]?.deliveryBoy._id.toString()
                    );
                const isRiderInDeliveredSecondDeliveryBoyList =
                    riderOngoingOrders[1]?.deliveredSecondDeliveryBoyList?.find(
                        riderId =>
                            riderId.toString() ===
                            riderOngoingOrders[1]?.deliveryBoy._id.toString()
                    );

                if (
                    !isRiderInDeliveredFirstDeliveryBoyList &&
                    !isRiderInDeliveredSecondDeliveryBoyList
                ) {
                    // if (
                    //     riderOngoingOrders[0]?.shop._id.toString() ===
                    //         riderOngoingOrders[1]?.shop._id.toString() &&
                    //     riderOngoingOrders[0]?.dropOffLocation.address.toString() ===
                    //         riderOngoingOrders[1]?.dropOffLocation.address.toString()
                    // ) {
                    //     const { distance, duration, legs, overview_polyline } =
                    //         await DistanceInfoGoogleWithWayPoints({
                    //             origin: {
                    //                 latitude:
                    //                     riderOngoingOrders[1]?.deliveryBoy
                    //                         .location.coordinates[1],
                    //                 longitude:
                    //                     riderOngoingOrders[1]?.deliveryBoy
                    //                         .location.coordinates[0],
                    //             },
                    //             destination: {
                    //                 latitude:
                    //                     riderOngoingOrders[1]?.dropOffLocation
                    //                         .location.coordinates[1],
                    //                 longitude:
                    //                     riderOngoingOrders[1]?.dropOffLocation
                    //                         .location.coordinates[0],
                    //             },
                    //             waypoints: [
                    //                 {
                    //                     latitude:
                    //                         riderOngoingOrders[1]?.shop.location
                    //                             .coordinates[1],
                    //                     longitude:
                    //                         riderOngoingOrders[1]?.shop.location
                    //                             .coordinates[0],
                    //                 },
                    //             ],
                    //         });

                    //     orderTripSummary = [
                    //         {
                    //             name: riderOngoingOrders[1]?.deliveryBoy.name,
                    //             address:
                    //                 riderOngoingOrders[1]?.deliveryBoy.address,
                    //             latitude:
                    //                 riderOngoingOrders[1]?.deliveryBoy.location
                    //                     .coordinates[1],
                    //             longitude:
                    //                 riderOngoingOrders[1]?.deliveryBoy.location
                    //                     .coordinates[0],
                    //             type: 'rider',
                    //             deliveryBoy:
                    //                 riderOngoingOrders[1]?.deliveryBoy._id,
                    //             order: [
                    //                 riderOngoingOrders[0]?._id,
                    //                 riderOngoingOrders[1]?._id,
                    //             ],
                    //             totalDistance: distance,
                    //             totalDuration: duration,
                    //             total_overview_polyline: overview_polyline,
                    //             distance: legs[0].distance,
                    //             duration: legs[0].duration,
                    //             overview_polyline: legs[0].overview_polyline,
                    //         },
                    //         {
                    //             name: riderOngoingOrders[1]?.shop.shopName,
                    //             address:
                    //                 riderOngoingOrders[1]?.shop.address.address,
                    //             latitude:
                    //                 riderOngoingOrders[1]?.shop.location
                    //                     .coordinates[1],
                    //             longitude:
                    //                 riderOngoingOrders[1]?.shop.location
                    //                     .coordinates[0],
                    //             type: 'shop',
                    //             shopType: riderOngoingOrders[1]?.shop.shopType,
                    //             shop: riderOngoingOrders[1]?.shop._id,
                    //             order: [
                    //                 riderOngoingOrders[0]?._id,
                    //                 riderOngoingOrders[1]?._id,
                    //             ],
                    //             distance: legs[1].distance,
                    //             duration: legs[1].duration,
                    //             overview_polyline: legs[1].overview_polyline,
                    //         },
                    //         {
                    //             name: riderOngoingOrders[1]?.user.name,
                    //             address:
                    //                 riderOngoingOrders[1]?.dropOffLocation
                    //                     .address,
                    //             latitude:
                    //                 riderOngoingOrders[1]?.dropOffLocation
                    //                     .location.coordinates[1],
                    //             longitude:
                    //                 riderOngoingOrders[1]?.dropOffLocation
                    //                     .location.coordinates[0],
                    //             type: 'user',
                    //             user: riderOngoingOrders[1]?.user._id,
                    //             order: [
                    //                 riderOngoingOrders[0]?._id,
                    //                 riderOngoingOrders[1]?._id,
                    //             ],
                    //             twoOrdersContainInSameUser: true,
                    //         },
                    //     ];
                    // } else
                    if (
                        riderOngoingOrders[1]?.shop._id.toString() ===
                        riderOngoingOrders[0]?.shop._id.toString()
                    ) {
                        const { distance, duration, legs, overview_polyline } =
                            await DistanceInfoGoogleWithWayPoints({
                                origin: {
                                    latitude:
                                        riderOngoingOrders[1]?.deliveryBoy
                                            .location.coordinates[1],
                                    longitude:
                                        riderOngoingOrders[1]?.deliveryBoy
                                            .location.coordinates[0],
                                },
                                destination: {
                                    latitude:
                                        riderOngoingOrders[1]?.dropOffLocation
                                            .location.coordinates[1],
                                    longitude:
                                        riderOngoingOrders[1]?.dropOffLocation
                                            .location.coordinates[0],
                                },
                                waypoints: [
                                    {
                                        latitude:
                                            riderOngoingOrders[1]?.shop.location
                                                .coordinates[1],
                                        longitude:
                                            riderOngoingOrders[1]?.shop.location
                                                .coordinates[0],
                                    },
                                    {
                                        latitude:
                                            riderOngoingOrders[0]
                                                ?.dropOffLocation.location
                                                .coordinates[1],
                                        longitude:
                                            riderOngoingOrders[0]
                                                ?.dropOffLocation.location
                                                .coordinates[0],
                                    },
                                ],
                            });

                        orderTripSummary = [
                            {
                                name: riderOngoingOrders[1]?.deliveryBoy.name,
                                address:
                                    riderOngoingOrders[1]?.deliveryBoy.address,
                                latitude:
                                    riderOngoingOrders[1]?.deliveryBoy.location
                                        .coordinates[1],
                                longitude:
                                    riderOngoingOrders[1]?.deliveryBoy.location
                                        .coordinates[0],
                                type: 'rider',
                                deliveryBoy:
                                    riderOngoingOrders[1]?.deliveryBoy._id,
                                order: [
                                    riderOngoingOrders[0]?._id,
                                    riderOngoingOrders[1]?._id,
                                ],
                                totalDistance: distance,
                                totalDuration: duration,
                                total_overview_polyline: overview_polyline,
                                distance: legs[0].distance,
                                duration: legs[0].duration,
                                overview_polyline: legs[0].overview_polyline,
                            },
                            {
                                name: riderOngoingOrders[1]?.shop.shopName,
                                address:
                                    riderOngoingOrders[1]?.shop.address.address,
                                latitude:
                                    riderOngoingOrders[1]?.shop.location
                                        .coordinates[1],
                                longitude:
                                    riderOngoingOrders[1]?.shop.location
                                        .coordinates[0],
                                type: 'shop',
                                shopType: riderOngoingOrders[1]?.shop.shopType,
                                shop: riderOngoingOrders[1]?.shop._id,
                                order: [
                                    riderOngoingOrders[0]?._id,
                                    riderOngoingOrders[1]?._id,
                                ],
                                distance: legs[1].distance,
                                duration: legs[1].duration,
                                overview_polyline: legs[1].overview_polyline,
                            },
                            {
                                name: riderOngoingOrders[0]?.user.name,
                                address:
                                    riderOngoingOrders[0]?.dropOffLocation
                                        .address,
                                latitude:
                                    riderOngoingOrders[0]?.dropOffLocation
                                        .location.coordinates[1],
                                longitude:
                                    riderOngoingOrders[0]?.dropOffLocation
                                        .location.coordinates[0],
                                type: 'user',
                                user: riderOngoingOrders[0]?.user._id,
                                order: [riderOngoingOrders[0]?._id],
                                distance: legs[2].distance,
                                duration: legs[2].duration,
                                overview_polyline: legs[2].overview_polyline,
                            },
                            {
                                name: riderOngoingOrders[1]?.user.name,
                                address:
                                    riderOngoingOrders[1]?.dropOffLocation
                                        .address,
                                latitude:
                                    riderOngoingOrders[1]?.dropOffLocation
                                        .location.coordinates[1],
                                longitude:
                                    riderOngoingOrders[1]?.dropOffLocation
                                        .location.coordinates[0],
                                type: 'user',
                                user: riderOngoingOrders[1]?.user._id,
                                order: [riderOngoingOrders[1]?._id],
                            },
                        ];
                    }
                    // else if (
                    //     riderOngoingOrders[0]?.dropOffLocation.address.toString() ===
                    //     riderOngoingOrders[1]?.dropOffLocation.address.toString()
                    // ) {
                    //     const { distance, duration, legs, overview_polyline } =
                    //         await DistanceInfoGoogleWithWayPoints({
                    //             origin: {
                    //                 latitude:
                    //                     riderOngoingOrders[1]?.deliveryBoy
                    //                         .location.coordinates[1],
                    //                 longitude:
                    //                     riderOngoingOrders[1]?.deliveryBoy
                    //                         .location.coordinates[0],
                    //             },
                    //             destination: {
                    //                 latitude:
                    //                     riderOngoingOrders[1]?.dropOffLocation
                    //                         .location.coordinates[1],
                    //                 longitude:
                    //                     riderOngoingOrders[1]?.dropOffLocation
                    //                         .location.coordinates[0],
                    //             },
                    //             waypoints: [
                    //                 {
                    //                     latitude:
                    //                         riderOngoingOrders[0]?.shop.location
                    //                             .coordinates[1],
                    //                     longitude:
                    //                         riderOngoingOrders[0]?.shop.location
                    //                             .coordinates[0],
                    //                 },
                    //                 {
                    //                     latitude:
                    //                         riderOngoingOrders[1]?.shop.location
                    //                             .coordinates[1],
                    //                     longitude:
                    //                         riderOngoingOrders[1]?.shop.location
                    //                             .coordinates[0],
                    //                 },
                    //             ],
                    //         });

                    //     orderTripSummary = [
                    //         {
                    //             name: riderOngoingOrders[1]?.deliveryBoy.name,
                    //             address:
                    //                 riderOngoingOrders[1]?.deliveryBoy.address,
                    //             latitude:
                    //                 riderOngoingOrders[1]?.deliveryBoy.location
                    //                     .coordinates[1],
                    //             longitude:
                    //                 riderOngoingOrders[1]?.deliveryBoy.location
                    //                     .coordinates[0],
                    //             type: 'rider',
                    //             deliveryBoy:
                    //                 riderOngoingOrders[1]?.deliveryBoy._id,
                    //             order: [
                    //                 riderOngoingOrders[0]?._id,
                    //                 riderOngoingOrders[1]?._id,
                    //             ],
                    //             totalDistance: distance,
                    //             totalDuration: duration,
                    //             total_overview_polyline: overview_polyline,
                    //             distance: legs[0].distance,
                    //             duration: legs[0].duration,
                    //             overview_polyline: legs[0].overview_polyline,
                    //         },
                    //         {
                    //             name: riderOngoingOrders[0]?.shop.shopName,
                    //             address:
                    //                 riderOngoingOrders[0]?.shop.address.address,
                    //             latitude:
                    //                 riderOngoingOrders[0]?.shop.location
                    //                     .coordinates[1],
                    //             longitude:
                    //                 riderOngoingOrders[0]?.shop.location
                    //                     .coordinates[0],
                    //             type: 'shop',
                    //             shopType: riderOngoingOrders[0]?.shop.shopType,
                    //             shop: riderOngoingOrders[0]?.shop._id,
                    //             order: [riderOngoingOrders[0]?._id],
                    //             distance: legs[1].distance,
                    //             duration: legs[1].duration,
                    //             overview_polyline: legs[1].overview_polyline,
                    //         },
                    //         {
                    //             name: riderOngoingOrders[1]?.shop.shopName,
                    //             address:
                    //                 riderOngoingOrders[1]?.shop.address.address,
                    //             latitude:
                    //                 riderOngoingOrders[1]?.shop.location
                    //                     .coordinates[1],
                    //             longitude:
                    //                 riderOngoingOrders[1]?.shop.location
                    //                     .coordinates[0],
                    //             type: 'shop',
                    //             shopType: riderOngoingOrders[1]?.shop.shopType,
                    //             shop: [riderOngoingOrders[1]?.shop._id],
                    //             order: riderOngoingOrders[1]?._id,
                    //             distance: legs[2].distance,
                    //             duration: legs[2].duration,
                    //             overview_polyline: legs[2].overview_polyline,
                    //         },
                    //         {
                    //             name: riderOngoingOrders[1]?.user.name,
                    //             address:
                    //                 riderOngoingOrders[1]?.dropOffLocation
                    //                     .address,
                    //             latitude:
                    //                 riderOngoingOrders[1]?.dropOffLocation
                    //                     .location.coordinates[1],
                    //             longitude:
                    //                 riderOngoingOrders[1]?.dropOffLocation
                    //                     .location.coordinates[0],
                    //             type: 'user',
                    //             user: riderOngoingOrders[1]?.user._id,
                    //             order: [
                    //                 riderOngoingOrders[0]?._id,
                    //                 riderOngoingOrders[1]?._id,
                    //             ],
                    //             twoOrdersContainInSameUser: true,
                    //         },
                    //     ];
                    // }
                    else {
                        const { distance, duration, legs, overview_polyline } =
                            await DistanceInfoGoogleWithWayPoints({
                                origin: {
                                    latitude:
                                        riderOngoingOrders[1]?.deliveryBoy
                                            .location.coordinates[1],
                                    longitude:
                                        riderOngoingOrders[1]?.deliveryBoy
                                            .location.coordinates[0],
                                },
                                destination: {
                                    latitude:
                                        riderOngoingOrders[1]?.dropOffLocation
                                            .location.coordinates[1],
                                    longitude:
                                        riderOngoingOrders[1]?.dropOffLocation
                                            .location.coordinates[0],
                                },
                                waypoints: [
                                    {
                                        latitude:
                                            riderOngoingOrders[0]?.shop.location
                                                .coordinates[1],
                                        longitude:
                                            riderOngoingOrders[0]?.shop.location
                                                .coordinates[0],
                                    },
                                    {
                                        latitude:
                                            riderOngoingOrders[1]?.shop.location
                                                .coordinates[1],
                                        longitude:
                                            riderOngoingOrders[1]?.shop.location
                                                .coordinates[0],
                                    },
                                    {
                                        latitude:
                                            riderOngoingOrders[0]
                                                ?.dropOffLocation.location
                                                .coordinates[1],
                                        longitude:
                                            riderOngoingOrders[0]
                                                ?.dropOffLocation.location
                                                .coordinates[0],
                                    },
                                ],
                            });

                        orderTripSummary = [
                            {
                                name: riderOngoingOrders[1]?.deliveryBoy.name,
                                address:
                                    riderOngoingOrders[1]?.deliveryBoy.address,
                                latitude:
                                    riderOngoingOrders[1]?.deliveryBoy.location
                                        .coordinates[1],
                                longitude:
                                    riderOngoingOrders[1]?.deliveryBoy.location
                                        .coordinates[0],
                                type: 'rider',
                                deliveryBoy:
                                    riderOngoingOrders[1]?.deliveryBoy._id,
                                order: [
                                    riderOngoingOrders[0]?._id,
                                    riderOngoingOrders[1]?._id,
                                ],
                                totalDistance: distance,
                                totalDuration: duration,
                                total_overview_polyline: overview_polyline,
                                distance: legs[0].distance,
                                duration: legs[0].duration,
                                overview_polyline: legs[0].overview_polyline,
                            },
                            {
                                name: riderOngoingOrders[0]?.shop.shopName,
                                address:
                                    riderOngoingOrders[0]?.shop.address.address,
                                latitude:
                                    riderOngoingOrders[0]?.shop.location
                                        .coordinates[1],
                                longitude:
                                    riderOngoingOrders[0]?.shop.location
                                        .coordinates[0],
                                type: 'shop',
                                shopType: riderOngoingOrders[0]?.shop.shopType,
                                shop: riderOngoingOrders[0]?.shop._id,
                                order: [riderOngoingOrders[0]?._id],
                                distance: legs[1].distance,
                                duration: legs[1].duration,
                                overview_polyline: legs[1].overview_polyline,
                            },
                            {
                                name: riderOngoingOrders[1]?.shop.shopName,
                                address:
                                    riderOngoingOrders[1]?.shop.address.address,
                                latitude:
                                    riderOngoingOrders[1]?.shop.location
                                        .coordinates[1],
                                longitude:
                                    riderOngoingOrders[1]?.shop.location
                                        .coordinates[0],
                                type: 'shop',
                                shopType: riderOngoingOrders[1]?.shop.shopType,
                                shop: riderOngoingOrders[1]?.shop._id,
                                order: [riderOngoingOrders[1]?._id],
                                distance: legs[2].distance,
                                duration: legs[2].duration,
                                overview_polyline: legs[2].overview_polyline,
                            },
                            {
                                name: riderOngoingOrders[0]?.user.name,
                                address:
                                    riderOngoingOrders[0]?.dropOffLocation
                                        .address,
                                latitude:
                                    riderOngoingOrders[0]?.dropOffLocation
                                        .location.coordinates[1],
                                longitude:
                                    riderOngoingOrders[0]?.dropOffLocation
                                        .location.coordinates[0],
                                type: 'user',
                                user: riderOngoingOrders[0]?.user._id,
                                order: [riderOngoingOrders[0]?._id],
                                distance: legs[3].distance,
                                duration: legs[3].duration,
                                overview_polyline: legs[3].overview_polyline,
                            },
                            {
                                name: riderOngoingOrders[1]?.user.name,
                                address:
                                    riderOngoingOrders[1]?.dropOffLocation
                                        .address,
                                latitude:
                                    riderOngoingOrders[1]?.dropOffLocation
                                        .location.coordinates[1],
                                longitude:
                                    riderOngoingOrders[1]?.dropOffLocation
                                        .location.coordinates[0],
                                type: 'user',
                                user: riderOngoingOrders[1]?.user._id,
                                order: [riderOngoingOrders[1]?._id],
                            },
                        ];
                    }
                } else if (isRiderInDeliveredFirstDeliveryBoyList) {
                    const { distance, duration, legs, overview_polyline } =
                        await DistanceInfoGoogleWithWayPoints({
                            origin: {
                                latitude:
                                    riderOngoingOrders[1]?.deliveryBoy.location
                                        .coordinates[1],
                                longitude:
                                    riderOngoingOrders[1]?.deliveryBoy.location
                                        .coordinates[0],
                            },
                            destination: {
                                latitude:
                                    riderOngoingOrders[1]?.dropOffLocation
                                        .location.coordinates[1],
                                longitude:
                                    riderOngoingOrders[1]?.dropOffLocation
                                        .location.coordinates[0],
                            },
                            waypoints: [
                                {
                                    latitude:
                                        riderOngoingOrders[0]?.shop.location
                                            .coordinates[1],
                                    longitude:
                                        riderOngoingOrders[0]?.shop.location
                                            .coordinates[0],
                                },
                                {
                                    latitude:
                                        riderOngoingOrders[0]?.dropOffLocation
                                            .location.coordinates[1],
                                    longitude:
                                        riderOngoingOrders[0]?.dropOffLocation
                                            .location.coordinates[0],
                                },
                                {
                                    latitude:
                                        riderOngoingOrders[1]?.shop.location
                                            .coordinates[1],
                                    longitude:
                                        riderOngoingOrders[1]?.shop.location
                                            .coordinates[0],
                                },
                            ],
                        });

                    orderTripSummary = [
                        {
                            name: riderOngoingOrders[1]?.deliveryBoy.name,
                            address: riderOngoingOrders[1]?.deliveryBoy.address,
                            latitude:
                                riderOngoingOrders[1]?.deliveryBoy.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[1]?.deliveryBoy.location
                                    .coordinates[0],
                            type: 'rider',
                            deliveryBoy: riderOngoingOrders[1]?.deliveryBoy._id,
                            order: [
                                riderOngoingOrders[0]?._id,
                                riderOngoingOrders[1]?._id,
                            ],
                            totalDistance: distance,
                            totalDuration: duration,
                            total_overview_polyline: overview_polyline,
                            distance: legs[0].distance,
                            duration: legs[0].duration,
                            overview_polyline: legs[0].overview_polyline,
                        },
                        {
                            name: riderOngoingOrders[0]?.shop.shopName,
                            address:
                                riderOngoingOrders[0]?.shop.address.address,
                            latitude:
                                riderOngoingOrders[0]?.shop.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[0]?.shop.location
                                    .coordinates[0],
                            type: 'shop',
                            shopType: riderOngoingOrders[0]?.shop.shopType,
                            shop: riderOngoingOrders[0]?.shop._id,
                            order: [riderOngoingOrders[0]?._id],
                            distance: legs[1].distance,
                            duration: legs[1].duration,
                            overview_polyline: legs[1].overview_polyline,
                        },
                        {
                            name: riderOngoingOrders[0]?.user.name,
                            address:
                                riderOngoingOrders[0]?.dropOffLocation.address,
                            latitude:
                                riderOngoingOrders[0]?.dropOffLocation.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[0]?.dropOffLocation.location
                                    .coordinates[0],
                            type: 'user',
                            user: riderOngoingOrders[0]?.user._id,
                            order: [riderOngoingOrders[0]?._id],
                            distance: legs[2].distance,
                            duration: legs[2].duration,
                            overview_polyline: legs[2].overview_polyline,
                        },
                        {
                            name: riderOngoingOrders[1]?.shop.shopName,
                            address:
                                riderOngoingOrders[1]?.shop.address.address,
                            latitude:
                                riderOngoingOrders[1]?.shop.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[1]?.shop.location
                                    .coordinates[0],
                            type: 'shop',
                            shopType: riderOngoingOrders[1]?.shop.shopType,
                            shop: riderOngoingOrders[1]?.shop._id,
                            order: [riderOngoingOrders[1]?._id],
                            distance: legs[3].distance,
                            duration: legs[3].duration,
                            overview_polyline: legs[3].overview_polyline,
                        },
                        {
                            name: riderOngoingOrders[1]?.user.name,
                            address:
                                riderOngoingOrders[1]?.dropOffLocation.address,
                            latitude:
                                riderOngoingOrders[1]?.dropOffLocation.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[1]?.dropOffLocation.location
                                    .coordinates[0],
                            type: 'user',
                            user: riderOngoingOrders[1]?.user._id,
                            order: [riderOngoingOrders[1]?._id],
                        },
                    ];
                } else if (isRiderInDeliveredSecondDeliveryBoyList) {
                    const { distance, duration, legs, overview_polyline } =
                        await DistanceInfoGoogleWithWayPoints({
                            origin: {
                                latitude:
                                    riderOngoingOrders[1]?.deliveryBoy.location
                                        .coordinates[1],
                                longitude:
                                    riderOngoingOrders[1]?.deliveryBoy.location
                                        .coordinates[0],
                            },
                            destination: {
                                latitude:
                                    riderOngoingOrders[0]?.dropOffLocation
                                        .location.coordinates[1],
                                longitude:
                                    riderOngoingOrders[0]?.dropOffLocation
                                        .location.coordinates[0],
                            },
                            waypoints: [
                                {
                                    latitude:
                                        riderOngoingOrders[1]?.shop.location
                                            .coordinates[1],
                                    longitude:
                                        riderOngoingOrders[1]?.shop.location
                                            .coordinates[0],
                                },
                                {
                                    latitude:
                                        riderOngoingOrders[1]?.dropOffLocation
                                            .location.coordinates[1],
                                    longitude:
                                        riderOngoingOrders[1]?.dropOffLocation
                                            .location.coordinates[0],
                                },
                                {
                                    latitude:
                                        riderOngoingOrders[0]?.shop.location
                                            .coordinates[1],
                                    longitude:
                                        riderOngoingOrders[0]?.shop.location
                                            .coordinates[0],
                                },
                            ],
                        });

                    orderTripSummary = [
                        {
                            name: riderOngoingOrders[1]?.deliveryBoy.name,
                            address: riderOngoingOrders[1]?.deliveryBoy.address,
                            latitude:
                                riderOngoingOrders[1]?.deliveryBoy.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[1]?.deliveryBoy.location
                                    .coordinates[0],
                            type: 'rider',
                            deliveryBoy: riderOngoingOrders[1]?.deliveryBoy._id,
                            order: [
                                riderOngoingOrders[1]?._id,
                                riderOngoingOrders[0]?._id,
                            ],
                            totalDistance: distance,
                            totalDuration: duration,
                            total_overview_polyline: overview_polyline,
                            distance: legs[0].distance,
                            duration: legs[0].duration,
                            overview_polyline: legs[0].overview_polyline,
                        },
                        {
                            name: riderOngoingOrders[1]?.shop.shopName,
                            address:
                                riderOngoingOrders[1]?.shop.address.address,
                            latitude:
                                riderOngoingOrders[1]?.shop.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[1]?.shop.location
                                    .coordinates[0],
                            type: 'shop',
                            shopType: riderOngoingOrders[1]?.shop.shopType,
                            shop: riderOngoingOrders[1]?.shop._id,
                            order: [riderOngoingOrders[1]?._id],
                            distance: legs[1].distance,
                            duration: legs[1].duration,
                            overview_polyline: legs[1].overview_polyline,
                        },
                        {
                            name: riderOngoingOrders[1]?.user.name,
                            address:
                                riderOngoingOrders[1]?.dropOffLocation.address,
                            latitude:
                                riderOngoingOrders[1]?.dropOffLocation.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[1]?.dropOffLocation.location
                                    .coordinates[0],
                            type: 'user',
                            user: riderOngoingOrders[1]?.user._id,
                            order: [riderOngoingOrders[1]?._id],
                            distance: legs[2].distance,
                            duration: legs[2].duration,
                            overview_polyline: legs[2].overview_polyline,
                        },
                        {
                            name: riderOngoingOrders[0]?.shop.shopName,
                            address:
                                riderOngoingOrders[0]?.shop.address.address,
                            latitude:
                                riderOngoingOrders[0]?.shop.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[0]?.shop.location
                                    .coordinates[0],
                            type: 'shop',
                            shopType: riderOngoingOrders[0]?.shop.shopType,
                            shop: riderOngoingOrders[0]?.shop._id,
                            order: [riderOngoingOrders[0]?._id],
                            distance: legs[3].distance,
                            duration: legs[3].duration,
                            overview_polyline: legs[3].overview_polyline,
                        },
                        {
                            name: riderOngoingOrders[0]?.user.name,
                            address:
                                riderOngoingOrders[0]?.dropOffLocation.address,
                            latitude:
                                riderOngoingOrders[0]?.dropOffLocation.location
                                    .coordinates[1],
                            longitude:
                                riderOngoingOrders[0]?.dropOffLocation.location
                                    .coordinates[0],
                            type: 'user',
                            user: riderOngoingOrders[0]?.user._id,
                            order: [riderOngoingOrders[0]?._id],
                        },
                    ];
                }

                const riderOngoingOrdersId = riderOngoingOrders.map(order =>
                    order._id.toString()
                );
                await Order.updateMany(
                    { _id: { $in: riderOngoingOrdersId } },
                    {
                        $set: {
                            orderTripSummary: orderTripSummary,
                        },
                    }
                );
            }
        }
        //*** Create trip summary end ***/

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsDeliveryAddressUpdated(updatedOrder);

        return successResponse(res, {
            message: 'Order delivery address Updated',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

// Replacement order feature
exports.deliveryManPickReplacementItem = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const { orderId } = req.body;

        // order timeline update
        const order = await Order.findOne({ _id: orderId });

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (deliveryBoyId != order.deliveryBoy) {
            return errorResponse(
                res,
                'you are not allowed to pick this replacement item'
            );
        }

        const { sta, message } = await pickReplacementItemWork(order);

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(updatedOrder);

        res.status(200).json({
            status: true,
            message: 'Replacement item Picked successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

exports.shopPickReplacementItem = async (req, res) => {
    try {
        const shopId = req.shopId;

        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (shopId != String(order.shop)) {
            return errorResponse(res, 'Shop does not have access this order.');
        }

        if (order.orderFor !== 'specific') {
            return errorResponse(
                res,
                'Shop does not have access to pick this replacement item.'
            );
        }

        const { sta, message } = await pickReplacementItemWork(order);

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(updatedOrder);

        return res.json({
            message: 'Replacement item Picked successfully',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const pickReplacementItemWork = async order => {
    try {
        if (order.orderStatus !== 'order_on_the_way') {
            if (
                ['delivered', 'refused', 'cancelled'].includes(
                    order.orderStatus
                )
            ) {
                return {
                    sta: false,
                    message: `Order has already been ${order?.orderStatus}`,
                };
            } else {
                return {
                    sta: false,
                    message: `Please wait until order_on_the_way`,
                };
            }
        }

        if (!order.isReplacementOrder) {
            return {
                sta: false,
                message: 'this order is not replacement order',
            };
        }

        if (order.isReplacementItemPickFromUser) {
            return {
                sta: false,
                message: 'this replacement item is already picked',
            };
        }

        if (
            order.replacementOrderDeliveryInfo.deliveryType !==
            'shop-customer-shop'
        ) {
            return {
                sta: false,
                message:
                    'this replacement order type is not shop-customer-shop',
            };
        }

        let newTimeline = order.timeline;
        const replacementItemTimeline = newTimeline.find(
            timeline => timeline.status === 'replacement_item_on_the_way'
        );
        replacementItemTimeline.active = true;
        replacementItemTimeline.createdAt = new Date();

        await Order.updateOne(
            { _id: order._id },
            {
                $set: {
                    isReplacementItemPickFromUser: true,
                    timeline: newTimeline,
                },
                $push: {
                    orderActivity: {
                        note: 'Replacement Order drop-off and pickup',
                        activityBy:
                            order.orderFor === 'specific'
                                ? 'shop'
                                : 'deliveryBoy',
                        deliveryBoy:
                            order.orderFor !== 'specific'
                                ? order.deliveryBoy
                                : undefined,
                        shop:
                            order.orderFor === 'specific'
                                ? order.shop
                                : undefined,
                        createdAt: new Date(),
                    },
                },
            }
        );

        return {
            sta: true,
            message: 'Order updated',
        };
    } catch (error) {
        return {
            sta: false,
            message: error.message,
        };
    }
};

// For adjustment order feature
exports.adjustOrderRequestFromShopApp = async (req, res) => {
    try {
        const {
            orderId,
            suggestedProducts,
            replacedProducts,
            adjustmentReason,
        } = req.body;

        const order = await Order.findOne({ _id: orderId });

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (
            [
                'ready_to_pickup',
                'order_on_the_way',
                'delivered',
                'refused',
                'cancelled',
            ].includes(order.orderStatus)
        ) {
            return errorResponse(
                res,
                `Order has already been ${order?.orderStatus}`
            );
        }

        if (order.isReplacementOrder) {
            return errorResponse(res, `You can't adjust replacement order.`);
        }

        if (order.users.length > 1) {
            return errorResponse(res, `You can't adjust group order.`);
        }

        const adjustOrderData = {
            user: order.user,
            shop: order.shop,
            seller: order.seller,
            order: order._id,
            status: 'pending',
            adjustedBy: 'shop',
            suggestedProducts,
            replacedProducts,
            adjustmentReason,
        };

        const adjustedOrder = await AdjustOrderRequest.create(adjustOrderData);

        order.adjustOrderRequest = adjustedOrder._id;
        order.adjustOrderRequestAt = new Date();
        await order.save();

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAdjustOrder(
            updatedOrder,
            'shop',
            adjustmentReason
        );

        return successResponse(res, {
            message: 'Successfully created adjustment order request',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.cancelAdjustOrderByUser = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId } = req.body;

        const order = await Order.findById(orderId).populate([
            {
                path: 'products',
                populate: [
                    {
                        path: 'product',
                    },
                    {
                        path: 'addons.product',
                    },
                ],
            },
        ]);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (order.user.toString() !== userId.toString()) {
            return errorResponse(res, 'You are not a valid user');
        }

        if (!['preparing'].includes(order.orderStatus)) {
            return errorResponse(res, "You Can't Cancel this Order");
        }

        if (order.adjustOrderRequestAt === null) {
            return errorResponse(res, 'This order is not adjustment order.');
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

        const cancelObject = getCancelObject({
            canceledBy: 'user',
            userId: order.user,
            otherReason:
                'User canceled adjustment order for unavailable product.',
        });
        await OrderModel.updateOne(
            { _id: orderId },
            {
                $set: {
                    productsDetails: [],
                    summary: {
                        baseCurrency_productAmount: 0,
                        secondaryCurrency_productAmount: 0,
                        baseCurrency_riderFee: 0,
                        secondaryCurrency_riderFee: 0,
                        baseCurrency_totalAmount: 0,
                        secondaryCurrency_totalAmount: 0,
                        baseCurrency_discount: 0,
                        secondaryCurrency_discount: 0,
                        baseCurrency_vat: 0,
                        secondaryCurrency_vat: 0,
                        baseCurrency_wallet: 0,
                        secondaryCurrency_wallet: 0,
                        baseCurrency_card: 0,
                        secondaryCurrency_card: 0,
                        baseCurrency_cash: 0,
                        secondaryCurrency_cash: 0,
                        reward: {
                            points: 0,
                            baseCurrency_amount: 0,
                            secondaryCurrency_amount: 0,
                        },
                        baseCurrency_doubleMenuItemPrice: 0,
                        secondaryCurrency_doubleMenuItemPrice: 0,
                        baseCurrency_riderTip: 0,
                        secondaryCurrency_riderTip: 0,
                        baseCurrency_couponDiscountAmount: 0,
                        secondaryCurrency_couponDiscountAmount: 0,
                        baseCurrency_punchMarketingDiscountAmount: 0,
                        secondaryCurrency_punchMarketingDiscountAmount: 0,
                        baseCurrency_riderFeeWithFreeDelivery: 0,
                        secondaryCurrency_riderFeeWithFreeDelivery: 0,
                    },
                },
            }
        );
        await OrderCancel({
            orderId: order._id,
            cancelObject,
        });

        // Check shop order capacity
        await checkShopCapacity(order.shop);

        const updatedOrder = await getFullOrderInformation(order._id);

        return successResponse(res, {
            message: 'Order cancelled successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.adjustOrderFromUser = async (req, res) => {
    try {
        const { orderId, adjustmentReason } = req.body;

        const order = await Order.findOne({ _id: orderId });

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (
            [
                'ready_to_pickup',
                'order_on_the_way',
                'delivered',
                'refused',
                'cancelled',
            ].includes(order.orderStatus)
        ) {
            return errorResponse(
                res,
                `Order has already been ${order?.orderStatus}`
            );
        }

        if (order.isReplacementOrder) {
            return errorResponse(res, `You can't adjust replacement order.`);
        }

        if (order.users.length > 1) {
            return errorResponse(res, `You can't adjust group order.`);
        }

        await adjustOrderFunc(req, order);

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAdjustOrder(
            updatedOrder,
            'user',
            adjustmentReason
        );

        await notifyForAdjustOrder(updatedOrder);

        return successResponse(res, {
            message: 'Successfully order adjusted',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.adjustOrderFromAdmin = async (req, res) => {
    try {
        const { orderId, adjustmentReason, products } = req.body;

        const order = await Order.findOne({ _id: orderId });

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (
            [
                'ready_to_pickup',
                'order_on_the_way',
                'delivered',
                'refused',
                'cancelled',
            ].includes(order.orderStatus)
        ) {
            return errorResponse(res, `Order already ${order.orderStatus}`);
        }

        if (order.isReplacementOrder) {
            return errorResponse(res, `You can't adjust replacement order.`);
        }

        if (order.users.length > 1) {
            return errorResponse(res, `You can't adjust group order.`);
        }

        const productsId = products.map(item => item.product.toString());
        const replacedProducts = order.products.filter(
            item => !productsId.includes(item.product.toString())
        );
        // Create adjust order object for track old order
        const adjustOrderData = {
            user: order.user,
            shop: order.shop,
            seller: order.seller,
            order: order._id,
            status: 'accepted',
            adjustedBy: 'admin',
            replacedProducts,
            adjustmentReason,
        };

        const adjustedOrder = await AdjustOrderRequest.create(adjustOrderData);

        order.adjustOrderRequest = adjustedOrder._id;
        order.adjustOrderRequestAt = new Date();
        const newOrder = await order.save();

        await adjustOrderFunc(req, newOrder);

        const updatedOrder = await getFullOrderInformation(order._id);

        await sendNotificationsAdjustOrder(
            updatedOrder,
            'admin',
            adjustmentReason
        );

        await notifyForAdjustOrder(updatedOrder);

        return successResponse(res, {
            message: 'Successfully order adjusted',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

const adjustOrderFunc = async (req, order) => {
    let { products, summary } = req.body;

    const shopExchangeRate = order.shopExchangeRate;
    const adminExchangeRate = order.adminExchangeRate;

    // Find User Info
    const userInfo = await UserModel.findOne({
        _id: order.user,
    });
    const subscribedUser = userInfo.isSubscribed;

    //Get all ordered products
    let productList = products.map(item => item.product);

    // get all selected product original information
    const productListData = await Product.find({
        _id: { $in: productList },
    }).populate([
        {
            path: 'marketing',
        },
        {
            path: 'category',
        },
        {
            path: 'subCategory',
        },
        {
            path: 'shop',
            populate: 'marketings',
            select: '-products',
        },
        {
            path: 'seller',
        },
        {
            path: 'addons',
            populate: [
                {
                    path: 'marketing',
                },
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    select: '-products',
                },
                {
                    path: 'seller',
                },
            ],
        },
    ]);

    let productsInfo = productListData;

    // validate actual product info and set final product list
    let finalProductList = [];
    let totalShopDiscount = 0;
    let totalAdminDiscount = 0;
    let subscriptionDiscount = 0;

    for (let element of products) {
        // original product information
        const product = productsInfo.find(item => item._id == element.product);
        if (!subscribedUser) {
            await checkPlusUserProductMarketing(product);
        }
        // collect all information of single product
        const quantity = element.quantity;
        const perProductPrice = Number(element.perProduct);
        const discountPerProduct = element.discount;
        const totalProductAmount = element.totalProductAmount;
        const totalDiscount_ = element.totalDiscount;
        const selectedAttributesList = [];

        if (element.attributes.length > 0) {
            for (let singleAttr of element.attributes) {
                // original single attribute information
                const selectedAttributeInfo = product.attributes.find(
                    item => item._id == singleAttr.id
                );
                const selectedItemsInfo = [];
                for (let item of singleAttr.attributeItems) {
                    const selectedItemInfo = selectedAttributeInfo.items.find(
                        i => i._id == item.id
                    );
                    selectedItemsInfo.push(selectedItemInfo);
                }
                selectedAttributesList.push({
                    ...singleAttr,
                    data: selectedAttributeInfo._doc,
                    selectedItems: selectedItemsInfo,
                });
            }
        }

        const marketingInfo = [];
        for (const marketing of product?.marketing) {
            const findMarketing = await MarketingModel.findById(marketing._id);
            if (findMarketing) marketingInfo.push(findMarketing);
        }

        let finalReward = {
            points: 0,
            baseCurrency_amount: 0,
            secondaryCurrency_amount: 0,
        };
        if (element?.reward) {
            finalReward.points = element?.reward?.points * quantity;
            finalReward.baseCurrency_amount =
                element?.reward?.amount * quantity;
            finalReward.secondaryCurrency_amount =
                element?.reward?.amount * quantity * shopExchangeRate;
        } else {
            finalReward = undefined;
        }

        const ownerInfo = await UserModel.findById(element.owner);

        // For dual marketing feature
        let shopDiscount = 0;
        let adminDiscount = 0;
        if (totalDiscount_ && !element?.isDoubleDeal) {
            const findDiscount = (type, creatorType) => {
                const marketing = product.marketing.find(
                    item =>
                        item.type === type &&
                        item.creatorType === creatorType &&
                        item.isActive &&
                        (!item.onlyForSubscriber || subscribedUser)
                );

                if (marketing) {
                    const findDiscountProduct = marketing.products.find(
                        item =>
                            item.product.toString() === product._id.toString()
                    );

                    return findDiscountProduct.discount * quantity;
                }

                return 0;
            };

            shopDiscount = findDiscount('percentage', 'shop');
            adminDiscount = findDiscount('percentage', 'admin');

            const adminDiscountMarketing = product.marketing.some(
                item =>
                    item.type === 'percentage' &&
                    item.creatorType === 'admin' &&
                    item.isActive &&
                    item.onlyForSubscriber
            );

            if (adminDiscountMarketing) {
                subscriptionDiscount += adminDiscount;
            }
        }
        totalShopDiscount += shopDiscount;
        totalAdminDiscount += adminDiscount;

        finalProductList.push({
            productId: product._id,
            productName: product.name,
            productSlug: product.slug,
            baseCurrency_productPrice: perProductPrice,
            secondaryCurrency_productPrice: perProductPrice * shopExchangeRate,
            baseCurrency_discount: discountPerProduct,
            secondaryCurrency_discount: discountPerProduct * shopExchangeRate,
            baseCurrency_totalDiscount: totalDiscount_,
            secondaryCurrency_totalDiscount: totalDiscount_ * shopExchangeRate,
            productQuantity: quantity,
            baseCurrency_finalPrice: totalProductAmount,
            secondaryCurrency_finalPrice: totalProductAmount * shopExchangeRate,
            product: {
                ...product._doc,
            },
            selectedAttributes: selectedAttributesList,
            shop: product.shop,
            marketing: marketingInfo,
            reward: element?.reward,
            finalReward: finalReward,
            isDoubleDeal: element?.isDoubleDeal || false,
            productSpecialInstruction:
                element?.productSpecialInstruction || undefined,
            //Store who added this product when group cart
            owner: ownerInfo,
            shopDiscount,
            adminDiscount,
        });

        // Product Stock feature
        // if (product.isStockEnabled) {
        //     await Product.updateOne(
        //         { _id: product._id },
        //         {
        //             $inc: {
        //                 stockQuantity: -quantity,
        //             },
        //         }
        //     );
        // }
    }

    const shopInfo = finalProductList[0].product?.shop;
    const sellerInfo = finalProductList[0].product?.seller;

    const order_delivery_charge = await OrderDeliveryCharge.findOne({
        _id: order.orderDeliveryCharge,
    }).populate('dropChargeId');

    summary.baseCurrency_riderFeeWithFreeDelivery =
        order_delivery_charge.deliveryFeeWithFreeDelivery;

    // Calculate rider fee
    let deliveryBoyFee = order_delivery_charge.deliveryBoyFee;

    //Calculate admin charge
    let adminCharge_ = {
        dropChargeFromOrder: 0,
        dropChargeFromDelivery: order_delivery_charge.dropFee,
        totalDropAmount: 0,
    };

    const DROP_CHARGE = order_delivery_charge.dropChargeId;
    let adminPercentage = DROP_CHARGE?.dropPercentage;

    // Max discount per order feature
    if (summary?.baseCurrency_discount > 0) {
        const shopDiscountMarketing = shopInfo?.marketings?.find(
            marketing =>
                marketing.type === 'percentage' &&
                marketing.creatorType === 'shop' &&
                marketing.isActive
        );
        const shopMaxDiscountLimit =
            shopDiscountMarketing?.maxDiscountPerOrder || 0;

        if (
            shopMaxDiscountLimit > 0 &&
            totalShopDiscount > shopMaxDiscountLimit
        ) {
            totalShopDiscount = shopMaxDiscountLimit;
        }

        const adminDiscountMarketing = shopInfo?.marketings?.find(
            marketing =>
                marketing.type === 'percentage' &&
                marketing.creatorType === 'admin' &&
                marketing.isActive
        );
        const adminMaxDiscountLimit =
            adminDiscountMarketing?.maxDiscountPerOrder || 0;

        if (
            adminMaxDiscountLimit > 0 &&
            totalAdminDiscount > adminMaxDiscountLimit
        ) {
            totalAdminDiscount = adminMaxDiscountLimit;
            subscriptionDiscount =
                subscriptionDiscount > 0 && adminMaxDiscountLimit;
        }
    }

    //Calc discount
    let discountCut = {
        discountAdminCut: 0,
        discountShopCut: 0,
    };
    let discountAfterAdjust = 0;
    let discountBeforeAdjust = 0;
    if (
        summary?.baseCurrency_discount.toFixed(2) !==
        (totalAdminDiscount + totalShopDiscount).toFixed(2)
    ) {
        console.log('********Discount is wrong********'); //This check only for developing purpose
        console.log(
            `${summary?.baseCurrency_discount} !== ${totalAdminDiscount + totalShopDiscount
            }`
        );
    }
    if (summary?.baseCurrency_discount > 0) {
        discountAfterAdjust = totalAdminDiscount;
        discountCut.discountAdminCut = totalAdminDiscount;
        discountBeforeAdjust = totalShopDiscount;
        discountCut.discountShopCut = totalShopDiscount;
    }

    // Calculate coupon discount
    let couponDetails = order.couponDetails;
    let couponDiscountCut = {
        baseCurrency_couponAdminCut: 0,
        baseCurrency_couponShopCut: 0,
    };
    if (summary?.baseCurrency_couponDiscountAmount > 0) {
        if (couponDetails?.isShopPayEnabled) {
            couponDiscountCut.baseCurrency_couponShopCut =
                summary.baseCurrency_couponDiscountAmount;
        } else {
            couponDiscountCut.baseCurrency_couponAdminCut =
                summary.baseCurrency_couponDiscountAmount;
        }
    }

    if (sellerInfo.dropPercentage || sellerInfo.dropPercentage > 0) {
        const dropPercentageType = sellerInfo.dropPercentageType;
        adminPercentage = sellerInfo.dropPercentage;

        if (dropPercentageType == 'percentage') {
            // adminCharge_.dropChargeFromOrder =
            //     ((summary.baseCurrency_productAmount -
            //         discountBeforeAdjust -
            //         summary.reward.baseCurrency_amount) *
            //         adminPercentage) /
            //         100 -
            //     discountAfterAdjust;
            adminCharge_.dropChargeFromOrder =
                ((summary.baseCurrency_productAmount -
                    discountBeforeAdjust -
                    couponDiscountCut.baseCurrency_couponShopCut) *
                    adminPercentage) /
                    100 -
                discountAfterAdjust -
                couponDiscountCut.baseCurrency_couponAdminCut;
        } else {
            adminCharge_.dropChargeFromOrder =
                adminPercentage -
                discountAfterAdjust -
                couponDiscountCut.baseCurrency_couponAdminCut;
        }
    } else {
        if (DROP_CHARGE.dropPercentageType == 'percentage') {
            // adminCharge_.dropChargeFromOrder =
            //     ((summary.baseCurrency_productAmount -
            //         discountBeforeAdjust -
            //         summary.reward.baseCurrency_amount) *
            //         adminPercentage) /
            //         100 -
            //     discountAfterAdjust;
            adminCharge_.dropChargeFromOrder =
                ((summary.baseCurrency_productAmount -
                    discountBeforeAdjust -
                    couponDiscountCut.baseCurrency_couponShopCut) *
                    adminPercentage) /
                    100 -
                discountAfterAdjust -
                couponDiscountCut.baseCurrency_couponAdminCut;
        } else {
            adminCharge_.dropChargeFromOrder =
                adminPercentage -
                discountAfterAdjust -
                couponDiscountCut.baseCurrency_couponAdminCut;
        }
    }

    // Calc shop earnings
    let sellerEarnings = 0;

    if (shopInfo.haveOwnDeliveryBoy) {
        // sellerEarnings =
        //     summary.baseCurrency_totalAmount +
        //     order_delivery_charge.subscriptionDeliveryFee -
        //     summary.baseCurrency_discount -
        //     summary.reward.baseCurrency_amount -
        //     adminCharge_.dropChargeFromOrder;
        sellerEarnings =
            summary.baseCurrency_totalAmount +
            order_delivery_charge.subscriptionDeliveryFee -
            summary.baseCurrency_discount -
            couponDiscountCut.baseCurrency_couponShopCut -
            couponDiscountCut.baseCurrency_couponAdminCut -
            adminCharge_.dropChargeFromOrder;
    } else {
        // sellerEarnings =
        //     summary.baseCurrency_productAmount -
        //     summary.baseCurrency_discount -
        //     summary.reward.baseCurrency_amount -
        //     adminCharge_.dropChargeFromOrder -
        //     order_delivery_charge.shopCut;
        sellerEarnings =
            summary.baseCurrency_productAmount -
            summary.baseCurrency_discount -
            couponDiscountCut.baseCurrency_couponShopCut -
            couponDiscountCut.baseCurrency_couponAdminCut -
            adminCharge_.dropChargeFromOrder -
            order_delivery_charge.shopCut;
    }

    // Calculate reward redeem cut
    let rewardRedeemCut = {
        rewardAdminCut: 0,
        rewardShopCut: 0,
    };
    let baseCurrency_rewardRedeemCashback = 0;
    if (summary?.reward?.baseCurrency_amount > 0) {
        // const rewardSetting = await RewardSettingModel.findOne({});

        // baseCurrency_rewardRedeemCashback =
        //     (summary?.reward?.baseCurrency_amount *
        //         rewardSetting.adminCutForReward) /
        //     100;
        baseCurrency_rewardRedeemCashback =
            summary?.reward?.baseCurrency_amount;

        // const adminEarningWithoutReward =
        //     (summary.baseCurrency_productAmount * adminPercentage) / 100;
        // const adminEarningWithReward =
        //     ((summary.baseCurrency_productAmount -
        //         summary.reward.baseCurrency_amount) *
        //         adminPercentage) /
        //         100 -
        //     baseCurrency_rewardRedeemCashback;

        // rewardRedeemCut.rewardAdminCut =
        //     adminEarningWithoutReward - adminEarningWithReward;
        // rewardRedeemCut.rewardShopCut =
        //     summary?.reward?.baseCurrency_amount -
        //     rewardRedeemCut.rewardAdminCut;
        rewardRedeemCut.rewardAdminCut = summary?.reward?.baseCurrency_amount;
    }

    // Minus reward redeem cart from lyxa earning and shop earning
    adminCharge_.dropChargeFromOrder -= baseCurrency_rewardRedeemCashback;
    // sellerEarnings += baseCurrency_rewardRedeemCashback;

    // Calculate double_menu cut
    let doubleMenuMarketing = {};
    let doubleMenuItemPrice = {
        doubleMenuItemPriceAdmin: 0,
        doubleMenuItemPriceShop: 0,
    };
    let doubleMenuCut = {
        doubleMenuAdminCut: 0,
        doubleMenuShopCut: 0,
    };
    if (summary?.baseCurrency_doubleMenuItemPrice > 0) {
        doubleMenuMarketing = shopInfo?.marketings?.find(
            market => market.type === 'double_menu'
        );

        const adminGetFromDoubleMenuItemPrice =
            (summary.baseCurrency_doubleMenuItemPrice * adminPercentage) / 100;
        const shopGetFromDoubleMenuItemPrice =
            summary?.baseCurrency_doubleMenuItemPrice -
            adminGetFromDoubleMenuItemPrice;

        if (doubleMenuMarketing?.creatorType === 'admin') {
            adminCharge_.dropChargeFromOrder -= shopGetFromDoubleMenuItemPrice;
            sellerEarnings += shopGetFromDoubleMenuItemPrice;
            doubleMenuItemPrice.doubleMenuItemPriceAdmin =
                summary?.baseCurrency_doubleMenuItemPrice;
            doubleMenuCut.doubleMenuAdminCut = shopGetFromDoubleMenuItemPrice;
        } else {
            doubleMenuItemPrice.doubleMenuItemPriceShop =
                summary?.baseCurrency_doubleMenuItemPrice;
            doubleMenuCut.doubleMenuShopCut = 0;
        }
    }

    // Punch marketing feature
    if (summary?.baseCurrency_punchMarketingDiscountAmount > 0) {
        sellerEarnings -= summary.baseCurrency_punchMarketingDiscountAmount;
        couponDiscountCut.baseCurrency_couponShopCut =
            summary.baseCurrency_punchMarketingDiscountAmount;
    }

    adminCharge_.totalDropAmount =
        adminCharge_.dropChargeFromOrder + adminCharge_.dropChargeFromDelivery;

    // Calculate Vat
    let vatAmount = {
        baseCurrency_vatForShop: 0,
        baseCurrency_vatForAdmin: 0,
    };
    const appSetting = await AppSetting.findOne({});
    // if (summary.baseCurrency_vat > 0) {
    //     vatAmount.baseCurrency_vatForShop =
    //         (sellerEarnings * appSetting?.vat) / 100;

    //     if (vatAmount.baseCurrency_vatForShop > summary.baseCurrency_vat) {
    //         vatAmount.baseCurrency_vatForShop = summary.baseCurrency_vat;
    //     }

    //     if (vatAmount.baseCurrency_vatForShop < 0) {
    //         vatAmount.baseCurrency_vatForShop = 0;
    //     }

    //     vatAmount.baseCurrency_vatForAdmin =
    //         summary.baseCurrency_vat - vatAmount.baseCurrency_vatForShop;
    // }
    if (appSetting?.vat > 0 && adminCharge_.dropChargeFromOrder > 0) {
        vatAmount.baseCurrency_vatForAdmin =
            (adminCharge_.dropChargeFromOrder * appSetting?.vat) / 100;

        sellerEarnings -= vatAmount.baseCurrency_vatForAdmin;
    }

    // Calculate Rider Tip
    if (shopInfo.haveOwnDeliveryBoy) {
        sellerEarnings += summary?.baseCurrency_riderTip || 0;
    } else {
        deliveryBoyFee += summary?.baseCurrency_riderTip || 0;
    }

    // Free delivery cut
    let freeDeliveryCut = {
        baseCurrency_freeDeliveryAdminCut: order_delivery_charge.dropCut,
        baseCurrency_dropLossForFreeDelivery:
            order_delivery_charge.dropLossForFreeDelivery,
        baseCurrency_freeDeliveryShopCut: order_delivery_charge.shopCut,
        baseCurrency_shopLossForFreeDelivery:
            order_delivery_charge.shopLossForFreeDelivery,
    };

    //*** Start apply exchange rate ***/
    summary = applyExchangeRateInOrderSummary(
        summary,
        shopExchangeRate,
        adminExchangeRate,
        shopInfo
    );
    adminCharge_ = applyExchangeRateInOrderAdminCharge(
        adminCharge_,
        shopExchangeRate,
        adminExchangeRate
    );
    vatAmount = applyExchangeRateInOrderVatAmount(vatAmount, shopExchangeRate);
    rewardRedeemCut = applyExchangeRateInOrderRewardRedeemCut(
        rewardRedeemCut,
        shopExchangeRate
    );
    discountCut = applyExchangeRateInOrderDiscountCut(
        discountCut,
        shopExchangeRate
    );
    doubleMenuItemPrice = applyExchangeRateInOrderDoubleMenuItemPrice(
        doubleMenuItemPrice,
        shopExchangeRate
    );
    doubleMenuCut = applyExchangeRateInOrderDoubleMenuCut(
        doubleMenuCut,
        shopExchangeRate
    );
    freeDeliveryCut = applyExchangeRateInOrderFreeDeliveryCut(
        freeDeliveryCut,
        shopExchangeRate,
        adminExchangeRate,
        shopInfo
    );
    couponDiscountCut = applyExchangeRateInOrderCouponDiscountCut(
        couponDiscountCut,
        shopExchangeRate
    );

    const baseCurrency_riderFee = deliveryBoyFee;
    const secondaryCurrency_riderFee = deliveryBoyFee * shopExchangeRate;

    const baseCurrency_shopEarnings = sellerEarnings;
    const secondaryCurrency_shopEarnings = sellerEarnings * shopExchangeRate;

    const secondaryCurrency_rewardRedeemCashback =
        baseCurrency_rewardRedeemCashback * shopExchangeRate;
    //*** End apply exchange rate ***/

    // Subscription Feature
    const subscriptionLoss = {
        baseCurrency_discount: subscriptionDiscount,
        secondaryCurrency_discount: subscriptionDiscount * shopExchangeRate,
        baseCurrency_doubleMenuDiscount: doubleMenuMarketing.onlyForSubscriber
            ? doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceAdmin
            : 0,
        secondaryCurrency_doubleMenuDiscount:
            doubleMenuMarketing.onlyForSubscriber
                ? doubleMenuItemPrice.secondaryCurrency_doubleMenuItemPriceAdmin
                : 0,
        baseCurrency_doubleMenuLoss: doubleMenuMarketing.onlyForSubscriber
            ? doubleMenuCut.baseCurrency_doubleMenuAdminCut
            : 0,
        secondaryCurrency_doubleMenuLoss: doubleMenuMarketing.onlyForSubscriber
            ? doubleMenuCut.secondaryCurrency_doubleMenuAdminCut
            : 0,
        baseCurrency_freeDelivery:
            order.subscriptionLoss.baseCurrency_freeDelivery,
        secondaryCurrency_freeDelivery:
            order.subscriptionLoss.secondaryCurrency_freeDelivery,
    };

    // Update order
    order.summary = summary;
    order.products = products;
    order.oldOrderProductsDetails = [...order.productsDetails];
    order.productsDetails = finalProductList;
    order.adminCharge = adminCharge_;
    order.baseCurrency_adminCommission =
        adminCharge_.baseCurrency_totalAdminCharge;
    order.secondaryCurrency_adminCommission =
        adminCharge_.secondaryCurrency_totalAdminCharge;
    order.baseCurrency_riderFee = baseCurrency_riderFee;
    order.secondaryCurrency_riderFee = secondaryCurrency_riderFee;
    order.baseCurrency_shopEarnings = baseCurrency_shopEarnings;
    order.secondaryCurrency_shopEarnings = secondaryCurrency_shopEarnings;
    order.vatAmount = vatAmount;
    order.rewardRedeemCut = rewardRedeemCut;
    order.baseCurrency_rewardRedeemCashback = baseCurrency_rewardRedeemCashback;
    order.secondaryCurrency_rewardRedeemCashback =
        secondaryCurrency_rewardRedeemCashback;
    order.isRedeemReward = summary?.reward?.points > 0 ? true : false;
    order.discountCut = discountCut;
    order.isDiscount = summary?.baseCurrency_discount > 0 ? true : false;
    order.doubleMenuItemPrice = doubleMenuItemPrice;
    order.doubleMenuCut = doubleMenuCut;
    order.isDoubleMenu =
        summary?.baseCurrency_doubleMenuItemPrice > 0 ? true : false;
    order.freeDeliveryCut = freeDeliveryCut;
    order.couponDiscountCut = couponDiscountCut;
    order.isOrderAdjusted = true;
    order.subscriptionLoss = subscriptionLoss;

    await order.save();

    // Update user cart
    const cartDetails = await CartModel.findOne({
        _id: order.cart,
    });

    const cartItem = cartDetails?.cartItems?.find(
        element => element.user.toString() === order.user.toString()
    );
    cartItem.summary = summary;

    await cartDetails.save();

    // Update adjust order request
    const adjustOrderRequest = await AdjustOrderRequest.findOne({
        _id: order.adjustOrderRequest,
    });
    if (adjustOrderRequest) {
        adjustOrderRequest.status = 'accepted';
        await adjustOrderRequest.save();
    }
};

// For getting not rated delivered order
exports.getNotRatedDeliveredOrderFroUserApp = async (req, res) => {
    try {
        const userId = req.userId;

        let notRatedDeliveredOrder = await OrderModel.findOne({
            user: userId,
            orderStatus: 'delivered',
            isNotRatedDeliveredOrderShowed: false,
            shopRated: false,
            deliveryBoyRated: false,
            reviews: { $size: 0 },
        }).populate('shop deliveryBoy');

        if (!notRatedDeliveredOrder) {
            notRatedDeliveredOrder = await Butler.findOne({
                user: userId,
                orderStatus: 'delivered',
                isNotRatedDeliveredOrderShowed: false,
                deliveryBoyRated: false,
                reviews: { $size: 0 },
            }).populate('deliveryBoy');
        }

        if (notRatedDeliveredOrder) {
            notRatedDeliveredOrder.isNotRatedDeliveredOrderShowed = true;
            await notRatedDeliveredOrder.save();
        }

        // For getting new user coupon
        const findUser = await UserModel.findById(userId);

        let newUserCoupon = null;
        if (!findUser?.isNewUserCouponShowed) {
            let sameDeviceUsersId = [findUser?._id?.toString()];

            if (findUser?.userRegisterDeviceId) {
                const sameDeviceUsers = await UserModel.find({
                    userRegisterDeviceId: findUser?.userRegisterDeviceId,
                });
                sameDeviceUsersId = sameDeviceUsers.map(user =>
                    user._id.toString()
                );
            }

            const totalUserOrders = await OrderModel.countDocuments({
                // orderStatus: { $nin: ['cancelled'] },
                orderStatus: 'delivered',
                user: { $in: sameDeviceUsersId },
            });

            if (totalUserOrders < 1) {
                const findNewUserCoupon = await CouponModel.findOne({
                    couponType: 'global',
                    couponStatus: 'active',
                    onlyForNewUser: true,
                    deletedAt: null,
                }).sort({ createdAt: -1 });

                if (findNewUserCoupon) {
                    await checkCouponValidity(findNewUserCoupon);
                    await checkCouponValidity(findNewUserCoupon, findUser);

                    if (findNewUserCoupon._doc.isCouponValid) {
                        let appSetting = await AppSetting.findOne().select(
                            'adminExchangeRate'
                        );

                        const adminExchangeRate =
                            appSetting?.adminExchangeRate ?? 0;

                        findNewUserCoupon._doc.secondaryCouponValue =
                            calculateSecondaryPrice(
                                findNewUserCoupon.couponValue,
                                adminExchangeRate
                            );
                        findNewUserCoupon._doc.secondaryCouponMinimumOrderValue =
                            calculateSecondaryPrice(
                                findNewUserCoupon.couponMinimumOrderValue,
                                adminExchangeRate
                            );
                        findNewUserCoupon._doc.secondaryCouponMaximumDiscountLimit =
                            calculateSecondaryPrice(
                                findNewUserCoupon.couponMaximumDiscountLimit,
                                adminExchangeRate
                            );
                        newUserCoupon = findNewUserCoupon._doc;

                        if (!findUser.coupons.includes(newUserCoupon?._id)) {
                            findUser.coupons.push(newUserCoupon?._id);
                        }
                    }
                }
            }

            findUser.isNewUserCouponShowed = true;
            await findUser.save();
        }

        successResponse(res, {
            message: 'Successfully get not rated delivered order.',
            data: {
                order: notRatedDeliveredOrder,
                coupon: newUserCoupon,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Update order trip summary
exports.updateOrderTripSummary = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const { orderIds, orderTripSummary } = req.body;

        const orders = await Order.find({
            _id: { $in: orderIds },
            deliveryBoy: deliveryBoyId,
        });

        if (orders.length !== orderIds.length) {
            return errorResponse(res, 'Order not found');
        }

        await Order.updateMany(
            { _id: { $in: orderIds } },
            {
                $set: {
                    orderTripSummary,
                },
            }
        );

        res.status(200).json({
            status: true,
            message: 'Order trip summary updated',
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

// Cancel ongoing order when inactive user
exports.cancelUserOngoingOrder = async userId => {
    try {
        const ongoingOrders = await Order.find({
            user: userId,
            orderStatus: {
                $in: [
                    'schedule',
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
        }).populate([
            {
                path: 'products',
                populate: [{ path: 'product' }, { path: 'addons.product' }],
            },
        ]);

        const cancelObject = getCancelObject({
            otherReason: 'Admin deactivates user who has an ongoing order',
        });

        const cancelOrder = async order => {
            for (const element of order?.products) {
                if (element.product.isStockEnabled) {
                    await Product.updateOne(
                        { _id: element.product._id },
                        { $inc: { stockQuantity: element.quantity } }
                    );
                }
            }

            await OrderCancel({
                orderId: order._id,
                cancelObject,
            });

            await checkShopCapacity(order.shop);

            const orderFullInformation = await getFullOrderInformation(
                order._id
            );
            await notifiycancelOrder(orderFullInformation);
        };

        await Promise.all(ongoingOrders.map(cancelOrder));

        const ongoingButlerOrders = await Butler.find({
            user: userId,
            orderStatus: {
                $in: [
                    'schedule',
                    'placed',
                    'accepted_delivery_boy',
                    'order_on_the_way',
                ],
            },
        });

        const cancelButlerOrder = async order => {
            await OrderCancel({
                orderId: order._id,
                cancelObject,
                Model: Butler,
            });

            const orderFullInformation = await getFullOrderInformationForButler(
                order._id
            );
            await notifiycancelOrder(orderFullInformation);
        };

        await Promise.all(ongoingButlerOrders.map(cancelButlerOrder));
    } catch (error) {
        console.error(error);
    }
};

// exports.cancelUserOngoingOrder = async userId => {
//     try {
//         const ongoingOrders = await Order.find({
//             user: userId,
//             orderStatus: {
//                 $in: [
//                     'schedule',
//                     'placed',
//                     'accepted_delivery_boy',
//                     'preparing',
//                     'ready_to_pickup',
//                     'order_on_the_way',
//                 ],
//             },
//         }).populate([
//             {
//                 path: 'products',
//                 populate: [
//                     {
//                         path: 'product',
//                     },
//                     {
//                         path: 'addons.product',
//                     },
//                 ],
//             },
//         ]);

//         if (ongoingOrders.length > 0) {
//             for (const order of ongoingOrders) {
//                 // Product Stock feature
//                 for (let element of order?.products) {
//                     if (element.product.isStockEnabled) {
//                         await Product.updateOne(
//                             { _id: element.product._id },
//                             {
//                                 $inc: {
//                                     stockQuantity: element.quantity,
//                                 },
//                             }
//                         );
//                     }
//                 }

//                 const cancelObject = getCancelObject({
//                     otherReason:
//                         'Admin deactivates user who has an ongoing order',
//                 });

//                 await OrderCancel({
//                     orderId: order._id,
//                     cancelObject,
//                 });

//                 // Check shop order capacity
//                 await checkShopCapacity(order.shop);
//             }
//         }

//         const ongoingButlerOrders = await Butler.find({
//             user: userId,
//             orderStatus: {
//                 $in: [
//                     'schedule',
//                     'placed',
//                     'accepted_delivery_boy',
//                     'order_on_the_way',
//                 ],
//             },
//         });

//         for (const order of ongoingButlerOrders) {
//             const cancelObject = getCancelObject({
//                 otherReason: 'Admin deactivates user who has an ongoing order',
//             });

//             await OrderCancel({
//                 orderId: order._id,
//                 cancelObject,
//                 Model: Butler,
//             });
//         }

//         return;
//     } catch (error) {
//         console.log(error);
//     }
// };

//*** Areeba payment gateway integration ***/
exports.areebaPaymentGenerate = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            cardId,
            amount,
            orderDeliveryAddressId,
            creatorSummary,
            products,
            cartId,
            type,
            scheduleDate,
        } = req.body;

        if (!orderDeliveryAddressId)
            return errorResponse(res, 'orderDeliveryAddressId is required');

        const deliveryAddress = await Address.findById(orderDeliveryAddressId);

        if (!deliveryAddress)
            return errorResponse(res, 'DeliveryAddress not found');

        const checkingOrderValidity = await checkingPlaceOrderValidity(
            userId,
            deliveryAddress,
            creatorSummary,
            products,
            cartId,
            type,
            scheduleDate
        );
        if (checkingOrderValidity)
            return errorResponse(
                res,

                checkingOrderValidity
            );

        if (!cardId) return errorResponse(res, 'cardId is required');

        const areebaCard = await AreebaCardModel.findOne({
            _id: cardId,
            user: userId,
        });

        if (!areebaCard) return errorResponse(res, 'areebaCard not found');

        const orderId = ObjectId();
        const transactionId = ObjectId();
        const currency = 'USD';
        const initiateAuthenticationPutData = {
            authentication: {
                acceptVersions: '3DS1,3DS2',
                channel: 'PAYER_BROWSER',
                purpose: 'PAYMENT_TRANSACTION',
            },
            correlationId: 'test',
            order: {
                currency: currency,
            },
            sourceOfFunds: {
                token: areebaCard.token,
            },
            apiOperation: 'INITIATE_AUTHENTICATION',
        };

        const { data: initiateAuthenticationData } = await areebaPaymentGateway(
            orderId,
            transactionId,
            initiateAuthenticationPutData
        );

        if (initiateAuthenticationData?.result == 'ERROR')
            return errorResponse(
                res,
                initiateAuthenticationData?.error?.explanation
            );

        if (
            initiateAuthenticationData?.transaction?.authenticationStatus !=
            'AUTHENTICATION_AVAILABLE'
        )
            return errorResponse(res, 'Authentication is not available');

        const authenticatePayerPutData = {
            authentication: {
                redirectResponseUrl: `${process.env.WEBSITE_URL}app/user/order/areeba-payment-completed`,
            },
            correlationId: 'test',
            device: {
                browser: 'MOZILLA',
                browserDetails: {
                    '3DSecureChallengeWindowSize': 'FULL_SCREEN',
                    acceptHeaders: 'application/json',
                    colorDepth: 24,
                    javaEnabled: true,
                    language: 'en-US',
                    screenHeight: 640,
                    screenWidth: 480,
                    timeZone: 273,
                },
                // ipAddress: "127.0.0.1"
            },
            order: {
                amount: amount,
                currency: currency,
            },
            sourceOfFunds: {
                token: areebaCard.token,
            },
            apiOperation: 'AUTHENTICATE_PAYER',
        };

        const { data: authenticatePayerData } = await areebaPaymentGateway(
            orderId,
            transactionId,
            authenticatePayerPutData
        );

        if (authenticatePayerData?.result == 'ERROR')
            return errorResponse(
                res,
                authenticatePayerData?.error?.explanation
            );
        if (!authenticatePayerData)
            return errorResponse(
                res,
                'Error at areeba PaymentGateway AUTHENTICATE_PAYER'
            );
        const redirectHtml = authenticatePayerData.authentication.redirect.html;

        await OrderRequestModel.create({
            ...req.body,
            userId,
            areebaCard: { orderId, transactionId, token: areebaCard.token },
        });

        successResponse(res, {
            message: 'Successfully fetched.',
            data: {
                redirectHtml,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.areebaPaymentComplete = async (req, res) => {
    try {
        const { 'order.id': orderId, 'transaction.id': transactionId } =
            req.body;

        const orderRequest = await OrderRequestModel.findOne({
            'areebaCard.orderId': orderId,
        }).lean();

        if (!orderRequest)
            return scriptResponse(res, `failed/orderRequest not found`);

        const { orderDeliveryAddressId, creatorSummary, areebaCard } =
            orderRequest;

        await OrderRequestModel.findByIdAndDelete(orderRequest._id);

        const newTransactionId = ObjectId();
        const currency = 'USD';

        const authorizePutData = {
            apiOperation: 'AUTHORIZE',
            authentication: {
                transactionId: transactionId,
            },
            order: {
                amount: creatorSummary?.baseCurrency_card,
                currency: currency,
                reference: orderId,
            },
            sourceOfFunds: {
                token: areebaCard?.token,
            },
            transaction: {
                reference: transactionId,
            },
        };

        const { data: authorizeData } = await areebaPaymentGateway(
            orderId,
            newTransactionId,
            authorizePutData
        );

        if (authorizeData?.result == 'ERROR')
            return scriptResponse(
                res,
                `failed/${authorizeData?.error?.explanation}`
            );

        if (
            authorizeData?.transaction?.authenticationStatus !=
            'AUTHENTICATION_SUCCESSFUL'
        )
            return scriptResponse(
                res,
                `failed/Authentication is not successful`
            );

        orderRequest.areebaCard.transactionId = newTransactionId;
        req.body = orderRequest;
        req.userId = orderRequest.userId;

        const deliveryAddress = await Address.findOne({
            _id: orderDeliveryAddressId,
        });

        const order = await placeOrderFunc(req, deliveryAddress);

        const orderFullInformation = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(orderFullInformation);
        // await sendPlaceOrderEmail(order._id);

        return scriptResponse(res, `success/${order._id}`);
    } catch (error) {
        // return errorHandler(res, error);
        console.log(error);
        return scriptResponse(res, `failed/${error.message}`);
    }
};

exports.resolveOrder = async (req, res) => {
    const { isResolved, orderId } = req.body;
    const updatedOrder = await OrderModel.findOneAndUpdate(
        { _id: orderId },
        { isResolved: isResolved },
        { new: true }
    );

    if (!updatedOrder) return errorResponse(res, 'Order not found');

    successResponse(res, {
        message: 'Order resolved successfully.',
        data: {
            updatedOrder,
        },
    });
};

exports.getRiderAndUserChat = async (req, res) => {
    try {
        const { orderId } = req.query;

        const order = await OrderModel.findById(orderId).select('chats');

        successResponse(res, {
            message: 'Successfully got order chats',
            data: {
                chats: order?.chats ? order.chats : [],
            },
        });
    } catch (error) {
        errorResponse(res, 'error in getRiderAndUserChat');
    }
};
