const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TagCuisineSchema = new Schema(
    {
        name: {
            type: String,
            require: true,
        },
        image: {
            type: String,
        },
        type: {
            type: String,
            default: 'tag',
            enum: ['cuisine', 'tag'],
        },
        shopType: {
            type: String,
            enum: [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ],
        },
        status: {
            type: String,
            default: 'active',
            enum: ['active', 'inactive'],
        },
        visibility: {
            type: Boolean,
            default: true,
        },

        sortingOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('tags-cuisines', TagCuisineSchema);
