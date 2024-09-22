const {
    errorHandler,
    successResponse,
    errorResponse,
    errorResponseWithCode,
} = require('../helpers/apiResponse');
const Order = require('../models/OrderModel');
const Butler = require('../models/ButlerModel');
const DeliveryBoy = require('../models/DeliveryBoyModel');
const UserModel = require('../models/UserModel');
const Shop = require('../models/ShopModel');
const Transection = require('../models/TransactionModel');
const AdminChatRequest = require('../models/AdminChatRequest');
const moment = require('moment');
const { getDropBalance, getUserBalance } = require('../helpers/BalanceQuery');
const AdminModel = require('../models/AdminModel');
const SellerModel = require('../models/SellerModel');
const { paginationMultipleModel } = require('../helpers/pagination');
const {
    getShopUnSettleAmount,
    getShopEarning,
    getRiderCashInHand,
    getSubscriptionEarning,
    getTotalAdminProfit,
    getAdminDeliveryProfit,
    getAdminRefund,
    getTotalMarketingSpent,
    getAdminMarketingSpent,
    getShopMarketingSpent,
    getFreeDeliveryByAdmin,
    getFreeDeliveryByShop,
    getAdminMarketingCashback,
    getTotalDeliveryFees,
    getTotalShopPayout,
    getTotalRiderTips,
    getTotalButlerOrderAmount,
    getTotalProfitFromButler,
    getTotalRiderPayout,
    getFeaturedAmount,
    getRiderActualCashInHand,
} = require('./FinancialController');
const { getDatesInRange, formatDate } = require('../helpers/getDatesInRange');
const ReviewModel = require('../models/ReviewModel');
const FlagModel = require('../models/FlagModel');
const DeliveryBoyTimeModel = require('../models/DeliveryBoyTimeModel');
const { getSummeryString } = require('./DeliveryBoyController');
const AppSetting = require('../models/AppSetting');
const ZoneModel = require('../models/ZoneModel');
const MarketingModel = require('../models/MarketingModel');
const CouponModel = require('../models/CouponModel');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const { isDateValid, calculateNumberOfDays, getDateRange } = require('../helpers/utils');
const { sendEmailForDeliveryBoyForgetPassword } = require('./EmailController');
const OrderModel = require('../models/OrderModel');
const ButlerModel = require('../models/ButlerModel');
const ObjectId = require('mongoose').Types.ObjectId;

