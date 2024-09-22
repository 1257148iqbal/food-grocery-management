const cron = require('node-cron');
const CronJob = require('../models/CronJobModel');
const OrderModel = require('../models/OrderModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const FlagModel = require('../models/FlagModel');
const ButlerModel = require('../models/ButlerModel');

exports.autoFlagOrder = async model => {
    try {
        // for Order
        let orders;
        if (model === 'order') {
            orders = await OrderModel.find({
                orderStatus: {
                    $in: ['preparing', 'ready_to_pickup', 'order_on_the_way'],
                },
            });
        }
        if (model === 'butler') {
            orders = await ButlerModel.find({
                orderStatus: {
                    $in: ['order_on_the_way'],
                },
            });
        }

        orders?.forEach(async order => {
            let config = { isDelay: true, type: 'delay' };
            if (model === 'order') {
                config = {
                    ...config,
                    orderId: order._id,
                };
            }
            if (model === 'butler') {
                config = {
                    ...config,
                    butlerId: order._id,
                };
            }
            const autoFlag = await FlagModel.findOne(config);

            // For ignore duplicate delayFLag creation
            if (!autoFlag) {
                const currentDate = new Date();
                const delivered_time = new Date(order?.delivered_time);
                delivered_time.setMinutes(delivered_time.getMinutes() + 10);

                if (currentDate > delivered_time) {
                    let flagConfig = {
                        comment: 'Order delay',
                        isDelay: true,
                        type: 'delay',
                    };

                    if (model === 'order') {
                        flagConfig = {
                            ...flagConfig,
                            orderId: order._id,
                        };
                    }
                    if (model === 'butler') {
                        flagConfig = {
                            ...flagConfig,
                            butlerId: order._id,
                        };
                    }

                    const flag = await FlagModel.create(flagConfig);

                    await OrderModel.updateOne(
                        { _id: order._id },
                        {
                            $push: {
                                flag: flag._id,
                            },
                            $set:{
                                flaggedAt: new Date(),
                            }
                        }
                    );

                    let cronJobConfig = {
                        name: 'Order delay flag order Cron Job',
                        status: 1,
                        error: null,
                    };

                    if (model === 'order') {
                        cronJobConfig = {
                            ...cronJobConfig,
                            orderId: order._id,
                        };
                    }
                    if (model === 'butler') {
                        cronJobConfig = {
                            ...cronJobConfig,
                            butlerId: order._id,
                        };
                    }

                    const cronJob = new CronJob(cronJobConfig);
                    await cronJob.save();
                }
            }
        });
    } catch (error) {
        console.log(error);
        const cronJob = new CronJob({
            name: 'Auto dlag order Cron Job',
            status: 0,
            error: error,
        });
        await cronJob.save();
    }
};
