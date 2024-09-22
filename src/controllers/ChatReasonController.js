const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const ChatReason = require('../models/ChatReasonModel');
const moment = require('moment');

exports.getChatReasonForAdmin = async (req, res) => {
    try {
        const { type, status, searchKey, startDate, endDate, userType='user' } = req.query;

        let config = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const questionSearchQuery = newQuery.map(str => ({
                question: RegExp(str, 'i'),
            }));
            config = {
                ...config,
                $and: [
                    {
                        $or: [{ $and: questionSearchQuery }],
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

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        if (['orderSupport', 'accountSupport'].includes(type)) config.type = type;
        if (['user', 'shop'].includes(userType)) config.userType = userType;
        if (['active', 'inactive'].includes(status)) config.status = status;

        const chatReason = await ChatReason.find(config).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully find chat reason',
            data: {
                chatReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getChatReasonForUserApp = async (req, res) => {
    try {
        const { type } = req.query;
        const config = { status: 'active' };
        if (['orderSupport', 'accountSupport'].includes(type)) config.type = type;
        config.userType = (req.shopId)? 'shop': 'user';

        const chatReason = await ChatReason.find(config).sort([['sortingOrder', 'asc'], ['createdAt', -1],]);
        successResponse(res, { message: 'Successfully find chat reason', data: { chatReason, }, });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addChatReason = async (req, res) => {
    try {
        const { question, answer, type, userType } = req.body;

        const chatReason = await ChatReason.create({
            question,
            answer,
            type,
            userType
        });

        successResponse(res, {
            message: 'Successfully added chat reason',
            data: {
                chatReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editChatReason = async (req, res) => {
    try {
        const { id, question, answer, type, status, userType } = req.body;

        // check id
        const checkChatReason = await ChatReason.findById(id);

        if (!checkChatReason) {
            return errorResponse(res, 'Chat reason not found');
        }

        await ChatReason.updateOne(
            {
                _id: id,
            },
            {
                $set: {
                    question,
                    answer,
                    type,
                    status,
                    userType
                },
            }
        );

        const chatReason = await ChatReason.findById(id);

        successResponse(res, {
            message: 'Successfully updated chat reason',
            data: {
                chatReason,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteChatReason = async (req, res) => {
    try {
        const { id } = req.body;

        await ChatReason.findByIdAndDelete(id);

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.sortChatReason = async (req, res) => {
    try {
        const { chatReasons, type } = req.body;

        chatReasons?.forEach(async chatReason => {
            await ChatReason.updateOne(
                { _id: chatReason.id },
                {
                    $set: {
                        sortingOrder: chatReason.sortingOrder,
                    },
                }
            );
        });

        let config = {};

        if (['orderSupport', 'accountSupport'].includes(type)) {
            config = { type };
        }

        const updatedChatReasons = await ChatReason.find(config).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                chatReasons: updatedChatReasons,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
