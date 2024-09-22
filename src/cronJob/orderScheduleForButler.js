const Butler = require('../models/ButlerModel');
const CronJob = require('../models/CronJobModel');
const moment = require('moment');
const {
    checkNearByDeliveryBoyShuForButler,
    notifyForUrgentOrder,
} = require('../config/socket');
const { getFullOrderInformationForButler } = require('../helpers/orderHelper');
const { sendPlaceOrderEmail } = require('../controllers/EmailController');
const {
    sendNotificationsAllApp,
} = require('../controllers/NotificationController');

exports.orderScheduleForButler = async () => {
    try {
        // for schedule
        const orders = await Butler.find({
            orderStatus: 'schedule',
        });

        for (const order of orders) {
            const format = 'YYYY-MM-DD H:mm:ss';
            const currentDate = moment(new Date()).format(format);
            const receivingDate = moment(new Date(order.scheduleDate)).format(
                format
            );

            const isScheduledTimeReached =
                new Date(receivingDate) <= new Date(currentDate);

            if (isScheduledTimeReached) {
                // update order schedule to place order
                await Butler.updateOne(
                    { _id: order._id },
                    {
                        $set: {
                            orderStatus: 'placed',
                            order_placedAt: new Date(),
                        },
                    }
                );
                const orderFullInformation =
                    await getFullOrderInformationForButler(order._id);

                checkNearByDeliveryBoyShuForButler(order._id);
            }
        }
    } catch (error) {
        console.log(error);
        const cronJob = new CronJob({
            name: 'Check schedule order for Butler',
            status: 0,
            error: error,
        });
        await cronJob.save();
    }
};

exports.findingButlerRider = async () => {
    try {
        const noFindingDeliveryBoyOrders = await Butler.find({
            orderStatus: 'placed',
            'errorOrderReason.errorReason': {
                $ne: 'Rider not found.',
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

        for (const order of noFindingDeliveryBoyOrders) {
            const format = 'YYYY-MM-DD H:mm:ss';
            const currentDate = moment(new Date()).format(format);
            const receivingDateCreated = moment(
                new Date(order.order_placedAt)
            ).format(format);
            const differOrigin =
                new Date(currentDate) - new Date(receivingDateCreated);
            // after 15 minutes cancel order . but i input 22 minutes . its not change and effect anyting . its for accuracy
            let minutesOrigin = parseInt(differOrigin / (1000 * 60));
            if (minutesOrigin >= 5) {
                const errorOrderReason = {
                    errorReason: 'Rider not found.',
                    errorAt: new Date(),
                };

                await Butler.updateOne(
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
            } else {
                const receivingDate = order.searchingTime
                    ? moment(new Date(order.searchingTime)).format(format)
                    : currentDate;
                const differ = new Date(currentDate) - new Date(receivingDate);
                // let days = parseInt(differ / (1000 * 60 * 60 * 24));
                // let hours = parseInt(differ / (1000 * 60 * 60));
                let minutes = parseInt(differ / (1000 * 60));
                if (minutes >= 1) {
                    checkNearByDeliveryBoyShuForButler(order._id);
                }
            }
        }
    } catch (error) {
        console.log(error);
        const cronJob = new CronJob({
            name: 'Finding butler rider',
            status: 0,
            error: error,
        });
        await cronJob.save();
    }
};
