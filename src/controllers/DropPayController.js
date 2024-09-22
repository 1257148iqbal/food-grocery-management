const TransactionModel = require('../models/TransactionModel');
const { getUserBalance } = require('../helpers/BalanceQuery');
const moment = require('moment');
const { errorHandler, successResponse } = require('../helpers/apiResponse');
const { pagination } = require('../helpers/pagination');
const UserModel = require('../models/UserModel');

exports.getDropPay = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            startDate,
            endDate,
            type,
            searchKey,
            userId,
            sellerId,
            shopId,
            deliveryBoyId,
        } = req.query;

        let config = {
            type: {
                $in: [
                    'userBalanceWithdrawAdmin',
                    'userBalanceAddAdmin',
                    'userCancelOrderGetWallet',
                    // 'topUpAdminWallet'
                ],
            },
        };

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const autoTrxIdSearchQuery = newQuery.map(str => ({
                autoTrxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: autoTrxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (userId) {
            config = {
                ...config,
                user: userId,
            };
        }

        if (sellerId) {
            config = {
                ...config,
                seller: sellerId,
            };
        }

        if (shopId) {
            config = {
                ...config,
                shop: shopId,
            };
        }

        if (deliveryBoyId) {
            config = {
                ...config,
                deliveryBoy: deliveryBoyId,
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: TransactionModel,
            condition: config,
            pagingRange: 5,
        });

        const transactionList = await TransactionModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: 'name gender phone_number email status dob account_type',
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
            ]);

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                transactionList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllDropPay = async (req, res) => {
    try {
        const {
            sortBy = 'DESC',
            startDate,
            endDate,
            type,
            searchKey,
            userId,
            sellerId,
            shopId,
            deliveryBoyId,
        } = req.query;

        let config = {
            type: {
                $in: [
                    'userBalanceWithdrawAdmin',
                    'userBalanceAddAdmin',
                    'userCancelOrderGetWallet',
                ],
            },
        };

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdSearchQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const autoTrxIdSearchQuery = newQuery.map(str => ({
                autoTrxId: RegExp(str, 'i'),
            }));

            const adminNoteSearchQuery = newQuery.map(str => ({
                adminNote: RegExp(str, 'i'),
            }));

            const userNoteQuery = newQuery.map(str => ({
                userNote: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: trxIdSearchQuery },
                            { $and: autoTrxIdSearchQuery },
                            { $and: adminNoteSearchQuery },
                            { $and: userNoteQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (userId) {
            config = {
                ...config,
                user: userId,
            };
        }

        if (sellerId) {
            config = {
                ...config,
                seller: sellerId,
            };
        }

        if (shopId) {
            config = {
                ...config,
                shop: shopId,
            };
        }

        if (deliveryBoyId) {
            config = {
                ...config,
                deliveryBoy: deliveryBoyId,
            };
        }

        const transactionList = await TransactionModel.find(config)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'user',
                    select: 'name gender phone_number email status dob account_type',
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
            ]);

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                transactionList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getDropPayUseList = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            account_type: 'user',
            tempBalance: { $gt: 0 },
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const phoneSearchQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: phoneSearchQuery },
                        ],
                    },
                ],
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: UserModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await UserModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select('-shops -favoritesProducts -favoritesShops')
            .populate('address');

        const newList = [];

        for (const element of list) {
            const user = element;
            const {
                availableBalance: balance,
                secondaryCurrency_availableBalance: secondaryCurrency_balance,
            } = await getUserBalance(user._id);
            const newUser = {
                ...user._doc,
                balance,
                secondaryCurrency_balance,
            };
            newList.push(newUser);
        }

        return res.status(200).json({
            status: true,
            data: {
                users: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getUserTransaction = async (req, res) => {
    try {
        const userId = req.userId;

        const { page = 1, pageSize = 50, sortBy = 'DESC' } = req.query;

        let config = {
            account: 'user',
            user: userId,
            isUserWalletRelated: true,
            // type: {
            //     $nin: [
            //         'userGetRewardPoints',
            //         'userRedeemRewardPoints',
            //         'userCancelOrderGetRewardPoints',
            //         'expiredRewardPoints',
            //     ],
            // },
        };

        const paginate = await pagination({
            page,
            pageSize,
            model: TransactionModel,
            condition: config,
            pagingRange: 5,
        });

        const transactionList = await TransactionModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: 'name gender phone_number email status dob account_type',
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
            ]);

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                transactionList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopTransaction = async (req, res) => {
    try {
        const shopId = req.shopId;

        const {
            startDate,
            endDate,
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
        } = req.query;

        let config = {
            account: 'shop',
            shop: shopId,
            // createdAt: {
            //     $gte: moment(new Date(startDate)),
            //     $lte: moment(endDate ? new Date(endDate) : new Date()).add(
            //         1,
            //         'days'
            //     ),
            // },
        };

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        // console.log(config);
        const paginate = await pagination({
            page,
            pageSize,
            model: TransactionModel,
            condition: config,
            pagingRange: 5,
        });

        const transactionList = await TransactionModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: 'name gender phone_number email status dob account_type',
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
            ]);

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                transactionList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
