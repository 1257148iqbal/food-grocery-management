const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId, String, Number } = Schema.Types;
const zoneSchema = new Schema(
    {
        zoneName: {
            type: String,
            required: true,
        },
        zoneArea: {
            type: String,
        },
        zoneGeometry: new Schema(
            {
                type: {
                    type: String,
                    enum: ['Polygon'],
                    required: true,
                },
                coordinates: {
                    type: [[[Number]]], //[longitude,latitude]
                    required: true,
                },
            },
            { _id: false }
        ),
        zoneStatus: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        zoneAvailability: {
            type: String,
            enum: ['online', 'busy'],
            default: 'online',
        },
        zoneBusyTitle: {
            type: String,
        },
        zoneBusyDescription: {
            type: String,
        },
        // Rider reward feature when he reached the target
        riderWeeklyTarget: {
            type: Number,
            default: 0,
        },
        riderWeeklyReward: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

zoneSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('zones', zoneSchema);
