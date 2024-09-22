const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const counterSchema = new Schema({
        uniqueId: { type: String, required: true, unique: true },
        seq_value: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
    },
    {
        strict: true,
        timestamps: true,
        collection: 'counters',
        versionKey: false,
    },
);

module.exports = mongoose.models.counters || mongoose.model('counters', counterSchema);
