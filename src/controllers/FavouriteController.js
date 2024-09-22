const FavouriteModel = require('../models/FavouriteModel');
const UserModel = require('../models/UserModel');
const ShopModel = require('../models/ShopModel');
const ProductModel = require('../models/ProductModel');
const AppSetting = require('../models/AppSetting');
const { getDeliveryCharge } = require('../helpers/getDeliveryCharge');
const ObjectId = require('mongoose').Types.ObjectId;
const { validationResult } = require('express-validator');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const { applyExchangeRate } = require('../helpers/applyExchangeRate');

exports.getFavouritesForUser = async (req, res) => {
    try {
        const favorites = await FavouriteModel.find({ deletedAt: null });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                favorites: favorites,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getFavouritesForUserById = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;
        const userId = req.userId;

        const user = await UserModel.findOne({ _id: userId }).populate([
            {
                path: 'favoritesProducts',
                populate: 'shop seller marketing addons category subCategory',
            },
            {
                path: 'favoritesShops',
                populate: 'seller cuisineType categories marketings',
            },
        ]);

        let favoritesProducts = user.favoritesProducts;
        let shops = user.favoritesShops;

        favoritesProducts.sort(function (a, b) {
            return b.favoriteUpdateTime - a.favoriteUpdateTime;
        });

        shops.sort(function (a, b) {
            return b.favoriteUpdateTime - a.favoriteUpdateTime;
        });

        let favoritesShops = [];

        for (const single of shops) {
            let deliveryFee = await getDeliveryCharge(
                single,
                latitude,
                longitude
            );
            const isShopOpen = checkShopOpeningHours(single);

            favoritesShops.push({
                ...single._doc,
                deliveryFee: deliveryFee,
                isShopOpen,
            });
        }

        for (let product of favoritesProducts) {
            const shopExchangeRate = product?.shop?.shopExchangeRate || 0;
            if (shopExchangeRate !== 0) {
                product = await applyExchangeRate(product, shopExchangeRate);
            }

            const isShopOpen = checkShopOpeningHours(product.shop);
            product.shop._doc.isShopOpen = isShopOpen;
        }

        successResponse(res, {
            message: 'successfully find',
            data: {
                product: favoritesProducts,
                shop: favoritesShops,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.addFavouritesForUser = async (req, res) => {
    try {
        const userId = req.userId;

        const { product, shop } = req.body;

        // if (!ObjectId.isValid(userId)) {
        //     return res.status(200).json({
        //         status: false,
        //         message: 'id is invalid',
        //     });
        // }

        if (product) {
            const findProduct = await UserModel.find({
                _id: userId,
                favoritesProducts: { $in: product },
            });
            if (findProduct.length > 0)
                return errorResponse(res, 'already added');

            await UserModel.updateOne(
                { _id: userId },
                {
                    $push: { favoritesProducts: product },
                }
            );

            await ProductModel.updateOne(
                { _id: product },
                {
                    $set: { favoriteUpdateTime: new Date() },
                }
            );
        }

        if (shop) {
            const findShop = await UserModel.find({
                _id: userId,
                favoritesShops: { $in: shop },
            });

            if (findShop.length > 0) return errorResponse(res, 'already added');

            await UserModel.updateOne(
                { _id: userId },
                {
                    $push: { favoritesShops: shop },
                }
            );

            await ShopModel.updateOne(
                { _id: shop },
                {
                    $set: { favoriteUpdateTime: new Date() },
                }
            );
        }

        const favorite = await FavouriteModel.create({
            user_id: userId,
            product,
            shop,
        });

        const updatedFavorite = await FavouriteModel.findById(
            favorite._id
        ).populate([
            {
                path: 'shop',
                populate: [
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
                ],
            },
            {
                path: 'product',
                populate: [
                    {
                        path: 'shop',
                        populate: 'address',
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
                ],
            },
        ]);

        if (updatedFavorite.shop) {
            const isShopOpen = checkShopOpeningHours(updatedFavorite.shop);
            updatedFavorite.shop._doc.isShopOpen = isShopOpen;
        }
        if (updatedFavorite.product) {
            const isShopOpen = checkShopOpeningHours(
                updatedFavorite.product.shop
            );
            updatedFavorite.product.shop._doc.isShopOpen = isShopOpen;

            const shopExchangeRate =
                updatedFavorite?.product?.shop?.shopExchangeRate || 0;
            if (shopExchangeRate !== 0) {
                updatedFavorite.product = await applyExchangeRate(
                    updatedFavorite.product,
                    shopExchangeRate
                );
            }
        }

        successResponse(res, {
            message: 'Successfully added',
            data: {
                favorite: updatedFavorite,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteFavouriteForUser = async (req, res) => {
    try {
        const userId = req.userId;

        const { product, shop } = req.body;

        // await FavouriteModel.updateOne(
        //     { _id: id },
        //     {
        //         $set: {
        //             deletedAt: new Date(),
        //         },
        //     }
        // );

        if (product) {
            await FavouriteModel.findOneAndDelete({
                user: userId,
                product: product,
            });
            // console.log('p');
            await UserModel.updateOne(
                { _id: userId },
                {
                    $pull: { favoritesProducts: product },
                }
            );
        }

        if (shop) {
            await FavouriteModel.findOneAndDelete({ user: userId, shop: shop });
            // console.log('s');

            await UserModel.updateOne(
                { _id: userId },
                {
                    $pull: { favoritesShops: shop },
                }
            );
        }

        successResponse(res, {
            message: 'deleted successfully',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
