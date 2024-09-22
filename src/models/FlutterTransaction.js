const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const jwt = require('jsonwebtoken');
const short = require('short-uuid');

const _schema = new Schema(
    {
        flutterWave: {},
        cardInfo: {},
        status: {
            type: String,
            enum: ['pending', 'success', 'failed'],
            default: 'pending',
        },
        token: {
            type: String,
            required: true,
            default: () => {
                return jwt.sign(
                    { id: short.generate() },
                    'flutter_wave_token_generate_key',
                    {}
                );
            },
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'users',
        },
        type: {
            type: String,
            enum: ['top_up', 'order'],
            default: 'top_up',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('flutter_transaction', _schema);
