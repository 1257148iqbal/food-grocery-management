const OrderModel = require('../models/OrderModel');
const ShopModel = require('../models/ShopModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.avgOrderTimeAfterDelivery = async (shopId) => {

    const pipeline = [
        {
            $match: {
                shop: ObjectId(shopId),
                orderStatus: 'delivered',
            },
        },
        {
            $group: {
                _id: null,
                totalDeliveryTime: { $sum: '$deliveredMinutes' },
                totalOrders: { $sum: 1 },
                orderAmount: {
                    $sum: '$summary.baseCurrency_productAmount',
                },
            },
        },
        {
            $project: {
                avgOrderDeliveryTime: {
                    $cond: {
                        if: { $gt: ['$totalOrders', 0] },
                        then: {
                            $divide: ['$totalDeliveryTime', '$totalOrders'],
                        },
                        else: 30, // Default value if there are no orders
                    },
                },
                avgOrderValue: {
                    $cond: {
                        if: { $gt: ['$totalOrders', 0] },
                        then: {
                            $divide: ['$orderAmount', '$totalOrders'],
                        },
                        else: 0, // Default value if there are no orders
                    },
                },
            },
        },
    ];

    const result = await OrderModel.aggregate(pipeline);

    // The result is an array with a single object containing avgOrderDeliveryTime and avgOrderValue
    const avgOrderValues = result[0] || {
        avgOrderValue: 0,
        avgOrderDeliveryTime: 30,
    };

    await ShopModel.updateOne({ _id: ObjectId(shopId) }, [
        {
            $set: {
                /*
                avgOrderDeliveryTime: {
                    $round: [
                        {
                            $divide: [
                                {
                                    $add: [
                                        {
                                            $multiply: [
                                                '$totalOrder',
                                                '$avgOrderDeliveryTime',
                                            ],
                                        },
                                        deliveredMinutes,
                                    ],
                                },
                                { $add: ['$totalOrder', 1] },
                            ],
                        },
                        2,
                    ],
                },
                */
                totalOrder: { $add: ['$totalOrder', 1] },
                avgOrderDeliveryTime: avgOrderValues?.avgOrderDeliveryTime,
                avgOrderValue: avgOrderValues?.avgOrderValue,
            },
        },
    ]);
};
