const {
    successResponse,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const Seller = require('../models/SellerModel');
const Order = require('../models/OrderModel');
const Butler = require('../models/ButlerModel');
const ObjectId = require('mongoose').Types.ObjectId;
const Transection = require('../models/TransactionModel');
const Shop = require('../models/ShopModel');
const DeliveryBoy = require('../models/DeliveryBoyModel');
const moment = require('moment');
const short = require('short-uuid');
const AdminModel = require('../models/AdminModel');
// const {
//     getTotalDeliveryFeeWithOwnDeliveryBoy,
// } = require('../helpers/BalanceQuery');
const {
    getTotalDeliveryFee,
    getDeliveryManUnSettleAmount,
} = require('./DashBoradController');
const { shopAvgDeliveryTime } = require('../helpers/shopAvgDeliveryTme');
const {
    getDeliveryBoyActiveTime,
    getSummeryString,
} = require('./DeliveryBoyController');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const PayoutModel = require('../models/PayoutModel');
const ShopDowntimeModel = require('../models/ShopDowntimeModel');
const { findZone } = require('./ZoneController');
const {
    getOrderStatistics,
    getFeaturedAmount,
    getTotalRefundAmount,
    getShopUnSettleAmount,
    getShopEarning,
    getRiderCashInHand,
    getRiderActualCashInHand,
} = require('./FinancialController');
const {
    sendNotificationsForAddRemoveCredit,
} = require('./NotificationController');
const AppSetting = require('../models/AppSetting');
const {
    getDropBalance,
    getAdminWalletBalance,
} = require('../helpers/BalanceQuery');
const { formatDate } = require('../helpers/getDatesInRange');

exports.getSeller = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 20,
            searchKey,
            sortBy = 'desc',
            pagingRange = 5,
            startDate,
            endDate,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            parentSeller: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const nationalIdSearchQuery = newQuery.map(str => ({
                national_id: RegExp(str, 'i'),
            }));

            const emailSearchQuery = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            const company_nameSearchQuery = newQuery.map(str => ({
                company_name: RegExp(str, 'i'),
            }));

            const phone_numberSearchQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: nationalIdSearchQuery },
                            { $and: emailSearchQuery },
                            { $and: company_nameSearchQuery },
                            { $and: phone_numberSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: Seller,
            condition: whereConfig,
            pagingRange,
        });

        const list = await Seller.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select('-password');

        const newList = [];

        for (const seller of list) {
            let countConfig = {
                seller: seller._id,
                orderStatus: 'delivered',
            };

            if (startDate) {
                const startDateTime = moment(new Date(startDate))
                    .startOf('day')
                    .toDate();
                const endDateTime = moment(
                    endDate ? new Date(endDate) : new Date()
                )
                    .endOf('day')
                    .toDate();

                countConfig = {
                    ...countConfig,
                    deliveredAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                };
            }

            const totalOrder = await Order.count(countConfig);

            let totalValueConfig = {
                seller: ObjectId(seller._id),
            };

            if (startDate) {
                const startDateTime = moment(new Date(startDate))
                    .startOf('day')
                    .toDate();
                const endDateTime = moment(
                    endDate ? new Date(endDate) : new Date()
                )
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
                    $match: { ...totalValueConfig, orderStatus: 'delivered' },
                },
                {
                    $group: {
                        _id: '',
                        count: { $sum: 1 },
                        productAmount: {
                            $sum: {
                                $sum: ['$summary.baseCurrency_productAmount'],
                            },
                        },
                        totalDiscount: {
                            $sum: { $sum: ['$summary.baseCurrency_discount'] },
                        },
                        totalRewardAmount: {
                            $sum: {
                                $sum: ['$summary.reward.baseCurrency_amount'],
                            },
                        },
                        totalAmount: {
                            $sum: {
                                $sum: ['$summary.baseCurrency_totalAmount'],
                            },
                        },
                        // Points cashback, shop get back loyalty amount
                        pointsCashback: {
                            $sum: {
                                $sum: ['$baseCurrency_rewardRedeemCashback'],
                            },
                        },
                        totalVat: {
                            $sum: {
                                $sum: ['$vatAmount.baseCurrency_vatForShop'],
                            },
                        },
                    },
                },
            ]);

            const totalDeliveryFee = await Order.aggregate([
                {
                    $match: {
                        ...totalValueConfig,
                        orderFor: 'global',
                        orderStatus: 'delivered',
                    },
                },
                {
                    $group: {
                        _id: '',
                        count: { $sum: 1 },
                        deliveryFee: {
                            $sum: {
                                $sum: [
                                    '$summary.baseCurrency_riderFeeWithFreeDelivery',
                                ],
                            },
                        },
                    },
                },
            ]);

            const totalDropGetFunc = await getAdminEarning(
                'seller',
                seller._id,
                startDate,
                endDate
            );
            const totalDropGet = totalDropGetFunc.totalAdminGet;

            const totalSellerEarningFunc = await getShopEarning({
                type: 'seller',
                id: seller._id,
                startDate,
                endDate,
            });
            const totalSellerEarning =
                totalValue.length < 1
                    ? 0
                    : totalSellerEarningFunc.totalShopEarning;

            const totalSellerUnsettle = await getShopUnSettleAmount({
                type: 'seller',
                id: seller._id,
                startDate,
                endDate,
            });

            const toalShopProfile = totalSellerUnsettle + totalSellerEarning;

            if (totalValue.length < 1) {
                totalValue.push({
                    productAmount: 0,
                    totalDiscount: 0,
                    totalRewardAmount: 0,
                    totalAmount: 0,
                    pointsCashback: 0,
                    totalVat: 0,
                });
            }
            if (totalDeliveryFee.length < 1) {
                totalDeliveryFee.push({
                    deliveryFee: 0,
                });
            }

            const summary = {
                totalOrder,
                totalDropGet,
                totalSellerEarning,
                totalSellerUnsettle: totalSellerUnsettle,
                toalShopProfile,
                orderValue:
                    {
                        ...totalValue[0],
                        deliveryFee: totalDeliveryFee[0].deliveryFee,
                    } || null,
            };

            newList.push({
                summary,
                ...seller._doc,
            });
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                sellers: newList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleSellerDashBoard = async (req, res) => {
    try {
        const { startDate, endDate, sellerId } = req.query;

        const seller = await Seller.findById(sellerId);
        if (!seller) {
            return errorResponse(res, {
                message: 'Seller not found',
            });
        }

        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const totalDropGetFunc = await getAdminEarning(
            'seller',
            seller._id,
            startDate,
            endDate
        );
        const totalDropGet = totalDropGetFunc.totalAdminGet;

        const totalSellerEarningFunc = await getShopEarning({
            type: 'seller',
            id: seller._id,
        });
        const totalSellerEarning = totalSellerEarningFunc.totalShopEarning;

        const totalSellerEarningByDateFunc = await getShopEarning({
            type: 'seller',
            id: seller._id,
            startDate,
            endDate,
        });
        const totalSellerEarningByDate =
            totalSellerEarningByDateFunc.totalShopEarning;

        const totalSellerEarningByOldDateFunc = await getShopEarning({
            type: 'seller',
            id: seller._id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });
        const totalSellerEarningByOldDate =
            totalSellerEarningByOldDateFunc.totalShopEarning;

        const totalSellerUnsettleFunc = await getShopUnSettleAmount({
            type: 'seller',
            id: seller._id,
        });
        const totalSellerUnsettle = totalSellerUnsettleFunc.totalSellerUnsettle;
        const totalSellerUnsettleByDateFunc = await getShopUnSettleAmount({
            type: 'seller',
            id: seller._id,
            startDate,
            endDate,
        });
        const totalSellerUnsettleByDate =
            totalSellerUnsettleByDateFunc.totalSellerUnsettle;
        const totalSellerUnsettleByOldDateFunc = await getShopUnSettleAmount({
            type: 'seller',
            id: seller._id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });
        const totalSellerUnsettleByOldDate =
            totalSellerUnsettleByOldDateFunc.totalSellerUnsettle;

        const totalSellerProfit = totalSellerUnsettle + totalSellerEarning;
        const totalSellerProfitByDate =
            totalSellerUnsettleByDate + totalSellerEarningByDate;
        const totalSellerProfitByOldDate =
            totalSellerUnsettleByOldDate + totalSellerEarningByOldDate;

        const totalSellerProfitByDateAvg =
            (totalSellerProfitByDate / totalSellerProfit) * 100;
        const totalSellerProfitByOldDateAvg =
            (totalSellerProfitByOldDate / totalSellerProfit) * 100;
        const totalSellerProfitAvgInPercentage =
            totalSellerProfitByDateAvg - totalSellerProfitByOldDateAvg;

        const orderStatistics = await getOrderStatistics({
            type: 'seller',
            id: seller._id,
        });
        const orderStatisticsByDate = await getOrderStatistics({
            type: 'seller',
            id: seller._id,
            startDate,
            endDate,
        });
        const orderStatisticsByOldDate = await getOrderStatistics({
            type: 'seller',
            id: seller._id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });

        const totalExpectedOrder = orderStatistics.totalExpectedOrder;
        const totalExpectedOrderByDate =
            orderStatisticsByDate.totalExpectedOrder;
        const totalExpectedOrderByOldDate =
            orderStatisticsByOldDate.totalExpectedOrder;
        const totalExpectedOrderByDateAvg =
            (totalExpectedOrderByDate / totalExpectedOrder) * 100;
        const totalExpectedOrderByOldDateAvg =
            (totalExpectedOrderByOldDate / totalExpectedOrder) * 100;
        const totalExpectedOrderAvgInPercentage =
            totalExpectedOrderByDateAvg - totalExpectedOrderByOldDateAvg;

        const productAmountCash = await getProductAmount(
            'seller',
            'cash',
            seller._id,
            startDate,
            endDate
        );

        const productAmountOnline = await getProductAmount(
            'seller',
            'online',
            seller._id,
            startDate,
            endDate
        );

        const doubleMenuItemPriceCash = await getDoubleDealItemPrice(
            'seller',
            'cash',
            seller._id,
            startDate,
            endDate
        );

        const doubleMenuItemPriceOnline = await getDoubleDealItemPrice(
            'seller',
            'online',
            seller._id,
            startDate,
            endDate
        );

        const totalDeliveryFee = await getTotalDeliveryFee(
            'seller',
            sellerId,
            startDate,
            endDate
        );

        const deliveryFeeCash = await getTotalDeliveryFee(
            'seller',
            sellerId,
            startDate,
            endDate,
            'cash'
        );

        const deliveryFeeOnline = await getTotalDeliveryFee(
            'seller',
            sellerId,
            startDate,
            endDate,
            'online'
        );
        const riderTipOnline = await getTotalRiderTip(
            'seller',
            sellerId,
            startDate,
            endDate
        );

        // Free Delivery Shop Cut
        const freeDeliveryShopCut = await getFreeDeliveryShopCut(
            'seller',
            sellerId
        );
        const freeDeliveryShopCutByDate = await getFreeDeliveryShopCut(
            'seller',
            sellerId,
            startDate,
            endDate
        );
        const freeDeliveryShopCutByOldDate = await getFreeDeliveryShopCut(
            'seller',
            sellerId,
            oldStartDate,
            oldEndDate
        );
        // Free Delivery Drop Cut
        const freeDeliveryDropCut = await getFreeDeliveryDropCut(
            'seller',
            sellerId
        );
        const freeDeliveryDropCutByDate = await getFreeDeliveryDropCut(
            'seller',
            sellerId,
            startDate,
            endDate
        );
        const freeDeliveryDropCutByOldDate = await getFreeDeliveryDropCut(
            'seller',
            sellerId,
            oldStartDate,
            oldEndDate
        );

        // Featured amount
        const { featuredAmount: totalFeaturedAmount } = await getFeaturedAmount(
            {
                type: 'seller',
                id: sellerId,
            }
        );

        const { featuredAmount: totalFeaturedAmountByDate } =
            await getFeaturedAmount({
                type: 'seller',
                id: sellerId,
                startDate,
                endDate,
            });

        const { featuredAmount: totalFeaturedAmountByOldDate } =
            await getFeaturedAmount({
                type: 'seller',
                id: sellerId,
                startDate: oldStartDate,
                endDate: oldEndDate,
            });

        // Marketing Spent
        const totalMarketingSpent =
            orderStatistics.totalValue.totalDiscount +
            orderStatistics.totalValue.totalRewardAmount +
            orderStatistics.totalValue.totalDoubleMenuItemPrice +
            freeDeliveryShopCut +
            freeDeliveryDropCut +
            totalFeaturedAmount;
        const totalMarketingSpentByDate =
            orderStatisticsByDate.totalValue.totalDiscount +
            orderStatisticsByDate.totalValue.totalRewardAmount +
            orderStatisticsByDate.totalValue.totalDoubleMenuItemPrice +
            freeDeliveryShopCutByDate +
            freeDeliveryDropCutByDate +
            totalFeaturedAmountByDate;
        const totalMarketingSpentByOldDate =
            orderStatisticsByOldDate.totalValue.totalDiscount +
            orderStatisticsByOldDate.totalValue.totalRewardAmount +
            orderStatisticsByOldDate.totalValue.totalDoubleMenuItemPrice +
            freeDeliveryShopCutByOldDate +
            freeDeliveryDropCutByOldDate +
            totalFeaturedAmountByOldDate;

        const totalMarketingSpentByDateAvg =
            (totalMarketingSpentByDate / totalMarketingSpent) * 100;
        const totalMarketingSpentByOldDateAvg =
            (totalMarketingSpentByOldDate / totalMarketingSpent) * 100;
        const totalMarketingSpentAvgInPercentage =
            totalMarketingSpentByDateAvg - totalMarketingSpentByOldDateAvg;

        const { refundAmount: totalRefundAmount } = await getTotalRefundAmount({
            type: 'seller',
            id: sellerId,
            startDate,
            endDate,
            account: 'shop',
        });

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                summary: {
                    totalDropGet,
                    totalEarning: totalSellerEarningByDate,
                    totalUnsettle: totalSellerUnsettleByDate,
                    totalProfit: totalSellerProfitByDate,
                    totalProfitAvgInPercentage:
                        totalSellerProfitAvgInPercentage,
                    totalExpectedOrder: totalExpectedOrderByDate,
                    totalExpectedOrderAvgInPercentage,
                    totalDeliveredOrder:
                        orderStatisticsByDate.totalDeliveredOrder,
                    totalCanceledOrder:
                        orderStatisticsByDate.totalCanceledOrder,
                    totalShopCanceledOrder:
                        orderStatisticsByDate.totalShopCanceledOrder,
                    totalShopRejectedOrder:
                        orderStatisticsByDate.totalShopRejectedOrder,
                    totalShopNotAcceptedOrder:
                        orderStatisticsByDate.totalShopNotAcceptedOrder,
                    orderValue:
                        {
                            ...orderStatisticsByDate.totalValue,
                            productAmountCash: productAmountCash,
                            productAmountOnline: productAmountOnline,
                            deliveryFee: totalDeliveryFee,
                            deliveryFeeCash: deliveryFeeCash,
                            deliveryFeeOnline: deliveryFeeOnline,
                            riderTipOnline: riderTipOnline,
                            doubleMenuItemPriceCash,
                            doubleMenuItemPriceOnline,
                        } || null,
                    freeDeliveryShopCut: freeDeliveryShopCutByDate,
                    freeDeliveryDropCut: freeDeliveryDropCutByDate,
                    freeDeliveryCut:
                        freeDeliveryDropCutByDate + freeDeliveryShopCutByDate,
                    totalFeaturedAmount: totalFeaturedAmountByDate,
                    totalMarketingSpentAvgInPercentage,
                    totalRefundAmount,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
// exports.getSingleSellerDashBoard = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         const sellerId = req.sellerId;
//         const seller = await Seller.findById(sellerId);

//         let countConfig = {
//             seller: seller._id,

//             orderStatus: {
//                 $nin: ['cancelled', 'placed', 'refused', 'schedule'],
//             },
//             $or: [
//                 { orderStatus: 'delivered' },
//                 { paymentMethod: { $ne: 'cash' } },
//             ],
//         };

//         if (startDate) {
//             countConfig = {
//                 ...countConfig,
//                 createdAt: {
//                     $gte: new Date(startDate),
//                     $lt: new Date(
//                         moment(endDate ? new Date(endDate) : new Date()).add(
//                             1,
//                             'days'
//                         )
//                     ),
//                 },
//             };
//         }

//         const totalOrder = await Order.count(countConfig);

//         let totalValueConfig = {
//             seller: ObjectId(seller._id),

//             orderStatus: {
//                 $nin: ['cancelled', 'refused', 'schedule'],
//             },
//         };

//         if (startDate) {
//             totalValueConfig = {
//                 ...totalValueConfig,
//                 createdAt: {
//                     $gte: new Date(startDate),
//                     $lt: new Date(
//                         moment(endDate ? new Date(endDate) : new Date()).add(
//                             1,
//                             'days'
//                         )
//                     ),
//                 },
//             };
//         }

//         const totalValue = await Order.aggregate([
//             {
//                 $match: totalValueConfig,
//             },
//             {
//                 $match: {
//                     $or: [
//                         { orderStatus: 'delivered' },
//                         { paymentMethod: { $ne: 'cash' } },
//                     ],
//                 },
//             },
//             {
//                 $group: {
//                     _id: '',
//                     count: { $sum: 1 },
//                     productAmount: {
//                         $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
//                     },
//                     totalAmount: {
//                         $sum: { $sum: ['$summary.baseCurrency_totalAmount'] },
//                     },
//                     deliveryFee: {
//                         $sum: { $sum: ['$summary.baseCurrency_riderFee'] },
//                     },
//                 },
//             },
//         ]);

//         if (totalValue.length < 1) {
//             totalValue.push({
//                 productAmount: 0,
//                 totalAmount: 0,
//                 deliveryFee: 0,
//             });
//         }

//         const totalDropGet = await getDropEarningFromSeller(
//             seller._id,
//             startDate,
//             endDate
//         );

//         const totalSellerEarning = await getSellerEarning(
//             seller._id,
//             startDate,
//             endDate
//         );

//         const totalSellerUnsettle = await getSellerTotalUnSettleAmount(
//             seller._id,
//             startDate,
//             endDate
//         );

//         const toalShopProfile = totalSellerUnsettle + totalSellerEarning;

//         const summary = {
//             totalOrder,
//             totalDropGet,
//             totalSellerEarning,
//             totalSellerUnsettle: totalSellerUnsettle,
//             toalShopProfile,
//             orderValue: totalValue[0] || null,
//         };

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 summary,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };

exports.getSingleSellerShopList = async (req, res) => {
    try {
        const {
            sellerId,
            shopStatus,
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
            searchKey,
            startDate,
            endDate,
        } = req.query;

        const seller = await Seller.findById(sellerId);
        if (!seller) {
            return errorResponse(res, {
                message: 'Seller not found',
            });
        }

        let whereConfig = {
            seller: sellerId,
            deletedAt: null,
            parentShop: null,
        };

        if (
            shopStatus &&
            ['active', 'inactive', 'blocked'].includes(shopStatus)
        ) {
            whereConfig = {
                shopStatus: shopStatus,
                ...whereConfig,
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));

            const phone_numberQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: phone_numberQuery },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        if (startDate) {
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

        let paginate = await pagination({
            page,
            pageSize,
            model: Shop,
            condition: whereConfig,
            pagingRange: pagingRange,
        });

        const list = await Shop.find(whereConfig)
            .sort({ totalOrder: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('shopZone cuisineType');

        const shopList = [];
        for (const shop of list) {
            // const avgOrderDeliveryTime = await shopAvgDeliveryTime(shop._id);

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

            const totalProfit = totalShopUnsettle + totalShopEarning;

            // shop._doc.avgOrderDeliveryTime = avgOrderDeliveryTime;
            shop._doc.totalProfit = totalProfit;

            // Finding account manager
            const accountManager = await AdminModel.findOne({
                sellers: { $in: [shop.seller] },
                adminType: 'accountManager',
            });
            shop._doc.accountManager = accountManager;

            // Check Shop Opening time
            const isShopOpen = checkShopOpeningHours(shop);
            shop._doc.isShopOpen = isShopOpen;

            // Finding shop zone
            // const zone = await findZone(
            //     shop.location.coordinates[1],
            //     shop.location.coordinates[0]
            // );
            // shop._doc.shopZone = zone;

            shopList.push(shop);
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shopList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShops = async (req, res) => {
    try {
        const { sellerId, startDate, endDate } = req.query;
        // get all shops from seller
        const list = await Shop.find({
            seller: sellerId,
        }).select(
            '-password -credentials -reviews -flags -tags -tagsId -products'
        );

        const newList = [];

        for (const shop of list) {
            let countConfig = {
                shop: shop._id,
                orderStatus: 'delivered',
            };

            if (startDate) {
                const startDateTime = moment(new Date(startDate))
                    .startOf('day')
                    .toDate();
                const endDateTime = moment(
                    endDate ? new Date(endDate) : new Date()
                )
                    .endOf('day')
                    .toDate();

                countConfig = {
                    ...countConfig,
                    deliveredAt: {
                        $gte: startDateTime,
                        $lte: endDateTime,
                    },
                };
            }

            const totalOrder = await Order.count(countConfig);

            let totalValueConfig = {
                shop: ObjectId(shop._id),
            };

            if (startDate) {
                const startDateTime = moment(new Date(startDate))
                    .startOf('day')
                    .toDate();
                const endDateTime = moment(
                    endDate ? new Date(endDate) : new Date()
                )
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
                    $match: { ...totalValueConfig, orderStatus: 'delivered' },
                },

                {
                    $group: {
                        _id: '',
                        count: { $sum: 1 },
                        productAmount: {
                            $sum: {
                                $sum: ['$summary.baseCurrency_productAmount'],
                            },
                        },
                        totalDiscount: {
                            $sum: { $sum: ['$summary.baseCurrency_discount'] },
                        },
                        totalRewardAmount: {
                            $sum: {
                                $sum: ['$summary.reward.baseCurrency_amount'],
                            },
                        },
                        totalAmount: {
                            $sum: {
                                $sum: ['$summary.baseCurrency_totalAmount'],
                            },
                        },
                        // Points cashback, shop get back loyalty amount adminCut
                        pointsCashback: {
                            $sum: {
                                $sum: ['$baseCurrency_rewardRedeemCashback'],
                            },
                        },
                        totalVat: {
                            $sum: {
                                $sum: ['$vatAmount.baseCurrency_vatForShop'],
                            },
                        },
                    },
                },
            ]);

            const totalDeliveryFee = await Order.aggregate([
                {
                    $match: {
                        ...totalValueConfig,
                        orderFor: 'global',
                        orderStatus: 'delivered',
                    },
                },

                {
                    $group: {
                        _id: '',
                        count: { $sum: 1 },
                        deliveryFee: {
                            $sum: {
                                $sum: [
                                    '$summary.baseCurrency_riderFeeWithFreeDelivery',
                                ],
                            },
                        },
                    },
                },
            ]);

            const totalDropGetFunc = await getAdminEarning(
                'shop',
                shop._id,
                startDate,
                endDate
            );
            const totalDropGet = totalDropGetFunc.totalAdminGet;

            const totalShopEarningFunc = await getShopEarning({
                type: 'shop',
                id: shop._id,
                startDate,
                endDate,
            });
            const totalShopEarning =
                totalValue.length < 1
                    ? 0
                    : totalShopEarningFunc.totalShopEarning;

            const totalSellerUnsettleFunc = await getShopUnSettleAmount({
                type: 'shop',
                id: shop._id,
                startDate,
                endDate,
            });
            const totalSellerUnsettle =
                totalSellerUnsettleFunc.totalSellerUnsettle;

            const toalShopProfile = totalSellerUnsettle + totalShopEarning;

            if (totalValue.length < 1) {
                totalValue.push({
                    productAmount: 0,
                    totalDiscount: 0,
                    totalRewardAmount: 0,
                    totalAmount: 0,
                    pointsCashback: 0,
                    totalVat: 0,
                });
            }
            if (totalDeliveryFee.length < 1) {
                totalDeliveryFee.push({
                    deliveryFee: 0,
                });
            }

            const summary = {
                totalOrder,
                totalDropGet,
                totalShopEarning,
                totalShopUnsettle: totalSellerUnsettle,
                toalShopProfile,
                orderValue:
                    {
                        ...totalValue[0],
                        deliveryFee: totalDeliveryFee[0].deliveryFee,
                    } || null,
            };

            newList.push({
                summary,
                ...shop._doc,
            });
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: newList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleShop = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            shopId,
            tnxFilter,
        } = req.body;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return errorResponse(res, {
                message: 'Shop not found',
            });
        }

        // tnxFilter
        const {
            adminBy,
            type = [
                'adminAddBalanceShop',
                'adminRemoveBalanceShop',
                'adminSettlebalanceShop',
            ],
            searchKey,
            amountBy = 'desc',
            amountRange,
            amountRangeType,
            startDate,
            endDate,
        } = tnxFilter;

        const totalAdminGetFunc = await getAdminEarning(
            'shop',
            shop._id,
            startDate,
            endDate
        );
        const totalAdminGet = totalAdminGetFunc.totalAdminGet;
        const secondaryCurrency_totalAdminGet =
            totalAdminGetFunc.secondaryCurrency_totalAdminGet;

        const baseCurrency_adminGetFunc = await getAdminEarning(
            'shop',
            shop._id,
            startDate,
            endDate,
            'baseCurrency'
        );
        const baseCurrency_adminGet = baseCurrency_adminGetFunc.totalAdminGet;
        const secondaryCurrency_adminGetFunc = await getAdminEarning(
            'shop',
            shop._id,
            startDate,
            endDate,
            'secondaryCurrency'
        );
        const secondaryCurrency_adminGet =
            secondaryCurrency_adminGetFunc.secondaryCurrency_totalAdminGet;

        const totalShopEarningFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
        });
        const totalShopEarning = totalShopEarningFunc.totalShopEarning;
        const secondaryCurrency_totalShopEarning =
            totalShopEarningFunc.secondaryCurrency_totalShopEarning;

        const baseCurrency_shopEarningFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
            paidCurrency: 'baseCurrency',
        });
        const baseCurrency_shopEarning =
            baseCurrency_shopEarningFunc.totalShopEarning;
        const secondaryCurrency_shopEarningFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
            paidCurrency: 'secondaryCurrency',
        });
        const secondaryCurrency_shopEarning =
            secondaryCurrency_shopEarningFunc.secondaryCurrency_totalShopEarning;

        const totalShopUnsettleFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
        });
        const totalShopUnsettle = totalShopUnsettleFunc.totalSellerUnsettle;
        const secondaryCurrency_totalShopUnsettle =
            totalShopUnsettleFunc.secondaryCurrency_totalSellerUnsettle;

        const baseCurrency_shopUnsettleFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
            paidCurrency: 'baseCurrency',
        });
        const baseCurrency_shopUnsettle =
            baseCurrency_shopUnsettleFunc.totalSellerUnsettle;

        const secondaryCurrency_shopUnsettleFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
            paidCurrency: 'secondaryCurrency',
        });
        const secondaryCurrency_shopUnsettle =
            secondaryCurrency_shopUnsettleFunc.secondaryCurrency_totalSellerUnsettle;

        const toalShopProfit = totalShopUnsettle + totalShopEarning;
        const secondaryCurrency_toalShopProfit =
            secondaryCurrency_totalShopUnsettle +
            secondaryCurrency_totalShopEarning;
        const baseCurrency_shopProfit =
            baseCurrency_shopUnsettle + baseCurrency_shopEarning;
        const secondaryCurrency_shopProfit =
            secondaryCurrency_shopUnsettle + secondaryCurrency_shopEarning;

        const totalShopDeliveryFee = await getTotalDeliveryFee(
            'shop',
            shop._id,
            startDate,
            endDate
        );

        const orderStatistics = await getOrderStatistics({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
        });
        const totalExpectedOrder = orderStatistics?.totalExpectedOrder;

        const totalProductAmount = orderStatistics?.totalValue?.productAmount;

        let whereConfig = {
            shop: shopId,
            type: {
                $in: type,
            },
        };

        if (amountRange) {
            if (amountRangeType === '>') {
                whereConfig = {
                    ...whereConfig,
                    amount: {
                        $gt: amountRange,
                    },
                };
            } else if (amountRangeType === '<') {
                whereConfig = {
                    ...whereConfig,
                    amount: {
                        $lt: amountRange,
                    },
                };
            } else if (amountRangeType === '=') {
                whereConfig = {
                    ...whereConfig,
                    amount: amountRange,
                };
            }
        }

        if (adminBy) {
            const admins = await AdminModel.findById(adminBy);
            // console.log(admins);
            if (!admins) {
                return errorResponse(
                    res,
                    'admin not found for filter . please give valid admin or empty'
                );
            }
            whereConfig = {
                ...whereConfig,
                adminBy: adminBy,
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const autoTrxIdSearchQuery = newQuery.map(str => ({
                autoTrxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: autoTrxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (startDate) {
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

        let paginate = await pagination({
            page,
            pageSize,
            model: Transection,
            condition: whereConfig,
            pagingRange,
        });

        const list = await Transection.find(whereConfig)
            .sort({ amount: amountBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('adminBy')
            .select('-password');

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                summary: {
                    totalAdminGet,
                    secondaryCurrency_totalAdminGet,
                    baseCurrency_adminGet,
                    secondaryCurrency_adminGet,
                    totalShopEarning,
                    secondaryCurrency_totalShopEarning,
                    baseCurrency_shopEarning,
                    secondaryCurrency_shopEarning,
                    totalShopUnsettle,
                    secondaryCurrency_totalShopUnsettle,
                    baseCurrency_shopUnsettle,
                    secondaryCurrency_shopUnsettle,
                    toalShopProfit,
                    secondaryCurrency_toalShopProfit,
                    baseCurrency_shopProfit,
                    secondaryCurrency_shopProfit,
                    totalShopDeliveryFee,
                    totalExpectedOrder,
                    totalProductAmount,
                    orderValue:
                        {
                            ...orderStatistics.totalValue,
                        } || null,
                },
                shop: {
                    ...shop._doc,
                },
                transections: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// const getOrderStatistics = async (type = 'shop', id, startDate, endDate) => {
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

//     if (startDate) {
//         commonConfig = {
//             ...commonConfig,
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

//     const totalExpectedOrder = await Order.count({
//         ...commonConfig,
//         orderStatus: 'delivered',
//     });
//     const totalDeliveredOrder = await Order.count({
//         ...commonConfig,
//         orderStatus: 'delivered',
//     });
//     const totalCanceledOrder = await Order.count({
//         ...commonConfig,
//         orderStatus: 'cancelled',
//     });
//     const totalShopCanceledOrder = await Order.count({
//         ...commonConfig,
//         orderStatus: 'cancelled',
//         'orderCancel.canceledBy': 'shop',
//         'orderCancel.shopCancelType': 'canceled',
//     });
//     const totalShopRejectedOrder = await Order.count({
//         ...commonConfig,
//         orderStatus: 'cancelled',
//         'orderCancel.canceledBy': 'shop',
//         'orderCancel.shopCancelType': 'rejected',
//     });
//     const totalShopNotAcceptedOrder = await Order.count({
//         ...commonConfig,
//         orderStatus: 'cancelled',
//         'orderCancel.canceledBy': 'automatically',
//         'orderCancel.shopCancelType': 'notAccepted',
//     });

//     const totalValueQuery = await Order.aggregate([
//         {
//             $match: { ...commonConfig, orderStatus: 'delivered' },
//         },

//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 productAmount: {
//                     $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
//                 },
//                 totalDiscount: {
//                     $sum: { $sum: ['$summary.baseCurrency_discount'] },
//                 },
//                 totalShopDiscount: {
//                     $sum: { $sum: ['$discountCut.discountShopCut'] },
//                 },
//                 totalAdminDiscount: {
//                     $sum: { $sum: ['$discountCut.discountAdminCut'] },
//                 },
//                 totalRewardAmount: {
//                     $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
//                 },
//                 totalShopRewardAmount: {
//                     $sum: { $sum: ['$rewardRedeemCut.rewardShopCut'] },
//                 },
//                 totalAdminRewardAmount: {
//                     $sum: { $sum: ['$rewardRedeemCut.rewardAdminCut'] },
//                 },
//                 totalDoubleMenuItemPrice: {
//                     $sum: {
//                         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
//                     },
//                 },
//                 totalShopDoubleMenuItemPrice: {
//                     $sum: {
//                         $sum: ['$doubleMenuItemPrice.doubleMenuItemPriceShop'],
//                     },
//                 },
//                 totalAdminDoubleMenuItemPrice: {
//                     $sum: {
//                         $sum: ['$doubleMenuItemPrice.doubleMenuItemPriceAdmin'],
//                     },
//                 },
//                 totalShopDoubleMenuCut: {
//                     $sum: { $sum: ['$doubleMenuCut.doubleMenuShopCut'] },
//                 },
//                 totalAdminDoubleMenuCut: {
//                     $sum: { $sum: ['$doubleMenuCut.doubleMenuAdminCut'] },
//                 },
//                 totalAmount: {
//                     $sum: { $sum: ['$summary.baseCurrency_totalAmount'] },
//                 },
//                 // Points cashback, shop get back loyalty amount adminCut
//                 pointsCashback: {
//                     $sum: { $sum: ['$baseCurrency_rewardRedeemCashback'] },
//                 },
//                 totalVat: {
//                     $sum: { $sum: ['$vatAmount.baseCurrency_vatForShop'] },
//                 },
//             },
//         },
//     ]);
//     if (totalValueQuery.length < 1) {
//         totalValueQuery.push({
//             productAmount: 0,
//             totalDiscount: 0,
//             totalShopDiscount: 0,
//             totalAdminDiscount: 0,
//             totalRewardAmount: 0,
//             totalShopRewardAmount: 0,
//             totalAdminRewardAmount: 0,
//             totalDoubleMenuItemPrice: 0,
//             totalShopDoubleMenuItemPrice: 0,
//             totalAdminDoubleMenuItemPrice: 0,
//             totalShopDoubleMenuCut: 0,
//             totalAdminDoubleMenuCut: 0,
//             totalAmount: 0,
//             pointsCashback: 0,
//             totalVat: 0,
//         });
//     }

//     return {
//         totalExpectedOrder,
//         totalDeliveredOrder,
//         totalCanceledOrder,
//         totalShopCanceledOrder,
//         totalShopRejectedOrder,
//         totalShopNotAcceptedOrder,
//         totalValue: totalValueQuery[0],
//     };
// };

const getProductAmount = async (
    type = 'shop',
    paymentMethod = 'all',
    id,
    startDate,
    endDate
) => {
    let commonConfig = {};

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }
    if (paymentMethod === 'cash') {
        commonConfig = {
            ...commonConfig,
            paymentMethod: 'cash',
        };
    }
    if (paymentMethod === 'online') {
        commonConfig = {
            ...commonConfig,
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

        commonConfig = {
            ...commonConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const productAmount = await Order.aggregate([
        {
            $match: { ...commonConfig, orderStatus: 'delivered' },
        },

        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                productAmount: {
                    $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                },
            },
        },
    ]);
    if (productAmount.length < 1) {
        productAmount.push({
            productAmount: 0,
        });
    }

    return productAmount[0].productAmount;
};

const getDoubleDealItemPrice = async (
    type = 'shop',
    paymentMethod = 'all',
    id,
    startDate,
    endDate
) => {
    let commonConfig = {};

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }
    if (paymentMethod === 'cash') {
        commonConfig = {
            ...commonConfig,
            paymentMethod: 'cash',
        };
    }
    if (paymentMethod === 'online') {
        commonConfig = {
            ...commonConfig,
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

        commonConfig = {
            ...commonConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const doubleMenuItemPriceQuery = await Order.aggregate([
        {
            $match: { ...commonConfig, orderStatus: 'delivered' },
        },

        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: {
                    $sum: {
                        $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
                    },
                },
            },
        },
    ]);

    if (doubleMenuItemPriceQuery.length < 1) {
        doubleMenuItemPriceQuery.push({
            amount: 0,
        });
    }

    return doubleMenuItemPriceQuery[0].amount;
};

// const getFeaturedAmount = async (type = 'shop', id, startDate, endDate) => {
//     let commonConfig = { account: 'shop', type: 'shopPayForFeatured' };

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

//     if (startDate) {
//         commonConfig = {
//             ...commonConfig,
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

//     const totalFeaturedAmountQuery = await Transection.aggregate([
//         {
//             $match: commonConfig,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     return totalFeaturedAmountQuery.length
//         ? totalFeaturedAmountQuery[0].amount
//         : 0;
// };

const getFreeDeliveryShopCut = async (
    type = 'shop',
    id,
    startDate,
    endDate
) => {
    let commonConfig = { orderStatus: 'delivered' };

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const orders = await Order.find(commonConfig).populate(
        'orderDeliveryCharge'
    );

    const freeDeliveryShopCut = orders.reduce(
        (accumulator, currentValue) =>
            accumulator + currentValue.orderDeliveryCharge.shopCut,
        0
    );

    return freeDeliveryShopCut;
};

const getFreeDeliveryDropCut = async (
    type = 'shop',
    id,
    startDate,
    endDate
) => {
    let commonConfig = { orderStatus: 'delivered' };

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        commonConfig = {
            ...commonConfig,
            deliveredAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const orders = await Order.find(commonConfig).populate(
        'orderDeliveryCharge'
    );

    const freeDeliveryDropCut = orders.reduce(
        (accumulator, currentValue) =>
            accumulator + currentValue.orderDeliveryCharge.dropCut,
        0
    );

    return freeDeliveryDropCut;
};

exports.getSingleShopDashBoard = async (req, res) => {
    try {
        const { startDate, endDate, shopId } = req.query;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return errorResponse(res, {
                message: 'Shop not found',
            });
        }

        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const totalDropGetFunc = await getAdminEarning(
            'shop',
            shop._id,
            startDate,
            endDate
        );
        const totalDropGet = totalDropGetFunc.totalAdminGet;

        const totalShopEarningFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
        });
        const totalShopEarning = totalShopEarningFunc.totalShopEarning;

        const totalShopEarningByDateFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
        });
        const totalShopEarningByDate =
            totalShopEarningByDateFunc.totalShopEarning;
        const secondaryCurrency_totalShopEarningByDate =
            totalShopEarningByDateFunc.secondaryCurrency_totalShopEarning;

        const baseCurrency_shopEarningFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
            paidCurrency: 'baseCurrency',
        });
        const baseCurrency_shopEarning =
            baseCurrency_shopEarningFunc.totalShopEarning;
        const secondaryCurrency_shopEarningFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
            paidCurrency: 'secondaryCurrency',
        });
        const secondaryCurrency_shopEarning =
            secondaryCurrency_shopEarningFunc.secondaryCurrency_totalShopEarning;

        const totalShopEarningByOldDateFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });
        const totalShopEarningByOldDate =
            totalShopEarningByOldDateFunc.totalShopEarning;

        const totalShopUnsettleFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
        });
        const totalShopUnsettle = totalShopUnsettleFunc.totalSellerUnsettle;
        const totalShopUnsettleByDateFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
        });
        const totalShopUnsettleByDate =
            totalShopUnsettleByDateFunc.totalSellerUnsettle;
        const secondaryCurrency_totalShopUnsettleByDate =
            totalShopUnsettleByDateFunc.secondaryCurrency_totalSellerUnsettle;

        const baseCurrency_shopUnsettleFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
            paidCurrency: 'baseCurrency',
        });
        const baseCurrency_shopUnsettle =
            baseCurrency_shopUnsettleFunc.totalSellerUnsettle;

        const secondaryCurrency_shopUnsettleFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
            paidCurrency: 'secondaryCurrency',
        });
        const secondaryCurrency_shopUnsettle =
            secondaryCurrency_shopUnsettleFunc.secondaryCurrency_totalSellerUnsettle;

        const totalShopUnsettleByOldDateFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });
        const totalShopUnsettleByOldDate =
            totalShopUnsettleByOldDateFunc.totalSellerUnsettle;

        const totalShopProfit = totalShopUnsettle + totalShopEarning;
        const totalShopProfitByDate =
            totalShopUnsettleByDate + totalShopEarningByDate;
        const secondaryCurrency_totalShopProfitByDate =
            secondaryCurrency_totalShopUnsettleByDate +
            secondaryCurrency_totalShopEarningByDate;
        const totalShopProfitByOldDate =
            totalShopUnsettleByOldDate + totalShopEarningByOldDate;

        const baseCurrency_shopProfit =
            baseCurrency_shopUnsettle + baseCurrency_shopEarning;
        const secondaryCurrency_shopProfit =
            secondaryCurrency_shopUnsettle + secondaryCurrency_shopEarning;

        const totalShopProfitByDateAvg =
            (totalShopProfitByDate / totalShopProfit) * 100;
        const totalShopProfitByOldDateAvg =
            (totalShopProfitByOldDate / totalShopProfit) * 100;
        const totalShopProfitAvgInPercentage =
            totalShopProfitByDateAvg - totalShopProfitByOldDateAvg;

        const orderStatistics = await getOrderStatistics({
            type: 'shop',
            id: shop._id,
        });
        const orderStatisticsByDate = await getOrderStatistics({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
        });
        const orderStatisticsByOldDate = await getOrderStatistics({
            type: 'shop',
            id: shop._id,
            startDate: oldStartDate,
            endDate: oldEndDate,
        });

        const totalExpectedOrder = orderStatistics.totalExpectedOrder;
        const totalExpectedOrderByDate =
            orderStatisticsByDate.totalExpectedOrder;
        const totalExpectedOrderByOldDate =
            orderStatisticsByOldDate.totalExpectedOrder;
        const totalExpectedOrderByDateAvg =
            (totalExpectedOrderByDate / totalExpectedOrder) * 100;
        const totalExpectedOrderByOldDateAvg =
            (totalExpectedOrderByOldDate / totalExpectedOrder) * 100;
        const totalExpectedOrderAvgInPercentage =
            totalExpectedOrderByDateAvg - totalExpectedOrderByOldDateAvg;

        const productAmountCash = await getProductAmount(
            'shop',
            'cash',
            shop._id,
            startDate,
            endDate
        );

        const productAmountOnline = await getProductAmount(
            'shop',
            'online',
            shop._id,
            startDate,
            endDate
        );

        const doubleMenuItemPriceCash = await getDoubleDealItemPrice(
            'shop',
            'cash',
            shop._id,
            startDate,
            endDate
        );

        const doubleMenuItemPriceOnline = await getDoubleDealItemPrice(
            'shop',
            'online',
            shop._id,
            startDate,
            endDate
        );

        const totalDeliveryFee = await getTotalDeliveryFee(
            'shop',
            shopId,
            startDate,
            endDate
        );

        const deliveryFeeCash = await getTotalDeliveryFee(
            'shop',
            shopId,
            startDate,
            endDate,
            'cash'
        );

        const deliveryFeeOnline = await getTotalDeliveryFee(
            'shop',
            shopId,
            startDate,
            endDate,
            'online'
        );
        const riderTipOnline = await getTotalRiderTip(
            'shop',
            shopId,
            startDate,
            endDate
        );

        // Free Delivery Shop Cut
        const freeDeliveryShopCut = await getFreeDeliveryShopCut(
            'shop',
            shopId
        );
        const freeDeliveryShopCutByDate = await getFreeDeliveryShopCut(
            'shop',
            shopId,
            startDate,
            endDate
        );
        const freeDeliveryShopCutByOldDate = await getFreeDeliveryShopCut(
            'shop',
            shopId,
            oldStartDate,
            oldEndDate
        );

        // Free Delivery Drop Cut
        const freeDeliveryDropCut = await getFreeDeliveryDropCut(
            'shop',
            shopId
        );
        const freeDeliveryDropCutByDate = await getFreeDeliveryDropCut(
            'shop',
            shopId,
            startDate,
            endDate
        );
        const freeDeliveryDropCutByOldDate = await getFreeDeliveryDropCut(
            'shop',
            shopId,
            oldStartDate,
            oldEndDate
        );

        // Featured amount
        const { featuredAmount: totalFeaturedAmount } = await getFeaturedAmount(
            {
                type: 'shop',
                id: shopId,
            }
        );

        const { featuredAmount: totalFeaturedAmountByDate } =
            await getFeaturedAmount({
                type: 'shop',
                id: shopId,
                startDate,
                endDate,
            });

        const { featuredAmount: totalFeaturedAmountByOldDate } =
            await getFeaturedAmount({
                type: 'shop',
                id: shopId,
                startDate: oldStartDate,
                endDate: oldEndDate,
            });

        // Marketing Spent
        const totalMarketingSpent =
            orderStatistics.totalValue.totalDiscount +
            orderStatistics.totalValue.totalRewardAmount +
            // orderStatistics.totalValue.totalDoubleMenuItemPrice +
            orderStatistics.totalValue.totalShopDoubleMenuItemPrice +
            orderStatistics.totalValue.totalAdminDoubleMenuCut +
            freeDeliveryShopCut +
            freeDeliveryDropCut +
            totalFeaturedAmount;
        const totalMarketingSpentByDate =
            orderStatisticsByDate.totalValue.totalDiscount +
            orderStatisticsByDate.totalValue.totalRewardAmount +
            // orderStatisticsByDate.totalValue.totalDoubleMenuItemPrice +
            orderStatisticsByDate.totalValue.totalShopDoubleMenuItemPrice +
            orderStatisticsByDate.totalValue.totalAdminDoubleMenuCut +
            freeDeliveryShopCutByDate +
            freeDeliveryDropCutByDate +
            totalFeaturedAmountByDate;
        const totalMarketingSpentByOldDate =
            orderStatisticsByOldDate.totalValue.totalDiscount +
            orderStatisticsByOldDate.totalValue.totalRewardAmount +
            // orderStatisticsByOldDate.totalValue.totalDoubleMenuItemPrice +
            orderStatisticsByOldDate.totalValue.totalShopDoubleMenuItemPrice +
            orderStatisticsByOldDate.totalValue.totalAdminDoubleMenuCut +
            freeDeliveryShopCutByOldDate +
            freeDeliveryDropCutByOldDate +
            totalFeaturedAmountByOldDate;

        const totalMarketingSpentByDateAvg =
            (totalMarketingSpentByDate / totalMarketingSpent) * 100;
        const totalMarketingSpentByOldDateAvg =
            (totalMarketingSpentByOldDate / totalMarketingSpent) * 100;
        const totalMarketingSpentAvgInPercentage =
            totalMarketingSpentByDateAvg - totalMarketingSpentByOldDateAvg;

        //*** Calculate refund amount ***/
        const { refundAmount: totalRefundAmount } = await getTotalRefundAmount({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
            account: 'shop',
        });

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                summary: {
                    totalDropGet,
                    baseCurrency_Earning: baseCurrency_shopEarning,
                    secondaryCurrency_Earning: secondaryCurrency_shopEarning,
                    totalEarning: totalShopEarningByDate,
                    secondaryCurrency_totalEarning:
                        secondaryCurrency_totalShopEarningByDate,
                    baseCurrency_Unsettle: baseCurrency_shopUnsettle,
                    secondaryCurrency_Unsettle: secondaryCurrency_shopUnsettle,
                    totalUnsettle: totalShopUnsettleByDate,
                    secondaryCurrency_totalUnsettle:
                        secondaryCurrency_totalShopUnsettleByDate,
                    baseCurrency_Profit: baseCurrency_shopProfit,
                    secondaryCurrency_Profit: secondaryCurrency_shopProfit,
                    totalProfit: totalShopProfitByDate,
                    secondaryCurrency_totalProfit:
                        secondaryCurrency_totalShopProfitByDate,
                    totalProfitAvgInPercentage: totalShopProfitAvgInPercentage,
                    totalExpectedOrder: totalExpectedOrderByDate,
                    totalExpectedOrderAvgInPercentage,
                    totalDeliveredOrder:
                        orderStatisticsByDate.totalDeliveredOrder,
                    totalCanceledOrder:
                        orderStatisticsByDate.totalCanceledOrder,
                    totalShopCanceledOrder:
                        orderStatisticsByDate.totalShopCanceledOrder,
                    totalShopRejectedOrder:
                        orderStatisticsByDate.totalShopRejectedOrder,
                    totalShopNotAcceptedOrder:
                        orderStatisticsByDate.totalShopNotAcceptedOrder,
                    orderValue:
                        {
                            ...orderStatisticsByDate.totalValue,
                            productAmountCash: productAmountCash,
                            productAmountOnline: productAmountOnline,
                            deliveryFee: totalDeliveryFee,
                            deliveryFeeCash: deliveryFeeCash,
                            deliveryFeeOnline: deliveryFeeOnline,
                            riderTipOnline: riderTipOnline,
                            doubleMenuItemPriceCash,
                            doubleMenuItemPriceOnline,
                        } || null,
                    // deliverySummery: deliverySummery,
                    freeDeliveryShopCut: freeDeliveryShopCutByDate,
                    freeDeliveryDropCut: freeDeliveryDropCutByDate,
                    freeDeliveryCut:
                        freeDeliveryDropCutByDate + freeDeliveryShopCutByDate,
                    totalFeaturedAmount: totalFeaturedAmountByDate,
                    totalMarketingSpentAvgInPercentage,
                    totalRefundAmount,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopOverviewDashBoard = async (req, res) => {
    try {
        const { startDate, endDate, id, type } = req.query;

        if (!type && !['shop', 'seller'].includes(type)) {
            return errorResponse(res, {
                message: 'Type is not valid',
            });
        }

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required!');

        let config = { orderStatus: 'delivered' };

        if (type === 'shop') {
            config.shop = ObjectId(id);
        } else {
            config.seller = ObjectId(id);
        }

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

        const orderQ = await Order.aggregate([
            {
                $match: config,
            },

            {
                $group: {
                    _id: '',
                    totalOrders: { $sum: 1 },
                    productAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                    },
                    totalDiscount: {
                        $sum: { $sum: ['$summary.baseCurrency_discount'] },
                    },
                    totalRewardAmount: {
                        $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
                    },
                },
            },
        ]);

        const {
            totalOrders = 0,
            productAmount = 0,
            totalDiscount = 0,
            totalRewardAmount = 0,
        } = orderQ[0] || {};

        const totalSales = productAmount - totalDiscount - totalRewardAmount;

        const avgOrdersValue =
            parseFloat((totalSales / totalOrders).toFixed(2)) || 0;

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                avgOrdersValue,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getShopCustomersDashBoard = async (req, res) => {
//     try {
//         const { startDate, endDate, id, type } = req.query;

//         if (!type && !['shop', 'seller'].includes(type)) {
//             return errorResponse(res, {
//                 message: 'Type is not valid',
//             });
//         }

//         let config = {};

//         if (type === 'shop') {
//             const shop = await Shop.findById(id);
//             if (!shop) {
//                 return errorResponse(res, {
//                     message: 'Shop not found',
//                 });
//             }

//             config = { shop: ObjectId(id) };
//         } else {
//             const seller = await Seller.findById(id);
//             if (!seller) {
//                 return errorResponse(res, {
//                     message: 'Seller not found',
//                 });
//             }

//             config = { seller: ObjectId(id) };
//         }

//         const startDateTime = moment(new Date(startDate))
//             .startOf('day')
//             .toDate();
//         const endDateTime = moment(endDate ? new Date(endDate) : new Date())
//             .endOf('day')
//             .toDate();

//         const daysDiff = moment(startDateTime).diff(
//             moment(endDateTime),
//             'days'
//         );

//         const oldEndDate = moment(startDateTime)
//             .subtract(1, 'days')
//             .endOf('day')
//             .toDate();
//         const oldStartDate = moment(oldEndDate)
//             .subtract(daysDiff, 'days')
//             .startOf('day')
//             .toDate();

//         // For Total Customers
//         const allCustomers = await Order.distinct('user', {
//             ...config,
//             orderStatus: 'delivered',
//         });
//         const totalCustomers = allCustomers.length;

//         const allCustomersSales = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: startDateTime,
//                         $lte: endDateTime,
//                     },
//                 },
//             },

//             {
//                 $group: {
//                     _id: '',
//                     count: { $sum: 1 },
//                     productAmount: {
//                         $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
//                     },
//                     totalDiscount: {
//                         $sum: { $sum: ['$summary.baseCurrency_discount'] },
//                     },
//                     totalRewardAmount: {
//                         $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
//                     },
//                     // totalDoubleMenuItemPrice: {
//                     //     $sum: {
//                     //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
//                     //     },
//                     // },
//                 },
//             },
//         ]);
//         if (allCustomersSales.length < 1) {
//             allCustomersSales.push({
//                 count: 0,
//                 productAmount: 0,
//                 totalDiscount: 0,
//                 totalRewardAmount: 0,
//                 // totalDoubleMenuItemPrice: 0,
//             });
//         }

//         const totalCustomersSales =
//             allCustomersSales[0].productAmount -
//             allCustomersSales[0].totalDiscount -
//             // allCustomersSales[0].totalDoubleMenuItemPrice -
//             allCustomersSales[0].totalRewardAmount;

//         const totalCustomersOrders = allCustomersSales[0].count;

//         const totalCustomersPercentOfSales = parseFloat(
//             ((totalCustomersSales * 100) / totalCustomersSales).toFixed(2)
//         );
//         const totalCustomersAvgOrders =
//             parseFloat(
//                 (totalCustomersSales / totalCustomersOrders).toFixed(2)
//             ) || 0;

//         // For New Customers
//         const newUsersLifeTime = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     orderStatus: 'delivered',
//                 },
//             },
//             {
//                 $group: {
//                     _id: '$user',
//                     orderCount: { $sum: 1 },
//                 },
//             },
//             {
//                 $match: {
//                     orderCount: 1,
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     newUserCount: { $sum: 1 },
//                     userIDs: { $push: '$_id' },
//                 },
//             },
//         ]);
//         const newUserIDListLifeTime = newUsersLifeTime[0]
//             ? newUsersLifeTime[0].userIDs
//             : [];

//         const newUsers = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: startDateTime,
//                         $lte: endDateTime,
//                     },
//                 },
//             },
//             {
//                 $group: {
//                     _id: '$user',
//                     orderCount: { $sum: 1 },
//                 },
//             },
//             {
//                 $match: {
//                     _id: { $in: newUserIDListLifeTime },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     newUserCount: { $sum: 1 },
//                     userIDs: { $push: '$_id' },
//                 },
//             },
//         ]);
//         const newUsersByOldDate = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: oldStartDate,
//                         $lte: oldEndDate,
//                     },
//                 },
//             },
//             {
//                 $group: {
//                     _id: '$user',
//                     orderCount: { $sum: 1 },
//                 },
//             },
//             {
//                 $match: {
//                     _id: { $in: newUserIDListLifeTime },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     newUserCount: { $sum: 1 },
//                     userIDs: { $push: '$_id' },
//                 },
//             },
//         ]);
//         const newCustomers = newUsers[0] ? newUsers[0].newUserCount : 0;
//         const newCustomersByOldDate = newUsersByOldDate[0]
//             ? newUsersByOldDate[0].newUserCount
//             : 0;
//         const newCustomersAvg = parseFloat(
//             ((newCustomers / totalCustomers) * 100).toFixed(2)
//         );
//         const newCustomersByOldDateAvg = parseFloat(
//             ((newCustomersByOldDate / totalCustomers) * 100).toFixed(2)
//         );
//         const newCustomersAvgInPercentage =
//             newCustomersAvg - newCustomersByOldDateAvg;

//         const newUserIDList = newUsers[0] ? newUsers[0].userIDs : [];
//         const newUserIDListByOldDate = newUsersByOldDate[0]
//             ? newUsersByOldDate[0].userIDs
//             : [];

//         const newUsersSales = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     user: { $in: newUserIDList },
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: startDateTime,
//                         $lte: endDateTime,
//                     },
//                 },
//             },

//             {
//                 $group: {
//                     _id: '',
//                     count: { $sum: 1 },
//                     productAmount: {
//                         $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
//                     },
//                     totalDiscount: {
//                         $sum: { $sum: ['$summary.baseCurrency_discount'] },
//                     },
//                     totalRewardAmount: {
//                         $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
//                     },
//                     // totalDoubleMenuItemPrice: {
//                     //     $sum: {
//                     //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
//                     //     },
//                     // },
//                 },
//             },
//         ]);
//         if (newUsersSales.length < 1) {
//             newUsersSales.push({
//                 count: 0,
//                 productAmount: 0,
//                 totalDiscount: 0,
//                 totalRewardAmount: 0,
//                 // totalDoubleMenuItemPrice: 0,
//             });
//         }

//         const newUsersSalesByOldDate = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     user: { $in: newUserIDListByOldDate },
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: startDateTime,
//                         $lte: endDateTime,
//                     },
//                 },
//             },

//             {
//                 $group: {
//                     _id: '',
//                     count: { $sum: 1 },
//                     productAmount: {
//                         $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
//                     },
//                     totalDiscount: {
//                         $sum: { $sum: ['$summary.baseCurrency_discount'] },
//                     },
//                     totalRewardAmount: {
//                         $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
//                     },
//                     // totalDoubleMenuItemPrice: {
//                     //     $sum: {
//                     //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
//                     //     },
//                     // },
//                 },
//             },
//         ]);
//         if (newUsersSalesByOldDate.length < 1) {
//             newUsersSalesByOldDate.push({
//                 count: 0,
//                 productAmount: 0,
//                 totalDiscount: 0,
//                 totalRewardAmount: 0,
//                 // totalDoubleMenuItemPrice: 0,
//             });
//         }
//         const newCustomersSales =
//             newUsersSales[0].productAmount -
//             newUsersSales[0].totalDiscount -
//             newUsersSales[0].totalRewardAmount;
//         // -
//         // newUsersSales[0].totalDoubleMenuItemPrice;
//         const newCustomersSalesByOldDate =
//             newUsersSalesByOldDate[0].productAmount -
//             newUsersSalesByOldDate[0].totalDiscount -
//             newUsersSalesByOldDate[0].totalRewardAmount;
//         // -
//         // newUsersSalesByOldDate[0].totalDoubleMenuItemPrice;

//         const newCustomersOrders = newUsersSales[0].count;
//         const newCustomersPercentOfSales = parseFloat(
//             ((newCustomersSales * 100) / totalCustomersSales).toFixed(2)
//         );
//         const newCustomersPercentOfSalesByOldDate = parseFloat(
//             ((newCustomersSalesByOldDate * 100) / totalCustomersSales).toFixed(
//                 2
//             )
//         );
//         const newCustomersSalesAvgInPercentage =
//             newCustomersPercentOfSales - newCustomersPercentOfSalesByOldDate;

//         const newCustomersAvgOrders =
//             parseFloat((newCustomersSales / newCustomersOrders).toFixed(2)) ||
//             0;

//         // For Repeated Customers
//         const repeatedUsersLifeTime = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     orderStatus: 'delivered',
//                 },
//             },
//             {
//                 $group: {
//                     _id: '$user',
//                     orderCount: { $sum: 1 },
//                 },
//             },
//             {
//                 $match: {
//                     orderCount: { $gt: 1 },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     repeatedUserCount: { $sum: 1 },
//                     userIDs: { $push: '$_id' },
//                 },
//             },
//         ]);
//         const repeatedCustomersLifeTime = repeatedUsersLifeTime[0]
//             ? repeatedUsersLifeTime[0].repeatedUserCount
//             : 0;
//         const repeatedUserIDListLifeTime = repeatedUsersLifeTime[0]
//             ? repeatedUsersLifeTime[0].userIDs
//             : [];
//         const repeatedUsersSalesLifeTime = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     user: { $in: repeatedUserIDListLifeTime },
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: startDateTime,
//                         $lte: endDateTime,
//                     },
//                 },
//             },

//             {
//                 $group: {
//                     _id: '',
//                     count: { $sum: 1 },
//                     productAmount: {
//                         $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
//                     },
//                     totalDiscount: {
//                         $sum: { $sum: ['$summary.baseCurrency_discount'] },
//                     },
//                     totalRewardAmount: {
//                         $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
//                     },
//                     // totalDoubleMenuItemPrice: {
//                     //     $sum: {
//                     //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
//                     //     },
//                     // },
//                 },
//             },
//         ]);
//         if (repeatedUsersSalesLifeTime.length < 1) {
//             repeatedUsersSalesLifeTime.push({
//                 count: 0,
//                 productAmount: 0,
//                 totalDiscount: 0,
//                 totalRewardAmount: 0,
//                 // totalDoubleMenuItemPrice: 0,
//             });
//         }

//         const repeatedCustomersSalesLifeTime =
//             repeatedUsersSalesLifeTime[0].productAmount -
//             repeatedUsersSalesLifeTime[0].totalDiscount -
//             repeatedUsersSalesLifeTime[0].totalRewardAmount;
//         // -
//         // repeatedUsersSalesLifeTime[0].totalDoubleMenuItemPrice;
//         const repeatedCustomersOrdersLifeTime =
//             repeatedUsersSalesLifeTime[0].count;

//         const repeatedUsers = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: startDateTime,
//                         $lte: endDateTime,
//                     },
//                 },
//             },
//             {
//                 $group: {
//                     _id: '$user',
//                     orderCount: { $sum: 1 },
//                 },
//             },
//             {
//                 $match: {
//                     _id: { $in: repeatedUserIDListLifeTime },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     repeatedUserCount: { $sum: 1 },
//                     userIDs: { $push: '$_id' },
//                 },
//             },
//         ]);
//         const repeatedUsersByOldDate = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: oldStartDate,
//                         $lte: oldEndDate,
//                     },
//                 },
//             },
//             {
//                 $group: {
//                     _id: '$user',
//                     orderCount: { $sum: 1 },
//                 },
//             },
//             {
//                 $match: {
//                     _id: { $in: repeatedUserIDListLifeTime },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     repeatedUserCount: { $sum: 1 },
//                     userIDs: { $push: '$_id' },
//                 },
//             },
//         ]);
//         const repeatedCustomers = repeatedUsers[0]
//             ? repeatedUsers[0].repeatedUserCount
//             : 0;
//         const repeatedCustomersByOldDate = repeatedUsersByOldDate[0]
//             ? repeatedUsersByOldDate[0].repeatedUserCount
//             : 0;
//         const repeatedCustomersAvg = (repeatedCustomers / totalCustomers) * 100;
//         const repeatedCustomersByOldDateAvg =
//             (repeatedCustomersByOldDate / totalCustomers) * 100;
//         const repeatedCustomersAvgInPercentage =
//             repeatedCustomersAvg - repeatedCustomersByOldDateAvg;

//         const repeatedUserIDList = repeatedUsers[0]
//             ? repeatedUsers[0].userIDs
//             : [];
//         const repeatedUserIDListByOldDate = repeatedUsersByOldDate[0]
//             ? repeatedUsersByOldDate[0].userIDs
//             : [];

//         const repeatedUsersSales = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     user: { $in: repeatedUserIDList },
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: startDateTime,
//                         $lte: endDateTime,
//                     },
//                 },
//             },

//             {
//                 $group: {
//                     _id: '',
//                     count: { $sum: 1 },
//                     productAmount: {
//                         $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
//                     },
//                     totalDiscount: {
//                         $sum: { $sum: ['$summary.baseCurrency_discount'] },
//                     },
//                     totalRewardAmount: {
//                         $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
//                     },
//                     // totalDoubleMenuItemPrice: {
//                     //     $sum: {
//                     //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
//                     //     },
//                     // },
//                 },
//             },
//         ]);
//         if (repeatedUsersSales.length < 1) {
//             repeatedUsersSales.push({
//                 count: 0,
//                 productAmount: 0,
//                 totalDiscount: 0,
//                 totalRewardAmount: 0,
//                 // totalDoubleMenuItemPrice: 0,
//             });
//         }

//         const repeatedUsersSalesByOldDate = await Order.aggregate([
//             {
//                 $match: {
//                     ...config,
//                     user: { $in: repeatedUserIDListByOldDate },
//                     orderStatus: 'delivered',
//                     createdAt: {
//                         $gte: startDateTime,
//                         $lte: endDateTime,
//                     },
//                 },
//             },

//             {
//                 $group: {
//                     _id: '',
//                     count: { $sum: 1 },
//                     productAmount: {
//                         $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
//                     },
//                     totalDiscount: {
//                         $sum: { $sum: ['$summary.baseCurrency_discount'] },
//                     },
//                     totalRewardAmount: {
//                         $sum: { $sum: ['$summary.reward.baseCurrency_amount'] },
//                     },
//                     // totalDoubleMenuItemPrice: {
//                     //     $sum: {
//                     //         $sum: ['$summary.baseCurrency_doubleMenuItemPrice'],
//                     //     },
//                     // },
//                 },
//             },
//         ]);
//         if (repeatedUsersSalesByOldDate.length < 1) {
//             repeatedUsersSalesByOldDate.push({
//                 count: 0,
//                 productAmount: 0,
//                 totalDiscount: 0,
//                 totalRewardAmount: 0,
//                 // totalDoubleMenuItemPrice: 0,
//             });
//         }

//         const repeatedCustomersSales =
//             repeatedUsersSales[0].productAmount -
//             repeatedUsersSales[0].totalDiscount -
//             repeatedUsersSales[0].totalRewardAmount;
//         // -
//         // repeatedUsersSales[0].totalDoubleMenuItemPrice;
//         const repeatedCustomersSalesByOldDate =
//             repeatedUsersSalesByOldDate[0].productAmount -
//             repeatedUsersSalesByOldDate[0].totalDiscount -
//             repeatedUsersSalesByOldDate[0].totalRewardAmount;
//         // -
//         // repeatedUsersSalesByOldDate[0].totalDoubleMenuItemPrice;

//         const repeatedCustomersOrders = repeatedUsersSales[0].count;
//         const repeatedCustomersPercentOfSales = parseFloat(
//             ((repeatedCustomersSales * 100) / totalCustomersSales).toFixed(2)
//         );
//         const repeatedCustomersPercentOfSalesByOldDate = parseFloat(
//             (
//                 (repeatedCustomersSalesByOldDate * 100) /
//                 totalCustomersSales
//             ).toFixed(2)
//         );
//         const repeatedCustomersSalesAvgInPercentage =
//             repeatedCustomersPercentOfSales -
//             repeatedCustomersPercentOfSalesByOldDate;

//         const repeatedCustomersAvgOrders =
//             parseFloat(
//                 (repeatedCustomersSales / repeatedCustomersOrders).toFixed(2)
//             ) || 0;

//         // For Lapsed Customers
//         const lapsedCustomers = repeatedCustomersLifeTime - repeatedCustomers;
//         const lapsedCustomersByOldDate =
//             repeatedCustomersLifeTime - repeatedCustomersByOldDate;
//         const lapsedCustomersAvg = (lapsedCustomers / totalCustomers) * 100;
//         const lapsedCustomersByOldDateAvg =
//             (lapsedCustomersByOldDate / totalCustomers) * 100;
//         const lapsedCustomersAvgInPercentage =
//             lapsedCustomersAvg - lapsedCustomersByOldDateAvg;

//         const lapsedCustomersSales =
//             repeatedCustomersSalesLifeTime - repeatedCustomersSales;
//         const lapsedCustomersSalesByOldDate =
//             repeatedCustomersSalesLifeTime - repeatedCustomersSalesByOldDate;

//         const lapsedCustomersOrders =
//             repeatedCustomersOrdersLifeTime - repeatedCustomersOrders;
//         const lapsedCustomersPercentOfSales = parseFloat(
//             ((lapsedCustomersSales * 100) / totalCustomersSales).toFixed(2)
//         );
//         const lapsedCustomersPercentOfSalesByOldDate = parseFloat(
//             (
//                 (lapsedCustomersSalesByOldDate * 100) /
//                 totalCustomersSales
//             ).toFixed(2)
//         );
//         const lapsedCustomersSalesAvgInPercentage =
//             lapsedCustomersPercentOfSales -
//             lapsedCustomersPercentOfSalesByOldDate;

//         const lapsedCustomersAvgOrders =
//             parseFloat(
//                 (lapsedCustomersSales / lapsedCustomersOrders).toFixed(2)
//             ) || 0;

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 totalCustomers: newCustomers+repeatedCustomers,
//                 totalCustomersSales,
//                 totalCustomersOrders,
//                 totalCustomersPercentOfSales,
//                 totalCustomersAvgOrders,
//                 newCustomers,
//                 newCustomersAvgInPercentage,
//                 newCustomersSales,
//                 newCustomersSalesAvgInPercentage,
//                 newCustomersOrders,
//                 newCustomersPercentOfSales,
//                 newCustomersAvgOrders,
//                 repeatedCustomers,
//                 repeatedCustomersAvgInPercentage,
//                 repeatedCustomersSales,
//                 repeatedCustomersSalesAvgInPercentage,
//                 repeatedCustomersOrders,
//                 repeatedCustomersPercentOfSales,
//                 repeatedCustomersAvgOrders,
//                 lapsedCustomers,
//                 lapsedCustomersAvgInPercentage,
//                 lapsedCustomersSales,
//                 lapsedCustomersSalesAvgInPercentage,
//                 lapsedCustomersOrders,
//                 lapsedCustomersPercentOfSales,
//                 lapsedCustomersAvgOrders,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };
exports.getShopCustomersDashBoard = async (req, res) => {
    try {
        const { startDate, endDate, id, type } = req.query;

        if (!type && !['shop', 'seller'].includes(type)) {
            return errorResponse(res, {
                message: 'Type is not valid',
            });
        }

        if (!startDate || !endDate)
            return errorResponse(res, 'startDate and endDate are required!');

        let config = {};

        if (type === 'shop') {
            config.shop = ObjectId(id);
        } else {
            config.seller = ObjectId(id);
        }

        const { startDateTime, endDateTime, oldStartDate, oldEndDate } =
            formatDate(startDate, endDate);

        const findOrders = await Order.find({
            ...config,
            orderStatus: 'delivered',
            deliveredAt: {
                $gte: oldStartDate,
                $lte: endDateTime,
            },
        })
            .select('user summary createdAt')
            .lean();

        const orders = findOrders.filter(
            order =>
                order.createdAt >= startDateTime &&
                order.createdAt <= endDateTime
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

            if (!totalActiveCustomersId.includes(order.user.toString())) {
                totalActiveCustomersId.push(order.user.toString());
            }

            const userOrders = await Order.countDocuments({
                ...config,
                user: order.user,
                orderStatus: 'delivered',
                deliveredAt: {
                    $lt: startDateTime,
                },
            });

            if (userOrders === 0) {
                newCustomerSales +=
                    order.summary.baseCurrency_productAmount -
                    order.summary.baseCurrency_discount -
                    order.summary.reward.baseCurrency_amount;
                newCustomerOrdersCount += 1;

                if (!newCustomersId.includes(order.user.toString())) {
                    newCustomersId.push(order.user.toString());
                }
            } else if (!repeatedCustomersId.includes(order.user.toString())) {
                repeatedCustomersId.push(order.user.toString());
            }
        }

        console.log(totalActiveCustomersId);
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
                order.createdAt >= oldStartDate && order.createdAt <= oldEndDate
        );

        const oldActiveCustomersId = [];
        const lapsedCustomersId = [];
        let lapsedCustomerOrdersCount = 0;
        let lapsedCustomerSales = 0;

        for (const order of oldOrders) {
            if (!oldActiveCustomersId.includes(order.user.toString())) {
                oldActiveCustomersId.push(order.user.toString());
            }

            if (!totalActiveCustomersId.includes(order.user.toString())) {
                lapsedCustomerOrdersCount += 1;
                lapsedCustomerSales +=
                    order.summary.baseCurrency_productAmount -
                    order.summary.baseCurrency_discount -
                    order.summary.reward.baseCurrency_amount;

                if (!lapsedCustomersId.includes(order.user.toString())) {
                    lapsedCustomersId.push(order.user.toString());
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

exports.getSingleShopOperationsDashBoard = async (req, res) => {
    try {
        const { startDate, endDate, id, type } = req.query;

        if (!type && !['shop', 'seller'].includes(type)) {
            return errorResponse(res, {
                message: 'Type is not valid',
            });
        }

        let config = {};
        let shops = [];

        if (type === 'shop') {
            const shop = await Shop.findById(id);
            if (!shop) {
                return errorResponse(res, {
                    message: 'Shop not found',
                });
            }

            config = { shop: ObjectId(id) };
            shops = [shop];
        } else {
            const seller = await Seller.findById(id).populate('shops');
            if (!seller) {
                return errorResponse(res, {
                    message: 'Seller not found',
                });
            }

            config = { seller: ObjectId(id) };
            shops = seller.shops;
        }

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

        //*** Canceled Order ***/
        let canceledOrderConfig = {
            ...config,
            orderStatus: 'cancelled',
            'orderCancel.canceledBy': 'shop',
            'orderCancel.shopCancelType': 'canceled',
        };

        const canceledOrderPipeline = [
            {
                $match: canceledOrderConfig,
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    date: '$_id',
                    count: 1,
                    _id: 0,
                },
            },
            {
                $sort: {
                    date: -1, // sort in descending order of date
                },
            },
        ];

        const dateWiseCanceledOrder = await Order.aggregate(
            canceledOrderPipeline
        );
        const totalCanceledOrder = await Order.count(canceledOrderConfig);

        //*** Rejected Order ***/
        let rejectedOrderConfig = {
            ...config,
            orderStatus: 'cancelled',
            'orderCancel.canceledBy': 'shop',
            'orderCancel.shopCancelType': 'rejected',
        };

        const rejectedOrderPipeline = [
            {
                $match: rejectedOrderConfig,
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    date: '$_id',
                    count: 1,
                    _id: 0,
                },
            },
            {
                $sort: {
                    date: -1, // sort in descending order of date
                },
            },
        ];

        const dateWiseRejectedOrder = await Order.aggregate(
            rejectedOrderPipeline
        );
        const totalRejectedOrder = await Order.count(rejectedOrderConfig);

        //*** Missed Order ***/
        let missedOrderConfig = {
            ...config,
            orderStatus: 'cancelled',
            'orderCancel.canceledBy': 'automatically',
            'orderCancel.shopCancelType': 'notAccepted',
        };

        const missedOrderPipeline = [
            {
                $match: missedOrderConfig,
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    date: '$_id',
                    count: 1,
                    _id: 0,
                },
            },
            {
                $sort: {
                    date: -1, // sort in descending order of date
                },
            },
        ];

        const dateWiseMissedOrder = await Order.aggregate(missedOrderPipeline);
        const totalMissedOrder = await Order.count(missedOrderConfig);

        //***  Refunded Order ***/
        let refundedOrderConfig = {
            ...config,
            orderStatus: 'delivered',
            isRefundedAfterDelivered: true,
        };

        const refundedOrderPipeline = [
            {
                $match: refundedOrderConfig,
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    date: '$_id',
                    count: 1,
                    _id: 0,
                },
            },
            {
                $sort: {
                    date: -1, // sort in descending order of date
                },
            },
        ];

        const dateWiseRefundedOrder = await Order.aggregate(
            refundedOrderPipeline
        );
        const totalRefundedOrder = await Order.count(refundedOrderConfig);

        //*** Shop or seller total downtime calc ***/
        const activities = await ShopDowntimeModel.find(config).sort({
            createdAt: 'desc',
        });

        const activityMap = new Map();
        let totalMinutes = 0;

        for (const activity of activities) {
            if (activity.downTimeTotal) {
                const dateKey = moment(activity.Date).format('DD-MM-YYYY');
                if (!activityMap.has(dateKey)) {
                    activityMap.set(dateKey, 0);
                }
                activityMap.set(
                    dateKey,
                    activityMap.get(dateKey) + activity.downTimeTotal
                );
                totalMinutes += activity.downTimeTotal;
            }
        }

        const totalHours = totalMinutes / 60;
        const totalDays = totalHours / 24;

        const newActivities = [...activityMap].map(([date, downTimeTotal]) => ({
            Date: moment(date, 'DD-MM-YYYY').toDate(),
            downTimeTotal,
            summeryString: getSummeryString(downTimeTotal),
        }));

        const ShopDownTimeSummery = {
            totalMinutes: Number(totalMinutes.toFixed(2)),
            totalHours: Number(totalHours.toFixed(2)),
            totalDays: Number(totalDays.toFixed(2)),
            totalMinutesString: `${totalMinutes.toFixed(2)} Minutes`,
            totalHoursString: `${totalHours.toFixed(2)} Hours`,
            totalDaysString: `${totalDays.toFixed(2)} Days`,
            finalSummeryString: getSummeryString(totalMinutes),
        };

        // let newActivities = [];
        // for (let activity of activities) {
        //     let findActivity = newActivities.find(
        //         element =>
        //             moment(element?.Date).format('DD-MM-YYYY') ===
        //             moment(activity?.Date).format('DD-MM-YYYY')
        //     );

        //     if (findActivity) {
        //         findActivity.downTimeTotal += activity.downTimeTotal;
        //     } else {
        //         if (activity.downTimeTotal) {
        //             newActivities.push({
        //                 Date: activity.Date,
        //                 downTimeTotal: activity.downTimeTotal,
        //             });
        //         }
        //     }
        // }
        // newActivities = newActivities.map(activity => {
        //     const newObject = {
        //         ...activity,
        //         summeryString: getSummeryString(activity.downTimeTotal),
        //     };
        //     return newObject;
        // });

        // const downTimeTotal = await ShopDowntimeModel.find(config);
        // const totalMinutes = downTimeTotal.reduce((acc, item) => {
        //     return acc + item.downTimeTotal;
        // }, 0);

        // const toalHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
        // const totalDays = toalHours > 0 ? toalHours / 24 : 0;

        // const ShopDownTimeSummery = {
        //     totalMinutes: Number(totalMinutes.toFixed(2)),
        //     totalHours: Number(toalHours.toFixed(2)),
        //     totalDays: Number(totalDays.toFixed(2)),
        //     totalMinutesString: `${totalMinutes.toFixed(2)} Minutes`,
        //     totalHoursString: `${toalHours.toFixed(2)} Hours`,
        //     totalDaysString: `${totalDays.toFixed(2)} Days`,
        //     finalSummeryString: getSummeryString(totalMinutes),
        // };

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                totalCanceledOrder,
                dateWiseCanceledOrder,
                totalRejectedOrder,
                dateWiseRejectedOrder,
                totalMissedOrder,
                dateWiseMissedOrder,
                totalRefundedOrder,
                dateWiseRefundedOrder,
                totalDownTime: ShopDownTimeSummery,
                dateWiseDowntime: newActivities,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// const getDownTime = (startDate, endDate, shop) => {
//     //*** Shop total downtime calc ***/
//     const shopDowntime = shop.shopDowntime;

//     let shopDowntimeForTotal = shopDowntime;
//     if (startDate) {
//         const newEndDate = new Date(endDate);
//         newEndDate.setDate(newEndDate.getDate() + 1);

//         shopDowntimeForTotal = shopDowntime?.filter(downtime => {
//             return (
//                 downtime?.start?.getTime() >= new Date(startDate).getTime() &&
//                 downtime?.start?.getTime() <= new Date(newEndDate).getTime()
//             );
//         });
//     }

//     // Calculate total downtime in minutes
//     const totalDowntimeInMinutes = getDowntimeInMinutes(
//         shopDowntimeForTotal,
//         shop
//     );

//     //*** Shop daily downtime calc ***/
//     let dates;
//     if (startDate) {
//         dates = getDatesInRange(new Date(startDate), new Date(endDate));
//     } else {
//         dates = getDatesInRange(new Date(shop.createdAt), new Date());
//     }

//     let dateWiseDowntime = [];
//     for (const date of dates) {
//         const shopDowntimeForDaily = shopDowntime?.filter(
//             downtime =>
//                 downtime?.start?.toDateString() ===
//                 new Date(date).toDateString()
//         );

//         // Calculate total downtime in minutes
//         const dailyDowntimeInMinutes = getDowntimeInMinutes(
//             shopDowntimeForDaily,
//             shop
//         );

//         dateWiseDowntime.push({
//             date,
//             // hours: dailyDowntimeInHours,
//             minutes: dailyDowntimeInMinutes,
//         });
//     }

//     return { totalDowntimeInMinutes, dateWiseDowntime };
// };

// const getDowntimeInMinutes = (shopDowntimes, shop) => {
//     const totalDowntimeInMinutes = shopDowntimes?.reduce((total, downtime) => {
//         let startDowntime = downtime?.start;
//         let endDowntime = downtime?.end;

//         let shopOpeningTime;
//         let shopClosingTime;

//         if (startDowntime) {
//             const shopWorkingTime = shop.normalHours.find(
//                 time =>
//                     time.day === moment(new Date(startDowntime)).format('dddd')
//             );
//             const openingTime = shopWorkingTime.open;
//             const openingTimeParts = openingTime.split(':');
//             shopOpeningTime = new Date(startDowntime);
//             shopOpeningTime.setHours(openingTimeParts[0]);
//             shopOpeningTime.setMinutes(openingTimeParts[1]);

//             const closingTime = shopWorkingTime.close;
//             const closingTimeParts = closingTime.split(':');
//             shopClosingTime = new Date(startDowntime);
//             shopClosingTime.setHours(closingTimeParts[0]);
//             shopClosingTime.setMinutes(closingTimeParts[1]);
//         } else {
//             const shopWorkingTime = shop.normalHours.find(
//                 time =>
//                     time.day === moment(new Date(endDowntime)).format('dddd')
//             );
//             const openingTime = shopWorkingTime.open;
//             const openingTimeParts = openingTime.split(':');
//             shopOpeningTime = new Date(endDowntime);
//             shopOpeningTime.setHours(openingTimeParts[0]);
//             shopOpeningTime.setMinutes(openingTimeParts[1]);

//             const closingTime = shopWorkingTime.close;
//             const closingTimeParts = closingTime.split(':');
//             shopClosingTime = new Date(endDowntime);
//             shopClosingTime.setHours(closingTimeParts[0]);
//             shopClosingTime.setMinutes(closingTimeParts[1]);
//         }

//         if (!startDowntime) {
//             startDowntime = shopOpeningTime;
//         }

//         if (
//             !endDowntime ||
//             startDowntime.getFullYear() !== endDowntime.getFullYear() ||
//             startDowntime.getMonth() !== endDowntime.getMonth() ||
//             startDowntime.getDate() !== endDowntime.getDate() ||
//             endDowntime.getTime() < shopOpeningTime.getTime() ||
//             endDowntime.getTime() > shopClosingTime.getTime()
//         ) {
//             endDowntime = shopClosingTime;
//         }

//         const downtimeInMinutes = (endDowntime - startDowntime) / (1000 * 60);
//         return total + downtimeInMinutes;
//     }, 0);

//     return totalDowntimeInMinutes;
// };

exports.getSingleShopItemRanking = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            shopId,
            startDate,
            endDate,
        } = req.query;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return errorResponse(res, {
                message: 'Shop not found',
            });
        }

        let config = {
            shop: ObjectId(shopId),
            orderStatus: 'delivered',
        };

        let runningMonthConfig = {
            ...config,
            deliveredAt: {
                $gte: moment(new Date()).subtract(30, 'days').toDate(),
                $lt: moment(new Date()).add(1, 'days').toDate(),
            },
        };
        let lastMonthConfig = {
            ...config,
            deliveredAt: {
                $gte: moment(new Date()).subtract(61, 'days').toDate(),
                $lt: moment(new Date()).subtract(30, 'days').toDate(),
            },
        };

        const itemConfig = {
            ...config,
            deliveredAt: {
                $gte: moment(new Date(startDate)).startOf('day').toDate(),
                $lte: moment(new Date(endDate)).endOf('day').toDate(),
            },
        };
        const items = await Order.aggregate([
            {
                $match: itemConfig,
            },
            // Unwind the products array to get individual product documents
            {
                $unwind: '$products',
            },
            // Group by product and calculate sold quantity and total amount
            {
                $group: {
                    _id: '$products.product',
                    soldQuantity: { $sum: '$products.quantity' },
                    totalAmount: { $sum: '$products.totalProductAmount' },
                },
            },
            // Lookup the product information using the referenced 'products' collection
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            // Project the desired fields
            {
                $project: {
                    _id: 0,
                    product: { $arrayElemAt: ['$product', 0] },
                    soldQuantity: 1,
                    totalAmount: 1,
                },
            },
            // Sort by soldQuantity in descending order
            {
                $sort: {
                    soldQuantity: -1,
                },
            },
        ]);

        const runningMonthItems = await Order.aggregate([
            {
                $match: runningMonthConfig,
            },
            // Unwind the products array to get individual product documents
            {
                $unwind: '$products',
            },
            // Group by product and calculate sold quantity and total amount
            {
                $group: {
                    _id: '$products.product',
                    soldQuantity: { $sum: '$products.quantity' },
                    totalAmount: { $sum: '$products.totalProductAmount' },
                },
            },
            // Lookup the product information using the referenced 'products' collection
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            // Project the desired fields
            {
                $project: {
                    _id: 0,
                    product: { $arrayElemAt: ['$product', 0] },
                    soldQuantity: 1,
                    totalAmount: 1,
                },
            },
        ]);

        const lastMonthItems = await Order.aggregate([
            {
                $match: lastMonthConfig,
            },
            // Unwind the products array to get individual product documents
            {
                $unwind: '$products',
            },
            // Group by product and calculate sold quantity and total amount
            {
                $group: {
                    _id: '$products.product',
                    soldQuantity: { $sum: '$products.quantity' },
                    totalAmount: { $sum: '$products.totalProductAmount' },
                },
            },
            // Lookup the product information using the referenced 'products' collection
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            // Project the desired fields
            {
                $project: {
                    _id: 0,
                    product: { $arrayElemAt: ['$product', 0] },
                    soldQuantity: 1,
                    totalAmount: 1,
                },
            },
        ]);

        for (const item of items) {
            const runningMonthItem = runningMonthItems.find(
                element =>
                    element.product._id.toString() ===
                    item.product._id.toString()
            );
            const lastMonthItem = lastMonthItems.find(
                element =>
                    element.product._id.toString() ===
                    item.product._id.toString()
            );
            const runningMonthItemSoldQuantity =
                runningMonthItem?.soldQuantity || 0;
            const lastMonthItemSoldQuantity = lastMonthItem?.soldQuantity || 0;

            const runningMonthItemSoldQuantityAvg =
                (runningMonthItemSoldQuantity / item.soldQuantity) * 100;
            const lastMonthItemSoldQuantityAvg =
                (lastMonthItemSoldQuantity / item.soldQuantity) * 100;
            const soldAvgInPercentage =
                // runningMonthItemSoldQuantityAvg - lastMonthItemSoldQuantityAvg;
                lastMonthItemSoldQuantity < 1e-7 ? runningMonthItemSoldQuantity - lastMonthItemSoldQuantity
                : ((runningMonthItemSoldQuantity - lastMonthItemSoldQuantity) / lastMonthItemSoldQuantity) * 100;

            item.soldAvgInPercentage = soldAvgInPercentage;
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: items.length,
            pagingRange,
        });

        const list = items.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                items: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTransection = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            pagingRange = 5,
            account = 'all',
            amountMin,
            amountMax,
            amountMinDrop,
            amountMaxDrop,
            amountMinDelivery,
            amountMaxDropDelivery,
        } = req.query;

        let whereConfig = {
            type: {
                $in: [
                    'userBalanceWithdrawAdmin',
                    'userBalanceAddAdmin',
                    'adminAddBalanceShop',
                    'adminRemoveBalanceShop',
                    'userPayAfterReceivedOrder',
                    'userPayBeforeReceivedOrderByWallet',
                    'userCancelOrderGetWallet',
                    'userPayForOrder',
                    'deliveryBoyAdminAmountReceivedCash',
                    'sellerGetPaymentFromOrderCash',
                ],
            },
        };

        if (amountMin && amountMax) {
            // set min and max
            whereConfig = {
                ...whereConfig,
                amount: { $gt: amountMin, $lt: amountMax },
            };
        }

        if (amountMinDrop && amountMaxDrop) {
            // set min and max
            whereConfig = {
                ...whereConfig,
                dropGet: { $gt: amountMinDrop, $lt: amountMaxDrop },
            };
        }

        if (amountMinDelivery && amountMaxDropDelivery) {
            // set min and max
            whereConfig = {
                ...whereConfig,
                deliveryBoyGet: {
                    $gt: amountMinDelivery,
                    $lt: amountMaxDropDelivery,
                },
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxId = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const autoTrxId = newQuery.map(str => ({
                autoTrxId: RegExp(str, 'i'),
            }));

            const adminNote = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNote = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));
            const remark = newQuery.map(str => ({
                remark: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: trxId },
                            { $and: autoTrxId },
                            { $and: adminNote },
                            { $and: userNote },
                            { $and: remark },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: Transection,
            condition: whereConfig,
            pagingRange,
        });

        const list = await Transection.find(whereConfig)
            .populate('cardId user admin shop seller deliveryBoy order')
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select();

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                transections: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getDeliveryBoy = async (req, res) => {
//     try {
//         const {
//             page = 1,
//             pageSize = 50,
//             searchKey,
//             sortBy = 'desc',
//             pagingRange = 5,
//             deliveryBoyId,
//             startDate,
//             endDate,
//         } = req.query;

//         let whereConfig = {
//             deletedAt: null,
//             deliveryBoyType: 'dropRider',
//         };

//         if (deliveryBoyId) {
//             whereConfig = {
//                 ...whereConfig,
//                 _id: deliveryBoyId,
//             };
//         }

//         if (searchKey) {
//             const newQuery = searchKey.split(/[ ,]+/);
//             const name = newQuery.map(str => ({
//                 name: RegExp(str, 'i'),
//             }));

//             const email = newQuery.map(str => ({
//                 email: RegExp(str, 'i'),
//             }));

//             const number = newQuery.map(str => ({
//                 number: RegExp(str, 'i'),
//             }));

//             const autoGenIdQ = newQuery.map(str => ({
//                 autoGenId: RegExp(str, 'i'),
//             }));

//             whereConfig = {
//                 ...whereConfig,
//                 $and: [
//                     {
//                         $or: [
//                             { $and: name },
//                             { $and: email },
//                             { $and: number },
//                             { $and: autoGenIdQ },
//                         ],
//                     },
//                 ],
//             };
//         }

//         let paginate = await pagination({
//             page,
//             pageSize,
//             model: DeliveryBoy,
//             condition: whereConfig,
//             pagingRange,
//         });

//         const list = await DeliveryBoy.find(whereConfig)
//             .populate('flags')
//             .sort({ createdAt: sortBy })
//             .skip(paginate.offset)
//             .limit(paginate.limit)
//             .select('-password');

//         const newList = [];

//         // 'deliveryBoyOrderDelivered',
//         // 'deliveryBoyOrderDeliveredCash',
//         // 'deliveryBoyAdminAmountReceivedCash',
//         // 'deliveryBoyAmountSettle',

//         for (const deliveryBoy of list) {
//             let config = {
//                 deliveryBoy: deliveryBoy._id,
//                 orderStatus: 'delivered',
//             };

//             if (startDate) {
//                 config = {
//                     ...config,
//                     createdAt: {
//                         $gte: new Date(startDate),
//                         $lt: new Date(
//                             moment(
//                                 endDate ? new Date(endDate) : new Date()
//                             ).add(1, 'days')
//                         ),
//                     },
//                 };
//             }

//             const totalShopOrder = await Order.count(config);
//             const totalButlerOrder = await Butler.count(config);
//             const totalOrder = totalShopOrder + totalButlerOrder;

//             const adminEarning = await getAdminEarningFromDeliveryBoy(
//                 deliveryBoy._id,
//                 startDate,
//                 endDate
//             );

//             const totalUnSettleAmountFunc = await getDeliveryManUnSettleAmount(
//                 deliveryBoy._id,
//                 startDate,
//                 endDate
//             );
//             const totalUnSettleAmount =
//                 totalUnSettleAmountFunc.totalUnSettleAmount;
//             const secondaryCurrency_totalUnSettleAmount =
//                 totalUnSettleAmountFunc.secondaryCurrency_totalUnSettleAmount;
//             const totalUnSettleRiderTip =
//                 totalUnSettleAmountFunc.totalUnSettleRiderTip;
//             const secondaryCurrency_totalUnSettleRiderTip =
//                 totalUnSettleAmountFunc.secondaryCurrency_totalUnSettleRiderTip;

//             const baseCurrency_unSettleAmountFunc =
//                 await getDeliveryManUnSettleAmount(
//                     deliveryBoy._id,
//                     startDate,
//                     endDate,
//                     'baseCurrency'
//                 );
//             const baseCurrency_unSettleAmount =
//                 baseCurrency_unSettleAmountFunc.totalUnSettleAmount;
//             const baseCurrency_unSettleRiderTip =
//                 baseCurrency_unSettleAmountFunc.totalUnSettleRiderTip;

//             const secondaryCurrency_unSettleAmountFunc =
//                 await getDeliveryManUnSettleAmount(
//                     deliveryBoy._id,
//                     startDate,
//                     endDate,
//                     'secondaryCurrency'
//                 );
//             const secondaryCurrency_unSettleAmount =
//                 secondaryCurrency_unSettleAmountFunc.secondaryCurrency_totalUnSettleAmount;
//             const secondaryCurrency_unSettleRiderTip =
//                 secondaryCurrency_unSettleAmountFunc.secondaryCurrency_totalUnSettleRiderTip;

//             const riderEarningFunc = await getRiderEarning(
//                 deliveryBoy._id,
//                 startDate,
//                 endDate
//             );
//             const riderEarning = riderEarningFunc.riderEarning;

//             const totalProfitRider = totalUnSettleAmount + riderEarning;

//             const totalCashInHandFunc = await getTotalCashInHandRider(
//                 deliveryBoy._id,
//                 startDate,
//                 endDate
//             );
//             const totalCashInHand = totalCashInHandFunc.riderCashInHand;
//             const secondaryCurrency_totalCashInHand =
//                 totalCashInHandFunc.secondaryCurrency_riderCashInHand;

//             const baseCurrency_cashInHandFunc = await getTotalCashInHandRider(
//                 deliveryBoy._id,
//                 startDate,
//                 endDate,
//                 'baseCurrency'
//             );
//             const baseCurrency_cashInHand =
//                 baseCurrency_cashInHandFunc.riderCashInHand;

//             const secondaryCurrency_cashInHandFunc =
//                 await getTotalCashInHandRider(
//                     deliveryBoy._id,
//                     startDate,
//                     endDate,
//                     'secondaryCurrency'
//                 );
//             const secondaryCurrency_cashInHand =
//                 secondaryCurrency_cashInHandFunc.secondaryCurrency_riderCashInHand;

//             const totalDeliveyFee = await getTotalRiderDeliveryFee(
//                 deliveryBoy._id,
//                 startDate,
//                 endDate
//             );

//             const totalCashReceivedFunc =
//                 await getTotalCashReceivedFromDeliveryBoy(
//                     deliveryBoy._id,
//                     startDate,
//                     endDate
//                 );
//             const totalCashReceived =
//                 totalCashReceivedFunc.cashReceivedFromRider;
//             const secondaryCurrency_totalCashReceived =
//                 totalCashReceivedFunc.secondaryCurrency_cashReceivedFromRider;

//             const baseCurrency_cashReceivedFunc =
//                 await getTotalCashReceivedFromDeliveryBoy(
//                     deliveryBoy._id,
//                     startDate,
//                     endDate,
//                     'baseCurrency'
//                 );
//             const baseCurrency_cashReceived =
//                 baseCurrency_cashReceivedFunc.cashReceivedFromRider;

//             const secondaryCurrency_cashReceivedFunc =
//                 await getTotalCashReceivedFromDeliveryBoy(
//                     deliveryBoy._id,
//                     startDate,
//                     endDate,
//                     'secondaryCurrency'
//                 );
//             const secondaryCurrency_cashReceived =
//                 secondaryCurrency_cashReceivedFunc.secondaryCurrency_cashReceivedFromRider;

//             newList.push({
//                 summary: {
//                     totalOrder,
//                     totalDeliveyFee,
//                     adminEarning,
//                     totalUnSettleAmount,
//                     secondaryCurrency_totalUnSettleAmount,
//                     baseCurrency_unSettleAmount,
//                     secondaryCurrency_unSettleAmount,
//                     riderEarning,
//                     settleAmount: riderEarning,
//                     totalProfitRider,
//                     baseCurrency_cashInHand,
//                     secondaryCurrency_cashInHand,
//                     totalCashInHand,
//                     secondaryCurrency_totalCashInHand,
//                     baseCurrency_cashReceived,
//                     secondaryCurrency_cashReceived,
//                     totalCashReceived,
//                     secondaryCurrency_totalCashReceived,
//                     totalUnSettleRiderTip,
//                     secondaryCurrency_totalUnSettleRiderTip,
//                     baseCurrency_unSettleRiderTip,
//                     secondaryCurrency_unSettleRiderTip,
//                 },
//                 ...deliveryBoy._doc,
//             });
//         }

//         successResponse(res, {
//             message: 'Successfully fetched',
//             data: {
//                 deliveryBoy: newList,
//                 paginate,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };

exports.getSingleDeliveryBoy = async (req, res) => {
    try {
        const { deliveryBoyId, startDate, endDate } = req.query;

        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

        if (!deliveryBoy) {
            return errorResponse(res, 'deliveryBoy not found');
        }

        const totalOrder = await Order.count({
            deliveryBoy: deliveryBoy._id,
            orderStatus: {
                $ne: 'cancelled',
            },
        });

        const dropEarning = await getAdminEarningFromDeliveryBoy(
            deliveryBoy._id,
            startDate,
            endDate
        );

        const unSettleAmount = await getDeliveryManUnSettleAmount(
            deliveryBoy._id,
            startDate,
            endDate
        );
        const totalUnSettleAmount = unSettleAmount.totalUnSettleAmount;

        const riderEarningFunc = await getRiderEarning(
            deliveryBoy._id,
            startDate,
            endDate
        );
        const riderEarning = riderEarningFunc.riderEarning;

        const totalProfitRider = totalUnSettleAmount + riderEarning;

        const { riderCashInHand: totalCashInHand } = await getRiderCashInHand({
            riderId: deliveryBoy._id,
            startDate,
            endDate,
        });

        const totalDeliveyFee = await getTotalRiderDeliveryFee(
            deliveryBoy._id,
            startDate,
            endDate
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                summary: {
                    totalOrder,
                    dropEarning,
                    totalUnSettleAmount,
                    riderEarning,
                    totalProfitRider,
                    totalCashInHand,
                    totalDeliveyFee,
                    totalUnSettleRiderTip: unSettleAmount.totalUnSettleRiderTip,
                },
                deliveryBoy: {
                    ...deliveryBoy._doc,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleDeliveryBoyCashOrderList = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            pagingRange = 5,
            deliveryBoyId,
            startDate,
            endDate,
            paidCurrency,
            transactionType,
        } = req.query;

        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

        if (!deliveryBoy) {
            return errorResponse(res, 'deliveryBoy not found');
        }

        let whereConfig = {
            deliveryBoy: deliveryBoyId,
            type: {
                $in: [
                    'deliveryBoyAdminAmountReceivedCash',
                    'deliveryBoyAmountSettle',
                ],
            },
        };

        if (transactionType === 'cash')
            whereConfig = {
                ...whereConfig,
                deliveryBoyHand: true,
                isCashCollected: false,
                type: 'deliveryBoyOrderDeliveredCash',
            };

        if (startDate) {
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

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (paidCurrency) {
            whereConfig = {
                ...whereConfig,
                paidCurrency,
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: Transection,
            condition: whereConfig,
            pagingRange,
        });

        const cashOrderList = await Transection.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('order');

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                cashOrderList: cashOrderList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleDeliveryBoyTransaction = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            pagingRange = 5,
            deliveryBoyId,
            startDate,
            endDate,
        } = req.query;

        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

        if (!deliveryBoy) {
            return errorResponse(res, 'DeliveryBoy not found');
        }

        let whereConfig = {
            deliveryBoy: deliveryBoyId,
            type: {
                $in: [
                    // 'deliveryBoyAdminAmountReceivedCash',
                    // 'deliveryBoyAmountSettle',
                    'adminAddBalanceRider',
                    'adminRemoveBalanceRider',
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

            whereConfig = {
                ...whereConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: Transection,
            condition: whereConfig,
            pagingRange,
        });

        const list = await Transection.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('order adminBy')
            .select('-password');

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                transactions: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.balanceSummery = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const deliveryBoyId = req.deliveryBoyId;

        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

        if (!deliveryBoy) {
            return errorResponse(res, 'deliveryBoy not found');
        }

        const unSettleAmount = await getDeliveryManUnSettleAmount(
            deliveryBoy._id,
            startDate,
            endDate
        );
        const totalUnSettleAmount = unSettleAmount.totalUnSettleAmount;
        const secondaryCurrency_totalUnSettleAmount =
            unSettleAmount.secondaryCurrency_totalUnSettleAmount;

        const riderEarningFunc = await getRiderEarning(
            deliveryBoy._id,
            startDate,
            endDate
        );
        const riderEarning = riderEarningFunc.riderEarning;
        const secondaryCurrency_riderEarning =
            riderEarningFunc.secondaryCurrency_riderEarning;

        const totalProfitRider = totalUnSettleAmount + riderEarning;
        const secondaryCurrency_totalProfitRider =
            secondaryCurrency_totalUnSettleAmount +
            secondaryCurrency_riderEarning;

        const {
            riderCashInHand: totalCashInHand,
            secondaryCurrency_riderCashInHand:
                secondaryCurrency_totalCashInHand,
        } = await getRiderCashInHand({
            riderId: deliveryBoy._id,
            startDate,
            endDate,
        });

        const {
            riderCashInHand: baseCurrency_cashInHand,
            secondaryCurrency_riderCashInHand: secondaryCurrency_cashInHand,
        } = await getRiderActualCashInHand({
            riderId: deliveryBoy._id,
            startDate,
            endDate,
        });

        // Calculate Rider Tip
        const riderTipFunc = await getRiderTip(
            deliveryBoy._id,
            startDate,
            endDate
        );
        const riderTip = riderTipFunc.riderTip;
        const secondaryCurrency_riderTip =
            riderTipFunc.secondaryCurrency_riderTip;

        // Calculate delivery boy active time
        const riderOnlineSummary = await getDeliveryBoyActiveTime(
            deliveryBoy._id,
            startDate,
            endDate
        );

        // Count total orders
        let config = {
            deliveryBoy: ObjectId(deliveryBoyId),
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
        const totalFoodOrders = await Order.count(config);
        const totalButlerOrders = await Butler.count(config);
        const totalOrders = totalFoodOrders + totalButlerOrders;

        // let whereConfig = {
        //     deliveryBoy: deliveryBoy,
        //     type: {
        //         $in: [
        //             'deliveryBoyOrderDeliveredCash',
        //             'deliveryBoyAdminAmountReceivedCash',
        //             'deliveryBoyAmountSettle',
        //         ],
        //     },
        // };

        // if (startDate) {
        //     whereConfig = {
        //         ...whereConfig,
        //         createdAt: {
        //             $gte: new Date(startDate),
        //             $lt: new Date(
        //                 moment(endDate ? new Date(endDate) : new Date()).add(
        //                     1,
        //                     'days'
        //                 )
        //             ),
        //         },
        //     };
        // }

        // const list = await Transection.find(whereConfig)
        //     .select('-password')
        //     .populate('user');

        return successResponse(res, {
            message: 'Successfully fetch',
            data: {
                summery: {
                    totalUnSettleAmount,
                    secondaryCurrency_totalUnSettleAmount,
                    riderEarning,
                    secondaryCurrency_riderEarning,
                    totalProfitRider,
                    secondaryCurrency_totalProfitRider,
                    baseCurrency_cashInHand,
                    secondaryCurrency_cashInHand,
                    totalCashInHand,
                    secondaryCurrency_totalCashInHand,
                    riderTip,
                    secondaryCurrency_riderTip,
                    totalOrders,
                    totalUnSettleRiderTip: unSettleAmount.totalUnSettleRiderTip,
                    secondaryCurrency_totalUnSettleRiderTip:
                        unSettleAmount.secondaryCurrency_totalUnSettleRiderTip,
                },
                riderOnlineSummary,
                // list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.riderEarningsHistory = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            pagingRange = 5,
        } = req.query;
        const deliveryBoyId = req.deliveryBoyId;

        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

        if (!deliveryBoy) {
            return errorResponse(res, 'deliveryBoy not found');
        }

        let whereConfig = {
            deliveryBoy: ObjectId(deliveryBoyId),
            type: {
                $in: ['deliveryBoyAmountSettle'],
            },
        };

        if (startDate) {
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

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: Transection,
            condition: whereConfig,
            pagingRange,
        });

        const list = await Transection.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('order adminBy shop user')
            .select('-password');

        return successResponse(res, {
            message: 'Successfully fetch',
            data: {
                list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.riderTransactionsHistory = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            pagingRange = 5,
        } = req.query;
        const deliveryBoyId = req.deliveryBoyId;

        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);

        if (!deliveryBoy) {
            return errorResponse(res, 'deliveryBoy not found');
        }

        let whereConfig = {
            deliveryBoy: ObjectId(deliveryBoyId),
            type: {
                $in: [
                    'deliveryBoyOrderDeliveredCash',
                    'deliveryBoyAdminAmountReceivedCash',
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

            whereConfig = {
                ...whereConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: Transection,
            condition: whereConfig,
            pagingRange,
        });

        const list = await Transection.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('order adminBy shop user')
            .select('-password');

        return successResponse(res, {
            message: 'Successfully fetch',
            data: {
                list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.shopSettleAmount = async (req, res) => {
    try {
        const {
            shopId,
            amount,
            secondaryCurrency_amount,
            payoutId,
            paidCurrency,
        } = req.body;
        const adminId = req.adminId;

        if (!amount) {
            return errorResponse(res, 'invalid amount');
        }

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return errorResponse(res, 'shop not found');
        }

        // const payout = await PayoutModel.findById(payoutId);
        // if (!payout) {
        //     return errorResponse(res, 'Payout not found');
        // }

        const transactionShop = await Transection.create({
            autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
            account: 'shop',
            type: 'adminSettlebalanceShop',
            status: 'success',
            shop: shop._id,
            seller: shop.seller,
            amount: amount,
            secondaryCurrency_amount: secondaryCurrency_amount,
            adminBy: adminId,
            payout: payoutId,
            paidCurrency: paidCurrency,
            orderType: shop.shopType,
        });

        await PayoutModel.updateOne(
            { _id: payoutId },
            {
                $set: {
                    payoutStatus: 'paid',
                    baseCurrency_payoutPaidAmount: amount,
                    secondaryCurrency_payoutPaidAmount:
                        secondaryCurrency_amount,
                },
            }
        );

        return successResponse(res, {
            message: 'Successfully settled',
            data: {
                transactionShop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.shopAddRemoveAmount = async (req, res) => {
    try {
        const {
            shopId,
            amount,
            secondaryCurrency_amount,
            type,
            desc,
            paidCurrency,
        } = req.body;
        const adminId = req.adminId;
        const shop = await Shop.findById(shopId);

        if (!shopId || !type || !amount) {
            return errorResponse(res, 'shopId, type and amount is required');
        }

        if (!shop) {
            return errorResponse(res, 'shop not found');
        }

        let txnType = '';
        if (type === 'add') {
            txnType = 'adminAddBalanceShop';
        } else if (type === 'remove') {
            txnType = 'adminRemoveBalanceShop';
        }

        const transactionShop = await Transection.create({
            autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
            account: 'shop',
            type: txnType,
            status: 'success',
            shop: shop._id,
            seller: shop.seller,
            amount: amount,
            secondaryCurrency_amount: secondaryCurrency_amount,
            adminBy: adminId,
            desc: desc,
            paidCurrency: paidCurrency,
            orderType: shop.shopType,
        });

        await sendNotificationsForAddRemoveCredit(type, transactionShop);

        successResponse(res, {
            message: 'Successfully completed',
            data: {
                transactionShop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.adminCashReceivedFromDeliveryBoy = async (req, res) => {
    try {
        const { deliveryBoyId, idList } = req.body;
        const adminId = req.adminId;
        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
        let orderId;

        if (!deliveryBoy) {
            return errorResponse(res, 'deliveryBoy not found');
        }

        if (idList.length < 1) {
            return errorResponse(res, 'select minimum 1 id');
        }

        let totalAmount = 0;
        let secondaryCurrency_totalAmount = 0;
        let paidCurrency;

        for (const transactionId of idList) {
            const transection = await Transection.findOne({
                _id: transactionId,
                deliveryBoyHand: true,
            });

            orderId = transection.order;
            if (transection) {
                paidCurrency = transection.paidCurrency;

                totalAmount = totalAmount + transection.receivedAmount;
                secondaryCurrency_totalAmount =
                    secondaryCurrency_totalAmount +
                    transection.secondaryCurrency_receivedAmount;

                await Transection.updateOne(
                    {
                        _id: transactionId,
                    },
                    {
                        isCashCollected: true,
                    }
                );
            }
        }
        const transactionDeliveryBoy = await Transection.create({
            autoTrxId: `${moment().format('DDMMYYHmm')}${short().new()}`,
            account: 'deliveryBoy',
            type: 'deliveryBoyAdminAmountReceivedCash',
            status: 'success',
            deliveryBoy: deliveryBoy._id,
            amount: totalAmount,
            secondaryCurrency_amount: secondaryCurrency_totalAmount,
            adminBy: adminId,
            order: orderId,
            paidCurrency: paidCurrency,
        });

        successResponse(res, {
            message: 'Successfully completed',
            data: {},
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.adminMakePaymentDeliveryBoy = async (req, res) => {
    try {
        const {
            deliveryBoyId,
            amount,
            secondaryCurrency_amount,
            riderTip,
            secondaryCurrency_riderTip,
            payoutId,
            paidCurrency,
        } = req.body;
        const adminId = req.adminId;

        const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
        if (!deliveryBoy) {
            return errorResponse(res, 'deliveryBoy not found');
        }

        // const payout = await PayoutModel.findById(payoutId);
        // if (!payout) {
        //     return errorResponse(res, 'Payout not found');
        // }

        const transactionDeliveryBoy = await Transection.create({
            autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
            account: 'deliveryBoy',
            type: 'deliveryBoyAmountSettle',
            status: 'success',
            deliveryBoy: deliveryBoy._id,
            amount: amount,
            secondaryCurrency_amount: secondaryCurrency_amount,
            adminBy: adminId,
            payout: payoutId,
            riderTip: riderTip,
            secondaryCurrency_riderTip: secondaryCurrency_riderTip,
            paidCurrency: paidCurrency,
        });

        await PayoutModel.updateOne(
            { _id: payoutId },
            {
                $set: {
                    payoutStatus: 'paid',
                    baseCurrency_payoutPaidAmount: amount,
                    secondaryCurrency_payoutPaidAmount:
                        secondaryCurrency_amount,
                },
            }
        );

        successResponse(res, {
            message: 'Successfully completed',
            data: {
                transactionDeliveryBoy,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.riderAddRemoveAmount = async (req, res) => {
    try {
        const {
            riderId,
            baseCurrency_amount,
            secondaryCurrency_amount,
            type,
            desc,
            paidCurrency,
        } = req.body;

        const adminId = req.adminId;

        if (!riderId || !type || !baseCurrency_amount) {
            return errorResponse(res, 'shopId, type and amount is required');
        }

        const rider = await DeliveryBoy.findById(riderId);
        if (!rider) {
            return errorResponse(res, 'rider not found');
        }

        let txnType = '';
        if (type === 'add') {
            txnType = 'adminAddBalanceRider';
        } else if (type === 'remove') {
            txnType = 'adminRemoveBalanceRider';
        }

        const transactionRider = await Transection.create({
            autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
            account: 'deliveryBoy',
            type: txnType,
            status: 'success',
            deliveryBoy: rider._id,
            amount: baseCurrency_amount,
            secondaryCurrency_amount: secondaryCurrency_amount,
            adminBy: adminId,
            desc: desc,
            paidCurrency: paidCurrency,
        });

        await sendNotificationsForAddRemoveCredit(type, transactionRider);

        successResponse(res, {
            message: 'Successfully completed',
            data: {
                transactionRider,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getAdminEarning = async (
    type = 'shop',
    id,
    startDate,
    endDate,
    paidCurrency
) => {
    let commonConfig = {};

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (type === 'shop') {
        commonConfig = {
            ...commonConfig,
            shop: ObjectId(id),
        };
    }
    if (type === 'seller') {
        commonConfig = {
            ...commonConfig,
            seller: ObjectId(id),
        };
    }

    let config = {
        ...commonConfig,
        account: 'shop',
        status: 'success',
        type: {
            $in: ['sellerGetPaymentFromOrder', 'sellerGetPaymentFromOrderCash'],
        },
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
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const adminChargeSellerQuery = await Transection.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: {
                    $sum: {
                        $sum: [
                            '$adminCharge.baseCurrency_adminChargeFromOrder',
                        ],
                    },
                },
                secondaryCurrency_amount: {
                    $sum: {
                        $sum: [
                            '$adminCharge.secondaryCurrency_adminChargeFromOrder',
                        ],
                    },
                },
                // couponAmount: {
                //     $sum: {
                //         $sum: ['$summary.baseCurrency_couponDiscountAmount'],
                //     },
                // },
                couponAmount: {
                    $sum: {
                        $sum: ['$baseCurrency_couponDiscountAmount'],
                    },
                },
                secondaryCurrency_couponAmount: {
                    $sum: {
                        $sum: ['$secondaryCurrency_couponDiscountAmount'],
                    },
                },
            },
        },
    ]);

    const adminGet01 =
        adminChargeSellerQuery.length > 0
            ? adminChargeSellerQuery[0].amount
            : 0;
    const secondaryCurrency_adminGet01 =
        adminChargeSellerQuery.length > 0
            ? adminChargeSellerQuery[0].secondaryCurrency_amount
            : 0;
    const adminGetCouponAmount =
        adminChargeSellerQuery.length > 0
            ? adminChargeSellerQuery[0].couponAmount
            : 0;
    const secondaryCurrency_adminGetCouponAmount =
        adminChargeSellerQuery.length > 0
            ? adminChargeSellerQuery[0].secondaryCurrency_couponAmount
            : 0;

    let config1 = {
        ...commonConfig,
        account: 'shop',
        status: 'success',
        type: {
            $in: ['adminRemoveBalanceShop'],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        config1 = {
            ...config1,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const adminChargeSellerQueryAnother = await Transection.aggregate([
        {
            $match: config1,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: {
                    $sum: { $sum: ['$amount'] },
                },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const adminGet02 =
        adminChargeSellerQueryAnother.length > 0
            ? adminChargeSellerQueryAnother[0].amount
            : 0;
    const secondaryCurrency_adminGet02 =
        adminChargeSellerQueryAnother.length > 0
            ? adminChargeSellerQueryAnother[0].secondaryCurrency_amount
            : 0;

    let config2 = {
        ...commonConfig,
        account: 'shop',
        status: 'success',
        type: {
            $in: ['adminAddBalanceShop', 'sellerGetPaymentFromOrderRefused'],
        },
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
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const adminGetFromSellerRemoveQuery = await Transection.aggregate([
        {
            $match: config2,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const adminGetFromSellerRemove =
        adminGetFromSellerRemoveQuery.length > 0
            ? adminGetFromSellerRemoveQuery[0].amount
            : 0;
    const secondaryCurrency_adminGetFromSellerRemove =
        adminGetFromSellerRemoveQuery.length > 0
            ? adminGetFromSellerRemoveQuery[0].secondaryCurrency_amount
            : 0;

    const totalAdminGet =
        adminGet01 +
        adminGet02 +
        adminGetCouponAmount -
        adminGetFromSellerRemove;
    const secondaryCurrency_totalAdminGet =
        secondaryCurrency_adminGet01 +
        secondaryCurrency_adminGet02 +
        secondaryCurrency_adminGetCouponAmount -
        secondaryCurrency_adminGetFromSellerRemove;

    return { totalAdminGet, secondaryCurrency_totalAdminGet };
};

const getTotalRiderTip = async (type = 'shop', id, startDate, endDate) => {
    let totalValueConfig = {
        orderFor: 'specific',
        orderStatus: 'delivered',
        paymentMethod: {
            $nin: ['cash'],
        },
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
                riderTip: {
                    $sum: { $sum: ['$summary.baseCurrency_riderTip'] },
                },
            },
        },
    ]);

    if (totalValue.length < 1) {
        totalValue.push({
            riderTip: 0,
        });
    }

    return totalValue[0].riderTip;
};

// const getDropEarningFromSeller = async (sellerId, startDate, endDate) => {
//     let config = {
//         seller: ObjectId(sellerId),
//         account: 'shop',
//         status: 'success',
//         type: {
//             $in: ['sellerGetPaymentFromOrder', 'sellerGetPaymentFromOrderCash'],
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

//     const dropChargeSellerQuery = await Transection.aggregate([
//         {
//             $match: config,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: {
//                     $sum: { $sum: ['$adminCharge.baseCurrency_adminChargeFromOrder'] },
//                 },
//             },
//         },
//     ]);

//     const dropGet01 =
//         dropChargeSellerQuery.length > 0 ? dropChargeSellerQuery[0].amount : 0;

//     let dropChargeConfig = {
//         seller: ObjectId(sellerId),
//         account: 'shop',
//         status: 'success',
//         type: {
//             $in: ['adminRemoveBalanceShop'],
//         },
//     };

//     if (startDate) {
//         dropChargeConfig = {
//             ...dropChargeConfig,
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

//     const dropChargeSellerQueryAnother = await Transection.aggregate([
//         {
//             $match: dropChargeConfig,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: {
//                     $sum: { $sum: ['$amount'] },
//                 },
//             },
//         },
//     ]);

//     const dropGet02 =
//         dropChargeSellerQueryAnother.length > 0
//             ? dropChargeSellerQueryAnother[0].amount
//             : 0;

//     let dropGerConfig = {
//         seller: ObjectId(sellerId),
//         account: 'shop',
//         status: 'success',
//         type: {
//             $in: ['adminAddBalanceShop'],
//         },
//     };

//     if (startDate) {
//         dropGerConfig = {
//             ...dropGerConfig,
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

//     const dropGetFromSellerRemoveQuery = await Transection.aggregate([
//         {
//             $match: dropGerConfig,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 anount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     const dropGetFromSellerRemove =
//         dropGetFromSellerRemoveQuery.length > 0
//             ? dropGetFromSellerRemoveQuery[0].anount
//             : 0;

//     let config3 = {
//         seller: ObjectId(sellerId),
//         account: 'admin',
//         status: 'success',
//         type: {
//             $in: ['dropRemovePercentage'],
//         },
//     };

//     if (startDate) {
//         config3 = {
//             ...config3,
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

//     const dropGetFromSellerRemoveQuery2 = await Transection.aggregate([
//         {
//             $match: config3,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 anount: { $sum: { $sum: ['$dropGetFromShop'] } },
//             },
//         },
//     ]);

//     const dropGetFromSellerRemove2 =
//         dropGetFromSellerRemoveQuery2.length > 0
//             ? dropGetFromSellerRemoveQuery2[0].anount
//             : 0;

//     let config4 = {
//         seller: ObjectId(sellerId),
//         account: 'shop',
//         status: 'success',
//         type: {
//             $in: ['sellerGetPaymentFromOrderRefused'],
//         },
//     };

//     if (startDate) {
//         config4 = {
//             ...config4,
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

//     const dropGetFromSellerRemoveQuery4 = await Transection.aggregate([
//         {
//             $match: config4,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 anount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     const dropGetFromSellerRemove4 = dropGetFromSellerRemoveQuery4[0]
//         ? dropGetFromSellerRemoveQuery4[0].anount
//         : 0;

//     const toalDropEarningFromSeller = dropGet01 + dropGet02;
//     const totalDropGet =
//         toalDropEarningFromSeller -
//         (dropGetFromSellerRemove +
//             dropGetFromSellerRemove2 +
//             dropGetFromSellerRemove4);

//     return totalDropGet;
// };

// const getSellerEarning = async (sellerId, startDate, endDate) => {
//     let sellerEarningConfig = {
//         seller: ObjectId(sellerId),
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
//         sellerEarningConfig = {
//             ...sellerEarningConfig,
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
//             $match: sellerEarningConfig,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     const sellerEarningAdd =
//         sellerEarningAddQuery.length > 0 ? sellerEarningAddQuery[0].amount : 0;

//     let sellerEarningRemoveConfig = {
//         seller: ObjectId(sellerId),
//         account: 'shop',
//         type: {
//             $in: ['adminRemoveBalanceShop', 'shopProfileRemoveCash'],
//         },
//     };

//     if (startDate) {
//         sellerEarningRemoveConfig = {
//             ...sellerEarningRemoveConfig,
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
//             $match: sellerEarningRemoveConfig,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     const sellerEarningRemove =
//         sellerEarningRemoveQuery.length > 0
//             ? sellerEarningRemoveQuery[0].amount
//             : 0;

//     const totalShopEarning = sellerEarningAdd - sellerEarningRemove;

//     return totalShopEarning;
// };

// const getSellerTotalUnSettleAmount = async (sellerId, startDate, endDate) => {
//     let sellerUnsettleConfig = {
//         seller: ObjectId(sellerId),
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
//         sellerUnsettleConfig = {
//             ...sellerUnsettleConfig,
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
//             $match: sellerUnsettleConfig,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     const sellerUnsettleAdd =
//         sellerUnsettleAddQuery.length > 0
//             ? sellerUnsettleAddQuery[0].amount
//             : 0;

//     let sellerUnsettleRemoveConfig = {
//         seller: ObjectId(sellerId),
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
//         sellerUnsettleRemoveConfig = {
//             ...sellerUnsettleRemoveConfig,
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
//             $match: sellerUnsettleRemoveConfig,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 amount: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     const sellerUnsettleRemove =
//         sellerUnsettleRemoveQuery.length > 0
//             ? sellerUnsettleRemoveQuery[0].amount
//             : 0;

//     // For Vat
//     let configForVat = {
//         seller: ObjectId(sellerId),
//         orderStatus: 'delivered',
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
//                 count: { $sum: 1 },
//             },
//         },
//     ]);

//     const sellerVatAdd = sellerVatAddQuery[0] ? sellerVatAddQuery[0].amount : 0;

//     // let configForVat2 = {
//     //     seller: ObjectId(sellerId),
//     //     orderFor: 'specific',
//     //     paymentMethod: 'cash',
//     //     orderStatus: 'delivered',
//     //     // $and: [
//     //     //     { orderFor: 'specific' },
//     //     //     {
//     //     //         paymentMethod: 'cash',
//     //     //     },
//     //     //     {
//     //     //         orderStatus: {
//     //     //             $nin: ['cancelled', 'placed', 'refused', 'schedule'],
//     //     //         },
//     //     //     },
//     //     // ],
//     // };

//     // if (startDate) {
//     //     configForVat2 = {
//     //         ...configForVat2,
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

//     // const sellerVatRemoveQuery = await Order.aggregate([
//     //     {
//     //         $match: configForVat2,
//     //     },
//     //     {
//     //         $group: {
//     //             _id: '',
//     //             amount: {
//     //                 $sum: { $sum: ['$vatAmount.baseCurrency_vatForAdmin'] },
//     //             },
//     //             count: { $sum: 1 },
//     //         },
//     //     },
//     // ]);

//     // const sellerVatRemove = sellerVatRemoveQuery[0]
//     //     ? sellerVatRemoveQuery[0].amount
//     //     : 0;

//     const totalSellerUnsettle =
//         sellerUnsettleAdd + sellerVatAdd - sellerUnsettleRemove;
//     // -
//     // sellerVatRemove;
//     return totalSellerUnsettle;
// };

const getAdminEarningFromDeliveryBoy = async (
    deliveryBoyId,
    startDate,
    endDate
) => {
    let config = {
        deliveryBoy: ObjectId(deliveryBoyId),
        account: 'deliveryBoy',
        status: 'success',
        type: {
            $in: [
                'deliveryBoyOrderDelivered',
                'deliveryBoyAdminAmountReceivedCash',
                'deliveryBoyOrderDeliveredCash',
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

        config = {
            ...config,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const dropEarningQuery = await Transection.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$dropGetFromDeliveryBoy'] } },
            },
        },
    ]);

    const dropEarnFromdeliveryBoy = dropEarningQuery[0]
        ? dropEarningQuery[0].amount
        : 0;

    let configRemove = {
        deliveryBoy: ObjectId(deliveryBoyId),
        account: 'deliveryBoy',
        status: 'success',
        type: {
            $in: ['deliveryBoyOrderRefuse'],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configRemove = {
            ...configRemove,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const dropEarningQueryRemove = await Transection.aggregate([
        {
            $match: configRemove,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$dropGetFromDeliveryBoy'] } },
            },
        },
    ]);

    const dropEarnRemoveFromdeliveryBoy = dropEarningQueryRemove[0]
        ? dropEarningQueryRemove[0].amount
        : 0;

    let configRemove3 = {
        deliveryBoy: ObjectId(deliveryBoyId),
        account: 'deliveryBoy',
        status: 'success',
        type: {
            $in: ['deliveryBoyOrderDeliveredCashRefused'],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configRemove3 = {
            ...configRemove3,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const dropEarningQueryRemove3 = await Transection.aggregate([
        {
            $match: configRemove3,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
            },
        },
    ]);

    const dropEarnRemoveFromdeliveryBoy3 = dropEarningQueryRemove3[0]
        ? dropEarningQueryRemove3[0].amount
        : 0;

    return (
        dropEarnFromdeliveryBoy -
        dropEarnRemoveFromdeliveryBoy -
        dropEarnRemoveFromdeliveryBoy3
    );
};

const getRiderEarning = async (deliveryBoyId, startDate, endDate) => {
    let config = {
        deliveryBoy: ObjectId(deliveryBoyId),
        account: 'deliveryBoy',
        status: 'success',
        type: {
            $in: ['deliveryBoyAmountSettle'],
        },
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
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const riderEarningQuery = await Transection.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const riderEarning = riderEarningQuery[0] ? riderEarningQuery[0].amount : 0;
    const secondaryCurrency_riderEarning = riderEarningQuery[0]
        ? riderEarningQuery[0].secondaryCurrency_amount
        : 0;

    return { riderEarning, secondaryCurrency_riderEarning };
};

const getRiderTip = async (deliveryBoyId, startDate, endDate) => {
    let config = {
        deliveryBoy: ObjectId(deliveryBoyId),
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

    const riderTipQuery = await Order.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$summary.baseCurrency_riderTip'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$summary. secondaryCurrency_riderTip'] },
                },
            },
        },
    ]);

    const riderTip = riderTipQuery.length ? riderTipQuery[0].amount : 0;
    const secondaryCurrency_riderTip = riderTipQuery.length
        ? riderTipQuery[0].secondaryCurrency_amount
        : 0;

    return { riderTip, secondaryCurrency_riderTip };
};

const getTotalRiderDeliveryFee = async (deliveryBoyId, startDate, endDate) => {
    let config = {
        deliveryBoy: ObjectId(deliveryBoyId),
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

    const totalShopRiderFeeQ = await Order.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: {
                    $sum: {
                        $sum: [
                            '$summary.baseCurrency_riderFeeWithFreeDelivery',
                        ],
                    },
                },
            },
        },
    ]);
    const totalShopRiderFee = totalShopRiderFeeQ[0]
        ? totalShopRiderFeeQ[0].amount
        : 0;

    const totalButlerRiderFeeQ = await Butler.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$summary.baseCurrency_riderFee'] } },
            },
        },
    ]);

    const totalButlerRiderFee = totalButlerRiderFeeQ[0]
        ? totalButlerRiderFeeQ[0].amount
        : 0;

    return totalShopRiderFee + totalButlerRiderFee;
};

const getTotalCashReceivedFromDeliveryBoy = async (
    deliveryBoyId,
    startDate,
    endDate,
    paidCurrency
) => {
    let config = {
        deliveryBoy: ObjectId(deliveryBoyId),
        account: 'deliveryBoy',
        status: 'success',
        type: {
            $in: ['deliveryBoyAdminAmountReceivedCash'],
        },
    };

    if (paidCurrency) {
        config = {
            ...config,
            paidCurrency,
        };
    }

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

    const query = await Transection.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                amount: { $sum: { $sum: ['$amount'] } },
                secondaryCurrency_amount: {
                    $sum: { $sum: ['$secondaryCurrency_amount'] },
                },
            },
        },
    ]);

    const cashReceivedFromRider = query[0] ? query[0].amount : 0;
    const secondaryCurrency_cashReceivedFromRider = query[0]
        ? query[0].secondaryCurrency_amount
        : 0;

    return { cashReceivedFromRider, secondaryCurrency_cashReceivedFromRider };
};

exports.getTotalDropEarningFromSeller = async (req, res) => {
    try {
        const query = await Transection.aggregate([
            {
                $match: {
                    seller: ObjectId('62e4153712b3fd69801dcc8d'),
                    status: 'success',

                    createdAt: {
                        $gte: new Date('2022-09-20'),
                        $lt: new Date('2022-09-21'),
                    },
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

        const result = query[0] ? query[0].amount : 0;
        res.json({
            result,
        });
    } catch (err) {
        console.log(err);
    }
};

/********** Vat Details Function for Admin **********/
exports.getAdminVatDetails = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            tnxFilter,
        } = req.body;

        // tnxFilter
        const {
            adminBy,
            type = ['VatAmountSettleByAdmin'],
            searchKey,
            amountBy = 'desc',
            amountRange,
            amountRangeType,
            startDate,
            endDate,
        } = tnxFilter;

        const totalUnsettleVat = await totalUnsettleVatCal(startDate, endDate);
        const totalVat = await totalVatCal(startDate, endDate);

        let whereConfig = {
            account: 'admin',
            status: 'success',
            type: {
                $in: type,
            },
        };

        if (amountRange) {
            if (amountRangeType === '>') {
                whereConfig = {
                    ...whereConfig,
                    amount: {
                        $gt: amountRange,
                    },
                };
            } else if (amountRangeType === '<') {
                whereConfig = {
                    ...whereConfig,
                    amount: {
                        $lt: amountRange,
                    },
                };
            } else if (amountRangeType === '=') {
                whereConfig = {
                    ...whereConfig,
                    amount: amountRange,
                };
            }
        }

        if (adminBy) {
            const admins = await AdminModel.findById(adminBy);
            // console.log(admins);
            if (!admins) {
                return errorResponse(
                    res,
                    'admin not found for filter . please give valid admin or empty'
                );
            }
            whereConfig = {
                ...whereConfig,
                adminBy: adminBy,
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const autoTrxIdSearchQuery = newQuery.map(str => ({
                autoTrxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: autoTrxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (startDate) {
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

        let paginate = await pagination({
            page,
            pageSize,
            model: Transection,
            condition: whereConfig,
            pagingRange,
        });

        const list = await Transection.find(whereConfig)
            .sort({ amount: amountBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('adminBy');

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                summary: {
                    totalUnsettleVat,
                    totalVat,
                },
                transactions: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

/********** Vat Calculation For Admin **********/
const totalUnsettleVatCal = async (startDate, endDate, query) => {
    const totalVatAmount = await totalVatCal(startDate, endDate);

    let configSettleVat = {
        account: 'admin',
        status: 'success',
        type: {
            $in: ['VatAmountSettleByAdmin'],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configSettleVat = {
            ...configSettleVat,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const totalSettleVat = await Transection.aggregate([
        {
            $match: configSettleVat,
        },
        {
            $group: {
                _id: '',
                amount: { $sum: { $sum: ['$amount'] } },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalSettleVatAmount = totalSettleVat[0]
        ? totalSettleVat[0].amount
        : 0;

    return totalVatAmount - totalSettleVatAmount;
};

const totalVatCal = async (startDate, endDate, query) => {
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

    const totalVat = await Order.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                amount: {
                    $sum: { $sum: ['$vatAmount.baseCurrency_vatForAdmin'] },
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalVatAmount = totalVat[0] ? totalVat[0].amount : 0;

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

    const totalVatForButler = await Butler.aggregate([
        {
            $match: configForButler,
        },
        {
            $group: {
                _id: '',
                amount: { $sum: { $sum: ['$summary.baseCurrency_vat'] } },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalVatAmountForButler = totalVatForButler[0]
        ? totalVatForButler[0].amount
        : 0;

    let configRefundVatAdd = {
        type: {
            $in: ['DropGetFromRefund'],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configRefundVatAdd = {
            ...configRefundVatAdd,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    if (query) {
        configRefundVatAdd = {
            ...configRefundVatAdd,
            ...query,
        };
    }

    const totalRefundVatAddQuery = await Transection.aggregate([
        {
            $match: configRefundVatAdd,
        },
        {
            $group: {
                _id: '',
                amount: { $sum: { $sum: ['$vat'] } },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalRefundVatAmount = totalRefundVatAddQuery[0]
        ? totalRefundVatAddQuery[0].amount
        : 0;

    let configRefundVatMinus = {
        type: {
            $in: ['refundedAfterDeliveredOrderAdminCut'],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configRefundVatMinus = {
            ...configRefundVatMinus,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    if (query) {
        configRefundVatMinus = {
            ...configRefundVatMinus,
            ...query,
        };
    }

    const totalRefundVatMinusQuery = await Transection.aggregate([
        {
            $match: configRefundVatMinus,
        },
        {
            $group: {
                _id: '',
                amount: { $sum: { $sum: ['$vat'] } },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalRefundVatMinusAmount = totalRefundVatMinusQuery[0]
        ? totalRefundVatMinusQuery[0].amount
        : 0;

    return (
        totalVatAmount +
        totalVatAmountForButler +
        totalRefundVatAmount -
        totalRefundVatMinusAmount
    );
};

/********** Vat Details Function for Shop **********/
exports.getSingleShopVatDetails = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            shopId,
            tnxFilter,
        } = req.body;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return errorResponse(res, {
                message: 'Shop not found',
            });
        }

        // tnxFilter
        const {
            type = ['VatAmountSettleByShop'],
            searchKey,
            amountBy = 'desc',
            amountRange,
            amountRangeType,
            startDate,
            endDate,
        } = tnxFilter;

        const totalUnsettleVatForShop = await getShopTotalUnsettleVat(
            shop._id,
            startDate,
            endDate
        );
        const totalVatForShop = await getShopTotalVat(
            shop._id,
            startDate,
            endDate
        );

        let whereConfig = {
            shop: ObjectId(shopId),
            account: 'shop',
            status: 'success',
            type: {
                $in: type,
            },
        };

        if (amountRange) {
            if (amountRangeType === '>') {
                whereConfig = {
                    ...whereConfig,
                    amount: {
                        $gt: amountRange,
                    },
                };
            } else if (amountRangeType === '<') {
                whereConfig = {
                    ...whereConfig,
                    amount: {
                        $lt: amountRange,
                    },
                };
            } else if (amountRangeType === '=') {
                whereConfig = {
                    ...whereConfig,
                    amount: amountRange,
                };
            }
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const autoTrxIdSearchQuery = newQuery.map(str => ({
                autoTrxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: autoTrxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (startDate) {
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

        let paginate = await pagination({
            page,
            pageSize,
            model: Transection,
            condition: whereConfig,
            pagingRange,
        });

        const list = await Transection.find(whereConfig)
            .sort({ amount: amountBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('shop');

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                summary: {
                    totalUnsettleVatForShop,
                    totalVatForShop,
                },
                shop: {
                    ...shop._doc,
                },
                transactions: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

/********** Vat Calculation For Shop **********/
const getShopTotalUnsettleVat = async (shopId, startDate, endDate) => {
    let config = {
        shop: ObjectId(shopId),
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

    const totalVat = await Order.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                amount: {
                    $sum: { $sum: ['$vatAmount.baseCurrency_vatForShop'] },
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalVatAmount = totalVat[0] ? totalVat[0].amount : 0;

    let configSettleVat = {
        shop: ObjectId(shopId),
        account: 'shop',
        status: 'success',
        type: {
            $in: ['VatAmountSettleByShop'],
        },
    };

    if (startDate) {
        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        configSettleVat = {
            ...configSettleVat,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    const totalSettleVat = await Transection.aggregate([
        {
            $match: configSettleVat,
        },
        {
            $group: {
                _id: '',
                amount: { $sum: { $sum: ['$amount'] } },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalSettleVatAmount = totalSettleVat[0]
        ? totalSettleVat[0].amount
        : 0;

    return totalVatAmount - totalSettleVatAmount;
};
const getShopTotalVat = async (shopId, startDate, endDate) => {
    let config = {
        shop: ObjectId(shopId),
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

    const totalVat = await Order.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                amount: {
                    $sum: { $sum: ['$vatAmount.baseCurrency_vatForShop'] },
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalVatAmount = totalVat[0] ? totalVat[0].amount : 0;

    return totalVatAmount;
};

/********** Vat Settle Function for Admin **********/
exports.settleVatByAdmin = async (req, res) => {
    try {
        const { amount, startDate, endDate } = req.body;
        const adminId = req.adminId;

        if (!startDate || !endDate) {
            return errorResponse(res, {
                message: 'startDate and endDate must be required',
            });
        }

        const totalUnsettleVat = await totalUnsettleVatCal(startDate, endDate);
        if (totalUnsettleVat < amount) {
            return errorResponse(res, {
                message: 'Can not pay more than unpaid amount',
            });
        }

        const transaction = await Transection.create({
            autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
            account: 'admin',
            type: 'VatAmountSettleByAdmin',
            status: 'success',
            amount: amount,
            admin: adminId,
            adminBy: adminId,
            VatPaidDate: {
                From: new Date(startDate),
                To: new Date(endDate),
            },
        });

        successResponse(res, {
            message: 'Successfully completed',
            data: {
                transaction,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

/********** Vat Settle Function for Shop **********/
exports.settleVatByShop = async (req, res) => {
    try {
        const { amount, startDate, endDate } = req.body;
        const shopId = req.shopId;

        if (!startDate || !endDate) {
            return errorResponse(res, {
                message: 'startDate and endDate must be required',
            });
        }

        const transaction = await Transection.create({
            autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
            account: 'shop',
            type: 'VatAmountSettleByShop',
            status: 'success',
            amount: amount,
            shop: shopId,
            VatPaidDate: {
                From: new Date(startDate),
                To: new Date(endDate),
            },
        });

        successResponse(res, {
            message: 'Successfully completed',
            data: {
                transaction,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

/********** Lyxa pay wallet feature **********/
exports.topUpAdminWalletFromEarning = async (req, res) => {
    try {
        const { amount, secondaryCurrency_amount } = req.body;
        const adminId = req.adminId;

        const dropWallet = await getDropBalance();

        // if (dropWallet < amount) return errorResponse(res, 'Due to lower Lyxa profit, credit cannot be added.');

        const transaction = await Transection.create({
            autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
            account: 'admin',
            type: 'topUpAdminWallet',
            amount: amount,
            secondaryCurrency_amount: secondaryCurrency_amount,
            status: 'success',
            adminBy: adminId,
            paidCurrency: 'baseCurrency',
        });

        successResponse(res, {
            message: 'Successfully completed',
            data: {
                transaction,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAdminWalletCurrentBalance = async (req, res) => {
    try {
        let {
            availableBalance: balance,
            secondaryCurrency_availableBalance: secondaryCurrency_balance,
        } = await getAdminWalletBalance();

        successResponse(res, {
            message: 'success',
            data: {
                balance,
                secondaryCurrency_balance,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
