const cron = require('node-cron');
const CronJob = require('../models/CronJobModel');
const CartModel = require('../models/CartModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.autoLockCart = async () => {
    try {
        // All group carts
        const carts = await CartModel.find({
            cartType: 'group',
            cartStatus: 'unlock',
            deletedAt: null,
        });

        carts?.forEach(async cart => {
            const currentTime = new Date();
            const orderDeadlineTime = new Date(cart?.orderDeadline?.date);

            if (orderDeadlineTime <= currentTime) {
                await CartModel.findByIdAndUpdate(cart._id, {
                    cartStatus: 'lock',
                });

                const cronJob = new CronJob({
                    name: 'Auto Lock Cart Cron Job',
                    status: 1,
                    error: null,
                    cartId: cart._id,
                });
                await cronJob.save();
            }
        });
    } catch (error) {
        console.log(error);
        const cronJob = new CronJob({
            name: 'Auto Lock Cart Cron Job',
            status: 0,
            error: error,
        });
        await cronJob.save();
    }
};
