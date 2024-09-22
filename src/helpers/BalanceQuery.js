const TransactionModel = require('../models/TransactionModel');
const ObjectId = require('mongoose').Types.ObjectId;
const OrderModel = require('../models/OrderModel');
const Transection = require('../models/TransactionModel');
const moment = require('moment');
const ButlerModel = require('../models/ButlerModel');
const {
    getAdminEarning,
    getDeliveryFinancial,
    getButlerFinancial,
    getFeaturedAmount,
    getSubscriptionEarning,
    getAdminPay,
    getTotalRefundAmount,
    getShopAddRemoveCredit,
    getRiderAddRemoveCredit,
    getTotalErrorCharge,
    getRiderWeeklyReward,
} = require('../controllers/FinancialController');

// exports.getUserBalance = async userId => {
//     let finalBalance = 0;
//     let totalAddBalance = 0;
//     let totalWithdrawBalance = 0;

//     const addData = await TransactionModel.aggregate([
//         {
//             $match: {
//                 user: ObjectId(userId),
//                 type: {
//                     $in: [
//                         'userBalanceAddAdmin',
//                         'userCancelOrderGetWallet',
//                         'userTopUpBalance',
//                     ],
//                 },
//             },
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 balance: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     if (addData.length > 0) {
//         totalAddBalance = addData[0].balance;
//     }

//     const withdrawData = await TransactionModel.aggregate([
//         {
//             $match: {
//                 user: ObjectId(userId),
//                 type: {
//                     $in: [
//                         'userBalanceWithdrawAdmin',
//                         'userPayBeforeReceivedOrderByWallet',
//                         'userPayForSubscriptionByWallet',
//                     ],
//                 },
//             },
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 balance: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     if (withdrawData.length > 0) {
//         totalWithdrawBalance = withdrawData[0].balance;
//     }

//     finalBalance = totalAddBalance - totalWithdrawBalance;

//     // 2 decimal number take finalBalance
//     finalBalance = parseFloat(finalBalance.toFixed(2));

//     return finalBalance;
// };

exports.getUserBalance = async userId => {
    let commonConfig = {};

    if (userId) {
        commonConfig.user = ObjectId(userId);
    }

    // Calculate addData
    const addDataPipeline = [
        {
            $match: {
                ...commonConfig,
                type: {
                    $in: [
                        'userBalanceAddAdmin',
                        'userCancelOrderGetWallet',
                        'userTopUpBalance',
                    ],
                },
            },
        },
        {
            $group: {
                _id: '',
                balance: { $sum: '$amount' },
                secondaryCurrency_balance: {
                    $sum: '$secondaryCurrency_amount',
                },
            },
        },
    ];

    const [addResult] = await TransactionModel.aggregate(addDataPipeline);

    const totalAddBalance = addResult ? addResult.balance : 0;
    const secondaryCurrency_totalAddBalance = addResult
        ? addResult.secondaryCurrency_balance
        : 0;

    // Calculate withdrawData
    const withdrawDataPipeline = [
        {
            $match: {
                ...commonConfig,
                type: {
                    $in: [
                        'userBalanceWithdrawAdmin',
                        'userPayBeforeReceivedOrderByWallet',
                        'userPayForSubscriptionByWallet',
                    ],
                },
            },
        },
        {
            $group: {
                _id: '',
                balance: { $sum: '$amount' },
                secondaryCurrency_balance: {
                    $sum: '$secondaryCurrency_amount',
                },
            },
        },
    ];

    const [withdrawResult] = await TransactionModel.aggregate(
        withdrawDataPipeline
    );

    const totalWithdrawBalance = withdrawResult ? withdrawResult.balance : 0;
    const secondaryCurrency_totalWithdrawBalance = withdrawResult
        ? withdrawResult.secondaryCurrency_balance
        : 0;

    // Calculate pendingAmount
    const pendingAmountPipeline = [
        {
            $match: {
                ...commonConfig,
                orderStatus: {
                    $nin: ['delivered', 'cancelled', 'refused', 'schedule'],
                },
            },
        },
        {
            $group: {
                _id: null,
                totalWalletAmount: { $sum: '$summary.baseCurrency_wallet' },
                secondaryCurrency_totalWalletAmount: {
                    $sum: '$summary.secondaryCurrency_wallet',
                },
            },
        },
    ];

    const [pendingResult] = await OrderModel.aggregate(pendingAmountPipeline);
    const ongoingOrderWalletAmount = pendingResult
        ? pendingResult.totalWalletAmount
        : 0;
    const secondaryCurrency_ongoingOrderWalletAmount = pendingResult
        ? pendingResult.secondaryCurrency_totalWalletAmount
        : 0;

    const [butlerResult] = await ButlerModel.aggregate(pendingAmountPipeline);
    const ongoingButlerOrderWalletAmount = butlerResult
        ? butlerResult.totalWalletAmount
        : 0;
    const secondaryCurrency_ongoingButlerOrderWalletAmount = butlerResult
        ? butlerResult.secondaryCurrency_totalWalletAmount
        : 0;

    const pendingAmount =
        ongoingOrderWalletAmount + ongoingButlerOrderWalletAmount;
    const secondaryCurrency_pendingAmount =
        secondaryCurrency_ongoingOrderWalletAmount +
        secondaryCurrency_ongoingButlerOrderWalletAmount;

    // Calculate final amounts
    const finalBalance = totalAddBalance - totalWithdrawBalance - pendingAmount;
    const secondaryCurrency_finalBalance =
        secondaryCurrency_totalAddBalance -
        secondaryCurrency_totalWithdrawBalance -
        secondaryCurrency_pendingAmount;

    // Round and format the final balances
    const formattedFinalBalance = parseFloat(finalBalance.toFixed(2));
    const formattedSecondaryCurrencyFinalBalance = Math.round(
        secondaryCurrency_finalBalance
    );
    const formattedPendingAmount = parseFloat(pendingAmount.toFixed(2));
    const formattedSecondaryCurrencyPendingAmount = Math.round(
        secondaryCurrency_pendingAmount
    );

    return {
        availableBalance: formattedFinalBalance,
        secondaryCurrency_availableBalance:
            formattedSecondaryCurrencyFinalBalance,
        pendingAmount: formattedPendingAmount,
        secondaryCurrency_pendingAmount:
            formattedSecondaryCurrencyPendingAmount,
    };
};

exports.getDeliveryBoyBalance = async deliveryBoyId => {
    let finalBalance = 0;
    let totalAddBalance = 0;
    let totalWithdrawBalance = 0;

    const addData = await TransactionModel.aggregate([
        {
            $match: {
                deliveryBoy: ObjectId(deliveryBoyId),
                type: {
                    $in: [
                        'deliveryBoyOnlinePaymentReceived',
                        'adminBalanceAddToDeliveryBoy',
                    ],
                },
            },
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                balance: { $sum: { $sum: ['$amount'] } },
            },
        },
    ]);

    if (addData.length > 0) {
        totalAddBalance = addData[0].balance;
    }

    const withdrawData = await TransactionModel.aggregate([
        {
            $match: {
                deliveryBoy: ObjectId(deliveryBoyId),
                type: {
                    $in: ['adminBalanceRemoveFromDeliveryBoy'],
                },
            },
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                balance: { $sum: { $sum: ['$amount'] } },
            },
        },
    ]);

    if (withdrawData.length > 0) {
        totalWithdrawBalance = withdrawData[0].balance;
    }

    finalBalance = totalAddBalance - totalWithdrawBalance;

    // 2 decimal number take finalBalance
    finalBalance = parseFloat(finalBalance.toFixed(2));

    return finalBalance;
};

