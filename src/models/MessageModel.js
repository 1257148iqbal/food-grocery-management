const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const messageSchema = new Schema(
    {
        message: {
            type: String,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('message', messageSchema);
