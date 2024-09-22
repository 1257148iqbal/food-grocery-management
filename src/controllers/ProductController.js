const { validationResult } = require('express-validator');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const {
    pagination,
    getPaginationOffset,
    doPagingPreData,
    doPaging,
    paginationMultipleModel,
} = require('../helpers/pagination');
const ProductModel = require('../models/ProductModel');
const ShopModel = require('../models/ShopModel');
const DealModel = require('../models/DealModel');
const OrderModel = require('../models/OrderModel');
const GlobalDropCharge = require('../models/GlobalDropCharge');
const ShopCategory = require('../models/ShopCategory');
const ReviewModel = require('../models/ReviewModel');
const {
    getProductReview
} = require('../helpers/productReview');
const AppSetting = require('../models/AppSetting');
const ObjectId = require('mongoose').Types.ObjectId;
const CategoryModel = require('../models/CategoryModel');
const AttributeModel = require('../models/AttributeModel.js');
const AttributeItemModel = require('../models/AttributeItemModel.js');
const SellerModel = require('../models/SellerModel');
const {
    getDeliveryCharge,
    getShopByDeliveryCharge,
    getDistance,
} = require('../helpers/getDeliveryCharge');
const MarketingModel = require('../models/MarketingModel');
const SubCategoryModel = require('../models/SubCategoryModel');
const RewardSettingModel = require('../models/RewardSettingModel');
const { applyExchangeRate } = require('../helpers/applyExchangeRate');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const {
    checkPlusUserProductMarketing,
    checkPlusUserMarketing,
} = require('../helpers/checkPlusUserMarketing');
const ListContainerModel = require('../models/ListContainerModel');
const FilterContainerModel = require('../models/FilterContainerModel');
const BannerModel = require('../models/BannerModel');
const {
    sendNotificationToShopForUpdateItem,
    sendNotificationToShopForUpdateLyxaProduct,
} = require('./NotificationController');
const GlobalProductModel = require('../models/GlobalProductModel');
const { shopCommonSorting } = require('../helpers/shopCommonSorting');
const { findNearestShopIdsForEachBrand } = require('../services/shop.service');
const {
    getLyxaDataFromXLSX,
    numberOfRows,
} = require('../helpers/add_lyxa_product/getLyxaDataFromXLSX.js');
const fs = require('fs');
const path = require('path');
const ExcelFileModel = require('../models/ExcelFileModel.js');
const mongoose = require('mongoose');
const {
    generateExcelForShopProductAdd,
} = require('./../../src/helpers/add_shop_product/index');
const {
    generateExcelForLyxaProductAdd,
} = require('./../../src/helpers/add_lyxa_product/index');
const {
    getNonEmptyRowCount,
    getShopProductDataFromXLSX,
} = require('../../src/helpers/add_shop_product/getDataFromExcel');
const {
    uploadProgressBar,
    uploadProgressBarLyxa,
} = require('./../../src/config/socket');
const {
    validatePortionPrices,
} = require('./../helpers/validatePortionPrices.js');
const {
    processAttributesToDuplicateCheck,
    softUpdateOrCreateMultipleAttributes
} = require('./AttributeController.js')

const { calculateSecondaryPrice } = require('./../helpers/utils');

