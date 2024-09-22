const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FilterContainerSchema = new Schema(
    {
        name: {
            type: String,
            require: true,
        },
        deals: [{ type: String }], //"10", "20", "30", "double_menu"
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

module.exports = mongoose.model('filterContainer', FilterContainerSchema);
