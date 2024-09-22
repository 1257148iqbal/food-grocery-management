const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const CartPaymentRequestSchema = new Schema(
    {
        userId: {
            type: ObjectId,
            ref: 'users',
        },
        cartId: {
            type: ObjectId,
            ref: 'carts',
        },
        shopId: {
            type: ObjectId,
            ref: 'shops',
        },
        summary: {
            baseCurrency_productAmount: {
                type: Number,
            },
            secondaryCurrency_productAmount: {
                type: Number,
            },
            baseCurrency_riderFee: {
                type: Number,
            },
            secondaryCurrency_riderFee: {
                type: Number,
            },
            baseCurrency_totalAmount: {
                type: Number,
            },
            secondaryCurrency_totalAmount: {
                type: Number,
            },
            baseCurrency_discount: {
                type: Number,
            },
            secondaryCurrency_discount: {
                type: Number,
            },
            baseCurrency_vat: {
                type: Number,
            },
            secondaryCurrency_vat: {
                type: Number,
            },
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
            reward: {
                points: { type: Number },
                baseCurrency_amount: { type: Number },
                secondaryCurrency_amount: { type: Number },
            },
            baseCurrency_doubleMenuItemPrice: {
                type: Number,
            },
            secondaryCurrency_doubleMenuItemPrice: {
                type: Number,
            },
            baseCurrency_riderTip: {
                type: Number,
            },
            secondaryCurrency_riderTip: {
                type: Number,
            },
            baseCurrency_couponDiscountAmount: {
                type: Number,
            },
            secondaryCurrency_couponDiscountAmount: {
                type: Number,
            },
        },
        paymentMethod: {
            type: String,
            enum: {
                values: ['cash', 'card', 'wallet', 'online'],
                message: '{VALUE} is not a valid paymentMethod',
            },
        },
        rewardPoints: {
            type: Number,
        },
        shopExchangeRate: { type: Number, default: 0 },
        adminExchangeRate: { type: Number, default: 0 },
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

module.exports = mongoose.model('cartPaymentRequest', CartPaymentRequestSchema);
