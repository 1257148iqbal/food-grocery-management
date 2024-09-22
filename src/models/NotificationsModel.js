const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Schema.Types;
const NotificationSchema = new Schema(
    {
        title: {
            type: String,
        },
        description: {
            type: String,
        },
        descriptionHtml: {
            type: String,
        },
        image: {
            type: String,
        },
        orderStatus: {
            type: String,
        },
        type: {
            type: String,
            enum: ['global', 'specific'],
        },
        accountType: {
            type: String,
            enum: [
                'user',
                'seller',
                'deliveryBoy',
                'shop',
                'admin',
                'customerService',
            ],
        },
        user: {
            type: ObjectId,
            ref: 'users',
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
        },
        deliveryBoy: {
            type: ObjectId,
            ref: 'deliveryBoy',
        },
        order: {
            type: ObjectId,
            ref: 'orders',
        },
        // BOB finance
        bobFinance: {
            type: ObjectId,
            ref: 'bobFinance',
        },
        // Request Area
        requestArea: {
            type: ObjectId,
            ref: 'request-area',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        admin: {
            type: ObjectId,
            ref: 'admins',
        },
        byAdmin: {
            type: Boolean,
            default: false,
        },
        clickable: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        seenBy: [ObjectId],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('notification', NotificationSchema);