const ordersCalculation = async (startDate, endDate) => {
    let config = {
        orderStatus: 'delivered',
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        config = {
            ...config,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const fee = await Order.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                itemTotal: {
                    $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                },
                doubleMenuItemPrice: {
                    $sum: {
                        $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
                    },
                },
                dropChargeItemsTotal: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromOrder',
                        ],
                    },
                },
                totalDropAmount: {
                    $sum: {
                        $sum: ['$adminCharge.baseCurrency_totalAdminCharge'],
                    },
                },
            },
        },
    ]);

    if (fee.length < 1) {
        fee.push({
            itemTotal: 0,
            doubleMenuItemPrice: 0,
            dropChargeItemsTotal: 0,
            totalDropAmount: 0,
        });
    }

    let configDeliveryFeeTotal = {
        orderFor: 'global',
        $or: [
            {
                orderStatus: 'delivered',
            },
            {
                orderStatus: 'cancelled',
                isEndorseLoss: true,
                inEndorseLossDeliveryFeeIncluded: true,
            },
        ],
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configDeliveryFeeTotal = {
            ...configDeliveryFeeTotal,

            $or: [
                {
                    deliveredAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                },
                {
                    cancelledAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                },
            ],
        };
    }

    const deliveryFeeTotal = await Order.aggregate([
        {
            $match: configDeliveryFeeTotal,
        },
        {
            $group: {
                _id: '',
                deliveryFeeTotal: {
                    $sum: {
                        $sum: [
                            '$summary.baseCurrency_riderFeeWithFreeDelivery',
                        ],
                    },
                },
                dropChargeDeliveryFeeTotal: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromDelivery',
                        ],
                    },
                },
            },
        },
    ]);

    if (deliveryFeeTotal.length < 1) {
        deliveryFeeTotal.push({
            deliveryFeeTotal: 0,
            dropChargeDeliveryFeeTotal: 0,
        });
    }

    // Drop Earning From Butler
    let configForButler = {
        orderStatus: 'delivered',
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configForButler = {
            ...configForButler,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const feeForButler = await Butler.aggregate([
        {
            $match: configForButler,
        },
        {
            $group: {
                _id: '',
                dropChargeDeliveryFeeTotalForButler: {
                    $sum: {
                        $sum: ['$adminCharge.baseCurrency_totalAdminCharge'],
                    },
                },
                deliveryFeeTotalForButler: {
                    $sum: { $sum: ['$summary.baseCurrency_riderFee'] },
                },
            },
        },
    ]);

    if (feeForButler.length < 1) {
        feeForButler.push({
            dropChargeDeliveryFeeTotalForButler: 0,
            deliveryFeeTotalForButler: 0,
        });
    }

    // Calc subscription loss for delivery when hop rider
    let configSubscriptionLoss = {
        orderFor: 'specific',
        orderStatus: 'delivered',
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configSubscriptionLoss = {
            ...configSubscriptionLoss,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const subscriptionLossQ = await Order.aggregate([
        {
            $match: configSubscriptionLoss,
        },
        {
            $group: {
                _id: '',
                freeDelivery: {
                    $sum: {
                        $sum: ['$subscriptionLoss.baseCurrency_freeDelivery'],
                    },
                },
            },
        },
    ]);

    if (subscriptionLossQ.length < 1) {
        subscriptionLossQ.push({
            freeDelivery: 0,
        });
    }

    return {
        ...fee[0],
        dropChargeDeliveryFeeTotal:
            deliveryFeeTotal[0].dropChargeDeliveryFeeTotal +
            feeForButler[0].dropChargeDeliveryFeeTotalForButler -
            subscriptionLossQ[0].freeDelivery,
        deliveryFeeTotal:
            deliveryFeeTotal[0].deliveryFeeTotal +
            feeForButler[0].deliveryFeeTotalForButler,
    };
};

const dropEarningsCal = async (startDate, endDate, query) => {
    let config = {
        orderStatus: 'delivered',
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        config = {
            ...config,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    if (query) {
        config = {
            ...config,
            ...query,
        };
    }

    const dropEarning = await Order.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                amount: {
                    $sum: {
                        $sum: ['$adminCharge.baseCurrency_totalAdminCharge'],
                    },
                },
                count: { $sum: 1 },
            },
        },
    ]);

    let config2 = {
        orderFor: 'global',
        orderStatus: 'cancelled',
        isEndorseLoss: true,
        inEndorseLossDeliveryFeeIncluded: true,
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        config2 = {
            ...config2,
            cancelledAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    if (query) {
        config2 = {
            ...config2,
            ...query,
        };
    }

    const dropEarningFromCancelOrder = await Order.aggregate([
        {
            $match: config2,
        },
        {
            $group: {
                _id: '',
                amount: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromDelivery',
                        ],
                    },
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const dropEarning_ = dropEarning[0] ? dropEarning[0].amount : 0;
    const dropEarningFromCancelOrder_ = dropEarningFromCancelOrder[0]
        ? dropEarningFromCancelOrder[0].amount
        : 0;
    const totalDropEarning = dropEarning_ + dropEarningFromCancelOrder_;

    let configUserBalanceAddAdmin = {
        type: {
            $in: [
                // 'userBalanceAddAdmin',
                'topUpAdminWallet',
                'sellerGetPaymentFromOrderRefused',
                'deliveryBoyOrderDeliveredCashRefused',
                'refundedAfterDeliveredOrderAdminCut', //Refund feature after delivered order
                'adminAddBalanceRider',
                'adminAddBalanceShop',
                'adminEndorseLoss', // endorse loss after cancel order
                'replacementOrderAdminCut', // for replacement order feature
                'riderGetWeeklyReward', // for rider weekly reward
                // 'salesManagerGetMonthlyReward', // for sales manager monthly reward
            ],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configUserBalanceAddAdmin = {
            ...configUserBalanceAddAdmin,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const userBalanceAddAdmin = await Transection.aggregate([
        {
            $match: configUserBalanceAddAdmin,
        },
        {
            $group: {
                _id: '',
                amount: { $sum: { $sum: ['$amount'] } },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalUserBalanceAddAdmin = userBalanceAddAdmin[0]
        ? userBalanceAddAdmin[0].amount
        : 0;

    let configUserBalanceWithdrawAdmin = {
        type: {
            $in: [
                // 'userBalanceWithdrawAdmin',
                'DropGetFromRefund',
                'shopPayForFeatured',
                'adminRemoveBalanceRider',
                'adminRemoveBalanceShop',
                'adminGetForCancelReplacementOrder', // for replacement order feature
            ],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configUserBalanceWithdrawAdmin = {
            ...configUserBalanceWithdrawAdmin,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const userBalanceWithdrawAdmin = await Transection.aggregate([
        {
            $match: configUserBalanceWithdrawAdmin,
        },
        {
            $group: {
                _id: '',
                amount: { $sum: { $sum: ['$amount'] } },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalUserBalanceWithdrawAdmin = userBalanceWithdrawAdmin[0]
        ? userBalanceWithdrawAdmin[0].amount
        : 0;

    // Drop Earning From Butler
    let configForButler = {
        orderStatus: 'delivered',
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configForButler = {
            ...configForButler,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    if (query) {
        configForButler = {
            ...configForButler,
            ...query,
        };
    }

    const dropEarningForButler = await Butler.aggregate([
        {
            $match: configForButler,
        },
        {
            $group: {
                _id: '',
                amount: {
                    $sum: {
                        $sum: ['$adminCharge.baseCurrency_totalAdminCharge'],
                    },
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalDropEarningForButler = dropEarningForButler[0]
        ? dropEarningForButler[0].amount
        : 0;

    // Subscription fee
    const { baseCurrency_subscriptionFee: totalSubscriptionEarning } =
        await getSubscriptionEarning({ startDate, endDate });

    return (
        totalDropEarning +
        totalDropEarningForButler +
        totalUserBalanceWithdrawAdmin +
        totalSubscriptionEarning -
        totalUserBalanceAddAdmin
    );
};

const getDeliveryBoyTransactions = async (startDate, endDate) => {
    const list = await DeliveryBoy.find({
        deliveryBoyType: 'dropRider',
        deletedAt: null,
    }).select('-password');

    let chashInHand = 0;
    let deliveryBoyUnsettleAmount = 0;
    let deliveryBoyUnsettleRiderTip = 0;

    for (const deliveryBoy of list) {
        const unSettleAmount = await this.getDeliveryManUnSettleAmount(
            deliveryBoy._id,
            startDate,
            endDate
        );
        const totalUnSettleAmount = unSettleAmount.totalUnSettleAmount;
        const totalUnSettleRiderTip = unSettleAmount.totalUnSettleRiderTip;

        const { riderCashInHand: totalCashInHand } = await getRiderCashInHand({
            riderId: deliveryBoy._id,
            startDate,
            endDate,
        });

        chashInHand += totalCashInHand;
        deliveryBoyUnsettleAmount += totalUnSettleAmount;
        deliveryBoyUnsettleRiderTip += totalUnSettleRiderTip;

        // console.log(chashInHand, deliveryBoyUnsettleAmount);
    }

    return {
        chashInHand,
        deliveryBoyUnsettleAmount,
        deliveryBoyUnsettleRiderTip,
    };
};

const getShopsTransactions = async (startDate, endDate) => {
    // get all shops from seller
    const list = await Shop.find({}).select(
        '-password -credentials -reviews -flags -tags -tagsId -products'
    );

    let totalSellerUnsettleAmount = 0;

    for (const shop of list) {
        const totalSellerUnsettleFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
        });
        const totalSellerUnsettle = totalSellerUnsettleFunc.totalSellerUnsettle;

        // console.log(totalSellerUnsettle,'totalSellerUnsettle')
        totalSellerUnsettleAmount += totalSellerUnsettle;
        // console.log(totalSellerUnsettleAmount);
    }

    return totalSellerUnsettleAmount;
};

exports.getDashBordInfo = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // comment
        // Lyxa Earnings => total lyxa earnings form deliveryBoy & order
        // Order Profit => earning from order
        // Delivery Profit => earning from delivery
        // Delivery Fee's => total delivery fee
        // Order Amount => total order amount without delivery fee
        // Shops Unsettled Amount => total unsettled amount from seller
        // Riders cash in hands => total cash in hand from deliveryBoy
        // Riders Unsettled Amount => total unsettled amount from deliveryBoy

        // let dateConfig = {
        //     $or: [
        //         { orderStatus: 'delivered' },
        //         { paymentMethod: { $ne: 'cash' } },
        //     ],
        // };

        // if (startDate && endDate) {
        //     dateConfig = {
        //         ...dateConfig,
        //         createdAt: {
        //             $gte: moment(new Date(startDate)),
        //             $lt: moment(new Date(endDate)),
        //         },
        //     };
        // }

        const totalShopOrder = await Order.count({ orderStatus: 'delivered' });
        const totalButlerOrder = await Butler.count({
            orderStatus: 'delivered',
        });
        const totalOrder = totalShopOrder + totalButlerOrder;

        // console.log(totalOrder,dateConfig)

        const totalShopCancelOrder = await Order.count({
            orderStatus: 'cancelled',
        });
        const totalButlerCancelOrder = await Butler.count({
            orderStatus: 'cancelled',
        });
        const totalCancelOrder = totalShopCancelOrder + totalButlerCancelOrder;

        const totalDeliveryBoy = await DeliveryBoy.count({
            deletedAt: null,
            deliveryBoyType: 'dropRider',
        });

        const totalActiveDeliveryBoy = await DeliveryBoy.count({
            status: 'active',
            deliveryBoyType: 'dropRider',
            deletedAt: null,
        });

        const busyDeliveryBoyFind = await Order.distinct('deliveryBoy', {
            orderFor: 'global',
            orderStatus: {
                $in: [
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
        });
        const busyDeliveryBoy = busyDeliveryBoyFind.length;

        const totalIncomingChat = await AdminChatRequest.count({
            status: 'pending',
        });

        const totalOnlineDeliveryBoy = await DeliveryBoy.count({
            liveStatus: 'online',
            deliveryBoyType: 'dropRider',
            deletedAt: null,
        });

        const totalAvailableDeliveryBoy =
            totalOnlineDeliveryBoy - busyDeliveryBoy < 0
                ? 0
                : totalOnlineDeliveryBoy - busyDeliveryBoy;

        const totalUser = await UserModel.count();
        const totalShop = await Shop.count();
        const ordersSums = await ordersCalculation(startDate, endDate);
        const deliveryBoyTrx = await getDeliveryBoyTransactions(
            startDate,
            endDate
        );
        const shopUnsettleAmount = await getShopsTransactions(
            startDate,
            endDate
        );
        const totalDropEarning = await dropEarningsCal(startDate, endDate);

        const totalShopRegister = await Shop.count();

        let totalAveratgeDeliveredTime = 0;

        const totalOrderAllTime = await Order.count({
            orderStatus: 'delivered',
        });
        // sum deliveredMinutes from order
        const totalDeliveredMinutes = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'delivered',
                },
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    totalMin: { $sum: { $sum: ['$deliveredMinutes'] } },
                },
            },
        ]);

        if (totalDeliveredMinutes.length > 0) {
            const totalSum_ = totalDeliveredMinutes[0].totalMin;
            totalAveratgeDeliveredTime = totalSum_ / totalOrderAllTime;
        }

        const topUser = await UserModel.find({})
            .sort({ orderCompleted: -1 })
            .limit(5);

        const topShop = await Shop.find({}).sort({ totalOrder: -1 }).limit(5);

        const topDeliveryBoy = await DeliveryBoy.find({
            deliveryBoyType: 'dropRider',
            deletedAt: null,
        })
            .sort({ totalOrder: -1 })
            .limit(5);

        const topSeller = await Shop.find({}).sort({ totalOrder: -1 }).limit(5);

        const top_activity = {
            topUser,
            topShop,
            topDeliveryBoy,
            topSeller,
        };

        return res.json({
            status: true,
            message: 'message',
            data: {
                summary: {
                    totalOrder,
                    totalCancelOrder,
                    totalDeliveryBoy,
                    totalUser,
                    totalShop,
                    totalActiveDeliveryBoy,
                    totalAvailableDeliveryBoy,
                    totalOnlineDeliveryBoy,
                    totalIncomingChat,
                    shopUnsettleAmount,
                    deliveryBoyUnsettleAmount:
                        deliveryBoyTrx?.deliveryBoyUnsettleAmount,
                    chashInHandDeliveryBoy: deliveryBoyTrx?.chashInHand,
                    ordersItemTotal: ordersSums?.itemTotal
                        ? ordersSums?.itemTotal +
                          ordersSums?.doubleMenuItemPrice
                        : 0,
                    ordersDeliveryFeesTotal: ordersSums?.deliveryFeeTotal
                        ? ordersSums?.deliveryFeeTotal
                        : 0,
                    dropEarningTotalOfItems: ordersSums?.dropChargeItemsTotal
                        ? ordersSums?.dropChargeItemsTotal
                        : 0,
                    dropEarningTotalOfDeliveryFee:
                        ordersSums?.dropChargeDeliveryFeeTotal
                            ? ordersSums?.dropChargeDeliveryFeeTotal
                            : 0,
                    totalDropEarning: totalDropEarning,
                    totalShopRegister,
                    totalAveratgeDeliveredTime,
                },
                top_activity,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getLyxaEarning = async (req, res) => {
    try {
        const totalDropEarning = await getDropBalance();

        return res.json({
            status: true,
            message: 'Successfully fetched',
            data: {
                totalDropEarning: Number(totalDropEarning.toFixed(2)),
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAdminGraphOrder = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            year,
            type = 'normal',
            orderType = 'delivered',
        } = req.query;

        let orderConfig = {};

        if (orderType === 'delivered') {
            orderConfig = {
                ...orderConfig,
                orderStatus: 'delivered',
            };
        }
        if (orderType === 'incomplete') {
            orderConfig = {
                ...orderConfig,
                orderStatus: { $nin: ['delivered'] },
            };
        }

        // let orderConfig = { orderStatus: 'delivered' };
        let info = [];

        if (type === 'normal') {
            if (!startDate || !endDate) errorHandler(res, 'Dates not valid');
            info = await this.getGraphsForOrder(
                new Date(startDate),
                new Date(endDate),
                orderConfig
            );
        } else if (type === 'year') {
            if (!year) errorHandler(res, 'Year not valid');
            info = await getAdminGraphForOrderOfYear(year);
        }

        successResponse(res, {
            message: 'Successfully get Order',
            data: { info },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getAdminGraphUser = async (req, res) => {
    try {
        const { startDate, endDate, year, type } = req.query;

        let userConfig = {};
        let info = [];

        if (type == 'normal') {
            if (!startDate || !endDate) errorHandler(res, 'Dates not valid');
            info = await getGraphsForUser(
                new Date(startDate),
                new Date(endDate),
                userConfig
            );
        } else if (type == 'year') {
            if (!year) errorHandler(res, 'Year not valid');
            info = await getAdminGraphForUserOfYear(year);
        }

        successResponse(res, {
            message: 'Successfully get Users',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getAdminGraphEarnings = async (req, res) => {
    try {
        const { startDate, endDate, year, type } = req.query;

        let dropEarningConfig = {};
        let info = [];

        if (type == 'normal') {
            if (!startDate || !endDate)
                return errorHandler(res, 'Date not vaid');
            info = await getGraphsForDropEarning(
                new Date(startDate),
                new Date(endDate),
                dropEarningConfig
            );
        } else if (type == 'year') {
            if (!year) return errorHandler(res, 'Year not valid');
            info = await getAdminGraphForEarningOfYear(year);
        }

        successResponse(res, {
            message: 'Successfully get Earning',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

const getAdminGraphForOrderOfYear = async year => {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let totalOrder = [];

    for (const month of allMonths) {
        const range = await getMonthDateRange(year, month);
        // console.log(range);
        let order = await Order.count({
            orderStatus: 'delivered',
            deliveredAt: {
                $gte: moment(new Date(range.start)),
                $lte: moment(new Date(range.end)),
            },
        });
        // console.log(month, order);

        totalOrder.push({
            order,
            month,
        });
    }

    return totalOrder;
};

const getAdminGraphForUserOfYear = async year => {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let totalUser = [];

    for (const month of allMonths) {
        const range = await getMonthDateRange(year, month);
        // console.log(range);
        let user = await UserModel.count({
            createdAt: {
                $gte: moment(new Date(range.start)),
                $lte: moment(new Date(range.end)),
            },
        });

        totalUser.push({
            user,
            month,
        });
    }

    return totalUser;
};

const getAdminGraphForEarningOfYear = async year => {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let totalEarning = [];

    for (const month of allMonths) {
        const range = await getMonthDateRange(year, month);
        let endDate = new Date(range.end);
        // console.log(range);
        let earning = await dropEarningsCal(new Date(range.start), endDate, {});

        totalEarning.push({
            earning,
            month,
        });
    }

    return totalEarning;
};

function getMonthDateRange(year, month) {
    var moment = require('moment');

    // month in moment is 0 based, so 9 is actually october, subtract 1 to compensate
    // array is 'year', 'month', 'day', etc
    var startDate = moment([year, month - 1]);

    // Clone the value before .endOf()
    var endDate = moment(startDate).endOf('month');

    // make sure to call toDate() for plain JavaScript date type
    return { start: startDate, end: endDate };
}

const getGraphsForAdminDashboard = async (startDate, endDate) => {
    const dates = await getDatesInRange(startDate, endDate);
    // console.log(dates);

    let totalOrder = [];
    let totalUser = [];
    let dropEarning = [];

    for (const date of dates) {
        order = await getGraphsForAdminDashboardOrder(date);

        user = await getGraphsForAdminDashboardUser(date);

        earning = await getGraphsForAdminDashboardDropEarning(date);

        totalOrder.push({
            order,
            date,
        });
        totalOrder.push({
            user,
            date,
        });
        totalOrder.push({
            user,
            date,
        });
    }

    return {
        graphs: {
            totalOrder,
            totalUser,
            dropEarning,
        },
    };
};

exports.getGraphsForOrder = async (startDate, endDate, config) => {
    const dates = await getDatesInRange(startDate, endDate);
    // console.log('order', dates);

    let totalOrder = [];

    for (const date of dates) {
        const startDateTime = moment(new Date(date)).startOf('day').toDate();
        const endDateTime = moment(new Date(date)).endOf('day').toDate();

        let order = await Order.count({
            ...config,
            order_placedAt: {
                $gte: moment(new Date(date)),
                $lt: moment(new Date(date)).add(1, 'days'),
            },
        });

        totalOrder.push({
            order,
            date,
        });
    }

    return totalOrder;
};

const getGraphsForUser = async (startDate, endDate, config) => {
    const dates = await getDatesInRange(startDate, endDate);
    // console.log(dates);

    let totalUser = [];

    for (const date of dates) {
        let user = await UserModel.count({
            ...config,
            createdAt: {
                $gte: moment(new Date(date)),
                $lt: moment(new Date(date)).add(1, 'days'),
            },
        });

        totalUser.push({
            user,
            date,
        });
    }

    return totalUser;
};

const getGraphsForDropEarning = async (startDate, endDate, config) => {
    const dates = await getDatesInRange(startDate, endDate);

    let totalEarning = [];

    for (const date of dates) {
        let earning = await dropEarningsCal(date, date, config);

        totalEarning.push({
            earning,
            date,
        });
    }

    return totalEarning;
};

// const getDeliveryManUnSettleAmount = async (
//     deliveryBoyId,
//     startDate,
//     endDate
// ) => {
//     const unSettleAddQuery = await Transection.aggregate([
//         {
//             $match: {
//                 createdAt: {
//                     $gte: new Date(startDate),
//                     $lt: new Date(endDate),
//                 },
//                 deliveryBoy: ObjectId(deliveryBoyId),
//                 account: 'deliveryBoy',
//                 status: 'success',
//                 type: {
//                     $in: [
//                         'deliveryBoyOrderDelivered',
//                         'deliveryBoyOrderDeliveredCash',
//                     ],
//                 },
//             },
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     const unSettleAdd = unSettleAddQuery[0] ? unSettleAddQuery[0].amount : 0;

//     const unSettleRemoveQuery = await Transection.aggregate([
//         {
//             $match: {
//                 deliveryBoy: ObjectId(deliveryBoyId),
//                 account: 'deliveryBoy',
//                 status: 'success',
//                 type: {
//                     $in: ['deliveryBoyAmountSettle'],
//                 },
//             },
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     const unSettleRemove = unSettleRemoveQuery[0]
//         ? unSettleRemoveQuery[0].amount
//         : 0;

//     return unSettleAdd - unSettleRemove;
// };

exports.getDeliveryManUnSettleAmount = async (
    deliveryBoyId,
    startDate,
    endDate,
    paidCurrency
) => {
    let commonConfig = {
        deliveryBoy: ObjectId(deliveryBoyId),
        account: 'deliveryBoy',
        status: 'success',
    };

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency,
        };
    }

    let unSettleAddConfig = {
        ...commonConfig,
        type: {
            $in: [
                'deliveryBoyOrderDelivered',
                'deliveryBoyOrderDeliveredCash',
                'deliveryBoyOrderDeliveredCashRefused',
            ],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        unSettleAddConfig = {
            ...unSettleAddConfig,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const unSettleAddQuery = await Transection.aggregate([
        {
            $match: unSettleAddConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
                riderTip: {
                    $sum: { $sum: ['$summary.baseCurrency_riderTip'] },
                },
                secondaryCurrency_riderTip: {
                    $sum: { $sum: ['$summary.secondaryCurrency_riderTip'] },
                },
            },
        },
    ]);

    const unSettleAdd = unSettleAddQuery[0] ? unSettleAddQuery[0].amount : 0;
    const unSettleAdd_sCurrency = unSettleAddQuery[0]
        ? unSettleAddQuery[0].secondaryCurrency_amount
        : 0;
    const unSettleRiderTipAdd = unSettleAddQuery[0]
        ? unSettleAddQuery[0].riderTip
        : 0;
    const unSettleRiderTipAdd_sCurrency = unSettleAddQuery[0]
        ? unSettleAddQuery[0].secondaryCurrency_riderTip
        : 0;

    let unSettleRemoveConfig = {
        ...commonConfig,
        type: {
            $in: ['deliveryBoyAmountSettle'],
        },
    };

    const unSettleRemoveQuery = await Transection.aggregate([
        {
            $match: unSettleRemoveConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
                riderTip: { $sum: { $sum: ['$riderTip'] } },
                secondaryCurrency_riderTip: {
                    $sum: { $sum: ['$secondaryCurrency_riderTip'] },
                },
            },
        },
    ]);

    const unSettleRemove = unSettleRemoveQuery[0]
        ? unSettleRemoveQuery[0].amount
        : 0;
    const unSettleRemove_sCurrency = unSettleRemoveQuery[0]
        ? unSettleRemoveQuery[0].secondaryCurrency_amount
        : 0;
    const unSettleRiderTipRemove = unSettleRemoveQuery[0]
        ? unSettleRemoveQuery[0].riderTip
        : 0;
    const unSettleRiderTipRemove_sCurrency = unSettleRemoveQuery[0]
        ? unSettleRemoveQuery[0].secondaryCurrency_riderTip
        : 0;

    const totalUnSettleAmount = unSettleAdd - unSettleRemove;
    const secondaryCurrency_totalUnSettleAmount =
        unSettleAdd_sCurrency - unSettleRemove_sCurrency;
    const totalUnSettleRiderTip = unSettleRiderTipAdd - unSettleRiderTipRemove;
    const secondaryCurrency_totalUnSettleRiderTip =
        unSettleRiderTipAdd_sCurrency - unSettleRiderTipRemove_sCurrency;

    return {
        totalUnSettleAmount,
        secondaryCurrency_totalUnSettleAmount,
        totalUnSettleRiderTip,
        secondaryCurrency_totalUnSettleRiderTip,
    };
    // return { totalUnSettleAmount };
};

// exports.getTotalCashInHandRider = async (
//     deliveryBoyId,
//     startDate,
//     endDate,
//     paidCurrency
// ) => {
//     let config = {
//         deliveryBoy: ObjectId(deliveryBoyId),
//         account: 'deliveryBoy',
//         type: {
//             $in: ['deliveryBoyOrderDeliveredCash'],
//         },
//     };

//     if (paidCurrency) {
//         config = {
//             ...config,
//             paidCurrency,
//         };
//     }

//     if (startDate) {
//         config = {
//             ...config,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     const cashInHandAddQuery = await Transection.aggregate([
//         {
//             $match: config,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$receivedAmount'] } },
//                 secondaryCurrency_amount: {
//                     $sum: { $sum: ['$secondaryCurrency_receivedAmount'] },
//                 },
//             },
//         },
//     ]);

//     let config2 = {
//         deliveryBoy: ObjectId(deliveryBoyId),
//         account: 'deliveryBoy',
//         status: 'success',
//         type: {
//             $in: ['deliveryBoyAdminAmountReceivedCash'],
//         },
//     };

//     if (paidCurrency) {
//         config2 = {
//             ...config2,
//             paidCurrency,
//         };
//     }

//     if (startDate) {
//         config2 = {
//             ...config2,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     const cashInHandRemoveQuery = await Transection.aggregate([
//         {
//             $match: config2,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//                 secondaryCurrency_amount: {
//                     $sum: { $sum: ['$secondaryCurrency_amount'] },
//                 },
//             },
//         },
//     ]);

//     const cashInHandAdd = cashInHandAddQuery[0]
//         ? cashInHandAddQuery[0].amount
//         : 0;
//     const secondaryCurrency_cashInHandAdd = cashInHandAddQuery[0]
//         ? cashInHandAddQuery[0].secondaryCurrency_amount
//         : 0;

//     const cashInHandRemove = cashInHandRemoveQuery[0]
//         ? cashInHandRemoveQuery[0].amount
//         : 0;
//     const secondaryCurrency_cashInHandRemove = cashInHandRemoveQuery[0]
//         ? cashInHandRemoveQuery[0].secondaryCurrency_amount
//         : 0;

//     const riderCashInHand = cashInHandAdd - cashInHandRemove;
//     const secondaryCurrency_riderCashInHand =
//         secondaryCurrency_cashInHandAdd - secondaryCurrency_cashInHandRemove;

//     return { riderCashInHand, secondaryCurrency_riderCashInHand };
// };

const shopOrderCalculation = async (shopId, startDate, endDate) => {
    const startDateTime = moment(new Date(startDate)).startOf('day').toDate();
    const endDateTime = moment(endDate ? new Date(endDate) : new Date())
        .endOf('day')
        .toDate();

    const fee = await Order.aggregate([
        {
            $match: {
                orderStatus: 'delivered',
                shop: ObjectId(shopId),
                deliveredAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            },
        },
        {
            $group: {
                _id: '',
                itemTotal: {
                    $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                },
                deliveryFeeTotal: {
                    $sum: { $sum: ['$summary.baseCurrency_riderFee'] },
                },
                dropChargeItemsTotal: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromOrder',
                        ],
                    },
                },
                dropChargeDeliveryFeeTotal: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromDelivery',
                        ],
                    },
                },
                totalDropAmount: {
                    $sum: {
                        $sum: ['$adminCharge.baseCurrency_totalAdminCharge'],
                    },
                },
                sellerEarnings: {
                    $sum: { $sum: ['$baseCurrency_shopEarnings'] },
                },
            },
        },
    ]);

    return fee[0];
};

exports.getShopsdashboardInfo = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const shopId = req.shopId;
        let orderConfig = {
            orderStatus: 'delivered',
            shop: shopId,
        };

        let config = {
            createdAt: {
                $gte: moment(new Date(startDate)),
                $lt: moment(new Date(endDate)),
            },
        };

        const shopDetails = await Shop.findById(shopId);

        const totalOrder = await Order.count({
            shop: shopId,
            ...config,
        });
        const totalCancelOrder = await Order.count({
            orderStatus: 'cancelled',
            shop: shopId,
            ...config,
        });
        const shopUnsettleAmountFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shopId,
            startDate,
            endDate,
        });
        const shopUnsettleAmount = shopUnsettleAmountFunc.totalSellerUnsettle;

        const orderCal = await shopOrderCalculation(shopId, startDate, endDate);
        // console.log(shopId, orderCal);

        let deliveryFeeAmount =
            shopDetails.haveOwnDeliveryBoy === true && orderCal
                ? orderCal?.deliveryFeeTotal
                : false;
        let profitFromDeliveryFee = orderCal
            ? orderCal?.deliveryFeeTotal - orderCal?.dropChargeDeliveryFeeTotal
            : 0;

        return res.json({
            status: true,
            message: 'message',
            data: {
                summery: {
                    totalOrder,
                    totalCancelOrder,
                    shopUnsettleAmount,
                    orderAmount: orderCal ? orderCal.itemTotal : 0,
                    profitFromOrderItems: orderCal
                        ? orderCal?.itemTotal - orderCal?.dropChargeItemsTotal
                        : 0,
                    profitFromDeliveryFee,
                    deliveryFeeAmount,
                    shopEarning: orderCal ? orderCal?.sellerEarnings : 0,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopGraphOrder = async (req, res) => {
    try {
        const { startDate, endDate, type, year, shopId } = req.query;

        let orderConfig = {
            shop: ObjectId(shopId),
            orderStatus: 'delivered',
        };

        let info = [];

        if (type == 'normal') {
            info = await this.getGraphsForOrder(
                new Date(startDate),
                new Date(endDate),
                orderConfig
            );
        } else if (type == 'year') {
            info = await getShopGraphForOrderOfYear(year, orderConfig);
        }

        successResponse(res, {
            message: 'Successfull',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getShopGraphForOrderOfYear = async (year, config) => {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let totalOrder = [];

    for (const month of allMonths) {
        const range = await getMonthDateRange(year, month);
        // console.log(range);
        let order = await Order.count({
            ...config,
            order_placedAt: {
                $gte: moment(new Date(range.start)),
                $lte: moment(new Date(range.end)),
            },
        });
        // console.log(month, order);

        totalOrder.push({
            order,
            month,
        });
    }

    return totalOrder;
};

exports.getShopGraphEarning = async (req, res) => {
    try {
        const { startDate, endDate, type, year } = req.query;

        const shopId = req.shopId;
        let info = [];

        if (type == 'normal') {
            info = await shopOrderCalForGraph(
                shopId,
                new Date(startDate),
                new Date(endDate)
            );
        } else if (type == 'year') {
            info = await getShopGraphForEarningOfYear(year, shopId);
        }

        successResponse(res, {
            message: 'Successfull',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const shopOrderCalForGraph = async (shopId, startDate, endDate) => {
    const dates = await getDatesInRange(startDate, endDate);

    let totalEarning = [];

    for (const date of dates) {
        const startDateTime = moment(new Date(date)).startOf('day').toDate();
        const endDateTime = moment(new Date(date)).endOf('day').toDate();

        let fee = await Order.aggregate([
            {
                $match: {
                    shop: ObjectId(shopId),
                    order_placedAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                    $or: [
                        { orderStatus: 'delivered' },
                        { paymentMethod: { $ne: 'cash' } },
                    ],
                },
            },
            {
                $group: {
                    _id: '',
                    sellerEarnings: {
                        $sum: { $sum: ['$baseCurrency_shopEarnings'] },
                    },
                },
            },
        ]);
        // console.log(fee)
        totalEarning.push({
            earning: fee[0] ? fee[0]?.sellerEarnings : 0,
            date,
        });
    }

    return totalEarning;
};
const getShopGraphForEarningOfYear = async (year, shopId) => {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let totalEarning = [];

    for (const month of allMonths) {
        const range = await getMonthDateRange(year, month);
        let endDate = new Date(range.end);
        let fee = await Order.aggregate([
            {
                $match: {
                    shop: ObjectId(shopId),
                    order_placedAt: {
                        $gte: new Date(range.start),
                        $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
                    },
                    $or: [
                        { orderStatus: 'delivered' },
                        { paymentMethod: { $ne: 'cash' } },
                    ],
                },
            },
            {
                $group: {
                    _id: '',
                    sellerEarnings: {
                        $sum: { $sum: ['$baseCurrency_shopEarnings'] },
                    },
                },
            },
        ]);

        totalEarning.push({
            earning: fee[0] ? fee[0]?.sellerEarnings : 0,
            month,
        });
    }

    return totalEarning;
};

// Graph for shop revenue
exports.getGraphOfRevenue = async (req, res) => {
    try {
        const { startDate, endDate, type, id } = req.query;

        if (!type && !['shop', 'seller'].includes(type))
            return errorResponse(res, {
                message: 'Type is not valid',
            });

        let info = await shopRevenueCalForGraph(
            type,
            id,
            new Date(startDate),
            new Date(endDate)
        );

        // if (type == 'normal') {
        //     info = await shopRevenueCalForGraph(
        //         shopId,
        //         new Date(startDate),
        //         new Date(endDate)
        //     );
        // } else if (type == 'year') {
        //     info = await getShopGraphForRevenueOfYear(year, shopId);
        // }

        successResponse(res, {
            message: 'Successful',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const shopRevenueCalForGraph = async (type, id, startDate, endDate) => {
    const dates = getDatesInRange(startDate, endDate);

    let totalRevenue = [];

    let config = {};

    if (type === 'shop') {
        config = { shop: ObjectId(id) };
    }
    if (type === 'seller') {
        config = { seller: ObjectId(id) };
    }

    for (const date of dates) {
        const startDateTime = moment(new Date(date)).startOf('day').toDate();
        const endDateTime = moment(new Date(date)).endOf('day').toDate();

        let fee = await Order.aggregate([
            {
                $match: {
                    ...config,
                    orderStatus: 'delivered',
                    deliveredAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                },
            },
            {
                $group: {
                    _id: '',
                    productAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                    },
                    totalShopDiscount: {
                        $sum: { $sum: ['$discountCut.discountShopCut'] },
                    },
                    totalRewardAmount: {
                        $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
                    },
                    totalAdminDoubleMenuItemPrice: {
                        $sum: {
                            $sum: [
                                '$doubleMenuItemPrice.doubleMenuItemPriceAdmin',
                            ],
                        },
                    },
                },
            },
        ]);

        // const revenue = fee[0]
        //     ? fee[0]?.productAmount -
        //       fee[0]?.totalDiscount -
        //       fee[0]?.totalRewardAmount -
        //       fee[0]?.totalDoubleMenuItemPrice
        //     : 0;
        const revenue = fee[0]
            ? fee[0]?.productAmount +
              fee[0]?.totalAdminDoubleMenuItemPrice -
              fee[0]?.totalShopDiscount -
              fee[0]?.totalRewardAmount
            : 0;

        totalRevenue.push({
            revenue,
            date,
        });
    }

    return totalRevenue;
};

// const getShopGraphForRevenueOfYear = async (year, shopId) => {
//     const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

//     let totalRevenue = [];

//     for (const month of allMonths) {
//         const range = getMonthDateRange(year, month);
//         let endDate = new Date(range.end);
//         let fee = await Order.aggregate([
//             {
//                 $match: {
//                     shop: ObjectId(shopId),
//                     createdAt: {
//                         $gte: new Date(range.start),
//                         $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
//                     },
//                     $or: [
//                         {
//                             $and: [
//                                 { orderFor: 'specific' },
//                                 {
//                                     orderStatus: {
//                                         $nin: [
//                                             'cancelled',
//                                             'placed',
//                                             'refused',
//                                             'schedule',
//                                         ],
//                                     },
//                                 },
//                             ],
//                         },
//                         {
//                             $and: [
//                                 { orderFor: 'global' },
//                                 { orderStatus: 'delivered' },
//                             ],
//                         },
//                     ],
//                 },
//             },
//             {
//                 $group: {
//                     _id: '',
//                     productAmount: {
//                         $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
//                     },
//                     totalDiscount: {
//                         $sum: { $sum: ['$summary.baseCurrency_discount'] },
//                     },
//                     totalRewardAmount: {
//                         $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
//                     },
//                     totalDoubleMenuItemPrice: {
//                         $sum: { $sum: ['$summary.baseCurrency_doubleMenuItemPrice'] },
//                     },
//                 },
//             },
//         ]);

//         const revenue = fee[0]
//             ? fee[0]?.productAmount -
//               fee[0]?.totalDiscount -
//               fee[0]?.totalRewardAmount -
//               fee[0]?.totalDoubleMenuItemPrice
//             : 0;

//         totalRevenue.push({
//             revenue,
//             month,
//         });
//     }

//     return totalRevenue;
// };

// Graph for shop payout
exports.getGraphOfPayout = async (req, res) => {
    try {
        const { startDate, endDate, type, id } = req.query;

        if (!type && !['shop', 'seller'].includes(type))
            return errorResponse(res, {
                message: 'Type is not valid',
            });

        let info = await shopPayoutCalForGraph(
            type,
            id,
            new Date(startDate),
            new Date(endDate)
        );

        // if (type == 'normal') {
        //     info = await shopPayoutCalForGraph(
        //         shopId,
        //         new Date(startDate),
        //         new Date(endDate)
        //     );
        // } else if (type == 'year') {
        //     info = await getShopGraphForPayoutOfYear(year, shopId);
        // }

        successResponse(res, {
            message: 'Successful',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const shopPayoutCalForGraph = async (type, id, startDate, endDate) => {
    const dates = getDatesInRange(startDate, endDate);

    let totalPayout = [];

    for (const date of dates) {
        const totalShopEarningFunc = await getShopEarning({
            type,
            id,
            startDate: date,
            endDate: date,
        });
        const totalShopEarning = totalShopEarningFunc.totalShopEarning;

        const totalSellerUnsettleFunc = await getShopUnSettleAmount({
            type,
            id,
            startDate: date,
            endDate: date,
        });
        const totalSellerUnsettle = totalSellerUnsettleFunc.totalSellerUnsettle;

        const payout = parseFloat(
            (totalShopEarning + totalSellerUnsettle).toFixed(2)
        );

        totalPayout.push({
            payout,
            date,
        });
    }

    return totalPayout;
};

// const getShopGraphForPayoutOfYear = async (year, shopId) => {
//     const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

//     let totalPayout = [];

//     for (const month of allMonths) {
//         const range = getMonthDateRange(year, month);
//         const startDate = new Date(range.start);
//         const endDate = new Date(range.end);

//         const totalShopEarning = await this.getTotalEarning(
//             'shop',
//             shopId,
//             startDate,
//             endDate
//         );

//         const totalSellerUnsettle = await this.getTotalUnSettleAmount(
//             'shop',
//             shopId,
//             startDate,
//             endDate
//         );

//         const totalDeliveryFee = await this.getTotalDeliveryFee(
//             'shop',
//             shopId,
//             startDate,
//             endDate
//         );

//         const payout =
//             totalShopEarning + totalSellerUnsettle + totalDeliveryFee;

//         totalPayout.push({
//             payout,
//             month,
//         });
//     }

//     return totalPayout;
// };

// Graph for shop marketing spent
exports.getGraphOfMarketingSpent = async (req, res) => {
    try {
        const { startDate, endDate, type, id } = req.query;

        if (!type && !['shop', 'seller'].includes(type))
            return errorResponse(res, {
                message: 'Type is not valid',
            });

        let info = await shopMarketingSpentCalForGraph(
            type,
            id,
            new Date(startDate),
            new Date(endDate)
        );

        // if (type == 'normal') {
        //     info = await shopMarketingSpentCalForGraph(
        //         shopId,
        //         new Date(startDate),
        //         new Date(endDate)
        //     );
        // } else if (type == 'year') {
        //     info = await getShopGraphForMarketingSpentOfYear(year, shopId);
        // }

        successResponse(res, {
            message: 'Successful',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const shopMarketingSpentCalForGraph = async (type, id, startDate, endDate) => {
    const dates = getDatesInRange(startDate, endDate);

    let totalMarketingSpent = [];

    let config = {};

    if (type === 'shop') {
        config = { shop: ObjectId(id) };
    }
    if (type === 'seller') {
        config = { seller: ObjectId(id) };
    }

    for (const date of dates) {
        const startDateTime = moment(new Date(date)).startOf('day').toDate();
        const endDateTime = moment(new Date(date)).endOf('day').toDate();

        const totalValue = await Order.aggregate([
            {
                $match: {
                    ...config,
                    orderStatus: 'delivered',
                    deliveredAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                },
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    totalDiscount: {
                        $sum: { $sum: ['$summary.baseCurrency_discount'] },
                    },
                    totalShopDiscount: {
                        $sum: { $sum: ['$discountCut.discountShopCut'] },
                    },
                    totalAdminDiscount: {
                        $sum: { $sum: ['$discountCut.discountAdminCut'] },
                    },
                    totalRewardAmount: {
                        $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
                    },
                    totalShopRewardAmount: {
                        $sum: { $sum: ['$rewardRedeemCut.rewardShopCut'] },
                    },
                    totalAdminRewardAmount: {
                        $sum: { $sum: ['$rewardRedeemCut.rewardAdminCut'] },
                    },
                    totalDoubleMenuItemPrice: {
                        $sum: {
                            $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
                        },
                    },
                    totalShopDoubleMenuItemPrice: {
                        $sum: {
                            $sum: [
                                '$doubleMenuItemPrice.doubleMenuItemPriceShop',
                            ],
                        },
                    },
                    totalAdminDoubleMenuItemPrice: {
                        $sum: {
                            $sum: [
                                '$doubleMenuItemPrice.doubleMenuItemPriceAdmin',
                            ],
                        },
                    },
                    totalShopDoubleMenuCut: {
                        $sum: { $sum: ['$doubleMenuCut.doubleMenuShopCut'] },
                    },
                    totalAdminDoubleMenuCut: {
                        $sum: { $sum: ['$doubleMenuCut.doubleMenuAdminCut'] },
                    },
                    totalFreeDeliveryShopLoss: {
                        $sum: {
                            $sum: [
                                '$freeDeliveryCut.baseCurrency_shopLossForFreeDelivery',
                            ],
                        },
                    },
                    totalFreeDeliveryAdminLoss: {
                        $sum: {
                            $sum: [
                                '$freeDeliveryCut.baseCurrency_dropLossForFreeDelivery',
                            ],
                        },
                    },
                    totalCouponDiscount: {
                        $sum: {
                            $sum: [
                                '$summary.baseCurrency_couponDiscountAmount',
                            ],
                        },
                    },
                    totalCouponAdminCut: {
                        $sum: {
                            $sum: [
                                '$couponDiscountCut.baseCurrency_couponAdminCut',
                            ],
                        },
                    },
                    totalCouponShopCut: {
                        $sum: {
                            $sum: [
                                '$couponDiscountCut.baseCurrency_couponShopCut',
                            ],
                        },
                    },
                    totalPunchMarketingDiscount: {
                        $sum: {
                            $sum: [
                                '$summary.baseCurrency_punchMarketingDiscountAmount',
                            ],
                        },
                    },
                },
            },
        ]);

        if (totalValue.length < 1) {
            totalValue.push({
                totalDiscount: 0,
                totalShopDiscount: 0,
                totalAdminDiscount: 0,
                totalRewardAmount: 0,
                totalShopRewardAmount: 0,
                totalAdminRewardAmount: 0,
                totalDoubleMenuItemPrice: 0,
                totalShopDoubleMenuItemPrice: 0,
                totalAdminDoubleMenuItemPrice: 0,
                totalShopDoubleMenuCut: 0,
                totalAdminDoubleMenuCut: 0,
                totalFreeDeliveryShopLoss: 0,
                totalFreeDeliveryAdminLoss: 0,
                totalCouponDiscount: 0,
                totalCouponAdminCut: 0,
                totalCouponShopCut: 0,
                totalPunchMarketingDiscount: 0,
            });
        }

        // const shopOrders = await Order.find({
        //     ...config,
        //     orderStatus: 'delivered',
        //     createdAt: {
        //         $gte: new Date(date),
        //         $lt: new Date(new Date(date).setDate(date.getDate() + 1)),
        //     },
        // }).populate('orderDeliveryCharge');
        // const freeDeliveryShopCut = shopOrders.reduce(
        //     (accumulator, currentValue) =>
        //         accumulator + currentValue.orderDeliveryCharge.shopCut,
        //     0
        // );

        // const freeDeliveryDropCut = shopOrders.reduce(
        //     (accumulator, currentValue) =>
        //         accumulator + currentValue.orderDeliveryCharge.dropCut,
        //     0
        // );

        // Featured amount
        const totalFeaturedAmountQuery = await Transection.aggregate([
            {
                $match: {
                    ...config,
                    createdAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                    account: 'shop',
                    type: 'shopPayForFeatured',
                },
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    amount: { $sum: { $sum: ['$amount'] } },
                },
            },
        ]);

        const totalFeaturedAmount = totalFeaturedAmountQuery.length
            ? totalFeaturedAmountQuery[0].amount
            : 0;

        // const totalDoubleMenuCut =
        //     totalValue[0].totalShopDoubleMenuItemPrice +
        //     totalValue[0].totalAdminDoubleMenuCut;

        const marketingSpent =
            totalValue[0].totalDiscount +
            totalValue[0].totalRewardAmount +
            // totalDoubleMenuCut +
            totalValue[0].totalDoubleMenuItemPrice +
            totalValue[0].totalFreeDeliveryShopLoss +
            totalValue[0].totalFreeDeliveryAdminLoss +
            totalValue[0].totalCouponDiscount +
            totalFeaturedAmount +
            // totalPunchMarketingDiscount;
            totalValue[0].totalPunchMarketingDiscount;

        const marketingSpentForShop =
            totalValue[0].totalShopDiscount +
            totalValue[0].totalShopRewardAmount +
            totalValue[0].totalShopDoubleMenuItemPrice +
            totalValue[0].totalFreeDeliveryShopLoss +
            totalValue[0].totalCouponShopCut +
            totalFeaturedAmount;

        const marketingSpentForAdmin =
            totalValue[0].totalAdminDiscount +
            totalValue[0].totalAdminRewardAmount +
            // totalValue[0].totalAdminDoubleMenuCut +
            totalValue[0].totalAdminDoubleMenuItemPrice +
            totalValue[0].totalFreeDeliveryAdminLoss +
            totalValue[0].totalCouponAdminCut;

        totalMarketingSpent.push({
            marketingSpent,
            marketingSpentForShop,
            marketingSpentForAdmin,
            totalDiscount: totalValue[0].totalDiscount,
            totalShopDiscount: totalValue[0].totalShopDiscount,
            totalAdminDiscount: totalValue[0].totalAdminDiscount,
            totalRewardAmount: totalValue[0].totalRewardAmount,
            totalShopRewardAmount: totalValue[0].totalShopRewardAmount,
            totalAdminRewardAmount: totalValue[0].totalAdminRewardAmount,
            totalDoubleMenuItemPrice: totalValue[0].totalDoubleMenuItemPrice,
            totalShopDoubleMenuItemPrice:
                totalValue[0].totalShopDoubleMenuItemPrice,
            totalAdminDoubleMenuItemPrice:
                totalValue[0].totalAdminDoubleMenuItemPrice,
            // totalDoubleMenuCut,
            totalShopDoubleMenuCut: totalValue[0].totalShopDoubleMenuCut,
            totalAdminDoubleMenuCut: totalValue[0].totalAdminDoubleMenuCut,
            freeDeliveryShopCut: totalValue[0].totalFreeDeliveryShopLoss,
            freeDeliveryDropCut: totalValue[0].totalFreeDeliveryAdminLoss,
            totalFreeDelivery:
                totalValue[0].totalFreeDeliveryShopLoss +
                totalValue[0].totalFreeDeliveryAdminLoss,
            totalFeaturedAmount,
            totalCouponDiscount: totalValue[0].totalCouponDiscount,
            totalCouponAdminCut: totalValue[0].totalCouponAdminCut,
            totalCouponShopCut:
                totalValue[0].totalCouponShopCut -
                totalValue[0].totalPunchMarketingDiscount,
            totalPunchMarketingDiscount:
                totalValue[0].totalPunchMarketingDiscount,
            date,
        });
    }

    return totalMarketingSpent;
};
// const getShopGraphForMarketingSpentOfYear = async (year, shopId) => {
//     const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

//     let totalMarketingSpent = [];

//     for (const month of allMonths) {
//         const range = getMonthDateRange(year, month);
//         let endDate = new Date(range.end);

//         const totalValue = await Order.aggregate([
//             {
//                 $match: {
//                     shop: ObjectId(shopId),
//                     createdAt: {
//                         $gte: new Date(range.start),
//                         $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
//                     },
//                     $or: [
//                         {
//                             $and: [
//                                 { orderFor: 'specific' },
//                                 {
//                                     orderStatus: {
//                                         $nin: [
//                                             'cancelled',
//                                             'placed',
//                                             'refused',
//                                             'schedule',
//                                         ],
//                                     },
//                                 },
//                             ],
//                         },
//                         {
//                             $and: [
//                                 { orderFor: 'global' },
//                                 { orderStatus: 'delivered' },
//                             ],
//                         },
//                     ],
//                 },
//             },
//             {
//                 $group: {
//                     _id: '',
//                     count: { $sum: 1 },
//                     totalDiscount: {
//                         $sum: { $sum: ['$summary.baseCurrency_discount'] },
//                     },
//                     totalRewardAmount: {
//                         $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
//                     },
//                     totalDoubleMenuItemPrice: {
//                         $sum: { $sum: ['$summary.baseCurrency_doubleMenuItemPrice'] },
//                     },
//                 },
//             },
//         ]);
//         if (totalValue.length < 1) {
//             totalValue.push({
//                 totalDiscount: 0,
//                 totalRewardAmount: 0,
//                 totalDoubleMenuItemPrice: 0,
//             });
//         }

//         const shopOrders = await Order.find({
//             shop: ObjectId(shopId),
//             createdAt: {
//                 $gte: new Date(range.start),
//                 $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
//             },
//         }).populate('orderDeliveryCharge');
//         const freeDeliveryShopCut = shopOrders.reduce(
//             (accumulator, currentValue) =>
//                 accumulator + currentValue.orderDeliveryCharge.shopCut,
//             0
//         );

//         // Featured amount
//         const totalFeaturedAmountQuery = await Transection.aggregate([
//             {
//                 $match: {
//                     shop: ObjectId(shopId),
//                     createdAt: {
//                         $gte: new Date(range.start),
//                         $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
//                     },
//                     account: 'shop',
//                     type: 'shopPayForFeatured',
//                 },
//             },
//             {
//                 $group: {
//                     _id: '',
//                     count: { $sum: 1 },
//                     amount: { $sum: { $sum: ['$amount'] } },
//                 },
//             },
//         ]);

//         const totalFeaturedAmount = totalFeaturedAmountQuery.length
//             ? totalFeaturedAmountQuery[0].amount
//             : 0;

//         const marketingSpent =
//             totalValue[0].totalDiscount +
//             totalValue[0].totalRewardAmount +
//             totalValue[0].totalDoubleMenuItemPrice +
//             freeDeliveryShopCut +
//             totalFeaturedAmount;

//         totalMarketingSpent.push({
//             marketingSpent,
//             totalDiscount: totalValue[0].totalDiscount,
//             totalRewardAmount: totalValue[0].totalRewardAmount,
//             totalDoubleMenuItemPrice: totalValue[0].totalDoubleMenuItemPrice,
//             freeDeliveryShopCut,
//             totalFeaturedAmount,
//             month,
//         });
//     }

//     return totalMarketingSpent;
// };

// Graph for shop orders issue
exports.getGraphOfOrdersIssue = async (req, res) => {
    try {
        const { startDate, endDate, type, id } = req.query;

        if (!type && !['shop', 'seller'].includes(type))
            return errorResponse(res, {
                message: 'Type is not valid',
            });

        let info = await shopOrdersIssueCalForGraph(
            type,
            id,
            new Date(startDate),
            new Date(endDate)
        );

        // if (type == 'normal') {
        //     info = await shopOrdersIssueCalForGraph(
        //         shopId,
        //         new Date(startDate),
        //         new Date(endDate)
        //     );
        // } else if (type == 'year') {
        //     info = await getShopGraphForOrderIssueOfYear(year, shopId);
        // }

        successResponse(res, {
            message: 'Successful',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const shopOrdersIssueCalForGraph = async (type, id, startDate, endDate) => {
    // const dates = getDatesInRange(startDate, endDate);
    // let totalOrdersIssue = [];

    let config = {};

    if (type === 'shop') {
        config = { shop: ObjectId(id) };
    }
    if (type === 'seller') {
        config = { seller: ObjectId(id) };
    }

    /*
    for (const date of dates) {
        const startDateTime = moment(new Date(date)).startOf('day').toDate();
        const endDateTime = moment(new Date(date)).endOf('day').toDate();

        console.log('\n_______startDateTime', startDateTime);

        // const totalValue = await Order.aggregate([
        //     {
        //         $match: {
        //             ...config,
        //             createdAt: {
        //                 $gte: startDateTime,
        //                 $lte: endDateTime,
        //             },
        //             flag: { $exists: true, $ne: [] },
        //         },
        //     },
        //     {
        //         $count: 'orderCount',
        //     },
        // ]);

        // const ordersIssue = totalValue[0] ? totalValue[0].orderCount : 0;
    */

    const flaggedTypes = ['replacement', 'refunded', 'late', 'normal'];

    const allDates = [];
    for (
        let m = moment(startDate);
        m.isBefore(moment(endDate).add(1, 'days'));
        m.add(1, 'days')
    ) {
        allDates.push(m.format('YYYY-MM-DD'));
    }

    const startDateTime = moment(new Date(startDate)).startOf('day').toDate();
    const endDateTime = moment(new Date(endDate)).endOf('day').toDate();

    const orderPipeline = [
        {
            $match: {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
                $or: [
                    { flag: { $exists: true, $ne: [] } },
                    { cancelledAt: { $exists: true, $ne: null } },
                ],
            },
        },
        {
            $addFields: {
                date: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                cancelledFlag: {
                    $cond: {
                        if: { $ne: ['$cancelledAt', null] },
                        then: 1,
                        else: 0,
                    },
                },
            },
        },
        {
            $lookup: {
                from: 'flags',
                localField: 'flag',
                foreignField: '_id',
                as: 'flagDetails',
            },
        },
        {
            $unwind: {
                path: '$flagDetails',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $group: {
                _id: {
                    order: '$_id',
                    date: '$date',
                    flaggedType: '$flagDetails.flaggedType',
                },
                count: { $sum: 1 },
                cancelledFlag: { $max: '$cancelledFlag' },
            },
        },
        {
            $group: {
                _id: {
                    date: '$_id.date',
                    flaggedType: '$_id.flaggedType',
                },
                count: { $sum: 1 },
                cancelledCount: { $sum: '$cancelledFlag' },
            },
        },
        {
            $group: {
                _id: '$_id.date',
                counts: {
                    $push: {
                        flaggedType: '$_id.flaggedType',
                        count: '$count',
                    },
                },
                cancelledCount: { $sum: '$cancelledCount' },
            },
        },
        {
            $addFields: {
                counts: {
                    $concatArrays: [
                        '$counts',
                        [
                            {
                                flaggedType: 'cancelled',
                                count: '$cancelledCount',
                            },
                        ],
                    ],
                },
            },
        },
        {
            $addFields: {
                counts: {
                    $arrayToObject: {
                        $map: {
                            input: { $setUnion: [flaggedTypes, ['cancelled']] },
                            as: 'type',
                            in: {
                                k: '$$type',
                                v: {
                                    $reduce: {
                                        input: '$counts',
                                        initialValue: 0,
                                        in: {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        '$$this.flaggedType',
                                                        '$$type',
                                                    ],
                                                },
                                                '$$this.count',
                                                '$$value',
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                date: '$_id',
                counts: 1,
            },
        },
    ];

    const ordersTotal = await Order.aggregate(orderPipeline);

    // Merge results with the full list of dates
    const totalOrdersIssue = allDates.map(date => {
        const order = ordersTotal.find(order => order.date === date) || {
            counts: {},
        };
        const flaggedTypeCounts = flaggedTypes.reduce((acc, type) => {
            acc[type] = order.counts[type] || 0;
            return acc;
        }, {});

        flaggedTypeCounts.cancelled = order.counts.cancelled || 0;

        flaggedTypeCounts.totalFlags =
            flaggedTypes.reduce(
                (sum, type) => sum + flaggedTypeCounts[type],
                0
            ) + flaggedTypeCounts.cancelled;

        return {
            date,
            ...flaggedTypeCounts,
        };
    });

    return totalOrdersIssue;
};
// const getShopGraphForOrderIssueOfYear = async (year, shopId) => {
//     const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

//     let totalOrdersIssue = [];

//     for (const month of allMonths) {
//         const range = getMonthDateRange(year, month);
//         let endDate = new Date(range.end);

//         const totalValue = await Order.aggregate([
//             {
//                 $match: {
//                     shop: ObjectId(shopId),
//                     createdAt: {
//                         $gte: new Date(range.start),
//                         $lt: new Date(endDate.setDate(endDate.getDate() + 1)),
//                     },
//                     flag: { $exists: true, $ne: [] },
//                 },
//             },
//             {
//                 $count: 'orderCount',
//             },
//         ]);

//         const ordersIssue = totalValue[0] ? totalValue[0].orderCount : 0;

//         totalOrdersIssue.push({
//             ordersIssue,
//             month,
//         });
//     }

//     return totalOrdersIssue;
// };

// Graph for shop customers sales
exports.getGraphOfCustomersSales = async (req, res) => {
    try {
        const { startDate, endDate, type, id } = req.query;

        if (!type && !['shop', 'seller'].includes(type))
            return errorResponse(res, {
                message: 'Type is not valid',
            });

        let info = await customersSalesCalForGraph(
            type,
            id,
            new Date(startDate),
            new Date(endDate)
        );

        successResponse(res, {
            message: 'Successful',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const customersSalesCalForGraph = async (type, id, startDate, endDate) => {
    const dates = getDatesInRange(startDate, endDate);
    const startDateTime = moment(new Date(startDate)).startOf('day').toDate();
    const endDateTime = moment(endDate ? new Date(endDate) : new Date())
        .endOf('day')
        .toDate();

    let shopCustomersSales = [];

    let config = {};

    if (type === 'shop') {
        config = { shop: ObjectId(id) };
    }
    if (type === 'seller') {
        config = { seller: ObjectId(id) };
    }

    const newUsersLifeTime = await Order.aggregate([
        {
            $match: {
                ...config,
                orderStatus: 'delivered',
            },
        },
        {
            $group: {
                _id: '$user',
                orderCount: { $sum: 1 },
            },
        },
        {
            $match: {
                orderCount: 1,
            },
        },
        {
            $group: {
                _id: null,
                newUserCount: { $sum: 1 },
                userIDs: { $push: '$_id' },
            },
        },
    ]);
    const newUserIDListLifeTime = newUsersLifeTime[0]
        ? newUsersLifeTime[0].userIDs
        : [];
    const newUsers = await Order.aggregate([
        {
            $match: {
                ...config,
                orderStatus: 'delivered',
                deliveredAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            },
        },
        {
            $group: {
                _id: '$user',
                orderCount: { $sum: 1 },
            },
        },
        {
            $match: {
                _id: { $in: newUserIDListLifeTime },
            },
        },
        {
            $group: {
                _id: null,
                newUserCount: { $sum: 1 },
                userIDs: { $push: '$_id' },
            },
        },
    ]);
    const newUserIDList = newUsers[0] ? newUsers[0].userIDs : [];

    const repeatedUsersLifeTime = await Order.aggregate([
        {
            $match: {
                ...config,
                orderStatus: 'delivered',
            },
        },
        {
            $group: {
                _id: '$user',
                orderCount: { $sum: 1 },
            },
        },
        {
            $match: {
                orderCount: { $gt: 1 },
            },
        },
        {
            $group: {
                _id: null,
                repeatedUserCount: { $sum: 1 },
                userIDs: { $push: '$_id' },
            },
        },
    ]);
    const repeatedUserIDListLifeTime = repeatedUsersLifeTime[0]
        ? repeatedUsersLifeTime[0].userIDs
        : [];
    const repeatedUserIDListLifeTimeString = repeatedUserIDListLifeTime.map(
        id => id.toString()
    );

    const repeatedUsers = await Order.aggregate([
        {
            $match: {
                ...config,
                orderStatus: 'delivered',
                deliveredAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            },
        },
        {
            $group: {
                _id: '$user',
                orderCount: { $sum: 1 },
            },
        },
        {
            $match: {
                _id: { $in: repeatedUserIDListLifeTime },
            },
        },
        {
            $group: {
                _id: null,
                repeatedUserCount: { $sum: 1 },
                userIDs: { $push: '$_id' },
            },
        },
    ]);
    const repeatedUserIDList = repeatedUsers[0] ? repeatedUsers[0].userIDs : [];
    const repeatedUserIDListString = repeatedUserIDList.map(id =>
        id.toString()
    );

    const lapsedUserIDList = repeatedUserIDListLifeTimeString.filter(
        id => !repeatedUserIDListString.includes(id)
    );

    for (const date of dates) {
        const startDateTime = moment(new Date(date)).startOf('day').toDate();
        const endDateTime = moment(new Date(date)).endOf('day').toDate();

        const allCustomersSales = await Order.aggregate([
            {
                $match: {
                    ...config,
                    orderStatus: 'delivered',
                    deliveredAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                },
            },

            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    productAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                    },
                    totalDiscount: {
                        $sum: { $sum: ['$summary.baseCurrency_discount'] },
                    },
                    totalRewardAmount: {
                        $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
                    },
                    // totalDoubleMenuItemPrice: {
                    //     $sum: {
                    //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
                    //     },
                    // },
                },
            },
        ]);
        if (allCustomersSales.length < 1) {
            allCustomersSales.push({
                count: 0,
                productAmount: 0,
                totalDiscount: 0,
                totalRewardAmount: 0,
                // totalDoubleMenuItemPrice: 0,
            });
        }

        const totalCustomersSales =
            allCustomersSales[0].productAmount -
            allCustomersSales[0].totalDiscount -
            // allCustomersSales[0].totalDoubleMenuItemPrice -
            allCustomersSales[0].totalRewardAmount;

        const newUsersSales = await Order.aggregate([
            {
                $match: {
                    ...config,
                    user: { $in: newUserIDList },
                    orderStatus: 'delivered',
                    deliveredAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                },
            },

            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    productAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                    },
                    totalDiscount: {
                        $sum: { $sum: ['$summary.baseCurrency_discount'] },
                    },
                    totalRewardAmount: {
                        $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
                    },
                    // totalDoubleMenuItemPrice: {
                    //     $sum: {
                    //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
                    //     },
                    // },
                },
            },
        ]);
        if (newUsersSales.length < 1) {
            newUsersSales.push({
                count: 0,
                productAmount: 0,
                totalDiscount: 0,
                totalRewardAmount: 0,
                // totalDoubleMenuItemPrice: 0,
            });
        }
        const newCustomersSales =
            newUsersSales[0].productAmount -
            newUsersSales[0].totalDiscount -
            // newUsersSales[0].totalDoubleMenuItemPrice -
            newUsersSales[0].totalRewardAmount;

        const repeatedUsersSales = await Order.aggregate([
            {
                $match: {
                    ...config,
                    user: { $in: repeatedUserIDList },
                    orderStatus: 'delivered',
                    deliveredAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                },
            },

            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    productAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                    },
                    totalDiscount: {
                        $sum: { $sum: ['$summary.baseCurrency_discount'] },
                    },
                    totalRewardAmount: {
                        $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
                    },
                    // totalDoubleMenuItemPrice: {
                    //     $sum: {
                    //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
                    //     },
                    // },
                },
            },
        ]);
        if (repeatedUsersSales.length < 1) {
            repeatedUsersSales.push({
                count: 0,
                productAmount: 0,
                totalDiscount: 0,
                totalRewardAmount: 0,
                // totalDoubleMenuItemPrice: 0,
            });
        }

        const repeatedCustomersSales =
            repeatedUsersSales[0].productAmount -
            repeatedUsersSales[0].totalDiscount -
            // repeatedUsersSales[0].totalDoubleMenuItemPrice -
            repeatedUsersSales[0].totalRewardAmount;

        const lapsedUsersSales = await Order.aggregate([
            {
                $match: {
                    ...config,
                    user: { $in: lapsedUserIDList },
                    orderStatus: 'delivered',
                    deliveredAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                },
            },

            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    productAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                    },
                    totalDiscount: {
                        $sum: { $sum: ['$summary.baseCurrency_discount'] },
                    },
                    totalRewardAmount: {
                        $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
                    },
                    // totalDoubleMenuItemPrice: {
                    //     $sum: {
                    //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
                    //     },
                    // },
                },
            },
        ]);
        if (lapsedUsersSales.length < 1) {
            lapsedUsersSales.push({
                count: 0,
                productAmount: 0,
                totalDiscount: 0,
                totalRewardAmount: 0,
                // totalDoubleMenuItemPrice: 0,
            });
        }

        const lapsedCustomersSales =
            lapsedUsersSales[0].productAmount -
            lapsedUsersSales[0].totalDiscount -
            // lapsedUsersSales[0].totalDoubleMenuItemPrice -
            lapsedUsersSales[0].totalRewardAmount;

        shopCustomersSales.push({
            totalCustomersSales,
            newCustomersSales,
            repeatedCustomersSales,
            lapsedCustomersSales,
            date,
        });
    }

    return shopCustomersSales;
};

// Graph for hourly orders
// 1: Sunday
// 2: Monday
// 3: Tuesday
// 4: Wednesday
// 5: Thursday
// 6: Friday
// 7: Saturday
exports.getShopGraphOrderByHourly = async (req, res) => {
    try {
        const { startDate, endDate, type, shopId, timeZone = '6' } = req.query;

        let orderConfig = {
            shop: ObjectId(shopId),
        };

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            orderConfig = {
                ...orderConfig,
                order_placedAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (type === 'delivered') {
            orderConfig = {
                ...orderConfig,
                orderStatus: 'delivered',
            };
        }
        if (type === 'incomplete') {
            orderConfig = {
                ...orderConfig,
                orderStatus: { $nin: ['delivered'] },
            };
        }

        const hourlyOrders = await Order.aggregate([
            {
                $match: orderConfig,
            },
            {
                $group: {
                    _id: {
                        dayOfWeek: {
                            $dayOfWeek: {
                                $add: [
                                    '$order_placedAt',
                                    Number(timeZone) * 60 * 60 * 1000,
                                ],
                            },
                        },
                        hourOfDay: {
                            $hour: {
                                $add: [
                                    '$order_placedAt',
                                    Number(timeZone) * 60 * 60 * 1000,
                                ],
                            },
                        },
                    },
                    orderCount: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: {
                        dayOfWeek: '$_id.dayOfWeek',
                        hourOfDay: '$_id.hourOfDay',
                    },
                    avgOrderCount: { $avg: '$orderCount' },
                },
            },
            {
                $group: {
                    _id: '$_id.dayOfWeek',
                    hourlyOrderCounts: {
                        $push: {
                            hourOfDay: '$_id.hourOfDay',
                            avgOrderCount: '$avgOrderCount',
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    dayOfWeek: '$_id',
                    hourlyOrderCounts: 1,
                },
            },
            {
                $sort: { dayOfWeek: 1 },
            },
        ]);

        successResponse(res, {
            message: 'Successful',
            data: {
                hourlyOrders,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSellerGraphOrder = async (req, res) => {
    try {
        const { startDate, endDate, year, type, sellerId } = req.query;

        let orderConfig = {
            seller: sellerId,
            orderStatus: 'delivered',
        };

        let info = [];

        if (type == 'normal') {
            info = await this.getGraphsForOrder(
                new Date(startDate),
                new Date(endDate),
                orderConfig
            );
        } else if (type == 'year') {
            info = await getSellerGraphForOrderOfYear(year, orderConfig);
        }

        successResponse(res, {
            message: 'Success',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getSellerGraphForOrderOfYear = async (year, config) => {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let totalOrder = [];

    for (const month of allMonths) {
        const range = await getMonthDateRange(year, month);
        // console.log(range);
        let order = await Order.count({
            ...config,
            order_placedAt: {
                $gte: moment(new Date(range.start)),
                $lte: moment(new Date(range.end)),
            },
        });
        // console.log(month, order);

        totalOrder.push({
            order,
            month,
        });
    }

    return totalOrder;
};

exports.getSellerGraphEarning = async (req, res) => {
    try {
        const { startDate, endDate, type, year } = req.query;

        const sellerId = req.sellerId;

        let info = [];

        if (type == 'normal') {
            info = await sellerOrderCalGraph(
                sellerId,
                new Date(startDate),
                new Date(endDate)
            );
        } else if (type == 'year') {
            info = await getSellerGraphForEarningOfYear(year, sellerId);
        }

        successResponse(res, {
            message: 'Success',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getSellerGraphForEarningOfYear = async (year, sellerId) => {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let totalEarning = [];

    for (const month of allMonths) {
        const range = await getMonthDateRange(year, month);

        const fee = await Order.aggregate([
            {
                $match: {
                    seller: ObjectId(sellerId),
                    order_placedAt: {
                        $gte: moment(new Date(range.start)).toDate(),
                        $lte: moment(new Date(range.end)).toDate(),
                    },
                    $or: [
                        { orderStatus: 'delivered' },
                        { paymentMethod: { $ne: 'cash' } },
                    ],
                },
            },
            {
                $group: {
                    _id: '',
                    sellerEarnings: {
                        $sum: { $sum: ['$baseCurrency_shopEarnings'] },
                    },
                },
            },
        ]);

        // console.log(fee)
        totalEarning.push({
            earning: fee[0] ? fee[0]?.sellerEarnings : 0,
            month,
        });
    }

    return totalEarning;
};

const sellerOrderCalGraph = async (sellerId, startDate, endDate) => {
    const dates = await getDatesInRange(startDate, endDate);

    let totalEarning = [];

    for (const date of dates) {
        const startDateTime = moment(new Date(date)).startOf('day').toDate();
        const endDateTime = moment(new Date(date)).endOf('day').toDate();

        const fee = await Order.aggregate([
            {
                $match: {
                    seller: ObjectId(sellerId),
                    order_placedAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                    $or: [
                        { orderStatus: 'delivered' },
                        { paymentMethod: { $ne: 'cash' } },
                    ],
                },
            },
            {
                $group: {
                    _id: '',
                    sellerEarnings: {
                        $sum: { $sum: ['$baseCurrency_shopEarnings'] },
                    },
                },
            },
        ]);

        totalEarning.push({
            earning: fee[0] ? fee[0]?.sellerEarnings : 0,
            date,
        });
    }

    return totalEarning;
};

//*** Sales Dashboard ***/
exports.getSingleSalesDashBoard = async (req, res) => {
    try {
        const {
            sellerId,
            shopPage = 1,
            shopPageSize = 50,
            salesPage = 1,
            salesPageSize = 50,
        } = req.query;

        const salesId = req.adminId;

        const sales = await AdminModel.findById(salesId);
        if (sales?.adminType !== 'sales')
            return errorResponse(res, 'He is not a sales');

        const adminSellers = sales.sellers || [];

        const totalSellers = await SellerModel.find({
            _id: { $in: adminSellers },
        }).populate([
            {
                path: 'shops',
                populate: [
                    {
                        path: 'seller',
                    },
                ],
            },
        ]);
        const totalSellersId = totalSellers?.map(seller =>
            seller._id.toString()
        );

        let shopConfig = {
            $or: [{ seller: { $in: totalSellersId } }],
        };
        const totalShops = await Shop.count(shopConfig);

        let countConfig = {
            seller: { $in: totalSellersId },
            orderStatus: 'delivered',
        };
        const totalOrders = await Order.count(countConfig);

        const summary = {
            totalSellers: totalSellers.length,
            totalShops,
            totalOrders,
        };

        // Ranking of the sales
        const salesRankingInfo = await salesRanking(salesPage, salesPageSize);

        let sellers = totalSellers;
        if (sellerId) {
            sellers = totalSellers?.filter(
                seller => seller._id.toString() === sellerId.toString()
            );
        }
        // Ranking of the shops
        const shopRankingInfo = await shopRanking(
            sellers,
            shopPage,
            shopPageSize
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                totalSellers,
                summary,
                salesRanking: salesRankingInfo,
                shopRanking: shopRankingInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const salesRanking = async (page, pageSize) => {
    const salesList = await AdminModel.find({
        adminType: 'sales',
        deletedAt: null,
    });
    const ranking = [];

    for (const sales of salesList) {
        const totalSellers = sales.sellers || [];

        const totalShops = await Shop.count({
            seller: { $in: totalSellers },
        });
        const totalOrders = await Order.count({
            seller: { $in: totalSellers },
            orderStatus: 'delivered',
        });

        const salesInfo = {
            ...sales._doc,
            totalSellers: totalSellers.length,
            totalShops,
            totalOrders,
        };
        ranking.push(salesInfo);
    }

    let list = ranking.sort((a, b) => b.totalShops - a.totalShops);

    const paginate = await paginationMultipleModel({
        page,
        pageSize,
        total: list.length,
        pagingRange: 5,
    });

    list = list.slice(paginate.offset, paginate.offset + paginate.limit);

    return { ranking: list, paginate };
};

//*** Sales graph for sellers ***/
exports.getSalesGraphSellers = async (req, res) => {
    try {
        const { startDate, endDate, year, type } = req.query;

        const salesId = req.adminId;

        const salesManager = await AdminModel.findById(salesId);
        if (salesManager?.adminType !== 'sales')
            return errorResponse(res, 'He is not a sales manager');
        const adminSellers = salesManager.sellers || [];

        let sellersConfig = { _id: { $in: adminSellers } };
        let info = [];

        if (type == 'normal') {
            if (!startDate || !endDate)
                return errorResponse(res, 'Dates not valid');
            info = await getSalesGraphsForSellersOfDay(
                new Date(startDate),
                new Date(endDate),
                sellersConfig
            );
        } else if (type == 'year') {
            if (!year) return errorResponse(res, 'Year not valid');
            info = await getSalesGraphForSellersOfYear(year, sellersConfig);
        }

        // Calc total sellers and increase percentage
        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const totalSellers = await SellerModel.count(sellersConfig);
        const totalSellersByDate = await SellerModel.count({
            ...sellersConfig,
            createdAt: {
                $gte: moment(new Date(startDate)),
                $lt: moment(new Date(endDate)).add(1, 'days'),
            },
        });
        const totalSellersByOldDate = await SellerModel.count({
            ...sellersConfig,
            createdAt: {
                $gte: moment(new Date(oldStartDate)),
                $lt: moment(new Date(oldEndDate)).add(1, 'days'),
            },
        });

        const totalSellersByDateAvg = (totalSellersByDate / totalSellers) * 100;
        const totalSellersByOldDateAvg =
            (totalSellersByOldDate / totalSellers) * 100;
        const totalSellersAvgInPercentage = parseFloat(
            (totalSellersByDateAvg - totalSellersByOldDateAvg).toFixed(2)
        );

        successResponse(res, {
            message: 'Successfully get sellers',
            data: {
                info,
                totalSellers,
                totalSellersAvgInPercentage,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const getSalesGraphsForSellersOfDay = async (startDate, endDate, config) => {
    const dates = getDatesInRange(startDate, endDate);

    let totalSellers = [];

    for (const date of dates) {
        let seller = await SellerModel.count({
            ...config,
            createdAt: {
                $gte: moment(new Date(date)),
                $lt: moment(new Date(date)).add(1, 'days'),
            },
        });

        totalSellers.push({
            seller,
            date,
        });
    }

    return totalSellers;
};
const getSalesGraphForSellersOfYear = async (year, config) => {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let totalSellers = [];

    for (const month of allMonths) {
        const range = getMonthDateRange(year, month);

        let seller = await SellerModel.count({
            ...config,
            createdAt: {
                $gte: moment(new Date(range.start)),
                $lte: moment(new Date(range.end)),
            },
        });

        totalSellers.push({
            seller,
            month,
        });
    }

    return totalSellers;
};

//*** Sales Manager graph for shops ***/
exports.getSalesGraphShops = async (req, res) => {
    try {
        const { startDate, endDate, year, type } = req.query;

        const salesId = req.adminId;

        const salesManager = await AdminModel.findById(salesId);
        if (salesManager?.adminType !== 'sales')
            return errorResponse(res, 'He is not a sales manager');

        const totalSellers = salesManager.sellers || [];
        const totalSellersId = totalSellers?.map(seller => seller.toString());

        let shopConfig = {
            $or: [{ seller: { $in: totalSellersId } }],
        };
        let info = [];

        if (type == 'normal') {
            if (!startDate || !endDate)
                return errorResponse(res, 'Dates not valid');
            info = await getSalesGraphsForShopsOfDay(
                new Date(startDate),
                new Date(endDate),
                shopConfig
            );
        } else if (type == 'year') {
            if (!year) return errorResponse(res, 'Year not valid');
            info = await getSalesGraphForShopsOfYear(year, shopConfig);
        }

        // Calc total shops and increase percentage
        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const totalShops = await Shop.count(shopConfig);
        const totalShopsByDate = await Shop.count({
            ...shopConfig,
            createdAt: {
                $gte: moment(new Date(startDate)),
                $lt: moment(new Date(endDate)).add(1, 'days'),
            },
        });
        const totalShopsByOldDate = await Shop.count({
            ...shopConfig,
            createdAt: {
                $gte: moment(new Date(oldStartDate)),
                $lt: moment(new Date(oldEndDate)).add(1, 'days'),
            },
        });

        const totalShopsByDateAvg = (totalShopsByDate / totalShops) * 100;
        const totalShopsByOldDateAvg = (totalShopsByOldDate / totalShops) * 100;
        const totalShopsAvgInPercentage = parseFloat(
            (totalShopsByDateAvg - totalShopsByOldDateAvg).toFixed(2)
        );

        successResponse(res, {
            message: 'Successfully get shops',
            data: {
                info,
                totalShops,
                totalShopsAvgInPercentage,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const getSalesGraphsForShopsOfDay = async (startDate, endDate, config) => {
    const dates = getDatesInRange(startDate, endDate);

    let totalShops = [];

    for (const date of dates) {
        let shop = await Shop.count({
            ...config,
            createdAt: {
                $gte: moment(new Date(date)),
                $lt: moment(new Date(date)).add(1, 'days'),
            },
        });

        totalShops.push({
            shop,
            date,
        });
    }

    return totalShops;
};
const getSalesGraphForShopsOfYear = async (year, config) => {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let totalShops = [];

    for (const month of allMonths) {
        const range = getMonthDateRange(year, month);

        let shop = await Shop.count({
            ...config,
            createdAt: {
                $gte: moment(new Date(range.start)),
                $lte: moment(new Date(range.end)),
            },
        });

        totalShops.push({
            shop,
            month,
        });
    }

    return totalShops;
};
//*** Sales Manager graph for Orders ***/
exports.getSalesGraphOrder = async (req, res) => {
    try {
        const { startDate, endDate, year, type, salesId } = req.query;

        const salesManager = await AdminModel.findById(salesId);
        if (salesManager?.adminType !== 'sales')
            return errorResponse(res, 'He is not a sales manager');

        const sellers = salesManager.sellers || [];

        let orderConfig = {
            seller: { $in: sellers },
            orderStatus: 'delivered',
        };

        let info = [];

        if (type == 'normal') {
            info = await this.getGraphsForOrder(
                new Date(startDate),
                new Date(endDate),
                orderConfig
            );
        } else if (type == 'year') {
            info = await getSellerGraphForOrderOfYear(year, orderConfig);
        }

        // Calc total order and increase percentage
        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const totalOrders = await Order.count(orderConfig);
        const totalOrdersByDate = await Order.count({
            ...orderConfig,
            deliveredAt: {
                $gte: moment(new Date(startDate)),
                $lt: moment(new Date(endDate)).add(1, 'days'),
            },
        });
        const totalOrdersByOldDate = await Order.count({
            ...orderConfig,
            deliveredAt: {
                $gte: moment(new Date(oldStartDate)),
                $lt: moment(new Date(oldEndDate)).add(1, 'days'),
            },
        });

        const totalOrdersByDateAvg = (totalOrdersByDate / totalOrders) * 100;
        const totalOrdersByOldDateAvg =
            (totalOrdersByOldDate / totalOrders) * 100;
        const totalOrdersAvgInPercentage = parseFloat(
            (totalOrdersByDateAvg - totalOrdersByOldDateAvg).toFixed(2)
        );

        successResponse(res, {
            message: 'Success',
            data: {
                info,
                totalOrders,
                totalOrdersAvgInPercentage,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Account Manager Dashboard ***/
exports.getSingleAccountManagerDashBoard = async (req, res) => {
    try {
        const { sellerId, page, pageSize } = req.query;

        const accountManagerId = req.adminId;
        const accountManager = await AdminModel.findById(
            accountManagerId
        ).populate([
            {
                path: 'sellers',
                populate: [
                    {
                        path: 'shops',
                        populate: [
                            {
                                path: 'seller',
                            },
                        ],
                    },
                ],
            },
        ]);

        if (accountManager?.adminType !== 'accountManager')
            return errorResponse(res, 'He is not an account manager');

        let sellers = accountManager?.sellers || [];

        if (sellerId) {
            sellers = accountManager?.sellers.filter(
                seller => seller._id.toString() === sellerId.toString()
            );
        }

        // Ranking of the shops
        const { ranking, paginate } = await shopRanking(
            sellers,
            page,
            pageSize
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                ranking,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const shopRanking = async (sellers, page, pageSize) => {
    let shopList = [];
    for (const seller of sellers) {
        shopList = [...shopList, ...seller.shops];
    }

    const ranking = [];

    for (const shop of shopList) {
        const totalShopEarningFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
        });
        const totalShopEarning = totalShopEarningFunc.totalShopEarning;

        const totalShopUnsettleFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
        });
        const totalShopUnsettle = totalShopUnsettleFunc.totalSellerUnsettle;

        const totalShopProfit = totalShopUnsettle + totalShopEarning;

        const orders = await Order.find({
            orderStatus: 'delivered',
            shop: shop._id,
        });

        // const itemsSold = orders.reduce(
        //     (acc, curr) => acc + curr.productsDetails.length,
        //     0
        // );

        // order_count changed to deliveredOrders
        const deliveredOrders = await Order.countDocuments({
            orderStatus: 'delivered',
            shop: shop._id,
        });

        ranking.push({
            sellerName: shop.seller.name,
            // itemsSold,
            deliveredOrders,
            payout: totalShopProfit,
            ...shop._doc,
        });
    }

    let list = ranking.sort((a, b) => b.deliveredOrders - a.deliveredOrders);

    const paginate = await paginationMultipleModel({
        page,
        pageSize,
        total: list.length,
        pagingRange: 5,
    });

    list = list.slice(paginate.offset, paginate.offset + paginate.limit);

    return { ranking: list, paginate };
};

//*** Account Manager Order Graph ***/
exports.getAccountManagerGraphOrder = async (req, res) => {
    try {
        const { startDate, endDate, year, type, accountManagerId, shopId } =
            req.query;

        const accountManager = await AdminModel.findById(accountManagerId);
        if (accountManager?.adminType !== 'accountManager')
            return errorResponse(res, 'He is not an account manager');

        const sellers = accountManager?.sellers || [];

        let orderConfig = {
            seller: { $in: sellers },
            orderStatus: 'delivered',
        };

        if (shopId) {
            orderConfig.shop = ObjectId(shopId);
        }

        let info = [];

        if (type == 'normal') {
            info = await this.getGraphsForOrder(
                new Date(startDate),
                new Date(endDate),
                orderConfig
            );
        } else if (type == 'year') {
            info = await getSellerGraphForOrderOfYear(year, orderConfig);
        }

        // Calc total order and increase percentage
        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const totalOrders = await Order.count(orderConfig);
        const totalOrdersByDate = await Order.count({
            ...orderConfig,
            deliveredAt: {
                $gte: moment(new Date(startDate)),
                $lt: moment(new Date(endDate)).add(1, 'days'),
            },
        });
        const totalOrdersByOldDate = await Order.count({
            ...orderConfig,
            deliveredAt: {
                $gte: moment(new Date(oldStartDate)),
                $lt: moment(new Date(oldEndDate)).add(1, 'days'),
            },
        });

        const totalOrdersByDateAvg = (totalOrdersByDate / totalOrders) * 100;
        const totalOrdersByOldDateAvg =
            (totalOrdersByOldDate / totalOrders) * 100;
        const totalOrdersAvgInPercentage = parseFloat(
            (totalOrdersByDateAvg - totalOrdersByOldDateAvg).toFixed(2)
        );

        successResponse(res, {
            message: 'Success',
            data: {
                info,
                totalOrders,
                totalOrdersAvgInPercentage,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Account Manager Marketing Graph ***/
exports.getAccountManagerGraphMarketing = async (req, res) => {
    try {
        const { startDate, endDate, accountManagerId } = req.query;

        const accountManager = await AdminModel.findById(
            accountManagerId
        ).populate([
            {
                path: 'sellers',
                select: 'shops',
            },
        ]);
        if (accountManager?.adminType !== 'accountManager')
            return errorResponse(res, 'He is not an account manager');

        // let shopIds = [];

        // for (const seller of accountManager?.sellers) {
        //     shopIds = [...shopIds, ...seller.shops];
        // }
        const shopIds = accountManager.sellers.reduce(
            (acc, seller) => acc.concat(seller.shops),
            []
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const discountShopCount = await MarketingModel.distinct('shop', {
                shop: { $in: shopIds },
                type: 'percentage',
                createdAt: {
                    $gte: new Date(date),
                    $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                },
            });
            const discountShops = discountShopCount.length;

            const buy1get1ShopCount = await MarketingModel.distinct('shop', {
                shop: { $in: shopIds },
                type: 'double_menu',
                createdAt: {
                    $gte: new Date(date),
                    $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                },
            });
            const buy1get1Shops = buy1get1ShopCount.length;

            const freeDeliveryShopCount = await MarketingModel.distinct(
                'shop',
                {
                    shop: { $in: shopIds },
                    type: 'free_delivery',
                    createdAt: {
                        $gte: new Date(date),
                        $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                    },
                }
            );
            const freeDeliveryShops = freeDeliveryShopCount.length;

            return {
                discountShops,
                buy1get1Shops,
                freeDeliveryShops,
                date,
            };
        });

        const marketingInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                info: marketingInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Account Manager Rejected Orders graph***/
exports.getAccountManagerGraphRejectedOrder = async (req, res) => {
    try {
        const { startDate, endDate, accountManagerId } = req.query;

        const accountManager = await AdminModel.findById(
            accountManagerId
        ).populate([
            {
                path: 'sellers',
                select: 'shops',
            },
        ]);
        if (accountManager?.adminType !== 'accountManager')
            return errorResponse(res, 'He is not an account manager');

        const shopIds = accountManager.sellers.reduce(
            (acc, seller) => acc.concat(seller.shops),
            []
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const rejectedOrders = await Order.countDocuments({
                orderStatus: 'cancelled',
                shop: { $in: shopIds },
                'orderCancel.canceledBy': 'shop',
                cancelledAt: {
                    $gte: new Date(date),
                    $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                },
            });

            return {
                rejectedOrders,
                date,
            };
        });

        const graphInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                info: graphInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Account Manager Shops Table***/
exports.getAccountManagerTableShops = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortByKey = 'delivered', // delivered || rejected
            sortBy = 'desc',
            accountManagerId,
        } = req.query;

        const accountManager = await AdminModel.findById(
            accountManagerId
        ).populate([
            {
                path: 'sellers',
                populate: {
                    path: 'shops',
                    select: 'shopType shopName phone_number name email shopLogo shopBanner liveStatus',
                },
                select: 'shops',
            },
        ]);
        if (accountManager?.adminType !== 'accountManager')
            return errorResponse(res, 'He is not an account manager');

        const shops = accountManager.sellers.reduce(
            (acc, seller) => acc.concat(seller.shops),
            []
        );

        const promises = shops.map(async shop => {
            const [rejectedOrders, deliveredOrders] = await Promise.all([
                Order.countDocuments({
                    orderStatus: 'cancelled',
                    shop: shop._id,
                    'orderCancel.canceledBy': 'shop',
                }),
                Order.countDocuments({
                    orderStatus: 'delivered',
                    shop: shop._id,
                }),
            ]);

            return {
                rejectedOrders,
                deliveredOrders,
                shop,
            };
        });

        const tableInfo = await Promise.all(promises);

        const keySelector =
            sortByKey === 'rejected' ? 'rejectedOrders' : 'deliveredOrders';
        let list = tableInfo.sort((a, b) => {
            const keyA = a[keySelector];
            const keyB = b[keySelector];

            return sortBy.toUpperCase() === 'DESC' ? keyB - keyA : keyA - keyB;
        });

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Success',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Start Transfer DropWalletController to DashboardController for unknown exports issue ***/
// exports.getTotalEarning = async (
//     type = 'shop',
//     id,
//     startDate,
//     endDate,
//     paidCurrency
// ) => {
//     let commonConfig = {};

//     if (paidCurrency) {
//         commonConfig = {
//             ...commonConfig,
//             paidCurrency: paidCurrency,
//         };
//     }

//     if (type === 'shop') {
//         commonConfig = {
//             ...commonConfig,
//             shop: ObjectId(id),
//         };
//     }
//     if (type === 'seller') {
//         commonConfig = {
//             ...commonConfig,
//             seller: ObjectId(id),
//         };
//     }

//     let config = {
//         ...commonConfig,
//         account: 'shop',
//         status: 'success',
//         type: {
//             $in: [
//                 'adminSettlebalanceShop',
//                 'sellerGetPaymentFromOrderCash',
//                 'adminAddBalanceShop',
//             ],
//         },
//     };

//     if (startDate) {
//         config = {
//             ...config,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     const sellerEarningAddQuery = await Transection.aggregate([
//         {
//             $match: config,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//                 secondaryCurrency_amount: {
//                     $sum: { $sum: ['$secondaryCurrency_amount'] },
//                 },
//             },
//         },
//     ]);

//     const sellerEarningAdd =
//         sellerEarningAddQuery.length > 0 ? sellerEarningAddQuery[0].amount : 0;
//     const secondaryCurrency_sellerEarningAdd =
//         sellerEarningAddQuery.length > 0
//             ? sellerEarningAddQuery[0].secondaryCurrency_amount
//             : 0;

//     let config1 = {
//         ...commonConfig,
//         account: 'shop',
//         type: {
//             $in: ['adminRemoveBalanceShop'],
//         },
//     };

//     if (startDate) {
//         config1 = {
//             ...config1,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     const sellerEarningRemoveQuery = await Transection.aggregate([
//         {
//             $match: config1,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//                 secondaryCurrency_amount: {
//                     $sum: { $sum: ['$secondaryCurrency_amount'] },
//                 },
//             },
//         },
//     ]);

//     const sellerEarningRemove =
//         sellerEarningRemoveQuery.length > 0
//             ? sellerEarningRemoveQuery[0].amount
//             : 0;
//     const secondaryCurrency_sellerEarningRemove =
//         sellerEarningRemoveQuery.length > 0
//             ? sellerEarningRemoveQuery[0].secondaryCurrency_amount
//             : 0;

//     const totalShopEarning = sellerEarningAdd - sellerEarningRemove;
//     const secondaryCurrency_totalShopEarning =
//         secondaryCurrency_sellerEarningAdd -
//         secondaryCurrency_sellerEarningRemove;

//     return { totalShopEarning, secondaryCurrency_totalShopEarning };
// };

// exports.getTotalUnSettleAmount = async (
//     type = 'shop',
//     id,
//     startDate,
//     endDate,
//     paidCurrency
// ) => {
//     let commonConfig = {};

//     if (paidCurrency) {
//         commonConfig = {
//             ...commonConfig,
//             paidCurrency: paidCurrency,
//         };
//     }

//     if (type === 'shop') {
//         commonConfig = {
//             ...commonConfig,
//             shop: ObjectId(id),
//         };
//     }
//     if (type === 'seller') {
//         commonConfig = {
//             ...commonConfig,
//             seller: ObjectId(id),
//         };
//     }

//     let config = {
//         ...commonConfig,
//         account: 'shop',
//         status: { $in: ['pending', 'success'] },
//         type: {
//             $in: [
//                 'sellerGetPaymentFromOrder',
//                 'sellerGetPaymentFromOrderRefused',
//             ],
//         },
//     };

//     if (startDate) {
//         config = {
//             ...config,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     const sellerUnsettleAddQuery = await Transection.aggregate([
//         {
//             $match: config,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//                 secondaryCurrency_amount: {
//                     $sum: { $sum: ['$secondaryCurrency_amount'] },
//                 },
//             },
//         },
//     ]);

//     const sellerUnsettleAdd =
//         sellerUnsettleAddQuery.length > 0
//             ? sellerUnsettleAddQuery[0].amount
//             : 0;
//     const secondaryCurrency_sellerUnsettleAdd =
//         sellerUnsettleAddQuery.length > 0
//             ? sellerUnsettleAddQuery[0].secondaryCurrency_amount
//             : 0;

//     let config1 = {
//         ...commonConfig,
//         account: 'shop',
//         type: {
//             $in: [
//                 'adminSettlebalanceShop',
//                 'shopCashInHand',
//                 'shopPayForFeatured', //Featured system
//                 'refundedAfterDeliveredOrderShopCut', //Refund feature after delivered order
//             ],
//         },
//     };

//     if (startDate) {
//         config1 = {
//             ...config1,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     const sellerUnsettleRemoveQuery = await Transection.aggregate([
//         {
//             $match: config1,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//                 secondaryCurrency_amount: {
//                     $sum: { $sum: ['$secondaryCurrency_amount'] },
//                 },
//             },
//         },
//     ]);

//     const sellerUnsettleRemove =
//         sellerUnsettleRemoveQuery.length > 0
//             ? sellerUnsettleRemoveQuery[0].amount
//             : 0;
//     const secondaryCurrency_sellerUnsettleRemove =
//         sellerUnsettleRemoveQuery.length > 0
//             ? sellerUnsettleRemoveQuery[0].secondaryCurrency_amount
//             : 0;

//     // For Vat
//     let configForVat = {
//         ...commonConfig,
//         orderStatus: 'delivered',
//         $or: [
//             {
//                 orderFor: 'specific',
//                 paymentMethod: {
//                     $nin: ['cash'],
//                 },
//             },
//             {
//                 orderFor: 'global',
//             },
//         ],
//     };

//     if (startDate) {
//         configForVat = {
//             ...configForVat,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     const sellerVatAddQuery = await Order.aggregate([
//         {
//             $match: configForVat,
//         },
//         {
//             $group: {
//                 _id: '',
//                 amount: {
//                     $sum: { $sum: ['$vatAmount.baseCurrency_vatForShop'] },
//                 },
//                 secondaryCurrency_amount: {
//                     $sum: { $sum: ['$vatAmount.secondaryCurrency_vatForShop'] },
//                 },
//                 count: { $sum: 1 },
//             },
//         },
//     ]);

//     const sellerVatAdd = sellerVatAddQuery[0] ? sellerVatAddQuery[0].amount : 0;
//     const secondaryCurrency_sellerVatAdd = sellerVatAddQuery[0]
//         ? sellerVatAddQuery[0].secondaryCurrency_amount
//         : 0;

//     let configForVat2 = {
//         ...commonConfig,
//         orderFor: 'specific',
//         paymentMethod: 'cash',
//         orderStatus: 'delivered',
//         // $and: [
//         //     { orderFor: 'specific' },
//         //     {
//         //         paymentMethod: 'cash',
//         //     },
//         //     {
//         //         orderStatus: {
//         //             $nin: ['cancelled', 'placed', 'refused', 'schedule'],
//         //         },
//         //     },
//         // ],
//     };

//     if (startDate) {
//         configForVat2 = {
//             ...configForVat2,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     const sellerVatRemoveQuery = await Order.aggregate([
//         {
//             $match: configForVat2,
//         },
//         {
//             $group: {
//                 _id: '',
//                 amount: {
//                     $sum: { $sum: ['$vatAmount.baseCurrency_vatForAdmin'] },
//                 },
//                 secondaryCurrency_amount: {
//                     $sum: {
//                         $sum: ['$vatAmount.secondaryCurrency_vatForAdmin'],
//                     },
//                 },
//                 count: { $sum: 1 },
//             },
//         },
//     ]);

//     const sellerVatRemove = sellerVatRemoveQuery[0]
//         ? sellerVatRemoveQuery[0].amount
//         : 0;
//     const secondaryCurrency_sellerVatRemove = sellerVatRemoveQuery[0]
//         ? sellerVatRemoveQuery[0].secondaryCurrency_amount
//         : 0;

//     const totalSellerUnsettle =
//         sellerUnsettleAdd +
//         sellerVatAdd -
//         sellerUnsettleRemove -
//         sellerVatRemove;

//     const secondaryCurrency_totalSellerUnsettle =
//         secondaryCurrency_sellerUnsettleAdd +
//         secondaryCurrency_sellerVatAdd -
//         secondaryCurrency_sellerUnsettleRemove -
//         secondaryCurrency_sellerVatRemove;

//     return { totalSellerUnsettle, secondaryCurrency_totalSellerUnsettle };
// };

exports.getTotalDeliveryFee = async (
    type = 'shop',
    id,
    startDate,
    endDate,
    paymentMethod = 'all'
) => {
    let totalValueConfig = {
        orderFor: 'specific',
        orderStatus: 'delivered',
    };

    if (type === 'shop') {
        totalValueConfig = {
            ...totalValueConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        totalValueConfig = {
            ...totalValueConfig,
            seller: ObjectId(id),
        };
    }

    if (paymentMethod === 'cash') {
        totalValueConfig = {
            ...totalValueConfig,
            paymentMethod: 'cash',
        };
    }

    if (paymentMethod === 'online') {
        totalValueConfig = {
            ...totalValueConfig,
            paymentMethod: {
                $nin: ['cash'],
            },
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        totalValueConfig = {
            ...totalValueConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const totalValue = await Order.aggregate([
        {
            $match: totalValueConfig,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                deliveryFee: {
                    $sum: { $sum: ['$summary.baseCurrency_riderFee'] },
                },
                riderTip: {
                    $sum: { $sum: ['$summary.baseCurrency_riderTip'] },
                },
            },
        },
    ]);

    if (totalValue.length < 1) {
        totalValue.push({
            deliveryFee: 0,
            riderTip: 0,
        });
    }

    return totalValue[0].deliveryFee + totalValue[0].riderTip;
};

// exports.getTotalRefundAmount = async (
//     type = 'shop',
//     id,
//     startDate,
//     endDate
// ) => {
//     let commonConfig = {};

//     if (type === 'shop') {
//         commonConfig = {
//             ...commonConfig,
//             shop: ObjectId(id),
//         };
//     }
//     if (type === 'seller') {
//         commonConfig = {
//             ...commonConfig,
//             seller: ObjectId(id),
//         };
//     }

//     let config = {
//         ...commonConfig,
//         account: 'shop',
//         type: {
//             $in: ['refundedAfterDeliveredOrderShopCut'],
//         },
//     };

//     if (startDate) {
//         config = {
//             ...config,
//             createdAt: {
//                 $gte: new Date(startDate),
//                 $lt: new Date(
//                     moment(endDate ? new Date(endDate) : new Date()).add(
//                         1,
//                         'days'
//                     )
//                 ),
//             },
//         };
//     }

//     const totalRefundAmountQuery = await Transection.aggregate([
//         {
//             $match: config,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     const totalRefundAmount =
//         totalRefundAmountQuery.length > 0
//             ? totalRefundAmountQuery[0].amount
//             : 0;

//     // let configGetRefundAmount = {
//     //     ...commonConfig,
//     //     account: 'shop',
//     //     type: {
//     //         $in: ['sellerGetPaymentFromOrder'],
//     //     },
//     //     isRefund: true,
//     // };

//     // if (startDate) {
//     //     configGetRefundAmount = {
//     //         ...configGetRefundAmount,
//     //         createdAt: {
//     //             $gte: new Date(startDate),
//     //             $lt: new Date(
//     //                 moment(endDate ? new Date(endDate) : new Date()).add(
//     //                     1,
//     //                     'days'
//     //                 )
//     //             ),
//     //         },
//     //     };
//     // }

//     // const totalGetRefundAmountQuery = await Transection.aggregate([
//     //     {
//     //         $match: configGetRefundAmount,
//     //     },
//     //     {
//     //         $group: {
//     //             _id: '',
//     //             count: { $sum: 1 },
//     //             amount: { $sum: { $sum: ['$amount'] } },
//     //         },
//     //     },
//     // ]);

//     // const totalGetRefundAmount =
//     //     totalGetRefundAmountQuery.length > 0
//     //         ? totalGetRefundAmountQuery[0].amount
//     //         : 0;

//     // return totalRefundAmount - totalGetRefundAmount;
//     return totalRefundAmount;
// };
//*** End Transfer DropWalletController to DashboardController for unknown exports issue ***/

//*** Rider Dashboard ***/
exports.getSingleRiderDashboard = async (req, res) => {
    try {
        const { deliveryBoyId, startDate, endDate } = req.query;

        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId)
            .populate({ path: 'zone', select: 'riderWeeklyTarget' })
            .select('zone firstActiveAt');

        if (!deliveryBoy) {
            return errorResponse(res, 'Rider not found');
        }

        const appSetting = await AppSetting.findOne({}).select(
            'riderWorkingHoursPerDay'
        );
        const riderWorkingHoursPerDay =
            appSetting?.riderWorkingHoursPerDay || 0;

        // Calc rider weekly completed order
        const startOfWeek = moment(new Date()).startOf('isoWeek'); // Using the 'isoWeek' to consider Monday as the start of the isoWeek
        const endOfWeek = moment(new Date()).endOf('isoWeek');

        const riderWeeklyNormalOrder = await Order.countDocuments({
            deliveryBoy: ObjectId(deliveryBoyId),
            orderStatus: 'delivered',
            deliveredAt: {
                $gte: startOfWeek,
                $lte: endOfWeek,
            },
        });
        const riderWeeklyButlerOrder = await Butler.countDocuments({
            deliveryBoy: ObjectId(deliveryBoyId),
            orderStatus: 'delivered',
            deliveredAt: {
                $gte: startOfWeek,
                $lte: endOfWeek,
            },
        });
        const riderWeeklyOrder =
            riderWeeklyNormalOrder + riderWeeklyButlerOrder;

        const riderWeeklyTarget = deliveryBoy?.zone?.riderWeeklyTarget || 0;

        const riderWeeklyTargetRatioInPct =
            riderWeeklyTarget > 0
                ? (riderWeeklyOrder / riderWeeklyTarget) * 100
                : 0;

        const riderOrderTarget = {
            riderWeeklyOrder,
            riderWeeklyTarget,
            riderWeeklyTargetRatioInPct,
        };

        // Set Config
        let commonConfig = { deliveryBoy: ObjectId(deliveryBoyId) };
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

        // Calc shop rating
        const shopRating = await calcRiderShopRatingFunc(
            commonConfig,
            dateConfig
        );

        // Calc customer rating
        const customerRating = await calcRiderCustomerRatingFunc(
            commonConfig,
            dateConfig
        );

        // Calc rider working hours
        const workingHour = await calcRiderWorkingHourFunc(
            deliveryBoy,
            riderWorkingHoursPerDay,
            startDate,
            endDate
        );

        // Calc rider orders
        const riderOrder = await calcRiderOrderFunc(deliveryBoyId, dateConfig);

        // Calc rider delivery time from pickup to deliver order time compare to the estimated time
        // Calc rider collect order time compare to expected time to reach the shop
        const riderOrderTime = await calcRiderOrderTimeFunc(deliveryBoyId);

        // Calc rider order acceptance speed within 1 minute
        const riderAcceptanceOrder = await calcRiderAcceptanceOrderFunc(
            deliveryBoyId
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                riderOrderTarget,
                shopRating,
                customerRating,
                workingHour,
                riderOrder,
                riderOrderTime,
                riderAcceptanceOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Calc shop rating
const calcRiderShopRatingFunc = async (commonConfig, dateConfig) => {
    try {
        const pipelineOfShopRating = [
            {
                $match: { ...commonConfig, ...dateConfig },
            },
            {
                $group: {
                    _id: null,
                    // allShopRating: {
                    //     $sum: {
                    //         $cond: {
                    //             if: {
                    //                 $in: [
                    //                     '$shopRateToRider',
                    //                     ['like', 'dislike'],
                    //                 ],
                    //             },
                    //             then: 1,
                    //             else: 0,
                    //         },
                    //     },
                    // },
                    positiveShopRating: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$shopRateToRider', 'like'] },
                                then: 1,
                                else: 0,
                            },
                        },
                    },
                    negativeShopRating: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$shopRateToRider', 'dislike'] },
                                then: 1,
                                else: 0,
                            },
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    allShopRating: 1,
                    positiveShopRating: 1,
                    // positiveShopRatingRatioInPct: {
                    //     $cond: {
                    //         if: { $eq: ['$allShopRating', 0] },
                    //         then: 0,
                    //         else: {
                    //             $multiply: [
                    //                 {
                    //                     $divide: [
                    //                         '$positiveShopRating',
                    //                         '$allShopRating',
                    //                     ],
                    //                 },
                    //                 100,
                    //             ],
                    //         },
                    //     },
                    // },
                    negativeShopRating: 1,
                },
            },
        ];

        const resultOfShopRating = await Order.aggregate(pipelineOfShopRating);

        const shopRating = resultOfShopRating[0] || {
            // allShopRating: 0,
            positiveShopRating: 0,
            // positiveShopRatingRatioInPct: 0,
            negativeShopRating: 0,
        };

        return shopRating;
    } catch (error) {
        console.log(error);
    }
};

// Calc customer rating
const calcRiderCustomerRatingFunc = async (commonConfig, dateConfig) => {
    try {
        const pipelineOfCustomerRating = [
            {
                $match: { ...commonConfig, ...dateConfig },
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    rate: { $sum: '$rating' },
                },
            },
            {
                $project: {
                    _id: 0,
                    // totalCount: '$count',
                    // totalUserRating: '$rate',
                    // totalExpectedUserRating: { $multiply: ['$count', 5] },
                    avgCustomerRating: {
                        $cond: {
                            if: { $eq: ['$count', 0] },
                            then: 0,
                            else: { $divide: ['$rate', '$count'] },
                        },
                    },
                    // userRatingRatioInPct: {
                    //     $cond: {
                    //         if: { $eq: ['$count', 0] },
                    //         then: 0,
                    //         else: {
                    //             $multiply: [
                    //                 {
                    //                     $divide: [
                    //                         '$rate',
                    //                         { $multiply: ['$count', 5] },
                    //                     ],
                    //                 },
                    //                 100,
                    //             ],
                    //         },
                    //     },
                    // },
                },
            },
        ];

        const resultOfCustomerRating = await ReviewModel.aggregate(
            pipelineOfCustomerRating
        );

        const customerRating = resultOfCustomerRating[0] || {
            // totalCount: 0,
            // totalUserRating: 0,
            // totalExpectedUserRating: 0,
            avgCustomerRating: 0,
            // userRatingRatioInPct: 0,
        };

        return customerRating;
    } catch (error) {
        console.log(error);
    }
};

// Calc rider working hours
const calcRiderWorkingHourFunc = async (
    deliveryBoy,
    riderWorkingHoursPerDay,
    startDate,
    endDate
) => {
    try {
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

        const pipelineOfActiveTime = [
            {
                $match: { delivery: ObjectId(deliveryBoy._id), ...dateConfig },
            },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: '$activeTotal' },
                },
            },
        ];

        const resultOfActiveTime = await DeliveryBoyTimeModel.aggregate(
            pipelineOfActiveTime
        );

        const totalActiveMinutes = resultOfActiveTime[0]?.totalMinutes || 0;

        // Calculate the difference of date
        const riderJoiningDate = moment(
            deliveryBoy?.firstActiveAt || new Date()
        );

        const updateStartDate = moment.max(moment(startDate), riderJoiningDate);
        const updateEndDate = moment.min(
            moment(endDate ? moment(endDate) : moment()).add(1, 'days'),
            moment()
        );

        const calcDayDifference = moment
            .duration(updateEndDate.diff(updateStartDate))
            .asDays();
        let dayDifference = Math.max(0, calcDayDifference);
        dayDifference = Number(dayDifference.toFixed(3));

        const totalWorkingMinutes =
            dayDifference * riderWorkingHoursPerDay * 60;

        const calcTotalDowntime = totalWorkingMinutes - totalActiveMinutes;
        const totalDowntime = calcTotalDowntime > 0 ? calcTotalDowntime : 0;

        // const workingHourRatioInPct =
        //     totalWorkingMinutes > 0
        //         ? (totalActiveMinutes / totalWorkingMinutes) * 100
        //         : 0;

        const avgActiveMinutes =
            totalActiveMinutes / (dayDifference > 1 ? dayDifference : 1);
        const avgDowntime =
            totalDowntime / (dayDifference > 1 ? dayDifference : 1);

        const workingHour = {
            // totalActiveMinutes: Number(totalActiveMinutes.toFixed(2)),
            // totalDowntime: totalDowntime > 0 ? totalDowntime : 0,
            // workingHourRatioInPct,
            avgActiveMinutes,
            avgDowntime,
        };

        return workingHour;
    } catch (error) {
        console.log(error);
    }
};

// Calc rider orders
const calcRiderOrderFunc = async (deliveryBoyId, dateConfig) => {
    try {
        const pipelineOfRiderOrder = [
            {
                $match: dateConfig,
            },
            {
                $facet: {
                    riderAllOrder: [
                        {
                            $match: {
                                $or: [
                                    {
                                        deliveryBoy: ObjectId(deliveryBoyId),
                                        // orderStatus: 'delivered',
                                    },
                                    {
                                        canceledDeliveryBoy: {
                                            $in: [ObjectId(deliveryBoyId)],
                                        },
                                    },
                                    {
                                        rejectedDeliveryBoy: {
                                            $in: [ObjectId(deliveryBoyId)],
                                        },
                                        canceledDeliveryBoy: {
                                            $nin: [ObjectId(deliveryBoyId)],
                                        },
                                    },
                                    {
                                        deliveryBoyList: {
                                            $in: [ObjectId(deliveryBoyId)],
                                        },
                                        deliveryBoy: {
                                            $ne: ObjectId(deliveryBoyId),
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $count: 'totalRiderOrder',
                        },
                    ],
                    riderAcceptedOrder: [
                        {
                            $match: {
                                deliveryBoy: ObjectId(deliveryBoyId),
                            },
                        },
                        {
                            $count: 'totalRiderAcceptedOrder',
                        },
                    ],
                    riderCanceled: [
                        {
                            $match: {
                                canceledDeliveryBoy: {
                                    $in: [ObjectId(deliveryBoyId)],
                                },
                            },
                        },
                        {
                            $count: 'totalRiderCanceledOrder',
                        },
                    ],
                    riderRejected: [
                        {
                            $match: {
                                rejectedDeliveryBoy: {
                                    $in: [ObjectId(deliveryBoyId)],
                                },
                                canceledDeliveryBoy: {
                                    $nin: [ObjectId(deliveryBoyId)],
                                },
                            },
                        },
                        {
                            $count: 'totalRiderRejectedOrder',
                        },
                    ],
                    riderMissed: [
                        {
                            $match: {
                                deliveryBoyList: {
                                    $in: [ObjectId(deliveryBoyId)],
                                },
                                deliveryBoy: { $ne: ObjectId(deliveryBoyId) },
                            },
                        },
                        {
                            $count: 'totalRiderMissedOrder',
                        },
                    ],
                },
            },
            {
                $project: {
                    _id: 0,
                    riderAllOrder: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    '$riderAllOrder.totalRiderOrder',
                                    0,
                                ],
                            },
                            0,
                        ],
                    },
                    riderAcceptedOrder: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    '$riderAcceptedOrder.totalRiderAcceptedOrder',
                                    0,
                                ],
                            },
                            0,
                        ],
                    },
                    riderCanceledOrder: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    '$riderCanceled.totalRiderCanceledOrder',
                                    0,
                                ],
                            },
                            0,
                        ],
                    },
                    riderRejectedOrder: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    '$riderRejected.totalRiderRejectedOrder',
                                    0,
                                ],
                            },
                            0,
                        ],
                    },
                    riderMissedOrder: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    '$riderMissed.totalRiderMissedOrder',
                                    0,
                                ],
                            },
                            0,
                        ],
                    },
                },
            },
        ];

        const resultOfRiderOrder = await Order.aggregate(pipelineOfRiderOrder);

        const riderOrder = resultOfRiderOrder[0] || {
            riderAllOrder: 0,
            riderDeliveredOrder: 0,
            riderCanceledOrder: 0,
            riderRejectedOrder: 0,
            riderMissedOrder: 0,
        };

        return riderOrder;
    } catch (error) {
        console.log(error);
    }
};

// Calc rider delivery time from pickup to deliver order time compare to the estimated time
// Calc rider collect order time compare to expected time to reach the shop
const calcRiderOrderTimeFunc = async deliveryBoyId => {
    try {
        const pipelineOfRiderOrderTime = [
            {
                $match: {
                    deliveryBoy: ObjectId(deliveryBoyId),
                    orderStatus: 'delivered',
                },
            },
            {
                $group: {
                    _id: null,
                    totalCollectOrderTime: {
                        $sum: {
                            $divide: [
                                {
                                    $subtract: [
                                        { $toDate: '$order_on_the_wayAt' },
                                        { $toDate: '$accepted_delivery_boyAt' },
                                    ],
                                },
                                60000, // Convert milliseconds to minutes
                            ],
                        },
                    },
                    totalExpectedCollectOrderTime: {
                        $sum: {
                            $add: [
                                {
                                    $divide: [
                                        {
                                            $subtract: [
                                                {
                                                    $toDate:
                                                        '$ready_to_pickupAt',
                                                },
                                                {
                                                    $toDate:
                                                        '$accepted_delivery_boyAt',
                                                },
                                            ],
                                        },
                                        60000, // Convert milliseconds to minutes
                                    ],
                                },
                                5,
                            ],
                        },
                    },
                    totalDeliveryTime: {
                        $sum: {
                            $divide: [
                                {
                                    $subtract: [
                                        { $toDate: '$deliveredAt' },
                                        { $toDate: '$order_on_the_wayAt' },
                                    ],
                                },
                                60000, // Convert milliseconds to minutes
                            ],
                        },
                    },
                    totalExpectedDeliveryTime: {
                        $sum: {
                            $add: [
                                {
                                    $divide: [
                                        {
                                            $subtract: [
                                                { $toDate: '$delivered_time' },
                                                {
                                                    $toDate:
                                                        '$order_on_the_wayAt',
                                                },
                                            ],
                                        },
                                        60000, // Convert milliseconds to minutes
                                    ],
                                },
                                5,
                            ],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    avgCollectOrderTime: {
                        $ceil: {
                            $divide: ['$totalCollectOrderTime', '$count'],
                        },
                    },
                    avgExpectedCollectOrderTime: {
                        $ceil: {
                            $divide: [
                                '$totalExpectedCollectOrderTime',
                                '$count',
                            ],
                        },
                    },
                    avgDeliveryTime: {
                        $ceil: { $divide: ['$totalDeliveryTime', '$count'] },
                    },
                    avgExpectedDeliveryTime: {
                        $ceil: {
                            $divide: ['$totalExpectedDeliveryTime', '$count'],
                        },
                    },
                },
            },
        ];
        const resultOfRiderOrderTime = await Order.aggregate(
            pipelineOfRiderOrderTime
        );

        const riderOrderTime = resultOfRiderOrderTime[0] || {
            avgCollectOrderTime: 0,
            avgExpectedCollectOrderTime: 0,
            avgDeliveryTime: 0,
            avgExpectedDeliveryTime: 0,
        };

        return riderOrderTime;
    } catch (error) {
        console.log(error);
    }
};

// Calc rider order acceptance speed within 1 minute
const calcRiderAcceptanceOrderFunc = async deliveryBoyId => {
    try {
        // const riderAllOrder = await Order.find({
        //     deliveryBoy: ObjectId(deliveryBoyId),
        // });

        // let riderAcceptOrderWithinOneMinCount = 0;
        // let riderAcceptOrderTime = 0;

        // for (const order of riderAllOrder) {
        //     const diffOrderAcceptTime =
        //         new Date(order.accepted_delivery_boyAt).getTime() -
        //         new Date(order.searchingTime).getTime();
        //     const diffOrderAcceptTimeInSec = diffOrderAcceptTime / 1000;

        //     if (diffOrderAcceptTimeInSec <= 60) {
        //         riderAcceptOrderWithinOneMinCount++;
        //         riderAcceptOrderTime += diffOrderAcceptTimeInSec;
        //     }
        // }

        // const riderAcceptanceRatioWithinOneMinutePct =
        //     (riderAcceptOrderWithinOneMinCount / riderAllOrder.length) * 100;
        // const avgRiderAcceptOrderTime =
        //     riderAcceptOrderTime / riderAcceptOrderWithinOneMinCount;

        // const riderAcceptanceOrder = {
        //     avgRiderAcceptOrderTime,
        //     avgExpectedRiderAcceptOrderTime: 60,
        //     riderAcceptanceRatioWithinOneMinutePct,
        // };
        const pipelineOfRiderAcceptanceOrder = [
            {
                $match: {
                    deliveryBoy: ObjectId(deliveryBoyId),
                },
            },
            {
                $addFields: {
                    diffOrderAcceptTimeInSec: {
                        $divide: [
                            {
                                $subtract: [
                                    { $toDate: '$accepted_delivery_boyAt' },
                                    { $toDate: '$searchingTime' },
                                ],
                            },
                            1000,
                        ],
                    },
                },
            },

            {
                $group: {
                    _id: null,
                    riderAllOrderCount: { $sum: 1 },
                    riderAcceptOrderWithinOneMinCount: {
                        $sum: {
                            $cond: [
                                { $lte: ['$diffOrderAcceptTimeInSec', 60] },
                                1,
                                0,
                            ],
                        },
                    },
                    riderAcceptOrderTime: {
                        $sum: {
                            $cond: [
                                { $lte: ['$diffOrderAcceptTimeInSec', 60] },
                                '$diffOrderAcceptTimeInSec',
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $addFields: {
                    avgExpectedRiderAcceptOrderTime: 60, // Include the constant value
                },
            },
            {
                $project: {
                    _id: 0,
                    avgRiderAcceptOrderTime: {
                        $cond: [
                            { $gt: ['$riderAcceptOrderWithinOneMinCount', 0] },
                            {
                                $divide: [
                                    '$riderAcceptOrderTime',
                                    '$riderAcceptOrderWithinOneMinCount',
                                ],
                            },
                            0,
                        ],
                    },
                    avgExpectedRiderAcceptOrderTime: 1,
                    riderAcceptanceRatioWithinOneMinutePct: {
                        $multiply: [
                            {
                                $divide: [
                                    '$riderAcceptOrderWithinOneMinCount',
                                    '$riderAllOrderCount',
                                ],
                            },
                            100,
                        ],
                    },
                },
            },
        ];

        const resultOfRiderAcceptanceOrder = await Order.aggregate(
            pipelineOfRiderAcceptanceOrder
        );

        const riderAcceptanceOrder = resultOfRiderAcceptanceOrder[0] || {
            avgRiderAcceptOrderTime: 0,
            avgExpectedRiderAcceptOrderTime: 0,
            riderAcceptanceRatioWithinOneMinutePct: 0,
        };

        return riderAcceptanceOrder;
    } catch (error) {
        console.log(error);
    }
};

// Operations Dashboard
exports.getOperationsDashboard = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let orderConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            orderConfig.order_placedAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        const totalAvailableRiders = await getTotalAvailableRidersFunc();
        const avgDeliveryTimes = await getAvgDeliveryTimesFunc(orderConfig);
        const currentLateOrders = await getCurrentLateOrdersFunc(orderConfig);
        const totalCanceledOrders = await getCanceledOrdersFunc(orderConfig);

        const allRiders = await DeliveryBoy.find({
            status: 'active',
            deliveryBoyType: 'dropRider',
            deletedAt: null,
        })
            .select('liveStatus')
            .lean();

        const { totalOnlineRiders, totalOfflineRiders } = allRiders.reduce(
            (acc, rider) => {
                if (rider.liveStatus === 'online') {
                    acc.totalOnlineRiders += 1;
                } else {
                    acc.totalOfflineRiders += 1;
                }

                return acc;
            },
            { totalOnlineRiders: 0, totalOfflineRiders: 0 }
        );

        const totalBusyRiders = totalOnlineRiders - totalAvailableRiders;

        const {
            riderCashInHand: baseCurrency_CashInHand,
            secondaryCurrency_riderCashInHand: secondaryCurrency_CashInHand,
        } = await getRiderActualCashInHand({});

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                totalAvailableRiders,
                totalOnlineRiders,
                totalOfflineRiders,
                totalBusyRiders,
                avgDeliveryTimes,
                currentLateOrders,
                totalCanceledOrders,
                baseCurrency_CashInHand,
                secondaryCurrency_CashInHand,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// const getTotalAvailableRidersFunc = async deliveryBoyId => {
//     try {
//         const findOnlineRider = await DeliveryBoy.find({
//             deletedAt: null,
//             status: 'active',
//             liveStatus: 'online',
//             deliveryBoyType: 'dropRider',
//         });

//         let totalAvailableRiders = 0;

//         for (const rider of findOnlineRider) {
//             const readyOrders = await Order.countDocuments({
//                 deliveryBoy: rider._id,
//                 orderStatus: {
//                     $in: ['ready_to_pickup', 'order_on_the_way'],
//                 },
//             });

//             const ongoingOrders = await Order.countDocuments({
//                 deliveryBoy: rider._id,
//                 orderStatus: {
//                     $in: ['accepted_delivery_boy', 'preparing'],
//                 },
//             });

//             const butlers = await Butler.countDocuments({
//                 deliveryBoy: rider._id,
//                 orderStatus: {
//                     $in: ['accepted_delivery_boy', 'order_on_the_way'],
//                 },
//             });
//             // For replacement order feature
//             const replacementOrders = await Order.countDocuments({
//                 deliveryBoy: rider._id,
//                 orderStatus: {
//                     $in: [
//                         'accepted_delivery_boy',
//                         'preparing',
//                         'ready_to_pickup',
//                         'order_on_the_way',
//                     ],
//                 },
//                 isReplacementOrder: true,
//                 'replacementOrderDeliveryInfo.deliveryType':
//                     'shop-customer-shop',
//             });

//             if (
//                 !readyOrders &&
//                 !butlers &&
//                 !replacementOrders &&
//                 ongoingOrders < 2
//             ) {
//                 totalAvailableRiders++;
//             }
//         }

//         return totalAvailableRiders;
//     } catch (error) {
//         console.log(error);
//     }
// };
const getTotalAvailableRidersFunc = async () => {
    try {
        const totalAvailableRiders = await DeliveryBoy.aggregate([
            {
                $match: {
                    status: 'active',
                    liveStatus: 'online',
                    deliveryBoyType: 'dropRider',
                    deletedAt: null,
                },
            },
            {
                $lookup: {
                    from: 'orders',
                    let: { riderId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $in: [
                                                '$orderStatus',
                                                [
                                                    'accepted_delivery_boy',
                                                    'preparing',
                                                ],
                                            ],
                                        },
                                        {
                                            $eq: ['$deliveryBoy', '$$riderId'],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'preparingOrders',
                },
            },
            {
                $lookup: {
                    from: 'orders',
                    let: { riderId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $in: [
                                                '$orderStatus',
                                                [
                                                    'ready_to_pickup',
                                                    'order_on_the_way',
                                                ],
                                            ],
                                        },
                                        {
                                            $eq: ['$deliveryBoy', '$$riderId'],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'readyOrders',
                },
            },
            {
                $lookup: {
                    from: 'butlers',
                    let: { riderId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $in: [
                                                '$orderStatus',
                                                [
                                                    'accepted_delivery_boy',
                                                    'order_on_the_way',
                                                ],
                                            ],
                                        },
                                        {
                                            $eq: ['$deliveryBoy', '$$riderId'],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'butlers',
                },
            },
            {
                $lookup: {
                    from: 'orders',
                    let: { riderId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $in: [
                                                '$orderStatus',
                                                [
                                                    'accepted_delivery_boy',
                                                    'preparing',
                                                    'ready_to_pickup',
                                                    'order_on_the_way',
                                                ],
                                            ],
                                        },
                                        {
                                            $eq: ['$deliveryBoy', '$$riderId'],
                                        },
                                        {
                                            $eq: ['$isReplacementOrder', true],
                                        },
                                        {
                                            $eq: [
                                                '$replacementOrderDeliveryInfo.deliveryType',
                                                'shop-customer-shop',
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'replacementOrders',
                },
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $eq: [{ $size: '$readyOrders' }, 0] },
                            { $lt: [{ $size: '$preparingOrders' }, 2] },
                            { $eq: [{ $size: '$butlers' }, 0] },
                            { $eq: [{ $size: '$replacementOrders' }, 0] },
                        ],
                    },
                },
            },

            {
                $count: 'totalAvailableRiders',
            },
        ]);

        return totalAvailableRiders[0]
            ? totalAvailableRiders[0].totalAvailableRiders
            : 0;
    } catch (error) {
        console.log(error);
    }
};

const getAvgDeliveryTimesFunc = async orderConfig => {
    try {
        const totalDeliveryMinutesQ = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'delivered',
                    ...orderConfig,
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalDeliveryMinutes: { $sum: '$deliveredMinutes' },
                },
            },
        ]);

        const avgDeliveryTime = totalDeliveryMinutesQ[0]
            ? Math.round(
                  totalDeliveryMinutesQ[0].totalDeliveryMinutes /
                      totalDeliveryMinutesQ[0].count
              )
            : 0;

        return avgDeliveryTime;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const getCurrentLateOrdersFunc = async orderConfig => {
    try {
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
            ...orderConfig,
        };

        // const lateButlerOrderCount = await Butler.countDocuments(config);
        // const lateNormalOrderCount = await Order.countDocuments(config);
        const [lateButlerOrderCount, lateNormalOrderCount] = await Promise.all([
            Butler.countDocuments(config),
            Order.countDocuments(config),
        ]);
        const lateOrderCount = lateButlerOrderCount + lateNormalOrderCount;

        return lateOrderCount;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const getCanceledOrdersFunc = async orderConfig => {
    try {
        let config = {
            orderStatus: 'cancelled',
            ...orderConfig,
        };

        const [canceledButlerOrderCount, canceledNormalOrderCount] =
            await Promise.all([
                Butler.countDocuments(config),
                Order.countDocuments(config),
            ]);
        const canceledOrderCount =
            canceledButlerOrderCount + canceledNormalOrderCount;

        return canceledOrderCount;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

exports.getZoneWiseAvailableRiders = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortByKey = 'orders', // riders || orders
            sortBy = 'desc',
            startDate,
            endDate,
        } = req.query;

        let orderConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            orderConfig.deliveredAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        const zoneWiseAvailableRiders = await getZoneWiseAvailableRidersFunc(
            orderConfig
        );

        const keySelector =
            sortByKey === 'riders' ? 'totalAvailableRiders' : 'avgOrderInZone';
        let list = zoneWiseAvailableRiders.sort((a, b) => {
            const keyA = a[keySelector];
            const keyB = b[keySelector];

            return sortBy.toUpperCase() === 'DESC' ? keyB - keyA : keyA - keyB;
        });

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                zones: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// const getZoneWiseAvailableRidersFunc = async () => {
//     try {
//         const zones = await ZoneModel.find({ zoneStatus: 'active' }).sort({
//             createdAt: 'desc',
//         });

//         const zoneWiseAvailableRiders = [];

//         for (const zone of zones) {
//             const findOnlineRider = await DeliveryBoy.find({
//                 status: 'active',
//                 liveStatus: 'online',
//                 zone: zone._id,
//                 deliveryBoyType: 'dropRider',
//                 deletedAt: null,
//             });

//             let totalAvailableRiders = 0;

//             for (const rider of findOnlineRider) {
//                 const readyOrders = await Order.countDocuments({
//                     deliveryBoy: rider._id,
//                     orderStatus: {
//                         $in: ['ready_to_pickup', 'order_on_the_way'],
//                     },
//                 });

//                 const ongoingOrders = await Order.countDocuments({
//                     deliveryBoy: rider._id,
//                     orderStatus: {
//                         $in: ['accepted_delivery_boy', 'preparing'],
//                     },
//                 });

//                 const butlers = await Butler.countDocuments({
//                     deliveryBoy: rider._id,
//                     orderStatus: {
//                         $in: ['accepted_delivery_boy', 'order_on_the_way'],
//                     },
//                 });
//                 // For replacement order feature
//                 const replacementOrders = await Order.countDocuments({
//                     deliveryBoy: rider._id,
//                     orderStatus: {
//                         $in: [
//                             'accepted_delivery_boy',
//                             'preparing',
//                             'ready_to_pickup',
//                             'order_on_the_way',
//                         ],
//                     },
//                     isReplacementOrder: true,
//                     'replacementOrderDeliveryInfo.deliveryType':
//                         'shop-customer-shop',
//                 });

//                 if (
//                     !readyOrders &&
//                     !butlers &&
//                     !replacementOrders &&
//                     ongoingOrders < 2
//                 ) {
//                     totalAvailableRiders++;
//                 }
//             }

//             const orderList = await Order.find({
//                 location: { $geoWithin: { $geometry: zone.zoneGeometry } },
//                 orderStatus: 'delivered',
//             }).select('createdAt');

//             const butlerList = await Butler.find({
//                 location: { $geoWithin: { $geometry: zone.zoneGeometry } },
//                 orderStatus: 'delivered',
//             }).select('createdAt');

//             const list = [...orderList, ...butlerList];

//             const createdAtDates = list.map(item => moment(item.createdAt));
//             const maxDate = moment.max(createdAtDates);
//             const minDate = moment.min(createdAtDates);

//             // Calculate the day difference
//             const calcDayDifference = maxDate.diff(minDate, 'days');
//             const dayDifference = Math.max(1, calcDayDifference);

//             const avgOrderInZone = list.length / dayDifference;

//             zoneWiseAvailableRiders.push({
//                 zone,
//                 totalAvailableRiders,
//                 avgOrderInZone,
//             });
//         }

//         return zoneWiseAvailableRiders;
//     } catch (error) {
//         console.log(error);
//     }
// };
const getZoneWiseAvailableRidersFunc = async orderConfig => {
    try {
        const zones = await ZoneModel.find({ zoneStatus: 'active' }).sort({
            createdAt: 'desc',
        });

        const zonePromises = zones.map(async zone => {
            const findOnlineRiders = await DeliveryBoy.find({
                status: 'active',
                liveStatus: 'online',
                zone: zone._id,
                deliveryBoyType: 'dropRider',
                deletedAt: null,
            });

            const riderPromises = findOnlineRiders.map(async rider => {
                const [readyOrders, ongoingOrders, butlers, replacementOrders] =
                    await Promise.all([
                        Order.countDocuments({
                            deliveryBoy: rider._id,
                            orderStatus: {
                                $in: ['ready_to_pickup', 'order_on_the_way'],
                            },
                        }),
                        Order.countDocuments({
                            deliveryBoy: rider._id,
                            orderStatus: {
                                $in: ['accepted_delivery_boy', 'preparing'],
                            },
                        }),
                        Butler.countDocuments({
                            deliveryBoy: rider._id,
                            orderStatus: {
                                $in: [
                                    'accepted_delivery_boy',
                                    'order_on_the_way',
                                ],
                            },
                        }),
                        Order.countDocuments({
                            deliveryBoy: rider._id,
                            orderStatus: {
                                $in: [
                                    'accepted_delivery_boy',
                                    'preparing',
                                    'ready_to_pickup',
                                    'order_on_the_way',
                                ],
                            },
                            isReplacementOrder: true,
                            'replacementOrderDeliveryInfo.deliveryType':
                                'shop-customer-shop',
                        }),
                    ]);

                if (
                    !readyOrders &&
                    !butlers &&
                    !replacementOrders &&
                    ongoingOrders < 2
                ) {
                    return 1;
                }

                return 0;
            });

            const totalAvailableRiders = (
                await Promise.all(riderPromises)
            ).reduce((sum, value) => sum + value, 0);

            const [orderList, butlerList] = await Promise.all([
                Order.find({
                    location: { $geoWithin: { $geometry: zone.zoneGeometry } },
                    orderStatus: 'delivered',
                    ...orderConfig,
                }).select('deliveredAt'),
                Butler.find({
                    location: { $geoWithin: { $geometry: zone.zoneGeometry } },
                    orderStatus: 'delivered',
                    ...orderConfig,
                }).select('deliveredAt'),
            ]);

            const list = [...orderList, ...butlerList];

            const createdAtDates = list.map(item => moment(item.deliveredAt));
            const maxDate = moment.max(createdAtDates);
            const minDate = moment.min(createdAtDates);

            // Calculate the day difference
            const calcDayDifference = maxDate.diff(minDate, 'days');
            const dayDifference = Math.max(1, calcDayDifference);

            const avgOrderInZone = list.length / dayDifference;

            return {
                zone,
                totalAvailableRiders,
                avgOrderInZone,
            };
        });

        return Promise.all(zonePromises);
    } catch (error) {
        console.error(error);
        throw error;
    }
};
// const getZoneWiseAvailableRidersFunc = async () => {
//     try {
//         // const zones = await ZoneModel.find({ zoneStatus: 'active' })
//         //     .sort({
//         //         createdAt: 'desc',
//         //     })
//         //     .select(
//         //         'zoneName zoneArea zoneAvailability zoneBusyTitle zoneBusyDescription'
//         //     );

//         const zoneWiseAvailableRiders = await DeliveryBoy.aggregate([
//             {
//                 $match: {
//                     status: 'active',
//                     liveStatus: 'online',
//                     deliveryBoyType: 'dropRider',
//                     deletedAt: null,
//                 },
//             },
//             {
//                 $group: {
//                     _id: '$zone',
//                     totalAvailableRiders: {
//                         $sum: {
//                             $cond: [
//                                 {
//                                     $and: [
//                                         {
//                                             $eq: [
//                                                 {
//                                                     $size: {
//                                                         $ifNull: [
//                                                             {
//                                                                 $filter: {
//                                                                     input: '$orders',
//                                                                     as: 'order',
//                                                                     cond: {
//                                                                         $in: [
//                                                                             '$$order.orderStatus',
//                                                                             [
//                                                                                 'ready_to_pickup',
//                                                                                 'order_on_the_way',
//                                                                             ],
//                                                                         ],
//                                                                     },
//                                                                 },
//                                                             },
//                                                             [],
//                                                         ],
//                                                     },
//                                                 },
//                                                 0,
//                                             ],
//                                         },
//                                         {
//                                             $eq: [
//                                                 {
//                                                     $size: {
//                                                         $ifNull: [
//                                                             {
//                                                                 $filter: {
//                                                                     input: '$butlers',
//                                                                     as: 'butler',
//                                                                     cond: {
//                                                                         $in: [
//                                                                             '$$butler.orderStatus',
//                                                                             [
//                                                                                 'accepted_delivery_boy',
//                                                                                 'order_on_the_way',
//                                                                             ],
//                                                                         ],
//                                                                     },
//                                                                 },
//                                                             },
//                                                             [],
//                                                         ],
//                                                     },
//                                                 },
//                                                 0,
//                                             ],
//                                         },
//                                         {
//                                             $eq: [
//                                                 {
//                                                     $size: {
//                                                         $ifNull: [
//                                                             {
//                                                                 $filter: {
//                                                                     input: '$orders',
//                                                                     as: 'order',
//                                                                     cond: {
//                                                                         $and: [
//                                                                             {
//                                                                                 $in: [
//                                                                                     '$$order.orderStatus',
//                                                                                     [
//                                                                                         'accepted_delivery_boy',
//                                                                                         'preparing',
//                                                                                         'ready_to_pickup',
//                                                                                         'order_on_the_way',
//                                                                                     ],
//                                                                                 ],
//                                                                             },
//                                                                             {
//                                                                                 $eq: [
//                                                                                     '$$order.isReplacementOrder',
//                                                                                     true,
//                                                                                 ],
//                                                                             },
//                                                                             {
//                                                                                 $eq: [
//                                                                                     '$$order.replacementOrderDeliveryInfo.deliveryType',
//                                                                                     'shop-customer-shop',
//                                                                                 ],
//                                                                             },
//                                                                         ],
//                                                                     },
//                                                                 },
//                                                             },
//                                                             [],
//                                                         ],
//                                                     },
//                                                 },
//                                                 0,
//                                             ],
//                                         },
//                                         {
//                                             $lt: [
//                                                 {
//                                                     $size: {
//                                                         $ifNull: [
//                                                             {
//                                                                 $filter: {
//                                                                     input: '$orders',
//                                                                     as: 'order',
//                                                                     cond: {
//                                                                         $in: [
//                                                                             '$$order.orderStatus',
//                                                                             [
//                                                                                 'accepted_delivery_boy',
//                                                                                 'preparing',
//                                                                             ],
//                                                                         ],
//                                                                     },
//                                                                 },
//                                                             },
//                                                             [],
//                                                         ],
//                                                     },
//                                                 },
//                                                 2,
//                                             ],
//                                         },
//                                     ],
//                                 },
//                                 1,
//                                 0,
//                             ],
//                         },
//                     },
//                 },
//             },
//             {
//                 $lookup: {
//                     from: 'zones',
//                     localField: '_id',
//                     foreignField: '_id',
//                     as: 'zone',
//                 },
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     zone: 1,
//                     totalAvailableRiders: 1,
//                 },
//             },
//             {
//                 $project: {
//                     'zone._id': 1,
//                     'zone.zoneName': 1,
//                     'zone.zoneArea': 1,
//                     'zone.zoneAvailability': 1,
//                     'zone.zoneBusyDescription': 1,
//                     'zone.zoneBusyTitle': 1,
//                     totalAvailableRiders: 1,
//                 },
//             },
//         ]);

//         return zoneWiseAvailableRiders;
//     } catch (error) {
//         console.log(error);
//     }
// };

exports.getAllRidersSortedByAvgOrders = async (req, res) => {
    try {
        const { page = 1, pageSize = 50 } = req.query;

   if(!isDateValid(req.query?.startDate,req.query?.endDate)) {
    return errorResponseWithCode(res,'Date formate is not correct',422)
   }

 
      
        const allRidersSortedByAvgOrders =
            await getAllRidersSortedByAvgOrdersFunc(req.query.startDate,req.query.endDate);

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: allRidersSortedByAvgOrders.length,
            pagingRange: 5,
        });

        const list = allRidersSortedByAvgOrders.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                riders: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// const getAllRidersSortedByAvgOrdersFunc = async () => {
//     try {
//             const currentDate = moment();
//             const startOfWeek = moment(currentDate)
//                 .subtract(1, 'weeks')
//                 .startOf('isoWeek'); // Using the 'isoWeek' to consider Monday as the start
//             const endOfWeek = moment(currentDate)
//                 .subtract(1, 'weeks')
//                 .endOf('isoWeek');

//         const riders = await DeliveryBoy.find({
//             status: 'active',
//             deliveryBoyType: 'dropRider',
//             deletedAt: null,
//         })
//             .select('name image email countryCode number liveStatus')
//             .lean();

//         for (const rider of riders) {

//             const riderWeeklyNormalOrder = await Order.countDocuments({
//                 deliveryBoy: ObjectId(rider._id),
//                 orderStatus: 'delivered',
//                 createdAt: {
//                     $gte: startOfWeek,
//                     $lte: endOfWeek,
//                 },
//             });
//             const riderWeeklyButlerOrder = await Butler.countDocuments({
//                 deliveryBoy: ObjectId(rider._id),
//                 orderStatus: 'delivered',
//                 createdAt: {
//                     $gte: startOfWeek,
//                     $lte: endOfWeek,
//                 },
//             });
//             const riderWeeklyOrder =
//                 riderWeeklyNormalOrder + riderWeeklyButlerOrder;

//             const avgRiderWeeklyOrder = riderWeeklyOrder / 7;

//             rider.avgRiderWeeklyOrder = avgRiderWeeklyOrder;
//         }

//         const allRidersSortedByAvgOrders = riders.sort(
//             (a, b) =>
//                 b.avgRiderWeeklyOrder -
//                 a.avgRiderWeeklyOrder
//         );

//         return allRidersSortedByAvgOrders;
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// };
// const getAllRidersSortedByAvgOrdersFunc = async () => {
//     try {
//         const currentDate = moment();
//         const startOfWeek = moment(currentDate)
//             .subtract(1, 'weeks')
//             .startOf('isoWeek');
//         const endOfWeek = moment(currentDate)
//             .subtract(1, 'weeks')
//             .endOf('isoWeek');

//         const riders = await DeliveryBoy.find({
//             status: 'active',
//             deliveryBoyType: 'dropRider',
//             deletedAt: null,
//         })
//             .select('name image email countryCode number liveStatus')
//             .lean();

//         const riderPromises = riders.map(async rider => {
//             const [riderWeeklyNormalOrder, riderWeeklyButlerOrder] =
//                 await Promise.all([
//                     Order.countDocuments({
//                         deliveryBoy: ObjectId(rider._id),
//                         orderStatus: 'delivered',
//                         createdAt: {
//                             $gte: startOfWeek,
//                             $lte: endOfWeek,
//                         },
//                     }),
//                     Butler.countDocuments({
//                         deliveryBoy: ObjectId(rider._id),
//                         orderStatus: 'delivered',
//                         createdAt: {
//                             $gte: startOfWeek,
//                             $lte: endOfWeek,
//                         },
//                     }),
//                 ]);

//             const riderWeeklyOrder =
//                 riderWeeklyNormalOrder + riderWeeklyButlerOrder;
//             const avgRiderWeeklyOrder = riderWeeklyOrder / 7;

//             rider.avgRiderWeeklyOrder = avgRiderWeeklyOrder;
//         });

//         await Promise.all(riderPromises);

//         const allRidersSortedByAvgOrders = riders.sort(
//             (a, b) =>
//               b.avgRiderWeeklyOrder -
//               a.avgRiderWeeklyOrder
//         );

//         return allRidersSortedByAvgOrders;
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// };




const getAllRidersSortedByAvgOrdersFunc = async (startDate,endDate) => {
    try {
        const numOfDays = calculateNumberOfDays(startDate,endDate)
    
        const {startOfWeek,endOfWeek} =  getDateRange(startDate,endDate)
       
 
      //  const currentDate = moment();
        // const startOfWeek = moment(currentDate)
        //     .subtract(1, 'weeks')
        //     .startOf('isoWeek')
        //     .toDate();

        //     console.log({startOfWeek})
        // const endOfWeek = moment(currentDate)
        //     .subtract(1, 'weeks')
        //     .endOf('isoWeek')
        //     .toDate();
       
      
        const riders = await DeliveryBoy.aggregate([
            {
                $match: {
                    status: 'active',
                    deliveryBoyType: 'dropRider',
                    deletedAt: null,
                },
            },
            {
                $project: {
                    name: 1,
                    image: 1,
                    email: 1,
                    countryCode: 1,
                    number: 1,
                    liveStatus: 1,
                },
            },
            {
                $lookup: {
                    from: 'orders', // Assuming the collection name is 'orders'
                    let: { riderId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$deliveryBoy', '$$riderId'] },
                                        { $eq: ['$orderStatus', 'delivered'] },
                                        {
                                            $gte: [
                                                '$order_placedAt',
                                                startOfWeek,
                                            ],
                                        },
                                        {
                                            $lte: [
                                                '$order_placedAt',
                                                endOfWeek,
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'orders',
                },
            },
            {
                $lookup: {
                    from: 'butlers', // Assuming the collection name is 'butlers'
                    let: { riderId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$deliveryBoy', '$$riderId'] },
                                        { $eq: ['$orderStatus', 'delivered'] },
                                        {
                                            $gte: [
                                                '$order_placedAt',
                                                startOfWeek,
                                            ],
                                        },
                                        {
                                            $lte: [
                                                '$order_placedAt',
                                                endOfWeek,
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'butlers',
                },
            },
            {
                $addFields: {
                    totalOrders: {
                        $size: { $concatArrays: ['$orders', '$butlers'] },
                    },
                },
            },
            {
                $addFields: {
                    avgRiderWeeklyOrder: { $divide: ['$totalOrders', numOfDays] },
                },
            },
            {
                $sort: { avgRiderWeeklyOrder: -1 },
            },
            {
                $project: {
                    orders: 0,
                    butlers: 0,
                },
            },
        ]);

        return riders;
    } catch (error) {
        console.error(error);
    }
};

exports.getAllRidersSortedByDeliveryTime = async (req, res) => {
    try {
        const { page = 1, pageSize = 50 } = req.query;

        const allRidersSortedByDeliveryTime =
            await getAllRidersSortedByDeliveryTimeFunc();

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: allRidersSortedByDeliveryTime.length,
            pagingRange: 5,
        });

        const list = allRidersSortedByDeliveryTime.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                riders: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// const getAllRidersSortedByDeliveryTimeFunc = async () => {
//     try {
//         const riders = await DeliveryBoy.find({
//             status: 'active',
//             deliveryBoyType: 'dropRider',
//             deletedAt: null,
//         })
//             .select('name image email countryCode number liveStatus')
//             .lean();

//         for (const rider of riders) {
//             const riderNormalOrder = await Order.find({
//                 deliveryBoy: ObjectId(rider._id),
//                 orderStatus: 'delivered',
//             }).select('deliveredAt delivered_time');
//             const riderButlerOrder = await Butler.find({
//                 deliveryBoy: ObjectId(rider._id),
//                 orderStatus: 'delivered',
//             }).select('deliveredAt delivered_time');

//             const orders = [...riderNormalOrder, ...riderButlerOrder];

//             const deliveryTime = orders.reduce((acc, curr) => {
//                 const actualDeliveryTime = moment(curr.deliveredAt);
//                 const expectedDeliveryTime = moment(curr.delivered_time);

//                 const deliveryTimeDifference = expectedDeliveryTime.diff(
//                     actualDeliveryTime,
//                     'seconds'
//                 );

//                 return acc + deliveryTimeDifference / 60;
//             }, 0);

//             const avgDeliveryTime = Number(
//                 (deliveryTime / orders.length).toFixed(2)
//             );

//             rider.avgDeliveryTime = avgDeliveryTime || 0;
//         }

//         const allRidersSortedByDeliveryTime = riders.sort(
//             (a, b) => b.avgDeliveryTime - a.avgDeliveryTime
//         );

//         return allRidersSortedByDeliveryTime;
//     } catch (error) {
//         console.error(error);
//     }
// };
// const getAllRidersSortedByDeliveryTimeFunc = async () => {
//     try {
//         const riders = await DeliveryBoy.find({
//             status: 'active',
//             deliveryBoyType: 'dropRider',
//             deletedAt: null,
//         })
//         .select('name image email countryCode number liveStatus')
//         .lean();

//         const riderIds = riders.map(rider => rider._id);

//         const normalOrders = await Order.find({
//             deliveryBoy: { $in: riderIds },
//             orderStatus: 'delivered',
//         }).select('deliveryBoy deliveredAt delivered_time').lean();

//         const butlerOrders = await Butler.find({
//             deliveryBoy: { $in: riderIds },
//             orderStatus: 'delivered',
//         }).select('deliveryBoy deliveredAt delivered_time').lean();

//         const orders = [...normalOrders, ...butlerOrders];

//         const riderDeliveryTimes = {};

//         orders.forEach(order => {
//             const actualDeliveryTime = moment(order.deliveredAt);
//             const expectedDeliveryTime = moment(order.delivered_time);

//             const deliveryTimeDifference = expectedDeliveryTime.diff(
//                 actualDeliveryTime,
//                 'seconds'
//             );

//             if (!riderDeliveryTimes[order.deliveryBoy]) {
//                 riderDeliveryTimes[order.deliveryBoy] = {
//                     totalDeliveryTime: 0,
//                     ordersCount: 0,
//                 };
//             }

//             riderDeliveryTimes[order.deliveryBoy].totalDeliveryTime += deliveryTimeDifference;
//             riderDeliveryTimes[order.deliveryBoy].ordersCount++;
//         });

//         riders.forEach(rider => {
//             const riderDeliveryInfo = riderDeliveryTimes[rider._id] || { totalDeliveryTime: 0, ordersCount: 0 };

//             const avgDeliveryTime = riderDeliveryInfo.ordersCount > 0 ?
//                 Number((riderDeliveryInfo.totalDeliveryTime / riderDeliveryInfo.ordersCount / 60).toFixed(2)) :
//                 0;

//             rider.avgDeliveryTime = avgDeliveryTime;
//         });

//         const allRidersSortedByDeliveryTime = riders.sort((a, b) => b.avgDeliveryTime - a.avgDeliveryTime);

//         return allRidersSortedByDeliveryTime;
//     } catch (error) {
//         console.error(error);
//     }
// };
const getAllRidersSortedByDeliveryTimeFunc = async () => {
    try {
        const allRidersSortedByDeliveryTime = await DeliveryBoy.aggregate([
            {
                $match: {
                    status: 'active',
                    deliveryBoyType: 'dropRider',
                    deletedAt: null,
                },
            },
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'deliveryBoy',
                    as: 'orders',
                },
            },
            {
                $lookup: {
                    from: 'butlers',
                    localField: '_id',
                    foreignField: 'deliveryBoy',
                    as: 'butlerOrders',
                },
            },
            {
                $addFields: {
                    allOrders: { $concatArrays: ['$orders', '$butlerOrders'] },
                },
            },
            {
                $unwind: '$allOrders',
            },
            {
                $match: {
                    'allOrders.orderStatus': 'delivered',
                },
            },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    image: { $first: '$image' },
                    email: { $first: '$email' },
                    countryCode: { $first: '$countryCode' },
                    number: { $first: '$number' },
                    liveStatus: { $first: '$liveStatus' },
                    avgDeliveryTime: {
                        $avg: {
                            $divide: [
                                {
                                    $subtract: [
                                        {
                                            $toDate:
                                                '$allOrders.delivered_time',
                                        },
                                        { $toDate: '$allOrders.deliveredAt' },
                                    ],
                                },
                                60000, // Convert milliseconds to minutes
                            ],
                        },
                    },
                },
            },
            {
                $sort: { avgDeliveryTime: -1 },
            },
            {
                $project: {
                    name: 1,
                    image: 1,
                    email: 1,
                    countryCode: 1,
                    number: 1,
                    liveStatus: 1,
                    avgDeliveryTime: 1,
                },
            },
        ]);

        return allRidersSortedByDeliveryTime;
    } catch (error) {
        console.error(error);
    }
};

exports.getAllShopsSortedByFlaggedReason = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortByKey = 'others', // wrong || missing || others
            sortBy = 'desc',
        } = req.query;

        const allShopsSortedByFlaggedReason =
            await getAllShopsSortedByFlaggedReasonFunc();

        const keySelector =
            sortByKey === 'wrong'
                ? 'shopWrongOrders'
                : sortByKey === 'missing'
                ? 'shopMissingOrders'
                : 'shopOtherOrders';
        let list = allShopsSortedByFlaggedReason.sort((a, b) => {
            const keyA = a[keySelector];
            const keyB = b[keySelector];

            return sortBy.toUpperCase() === 'DESC' ? keyB - keyA : keyA - keyB;
        });

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getAllShopsSortedByFlaggedReasonFunc = async () => {
    try {
        const shops = await Shop.find({
            shopStatus: 'active',
            deletedAt: null,
            parentShop: null,
        })
            .select(
                'shopType shopName phone_number name email shopLogo shopBanner liveStatus'
            )
            .lean();

        const promises = shops.map(async shop => {
            const [shopWrongOrders, shopMissingOrders, shopOtherOrders] =
                await Promise.all([
                    Order.countDocuments({
                        shop: ObjectId(shop._id),
                        orderStatus: 'delivered',
                        flaggedReason: 'wrong-item',
                    }),
                    Order.countDocuments({
                        shop: ObjectId(shop._id),
                        orderStatus: 'delivered',
                        flaggedReason: 'missing-item',
                    }),
                    Order.countDocuments({
                        shop: ObjectId(shop._id),
                        orderStatus: 'delivered',
                        flaggedReason: 'others',
                    }),
                ]);

            shop.shopWrongOrders = shopWrongOrders;
            shop.shopMissingOrders = shopMissingOrders;
            shop.shopOtherOrders = shopOtherOrders;

            return shop;
        });

        const updatedShops = await Promise.all(promises);

        return updatedShops;
    } catch (error) {
        console.error(error);
    }
};

// const getAllShopsSortedByFlaggedReasonFunc = async () => {
//     try {
//         const shops = await Shop.aggregate([
//             {
//                 $match: {
//                     shopStatus: 'active',
//                     deletedAt: null,
//                     parentShop: null,
//                 },
//             },
//             {
//                 $project: {
//                     shopType: 1,
//                     shopName: 1,
//                     phone_number: 1,
//                     name: 1,
//                     email: 1,
//                     shopLogo: 1,
//                     shopBanner: 1,
//                     liveStatus: 1,
//                 },
//             },
//             {
//                 $lookup: {
//                     from: 'orders',
//                     let: { shopId: '$_id' },
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: {
//                                     $and: [
//                                         { $eq: ['$shop', '$$shopId'] },
//                                         { $eq: ['$orderStatus', 'delivered'] },
//                                         {
//                                             $in: [
//                                                 '$flaggedReason',
//                                                 [
//                                                     'wrong-item',
//                                                     'missing-item',
//                                                     'others',
//                                                 ],
//                                             ],
//                                         },
//                                     ],
//                                 },
//                             },
//                         },
//                     ],
//                     as: 'orders',
//                 },
//             },
//             {
//                 $set: {
//                     shopWrongOrders: {
//                         $sum: {
//                             $map: {
//                                 input: '$orders',
//                                 as: 'order',
//                                 in: {
//                                     $cond: [
//                                         {
//                                             $eq: [
//                                                 '$$order.flaggedReason',
//                                                 'wrong-item',
//                                             ],
//                                         },
//                                         1,
//                                         0,
//                                     ],
//                                 },
//                             },
//                         },
//                     },
//                     shopMissingOrders: {
//                         $sum: {
//                             $map: {
//                                 input: '$orders',
//                                 as: 'order',
//                                 in: {
//                                     $cond: [
//                                         {
//                                             $eq: [
//                                                 '$$order.flaggedReason',
//                                                 'missing-item',
//                                             ],
//                                         },
//                                         1,
//                                         0,
//                                     ],
//                                 },
//                             },
//                         },
//                     },
//                     shopOtherOrders: {
//                         $sum: {
//                             $map: {
//                                 input: '$orders',
//                                 as: 'order',
//                                 in: {
//                                     $cond: [
//                                         {
//                                             $eq: [
//                                                 '$$order.flaggedReason',
//                                                 'others',
//                                             ],
//                                         },
//                                         1,
//                                         0,
//                                     ],
//                                 },
//                             },
//                         },
//                     },
//                 },
//             },
//             {
//                 $project: {
//                     orders: 0,
//                 },
//             },
//         ]).exec();

//         return shops;
//     } catch (error) {
//         console.error(error);
//     }
// };

exports.getAllShopsSortedByWorstPerformed = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, sortBy = 'desc' } = req.query;

        const allShopsSortedByWorstPerformed =
            await getAllShopsSortedByWorstPerformedFunc();

        const keySelector = 'avgPreparingTime';
        let list = allShopsSortedByWorstPerformed.sort((a, b) => {
            const keyA = a[keySelector];
            const keyB = b[keySelector];

            return sortBy.toUpperCase() === 'DESC' ? keyB - keyA : keyA - keyB;
        });

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getAllShopsSortedByWorstPerformedFunc = async () => {
    try {
        const shops = await Shop.find({
            shopStatus: 'active',
            deletedAt: null,
            parentShop: null,
        })
            .select(
                'shopType shopName phone_number name email shopLogo shopBanner liveStatus'
            )
            .lean();

        for (const shop of shops) {
            const shopOrders = await Order.find({
                shop: ObjectId(shop._id),
                orderStatus: 'delivered',
            }).select('preparingAt ready_to_pickupAt preparingTime');

            const preparingTime = shopOrders.reduce((acc, curr) => {
                const preparingTimeStart = moment(curr.preparingAt);
                const preparingTimeEnd = moment(curr.ready_to_pickupAt);

                const actualPreparingTime = preparingTimeEnd.diff(
                    preparingTimeStart,
                    'seconds'
                );
                const expectedPreparingTime = curr.preparingTime * 60;

                const preparingTimeDifference =
                    expectedPreparingTime - actualPreparingTime || 0;

                return acc + preparingTimeDifference / 60;
            }, 0);

            const avgPreparingTime = Number(
                (preparingTime / shopOrders.length).toFixed(2)
            );

            shop.avgPreparingTime = avgPreparingTime || 0;
        }

        return shops;
    } catch (error) {
        console.error(error);
    }
};

exports.getAllShopsDelayMetrics = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, sortBy = 'desc' } = req.query;

        const allShopsDelayMetrics = await getAllShopsDelayMetricsFunc();

        const keySelector = 'totalDelayOrders';
        let list = allShopsDelayMetrics.sort((a, b) => {
            const keyA = a[keySelector];
            const keyB = b[keySelector];

            return sortBy.toUpperCase() === 'DESC' ? keyB - keyA : keyA - keyB;
        });

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// const getAllShopsDelayMetricsFunc = async () => {
//     try {
//         const shops = await Shop.find({
//             shopStatus: 'active',
//             deletedAt: null,
//             parentShop: null,
//         })
//             .select(
//                 'shopType shopName phone_number name email shopLogo shopBanner liveStatus'
//             )
//             .lean();

//         const shopsWithMetrics = await Promise.all(shops.map(async shop => {
//             const deliveredOrders = await Order.find({
//                 shop: ObjectId(shop._id),
//                 orderStatus: 'delivered',
//             }).select('preparingTime isShopDelay shopDelayTime');

//             const totalDelayOrders = deliveredOrders.filter(order => order.isShopDelay).length;
//             const avgPctOfDelayOrders = (totalDelayOrders / deliveredOrders.length) * 100;

//             const totalPreparationTime = deliveredOrders.reduce((acc, curr) => acc + curr.preparingTime, 0);
//             const totalDelayTime = deliveredOrders.reduce((acc, curr) => acc + curr.shopDelayTime, 0);
//             const avgPctOfDelayTime = (totalDelayTime / totalPreparationTime) * 100;

//             return {
//                 ...shop,
//                 totalDelayOrders,
//                 avgPctOfDelayOrders,
//                 avgPctOfDelayTime
//             };
//         }));

//         return shopsWithMetrics;
//     } catch (error) {
//         console.error(error);
//     }
// };
const getAllShopsDelayMetricsFunc = async () => {
    try {
        const shopsWithMetrics = await Shop.aggregate([
            {
                $match: {
                    shopStatus: 'active',
                    deletedAt: null,
                    parentShop: null,
                },
            },
            {
                $lookup: {
                    from: 'orders',
                    let: { shopId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$shop', '$$shopId'] },
                                orderStatus: 'delivered',
                            },
                        },
                        {
                            $project: {
                                isShopDelay: 1,
                                preparingTime: 1,
                                shopDelayTime: 1,
                            },
                        },
                    ],
                    as: 'deliveredOrders',
                },
            },
            {
                $addFields: {
                    totalDelayOrders: {
                        $sum: {
                            $cond: [
                                { $eq: ['$deliveredOrders.isShopDelay', true] },
                                1,
                                0,
                            ],
                        },
                    },
                    totalPreparationTime: {
                        $sum: '$deliveredOrders.preparingTime',
                    },
                    totalDelayTime: { $sum: '$deliveredOrders.shopDelayTime' },
                },
            },
            {
                $project: {
                    shopType: 1,
                    shopName: 1,
                    // phone_number: 1,
                    // name: 1,
                    // email: 1,
                    shopLogo: 1,
                    commercial_circular_document: 1,
                    tax_registration: 1,
                    contact_paper: 1,
                    shopID: 1,
                    shopBanner: 1,
                    liveStatus: 1,
                    totalDelayOrders: 1,
                    avgPctOfDelayOrders: {
                        $cond: [
                            { $eq: ['$deliveredOrders', []] },
                            0,
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            '$totalDelayOrders',
                                            { $size: '$deliveredOrders' },
                                        ],
                                    },
                                    100,
                                ],
                            },
                        ],
                    },
                    avgPctOfDelayTime: {
                        $cond: [
                            { $eq: ['$totalPreparationTime', 0] },
                            0,
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            '$totalDelayTime',
                                            '$totalPreparationTime',
                                        ],
                                    },
                                    100,
                                ],
                            },
                        ],
                    },
                },
            },
        ]);

        return shopsWithMetrics;
    } catch (error) {
        console.error(error);
    }
};

// Graph for hourly orders
// 1: Sunday
// 2: Monday
// 3: Tuesday
// 4: Wednesday
// 5: Thursday
// 6: Friday
// 7: Saturday
exports.getOperationsGraphOrderByHourly = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            type = 'delivered',
            timeZone = '6',
        } = req.query;

        let orderConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            orderConfig = {
                ...orderConfig,
                order_placedAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (type === 'delivered') {
            orderConfig = {
                ...orderConfig,
                orderStatus: 'delivered',
            };
        }
        if (type === 'incomplete') {
            orderConfig = {
                ...orderConfig,
                orderStatus: { $nin: ['delivered'] },
            };
        }

        const hourlyOrders = await Order.aggregate([
            {
                $match: orderConfig,
            },
            {
                $group: {
                    _id: {
                        dayOfWeek: {
                            $dayOfWeek: {
                                $add: [
                                    '$order_placedAt',
                                    Number(timeZone) * 60 * 60 * 1000,
                                ],
                            },
                        },
                        hourOfDay: {
                            $hour: {
                                $add: [
                                    '$order_placedAt',
                                    Number(timeZone) * 60 * 60 * 1000,
                                ],
                            },
                        },
                    },
                    orderCount: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: {
                        dayOfWeek: '$_id.dayOfWeek',
                        hourOfDay: '$_id.hourOfDay',
                    },
                    avgOrderCount: { $avg: '$orderCount' },
                },
            },
            {
                $group: {
                    _id: '$_id.dayOfWeek',
                    hourlyOrderCounts: {
                        $push: {
                            hourOfDay: '$_id.hourOfDay',
                            avgOrderCount: '$avgOrderCount',
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    dayOfWeek: '$_id',
                    hourlyOrderCounts: 1,
                },
            },
            {
                $sort: { dayOfWeek: 1 },
            },
        ]);

        successResponse(res, {
            message: 'Successful',
            data: {
                hourlyOrders,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getGraphOfLateOrders = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         const dates = getDatesInRange(new Date(startDate), new Date(endDate));

//         let totalLateOrders = [];

//         let config = {
//             orderStatus: { $nin: ['cancelled'] },
//             isOrderLate: true,
//         };

//         for (const date of dates) {
//             const [lateButlerOrderCount, lateNormalOrderCount] =
//                 await Promise.all([
//                     Butler.countDocuments({
//                         ...config,
//                         createdAt: {
//                             $gte: new Date(date),
//                             $lt: new Date(
//                                 new Date(date).setDate(date.getDate() + 1)
//                             ),
//                         },
//                     }),
//                     Order.countDocuments({
//                         ...config,
//                         createdAt: {
//                             $gte: new Date(date),
//                             $lt: new Date(
//                                 new Date(date).setDate(date.getDate() + 1)
//                             ),
//                         },
//                     }),
//                 ]);
//             const lateOrderCount = lateButlerOrderCount + lateNormalOrderCount;

//             totalLateOrders.push({
//                 lateOrderCount,
//                 date,
//             });
//         }

//         successResponse(res, {
//             message: 'Successful',
//             data: {
//                 info: totalLateOrders,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
// exports.getGraphOfLateOrders = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         const dates = getDatesInRange(new Date(startDate), new Date(endDate));

//         const totalLateOrders = [];

//         const config = {
//             orderStatus: { $nin: ['cancelled'] },
//             isOrderLate: true,
//         };

//         for (const date of dates) {
//             const lateButlerOrderCount = await Butler.countDocuments({
//                 ...config,
//                 createdAt: {
//                     $gte: new Date(date),
//                     $lt: new Date(new Date(date).setDate(date.getDate() + 1)),
//                 },
//             });

//             const lateNormalOrderCount = await Order.countDocuments({
//                 ...config,
//                 createdAt: {
//                     $gte: new Date(date),
//                     $lt: new Date(new Date(date).setDate(date.getDate() + 1)),
//                 },
//             });

//             const lateOrderCount = lateButlerOrderCount + lateNormalOrderCount;

//             totalLateOrders.push({
//                 lateOrderCount,
//                 date,
//             });
//         }

//         successResponse(res, {
//             message: 'Successful',
//             data: {
//                 info: totalLateOrders,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getGraphOfLateOrders = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const [lateButlerOrderCount, lateNormalOrderCount] =
                await Promise.all([
                    Butler.countDocuments({
                        orderStatus: { $nin: ['cancelled'] },
                        isOrderLate: true,
                        order_placedAt: {
                            $gte: new Date(date),
                            $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                        },
                    }),
                    Order.countDocuments({
                        orderStatus: { $nin: ['cancelled'] },
                        isOrderLate: true,
                        order_placedAt: {
                            $gte: new Date(date),
                            $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                        },
                    }),
                ]);

            const lateOrderCount = lateButlerOrderCount + lateNormalOrderCount;

            return {
                lateOrderCount,
                date,
            };
        });

        const totalLateOrders = await Promise.all(promises);

        successResponse(res, {
            message: 'Successful',
            data: {
                info: totalLateOrders,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getGraphOfCanceledOrders = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const [canceledButlerOrderCount, canceledNormalOrderCount] =
                await Promise.all([
                    Butler.countDocuments({
                        orderStatus: 'cancelled',
                        cancelledAt: {
                            $gte: new Date(date),
                            $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                        },
                    }),
                    Order.countDocuments({
                        orderStatus: 'cancelled',
                        cancelledAt: {
                            $gte: new Date(date),
                            $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                        },
                    }),
                ]);

            const canceledOrderCount =
                canceledButlerOrderCount + canceledNormalOrderCount;

            return {
                canceledOrderCount,
                date,
            };
        });

        const totalCanceledOrders = await Promise.all(promises);

        successResponse(res, {
            message: 'Successful',
            data: {
                info: totalCanceledOrders,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getGraphOfAdminCanceledOrders = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const [canceledButlerOrderCount, canceledNormalOrderCount] =
                await Promise.all([
                    Butler.countDocuments({
                        orderStatus: 'cancelled',
                        'orderCancel.canceledBy': 'admin',
                        cancelledAt: {
                            $gte: new Date(date),
                            $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                        },
                    }),
                    Order.countDocuments({
                        orderStatus: 'cancelled',
                        'orderCancel.canceledBy': 'admin',
                        cancelledAt: {
                            $gte: new Date(date),
                            $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                        },
                    }),
                ]);

            const canceledOrderCount =
                canceledButlerOrderCount + canceledNormalOrderCount;

            return {
                canceledOrderCount,
                date,
            };
        });

        const totalCanceledOrders = await Promise.all(promises);

        successResponse(res, {
            message: 'Successful',
            data: {
                info: totalCanceledOrders,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getGraphOfReplacementOrders = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const replacementOrderCount = await Order.countDocuments({
                orderStatus: { $nin: ['cancelled'] },
                isReplacementOrder: true,
                order_placedAt: {
                    $gte: new Date(date),
                    $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                },
            });

            return {
                replacementOrderCount,
                date,
            };
        });

        const totalReplacementOrders = await Promise.all(promises);

        successResponse(res, {
            message: 'Successful',
            data: {
                info: totalReplacementOrders,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Customer Support Dashboard ***/
exports.getSingleCustomerSupportDashboard = async (req, res) => {
    try {
        const { customerServiceId, startDate, endDate } = req.query;

        let openTicketsCountConfig = {
            status: 'accepted',
        };

        let dateConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            dateConfig.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        if (customerServiceId) {
            const customerService = await AdminModel.findOne({
                _id: customerServiceId,
                adminType: 'customerService',
            });

            if (!customerService) {
                return errorResponse(res, 'Customer Service not found');
            }

            openTicketsCountConfig.admin = customerServiceId;
        }

        const openTicketsCount = await AdminChatRequest.countDocuments({
            ...openTicketsCountConfig,
            ...dateConfig,
        });

        const pendingTicketsCount = await AdminChatRequest.countDocuments({
            status: 'pending',
            ...dateConfig,
        });

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                openTicketsCount,
                pendingTicketsCount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTableOfReasonMessage = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'desc',
            customerServiceId,
            startDate,
            endDate,
        } = req.query;

        let commonConfig = {};

        if (customerServiceId) {
            const customerService = await AdminModel.findOne({
                _id: customerServiceId,
                adminType: 'customerService',
            });

            if (!customerService) {
                return errorResponse(res, 'Customer Service not found');
            }

            commonConfig.admin = ObjectId(customerServiceId);
        }

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            commonConfig.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        const tableInfo = await AdminChatRequest.aggregate([
            {
                $match: commonConfig,
            },
            {
                $group: {
                    _id: '$reasonMessage',
                    messageCount: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    reason: '$_id',
                    messageCount: 1,
                },
            },
            {
                $sort: {
                    messageCount: sortBy.toUpperCase() === 'DESC' ? -1 : 1,
                },
            },
        ]);

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: tableInfo.length,
            pagingRange: 5,
        });

        const list = tableInfo.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                reasons: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTableOfResolveReason = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'desc',
            customerServiceId,
            startDate,
            endDate,
        } = req.query;

        let commonConfig = { status: 'closed' };

        if (customerServiceId) {
            const customerService = await AdminModel.findOne({
                _id: customerServiceId,
                adminType: 'customerService',
            });

            if (!customerService) {
                return errorResponse(res, 'Customer Service not found');
            }

            commonConfig.admin = ObjectId(customerServiceId);
        }

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            commonConfig.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        const tableInfo = await AdminChatRequest.aggregate([
            {
                $match: commonConfig,
            },
            {
                $group: {
                    _id: '$resolveReason',
                    messageCount: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    reason: '$_id',
                    messageCount: 1,
                },
            },
            {
                $sort: {
                    messageCount: sortBy.toUpperCase() === 'DESC' ? -1 : 1,
                },
            },
        ]);

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: tableInfo.length,
            pagingRange: 5,
        });

        const list = tableInfo.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                reasons: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getGraphOfResolvedTickets = async (req, res) => {
    try {
        const { startDate, endDate, customerServiceId } = req.query;

        let commonConfig = { status: 'closed' };

        if (customerServiceId) {
            const customerService = await AdminModel.findOne({
                _id: customerServiceId,
                adminType: 'customerService',
            });

            if (!customerService) {
                return errorResponse(res, 'Customer Service not found');
            }

            commonConfig.admin = ObjectId(customerServiceId);
        }

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const resolvedTickets = await AdminChatRequest.countDocuments({
                ...commonConfig,
                createdAt: {
                    $gte: new Date(date),
                    $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                },
            });

            return {
                resolvedTickets,
                date,
            };
        });

        const graphInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Successful',
            data: {
                info: graphInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTableOfCustomerServicePerformance = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortByKey = 'time',
            sortBy = 'desc',
            startDate,
            endDate,
        } = req.query;

        let dateConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            dateConfig.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        const customerServices = await AdminModel.find({
            status: 'active',
            adminType: 'customerService',
        }).select(
            'name gender phone_number email profile_photo address liveStatus'
        );

        const promises = customerServices.map(async customerService => {
            const pipelineOfResolvedTicketTime = [
                {
                    $match: {
                        admin: ObjectId(customerService._id),
                        status: 'closed',
                        ...dateConfig,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalResolvedTicketTime: {
                            $sum: {
                                $divide: [
                                    {
                                        $subtract: [
                                            { $toDate: '$closedAt' },
                                            { $toDate: '$acceptedAt' },
                                        ],
                                    },
                                    60000, // Convert milliseconds to minutes
                                ],
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        avgResolvedTicketsTime: {
                            $ceil: {
                                $divide: ['$totalResolvedTicketTime', '$count'],
                            },
                        },
                        totalResolvedTickets: '$count',
                    },
                },
            ];
            const resultOfResolvedTicketTime = await AdminChatRequest.aggregate(
                pipelineOfResolvedTicketTime
            );

            return {
                customerService,
                avgResolvedTicketsTime: resultOfResolvedTicketTime[0]
                    ? resultOfResolvedTicketTime[0].avgResolvedTicketsTime
                    : 0,
                totalResolvedTickets: resultOfResolvedTicketTime[0]
                    ? resultOfResolvedTicketTime[0].totalResolvedTickets
                    : 0,
            };
        });

        const tableInfo = await Promise.all(promises);

        const keySelector =
            sortByKey === 'ticket'
                ? 'totalResolvedTickets'
                : 'avgResolvedTicketsTime';
        let list = tableInfo.sort((a, b) => {
            const keyA = a[keySelector];
            const keyB = b[keySelector];

            return sortBy.toUpperCase() === 'DESC' ? keyB - keyA : keyA - keyB;
        });

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                reasons: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Marketing Manager Dashboard ***/
exports.getSingleMarketingManagerDashboard = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // const marketingManagerId = req.adminId;

        // const marketingManager = await AdminModel.findOne({
        //     _id: marketingManagerId,
        //     adminType: 'marketing',
        // });
        // if (!marketingManager)
        //     return errorResponse(res, 'He is not a marketing manager');

        let dateConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            dateConfig.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        const discountShopCount = await MarketingModel.distinct('shop', {
            type: 'percentage',
            isActive: true,
            status: 'active',
            ...dateConfig,
        });
        const discountShops = discountShopCount.length;

        const buy1get1ShopCount = await MarketingModel.distinct('shop', {
            type: 'double_menu',
            isActive: true,
            status: 'active',
            ...dateConfig,
        });
        const buy1get1Shops = buy1get1ShopCount.length;

        const freeDeliveryShopCount = await MarketingModel.distinct('shop', {
            type: 'free_delivery',
            isActive: true,
            status: 'active',
            ...dateConfig,
        });
        const freeDeliveryShops = freeDeliveryShopCount.length;

        const rewardShopCount = await MarketingModel.distinct('shop', {
            type: 'reward',
            isActive: true,
            status: 'active',
            ...dateConfig,
        });
        const rewardShops = rewardShopCount.length;

        const punchMarketingShopCount = await MarketingModel.distinct('shop', {
            type: 'punch_marketing',
            isActive: true,
            status: 'active',
            ...dateConfig,
        });
        const punchMarketingShops = punchMarketingShopCount.length;

        const featuredShopCount = await MarketingModel.distinct('shop', {
            type: 'featured',
            isActive: true,
            status: 'active',
            ...dateConfig,
        });
        const featuredShops = featuredShopCount.length;

        const activeCoupons = await CouponModel.countDocuments({
            couponType: {
                $in: [
                    'global',
                    'individual_user',
                    'individual_store',
                    'custom_coupon',
                ],
            },
            couponStatus: 'active',
            couponExpiredReason: { $exists: false },
            deletedAt: null,
            ...dateConfig,
        });

        const ongoingMarketing = {
            discountShops,
            buy1get1Shops,
            freeDeliveryShops,
            rewardShops,
            punchMarketingShops,
            featuredShops,
            activeCoupons,
        };

        successResponse(res, {
            message: 'Success',
            data: {
                ongoingMarketing,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Marketing Manager of Marketing Graph ***/
exports.getMarketingManagerGraphMarketing = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // const marketingManagerId = req.adminId;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        // const marketingManager = await AdminModel.findOne({
        //     _id: marketingManagerId,
        //     adminType: 'marketing',
        // });
        // if (!marketingManager)
        //     return errorResponse(res, 'He is not a marketing manager');

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const createdAt = {
                $gte: new Date(date),
                $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
            };

            const discountShopCount = await MarketingModel.distinct('shop', {
                type: 'percentage',
                createdAt,
            });
            const discountShops = discountShopCount.length;

            const buy1get1ShopCount = await MarketingModel.distinct('shop', {
                type: 'double_menu',
                createdAt,
            });
            const buy1get1Shops = buy1get1ShopCount.length;

            const freeDeliveryShopCount = await MarketingModel.distinct(
                'shop',
                {
                    type: 'free_delivery',
                    createdAt,
                }
            );
            const freeDeliveryShops = freeDeliveryShopCount.length;

            const rewardShopCount = await MarketingModel.distinct('shop', {
                type: 'reward',
                createdAt,
            });
            const rewardShops = rewardShopCount.length;

            const featuredShopCount = await MarketingModel.distinct('shop', {
                type: 'featured',
                createdAt,
            });
            const featuredShops = featuredShopCount.length;

            const punchMarketingShopCount = await MarketingModel.distinct(
                'shop',
                {
                    type: 'punch_marketing',
                    createdAt,
                }
            );
            const punchMarketingShops = punchMarketingShopCount.length;

            return {
                discountShops,
                buy1get1Shops,
                freeDeliveryShops,
                rewardShops,
                featuredShops,
                punchMarketingShops,
                date,
            };
        });

        const marketingInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                info: marketingInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Marketing Manager of Marketing Amount Spent Graph ***/
exports.getMarketingManagerGraphMarketingSpent = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // const marketingManagerId = req.adminId;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        // const marketingManager = await AdminModel.findOne({
        //     _id: marketingManagerId,
        //     adminType: 'marketing',
        // });
        // if (!marketingManager)
        //     return errorResponse(res, 'He is not a marketing manager');

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const marketingAmountSpentQ = await Order.aggregate([
                {
                    $match: {
                        orderStatus: 'delivered',
                        deliveredAt: {
                            $gte: new Date(date),
                            $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
                        },
                    },
                },
                {
                    $group: {
                        _id: '',
                        count: { $sum: 1 },
                        discountAmountSpentAdmin: {
                            $sum: '$discountCut.baseCurrency_discountAdminCut',
                        },
                        discountAmountSpentShop: {
                            $sum: '$discountCut.baseCurrency_discountShopCut',
                        },
                        buy1get1AmountSpentAdmin: {
                            $sum: '$doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceAdmin',
                        },
                        buy1get1AmountSpentShop: {
                            $sum: '$doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceShop',
                        },
                        freeDeliveryAmountSpentAdmin: {
                            $sum: '$freeDeliveryCut.baseCurrency_dropLossForFreeDelivery',
                        },
                        freeDeliveryAmountSpentShop: {
                            $sum: '$freeDeliveryCut.baseCurrency_shopLossForFreeDelivery',
                        },
                        rewardAmountSpentAdmin: {
                            $sum: '$rewardRedeemCut.rewardAdminCut',
                        },
                        rewardAmountSpentShop: {
                            $sum: '$rewardRedeemCut.rewardShopCut',
                        },
                        couponAmountSpentAdmin: {
                            $sum: '$couponDiscountCut.baseCurrency_couponAdminCut',
                        },
                        couponAmountSpentShop: {
                            $sum: '$couponDiscountCut.baseCurrency_couponShopCut',
                        },
                        punchMarketingAmountSpentShop: {
                            $sum: '$summary.baseCurrency_punchMarketingDiscountAmount',
                        },
                    },
                },
            ]);

            const {
                discountAmountSpentAdmin = 0,
                discountAmountSpentShop = 0,
                buy1get1AmountSpentAdmin = 0,
                buy1get1AmountSpentShop = 0,
                freeDeliveryAmountSpentAdmin = 0,
                freeDeliveryAmountSpentShop = 0,
                rewardAmountSpentAdmin = 0,
                rewardAmountSpentShop = 0,
                couponAmountSpentAdmin = 0,
                couponAmountSpentShop = 0,
                punchMarketingAmountSpentShop = 0,
            } = marketingAmountSpentQ[0] || {};

            const { featuredAmount: featuredAmountShop } =
                await getFeaturedAmount({
                    startDate: date,
                    endDate: date,
                });

            return {
                discountAmountSpent:
                    discountAmountSpentAdmin + discountAmountSpentShop,
                buy1get1AmountSpent:
                    buy1get1AmountSpentAdmin + buy1get1AmountSpentShop,
                freeDeliveryAmountSpent:
                    freeDeliveryAmountSpentAdmin + freeDeliveryAmountSpentShop,
                rewardAmountSpent:
                    rewardAmountSpentAdmin + rewardAmountSpentShop,
                couponAmountSpent:
                    couponAmountSpentAdmin +
                    couponAmountSpentShop -
                    punchMarketingAmountSpentShop,
                featuredAmount: featuredAmountShop,
                punchMarketingAmountSpent: punchMarketingAmountSpentShop,
                discountAmountSpentAdmin,
                discountAmountSpentShop,
                buy1get1AmountSpentAdmin,
                buy1get1AmountSpentShop,
                freeDeliveryAmountSpentAdmin,
                freeDeliveryAmountSpentShop,
                rewardAmountSpentAdmin,
                rewardAmountSpentShop,
                featuredAmountShop,
                couponAmountSpentAdmin,
                couponAmountSpentShop:
                    couponAmountSpentShop - punchMarketingAmountSpentShop,
                punchMarketingAmountSpentShop,
                date,
            };
        });

        const marketingInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                info: marketingInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Marketing Manager Shops Table***/
exports.getMarketingManagerTableShops = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortByKey = 'discount', // discount || buy1get1 || freeDelivery || reward || featured || punchMarketing || coupon
            sortBy = 'desc',
            startDate,
            endDate,
        } = req.query;
        // const marketingManagerId = req.adminId;

        // const marketingManager = await AdminModel.findOne({
        //     _id: marketingManagerId,
        //     adminType: 'marketing',
        // });
        // if (!marketingManager)
        //     return errorResponse(res, 'He is not a marketing manager');

        let dateConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            dateConfig.order_placedAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        const shops = await Shop.find({
            shopStatus: 'active',
            deletedAt: null,
            parentShop: null,
        })
            .select(
                'shopType shopName phone_number name email shopLogo shopBanner liveStatus'
            )
            .lean();

        const promises = shops.map(async shop => {
            const marketingAmountSpentQ = await Order.aggregate([
                {
                    $match: {
                        shop: ObjectId(shop._id),
                        orderStatus: 'delivered',
                        ...dateConfig,
                    },
                },
                {
                    $group: {
                        _id: '',
                        discountAmountSpentAdmin: {
                            $sum: '$discountCut.baseCurrency_discountAdminCut',
                        },
                        discountAmountSpentShop: {
                            $sum: '$discountCut.baseCurrency_discountShopCut',
                        },
                        buy1get1AmountSpentAdmin: {
                            $sum: '$doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceAdmin',
                        },
                        buy1get1AmountSpentShop: {
                            $sum: '$doubleMenuItemPrice.baseCurrency_doubleMenuItemPriceShop',
                        },
                        freeDeliveryAmountSpentAdmin: {
                            $sum: '$freeDeliveryCut.baseCurrency_dropLossForFreeDelivery',
                        },
                        freeDeliveryAmountSpentShop: {
                            $sum: '$freeDeliveryCut.baseCurrency_shopLossForFreeDelivery',
                        },
                        rewardAmountSpentAdmin: {
                            $sum: '$rewardRedeemCut.rewardAdminCut',
                        },
                        rewardAmountSpentShop: {
                            $sum: '$rewardRedeemCut.rewardShopCut',
                        },
                        couponAmountSpentAdmin: {
                            $sum: '$couponDiscountCut.baseCurrency_couponAdminCut',
                        },
                        couponAmountSpentShop: {
                            $sum: '$couponDiscountCut.baseCurrency_couponShopCut',
                        },
                        punchMarketingAmountSpentShop: {
                            $sum: '$summary.baseCurrency_punchMarketingDiscountAmount',
                        },
                        count: { $sum: 1 },
                    },
                },
            ]);
            const {
                discountAmountSpentAdmin = 0,
                discountAmountSpentShop = 0,
                buy1get1AmountSpentAdmin = 0,
                buy1get1AmountSpentShop = 0,
                freeDeliveryAmountSpentAdmin = 0,
                freeDeliveryAmountSpentShop = 0,
                rewardAmountSpentAdmin = 0,
                rewardAmountSpentShop = 0,
                couponAmountSpentAdmin = 0,
                couponAmountSpentShop = 0,
                punchMarketingAmountSpentShop = 0,
            } = marketingAmountSpentQ[0] || {};

            const { featuredAmount: featuredAmountShop } =
                await getFeaturedAmount({
                    type: 'shop',
                    id: shop._id,
                });

            return {
                discountAmountSpent:
                    discountAmountSpentAdmin + discountAmountSpentShop,
                buy1get1AmountSpent:
                    buy1get1AmountSpentAdmin + buy1get1AmountSpentShop,
                freeDeliveryAmountSpent:
                    freeDeliveryAmountSpentAdmin + freeDeliveryAmountSpentShop,
                rewardAmountSpent:
                    rewardAmountSpentAdmin + rewardAmountSpentShop,
                couponAmountSpent:
                    couponAmountSpentAdmin +
                    couponAmountSpentShop -
                    punchMarketingAmountSpentShop,
                featuredAmount: featuredAmountShop,
                punchMarketingAmountSpent: punchMarketingAmountSpentShop,
                discountAmountSpentAdmin,
                discountAmountSpentShop,
                buy1get1AmountSpentAdmin,
                buy1get1AmountSpentShop,
                freeDeliveryAmountSpentAdmin,
                freeDeliveryAmountSpentShop,
                rewardAmountSpentAdmin,
                rewardAmountSpentShop,
                featuredAmountShop,
                couponAmountSpentAdmin,
                couponAmountSpentShop:
                    couponAmountSpentShop - punchMarketingAmountSpentShop,
                punchMarketingAmountSpentShop,
                shop,
            };
        });

        const tableInfo = await Promise.all(promises);

        const keySelector =
            sortByKey === 'discount'
                ? 'discountAmountSpent'
                : sortByKey === 'buy1get1'
                ? 'buy1get1AmountSpent'
                : sortByKey === 'reward'
                ? 'rewardAmountSpent'
                : sortByKey === 'featured'
                ? 'featuredAmount'
                : sortByKey === 'punchMarketing'
                ? 'punchMarketingAmountSpent'
                : sortByKey === 'coupon'
                ? 'couponAmountSpent'
                : 'freeDeliveryAmountSpent';

        let list = tableInfo.sort((a, b) => {
            const keyA = a[keySelector];
            const keyB = b[keySelector];

            return sortBy.toUpperCase() === 'DESC' ? keyB - keyA : keyA - keyB;
        });

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Success',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Marketing Manager Deals Table***/
exports.getMarketingManagerTableDeals = async (req, res) => {
    try {
        const {
            sortByKey = 'shop', // shop || user
            sortBy = 'desc',
            startDate,
            endDate,
        } = req.query;
        // const marketingManagerId = req.adminId;

        // const marketingManager = await AdminModel.findOne({
        //     _id: marketingManagerId,
        //     adminType: 'marketing',
        // });
        // if (!marketingManager)
        //     return errorResponse(res, 'He is not a marketing manager');

        let dateConfig = {};
        let orderConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            dateConfig.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
            orderConfig.order_placedAt = {
                $gte: startDateTime,
                $lte: endDateTime,
            };
        }

        const discountUsageOfShops = (
            await MarketingModel.distinct('shop', {
                type: 'percentage',
                ...dateConfig,
            })
        ).length;
        const buy1Get1UsageOfShops = (
            await MarketingModel.distinct('shop', {
                type: 'double_menu',
                ...dateConfig,
            })
        ).length;
        const freeDeliveryUsageOfShops = (
            await MarketingModel.distinct('shop', {
                type: 'free_delivery',
                ...dateConfig,
            })
        ).length;
        const rewardUsageOfShops = (
            await MarketingModel.distinct('shop', {
                type: 'reward',
                ...dateConfig,
            })
        ).length;
        const featuredUsageOfShops = (
            await MarketingModel.distinct('shop', {
                type: 'featured',
                ...dateConfig,
            })
        ).length;
        const punchMarketingUsageOfShops = (
            await MarketingModel.distinct('shop', {
                type: 'punch_marketing',
                ...dateConfig,
            })
        ).length;
        const couponUsageOfShops = await CouponModel.countDocuments({
            $or: [
                {
                    couponShops: {
                        $elemMatch: {
                            $exists: true,
                        },
                    },
                },
                {
                    couponShopTypes: {
                        $elemMatch: {
                            $exists: true,
                        },
                    },
                },
            ],
            ...dateConfig,
        });

        const discountUsageOfUsers = (
            await Order.distinct('user', {
                marketings: {
                    $elemMatch: {
                        $exists: true,
                    },
                },
                'summary.baseCurrency_discount': { $gt: 0 },
                ...orderConfig,
            })
        ).length;
        const buy1Get1UsageOfUsers = (
            await Order.distinct('user', {
                marketings: {
                    $elemMatch: {
                        $exists: true,
                    },
                },
                'summary.baseCurrency_doubleMenuItemPrice': { $gt: 0 },
                ...orderConfig,
            })
        ).length;
        const freeDeliveryUsageOfUsers = (
            await Order.distinct('user', {
                marketings: {
                    $elemMatch: {
                        $exists: true,
                    },
                },
                'summary.baseCurrency_riderFee': 0,
                ...orderConfig,
            })
        ).length;
        const rewardUsageOfUsers = (
            await Order.distinct('user', {
                marketings: {
                    $elemMatch: {
                        $exists: true,
                    },
                },
                'summary.reward.baseCurrency_amount': { $gt: 0 },
                ...orderConfig,
            })
        ).length;
        const punchMarketingUsageOfUsers = (
            await Order.distinct('user', {
                marketings: {
                    $elemMatch: {
                        $exists: true,
                    },
                },
                'summary.baseCurrency_punchMarketingDiscountAmount': { $gt: 0 },
                ...orderConfig,
            })
        ).length;
        const couponUsageOfUsers = (
            await Order.distinct('user', {
                marketings: {
                    $elemMatch: {
                        $exists: true,
                    },
                },
                'summary.baseCurrency_couponDiscountAmount': { $gt: 0 },
                ...orderConfig,
            })
        ).length;

        const tableInfo = [
            {
                title: 'discount',
                usageOfShops: discountUsageOfShops,
                usageOfUsers: discountUsageOfUsers,
            },
            {
                title: 'buy1get1',
                usageOfShops: buy1Get1UsageOfShops,
                usageOfUsers: buy1Get1UsageOfUsers,
            },
            {
                title: 'freeDelivery',
                usageOfShops: freeDeliveryUsageOfShops,
                usageOfUsers: freeDeliveryUsageOfUsers,
            },
            {
                title: 'reward',
                usageOfShops: rewardUsageOfShops,
                usageOfUsers: rewardUsageOfUsers,
            },
            {
                title: 'featured',
                usageOfShops: featuredUsageOfShops,
            },
            {
                title: 'punchMarketing',
                usageOfShops: punchMarketingUsageOfShops,
                usageOfUsers: punchMarketingUsageOfUsers,
            },
            {
                title: 'coupon',
                usageOfShops: couponUsageOfShops,
                usageOfUsers: couponUsageOfUsers,
            },
        ];

        const keySelector =
            sortByKey === 'shop' ? 'usageOfShops' : 'usageOfUsers';

        const list = tableInfo.sort((a, b) => {
            const keyA = a[keySelector];
            const keyB = b[keySelector];

            return sortBy.toUpperCase() === 'DESC' ? keyB - keyA : keyA - keyB;
        });

        successResponse(res, {
            message: 'Success',
            data: {
                deals: list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Admin General Dashboard ***/
exports.getGeneralDashboard = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let config = {};

        if (startDate) {
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

        const totalUsers = await UserModel.countDocuments({
            status: 'active',
            deletedAt: null,
            ...config,
        });

        // const newUsers = await UserModel.countDocuments({
        //     status: 'active',
        //     orderCompleted: 0,
        //     deletedAt: null,
        //     ...config,
        // });

        // const lapsedUsers = totalUsers - newUsers;

        const totalShops = await Shop.countDocuments({
            shopStatus: 'active',
            deletedAt: null,
            parentShop: null,
            ...config,
        });

        // const newShops = await Shop.countDocuments({
        //     shopStatus: 'active',
        //     deletedAt: null,
        //     parentShop: null,
        //     createdAt: { $gte: moment().startOf('month').toDate() },
        // });

        successResponse(res, {
            message: 'Success',
            data: {
                totalUsers,
                // newUsers,
                // lapsedUsers,
                totalShops,
                // newShops,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Admin Financial Dashboard ***/
exports.getTotalAdminProfitGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const totalAdminProfit = await getTotalAdminProfit(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const adminProfit = await getTotalAdminProfit(
                date,
                date,
                paidCurrency
            );

            return {
                adminProfit,
                date,
            };
        });

        const adminProfitInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                totalAdminProfit,
                info: adminProfitInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAdminDeliveryProfitGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const totalAdminDeliveryProfit = await getAdminDeliveryProfit(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const adminDeliveryProfit = await getAdminDeliveryProfit(
                date,
                date,
                paidCurrency
            );

            return {
                adminDeliveryProfit,
                date,
            };
        });

        const adminDeliveryProfitInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                totalAdminDeliveryProfit,
                info: adminDeliveryProfitInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAdminRefundGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const totalAdminRefund = await getAdminRefund(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const adminRefund = await getAdminRefund(date, date, paidCurrency);

            return {
                adminRefund,
                date,
            };
        });

        const adminRefundInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                totalAdminRefund,
                info: adminRefundInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTotalMarketingSpentGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const totalMarketingSpent = await getTotalMarketingSpent(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const marketingSpent = await getTotalMarketingSpent(
                date,
                date,
                paidCurrency
            );

            return {
                marketingSpent,
                date,
            };
        });

        const marketingSpentInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                totalMarketingSpent,
                info: marketingSpentInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAdminMarketingSpentGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const totalAdminMarketingSpent = await getAdminMarketingSpent(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const adminMarketingSpent = await getAdminMarketingSpent(
                date,
                date,
                paidCurrency
            );

            return {
                adminMarketingSpent,
                date,
            };
        });

        const adminMarketingSpentInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                totalAdminMarketingSpent,
                info: adminMarketingSpentInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopMarketingSpentGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const totalShopMarketingSpent = await getShopMarketingSpent(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const shopMarketingSpent = await getShopMarketingSpent(
                date,
                date,
                paidCurrency
            );

            return {
                shopMarketingSpent,
                date,
            };
        });

        const shopMarketingSpentInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                totalShopMarketingSpent,
                info: shopMarketingSpentInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getFreeDeliveryByAdminGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const { freeDelivery } = await getFreeDeliveryByAdmin(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const { freeDelivery } = await getFreeDeliveryByAdmin(
                date,
                date,
                paidCurrency
            );

            return {
                freeDelivery,
                date,
            };
        });

        const freeDeliveryByAdminInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                freeDelivery,
                info: freeDeliveryByAdminInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getFreeDeliveryByShopGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const { freeDelivery } = await getFreeDeliveryByShop(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const { freeDelivery } = await getFreeDeliveryByShop(
                date,
                date,
                paidCurrency
            );

            return {
                freeDelivery,
                date,
            };
        });

        const freeDeliveryByShopInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                freeDelivery,
                info: freeDeliveryByShopInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAdminMarketingCashbackGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const totalAdminMarketingCashback = await getAdminMarketingCashback(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const adminMarketingCashback = await getAdminMarketingCashback(
                date,
                date,
                paidCurrency
            );

            return {
                adminMarketingCashback,
                date,
            };
        });

        const adminMarketingCashbackInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                totalAdminMarketingCashback,
                info: adminMarketingCashbackInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTotalDeliveryFeesGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const { totalDeliveryFees } = await getTotalDeliveryFees(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const { totalDeliveryFees: deliveryFees } =
                await getTotalDeliveryFees(date, date, paidCurrency);

            return {
                deliveryFees,
                date,
            };
        });

        const deliveryFeesInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                totalDeliveryFees,
                info: deliveryFeesInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTotalShopPayoutGraph = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required.');

        const totalShopPayout = await getTotalShopPayout(
            startDate,
            endDate,
            paidCurrency
        );

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));

        const promises = dates.map(async date => {
            const shopPayout = await getTotalShopPayout(
                date,
                date,
                paidCurrency
            );

            return {
                shopPayout,
                date,
            };
        });

        const shopPayoutInfo = await Promise.all(promises);

        successResponse(res, {
            message: 'Success',
            data: {
                totalShopPayout,
                info: shopPayoutInfo,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getFinancialDashboard = async (req, res) => {
    try {
        const { startDate, endDate, paidCurrency } = req.query;

        const { totalRiderTips } = await getTotalRiderTips({
            startDate,
            endDate,
            paidCurrency,
        });

        const { totalButlerOrderAmount } = await getTotalButlerOrderAmount({
            startDate,
            endDate,
            paidCurrency,
        });

        const { totalProfitFromButler } = await getTotalProfitFromButler({
            startDate,
            endDate,
            paidCurrency,
        });

        const { totalRiderPayout } = await getTotalRiderPayout({
            startDate,
            endDate,
            paidCurrency,
        });

        const {
            availableBalance: balance,
            secondaryCurrency_availableBalance: secondaryCurrency_balance,
        } = await getUserBalance();

        successResponse(res, {
            message: 'Success',
            data: {
                totalRiderTips,
                totalButlerOrderAmount,
                totalProfitFromButler,
                totalRiderPayout,
                totalAmountOfUsersWallet:
                    paidCurrency === 'baseCurrency'
                        ? balance
                        : secondaryCurrency_balance,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCustomersDashBoard = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required!');

        const { startDateTime, endDateTime, oldStartDate, oldEndDate } =
            formatDate(startDate, endDate);

        const findOrders = await Order.find({
            orderStatus: 'delivered',
            deliveredAt: {
                $gte: oldStartDate,
                $lte: endDateTime,
            },
        })
            .select('user summary deliveredAt')
            .populate([
                { path: 'user', select: 'orderCompleted repeatedOrderAt' },
            ]);

        const orders = findOrders.filter(
            order =>
                order.deliveredAt >= startDateTime &&
                order.deliveredAt <= endDateTime
        );

        const totalActiveCustomersId = [];
        const newCustomersId = [];
        const repeatedCustomersId = [];
        let newCustomerOrdersCount = 0;
        let activeCustomerSales = 0;
        let newCustomerSales = 0;

        for (const order of orders) {
            activeCustomerSales +=
                order.summary.baseCurrency_productAmount -
                order.summary.baseCurrency_discount -
                order.summary.reward.baseCurrency_amount;

            if (!totalActiveCustomersId.includes(order.user._id.toString())) {
                totalActiveCustomersId.push(order.user._id.toString());
            }

            if (
                order.user.orderCompleted === 1 ||
                order.user.repeatedOrderAt > endDateTime
            ) {
                newCustomerSales +=
                    order.summary.baseCurrency_productAmount -
                    order.summary.baseCurrency_discount -
                    order.summary.reward.baseCurrency_amount;
                newCustomerOrdersCount += 1;

                if (!newCustomersId.includes(order.user._id.toString())) {
                    newCustomersId.push(order.user._id.toString());
                }
            } else if (
                !repeatedCustomersId.includes(order.user._id.toString())
                //  &&
                // order.user.orderCompleted > 1 &&
                // order.user.repeatedOrderAt <= endDateTime
            ) {
                repeatedCustomersId.push(order.user._id.toString());
            }
        }

        const totalActiveCustomers = totalActiveCustomersId.length;
        const newCustomers = newCustomersId.length;
        const repeatedCustomers = repeatedCustomersId.length;

        const activeCustomerOrdersCount = orders.length;
        const repeatedCustomerOrdersCount =
            activeCustomerOrdersCount - newCustomerOrdersCount;

        const repeatedCustomerSales = activeCustomerSales - newCustomerSales;

        const activeCustomersPctOfSales = parseFloat(
            ((activeCustomerSales / activeCustomerSales || 0) * 100).toFixed(2)
        );
        const activeCustomerAvgOrderValue = parseFloat(
            (activeCustomerSales / activeCustomerOrdersCount || 0).toFixed(2)
        );

        const newCustomerPctOfSales = parseFloat(
            ((newCustomerSales / activeCustomerSales || 0) * 100).toFixed(2)
        );
        const newCustomerAvgOrderValue = parseFloat(
            (newCustomerSales / newCustomerOrdersCount || 0).toFixed(2)
        );

        const repeatedCustomerPctOfSales = parseFloat(
            ((repeatedCustomerSales / activeCustomerSales || 0) * 100).toFixed(
                2
            )
        );
        const repeatedCustomerAvgOrderValue = parseFloat(
            (repeatedCustomerSales / repeatedCustomerOrdersCount || 0).toFixed(
                2
            )
        );

        // For Lapsed Customers
        const oldOrders = findOrders.filter(
            order =>
                order.deliveredAt >= oldStartDate &&
                order.deliveredAt <= oldEndDate
        );

        const oldActiveCustomersId = [];
        const lapsedCustomersId = [];
        let lapsedCustomerOrdersCount = 0;
        let lapsedCustomerSales = 0;

        for (const order of oldOrders) {
            if (!oldActiveCustomersId.includes(order.user._id.toString())) {
                oldActiveCustomersId.push(order.user._id.toString());
            }

            if (!totalActiveCustomersId.includes(order.user._id.toString())) {
                lapsedCustomerOrdersCount += 1;
                lapsedCustomerSales +=
                    order.summary.baseCurrency_productAmount -
                    order.summary.baseCurrency_discount -
                    order.summary.reward.baseCurrency_amount;

                if (!lapsedCustomersId.includes(order.user._id.toString())) {
                    lapsedCustomersId.push(order.user._id.toString());
                }
            }
        }

        const lapsedCustomers = lapsedCustomersId.length;
        const lapsedCustomerAvgOrderValue = parseFloat(
            (lapsedCustomerSales / lapsedCustomerOrdersCount || 0).toFixed(2)
        );

        const oldActiveCustomers = oldActiveCustomersId.length;
        const activeCustomersIncrease =
            oldActiveCustomers === 0
                ? 0
                : ((totalActiveCustomers - oldActiveCustomers) /
                      oldActiveCustomers || 0) * 100;

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                totalActiveCustomers,
                newCustomers,
                repeatedCustomers,
                activeCustomerOrdersCount,
                newCustomerOrdersCount,
                repeatedCustomerOrdersCount,
                activeCustomerSales,
                newCustomerSales,
                repeatedCustomerSales,
                activeCustomersPctOfSales,
                activeCustomerAvgOrderValue,
                newCustomerPctOfSales,
                newCustomerAvgOrderValue,
                repeatedCustomerPctOfSales,
                repeatedCustomerAvgOrderValue,
                lapsedCustomers,
                lapsedCustomerOrdersCount,
                lapsedCustomerSales,
                lapsedCustomerAvgOrderValue,
                activeCustomersIncrease,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCustomersTable = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'desc',
            startDate,
            endDate,
            userType,
        } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required!');

        const validUserTypes = [
            'newUser',
            'repeatedUser',
            'activeUser',
            'lapsedUser',
        ];
        if (userType && !validUserTypes.includes(userType))
            return errorResponse(
                res,
                'userType should be newUser, repeatedUser, activeUser, or lapsedUser'
            );

        const { startDateTime, endDateTime, oldStartDate, oldEndDate } =
            formatDate(startDate, endDate);

        let customers = [];

        if (userType === 'lapsedUser') {
            const activeUsersId = await Order.distinct('user', {
                orderStatus: 'delivered',
                deliveredAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            });
            const oldActiveUsersId = await Order.distinct('user', {
                orderStatus: 'delivered',
                deliveredAt: {
                    $gte: oldStartDate,
                    $lte: oldEndDate,
                },
            });

            const lapsedUsersId = oldActiveUsersId.filter(
                id => !activeUsersId.includes(id)
            );

            customers = await UserModel.find({
                _id: { $in: lapsedUsersId },
            })
                .select('name profile_photo orderCompleted')
                .lean();
        } else {
            const activeUsersId = await Order.distinct('user', {
                orderStatus: 'delivered',
                deliveredAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            });
            const activeCustomers = await UserModel.find({
                _id: { $in: activeUsersId },
            })
                .select('name profile_photo orderCompleted repeatedOrderAt')
                .lean();

            customers = activeCustomers;

            if (userType === 'newUser') {
                customers = activeCustomers.filter(
                    customer =>
                        customer.orderCompleted === 1 ||
                        customer.repeatedOrderAt > endDateTime
                );
            } else if (userType === 'repeatedUser') {
                // customers = activeCustomers.filter(
                //     customer =>
                //         customer.orderCompleted > 1 &&
                //         customer.repeatedOrderAt <= endDateTime
                // );

                const newCustomersId = activeCustomers
                    .filter(
                        customer =>
                            customer.orderCompleted === 1 ||
                            customer.repeatedOrderAt > endDateTime
                    )
                    .map(customer => customer._id);

                customers = activeCustomers.filter(
                    customer =>
                        !newCustomersId.includes(customer._id.toString())
                );
            }
        }

        for (const customer of customers) {
            const deliveredOrders = await Order.countDocuments({
                user: customer._id,
            });
            customer.deliveredOrders = deliveredOrders;
        }

        const sortedCustomers = customers.sort((a, b) => {
            const keyA = a['deliveredOrders'];
            const keyB = b['deliveredOrders'];
            return sortBy.toUpperCase() === 'DESC' ? keyB - keyA : keyA - keyB;
        });

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: sortedCustomers.length,
            pagingRange: 5,
        });

        const list = sortedCustomers.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                customers: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCustomersGraph = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required!');

        const startDateTime = moment(startDate).startOf('day').toDate();
        const endDateTime = moment(endDate).endOf('day').toDate();

        const findOrders = await Order.find({
            orderStatus: 'delivered',
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        })
            .select('user deliveredAt')
            .populate([
                { path: 'user', select: 'orderCompleted repeatedOrderAt' },
            ]);

        const dates = getDatesInRange(new Date(startDate), new Date(endDate));
        const info = [];
        for (const date of dates) {
            const startDateTime = moment(date).startOf('day').toDate();
            const endDateTime = moment(date).endOf('day').toDate();

            const orders = findOrders.filter(
                order =>
                    order.deliveredAt >= startDateTime &&
                    order.deliveredAt <= endDateTime
            );

            const activeCustomersId = [];
            const newCustomersId = [];
            for (const order of orders) {
                if (!activeCustomersId.includes(order.user._id.toString())) {
                    activeCustomersId.push(order.user._id.toString());
                }

                if (
                    (order.user.orderCompleted === 1 ||
                        order.user.repeatedOrderAt > endDateTime) &&
                    !newCustomersId.includes(order.user._id.toString())
                ) {
                    newCustomersId.push(order.user._id.toString());
                }
            }

            const activeCustomers = activeCustomersId.length;
            const newCustomers = newCustomersId.length;
            const repeatedCustomers = activeCustomers - newCustomers;

            info.push({
                activeCustomers,
                newCustomers,
                repeatedCustomers,
                date,
            });
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                info,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getLiveDashboard = async (req, res) => {
    try {
        const { zoneId } = req.query;

        let orderConfig = {
            orderStatus: { $nin: ['delivered', 'cancelled'] },
        };
        let shopConfig = {
            shopStatus: 'active',
            deletedAt: null,
            parentShop: null,
        };
        let userConfig = {
            status: 'active',
            deletedAt: null,
        };

        if (zoneId) {
            const zone = await ZoneModel.findById(zoneId)
                .select('zoneGeometry')
                .lean();

            if (!zone) return errorResponse(res, 'Zone not found');

            orderConfig.location = {
                $geoWithin: { $geometry: zone.zoneGeometry },
            };
            shopConfig.shopZone = zoneId;
            userConfig.location = {
                $geoWithin: { $geometry: zone.zoneGeometry },
            };
        }

        const [
            orderSummary,
            // shopSummary,
            shops,
            totalUsers,
            ticketSummary,
            availableOperationManagementAgents,
        ] = await Promise.all([
            Order.aggregate([
                { $match: orderConfig },
                {
                    $group: {
                        _id: null,
                        placedOrders: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$orderStatus', 'placed'] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        acceptedByRiderOrders: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$orderStatus',
                                            'accepted_delivery_boy',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        beingPreparedOrders: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$orderStatus', 'preparing'] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        readyForPickupOrders: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$orderStatus',
                                            'ready_to_pickup',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        orderOnTheWayOrders: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$orderStatus',
                                            'order_on_the_way',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        latedOrders: {
                            $sum: { $cond: ['$isOrderLate', 1, 0] },
                        },
                        notAcceptedByShopOrders: {
                            $sum: {
                                $cond: [
                                    {
                                        $in: [
                                            '$orderStatus',
                                            ['placed', 'accepted_delivery_boy'],
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        noRiderAssignedOrders: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$orderFor', 'global'] },
                                            {
                                                $in: [
                                                    '$orderStatus',
                                                    ['placed', 'preparing'],
                                                ],
                                            },
                                            {
                                                $eq: [
                                                    {
                                                        $ifNull: [
                                                            '$deliveryBoy',
                                                            null,
                                                        ],
                                                    },
                                                    null,
                                                ],
                                            },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]).then(
                results =>
                    results[0] || {
                        placedOrders: 0,
                        acceptedByRiderOrders: 0,
                        beingPreparedOrders: 0,
                        readyForPickupOrders: 0,
                        orderOnTheWayOrders: 0,
                        latedOrders: 0,
                        notAcceptedByShopOrders: 0,
                        noRiderAssignedOrders: 0,
                    }
            ),

            // Shop.aggregate([
            //     { $match: shopConfig },
            //     {
            //         $group: {
            //             _id: null,
            //             totalShops: { $sum: 1 },
            //             numOfOnlineShops: {
            //                 $sum: {
            //                     $cond: [
            //                         { $eq: ['$liveStatus', 'online'] },
            //                         1,
            //                         0,
            //                     ],
            //                 },
            //             },
            //             numOfBusyShops: {
            //                 $sum: {
            //                     $cond: [{ $eq: ['$liveStatus', 'busy'] }, 1, 0],
            //                 },
            //             },
            //         },
            //     },
            //     {
            //         $project: {
            //             _id: 0,
            //             totalShops: 1,
            //             numOfOnlineShops: 1,
            //             numOfBusyShops: 1,
            //         },
            //     },
            // ]).then(
            //     results =>
            //         results[0] || {
            //             totalShops: 0,
            //             numOfOnlineShops: 0,
            //             numOfBusyShops: 0,
            //         }
            // ),

            Shop.find(shopConfig)
                .select('liveStatus address normalHours holidayHours ')
                .lean(),

            UserModel.countDocuments(userConfig),

            AdminChatRequest.aggregate([
                { $match: { status: { $in: ['accepted', 'pending'] } } },
                {
                    $group: {
                        _id: null,
                        numOfOngoingTickets: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0],
                            },
                        },
                        numOfPendingTickets: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'pending'] }, 1, 0],
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        numOfOngoingTickets: 1,
                        numOfPendingTickets: 1,
                    },
                },
            ]).then(
                results =>
                    results[0] || {
                        numOfOngoingTickets: 0,
                        numOfPendingTickets: 0,
                    }
            ),

            AdminModel.countDocuments({
                status: 'active',
                adminType: 'customerService',
                liveStatus: 'online',
                deletedAt: null,
            }),
        ]);

        const totalShops = shops.length;

        const { numOfOnlineShops, numOfBusyShops } = shops.reduce(
            (acc, shop) => {
                const isShopOpen = checkShopOpeningHours(shop);

                if (isShopOpen) {
                    if (shop.liveStatus === 'online') acc.numOfOnlineShops += 1;
                    if (
                        shop.liveStatus === 'busy' ||
                        shop.liveStatus === 'offline'
                    )
                        acc.numOfBusyShops += 1;
                }

                return acc;
            },
            { numOfOnlineShops: 0, numOfBusyShops: 0 }
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                ...orderSummary,
                // ...shopSummary,
                totalShops,
                numOfOnlineShops,
                numOfBusyShops,
                totalUsers,
                ...ticketSummary,
                availableOperationManagementAgents,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getStatisticsDashboard = async (req, res) => {
//     try {
//         const { startDate, endDate, zoneId } = req.query;

//         if (!startDate || !endDate)
//             return errorResponse(res, 'startDate and endDate are required!');

//         let orderConfig = {
//             $or: [
//                 {
//                     orderStatus: { $in: ['delivered', 'cancelled'] },
//                 },
//                 {
//                     isOrderLate: true,
//                 },
//             ],
//         };

//         if (zoneId) {
//             const zone = await ZoneModel.findById(zoneId)
//                 .select('zoneGeometry')
//                 .lean();

//             if (!zone) return errorResponse(res, 'Zone not found');

//             orderConfig.location = {
//                 $geoWithin: { $geometry: zone.zoneGeometry },
//             };
//         }

//         const { startDateTime, endDateTime, oldStartDate, oldEndDate } =
//             formatDate(startDate, endDate);

//         const findOrders = await Order.find({
//             ...orderConfig,
//             order_placedAt: {
//                 $gte: oldStartDate,
//                 $lte: endDateTime,
//             },
//         }).select('orderStatus orderCancel isOrderLate order_placedAt');

//         let totalOrders = 0;
//         let totalLateOrders = 0;
//         let oldLateOrders = 0;
//         let canceledOrdersByUser = 0;
//         let canceledOrdersByAdmin = 0;
//         let canceledReasonLyxaLate = 0;
//         let canceledReasonRestaurantLate = 0;
//         let canceledReasonUserNotThere = 0;
//         let canceledReasonOthers = 0;

//         findOrders.forEach(order => {
//             if (
//                 order.order_placedAt >= startDateTime &&
//                 order.order_placedAt <= endDateTime
//             ) {
//                 if (order.orderStatus === 'delivered') {
//                     totalOrders += 1;
//                 } else if (order.orderStatus === 'cancelled') {
//                     if (order.orderCancel?.canceledBy === 'user') {
//                         canceledOrdersByUser += 1;
//                     } else if (order.orderCancel?.canceledBy === 'admin') {
//                         canceledOrdersByAdmin += 1;

//                         if (order.orderCancel?.otherReason === 'lyxa late') {
//                             canceledReasonLyxaLate += 1;
//                         } else if (
//                             order.orderCancel?.otherReason === 'restaurent late'
//                         ) {
//                             canceledReasonRestaurantLate += 1;
//                         } else if (
//                             order.orderCancel?.otherReason === 'user not there'
//                         ) {
//                             canceledReasonUserNotThere += 1;
//                         } else {
//                             canceledReasonOthers += 1;
//                         }
//                     }
//                 }

//                 if (order.isOrderLate) {
//                     totalLateOrders += 1;
//                 }
//             } else {
//                 if (order.isOrderLate) {
//                     oldLateOrders += 1;
//                 }
//             }
//         });

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 totalOrders,
//                 totalLateOrders,
//                 canceledOrdersByUser,
//                 canceledOrdersByAdmin,
//                 canceledReasonLyxaLate,
//                 canceledReasonRestaurantLate,
//                 canceledReasonUserNotThere,
//                 canceledReasonOthers,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getStatisticsDashboard = async (req, res) => {
    try {
        const { startDate, endDate, zoneId } = req.query;

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required!');

        let orderConfig = {
            $or: [
                {
                    orderStatus: { $in: ['delivered', 'cancelled'] },
                },
                {
                    isOrderLate: true,
                },
            ],
        };

        if (zoneId) {
            const zone = await ZoneModel.findById(zoneId)
                .select('zoneGeometry')
                .lean();

            if (!zone) return errorResponse(res, 'Zone not found');

            orderConfig.location = {
                $geoWithin: { $geometry: zone.zoneGeometry },
            };
        }

        const { startDateTime, endDateTime, oldStartDate, oldEndDate } =
            formatDate(startDate, endDate);

        const orderSummaryQ = await Order.aggregate([
            {
                $match: {
                    ...orderConfig,
                    order_placedAt: { $gte: oldStartDate, $lte: endDateTime },
                },
            },
            {
                $facet: {
                    recentOrders: [
                        {
                            $match: {
                                order_placedAt: {
                                    $gte: startDateTime,
                                    $lte: endDateTime,
                                },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                totalOrders: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $eq: [
                                                    '$orderStatus',
                                                    'delivered',
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                totalLateOrders: {
                                    $sum: { $cond: ['$isOrderLate', 1, 0] },
                                },
                                canceledOrdersByUser: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            '$orderStatus',
                                                            'cancelled',
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$orderCancel.canceledBy',
                                                            'user',
                                                        ],
                                                    },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                canceledOrdersByAdmin: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            '$orderStatus',
                                                            'cancelled',
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$orderCancel.canceledBy',
                                                            'admin',
                                                        ],
                                                    },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                canceledReasonLyxaLate: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            '$orderStatus',
                                                            'cancelled',
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$orderCancel.canceledBy',
                                                            'admin',
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$orderCancel.otherReason',
                                                            'lyxa late',
                                                        ],
                                                    },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                canceledReasonRestaurantLate: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            '$orderStatus',
                                                            'cancelled',
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$orderCancel.canceledBy',
                                                            'admin',
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$orderCancel.otherReason',
                                                            'restaurent late',
                                                        ],
                                                    },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                canceledReasonUserNotThere: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            '$orderStatus',
                                                            'cancelled',
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$orderCancel.canceledBy',
                                                            'admin',
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$orderCancel.otherReason',
                                                            'user not there',
                                                        ],
                                                    },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                                canceledReasonOthers: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $eq: [
                                                            '$orderStatus',
                                                            'cancelled',
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            '$orderCancel.canceledBy',
                                                            'admin',
                                                        ],
                                                    },
                                                    {
                                                        $not: [
                                                            {
                                                                $in: [
                                                                    '$orderCancel.otherReason',
                                                                    [
                                                                        'lyxa late',
                                                                        'restaurent late',
                                                                        'user not there',
                                                                    ],
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            1,
                                            0,
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                    oldOrders: [
                        { $match: { order_placedAt: { $lt: startDateTime } } },
                        {
                            $group: {
                                _id: null,
                                oldLateOrders: {
                                    $sum: { $cond: ['$isOrderLate', 1, 0] },
                                },
                            },
                        },
                    ],
                },
            },
        ]);

        const {
            totalOrders = 0,
            totalLateOrders = 0,
            canceledOrdersByUser = 0,
            canceledOrdersByAdmin = 0,
            canceledReasonLyxaLate = 0,
            canceledReasonRestaurantLate = 0,
            canceledReasonUserNotThere = 0,
            canceledReasonOthers = 0,
        } = orderSummaryQ[0].recentOrders[0] || {};
        const { oldLateOrders = 0 } = orderSummaryQ[0].oldOrders[0] || {};

        const lateOrdersIncrease =
            oldLateOrders === 0
                ? 0
                : ((totalLateOrders - oldLateOrders) / oldLateOrders || 0) *
                  100;

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                totalOrders,
                totalLateOrders,
                canceledOrdersByUser,
                canceledOrdersByAdmin,
                canceledReasonLyxaLate,
                canceledReasonRestaurantLate,
                canceledReasonUserNotThere,
                canceledReasonOthers,
                lateOrdersIncrease,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
