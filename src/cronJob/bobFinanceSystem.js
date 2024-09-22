var cron = require('node-cron');
const CronJob = require('../models/CronJobModel');
const moment = require('moment');
const short = require('short-uuid');
const BOBFinanceModel = require('../models/BOBFinanceModel');
const TransactionModel = require('../models/TransactionModel');
const { GetTransfersFunc } = require('../controllers/BOBFinanceController');
const { notifyAfterPaidBOBTrx } = require('../config/socket');

async function scheduleCronJob() {
    // every minute run this cron job
    cron.schedule(
        '* * * * *',
        async () => {
            console.log('Run BoB Finance System CronJob -every minute');
            try {
                const notPaidBOBTrx = await BOBFinanceModel.find({
                    status: 'NOT PAID',
                    bobModel: 'C2B',
                }).populate({ path: 'shop', select: 'shopType' });

                if (notPaidBOBTrx.length) {
                    const createdAtDates = notPaidBOBTrx.map(
                        item => new Date(item.createdAt)
                    );
                    // Find maximum and minimum dates
                    const maxDate = new Date(Math.max(...createdAtDates));
                    const minDate = new Date(Math.min(...createdAtDates));

                    // Add 1 day to maxDate and subtract 1 day from minDate
                    const oneDay = 24 * 60 * 60 * 1000; // 1 day in milliseconds
                    const maxDatePlusOneDay = new Date(
                        maxDate.getTime() + oneDay
                    );
                    const minDateMinusOneDay = new Date(
                        minDate.getTime() - oneDay
                    );

                    // const notPaidC2BTrx = notPaidBOBTrx.filter(
                    //     item => item.bobModel === 'C2B'
                    // );
                    const notPaidC2BTrx = notPaidBOBTrx;

                    if (notPaidC2BTrx.length) {
                        const { responseObject: C2BTrx } =
                            await GetTransfersFunc({
                                startDate: minDateMinusOneDay,
                                endDate: maxDatePlusOneDay,
                                Model: 'C2B',
                            });

                        await Promise.all(
                            notPaidC2BTrx.map(async trx => {
                                const findNotPaidReq = C2BTrx.some(
                                    item =>
                                        item.ReferenceNumber == trx.crmNumber &&
                                        item.Status == 'NOT PAID'
                                );

                                if (C2BTrx.length && !findNotPaidReq) {
                                    await TransactionModel.create({
                                        autoTrxId: `${moment().format(
                                            'DDMMYYHmm'
                                        )}${short().new()}`,
                                        account: 'deliveryBoy',
                                        type: 'deliveryBoyAdminAmountReceivedCash',
                                        status: 'success',
                                        deliveryBoy: trx.deliveryBoy,
                                        amount: trx.amount,
                                        secondaryCurrency_amount:
                                            trx.secondaryCurrency_amount,
                                        paidCurrency: trx.paidCurrency,
                                        bobFinance: trx._id,
                                    });

                                    await BOBFinanceModel.findByIdAndUpdate(
                                        trx._id,
                                        {
                                            $set: { status: 'PAID' },
                                        }
                                    );

                                    await notifyAfterPaidBOBTrx(trx);
                                }
                            })
                        );
                    }

                    // const notPaidB2CTrx = notPaidBOBTrx.filter(
                    //     item => item.bobModel === 'B2C'
                    // );

                    // if (notPaidB2CTrx.length) {
                    //     const { responseObject: B2CTrx } =
                    //         await GetTransfersFunc({
                    //             startDate: minDateMinusOneDay,
                    //             endDate: maxDatePlusOneDay,
                    //             Model: 'B2C',
                    //         });

                    //     await Promise.all(
                    //         notPaidB2CTrx.map(async trx => {
                    //             const findNotPaidReq = B2CTrx.some(
                    //                 item =>
                    //                     item.TransferNumber ==
                    //                         trx.referenceNumber &&
                    //                     item.Status == 'NOT PAID'
                    //             );

                    //             if (B2CTrx.length && !findNotPaidReq) {
                    //                 if (trx.account === 'shop') {
                    //                     await TransactionModel.create({
                    //                         autoTrxId: `TNX${moment().format(
                    //                             'DDMMYYHmm'
                    //                         )}${short().new()}`,
                    //                         account: 'shop',
                    //                         type: 'adminSettlebalanceShop',
                    //                         status: 'success',
                    //                         shop: trx.shop._id,
                    //                         seller: trx.seller,
                    //                         amount: trx.amount,
                    //                         secondaryCurrency_amount:
                    //                             trx.secondaryCurrency_amount,
                    //                         adminBy: trx.admin,
                    //                         payout: trx.payout,
                    //                         paidCurrency: trx.paidCurrency,
                    //                         orderType: trx.shop.shopType,
                    //                         bobFinance: trx._id,
                    //                     });
                    //                 } else if (trx.account === 'deliveryBoy') {
                    //                     await TransactionModel.create({
                    //                         autoTrxId: `TNX${moment().format(
                    //                             'DDMMYYHmm'
                    //                         )}${short().new()}`,
                    //                         account: 'deliveryBoy',
                    //                         type: 'deliveryBoyAmountSettle',
                    //                         status: 'success',
                    //                         deliveryBoy: trx.deliveryBoy,
                    //                         amount: trx.amount,
                    //                         secondaryCurrency_amount:
                    //                             trx.secondaryCurrency_amount,
                    //                         adminBy: trx.admin,
                    //                         payout: trx.payout,
                    //                         riderTip: trx.riderTip,
                    //                         secondaryCurrency_riderTip:
                    //                             trx.secondaryCurrency_riderTip,
                    //                         paidCurrency: trx.paidCurrency,
                    //                         bobFinance: trx._id,
                    //                     });
                    //                 }

                    //                 await BOBFinanceModel.findByIdAndUpdate(
                    //                     trx._id,
                    //                     {
                    //                         $set: { status: 'PAID' },
                    //                     }
                    //                 );
                    //             }
                    //         })
                    //     );
                    // }
                }
            } catch (error) {
                const cronJob = new CronJob({
                    name: 'BoB Finance system cron job',
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
