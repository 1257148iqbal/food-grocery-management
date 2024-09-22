const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;
module.exports = mongoose.model(
    'order_cancel_reason',
    new Schema(
        {
            name: {
                type: String,
            },
            type: {
                type: String,
                enum: {
                    values: [
                        'shopCancel',
                        'userRefund',
                        'userCancel',
                        'deliveryBoy',
                        'admin',
                        'butler',
                        'resolve',
                        'subscriptionCancelReason',
                    ],
                    message: '{VALUE} is not a valid cancel type',
                },
            },
            status: {
                type: String,
                default: 'active',
                enum: {
                    values: ['active', 'inactive'],
                    message: '{VALUE} is not a valid status',
                },
            },
            // for sorting by dnd
            sortingOrder: {
                type: Number,
                default: 0,
            },

            deletedAt: {
                type: Date,
                default: null,
            },
        },
        { timestamps: true }
    )
);
