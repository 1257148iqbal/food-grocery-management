const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const UserPunchMarketingSchema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        marketing: {
            type: ObjectId,
            ref: 'marketing',
        },
        punchTargetOrders: { type: Number },
        punchMinimumOrderValue: { type: Number },
        punchDayLimit: { type: Number },
        punchCouponDiscountType: {
            type: String,
            enum: {
                values: ['fixed', 'percentage'],
                message: '{VALUE} is not a valid discountType',
            },
            default: 'percentage',
        },
        punchCouponValue: { type: Number },
        punchCouponDuration: { type: Number },

        completedOrders: { type: Number, default: 0 },
        expiredDate: { type: Date },
        status: {
            type: String,
            enum: {
                values: ['ongoing', 'completed', 'applied', 'expired'],
                message: '{VALUE} is not a valid type',
            },
            default: 'ongoing',
        },
        // For getting amount spent
        appliedAt: {
            type: Date,
            default: null,
        },
        baseCurrency_punchMarketingDiscountAmount: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_punchMarketingDiscountAmount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    'user_punch_marketing',
    UserPunchMarketingSchema
);
