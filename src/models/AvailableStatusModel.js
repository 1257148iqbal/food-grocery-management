const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

const AvailableSchema = new Schema(
    {
        seller: {
            type: ObjectId,
            require: true,
            ref: 'sellers',
        },
        shop: {
            type: ObjectId,
            require: true,
            ref: 'shops',
        },
        user: {
            type: ObjectId,
            require: true,
            ref: 'users',
        },
        deliveryBoy: {
            type: ObjectId,
            require: true,
            ref: 'deliveryBoys',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('availableStatus', AvailableSchema);
