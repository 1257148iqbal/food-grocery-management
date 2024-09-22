const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const { pagination } = require('../helpers/pagination');
const DealModel = require('../models/DealModel');
const TagModel = require('../models/TagModel');
const ShopModel = require('../models/ShopModel');
const ProductModel = require('../models/ProductModel');

exports.getAllDealForAdmin = async (req, res) => {
    try {
        const { type } = req.query;

        let config = {};

        if (type && ['restaurant', 'grocery', 'pharmacy'].includes(type)) {
            config = {
                type,
            };
        }

        let deals = await DealModel.find(config).sort({ createdAt: 'desc' });

        successResponse(res, {
            message: 'All Deal',
            data: {
                deals,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllDealsForAdd = async (req, res) => {
    try {
        const { type = 'product', shopType } = req.query;

        if (!['product', 'shop'].includes(type)) {
            return errorResponse(res, 'Invalid type');
        }

        let config = {
            status: 'active',
            $nor: [{ option: 'others' }],
        };

        // if (shopType) {
        //     config = {
        //         type: {
        //             $in: [shopType]
        //         }
        //     }
        // }

        if (shopType) {
            config = {
                ...config,
                type: shopType,
            };
        }

        if (type === 'product') {
            config = {
                ...config,
                $nor: [{ option: 'free_delivery' }, { option: 'others' }],
            };
        }
        // console.log(config);
        let deals = await DealModel.find(config);

        successResponse(res, {
            message: 'All Deal',
            data: {
                deals,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllDealForAddShopAdmin = async (req, res) => {
    try {
        let config = {
            status: 'active',
            $nor: [{ option: 'others' }],
        };

        let deals = await DealModel.find(config);

        successResponse(res, {
            message: 'All Deal',
            data: {
                deals,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleDealForAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        let deal = await DealModel.findOne({ _id: id });

        if (!deal) {
            errorResponse(res, 'Deal not found');
        }

        successResponse(res, {
            message: 'All Deal',
            data: {
                deal,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addDealFromAdmin = async (req, res) => {
    try {
        const { name, type, option, percentage, image, tag } = req.body;
        let deal = await DealModel.create({
            name,
            type,
            option,
            percentage,
            image,
            tag,
        });
        successResponse(res, {
            message: 'Deal Added Successfully',
            data: {
                deal,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editDealFromAdmin = async (req, res) => {
    try {
        let { id, name, type, option, percentage, image, status, tag } =
            req.body;
        // console.log(req.body);

        if (
            option === 'double_menu' ||
            option === 'free_delivery' ||
            option === 'others'
        ) {
            percentage = null;
        }

        await DealModel.findByIdAndUpdate(id, {
            name,
            type,
            status,
            option,
            percentage,
            image,
            tag,
        });

        const deal = await DealModel.findById(id);

        successResponse(res, {
            message: 'Deal Updated Successfully',
            data: {
                deal,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteDealFromAdmin = async (req, res) => {
    try {
        const { id } = req.body;
        let deal = await DealModel.findByIdAndDelete(id);

        await ShopModel.updateMany(
            { deals: { $in: id } },
            {
                $pull: {
                    deals: id,
                    itemsDeals: id,
                },
            }
        );

        await ShopModel.updateMany(
            { itemsDeals: { $in: id } },
            {
                $pull: {
                    itemsDeals: id,
                },
            }
        );

        await ProductModel.updateMany(
            { deals: { $in: id } },
            {
                $pull: {
                    deals: id,
                },
            }
        );

        successResponse(res, {
            message: 'Deal Deleted Successfully',
            data: {
                deal,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getDealsForUserApp = async (req, res) => {
    try {
        let deals = await DealModel.find({ status: 'active' });
        successResponse(res, {
            message: 'All Deal',
            data: {
                deals,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTags = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            type = 'all',
            searchKey,
        } = req.query;

        let config = {};
        let whereConfig = {
            shopStatus: 'active',
        };

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            config.type = type;
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            config = {
                ...config,
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
            model: TagModel,
            condition: config,
            pagingRange: 5,
        });

        const tags = await TagModel.find(config)
            .skip(paginate.offset)
            .limit(paginate.limit);

        const newTagsIds = tags.map(item => item._id.toString());
        const newTagsList = [...new Set(newTagsIds)];

        const _newTags = await TagModel.find({ _id: { $in: newTagsList } });

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                tags: _newTags,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
