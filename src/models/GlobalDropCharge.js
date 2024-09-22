const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const global_drop_charge = new Schema(
    {
        dropPercentage: {
            type: Number,
        },
        dropPercentageType: {
            type: String,
            comment: 'percentage or amount',
            enum: ['percentage', 'amount'],
        },
        deliveryRange: [
            new Schema({
                from: {
                    type: Number,
                },
                to: {
                    type: Number,
                },
                charge: {
                    type: Number,
                },
                deliveryPersonCut: {
                    type: Number,
                },
            }),
        ],
        deliveryRangeButler: [
            new Schema({
                from: {
                    type: Number,
                },
                to: {
                    type: Number,
                },
                charge: {
                    type: Number,
                },
                deliveryPersonCut: {
                    type: Number,
                },
            }),
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('global_drop_charge', global_drop_charge);
