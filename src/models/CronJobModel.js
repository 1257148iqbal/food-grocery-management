const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const schema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        status: {
            type: Number,
            default: 1,
        },
        error: {
            type: String,
        },
        deliveryBoyId: {
            type: ObjectId,
            ref: 'deliveryBoy',
        },
        shopId: {
            type: ObjectId,
            ref: 'shops',
        },
        orderId: {
            type: ObjectId,
            ref: 'orders',
        },
        butlerId: {
            type: ObjectId,
            ref: 'butlers',
        },
        marketingId: {
            type: ObjectId,
            ref: 'marketing',
        },
        cartId: {
            type: ObjectId,
            ref: 'carts',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('CronJob', schema);
