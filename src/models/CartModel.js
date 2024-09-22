const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;
const { uuid } = require('uuidv4');

const CartSchema = new Schema(
    {
        name: {
            type: String,
        },
        image: {
            type: String,
        },
        creator: {
            type: ObjectId,
            ref: 'users',
            required: true,
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
            required: true,
        },
        cartType: {
            type: String,
            enum: {
                values: ['individual', 'group'],
                message: '{VALUE} is not a valid cart type',
            },
            default: 'individual',
        },
        cartStatus: {
            type: String,
            enum: {
                values: ['lock', 'unlock'],
                message: '{VALUE} is not a valid cart status',
            },
            default: 'unlock',
        },
        cartItems: [
            {
                user: {
                    type: ObjectId,
                    ref: 'users',
                },
                products: [
                    {
                        product: {
                            type: ObjectId,
                            ref: 'products',
                        },
                        quantity: {
                            type: Number,
                        },
                        selectedAttributes: [],
                        // Special Instruction
                        productSpecialInstruction: {
                            type: String,
                        },
                        rewardApplied: {
                            type: Boolean,
                            default: false,
                        },
                        productIndex: {
                            type: Number,
                        },
                        portionId:{
                            type: String, 
                            default : uuid()

                        },
                        portionUnit:{
                            type:String,
                        },
                        portionSize:{
                            type:String
                        }
                    },
                ],
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
                rewardPoints: {
                    type: Number,
                },
                paymentMethod: {
                    type: String,
                    enum: {
                        values: ['cash', 'card', 'wallet', 'online'],
                        message: '{VALUE} is not a valid paymentMethod',
                    },
                },
                isPaid: {
                    type: Boolean,
                    default: false,
                },
                isReady: {
                    type: Boolean,
                    default: false,
                },
                // Store card info for taking money after delivered
                cardId: {
                    type: ObjectId,
                    ref: 'cards',
                },
                cardTypeString: {
                    type: String,
                },
                // Schedule feature
                scheduleDate: {
                    type: Date,
                },
                // Areeba payment gateway integration
                areebaCard: {
                    orderId: {
                        type: String,
                    },
                    transactionId: {
                        type: String,
                    },
                },
            },
        ],
        deliveryAddress: {
            type: ObjectId,
            ref: 'address',
        },
        orderDeadline: {
            date: {
                type: Date,
            },
            orderPlaceType: {
                type: String,
                enum: {
                    values: ['manually', 'automatic'],
                    message: '{VALUE} is not a valid order place type',
                },
            },
        },
        paymentPreferences: {
            type: String,
            enum: {
                values: ['equally', 'pay_for_themselves', 'pay_for_everyone'],
                message: '{VALUE} is not a valid cart status',
            },
        },
        deliveryFeePreferences: {
            type: String,
            enum: {
                values: ['equally', 'pay_for_everyone'],
                message: '{VALUE} is not a valid cart status',
            },
        },
        maxAmountPerGuest: {
            type: Number,
            default: 0,
        },
        blockList: [
            {
                type: ObjectId,
                ref: 'users',
            },
        ],
        transactionHistory: [
            {
                type: ObjectId,
                ref: 'transactions',
            },
        ],
        // Special Instruction
        specialInstruction: {
            type: Boolean,
            default: false,
        },
        // Reflect global coupon discount amount and rider tip
        cartRiderTip: {
            type: Number,
            default: 0,
        },
        cartCouponDiscountAmount: {
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

module.exports = mongoose.model('carts', CartSchema);
