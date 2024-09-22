const mongoose = require('mongoose');
const { GeoLocationSchema, AddressSchema } = require('./subSchema');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const shortid = require('shortid');

const SellerSchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        name: {
            type: String,
        },
        phone_number: {
            type: String,
        },
        phoneVerify: {
            type: Boolean,
            default: false,
        },
        registerType: {
            type: String,
            default: 'mail',
        },
        company_name: {
            type: String,
        },
        email: {
            type: String,
            // match: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            // unique: true,
        },
        password: {
            type: String,
        },
        location: GeoLocationSchema,
        sellerAddress: AddressSchema,

        shops: {
            type: [ObjectId],
            ref: 'shops',
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
        sellerType: {
            type: String,
            enum: [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
                null,
            ],
        },
        subType: {
            type: String,
            enum: ['restaurants', 'foodCut', 'supermarkets', null],
        },
        bank_name: {
            type: String,
        },
        account_name: {
            type: String,
        },
        account_number: {
            type: String,
        },
        certificate_of_incorporation: {
            type: String,
        },
        sellerContractPaper: {
            type: String,
        },
        national_id: {
            type: String,
        },
        verification_code: {
            type: String,
        },
        password_reset_code: {
            type: String,
        },
        social_id: {
            type: String,
        },
        loginOtp: {
            type: String,
        },
        loginOtpExpired: {
            type: Date,
        },
        tempBalance: {
            type: Number,
            default: 0,
        },
        parentSeller: {
            type: ObjectId,
            ref: 'sellers',
            default: null,
        },
        childSellers: {
            type: [ObjectId],
            ref: 'sellers',
        },
        credentialType: {
            type: String,
            enum: ['credentialUser', 'shopsOrderManager'],
        },
        dropCharge: {
            type: ObjectId,
            ref: 'drop_charge',
        },
        dropPercentage: {
            type: Number,
            default: null,
        },
        dropPercentageType: {
            type: String,
            comment: 'percentage or amount',
            // enum: ['percentage', 'amount'],
        },
        // For Adam requirement
        sellerChargeType: {
            type: String,
            enum: ['specific', 'global'],
            default: 'global',
        },
        globalDropPercentage: {
            type: Number,
            default: null,
        },

        deliveryRange: [
            new Schema({
                from: {
                    type: Number,
                },
                to: {
                    type: Number,
                },
                charge: {
                    type: Number,
                },
                deliveryPersonCut: {
                    type: Number,
                },
            }),
        ],
        totalOrder: {
            type: Number,
            default: 0,
        },
        forgetToken: {
            type: String,
        },
        forgetExpired: {
            type: Date,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        // for find seller that create sales
        createdBy: {
            type: ObjectId,
            ref: 'admins',
        },
        assignedSalesManager: {
            type: ObjectId,
            ref: 'admins',
        },
        paysServiceFee: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);

SellerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('sellers', SellerSchema);
