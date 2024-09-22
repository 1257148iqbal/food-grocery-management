const {
    validationError,
    successResponse,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const PayoutModel = require('../models/PayoutModel');
const PayoutSettingModel = require('../models/PayoutSettingModel');
const OrderModel = require('../models/OrderModel');
const ShopModel = require('../models/ShopModel');
const moment = require('moment');
const { DateTime } = require('luxon');
const short = require('short-uuid');
const {
    getFeaturedAmount,
    getTotalRefundAmount,
    getShopAddRemoveCredit,
    getShopDeliveryFee,
    getOrderStatistics,
    getDeliveryFinancial,
    getAdminEarning,
    getRiderAddRemoveCredit,
    getTotalErrorCharge,
    getRiderWeeklyReward,
} = require('./FinancialController');
const AppSetting = require('../models/AppSetting');
const TransactionModel = require('../models/TransactionModel');
const ButlerModel = require('../models/ButlerModel');
const {
    sendNotificationsForAddRemoveCredit,
} = require('./NotificationController');

const { deductServiceFeePercentage } = require('./ServiceFeeController')

exports.getPayouts = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            startDate,
            endDate,
            payoutStatus,
            payoutAccount,
            shopId,
            sellerId,
            deliveryBoyId,
        } = req.query;

        let whereConfig = {};

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            whereConfig = {
                ...whereConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);

            const autoPayoutIdQuery = newQuery.map(str => ({
                autoPayoutId: RegExp(str, 'i'),
            }));

            const autoGenIdQuery = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: autoPayoutIdQuery },
                            { $and: autoGenIdQuery },
                        ],
                    },
                ],
            };
        }

        if (
            payoutStatus &&
            ['paid', 'unpaid', 'revoked', 'overdue'].includes(payoutStatus)
        ) {
            whereConfig.payoutStatus = payoutStatus;
        }

        if (payoutAccount && ['deliveryBoy', 'shop'].includes(payoutAccount)) {
            whereConfig.payoutAccount = payoutAccount;
        }

        if (shopId) {
            whereConfig.shop = shopId;
        }

        if (sellerId) {
            whereConfig.seller = sellerId;
        }

        if (deliveryBoyId) {
            whereConfig.deliveryBoy = deliveryBoyId;
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: PayoutModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const payouts = await PayoutModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'shop',
                    select: '-password',
                },
                {
                    path: 'deliveryBoy',
                    select: '-password',
                },
            ]);

        for (const payout of payouts) {
            if (payout.payoutAccount === 'deliveryBoy') {
                const { profitBreakdown } = await calcRiderPayoutFunc(payout);

                payout._doc.profitBreakdown = profitBreakdown;
            }
            if (payout.payoutAccount === 'shop') {
                const { profitBreakdown } = await calcShopPayoutFunc(payout);

                payout._doc.profitBreakdown = profitBreakdown;
            }
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                payouts: payouts,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getRiderPayoutHistoryInApp = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            startDate,
            endDate,
            payoutStatus,
        } = req.query;
        const deliveryBoyId = req.deliveryBoyId;

        let whereConfig = {
            payoutAccount: 'deliveryBoy',
            deliveryBoy: deliveryBoyId,
        };

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            whereConfig = {
                ...whereConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);

            const autoPayoutIdQuery = newQuery.map(str => ({
                autoPayoutId: RegExp(str, 'i'),
            }));

            const autoGenIdQuery = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: autoPayoutIdQuery },
                            { $and: autoGenIdQuery },
                        ],
                    },
                ],
            };
        }

        if (
            payoutStatus &&
            ['paid', 'unpaid', 'revoked', 'overdue'].includes(payoutStatus)
        ) {
            whereConfig.payoutStatus = payoutStatus;
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: PayoutModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const payouts = await PayoutModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        for (const payout of payouts) {
            const { profitBreakdown } = await calcRiderPayoutFunc(payout);

            payout._doc.profitBreakdown = profitBreakdown;
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                payouts: payouts,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.revokedPayout = async (req, res) => {
    try {
        const { payoutId, payoutRevokedReason } = req.body;

        const isExist = await PayoutModel.findOne({ _id: payoutId });

        if (!isExist) return errorResponse(res, 'Payout not found');

        await PayoutModel.updateOne(
            { _id: payoutId },
            {
                $set: {
                    payoutStatus: 'revoked',
                    payoutRevokedReason,
                },
            }
        );

        const payout = await PayoutModel.findById(payoutId).populate([
            {
                path: 'seller',
                select: '-password',
            },
            {
                path: 'shop',
                select: '-password',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
        ]);

        successResponse(res, {
            message: `Successfully revoked`,
            data: {
                payout,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.paidPayout = async (req, res) => {
    try {
        const {
            payoutId,
            baseCurrency_payoutPaidAmount,
            baseCurrency_payoutPaidAmount_sc,
            secondaryCurrency_payoutPaidAmount,
            secondaryCurrency_payoutPaidAmount_bc,
            baseCurrency_riderTip,
            secondaryCurrency_riderTip,
        } = req.body;
        const adminId = req.adminId;

        if (
            !baseCurrency_payoutPaidAmount &&
            !secondaryCurrency_payoutPaidAmount
        ) {
            return errorResponse(res, 'invalid amount');
        }

        const payout = await PayoutModel.findOne({
            _id: payoutId,
            payoutStatus: { $nin: ['paid'] },
        }).populate('shop');
        if (!payout) {
            return errorResponse(res, 'payout not found');
        }

        let transactions = [];
        if (payout.payoutAccount === 'shop') {
            if (baseCurrency_payoutPaidAmount) {
                const transaction = await TransactionModel.create({
                    autoTrxId: `TNX${moment().format(
                        'DDMMYYHmm'
                    )}${short().new()}`,
                    account: 'shop',
                    type: 'adminSettlebalanceShop',
                    status: 'success',
                    shop: payout.shop._id,
                    seller: payout.seller,
                    amount: baseCurrency_payoutPaidAmount,
                    secondaryCurrency_amount: baseCurrency_payoutPaidAmount_sc,
                    adminBy: adminId,
                    payout: payoutId,
                    paidCurrency: 'baseCurrency',
                    orderType: payout.shop.shopType,
                });

                transactions.push(transaction);
            }
            if (secondaryCurrency_payoutPaidAmount) {
                const transaction = await TransactionModel.create({
                    autoTrxId: `TNX${moment().format(
                        'DDMMYYHmm'
                    )}${short().new()}`,
                    account: 'shop',
                    type: 'adminSettlebalanceShop',
                    status: 'success',
                    shop: payout.shop._id,
                    seller: payout.seller,
                    amount: secondaryCurrency_payoutPaidAmount_bc,
                    secondaryCurrency_amount:
                        secondaryCurrency_payoutPaidAmount,
                    adminBy: adminId,
                    payout: payoutId,
                    paidCurrency: 'secondaryCurrency',
                    orderType: payout.shop.shopType,
                });

                transactions.push(transaction);
            }
        } else {
            if (baseCurrency_payoutPaidAmount) {
                const transaction = await TransactionModel.create({
                    autoTrxId: `TNX${moment().format(
                        'DDMMYYHmm'
                    )}${short().new()}`,
                    account: 'deliveryBoy',
                    type: 'deliveryBoyAmountSettle',
                    status: 'success',
                    deliveryBoy: payout.deliveryBoy,
                    amount: baseCurrency_payoutPaidAmount,
                    secondaryCurrency_amount: baseCurrency_payoutPaidAmount_sc,
                    adminBy: adminId,
                    payout: payoutId,
                    riderTip: baseCurrency_riderTip,
                    secondaryCurrency_riderTip: secondaryCurrency_riderTip,
                    paidCurrency: 'baseCurrency',
                });

                transactions.push(transaction);
            }
            if (secondaryCurrency_payoutPaidAmount) {
                const transaction = await TransactionModel.create({
                    autoTrxId: `TNX${moment().format(
                        'DDMMYYHmm'
                    )}${short().new()}`,
                    account: 'deliveryBoy',
                    type: 'deliveryBoyAmountSettle',
                    status: 'success',
                    deliveryBoy: payout.deliveryBoy,
                    amount: secondaryCurrency_payoutPaidAmount_bc,
                    secondaryCurrency_amount:
                        secondaryCurrency_payoutPaidAmount,
                    adminBy: adminId,
                    payout: payoutId,
                    riderTip: baseCurrency_riderTip,
                    secondaryCurrency_riderTip: secondaryCurrency_riderTip,
                    paidCurrency: 'secondaryCurrency',
                });

                transactions.push(transaction);
            }
        }

        await PayoutModel.updateOne(
            { _id: payoutId },
            {
                $set: {
                    payoutStatus: 'paid',
                    baseCurrency_payoutPaidAmount,
                    secondaryCurrency_payoutPaidAmount,
                },
            }
        );

        return successResponse(res, {
            message: 'Successfully paid',
            data: {
                transactions,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addRemoveCreditPayout = async (req, res) => {
    try {
        const {
            payoutId,
            baseCurrency_amount,
            secondaryCurrency_amount,
            type,
            desc,
            paidCurrency,
        } = req.body;
        const adminId = req.adminId;

        if (!baseCurrency_amount) {
            return errorResponse(res, 'invalid amount');
        }

        if (!type) {
            return errorResponse(res, 'type is required');
        }

        const payout = await PayoutModel.findOne({
            _id: payoutId,
            payoutStatus: { $nin: ['paid'] },
        }).populate('shop');

        if (!payout) {
            return errorResponse(res, 'payout not found');
        }

        let transaction;
        let txnType = '';
        if (type === 'add') {
            txnType =
                payout.payoutAccount === 'shop'
                    ? 'adminAddBalanceShop'
                    : 'adminAddBalanceRider';
        } else if (type === 'remove') {
            txnType =
                payout.payoutAccount === 'shop'
                    ? 'adminRemoveBalanceShop'
                    : 'adminRemoveBalanceRider';
        }

        if (payout.payoutAccount === 'shop') {
            transaction = await TransactionModel.create({
                autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
                account: 'shop',
                type: txnType,
                status: 'success',
                shop: payout.shop._id,
                seller: payout.seller,
                amount: baseCurrency_amount,
                secondaryCurrency_amount: secondaryCurrency_amount,
                adminBy: adminId,
                desc: desc,
                paidCurrency: paidCurrency,
                orderType: payout.shop.shopType,
                isShopPayoutCreated: true,
            });

            await sendNotificationsForAddRemoveCredit(type, transaction);
        } else {
            transaction = await TransactionModel.create({
                autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
                account: 'deliveryBoy',
                type: txnType,
                status: 'success',
                deliveryBoy: payout.deliveryBoy,
                amount: baseCurrency_amount,
                secondaryCurrency_amount: secondaryCurrency_amount,
                adminBy: adminId,
                desc: desc,
                paidCurrency: paidCurrency,
                isRiderPayoutCreated: true,
            });

            await sendNotificationsForAddRemoveCredit(type, transaction);
        }

        await PayoutModel.updateOne(
            { _id: payoutId },
            {
                $push: {
                    transactions: transaction._id,
                },
                $set: {
                    isPayoutAdjusted: true,
                },
            }
        );

        successResponse(res, {
            message: 'Successfully completed',
            data: {
                transaction,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const calcRiderPayoutFunc = async payout => {
    let profitBreakdown = {};
    // const appSetting = await AppSetting.findOne({});
    const currency =
        payout.adminExchangeRate === 0 ? 'baseCurrency' : 'secondaryCurrency';

    if (currency === 'baseCurrency') {
        const {
            deliveryFee: totalDeliveryFee,
            orderAmount: orderAmount,
            userPayDeliveryFee: users,
            freeDeliveryShopCut: freeDeliveryByShop,
            freeDeliveryAdminCut: freeDeliveryByAdmin,
            freeDeliveryAdminCutForSubscription:
            freeDeliveryByAdminForSubscription,
            riderPayout: riderPayoutForOrder,
            secondaryCurrency_riderPayout:
            secondaryCurrency_riderPayoutForOrder,
            riderPayoutForButler: riderPayoutForButler,
            secondaryCurrency_riderPayoutForButler:
            secondaryCurrency_riderPayoutForButler,
            userPayRiderTip: userPayRiderTip,
            secondaryCurrency_userPayRiderTip:
            secondaryCurrency_userPayRiderTip,
            adminDeliveryProfit: adminOrderDeliveryProfit,
            adminButlerProfit: adminButlerProfit,
        } = await getDeliveryFinancial({
            orderIds: payout.orders,
            isShopRiderSubscriptionLossAdjust: false,
        });

        const riderPayout = riderPayoutForOrder + riderPayoutForButler;
        const secondaryCurrency_riderPayout =
            secondaryCurrency_riderPayoutForOrder +
            secondaryCurrency_riderPayoutForButler;
        const adminDeliveryProfit =
            adminOrderDeliveryProfit + adminButlerProfit;

        // Calculate rider add remove credit start
        const {
            totalAddRemoveCredit: riderAddRemoveCredit,
            secondaryCurrency_totalAddRemoveCredit:
            secondaryCurrency_riderAddRemoveCredit,
        } = await getRiderAddRemoveCredit({
            transactionIds: payout.transactions,
        });
        // Calculate rider add remove credit end

        // Calculate rider weekly reward start
        const { riderWeeklyReward, secondaryCurrency_riderWeeklyReward } =
            await getRiderWeeklyReward({
                transactionIds: payout.transactions,
            });
        // Calculate rider weekly reward end

        profitBreakdown = {
            users: users + orderAmount,
            freeDeliveryByShop,
            freeDeliveryByAdmin:
                freeDeliveryByAdmin - freeDeliveryByAdminForSubscription,
            freeDeliveryByAdminForSubscription,
            totalDeliveryFee: totalDeliveryFee + orderAmount,
            adminDeliveryProfit: adminDeliveryProfit + freeDeliveryByAdmin,
            riderTips: userPayRiderTip,
            baseCurrency_riderTips: userPayRiderTip,
            secondaryCurrency_riderTips: secondaryCurrency_userPayRiderTip,
            riderAddRemoveCredit,
            riderWeeklyReward,
            riderPayout: riderPayout + riderAddRemoveCredit + riderWeeklyReward,
            baseCurrency_riderPayout:
                riderPayout + riderAddRemoveCredit + riderWeeklyReward,
            secondaryCurrency_riderPayout:
                secondaryCurrency_riderPayout +
                secondaryCurrency_riderAddRemoveCredit +
                secondaryCurrency_riderWeeklyReward,
            currency,
        };
    } else {
        const {
            secondaryCurrency_deliveryFee: totalDeliveryFee,
            secondaryCurrency_orderAmount: orderAmount,
            secondaryCurrency_userPayDeliveryFee: users,
            secondaryCurrency_freeDeliveryShopCut: freeDeliveryByShop,
            secondaryCurrency_freeDeliveryAdminCut: freeDeliveryByAdmin,
            secondaryCurrency_freeDeliveryAdminCutForSubscription:
            freeDeliveryByAdminForSubscription,
            secondaryCurrency_riderPayout: riderPayoutForOrder,
            riderPayout: baseCurrency_riderPayoutForOrder,
            secondaryCurrency_riderPayoutForButler: riderPayoutForButler,
            riderPayoutForButler: baseCurrency_riderPayoutForButler,
            secondaryCurrency_userPayRiderTip: userPayRiderTip,
            userPayRiderTip: baseCurrency_userPayRiderTip,
            secondaryCurrency_adminDeliveryProfit: adminOrderDeliveryProfit,
            secondaryCurrency_adminButlerProfit: adminButlerProfit,
        } = await getDeliveryFinancial({
            orderIds: payout.orders,
            isShopRiderSubscriptionLossAdjust: false,
        });

        const riderPayout = riderPayoutForOrder + riderPayoutForButler;
        const baseCurrency_riderPayout =
            baseCurrency_riderPayoutForOrder +
            baseCurrency_riderPayoutForButler;
        const adminDeliveryProfit =
            adminOrderDeliveryProfit + adminButlerProfit;

        // Calculate rider add remove credit start
        const {
            totalAddRemoveCredit: baseCurrency_riderAddRemoveCredit,
            secondaryCurrency_totalAddRemoveCredit: riderAddRemoveCredit,
        } = await getRiderAddRemoveCredit({
            transactionIds: payout.transactions,
        });
        // Calculate rider add remove credit end

        // Calculate rider weekly reward start
        const {
            riderWeeklyReward: baseCurrency_riderWeeklyReward,
            secondaryCurrency_riderWeeklyReward: riderWeeklyReward,
        } = await getRiderWeeklyReward({
            transactionIds: payout.transactions,
        });
        // Calculate rider weekly reward end

        profitBreakdown = {
            users: users + orderAmount,
            freeDeliveryByShop,
            freeDeliveryByAdmin:
                freeDeliveryByAdmin - freeDeliveryByAdminForSubscription,
            freeDeliveryByAdminForSubscription,
            totalDeliveryFee: totalDeliveryFee + orderAmount,
            adminDeliveryProfit: adminDeliveryProfit + freeDeliveryByAdmin,
            riderTips: userPayRiderTip,
            baseCurrency_riderTips: baseCurrency_userPayRiderTip,
            secondaryCurrency_riderTips: userPayRiderTip,
            riderAddRemoveCredit,
            riderWeeklyReward,
            riderPayout: riderPayout + riderAddRemoveCredit + riderWeeklyReward,
            baseCurrency_riderPayout:
                baseCurrency_riderPayout +
                baseCurrency_riderAddRemoveCredit +
                baseCurrency_riderWeeklyReward,
            secondaryCurrency_riderPayout:
                riderPayout + riderAddRemoveCredit + riderWeeklyReward,
            currency,
        };
    }

    return { profitBreakdown };
};

const calcShopPayoutFunc = async payout => {
    const currency =
        payout.adminExchangeRate === 0 ? 'baseCurrency' : 'secondaryCurrency';

    const orderStatistics = await getOrderStatistics({
        orderIds: payout.orders,
        transactionIds: payout.transactions,
    });

    //** Create summary Start **/
    const orderStatistics_cash = await getOrderStatistics({
        orderIds: payout.orders,
        paymentMethod: 'cash',
    });
    const orderStatistics_online = await getOrderStatistics({
        orderIds: payout.orders,
        paymentMethod: 'online',
    });
    const originalOrderAmount_cash =
        orderStatistics_cash.totalValue.productAmount +
        orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
    const discount_cash = orderStatistics_cash.totalValue.totalDiscount;
    const loyaltyPoints_cash =
        orderStatistics_cash.totalValue.totalRewardAmount;
    const buy1Get1_cash =
        orderStatistics_cash.totalValue.totalDoubleMenuItemPrice;
    const couponDiscount_cash =
        orderStatistics_cash.totalValue.totalCouponAdminCut +
        orderStatistics_cash.totalValue.totalCouponShopCut;
    const totalCash =
        originalOrderAmount_cash -
        discount_cash -
        loyaltyPoints_cash -
        buy1Get1_cash -
        couponDiscount_cash;
    const secondaryCurrency_originalOrderAmount_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_productAmount +
        orderStatistics_cash.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const secondaryCurrency_discount_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_totalDiscount;
    const secondaryCurrency_loyaltyPoints_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_totalRewardAmount;
    const secondaryCurrency_buy1Get1_cash =
        orderStatistics_cash.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const secondaryCurrency_couponDiscount_cash =
        orderStatistics_cash.totalValue.secondaryCurrency_totalCouponAdminCut +
        orderStatistics_cash.totalValue.secondaryCurrency_totalCouponShopCut;
    const secondaryCurrency_totalCash =
        secondaryCurrency_originalOrderAmount_cash -
        secondaryCurrency_discount_cash -
        secondaryCurrency_loyaltyPoints_cash -
        secondaryCurrency_buy1Get1_cash -
        secondaryCurrency_couponDiscount_cash;

    const originalOrderAmount_online =
        orderStatistics_online.totalValue.productAmount +
        orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
    const discount_online = orderStatistics_online.totalValue.totalDiscount;
    const loyaltyPoints_online =
        orderStatistics_online.totalValue.totalRewardAmount;
    const buy1Get1_online =
        orderStatistics_online.totalValue.totalDoubleMenuItemPrice;
    const couponDiscount_online =
        orderStatistics_online.totalValue.totalCouponAdminCut +
        orderStatistics_online.totalValue.totalCouponShopCut;
    const totalOnline =
        originalOrderAmount_online -
        discount_online -
        loyaltyPoints_online -
        buy1Get1_online -
        couponDiscount_online;
    const secondaryCurrency_originalOrderAmount_online =
        orderStatistics_online.totalValue.secondaryCurrency_productAmount +
        orderStatistics_online.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const secondaryCurrency_discount_online =
        orderStatistics_online.totalValue.secondaryCurrency_totalDiscount;
    const secondaryCurrency_loyaltyPoints_online =
        orderStatistics_online.totalValue.secondaryCurrency_totalRewardAmount;
    const secondaryCurrency_buy1Get1_online =
        orderStatistics_online.totalValue
            .secondaryCurrency_totalDoubleMenuItemPrice;
    const secondaryCurrency_couponDiscount_online =
        orderStatistics_online.totalValue
            .secondaryCurrency_totalCouponAdminCut +
        orderStatistics_online.totalValue.secondaryCurrency_totalCouponShopCut;
    const secondaryCurrency_totalOnline =
        secondaryCurrency_originalOrderAmount_online -
        secondaryCurrency_discount_online -
        secondaryCurrency_loyaltyPoints_online -
        secondaryCurrency_buy1Get1_online -
        secondaryCurrency_couponDiscount_online;

    const discount_amc = orderStatistics.totalValue.totalAdminDiscount;
    const buy1Get1_amc =
        orderStatistics.totalValue.totalAdminDoubleMenuItemPrice;
    const couponDiscount_amc = orderStatistics.totalValue.totalCouponAdminCut;
    const pointsCashback = orderStatistics.totalValue.pointsCashback;
    const adminMarketingCashback =
        discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;
    const secondaryCurrency_discount_amc =
        orderStatistics.totalValue.secondaryCurrency_totalAdminDiscount;
    const secondaryCurrency_buy1Get1_amc =
        orderStatistics.totalValue
            .secondaryCurrency_totalAdminDoubleMenuItemPrice;
    const secondaryCurrency_couponDiscount_amc =
        orderStatistics.totalValue.secondaryCurrency_totalCouponAdminCut;
    const secondaryCurrency_pointsCashback =
        orderStatistics.totalValue.secondaryCurrency_pointsCashback;
    const secondaryCurrency_adminMarketingCashback =
        secondaryCurrency_discount_amc +
        secondaryCurrency_buy1Get1_amc +
        secondaryCurrency_couponDiscount_amc +
        secondaryCurrency_pointsCashback;

    const orderAmount = totalCash + totalOnline + adminMarketingCashback;
    const secondaryCurrency_orderAmount =
        secondaryCurrency_totalCash +
        secondaryCurrency_totalOnline +
        secondaryCurrency_adminMarketingCashback;

    const totalVat = orderStatistics.totalValue.totalVat;
    const secondaryCurrency_totalVat =
        orderStatistics.totalValue.secondaryCurrency_totalVat;

    let { adminFees, secondaryCurrency_adminFees } = await getAdminEarning({
        orderIds: payout.orders,
    });
    adminFees += adminMarketingCashback;
    secondaryCurrency_adminFees += secondaryCurrency_adminMarketingCashback;

    const freeDeliveryByShop = orderStatistics.totalValue.freeDeliveryShopCut;
    const secondaryCurrency_freeDeliveryByShop =
        orderStatistics.totalValue.secondaryCurrency_freeDeliveryShopCut;

    const { featuredAmount, secondaryCurrency_featuredAmount } =
        await getFeaturedAmount({
            transactionIds: payout.transactions,
        });

    const {
        refundAmount: customerRefund,
        secondaryCurrency_refundAmount: secondaryCurrency_customerRefund,
    } = await getTotalRefundAmount({
        transactionIds: payout.transactions,
        account: 'shop',
    });

    const {
        totalAddRemoveCredit: shopAddRemoveCredit,
        secondaryCurrency_totalAddRemoveCredit:
        secondaryCurrency_shopAddRemoveCredit,
    } = await getShopAddRemoveCredit({
        transactionIds: payout.transactions,
    });

    const {
        totalErrorCharge: errorCharge,
        secondaryCurrency_totalErrorCharge: secondaryCurrency_errorCharge,
    } = await getTotalErrorCharge({
        transactionIds: payout.transactions,
        account: 'shop',
    });

    const {
        deliveryFee: deliveryFee_cash,
        secondaryCurrency_deliveryFee: secondaryCurrency_deliveryFee_cash,
    } = await getShopDeliveryFee({
        orderIds: payout.orders,
        paymentMethod: 'cash',
    });

    const {
        deliveryFee: deliveryFee_online,
        riderTip: riderTip_online,
        secondaryCurrency_deliveryFee: secondaryCurrency_deliveryFee_online,
        secondaryCurrency_riderTip: secondaryCurrency_riderTip_online,
    } = await getShopDeliveryFee({
        orderIds: payout.orders,
        paymentMethod: 'online',
    });

    let totalPayout =
        orderStatistics.totalValue.shopEarnings +
        totalVat +
        shopAddRemoveCredit -
        customerRefund -
        featuredAmount -
        errorCharge;
    let secondaryCurrency_totalPayout =
        orderStatistics.totalValue.secondaryCurrency_shopEarnings +
        secondaryCurrency_totalVat +
        secondaryCurrency_shopAddRemoveCredit -
        secondaryCurrency_customerRefund -
        secondaryCurrency_featuredAmount -
        secondaryCurrency_errorCharge;

    // deduct lyxa service fee from payout
    deductedPayouts = await deductServiceFeePercentage(totalPayout, secondaryCurrency_totalPayout)

    totalPayout = deductedPayouts.baseCurrency
    secondaryCurrency_totalPayout = deductedPayouts.secondaryCurrency

    const {
        shopCashInHand: totalShopCashInHand,
        secondaryCurrency_shopCashInHand: secondaryCurrency_totalShopCashInHand,
    } = await calcShopCashInHand(payout.orders);

    let profitBreakdown = {};
    if (currency === 'baseCurrency') {
        profitBreakdown = {
            cash: {
                originalOrderAmount_cash,
                discount_cash,
                loyaltyPoints_cash,
                buy1Get1_cash,
                couponDiscount_cash,
                totalCash,
            },
            online: {
                originalOrderAmount_online,
                discount_online,
                loyaltyPoints_online,
                buy1Get1_online,
                couponDiscount_online,
                totalOnline,
            },
            AdminMarketingCashback: {
                discount_amc,
                buy1Get1_amc,
                couponDiscount_amc,
                pointsCashback,
                adminMarketingCashback,
            },
            orderAmount,
            adminFees,
            totalVat,
            otherPayments: {
                freeDeliveryByShop,
                featuredAmount,
                customerRefund,
                shopAddRemoveCredit,
                errorCharge,
                totalOtherPayments:
                    freeDeliveryByShop +
                    featuredAmount +
                    customerRefund +
                    errorCharge -
                    shopAddRemoveCredit,
            },
            deliveryFee: {
                deliveryFee:
                    deliveryFee_cash + deliveryFee_online + riderTip_online,
                cash: deliveryFee_cash,
                online: deliveryFee_online + riderTip_online,
                deliveryFee_online,
                riderTip_online,
            },
            totalPayout,
            totalShopCashInHand,
            totalAmount: totalPayout - totalShopCashInHand,

            baseCurrency_totalPayout: totalPayout,
            baseCurrency_totalShopCashInHand: totalShopCashInHand,
            baseCurrency_totalAmount: totalPayout - totalShopCashInHand,
            secondaryCurrency_totalPayout: secondaryCurrency_totalPayout,
            secondaryCurrency_totalShopCashInHand:
                secondaryCurrency_totalShopCashInHand,
            secondaryCurrency_totalAmount:
                secondaryCurrency_totalPayout -
                secondaryCurrency_totalShopCashInHand,
        };
    } else {
        profitBreakdown = {
            cash: {
                originalOrderAmount_cash:
                    secondaryCurrency_originalOrderAmount_cash,
                discount_cash: secondaryCurrency_discount_cash,
                loyaltyPoints_cash: secondaryCurrency_loyaltyPoints_cash,
                buy1Get1_cash: secondaryCurrency_buy1Get1_cash,
                couponDiscount_cash: secondaryCurrency_couponDiscount_cash,
                totalCash: secondaryCurrency_totalCash,
            },
            online: {
                originalOrderAmount_online:
                    secondaryCurrency_originalOrderAmount_online,
                discount_online: secondaryCurrency_discount_online,
                loyaltyPoints_online: secondaryCurrency_loyaltyPoints_online,
                buy1Get1_online: secondaryCurrency_buy1Get1_online,
                couponDiscount_online: secondaryCurrency_couponDiscount_online,
                totalOnline: secondaryCurrency_totalOnline,
            },
            AdminMarketingCashback: {
                discount_amc: secondaryCurrency_discount_amc,
                buy1Get1_amc: secondaryCurrency_buy1Get1_amc,
                couponDiscount_amc: secondaryCurrency_couponDiscount_amc,
                pointsCashback: secondaryCurrency_pointsCashback,
                adminMarketingCashback:
                    secondaryCurrency_adminMarketingCashback,
            },
            orderAmount: secondaryCurrency_orderAmount,
            adminFees: secondaryCurrency_adminFees,
            totalVat: secondaryCurrency_totalVat,
            otherPayments: {
                freeDeliveryByShop: secondaryCurrency_freeDeliveryByShop,
                featuredAmount: secondaryCurrency_featuredAmount,
                customerRefund: secondaryCurrency_customerRefund,
                shopAddRemoveCredit: secondaryCurrency_shopAddRemoveCredit,
                errorCharge: secondaryCurrency_errorCharge,
                totalOtherPayments:
                    secondaryCurrency_freeDeliveryByShop +
                    secondaryCurrency_featuredAmount +
                    secondaryCurrency_customerRefund +
                    secondaryCurrency_errorCharge -
                    secondaryCurrency_shopAddRemoveCredit,
            },
            deliveryFee: {
                deliveryFee:
                    secondaryCurrency_deliveryFee_cash +
                    secondaryCurrency_deliveryFee_online +
                    secondaryCurrency_riderTip_online,
                cash: secondaryCurrency_deliveryFee_cash,
                online:
                    secondaryCurrency_deliveryFee_online +
                    secondaryCurrency_riderTip_online,
                deliveryFee_online: secondaryCurrency_deliveryFee_online,
                riderTip_online: secondaryCurrency_riderTip_online,
            },
            totalPayout: secondaryCurrency_totalPayout,
            totalShopCashInHand: secondaryCurrency_totalShopCashInHand,
            totalAmount:
                secondaryCurrency_totalPayout -
                secondaryCurrency_totalShopCashInHand,

            baseCurrency_totalPayout: totalPayout,
            baseCurrency_totalShopCashInHand: totalShopCashInHand,
            baseCurrency_totalAmount: totalPayout - totalShopCashInHand,
            secondaryCurrency_totalPayout: secondaryCurrency_totalPayout,
            secondaryCurrency_totalShopCashInHand:
                secondaryCurrency_totalShopCashInHand,
            secondaryCurrency_totalAmount:
                secondaryCurrency_totalPayout -
                secondaryCurrency_totalShopCashInHand,
        };
    }

    return { profitBreakdown };
};

const calcShopCashInHand = async (orderIds, paidCurrency) => {
    let commonConfig = {
        orderStatus: 'delivered',
        orderFor: 'specific',
        paymentMethod: 'cash',
    };

    if (paidCurrency) {
        commonConfig = {
            ...commonConfig,
            paidCurrency: paidCurrency,
        };
    }

    if (orderIds) {
        commonConfig = {
            ...commonConfig,
            _id: { $in: orderIds },
        };
    }

    const totalValueQuery = await OrderModel.aggregate([
        {
            $match: { ...commonConfig },
        },

        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                baseCurrency_cash: {
                    $sum: { $sum: ['$summary.baseCurrency_cash'] },
                },
                secondaryCurrency_cash: {
                    $sum: { $sum: ['$summary.secondaryCurrency_cash'] },
                },
            },
        },
    ]);

    const shopCashInHand = totalValueQuery.length
        ? totalValueQuery[0].baseCurrency_cash
        : 0;
    const secondaryCurrency_shopCashInHand = totalValueQuery.length
        ? totalValueQuery[0].secondaryCurrency_cash
        : 0;

    return { shopCashInHand, secondaryCurrency_shopCashInHand };
};

// exports.temporaryPayout = async (req, res) => {
//     try {
//         const currentDate = new Date(); // Set the start date
//         currentDate.setHours(0, 0, 0, 0);
//         const pastWeekDate = new Date(
//             new Date(currentDate).setDate(currentDate.getDate() - 7)
//         );

//         //****** Payout system for Shop ******/
//         const shops = await ShopModel.find({
//             deletedAt: null,
//             parentShop: null,
//             shopStatus: 'active',
//         });

//         for (const shop of shops) {
//             const deliveredOrders = await OrderModel.find({
//                 shop: shop._id,
//                 orderStatus: 'delivered',
//                 deliveredAt: {
//                     $gte: pastWeekDate,
//                     $lt: currentDate,
//                 },
//             });

//             const canceledOrders = await OrderModel.find({
//                 shop: shop._id,
//                 orderStatus: 'cancelled',
//                 refundType: 'partial',
//                 cancelledAt: {
//                     $gte: pastWeekDate,
//                     $lt: currentDate,
//                 },
//             });

//             const refusedOrders = await OrderModel.find({
//                 shop: shop._id,
//                 orderStatus: 'refused',
//                 paymentMethod: 'cash',
//                 refusedAt: {
//                     $gte: pastWeekDate,
//                     $lt: currentDate,
//                 },
//             });

//             const refundedAfterDeliveredOrders = await OrderModel.find({
//                 shop: shop._id,
//                 orderStatus: 'delivered',
//                 isRefundedAfterDelivered: true,
//                 refundedAfterDeliveredAt: {
//                     $gte: pastWeekDate,
//                     $lt: currentDate,
//                 },
//             });

//             if (
//                 deliveredOrders.length ||
//                 canceledOrders.length ||
//                 refusedOrders.length ||
//                 refundedAfterDeliveredOrders.length
//             ) {
//                 const deliveredOrdersId = deliveredOrders.map(
//                     order => order._id
//                 );
//                 const canceledOrdersId = canceledOrders.map(order => order._id);
//                 const refusedOrdersId = refusedOrders.map(order => order._id);
//                 const refundedAfterDeliveredOrdersId =
//                     refundedAfterDeliveredOrders.map(order => order._id);

//                 await PayoutModel.create({
//                     autoPayoutId: `${moment().format(
//                         'DDMMYYHmmss'
//                     )}${short().new()}`,
//                     deliveredOrders: deliveredOrdersId,
//                     canceledOrders: canceledOrdersId,
//                     refusedOrders: refusedOrdersId,
//                     refundedAfterDeliveredOrders:
//                         refundedAfterDeliveredOrdersId,
//                     payoutAccount: 'shop',
//                     shop: shop._id,
//                     seller: shop.seller,
//                     payoutStatus: 'unpaid',
//                     payoutBillingPeriod: {
//                         From: pastWeekDate,
//                         To: new Date(
//                             new Date(pastWeekDate).setDate(
//                                 pastWeekDate.getDate() + 6
//                             )
//                         ),
//                     },
//                 });
//             }
//         }

//         //****** Payout system for Rider ******/
//         const deliveryBoys = await DeliveryBoyModel.find({
//             deletedAt: null,
//             status: 'active',
//             deliveryBoyType: 'dropRider',
//         });

//         for (const deliveryBoy of deliveryBoys) {
//             const deliveredOrders = await OrderModel.find({
//                 deliveryBoy: deliveryBoy._id,
//                 orderStatus: 'delivered',
//                 deliveredAt: {
//                     $gte: pastWeekDate,
//                     $lt: currentDate,
//                 },
//             });

//             const canceledOrders = await OrderModel.find({
//                 deliveryBoy: deliveryBoy._id,
//                 orderStatus: 'cancelled',
//                 refundType: 'partial',
//                 cancelledAt: {
//                     $gte: pastWeekDate,
//                     $lt: currentDate,
//                 },
//             });

//             const refusedOrders = await OrderModel.find({
//                 deliveryBoy: deliveryBoy._id,
//                 orderStatus: 'refused',
//                 paymentMethod: 'cash',
//                 refusedAt: {
//                     $gte: pastWeekDate,
//                     $lt: currentDate,
//                 },
//             });

//             if (
//                 deliveredOrders.length ||
//                 canceledOrders.length ||
//                 refusedOrders.length
//             ) {
//                 const deliveredOrdersId = deliveredOrders.map(
//                     order => order._id
//                 );
//                 const canceledOrdersId = canceledOrders.map(order => order._id);
//                 const refusedOrdersId = refusedOrders.map(order => order._id);

//                 await PayoutModel.create({
//                     autoPayoutId: `${moment().format(
//                         'DDMMYYHmmss'
//                     )}${short().new()}`,
//                     deliveredOrders: deliveredOrdersId,
//                     canceledOrders: canceledOrdersId,
//                     refusedOrders: refusedOrdersId,
//                     payoutAccount: 'deliveryBoy',
//                     deliveryBoy: deliveryBoy._id,
//                     payoutStatus: 'unpaid',
//                     payoutBillingPeriod: {
//                         From: pastWeekDate,
//                         To: new Date(
//                             new Date(pastWeekDate).setDate(
//                                 pastWeekDate.getDate() + 6
//                             )
//                         ),
//                     },
//                 });
//             }
//         }

//         successResponse(res, {
//             message: `Successfully created`,
//         });
//     } catch (error) {
//         errorResponse(res, error.message);
//     }
// };

exports.createShopPayout = async (
    shop,
    adminExchangeRate,
    pastWeekDate,
    payoutOverDueDate
) => {
    const orderQuery = {
        isShopPayoutCreated: false,
        shop: shop._id,
        $or: [
            {
                orderStatus: 'delivered',
                // isRefundedAfterDelivered: false,
            },
            { orderStatus: 'cancelled', refundType: 'partial' },
            { orderStatus: 'refused', paymentMethod: 'cash' },
            // {
            //     orderStatus: 'delivered',
            //     isRefundedAfterDelivered: true,
            // },
        ],
    };

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
                'refundedAfterDeliveredOrderShopCut',
            ],
        },
        status: 'success',
    };

    const [orders, transactions] = await Promise.all([
        OrderModel.find(orderQuery),
        TransactionModel.find(transactionQuery),
    ]);

    const ordersId = orders.map(order => order._id.toString());
    const transactionsId = transactions.map(transaction =>
        transaction._id.toString()
    );

    await PayoutModel.create({
        autoPayoutId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        orders: ordersId,
        transactions: transactionsId,
        payoutAccount: 'shop',
        shop: shop._id,
        seller: shop.seller,
        payoutStatus: 'unpaid',
        payoutBillingPeriod: {
            From: pastWeekDate,
            To: new Date(
                new Date(pastWeekDate).setDate(pastWeekDate.getDate() + 6)
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
};

exports.createRiderPayout = async (
    deliveryBoy,
    adminExchangeRate,
    pastWeekDate,
    payoutOverDueDate
) => {
    const orderQuery = {
        isRiderPayoutCreated: false,
        deliveryBoy: deliveryBoy._id,
        $or: [
            { orderStatus: 'delivered' },
            { orderStatus: 'cancelled', refundType: 'partial' },
            { orderStatus: 'refused', paymentMethod: 'cash' },
        ],
    };

    const transactionQuery = {
        isRiderPayoutCreated: false,
        deliveryBoy: deliveryBoy._id,
        account: 'deliveryBoy',
        type: {
            $in: [
                'adminAddBalanceRider',
                'adminRemoveBalanceRider',
                'riderGetWeeklyReward',
            ],
        },
        status: 'success',
    };

    const [orders, butlerOrders, transactions] = await Promise.all([
        OrderModel.find(orderQuery),
        ButlerModel.find({
            isRiderPayoutCreated: false,
            deliveryBoy: deliveryBoy._id,
            orderStatus: 'delivered',
        }),
        TransactionModel.find(transactionQuery),
    ]);

    const allOrders = [...orders, ...butlerOrders];
    const ordersId = allOrders.map(order => order._id.toString());
    const transactionsId = transactions.map(transaction =>
        transaction._id.toString()
    );

    await PayoutModel.create({
        autoPayoutId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        orders: ordersId,
        transactions: transactionsId,
        payoutAccount: 'deliveryBoy',
        deliveryBoy: deliveryBoy._id,
        payoutStatus: 'unpaid',
        payoutBillingPeriod: {
            From: pastWeekDate,
            To: new Date(
                new Date(pastWeekDate).setDate(pastWeekDate.getDate() + 6)
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
};

exports.temporaryPayout = async (req, res) => {
    try {
        const appSetting = await AppSetting.findOne({});
        const adminExchangeRate = appSetting?.adminExchangeRate || 0;

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const pastWeekDate = new Date(
            new Date(currentDate).setDate(currentDate.getDate() - 7)
        );

        const payoutSetting = await PayoutSettingModel.findOne({});
        const duration = payoutSetting?.overDuePeriod || 30;
        const payoutOverDueDate = new Date(
            new Date(currentDate).setDate(currentDate.getDate() + duration)
        );

        const shops = await ShopModel.find({
            deletedAt: null,
            parentShop: null,
            shopStatus: 'active',
        });

        const shopPromises = shops.map(shop =>
            this.createShopPayout(
                shop,
                adminExchangeRate,
                pastWeekDate,
                payoutOverDueDate
            )
        );

        await Promise.all(shopPromises);

        const deliveryBoys = await DeliveryBoyModel.find({
            deletedAt: null,
            status: 'active',
            deliveryBoyType: 'dropRider',
        });

        const riderPromises = deliveryBoys.map(deliveryBoy =>
            this.createRiderPayout(
                deliveryBoy,
                adminExchangeRate,
                pastWeekDate,
                payoutOverDueDate
            )
        );

        await Promise.all(riderPromises);

        successResponse(res, { message: 'Successfully created' });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
