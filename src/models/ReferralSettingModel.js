const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const ReferralSetting = new Schema(
    {
        sender_referralDiscountType: {
            type: String,
            enum: {
                values: ['fixed', 'percentage'],
                message: '{VALUE} is not a valid discountType',
            },
            default: 'percentage',
            required: true,
        },
        sender_referralDiscount: {
            type: Number,
            required: true,
        },
        sender_referralMinimumOrderValue: {
            type: Number,
            default: 0,
        },
        sender_referralDuration: {
            type: Number,
            default: 0,
        },
        receiver_referralDiscountType: {
            type: String,
            enum: {
                values: ['fixed', 'percentage'],
                message: '{VALUE} is not a valid discountType',
            },
            default: 'percentage',
            required: true,
        },
        receiver_referralDiscount: {
            type: Number,
            required: true,
        },
        receiver_referralMinimumOrderValue: {
            type: Number,
            default: 0,
        },
        receiver_referralDuration: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('referral_setting', ReferralSetting);