// exports.getDropBalance = async () => {
//     let finalBalance = 0;
//     let totalAddBalance = 0;
//     let totalWithdrawBalance = 0;

//     const addData = await TransactionModel.aggregate([
//         {
//             $match: {
//                 type: {
//                     $in: [
//                         'DropGetFromOrder',
//                         'adminRemoveBalanceShop',
//                         'userBalanceWithdrawAdmin',
//                     ],
//                 },
//             },
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 balance: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     if (addData.length > 0) {
//         totalAddBalance = addData[0].balance;
//     }

//     const withdrawData = await TransactionModel.aggregate([
//         {
//             $match: {
//                 type: {
//                     $in: ['userBalanceAddAdmin', 'adminAddBalanceShop'],
//                 },
//             },
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 balance: { $sum: { $sum: ['$amount'] } },
//             },
//         },
//     ]);

//     if (withdrawData.length > 0) {
//         totalWithdrawBalance = withdrawData[0].balance;
//     }

//     finalBalance = totalAddBalance - totalWithdrawBalance;

//     // 2 decimal number take finalBalance
//     finalBalance = parseFloat(finalBalance.toFixed(2));

//     return finalBalance;
// };
// exports.getDropBalance = async () => {
//     let config = {
//         orderStatus: 'delivered',
//     };

//     const dropEarning = await OrderModel.aggregate([
//         {
//             $match: config,
//         },
//         {
//             $group: {
//                 _id: '',
//                 amount: {
//                     $sum: {
//                         $sum: ['$adminCharge.baseCurrency_totalAdminCharge'],
//                     },
//                 },
//                 count: { $sum: 1 },
//             },
//         },
//     ]);

//     const totalDropEarning = dropEarning[0] ? dropEarning[0].amount : 0;

//     // if (dropEarning.length < 1) {
//     //     dropEarning.push({ amount: 0 });
//     // }

//     let configUserBalanceAddAdmin = {
//         type: {
//             $in: [
//                 'userBalanceAddAdmin',
//                 'sellerGetPaymentFromOrderRefused',
//                 'deliveryBoyOrderDeliveredCashRefused',
//             ],
//         },
//     };

//     const userBalanceAddAdmin = await Transection.aggregate([
//         {
//             $match: configUserBalanceAddAdmin,
//         },
//         {
//             $group: {
//                 _id: '',
//                 amount: { $sum: { $sum: ['$amount'] } },
//                 count: { $sum: 1 },
//             },
//         },
//     ]);

//     const totalUserBalanceAddAdmin = userBalanceAddAdmin[0]
//         ? userBalanceAddAdmin[0].amount
//         : 0;

//     let configUserBalanceWithdrawAdmin = {
//         type: {
//             $in: ['userBalanceWithdrawAdmin', 'DropGetFromRefund'],
//         },
//     };

//     const userBalanceWithdrawAdmin = await Transection.aggregate([
//         {
//             $match: configUserBalanceWithdrawAdmin,
//         },
//         {
//             $group: {
//                 _id: '',
//                 amount: { $sum: { $sum: ['$amount'] } },
//                 count: { $sum: 1 },
//             },
//         },
//     ]);

//     const totalUserBalanceWithdrawAdmin = userBalanceWithdrawAdmin[0]
//         ? userBalanceWithdrawAdmin[0].amount
//         : 0;

//     // return dropEarning[0].amount;
//     return (
//         totalDropEarning +
//         totalUserBalanceWithdrawAdmin -
//         totalUserBalanceAddAdmin
//     );
// };
exports.getDropBalance = async (startDate, endDate) => {
    // Admin profit from order
    const { adminFees: totalOrderProfit } = await getAdminEarning({
        startDate,
        endDate,
    });

    // Admin profit from delivery
    const { adminDeliveryProfit: deliveryProfitFromOrder } =
        await getDeliveryFinancial({
            startDate,
            endDate,
        });

    const { adminButlerProfit: deliveryProfitFromButler } =
        await getButlerFinancial({
            startDate,
            endDate,
        });

    const totalDeliveryProfit =
        deliveryProfitFromOrder + deliveryProfitFromButler;

    // Admin profit from featured
    const { featuredAmount: totalFeaturedAmount } = await getFeaturedAmount({
        startDate,
        endDate,
    });

    // Admin profit from subscription
    const { baseCurrency_subscriptionFee: totalSubscriptionEarning } =
        await getSubscriptionEarning({ startDate, endDate });

    // Admin Pay to customer
    const { totalAdminPay: adminPay } = await getAdminPay({
        startDate,
        endDate,
    });

    // Admin refund to customer
    const {
        refundAmount: baseCurrency_adminOrderRefund,
        baseCurrency_adminDeliveryRefund,
    } = await getTotalRefundAmount({
        startDate,
        endDate,
        account: 'admin',
    });

    const totalRefund =
        baseCurrency_adminOrderRefund + baseCurrency_adminDeliveryRefund;

    // Admin add remove credit from shop and rider
    const { totalAddRemoveCredit: addRemoveCreditFromOrder } =
        await getShopAddRemoveCredit({
            startDate,
            endDate,
        });

    const { totalAddRemoveCredit: addRemoveCreditFromRider } =
        await getRiderAddRemoveCredit({
            startDate,
            endDate,
        });

    const totalAddRemoveCredit =
        addRemoveCreditFromOrder + addRemoveCreditFromRider;

    // Admin error charge
    const { totalErrorCharge } = await getTotalErrorCharge({
        startDate,
        endDate,
        account: 'admin',
    });

    // Admin weekly reward cost
    const { riderWeeklyReward } = await getRiderWeeklyReward({
        startDate,
        endDate,
    });

    const totalProfit =
        totalOrderProfit +
        totalDeliveryProfit +
        totalFeaturedAmount +
        totalSubscriptionEarning -
        adminPay -
        totalRefund -
        totalAddRemoveCredit -
        totalErrorCharge -
        riderWeeklyReward;

    return totalProfit;
};

// exports.getTotalDeliveryFeeWithOwnDeliveryBoy = async (
//     shopId,
//     startDate,
//     endDate
// ) => {
//     let match = {
//         shop: ObjectId(shopId),
//         orderFor: 'specific',
//         orderStatus: {
//             $nin: ['cancelled', 'refused', 'schedule'],
//         },
//     };

//     if (startDate && endDate) {
//         match.createdAt = {
//             $gt: moment(new Date(startDate)),
//             $lt: moment(endDate ? new Date(endDate) : new Date()).add(
//                 1,
//                 'days'
//             ),
//         };
//     }

//     const data = await OrderModel.aggregate([
//         {
//             $match: match,
//         },
//         {
//             $group: {
//                 _id: '',
//                 count: { $sum: 1 },
//                 deliveryFee: { $sum: { $sum: ['$summary.baseCurrency_riderFee'] } },
//             },
//         },
//     ]);

//     return data.length ? data[0].deliveryFee : 0;
// };

exports.getAdminWalletBalance = async () => {
    // Calculate add balance
    const addBalancePipeline = [
        {
            $match: {
                type: {
                    $in: ['topUpAdminWallet', 'userBalanceWithdrawAdmin'],
                },
            },
        },
        {
            $group: {
                _id: '',
                balance: { $sum: '$amount' },
                secondaryCurrency_balance: {
                    $sum: '$secondaryCurrency_amount',
                },
            },
        },
    ];

    const [addResult] = await TransactionModel.aggregate(addBalancePipeline);

    const totalAddBalance = addResult ? addResult.balance : 0;
    const secondaryCurrency_totalAddBalance = addResult
        ? addResult.secondaryCurrency_balance
        : 0;

    // Calculate remove balance
    const removeBalancePipeline = [
        {
            $match: {
                type: {
                    $in: ['userBalanceAddAdmin'],
                },
            },
        },
        {
            $group: {
                _id: '',
                balance: { $sum: '$amount' },
                secondaryCurrency_balance: {
                    $sum: '$secondaryCurrency_amount',
                },
            },
        },
    ];

    const [removeResult] = await TransactionModel.aggregate(
        removeBalancePipeline
    );

    const totalRemoveBalance = removeResult ? removeResult.balance : 0;
    const secondaryCurrency_totalRemoveBalance = removeResult
        ? removeResult.secondaryCurrency_balance
        : 0;

    // Calculate final amounts
    const finalBalance = totalAddBalance - totalRemoveBalance;
    const secondaryCurrency_finalBalance =
        secondaryCurrency_totalAddBalance -
        secondaryCurrency_totalRemoveBalance;

    // Round and format the final balances
    const formattedFinalBalance = parseFloat(finalBalance.toFixed(2));
    const formattedSecondaryCurrencyFinalBalance = Math.round(
        secondaryCurrency_finalBalance
    );

    return {
        availableBalance: formattedFinalBalance,
        secondaryCurrency_availableBalance:
            formattedSecondaryCurrencyFinalBalance,
    };
};
