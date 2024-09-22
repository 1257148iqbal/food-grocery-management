const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

const ShopDownTimeSchema = new Schema(
    {
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
        },
        Date: {
            type: Date,
        },
        timeOffline: {
            type: Date,
        },
        timeOnline: {
            type: Date,
        },
        downTimeTotal: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('shopDownTime', ShopDownTimeSchema);
