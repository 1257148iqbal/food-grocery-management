const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const service_fee = new Schema(
    {
        serviceFee: {
            type: Number,
            default: 0
        },
        serviceFeeType: {
            type: String,
            comment: 'percentage or amount',
            enum: ['percentage', 'amount'],
            default: 'percentage'
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('service_fee', service_fee);
