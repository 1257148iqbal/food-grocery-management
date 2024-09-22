var cron = require('node-cron');
const moment = require('moment');
const short = require('short-uuid');
const ObjectId = require('mongoose').Types.ObjectId;
const CronJob = require('../models/CronJobModel');
const OrderModel = require('../models/OrderModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const TransactionModel = require('../models/TransactionModel');
const ButlerModel = require('../models/ButlerModel');
const AppSetting = require('../models/AppSetting');
const AdminModel = require('../models/AdminModel');
const ShopModel = require('../models/ShopModel');
const RewardModel = require('../models/RewardModel');

async function scheduleCronJob() {
    // Set the day of the week as an argument (0 for Sunday, 1 for Monday, etc.)
    const firstDayOfWeek = 1;

    // every first day of week at 00:00:00 AM
    cron.schedule(
        `00 00 * * ${firstDayOfWeek}`,
        async () => {
            try {
                const appSetting = await AppSetting.findOne({}).select(
                    'adminExchangeRate'
                );
                const adminExchangeRate = appSetting?.adminExchangeRate || 0;

                const activeRiders = await DeliveryBoyModel.find({
                    status: 'active',
                    deliveryBoyType: 'dropRider',
                    deletedAt: null,
                })
                    .populate({
                        path: 'zone',
                        select: 'riderWeeklyTarget riderWeeklyReward',
                    })
                    .select('zone');

                // Calc rider weekly completed order
                const currentDate = moment();
                const startOfWeek = moment(currentDate)
                    .subtract(1, 'weeks')
                    .startOf('isoWeek'); // Using the 'isoWeek' to consider Monday as the start
                const endOfWeek = moment(currentDate)
                    .subtract(1, 'weeks')
                    .endOf('isoWeek');

                for (const rider of activeRiders) {
                    const riderWeeklyTarget =
                        rider?.zone?.riderWeeklyTarget || 0;

                    const riderWeeklyReward =
                        rider?.zone?.riderWeeklyReward || 0;

                    if (riderWeeklyTarget > 0 && riderWeeklyReward > 0) {
                        const riderWeeklyNormalOrder =
                            await OrderModel.countDocuments({
                                deliveryBoy: ObjectId(rider._id),
                                orderStatus: 'delivered',
                                createdAt: {
                                    $gte: startOfWeek,
                                    $lte: endOfWeek,
                                },
                            });
                        const riderWeeklyButlerOrder =
                            await ButlerModel.countDocuments({
                                deliveryBoy: ObjectId(rider._id),
                                orderStatus: 'delivered',
                                createdAt: {
                                    $gte: startOfWeek,
                                    $lte: endOfWeek,
                                },
                            });
                        const riderWeeklyOrder =
                            riderWeeklyNormalOrder + riderWeeklyButlerOrder;

                        const riderWeeklyTargetRatioInPct =
                            (riderWeeklyOrder / riderWeeklyTarget) * 100;

                        if (riderWeeklyTargetRatioInPct >= 100) {
                            const riderReward =
                                (riderWeeklyReward *
                                    riderWeeklyTargetRatioInPct) /
                                100;

                            await TransactionModel.create({
                                autoTrxId: `TNX${moment().format(
                                    'DDMMYYHmm'
                                )}${short().new()}`,
                                account: 'deliveryBoy',
                                type: 'riderGetWeeklyReward',
                                deliveryBoy: rider._id,
                                amount: riderReward,
                                secondaryCurrency_amount:
                                    riderReward * adminExchangeRate,
                                status: 'success',
                                adminNote: 'Rider get for weekly reward',
                                paidCurrency: 'baseCurrency',
                                riderWeeklyOrder,
                                riderWeeklyTarget,
                            });
                        }
                    }
                }
            } catch (error) {
                const cronJob = new CronJob({
                    name: 'Rider Reward system cron job',
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

    // every first day of month at 00:00:00 AM
    cron.schedule(
        `00 00 1 * *`,
        async () => {
            try {
                const appSetting = await AppSetting.findOne({}).select(
                    'adminExchangeRate salesManagerMonthlyTarget salesManagerMonthlyReward'
                );
                const adminExchangeRate = appSetting?.adminExchangeRate || 0;
                const salesManagerMonthlyTarget =
                    appSetting?.salesManagerMonthlyTarget || 0;
                const salesManagerMonthlyReward =
                    appSetting?.salesManagerMonthlyReward || 0;

                if (
                    salesManagerMonthlyTarget > 0 &&
                    salesManagerMonthlyReward > 0
                ) {
                    const activeSalesManagers = await AdminModel.find({
                        status: 'active',
                        adminType: 'sales',
                        deletedAt: null,
                    });

                    // Calc sales manager monthly created shop
                    const currentDate = moment();
                    const firstDayOfPreviousMonth = moment(currentDate)
                        .subtract(1, 'months')
                        .startOf('month');
                    const lastDayOfPreviousMonth = moment(currentDate)
                        .subtract(1, 'months')
                        .endOf('month');
                    const rewardedMonth = firstDayOfPreviousMonth.format('M');
                    const rewardedYear = firstDayOfPreviousMonth.format('YYYY');

                    for (const salesManager of activeSalesManagers) {
                        const salesManagerMonthlyCreatedShop =
                            await ShopModel.countDocuments({
                                shopStatus: 'active',
                                deletedAt: null,
                                assignedSalesManager: ObjectId(
                                    salesManager._id
                                ),
                                createdAt: {
                                    $gte: firstDayOfPreviousMonth,
                                    $lte: lastDayOfPreviousMonth,
                                },
                            });

                        const salesManagerMonthlyTargetRatioInPct =
                            (salesManagerMonthlyCreatedShop /
                                salesManagerMonthlyTarget) *
                            100;

                        let salesManagerReward = 0;
                        if (salesManagerMonthlyTargetRatioInPct >= 100) {
                            salesManagerReward =
                                (salesManagerMonthlyReward *
                                    salesManagerMonthlyTargetRatioInPct) /
                                100;

                            await TransactionModel.create({
                                autoTrxId: `TNX${moment().format(
                                    'DDMMYYHmm'
                                )}${short().new()}`,
                                account: 'admin',
                                type: 'salesManagerGetMonthlyReward',
                                admin: salesManager._id,
                                amount: salesManagerReward,
                                secondaryCurrency_amount:
                                    salesManagerReward * adminExchangeRate,
                                status: 'success',
                                adminNote:
                                    'Sales Manager get for monthly reward',
                                paidCurrency: 'baseCurrency',
                                salesManagerMonthlyCreatedShop,
                                salesManagerMonthlyTarget,
                            });
                        }

                        await RewardModel.create({
                            rewardType: 'salesManagerMonthlyReward',
                            admin: salesManager._id,
                            amount: salesManagerReward,
                            secondaryCurrency_amount:
                                salesManagerReward * adminExchangeRate,
                            salesManagerMonthlyCreatedShop,
                            salesManagerMonthlyTarget,
                            rewardedYear,
                            rewardedMonth,
                        });
                    }
                }
            } catch (error) {
                const cronJob = new CronJob({
                    name: 'Sales Manager Reward system cron job',
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
