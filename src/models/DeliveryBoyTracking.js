const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

const DeliveryTrackingSchema = new Schema(
    {
        delivery: {
            type: ObjectId,
            ref: 'deliveryBoy',
        },
        latitude: {
            type: Number,
        },
        longitude: {
            type: Number,
        },
        status: {
            type: String,
        },
        time: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('deliveryTracking', DeliveryTrackingSchema);
