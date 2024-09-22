const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
    {
        name: {
            type: String,
        },
        type: {
            type: String,
            enum: ['pharmacy', 'grocery', 'restaurant'],
        },
        option: {
            type: String,
            enum: ['double_menu', 'free_delivery', 'percentage', 'others'],
        },
        status: {
            type: String,
            default: 'active',
            enum: ['active', 'inactive'],
        },
        percentage: {
            type: Number,
        },
        image: {
            type: String,
        },
        tag: {
            type: Schema.Types.ObjectId,
            ref: 'tags',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('deals', schema);
