const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

exports.GeoLocationSchema = new Schema(
    {
        type: {
            type: String,
            enum: ['Point', 'Polygon'],
            default: 'Point',
        },
        coordinates: [Number], //[longitude,latitude]
    },
    { _id: false }
);

exports.AddressSchema = new Schema(
    {
        address: {
            type: String,
        },
        addressDescription: {
            type: String,
        },
        location: {
            type: {
                type: String,
                enum: ['Point', 'Polygon'],
                default: 'Point',
            },
            coordinates: [Number],
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
        note: {
            type: String,
        },
        placeId: {
            type: String,
        },
    },
    { _id: false }
);
