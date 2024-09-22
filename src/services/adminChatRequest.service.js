const AdminChatRequest = require('../models/AdminChatRequest');

exports.closeChatRequestByIds = async (adminChatRequestIds) => {
    try {
        await AdminChatRequest.updateMany({ _id: {$in:adminChatRequestIds} }, { status: 'closed', closedAt: new Date(), });
        // await Order.updateMany({ _id: {$in:orderIds} }, { lastChatTime: new Date() });
        // await ButlerModel.updateMany({ _id: {$in:orderIds} }, { lastChatTime: new Date() });
    } catch (error) {
        console.log('error', error);
        return error;
    }
};
