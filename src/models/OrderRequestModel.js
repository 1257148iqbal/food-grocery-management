const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const orderRequestSchema = new Schema(
    {
        userId: {
            type: ObjectId,
            ref: 'users',
        },
        orderType: {
            type: String,
            comment: 'food,',
            enum: {
                values: [
                    'food',
                    'grocery',
                    'pharmacy',
                    'coffee',
                    'flower',
                    'pet',
                ],
                message: '{VALUE} is not a valid orderType',
            },
        },
        orderDeliveryAddressId: {
            type: ObjectId,
            ref: 'address',
        },
        products: [
            new Schema({
                product: {
                    type: ObjectId,
                    ref: 'products',
                    required: true,
                },
                perProduct: {
                    type: Number,
                },
                discount: {
                    type: Number,
                },
                totalProductAmount: {
                    type: Number,
                },
                totalDiscount: {
                    type: Number,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                attributes: [],
                isDoubleDeal: {
                    type: Boolean,
                    default: false,
                },
                // Special Instruction
                productSpecialInstruction: {
                    type: String,
                },
                reward: {
                    points: { type: Number },
                    amount: { type: Number },
                },
                marketingId: {
                    type: ObjectId,
                    ref: 'marketing',
                },
                //Store who added this product when group cart
                owner: {
                    type: ObjectId,
                    ref: 'users',
                },
            }),
        ],
        deliveryBoyNote: {
            type: String,
        },
        order_delivery_charge_id: {
            type: ObjectId,
            ref: 'order_delivery_charge',
        },
        summary: {
            baseCurrency_productAmount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_productAmount: {
                type: Number,
                default: 0,
            },
            baseCurrency_riderFee: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_riderFee: {
                type: Number,
                default: 0,
            },
            baseCurrency_totalAmount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_totalAmount: {
                type: Number,
                default: 0,
            },
            baseCurrency_discount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_discount: {
                type: Number,
                default: 0,
            },
            baseCurrency_vat: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_vat: {
                type: Number,
                default: 0,
            },
            baseCurrency_wallet: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_wallet: {
                type: Number,
                default: 0,
            },
            baseCurrency_card: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_card: {
                type: Number,
                default: 0,
            },
            baseCurrency_cash: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_cash: {
                type: Number,
                default: 0,
            },
            reward: {
                points: { type: Number, default: 0 },
                baseCurrency_amount: { type: Number, default: 0 },
                secondaryCurrency_amount: { type: Number, default: 0 },
            },
            baseCurrency_doubleMenuItemPrice: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_doubleMenuItemPrice: {
                type: Number,
                default: 0,
            },
            baseCurrency_riderTip: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_riderTip: {
                type: Number,
                default: 0,
            },
            baseCurrency_couponDiscountAmount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_couponDiscountAmount: {
                type: Number,
                default: 0,
            },
            baseCurrency_punchMarketingDiscountAmount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_punchMarketingDiscountAmount: {
                type: Number,
                default: 0,
            },
            // For store free delivery charge also
            baseCurrency_riderFeeWithFreeDelivery: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_riderFeeWithFreeDelivery: {
                type: Number,
                default: 0,
            },
            // For adjust butler purchase and delivery product amount
            // baseCurrency_butlerAdjustedAmount: {
            //     type: Number,
            //     default: 0,
            // },
            // secondaryCurrency_butlerAdjustedAmount: {
            //     type: Number,
            //     default: 0,
            // },
        },
        paymentMethod: {
            type: String,
            enum: {
                values: ['cash', 'card', 'wallet', 'online'],
                message: '{VALUE} is not a valid paymentMethod',
            },
        },
        pos: {
            type: String,
            enum: {
                values: ['yes', 'no'],
                message: '{VALUE} is not a valid selectPos',
            },
            default: 'no',
        },
        type: {
            type: String,
            num: {
                values: ['now', 'schedule'],
                message: '{VALUE} is not a valid type',
            },
        },
        scheduleDate: {
            type: Date,
        },
        rewardPoints: { type: Number, default: 0 },
        specialInstruction: {
            type: String,
        },
        cartId: {
            type: ObjectId,
            ref: 'carts',
        },
        creatorSummary: {
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
        creatorRewardPoints: {
            type: Number,
        },
        couponId: {
            type: ObjectId,
            ref: 'coupons',
        },
        adminExchangeRate: { type: Number, default: 0 },
        shopExchangeRate: { type: Number, default: 0 },
        baseCurrency_pendingSubscriptionFee: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_pendingSubscriptionFee: {
            type: Number,
            default: 0,
        },
        selectedPaymentMethod: {
            type: String,
            enum: {
                values: ['cash', 'card'],
                message: '{VALUE} is not a valid selectedPaymentMethod',
            },
        },
        areebaCard: {
            orderId: { type: String },
            transactionId: { type: String },
            token: { type: String },
        },
        // redirectHtml: { type: String },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('orderRequest', orderRequestSchema);
