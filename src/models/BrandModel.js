const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
    {
        brandName: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('brands', schema);
