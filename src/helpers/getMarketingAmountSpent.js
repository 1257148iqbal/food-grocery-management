const MarketingModel = require('../models/MarketingModel');
const OrderModel = require('../models/OrderModel');
const moment = require('moment');
const UserPunchMarketingModel = require('../models/UserPunchMarketingModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.getMarketingAmountSpent = async (marketingId, startDate, endDate) => {
    const marketing = await MarketingModel.findById(marketingId);

    let orderConfig = {
        shop: ObjectId(marketing.shop),
        marketings: {
            $in: [ObjectId(marketing._id)],
        },
        orderStatus: 'delivered',
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
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };
    }

    let amountSpent = 0;
    if (marketing.type === 'percentage') {
        let sumOfAmountSpent = [];

        if (marketing.creatorType === 'admin') {
            sumOfAmountSpent = await OrderModel.aggregate([
                {
                    $match: orderConfig,
                },
                {
                    $group: {
                        _id: '',
                        amount: {
                            $sum: {
                                $sum: [
                                    '$discountCut.baseCurrency_discountAdminCut',
                                ],
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
            ]);
        } else {
            sumOfAmountSpent = await OrderModel.aggregate([
                {
                    $match: orderConfig,
                },
                {
                    $group: {
                        _id: '',
                        amount: {
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
        }

        amountSpent = sumOfAmountSpent[0] ? sumOfAmountSpent[0].amount : 0;
    }

    if (marketing.type === 'double_menu') {
        const sumOfOrderDoubleMenuCut = await OrderModel.aggregate([
            {
                $match: orderConfig,
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

        if (marketing.creatorType === 'admin') {
            amountSpent = adminCutForDoubleMenu;
        } else {
            amountSpent = shopCutForDoubleMenu;
        }
    }

    if (marketing.type === 'free_delivery') {
        const lossForFreeDeliveryQ = await OrderModel.aggregate([
            {
                $match: orderConfig,
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

        const totalAdminLossForFreeDelivery = lossForFreeDeliveryQ[0]
            ? lossForFreeDeliveryQ[0].adminLossForFreeDelivery
            : 0;
        const totalShopLossForFreeDelivery = lossForFreeDeliveryQ[0]
            ? lossForFreeDeliveryQ[0].shopLossForFreeDelivery
            : 0;

        if (marketing.creatorType === 'admin') {
            amountSpent = totalAdminLossForFreeDelivery;
        } else {
            amountSpent = totalShopLossForFreeDelivery;
        }
    }

    if (marketing.type === 'reward') {
        const sumOfOrderReward = await OrderModel.aggregate([
            {
                $match: orderConfig,
            },
            {
                $group: {
                    _id: '',
                    shopCut: {
                        $sum: {
                            $sum: ['$rewardRedeemCut.rewardShopCut'],
                        },
                    },
                    adminCut: {
                        $sum: {
                            $sum: ['$rewardRedeemCut.rewardAdminCut'],
                        },
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

        if (marketing.creatorType === 'admin') {
            amountSpent = totalSumOfOrderRewardAdminCut;
        } else {
            amountSpent = totalSumOfOrderRewardShopCut;
        }
    }

    if (marketing.type === 'featured') {
        amountSpent = marketing.featuredAmount;
    }

    if (marketing.type === 'punch_marketing') {
        let punchMarketingConfig = {
            shop: ObjectId(marketing.shop),
            marketing: ObjectId(marketing._id),
            status: 'applied',
        };

        if (startDate) {
            punchMarketingConfig = {
                ...punchMarketingConfig,
                appliedAt: {
                    $gte: new Date(startDate),
                    $lt: new Date(
                        moment(endDate ? new Date(endDate) : new Date()).add(
                            1,
                            'days'
                        )
                    ),
                },
            };
        }

        const punchMarketingSpentQ = await UserPunchMarketingModel.aggregate([
            {
                $match: punchMarketingConfig,
            },
            {
                $group: {
                    _id: '',
                    amount: {
                        $sum: {
                            $sum: [
                                '$baseCurrency_punchMarketingDiscountAmount',
                            ],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
        ]);

        const punchMarketingSpent = punchMarketingSpentQ[0]
            ? punchMarketingSpentQ[0].amount
            : 0;

        amountSpent = punchMarketingSpent;
    }

    return amountSpent;
};
