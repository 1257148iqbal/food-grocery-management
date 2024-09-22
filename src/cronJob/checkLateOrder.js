const CronJob = require('../models/CronJobModel');
const OrderModel = require('../models/OrderModel');
const ButlerModel = require('../models/ButlerModel');
const FlagModel = require('../models/FlagModel');
const {
    notifyForUrgentOrder,
    notifyShopForUrgentOrder,
    notifyRiderForUrgentOrder,
    notifyRiderForLateOrder
} = require('../config/socket');

exports.checkLateOrder = async () => {
    console.log('running checkLateOrder');
    try {
        // for shop don't mark as ready on time or rider don't pick up order on time
        const preparingOrders = await OrderModel.find({
            // orderStatus: {
            //     $in: ['preparing', 'ready_to_pickup'],
            // },
            $or: [
                {
                    orderStatus: 'preparing',
                    'errorOrderReason.errorReason': {
                        $ne: 'Shop is late in preparing the order.',
                    },
                },
                {
                    orderStatus: 'ready_to_pickup',
                    'errorOrderReason.errorReason': {
                        $ne: 'Rider is late in picking up the order.',
                    },
                },
            ],
            // errorOrderType: null,
        }).populate([
            {
                path: 'shop',
            },
            {
                path: 'user',
            },
            {
                path: 'deliveryBoy',
            },
        ]);

        preparingOrders?.forEach(async order => {
            const currentDate = new Date();
            const preparing_time = new Date(order.preparingAt);
            preparing_time.setMinutes(
                preparing_time.getMinutes() + order.preparingTime + 5
            );

            if (currentDate >= preparing_time) {
                let flagConfig = {
                    comment:
                        order.orderStatus === 'preparing'
                            ? 'Shop is late in preparing the order.'
                            : 'Rider is late in picking up the order.',
                    isDelay: true,
                    type: 'delay',
                    flaggedType: 'late',
                    orderId: order._id,
                };
                const flag = await FlagModel.create(flagConfig);

                const errorOrderReason = {
                    errorReason:
                        order.orderStatus === 'preparing'
                            ? 'Shop is late in preparing the order.'
                            : 'Rider is late in picking up the order.',
                    errorAt: new Date(),
                };
                await OrderModel.updateOne(
                    { _id: order._id },
                    {
                        $set: {
                            errorOrderType: 'urgent',
                            isOrderLate: true,
                            flaggedAt: new Date(),
                        },
                        $push: {
                            flag: flag._id,
                            errorOrderReason,
                        },
                    }
                );

                if (order.errorOrderType !== 'urgent') {
                    order._doc.errorOrderType = 'urgent';
                    order._doc.isOrderLate = true;
                    order._doc.errorOrderReason.push(errorOrderReason);

                    await notifyForUrgentOrder(order);
                }

                if (order.orderStatus === 'preparing') {
                    await notifyShopForUrgentOrder(order);
                } else {
                    await notifyRiderForUrgentOrder(order);
                }
            }
        });

        // for  rider don't deliver order on time
        const readyNormalOrders = await OrderModel.find({
            orderStatus: {
                $in: ['order_on_the_way'],
            },
            'errorOrderReason.errorReason': {
                $ne: 'Rider is late in delivering the order.',
            },
            // errorOrderType: null,
        }).populate([
            {
                path: 'shop',
            },
            {
                path: 'user',
            },
            {
                path: 'deliveryBoy',
            },
        ]);

        const readyButlerOrders = await ButlerModel.find({
            orderStatus: {
                $in: ['order_on_the_way'],
            },
            'errorOrderReason.errorReason': {
                $ne: 'Rider is late in delivering the order.',
            },
            // errorOrderType: null,
        }).populate([
            {
                path: 'user',
            },
            {
                path: 'deliveryBoy',
            },
        ]);

        const readyOrders = [...readyNormalOrders, ...readyButlerOrders];

        readyOrders?.forEach(async order => {
            const currentDate = new Date();
            const delivered_time = new Date(order.delivered_time);
            delivered_time.setMinutes(delivered_time.getMinutes() + 5);

            if (currentDate >= delivered_time) {
                let flagConfig = {
                    comment: 'Rider is late in delivering the order',
                    isDelay: true,
                    type: 'delay',
                    flaggedType: 'late',
                    orderId: order?.isButler ? undefined : order._id,
                    butlerId: order?.isButler ? order._id : undefined,
                };
                const flag = await FlagModel.create(flagConfig);

                if (order?.isButler) {
                    const errorOrderReason = {
                        errorReason: 'Rider is late in delivering the order.',
                        errorAt: new Date(),
                    };

                    await ButlerModel.updateOne(
                        { _id: order._id },
                        {
                            $set: {
                                errorOrderType: 'urgent',
                                isOrderLate: true,
                                flaggedAt: new Date(),
                            },
                            $push: {
                                flag: flag._id,
                                errorOrderReason,
                            },
                        }
                    );

                    if (order.errorOrderType !== 'urgent') {
                        order._doc.errorOrderType = 'urgent';
                        order._doc.isOrderLate = true;
                        order._doc.errorOrderReason.push(errorOrderReason);

                        await notifyForUrgentOrder(order);
                    }

                    await notifyRiderForUrgentOrder(order);
                } else {
                    const errorOrderReason = {
                        errorReason: 'Rider is late in delivering the order.',
                        errorAt: new Date(),
                    };

                    await OrderModel.updateOne(
                        { _id: order._id },
                        {
                            $set: {
                                errorOrderType: 'urgent',
                                isOrderLate: true,
                                flaggedAt: new Date(),
                            },
                            $push: {
                                flag: flag._id,
                                errorOrderReason,
                            },
                        }
                    );

                    if (order.errorOrderType !== 'urgent') {
                        order._doc.errorOrderType = 'urgent';
                        order._doc.isOrderLate = true;
                        order._doc.errorOrderReason.push(errorOrderReason);

                        await notifyForUrgentOrder(order);
                    }
                    await notifyRiderForLateOrder(order);
                    await notifyRiderForUrgentOrder(order);
                }
            }
        });

        // for rider don't pick up butler order on time
        const riderAcceptedButlerOrders = await ButlerModel.find({
            orderStatus: {
                $in: ['accepted_delivery_boy'],
            },
            'errorOrderReason.errorReason': {
                $ne: 'Rider is late in picking up the order.',
            },
            // errorOrderType: null,
        }).populate([
            {
                path: 'user',
            },
            {
                path: 'deliveryBoy',
            },
        ]);

        riderAcceptedButlerOrders?.forEach(async order => {
            const currentDate = new Date();
            const deliveryBoyReceivedAddressDistance =
                Number(
                    order?.deliveryBoyReceivedAddressDistance?.duration?.value
                ) / 60 || 0;
            const pickup_time = new Date(order.accepted_delivery_boyAt);
            pickup_time.setMinutes(
                pickup_time.getMinutes() +
                    deliveryBoyReceivedAddressDistance +
                    5
            );

            if (currentDate >= pickup_time) {
                let flagConfig = {
                    comment: 'Rider is late for order pickup',
                    isDelay: true,
                    type: 'delay',
                    flaggedType: 'late',
                    butlerId: order._id,
                };
                const flag = await FlagModel.create(flagConfig);

                const errorOrderReason = {
                    errorReason: 'Rider is late in picking up the order.',
                    errorAt: new Date(),
                };

                await ButlerModel.updateOne(
                    { _id: order._id },
                    {
                        $set: {
                            errorOrderType: 'urgent',
                            isOrderLate: true,
                            flaggedAt: new Date(),
                        },
                        $push: {
                            flag: flag._id,
                            errorOrderReason,
                        },
                    }
                );

                if (order.errorOrderType !== 'urgent') {
                    order._doc.errorOrderType = 'urgent';
                    order._doc.isOrderLate = true;
                    order._doc.errorOrderReason.push(errorOrderReason);

                    await notifyForUrgentOrder(order);
                }

                await notifyRiderForUrgentOrder(order);
            }
        });
    } catch (error) {
        const cronJob = new CronJob({
            name: 'Check late order cron job',
            status: 0,
            error: error,
        });
        await cronJob.save();
    }
};
