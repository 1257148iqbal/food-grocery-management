const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

const DeliveryBoyTimeOutSchema = new Schema(
    {
        delivery: {
            type: ObjectId,
            ref: 'deliveryBoy',
        },
        Date: {
            type: Date,
        },
        timeIn: {
            type: Date,
        },
        timeOut: {
            type: Date,
        },
        activeTotal: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('deliveryBoyTimeOut', DeliveryBoyTimeOutSchema);
