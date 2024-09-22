const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const shortid = require('shortid');

const DishSchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
            required: true,
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        image: {
            type: String,
        },
        description: {
            type: String,
        },
        category: {
            type: String,
            enum: ['breakfast', 'lunch', 'dinner', 'snacks'],
            required: true,
        },
        ingredients: [
            {
                type: String,
            },
        ],
        calories: {
            type: Number,
            required: true,
        },
        fat: {
            type: Number,
            required: true,
        },
        fibers: {
            type: Number,
            required: true,
        },
        protein: {
            type: Number,
            required: true,
        },
        portionPercentage: [
            {
                type: Number,
                required: true,
            },
        ],
        // for sorting by dnd
        sortingOrder: {
            type: Number,
            default: 0,
        },

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('dishes', DishSchema);
