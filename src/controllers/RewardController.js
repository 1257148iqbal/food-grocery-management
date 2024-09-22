const {
    successResponse,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const { paginationMultipleModel } = require('../helpers/pagination');
const { DateTime } = require('luxon');
const moment = require('moment');
const short = require('short-uuid');
const ObjectId = require('mongoose').Types.ObjectId;
const TransactionModel = require('../models/TransactionModel');
const RewardModel = require('../models/RewardModel');
const AppSetting = require('../models/AppSetting');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const OrderModel = require('../models/OrderModel');
const ButlerModel = require('../models/ButlerModel');
const AdminModel = require('../models/AdminModel');
const ShopModel = require('../models/ShopModel');

exports.getAllReward = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            startDate,
            endDate,
            searchKey,
            sortBy = 'desc',
            type, // rider || sales
        } = req.query;

        if (!type) return errorResponse(res, 'type is required');

        let config = {};

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

        if (type === 'rider') {
            config.type = 'riderGetWeeklyReward';
        }

        if (type === 'sales') {
            config.type = 'salesManagerGetMonthlyReward';
        }

        let rewardTrx = await TransactionModel.find(config)
            .sort({
                createdAt: sortBy,
            })
            .populate('admin deliveryBoy');

        if (searchKey) {
            rewardTrx = rewardTrx.filter(trx => {
                const searchTerm = searchKey.toLowerCase();

                const matchesAutoGenId = trx?.autoGenId
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesAutoTrxId = trx?.autoTrxId
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesRiderId = trx?.deliveryBoy?.autoGenId
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesRiderName = trx?.deliveryBoy?.name
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesRiderEmail = trx?.deliveryBoy?.email
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesRiderNumber = trx?.deliveryBoy?.number
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesSalesManagerId = trx?.admin?.autoGenId
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesSalesManagerName = trx?.admin?.name
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesSalesManagerNumber = trx?.admin?.phone_number
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesSalesManagerEmail = trx?.admin?.email
                    ?.toLowerCase()
                    .includes(searchTerm);

                return (
                    matchesAutoGenId ||
                    matchesAutoTrxId ||
                    matchesRiderId ||
                    matchesRiderName ||
                    matchesRiderEmail ||
                    matchesRiderNumber ||
                    matchesSalesManagerId ||
                    matchesSalesManagerName ||
                    matchesSalesManagerNumber ||
                    matchesSalesManagerEmail
                );
            });
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: rewardTrx.length,
            pagingRange,
        });

        const finalTrx = rewardTrx.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully find',
            data: {
                transactions: finalTrx,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleSalesManagerTarget = async (req, res) => {
    try {
        const { salesManagerId, rewardedYear } = req.query;

        if (!salesManagerId)
            return errorResponse(res, 'salesManagerId is required');

        if (!rewardedYear)
            return errorResponse(res, 'rewardedYear is required');

        let config = {
            rewardType: 'salesManagerMonthlyReward',
            admin: salesManagerId,
            rewardedYear,
        };

        const rewards = await RewardModel.find(config).sort({
            rewardedMonth: 'desc',
        });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                rewards,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.createRiderReward = async (req, res) => {
    try {
        const appSetting = await AppSetting.findOne({}).select(
            'adminExchangeRate'
        );
        const adminExchangeRate = appSetting?.adminExchangeRate || 0;

        const activeRiders = await DeliveryBoyModel.find({
            status: 'active',
            deliveryBoyType: 'dropRider',
            deletedAt: null,
        })
            .populate({
                path: 'zone',
                select: 'riderWeeklyTarget riderWeeklyReward',
            })
            .select('zone');

        // Calc rider weekly completed order
        const startOfWeek = moment(new Date()).startOf('isoWeek'); // Using the 'isoWeek' to consider Monday as the start
        const endOfWeek = moment(new Date()).endOf('isoWeek');

        for (const rider of activeRiders) {
            const riderWeeklyTarget = rider?.zone?.riderWeeklyTarget || 0;

            const riderWeeklyReward = rider?.zone?.riderWeeklyReward || 0;

            if (riderWeeklyTarget > 0 && riderWeeklyReward > 0) {
                const riderWeeklyNormalOrder = await OrderModel.countDocuments({
                    deliveryBoy: ObjectId(rider._id),
                    orderStatus: 'delivered',
                    createdAt: {
                        $gte: startOfWeek,
                        $lte: endOfWeek,
                    },
                });
                const riderWeeklyButlerOrder = await ButlerModel.countDocuments(
                    {
                        deliveryBoy: ObjectId(rider._id),
                        orderStatus: 'delivered',
                        createdAt: {
                            $gte: startOfWeek,
                            $lte: endOfWeek,
                        },
                    }
                );
                const riderWeeklyOrder =
                    riderWeeklyNormalOrder + riderWeeklyButlerOrder;

                const riderWeeklyTargetRatioInPct =
                    (riderWeeklyOrder / riderWeeklyTarget) * 100;

                if (riderWeeklyTargetRatioInPct >= 100) {
                    const riderReward =
                        (riderWeeklyReward * riderWeeklyTargetRatioInPct) / 100;

                    await TransactionModel.create({
                        autoTrxId: `TNX${moment().format(
                            'DDMMYYHmm'
                        )}${short().new()}`,
                        account: 'deliveryBoy',
                        type: 'riderGetWeeklyReward',
                        deliveryBoy: rider._id,
                        amount: riderReward,
                        secondaryCurrency_amount:
                            riderReward * adminExchangeRate,
                        status: 'success',
                        adminNote: 'Rider get for weekly reward',
                        paidCurrency: 'baseCurrency',
                        riderWeeklyOrder,
                        riderWeeklyTarget,
                    });
                }
            }
        }

        successResponse(res, {
            message: 'Successfully created',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.createSalesReward = async (req, res) => {
    try {
        const appSetting = await AppSetting.findOne({}).select(
            'adminExchangeRate salesManagerMonthlyTarget salesManagerMonthlyReward'
        );
        const adminExchangeRate = appSetting?.adminExchangeRate || 0;
        const salesManagerMonthlyTarget =
            appSetting?.salesManagerMonthlyTarget || 0;
        const salesManagerMonthlyReward =
            appSetting?.salesManagerMonthlyReward || 0;

        if (salesManagerMonthlyTarget > 0 && salesManagerMonthlyReward > 0) {
            const activeSalesManagers = await AdminModel.find({
                status: 'active',
                adminType: 'sales',
                deletedAt: null,
            });

            // Calc sales manager monthly created shop
            const firstDayOfPreviousMonth = moment(new Date()).startOf('month');
            const lastDayOfPreviousMonth = moment(new Date()).endOf('month');
            const rewardedMonth = firstDayOfPreviousMonth.format('M');
            const rewardedYear = firstDayOfPreviousMonth.format('YYYY');

            for (const salesManager of activeSalesManagers) {
                const salesManagerMonthlyCreatedShop =
                    await ShopModel.countDocuments({
                        shopStatus: 'active',
                        deletedAt: null,
                        assignedSalesManager: ObjectId(salesManager._id),
                        createdAt: {
                            $gte: firstDayOfPreviousMonth,
                            $lte: lastDayOfPreviousMonth,
                        },
                    });

                const salesManagerMonthlyTargetRatioInPct =
                    (salesManagerMonthlyCreatedShop /
                        salesManagerMonthlyTarget) *
                    100;

                let salesManagerReward = 0;
                if (salesManagerMonthlyTargetRatioInPct >= 100) {
                    salesManagerReward =
                        (salesManagerMonthlyReward *
                            salesManagerMonthlyTargetRatioInPct) /
                        100;

                    await TransactionModel.create({
                        autoTrxId: `TNX${moment().format(
                            'DDMMYYHmm'
                        )}${short().new()}`,
                        account: 'admin',
                        type: 'salesManagerGetMonthlyReward',
                        admin: salesManager._id,
                        amount: salesManagerReward,
                        secondaryCurrency_amount:
                            salesManagerReward * adminExchangeRate,
                        status: 'success',
                        adminNote: 'Sales Manager get for monthly reward',
                        paidCurrency: 'baseCurrency',
                        salesManagerMonthlyCreatedShop,
                        salesManagerMonthlyTarget,
                    });
                }

                await RewardModel.create({
                    rewardType: 'salesManagerMonthlyReward',
                    admin: salesManager._id,
                    amount: salesManagerReward,
                    secondaryCurrency_amount:
                        salesManagerReward * adminExchangeRate,
                    salesManagerMonthlyCreatedShop,
                    salesManagerMonthlyTarget,
                    rewardedYear,
                    rewardedMonth,
                });
            }
        }

        successResponse(res, {
            message: 'Successfully created',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
