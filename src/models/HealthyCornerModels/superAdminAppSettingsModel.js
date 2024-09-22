const mongoose = require('mongoose')
const Schema = mongoose.Schema

const HealthyCornerAppSettingsSchema = new Schema({
    suitedFor: {
        type: Array,
        required: false
    },
    dietContains: {
        type: Array,
        required: false
    },
    categories: {
        type: Array,
        required: false
    }

})


module.exports = mongoose.model('healthy_corner_app_settings', HealthyCornerAppSettingsSchema);
