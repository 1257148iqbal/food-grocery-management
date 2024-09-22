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
const MealPlanModel = require('../models/MealPlanModel');
const GlobalMealPlanModel = require('../models/GlobalMealPlanModel');
const ShopModel = require('../models/ShopModel');

exports.getMealPlans = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            shopId,
            sellerId,
        } = req.query;

        let whereConfig = { deletedAt: null };

        if (shopId) {
            whereConfig.shop = shopId;
        }

        if (sellerId) {
            whereConfig.seller = sellerId;
        }

        const mealPlans = await MealPlanModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'shop',
                    select: '-password',
                },
                {
                    path: 'selectedMealPlan',
                },
                {
                    path: 'selectedDishes',
                },
                {
                    path: 'packages.packageRanges.categories.dishes.dish',
                },
            ]);

        let newList = mealPlans;

        if (searchKey) {
            newList = newList.filter(item => {
                const searchTerm = searchKey.toLowerCase();

                return item?.selectedMealPlan?.name
                    ?.toLowerCase()
                    .includes(searchTerm);
            });
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: newList.length,
            pagingRange: 5,
        });

        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                mealPlans: newList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleMealPlanById = async (req, res) => {
    try {
        const { mealPlanId } = req.query;

        if (!mealPlanId) return errorResponse(res, 'mealPlanId is required');

        const mealPlan = await MealPlanModel.findById(mealPlanId).populate([
            {
                path: 'shop',
                select: '-password',
            },
            {
                path: 'selectedMealPlan',
            },
            {
                path: 'selectedDishes',
            },
            {
                path: 'packages.packageRanges.categories.dishes.dish',
            },
        ]);

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

exports.addMealPlan = async (req, res) => {
    try {
        const { shopId, selectedMealPlan } = req.body;

        const shopExits = await ShopModel.findById(shopId);
        if (!shopExits) {
            return errorResponse(res, 'Shop not found');
        }

        const findMealPlan = await GlobalMealPlanModel.findOne({
            _id: selectedMealPlan,
            deletedAt: null,
        });

        if (!findMealPlan) {
            return errorResponse(res, 'Global meal plan not found');
        }

        const mealPlanExits = await MealPlanModel.findOne({
            shop: shopId,
            selectedMealPlan,
            deletedAt: null,
        });
        if (mealPlanExits) {
            return errorResponse(res, 'This meal plan already in your list');
        }

        const addMealPlan = await MealPlanModel.create({
            shop: shopId,
            seller: shopExits.seller,
            selectedMealPlan,
        });

        shopExits.mealPlans.push(addMealPlan._id);
        await shopExits.save();

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

exports.updateDishesInMealPlan = async (req, res) => {
    try {
        const { mealPlanId, selectedDishes } = req.body;

        const findMealPlan = await MealPlanModel.findOne({
            _id: mealPlanId,
            deletedAt: null,
        });

        if (!findMealPlan) {
            return errorResponse(res, 'Meal plan not found');
        }

        await MealPlanModel.findByIdAndUpdate(mealPlanId, {
            $set: {
                selectedDishes,
            },
        });

        const updateMealPlan = await MealPlanModel.findById(mealPlanId);

        successResponse(res, {
            message: 'Successfully added',
            data: {
                mealPlan: updateMealPlan,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updatePackagesInMealPlan = async (req, res) => {
    try {
        const { mealPlanId, packages } = req.body;

        const findMealPlan = await MealPlanModel.findOne({
            _id: mealPlanId,
            deletedAt: null,
        });

        if (!findMealPlan) {
            return errorResponse(res, 'Meal plan not found');
        }

        await MealPlanModel.findByIdAndUpdate(mealPlanId, {
            $set: {
                packages,
            },
        });

        const updateMealPlan = await MealPlanModel.findById(mealPlanId);

        successResponse(res, {
            message: 'Successfully added',
            data: {
                mealPlan: updateMealPlan,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteMealPlan = async (req, res) => {
    try {
        const { mealPlanId } = req.body;

        const isExist = await MealPlanModel.findOne({
            _id: mealPlanId,
            deletedAt: null,
        });

        if (!isExist) return errorResponse(res, 'Meal plan is not found');

        await MealPlanModel.findByIdAndUpdate(mealPlanId, {
            $set: {
                deletedAt: new Date(),
            },
        });

        await ShopModel.findByIdAndUpdate(isExist.shop, {
            $pull: {
                mealPlans: mealPlanId,
            },
        });

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
