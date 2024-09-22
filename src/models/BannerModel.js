const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bannerSchema = new Schema(
    {
        title: {
            type: String,
        },
        image: {
            type: String,
        },
        status: {
            type: String,
            default: 'active',
            enum: ['active', 'inactive'],
        },
        description: {
            type: String,
        },
        type: {
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
            default: 'home',
        },
        // shop: {
        //     type: Schema.Types.ObjectId,
        //     ref: 'shops',
        // },
        isClickable: {
            type: Boolean,
            default: false,
        },
        clickableUrl: {
            type: String,
        },
        clickType: {
            type: String,
            enum: ['product', 'shop', 'plus', 'link', 'listContainer', null],
            default: null,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'products',
        },
        shopId: {
            type: Schema.Types.ObjectId,
            ref: 'shops',
        },
        listContainerId: {
            type: Schema.Types.ObjectId,
            ref: 'listContainer',
        },
        visibleUserType: {
            type: String,
            enum: ['all', 'plus', 'normal'],
            default: 'all',
        },
        // for sorting by dnd
        sortingOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('banners', bannerSchema);
