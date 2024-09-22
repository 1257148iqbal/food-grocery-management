const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');

const AvailableStatusModel = require('../models/AvailableStatusModel');
const ShopDowntimeModel = require('../models/ShopDowntimeModel');
const ShopModel = require('../models/ShopModel');
const moment = require('moment');
const { calcActiveTime } = require('./DeliveryBoyController');

exports.getAvailableStatusForShop = async (req, res) => {
    try {
        const shopId = req.shopId;
        // const {status} = req.body;

        const isExist = await AvailableStatusModel.findOne({ shop: shopId });

        if (!isExist) {
            await AvailableStatusModel.create({
                shop: shopId,
                status: 'unavailable',
            });
        }

        const status = await AvailableStatusModel.findOne({ shop: shopId });

        successResponse(res, {
            message: 'find status',
            data: {
                status,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateStatusforShop = async (req, res) => {
    try {
        const shopId = req.shopId;
        const { status } = req.body;

        if (!['online', 'offline'].includes(status)) {
            return errorResponse(res, 'status must be online or offline');
        }

        await AvailableStatusModel.create({
            shop: shopId,
        });

        const shop = await ShopModel.findOne({ _id: shopId });

        if (shop.liveStatus === 'busy') {
            return errorResponse(res, 'Shop is busy');
        }

        if (status === 'online') {
            const lastOffline = shop.lastOffline || new Date();

            const total = calcActiveTime(lastOffline, new Date());

            await ShopDowntimeModel.create({
                shop: shopId,
                seller: shop.seller,
                Date: new Date(),
                timeOffline: moment(new Date(lastOffline)).format(
                    'DD MMM YYYY hh:mm A'
                ),
                timeOnline: moment(new Date()).format('DD MMM YYYY hh:mm A'),
                downTimeTotal: total,
            });
            await ShopModel.updateOne(
                { _id: shopId },
                {
                    $set: {
                        liveStatus: status,
                        lastOffline: null,
                    },
                }
            );
        }
        if (status === 'offline') {
            await ShopModel.updateOne(
                { _id: shopId },
                {
                    $set: {
                        liveStatus: status,
                        lastOffline: moment(new Date()).format(
                            'DD MMM YYYY hh:mm A'
                        ),
                    },
                }
            );
        }

        successResponse(res, {
            message: 'update status',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getAvailableStatusForDeliveryBoy = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const isExist = await AvailableStatusModel.findOne({
            deliveryBoy: deliveryBoyId,
        });

        if (!isExist) {
            await AvailableStatusModel.create({
                deliveryBoy: deliveryBoyId,
                status: 'unavailable',
            });
        }

        const status = await AvailableStatusModel.findOne({
            deliveryBoyId: deliveryBoyId,
        });

        successResponse(res, {
            message: 'find status',
            data: {
                status,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateStatusforDeliveryBoy = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;
        const { status } = req.query;

        await AvailableStatusModel.updateOne(
            { deliveryBoy: deliveryBoyId },
            {
                $set: {
                    status,
                },
            }
        );

        const newStatus = await AvailableStatusModel.findOne({
            deliveryBoy: deliveryBoyId,
        });

        successResponse(res, {
            message: 'update status',
            data: {
                newStatus,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
