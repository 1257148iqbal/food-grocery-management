var cron = require('node-cron');
const CronJob = require('../models/CronJobModel');
const PayoutSettingModel = require('../models/PayoutSettingModel');
const ShopModel = require('../models/ShopModel');
const PayoutModel = require('../models/PayoutModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const AppSetting = require('../models/AppSetting');
const {
    createRiderPayout,
    createShopPayout,
} = require('../controllers/PayoutController');

let payoutCronJob;
exports.payoutScheduleCronJob = async () => {
    console.log('*************restartPayoutScheduleCronJob');
    // Set the day of the week as an argument (0 for Sunday, 1 for Monday, etc.)
    const payoutSetting = await PayoutSettingModel.findOne({});
    const firstDayOfWeek = payoutSetting?.firstDayOfWeek || 1;

    // Cancel the existing cron job
    if (payoutCronJob) {
        payoutCronJob.stop();
    }

    // every first day of week at 00:00:00 AM
    payoutCronJob = cron.schedule(
        `00 00 * * ${firstDayOfWeek}`,
        async () => {
            try {
                const appSetting = await AppSetting.findOne({});
                const adminExchangeRate = appSetting?.adminExchangeRate || 0;

                const currentDate = new Date(); // Set the start date
                currentDate.setHours(0, 0, 0, 0);
                const pastWeekDate = new Date(
                    new Date(currentDate).setDate(currentDate.getDate() - 7)
                );

                // Calc unpaid and overdue payouts
                const duration = payoutSetting?.overDuePeriod || 30;
                const payoutOverDueDate = new Date(
                    new Date(currentDate).setDate(
                        currentDate.getDate() + duration
                    )
                );

                //****** Payout system for Shop ******/
                const shops = await ShopModel.find({
                    deletedAt: null,
                    parentShop: null,
                    shopStatus: 'active',
                });

                const shopPromises = shops.map(shop =>
                    createShopPayout(
                        shop,
                        adminExchangeRate,
                        pastWeekDate,
                        payoutOverDueDate
                    )
                );

                await Promise.all(shopPromises);

                //****** Payout system for Rider ******/
                const deliveryBoys = await DeliveryBoyModel.find({
                    deletedAt: null,
                    status: 'active',
                    deliveryBoyType: 'dropRider',
                });

                const riderPromises = deliveryBoys.map(deliveryBoy =>
                    createRiderPayout(
                        deliveryBoy,
                        adminExchangeRate,
                        pastWeekDate,
                        payoutOverDueDate
                    )
                );

                await Promise.all(riderPromises);

                const cronJob = new CronJob({
                    name: 'Payout system cron job',
                    status: 1,
                    error: null,
                });
                await cronJob.save();
            } catch (error) {
                const cronJob = new CronJob({
                    name: 'Payout system cron job',
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
};

exports.scheduleCronJob = async () => {
    // Second cron job: Run every day at midnight
    cron.schedule(
        '00 00 * * *',
        async () => {
            try {
                //****** Payout overdue automatically ******/
                const unpaidPayouts = await PayoutModel.find({
                    payoutStatus: 'unpaid',
                });

                const currentDate = new Date(); // Set the start date
                currentDate.setHours(0, 0, 0, 0);

                for (const payout of unpaidPayouts) {
                    if (currentDate >= payout.payoutOverDueDate) {
                        await PayoutModel.findByIdAndUpdate(payout._id, {
                            $set: {
                                payoutStatus: 'overdue',
                            },
                        });

                        const cronJob = new CronJob({
                            name: `Payout system cron job for Overdue ${payout._id}`,
                            status: 1,
                            error: null,
                        });
                        await cronJob.save();
                    }
                }
            } catch (error) {
                const cronJob = new CronJob({
                    name: 'Payout system cron job for Overdue',
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
};

// Call the async function to schedule the cron job
// payoutScheduleCronJob();
// scheduleCronJob();

exports.restartPayoutScheduleCronJob = async () => {
    try {
        // Cancel the existing cron job
        payoutCronJob.stop();

        // Create a new cron job with the updated schedule
        await this.payoutScheduleCronJob();
    } catch (error) {
        console.log(error);
    }
};
