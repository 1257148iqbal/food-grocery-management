const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const RatingSetting = new Schema(
    {
        rating: {
            type: Number,
            required: true,
            enum: {
                values: [1, 2, 3, 4, 5],
                message: '{VALUE} is not a valid status',
            },
        },
        tags: [{ type: String }],
        type: {
            type: String,
            enum: ['shop', 'deliveryBoy'],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('rating_setting', RatingSetting);
