const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const PayoutSetting = new Schema(
    {
        firstDayOfWeek: {
            type: Number,
            default: 0,
            enum: {
                values: [0, 1, 2, 3, 4, 5, 6],
                message: '{VALUE} is not a valid firstDayOfWeek',
            },
        },
        overDuePeriod: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('payout_setting', PayoutSetting);
