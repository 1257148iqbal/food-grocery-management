const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const AppSetting = new Schema(
    {
        nearByShopKm: {
            type: Number,
            default: 0,
        },
        nearByShopKmForUserHomeScreen: {
            type: Number,
            default: 0,
        },
        // Calculate n Kilometer
        maxDistanceForButler: {
            type: Number,
            default: 0,
        },
        maxDiscount: {
            type: Number,
            default: 0,
        },
        maxCustomerServiceValue: {
            type: Number,
        },
        searchDeliveryBoyKm: [Number],
        userAppTearmsAndConditions: {
            type: String,
        },
        deliveryAppTearmsAndConditions: {
            type: String,
        },
        shopAppTearmsAndConditions: {
            type: String,
        },
        userAppPrivacyPolicy: {
            type: String,
        },
        deliveryAppPrivacyPolicy: {
            type: String,
        },
        shopAppPrivacyPolicy: {
            type: String,
        },
        userAppAboutUs: {
            type: String,
        },
        deliveryAppAboutUs: {
            type: String,
        },
        shopAppAboutUs: {
            type: String,
        },
        userAppContactUs: {
            type: String,
        },
        deliveryAppContactUs: {
            type: String,
        },
        shopAppContactUs: {
            type: String,
        },
        userAppReturnPolicy: {
            type: String,
        },
        deliveryAppReturnPolicy: {
            type: String,
        },
        shopAppReturnPolicy: {
            type: String,
        },
        baseCurrency: {
            symbol: {
                type: String,
            },
            name: {
                type: String,
            },
            symbol_native: {
                type: String,
            },
            decimal_digits: {
                type: Number,
            },
            rounding: {
                type: Number,
            },
            code: {
                type: String,
            },
            name_plural: {
                type: String,
            },
            flag: {
                type: String,
            },
        },
        // For Exchange currency feature
        secondaryCurrency: {
            symbol: {
                type: String,
            },
            name: {
                type: String,
            },
            symbol_native: {
                type: String,
            },
            decimal_digits: {
                type: Number,
            },
            rounding: {
                type: Number,
            },
            code: {
                type: String,
            },
            name_plural: {
                type: String,
            },
            flag: {
                type: String,
            },
        },
        adminExchangeRate: {
            type: Number,
            default: 0,
        },
        acceptedCurrency: {
            type: String,
        },
        vat: {
            type: Number,
        },
        maxTotalEstItemsPriceForButler: {
            type: Number,
            default: 0,
        },
        units: [String],
        // Subscription feature
        subscriptionTermsAndConditions: {
            type: String,
        },
        // Rider working hours
        riderWorkingHoursPerDay: {
            type: Number,
            default: 8,
        },
        // BOB feature
        riderBOBCashSettlementLimit: {
            type: Number,
            default: 0,
        },
        // Sales Manager monthly reward feature when he reached the target
        salesManagerMonthlyTarget: {
            type: Number,
            default: 0,
        },
        salesManagerMonthlyReward: {
            type: Number,
            default: 0,
        },
        customerSupportPhoneNumber: {
            type: String,
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
        equipments: [String],

        minOrderAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('app_setting', AppSetting);
