const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { String, ObjectId, Number, Date, Boolean } = Schema.Types;
const CouponSchema = new Schema(
    {
        couponName: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        couponType: {
            type: String,
            enum: {
                values: [
                    'global',
                    'individual_user',
                    'individual_store',
                    'custom_coupon',
                    'referral_code',
                ],
                message: '{VALUE} is not a valid couponType',
            },
            default: 'global',
        },
        couponInfluencer: {
            type: ObjectId,
            ref: 'users',
        },
        couponReferralUser: {
            type: ObjectId,
            ref: 'users',
        },
        couponUsers: [
            {
                type: ObjectId,
                ref: 'users',
            },
        ],
        couponShops: [
            {
                type: ObjectId,
                ref: 'shops',
            },
        ],
        couponShopTypes: [
            {
                type: String,
                enum: {
                    values: [
                        'food',
                        'grocery',
                        'pharmacy',
                        'coffee',
                        'flower',
                        'pet',
                        null,
                    ],
                    message: '{VALUE} is not a valid couponShopTypes',
                },
            },
        ],
        couponDiscountType: {
            type: String,
            enum: {
                values: ['fixed', 'percentage'],
                message: '{VALUE} is not a valid discountType',
            },
            default: 'percentage',
        },
        couponValue: {
            type: Number,
            default: 0,
        }, 
      
        couponMaximumDiscountLimit: {
            type: Number,
            default: 0,
        },
        couponMinimumOrderValue: {
            type: Number,
            default: 0,
        },
        couponStatus: {
            type: String,
            enum: {
                values: ['active', 'inactive'],
                message: '{VALUE} is not a valid status',
            },
            default: 'active',
        },
        couponDuration: {
            start: { type: Date },
            end: { type: Date },
        },
        couponUserLimit: { type: Number, default: 0 }, //An user, How much order can place using this coupon
        couponOrderLimit: { type: Number, default: 0 }, //All user, How much order can place using this coupon
        couponAmountLimit: { type: Number, default: 0 }, //All user, How much spent amount using this coupon

        referralCouponUsedBy: {
            type: ObjectId,
            ref: 'users',
        },
        referralCouponUsedOnOrder: {
            type: ObjectId,
            ref: 'orders',
        },
        // For new account count
        couponUsedNewAccount: {
            type: Number,
            default: 0,
        },
        // New user
        onlyForNewUser: { type: Boolean, default: false },
        // Shop pay coupon discount amount
        isShopPayEnabled: { type: Boolean, default: false },
        couponExpiredReason: { type: String },
        maxNumberOfOrdersForNewUsers: { type: Number, default: 0 },

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('coupons', CouponSchema);
