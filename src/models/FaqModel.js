const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Faq = new Schema(
    {
        question: {
            type: String,
        },
        ans: {
            type: String,
        },
        type: {
            type: String,
            enum: ['user', 'shop', 'deliveryBoy'],
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        // for sorting by dnd
        sortingOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('apps_faq', Faq);
