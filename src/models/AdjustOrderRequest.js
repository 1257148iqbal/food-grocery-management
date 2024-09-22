const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId, Boolean } = Schema.Types;

const AdjustOrderRequestSchema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
        },
        order: {
            type: ObjectId,
            ref: 'orders',
        },
        suggestedProducts: [
            {
                product: {
                    type: ObjectId,
                    ref: 'products',
                },
                quantity: {
                    type: Number,
                },
                attributes: [],
                productSpecialInstruction: {
                    type: String,
                },
            },
        ],
        replacedProducts: [
            {
                product: {
                    type: ObjectId,
                    ref: 'products',
                },
                quantity: {
                    type: Number,
                },
                attributes: [],
                productSpecialInstruction: {
                    type: String,
                },
                note: {
                    type: String,
                },
            },
        ],
        adjustmentReason: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted'],
            default: 'pending',
        },
        adjustedBy: {
            type: String,
            enum: ['admin', 'shop'],
            default: 'shop',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    'adjustment_order_request',
    AdjustOrderRequestSchema
);
