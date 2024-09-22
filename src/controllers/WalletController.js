const { errorHandler, successResponse } = require('../helpers/apiResponse');
const { pagination } = require('../helpers/pagination');
const TransactionModel = require('../models/TransactionModel');
const moment = require('moment');
const SellerModel = require('../models/SellerModel');

exports.getAdminTransaction = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            startDate,
            endDate,
        } = req.query;

        let config = {
            account: 'admin',
        };

        if (startDate && endDate) {
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
                    path: 'deliveryBoy',
                },
                {
                    path: 'orderId',
                },
                {
                    path: 'shop',
                    populate: 'seller',
                },
            ]);

        const today = new Date();
        let todaySummeryConfig = {
            account: 'admin',
            createdAt: {
                $gt: moment(
                    new Date(
                        new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            today.getDate()
                        )
                    )
                ),
                $lt: moment(new Date()).add(1, 'days'),
            },
        };

        // today summery
        const todayTotalTransaction = await TransactionModel.count(
            todaySummeryConfig
        );

        const todaySummery = {
            total: todayTotalTransaction,
        };

        const total = await TransactionModel.count(config);

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                summery: {
                    total,
                },
                todaySummery,
                transactionList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getDeliveryBoyTransaction = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            deliveryBoyId,
        } = req.query;

        let config = {
            account: 'deliveryBoy',
        };

        if (startDate && endDate) {
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

        if (deliveryBoyId) {
            config = {
                ...config,
                deliveryBoy: deliveryBoyId,
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const trxIdQuery = newQuery.map(str => ({
                trxId: RegExp(str, 'i'),
            }));

            const autoTrxIdQuery = newQuery.map(str => ({
                autoTrxId: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [{ $and: trxIdQuery }, { $and: autoTrxIdQuery }],
                    },
                ],
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
                    path: 'deliveryBoy',
                },
                {
                    path: 'orderId',
                },
                {
                    path: 'shop',
                    populate: 'seller',
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
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            startDate,
            endDate,
            seller,
        } = req.query;

        let config = {
            account: 'shop',
        };

        if (startDate && endDate) {
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
                    path: 'shop',
                    populate: 'seller',
                },
                {
                    path: 'orderId',
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
