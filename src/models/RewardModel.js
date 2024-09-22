const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const shortid = require('shortid');

const rewardSchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        rewardType: {
            type: String,
            default: 'riderWeeklyReward',
            enum: ['riderWeeklyReward', 'salesManagerMonthlyReward'],
        },
        admin: {
            type: ObjectId,
            ref: 'admins',
        },
        deliveryBoy: {
            type: ObjectId,
            ref: 'deliveryBoy',
        },
        amount: {
            type: Number,
            default: 0,
        },
        secondaryCurrency_amount: {
            type: Number,
            default: 0,
        },

        riderWeeklyOrder: {
            type: Number,
        },
        riderWeeklyTarget: {
            type: Number,
        },

        salesManagerMonthlyCreatedShop: {
            type: Number,
        },
        salesManagerMonthlyTarget: {
            type: Number,
        },
        rewardedYear: {
            type: Number,
        },
        rewardedMonth: {
            type: Number,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('reward', rewardSchema);
