const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const shortid = require('shortid');

const attributeItemSchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        name: {
            type: String,
            required: true,
        },
        extraPrice: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('attributeItems', attributeItemSchema);
