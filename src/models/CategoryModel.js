const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        image: {
            type: String,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        type: {
            type: String,
            enum: ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'],
        },
        note: {
            type: String,
        },
        sortingOrder: {
            type: Number,
            default: 0,
        },
        deletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('categories', schema);
