const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const dropCharge = new Schema(
    {
        dropPercentage: {
            type: Number,
        },
        dropPercentageType: {
            type: String,
            comment: 'percentage or amount',
            enum: ['percentage', 'amount'],
        },
        deliveryApplicable: {
            type: String,
            enum: ['app', 'seller'],
            required: true,
        },
        seller: {
            type: Schema.Types.ObjectId,
            ref: 'sellers',
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
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('drop_charge', dropCharge);
