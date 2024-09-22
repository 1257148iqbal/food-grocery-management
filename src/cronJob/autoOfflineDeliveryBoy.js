const CronJob = require('../models/CronJobModel');
const OrderModel = require('../models/OrderModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const { calcActiveTime } = require('../controllers/DeliveryBoyController');
const DeliveryBoyTimeModel = require('../models/DeliveryBoyTimeModel');
const moment = require('moment');

// exports.autoOfflineDeliveryBoy = async () => {
//     try {
//         const deliveryBoys = await DeliveryBoyModel.find({
//             status: 'active',
//             liveStatus: 'online',
//             deliveryBoyType: 'dropRider',
//         });

//         const fiveMinutesAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
//         const orders = await OrderModel.find({
//             createdAt: {
//                 $gte: fiveMinutesAgo,
//                 $lt: new Date(),
//             },
//         });

//         deliveryBoys?.forEach(async deliveryBoy => {
//             let currentTime = new Date();
//             let specificTime = new Date(deliveryBoy.lastLocationUpdateAt);
//             let timeDiff = (currentTime - specificTime) / 1000;

//             if (timeDiff > 12 * 60 * 60) {
//                 const acceptedDeliveryBoy = orders?.find(
//                     order => order?.deliveryBoy == deliveryBoy._id.toString()
//                 );
//                 if (!acceptedDeliveryBoy) {
//                     let rejectedDeliveryBoy;
//                     for (let i = 0; i < orders.length; i++) {
//                         rejectedDeliveryBoy = orders[
//                             i
//                         ]?.rejectedDeliveryBoy?.includes(deliveryBoy._id);
//                         if (rejectedDeliveryBoy) {
//                             break;
//                         }
//                     }
//                     if (!rejectedDeliveryBoy) {
//                         const lastOnline = deliveryBoy.lastOnline || new Date();

//                         const total = calcActiveTime(lastOnline, new Date());
//                         await DeliveryBoyTimeModel.create({
//                             delivery: deliveryBoy._id,
//                             Date: new Date(),
//                             timeIn: lastOnline,
//                             timeOut: moment(new Date()).format('DD MMM YYYY hh:mm A'),
//                             activeTotal: total,
//                         });

//                         await DeliveryBoyModel.findByIdAndUpdate(
//                             deliveryBoy._id,
//                             { liveStatus: 'offline' }
//                         );

//                         const cronJob = new CronJob({
//                             name: 'Auto Offline DeliveryBoy Cron Job',
//                             status: 1,
//                             error: null,
//                             deliveryBoyId: deliveryBoy._id,
//                         });
//                         await cronJob.save();
//                     }
//                 }
//             }
//         });
//     } catch (error) {
//         console.log(error);
//         const cronJob = new CronJob({
//             name: 'Auto Offline DeliveryBoy Cron Job',
//             status: 0,
//             error: error,
//         });
//         await cronJob.save();
//     }
// };
exports.autoOfflineDeliveryBoy = async () => {
    try {
        const cutoffTime = moment().subtract(12, 'hours');

        const deliveryBoys = await DeliveryBoyModel.find({
            status: 'active',
            liveStatus: 'online',
            lastLocationUpdateAt: { $lt: cutoffTime },
            deliveryBoyType: 'dropRider',
            deletedAt: null,
        });

        for (const deliveryBoy of deliveryBoys) {
            const findAcceptedOrder = await OrderModel.countDocuments({
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
                deliveryBoy: deliveryBoy._id,
            });

            if (findAcceptedOrder < 1) {
                const findRejectedOrder = await OrderModel.countDocuments({
                    rejectedDeliveryBoy: deliveryBoy._id,
                    createdAt: { $gte: cutoffTime },
                });

                if (findRejectedOrder < 1) {
                    const lastOnline = deliveryBoy.lastOnline || new Date();

                    const total = calcActiveTime(lastOnline, new Date());
                    await DeliveryBoyTimeModel.create({
                        delivery: deliveryBoy._id,
                        Date: new Date(),
                        timeIn: lastOnline,
                        timeOut: moment(new Date()).format(
                            'DD MMM YYYY hh:mm A'
                        ),
                        activeTotal: total,
                    });

                    await DeliveryBoyModel.findByIdAndUpdate(deliveryBoy._id, {
                        liveStatus: 'offline',
                    });

                    const cronJob = new CronJob({
                        name: 'Auto Offline DeliveryBoy Cron Job',
                        status: 1,
                        error: null,
                        deliveryBoyId: deliveryBoy._id,
                    });
                    await cronJob.save();
                }
            }
        }
    } catch (error) {
        console.log(error);
        const cronJob = new CronJob({
            name: 'Auto Offline DeliveryBoy Cron Job',
            status: 0,
            error: error,
        });
        await cronJob.save();
    }
};
