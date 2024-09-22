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
const CategoryModel = require('../models/CategoryModel');
const ShopCategory = require('../models/ShopCategory');
const ShopModel = require('../models/ShopModel');
const ProductModel = require('../models/ProductModel');
const SubCategoryModel = require('../models/SubCategoryModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.getCategory = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            status,
            type,
            userType,
            shopId,
            sellerId,
        } = req.query;

        var whereConfig = {
            deletedAt: null,
        };

        let list = [];
        let paginate;

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

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            whereConfig = {
                ...whereConfig,
                type: type,
            };
        }

        if (shopId) {
            whereConfig = {
                ...whereConfig,
                shop: shopId,
            };
        }

        if (sellerId) {
            let sellerShops = await ShopModel.aggregate([
                {
                    $match: {
                        seller: ObjectId(sellerId),
                    },
                },
                {
                    $project: {
                        _id: 1,
                    },
                },
            ]);

            // console.log(sellerShops,sellerId)
            whereConfig = {
                ...whereConfig,
                $or: [
                    { seller: sellerId },
                    {
                        shop: {
                            $in: sellerShops,
                        },
                    },
                ],
            };
        }

        if (userType === 'admin') {
            const categoryList = await ShopCategory.find(whereConfig)
                .populate([
                    {
                        path: 'shop',
                    },
                    {
                        path: 'category',
                    },
                ])
                .sort({ createdAt: sortBy });

            for (const category of categoryList) {
                const findCategory = list?.find(
                    uniqueCategory => uniqueCategory?.name === category?.name
                );

                if (!findCategory) {
                    category._doc.ids = [category._id];
                    category._doc.categories = [category.category];
                    category._doc.shops = [category.shop];
                    category._doc.category = {
                        _id: category.category._id,
                        name: category.name || category.category.name,
                        image: category.image || category.category.image,
                    }
                    list.push(category);
                } else {
                    findCategory._doc.ids.push(category._id);
                    findCategory._doc.categories.push(category.category);
                    findCategory._doc.shops.push(category.shop);
                    findCategory._doc.category = {
                        _id: category.category._id,
                        name: category.name || category.category.name,
                        image: category.image || category.category.image,
                    }
                }
            }

            paginate = await paginationMultipleModel({
                page,
                pageSize,
                total: list.length,
                pagingRange: 5,
            });

            list = list.slice(
                paginate.offset,
                paginate.offset + paginate.limit
            );
        } else if (userType === 'shop') {
            list = await ShopCategory.find(whereConfig)
                .populate([
                    {
                        path: 'shop',
                    },
                    {
                        path: 'category',
                    },
                ])
                .sort({ createdAt: sortBy });

            if (['grocery', 'pharmacy'].includes(type)) {
                const newList = await ShopCategory.find({
                    type: type,
                    status: 'active',
                    shop: { $exists: false },
                })
                    .sort({ createdAt: sortBy })
                    .populate([
                        {
                            path: 'category',
                        },
                    ]);

                for (const shopCategory of newList) {
                    const findShopCategory = list.find(
                        element => element.name === shopCategory.name
                    );
                    if (!findShopCategory) {
                        list.push(shopCategory);
                    }
                }
            }

            paginate = await paginationMultipleModel({
                page,
                pageSize,
                total: list.length,
                pagingRange: 5,
            });
            list = list.slice(
                paginate.offset,
                paginate.offset + paginate.limit
            );
        } else if (userType === 'seller') {
            paginate = await pagination({
                page,
                pageSize,
                model: ShopCategory,
                condition: whereConfig,
                pagingRange: 5,
            });

            list = await ShopCategory.find(whereConfig)
                .populate([
                    {
                        path: 'shop',
                    },
                    {
                        path: 'category',
                    },
                ])
                .sort({ createdAt: sortBy })
                .skip(paginate.offset)
                .limit(paginate.limit);
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                categories: list,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, image, type, note, shopId, sellerId } = req.body;
        if (
            ![
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ].includes(type)
        )
            return errorResponse(res, 'Type is invalid');

        if (['food', 'coffee', 'flower', 'pet'].includes(type) && !shopId)
            return errorResponse(
                res,
                'food, coffee, flower, pet Type category should required shopId'
            );

        if (shopId) {
            let shopCategory = await ShopCategory.findOne({
                shop: shopId,
                name: { $regex: `^${name}$`, $options: 'i' },
                type,
                deletedAt: null,
            });
            if (shopCategory)
                return errorResponse(
                    res,
                    'This Category already exists for this shop. Please try another name.'
                );
        }

        category = await CategoryModel.create({
            name,
            status: 'active',
            image,
            type,
            note,
        });


        let categoryObject = {
            category: category._id,
            type: category.type,
            name: category.name,
            note: category.note,
            status: 'active',
            image: category.image,
        };
        if (shopId) categoryObject.shop = shopId;
        if (sellerId) categoryObject.seller = sellerId;

        await ShopCategory.create(categoryObject);


        successResponse(res, {
            message: 'Successfully added',
            data: {
                category,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id, name, status, image, type, note } = req.body;

        if (!ObjectId.isValid(id)) {
            return errorResponse(res, 'invalid id');
        }

        let updatedData = {};

        const isExist = await ShopCategory.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!isExist) return errorResponse(res, 'Category not found');

        if (type) {
            if (
                ![
                    'food',
                    'grocery',
                    'pharmacy',
                    'coffee',
                    'flower',
                    'pet',
                ].includes(type)
            )
                return errorResponse(res, 'Type is invalid');
            updatedData = {
                ...updatedData,
                type,
            };
        }

        if (name) {
            let shopCategory = await ShopCategory.findOne({
                shop: isExist.shop,
                name: { $regex: `^${name}$`, $options: 'i' },
                type,
            });

            if (shopCategory)
                return errorResponse(
                    res,
                    'This category already exists. Please try another name.'
                );

            updatedData = {
                ...updatedData,
                name,
            };
        }

        if (status) {
            if (!['active', 'inactive'].includes(status))
                return errorResponse(res, 'Status is invalid');

            updatedData = {
                ...updatedData,
                status,
            };
        }

        if (image) {
            updatedData = {
                ...updatedData,
                image,
            };
        }

        if (note) {
            updatedData = {
                ...updatedData,
                note,
            };
        }

        await ShopCategory.findByIdAndUpdate(id, updatedData);

        const updateCategory = await ShopCategory.findById(id).populate(
            'category'
        );

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                category: updateCategory,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateMultipleCategory = async (req, res) => {
    try {
        const { ids, name, status, image, type, note } = req.body;

        let updatedData = {};

        const isExist = await ShopCategory.find({
            _id: { $in: ids },
            deletedAt: null,
        }).populate('category');

        if (isExist.length !== ids.length)
            return errorResponse(res, 'Category not found');

        if (type) {
            if (
                ![
                    'food',
                    'grocery',
                    'pharmacy',
                    'coffee',
                    'flower',
                    'pet',
                ].includes(type)
            )
                return errorResponse(res, 'Type is invalid');
            updatedData = {
                ...updatedData,
                type,
            };
        }

        if (name) {

            const findCategory = await ShopCategory.findOne({
                name: { $regex: `^${name}$`, $options: 'i' },
            });

            if (findCategory)
                return errorResponse(
                    res,
                    'This category already exists. Please try another name.'
                );

            updatedData = {
                ...updatedData,
                name,
            };
        }

        if (status) {
            if (!['active', 'inactive'].includes(status))
                return errorResponse(res, 'Status is invalid');

            updatedData = {
                ...updatedData,
                status,
            };
        }

        if (image) {
            updatedData = {
                ...updatedData,
                image,
            };
        }

        if (note) {
            updatedData = {
                ...updatedData,
                note,
            };
        }

        await ShopCategory.updateMany({ _id: { $in: ids } }, updatedData);

        const categoryIds = isExist.map(element =>
            element.category._id.toString()
        );

        await CategoryModel.updateMany(
            { _id: { $in: categoryIds } },
            updatedData
        );

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                categories: isExist,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteCategoryById = async (req, res) => {
    try {
        const { id } = req.body;

        if (!ObjectId.isValid(id)) return errorResponse(res, 'invalid id');

        const isExist = await ShopCategory.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Category not found');

        const thisCategoryProducts = await ProductModel.find({
            category: isExist.category,
            shop: isExist.shop,
            deletedAt: null
        });

        if (thisCategoryProducts.length > 0) {
            return errorResponse(res, 'Category is not empty');
        }

        // await CategoryModel.findByIdAndDelete(isExist.category);
        await ShopCategory.findByIdAndDelete(id);

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleCategory = async (req, res) => {
    try {
        const { id } = req.query;

        if (!ObjectId.isValid(id)) return errorResponse(res, 'invalid id');

        const isExist = await ShopCategory.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Category not found');

        const category = await ShopCategory.findById(id).populate(
            'category  shop'
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                category,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCategoryForUser = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            type,
        } = req.query;

        var whereConfig = {
            deletedAt: null,
            status: 'active',
        };

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

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            whereConfig = {
                ...whereConfig,
                type: type,
            };
        }

        var paginate = await pagination({
            page,
            pageSize,
            model: CategoryModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await CategoryModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                categorys: list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// Sort Categories
exports.sortCategories = async (req, res) => {
    try {
        const { categories } = req.body;

        categories?.forEach(async category => {
            await CategoryModel.updateOne(
                { _id: category.id },
                {
                    $set: {
                        sortingOrder: category.sortingOrder,
                    },
                }
            );
            await ShopCategory.updateOne(
                { category: category.id },
                {
                    $set: {
                        sortingOrder: category.sortingOrder,
                    },
                }
            );
        });

        successResponse(res, {
            message: 'Successfully Updated',
            data: {},
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getCategoryProducts = async (req, res) => {
    try {
        const { categoryId } = req.query;

        if (!ObjectId.isValid(categoryId))
            return errorResponse(res, 'Invalid categoryId');

        const isExist = await ShopCategory.findOne({ _id: categoryId });

        if (!isExist) return errorResponse(res, 'Category not found');

        const shopCategory = await ShopCategory.findById(categoryId);

        const productsGroupByCategory = [];

        if (['food', 'coffee', 'flower', 'pet'].includes(shopCategory.type)) {
            const products = await ProductModel.find({
                deletedAt: null,
                category: shopCategory.category,
            })
                .sort([
                    ['sortingOrder', 'asc'],
                    ['createdAt', -1],
                ])
                .populate([
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'shop',
                    },
                    {
                        path: 'seller',
                    },
                    {
                        path: 'addons',
                    },
                    {
                        path: 'marketing',
                    },
                ]);

            productsGroupByCategory.push({
                category: {
                    _id: shopCategory.category._id,
                    name: shopCategory.name || shopCategory.category.name,
                    image: shopCategory.image || shopCategory.category.image,
                },
                sortedProducts: products,
            });
        } else {
            const subCategories = await SubCategoryModel.find({
                category: shopCategory.category,
            }).sort([
                ['sortingOrder', 'asc'],
                ['createdAt', -1],
            ]);

            const productsGroupBySubCategory = [];

            for (const subCategory of subCategories) {
                const products = await ProductModel.find({
                    deletedAt: null,
                    category: shopCategory.category,
                    subCategory: subCategory._id,
                })
                    .sort([
                        ['sortingOrder', 'asc'],
                        ['createdAt', -1],
                    ])
                    .populate([
                        {
                            path: 'category',
                        },
                        {
                            path: 'subCategory',
                        },
                        {
                            path: 'shop',
                        },
                        {
                            path: 'seller',
                        },
                        {
                            path: 'addons',
                        },
                        {
                            path: 'marketing',
                        },
                    ]);

                productsGroupBySubCategory.push({
                    subCategory,
                    sortedProducts: products,
                });
            }

            productsGroupByCategory.push({
                category: {
                    _id: shopCategory.category._id,
                    name: shopCategory.name || shopCategory.category.name,
                    image: shopCategory.image || shopCategory.category.image,
                },
                subCategories: productsGroupBySubCategory,
            });
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                productsGroupByCategory,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getMultipleCategoryProducts = async (req, res) => {
    try {
        const { categoryIds } = req.body;

        const isExist = await ShopCategory.find({ _id: { $in: categoryIds } });

        if (!isExist.length) return errorResponse(res, 'Category not found');

        const shopCategories = await ShopCategory.find({
            _id: { $in: categoryIds },
        }).populate('shop category');

        const productsGroupByCategory = [];

        for (const shopCategory of shopCategories) {
            if (
                [
                    'food',
                    'coffee',
                    'flower',
                    'pet',
                ].includes(shopCategory.type)
            ) {
                const products = await ProductModel.find({
                    deletedAt: null,
                    category: shopCategory.category._id,
                    shop: shopCategory.shop?._id
                })
                    .sort([
                        ['sortingOrder', 'asc'],
                        ['createdAt', -1],
                    ])
                    .populate([
                        {
                            path: 'category',
                        },
                        {
                            path: 'subCategory',
                        },
                        {
                            path: 'shop',
                        },
                        {
                            path: 'seller',
                        },
                        {
                            path: 'addons',
                        },
                        {
                            path: 'marketing',
                        },
                    ]);

                productsGroupByCategory.push({
                    category: {
                        ...shopCategory._doc,
                        category: {
                            _id: shopCategory.category._id,
                            name: shopCategory.name || shopCategory.category.name,
                            image: shopCategory.image || shopCategory.category.image,
                        }
                    },
                    sortedProducts: products,
                });
            } else {
                const subCategories = await SubCategoryModel.find({
                    category: shopCategory.category._id,
                }).sort([
                    ['sortingOrder', 'asc'],
                    ['createdAt', -1],
                ]);

                const productsGroupBySubCategory = [];

                for (const subCategory of subCategories) {
                    const products = await ProductModel.find({
                        deletedAt: null,
                        category: shopCategory.category._id,
                        subCategory: subCategory._id,
                        shop: shopCategory.shop?._id
                    })
                        .sort([
                            ['sortingOrder', 'asc'],
                            ['createdAt', -1],
                        ])
                        .populate([
                            {
                                path: 'category',
                            },
                            {
                                path: 'subCategory',
                            },
                            {
                                path: 'shop',
                            },
                            {
                                path: 'seller',
                            },
                            {
                                path: 'addons',
                            },
                            {
                                path: 'marketing',
                            },
                        ]);

                    productsGroupBySubCategory.push({
                        subCategory,
                        sortedProducts: products,
                    });
                }

                productsGroupByCategory.push({
                    category: {
                        ...shopCategory._doc,
                        category: {
                            _id: shopCategory.category._id,
                            name: shopCategory.name || shopCategory.category.name,
                            image: shopCategory.image || shopCategory.category.image,
                        }
                    },
                    subCategories: productsGroupBySubCategory,
                });
            }
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                productsGroupByCategory,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopsByCategory = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, name, type } = req.query;

        let whereConfig = {
            name: { $regex: `^${name}$`, $options: 'i' },
            type,
            deletedAt: null,
        };

        const categoryList = await ShopCategory.find(whereConfig)
            .populate([
                {
                    path: 'shop',
                    populate: [
                        {
                            path: 'seller',
                        },
                        {
                            path: 'cuisineType',
                        },
                        {
                            path: 'tagsId',
                        },
                        {
                            path: 'categories',
                        },
                        {
                            path: 'products',
                            populate: [
                                {
                                    path: 'category',
                                },
                                {
                                    path: 'subCategory',
                                },
                                {
                                    path: 'addons',
                                    populate: [
                                        {
                                            path: 'category',
                                        },
                                        {
                                            path: 'subCategory',
                                        },
                                    ],
                                },
                                {
                                    path: 'marketing',
                                },
                            ],
                        },
                        {
                            path: 'marketings',
                        },
                    ],
                },
            ])
            .lean();

        const shops = categoryList
            .map(category => category.shop)
            .filter(shop => shop !== null && shop !== undefined);

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: shops.length,
            pagingRange: 5,
        });

        const list = shops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};
