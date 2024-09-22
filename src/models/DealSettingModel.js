const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const DealSetting = new Schema(
    {
        percentageBundle: [Number],
        type: {
            type: String,
            enum: {
                values: ['pharmacy', 'grocery', 'restaurant'],
                message: '{VALUE} is not a valid type',
            },
        },
        option: [
            {
                type: String,
                enum: {
                    values: [
                        'double_menu',
                        'free_delivery',
                        'percentage',
                        'punch_marketing',
                    ],
                    message: '{VALUE} is not a valid type',
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('deal_setting', DealSetting);
