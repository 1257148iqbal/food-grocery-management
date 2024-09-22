const { errorHandler, errorResponse } = require('../helpers/apiResponse');
const MessageModel = require('../models/MessageModel');

exports.getMessage = async (req, res) => {
    try {
        const { search } = req.query;

        let config = {};

        if (search) {
            const newQuery = search.split(/[ ,]+/);
            const searchQuery = newQuery.map(str => ({
                message: RegExp(str, 'i'),
            }));
            config = {
                ...config,
                $and: [
                    {
                        $or: [{ $and: searchQuery }],
                    },
                ],
            };
        }

        const list = await MessageModel.find(config).lean();

        return res.json({
            status: true,
            message: 'success',
            data: {
                messages: list,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};
exports.addMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const data = await MessageModel.create({
            message: message,
        });

        return res.json({
            status: true,
            message: 'success',
            data: {
                message: data,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.editMessage = async (req, res) => {
    try {
        const { message, id } = req.body;
        await MessageModel.updateOne(
            {
                _id: id,
            },
            {
                message,
            }
        );
        const data = await MessageModel.findById(id);

        return res.json({
            status: true,
            message: 'success',
            data: {
                message: data,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.body;

        const isExist = await MessageModel.findById(messageId);
        if (!isExist) return errorResponse(res, 'Message not found');

        await MessageModel.findByIdAndDelete(messageId);

        return res.json({
            status: true,
            message: 'Successfully Deleted',
        });
    } catch (err) {
        errorHandler(res, err);
    }
};
