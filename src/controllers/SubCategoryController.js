const { validationResult } = require('express-validator');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const { pagination } = require('../helpers/pagination');
const CategoryModel = require('../models/CategoryModel');
const SubCategoryModel = require('../models/SubCategoryModel');
const ProductModel = require('../models/ProductModel');
const ShopCategory = require('../models/ShopCategory');
const ObjectId = require('mongoose').Types.ObjectId;
const { generateExcelForShopProductAdd } = require('./../../src/helpers/add_shop_product/index')

exports.getSubCategory = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            status,
        } = req.query;

        var whereConfig = {
            deletedAt: null,
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

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status: status,
            };
        }

        var paginate = await pagination({
            page,
            pageSize,
            model: SubCategoryModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await SubCategoryModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                subCategories: list,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.createSubCategory = async (req, res) => {
    try {
        const { subCategories, shopId } = req.body;

        const subCategoriesSlug = subCategories?.map(
            subCategory => subCategory.slug
        );

        const subCategoriesCategoryId = subCategories?.map(subCategory =>
            subCategory.category.toString()
        );
        const uniqueSubCategoriesCategoryId = [
            ...new Set(subCategoriesCategoryId),
        ];

        const isExist = await SubCategoryModel.findOne({
            slug: {
                $in: subCategoriesSlug,
            },
            deletedAt: null,
        });

        if (isExist)
            return errorResponse(
                res,
                `${isExist.name} sub category already exist`
            );

        const categoryExist = await CategoryModel.find({
            _id: { $in: uniqueSubCategoriesCategoryId },
            deletedAt: null,
        });

        if (categoryExist.length !== uniqueSubCategoriesCategoryId.length) {
            errorResponse(res, 'Category not found & invalid category Id');
        }

        const isExistShopCategory = await ShopCategory.findOne({
            category: subCategories[0].category,
            shop: shopId,
        }).populate('category');

        if (!isExistShopCategory) {
            const newCategory = await CategoryModel.create({
                name: categoryExist[0].name,
                status: 'active',
                image: categoryExist[0].image,
                type: categoryExist[0].type,
                note: categoryExist[0].note,
            });

            let newCategoryObject = {
                category: newCategory._id,
                type: newCategory.type,
                name: newCategory.name,
                note: newCategory.note,
                status: 'active',
                shop: shopId,
            };

            await ShopCategory.create(newCategoryObject);

            for (const subCategory of subCategories) {
                subCategory.category = newCategory._id;
            }
        }

        const newSubCategories = await SubCategoryModel.insertMany(
            subCategories
        );
        
        // await generateExcelForShopProductAdd (shopId);

        successResponse(res, {
            message: 'Successfully added',
            data: {
                newSubCategories,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateSubCategory = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }
        const { id, name, status, slug, image, category } = req.body;
        
        const { shopId } = req.body;

        if (!ObjectId.isValid(id)) return errorResponse(res, 'invalid id');

        const isExist = await SubCategoryModel.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!isExist) return errorResponse(res, 'Sub Category not found');

        const categoryIdFound = await CategoryModel.findOne({
            _id: category,
            deletedAt: null,
        });

        if (!categoryIdFound) {
            return errorResponse(res, 'Category not found');
        }

        await SubCategoryModel.updateOne(
            { _id: id },
            {
                $set: {
                    name,
                    status,
                    slug,
                    image,
                    category,
                },
            }
        );

        const updatedSubCategory = await SubCategoryModel.findById(id).populate(
            'category'
        );
        
        // await generateExcelForShopProductAdd (shopId);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                category: updatedSubCategory,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteSubCategoryById = async (req, res) => {
    try {
        const { id } = req.body;
        
        const { shopId } = req.body;

        if (!ObjectId.isValid(id)) return errorResponse(res, 'invalid id');

        const isExist = await SubCategoryModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'SubCategory not found');

        const thisSubCategoryProducts = await ProductModel.find({
            subCategory: id,
        });

        if (thisSubCategoryProducts.length > 0) {
            return errorResponse(res, 'Subcategory is not empty');
            // let unsubcategorisedSubCategory = await SubCategoryModel.findOne({
            //     name: 'unsubcategorised',
            //     category: isExist.category,
            // });

            // if (!unsubcategorisedSubCategory) {
            //     unsubcategorisedSubCategory = await SubCategoryModel.create({
            //         name: 'unsubcategorised',
            //         status: 'active',
            //         slug: 'unsubcategorised',
            //         // image: '',
            //         category: isExist.category,
            //     });
            // }

            // const thisSubCategoryProductsId = thisSubCategoryProducts.map(
            //     thisSubCategoryProduct =>
            //         thisSubCategoryProduct?._id?.toString()
            // );

            // await ProductModel.updateMany(
            //     { _id: { $in: thisSubCategoryProductsId } },
            //     { subCategory: unsubcategorisedSubCategory._id }
            // );
        }

        await SubCategoryModel.findByIdAndDelete(id);

        // Delete empty category when shop type pharmacy and grocery
        const shopCategory = await ShopCategory.findOne({
            category: isExist.category,
        });

        const subCategories = await SubCategoryModel.find({
            category: isExist.category,
        });

        if (!subCategories.length) {
            await ShopCategory.findByIdAndDelete(shopCategory._id);
            await CategoryModel.findByIdAndDelete(isExist.category);
        }
        
        // await generateExcelForShopProductAdd (shopId);

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleSubCategory = async (req, res) => {
    try {
        const { id } = req.query;

        if (!ObjectId.isValid(id)) return errorResponse(res, 'invalid id');

        const isExist = await SubCategoryModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Category not found');

        const subCategory = await SubCategoryModel.findById(id).populate(
            'category'
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                subCategory,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSubCategoryByCategoryId = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            status,
            categoryId,
        } = req.query;

        if (!ObjectId.isValid(categoryId))
            return errorResponse(res, 'invalid id');

        const category = await CategoryModel.findById(categoryId);

        var whereConfig = {
            deletedAt: null,
            category: categoryId,
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

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status: status,
            };
        }

        var paginate = await pagination({
            page,
            pageSize,
            model: SubCategoryModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await SubCategoryModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                category,
                subCategories: list,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getSubCategoryByCategoryIdForUser = async (req, res) => {
    const {
        page = 1,
        pageSize = 50,
        searchKey,
        sortBy = 'desc',
        categoryId,
    } = req.query;

    if (!ObjectId.isValid(categoryId)) return errorResponse(res, 'invalid id');

    var whereConfig = {
        deletedAt: null,
        category: categoryId,
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

    var paginate = await pagination({
        page,
        pageSize,
        model: SubCategoryModel,
        condition: whereConfig,
        pagingRange: 5,
    });

    const list = await SubCategoryModel.find(whereConfig)
        .sort({ createdAt: sortBy })
        .skip(paginate.offset)
        .limit(paginate.limit);

    successResponse(res, {
        message: 'Successfully fetched',
        data: {
            subCategories: list,
            paginate,
        },
    });
};

// Sort SubCategories
exports.sortSubCategories = async (req, res) => {
    try {
        const { subCategories } = req.body;

        subCategories?.forEach(async subCategory => {
            await SubCategoryModel.updateOne(
                { _id: subCategory.id },
                {
                    $set: {
                        sortingOrder: subCategory.sortingOrder,
                    },
                }
            );
        });

        // const updatedSubCategories = await SubCategoryModel.find().sort([
        //     ['sortingOrder', 'asc'],
        //     ['createdAt', -1],
        // ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                // subCategories: updatedSubCategories,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
