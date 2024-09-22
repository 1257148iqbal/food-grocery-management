const { errorResponse, successResponse } = require('../helpers/apiResponse');
const TagCuisineModel = require('../models/TagCuisineModel');
const ShopModel = require('../models/ShopModel');
const { pagination } = require('../helpers/pagination');
const moment = require('moment');
const OrderModel = require('../models/OrderModel');

exports.getTagsCuisines = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'asc',
            shopType,
            status,
            startDate,
            endDate,
        } = req.query;

        var whereConfig = {};

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

        if (startDate) {
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

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                status,
                ...whereConfig,
            };
        }

        if (
            shopType &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(shopType)
        ) {
            whereConfig = {
                shopType,
                ...whereConfig,
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: TagCuisineModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const tags = await TagCuisineModel.find(whereConfig)
            .sort([
                ['sortingOrder', sortBy],
                ['createdAt', -1],
            ])
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                tags,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.addTagCuisine = async (req, res) => {
    try {
        const { name, type, shopType, image } = req.body;

        const tag = await TagCuisineModel.create({
            name,
            type,
            shopType,
            image,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                tag,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateTagCuisine = async (req, res) => {
    try {
        const { id, name, image, type, shopType, status, visibility } =
            req.body;

        const isExist = await TagCuisineModel.findOne({
            _id: id,
        });

        if (!isExist) return errorResponse(res, 'Tag not found');

        await TagCuisineModel.updateOne(
            { _id: id },
            {
                $set: {
                    name,
                    image,
                    type,
                    shopType,
                    status,
                    visibility,
                },
            }
        );

        if (name && isExist.type === 'tag' && isExist.name !== name) {
            await ShopModel.updateMany(
                {
                    tagsId: { $in: id },
                },
                { $pull: { tags: isExist.name } }
            );
            await ShopModel.updateMany(
                {
                    tagsId: { $in: id },
                },
                { $push: { tags: name } }
            );
        }

        const tag = await TagCuisineModel.findOne({ _id: id });

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                tag,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.sortTagCuisine = async (req, res) => {
    try {
        const { tags } = req.body;

        tags?.forEach(async tag => {
            await TagCuisineModel.updateOne(
                { _id: tag.id },
                {
                    $set: {
                        sortingOrder: tag.sortingOrder,
                    },
                }
            );
        });

        const updatedTags = await TagCuisineModel.find().sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                tags: updatedTags,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteTagCuisine = async (req, res) => {
    try {
        const { id } = req.body;

        const tag = await TagCuisineModel.findOne({
            _id: id,
        });

        if (!tag) {
            return res.status(200).json({
                status: false,
                message: 'Tag not found',
            });
        }

        await ShopModel.updateMany(
            { $or: [{ tagsId: { $in: id } }, { cuisineType: { $in: id } }] },
            { $pull: { tagsId: id, cuisineType: id, tags: tag.name } }
        );

        await TagCuisineModel.findByIdAndDelete(id);

        return res.status(200).json({
            status: true,
            message: 'Tag Successfully Deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getShopByTagsAndCuisines = async (req, res) => {
    try {
        const { id } = req.query;

        const shops = await ShopModel.find({
            $or: [{ tagsId: { $in: id } }, { cuisineType: { $in: id } }],
        }).populate([
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
        ]);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                shops,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getTopTagsForUserApp = async (req, res) => {
    try {
        const { shopType } = req.query;

        let config = { orderStatus: 'delivered' };

        if (shopType) {
            config = {
                ...config,
                orderType: shopType,
            };
        }

        const tagCuisines = await OrderModel.aggregate([
            // Optionally add a $match stage based on the config object
            {
                $match: config,
            },
            // Unwind the 'tagCuisines' array to get a separate document for each tagCuisine
            { $unwind: '$tagCuisines' },
            // Group by the tagCuisine and count the number of orders for each tagCuisine
            {
                $group: {
                    _id: '$tagCuisines',
                    tagCount: { $sum: 1 },
                },
            },
            // Sort the result by the number of orders in descending order
            { $sort: { tagCount: -1 } },
        ]);

        const tagCuisinesList = await OrderModel.populate(tagCuisines, {
            path: '_id',
            model: 'tags-cuisines',
            select: 'name image type shopType',
        });

        // Map and reformat the data
        const reformattedTagCuisines = tagCuisinesList.map(item => ({
            ...item._id._doc,
            tagCount: item.tagCount,
        }));

        successResponse(res, {
            message: 'Successfully find',
            data: {
                tagCuisines: reformattedTagCuisines,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
