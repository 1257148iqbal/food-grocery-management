const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { GeoLocationSchema, AddressSchema } = require('./subSchema');
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;
const SALT_WORK_FACTOR = 10;
const shortid = require('shortid');

const deliverySchema = new Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        name: {
            type: String,
            required: true,
        },
        image: {
            type: String,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
        },
        gender: {
            type: String,
            // enum: ['male', 'female'],
        },
        countryCode: {
            type: String,
        },
        number: {
            type: String,
        },
        status: {
            type: String,
            enum: ['active', 'deactive'],
            default: 'deactive',
        },
        dob: {
            type: Date,
        },
        totalOrder: {
            type: Number,
            default: 0,
        },
        liveStatus: {
            type: String,
            enum: ['online', 'offline'],
            default: 'offline',
        },
        flags: [
            {
                type: ObjectId,
                ref: 'flags',
            },
        ],
        fcmToken: [
            {
                type: String,
            },
        ],
        lastLogin: {
            type: Date,
            default: new Date(),
        },
        lastOnline: {
            type: Date,
            default: new Date(),
        },
        nationalIdDocument: {
            type: String,
        },
        vehicleRegistrationDocument: {
            type: String,
        },
        vehicleType: {
            type: String,
        },
        vehicleNumber: {
            type: String,
        },
        address: {
            type: String,
        },
        // address: AddressSchema, // admin mentioned to remove this and make it plain text
        location: GeoLocationSchema,
        forgetToken: {
            type: String,
        },
        forgetExpired: {
            type: Date,
        },
        lastLocationUpdateAt: {
            type: Date,
        },
        contractImage: {
            type: String,
        },
        createBy: {
            type: String,
            enum: ['admin', 'deliveryBoy', 'shop'],
            default: 'admin',
        },
        // Handle multiple device login
        isLogin: {
            type: Boolean,
            default: false,
        },
        lastLoginDeviceId: {
            type: String,
        },
        //For Rating System
        reviews: [
            {
                type: ObjectId,
                ref: 'reviews',
            },
        ],
        rating: {
            type: Number,
            default: 0,
        },
        // For store shift
        shift: {
            type: String,
            enum: ['day', 'night'],
            default: 'day',
        },
        // Zone feature
        zone: {
            type: ObjectId,
            ref: 'zones',
        },
        // Separate rider
        deliveryBoyType: {
            type: String,
            enum: ['shopRider', 'dropRider'],
            default: 'dropRider',
        },
        shop: {
            type: ObjectId,
            ref: 'shops',
        },
        deliveryBoyNationality: {
            type: String,
        },
        deliveryBoyEquipment: {
            type: String,
        },
        // BOB Feature
        isCashSettlementLimitReached: {
            type: Boolean,
            default: false,
        },
        // Rider downtime feature
        firstActiveAt: {
            type: Date,
            default: null,
        },

        deletedAt: {
            type: Date,
            default: null,
        },
        deliveryBoyEquipments:[{
            name: String,
            quantity: Number
        }],
        insurance: { type: String, },
        powerOfAttorney: { type: String, },
        proofOfResidence: { type: String, },
    },
    { timestamps: true }
);

deliverySchema.index({ location: '2dsphere' });

deliverySchema.pre('save', function (next) {
    let deliveryBoy = this;

    // only hash the password if it has been modified (or is new)
    if (!deliveryBoy.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(deliveryBoy.password, salt, function (err, hash) {
            if (err) return next(err);
            // override the cleartext password with the hashed one
            deliveryBoy.password = hash;
            next();
        });
    });
});

module.exports = mongoose.model('deliveryBoy', deliverySchema);
