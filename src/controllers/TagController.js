const { errorResponse, successResponse } = require('../helpers/apiResponse');
const TagModel = require('../models/TagModel');
const { pagination } = require('../helpers/pagination');

exports.getTags = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            type,
            status,
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

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                status,
                ...whereConfig,
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

        let paginate = await pagination({
            page,
            pageSize,
            model: TagModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const tags = await TagModel.find(whereConfig)
            .sort({ createdAt: sortBy })
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

exports.addTag = async (req, res) => {
    try {
        const { name, type } = req.body;

        const tag = await TagModel.create({
            name,
            type,
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

exports.updateTag = async (req, res) => {
    try {
        const { id, name, type, status } = req.body;

        const isExist = await TagModel.findOne({
            _id: id,
        });

        if (!isExist) return errorResponse(res, 'Tag not found');

        await TagModel.updateOne(
            { _id: id },
            {
                $set: {
                    name,
                    type,
                    status,
                },
            }
        );

        const tag = await TagModel.findOne({ _id: id });

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

exports.deleteTag = async (req, res) => {
    try {
        const { id } = req.body;

        const tag = await TagModel.findOne({
            _id: id,
        });

        if (!tag) {
            return res.status(200).json({
                status: false,
                message: 'Tag not found',
            });
        }

        await TagModel.findByIdAndDelete(id);

        return res.status(200).json({
            status: true,
            message: 'Tag Successfully Deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
