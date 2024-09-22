const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TagSchema = new Schema({
    name: {
        type: String,
        require: true,
    },
    type: {
        type: String,
        enum: ['food', 'grocery', 'pharmacy'],
    },
    status: {
            type: String,
            default: 'active',
            enum: ['active', 'inactive'],
    },
    tagCount: {
        type: Number,
        default: 1,
    },
    },
    {
        timestamps: true,
    }
    );

module.exports = mongoose.model('tags', TagSchema);
