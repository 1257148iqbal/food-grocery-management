const {
    errorHandler,
    successResponse,
    errorResponse,
    validationError,
    errorResponseWithCode,
} = require('../helpers/apiResponse');
const AppSetting = require('../models/AppSetting');
const ShopModel = require('../models/ShopModel');
const { addAdminLogAboutActivity } = require('./AdminController');

exports.addNearByShopKm = async (req, res) => {
    try {
        const id = req.adminId;
        const { nearByShopKm } = req.body;
        let appSetting = await AppSetting.findOne({});

        if (appSetting == null) {
            appSetting = new AppSetting({});
        }

        let oldNearByShopkm = appSetting.nearByShopKm
            ? appSetting.nearByShopKm
            : 0;

        if (nearByShopKm) {
            appSetting.nearByShopKm = nearByShopKm;
        }

        await appSetting.save();

        addAdminLogAboutActivity(
            'nearByShopKm',
            id,
            nearByShopKm,
            oldNearByShopkm
        );

        res.status(200).json({
            status: true,
            message: 'NearByShopKm added successfully',
            data: {
                nearByShopKm,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAppSetting = async (req, res) => {
    try {
        const appSetting = await AppSetting.findOne({});

        res.status(200).json({
            status: true,
            message: 'success',
            data: {
                appSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editAppSetting = async (req, res) => {
    try {
        const id = req.adminId;
        const {
            minOrderAmount,
            nearByShopKm,
            maxDistanceForButler,
            maxDiscount,
            maxCustomerServiceValue,
            searchDeliveryBoyKm,
            baseCurrency,
            vat,
            maxTotalEstItemsPriceForButler,
            nearByShopKmForUserHomeScreen,
            secondaryCurrency,
            adminExchangeRate,
            acceptedCurrency,
            units,
            riderWorkingHoursPerDay,
            riderBOBCashSettlementLimit,
            salesManagerMonthlyTarget,
            salesManagerMonthlyReward,
            customerSupportPhoneNumber,
            type = [],
            paymentOption,
            equipments
        } = req.body;

        let appSetting = await AppSetting.findOne({});

        if (appSetting == null) {
            appSetting = new AppSetting({});
        }
        if (equipments && type.includes('equipments')) {
            addAdminLogAboutActivity(
                'equipments',
                id,
                equipments,
                appSetting.equipments
            );
            appSetting.equipments = equipments;
        }
        if (paymentOption && type.includes('paymentOption')) {
            addAdminLogAboutActivity(
                'paymentOption',
                id,
                paymentOption,
                appSetting.paymentOption
            );
            appSetting.paymentOption = paymentOption;
        }
        let oldNearByShopkm = appSetting.nearByShopKm || 0;
        if (nearByShopKm && type.includes('nearByShopKm')) {
            appSetting.nearByShopKm = nearByShopKm;
            addAdminLogAboutActivity(
                'nearByShopKm',
                id,
                nearByShopKm,
                oldNearByShopkm
            );
        }
        let oldNearByShopKmForUserHomeScreen =
            appSetting.nearByShopKmForUserHomeScreen || 0;
        if (
            nearByShopKmForUserHomeScreen &&
            type.includes('nearByShopKmForUserHomeScreen')
        ) {
            appSetting.nearByShopKmForUserHomeScreen =
                nearByShopKmForUserHomeScreen;
            addAdminLogAboutActivity(
                'nearByShopKmForUserHomeScreen',
                id,
                nearByShopKmForUserHomeScreen,
                oldNearByShopKmForUserHomeScreen
            );
        }

        let oldMaxDistanceForButler = appSetting.maxDistanceForButler || 0;
        if (maxDistanceForButler && type.includes('maxDistanceForButler')) {
            appSetting.maxDistanceForButler = maxDistanceForButler;
            addAdminLogAboutActivity(
                'maxDistanceForButler',
                id,
                maxDistanceForButler,
                oldMaxDistanceForButler
            );
        }

        let oldMaxDiscount = appSetting.maxDiscount || 0;
        if (type.includes('maxDiscount')) {
            appSetting.maxDiscount = maxDiscount;
            addAdminLogAboutActivity(
                'maxDiscount',
                id,
                maxDiscount,
                oldMaxDiscount
            );
        }

        let oldSearchDeliveryBoyKm = appSetting.searchDeliveryBoyKm || [];
        if (searchDeliveryBoyKm && type.includes('searchDeliveryBoyKm')) {
            appSetting.searchDeliveryBoyKm = searchDeliveryBoyKm;
            addAdminLogAboutActivity(
                'searchDeliveryBoyKm',
                id,
                searchDeliveryBoyKm,
                oldSearchDeliveryBoyKm
            );
        }

        let oldMaxCustomerServiceValue =
            appSetting.maxCustomerServiceValue || 0;
        if (
            maxCustomerServiceValue &&
            type.includes('maxCustomerServiceValue')
        ) {
            appSetting.maxCustomerServiceValue = maxCustomerServiceValue;
            addAdminLogAboutActivity(
                'maxCustomerServiceValue',
                id,
                maxCustomerServiceValue,
                oldMaxCustomerServiceValue
            );
        }

        let oldBaseCurrency = { ...appSetting.baseCurrency } || null;
        if (baseCurrency && type.includes('baseCurrency')) {
            appSetting.baseCurrency = baseCurrency;
            addAdminLogAboutActivity(
                'baseCurrency',
                id,
                baseCurrency,
                oldBaseCurrency
            );
        }

        let oldSecondaryCurrency = { ...appSetting.secondaryCurrency } || null;
        if (secondaryCurrency && type.includes('secondaryCurrency')) {
            appSetting.secondaryCurrency = secondaryCurrency;
            addAdminLogAboutActivity(
                'secondaryCurrency',
                id,
                secondaryCurrency,
                oldSecondaryCurrency
            );
        }

        let oldAdminExchangeRate = appSetting.adminExchangeRate || 0;
        if (type.includes('adminExchangeRate')) {
            appSetting.adminExchangeRate = adminExchangeRate;
            addAdminLogAboutActivity(
                'adminExchangeRate',
                id,
                adminExchangeRate,
                oldAdminExchangeRate
            );

            // Update shop which shopExchangeRate is less than adminExchangeRate
            if (adminExchangeRate === 0) {
                await ShopModel.updateMany(
                    {
                        deletedAt: null,
                    },
                    { shopExchangeRate: adminExchangeRate }
                );
            } else {
                const exchangeRateLimit = adminExchangeRate * 0.1; //10% of adminExchangeRate
                const upperLimit = adminExchangeRate + exchangeRateLimit;
                const lowerLimit = adminExchangeRate - exchangeRateLimit;

                await ShopModel.updateMany(
                    {
                        $or: [
                            { shopExchangeRate: { $gt: upperLimit } },
                            { shopExchangeRate: { $lt: lowerLimit } },
                        ],
                        deletedAt: null,
                    },
                    { $set: { shopExchangeRate: adminExchangeRate } }
                );
            }
        }

        let oldAcceptedCurrency = appSetting.acceptedCurrency || 0;
        if (acceptedCurrency && type.includes('acceptedCurrency')) {
            appSetting.acceptedCurrency = acceptedCurrency;
            addAdminLogAboutActivity(
                'acceptedCurrency',
                id,
                acceptedCurrency,
                oldAcceptedCurrency
            );
        }

        let oldVat = appSetting.vat || 0;
        if (vat !== undefined && type.includes('vat')) {
            appSetting.vat = vat;
            addAdminLogAboutActivity('vat', id, vat, oldVat);
        }

        let oldMaxTotalEstItemsPriceForButler =
            appSetting.maxTotalEstItemsPriceForButler || 0;
        if (
            maxTotalEstItemsPriceForButler &&
            type.includes('maxTotalEstItemsPriceForButler')
        ) {
            appSetting.maxTotalEstItemsPriceForButler =
                maxTotalEstItemsPriceForButler;
            addAdminLogAboutActivity(
                'maxTotalEstItemsPriceForButler',
                id,
                maxTotalEstItemsPriceForButler,
                oldMaxTotalEstItemsPriceForButler
            );
        }

        let oldUnits = appSetting.units || [];
        if (units && type.includes('units')) {
            appSetting.units = units;
            addAdminLogAboutActivity('units', id, units, oldUnits);
        }

        let oldRiderWorkingHoursPerDay =
            appSetting.riderWorkingHoursPerDay || 0;
        if (
            riderWorkingHoursPerDay &&
            type.includes('riderWorkingHoursPerDay')
        ) {
            appSetting.riderWorkingHoursPerDay = riderWorkingHoursPerDay;
            addAdminLogAboutActivity(
                'riderWorkingHoursPerDay',
                id,
                riderWorkingHoursPerDay,
                oldRiderWorkingHoursPerDay
            );
        }

        let oldRiderBOBCashSettlementLimit =
            appSetting.riderBOBCashSettlementLimit || 0;
        if (type.includes('riderBOBCashSettlementLimit')) {
            appSetting.riderBOBCashSettlementLimit =
                riderBOBCashSettlementLimit;
            addAdminLogAboutActivity(
                'riderBOBCashSettlementLimit',
                id,
                riderBOBCashSettlementLimit,
                oldRiderBOBCashSettlementLimit
            );
        }

        let oldSalesManagerMonthlyTarget =
            appSetting.salesManagerMonthlyTarget || 0;
        if (type.includes('salesManagerMonthlyTarget')) {
            appSetting.salesManagerMonthlyTarget = salesManagerMonthlyTarget;
            addAdminLogAboutActivity(
                'salesManagerMonthlyTarget',
                id,
                salesManagerMonthlyTarget,
                oldSalesManagerMonthlyTarget
            );
        }

        let oldSalesManagerMonthlyReward =
            appSetting.salesManagerMonthlyReward || 0;
        if (type.includes('salesManagerMonthlyReward')) {
            appSetting.salesManagerMonthlyReward = salesManagerMonthlyReward;
            addAdminLogAboutActivity(
                'salesManagerMonthlyReward',
                id,
                salesManagerMonthlyReward,
                oldSalesManagerMonthlyReward
            );
        }

        let oldCustomerSupportPhoneNumber =
            appSetting.customerSupportPhoneNumber || 0;
        if (type.includes('customerSupportPhoneNumber')) {
            appSetting.customerSupportPhoneNumber = customerSupportPhoneNumber;
            addAdminLogAboutActivity(
                'customerSupportPhoneNumber',
                id,
                customerSupportPhoneNumber,
                oldCustomerSupportPhoneNumber
            );
        }

        if (minOrderAmount !== undefined && minOrderAmount !== null && typeof minOrderAmount === 'number' && !isNaN(minOrderAmount) && minOrderAmount >= 0) {
            appSetting.minOrderAmount = minOrderAmount;
            // update minOrderAmount of all shops which don't have ownDeliveryBoy. 
            
            await ShopModel.updateMany(
                {
                    $match: {
                        deletedAt: null,
                        haveOwnDeliveryBoy: false,
                    },
                },
                {
                    $set: {
                        minOrderAmount: minOrderAmount,
                    }
                }
            );



        } else appSetting.minOrderAmount = 0;
        
        await appSetting.save();

        res.status(200).json({
            status: true,
            message: 'update successfully',
            data: {
                appSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editTermsAndCondition = async (req, res) => {
    try {
        const { type, description } = req.body;

        let appSetting = await AppSetting.findOne({});

        if (appSetting == null) {
            appSetting = new AppSetting({});
        }

        if (type == 'user') {
            appSetting.userAppTearmsAndConditions = description;
        }

        if (type == 'delivery') {
            appSetting.deliveryAppTearmsAndConditions = description;
        }

        if (type == 'shop') {
            appSetting.shopAppTearmsAndConditions = description;
        }

        if (type == 'subscription') {
            appSetting.subscriptionTermsAndConditions = description;
        }

        await appSetting.save();

        successResponse(res, {
            message: 'Successfully Updated',
            data: description,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getTermsAndCondition = async (req, res) => {
    try {
        const { type } = req.query;

        let termsAndCondition;

        let appSetting = await AppSetting.findOne({});

        if (type == 'user') {
            termsAndCondition = appSetting.userAppTearmsAndConditions
                ? appSetting.userAppTearmsAndConditions
                : '';
        }

        if (type == 'delivery') {
            termsAndCondition = appSetting.deliveryAppTearmsAndConditions
                ? appSetting.deliveryAppTearmsAndConditions
                : '';
        }

        if (type == 'shop') {
            termsAndCondition = appSetting.shopAppTearmsAndConditions
                ? appSetting.shopAppTearmsAndConditions
                : '';
        }

        if (type == 'subscription') {
            termsAndCondition = appSetting.subscriptionTermsAndConditions
                ? appSetting.subscriptionTermsAndConditions
                : '';
        }

        successResponse(res, {
            message: 'Successfully get',
            data: termsAndCondition || '',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.editSearchDeliveryBoyKM = async (req, res) => {
    try {
        const id = req.adminId;
        const { searchDeliveryBoyKm } = req.body;
        let appSetting = await AppSetting.findOne({});

        let oldSearchDeliveryBoyKm = appSetting.searchDeliveryBoyKm
            ? appSetting.searchDeliveryBoyKm
            : 0;

        appSetting.searchDeliveryBoyKm = searchDeliveryBoyKm;

        await appSetting.save();

        addAdminLogAboutActivity(
            'searchDeliveryBoyKM',
            id,
            searchDeliveryBoyKm,
            oldSearchDeliveryBoyKm
        );

        res.status(200).json({
            status: true,
            message: 'update successfully',
            data: {
                appSetting,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getMaxCustomerServiceValue = async (req, res) => {
    try {
        let appSetting = await AppSetting.findOne({});

        const maxValue = appSetting.maxCustomerServiceValue
            ? appSetting.maxCustomerServiceValue
            : 0;

        successResponse(res, {
            message: 'Successfully get',
            data: {
                maxValue,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// Privacy setting
exports.editPrivacySettings = async (req, res) => {
    try {
        const { type, description } = req.body;

        let appSetting = await AppSetting.findOne({});

        if (appSetting == null) {
            appSetting = new AppSetting({});
        }

        if (type == 'user') {
            appSetting.userAppPrivacyPolicy = description;
        }

        if (type == 'delivery') {
            appSetting.deliveryAppPrivacyPolicy = description;
        }

        if (type == 'shop') {
            appSetting.shopAppPrivacyPolicy = description;
        }

        await appSetting.save();

        successResponse(res, {
            message: 'Successfully Updated',
            data: description,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};





exports.getPrivacySettings = async (req, res) => {
    try {

        const { type } = req.query;
        const fieldMapping = {

            user: 'userAppPrivacyPolicy',
            delivery: 'deliveryAppPrivacyPolicy',
            shop: 'shopAppPrivacyPolicy',

        }

        if (!type || !fieldMapping.hasOwnProperty(type)) {
            return errorResponseWithCode(res, 'Invalid type', 422);
        }

        let appSetting = await AppSetting.findOne().select(fieldMapping[type]);

        successResponse(res, {
            message: 'Successfully get',
            data: {privacyPolicy
                :appSetting?.[fieldMapping?.[type]] || ''},
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
