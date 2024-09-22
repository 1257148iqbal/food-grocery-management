const OrderModel = require('../models/OrderModel');
const ShopModel = require('../models/ShopModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.shopAvgDeliveryTime = async shopId => {
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
                        else: 0, // Default value if there are no orders
                    },
                },
            },
        },
    ];

    const result = await OrderModel.aggregate(pipeline);

    // The result is an array with a single object containing the avgOrderDeliveryTime
    const avgOrderDeliveryTime = result[0]?.avgOrderDeliveryTime || 0;

    return parseFloat(avgOrderDeliveryTime.toFixed(2));
};
