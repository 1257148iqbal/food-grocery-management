const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Schema.Types;
const AdminLog = new Schema(
    {
        admin: {
            type: ObjectId,
            ref: 'admins',
        },
        type: {
            type: String,
        },
        dropPercentageType: {
            type: String,
            enum: ['percentage', 'amount', null],
        },
        newValue: {},
        oldValue: {},
        date: {
            type: Date,
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('admin_log', AdminLog);
