const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const RewardSettingModel = require('../models/RewardSettingModel');
const ProductModel = require('../models/ProductModel');
const Transaction = require('../models/TransactionModel');
const { addAdminLogAboutActivity } = require('./AdminController');
const moment = require('moment');
const short = require('short-uuid');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const { getRewardPoints, getRewardAmount } = require('../helpers/rewardPoints');
const UserModel = require('../models/UserModel');
const ShopModel = require('../models/ShopModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.getRewardSetting = async (req, res) => {
    try {
        const rewardSetting = await RewardSettingModel.findOne({});

        if (!rewardSetting) {
            return errorResponse(res, 'Reward Setting not found');
        }

        rewardSetting?.rewardCategory?.sort(
            (a, b) => a.sortingOrder - b.sortingOrder
        );

        // const usedCategories = await ProductModel.aggregate([
        //     {
        //         $match: { marketing: { $exists: true } },
        //     },
        //     {
        //         $lookup: {
        //             from: 'marketings',
        //             localField: 'marketing',
        //             foreignField: '_id',
        //             as: 'marketing',
        //         },
        //     },
        //     {
        //         $unwind: '$marketing',
        //     },
        //     {
        //         $match: {
        //             'marketing.isActive': true,
        //             'marketing.status': 'active',
        //             'marketing.type': 'reward',
        //         },
        //     },
        //     {
        //         $group: {
        //             _id: '$rewardCategory',
        //         },
        //     },
        //     {
        //         $project: {
        //             _id: 0,
        //             rewardCategory: '$_id',
        //         },
        //     },
        // ]);

        const usedCategories = await ProductModel.aggregate([
            {
                $match: { 'marketing.0': { $exists: true } },
            },
            {
                $unwind: '$marketing', // Unwind the marketing array
            },
            {
                $lookup: {
                    from: 'marketings',
                    localField: 'marketing',
                    foreignField: '_id',
                    as: 'marketingDetails',
                },
            },
            {
                $unwind: '$marketingDetails',
            },
            {
                $match: {
                    'marketingDetails.isActive': true,
                    'marketingDetails.status': 'active',
                    'marketingDetails.type': 'reward',
                },
            },
            {
                $group: {
                    _id: '$rewardCategory',
                },
            },
            {
                $project: {
                    _id: 0,
                    rewardCategory: '$_id',
                },
            },
        ]);

        const usedCategoriesStringId = usedCategories?.map(usedCategory =>
            usedCategory?.rewardCategory?.toString()
        );

        const usedCategoriesObj = rewardSetting?.rewardCategory?.filter(
            category =>
                usedCategoriesStringId?.includes(category?._id?.toString()) &&
                category?.status === 'active'
        );

        usedCategoriesObj?.sort((a, b) => a.sortingOrder - b.sortingOrder);

        successResponse(res, {
            message: 'success',
            data: {
                rewardSetting,
                usedCategories: usedCategoriesObj,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editRewardSetting = async (req, res) => {
    try {
        const id = req.adminId;
        const {
            rewardCategory, // [{name,status,sortingOrder}]
            rewardBundle,
            getReward,
            redeemReward,
            adminCutForReward,
            expiration_period,
            type = [],
        } = req.body;

        let rewardSetting = await RewardSettingModel.findOne({});

        if (rewardSetting == null) {
            rewardSetting = new RewardSettingModel({});
        }

        let oldRewardCategory = rewardSetting.rewardCategory || [];

        if (rewardCategory && type.includes('rewardCategory')) {
            rewardSetting.rewardCategory = rewardCategory;
            // addAdminLogAboutActivity(
            //     'rewardCategory',
            //     id,
            //     rewardCategory,
            //     oldRewardCategory
            // );
        }

        let oldRewardBundle = rewardSetting.rewardBundle || [];

        if (rewardBundle && type.includes('rewardBundle')) {
            rewardSetting.rewardBundle = rewardBundle;
            // addAdminLogAboutActivity(
            //     'rewardBundle',
            //     id,
            //     rewardBundle,
            //     oldRewardBundle
            // );
        }

        let oldGetReward = rewardSetting.getReward || null;

        if (getReward && type.includes('getReward')) {
            rewardSetting.getReward = getReward;
            // addAdminLogAboutActivity('getReward', id, getReward, oldGetReward);
        }

        let oldRedeemReward = rewardSetting.redeemReward || null;

        if (redeemReward && type.includes('redeemReward')) {
            rewardSetting.redeemReward = redeemReward;
            // addAdminLogAboutActivity(
            //     'redeemReward',
            //     id,
            //     redeemReward,
            //     oldRedeemReward
            // );

            const rewardAmount = Number(redeemReward?.amount) || 1;

            // const products = await ProductModel.find({
            //     deletedAt: null,
            //     rewardCategory: { $exists: true },
            //     rewardBundle: { $exists: true },
            // });

            // for (const product of products) {
            //     const rewardDiscountAmount = parseFloat(
            //         ((product.price / 100) * product.rewardBundle).toFixed(2)
            //     );

            //     const reward = {
            //         amount: parseFloat(
            //             (product.price - rewardDiscountAmount).toFixed(2)
            //         ),
            //         points: Math.ceil(rewardDiscountAmount / rewardAmount),
            //     };

            //     await ProductModel.updateOne(
            //         { _id: product._id },
            //         {
            //             $set: {
            //                 reward: reward,
            //             },
            //         }
            //     );
            // }

            await ProductModel.updateMany(
                {
                    deletedAt: null,
                    rewardCategory: { $exists: true },
                    rewardBundle: { $exists: true },
                },
                [
                    {
                        $set: {
                            reward: {
                                amount: {
                                    $round: [
                                        {
                                            $subtract: [
                                                '$price',
                                                {
                                                    $round: [
                                                        {
                                                            $multiply: [
                                                                '$price',
                                                                {
                                                                    $divide: [
                                                                        '$rewardBundle',
                                                                        100,
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                        2, // Number of decimal places
                                                    ],
                                                },
                                            ],
                                        },
                                        2, // Number of decimal places
                                    ],
                                },
                                points: {
                                    $ceil: {
                                        $divide: [
                                            {
                                                $round: [
                                                    {
                                                        $multiply: [
                                                            '$price',
                                                            {
                                                                $divide: [
                                                                    '$rewardBundle',
                                                                    100,
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                    2, // Number of decimal places
                                                ],
                                            },
                                            rewardAmount,
                                        ],
                                    },
                                },
                            },
                        },
                    },
                ]
            );
        }

        let oldAdminCutForReward = rewardSetting.adminCutForReward || 0;

        if (adminCutForReward && type.includes('adminCutForReward')) {
            rewardSetting.adminCutForReward = adminCutForReward;
            // addAdminLogAboutActivity(
            //     'adminCutForReward',
            //     id,
            //     adminCutForReward,
            //     oldAdminCutForReward
            // );
        }

        let oldExpiration_period = rewardSetting.expiration_period || null;

        if (expiration_period && type.includes('expiration_period')) {
            rewardSetting.expiration_period = expiration_period;
            // addAdminLogAboutActivity(
            //     'expiration_period',
            //     id,
            //     expiration_period,
            //     oldExpiration_period
            // );
        }

        await rewardSetting.save();

        rewardSetting?.rewardCategory?.sort(
            (a, b) => a.sortingOrder - b.sortingOrder
        );

        successResponse(res, {
            message: 'update successfully',
            data: {
                rewardSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRewardForUserApp = async (req, res) => {
    try {
        const { amount, points } = req.query;

        let rewardPoints = {};
        let rewardAmount = {};

        if (amount) {
            rewardPoints = await getRewardPoints(amount);
        }
        if (points) {
            rewardAmount = await getRewardAmount(points);
        }

        successResponse(res, {
            message: 'RewardPoints successfully calculated',
            data: {
                ...rewardPoints,
                ...rewardAmount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

/********** Reward system Get transaction **********/
exports.getRewardHistoryForUserApp = async (req, res) => {
    try {
        //type = earned, used, expired
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'desc',
            pagingRange = 5,
            type = 'earned',
        } = req.query;

        const userId = req.userId;

        if (!ObjectId.isValid(userId)) {
            return errorResponse(res, 'userId is invalid');
        }

        let expiredSoonRewardHistory = [];
        let whereConfig = {
            user: userId,
            account: 'user',
            status: 'success',
        };

        if (type === 'earned') {
            whereConfig = {
                ...whereConfig,
                type: {
                    $in: [
                        'userGetRewardPoints',
                        'userCancelOrderGetRewardPoints',
                    ],
                },
            };
        }
        if (type === 'used') {
            whereConfig = {
                ...whereConfig,
                type: {
                    $in: ['userRedeemRewardPoints'],
                },
            };
        }
        if (type === 'expired') {
            whereConfig = {
                ...whereConfig,
                type: {
                    $in: ['expiredRewardPoints'],
                },
            };

            // expiredSoonRewardHistory = await getExpiredSoonRewardHistory(userId); // TODO: need to check
            if (sortBy === 'desc') {
                expiredSoonRewardHistory = expiredSoonRewardHistory?.sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );
            } else {
                expiredSoonRewardHistory = expiredSoonRewardHistory?.sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                );
            }
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: Transaction,
            condition: whereConfig,
            pagingRange,
        });

        let list = await Transaction.find(whereConfig)
            .populate([
                {
                    path: 'cardId',
                },
                {
                    path: 'user',
                },
                {
                    path: 'admin',
                },
                {
                    path: 'shop',
                },
                {
                    path: 'seller',
                },
                {
                    path: 'deliveryBoy',
                },

                {
                    path: 'order',
                    populate: [
                        {
                            path: 'marketings',
                        },
                        {
                            path: 'user',
                            select: 'name email phone_number profile_photo',
                        },
                        {
                            path: 'users',
                            select: 'name email phone_number profile_photo',
                        },
                        {
                            path: 'deliveryBoy',
                        },
                        {
                            path: 'transactionsDeliveryBoy',
                        },
                        {
                            path: 'transactionsDrop',
                        },
                        {
                            path: 'transactionsStore',
                        },
                        {
                            path: 'transactionHistory',
                        },
                        {
                            path: 'seller',
                        },
                        {
                            path: 'shop',
                            select: '-banner -products -flags -reviews -categories',
                        },
                        {
                            path: 'deliveryAddress',
                        },
                        {
                            path: 'orderDeliveryCharge',
                        },
                        {
                            path: 'transactions',
                        },
                        {
                            path: 'userCancelTnx',
                        },
                        {
                            path: 'cancelShopTnx',
                        },
                        {
                            path: 'cancelDeliveryTnx',
                        },
                        {
                            path: 'adminCancelTnx',
                        },
                        {
                            path: 'orderCancel.userId',
                        },
                        {
                            path: 'orderCancel.cancelReason',
                        },
                        {
                            path: 'orderCancel.deliveryBoyId',
                        },
                        {
                            path: 'orderCancel.adminId',
                        },
                        {
                            path: 'orderCancel.sellerId',
                        },
                        {
                            path: 'orderCancel.shopId',
                        },
                        {
                            path: 'products',
                            populate: [
                                {
                                    path: 'product',
                                    select: 'name',
                                },
                                {
                                    path: 'addons.product',
                                    select: 'name',
                                },
                            ],
                        },
                        {
                            path: 'cart',
                            populate: [
                                {
                                    path: 'cartItems.user',
                                },
                                {
                                    path: 'creator',
                                },
                            ],
                        },
                    ],
                },
            ])
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select();

        if (expiredSoonRewardHistory?.length > 0) {
            list = [...expiredSoonRewardHistory, ...list];

            paginate = await paginationMultipleModel({
                page,
                pageSize,
                total: list.length,
                pagingRange,
            });

            list = list.slice(
                paginate.offset,
                paginate.offset + paginate.limit
            );
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                history: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

/********** Reward system Create transaction **********/
exports.transactionForReward = async ({
    order,
    user,
    type,
    amount,
    rewardPoints,
    summary,
    userNote = null,
    isRefund = false,
    isButler = false,
}) => {
    const transaction = await Transaction.create({
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        order: order._id,
        account: 'user',
        type: type,
        user: user,
        shop: order.shop ? order.shop : null,
        seller: order.seller ? order.seller : null,
        deliveryBoy: order.deliveryBoy ? order.deliveryBoy : null,
        amount: amount,
        status: 'success',
        userNote: userNote,
        orderId: order._id,
        summary: summary,
        rewardPoints: rewardPoints,
        isRefund: isRefund,
        isButler: isButler,
    });

    if (type === 'userRedeemRewardPoints') {
        await UserModel.updateOne(
            { _id: user },
            {
                $inc: {
                    tempRewardPoints: -rewardPoints,
                },
            }
        );
    } else {
        await UserModel.updateOne(
            { _id: user },
            {
                $inc: {
                    tempRewardPoints: rewardPoints,
                },
            }
        );
    }

    return transaction;
};

exports.transactionForExpiredReward = async ({ userId, rewardPoints }) => {
    const transaction = await Transaction.create({
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        account: 'user',
        type: 'expiredRewardPoints',
        user: userId,
        status: 'success',
        userNote: 'Expired reward points',
        rewardPoints: rewardPoints,
        isRefund: false,
        isButler: false,
    });

    await UserModel.updateOne(
        { _id: userId },
        {
            $inc: {
                tempRewardPoints: -rewardPoints,
            },
        }
    );

    return transaction;
};

const getExpiredSoonRewardHistory = async userId => {
    const rewardSetting = await RewardSettingModel.findOne({});
    const expirationPeriod = rewardSetting.expiration_period || 30;

    let configSumOfUsedAndExpiredPoints = {
        user: ObjectId(userId),
        account: 'user',
        status: 'success',
        type: {
            $in: ['userRedeemRewardPoints', 'expiredRewardPoints'],
        },
    };

    const sumOfUsedAndExpiredPoints = await Transaction.aggregate([
        {
            $match: configSumOfUsedAndExpiredPoints,
        },
        {
            $group: {
                _id: '',
                amount: { $sum: { $sum: ['$rewardPoints'] } },
                count: { $sum: 1 },
            },
        },
    ]);

    const totalSumOfUsedAndExpiredPoints = sumOfUsedAndExpiredPoints[0]
        ? sumOfUsedAndExpiredPoints[0].amount
        : 0;

    // console.log('**************totalSumOfUsedAndExpiredPoints');
    // console.log(totalSumOfUsedAndExpiredPoints);

    let whereConfig = {
        user: ObjectId(userId),
        account: 'user',
        status: 'success',
        type: {
            $in: ['userGetRewardPoints', 'userCancelOrderGetRewardPoints'],
        },
    };

    const earnedRewardHistory = await Transaction.find(whereConfig)
        .populate('cardId user admin shop seller deliveryBoy order')
        .sort({ createdAt: 'asc' })
        .lean();

    // console.log('**************earnedRewardHistory');
    // console.log(earnedRewardHistory);

    let list = [];
    let remaining = totalSumOfUsedAndExpiredPoints;
    for (let i = 0; i < earnedRewardHistory.length; i++) {
        remaining = remaining - earnedRewardHistory[i].rewardPoints;
        if (remaining <= 0) {
            if (remaining < 0) {
                earnedRewardHistory[i].rewardPoints = -remaining;
            } else {
                i++;
            }
            for (let j = i; j < earnedRewardHistory.length; j++) {
                const currentDate = new Date();
                const transactionCreateDate = new Date(
                    earnedRewardHistory[j].createdAt
                );
                const diffInMs = Math.abs(currentDate - transactionCreateDate);
                const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

                if (
                    expirationPeriod - 3 >= diffInDays ||
                    diffInDays > expirationPeriod
                ) {
                    break;
                }

                earnedRewardHistory[j].willExpireDate = moment(
                    new Date(transactionCreateDate)
                ).add(expirationPeriod, 'days');

                list.push(earnedRewardHistory[j]);
            }
            break;
        }
    }
    return list;
};
