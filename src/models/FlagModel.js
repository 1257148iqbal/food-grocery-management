const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
    {
        comment: {
            type: String,
            require: true,
        },
        type: {
            type: String,
            require: true,
            enum: {
                values: [
                    'user',
                    'shop',
                    'delivery',
                    'refused',
                    'auto',
                    'delay',
                ],
                message: '{VALUE} is not a valid flag type',
            },
        },
        flaggedType: {
            type: String,
            require: true,
            enum: {
                values: [
                    'cancelled',
                    'replacement',
                    'refunded',
                    'late',
                    'normal',
                ],
                message: '{VALUE} is not a valid flag type',
            },
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'users',
        },
        shop: {
            type: Schema.Types.ObjectId,
            ref: 'shops',
        },
        delivery: {
            type: Schema.Types.ObjectId,
            ref: 'deliveryBoy',
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'orders',
        },
        butlerId: {
            type: Schema.Types.ObjectId,
            ref: 'butlers',
        },
        isRefused: {
            type: Schema.Types.Boolean,
            default: false,
        },
        isAutomatic: {
            type: Schema.Types.Boolean,
            default: false,
        },
        isDelay: {
            type: Schema.Types.Boolean,
            default: false,
        },
        isResolved: {
            type: Schema.Types.Boolean,
            default: false,
        },
        // Operations feature
        flaggedReason: {
            type: String,
            enum: {
                values: ['missing-item', 'wrong-item', 'others'],
                message: '{VALUE} is not a valid flagged type',
            },
        },
        otherReason: {
            type: String,
            require: true,
        },
        replacement: {
            type: String,
            enum: {
                values: ['with', 'without'],
                message: '{VALUE} is not a valid replacement',
            },
        },
        refund: {
            type: String,
            enum: {
                values: ['with', 'without'],
                message: '{VALUE} is not a valid refund',
            },
        },
        // For show order details replacement info in flag
        productsDetails: [],
        replacementAmount: {
            baseCurrency_shopReplacement: { type: Number },
            secondaryCurrency_shopReplacement: { type: Number },
            baseCurrency_adminReplacement: { type: Number },
            secondaryCurrency_adminReplacement: { type: Number },
        },
        replacementOrderDeliveryInfo: {
            deliveryType: {
                type: String,
                enum: {
                    values: ['shop-customer', 'shop-customer-shop'],
                    message:
                        '{VALUE} is not a valid replacement order deliveryType',
                },
            },
            baseCurrency_deliveryFee: { type: Number },
            secondaryCurrency_deliveryFee: { type: Number },
            baseCurrency_deliveryVat: { type: Number },
            secondaryCurrency_deliveryVat: { type: Number },
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('flags', schema);
