const CronJob = require('../models/CronJobModel');
const { notifyForTimeoutMessage, notifyForCloseChat } = require('../config/socket');
const AdminChatRequest = require('../models/AdminChatRequest');
const ChatsMessage = require('../models/ChatsMessage');
const { closeChatRequestByIds } = require('../services/adminChatRequest.service');

exports.checkTimeoutMessage = async () => {
    console.log('running checkTimeoutMessage');
    try {
        const timeoutMessages = await AdminChatRequest.find({
            status: 'accepted',
            isAdminReplay: false,
            isSendTimeOutMessage: false,
            userLastMessageSendAt: {
                $lte: new Date(Date.now() - 3 * 60 * 1000),
            },
        });
        if(timeoutMessages.length) await AdminChatRequest.updateMany({ _id: { $in: timeoutMessages.map((message) => message._id) } }, { isSendTimeOutMessage: true });
        for (const message of timeoutMessages) {
            notifyForTimeoutMessage(message);
        }
    } catch (error) {
        const cronJob = new CronJob({
            name: 'Check timeout message cron job',
            status: 0,
            error: error,
        });
        await cronJob.save();
    }
};

exports.checkNoReplyMessage = async () => {
    console.log('running checkNoReplyMessage');
    try {
        const noReplyMessages = await ChatsMessage.aggregate([
            { $sort: { createdAt: -1 } },
            { $group: { _id: '$adminChatRequest', latestChat: { $first: '$$ROOT' } } },
            { $replaceRoot: { newRoot: '$latestChat' } },
            {
                $lookup: {
                    from: 'admin_chat_requests',
                    localField: 'adminChatRequest',
                    foreignField: '_id',
                    as: 'adminChatRequests',
                    pipeline: [{ $match: { status: { $eq: 'accepted' } } }],
                },
            },
            {
                $match: {
                    type: 'admin',
                    adminChatRequests: { $ne: [] },
                    createdAt: { $lte: new Date(Date.now() - 3 * 60 * 1000) },
                },
            },
        ]);

        const adminChatRequestIds = noReplyMessages.map((message) => {
            notifyForCloseChat(message.adminChatRequest);
            return message.adminChatRequest;
        });
        await closeChatRequestByIds(adminChatRequestIds);

    } catch (error) {
        const cronJob = new CronJob({ name: 'Check NoReply message cron job', status: 0, error: error });
        await cronJob.save();
    }
};
