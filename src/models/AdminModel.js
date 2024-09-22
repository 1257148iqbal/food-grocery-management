const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const shortid = require('shortid');

const adminSchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        name: {
            type: String,
        },
        gender: {
            type: String,
            comment: 'male,female',
            // enum: ['male', 'female'],
            // default: 'male',
        },
        phone_number: {
            type: String,
        },
        phoneVerify: {
            type: Boolean,
            default: false,
        },
        email: {
            type: String,
            // match: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            // unique: true,
        },
        password: {
            type: String,
        },
        profile_photo: {
            type: String,
        },
        fcmToken: {
            type: String,
        },
        status: {
            type: String,
            enum: ['pending', 'active', 'inactive'],
            default: 'active',
        },
        adminType: {
            type: String,
            enum: [
                'admin',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
                'generalManager',
                'orderManagementManager',
            ],
            default: 'admin',
        },
        forgetToken: {
            type: String,
        },
        forgetExpired: {
            type: Date,
        },
        // store account manager sellers
        sellers: [
            {
                type: ObjectId,
                ref: 'sellers',
            },
        ],
        address: {
            type: String,
        },
        // For customer service
        liveStatus: {
            type: String,
            enum: ['online', 'offline'],
            default: 'offline',
        },
        lastOnline: {
            type: Date,
            default: new Date(),
        },

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'admins',
        versionKey: false,
    }
);

module.exports =
    mongoose.models.admins || mongoose.model('admins', adminSchema);
