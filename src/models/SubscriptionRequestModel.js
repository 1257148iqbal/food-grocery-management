const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const SubscriptionRequestSchema = new Schema(
    {
        userId: {
            type: ObjectId,
            ref: 'users',
        },
        subscriptionPackage: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'monthly',
        },
        baseCurrency_subscriptionFee: {
            type: Number,
            required: true,
        },
        secondaryCurrency_subscriptionFee: {
            type: Number,
            required: true,
        },
        summary: {
            baseCurrency_wallet: {
                type: Number,
            },
            secondaryCurrency_wallet: {
                type: Number,
            },
            baseCurrency_card: {
                type: Number,
            },
            secondaryCurrency_card: {
                type: Number,
            },
            baseCurrency_cash: {
                type: Number,
            },
            secondaryCurrency_cash: {
                type: Number,
            },
        },
        paymentMethod: {
            type: String,
            enum: {
                values: ['cash', 'card', 'wallet'],
                message: '{VALUE} is not a valid paymentMethod',
            },
        },
        areebaCard: {
            orderId: { type: String },
            transactionId: { type: String },
            token: { type: String },
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    'subscriptionRequest',
    SubscriptionRequestSchema
);
