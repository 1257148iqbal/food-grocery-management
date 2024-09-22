const mongoose = require('mongoose');
const { GeoLocationSchema } = require('./subSchema');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const addressSchema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
        },
        address: {
            type: String,
            required: true,
        },
        nickname: {
            type: String,
        },
        apartment: {
            type: String,
        },
        latitude: {
            type: Number,
        },
        longitude: {
            type: Number,
        },
        country: {
            type: String,
        },
        state: {
            type: String,
        },
        city: {
            type: String,
        },
        pin: {
            type: String,
        },
        primary: {
            type: Boolean,
        },
        tags: {
            type: String,
            enum: ['home', 'office', 'others'],
            default: 'home',
        },
        note: {
            type: String,
        },
        placeId: {
            type: String,
        },
        location: GeoLocationSchema,
        // New field
        buildingName: {
            type: String,
        },
        deliveryOptions: {
            type: String,
        },
        addressLabel: {
            type: String,
        },
        instructions: {
            type: String,
        },

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'address',
        versionKey: false,
    }
);

module.exports = mongoose.model('address', addressSchema);
