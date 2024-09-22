const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const SubscriptionSchema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
            required: true,
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
        subscriptionDuration: {
            start: { type: Date },
            end: { type: Date },
        },
        subscriptionStatus: {
            type: String,
            enum: ['ongoing', 'expired'],
            default: 'ongoing',
        },
        subscriptionAutoRenew: {
            type: Boolean,
            default: true,
        },
        subscriptionCancelReason: {
            type: String,
        },
        paymentMethod: {
            type: String,
            enum: {
                values: ['cash', 'card', 'wallet'],
                message: '{VALUE} is not a valid paymentMethod',
            },
        },
        paymentStatus: {
            type: String,
            enum: {
                values: ['paid', 'pending'],
                message: '{VALUE} is not a valid paymentStatus',
            },
            default: 'pending',
        },
        transactions: [
            {
                type: ObjectId,
                ref: 'transactions',
            },
        ],
        paidCurrency: {
            type: String,
            enum: ['baseCurrency', 'secondaryCurrency'],
            default: 'baseCurrency',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('subscriptions', SubscriptionSchema);
