const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId, Boolean } = Schema.Types;
const shortid = require('shortid');
const schema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        admin: {
            type: ObjectId,
            ref: 'admins',
        },
        closeAdmin: {
            type: ObjectId,
            ref: 'admins',
        },
        order: {
            type: ObjectId,
            ref: 'orders',
        },
        butler: {
            type: ObjectId,
            ref: 'butlers',
        },
        reasonMessage: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'closed'],
            default: 'pending',
        },
        acceptedAt: {
            type: Date,
        },
        rejectedAt: {
            type: Date,
        },
        closedAt: {
            type: Date,
        },
        shortId: {
            type: String,
            default: shortid.generate,
        },
        chats: [
            {
                type: ObjectId,
                ref: 'chats_message',
            },
        ],
        chatType: {
            type: String,
            enum: ['order', 'account'],
            default: 'order',
        },
        resolveReason: {
            type: String,
        },
        userLastMessageSendAt: {
            type: Date,
        },
        isAdminReplay: {
            type: Boolean,
        },
        isSendTimeOutMessage: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);
schema.index({ createdAt: -1 });
module.exports = mongoose.model('admin_chat_request', schema);
