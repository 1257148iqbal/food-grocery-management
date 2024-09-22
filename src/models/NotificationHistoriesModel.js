const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Schema.Types;

const NotificationHistorySchema = new Schema(
    {
        notificationId: {
            type: ObjectId,
        },
        user: {
            type: ObjectId,
            ref: 'users',
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        deliveryBoy: {
            type: ObjectId,
            ref: 'deliveryBoys',
        },
        admin: {
            type: ObjectId,
            ref: 'admins',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    'notificationHistories',
    NotificationHistorySchema
);
