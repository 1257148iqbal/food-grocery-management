const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const MarketingSchema = new Schema(
    {
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        shopType: {
            type: String,
            enum: ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'],
        },
        type: {
            type: String,
            enum: {
                values: [
                    'percentage',
                    'double_menu',
                    'free_delivery',
                    'reward',
                    'featured',
                    'punch_marketing',
                ],
                message: '{VALUE} is not a valid type',
            },
        },
        creatorType: {
            type: String,
            enum: {
                values: ['admin', 'shop'],
                message: '{VALUE} is not a valid type',
            },
        },
        products: [
            {
                product: {
                    type: ObjectId,
                    ref: 'products',
                },
                discountPercentage: {
                    type: Number,
                    default: 0,
                },
                discount: {
                    type: Number,
                    default: 0,
                },
                discountPrice: {
                    type: Number,
                    default: 0,
                },
            },
        ],
        duration: {
            start: { type: Date },
            end: { type: Date },
        },
        spendLimit: { type: Number },
        isActive: { type: Boolean, default: false },
        status: {
            type: String,
            enum: {
                values: ['active', 'inactive'],
                message: '{VALUE} is not a valid type',
            },
            default: 'active',
        },
        // Nazib requirement
        itemSelectionType: {
            type: String,
            enum: {
                values: ['single', 'multiple'],
                message: '{VALUE} is not a valid type',
            },
            default: 'single',
        },
        discountPercentages: [{ type: Number }], //In this marketing all discount percentages
        discountPercentagesForPlusUser: [{ type: Number }], // All discount percentages for plus user
        discountPercentagesForNormalUser: [{ type: Number }], // All discount percentages for lyxa user
        // featured system
        featuredDuration: { type: Number },
        featuredAmount: { type: Number },
        // For store reward amount
        marketingRedeemReward: {
            points: { type: Number },
            amount: { type: Number },
        },
        // Store last pause time
        marketingPausedAt: {
            type: Date,
            default: null,
        },
        marketingDeletedType: {
            type: String,
            enum: {
                values: ['after_expired', 'before_expired'],
                message: '{VALUE} is not a valid type',
            },
        },
        // Subscription feature
        onlyForSubscriber: { type: Boolean, default: false },
        // Punch marketing feature
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
        // set max discount per order
        maxDiscountPerOrder: {
            type: Number,
            default: 0,
        },

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('marketing', MarketingSchema);
