const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const SubscriptionSettingModel = require('../models/SubscriptionSettingModel');

exports.getSubscriptionSetting = async (req, res) => {
    try {
        const { subscriptionPackage } = req.query;

        let config = {};

        if (subscriptionPackage) {
            config = {
                ...config,
                subscriptionPackage,
            };
        }

        const subscriptionSetting = await SubscriptionSettingModel.find(config);

        if (!subscriptionSetting.length) {
            return errorResponse(res, 'Subscription Setting not found');
        }

        successResponse(res, {
            message: 'success',
            data: {
                subscriptionSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSubscriptionSettingForApp = async (req, res) => {
    try {
        const { subscriptionPackage } = req.query;

        let config = { status: 'active' };

        if (subscriptionPackage) {
            config = {
                ...config,
                subscriptionPackage,
            };
        }

        const subscriptionSetting = await SubscriptionSettingModel.find(config);

        if (!subscriptionSetting.length) {
            return errorResponse(res, 'Subscription Setting not found');
        }

        successResponse(res, {
            message: 'success',
            data: {
                subscriptionSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editSubscriptionSetting = async (req, res) => {
    try {
        const { subscriptionPackage, subscriptionFee, status } = req.body;

        if (!subscriptionPackage) {
            return errorResponse(res, 'Subscription Package is required');
        }

        if (!['monthly', 'yearly'].includes(subscriptionPackage)) {
            return errorResponse(
                res,
                'Subscription Package can be monthly or yearly'
            );
        }

        let subscriptionSetting = await SubscriptionSettingModel.findOne({
            subscriptionPackage,
        });

        if (subscriptionSetting == null) {
            subscriptionSetting = new SubscriptionSettingModel({
                subscriptionPackage,
            });
        }

        subscriptionSetting.subscriptionFee = subscriptionFee;
        subscriptionSetting.status = status;
        await subscriptionSetting.save();

        const updatedSubscriptionSetting =
            await SubscriptionSettingModel.find();

        successResponse(res, {
            message: 'update successfully',
            data: {
                subscriptionSetting: updatedSubscriptionSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
