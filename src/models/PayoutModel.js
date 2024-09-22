const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;
const shortid = require('shortid');

module.exports = mongoose.model(
    'payouts',
    new Schema(
        {
            autoGenId: {
                type: String,
                default: shortid.generate,
            },
            autoPayoutId: {
                type: String,
            },
            orders: [
                {
                    type: ObjectId,
                    ref: 'orders',
                },
            ],
            transactions: [
                {
                    type: ObjectId,
                    ref: 'transactions',
                },
            ],
            payoutAccount: {
                type: String,
                default: 'shop',
                enum: ['deliveryBoy', 'shop'],
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
            baseCurrency_payoutPaidAmount: {
                type: Number,
                default: 0,
            },
            secondaryCurrency_payoutPaidAmount: {
                type: Number,
                default: 0,
            },
            // baseCurrency_payoutAddRemoveCredit: {
            //     type: Number,
            //     default: 0,
            // },
            // secondaryCurrency_payoutAddRemoveCredit: {
            //     type: Number,
            //     default: 0,
            // },
            payoutStatus: {
                type: String,
                enum: {
                    values: ['paid', 'unpaid', 'revoked', 'overdue'],
                    message: '{VALUE} is not a valid status',
                },
                default: 'unpaid',
            },
            payoutBillingPeriod: {
                From: {
                    type: Date,
                },
                To: {
                    type: Date,
                },
            },
            payoutOverDueDate: {
                type: Date,
            },
            payoutRevokedReason: {
                type: String,
            },
            isPayoutAdjusted: {
                type: Boolean,
                default: false,
            },
            // For exchange rate
            adminExchangeRate: { type: Number },
            shopExchangeRate: { type: Number },
            // BoB feature
            bobReferenceNumber: [
                {
                    type: String,
                },
            ],
        },
        { timestamps: true }
    )
);
