const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserAppScreenSchema = new Schema(
    {
        screen: {
            type: String,
            enum: [
                'home',
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ],
            require: true,
        },
        title: {
            type: String,
            require: true,
        },
        shopType: {
            type: String,
            enum: [
                'all',
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ],
        },
        section: {
            type: String,
            enum: [
                'store-punches',
                'nearby-restaurant',
                'nearby-grocery',
                'nearby-pharmacy',
                'discount',
                'free-delivery',
                'crazy-offer-shops',
                'order-again',
                'featured',
                'love',
            ],
            require: true,
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

module.exports = mongoose.model('userAppScreen', UserAppScreenSchema);
