const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const HealthyCornerSettingModel = require('../models/HealthyCornerSettingModel');

exports.getHealthyCornerSetting = async (req, res) => {
    try {
        const healthyCornerSetting = await HealthyCornerSettingModel.findOne();

        if (!healthyCornerSetting)
            return errorResponse(res, 'HealthyCorner Setting is not found');

        successResponse(res, {
            message: 'success',
            data: {
                healthyCornerSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editHealthyCornerSetting = async (req, res) => {
    try {
        const { suitedFor, dietContains, ingredients, type = [] } = req.body;

        let healthyCornerSetting = await HealthyCornerSettingModel.findOne({});

        if (healthyCornerSetting == null) {
            healthyCornerSetting = new HealthyCornerSettingModel({});
        }

        if (type.includes('suitedFor')) {
            healthyCornerSetting.suitedFor = suitedFor;
        }

        if (type.includes('dietContains')) {
            healthyCornerSetting.dietContains = dietContains;
        }

        if (type.includes('ingredients')) {
            healthyCornerSetting.ingredients = ingredients;
        }

        await healthyCornerSetting.save();

        successResponse(res, {
            message: 'update successfully',
            data: {
                healthyCornerSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
