const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const schema = new Schema(
    {
        category: {
            type: ObjectId,
            ref: 'categories',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        type: {
            type: String,
            enum: ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'],
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
        },
        name: {
            type: String,
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
        },
        sortingOrder: {
            type: Number,
            default: 0,
        },
        image: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('shop_categories', schema);
