const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const schema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
        },
        admin: {
            type: ObjectId,
            ref: 'admins',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        message: {
            type: String,
        },
        type: {
            type: String,
            enum: ['user', 'admin', 'system', 'shop'],
        },
        seen: {
            type: Boolean,
            default: false,
        },
        adminSeen: {
            type: Boolean,
            default: false,
        },
        adminChatRequest: {
            type: ObjectId,
            ref: 'admin_chat_request',
        },
        order: {
            type: ObjectId,
            ref: 'orders',
        },
        butler: {
            type: ObjectId,
            ref: 'butlers',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('chats_message', schema);
