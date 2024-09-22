const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;
module.exports = mongoose.model(
    'chat_reason',
    new Schema(
        {
            question: {
                type: String,
            },
            answer: {
                type: String,
            },
            type: {
                type: String,
                enum: {
                    values: ['accountSupport', 'orderSupport'],
                    message: '{VALUE} is not a valid chat reason type',
                },
            },
            userType: {
                type: String,
                enum: {
                    values: ['user', 'shop'],
                    message: '{VALUE} is not a valid userType',
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
        },
        { timestamps: true }
    )
);
