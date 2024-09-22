const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const RewardCategorySchema = new Schema({
    name: { type: String },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    sortingOrder: {
        type: Number,
    },
});

const RewardSetting = new Schema(
    {
        rewardCategory: [RewardCategorySchema],
        rewardBundle: [Number],
        getReward: {
            amount: { type: Number },
            points: { type: Number },
        },
        redeemReward: {
            points: { type: Number },
            amount: { type: Number },
        },
        adminCutForReward: { type: Number }, //percentage
        expiration_period: { type: Number },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('reward_setting', RewardSetting);
