const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const shortid = require('shortid');

module.exports = mongoose.model(
    'globalProduct',
    new Schema(
        {
            autoGenId: {
                type: String,
                default: shortid.generate,
            },
            barcodeNumber: {
                type: String,
                index: true,
                default: '0000000',
            },
            name: {
                type: String,
                required: true,
                index: true,
            },
            type: {
                type: String,
                enum: ['grocery', 'pharmacy'],
                required: true,
                index: true,
            },
            images: [String],
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
            storedTemperature: {
                type: Number,
            },
            productType: {
                type: String,
                enum: ['meat', 'chicken', 'fish', 'vegetarian', 'other'],
            },
            status: {
                type: String,
                enum: ['active', 'inactive'],
                default: 'active',
            },
            excelSortedOrderIndex: {
                type: Number,
            },
        },
        {
            timestamps: true,
        }
    )
);
