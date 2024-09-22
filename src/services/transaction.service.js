const Transaction = require('../models/TransactionModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.getUserRewardPoints = async (userId) => {
    const transactionPipeline=[
        { $match: { user: ObjectId(userId), account: 'user', status: 'success' } },
        {
            $group: {
                _id: null,
                redeemExpiredSum: { $sum: { $cond: [{ $in: ['$type', ['userRedeemRewardPoints', 'expiredRewardPoints']] }, '$rewardPoints', 0] } },
                getCancelSum: { $sum: { $cond: [{ $in: ['$type', ['userGetRewardPoints', 'userCancelOrderGetRewardPoints']] }, '$rewardPoints', 0] } },
            },
        },
        { $project: { balance: { $subtract: ['$getCancelSum','$redeemExpiredSum'] } } },
    ]
    console.log(JSON.stringify(transactionPipeline));
    const sumOfUsedAndExpiredPoints = await Transaction.aggregate(transactionPipeline);
    return sumOfUsedAndExpiredPoints?.[0]?.balance ?? 0;
};

exports.getActiveUserRewardPoints = async (userId) => {

    const transactionPipeline = [
        { $match: { type: { $in: ['userGetRewardPoints', 'userCancelOrderGetRewardPoints'] }, user: ObjectId(userId), account: 'user', status: 'success' } },
        {
            $lookup: {
                from: 'transactions',
                localField: 'amount',
                foreignField: 'amount',
                as: 'expired',
                pipeline: [{ $match: { type: { $in: ['userRedeemRewardPoints', 'expiredRewardPoints'] } } }],
            },
        },
        { $match: { 'expired': { $ne: [] } } },
        { $project: { _id: 1 } },
    ];
    console.log('transactionPipeline----->',JSON.stringify(transactionPipeline));
    const transactions = await Transaction.aggregate(transactionPipeline);
    return transactions.map((transaction) => transaction._id);
};


