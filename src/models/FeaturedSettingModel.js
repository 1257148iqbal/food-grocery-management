const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;
const { String, ObjectId, Number, Date, Boolean } = Types;

const FeaturedSetting = new Schema(
    {
        featuredType: {
            type: String,
            enum: {
                values: [
                    'food',
                    'grocery',
                    'pharmacy',
                    'coffee',
                    'flower',
                    'pet',
                ],
                message: '{VALUE} is not a valid type',
            },
            required: true,
        },
        featuredItems: [
            {
                featuredDuration: { type: Number, required: true }, // How many days
                featuredAmount: { type: Number, default: 0 },
                featuredStatus: {
                    type: String,
                    enum: ['active', 'inactive'],
                    default: 'active',
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('featured_setting', FeaturedSetting);
