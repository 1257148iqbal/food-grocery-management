const mongoose = require('mongoose');
const { GeoLocationSchema } = require('./subSchema');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

const RequestAreaSchema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
        },
        address: {
            type: String,
            required: true,
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
        location: GeoLocationSchema,
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('request-area', RequestAreaSchema);
