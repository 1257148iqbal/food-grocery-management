var cron = require('node-cron');
const Order = require('../models/OrderModel');
const CronJob = require('../models/CronJobModel');
const FlagModel = require('../models/FlagModel');
const moment = require('moment');
const {
    checkNearByDeliveryBoyShu,
    notifiycancelOrder,
    notifyForUrgentOrder,
    notifyShopForUrgentOrder,
} = require('../config/socket');
const { getFullOrderInformation } = require('../helpers/orderHelper');
const { sendPlaceOrderEmail } = require('../controllers/EmailController');
const {
    sendNotificationsAllApp,
} = require('../controllers/NotificationController');
const { autoOfflineDeliveryBoy } = require('./autoOfflineDeliveryBoy');
const {
    orderScheduleForButler,
    findingButlerRider,
} = require('./orderScheduleForButler');
const { checkLateOrder } = require('./checkLateOrder');
const { autoLockCart } = require('./autoLockCart');
const { checkShopCapacity } = require('../helpers/checkShopCapacity');
const { checkTimeoutMessage, checkNoReplyMessage } = require('./checkTimeoutMessage');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const { areebaPaymentGateway } = require('../lib/areebaPaymentGateway');
const ObjectId = require('mongoose').Types.ObjectId;

async function scheduleCronJob() {
    // every minute run this cron job
    cron.schedule(
        '* * * * *',
        async () => {
            console.log(`check every 1min`);

            // for autoOfflineDeliveryBoy
            autoOfflineDeliveryBoy();
        },
        {
            scheduled: true,
            timezone: 'Asia/Beirut',
        }
    );

    // every 30sec run this cron job
    cron.schedule(
        '*/30 * * * * *',
        async () => {
            console.log(`check every 30sec`);
            try {
                // for schedule
                const orders = await Order.find({
                    orderStatus: 'schedule',
                }).populate([
                    {
                        path: 'cart',
                    },
                    {
                        path: 'shop',
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

                for (const order of orders) {
                    const format = 'YYYY-MM-DD H:mm:ss';
                    const currentDate = moment(new Date()).format(format);
                    const receivingDate = moment(
                        new Date(order.scheduleDate)
                    ).format(format);

                    const isScheduledTimeReached =
                        new Date(receivingDate) <= new Date(currentDate);

                    if (isScheduledTimeReached) {
                        // update order schedule to place order
                        const isShopOpen = checkShopOpeningHours(order.shop);
                        if (
                            order.shop.liveStatus === 'online' &&
                            order.shop.shopStatus === 'active' &&
                            isShopOpen
                        ) {
                            let newTimeline = order.timeline;
                            const placedTimeline = newTimeline.find(
                                timeline => timeline.status === 'placed'
                            );
                            placedTimeline.active = true;
                            placedTimeline.createdAt = new Date();

                            await Order.updateOne(
                                { _id: order._id },
                                {
                                    $set: {
                                        orderStatus: 'placed',
                                        order_placedAt: new Date(),
                                        timeline: newTimeline,
                                    },
                                }
                            );

                            // Check shop order capacity
                            await checkShopCapacity(order.shop._id);
                            const orderFullInformation =
                                await getFullOrderInformation(order._id);

                            checkNearByDeliveryBoyShu(order._id);
                            await sendNotificationsAllApp(orderFullInformation);
                            // await sendPlaceOrderEmail(order._id);
                        } else {
                            const flag = await FlagModel.create({
                                orderId: order._id,
                                comment: 'Shop deactivate or offline',
                                isAutomatic: true,
                                type: 'auto',
                                flaggedType: 'cancelled',
                            });

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

                            // Areeba payment gateway integration
                            if (order.summary.baseCurrency_card > 0) {
                                for (const element of order?.cart?.cartItems) {
                                    if (
                                        element?.summary?.baseCurrency_card > 0
                                    ) {
                                        const newTransactionId = ObjectId();

                                        const voidPutData = {
                                            apiOperation: 'VOID',
                                            transaction: {
                                                targetTransactionId:
                                                    element?.areebaCard
                                                        ?.transactionId,
                                            },
                                        };

                                        const { data: voidData } =
                                            await areebaPaymentGateway(
                                                element?.areebaCard?.orderId,
                                                newTransactionId,
                                                voidPutData
                                            );

                                        if (voidData?.result == 'ERROR')
                                            return errorResponse(
                                                res,
                                                voidData?.error?.explanation
                                            );
                                    }
                                }
                            }

                            await Order.updateOne(
                                {
                                    _id: order._id,
                                },
                                {
                                    $set: {
                                        orderStatus: 'cancelled',
                                        cancelledAt: new Date(),
                                        orderCancel: {
                                            canceledBy: 'automatically',
                                            otherReason:
                                                'shop deactivate or offline',
                                        },
                                        flaggedAt: new Date(),
                                    },
                                    $push: {
                                        flag: flag._id,
                                    },
                                }
                            );

                            const orderFullInformation =
                                await getFullOrderInformation(order._id);

                            await sendNotificationsAllApp(orderFullInformation);
                            await notifiycancelOrder(orderFullInformation);
                        }
                    }
                }
            } catch (error) {
                console.log(error);
                const cronJob = new CronJob({
                    name: 'Check schedule order',
                    status: 0,
                    error: error,
                });
                await cronJob.save();
            }

            // For schedule butler order
            orderScheduleForButler();
        },
        {
            scheduled: true,
            timezone: 'Asia/Beirut',
        }
    );

    // every 10sec run this cron job
    cron.schedule(
        '*/10 * * * * *',
        async () => {
            console.log(`check every 10 sec`);
            try {
                const noFindingDeliveryBoyOrders = await Order.find({
                    $or: [
                        {
                            orderStatus: 'placed',
                            orderFor: 'specific',
                            'errorOrderReason.errorReason': {
                                $ne: `Shop didn't accept.`,
                            },
                        },
                        {
                            orderStatus: 'placed',
                            orderFor: 'global',
                            'errorOrderReason.errorReason': {
                                $ne: 'Rider not found.',
                            },
                        },
                        {
                            orderStatus: 'preparing',
                            orderFor: 'global',
                            deliveryBoy: { $exists: false },
                            'errorOrderReason.errorReason': {
                                $ne: 'Rider not found.',
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

                for (const order of noFindingDeliveryBoyOrders) {
                    const format = 'YYYY-MM-DD H:mm:ss';
                    const currentDate = moment(new Date()).format(format);
                    const recevingDateCreated = moment(
                        new Date(order.order_placedAt)
                    ).format(format);
                    const differOrigin =
                        new Date(currentDate) - new Date(recevingDateCreated);
                    let minutesOrigin = parseInt(differOrigin / (1000 * 60));
                    if (minutesOrigin >= 5) {
                        const errorOrderReasons = [];

                        if (order.orderFor === 'global') {
                            errorOrderReasons.push({
                                errorReason: 'Rider not found.',
                                errorAt: new Date(),
                            });
                        }

                        if (order.orderStatus === 'placed') {
                            errorOrderReasons.push({
                                errorReason: `Shop didn't accept.`,
                                errorAt: new Date(),
                            });
                        }

                        await Order.updateOne(
                            {
                                _id: order._id,
                            },
                            {
                                $set: {
                                    errorOrderType: 'urgent',
                                },
                                $push: {
                                    errorOrderReason: {
                                        $each: errorOrderReasons,
                                    },
                                },
                            }
                        );

                        if (order.errorOrderType !== 'urgent') {
                            order._doc.errorOrderType = 'urgent';
                            order._doc.errorOrderReason.push(
                                ...errorOrderReasons
                            );

                            await notifyForUrgentOrder(order);
                        }

                        if (order.orderStatus === 'placed') {
                            await notifyShopForUrgentOrder(order);
                        }
                    } else {
                        const receivingDate = order.searchingTime
                            ? moment(new Date(order.searchingTime)).format(
                                  format
                              )
                            : currentDate;
                        const differ =
                            new Date(currentDate) - new Date(receivingDate);
                        let minutes = parseInt(differ / (1000 * 60));
                        if (minutes >= 1) {
                            checkNearByDeliveryBoyShu(order._id);
                        }
                    }
                }

                // for accepted delivery boy
                const accepted_delivery_boyOrders = await Order.find({
                    orderStatus: 'accepted_delivery_boy',
                    'errorOrderReason.errorReason': {
                        $ne: `Shop didn't accept.`,
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

                for (const order of accepted_delivery_boyOrders) {
                    const format = 'YYYY-MM-DD H:mm:ss';
                    const currentDate = moment(new Date()).format(format);
                    const recevingDateCreated = moment(
                        new Date(order.order_placedAt)
                    ).format(format);
                    const differOrigin =
                        new Date(currentDate) - new Date(recevingDateCreated);
                    let minutesOrigin = parseInt(differOrigin / (1000 * 60));
                    if (minutesOrigin >= 5) {
                        const errorOrderReason = {
                            errorReason: `Shop didn't accept.`,
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

                        if (order.errorOrderType !== 'urgent') {
                            order._doc.errorOrderType = 'urgent';
                            order._doc.errorOrderReason.push(errorOrderReason);

                            await notifyForUrgentOrder(order);
                        }

                        await notifyShopForUrgentOrder(order);
                    }
                }

                // For adjustment order feature
                const adjustRequestOrders = await Order.find({
                    orderStatus: 'preparing',
                    // errorOrderType: null,
                    isOrderAdjusted: false,
                    adjustOrderRequest: { $exists: true },
                    'errorOrderReason.errorReason': {
                        $ne: `User didn't accept the adjusted order request within 5 minutes.`,
                    },
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

                for (const order of adjustRequestOrders) {
                    const format = 'YYYY-MM-DD H:mm:ss';
                    const currentDate = moment(new Date()).format(format);
                    const recevingDateCreated = moment(
                        new Date(order.adjustOrderRequestAt)
                    ).format(format);
                    const differOrigin =
                        new Date(currentDate) - new Date(recevingDateCreated);
                    let minutesOrigin = parseInt(differOrigin / (1000 * 60));
                    if (minutesOrigin >= 5) {
                        const errorOrderReason = {
                            errorReason: `User didn't accept the adjusted order request within 5 minutes.`,
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

                        if (order.errorOrderType !== 'urgent') {
                            order._doc.errorOrderType = 'urgent';
                            order._doc.errorOrderReason.push(errorOrderReason);

                            await notifyForUrgentOrder(order);
                        }
                    }
                }
            } catch (error) {
                console.log(error);
                const cronJob = new CronJob({
                    name: 'Every 10sec check schedule order',
                    status: 0,
                    error: error,
                });
                await cronJob.save();
            }

            // for finding Butler rider
            findingButlerRider();

            // for lock cart system
            autoLockCart();

            // for late order
            checkLateOrder();
        },
        {
            scheduled: true,
            timezone: 'Asia/Beirut',
        }
    );

    // every 20sec run this cron job
    cron.schedule(
        '*/20 * * * * *',
        async () => {
            console.log(`check every 20 sec`);
            try {
                // for timeout message
                checkTimeoutMessage();
                // for no reply message
                // checkNoReplyMessage(); // causes MongoDB Atlas Alert - Query Targeting: Scanned Objects / Returned Objects has gone above 1000
            } catch (error) {
                console.log(error);
                const cronJob = new CronJob({
                    name: 'Every 20sec check schedule order',
                    status: 0,
                    error: error,
                });
                await cronJob.save();
            }
        },
        {
            scheduled: true,
            timezone: 'Asia/Beirut',
        }
    );
}

// Call the async function to schedule the cron job
scheduleCronJob();