exports.getProducts = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            type,
            category,
            productVisibility,
            shop,
            seller,
            status,
            inStock, // true || false
            hideAddons, // true || undefined
            userType, // normal || plus
        } = req.query;

        var whereConfig = {
            deletedAt: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));
            const barcodeNumberSearchQuery = newQuery.map(str => ({
                barcodeNumber: RegExp(str, 'i'),
            }));

            const seoTitleSearchQuery = newQuery.map(str => ({
                seoTitle: RegExp(str, 'i'),
            }));
            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: seoTitleSearchQuery },
                            { $and: barcodeNumberSearchQuery },
                        ],
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
                type,
                ...whereConfig,
            };
        }

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                status,
                ...whereConfig,
            };
        }

        if (productVisibility) {
            whereConfig = {
                productVisibility,
                ...whereConfig,
            };
        }

        if (shop) {
            whereConfig = {
                shop,
                ...whereConfig,
            };
        }

        if (seller) {
            whereConfig = {
                seller,
                ...whereConfig,
            };
        }

        if (category) {
            whereConfig = {
                category: {
                    $in: category,
                },
                ...whereConfig,
            };
        }
        if (inStock) {
            if (inStock.toString() === 'true') {
                whereConfig = {
                    stockQuantity: { $gt: 0 },
                    ...whereConfig,
                };
            }
            if (inStock.toString() === 'false') {
                whereConfig = {
                    stockQuantity: 0,
                    ...whereConfig,
                };
            }
        }

        const list = await ProductModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        let newList = [];
        if (hideAddons) {
            for (const product of list) {
                const addonInProduct = await ProductModel.findOne({
                    addons: { $in: [product._id] },
                });

                if (!addonInProduct) {
                    newList.push(product);
                }
            }
        } else {
            newList = list;
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

        for (const product of newList) {
            if (userType === 'normal') {
                await checkPlusUserProductMarketing(product);
            }

            let isAllocatedIntoBanner = false;
            const findProductBanner = await BannerModel.countDocuments({
                productId: product._id,
            });
            if (findProductBanner > 0) isAllocatedIntoBanner = true;

            product._doc.isAllocatedIntoBanner = isAllocatedIntoBanner;
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                products: newList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getProductsDetails = async (req, res) => {
    try {
        const { id } = req.query;

        const product = await ProductModel.findById(id).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
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
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                product,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addProduct = async (req, res) => {
    try {
        let {
            name,
            price,
            foodType,
            shop,
            unit,
            unitQuantity,
            images,
            category,
            subCategory,
            seoTitle,
            seoDescription,
            description,
            attributes,
            addons,
            isFastDelivery,
            status = 'active',
            dietary,
            // maximumQuantity,
            note,
            isStockEnabled,
            stockQuantity,
            isDrinkIncluded,
            orderQuantityLimit,
            nutritionServingSize,
            nutritionServingUnit,
            nutritionPerUnit,
            nutritionCalories,
            nutrition,
            storedTemperature,
            productType,
            globalProduct,
            barcodeNumber,
            portionPrices,
            pricePerUnit,
            priceType,
        } = req.body;

        // const shopExchangeRate = await ShopModel.findById(shop).select("shopExchangeRate");
        // if(portionPrices){

        // }

        if (!['active', 'inactive'].includes(status)) {
            return errorResponse(res, 'Invalid status');
        }

        // Check if product price is not included
        if (
            (priceType == 'price' && !price) ||
            (priceType == 'pricePerUnit' && !pricePerUnit?.price) ||
            (priceType == 'portionPrices' &&
                !validatePortionPrices(portionPrices))
        ) {
            console.log(priceType, price, pricePerUnit, portionPrices);
            return errorResponse(res, 'Issue with set prices.');
        }

        const shopExits = await ShopModel.findOne({ _id: shop });
        if (!shopExits) {
            return errorResponse(res, 'Shop not found');
        }

        if (
            globalProduct &&
            ['grocery', 'pharmacy'].includes(shopExits.shopType)
        ) {
            const productExits = await GlobalProductModel.findOne({
                _id: globalProduct,
                type: shopExits.shopType,
            });

            if (!productExits)
                return errorResponse(res, 'Global product not found.');

            name = productExits.name;
            images = productExits.images;
            nutritionServingSize = productExits.nutritionServingSize;
            nutritionServingUnit = productExits.nutritionServingUnit;
            nutritionPerUnit = productExits.nutritionPerUnit;
            nutritionCalories = productExits.nutritionCalories;
            nutrition = productExits.nutrition;
            dietary = productExits.dietary;
            storedTemperature = productExits.storedTemperature;
            productType = productExits.productType;
            barcodeNumber = productExits.barcodeNumber;
        }

        if (
            ['grocery', 'pharmacy'].includes(shopExits.shopType) &&
            !globalProduct
        ) {
            const productExits = await GlobalProductModel.findOne({
                name: { $regex: `^${name}$`, $options: 'i' },
                type: shopExits.shopType,
            });

            if (productExits)
                return errorResponse(
                    res,
                    'This product name is already exists. Please select from our list.'
                );

            if (barcodeNumber && barcodeNumber !== '0000000') {
                const findProduct = await GlobalProductModel.findOne({
                    barcodeNumber,
                });

                if (findProduct)
                    return errorResponse(
                        res,
                        'This barcode number is already exists in another product'
                    );
            }

            const createGlobalProduct = await GlobalProductModel.create({
                name,
                type: shopExits.shopType,
                images,
                nutritionServingSize,
                nutritionServingUnit,
                nutritionPerUnit,
                nutritionCalories,
                nutrition,
                dietary,
                storedTemperature,
                productType,
                barcodeNumber,
            });

            globalProduct = createGlobalProduct._id;
        }

        const categoryExist = await CategoryModel.findOne({ _id: category });
        if (!categoryExist) {
            return errorResponse(res, 'category not found');
        }


        let attributeIds = [];
        if (attributes && attributes?.length > 0) {
            attributeIds = await softUpdateOrCreateMultipleAttributes(attributes, shop)
        }

        let freeDelivery = false;
        let isFeatured = false;

        const findShops = await ShopModel.findOne({ _id: shop }).populate(
            'marketings'
        );

        if (findShops.marketings?.length > 0) {
            for (let marketing of findShops.marketings) {
                if (marketing.type === 'free_delivery') {
                    freeDelivery = true;
                }
                if (marketing.type === 'featured') {
                    isFeatured = true;
                }
            }
        }

        const addProduct = await ProductModel.create({
            seller: shopExits.seller,
            name,
            price,
            type: shopExits.shopType,
            delivery: shopExits.delivery,
            shop,
            images,
            category,
            subCategory: subCategory ? subCategory : null,
            productVisibility: true,
            status: status,
            seoTitle,
            seoDescription,
            unit,
            unitQuantity,
            attributes: attributeIds,
            addons,
            foodType: foodType,
            freeDelivery,
            isFeatured,
            isFastDelivery,
            description,
            dietary,
            // maximumQuantity,
            note,
            isStockEnabled,
            stockQuantity,
            isDrinkIncluded,
            orderQuantityLimit,
            nutritionServingSize,
            nutritionServingUnit,
            nutritionPerUnit,
            nutritionCalories,
            nutrition,
            storedTemperature,
            productType,
            globalProduct,
            barcodeNumber,
            portionPrices,
            pricePerUnit,
            priceType,
        });

        const shopCategory = await ShopCategory.findOne({
            category: category,
            shop: shopExits._id,
        });

        if (!shopCategory) {
            // create shop category
            await ShopCategory.create({
                shop: shop,
                category: category,
                type: shopExits.shopType,
                seller: shopExits.seller,
            });

            // update shop model shopCategory id
            // await ShopModel.updateOne(
            //     { _id: shop },
            //     {
            //         $push: {
            //             categories: category,
            //         },
            //     }
            // );
        }

        // 'category subCategory shop seller'
        const product_added = await ProductModel.findById(
            addProduct._id
        ).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
                select: '-categories',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
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
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        await ShopModel.updateOne(
            { _id: shop },
            {
                $push: {
                    products: addProduct._id,
                },
            }
        );

        successResponse(res, {
            message: 'Successfully added',
            data: {
                product: product_added,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateProducts = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }
        const {
            id,
            name,
            price,
            status,
            productVisibility,
            images,
            unit,
            unitQuantity,
            category,
            subCategory,
            seoTitle,
            seoDescription,
            attributes,
            addons,
            freeDelivery,
            isFastDelivery,
            isFeatured,
            foodType,
            dietary,
            shop,
            // maximumQuantity,
            note,
            isStockEnabled,
            stockQuantity,
            isDrinkIncluded,
            orderQuantityLimit,
            updatedBy, // shop || admin
            portionPrices,
            pricePerUnit,
            priceType,
            nutritionServingSize,
            nutritionServingUnit,
            nutritionPerUnit,
            nutritionCalories,
            nutrition
        } = req.body;

        const isExist = await ProductModel.findOne({ _id: id }).populate(
            'shop marketing'
        );

        if (!isExist) return errorResponse(res, 'Product not found');

        if (
            (status === 'inactive' && isExist.status === 'active') ||
            (stockQuantity == 0 && isExist.stockQuantity != 0)
        ) {
            const findProductBanner = await BannerModel.countDocuments({
                productId: id,
            });
            if (findProductBanner > 0)
                return errorResponse(
                    res,
                    'A banner has been allocated to this product.'
                );
        }

        let data = {
            name,
            price,
            images,
            category,
            subCategory,
            productVisibility,
            status,
            seoTitle,
            seoDescription,
            unit,
            unitQuantity,
            attributes,
            addons,
            freeDelivery,
            isFastDelivery,
            isFeatured,
            foodType,
            dietary,
            // maximumQuantity,
            note,
            isStockEnabled,
            stockQuantity,
            isDrinkIncluded,
            orderQuantityLimit,
            portionPrices,
            pricePerUnit,
            priceType,
            nutritionServingSize,
            nutritionServingUnit,
            nutritionPerUnit,
            nutritionCalories,
            nutrition
        };

        if (attributes && Array.isArray(attributes)) {
            const attributeIds = await softUpdateOrCreateMultipleAttributes(attributes, isExist.shop._id)
            data.attributes = attributeIds;
        }

        await ProductModel.updateOne(
            { _id: id },
            {
                $set: {
                    ...data,
                },
            }
        );

        if (isExist.category != category && isExist.type === 'food') {
            const productHaveOldCategory = await ProductModel.findOne({
                category: isExist.category,
                shop: isExist.shop._id,
            });

            if (!productHaveOldCategory) {
                await ShopCategory.deleteOne({
                    category: isExist.category,
                    shop: isExist.shop._id,
                });
                await CategoryModel.deleteOne({
                    _id: isExist.category,
                });
            }
        }

        if (category) {
            const shopCategory = await ShopCategory.findOne({
                category: category,
                shop: isExist.shop._id,
            });
            if (!shopCategory) {
                // create shop category
                await ShopCategory.create({
                    shop: isExist.shop._id,
                    category: category,
                    type: isExist.shopType,
                    seller: isExist?.seller,
                });
            }
        }

        if (price && isExist?.price?.toFixed(2) !== Number(price).toFixed(2)) {
            if (isExist?.discountPercentage > 0) {
                const appSetting = await AppSetting.findOne({});

                let totalDiscount = 0;
                for (const marketing of isExist.marketing) {
                    const findMarketing = await MarketingModel.findById(
                        marketing._id
                    );
                    const findProduct = findMarketing.products.filter(
                        item =>
                            item.product.toString() === isExist._id.toString()
                    );

                    const maxDiscount =
                        marketing.creatorType === 'shop'
                            ? isExist?.shop?.maxDiscount
                            : appSetting.maxDiscount;

                    let discount = parseFloat(
                        (
                            (price * (findProduct?.discountPercentage ?? 0)) /
                            100
                        ).toFixed(2)
                    );
                    if (maxDiscount > 0) {
                        discount =
                            maxDiscount < discount ? maxDiscount : discount;
                    }

                    if (findMarketing.isActive) {
                        totalDiscount += discount;
                    }

                    const discountPrice = parseFloat(
                        (price - discount).toFixed(2)
                    );

                    findProduct.discount = discount;
                    findProduct.discountPrice = discountPrice;

                    await findMarketing.save();
                }

                const finalDiscountPrice = parseFloat(
                    (price - totalDiscount).toFixed(2)
                );

                await ProductModel.updateOne(
                    { _id: id },
                    {
                        $set: {
                            discount: totalDiscount,
                            discountPrice: finalDiscountPrice,
                        },
                    }
                );
            }

            if (isExist?.rewardBundle > 0) {
                let rewardSetting = await RewardSettingModel.findOne({});
                const rewardAmount = rewardSetting?.redeemReward?.amount || 1;

                const rewardDiscountAmount = parseFloat(
                    ((price / 100) * isExist.rewardBundle).toFixed(2)
                );

                const reward = {
                    amount: parseFloat(
                        (price - rewardDiscountAmount).toFixed(2)
                    ),
                    points: Math.ceil(rewardDiscountAmount / rewardAmount),
                };

                await ProductModel.updateOne(
                    { _id: id },
                    {
                        $set: {
                            reward: reward,
                        },
                    }
                );
            }
        }

        const product = await ProductModel.findById(id).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
                select: '-categories',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
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
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        if (
            updatedBy === 'admin' &&
            price &&
            Number(price)?.toFixed(2) != isExist?.price?.toFixed(2)
        ) {
            sendNotificationToShopForUpdateItem(product, isExist?.price);
        }

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                product,
            },
        });
    } catch (error) {
        console.error(error);
        errorResponse(res, error.message);
    }
};

exports.productStatusChange = async (req, res) => {
    try {
        const { id, status } = req.body;

        const isExist = await ProductModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Product not found');

        if (['active', 'inactive'].includes(status))
            return errorResponse(res, 'Invalid status');

        if (status === 'inactive' && isExist.status === 'active') {
            const findProductBanner = await BannerModel.countDocuments({
                productId: id,
            });
            if (findProductBanner > 0)
                return errorResponse(
                    res,
                    'A banner has been allocated to this product.'
                );
        }

        await ProductModel.updateOne(
            { _id: id },
            {
                $set: {
                    status,
                },
            }
        );

        const product = await ProductModel.findById(id).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
                select: '-categories',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
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
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        successResponse(res, {
            message: `Successfully ${status}`,
            data: {
                product,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateProductsDeals = async (req, res) => {
    try {
        const { productId, dealId } = req.body;

        const isExist = await ProductModel.findOne({ _id: productId }).populate(
            [
                {
                    path: 'shop',
                    populate: 'address marketings',
                },
                {
                    path: 'marketing',
                },
            ]
        );
        const isDealExist = await DealModel.findOne({ _id: dealId });

        if (!isExist) return errorResponse(res, 'Product not found');

        const shop = isExist.shop;
        const productDeals = isExist.deals;
        const deals = shop.deals;

        const isExistInItems = await ShopModel.findOne({
            _id: shop._id,
            itemsDeals: { $in: dealId },
        });
        // console.log(isExistInItems, shop._id);

        if (deals.includes(dealId)) {
            return errorResponse(res, 'Deal already added in shop');
        }

        const checkDeals = productDeals.filter(
            deal =>
                deal?.option == 'percentage' || deal?.option == 'double_menu'
        );

        if (productDeals.includes(dealId)) {
            return errorResponse(res, 'Deal already added in product');
        } else if (checkDeals.length > 0) {
            return errorResponse(res, 'Already has deal in this product');
        } else if (checkDeals.length < 1) {
            // add update deal in product
            await ProductModel.updateOne(
                { _id: productId },
                {
                    $push: {
                        deals: dealId,
                    },
                }
            );
            if (!isExistInItems) {
                await ShopModel.updateOne(
                    { _id: shop._id },
                    {
                        $push: {
                            itemsDeals: dealId,
                        },
                    }
                );
            }
        }

        const product = await ProductModel.findById(productId).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address marketings',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
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
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                product,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteProductById = async (req, res) => {
    try {
        const { id } = req.body;
       
     

        const isExist = await ProductModel.findOne({ _id: id });

        if (!isExist)
            return errorResponse(res, { message: 'Product not found' });

        await ProductModel.updateOne(
            { _id: id },
            {
                $set: {
                    deletedAt: new Date(),
                },
            }
        );
     await ProductModel.updateMany(
            { addons: id }, // Find products where productIdToRemove is in the addOns array
            {
                $pull: { addons: id } // Remove productIdToRemove from the addOns array
            }
        );
       
        await ShopModel.updateOne(
            { _id: isExist.shop },
            {
                $pull: {
                    products: id,
                },
            }
        );

        const product = await ProductModel.findById(id).populate(
            'category subCategory shop seller'
        );

        successResponse(res, {
            message: 'Successfully Deleted',
            data: {
                product,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getProductsForUserApp = async (req, res) => {
    try {
        const plusUser = req.plusUser;
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            type,
            shop,
            seller,
            pagingRange = 5,
            category,
            subCategory,
            latitude,
            longitude,
        } = req.query;

        //*** For finding products within location range ***/
        const appSetting = await AppSetting.findOne({});
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let shopConfig = {
            _id: {
                $in: await findNearestShopIdsForEachBrand(
                    longitude,
                    latitude,
                    maxDistanceInMeters
                ),
            }, //TODO: need to test
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            deletedAt: null,
            // liveStatus: 'online',
            parentShop: null,
        };

        const shopList = await ShopModel.find(shopConfig);

        const shopListId = shopList.map(shop => shop._id.toString());

        let whereConfig = {
            deletedAt: null,
            status: 'active',
            productVisibility: true,
            stockQuantity: { $gt: 0 },
            shop: { $in: shopListId },
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
                type,
                ...whereConfig,
            };
        }

        if (category) {
            whereConfig = {
                ...whereConfig,
                category,
            };
        }

        if (subCategory) {
            whereConfig = {
                ...whereConfig,
                subCategory,
            };
        }

        if (shop) {
            whereConfig = {
                shop,
                ...whereConfig,
            };
        }

        if (seller) {
            whereConfig = {
                seller,
                ...whereConfig,
            };
        }

        const productList = await ProductModel.find(whereConfig)
            .sort({ isFeatured: -1, createdAt: sortBy })
            .populate([
                {
                    path: 'shop',
                    populate: 'cuisineType marketings',
                },
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        let newProducts = [];
        for (const element of productList) {
            if (element?.category?.status === 'active') {
                if (element?.type === 'food') {
                    let product = element;
                    const review = await getProductReview(product._id);

                    const shopExchangeRate =
                        product?.shop?.shopExchangeRate || 0;
                    if (shopExchangeRate !== 0) {
                        product = await applyExchangeRate(
                            product,
                            shopExchangeRate
                        );
                    }

                    const isShopOpen = checkShopOpeningHours(product.shop);
                    product.shop._doc.isShopOpen = isShopOpen;

                    if (!plusUser) {
                        await checkPlusUserProductMarketing(product);
                    }

                    newProducts.push({
                        ...product._doc,
                        review: review ? review : null,
                    });
                } else {
                    if (element?.subCategory?.status === 'active') {
                        let product = element;
                        const review = await getProductReview(product._id);

                        const shopExchangeRate =
                            product?.shop?.shopExchangeRate || 0;
                        if (shopExchangeRate !== 0) {
                            product = await applyExchangeRate(
                                product,
                                shopExchangeRate
                            );
                        }

                        const isShopOpen = checkShopOpeningHours(product.shop);
                        product.shop._doc.isShopOpen = isShopOpen;

                        if (!plusUser) {
                            await checkPlusUserProductMarketing(product);
                        }

                        newProducts.push({
                            ...product?._doc,
                            review: review ? review : null,
                        });
                    }
                }
            }
        }

        const productsGroupByShop = [];

        for (const product of newProducts) {
            const shop = product.shop;

            const shopEntry = productsGroupByShop.find(
                entry => entry.shop._id.toString() === shop._id.toString()
            );

            if (!shopEntry) {
                productsGroupByShop.push({
                    shop: shop,
                    shopProducts: [product],
                });
            } else {
                shopEntry.shopProducts.push(product);
            }
        }

        // Open shop need to show top and then closed shop
        const productsGroupByOpenShop = productsGroupByShop.reduce(
            (accumulator, currentGroup) => {
                if (
                    currentGroup.shop.liveStatus === 'online' &&
                    currentGroup.shop.isShopOpen
                ) {
                    accumulator[0].push(currentGroup);
                } else {
                    accumulator[1].push(currentGroup);
                }
                return accumulator;
            },
            [[], []]
        );

        const finalProductsGroupByShop = [
            ...productsGroupByOpenShop[0],
            ...productsGroupByOpenShop[1],
        ];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalProductsGroupByShop.length,
            pagingRange: pagingRange,
        });

        const list = finalProductsGroupByShop.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                products: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.recommendProduct = async (req, res) => {
    try {
        const { type } = req.query;

        // get recommendProduct

        const recommendProduct = await ProductModel.find({
            type,
            status: 'active',
            productVisibility: true,
            deletedAt: null,
        })
            .sort({ createdAt: 'DESC' })
            .limit(20)
            .populate([
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                recommendProduct,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.freeDeliveryProduct = async (req, res) => {
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
            freeDelivery: true,
            status: 'active',
            productVisibility: true,
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
            [
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
                'other',
            ].includes(type)
        ) {
            whereConfig = {
                ...whereConfig,
                type,
            };
        }

        var paginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await ProductModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        successResponse(res, {
            message: 'successfully get items',
            data: {
                freeItems: list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getFeatureProduct = async (req, res) => {
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
            isFeatured: true,
            status: 'active',
            productVisibility: true,
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
            [
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
                'other',
            ].includes(type)
        ) {
            whereConfig = {
                ...whereConfig,
                type: type,
            };
        }

        var paginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await ProductModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                featureProduct: list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// discount product
exports.getDiscountProduct = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            status,
            type,
        } = req.query;

        var whereConfig = {
            deletedAt: null,
            discount: { $gt: 0 },
            status: 'active',
            productVisibility: true,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));
            whereConfig = {
                ...whereConfig,
                discount: { $exists: true },
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }],
                    },
                ],
            };
        }

        if (
            type &&
            [
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
                'other',
            ].includes(type)
        ) {
            whereConfig = {
                ...whereConfig,
                type,
            };
        }

        var paginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await ProductModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        successResponse(res, {
            message: 'successfully get discount products',
            data: {
                discountProduct: list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.popularFoodForUser = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            status,
            type,
        } = req.query;

        var whereConfig = {
            deletedAt: null,
            type: 'food',
            status: 'active',
            productVisibility: true,
        };

        // if (searchKey) {
        //     const newQuery = searchKey.split(/[ ,]+/);
        //     const nameSearchQuery = newQuery.map((str) => ({
        //         name: RegExp(str, 'i'),
        //     }));
        //     whereConfig = {
        //         ...whereConfig,
        //         $and: [
        //             {
        //                 $or: [
        //                     { $and: nameSearchQuery },
        //                 ],
        //             },
        //         ],
        //     };
        // }

        // var paginate = await pagination({
        //     page,
        //     pageSize,
        //     model: ProductModel,
        //     condition: whereConfig,
        //     pagingRange: 5,
        // });

        const list = await ProductModel.aggregate([
            { $match: whereConfig },
            {
                $sample: {
                    size: 5,
                },
            },
            {
                $group: {
                    _id: '$_id',
                    result: { $push: '$$ROOT' },
                },
            },
            {
                $replaceRoot: {
                    newRoot: { $first: '$result' },
                },
            },
        ]);
        // .sort({ createdAt: sortBy })
        // .skip(paginate.offset)
        // .limit(paginate.limit);

        successResponse(res, {
            message: 'successfully get foods',
            data: {
                popular: list,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getProductsByfilterForUser = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            highToLow,
            lowToHigh,
            highPrice,
            isFreeDelivery,
            isFastDelivery,
            type,
            deals,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            status: 'active',
            productVisibility: true,
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

        if (deals) {
            whereConfig = {
                ...whereConfig,
                deals,
            };
        }

        // Price range filter ---

        if (highPrice) {
            whereConfig = {
                ...whereConfig,
                price: { $lt: highPrice },
            };
        }

        // Filter for showing data ---

        let sortBy = 1;

        if (highToLow === true) {
            sortBy = -1;
        }

        // if(lowToHigh){
        //     sortBy= 1
        // }

        // filter for free delivery product

        if (isFreeDelivery) {
            whereConfig = {
                ...whereConfig,
                freeDelivery: true,
            };
        }

        // filter for fast delivery product

        if (isFastDelivery) {
            whereConfig = {
                ...whereConfig,
                isFastDelivery: true,
            };
        }

        // filter for feature  product

        if (
            type &&
            [
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
                'other',
            ].includes(type)
        ) {
            whereConfig = {
                ...whereConfig,
                type: type,
            };
        }

        var paginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await ProductModel.find(whereConfig)
            .sort({ price: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        successResponse(res, {
            message: 'successfully find',
            data: {
                products: list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getProductsFromSpecificRestuarent = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'desc',
            shopId,
            searchKey,
        } = req.query;

        let whereConfig = {
            status: 'active',
            productVisibility: true,
            stockQuantity: { $gt: 0 },
            deletedAt: null,
            shop: shopId,
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
            model: ProductModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await ProductModel.find(whereConfig)
            .populate('marketing shop seller addons category subCategory')
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        for (let product of list) {
            const isShopOpen = checkShopOpeningHours(product.shop);
            product.shop._doc.isShopOpen = isShopOpen;
        }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                products: list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.addProductReview = async (req, res) => {
    try {
        const { productId, rating, review } = req.body;

        const userId = req.userId;

        // check validation
        if (!productId) {
            return errorResponse(res, 'ProductId required');
        }

        if (!rating) {
            return errorResponse(res, 'Rating required');
        }

        // rating validation check
        if (rating > 4 || rating < 1) {
            return errorResponse(res, 'Rating must be between 1 to 4');
        }

        const product = await ProductModel.findById(productId);

        if (!product) {
            return errorResponse(res, 'Product not found');
        }

        // check user already give a review
        const reviewExist = await ReviewModel.findOne({
            product: productId,
            user: userId,
        });

        // console.log('reviewExist', reviewExist);

        if (reviewExist) {
            return errorResponse(res, 'You already give a review');
        }

        const reviewData = new ReviewModel({
            user: userId,
            product: productId,
            rating, // 1,2,3,4
            review,
        });

        const addReview = await reviewData.save();

        //get review
        const reviews = await ReviewModel.find({
            product: productId,
        });

        let total = 0;
        let lengthOfReviews = reviews.length;
        for (let i = 0; i < lengthOfReviews; i++) {
            total += reviews[i].rating;
        }
        // console.log(total, 'total', lengthOfReviews);
        let getDevideRate = total / lengthOfReviews;
        let rate = Math.round(getDevideRate);

        let updateData = {
            rate,
        };

        if (rate == 1) {
            updateData = {
                ...updateData,
                review: 'Bad',
            };
        }
        if (rate == 2) {
            updateData = {
                ...updateData,
                review: 'Good',
            };
        }
        if (rate == 3) {
            updateData = {
                ...updateData,
                review: 'Very Good',
            };
        }
        if (rate == 4) {
            // console.log('4');
            updateData = {
                ...updateData,
                review: 'Excellent',
            };
        }
        // console.log(updateData);

        await ProductModel.updateOne(
            { _id: productId },
            {
                $set: updateData,
            }
        );

        successResponse(res, {
            message: 'Successfully added review',
            data: {
                review: addReview,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllProductReviewsForUserApp = async (req, res) => {
    try {
        const {
            productId,
            page = 1,
            pageSize = 50,
            sortBy = 'desc',
        } = req.query;

        if (!productId) {
            return errorResponse(res, 'ProductId required');
        }

        const product = await ProductModel.findById(productId);

        if (!product) {
            return errorResponse(res, 'Product not found');
        }

        var whereConfig = {
            product: productId,
        };

        var paginate = await pagination({
            page,
            pageSize,
            model: ReviewModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const reviews = await ReviewModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: 'name email phone_number profile_photo gender',
                },
            ]);

        // const data = list.map(a=> a.shop)

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                reviews: reviews,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getProductDetailsForUserApp = async (req, res) => {
    try {
        const plusUser = req.plusUser;
        const { id } = req.query;

        if (!id) {
            return errorResponse(res, 'ProductId required');
        }

        let product = await ProductModel.findById(id).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
            },
            {
                path: 'addons',
                match: { status: 'active' },
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'marketing',
                    },
                ],
            },
            {
                path: 'marketing',
            },
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);
        let portionPrice = []
        if (product.portionPrices) {

            const shopExchangeRate = await ShopModel.findById(product.shop).select("shopExchangeRate");
            portionPrice = product.portionPrices.map(data => {
                return {
                    ...data, secondaryPrice: calculateSecondaryPrice (data.price * shopExchangeRate.shopExchangeRate)
                }
            })

        }
        product.portionPrices = portionPrice;

        if (!product) {
            return errorResponse(res, 'Product not found');
        }

        const review = await getProductReview(product._id);

        const shopExchangeRate = product?.shop?.shopExchangeRate || 0;
        if (shopExchangeRate !== 0) {
            product = await applyExchangeRate(product, shopExchangeRate);
        }

        const isShopOpen = checkShopOpeningHours(product?.shop);
        product.shop._doc.isShopOpen = isShopOpen;

        if (!plusUser) {
            await checkPlusUserProductMarketing(product);
        }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                product: {
                    ...product._doc,
                    review: review,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserHomeApiForFood = async (req, res) => {
    try {
        const {
            latitude,
            longitude,
            type,
            page = 1,
            pageSize = 50,
        } = req.query;

        let discountConfig = {
            type: type,
            deletedAt: null,
            discount: { $gt: 0 },
        };
        let recommendConfig = {
            type: type,
            status: 'active',
            productVisibility: true,
            deletedAt: null,
        };
        let featuredConfig = {
            type: type,
            status: 'active',
            productVisibility: true,
            deletedAt: null,
            isFeatured: true,
        };
        let freeDeliveryConfig = {
            type: type,
            status: 'active',
            productVisibility: true,
            deletedAt: null,
            freeDelivery: true,
        };

        // get recommendProducts
        const recommendProduct = await ProductModel.find(
            recommendConfig
        ).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
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
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        let newRecommendProduct = [];
        for (let i = 0; i < recommendProduct.length; i++) {
            const product = recommendProduct[i];
            const review = await getProductReview(product._id);
            // const reward = await getProductReward(product._id);

            newRecommendProduct.push({
                ...product._doc,
                review: review ? review : null,
                // reward: reward ? reward : null,
            });
        }
        var recommendPaginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: recommendConfig,
            pagingRange: 5,
        });

        // discount product
        const discountProducts = await ProductModel.find(discountConfig)
            .sort({ discount: 'DESC' })
            .populate([
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        let newDiscountProducts = [];
        for (let i = 0; i < discountProducts.length; i++) {
            const product = discountProducts[i];
            const review = await getProductReview(product._id);
            // const reward = await getProductReward(product._id);

            newDiscountProducts.push({
                ...product._doc,
                review: review ? review : null,
                // reward: reward ? reward : null,
            });
        }
        var discountPaginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: discountConfig,
            pagingRange: 5,
        });

        const featuredFoods = await ProductModel.find(featuredConfig).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
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
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        let newFeaturedFoods = [];
        for (let i = 0; i < featuredFoods.length; i++) {
            const product = featuredFoods[i];
            const review = await getProductReview(product._id);
            // const reward = await getProductReward(product._id);

            newFeaturedFoods.push({
                ...product._doc,
                review: review ? review : null,
                // reward: reward ? reward : null,
            });
        }
        var featuredPaginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: featuredConfig,
            pagingRange: 5,
        });

        // free delivery product
        const freeDeliveryProducts = await ProductModel.find(freeDeliveryConfig)
            .sort({ createdAt: 'DESC' })
            .populate([
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);
        let newFreeDeliveryProducts = [];
        for (let i = 0; i < freeDeliveryProducts.length; i++) {
            const product = freeDeliveryProducts[i];
            const review = await getProductReview(product._id);
            // const reward = await getProductReward(product._id);

            newFreeDeliveryProducts.push({
                ...product._doc,
                review: review ? review : null,
                // reward: reward ? reward : null,
            });
        }
        var freeDeliveryPaginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: freeDeliveryConfig,
            pagingRange: 5,
        });

        const pastOrdersFoods = [];

        // get shops

        let shops = [];

        if (latitude) {
            const appSetting = await AppSetting.findOne();
            const km = appSetting ? appSetting.nearByShopKm : 0;
            const maxDistanceInMeters = 1000 * km;

            shops = await ShopModel.find({
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [longitude, latitude],
                        },
                        $maxDistance: maxDistanceInMeters,
                    },
                },
                shopStatus: 'active',
                liveStatus: 'online',
                shopType: type,
            })
                .sort({ createdAt: 'DESC' })
                .populate([
                    {
                        path: 'seller',
                        select: '-password',
                    },
                ]);
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                discount: {
                    discountProducts: newDiscountProducts,
                    discountPaginate,
                },
                recommend: {
                    recommendProduct: newRecommendProduct,
                    recommendPaginate,
                },
                featured: {
                    featuredFoods: newFeaturedFoods,
                    featuredPaginate,
                },
                freeDelivery: {
                    freeDeliveryProducts: newFreeDeliveryProducts,
                    freeDeliveryPaginate,
                },
                pastOrdersFoods,
                restaurants: shops,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserDiscountProduct = async (req, res) => {
    try {
        const {
            type,
            page = 1,
            pageSize = 50,
            longitude,
            latitude,
            listContainers,
            deals,
            mixProductPrice,
            tags,
            cuisineIds,
            dietaries,
            priceSort,
            ratingSort,
            deliveryTimeSort,
            maxDeliveryFee,
        } = req.query;
        const plusUser = req.plusUser;

        const appSetting = await AppSetting.findOne();
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let sort = shopCommonSorting;
        if (['asc', 'desc'].includes(priceSort)) {
            sort = {
                expensive: priceSort,
            };
        }

        if (ratingSort == 'yes') {
            sort = {
                rating: 'desc',
            };
        }

        let config = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            shopStatus: 'active',
            // liveStatus: 'online',
            marketings: {
                $elemMatch: {
                    $exists: true,
                },
            },
        };

        if (
            ![
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ].includes(type) &&
            (listContainers?.length >= 3 || deals?.length >= 3)
        ) {
            let shopTypeList = [];

            const processDeals = async (dealType, model) => {
                if (dealType?.length >= 3) {
                    const listOfDeals = JSON.parse(dealType);
                    const dealsShopTypeList = await model
                        .find({ _id: { $in: listOfDeals } })
                        .distinct('shopType');
                    shopTypeList.push(...dealsShopTypeList);
                }
            };

            await Promise.all([
                processDeals(listContainers, ListContainerModel),
                processDeals(deals, FilterContainerModel),
            ]);

            config = {
                ...config,
                shopType: { $in: shopTypeList },
            };
        }

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            config = {
                ...config,
                shopType: type,
            };
        }

        if (mixProductPrice?.length >= 3) {
            const listOfExpensive = JSON.parse(mixProductPrice);

            config.expensive = {
                $in: listOfExpensive,
            };
        }

        if (tags?.length >= 3) {
            const listOfTags = JSON.parse(tags);

            config.tags = {
                $in: listOfTags,
            };
        }

        if (cuisineIds?.length >= 3) {
            const cuisineListIds = JSON.parse(cuisineIds);

            config.cuisineType = {
                $in: cuisineListIds,
            };
        }

        if (dietaries?.length >= 3) {
            const dietaryList = JSON.parse(dietaries);

            config.dietary = {
                $in: dietaryList,
            };
        }

        const shops = await ShopModel.find(config)
            .sort(sort)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        const discountShops = [];
        for (const shop of shops) {
            const findDiscount = shop.marketings.find(
                marketing =>
                    ['percentage', 'double_menu', 'reward'].includes(
                        marketing.type
                    ) && marketing.isActive
            );

            if (findDiscount) {
                discountShops.push(shop);
            }
        }

        let newShops = [];
        if (maxDeliveryFee == 0) {
            for (const singleShop of discountShops) {
                let result = false;
                if (singleShop.freeDelivery) {
                    result = singleShop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    );
                }

                if (result) {
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }
                    newShops.push({
                        ...singleShop._doc,
                        deliveryFee: 0,
                    });
                }
            }
        } else if (maxDeliveryFee > 0) {
            for (const singleShop of discountShops) {
                const result = await getShopByDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    maxDeliveryFee
                );

                if (result === true) {
                    let deliveryFee = await getDeliveryCharge(
                        singleShop,
                        latitude,
                        longitude,
                        plusUser
                    );

                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }

                    newShops.push({
                        ...singleShop._doc,
                        deliveryFee: deliveryFee,
                    });
                }
            }
        } else {
            for (const singleShop of discountShops) {
                let deliveryFee = await getDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    plusUser
                );

                if (!plusUser) {
                    await checkPlusUserMarketing(singleShop);
                }

                newShops.push({
                    ...singleShop._doc,
                    deliveryFee: deliveryFee,
                });
            }
        }

        if (deals?.length >= 3) {
            const listOfDeals = JSON.parse(deals);

            const dealsList = await FilterContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let isDoubleDeal = false;
            let isFreeDelivery = false;
            let percentageDeals = [];

            for (const deal of dealsList) {
                isDoubleDeal = deal?.deals?.includes('double_menu');
                isFreeDelivery = deal?.deals?.includes('free_delivery');
                percentageDeals = deal?.deals?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );
            }

            let doubleDealShops = [];
            let freeDeliveryShops = [];
            let percentageDealShops = [];

            if (isDoubleDeal) {
                doubleDealShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );
            }

            if (isFreeDelivery) {
                freeDeliveryShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );
            }

            if (percentageDeals.length > 0) {
                percentageDealShops = newShops.filter(shop =>
                    shop.marketings.some(marketing => {
                        if (
                            marketing.type === 'percentage' &&
                            marketing.isActive
                        ) {
                            const marketingDiscounts =
                                marketing.discountPercentages.map(String);
                            return percentageDeals.some(discount =>
                                marketingDiscounts.includes(discount)
                            );
                        }
                    })
                );
            }

            const newShopList = [
                ...doubleDealShops,
                ...freeDeliveryShops,
                ...percentageDealShops,
            ];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (listContainers?.length >= 3) {
            const listOfDeals = JSON.parse(listContainers);

            const dealsList = await ListContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let dealsArr = [];
            let tagsArr = [];
            let shopsArr = [];

            for (const deal of dealsList) {
                if (deal.type.includes('deal')) {
                    dealsArr = [...dealsArr, ...deal.deals];
                }
                if (deal.type.includes('tag')) {
                    tagsArr = [...tagsArr, ...deal.tags];
                }
                if (deal.type.includes('shop')) {
                    shopsArr = [...shopsArr, ...deal.shops];
                }
            }

            let dealsShop = [];
            let tagsShop = [];
            let shopsShop = [];

            if (shopsArr.length > 0) {
                shopsArr = [...new Set(shopsArr)];

                const shopsArrString = shopsArr?.map(id => id.toString());

                shopsShop = newShops.filter(shop =>
                    shopsArrString.includes(shop?._id?.toString())
                );
            }

            if (dealsArr.length > 0) {
                dealsArr = [...new Set(dealsArr)];

                let isDoubleDeal = dealsArr?.includes('double_menu');
                let isFreeDelivery = dealsArr?.includes('free_delivery');
                let percentageDeals = dealsArr?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );

                if (isDoubleDeal) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'double_menu' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (isFreeDelivery) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (percentageDeals.length > 0) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(marketing => {
                            if (
                                marketing.type === 'percentage' &&
                                marketing.isActive
                            ) {
                                const marketingDiscounts =
                                    marketing.discountPercentages.map(String);

                                return percentageDeals.some(discount =>
                                    marketingDiscounts.includes(discount)
                                );
                            }
                        })
                    );

                    dealsShop = [...dealsShop, ...list];
                }
            }

            if (tagsArr.length > 0) {
                tagsArr = [...new Set(tagsArr)];

                const tagsArrString = tagsArr?.map(id => id.toString());

                const tagsList = newShops.filter(shop =>
                    shop.tagsId.some(tag =>
                        tagsArrString.includes(tag?._id?.toString())
                    )
                );
                const cuisineList = newShops.filter(shop =>
                    shop.cuisineType.some(cuisine =>
                        tagsArrString.includes(cuisine?._id?.toString())
                    )
                );

                tagsShop = [...tagsList, ...cuisineList];
            }

            const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (deliveryTimeSort == 'yes') {
            // for (const shop of newShops) {
            //     let shopDistance = await getDistance(
            //         latitude,
            //         longitude,
            //         shop.location?.coordinates[1],
            //         shop.location?.coordinates[0],
            //         'k'
            //     );

            //     if (!shopDistance) {
            //         shopDistance = 1;
            //     }

            //     shop.shopDistance = shopDistance;
            // }
            newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20) - (b.avgOrderDeliveryTime || 20));
        }

        // Open shop need to show top and then closed shop
        const openShops = newShops
            .map(shop => ({ ...shop, isShopOpen: checkShopOpeningHours(shop) }))
            .reduce(
                (accumulator, currentShop) => {
                    if (
                        currentShop.liveStatus === 'online' &&
                        currentShop.isShopOpen
                    ) {
                        accumulator[0].push(currentShop);
                    } else {
                        accumulator[1].push(currentShop);
                    }
                    return accumulator;
                },
                [[], []]
            );

        const finalShops = [...openShops[0], ...openShops[1]];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalShops.length,
            pagingRange: 5,
        });

        const list = finalShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // for (const shop of list) {
        //     const isShopOpen = checkShopOpeningHours(shop);
        //     shop.isShopOpen = isShopOpen;
        // }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                product: {
                    discountShop: list,
                    paginate,
                },
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getUserFeaturedProduct = async (req, res) => {
    try {
        const {
            type,
            page = 1,
            pageSize = 50,
            longitude,
            latitude,
            listContainers,
            deals,
            mixProductPrice,
            tags,
            cuisineIds,
            dietaries,
            priceSort,
            ratingSort,
            deliveryTimeSort,
            maxDeliveryFee,
        } = req.query;
        const plusUser = req.plusUser;

        const appSetting = await AppSetting.findOne();
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let sort = shopCommonSorting;
        if (['asc', 'desc'].includes(priceSort)) {
            sort = {
                expensive: priceSort,
            };
        }

        if (ratingSort == 'yes') {
            sort = {
                rating: 'desc',
            };
        }

        let config = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            deletedAt: null,
            isFeatured: true,
            shopStatus: 'active',
        };

        if (
            ![
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ].includes(type) &&
            (listContainers?.length >= 3 || deals?.length >= 3)
        ) {
            let shopTypeList = [];

            const processDeals = async (dealType, model) => {
                if (dealType?.length >= 3) {
                    const listOfDeals = JSON.parse(dealType);
                    const dealsShopTypeList = await model
                        .find({ _id: { $in: listOfDeals } })
                        .distinct('shopType');
                    shopTypeList.push(...dealsShopTypeList);
                }
            };

            await Promise.all([
                processDeals(listContainers, ListContainerModel),
                processDeals(deals, FilterContainerModel),
            ]);

            config = {
                ...config,
                shopType: { $in: shopTypeList },
            };
        }

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            config = {
                ...config,
                shopType: type,
            };
        }

        if (mixProductPrice?.length >= 3) {
            const listOfExpensive = JSON.parse(mixProductPrice);

            config.expensive = {
                $in: listOfExpensive,
            };
        }

        if (tags?.length >= 3) {
            const listOfTags = JSON.parse(tags);

            config.tags = {
                $in: listOfTags,
            };
        }

        if (cuisineIds?.length >= 3) {
            const cuisineListIds = JSON.parse(cuisineIds);

            config.cuisineType = {
                $in: cuisineListIds,
            };
        }

        if (dietaries?.length >= 3) {
            const dietaryList = JSON.parse(dietaries);

            config.dietary = {
                $in: dietaryList,
            };
        }

        const shops = await ShopModel.find(config)
            .sort(sort)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        let newShops = [];
        if (maxDeliveryFee == 0) {
            for (const singleShop of shops) {
                let result = false;
                if (singleShop.freeDelivery) {
                    result = singleShop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    );
                }

                if (result) {
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }
                    newShops.push({
                        ...singleShop._doc,
                        deliveryFee: 0,
                    });
                }
            }
        } else if (maxDeliveryFee > 0) {
            for (const singleShop of shops) {
                const result = await getShopByDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    maxDeliveryFee
                );

                if (result === true) {
                    let deliveryFee = await getDeliveryCharge(
                        singleShop,
                        latitude,
                        longitude,
                        plusUser
                    );
                    // console.log(deliveryFee);
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }

                    newShops.push({
                        ...singleShop._doc,
                        deliveryFee: deliveryFee,
                    });
                }
            }
        } else {
            for (const singleShop of shops) {
                let deliveryFee = await getDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    plusUser
                );

                if (!plusUser) {
                    await checkPlusUserMarketing(singleShop);
                }

                newShops.push({
                    ...singleShop._doc,
                    deliveryFee: deliveryFee,
                });
            }
        }

        if (deals?.length >= 3) {
            const listOfDeals = JSON.parse(deals);

            const dealsList = await FilterContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let isDoubleDeal = false;
            let isFreeDelivery = false;
            let percentageDeals = [];

            for (const deal of dealsList) {
                isDoubleDeal = deal?.deals?.includes('double_menu');
                isFreeDelivery = deal?.deals?.includes('free_delivery');
                percentageDeals = deal?.deals?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );
            }

            let doubleDealShops = [];
            let freeDeliveryShops = [];
            let percentageDealShops = [];

            if (isDoubleDeal) {
                doubleDealShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );
            }

            if (isFreeDelivery) {
                freeDeliveryShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );
            }

            if (percentageDeals.length > 0) {
                percentageDealShops = newShops.filter(shop =>
                    shop.marketings.some(marketing => {
                        if (
                            marketing.type === 'percentage' &&
                            marketing.isActive
                        ) {
                            const marketingDiscounts =
                                marketing.discountPercentages.map(String);
                            return percentageDeals.some(discount =>
                                marketingDiscounts.includes(discount)
                            );
                        }
                    })
                );
            }

            const newShopList = [
                ...doubleDealShops,
                ...freeDeliveryShops,
                ...percentageDealShops,
            ];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (listContainers?.length >= 3) {
            const listOfDeals = JSON.parse(listContainers);

            const dealsList = await ListContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let dealsArr = [];
            let tagsArr = [];
            let shopsArr = [];

            for (const deal of dealsList) {
                if (deal.type.includes('deal')) {
                    dealsArr = [...dealsArr, ...deal.deals];
                }
                if (deal.type.includes('tag')) {
                    tagsArr = [...tagsArr, ...deal.tags];
                }
                if (deal.type.includes('shop')) {
                    shopsArr = [...shopsArr, ...deal.shops];
                }
            }

            let dealsShop = [];
            let tagsShop = [];
            let shopsShop = [];

            if (shopsArr.length > 0) {
                shopsArr = [...new Set(shopsArr)];

                const shopsArrString = shopsArr?.map(id => id.toString());

                shopsShop = newShops.filter(shop =>
                    shopsArrString.includes(shop?._id?.toString())
                );
            }

            if (dealsArr.length > 0) {
                dealsArr = [...new Set(dealsArr)];

                let isDoubleDeal = dealsArr?.includes('double_menu');
                let isFreeDelivery = dealsArr?.includes('free_delivery');
                let percentageDeals = dealsArr?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );

                if (isDoubleDeal) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'double_menu' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (isFreeDelivery) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (percentageDeals.length > 0) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(marketing => {
                            if (
                                marketing.type === 'percentage' &&
                                marketing.isActive
                            ) {
                                const marketingDiscounts =
                                    marketing.discountPercentages.map(String);

                                return percentageDeals.some(discount =>
                                    marketingDiscounts.includes(discount)
                                );
                            }
                        })
                    );

                    dealsShop = [...dealsShop, ...list];
                }
            }

            if (tagsArr.length > 0) {
                tagsArr = [...new Set(tagsArr)];

                const tagsArrString = tagsArr?.map(id => id.toString());

                const tagsList = newShops.filter(shop =>
                    shop.tagsId.some(tag =>
                        tagsArrString.includes(tag?._id?.toString())
                    )
                );
                const cuisineList = newShops.filter(shop =>
                    shop.cuisineType.some(cuisine =>
                        tagsArrString.includes(cuisine?._id?.toString())
                    )
                );

                tagsShop = [...tagsList, ...cuisineList];
            }

            const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (deliveryTimeSort == 'yes') {
            // for (const shop of newShops) {
            //     let shopDistance = await getDistance(
            //         latitude,
            //         longitude,
            //         shop.location?.coordinates[1],
            //         shop.location?.coordinates[0],
            //         'k'
            //     );

            //     if (!shopDistance) {
            //         shopDistance = 1;
            //     }

            //     shop.shopDistance = shopDistance;
            // }

            newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20) - (b.avgOrderDeliveryTime || 20));
        }

        // Open shop need to show top and then closed shop
        const openShops = newShops
            .map(shop => ({ ...shop, isShopOpen: checkShopOpeningHours(shop) }))
            .reduce(
                (accumulator, currentShop) => {
                    if (
                        currentShop.liveStatus === 'online' &&
                        currentShop.isShopOpen
                    ) {
                        accumulator[0].push(currentShop);
                    } else {
                        accumulator[1].push(currentShop);
                    }
                    return accumulator;
                },
                [[], []]
            );

        const finalShops = [...openShops[0], ...openShops[1]];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalShops.length,
            pagingRange: 5,
        });

        const list = finalShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // for (const shop of list) {
        //     const isShopOpen = checkShopOpeningHours(shop);
        //     shop.isShopOpen = isShopOpen;
        // }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                product: {
                    featuredShop: list,
                    paginate,
                },
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getUserFreeDeliveryProduct = async (req, res) => {
    try {
        const {
            type,
            page = 1,
            pageSize = 50,
            longitude,
            latitude,
            listContainers,
            deals,
            mixProductPrice,
            tags,
            cuisineIds,
            dietaries,
            priceSort,
            ratingSort,
            deliveryTimeSort,
        } = req.query;
        const plusUser = req.plusUser;

        const appSetting = await AppSetting.findOne();
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let sort = shopCommonSorting;
        if (['asc', 'desc'].includes(priceSort)) {
            sort = {
                expensive: priceSort,
            };
        }

        if (ratingSort == 'yes') {
            sort = {
                rating: 'desc',
            };
        }

        let config = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            deletedAt: null,
            marketings: {
                $elemMatch: {
                    $exists: true,
                },
            },
            freeDelivery: true,
            shopStatus: 'active',
            // liveStatus: 'online',
        };

        if (
            ![
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ].includes(type) &&
            (listContainers?.length >= 3 || deals?.length >= 3)
        ) {
            let shopTypeList = [];

            const processDeals = async (dealType, model) => {
                if (dealType?.length >= 3) {
                    const listOfDeals = JSON.parse(dealType);
                    const dealsShopTypeList = await model
                        .find({ _id: { $in: listOfDeals } })
                        .distinct('shopType');
                    shopTypeList.push(...dealsShopTypeList);
                }
            };

            await Promise.all([
                processDeals(listContainers, ListContainerModel),
                processDeals(deals, FilterContainerModel),
            ]);

            config = {
                ...config,
                shopType: { $in: shopTypeList },
            };
        }

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            config = {
                ...config,
                shopType: type,
            };
        }

        if (mixProductPrice?.length >= 3) {
            const listOfExpensive = JSON.parse(mixProductPrice);

            config.expensive = {
                $in: listOfExpensive,
            };
        }

        if (tags?.length >= 3) {
            const listOfTags = JSON.parse(tags);

            config.tags = {
                $in: listOfTags,
            };
        }

        if (cuisineIds?.length >= 3) {
            const cuisineListIds = JSON.parse(cuisineIds);

            config.cuisineType = {
                $in: cuisineListIds,
            };
        }

        if (dietaries?.length >= 3) {
            const dietaryList = JSON.parse(dietaries);

            config.dietary = {
                $in: dietaryList,
            };
        }

        const shops = await ShopModel.find(config)
            .sort(sort)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        let newShops = [];

        for (const shop of shops) {
            const findFreeDelivery = shop.marketings.find(
                marketing =>
                    ['free_delivery'].includes(marketing.type) &&
                    marketing.isActive
            );

            if (findFreeDelivery) {
                if (!plusUser) {
                    await checkPlusUserMarketing(shop);
                }

                newShops.push({
                    ...shop._doc,
                    deliveryFee: 0,
                });
            }
        }

        if (deals?.length >= 3) {
            const listOfDeals = JSON.parse(deals);

            const dealsList = await FilterContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let isDoubleDeal = false;
            let isFreeDelivery = false;
            let percentageDeals = [];

            for (const deal of dealsList) {
                isDoubleDeal = deal?.deals?.includes('double_menu');
                isFreeDelivery = deal?.deals?.includes('free_delivery');
                percentageDeals = deal?.deals?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );
            }

            let doubleDealShops = [];
            let freeDeliveryShops = [];
            let percentageDealShops = [];

            if (isDoubleDeal) {
                doubleDealShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );
            }

            if (isFreeDelivery) {
                freeDeliveryShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );
            }

            if (percentageDeals.length > 0) {
                percentageDealShops = newShops.filter(shop =>
                    shop.marketings.some(marketing => {
                        if (
                            marketing.type === 'percentage' &&
                            marketing.isActive
                        ) {
                            const marketingDiscounts =
                                marketing.discountPercentages.map(String);
                            return percentageDeals.some(discount =>
                                marketingDiscounts.includes(discount)
                            );
                        }
                    })
                );
            }

            const newShopList = [
                ...doubleDealShops,
                ...freeDeliveryShops,
                ...percentageDealShops,
            ];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (listContainers?.length >= 3) {
            const listOfDeals = JSON.parse(listContainers);

            const dealsList = await ListContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let dealsArr = [];
            let tagsArr = [];
            let shopsArr = [];

            for (const deal of dealsList) {
                if (deal.type.includes('deal')) {
                    dealsArr = [...dealsArr, ...deal.deals];
                }
                if (deal.type.includes('tag')) {
                    tagsArr = [...tagsArr, ...deal.tags];
                }
                if (deal.type.includes('shop')) {
                    shopsArr = [...shopsArr, ...deal.shops];
                }
            }

            let dealsShop = [];
            let tagsShop = [];
            let shopsShop = [];

            if (shopsArr.length > 0) {
                shopsArr = [...new Set(shopsArr)];

                const shopsArrString = shopsArr?.map(id => id.toString());

                shopsShop = newShops.filter(shop =>
                    shopsArrString.includes(shop?._id?.toString())
                );
            }

            if (dealsArr.length > 0) {
                dealsArr = [...new Set(dealsArr)];

                let isDoubleDeal = dealsArr?.includes('double_menu');
                let isFreeDelivery = dealsArr?.includes('free_delivery');
                let percentageDeals = dealsArr?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );

                if (isDoubleDeal) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'double_menu' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (isFreeDelivery) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (percentageDeals.length > 0) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(marketing => {
                            if (
                                marketing.type === 'percentage' &&
                                marketing.isActive
                            ) {
                                const marketingDiscounts =
                                    marketing.discountPercentages.map(String);

                                return percentageDeals.some(discount =>
                                    marketingDiscounts.includes(discount)
                                );
                            }
                        })
                    );

                    dealsShop = [...dealsShop, ...list];
                }
            }

            if (tagsArr.length > 0) {
                tagsArr = [...new Set(tagsArr)];

                const tagsArrString = tagsArr?.map(id => id.toString());

                const tagsList = newShops.filter(shop =>
                    shop.tagsId.some(tag =>
                        tagsArrString.includes(tag?._id?.toString())
                    )
                );
                const cuisineList = newShops.filter(shop =>
                    shop.cuisineType.some(cuisine =>
                        tagsArrString.includes(cuisine?._id?.toString())
                    )
                );

                tagsShop = [...tagsList, ...cuisineList];
            }

            const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (deliveryTimeSort == 'yes') {
            // for (const shop of newShops) {
            //     let shopDistance = await getDistance(
            //         latitude,
            //         longitude,
            //         shop.location?.coordinates[1],
            //         shop.location?.coordinates[0],
            //         'k'
            //     );

            //     if (!shopDistance) {
            //         shopDistance = 1;
            //     }

            //     shop.shopDistance = shopDistance;
            // }

            newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20) - (b.avgOrderDeliveryTime || 20));
        }

        // Open shop need to show top and then closed shop
        const openShops = newShops
            .map(shop => ({ ...shop, isShopOpen: checkShopOpeningHours(shop) }))
            .reduce(
                (accumulator, currentShop) => {
                    if (
                        currentShop.liveStatus === 'online' &&
                        currentShop.isShopOpen
                    ) {
                        accumulator[0].push(currentShop);
                    } else {
                        accumulator[1].push(currentShop);
                    }
                    return accumulator;
                },
                [[], []]
            );

        const finalShops = [...openShops[0], ...openShops[1]];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalShops.length,
            pagingRange: 5,
        });

        const list = finalShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // for (const shop of list) {
        //     const isShopOpen = checkShopOpeningHours(shop);
        //     shop.isShopOpen = isShopOpen;
        // }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                product: {
                    freeDeliveryShop: list,
                    paginate,
                },
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getUserPastOrderShop = async (req, res) => {
    try {
        const {
            type,
            page = 1,
            pageSize = 50,
            latitude,
            longitude,
        } = req.query;
        const userId = req.userId;

        let whereConfig = {
            users: { $in: userId },
            orderStatus: 'delivered',
        };

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            whereConfig = {
                ...whereConfig,
                orderType: type,
            };
        }

        const pastOrders = await OrderModel.find(whereConfig)
            .sort({ createdAt: 'desc' })
            .populate([
                {
                    path: 'shop',
                    populate: 'products cuisineType marketings',
                },
            ]);

        const pastOrdersShops = [];
        for (let order of pastOrders) {
            let res = false;

            for (let i = 0; i < pastOrdersShops.length; i++) {
                const element = pastOrdersShops[i];
                if (element._id === order.shop._id) {
                    res = true;
                }
            }
            if (res === false)
                pastOrdersShops.push({
                    ...order.shop?._doc,
                });
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: pastOrdersShops.length,
            pagingRange: 5,
        });

        let list = pastOrdersShops.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        const newList = [];
        for (let shop of list) {
            let deliveryFee = await getDeliveryCharge(
                shop,
                latitude,
                longitude
            );
            newList.push({
                ...shop._doc,
                deliveryFee: deliveryFee,
            });
        }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                product: {
                    pastOrdersShops: newList,
                    paginate,
                },
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getUserNearShops = async (req, res) => {
    try {
        const { latitude, longitude, type, page, pageSize } = req.query;

        let whereConfig = {
            shopStatus: 'active',
            // liveStatus: 'online',
        };

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            whereConfig = {
                ...whereConfig,
                shopType: type,
            };
        }

        let shops = [];
        let paginate;

        if (latitude) {
            const appSetting = await AppSetting.findOne();
            const km = appSetting ? appSetting.nearByShopKm : 0;
            const maxDistanceInMeters = 1000 * km;

            let locationRange = {
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [longitude, latitude],
                        },
                        $maxDistance: maxDistanceInMeters,
                    },
                },
            };

            shops = await ShopModel.find({ ...whereConfig, ...locationRange })
                .sort({ updatedAt: 'desc' })
                .populate([
                    {
                        path: 'seller',
                        select: '-password',
                    },
                    {
                        path: 'marketings',
                    },
                    {
                        path: 'banner',
                    },
                    {
                        path: 'cuisineType',
                    },
                    {
                        path: 'products',
                        populate: 'marketing',
                    },
                ]);

            paginate = await paginationMultipleModel({
                page,
                pageSize,
                total: shops.length,
                pagingRange: 5,
            });

            shops = shops.slice(
                paginate.offset,
                paginate.offset + paginate.limit
            );
        }
        let newNearBy = [];

        let deliveryRange = [];
        const globalDropCharge = await GlobalDropCharge.findOne({});

        if (globalDropCharge) {
            deliveryRange = globalDropCharge.deliveryRange;
        }

        for (let shop of shops) {
            let deliveryFee = await getDeliveryCharge(
                shop,
                latitude,
                longitude
            );

            newNearBy.push({
                ...shop._doc,
                deliveryFee,
                deliveryRange,
            });
        }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                shops: newNearBy,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.productListForSeller = async (req, res) => {
    try {
        const {
            sellerId,
            page = 1,
            pageSize = 50,
            productVisibility,
            searchKey,
            type,
            status,
        } = req.query;

        let whereConfig = {
            seller: sellerId,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const seoTitleSearchQuery = newQuery.map(str => ({
                seoTitle: RegExp(str, 'i'),
            }));
            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: seoTitleSearchQuery },
                        ],
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
                type,
                ...whereConfig,
            };
        }

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                status,
                ...whereConfig,
            };
        }

        if (productVisibility) {
            whereConfig = {
                productVisibility,
                ...whereConfig,
            };
        }

        const products = await ProductModel.find(whereConfig);

        var paginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                products,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getAllShopCategory = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            shop,
        } = req.query;

        var whereConfig = {
            deletedAt: null,
            shop: shop,
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
                categories: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteDealsInProductFromAdmin = async (req, res) => {
    try {
        const { productId, dealId } = req.body;

        const isExist = await ProductModel.findOne({ _id: productId });

        const isExistInItems = await ProductModel.find({
            shop: isExist.shop,
            deals: dealId,
        });

        // console.log(isExist.shop, isExistInItems.length);

        if (!isExist) return errorResponse(res, 'Shop not found');

        const isExistInProduct = await ProductModel.findOne({
            _id: productId,
            deals: dealId,
        });

        if (!isExistInProduct) {
            return errorResponse(res, 'Deal Not exist in shop');
        }

        // add update deal in product
        await ProductModel.updateOne(
            { _id: productId },
            {
                $pull: {
                    deals: dealId,
                },
            }
        );

        if (isExistInItems.length == 1) {
            await ShopModel.updateOne(
                { _id: isExist.shop },
                {
                    $pull: {
                        itemsDeals: dealId,
                    },
                }
            );
        }

        const product = await ProductModel.findOne({ _id: productId })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'marketing',
                },
            ])
            .select('-categories');

        successResponse(res, {
            message: 'Successfully added',
            data: {
                product,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.shopSearch = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sellerNeed,
            type,
            pagingRange = 5,
            longitude,
            latitude,
        } = req.query;

        // console.log(latitude, longitude);

        const appSetting = await AppSetting.findOne();
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let location = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            status: 'active',
            productVisibility: true,
        };

        const nearShop = await ShopModel.find(location);

        const nearShopsIds = nearShop.map(item => item._id);

        // console.log(nearShopsIds);

        let whereConfig = {
            deletedAt: null,
            shop: {
                $in: nearShopsIds,
            },
            status: 'active',
        };

        if (type !== 'global') {
            if (
                [
                    'food',
                    'grocery',
                    'pharmacy',
                    'coffee',
                    'flower',
                    'pet',
                ].includes(type)
            ) {
                whereConfig = {
                    ...whereConfig,
                    type: type,
                };
            }
        }

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

        let { offset, limit, pageNumber } = getPaginationOffset(page, pageSize);

        const totalData = await ProductModel.aggregate([
            { $match: whereConfig },
            {
                $group: {
                    _id: '$shop',
                },
            },
        ]);

        const total = totalData.length;

        const { totalPage, hasNextPage, hasPreviousPage, pageInfo } =
            doPagingPreData(total, limit, pageNumber);

        const paging = await doPaging(
            pageNumber,
            pagingRange,
            totalPage,
            pageNumber - 1 * limit
        );

        const paginate = {
            limit,
            total,
            offset,
            metadata: {
                hasNextPage,
                hasPreviousPage,
                list: {
                    total,
                    limit,
                },
                page: pageInfo,
                paging,
            },
        };

        const list = await ProductModel.aggregate([
            { $match: whereConfig },
            { $group: { _id: '$shop' } },
            { $limit: paginate.limit },
            { $skip: paginate.offset },
            {
                $lookup: {
                    from: 'shops',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'shop',
                },
            },
        ]);

        const shopList = list.map(item => item.shop[0]);

        let shopListWithSeller = [];

        if (sellerNeed) {
            // populate seller from shop list
            shopListWithSeller = await Promise.all(
                shopList.map(async shop => {
                    const seller = await SellerModel.findOne({
                        _id: shop.seller,
                    });
                    return {
                        ...shop,
                        seller,
                    };
                })
            );
        } else {
            shopListWithSeller = shopList;
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                list: shopListWithSeller,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCategoryWiseSearchUnderShop = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            shop,
            category,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            shop: shop,
            category: category,
            status: 'active',
            productVisibility: true,
            stockQuantity: { $gt: 0 },
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
            model: ProductModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await ProductModel.find(whereConfig)
            .sort({ createdAt: 'desc' })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                products: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*****  Check product in cart start *****/
exports.checkProductInCartNew = async (req, res) => {
    try {
        const { carts } = req.body;

        // const carts = [
        //     {
        //         productId: '5f9f1b1b1b1b1b1b1b1b1b1b',
        //         price: 100,
        //         discountPrice: 50,
        //         rewardBundle: 20,
        //         marketingId: '5f9f1b1b1b1b1b1b1b1b1b1b',
        //         shopId: '5f9f1b1b1b1b1b1b1b1b1b1b',
        //         addons: [{ id: '5f9f1b1b1b1b1b1b1b1b1b1b', price: '' }],
        //         attributes: [
        //             {
        //                 id: '5f9f1b1b1b1b1b1b1b1b1b1b',
        //                 attributeItems: [
        //                     {
        //                         id: '5f9f1b1b1b1b1b1b1b1b1b1b',
        //                         extraPrice: 20,
        //                     },
        //                 ],
        //             },
        //         ],
        //     },
        // ];

        const newProducts = [];

        for (const element of carts) {
            const change = await productIsChangeNew(element);
            if (change) {
                newProducts.push({
                    productId: element.productId,
                    change: change,
                });
            }
        }

        // console.log(newProducts);

        return successResponse(res, {
            message: 'Successfully fetched',
            data: {
                carts: newProducts,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
const productIsChangeNew = async cart => {
    const product = await ProductModel.findOne({
        _id: ObjectId(cart.productId),
        status: 'active',
        productVisibility: true,
    }).populate([
        {
            path: 'marketing',
        },
        {
            path: 'shop',
        },
        {
            path: 'addons',
        },
    ]);

    // check product info
    if (!product) {
        return true;
    }

    if (product?.price !== cart?.price) {
        return true;
    }

    if (cart?.discountPrice > 0) {
        if (product?.discountPrice !== cart?.discountPrice) {
            return true;
        }
    }

    if (cart?.rewardBundle > 0) {
        if (product?.rewardBundle !== cart?.rewardBundle) {
            return true;
        }
    }

    // check shop info
    if (product?.shop?.shopStatus !== 'active') {
        return true;
    }
    if (product?.shop?.liveStatus !== 'online') {
        return true;
    }

    // check addons info
    if (cart?.addons) {
        // console.log('addons');
        const checkAddons = productAddonsIsChangeNew(
            product?.addons,
            cart?.addons
        );
        // console.log(checkAddons);
        if (checkAddons) {
            return checkAddons;
        }
    }

    // check attributes info
    if (cart?.attributes) {
        // console.log('attributes');
        const checkAttributes = productAttributeIsChangeNew(
            product?.attributes,
            cart?.attributes
        );
        // console.log(checkAttributes);
        if (checkAttributes) {
            return checkAttributes;
        }
    }

    // Check Marketing Info
    if (cart?.marketingId) {
        const marketing = await MarketingModel.findOne({
            _id: cart.marketingId,
            deletedAt: null,
            isActive: true,
        });
        if (!marketing) {
            return true;
        }
    }

    // console.log('success');
    return false;
};
const productAddonsIsChangeNew = (productAddons, cartAddons) => {
    // cartAddons: [{ id: '5f9f1b1b1b1b1b1b1b1b1b1b', price: '' }],
    for (const element of cartAddons) {
        const addon = productAddons?.find(
            addon => addon?._id.toString() == element?.id.toString()
        );
        if (!addon) {
            return true;
        }
        if (addon?.price !== element?.price) {
            return true;
        }
    }
    return false;
};
const productAttributeIsChangeNew = (productAtt, cartAtt) => {
    // attributes: [
    //     {
    //         id: '5f9f1b1b1b1b1b1b1b1b1b1b',
    //         attributeItems: [
    //             {
    //                 id: '5f9f1b1b1b1b1b1b1b1b1b1b',
    //                 extraPrice: '20',
    //             },
    //         ],
    //     },
    // ];

    for (const element of cartAtt) {
        const attribute = productAtt?.find(
            att => att?._id.toString() == element?.id.toString()
        );
        if (!attribute) {
            // console.log('no attribute');
            return true;
        }
        for (const itemElement of element?.attributeItems) {
            const item = attribute?.items?.find(
                item => item._id == itemElement?.id
            );
            if (!item) {
                // console.log('no item');
                return true;
            }
            if (item?.extraPrice !== itemElement?.extraPrice) {
                // console.log('no extraPrice');
                return true;
            }
        }
    }

    return false;
};

exports.getRewardCategoryWiseProducts = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
            rewardCategoryId,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            status: 'active',
            productVisibility: true,
            stockQuantity: { $gt: 0 },
        };

        if (rewardCategoryId) {
            whereConfig = {
                ...whereConfig,
                rewardCategory: rewardCategoryId,
                marketing: { $not: { $size: 0 } },
            };
        }

        const list = await ProductModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'marketing',
                },
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: 'address',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
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
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]);

        const activeList = list?.filter(
            product => product.marketing[0].isActive
        );

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: activeList.length,
            pagingRange: pagingRange,
        });

        let newList = [];

        if (sortBy === 'DESC') {
            newList = activeList.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
        } else {
            newList = activeList.sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
        }

        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        let newProducts = [];
        for (const element of newList) {
            const product = element;
            const review = await getProductReview(product._id);

            const isShopOpen = checkShopOpeningHours(product.shop);
            product.shop._doc.isShopOpen = isShopOpen;
            product._doc.secondaryPrice = calculateSecondaryPrice(product._doc.price * product.shop._doc.shopExchangeRate);

            newProducts.push({
                ...product._doc,
                review: review ? review : null,
            });
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                products: newProducts,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Find specific shop products by category wise
// Find specific shop products by category wise
exports.getCategoryWiseProducts = async (req, res) => {
    try {
        const { shopId, productAvailability } = req.query;

        let shop = await ShopModel.findById(shopId).populate([
            {
                path: 'seller',
                select: '-password',
            },
            {
                path: 'banner',
            },
            {
                path: 'cuisineType',
            },
            {
                path: 'categories',
            },
            {
                path: 'shopFavourites',
                populate: {
                    path: 'products',
                    populate: {
                        path: 'product',
                        populate: 'category marketing addons',
                    },
                },
            },
            {
                path: 'marketings',
            },
            {
                path: 'products',
                populate: 'marketing',
            },
        ]);

        if (!shop) return errorResponse(res, 'shop not found');

        let productConfig = {
            shop: shopId,
            deletedAt: null,
        };

        if (productAvailability === 'yes') {
            productConfig = {
                ...productConfig,
                status: 'active',
                productVisibility: true,
                stockQuantity: { $gt: 0 },
            };
        }

        // const productList = await ProductModel.find(productConfig)
        //     .sort([
        //         ['sortingOrder', 'asc'],
        //         ['createdAt', -1],
        //     ])
        //     .populate([
        //         {
        //             path: 'category',
        //             select: '_id image name isUnsortable isShopBestSellers isShopFavorites'
        //         },
        //         {
        //             path: 'subCategory',
        //             select: '_id name sortedProducts'
        //         },
        //         {
        //             path: 'shop',
        //             select: 'shopExchangeRate'
        //         },
        //         // {
        //         //     path: 'seller',
        //         // },
        //         {
        //             path: 'addons',
        //         },
        //         {
        //             path: 'marketing',
        //         },
        //     ]);

        // for (const product of productList) {
        //     let isAllocatedIntoBanner = false;
        //     const findProductBanner = await BannerModel.countDocuments({
        //         productId: product._id,
        //     });
        //     if (findProductBanner > 0) isAllocatedIntoBanner = true;

        //     product._doc.isAllocatedIntoBanner = isAllocatedIntoBanner;
        // }

        let productList = await ProductModel.aggregate([
            {
                $match: {
                    shop: new ObjectId(shopId),
                    deletedAt: null,
                    // 'status': 'active',
                    // 'productVisibility': true,
                    // 'stockQuantity': {
                    //     '$gt': 0
                    // }
                },
            },
            {
                $sort: {
                    sortingOrder: 1,
                    createdAt: -1,
                    excelSortedOrderIndex: -1,
                },
            },
            {
                $lookup: {
                    from: 'banners',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'banners',
                },
            },
            {
                $addFields: {
                    isAllocatedIntoBanner: {
                        $gt: [
                            {
                                $size: '$banners',
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $project: {
                    banners: 0,
                },
            },
        ]);

        productList = await ProductModel.populate(productList, [
            {
                path: 'category',
                select: '_id image name isUnsortable isShopBestSellers isShopFavorites',
            },
            {
                path: 'subCategory',
                select: '_id name sortedProducts',
            },
            {
                path: 'shop',
                select: 'shopExchangeRate',
            },
            // {
            //     path: 'seller',
            // },
            {
                path: 'addons',
            },
            {
                path: 'marketing',
            },
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ]);

        const productsGroupByCategory = [];

        const sortedShopCategoryList = await ShopCategory.find({
            shop: shopId,
        })
            .sort({
                sortingOrder: 'asc',
                'category.createdAt': 'desc',
            })
            .populate([
                {
                    path: 'category',
                    select: '_id image name isUnsortable isShopBestSellers isShopFavorites',
                },
            ]);

        // const sortedShopCategoryList = shopCategoryList.sort((a, b) => {
        //     if (a?.category?.sortingOrder === b?.category?.sortingOrder) {
        //         return (
        //             new Date(b?.category?.createdAt) -
        //             new Date(a?.category?.createdAt)
        //         );
        //     }
        //     return a?.category?.sortingOrder - b?.category?.sortingOrder;
        // });

        if (['food', 'coffee', 'flower', 'pet'].includes(shop.shopType)) {
            for (const shopCategory of sortedShopCategoryList) {
                const products = productList.filter(
                    product =>
                        product.category._id.toString() ===
                        shopCategory?.category?._id?.toString()
                );

                productsGroupByCategory.push({
                    category: shopCategory,
                    sortedProducts: products,
                });
            }
        } else {
            for (const shopCategory of sortedShopCategoryList) {
                const subCategories = await SubCategoryModel.find({
                    category: shopCategory.category._id,
                }).sort([
                    ['sortingOrder', 'asc'],
                    ['createdAt', -1],
                ]);

                const productsGroupBySubCategory = [];

                for (const subCategory of subCategories) {
                    const products = productList.filter(
                        product =>
                            product?.subCategory?._id?.toString() ===
                            subCategory?._id?.toString()
                    );

                    productsGroupBySubCategory.push({
                        subCategory,
                        sortedProducts: products,
                    });
                }

                // For skip empty category in pharmacy and grocery
                if (subCategories.length) {
                    productsGroupByCategory.push({
                        category: shopCategory,
                        subCategories: productsGroupBySubCategory,
                    });
                }
            }
        }

        // Finding Best Seller Items
        const orderItems = await OrderModel.aggregate([
            // match orders with orderStatus: delivered and shop: desiredShopId
            {
                $match: {
                    orderStatus: 'delivered',
                    shop: ObjectId(shopId),
                },
            },
            // unwind the products array to get one document per product
            {
                $unwind: '$products',
            },
            // join with the Product collection to get details about the product
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            // // unwind the product array to get one document per product
            {
                $unwind: '$product',
            },
            // // match products with status: active and productVisibility: true
            {
                $match: {
                    'product.status': 'active',
                    'product.productVisibility': true,
                    'product.deletedAt': null,
                },
            },
            // group by product id and sum the quantity of each product sold
            {
                $group: {
                    _id: '$products.product',
                    totalSold: { $sum: '$products.quantity' },
                },
            },
            // sort by totalSold in descending order
            {
                $sort: {
                    totalSold: -1,
                },
            },
            // // limit to the top 10 best sellers
            {
                $limit: 3,
            },
        ]);

        const bestSellerItems = await ProductModel.populate(orderItems, {
            path: '_id',
            populate: [
                {
                    path: 'category',
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
            ],
        });

        for (const product of bestSellerItems) {
            let isAllocatedIntoBanner = false;
            const findProductBanner = await BannerModel.countDocuments({
                productId: product._id._id,
            });
            if (findProductBanner > 0) isAllocatedIntoBanner = true;

            product._id._doc.isAllocatedIntoBanner = isAllocatedIntoBanner;
        }

        // Shop favourites item
        const shopFavouriteItems = shop._doc.shopFavourites.products;

        const sortedShopFavouriteItems = shopFavouriteItems.sort(
            (a, b) => a.sortingOrder - b.sortingOrder
        );
        for (const product of sortedShopFavouriteItems) {
            let isAllocatedIntoBanner = false;
            const findProductBanner = await BannerModel.countDocuments({
                productId: product.product._id,
            });
            if (findProductBanner > 0) isAllocatedIntoBanner = true;

            product.product._doc.isAllocatedIntoBanner = isAllocatedIntoBanner;
        }

        successResponse(res, {
            message: 'Successfully find shop',
            data: {
                productsGroupByCategory,
                bestSellerItems,
                shopFavouriteItems: sortedShopFavouriteItems,
                shop: {
                    _id: shopId,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getProductsBySubcategory = async (req, res) => {
    try {
        const { shopId, productAvailability, subCategory } = req.query;

        let shop = await ShopModel.findById(shopId).select("shopName")

        if (!shop) return errorResponse(res, 'shop not found');


        let productList = await ProductModel.aggregate([
            {
                $match: {
                    shop: new ObjectId(shopId),
                    deletedAt: null,
                    subCategory: new ObjectId(subCategory)
                    // 'status': 'active',
                    // 'productVisibility': true,
                    // 'stockQuantity': {
                    //     '$gt': 0
                    // }
                },
            },
            {
                $sort: {
                    sortingOrder: 1,
                    createdAt: -1,
                    excelSortedOrderIndex: -1,
                },
            },
            {
                $lookup: {
                    from: 'banners',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'banners',
                },
            },
            {
                $addFields: {
                    isAllocatedIntoBanner: {
                        $gt: [
                            {
                                $size: '$banners',
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $project: {
                    banners: 0,
                },
            },
        ]);

        productList = await ProductModel.populate(productList,
            [
                {
                    path: 'category',
                    select: '_id image name isUnsortable isShopBestSellers isShopFavorites'
                },
                {
                    path: 'subCategory',
                    select: '_id name'
                },
                {
                    path: 'shop',
                    select: 'shopExchangeRate'
                },
                // {
                //     path: 'seller',
                // },
                {
                    path: 'addons',
                },
                {
                    path: 'marketing',
                },
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]
        )

        successResponse(res, {
            message: 'Successfully find shop',
            data: {
                products: productList,
                shop: {
                    _id: shopId,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getProductsByCategory = async (req, res) => {
    try {
        const { shopId, productAvailability, category } = req.query;

        let shop = await ShopModel.findById(shopId).select("shopName")

        if (!shop) return errorResponse(res, 'shop not found');


        let productList = await ProductModel.aggregate([
            {
                $match: {
                    shop: new ObjectId(shopId),
                    deletedAt: null,
                    category: new ObjectId(category)
                    // 'status': 'active',
                    // 'productVisibility': true,
                    // 'stockQuantity': {
                    //     '$gt': 0
                    // }
                },
            },
            {
                $sort: {
                    sortingOrder: 1,
                    createdAt: -1,
                    excelSortedOrderIndex: -1,
                },
            },
            {
                $lookup: {
                    from: 'banners',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'banners',
                },
            },
            {
                $addFields: {
                    isAllocatedIntoBanner: {
                        $gt: [
                            {
                                $size: '$banners',
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $project: {
                    banners: 0,
                },
            },
        ]);

        productList = await ProductModel.populate(productList,
            [
                {
                    path: 'category',
                    select: '_id image name isUnsortable isShopBestSellers isShopFavorites'
                },
                {
                    path: 'subCategory',
                    select: '_id name'
                },
                {
                    path: 'shop',
                    select: 'shopExchangeRate'
                },
                // {
                //     path: 'seller',
                // },
                {
                    path: 'addons',
                },
                {
                    path: 'marketing',
                },
                {
                    path: 'attributes',
                    populate: {
                        path: 'items',
                        model: 'attributeItems',
                    },
                },
            ]
        )

        successResponse(res, {
            message: 'Successfully find shop',
            data: {
                products: productList,
                shop: {
                    _id: shopId,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Sort Products
exports.sortProducts = async (req, res) => {
    try {
        const { products } = req.body;

        products?.forEach(async product => {
            await ProductModel.updateOne(
                { _id: product.id },
                {
                    $set: {
                        sortingOrder: product.sortingOrder,
                    },
                }
            );
        });

        // const updatedProducts = await ProductModel.find().sort([
        //     ['sortingOrder', 'asc'],
        //     ['createdAt', -1],
        // ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                // products: updatedProducts,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateProductStockStatus = async (req, res) => {
    try {
        const { productId, stockQuantity } = req.body;

        let product = await ProductModel.findById(productId);

        if (!product) return errorResponse(res, 'Product not found');

        if (![0, 1].includes(stockQuantity))
            return errorResponse(res, 'Stock Quantity must be either 0 or 1');

        if (stockQuantity == 0) {
            const findProductBanner = await BannerModel.countDocuments({
                productId: productId,
            });
            if (findProductBanner > 0)
                return errorResponse(
                    res,
                    'A banner has been allocated to this product.'
                );
        }

        await ProductModel.updateOne(
            { _id: productId },
            {
                $set: {
                    isStockEnabled: false,
                    stockQuantity: stockQuantity,
                },
            }
        );

        const updatedProduct = await ProductModel.findById(productId).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address cuisineType marketings',
                select: '-categories',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
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
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },

        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                product: updatedProduct,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// Check is the product in another product addon
exports.getProductAddonsCheck = async (req, res) => {
    try {
        const { productId } = req.query;

        const products = await ProductModel.find({
            addons: { $in: [productId] },
        });

        successResponse(res, {
            message: 'Successfully addons checked',
            data: {
                isAnotherProductAddon: products.length ? true : false,
                products,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Global product feature for grocery and pharmacy
exports.getGlobalProducts = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            type,
            status,
        } = req.query;

        let whereConfig = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));
            const barcodeNumberSearchQuery = newQuery.map(str => ({
                barcodeNumber: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: barcodeNumberSearchQuery },
                        ],
                    },
                ],
            };
        }

        if (type && ['grocery', 'pharmacy'].includes(type)) {
            whereConfig = {
                ...whereConfig,
                type,
            };
        }

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status,
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: GlobalProductModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const products = await GlobalProductModel.find(whereConfig)
            .sort({
                createdAt: sortBy,
                excelSortedOrderIndex: -1,
            })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                products,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getGlobalProductShops = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            productId,
        } = req.query;

        if (!productId) return errorResponse(res, 'productId is required');

        const shopIds = await ProductModel.distinct('shop', {
            globalProduct: productId,
            deletedAt: null,
        });

        let whereConfig = {
            _id: { $in: shopIds },
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));

            const phone_numberQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: phone_numberQuery },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: ShopModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const shops = await ShopModel.find(whereConfig)
            .sort({
                sortingOrder: sortBy,
                featuredUpdatedTime: 1,
                createdAt: 1,
            })
            .populate([
                {
                    path: 'seller',
                    select: 'company_name profile_photo',
                },
                {
                    path: 'tagsId',
                    select: 'name',
                },
                {
                    path: 'cuisineType',
                    select: 'name',
                },
                {
                    path: 'marketings',
                    select: 'type creatorType products isActive status discountPercentages onlyForSubscriber',
                },
            ])
            .select({
                shopName: 1,
                shopLogo: 1,
                commercial_circular_document: 1,
                tax_registration: 1,
                contact_paper: 1,
                shopID: 1,
                shopBanner: 1,
                expensive: 1,
                shopStatus: 1,
                liveStatus: 1,
                tags: 1,
                tagsId: 1,
                minOrderAmount: 1,
                maxOrderAmount: 1,
                isCuisine: 1,
                cuisineType: 1,
                address: 1,
                rating: 1,
                totalOrder: 1,
                maxDiscount: 1,
                normalHours: 1,
                holidayHours: 1,
                shopBrand: 1,
            })
            .lean();

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Previous code to add product from admin panel
exports.addGlobalProduct = async (req, res) => {
    try {
        const {
            name,
            type,
            images,
            nutritionServingSize,
            nutritionServingUnit,
            nutritionPerUnit,
            nutritionCalories,
            nutrition,
            dietary,
            storedTemperature,
            productType,
            barcodeNumber,
        } = req.body;

        if (!name && !type)
            return errorResponse(res, 'name and type are required.');

        const isExist = await GlobalProductModel.findOne({
            name: { $regex: `^${name}$`, $options: 'i' },
            type,
        });

        if (isExist)
            return errorResponse(res, 'This product name is already exists.');

        if (barcodeNumber && barcodeNumber !== '0000000') {
            const findProduct = await GlobalProductModel.findOne({
                barcodeNumber,
            });

            if (findProduct)
                return errorResponse(
                    res,
                    'This barcode number is already exists in another product'
                );
        }

        const createDate = {
            name,
            type,
            images,
            nutritionServingSize,
            nutritionServingUnit,
            nutritionPerUnit,
            nutritionCalories,
            nutrition,
            dietary,
            storedTemperature,
            productType,
            barcodeNumber,
        };

        const product = await GlobalProductModel.create(createDate);

        successResponse(res, {
            message: 'Successfully added',
            data: {
                product,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// To upload multiple Lyxa products through excel file
exports.uploadGlobalProduct = async (req, res) => {
    try {
        if (!req.file) return errorResponse(res, 'Please upload a .xlsx file!');
        let filePath = req.file.path;

        let { uniqueKey } = req.query;

        const { misMatch, totalRow } = await numberOfRows(filePath);

        if (misMatch)
            return errorResponse(
                res,
                'Please download latest version of Lyxa product add excel file'
            );

        if (totalRow === 0)
            return errorResponse(
                res,
                'Please fill up at least one row data to upload'
            );

        let progressBarData = {
            processedItems: 0,
            totalItems: 0,
        };

        progressBarData.totalItems = 4 * totalRow + 3;

        const { productList, missingRowData } = await getLyxaDataFromXLSX(
            filePath,
            progressBarData,
            uniqueKey
        );

        const namesToCheck = [];
        const nameListWithRow = [];
        const barcodeNumbersToCheck = [];
        const barCodeNumbersList = [];

        productList.forEach((product, index) => {
            namesToCheck.push(product.name);
            nameListWithRow.push({
                rowNumber: index + 3,
                name: product.name,
            });
            barCodeNumbersList.push({
                rowNumber: index + 3,
                barcodeNumber: product.barcodeNumber,
            });
            if (product.barcodeNumber !== '0000000')
                barcodeNumbersToCheck.push(product.barcodeNumber);
            // progress bar
            uploadProgressBarLyxa(
                uniqueKey,
                0,
                progressBarData,
                'validating...'
            );
        });

        const regexPatterns = namesToCheck.map(name => ({
            name: { $regex: `^${name}$`, $options: 'i' },
        }));
        const existingNames = await GlobalProductModel.find({
            $or: regexPatterns,
        }).exec();

        // progress bar single iteration
        uploadProgressBarLyxa(uniqueKey, 0, progressBarData, 'validating...');

        const existedNames = nameListWithRow
            .filter(item =>
                existingNames.some(doc =>
                    new RegExp(`^${item.name}$`, 'i').test(doc.name)
                )
            )
            .map(item => item.rowNumber);

        if (existedNames.length) {
            missingRowData.push(
                `Names containing rows [${existedNames}] already exist.`
            );
        }

        // progress bar single iteration
        uploadProgressBarLyxa(uniqueKey, 0, progressBarData, 'validating...');

        const existingBarcode = await GlobalProductModel.find({
            barcodeNumber: { $in: barcodeNumbersToCheck },
        }).exec();

        // progress bar single iteration
        uploadProgressBarLyxa(uniqueKey, 0, progressBarData, 'validating...');

        const existedBarcodes = barCodeNumbersList
            .filter(item =>
                existingBarcode.some(
                    doc => doc.barcodeNumber === item.barcodeNumber
                )
            )
            .map(item => item.rowNumber);

        if (existedBarcodes.length) {
            missingRowData.push(
                `Barcodes containing rows [${existedBarcodes}] already exist`
            );
        }

        if (missingRowData.length) {
            uploadProgressBarLyxa(
                uniqueKey,
                0,
                progressBarData,
                'validating...'
            );
            return errorResponse(res, missingRowData);
        }

        try {

            const products = await GlobalProductModel.find({
                excelSortedOrderIndex: { $exists: true },
            })
                .sort({ excelSortedOrderIndex: -1 })
                .limit(1);

            let lastSortedOrderIndex = products.length === 0 ? 0 : products[0].excelSortedOrderIndex;

            productList.reverse();

            productList.forEach(item => {
                item.excelSortedOrderIndex = ++lastSortedOrderIndex;
            })

            let batchSize = Math.ceil(totalRow / 6);
            batchSize = batchSize === 1 ? totalRow : batchSize;

            let batches = Math.ceil(totalRow / batchSize);

            progressBarData.processedItems = 0;
            progressBarData.totalItems = batches;

            for (let i = 0; i < batches; i++) {
                const documents = [];
                for (
                    let j = 0;
                    j < batchSize && i * batchSize + j < totalRow;
                    j++
                ) {
                    documents.push(productList[i * batchSize + j]);
                }
                uploadProgressBarLyxa(
                    uniqueKey,
                    20,
                    progressBarData,
                    'uploading...'
                );
                await GlobalProductModel.insertMany(documents);
            }
        } catch (err) {
            console.error('Error uploading products:', err);
        }

        successResponse(res, {
            message: 'Successfully uploaded',
            // data: {
            //     product: productList,
            // },
        });
    } catch (error) {
        let filePath = req.file.path;
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, err => {
                if (err) {
                    console.error(`Error deleting the file: ${err}`);
                    return;
                }
                console.log(
                    'Catch Block => File deleted successfully from this directory: ' +
                    filePath
                );
            });
        }
        return errorResponse(res, error.message);
        // return errorResponse (res, `Could not upload the file: ${req.file.originalname}`);
    }
};

// To upload multiple Shop products through excel file
exports.uploadShopProduct = async (req, res) => {
    try {
        if (!req?.file)
            return errorResponse(res, 'Please upload a .xlsx file!');

        let filePath = req.file.path;
        let { shopId, uniqueKey } = req.query;

        const shopData = await ShopModel.find({
            _id: shopId,
        }).select({
            seller: 1,
        });

        if (!shopData.length) {
            return errorResponse(res, 'Shop not found');
        }

        const { misMatch, totalRow } = await getNonEmptyRowCount(
            filePath,
            shopId
        );

        if (misMatch) {
            return errorResponse(
                res,
                'Please download latest version of Shop product add excel file'
            );
        }

        if (totalRow === 0) {
            return errorResponse(
                res,
                'Please fill up at least one row to upload'
            );
        }

        let progressBarData = {
            processedItems: 0,
            totalItems: 0,
        };

        progressBarData.totalItems = 4 * totalRow + 4;

        const { productList, missingRowData } =
            await getShopProductDataFromXLSX(
                filePath,
                shopData[0]._id.toString(),
                shopData[0].seller.toString(),
                progressBarData,
                uniqueKey
            );

        const namesToCheck = [];
        const nameListWithRow = [];
        const barcodeNumbersToCheck = [];
        const barCodeNumbersList = [];

        productList.forEach((product, index) => {
            namesToCheck.push(product.name);
            nameListWithRow.push({
                rowNumber: index + 3,
                name: product.name,
            });
            barCodeNumbersList.push({
                rowNumber: index + 3,
                barcodeNumber: product.barcodeNumber,
            });
            if (product.barcodeNumber !== '0000000')
                barcodeNumbersToCheck.push(product.barcodeNumber);

            // progress bar
            uploadProgressBar(
                shopId,
                uniqueKey,
                0,
                progressBarData,
                'validatiing...'
            );
        });

        const regexPatterns = namesToCheck.map(name => ({
            name: {
                $regex: `^${name}$`,
                $options: 'i',
            },
        }));
        const existingNames = await ProductModel.find({
            $or: regexPatterns,
            // To allow different shops to use same name
            shop: shopId,
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        }).exec();

        // progress bar single iteration
        uploadProgressBar(
            shopId,
            uniqueKey,
            0,
            progressBarData,
            'validatiing...'
        );

        const existedNames = nameListWithRow
            .filter(item =>
                existingNames.some(doc =>
                    new RegExp(`^${item.name}$`, 'i').test(doc.name)
                )
            )
            .map(item => item.rowNumber);

        if (existedNames.length) {
            missingRowData.push(
                `Names containing rows [${existedNames.join(
                    ', '
                )}] already exist.`
            );
        }

        // progress bar single iteration
        uploadProgressBar(
            shopId,
            uniqueKey,
            0,
            progressBarData,
            'validatiing...'
        );

        const existingBarcode = await ProductModel.find({
            barcodeNumber: { $in: barcodeNumbersToCheck },
            shop: shopId,
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        }).exec();

        // progress bar single iteration
        uploadProgressBar(
            shopId,
            uniqueKey,
            0,
            progressBarData,
            'validatiing...last__before__error'
        );

        const existedBarcodes = barCodeNumbersList
            .filter(item =>
                existingBarcode.some(
                    doc => doc.barcodeNumber === item.barcodeNumber
                )
            )
            .map(item => item.rowNumber);

        if (existedBarcodes.length) {
            missingRowData.push(
                `Barcodes containing rows [${existedBarcodes.join(
                    ', '
                )}] already exist`
            );
        }

        if (missingRowData.length) {
            uploadProgressBar(
                shopId,
                uniqueKey,
                0,
                progressBarData,
                'validatiing...',
                true
            );
            return errorResponse(res, missingRowData);
        }

        try {
            const products = await ProductModel.find({
                shop: shopId,
                excelSortedOrderIndex: { $exists: true },
            })
                .sort({ excelSortedOrderIndex: -1 })
                .limit(1);

            let lastSortedOrderIndex = products.length === 0 ? 0 : products[0].excelSortedOrderIndex;

            productList.reverse();

            productList.forEach(item => {
                item.excelSortedOrderIndex = ++lastSortedOrderIndex;
            })

            let steps = 10;
            let batchSize = Math.ceil(totalRow / steps);
            batchSize = batchSize === 1 ? totalRow : batchSize;

            const totalBatches = Math.ceil(productList.length / batchSize);

            progressBarData.processedItems = 0;
            progressBarData.totalItems = totalBatches;

            for (let i = 0; i < totalBatches; i++) {
                const batch = productList.slice(
                    i * batchSize,
                    (i + 1) * batchSize
                );

                uploadProgressBar(
                    shopId,
                    uniqueKey,
                    20,
                    progressBarData,
                    `Uploading batch ${i + 1} of ${totalBatches}...`
                );

                // const createdProducts = await TestProductModel.insertMany(batch);    // For uploading products to another collection

                const createdProducts = await ProductModel.insertMany(batch);
                const productIds = createdProducts.map(product => product._id);

                await ShopModel.updateOne(
                    { _id: shopId },
                    {
                        $push: {
                            products: { $each: productIds },
                        },
                    }
                );
            }
        } catch (err) {
            console.error('Error uploading products:', err);
        }

        /*
        try {
            progressBarData.processedItems = 0;
            progressBarData.totalItems = totalRow;
            for (const item of productList) {
                uploadProgressBar(shopId, uniqueKey, 20, progressBarData, "uploading...");

                const addProduct = await ProductModel.create(item);
                await ShopModel.updateOne(
                    { _id: shopId },
                    {
                        $push: {
                            products: addProduct._id,
                        },
                    }
                );
            }
        } catch (err) {
            console.error('Error uploading products:', err);
        }
        */

        successResponse(res, {
            message: 'Successfully uploaded',
        });
    } catch (error) {
        let { shopId, uniqueKey } = req.query;

        let filePath = req.file.path;
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, err => {
                if (err) {
                    console.error(`Error deleting the file: ${err}`);
                    return;
                }
                console.log(
                    'Catch Block => File deleted successfully from this directory for Shop: ' +
                    filePath
                );
            });
        }
        return errorResponse(res, error.message);
    }
};

exports.downloadTemplateShop = async (req, res) => {
    try {
        let { refModel, refId } = req.query;

        const fileName = 'addShopProduct.xlsx';

        let result = await ExcelFileModel.deleteOne({
            refModel: refModel,
            refId: mongoose.Types.ObjectId(refId),
            filename: fileName,
        });

        await generateExcelForShopProductAdd(refId);

        result = await ExcelFileModel.findOne({
            refModel: 'shop',
            refId: mongoose.Types.ObjectId(refId),
            filename: fileName,
        });

        const filePath = path.join(__dirname, fileName);
        const buffer = Buffer.from(result.xlsxData.buffer);
        fs.writeFileSync(filePath, buffer);
        res.download(filePath, err => {
            if (err) console.error('Error sending file', err);
            fs.unlinkSync(filePath);
        });
    } catch (err) {
        console.error('Error downloading file', err);
        return errorResponse(res, 'Internal Server Error');
    }
};

exports.downloadTemplate = async (req, res) => {
    try {
        const fileName = 'addLyxaProduct.xlsx';

        let result = await ExcelFileModel.deleteOne({
            refModel: 'admin',
            filename: fileName,
        });
        await generateExcelForLyxaProductAdd();
        result = await ExcelFileModel.findOne({
            refModel: 'admin',
            filename: fileName,
        });

        if (!result)
            return errorResponse(res, 'Generated Excel not uploaded in DB');

        const filePath = path.join(__dirname, fileName);
        const buffer = Buffer.from(result.xlsxData.buffer);
        fs.writeFileSync(filePath, buffer);

        res.download(filePath, err => {
            if (err) console.error('Error sending file', err);
            fs.unlinkSync(filePath);
        });
    } catch (err) {
        console.error('Error downloading file', err);
        return errorResponse(res, 'Internal Server Error');
    }
};

exports.updateGlobalProduct = async (req, res) => {
    try {
        const {
            productId,
            name,
            images,
            nutritionServingSize,
            nutritionServingUnit,
            nutritionPerUnit,
            nutritionCalories,
            nutrition,
            dietary,
            storedTemperature,
            productType,
            status,
            barcodeNumber,
        } = req.body;

        const existingGlobalProduct = await GlobalProductModel.findById(
            productId
        );
        if (!existingGlobalProduct)
            return errorResponse(res, 'Product not found');

        if (barcodeNumber && barcodeNumber !== '0000000') {
            const findProduct = await GlobalProductModel.findOne({
                _id: { $ne: productId },
                barcodeNumber,
            });
            if (findProduct)
                return errorResponse(
                    res,
                    'This barcode number is already exists in another product'
                );
        }

        let updateData = {
            name,
            images,
            nutritionServingSize,
            nutritionServingUnit,
            nutritionPerUnit,
            nutritionCalories,
            nutrition,
            dietary,
            storedTemperature,
            productType,
            status,
            barcodeNumber,
        };

        const updatedGlobalProduct = await GlobalProductModel.findByIdAndUpdate(
            productId,
            { $set: updateData },
            { new: true }
        );

        await ProductModel.updateMany(
            { globalProduct: productId },
            { $set: updateData }
        );

        // const product = await ProductModel.findById(productId);
        if (updatedGlobalProduct) {
            const shopIds = await ProductModel.distinct('shop', {
                globalProduct: productId,
                deletedAt: null,
            });
            let title = `Admin ${
                existingGlobalProduct.status !== status
                    ? status === 'active'
                        ? 'activated'
                        : 'deactivated'
                    : 'updated'
            } the Lyxa product ${updatedGlobalProduct.name}.`;
            let description =
                existingGlobalProduct.status !== status
                    ? `Admin change status of the Lyxa product to ${status}.`
                    : `Admin Update the Lyxa product Fields`;
            for (const shopId of shopIds) {
                await sendNotificationToShopForUpdateLyxaProduct(
                    shopId.toString(),
                    title,
                    description
                );
            }
        }

        successResponse(res, {
            message: 'Successfully Updated',
            data: { product: updatedGlobalProduct },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteGlobalProductById = async (req, res) => {
    try {
        const { productId } = req.body;
        const existingGlobalProduct = await GlobalProductModel.findById(
            productId
        );
        if (!existingGlobalProduct)
            return errorResponse(res, { message: 'Product not found' });
        const shopIds = await ProductModel.distinct('shop', {
            globalProduct: productId,
            deletedAt: null,
        });
        const findProducts = await ProductModel.find({
            globalProduct: productId,
        }).select('shop');
        await Promise.all(
            findProducts.map(async product => {
                await ProductModel.findByIdAndUpdate(product._id, {
                    $set: { deletedAt: new Date() },
                });
                await ShopModel.updateOne(
                    { _id: product.shop },
                    { $pull: { products: product._id } }
                );
            })
        );

        await GlobalProductModel.findByIdAndDelete(productId);

        let title = `Admin deleted the Lyxa product ${existingGlobalProduct.name}.`;
        let description = `Admin deleted the Lyxa product ${existingGlobalProduct.name}.`;
        for (const shopId of shopIds) {
            await sendNotificationToShopForUpdateLyxaProduct(
                shopId.toString(),
                title,
                description
            );
        }
        successResponse(res, { message: 'Successfully Deleted' });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.checkGlobalProduct = async (req, res) => {
    try {
        const { name, type } = req.query;

        if (!name && !type)
            return errorResponse(res, 'name and type are required.');

        const isExist = await GlobalProductModel.findOne({
            name: { $regex: `^${name}$`, $options: 'i' },
            type,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                isExist: isExist ? true : false,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
