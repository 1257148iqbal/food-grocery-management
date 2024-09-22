var cron = require('node-cron');
const CronJob = require('../models/CronJobModel');
const moment = require('moment');
const SubscriptionModel = require('../models/SubscriptionModel');
const SubscriptionSettingModel = require('../models/SubscriptionSettingModel');
const AppSetting = require('../models/AppSetting');
const UserModel = require('../models/UserModel');
const ObjectId = require('mongoose').Types.ObjectId;

// every day at 00:00:00 AM
cron.schedule(
    '00 00 * * *',
    async () => {
        try {
            const activeSubscription = await SubscriptionModel.find({
                subscriptionStatus: 'ongoing',
            });

            activeSubscription?.forEach(async subscription => {
                const endDate = moment(
                    new Date(subscription?.subscriptionDuration?.end)
                );
                const currentDate = moment();

                if (endDate <= currentDate) {
                    await SubscriptionModel.updateOne(
                        { _id: subscription._id },
                        {
                            $set: {
                                subscriptionStatus: 'expired',
                            },
                        }
                    );

                    if (subscription.subscriptionAutoRenew) {
                        let subscriptionDuration;
                        const startDate = moment().startOf('day');

                        if (subscription.subscriptionPackage === 'monthly') {
                            subscriptionDuration = {
                                start: startDate,
                                end: moment(startDate).add(30, 'days'), // Add 30 days
                            };
                        } else {
                            subscriptionDuration = {
                                start: startDate,
                                end: moment(startDate).add(365, 'days'), // Add 365 days
                            };
                        }

                        const appSetting = await AppSetting.findOne({});
                        const adminExchangeRate =
                            appSetting?.adminExchangeRate || 0;

                        const subscriptionPackage =
                            await SubscriptionSettingModel.findOne({
                                subscriptionPackage:
                                    subscription.subscriptionPackage,
                            });

                        const baseCurrency_subscriptionFee =
                            subscriptionPackage?.subscriptionFee ||
                            subscription.baseCurrency_subscriptionFee;
                        const secondaryCurrency_subscriptionFee =
                            baseCurrency_subscriptionFee * adminExchangeRate;

                        const summary = {
                            baseCurrency_wallet: 0,
                            secondaryCurrency_wallet: 0,
                            baseCurrency_card: 0,
                            secondaryCurrency_card: 0,
                            baseCurrency_cash: baseCurrency_subscriptionFee,
                            secondaryCurrency_cash:
                                secondaryCurrency_subscriptionFee,
                        };

                        const subscriptionData = {
                            user: subscription.user,
                            subscriptionStatus: 'ongoing',
                            subscriptionAutoRenew: true,
                            paymentStatus: 'pending',
                            subscriptionPackage:
                                subscription.subscriptionPackage,
                            baseCurrency_subscriptionFee:
                                baseCurrency_subscriptionFee,
                            secondaryCurrency_subscriptionFee:
                                secondaryCurrency_subscriptionFee,
                            paymentMethod: 'cash',
                            summary,
                            subscriptionDuration,
                        };

                        const newSubscription = await SubscriptionModel.create(
                            subscriptionData
                        );

                        await UserModel.findByIdAndUpdate(subscription.user, {
                            $set: {
                                subscription: newSubscription._id,
                                isSubscribed: true,
                            },
                        });
                    } else {
                        await UserModel.findByIdAndUpdate(subscription.user, {
                            $unset: {
                                subscription: 1,
                            },
                            $set: {
                                isSubscribed: false,
                            },
                        });
                    }

                    const cronJob = new CronJob({
                        name: `Subscription expired ${subscription._id}`,
                        status: 1,
                        error: null,
                    });
                    await cronJob.save();
                }
            });
        } catch (error) {
            console.log(error);
            const cronJob = new CronJob({
                name: 'Subscription system cron job',
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
