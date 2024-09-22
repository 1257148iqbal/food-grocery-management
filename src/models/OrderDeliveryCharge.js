const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;
module.exports = mongoose.model(
    'order_delivery_charge',
    new Schema(
        {
            deliveryFee: {
                type: Number,
            },
            secondaryDeliveryFee: {
                type: Number,
            },
            deliveryBoyFee: {
                type: Number,
            },
            dropFee: {
                type: Number,
            },
            distance: {
                type: Number,
            },
            dropChargeId: {
                type: ObjectId,
                ref: 'global_drop_charge',
            },
            selectedRangeItem: {
                type: ObjectId,
            },
            userLocation: [Number],
            shopLocation: [Number],
            receiveLocation: [Number],
            deliveryLocation: [Number],
            shop: {
                type: ObjectId,
                ref: 'shop',
            },
            seller: {
                type: ObjectId,
                ref: 'sellers',
            },
            shopCut: {
                type: Number,
            },
            dropCut: {
                type: Number,
            },
            // For store free delivery charge also
            deliveryFeeWithFreeDelivery: {
                type: Number,
            },
            shopLossForFreeDelivery: {
                type: Number,
            },
            dropLossForFreeDelivery: {
                type: Number,
            },
            // Subscription feature
            subscriptionDeliveryFee: {
                type: Number,
            },
        },
        { timestamps: true }
    )
);
