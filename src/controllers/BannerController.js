const {
    validationError,
    successResponse,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const BannerModel = require('../models/BannerModel');
const ShopModel = require('../models/ShopModel');
const { validationResult } = require('express-validator');
const { DateTime } = require('luxon');

exports.getAllBanners = async (req, res) => {
    try {
        const { searchKey, startDate, endDate, type, status, visibleUserType } =
            req.query;

        let whereConfig = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const titleSearchQuery = newQuery.map(str => ({
                title: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: titleSearchQuery }],
                    },
                ],
            };
        }

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            whereConfig = {
                ...whereConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (
            type &&
            [
                'home',
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ].includes(type)
        ) {
            whereConfig = { ...whereConfig, type };
        }

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = { ...whereConfig, status };
        }

        if (
            visibleUserType &&
            ['all', 'plus', 'normal'].includes(visibleUserType)
        ) {
            whereConfig = { ...whereConfig, visibleUserType };
        }

        const banners = await BannerModel.find(whereConfig)
            .sort([
                ['sortingOrder', 'asc'],
                ['createdAt', -1],
            ])
            .populate([
                {
                    path: 'shopId',
                    select: 'autoGenId shopName shopLogo shopBanner banner shopStatus shopType foodType',
                },
                {
                    path: 'productId',
                    select: 'autoGenId name images',
                },
                {
                    path: 'listContainerId',
                    select: 'name shopType',
                },
            ]);

        successResponse(res, {
            message: 'Successfully get all banners',
            data: {
                banners,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleBannerById = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await BannerModel.findById(id).populate([
            {
                path: 'shopId',
                select: '_id autoGenId shopName shopLogo shopBanner banner shopStatus shopType foodType',
            },
            {
                path: 'productId',
                select: '_id autoGenId name images',
            },
        ]);

        if (!banner) return errorResponse(res, 'Banner not found');
        successResponse(res, {
            message: 'Successfully get single banner',
            data: {
                banner,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addBanner = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }
        const {
            title,
            image,
            type,
            isClickable,
            clickableUrl,
            clickType,
            productId,
            shopId,
            listContainerId,
            visibleUserType,
        } = req.body;

        const createdBanner = await BannerModel.create({
            title,
            image,
            type,
            status: 'active',
            isClickable: isClickable ? isClickable : false,
            clickableUrl: clickableUrl ? clickableUrl : null,
            clickType: clickType ? clickType : null,
            productId: productId ? productId : null,
            shopId: shopId ? shopId : null,
            listContainerId: listContainerId ? listContainerId : null,
            visibleUserType,
        });

        const banner = await BannerModel.findById(createdBanner._id).populate([
            {
                path: 'shopId',
                select: '_id autoGenId shopName shopLogo shopBanner banner shopStatus shopType foodType',
            },
            {
                path: 'productId',
                select: '_id autoGenId name images',
            },
        ]);

        successResponse(res, {
            message: 'Successfully added',
            data: {
                banner,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateBanner = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }

        const {
            id,
            title,
            image,
            type,
            status,
            isClickable,
            clickableUrl,
            clickType,
            productId,
            shopId,
            listContainerId,
            visibleUserType,
        } = req.body;

        const isExist = await BannerModel.findOne({ _id: id });
        if (!isExist) return errorResponse(res, 'Banner not found');

        let updatedData = {};

        if (title) updatedData.title = title;
        if (image) updatedData.image = image;
        if (
            type &&
            [
                'home',
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ].includes(type)
        )
            updatedData.type = type;

        if (status && ['active', 'inactive'].includes(status))
            updatedData.status = status;

        if (isClickable) updatedData.isClickable = isClickable;
        if (clickableUrl || clickableUrl == null)
            updatedData.clickableUrl = clickableUrl;
        if (
            ['product', 'shop', 'plus', 'link', 'listContainer', null].includes(
                clickType
            )
        )
            updatedData.clickType = clickType;

        if (productId || productId == null) updatedData.productId = productId;
        if (shopId || shopId == null) updatedData.shopId = shopId;
        if (listContainerId || listContainerId == null)
            updatedData.listContainerId = listContainerId;
        if (visibleUserType) updatedData.visibleUserType = visibleUserType;

        await BannerModel.updateOne({ _id: id }, updatedData);

        const banner = await BannerModel.findById(id).populate([
            {
                path: 'shopId',
                select: '_id autoGenId shopName shopLogo shopBanner banner shopStatus shopType foodType',
            },
            {
                path: 'productId',
                select: '_id autoGenId name images',
            },
        ]);

        successResponse(res, {
            message: 'Successfully update Banner',
            data: {
                banner,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteBannerById = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return errorResponse(res, 'Bad Request');

        const isExist = await BannerModel.findOne({ _id: id });
        if (!isExist) return errorResponse(res, 'Banner not found');

        await ShopModel.updateOne(
            { _id: isExist.shop },
            {
                $pull: {
                    banner: id,
                },
            }
        );

        await BannerModel.deleteOne({ _id: id });

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserBanners = async (req, res) => {
    try {
        const { type, visibleUserType } = req.query;

        let whereConfig = { status: 'active' };

        if (
            type &&
            [
                'home',
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ].includes(type)
        ) {
            whereConfig = { ...whereConfig, type };
        }

        if (visibleUserType === 'plus') {
            whereConfig = {
                ...whereConfig,
                visibleUserType: { $in: ['all', 'plus'] },
            };
        }

        if (visibleUserType === 'normal') {
            whereConfig = {
                ...whereConfig,
                visibleUserType: { $in: ['all', 'normal'] },
            };
        }

        const banners = await BannerModel.find(whereConfig)
            .sort([
                ['sortingOrder', 'asc'],
                ['createdAt', -1],
            ])
            .populate('listContainerId');

        successResponse(res, {
            message: 'Successfully get all banners',
            data: {
                banners,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Sort Banners
exports.sortBanners = async (req, res) => {
    try {
        const { banners } = req.body;

        for (const banner of banners) {
            await BannerModel.updateOne(
                { _id: banner.id },
                {
                    $set: {
                        sortingOrder: banner.sortingOrder,
                    },
                }
            );
        }

        const updatedBanners = await BannerModel.find().sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                products: updatedBanners,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
