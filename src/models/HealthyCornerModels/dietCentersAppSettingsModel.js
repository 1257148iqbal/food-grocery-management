const mongoose = require('mongoose')
const Schema = mongoose.Schema

const DietCenterAppSettingsSchema = new Schema({
    ingredients: {
        type: Array,
        required: false
    }

})


module.exports = mongoose.model('diet_center_app_settings', DietCenterAppSettingsSchema);