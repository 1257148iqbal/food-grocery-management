const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cardSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'users',
        },
        seller: {
            type: Schema.Types.ObjectId,
            ref: 'sellers',
        },

        userType: {
            type: String,
            enum: ['user', 'admin', 'seller'],
        },
        nameOfCard: {
            type: String,
        },
        card_number: {
            type: String,
            required: true,
        },
        cvv: {
            type: String,
            required: true,
        },
        expiry_month: {
            type: String,
            required: true,
        },
        expiry_year: {
            type: String,
            required: true,
        },
        expiryDateString: {
            type: String,
        },
        expiryDate: {
            type: Date,
        },
        currency: {
            type: String,
            required: true,
            default: 'NGN',
        },
        defaultCard: {
            type: Boolean,
            default: false,
        },
        cardType: {
            type: String,
        },
        cardTypeString: {
            type: String,
        },
        security: {
            type: String,
        },
        pins: [String],
        mode: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('cards', cardSchema);
