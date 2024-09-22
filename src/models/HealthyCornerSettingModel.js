const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const HealthyCornerSetting = new Schema(
    {
        suitedFor: [{ type: String }],
        dietContains: [{ type: String }],
        ingredients: [{ type: String }],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('healthyCorner_setting', HealthyCornerSetting);
