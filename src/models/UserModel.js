const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { GeoLocationSchema, AddressSchema } = require('./subSchema');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const SALT_WORK_FACTOR = 10;
const shortid = require('shortid');

const UserSchema = new Schema(
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
        favoritesProducts: [
            {
                type: ObjectId,
                ref: 'products',
            },
        ],
        favoritesShops: [
            {
                type: ObjectId,
                ref: 'shops',
            },
        ],
        phone_number: {
            type: String,
        },
        phoneVerify: {
            type: Boolean,
            default: false,
        },
        forgetVerify: {
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
        cards: [
            {
                type: ObjectId,
                ref: 'cards',
            },
        ],
        flags: [
            {
                type: ObjectId,
                ref: 'flags',
            },
        ],
        address: {
            type: [ObjectId],
            ref: 'address',
        },
        location: GeoLocationSchema,
        profile_photo: {
            type: String,
        },
        fcmToken: [
            {
                type: String,
            },
        ],
        status: {
            type: String,
            enum: ['pending', 'active', 'inactive'],
            default: 'active',
        },

        dob: {
            type: Date,
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
        deletedAt: {
            type: Date,
        },
        loginOtp: {
            type: String,
        },
        loginOtpExpired: {
            type: Date,
        },
        forgetOtp: {
            type: String,
        },
        forgetOtpExpired: {
            type: Date,
        },
        forgetToken: {
            type: String,
        },
        forgetExpired: {
            type: Date,
        },
        countryShortName: {
            type: String,
        },
        tempBalance: {
            type: Number,
            default: 0,
        },
        orderCompleted: {
            type: Number,
            default: 0,
        },
        repeatedOrderAt: {
            type: Date,
        },
        // Reward System
        tempRewardPoints: {
            type: Number,
            default: 0,
        },
        // Coupon feature
        coupons: [
            {
                type: ObjectId,
                ref: 'coupons',
            },
        ],
        isNewUserCouponShowed: {
            type: Boolean,
            default: false,
        },
        // Referral feature
        referralCode: {
            type: ObjectId,
            ref: 'coupons',
        },
        // Track user register device
        userRegisterDeviceId: {
            type: String,
        },
        // Subscription feature
        subscription: {
            type: ObjectId,
            ref: 'subscriptions',
        },
        isSubscribed: {
            type: Boolean,
            default: false,
        },
        // Areeba payment gateway integration
        areebaCards: [
            {
                type: ObjectId,
                ref: 'areebaCard',
            },
        ],
    },
    { timestamps: true }
);

UserSchema.index({ location: '2dsphere' });

UserSchema.pre('save', function (next) {
    let user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(err);
            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

module.exports = mongoose.model('users', UserSchema);
