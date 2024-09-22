const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

const GlobalMealPlanSchema = new Schema(
    {
        name: {
            type: String,
        },
        image: {
            type: String,
        },
        shortDescription: {
            type: String,
        },
        fullDescription: {
            type: String,
        },
        suitedFor: [{ type: String }],
        dietContains: [{ type: String }],

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('global_meal_plans', GlobalMealPlanSchema);
