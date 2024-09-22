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
const DishModel = require('../models/DishModel');
const ShopModel = require('../models/ShopModel');
const MealPlanModel = require('../models/MealPlanModel');

exports.getDishes = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            shopId,
            sellerId,
            category,
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

        if (shopId) {
            whereConfig.shop = shopId;
        }

        if (sellerId) {
            whereConfig.seller = sellerId;
        }

        if (category) {
            whereConfig.category = category;
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: DishModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const dishes = await DishModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                dishes,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleDishById = async (req, res) => {
    try {
        const { dishId } = req.query;

        if (!dishId) return errorResponse(res, 'dishId is required');

        const dish = await DishModel.findById(dishId);

        if (!dish) return errorResponse(res, 'Dish is not found');

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                dish,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Find specific healthy corner dishes by category wise
exports.getCategoryWiseDishes = async (req, res) => {
    try {
        const { shopId } = req.query;

        const shop = await ShopModel.findById(shopId);

        if (!shop) return errorResponse(res, 'shop not found');

        let dishConfig = {
            shop: shopId,
            deletedAt: null,
        };

        const dishes = await DishModel.find(dishConfig).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        const dishesGroupByCategory = [];

        for (const dish of dishes) {
            const findCategory = dishesGroupByCategory.find(
                item => item.category === dish.category
            );

            if (findCategory) {
                findCategory.dishes.push(dish);
            } else {
                dishesGroupByCategory.push({
                    category: dish.category,
                    dishes: [dish],
                });
            }
        }

        for (const group of dishesGroupByCategory) {
            // const findCategory = shop.healthyCornerCategories.find(
            //     item => item.category === group.category
            // );

            // group.sortingOrder = findCategory?.sortingOrder || 0;

            if (group.category === 'breakfast') {
                group.sortingOrder = 1;
            } else if (group.category === 'lunch') {
                group.sortingOrder = 2;
            } else if (group.category === 'snacks') {
                group.sortingOrder = 3;
            } else if (group.category === 'dinner') {
                group.sortingOrder = 4;
            } else {
                group.sortingOrder = 5;
            }
        }

        const sortedDishesGroupByCategory = dishesGroupByCategory.sort(
            (a, b) => a.sortingOrder - b.sortingOrder
        );

        successResponse(res, {
            message: 'Successfully find shop',
            data: {
                dishesGroupByCategory: sortedDishesGroupByCategory,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addDish = async (req, res) => {
    try {
        let {
            shop,
            name,
            image,
            description,
            category,
            ingredients,
            calories,
            fat,
            fibers,
            protein,
            portionPercentage,
        } = req.body;

        const shopExits = await ShopModel.findById(shop);
        if (!shopExits) {
            return errorResponse(res, 'Shop not found');
        }

        const dishExits = await DishModel.findOne({
            shop,
            category,
            name: { $regex: `^${name}$`, $options: 'i' },
            deletedAt: null,
        });
        if (dishExits)
            return errorResponse(res, 'This dish name is already exists.');

        const addDish = await DishModel.create({
            shop,
            seller: shopExits.seller,
            name,
            image,
            description,
            category,
            ingredients,
            calories,
            fat,
            fibers,
            protein,
            portionPercentage,
        });

        shopExits.dishes.push(addDish._id);
        // const findCategory = shopExits.healthyCornerCategories.find(
        //     item => item.category === category
        // );
        // if (!findCategory) {
        //     shopExits.healthyCornerCategories.push({
        //         category,
        //         sortingOrder: 0,
        //     });
        // }
        await shopExits.save();

        successResponse(res, {
            message: 'Successfully added',
            data: {
                dish: addDish,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateDish = async (req, res) => {
    try {
        const {
            dishId,
            name,
            image,
            description,
            category,
            ingredients,
            calories,
            fat,
            fibers,
            protein,
            portionPercentage,
        } = req.body;

        if (!dishId) return errorResponse(res, 'dishId is required');

        const isExist = await DishModel.findById(dishId);

        if (!isExist) return errorResponse(res, 'Dish is not found');

        if (name) {
            const dishExits = await DishModel.findOne({
                _id: { $ne: dishId },
                shop: isExist.shop,
                category: category,
                name: { $regex: `^${name}$`, $options: 'i' },
                deletedAt: null,
            });

            if (dishExits)
                return errorResponse(res, 'This dish name is already exists.');
        }

        let updateData = {
            name,
            image,
            description,
            category,
            ingredients,
            calories,
            fat,
            fibers,
            protein,
            portionPercentage,
        };

        await DishModel.findByIdAndUpdate(dishId, {
            $set: updateData,
        });

        const dish = await DishModel.findById(dishId);

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                dish,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteDish = async (req, res) => {
    try {
        const { dishId } = req.body;

        const isExist = await DishModel.findOne({
            _id: dishId,
            deletedAt: null,
        });

        if (!isExist) return errorResponse(res, 'Dish is not found');

        const findMealPlanWithDish = await MealPlanModel.countDocuments({
            selectedDishes: dishId,
        });

        if (findMealPlanWithDish > 0)
            return errorResponse(res, `There's a meal plan with this dish.`);

        await DishModel.findByIdAndUpdate(dishId, {
            $set: {
                deletedAt: new Date(),
            },
        });

        await ShopModel.findByIdAndUpdate(isExist.shop, {
            $pull: {
                dishes: dishId,
            },
        });

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Sort Dishes
exports.sortDishes = async (req, res) => {
    try {
        const { dishes } = req.body;

        dishes?.forEach(async dish => {
            await DishModel.updateOne(
                { _id: dish.id },
                {
                    $set: {
                        sortingOrder: dish.sortingOrder,
                    },
                }
            );
        });

        const updatedDishes = await DishModel.find().sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                dishes: updatedDishes,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
