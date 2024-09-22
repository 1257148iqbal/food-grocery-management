const mongoose = require('mongoose')
const Schema = mongoose.Schema

const MealPlansAppSettingsSchema = new Schema({
    name: {
        type: String,
        required: false
    },
    photo: {
        type: String,
        required: false
    },
    short_description: {
        type: String,
        required: false
    },
    full_description: {
        type: String,
        required: false
    },
    suited_for: {
        type: Array,
        required: false
    },
    meal_contains: {
        type: Array,
        required: false
    }

})


module.exports = mongoose.model('mealPlans', MealPlansAppSettingsSchema);
