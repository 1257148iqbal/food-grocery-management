const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const SubscriptionSetting = new Schema(
    {
        // title: {
        //     type: String,
        //     enum: ['basic', 'premium', 'unlimited'],
        //     default: 'basic',
        // },
        // description: {
        //     type: String,
        // },
        subscriptionPackage: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'monthly',
        },
        subscriptionFee: {
            type: Number,
            required: true,
        },
        // benefits: [
        //     {
        //         type: String,
        //         enum: ['free_delivery', 'dual_marketing'],
        //     },
        // ],
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('subscription_setting', SubscriptionSetting);
