const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ListContainerSchema = new Schema(
    {
        name: {
            type: String,
            require: true,
        },
        image: {
            type: String,
        },
        banner: {
            type: String,
        },
        type: [
            {
                type: String,
                enum: ['deal', 'tag', 'shop'],
            },
        ],
        deals: [{ type: String }],
        tags: [
            {
                type: Schema.Types.ObjectId,
                ref: 'tags-cuisines',
            },
        ],
        shops: [
            {
                type: Schema.Types.ObjectId,
                ref: 'shops',
            },
        ],
        shopType: {
            type: String,
            enum: ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'],
        },
        status: {
            type: String,
            default: 'active',
            enum: ['active', 'inactive'],
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

module.exports = mongoose.model('listContainer', ListContainerSchema);
