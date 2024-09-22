const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const shortid = require('shortid');

const productSchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        barcodeNumber: {
            type: String,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            // required: true,
        },
        unit: {
            type: String,
        },
        unitQuantity: {
            type: Number,
        },
        delivery: {
            type: String,
            enum: ['drop', 'pickup', 'both'],
            default: 'drop',
        },
        type: {
            type: String,
            enum: ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'],
            required: true,
        },

        foodType: {
            type: String,
            // enum: ['veg', 'non-veg'],
            // default: null,
        },

        freeDelivery: {
            type: Boolean,
            default: false,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isFastDelivery: {
            type: Boolean,
            default: false,
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
        attributes: [
            {
                type: ObjectId,
                ref: 'attributes',
                require: false,
            },
        ],

        // attributes: [
        //     new Schema(
        //         {
        //             name: {
        //                 type: String,
        //                 required: true,
        //             },
        //             required: {
        //                 type: Boolean,
        //                 default: false,
        //             },
        //             select: {
        //                 type: String,
        //                 enum: ['single', 'multiple'],
        //                 default: 'single',
        //             },
        //             minimumRequiredAttribute: {
        //                 type: Number,
        //                 default: 0,
        //             },
        //             maximumRequiredAttribute: {
        //                 type: Number,
        //                 default: 0,
        //             },
        //             items: [
        //                 new Schema(
        //                     {
        //                         name: {
        //                             type: String,
        //                             required: true,
        //                         },
        //                         extraPrice: {
        //                             type: Number,
        //                             required: true,
        //                         },
        //                     },
        //                     { _id: true }
        //                 ),
        //             ],
        //         },
        //         { _id: true }
        //     ),
        // ],

        addons: [
            {
                type: ObjectId,
                ref: 'products',
            },
        ],

        // orderQuantityMinimum: {
        //     type: Number,
        //     default: 1,
        // },
        images: [String],
        description: {
            type: String,
        },
        category: {
            type: ObjectId,
            ref: 'categories',
            required: true,
        },
        subCategory: {
            type: ObjectId,
            ref: 'sub_categories',
            default: null,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },

        seoTitle: {
            type: String,
        },
        review: {
            type: String,
        },
        rate: {
            type: String,
        },
        rating: {
            type: Number,
        },
        seoDescription: {
            type: String,
        },
        favoriteUpdateTime: {
            type: Date,
        },
        productVisibility: {
            type: Boolean,
            default: true,
        },
        note: {
            type: String,
        },
        deletedAt: {
            type: Date,
            default: null,
        },

        // Marketing System
        marketing: [
            {
                type: ObjectId,
                ref: 'marketing',
            },
        ],

        // Reward System
        rewardCategory: {
            type: ObjectId,
            // ref: 'RewardCategory',
        },
        rewardBundle: { type: Number }, //percentage
        reward: {
            amount: { type: Number },
            points: { type: Number },
        },

        // Deal System
        discountPercentage: {
            type: Number,
            default: 0,
        },
        discountPrice: {
            type: Number,
            default: 0,
        },
        discount: {
            type: Number,
            default: 0,
        },

        // Dietary
        dietary: [
            {
                type: String,
                enum: {
                    values: [
                        'gluten-free',
                        'low-cal',
                        'vegetarian',
                        'vegan',
                        'glue-free',
                        'keto',
                        'lactose-free',
                        'high-protein',
                    ],
                    message: '{VALUE} is not a valid dietary',
                },
            },
        ],

        // // Maximum product quantity
        // maximumQuantity: {
        //     type: Number,
        //     default: 0,
        // },
        // for sorting by dnd
        sortingOrder: {
            type: Number,
            default: 0,
        },
        // Stock feature
        isStockEnabled: {
            type: Boolean,
            default: false,
        },
        stockQuantity: {
            type: Number,
            default: 1,
        },
        // For notify rider
        isDrinkIncluded: {
            type: Boolean,
            default: false,
        },
        // Order quantity limit per Item
        orderQuantityLimit: {
            type: Number,
            default: 0,
        },
        // Global product feature
        globalProduct: {
            type: ObjectId,
            ref: 'globalProduct',
        },
        nutritionServingSize: {
            type: Number,
        },
        nutritionServingUnit: {
            type: String,
        },
        nutritionPerUnit: {
            type: Number,
        },
        nutritionCalories: {
            type: Number,
        },
        nutrition: [
            {
                name: {
                    type: String,
                },
                unit: {
                    type: String,
                },
                unitQuantity: {
                    type: Number,
                },
            },
        ],
        storedTemperature: {
            type: Number,
        },
        productType: {
            type: String,
            enum: ['meat', 'chicken', 'fish', 'vegetarian', 'other'],
        },
        portionPrices: [
            {
                size: { type: String, required: true },
                unit: { type: String, required: true },
                price: { type: Number, required: true },
                discount:{type:Number},
                discountPrice:{type:Number},
                secondaryPrice: {type:Number},
                secondaryDiscount:{type:Number},
                secondaryDiscountPrice:{type:Number}
            },
        ],
        pricePerUnit: {
            quantity: { type: Number },
            unit: { type: String },
            price: { type: Number },
        },
        priceType: {
            type: String,
            enum: ['portionPrices', 'pricePerUnit', 'price'],
        },
        excelSortedOrderIndex: {
            type: Number,
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to generate autoGenId before saving
// productSchema.pre('save', function (next) {
//     if (!this.barcodeNumber) {
//         const timestamp = Date.now().toString().slice(-7);
//         const randomPart = Math.floor(10000 + Math.random() * 90000).toString();
//         this.barcodeNumber = 'P' + timestamp + randomPart;
//     }

//     next();
// });

module.exports = mongoose.model('products', productSchema);
