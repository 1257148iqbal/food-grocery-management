const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const mongoosePaginate = require('mongoose-paginate-v2');

const schema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
            required: true,
        },
        product: {
            type: ObjectId,
            ref: 'products',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        deliveryBoy: {
            type: ObjectId,
            ref: 'deliveryBoy',
        },
        order: {
            type: ObjectId,
            ref: 'orders',
        },
        butler: {
            type: ObjectId,
            ref: 'butlers',
        },
        rating: {
            type: Number,
            required: true,
            enum: {
                values: [1, 2, 3, 4, 5],
                message: '{VALUE} is not a valid status',
            },
            comment: "'1 = Bad', '2 = Good', '3 = Very Good', '4 = Excellent'",
        },
        reviewDes: {
            type: String,
        },
        reviewTags: [{ type: String }],
        type: {
            type: String,
            enum: ['shop', 'deliveryBoy'],
            required: true,
        },
        reviewVisibility: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);
schema.plugin(mongoosePaginate);
module.exports = mongoose.model('reviews', schema);
