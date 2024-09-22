const { validationResult } = require('express-validator');
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
const GlobalMealPlanModel = require('../models/GlobalMealPlanModel');
const MealPlanModel = require('../models/MealPlanModel');

exports.getGlobalMealPlans = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
        } = req.query;

        let whereConfig = { deletedAt: null };

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

        const paginate = await pagination({
            page,
            pageSize,
            model: GlobalMealPlanModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const mealPlans = await GlobalMealPlanModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                mealPlans,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleGlobalMealPlanById = async (req, res) => {
    try {
        const { mealPlanId } = req.query;

        if (!mealPlanId) return errorResponse(res, 'mealPlanId is required');

        const mealPlan = await GlobalMealPlanModel.findById(mealPlanId);

        if (!mealPlan) return errorResponse(res, 'Meal Plan is not found');

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                mealPlan,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addGlobalMealPlan = async (req, res) => {
    try {
        let {
            name,
            image,
            shortDescription,
            fullDescription,
            suitedFor,
            dietContains,
        } = req.body;

        const mealPlanExits = await GlobalMealPlanModel.findOne({
            name: { $regex: `^${name}$`, $options: 'i' },
            deletedAt: null,
        });

        if (mealPlanExits)
            return errorResponse(res, 'This meal plan name is already exists.');

        const addMealPlan = await GlobalMealPlanModel.create({
            name,
            image,
            shortDescription,
            fullDescription,
            suitedFor,
            dietContains,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                mealPlan: addMealPlan,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateGlobalMealPlan = async (req, res) => {
    try {
        const {
            mealPlanId,
            name,
            image,
            shortDescription,
            fullDescription,
            suitedFor,
            dietContains,
        } = req.body;

        if (!mealPlanId) return errorResponse(res, 'mealPlanId is required');

        const isExist = await GlobalMealPlanModel.findById(mealPlanId);

        if (!isExist) return errorResponse(res, 'Meal plan is not found');

        if (name) {
            const mealPlanExits = await GlobalMealPlanModel.findOne({
                _id: { $ne: mealPlanId },
                name: { $regex: `^${name}$`, $options: 'i' },
                deletedAt: null,
            });

            if (mealPlanExits)
                return errorResponse(
                    res,
                    'This meal plan name is already exists.'
                );
        }

        let updateData = {
            name,
            image,
            shortDescription,
            fullDescription,
            suitedFor,
            dietContains,
        };

        await GlobalMealPlanModel.findByIdAndUpdate(mealPlanId, {
            $set: updateData,
        });

        const mealPlan = await GlobalMealPlanModel.findById(mealPlanId);

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                mealPlan,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteGlobalMealPlan = async (req, res) => {
    try {
        const { mealPlanId } = req.body;

        const isExist = await GlobalMealPlanModel.findOne({
            _id: mealPlanId,
            deletedAt: null,
        });

        if (!isExist) return errorResponse(res, 'Meal plan is not found');

        const findMealPlanWithGlobal = await MealPlanModel.countDocuments({
            selectedMealPlan: mealPlanId,
        });

        if (findMealPlanWithGlobal > 0)
            return errorResponse(
                res,
                `There's a shop meal plan with this meal plan.`
            );

        await GlobalMealPlanModel.findByIdAndUpdate(mealPlanId, {
            $set: {
                deletedAt: new Date(),
            },
        });

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
