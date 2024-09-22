var cron = require('node-cron');
const CronJob = require('../models/CronJobModel');
const moment = require('moment');
const PayoutSettingModel = require('../models/PayoutSettingModel');
const ShopModel = require('../models/ShopModel');
const OrderModel = require('../models/OrderModel');
const PayoutModel = require('../models/PayoutModel');
const short = require('short-uuid');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const TransactionModel = require('../models/TransactionModel');
const ButlerModel = require('../models/ButlerModel');
const AppSetting = require('../models/AppSetting');

async function scheduleCronJob() {
    // Set the day of the week as an argument (0 for Sunday, 1 for Monday, etc.)
    const payoutSetting = await PayoutSettingModel.findOne({});
    const firstDayOfWeek = payoutSetting?.firstDayOfWeek || 0;

    // every first day of week at 00:00:00 AM
    cron.schedule(
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

                for (const shop of shops) {
                    const orderQuery = {
                        isShopPayoutCreated: false,
                        shop: shop._id,
                        $or: [
                            {
                                orderStatus: 'delivered',
                                isRefundedAfterDelivered: false,
                            },
                            { orderStatus: 'cancelled', refundType: 'partial' },
                            { orderStatus: 'refused', paymentMethod: 'cash' },
                            {
                                orderStatus: 'delivered',
                                isRefundedAfterDelivered: true,
                            },
                        ],
                    };

                    const orders = await OrderModel.find(orderQuery);
                    const ordersId = orders?.map(order => order._id.toString());

                    const transactionQuery = {
                        isShopPayoutCreated: false,
                        shop: shop._id,
                        account: 'shop',
                        type: {
                            $in: [
                                'shopPayForFeatured',
                                'adminAddBalanceShop',
                                'adminRemoveBalanceShop',
                                'replacementOrderShopCut',
                                'shopEndorseLoss',
                                'shopGetForCancelReplacementOrder',
                            ],
                        },
                        status: 'success',
                    };

                    const transactions = await TransactionModel.find(
                        transactionQuery
                    );
                    const transactionsId = transactions?.map(transaction =>
                        transaction._id.toString()
                    );

                    // Create payout for all shops
                    await PayoutModel.create({
                        autoPayoutId: `${moment().format(
                            'DDMMYYHmmss'
                        )}${short().new()}`,
                        orders: ordersId,
                        transactions: transactionsId,
                        payoutAccount: 'shop',
                        shop: shop._id,
                        seller: shop.seller,
                        payoutStatus: 'unpaid',
                        payoutBillingPeriod: {
                            From: pastWeekDate,
                            To: new Date(
                                new Date(pastWeekDate).setDate(
                                    pastWeekDate.getDate() + 6
                                )
                            ),
                        },
                        payoutOverDueDate,
                        adminExchangeRate,
                        shopExchangeRate: shop.shopExchangeRate,
                    });

                    if (ordersId.length) {
                        await OrderModel.updateMany(
                            { _id: { $in: ordersId } },
                            { $set: { isShopPayoutCreated: true } }
                        );
                    }

                    if (transactionsId.length) {
                        await TransactionModel.updateMany(
                            { _id: { $in: transactionsId } },
                            { $set: { isShopPayoutCreated: true } }
                        );
                    }
                }

                //****** Payout system for Rider ******/
                const deliveryBoys = await DeliveryBoyModel.find({
                    deletedAt: null,
                    status: 'active',
                    deliveryBoyType: 'dropRider',
                });

                for (const deliveryBoy of deliveryBoys) {
                    const orderQuery = {
                        isRiderPayoutCreated: false,
                        deliveryBoy: deliveryBoy._id,
                        $or: [
                            { orderStatus: 'delivered' },
                            { orderStatus: 'cancelled', refundType: 'partial' },
                            { orderStatus: 'refused', paymentMethod: 'cash' },
                        ],
                    };

                    const orders = await OrderModel.find(orderQuery);
                    const butlerOrders = await ButlerModel.find({
                        isRiderPayoutCreated: false,
                        deliveryBoy: deliveryBoy._id,
                        orderStatus: 'delivered',
                    });

                    const allOrders = [...orders, ...butlerOrders];
                    const ordersId = allOrders?.map(order =>
                        order._id.toString()
                    );

                    const transactionQuery = {
                        isRiderPayoutCreated: false,
                        deliveryBoy: deliveryBoy._id,
                        account: 'deliveryBoy',
                        type: {
                            $in: [
                                'adminAddBalanceRider',
                                'adminRemoveBalanceRider',
                            ],
                        },
                        status: 'success',
                    };

                    const transactions = await TransactionModel.find(
                        transactionQuery
                    );
                    const transactionsId = transactions?.map(transaction =>
                        transaction._id.toString()
                    );

                    // Create payout for all rider
                    await PayoutModel.create({
                        autoPayoutId: `${moment().format(
                            'DDMMYYHmmss'
                        )}${short().new()}`,
                        orders: ordersId,
                        transactions: transactionsId,
                        payoutAccount: 'deliveryBoy',
                        deliveryBoy: deliveryBoy._id,
                        payoutStatus: 'unpaid',
                        payoutBillingPeriod: {
                            From: pastWeekDate,
                            To: new Date(
                                new Date(pastWeekDate).setDate(
                                    pastWeekDate.getDate() + 6
                                )
                            ),
                        },
                        payoutOverDueDate,
                        adminExchangeRate,
                    });

                    if (ordersId.length) {
                        await OrderModel.updateMany(
                            { _id: { $in: ordersId } },
                            { $set: { isRiderPayoutCreated: true } }
                        );

                        await ButlerModel.updateMany(
                            { _id: { $in: ordersId } },
                            { $set: { isRiderPayoutCreated: true } }
                        );
                    }

                    if (transactionsId.length) {
                        await TransactionModel.updateMany(
                            { _id: { $in: transactionsId } },
                            { $set: { isRiderPayoutCreated: true } }
                        );
                    }
                }

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
}

// Call the async function to schedule the cron job
scheduleCronJob();
