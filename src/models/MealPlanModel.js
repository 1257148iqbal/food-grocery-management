const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

const MealPlanSchema = new Schema(
    {
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
        selectedMealPlan: {
            type: ObjectId,
            ref: 'global_meal_plans',
            required: true,
        },
        selectedDishes: [
            {
                type: ObjectId,
                ref: 'dishes',
            },
        ],
        packages: [
            {
                packageName: { type: String },
                packageRanges: [
                    {
                        title: { type: String },
                        calorieRange: {
                            from: { type: Number },
                            to: { type: Number },
                        },
                        price: { type: Number },
                        categories: [
                            {
                                categoryName: { type: String },
                                dishes: [
                                    {
                                        dish: {
                                            type: ObjectId,
                                            ref: 'dishes',
                                        },
                                        portionPercentageForPackage: [
                                            // we use this portion percentage for this package, don't use dish portion percentage
                                            { type: Number },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('meal_plans', MealPlanSchema);
