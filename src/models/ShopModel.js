const mongoose = require('mongoose');
const { AddressSchema, GeoLocationSchema } = require('./subSchema');
const { ObjectId } = mongoose.Schema.Types;
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const SALT_WORK_FACTOR = 10;
const shortid = require('shortid');

const ShopSchema = mongoose.Schema(
    {
        autoGenId: {
            type: String,
            default: shortid.generate,
        },
        seller: {
            type: ObjectId,
            ref: 'sellers',
        },
        shopType: {
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
        foodType: {
            type: String,
            // enum: ['restaurants', 'foodCut', 'supermarkets', null],
        },
        shopName: {
            type: String,
        },
        phone_number: {
            type: String,
        },
        name: {
            type: String,
        },
        email: {
            type: String,
        },
        password: {
            type: String,
        },
        shopLogo: {
            type: String,
        },
        shopBanner: {
            type: String,
        },
        // unit: {
        //     type: String,
        // },
        expensive: {
            type: Number,
        },
        banner: [
            {
                type: ObjectId,
                ref: 'banners',
            },
        ],
        shopStatus: {
            type: String,
            enum: ['active', 'inactive', 'blocked'],
            required: true,
            default: 'active',
        },
        liveStatus: {
            type: String,
            enum: ['online', 'busy', 'offline'],
            default: 'online',
        },
        // Shop Downtime calculation
        lastOffline: {
            type: Date,
        },
        tags: [String],
        tagsId: [
            {
                type: ObjectId,
                ref: 'tags-cuisines',
            },
        ],
        minOrderAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxOrderAmount: {
            type: Number,
            default: 0,
        },
        isCuisine: {
            type: Boolean,
            default: false,
        },
        cuisineType: [
            {
                type: ObjectId,
                ref: 'tags-cuisines',
            },
        ],
        address: AddressSchema,
        location: GeoLocationSchema,
        categories: [
            {
                type: ObjectId,
                ref: 'categories',
            },
        ],
        products: [
            {
                type: ObjectId,
                ref: 'products',
            },
        ],
        //*** Banking Information Start ***/
        shopReceivePaymentBy: {
            type: String,
            enum: ['bank', 'cash'],
            default: 'bank',
        },
        bank_name: {
            type: String,
        },
        bank_address: {
            type: String,
        },
        // bank_city: {
        //     type: String,
        // },
        bank_postal_code: {
            type: String,
        },
        // account_type: {
        //     type: String,
        // },
        account_name: {
            type: String,
        },
        account_number: {
            type: String,
        },
        account_swift: {
            type: String,
        },
        payout_frequency: {
            type: String,
            enum: ['weekly', 'monthly'],
            default: 'weekly',
        },
        //*** Banking Information End ***/
        rating: {
            type: Number,
            default: 0,
        },
        totalOrder: {
            type: Number,
            default: 0,
        },
        haveOwnDeliveryBoy: {
            type: Boolean,
            default: false,
        },
        deliveryFee: {
            type: Number,
        },
        parentShop: {
            type: ObjectId,
            ref: 'shops',
        },
        credentialType: {
            type: String,
            enum: ['credentialUser', 'shopOrderManager'],
        },
        credentials: [
            {
                type: ObjectId,
                ref: 'shops',
            },
        ],
        flags: [
            {
                type: ObjectId,
                ref: 'flags',
            },
        ],
        reviews: [
            {
                type: ObjectId,
                ref: 'reviews',
            },
        ],
        fcmToken: [
            {
                type: String,
            },
        ],
        freeDealUpdateTime: {
            type: Date,
        },
        discountDealUpdateTime: {
            type: Date,
        },
        favoriteUpdateTime: {
            type: Date,
        },
        forgetToken: {
            type: String,
        },
        forgetExpired: {
            type: Date,
        },
        maxDiscount: {
            type: Number,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        // track new customer and repeated customer
        // newCustomers: [
        //     {
        //         type: ObjectId,
        //         ref: 'users',
        //     },
        // ],
        // repeatedCustomers: [
        //     {
        //         type: ObjectId,
        //         ref: 'users',
        //     },
        // ],
        // Best seller and shop favourites items
        bestSeller: {
            title: { type: String, default: 'Best Seller' },
            isActive: { type: Boolean, default: false },
        },
        shopFavourites: {
            title: { type: String, default: 'Favourites' },
            isActive: { type: Boolean, default: false },
            products: [
                {
                    product: {
                        type: ObjectId,
                        ref: 'products',
                    },
                    sortingOrder: {
                        type: Number,
                        default: 0,
                    },
                },
            ],
        },
        // Marketing System
        marketings: [
            {
                type: ObjectId,
                ref: 'marketing',
            },
        ],
        freeDelivery: {
            type: Boolean,
            default: false,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        featuredUpdatedTime: {
            type: Date,
        },
        // Punch marketing feature
        isPunchMarketing: {
            type: Boolean,
            default: false,
        },
        punchMarketingUpdatedTime: {
            type: Date,
        },

        // Track Order Capacity
        orderCapacity: {
            type: Number,
            default: 0,
        },
        // Payment option
        paymentOption: [
            {
                type: String,
                enum: {
                    values: ['cash', 'card', 'wallet', 'pos'],
                    message: '{VALUE} is not a valid paymentOption',
                },
            },
        ],
        // Dietary
        dietary: [
            {
                type: String,
                // enum: {
                //     values: [
                //         'gluten-free',
                //         'low-cal',
                //         'vegetarian',
                //         'vegan',
                //         'glue-free',
                //     ],
                //     message: '{VALUE} is not a valid dietary',
                // },
            },
        ],
        // for find shop that create sales
        // createdBy: {
        //     type: ObjectId,
        //     ref: 'admins',
        // },
        assignedSalesManager: {
            type: ObjectId,
            ref: 'admins',
        },
        // Shop opening and closing hours feature
        normalHours: [
            {
                day: {
                    type: String,
                    enum: [
                        'Monday',
                        'Tuesday',
                        'Wednesday',
                        'Thursday',
                        'Friday',
                        'Saturday',
                        'Sunday',
                    ],
                },
                openingHours: [
                    { open: { type: String }, close: { type: String } },
                ],
                isFullDayOpen: { type: Boolean },
                isActive: { type: Boolean },
            },
        ],
        holidayHours: [
            {
                date: { type: Date },
                isFullDayOff: { type: Boolean },
                closedStart: { type: String },
                closedEnd: { type: String },
            },
        ],
        shopNote: {
            type: String,
        },
        isShopNoteForRiderEnabled: {
            type: Boolean,
            default: false,
        },
        shopNoteForRider: {
            type: String,
        },
        specialInstructions: {
            type: Boolean,
            default: false,
        },
        // For Exchange currency feature
        shopExchangeRate: {
            type: Number,
            default: 0,
        },
        // Zone feature
        shopZone: {
            type: ObjectId,
            ref: 'zones',
        },
        // Brand feature
        shopBrand: {
            type: String,
        },
        defaultPreparationTime: {
            type: Number,
            default: 10,
        },
        productView: {
            type: String,
            enum: ['list', 'grid'],
            default: 'list',
        },
        sortingOrder: {
            type: Number,
            default: 0,
        },
        // Healthy corner feature
        healthyCornerMinimumDays: {
            type: Number,
        },
        dishes: [
            {
                type: ObjectId,
                ref: 'dishes',
            },
        ],
        mealPlans: [
            {
                type: ObjectId,
                ref: 'meal_plans',
            },
        ],
        commercial_circular_document: { type: String },
        tax_registration: { type: String },
        contact_paper: { type: String },
        shopID: { type: String },

        // totalDeliveryTime: { type: Number, default: 0 },
        // totalOrders: { type: Number, default: 0 },
        avgOrderDeliveryTime: { type: Number, default: 0 },
        avgOrderValue: { type: Number, default: 0 },
        // healthyCornerCategories: [
        //     {
        //         category: {
        //             type: String,
        //         },
        //         sortingOrder: {
        //             type: Number,
        //             default: 0,
        //         },
        //     },
        // ],
    },
    { timestamps: true, collection: 'shops' }
);

ShopSchema.index({ location: '2dsphere' });
ShopSchema.pre('save', function (next) {
    let shop = this;

    // only hash the password if it has been modified (or is new)
    if (!shop.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(shop.password, salt, function (err, hash) {
            if (err) return next(err);
            // override the cleartext password with the hashed one
            shop.password = hash;
            next();
        });
    });
});

ShopSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};
module.exports = mongoose.model('shops', ShopSchema);
