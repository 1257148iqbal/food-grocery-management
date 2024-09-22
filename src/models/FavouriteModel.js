const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const FavoriteSchema = new Schema(
    {
        user: {
            type: ObjectId,
            ref: 'users',
        },
        product: {
            type: ObjectId,
            ref: 'products',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        type: {
            type: String,
            enum: ['product', 'shop'],
        },
    },
    {
        timestamps: true,
        collection: 'favorites',
    }
);

module.exports = mongoose.model('favorites', FavoriteSchema);
