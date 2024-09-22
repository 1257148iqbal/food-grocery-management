const mongoose = require('mongoose');
const { GeoLocationSchema } = require('./subSchema');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const ButlerRequestSchema = new Schema(
    {
        userId: {
            type: ObjectId,
            ref: 'users',
        },
        orderType: {
            type: String,
            comment: 'delivery_only, purchase_delivery',
            enum: {
                values: ['delivery_only', 'purchase_delivery'],
                message: '{VALUE} is not a valid orderType',
            },
        },
        paymentMethod: {
            type: String,
            enum: {
                values: ['cash', 'card', 'wallet', 'online'],
                message: '{VALUE} is not a valid paymentMethod',
            },
        },
        selectedPaymentMethod: {
            type: String,
            enum: {
                values: ['cash', 'card'],
                message: '{VALUE} is not a valid selectedPaymentMethod',
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
        receivedAddress: new Schema({
            name: {
                type: String,
            },
            phone_number: {
                type: String,
            },
            address: {
                type: String,
                required: true,
            },
            nickname: {
                type: String,
            },
            apartment: {
                type: String,
            },
            buildingName: {
                type: String,
            },
            latitude: {
                type: Number,
            },
            longitude: {
                type: Number,
            },
            country: {
                type: String,
            },
            state: {
                type: String,
            },
            city: {
                type: String,
            },
            location: GeoLocationSchema,
            instructions: {
                type: String,
            },
            deliveryOptions: {
                type: String,
            },
            addressLabel: {
                type: String,
            },
        }),
        deliveryAddress: new Schema({
            name: {
                type: String,
            },
            phone_number: {
                type: String,
            },
            address: {
                type: String,
                required: true,
            },
            nickname: {
                type: String,
            },
            apartment: {
                type: String,
            },
            buildingName: {
                type: String,
            },
            latitude: {
                type: Number,
            },
            longitude: {
                type: Number,
            },
            country: {
                type: String,
            },
            state: {
                type: String,
            },
            city: {
                type: String,
            },
            location: GeoLocationSchema,
            instructions: {
                type: String,
            },
            deliveryOptions: {
                type: String,
            },
            addressLabel: {
                type: String,
            },
        }),
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
            //Unnecessary  field for Muin bro
            baseCurrency_discount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_discount: {
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
        itemDescription: {
            type: String,
        },
        products: [
            new Schema({
                productName: {
                    type: String,
                },
                productImage: {
                    type: String,
                },
                baseCurrency_perProductPrice: {
                    type: Number,
                },
                secondaryCurrency__perProductPrice: {
                    type: Number,
                },
                baseCurrency_totalProductAmount: {
                    type: Number,
                },
                secondaryCurrency_totalProductAmount: {
                    type: Number,
                },
                quantity: {
                    type: Number,
                },
            }),
        ],
        note: {
            type: String,
        },
        deliveryBoyNote: {
            type: String,
        },
        order_delivery_charge_id: {
            type: ObjectId,
            ref: 'order_delivery_charge',
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
        adminExchangeRate: { type: Number, default: 0 },
        paymentOn: {
            type: String,
            enum: {
                values: ['sender', 'receiver'],
                message: '{VALUE} is not a valid error order type',
            },
            default: 'sender',
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

module.exports = mongoose.model('butlerRequest', ButlerRequestSchema);
