const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const GlobalProductModel = require('../models/GlobalProductModel');
const NutritionModel = require('../models/NutritionModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.getNutrition = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            status,
        } = req.query;

        let whereConfig = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }],
                    },
                ],
            };
        }

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status: status,
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: NutritionModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const nutrition = await NutritionModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                nutrition,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.addNutrition = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) return errorResponse(res, 'name is required');

        const findNutrition = await NutritionModel.findOne({
            name: { $regex: `^${name}$`, $options: 'i' },
        });

        if (findNutrition)
            return errorResponse(
                res,
                'This nutrition already exists. Please try another name.'
            );

        const nutrition = await NutritionModel.create({
            name,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                nutrition,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateNutrition = async (req, res) => {
    try {
        const { nutritionId, name, status } = req.body;

        if (!ObjectId.isValid(nutritionId)) {
            return errorResponse(res, 'invalid id');
        }

        if (status && !['active', 'inactive'].includes(status))
            return errorResponse(res, 'Status is invalid');

        const isExist = await NutritionModel.findById(nutritionId);

        if (!isExist) return errorResponse(res, 'Nutrition not found');

        if (name) {
            const findNutrition = await NutritionModel.findOne({
                _id: { $ne: nutritionId },
                name: { $regex: `^${name}$`, $options: 'i' },
            });

            if (findNutrition)
                return errorResponse(
                    res,
                    'This nutrition already exist. Please try another name.'
                );
        }

        await NutritionModel.findByIdAndUpdate(nutritionId, {
            $set: {
                name,
                status,
            },
        });

        const nutrition = await NutritionModel.findById(nutritionId);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                nutrition,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteNutrition = async (req, res) => {
    try {
        const { nutritionId } = req.body;

        if (!ObjectId.isValid(nutritionId))
            return errorResponse(res, 'invalid id');

        const isExist = await NutritionModel.findById(nutritionId);

        if (!isExist) return errorResponse(res, 'Nutrition not found');

        await NutritionModel.findByIdAndDelete(nutritionId);

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getNutritionProduct = async (req, res) => {
    try {
        const { nutritionId } = req.query;

        if (!ObjectId.isValid(nutritionId))
            return errorResponse(res, 'invalid id');

        const isExist = await NutritionModel.findById(nutritionId);

        if (!isExist) return errorResponse(res, 'Nutrition not found');

        const findProducts = await GlobalProductModel.find({
            'nutrition.name': isExist.name,
        });

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                products: findProducts,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
