const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const OrderCancelReason = require('../models/OrderCancelReason');
const moment = require('moment');

exports.getCancelReasonForAdmin = async (req, res) => {
    try {
        const { type, status, searchKey, startDate, endDate } = req.query;

        let config = { deletedAt: null };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));
            config = {
                ...config,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }],
                    },
                ],
            };
        }

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

        if (
            [
                'shopCancel',
                'userRefund',
                'userCancel',
                'deliveryBoy',
                'admin',
                'butler',
                'resolve',
                'subscriptionCancelReason',
            ].includes(type)
        ) {
            config = { ...config, type };
        }

        if (['active', 'inactive'].includes(status)) {
            config = { ...config, status };
        }

        const cancelReason = await OrderCancelReason.find(config).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'success',
            data: {
                cancelReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCancelReasonForShop = async (req, res) => {
    try {
        const cancelReason = await OrderCancelReason.find({
            type: 'shopCancel',
            status: 'active',
            deletedAt: null,
        }).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'success',
            data: {
                cancelReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderCancelReasonForUserApp = async (req, res) => {
    try {
        const cancelReason = await OrderCancelReason.find({
            type: 'userCancel',
            status: 'active',
            deletedAt: null,
        }).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'success',
            data: {
                cancelReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderCancelReasonForButler = async (req, res) => {
    try {
        const cancelReason = await OrderCancelReason.find({
            type: 'butler',
            status: 'active',
            deletedAt: null,
        }).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'success',
            data: {
                cancelReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderCancelReasonForDeliveryBoy = async (req, res) => {
    try {
        const cancelReason = await OrderCancelReason.find({
            type: 'deliveryBoy',
            status: 'active',
            deletedAt: null,
        }).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'success',
            data: {
                cancelReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addCancelReason = async (req, res) => {
    try {
        const { name, type } = req.body;

        const cancelReason = await OrderCancelReason.create({
            name,
            type,
        });

        successResponse(res, {
            message: 'success',
            data: {
                cancelReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editCancelReason = async (req, res) => {
    try {
        const { id, name, type, status } = req.body;

        // check id
        const checkCancelReason = await OrderCancelReason.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!checkCancelReason) {
            return errorResponse(res, 'Cancel reason not found');
        }

        await OrderCancelReason.updateOne(
            {
                _id: id,
            },
            {
                $set: {
                    name,
                    type,
                    status,
                },
            }
        );

        const cancelReason = await OrderCancelReason.findById(id);

        successResponse(res, {
            message: 'successfully update',
            data: {
                cancelReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteCancelReason = async (req, res) => {
    try {
        const { id } = req.body;

        // check id
        const checkCancelReason = await OrderCancelReason.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!checkCancelReason) {
            return errorResponse(res, 'Cancel reason not found');
        }

        await OrderCancelReason.findByIdAndDelete(id);

        successResponse(res, {
            message: 'successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sortCancelReason = async (req, res) => {
    try {
        const { cancelReasons } = req.body;

        cancelReasons?.forEach(async cancelReason => {
            await OrderCancelReason.updateOne(
                { _id: cancelReason.id },
                {
                    $set: {
                        sortingOrder: cancelReason.sortingOrder,
                    },
                }
            );
        });

        const updatedCancelReasons = await OrderCancelReason.find({
            deletedAt: null,
        }).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                cancelReasons: updatedCancelReasons,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
