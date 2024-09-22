const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

const cardSchema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
        },
        orderId: {
            type: String,
        },
        sessionId: {
            type: String,
        },
        currency: {
            type: String,
            default: 'USD',
        },
        brand: {
            type: String,
        },
        expiry: {
            type: String,
        },
        fundingMethod: {
            type: String,
        },
        nameOnCard: {
            type: String,
        },
        number: {
            type: String,
        },
        scheme: {
            type: String,
        },
        token: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'active'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('areebaCard', cardSchema);
