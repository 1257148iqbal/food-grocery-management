var cron = require('node-cron');
const MarketingModel = require('../models/MarketingModel');
const User = require('../models/UserModel');
const CronJob = require('../models/CronJobModel');
const moment = require('moment');
const RewardSettingModel = require('../models/RewardSettingModel');
const {
    transactionForExpiredReward,
} = require('../controllers/RewardSettingController');
const ShopModel = require('../models/ShopModel');
const ProductModel = require('../models/ProductModel');
const TransactionModel = require('../models/TransactionModel');
const UserPunchMarketingModel = require('../models/UserPunchMarketingModel');
const ObjectId = require('mongoose').Types.ObjectId;

async function scheduleCronJob() {
    // every minute run this cron job
    cron.schedule(
        '* * * * *',
        async () => {
            try {
                // Function for activate featured marketing to delete after expired
                const activateMarketings = await MarketingModel.find({
                    type: 'featured',
                    'duration.end': { $lte: new Date() },
                    isActive: true,
                    status: 'active',
                    deletedAt: null,
                });

                activateMarketings?.forEach(async marketing => {
                    await MarketingModel.updateOne(
                        { _id: marketing._id },
                        {
                            $set: {
                                deletedAt: new Date(),
                                isActive: false,
                                status: 'inactive',
                            },
                        }
                    );

                    await ShopModel.updateOne(
                        { _id: marketing.shop },
                        {
                            isFeatured: false,
                            featuredUpdatedTime: null,
                            isPunchMarketing: false,
                            sortingOrder: 0,
                            $pull: {
                                marketings: marketing._id,
                            },
                        }
                    );

                    await ProductModel.updateMany(
                        { shop: marketing.shop },
                        {
                            $set: {
                                isFeatured: false,
                            },
                        }
                    );

                    const cronJob = new CronJob({
                        name: 'Featured Marketing deleted',
                        status: 1,
                        error: null,
                        marketingId: marketing._id,
                    });
                    await cronJob.save();
                });
            } catch (error) {
                console.log(error);
                const cronJob = new CronJob({
                    name: 'Featured Marketing cron job',
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

    // every day at 00:00:00 AM
    cron.schedule(
        '00 00 * * *',
        async () => {
            try {
                // Function for deactivate marketing to active
                // const deactivateMarketings = await MarketingModel.find({
                //     isActive: false,
                //     status: 'active',
                //     deletedAt: null,
                // });

                // deactivateMarketings?.forEach(async marketing => {
                //     const startDate = moment(
                //         new Date(marketing?.duration?.start)
                //     );
                //     const currentDate = moment();

                //     if (startDate <= currentDate) {
                //         await MarketingModel.updateOne(
                //             { _id: marketing._id },
                //             {
                //                 $set: {
                //                     isActive: true,
                //                 },
                //             }
                //         );

                //         const cronJob = new CronJob({
                //             name: 'Marketing activated',
                //             status: 1,
                //             error: null,
                //             marketingId: marketing._id,
                //         });
                //         await cronJob.save();
                //     }
                // });

                // Function for activate marketing to delete after expired
                const activateMarketings = await MarketingModel.find({
                    type: { $ne: 'featured' },
                    'duration.end': { $lte: new Date() },
                    isActive: true,
                    status: 'active',
                    deletedAt: null,
                });

                activateMarketings?.forEach(async marketing => {
                    // const endDate = moment(new Date(marketing?.duration?.end));
                    // const currentDate = moment();

                    // if (endDate <= currentDate) {
                    await MarketingModel.updateOne(
                        { _id: marketing._id },
                        {
                            $set: {
                                deletedAt: new Date(),
                                isActive: false,
                                status: 'inactive',
                            },
                        }
                    );

                    if (marketing.type === 'free_delivery') {
                        await ShopModel.updateOne(
                            { _id: marketing.shop },
                            {
                                freeDelivery: false,
                                sortingOrder: 0,
                                $pull: {
                                    marketings: marketing._id,
                                },
                            }
                        );
                    } else if (marketing.type === 'featured') {
                        await ShopModel.updateOne(
                            { _id: marketing.shop },
                            {
                                isFeatured: false,
                                featuredUpdatedTime: null,
                                sortingOrder: 0,
                                $pull: {
                                    marketings: marketing._id,
                                },
                            }
                        );

                        await ProductModel.updateMany(
                            { shop: marketing.shop },
                            {
                                $set: {
                                    isFeatured: false,
                                },
                            }
                        );
                    } else if (marketing.type === 'punch_marketing') {
                        await ShopModel.updateOne(
                            { _id: marketing.shop },
                            {
                                isPunchMarketing: false,
                                sortingOrder: 0,
                                $pull: {
                                    marketings: marketing._id,
                                },
                            }
                        );
                    } else {
                        await ShopModel.updateOne(
                            { _id: marketing.shop },
                            {
                                sortingOrder: 0,
                                $pull: {
                                    marketings: marketing._id,
                                },
                            }
                        );
                    }

                    if (marketing.type === 'percentage') {
                        for (const product of marketing.products) {
                            await ProductModel.updateOne(
                                { _id: { $in: product.product } },
                                {
                                    $pull: {
                                        marketing: marketing._id,
                                    },
                                }
                            );

                            const findProduct = await ProductModel.findById(
                                product.product
                            ).populate('marketing');

                            const discountPercentage =
                                findProduct.marketing.reduce(
                                    (accumulator, marketing) => {
                                        if (marketing.isActive) {
                                            const marketingProduct =
                                                marketing.products.find(
                                                    item =>
                                                        item.product.toString() ===
                                                        product.product.toString()
                                                );

                                            return (
                                                accumulator +
                                                marketingProduct.discountPercentage
                                            );
                                        }
                                        return accumulator + 0;
                                    },
                                    0
                                );
                            const discount = findProduct.marketing.reduce(
                                (accumulator, marketing) => {
                                    if (marketing.isActive) {
                                        const marketingProduct =
                                            marketing.products.find(
                                                item =>
                                                    item.product.toString() ===
                                                    product.product.toString()
                                            );

                                        return (
                                            accumulator +
                                            marketingProduct.discount
                                        );
                                    }
                                    return accumulator + 0;
                                },
                                0
                            );

                            const discountPrice = findProduct.price - discount;

                            findProduct.discountPercentage = discountPercentage;
                            findProduct.discount = discount;
                            findProduct.discountPrice = discountPrice;
                            await findProduct.save();
                        }
                    } else {
                        const productsId = marketing.products?.map(product =>
                            product.product.toString()
                        );

                        await ProductModel.updateMany(
                            { _id: { $in: productsId } },
                            {
                                $pull: {
                                    marketing: marketing._id,
                                },
                                $unset: {
                                    rewardCategory: 1,
                                    rewardBundle: 1,
                                    reward: 1,
                                },
                            }
                        );
                    }

                    const cronJob = new CronJob({
                        name: 'Marketing deleted',
                        status: 1,
                        error: null,
                        marketingId: marketing._id,
                    });
                    await cronJob.save();
                    // }
                });

                // Function for paused marketing to delete after 24hours of paused
                const pausedMarketings = await MarketingModel.find({
                    isActive: false,
                    status: 'inactive',
                    deletedAt: null,
                });

                pausedMarketings?.forEach(async marketing => {
                    const format = 'YYYY-MM-DD H:mm:ss';
                    const pausedDate = moment(
                        new Date(marketing?.marketingPausedAt)
                    ).format(format);
                    const currentDate = moment(new Date()).format(format);

                    const timeDifferenceInMilliseconds =
                        new Date(currentDate) - new Date(pausedDate);
                    const timeDifferenceInHours = parseInt(
                        timeDifferenceInMilliseconds / (1000 * 60 * 60)
                    );

                    if (timeDifferenceInHours >= 24) {
                        await MarketingModel.updateOne(
                            { _id: marketing._id },
                            {
                                $set: {
                                    deletedAt: new Date(),
                                    isActive: false,
                                    status: 'inactive',
                                },
                            }
                        );

                        if (marketing.type === 'free_delivery') {
                            await ShopModel.updateOne(
                                { _id: marketing.shop },
                                {
                                    freeDelivery: false,
                                    sortingOrder: 0,
                                    $pull: {
                                        marketings: marketing._id,
                                    },
                                }
                            );
                        } else if (marketing.type === 'featured') {
                            await ShopModel.updateOne(
                                { _id: marketing.shop },
                                {
                                    isFeatured: false,
                                    featuredUpdatedTime: null,
                                    sortingOrder: 0,
                                    $pull: {
                                        marketings: marketing._id,
                                    },
                                }
                            );

                            await ProductModel.updateMany(
                                { shop: marketing.shop },
                                {
                                    $set: {
                                        isFeatured: false,
                                    },
                                }
                            );
                        } else if (marketing.type === 'punch_marketing') {
                            await ShopModel.updateOne(
                                { _id: marketing.shop },
                                {
                                    isPunchMarketing: false,
                                    sortingOrder: 0,
                                    $pull: {
                                        marketings: marketing._id,
                                    },
                                }
                            );
                        } else {
                            await ShopModel.updateOne(
                                { _id: marketing.shop },
                                {
                                    sortingOrder: 0,
                                    $pull: {
                                        marketings: marketing._id,
                                    },
                                }
                            );
                        }

                        if (marketing.type === 'percentage') {
                            for (const product of marketing.products) {
                                await ProductModel.updateOne(
                                    { _id: { $in: product.product } },
                                    {
                                        $pull: {
                                            marketing: marketing._id,
                                        },
                                        // $inc: {
                                        //     discountPercentage:
                                        //         -product.discountPercentage,
                                        //     discount: -product.discount,
                                        //     discountPrice: -product.discountPrice,
                                        // },
                                    }
                                );

                                const findProduct = await ProductModel.findById(
                                    product.product
                                ).populate('marketing');

                                const discountPercentage =
                                    findProduct.marketing.reduce(
                                        (accumulator, marketing) => {
                                            if (marketing.isActive) {
                                                const marketingProduct =
                                                    marketing.products.find(
                                                        item =>
                                                            item.product.toString() ===
                                                            product.product.toString()
                                                    );

                                                return (
                                                    accumulator +
                                                    marketingProduct.discountPercentage
                                                );
                                            }
                                            return accumulator + 0;
                                        },
                                        0
                                    );
                                const discount = findProduct.marketing.reduce(
                                    (accumulator, marketing) => {
                                        if (marketing.isActive) {
                                            const marketingProduct =
                                                marketing.products.find(
                                                    item =>
                                                        item.product.toString() ===
                                                        product.product.toString()
                                                );

                                            return (
                                                accumulator +
                                                marketingProduct.discount
                                            );
                                        }
                                        return accumulator + 0;
                                    },
                                    0
                                );

                                const discountPrice =
                                    findProduct.price - discount;

                                findProduct.discountPercentage =
                                    discountPercentage;
                                findProduct.discount = discount;
                                findProduct.discountPrice = discountPrice;
                                await findProduct.save();
                            }
                        } else {
                            const productsId = marketing.products?.map(
                                product => product.product.toString()
                            );

                            await ProductModel.updateMany(
                                { _id: { $in: productsId } },
                                {
                                    $pull: {
                                        marketing: marketing._id,
                                    },
                                    $unset: {
                                        rewardCategory: 1,
                                        rewardBundle: 1,
                                        reward: 1,
                                    },
                                }
                            );
                        }

                        const cronJob = new CronJob({
                            name: 'Paused marketing deleted',
                            status: 1,
                            error: null,
                            marketingId: marketing._id,
                        });
                        await cronJob.save();
                    }
                });

                // Function for expired user punch marketing
                await UserPunchMarketingModel.updateMany(
                    {
                        status: { $in: ['ongoing', 'completed'] },
                        expiredDate: { $lte: moment() },
                    },
                    {
                        $set: {
                            status: 'expired',
                        },
                    }
                );

                // Expired reward points to user
                const users = await User.find({
                    tempRewardPoints: { $gt: 0 },
                    deletedAt: null,
                });

                const rewardSetting = await RewardSettingModel.findOne({});
                const expirationPeriod = rewardSetting?.expiration_period || 30;
                const currentDate = new Date();
                currentDate.setDate(currentDate.getDate() - expirationPeriod);

                users?.forEach(async user => {
                    const configSumOfUsedAndExpiredPoints = {
                        user: ObjectId(user._id),
                        account: 'user',
                        status: 'success',
                        type: {
                            $in: [
                                'userRedeemRewardPoints',
                                'expiredRewardPoints',
                            ],
                        },
                    };

                    const sumOfUsedAndExpiredPoints =
                        await TransactionModel.aggregate([
                            {
                                $match: configSumOfUsedAndExpiredPoints,
                            },
                            {
                                $group: {
                                    _id: '',
                                    amount: {
                                        $sum: { $sum: ['$rewardPoints'] },
                                    },
                                    count: { $sum: 1 },
                                },
                            },
                        ]);

                    const totalSumOfUsedAndExpiredPoints =
                        sumOfUsedAndExpiredPoints[0]
                            ? sumOfUsedAndExpiredPoints[0].amount
                            : 0;

                    const configSumOfCanceledOrderPoints = {
                        user: ObjectId(user._id),
                        account: 'user',
                        status: 'success',
                        type: {
                            $in: ['userCancelOrderGetRewardPoints'],
                        },
                    };

                    const sumOfCanceledOrderPoints =
                        await TransactionModel.aggregate([
                            {
                                $match: configSumOfCanceledOrderPoints,
                            },
                            {
                                $group: {
                                    _id: '',
                                    amount: {
                                        $sum: { $sum: ['$rewardPoints'] },
                                    },
                                    count: { $sum: 1 },
                                },
                            },
                        ]);

                    const totalSumOfCanceledOrderPoints =
                        sumOfCanceledOrderPoints[0]
                            ? sumOfCanceledOrderPoints[0].amount
                            : 0;

                    const configSumOfEarnedPoints = {
                        user: ObjectId(user._id),
                        account: 'user',
                        status: 'success',
                        type: {
                            $in: ['userGetRewardPoints'],
                        },
                        createdAt: {
                            $lt: currentDate,
                        },
                    };

                    const sumOfEarnedPoints = await TransactionModel.aggregate([
                        {
                            $match: configSumOfEarnedPoints,
                        },
                        {
                            $group: {
                                _id: '',
                                amount: { $sum: { $sum: ['$rewardPoints'] } },
                                count: { $sum: 1 },
                            },
                        },
                    ]);

                    const totalSumOfEarnedPoints = sumOfEarnedPoints[0]
                        ? sumOfEarnedPoints[0].amount
                        : 0;

                    const expiredRewardPoints =
                        totalSumOfEarnedPoints +
                        totalSumOfCanceledOrderPoints -
                        totalSumOfUsedAndExpiredPoints;

                    if (expiredRewardPoints > 0) {
                        await transactionForExpiredReward({
                            userId: user._id,
                            rewardPoints: expiredRewardPoints,
                        });
                    }
                });
            } catch (error) {
                console.log(error);
                const cronJob = new CronJob({
                    name: 'Marketing system cron job',
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
