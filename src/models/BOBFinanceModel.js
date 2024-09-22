const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;
const shortid = require('shortid');

module.exports = mongoose.model(
    'bobFinance',
    new Schema(
        {
            autoGenId: {
                type: String,
                default: shortid.generate,
            },
            autoTrxId: {
                type: String,
            },
            account: {
                type: String,
                default: 'user',
                enum: ['deliveryBoy', 'shop'],
            },
            type: {
                type: String,
                enum: {
                    values: [
                        'riderSettleCasInHand',
                        'settleRiderPayout',

                        'shopSettleCashInHand',
                        'settleShopPayout',
                    ],
                    message: '{VALUE} is not a valid cancel type',
                },
            },
            amount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_amount: {
                type: Number,
                default: 0,
            },
            status: {
                type: String,
                enum: {
                    values: ['NOT PAID', 'PAID'],
                    message: '{VALUE} is not a valid cancel type',
                },
                default: 'NOT PAID',
            },
            admin: {
                type: ObjectId,
                ref: 'admins',
            },
            shop: {
                type: ObjectId,
                ref: 'shops',
            },
            seller: {
                type: ObjectId,
                ref: 'sellers',
            },
            deliveryBoy: {
                type: ObjectId,
                ref: 'deliveryBoy',
            },
            payout: {
                type: ObjectId,
                ref: 'payouts',
            },
            bobModel: {
                type: String,
                enum: ['C2B', 'B2C'],
                default: 'C2B',
            },
            bobType: {
                type: String,
                enum: ['inward', 'outward'],
                default: 'inward',
            },
            referenceNumber: {
                type: String,
            },
            crmNumber: {
                type: String,
            },
            bobLocation: {
                type: String,
            },
            paidCurrency: {
                type: String,
                enum: ['baseCurrency', 'secondaryCurrency'],
                default: 'baseCurrency',
            },
            riderTip: {
                type: Number,
            },
            secondaryCurrency_riderTip: {
                type: Number,
            },
            riderSeen: {
                type: Boolean,
                default: false,
            },
        },
        { timestamps: true }
    )
);
