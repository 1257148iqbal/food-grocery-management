const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const shortid = require('shortid');

const attributeSchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        name: {
            type: String,
            required: true,
        },
        required: {
            type: Boolean,
            default: false,
        },
        select: {
            type: String,
            enum: ['single', 'multiple'],
            default: 'single',
        },
        minimumRequiredAttribute: {
            type: Number,
            default: 0,
        },
        maximumRequiredAttribute: {
            type: Number,
            default: 0,
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
            required: true,
        },
        items: [
            {
                type: ObjectId,
                ref: 'attributeItems',
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('attributes', attributeSchema);
