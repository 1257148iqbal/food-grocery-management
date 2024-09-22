const { validationResult } = require('express-validator');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const ShopModel = require('../models/ShopModel');
const AddressModel = require('../models/AddressModel');
const OrderModel = require('../models/OrderModel');
const UserModel = require('../models/UserModel');
const BannerModel = require('../models/BannerModel');
const TransactionModel = require('../models/TransactionModel');
const AppSetting = require('../models/AppSetting');
const ShopCategory = require('../models/ShopCategory');
const DealModel = require('../models/DealModel');
const ProductModel = require('../models/ProductModel');
const bcrypt = require('bcrypt');
const { verify } = require('jsonwebtoken');
const jwt = require('jsonwebtoken');
const ObjectId = require('mongoose').Types.ObjectId;
const moment = require('moment');
const { DateTime } = require('luxon');
const TagModel = require('../models/TagModel');
const SellerModel = require('../models/SellerModel');
const GlobalDropCharge = require('../models/GlobalDropCharge');
const Transection = require('../models/TransactionModel');
const ZoneModel = require('../models/ZoneModel');
const { shopAvgDeliveryTime } = require('../helpers/shopAvgDeliveryTme');
const { getDeliveryCharge } = require('../helpers/getDeliveryCharge');
const { applyExchangeRate } = require('../helpers/applyExchangeRate');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const AdminModel = require('../models/AdminModel');
const { findZone } = require('./ZoneController');
const { calcActiveTime } = require('./DeliveryBoyController');
const ShopDowntimeModel = require('../models/ShopDowntimeModel');
const {
    getShopEarning,
    getShopUnSettleAmount,
} = require('./FinancialController');
const {
    checkPlusUserMarketing,
    checkPlusUserProductMarketing,
} = require('../helpers/checkPlusUserMarketing');
const UserPunchMarketingModel = require('../models/UserPunchMarketingModel');
const MarketingModel = require('../models/MarketingModel');
const FlagModel = require('../models/FlagModel');
const { getFullOrderInformation } = require('../helpers/orderHelper');
const { sendNotificationsAllApp } = require('./NotificationController');
const { notifiycancelOrder } = require('../config/socket');
const { shopCommonSorting } = require('../helpers/shopCommonSorting');
const { checkShopCapacity } = require('../helpers/checkShopCapacity');
const { autoIncrement } = require('../services/counter.service');
const { findNearestShopIdsForEachBrand } = require('../services/shop.service');
const CategoryModel = require('../models/CategoryModel');
const ReviewModel = require('../models/ReviewModel');
const SubCategoryModel = require('../models/SubCategoryModel');
const { overwriteCategoryInfo } = require('../helpers/categoryOverwrite');

exports.useSignInFromShopApp = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email or password is required');
        }

        email = email.toLowerCase();

        let shop = await ShopModel.findOne({
            email: email,
            deletedAt: null,
        })
            .populate('parentShop')
            .select('-createdAt -updatedAt');

        if (!shop) {
            return errorResponse(res, 'shop not found . please sign up first');
        }

        // if (shop.parentShop) {
        //     return errorResponse(
        //         res,
        //         'You are not eligible to access this shop'
        //     );
        // }

        if (shop.shopStatus !== 'active') {
            return errorResponse(
                res,
                `Your account is ${shop.shopStatus}. Please contact Support`
            );
        }

        const matchPassword = bcrypt.compareSync(password, shop.password);

        if (!matchPassword) {
            return errorResponse(res, 'Wrong password.');
        }

        let jwtData = {
            shopId: shop._id,
            name: shop.shopName,
        };

        if (shop.parentShop) {
            jwtData = {
                shopId: shop.parentShop._id,
                name: shop.parentShop.shopName,
            };
        }

        const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_SHOP, {});

        delete shop._doc.password;

        successResponse(res, {
            message: 'Login Success.',
            data: {
                shop: {
                    token,
                    ...shop._doc,
                },
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getShopProfile = async (req, res) => {
    try {
        const shopId = req.shopId;

        let shop = await ShopModel.findById(shopId)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'shopZone',
                },
            ])
            .select('-createdAt -updatedAt -password');

        // Check Shop Opening time
        const isShopOpen = checkShopOpeningHours(shop);
        shop._doc.isShopOpen = isShopOpen;

        // Finding account manager
        const accountManager = await AdminModel.findOne({
            sellers: { $in: [shop.seller._id] },
            adminType: 'accountManager',
        });
        shop._doc.accountManager = accountManager;

        // Calc shop average delivered time
        // const avgOrderDeliveryTime = await shopAvgDeliveryTime(shop._id);
        // shop._doc.avgOrderDeliveryTime = avgOrderDeliveryTime;

        // Calc Shop other information
        const totalOrders = await OrderModel.count({
            shop: shop._id,
            orderStatus: 'delivered',
        });
        shop._doc.totalOrder = totalOrders;
        shop._doc.orderCount = totalOrders;

        const totalValue = await OrderModel.aggregate([
            {
                $match: { shop: ObjectId(shop._id), orderStatus: 'delivered' },
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    productAmount: {
                        $sum: {
                            $sum: ['$summary.baseCurrency_productAmount'],
                        },
                    },
                    totalAmount: {
                        $sum: {
                            $sum: ['$summary.baseCurrency_totalAmount'],
                        },
                    },
                },
            },
        ]);

        if (totalValue.length < 1) {
            totalValue.push({
                count: 0,
                productAmount: 0,
                totalAmount: 0,
            });
        }
        shop._doc.orderValue = {
            ...totalValue[0],
        };

        successResponse(res, {
            message: 'shop profile',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopOpeningHours = async (req, res) => {
    try {
        const shopId = req.shopId;

        const shop = await ShopModel.findById(shopId).lean();

        const openingHours = {
            normalHours: shop.normalHours,
            holidayHours: shop.holidayHours,
        };

        successResponse(res, {
            message: 'shop profile',
            data: {
                openingHours,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateShopProfile = async (req, res) => {
    try {
        const shopId = req.shopId;

        let {
            seller,
            shopType,
            foodType,
            shopName,
            phone_number,
            email,
            shopLogo,
            shopBanner,
            commercial_circular_document,
            tax_registration,
            contact_paper,
            shopID,
            shopStatus,
            delivery,
            freeDelivery,
            isFeatured,
            tags,
            minOrderAmount,
            maxOrderAmount,
            bank_name,
            account_name,
            account_number,
            orderCapacity,
            paymentOption,
            dietary,
            shopExchangeRate,
            shopZone,
            shopBrand,
            defaultPreparationTime,
            productView,
            healthyCornerMinimumDays,
        } = req.body;

        let updatedData = {};

        if (seller) {
            updatedData.seller = seller;
        }
        if (shopType) {
            updatedData.shopType = shopType;
        }
        if (foodType) {
            updatedData.foodType = foodType;
        }
        if (shopName) {
            updatedData.shopName = shopName;
        }
        if (shopLogo) {
            updatedData.shopLogo = shopLogo;
        }
        if (shopBanner) {
            updatedData.shopBanner = shopBanner;
        }
        if (commercial_circular_document)
            updatedData.commercial_circular_document =
                commercial_circular_document;
        if (tax_registration) updatedData.tax_registration = tax_registration;
        if (contact_paper) updatedData.contact_paper = contact_paper;
        if (shopID) updatedData.shopID = shopID;
        if (delivery) {
            updatedData.delivery = delivery;
        }
        if (freeDelivery) {
            updatedData.freeDelivery = freeDelivery;
        }
        if (isFeatured) {
            updatedData.isFeatured = isFeatured;
        }
        if (minOrderAmount) {
            updatedData.minOrderAmount = minOrderAmount;
        }
        if (maxOrderAmount) {
            updatedData.maxOrderAmount = maxOrderAmount;
        }
        if (isFeatured) {
            updatedData.isFeatured = isFeatured;
        }
        if (bank_name) {
            updatedData.bank_name = bank_name;
        }
        if (account_name) {
            updatedData.account_name = account_name;
        }
        if (account_number) {
            updatedData.account_number = account_number;
        }
        if (orderCapacity) {
            updatedData.orderCapacity = orderCapacity;
        }
        if (paymentOption) {
            updatedData.paymentOption = paymentOption;
        }
        if (dietary) {
            updatedData.dietary = dietary;
        }
        if (shopZone) {
            updatedData.shopZone = shopZone;
        }
        if (shopBrand) {
            updatedData.shopBrand = shopBrand;
        }
        if (defaultPreparationTime) {
            updatedData.defaultPreparationTime = defaultPreparationTime;
        }
        if (productView) {
            updatedData.productView = productView;
        }
        if (healthyCornerMinimumDays) {
            updatedData.healthyCornerMinimumDays = healthyCornerMinimumDays;
        }
        if (shopExchangeRate) {
            const appSetting = await AppSetting.findOne();
            const adminExchangeRate = appSetting?.adminExchangeRate || 0;

            const exchangeRateLimit = adminExchangeRate * 0.1; //10% of adminExchangeRate
            const upperLimit = adminExchangeRate + exchangeRateLimit;
            const lowerLimit = adminExchangeRate - exchangeRateLimit;

            if (
                shopExchangeRate > upperLimit ||
                shopExchangeRate < lowerLimit
            ) {
                return errorResponse(
                    res,
                    `Exchange rate must be 10%  up and down of the admin exchange rate ${adminExchangeRate}.`
                );
            }

            updatedData.shopExchangeRate = shopExchangeRate;
        }

        if (email) {
            email = email.toLowerCase();

            const emailExits = await ShopModel.findOne({
                email: email,
                deletedAt: null,
                $nor: [{ _id: id }],
            });

            if (emailExits) {
                return errorResponse(
                    res,
                    'email is already in use try another'
                );
            }

            updatedData.email = email;
        }

        if (phone_number) {
            const phoneNumberExits = await ShopModel.findOne({
                phone_number: phone_number,
                deletedAt: null,
                $nor: [{ _id: id }],
            });

            if (phoneNumberExits) {
                return errorResponse(
                    res,
                    'phoneNumber is already in use try another'
                );
            }

            updatedData.phone_number = phone_number;
        }

        await ShopModel.updateOne(
            { _id: shopId },
            {
                $set: {
                    ...updatedData,
                },
            }
        );

        const shop = await ShopModel.findById(shopId).select(
            '-createdAt -updatedAt -password'
        );

        successResponse(res, {
            message: 'shop profile updated',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateShopFcmToken = async (req, res) => {
    try {
        const id = req.shopId;
        const { fcmToken } = req.body;

        const shop = await ShopModel.findById(id);

        const isMatchFcmToken = shop?.fcmToken?.includes(fcmToken);

        if (!isMatchFcmToken) {
            await ShopModel.updateOne(
                { _id: id },
                {
                    $push: {
                        fcmToken: fcmToken,
                    },
                }
            );
        }

        successResponse(res, {
            message: 'update fcm token successfully',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
exports.removeShopFcmToken = async (req, res) => {
    try {
        const id = req.shopId;
        const { fcmToken } = req.body;

        await ShopModel.updateOne(
            { _id: id },
            {
                $pull: {
                    fcmToken: fcmToken,
                },
            }
        );

        successResponse(res, {
            message: 'remove fcm token successfully',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.changePasswordForShopApp = async (req, res) => {
    try {
        const shopId = req.shopId;

        let { password } = req.body;

        password = await bcrypt.hash(password, 10);

        await ShopModel.updateOne(
            { _id: shopId },
            {
                $set: {
                    password,
                },
            }
        );

        successResponse(res, {
            message: 'Successfully Change',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getShops = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            type,
            sellerId,
            shopStatus,
            liveStatus,
            createdBy,
            zoneId,
            deliveryBoyType, //'shopRider' || 'dropRider'
            shopBrand,
            sortByOrders,
            sortByAvgTime,
            sortByRating,
            sortByProfit,
            plusShop, // 'yes' || 'no'
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            parentShop: null,
        };

        if (liveStatus && ['online', 'offline', 'busy'].includes(liveStatus)) {
            whereConfig.liveStatus = liveStatus;
        }

        if (sellerId) {
            whereConfig.seller = sellerId;
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));

            const phone_numberQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: phone_numberQuery },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        if (
            type &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(type)
        ) {
            whereConfig = {
                shopType: type,
                ...whereConfig,
            };
        }

        if (
            shopStatus &&
            ['active', 'inactive', 'blocked'].includes(shopStatus)
        ) {
            whereConfig = {
                shopStatus: shopStatus,
                ...whereConfig,
            };
        }

        if (createdBy) {
            const totalSellers = await SellerModel.find({
                createdBy: ObjectId(createdBy),
            });
            const totalSellersId = totalSellers?.map(seller =>
                seller._id.toString()
            );

            whereConfig = {
                ...whereConfig,
                $or: [
                    { seller: { $in: totalSellersId } },
                    { createdBy: ObjectId(createdBy) },
                ],
            };
        }

        if (zoneId) {
            whereConfig = {
                ...whereConfig,
                shopZone: zoneId,
            };
        }

        if (
            deliveryBoyType &&
            ['shopRider', 'dropRider'].includes(deliveryBoyType)
        ) {
            whereConfig = {
                haveOwnDeliveryBoy:
                    deliveryBoyType === 'shopRider' ? true : false,
                ...whereConfig,
            };
        }

        if (shopBrand) {
            whereConfig = {
                ...whereConfig,
                shopBrand: shopBrand,
                // shopBrand: { $regex: new RegExp(shopBrand, 'i') },
            };
        }

        let list = await ShopModel.find(whereConfig)
            .sort({ totalOrder: sortBy })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'tagsId',
                },
                {
                    path: 'credentials',
                },
                {
                    path: 'shopZone',
                },
                {
                    path: 'flags',
                    populate: 'user orderId shop delivery',
                },
                {
                    path: 'reviews',
                    populate: 'user product shop order',
                },
            ])
            .select('-categories');

        if (plusShop && ['yes', 'no'].includes(plusShop)) {
            const isSubscriber = plusShop === 'yes';

            list = list.filter(shop =>
                shop.marketings.some(
                    marketing => marketing.onlyForSubscriber === isSubscriber
                )
            );
        }

        let newList = [];

        for (const element of list) {
            let shop = element._doc;

            const totals = await OrderModel.aggregate(
                [
                    {
                        '$match': {
                            'shop': new ObjectId(shop._id),
                            'orderStatus': 'delivered'
                        }
                    }, {
                        '$facet': {
                            'totalValue': [
                                {
                                    '$group': {
                                        '_id': '',
                                        'count': {
                                            '$sum': 1
                                        },
                                        'productAmount': {
                                            '$sum': {
                                                '$sum': [
                                                    '$summary.baseCurrency_productAmount'
                                                ]
                                            }
                                        },
                                        'totalAmount': {
                                            '$sum': {
                                                '$sum': [
                                                    '$summary.baseCurrency_totalAmount'
                                                ]
                                            }
                                        }
                                    }
                                }
                            ],
                            'totalDeliveryFee': [
                                {
                                    '$match': {
                                        'orderFor': 'specific'
                                    }
                                }, {
                                    '$group': {
                                        '_id': '',
                                        'count': {
                                            '$sum': 1
                                        },
                                        'deliveryFee': {
                                            '$sum': {
                                                '$sum': [
                                                    '$summary.baseCurrency_riderFee'
                                                ]
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            )


            shop.totalOrder = totals[0]?.totalValue[0]?.count;
            shop.orderCount = totals[0]?.totalValue[0]?.count;
            shop.orderValue = {
                ...totals[0]?.totalValue[0],
                deliveryFee: totals[0]?.totalDeliveryFee[0]?.deliveryFee || 0,
            };

            // Calc shop average delivered time
            // const avgOrderDeliveryTime = await shopAvgDeliveryTime(shop._id);
            // shop.avgOrderDeliveryTime = avgOrderDeliveryTime;

            // Calc shop profit
            const totalShopEarningFunc = await getShopEarning({
                type: 'shop',
                id: shop._id,
            });
            const totalShopEarning = totalShopEarningFunc.totalShopEarning;

            const totalShopUnsettleFunc = await getShopUnSettleAmount({
                type: 'shop',
                id: shop._id,
            });
            const totalShopUnsettle = totalShopUnsettleFunc.totalSellerUnsettle;
            const totalShopProfit = totalShopUnsettle + totalShopEarning;
            shop.totalProfit = totalShopProfit;

            // Finding account manager
            if (shop?.seller?._id)
                shop.accountManager = await AdminModel.findOne({
                    sellers: { $in: [shop.seller._id] },
                    adminType: 'accountManager',
                });

            // Check Shop Opening time
            const isShopOpen = checkShopOpeningHours(shop);
            shop.isShopOpen = isShopOpen;

            newList.push(shop);
        }

        if (sortByOrders) {
            if (sortByOrders.toLowerCase() === 'desc') {
                newList = newList.sort(
                    (a, b) => new Date(b.totalOrder) - new Date(a.totalOrder)
                );
            } else {
                newList = newList.sort(
                    (a, b) => new Date(a.totalOrder) - new Date(b.totalOrder)
                );
            }
        }
        if (sortByAvgTime) {
            if (sortByAvgTime.toLowerCase() === 'desc') {
                newList = newList.sort(
                    (a, b) =>
                        new Date(b.avgOrderDeliveryTime) -
                        new Date(a.avgOrderDeliveryTime)
                );
            } else {
                newList = newList.sort(
                    (a, b) =>
                        new Date(a.avgOrderDeliveryTime) -
                        new Date(b.avgOrderDeliveryTime)
                );
            }
        }
        if (sortByRating) {
            if (sortByRating.toLowerCase() === 'desc') {
                newList = newList.sort(
                    (a, b) => new Date(b.rating) - new Date(a.rating)
                );
            } else {
                newList = newList.sort(
                    (a, b) => new Date(a.rating) - new Date(b.rating)
                );
            }
        }
        if (sortByProfit) {
            if (sortByProfit.toLowerCase() === 'desc') {
                newList = newList.sort(
                    (a, b) => new Date(b.totalProfit) - new Date(a.totalProfit)
                );
            } else {
                newList = newList.sort(
                    (a, b) => new Date(a.totalProfit) - new Date(b.totalProfit)
                );
            }
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: newList.length,
            pagingRange: 5,
        });
        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: newList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getShopsByQuery = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            type,
            sellerId,
            shopStatus,
            liveStatus,
            createdBy,
            zoneId,
            deliveryBoyType,
            shopBrand,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            parentShop: null,
        };

        // Apply filters
        if (liveStatus) whereConfig.liveStatus = liveStatus;
        if (sellerId) whereConfig.seller = sellerId;
        if (type) whereConfig.shopType = type;
        if (shopStatus) whereConfig.shopStatus = shopStatus;
        if (zoneId) whereConfig.shopZone = zoneId;
        if (deliveryBoyType) whereConfig.haveOwnDeliveryBoy = (deliveryBoyType === 'shopRider');
        if (shopBrand) whereConfig.shopBrand = shopBrand;

        if (createdBy) {
            const sellerIds = await SellerModel.find({ createdBy: ObjectId(createdBy) }).select('_id');
            whereConfig.$or = [
                { seller: { $in: sellerIds } },
                { createdBy: ObjectId(createdBy) }
            ];
        }

        if (searchKey) {
            const searchRegex = new RegExp(searchKey, 'i');
            whereConfig.$or = [
                { shopName: searchRegex },
                { phone_number: searchRegex },
                { autoGenId: searchRegex },
                { email: searchRegex }
            ];
        }

        // Fetch data with pagination and sort applied
        let shops = await ShopModel.find(whereConfig)
            .sort({ totalOrder: sortBy })
            .populate([
                { path: 'seller', select: '-password' },
                { path: 'marketings' },
                { path: 'cuisineType' },
                { path: 'shopZone' },
            ])
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        // Apply post-processing in parallel
        let enhancedShops = await Promise.all(shops.map(async shop => {
            const shopData = shop.toObject();

            // Fetch related data in parallel
            const [totals, shopEarningData, shopUnsettleData, accountManager] = await Promise.all([
                OrderModel.aggregate([
                    { '$match': { 'shop': shop._id, 'orderStatus': 'delivered' } },
                    { '$group': { '_id': '', 'count': { '$sum': 1 }, 'totalAmount': { '$sum': '$summary.baseCurrency_totalAmount' } } }
                ]),
                getShopEarning({ type: 'shop', id: shop._id }),
                getShopUnSettleAmount({ type: 'shop', id: shop._id }),
                AdminModel.findOne({ sellers: shop.seller._id, adminType: 'accountManager' })
            ]);

            shopData.totalOrder = totals[0]?.count || 0;
            shopData.totalProfit = (shopEarningData.totalShopEarning || 0) + (shopUnsettleData.totalSellerUnsettle || 0);
            shopData.accountManager = accountManager;
            shopData.isShopOpen = checkShopOpeningHours(shopData);

            return shopData;
        }));
        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: enhancedShops.length,
            pagingRange: 5,
        });
        enhancedShops = enhancedShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: enhancedShops,
                paginate
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};


exports.getAllShops = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            type,
            sellerId,
            shopStatus,
            liveStatus,
            createdBy,
            zoneId,
            deliveryBoyType, //'shopRider' || 'dropRider'
            shopBrand,
            plusShop, // 'yes' || 'no'
            marketingType,
            marketingTypes, //[]
            sortByOrders,
            sortByAvgTime,
            sortByRating,
            sortByProfit,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            parentShop: null,
        };

        if (liveStatus && ['online', 'offline', 'busy'].includes(liveStatus)) {
            whereConfig.liveStatus = liveStatus;
        }

        if (sellerId) {
            whereConfig.seller = sellerId;
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const combinedQuery = newQuery.map(str => ({
                $or: [
                    { shopName: RegExp(str, 'i') },
                    { autoGenId: RegExp(str, 'i') },
                    { phone_number: RegExp(str, 'i') },
                    { email: RegExp(str, 'i') },
                ],
            }));
            whereConfig.$and = combinedQuery;
        }

        if (
            type &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(type)
        ) {
            whereConfig.shopType = type;
        }

        if (
            shopStatus &&
            ['active', 'inactive', 'blocked'].includes(shopStatus)
        ) {
            whereConfig.shopStatus = shopStatus;
        }

        if (createdBy) {
            const totalSellersId = await SellerModel.distinct('_id', {
                createdBy: ObjectId(createdBy),
            });

            whereConfig.$or = [
                { seller: { $in: totalSellersId } },
                { createdBy: ObjectId(createdBy) },
            ];
        }

        if (zoneId) {
            whereConfig.shopZone = zoneId;
        }

        if (
            deliveryBoyType &&
            ['shopRider', 'dropRider'].includes(deliveryBoyType)
        ) {
            whereConfig.haveOwnDeliveryBoy = deliveryBoyType === 'shopRider';
        }

        if (shopBrand) {
            whereConfig.shopBrand = shopBrand;
        }

        let list = await ShopModel.find(whereConfig)
            .sort({ totalOrder: sortByOrders })
            .populate([
                {
                    path: 'seller',
                    select: 'company_name profile_photo',
                },
                {
                    path: 'marketings',
                    select: 'type isActive onlyForSubscriber',
                },
            ])
            .select({
                shopName: 1,
                shopLogo: 1,
                commercial_circular_document: 1,
                tax_registration: 1,
                contact_paper: 1,
                shopID: 1,
                shopStatus: 1,
                liveStatus: 1,
                address: 1,
                rating: 1,
                totalOrder: 1,
                normalHours: 1,
                holidayHours: 1,
                shopBrand: 1,
                createdAt: 1,
                avgOrderDeliveryTime: 1,
                avgOrderValue: 1,
            })
            .lean();

        if (plusShop && ['yes', 'no'].includes(plusShop)) {
            const isSubscriber = plusShop === 'yes';

            list = list.filter(shop =>
                shop.marketings.some(
                    marketing => marketing.onlyForSubscriber === isSubscriber
                )
            );
        }

        if (
            marketingType &&
            [
                'percentage',
                'double_menu',
                'free_delivery',
                'reward',
                'featured',
                'punch_marketing',
            ].includes(marketingType)
        ) {
            list = list.filter(shop =>
                shop.marketings.some(
                    marketing => marketing.type === marketingType
                )
            );
        }

        if (marketingTypes?.length >= 3) {
            const parsedMarketingTypes = JSON.parse(marketingTypes);

            list = list.filter(shop =>
                shop.marketings.some(marketing =>
                    parsedMarketingTypes.includes(marketing.type)
                )
            );
        }

        const shopPromises = list.map(async shop => {
            // Calculate shop average delivered time
            // shop.avgOrderDeliveryTime = await shopAvgDeliveryTime(shop._id);

            // Calculate shop profit
            const [totalShopEarningFunc, totalShopUnsettleFunc] =
                await Promise.all([
                    getShopEarning({ type: 'shop', id: shop._id }),
                    getShopUnSettleAmount({ type: 'shop', id: shop._id }),
                ]);

            const totalShopEarning = totalShopEarningFunc.totalShopEarning;
            const totalShopUnsettle = totalShopUnsettleFunc.totalSellerUnsettle;

            shop.totalProfit = totalShopUnsettle + totalShopEarning;

            // Check Shop Opening time
            shop.isShopOpen = checkShopOpeningHours(shop);

            // // Calculate the total number of unique customers
            // const totalCustomers = await OrderModel.distinct('user', {
            //     shop: ObjectId(shop._id),
            //     orderStatus: 'delivered',
            // });
            // shop.totalCustomers = totalCustomers.length;

            return shop;
        });

        const updatedList = await Promise.all(shopPromises);

        if (sortByAvgTime || sortByRating || sortByProfit) {
            const sortByField = sortByAvgTime
                ? 'avgOrderDeliveryTime'
                : sortByRating
                    ? 'rating'
                    : 'totalProfit';
            const sortByDescending =
                sortByAvgTime.toLowerCase() === 'desc' ||
                sortByRating.toLowerCase() === 'desc' ||
                sortByProfit.toLowerCase() === 'desc';

            updatedList.sort((a, b) => {
                const aValue = new Date(a[sortByField]);
                const bValue = new Date(b[sortByField]);

                const result = aValue - bValue;
                return sortByDescending ? -result : result;
            });
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: updatedList.length,
            pagingRange: 5,
        });

        const finalList = updatedList.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: finalList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSellerShops = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            sellerId,
            shopStatus,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            parentShop: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const combinedQuery = newQuery.map(str => ({
                $or: [
                    { shopName: RegExp(str, 'i') },
                    { autoGenId: RegExp(str, 'i') },
                    { phone_number: RegExp(str, 'i') },
                    { email: RegExp(str, 'i') },
                ],
            }));
            whereConfig.$and = combinedQuery;
        }

        if (sellerId) {
            whereConfig.seller = sellerId;
        }

        if (
            shopStatus &&
            ['active', 'inactive', 'blocked'].includes(shopStatus)
        ) {
            whereConfig.shopStatus = shopStatus;
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: ShopModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        let list = await ShopModel.find(whereConfig)
            .sort({ totalOrder: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select({
                shopName: 1,
                shopLogo: 1,
                commercial_circular_document: 1,
                tax_registration: 1,
                contact_paper: 1,
                shopID: 1,
                shopStatus: 1,
                liveStatus: 1,
                rating: 1,
                totalOrder: 1,
                normalHours: 1,
                holidayHours: 1,
                shopBrand: 1,
                avgOrderDeliveryTime: 1,
                avgOrderValue: 1,
            })
            .lean();

        const shopPromises = list.map(async shop => {
            // Calculate the total number of unique customers
            const totalCustomers = await OrderModel.distinct('user', {
                shop: ObjectId(shop._id),
                orderStatus: 'delivered',
            });
            shop.totalCustomers = totalCustomers.length;

            return shop;
        });

        const updatedList = await Promise.all(shopPromises);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: updatedList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getSellerAllShops = async (req, res) => {
    try {
        const { searchKey, sellerId, shopStatus } = req.query;

        let whereConfig = {
            deletedAt: null,
            parentShop: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const combinedQuery = newQuery.map(str => ({
                $or: [
                    { shopName: RegExp(str, 'i') },
                    { autoGenId: RegExp(str, 'i') },
                    { phone_number: RegExp(str, 'i') },
                    { email: RegExp(str, 'i') },
                ],
            }));
            whereConfig.$and = combinedQuery;
        }

        if (sellerId) {
            whereConfig.seller = sellerId;
        }

        if (
            shopStatus &&
            ['active', 'inactive', 'blocked'].includes(shopStatus)
        ) {
            whereConfig.shopStatus = shopStatus;
        }

        const list = await ShopModel.find(whereConfig)
            .select({
                shopName: 1,
                shopLogo: 1,
                commercial_circular_document: 1,
                tax_registration: 1,
                contact_paper: 1,
                shopID: 1,
                shopStatus: 1,
                liveStatus: 1,
                avgOrderDeliveryTime: 1,
                avgOrderValue: 1,
            })
            .lean();

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: list,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getSingleShopById = async (req, res) => {
    try {
        const { shopId } = req.query;

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate([
                {
                    path: 'seller',
                    select: 'name phone_number company_name email profile_photo',
                },
                {
                    path: 'tagsId',
                    select: 'name',
                },
                {
                    path: 'cuisineType',
                    select: 'name',
                },
                {
                    path: 'reviews',
                    select: 'rating reviewVisibility',
                },
                {
                    path: 'marketings',
                    select: 'type creatorType products isActive status discountPercentages onlyForSubscriber',
                },
                {
                    path: 'shopZone',
                    select: 'zoneName',
                },
            ])
            .select({
                autoGenId: 1,
                seller: 1,
                shopType: 1,
                shopName: 1,
                phone_number: 1,
                name: 1,
                email: 1,
                shopLogo: 1,
                commercial_circular_document: 1,
                tax_registration: 1,
                contact_paper: 1,
                shopID: 1,
                shopBanner: 1,
                expensive: 1,
                shopStatus: 1,
                liveStatus: 1,
                tags: 1,
                tagsId: 1,
                minOrderAmount: 1,
                maxOrderAmount: 1,
                isCuisine: 1,
                cuisineType: 1,
                address: 1,
                shopReceivePaymentBy: 1,
                bank_name: 1,
                bank_address: 1,
                bank_postal_code: 1,
                account_name: 1,
                account_number: 1,
                account_swift: 1,
                payout_frequency: 1,
                rating: 1,
                totalOrder: 1,
                haveOwnDeliveryBoy: 1,
                deliveryFee: 1,
                reviews: 1,
                maxDiscount: 1,
                bestSeller: 1,
                shopFavourites: 1,
                marketings: 1,
                isFeatured: 1,
                orderCapacity: 1,
                paymentOption: 1,
                dietary: 1,
                normalHours: 1,
                holidayHours: 1,
                shopNote: 1,
                isShopNoteForRiderEnabled: 1,
                shopNoteForRider: 1,
                specialInstructions: 1,
                shopExchangeRate: 1,
                shopZone: 1,
                shopBrand: 1,
                defaultPreparationTime: 1,
                productView: 1,
                healthyCornerMinimumDays: 1,
                createdAt: 1,
                avgOrderDeliveryTime: 1,
                avgOrderValue: 1,
            });
        // .lean();

        if (!shop) return errorResponse(res, 'Shop not found');

        // const [orderStats, deliveryFeeStats] = await Promise.all([
        //     OrderModel.aggregate([
        //         {
        //             $match: { shop: shop._id, orderStatus: 'delivered' },
        //         },
        //         {
        //             $group: {
        //                 _id: '',
        //                 count: { $sum: 1 },
        //                 productAmount: {
        //                     $sum: {
        //                         $sum: ['$summary.baseCurrency_productAmount'],
        //                     },
        //                 },
        //                 totalAmount: {
        //                     $sum: {
        //                         $sum: ['$summary.baseCurrency_totalAmount'],
        //                     },
        //                 },
        //             },
        //         },
        //     ]),
        //     OrderModel.aggregate([
        //         {
        //             $match: {
        //                 shop: shop._id,
        //                 orderFor: 'specific',
        //                 orderStatus: 'delivered',
        //             },
        //         },
        //         {
        //             $group: {
        //                 _id: '',
        //                 count: { $sum: 1 },
        //                 deliveryFee: {
        //                     $sum: { $sum: ['$summary.baseCurrency_riderFee'] },
        //                 },
        //             },
        //         },
        //     ]),
        // ]);

        // const totalValue =
        //     orderStats.length > 0
        //         ? orderStats[0]
        //         : { count: 0, productAmount: 0, totalAmount: 0 };
        // const totalDeliveryFee =
        //     deliveryFeeStats.length > 0
        //         ? deliveryFeeStats[0]
        //         : { deliveryFee: 0 };

        // shop.orderValue = {
        //     ...totalValue,
        //     deliveryFee: totalDeliveryFee.deliveryFee,
        // };

        // const { avgOrderValue, avgOrderDeliveryTime } =
        //     await calcShopAvgOrderValueAndDeliveryTime(shop._id);
        // shop.avgOrderValue = avgOrderValue;
        // shop.avgOrderDeliveryTime = avgOrderDeliveryTime;

        // Finding account manager
        const accountManager = await AdminModel.findOne({
            sellers: { $in: [shop.seller._id] },
            adminType: 'accountManager',
        }).select('name phone_number email');
        shop.accountManager = accountManager;

        // Check Shop Opening time
        const isShopOpen = checkShopOpeningHours(shop);
        shop._doc.isShopOpen = isShopOpen;

        const reviews = shop.reviews;
        const filteredReviews = reviews.filter(review => review.reviewVisibility);

        const ratingPercentage = {
            1: getRatingPercentage(reviews, 1),
            2: getRatingPercentage(reviews, 2),
            3: getRatingPercentage(reviews, 3),
            4: getRatingPercentage(reviews, 4),
            5: getRatingPercentage(reviews, 5),
        };

        // shop.totalRating = shop.reviews.length;
        shop._doc.totalRating = reviews.length;
        shop._doc.ratingPercentage = ratingPercentage;
        shop.reviews = filteredReviews;

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

const calcShopAvgOrderValueAndDeliveryTime = async shopId => {
    const pipeline = [
        {
            $match: {
                shop: ObjectId(shopId),
                orderStatus: 'delivered',
            },
        },
        {
            $group: {
                _id: null,
                totalDeliveryTime: { $sum: '$deliveredMinutes' },
                totalOrders: { $sum: 1 },
                orderAmount: {
                    $sum: '$summary.baseCurrency_productAmount',
                },
            },
        },
        {
            $project: {
                avgOrderDeliveryTime: {
                    $cond: {
                        if: { $gt: ['$totalOrders', 0] },
                        then: {
                            $divide: ['$totalDeliveryTime', '$totalOrders'],
                        },
                        else: 30, // Default value if there are no orders
                    },
                },
                avgOrderValue: {
                    $cond: {
                        if: { $gt: ['$totalOrders', 0] },
                        then: {
                            $divide: ['$orderAmount', '$totalOrders'],
                        },
                        else: 0, // Default value if there are no orders
                    },
                },
            },
        },
    ];

    const result = await OrderModel.aggregate(pipeline);

    // The result is an array with a single object containing avgOrderDeliveryTime and avgOrderValue
    const avgOrderValues = result[0] || {
        avgOrderValue: 0,
        avgOrderDeliveryTime: 30,
    };

    return {
        avgOrderValue: parseFloat(avgOrderValues.avgOrderValue.toFixed(2)),
        avgOrderDeliveryTime: parseFloat(
            avgOrderValues.avgOrderDeliveryTime.toFixed(2)
        ),
    };
};

exports.getSingleShopReviews = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            startDate,
            endDate,
            sortBy = 'desc',
            shopId,
            reviewVisibility,
        } = req.query;

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate({
                path: 'reviews',
                populate: [
                    { path: 'user', select: 'name profile_photo' },
                    { path: 'order', select: 'orderId' },
                ],
            })
            .select({
                reviews: 1,
            })
            .lean();

        if (!shop) return errorResponse(res, 'Shop not found');

        let reviews = shop.reviews || [];

        if (searchKey) {
            const searchTerm = searchKey.toLowerCase();
            reviews = reviews.filter(
                review =>
                    review.user?.name.toLowerCase().includes(searchTerm) ||
                    review.order?.orderId.toLowerCase().includes(searchTerm)
            );
        }

        if (startDate && endDate) {
            const startDateTime = moment(new Date(startDate)).startOf('day');
            const endDateTime = moment(new Date(endDate)).endOf('day');

            reviews = reviews.filter(review => {
                const createdDate = moment(new Date(review.createdAt));

                return (
                    createdDate >= startDateTime && createdDate <= endDateTime
                );
            });
        }

        if (reviewVisibility) {
            reviews = reviews.filter(
                review =>
                    review.reviewVisibility.toString() ===
                    reviewVisibility.toString()
            );
        }

        if (sortBy) {
            const sortOrder = sortBy.toLowerCase() === 'desc' ? -1 : 1;
            reviews.sort(
                (a, b) =>
                    sortOrder * (new Date(a.createdAt) - new Date(b.createdAt))
            );
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: reviews.length,
            pagingRange: 5,
        });

        const finalReviews = reviews.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                reviews: finalReviews,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getSingleShopFlags = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            startDate,
            endDate,
            sortBy = 'desc',
            shopId,
            flaggedType, // cancelled || flagged
        } = req.query;

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate({
                path: 'flags',
                populate: [
                    {
                        path: 'orderId',
                        select: 'orderId',
                    },
                ],
            })
            .select({
                flags: 1,
            })
            .lean();

        if (!shop) return errorResponse(res, 'Shop not found');

        let flags = shop.flags || [];

        if (searchKey) {
            const searchTerm = searchKey.toLowerCase();
            flags = flags.filter(flag =>
                flag.orderId?.orderId.toLowerCase().includes(searchTerm)
            );
        }

        if (startDate && endDate) {
            flags = flags.filter(flag => {
                const createdDate = new Date(flag.createdAt);
                const createdAt = DateTime.fromJSDate(createdDate, {
                    zone: 'utc',
                }).toJSDate();
                const start = DateTime.fromISO(startDate).toUTC().toJSDate();
                const end = DateTime.fromISO(endDate)
                    .toUTC()
                    .plus({ days: 1 })
                    .toJSDate();

                return createdAt >= start && createdAt < end;
            });
        }

        if (flaggedType === 'cancelled') {
            flags = flags.filter(flag => flag.flaggedType === 'cancelled');
        }

        if (flaggedType === 'flagged') {
            flags = flags.filter(flag => flag.flaggedType !== 'cancelled');
        }

        if (sortBy) {
            const sortOrder = sortBy.toLowerCase() === 'desc' ? -1 : 1;
            flags.sort(
                (a, b) =>
                    sortOrder * (new Date(a.createdAt) - new Date(b.createdAt))
            );
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: flags.length,
            pagingRange: 5,
        });

        const finalFlags = flags.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                flags: finalFlags,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getCategorySubcategoryList = async (req, res) => {
    try {
        const {
            shopId,
        } = req.query;

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate([
                {
                    path: 'shopFavourites',
                    populate: {
                        path: 'products',
                        populate: {
                            path: 'product',
                            populate: 'category marketing addons shop',
                        },
                    },
                },
            ]).select("shopName shopType shopExchangeRate");

        if (!shop) return errorResponse(res, 'Shop not found');

        let categories = []
        // Fetch shop categories with search applied to the category name
        const shopCategories = await ShopCategory.find({
            shop: shopId,
        })
            .populate({
                path: 'category',
                select: '_id image name isUnsortable isShopBestSellers isShopFavorites',
            })
            .sort({
                sortingOrder: 1
            });

        // find all products in shop

        const products = await ProductModel.find({
            shop: shopId,
            deletedAt: null,
        })
            .sort({
                sortingOrder: 1
            })
            .populate([
                {
                    path: 'category',
                    select: 'name'
                },
                {
                    path: 'subCategory',
                    select: 'name'
                },
                {
                    path: 'attributes',
                    populate: 'items'
                },
                {
                    path: 'addons',
                }
            ]);


        // for all products, push product info into the category items list after calculating LBP
        // for all categories, add category info and number of items fields

        if (['food', 'coffee', 'flower', 'pet'].includes(shop.shopType)) {

            // create categories object
            const categoriesObject = {}

            for (const product of products) {

                // calculate secondary prices of product
                applyExchangeRate(product, shop.shopExchangeRate)

                const productCategory = product.category._id
                if (categoriesObject[productCategory]) {
                    categoriesObject[productCategory].push(product)
                }
                else {
                    categoriesObject[productCategory] = [product]
                }
            }

            for (const shopCategory of shopCategories) {

                const products = categoriesObject[shopCategory.category._id]

                categories.push({
                    _id: shopCategory.category._id,
                    category: {
                        ...shopCategory._doc,
                        category: {
                            _id: shopCategory.category._id,
                            name: shopCategory.name || shopCategory.category.name,
                            image: shopCategory.image || shopCategory.category.image,
                        },
                        items: products || [],
                        numberOfItems: products ? products.length : 0,
                    }
                })
            }
        } else {

            const subCategories = await SubCategoryModel.find({})
                .sort({
                    'sortingOrder': 1
                });
            const categoriesObject = {}
            const subCategoriesObject = {}

            // for each product, put it into the subcategory object
            // for each product, in the category object, store the ids of the subcategories as well as their info
            // for each category, for each subcategory, append the subcategory info and product list to the categories array

            for (const product of products) {

                // calculate secondary prices of product
                applyExchangeRate(product, shop.shopExchangeRate)

                const productCategory = product.category._id
                const productSubCategory = product.subCategory._id

                if (!categoriesObject[productCategory]) {
                    const categoryInfo = shopCategories.find((shopCategory) => shopCategory.category._id == productCategory.toString())
                    categoriesObject[productCategory] = {
                        ...categoryInfo,
                        subCategories: [],
                        numberOfItems: 0
                    }
                }

                if (subCategoriesObject[productSubCategory]) {
                    subCategoriesObject[productSubCategory]['items'].push(product)
                    subCategoriesObject[productSubCategory]['numberOfItems'] += 1
                }
                else {
                    const subCategory = subCategories.find((elem) => elem._id == productSubCategory.toString())
                    subCategoriesObject[productSubCategory] = {
                        ...subCategory?._doc,
                        items: [product],
                        numberOfItems: 1
                    }
                    categoriesObject[productCategory]['subCategories'].push(productSubCategory)
                    categoriesObject[productCategory]['numberOfItems'] += 1
                }
            }

            for (const shopCategory of shopCategories) {

                let _subCategories = []

                for (const subCategory of subCategories) {

                    if (subCategory.category == shopCategory.category._id.toString()) {
                        if (subCategoriesObject[subCategory._id]) {
                            _subCategories.push(subCategoriesObject[subCategory._id])
                        }
                        else {
                            _subCategories.push({
                                ...subCategory._doc,
                                items: [],
                                numberOfItems: 0
                            })
                        }
                    }
                }

                categories.push({
                    _id: shopCategory.category._id,
                    category: {
                        ...shopCategory._doc,
                        category: {
                            _id: shopCategory.category._id,
                            name: shopCategory.name || shopCategory.category.name,
                            image: shopCategory.image || shopCategory.category.image,
                        },
                        subCategory: _subCategories
                    }
                })
            }
        }

        // Finding Best Seller Items

        const orderItems = await OrderModel.aggregate([
            // match orders with orderStatus: delivered and shop: desiredShopId
            {
                $match: {
                    orderStatus: 'delivered',
                    shop: ObjectId(shopId),
                },
            },
            // unwind the products array to get one document per product
            {
                $unwind: '$products',
            },
            // join with the Product collection to get details about the product
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            // // unwind the product array to get one document per product
            {
                $unwind: '$product',
            },
            // // match products with status: active and productVisibility: true
            {
                $match: {
                    'product.status': 'active',
                    'product.productVisibility': true,
                    'product.deletedAt': null,
                },
            },
            // group by product id and sum the quantity of each product sold
            {
                $group: {
                    _id: '$products.product',
                    totalSold: { $sum: '$products.quantity' },
                },
            },
            // sort by totalSold in descending order
            {
                $sort: {
                    totalSold: -1,
                },
            },
            // // limit to the top 10 best sellers
            {
                $limit: 3,
            },
        ]);

        const bestSellerItems = await ProductModel.populate(orderItems, {
            path: '_id',
            populate: [
                {
                    path: 'category',
                },
                {
                    path: 'shop',
                },
                {
                    path: 'seller',
                },
                {
                    path: 'addons',
                },
                {
                    path: 'marketing',
                },
            ],
        });

        for (const product of bestSellerItems) {
            let isAllocatedIntoBanner = false;
            const findProductBanner = await BannerModel.countDocuments({
                productId: product._id._id,
            });
            if (findProductBanner > 0) isAllocatedIntoBanner = true;

            product._id._doc.isAllocatedIntoBanner = isAllocatedIntoBanner;
        }

        // Shop favourites item
        const shopFavouriteItems = shop._doc.shopFavourites.products;

        const sortedShopFavouriteItems = shopFavouriteItems.sort(
            (a, b) => a.sortingOrder - b.sortingOrder
        );
        for (const product of sortedShopFavouriteItems) {
            let isAllocatedIntoBanner = false;
            const findProductBanner = await BannerModel.countDocuments({
                productId: product.product._id,
            });
            if (findProductBanner > 0) isAllocatedIntoBanner = true;

            product.product._doc.isAllocatedIntoBanner = isAllocatedIntoBanner;
            product.product._doc.shop = { _id: product.product.shop._id, shopExchangeRate: product.product.shop.shopExchangeRate }
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                categories,
                bestSellerItems,
                shopFavouriteItems: sortedShopFavouriteItems,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.createShops = async (req, res) => {
    try {
        let {
            dietaryType,
            seller,
            shopName,
            phone_number,
            email,
            password,
            shopLogo,
            shopBanner,
            commercial_circular_document,
            tax_registration,
            contact_paper,
            shopID,
            unit,
            expensive,
            shopStatus,
            deliveryType,
            freeDelivery,
            isFeatured,
            tags = [],
            tagsId,
            minOrderAmount,
            maxOrderAmount,
            shopAddress,
            liveStatus = 'online',
            isCuisine = false,
            cuisineType = [],
            deliveryFee,
            bank_name,
            bank_address,
            bank_city,
            bank_postal_code,
            account_type,
            account_name,
            account_number,
            account_swift,
            payout_frequency,
            maxDiscount,
            orderCapacity,
            // paymentOption,
            dietary,
            normalHours,
            shopNote,
            shopNoteForRider,
            isShopNoteForRiderEnabled,
            name,
            specialInstructions,
            shopZone,
            shopBrand,
            shopReceivePaymentBy,
            defaultPreparationTime,
            productView,
            healthyCornerMinimumDays,
        } = req.body;

        const {
            address,
            addressDescription,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            note,
            placeId,
        } = shopAddress;

        const sellerExits = await SellerModel.findOne({ _id: seller });

        if (!sellerExits) {
            return errorResponse(res, 'Seller not found');
        }

        const shopExist = await ShopModel.findOne({
            shopName: { $regex: `^${shopName}$`, $options: 'i' },
            shopType: sellerExits.sellerType,
            deletedAt: null,
        });

        if (shopExist)
            return errorResponse(res, 'This shop name is already exists.');

        if (!email) {
            return errorResponse(res, 'email is required');
        }

        email = email.toLowerCase();

        if (!password) {
            return errorResponse(res, 'password is required');
        }

        if (tags.length < 3) {
            return errorResponse(res, 'Tags must be at least 3');
        }

        if (deliveryType === 'self') {
            if (!deliveryFee) {
                return errorResponse(res, 'Delivery fee is required');
            }
        }

        // check email
        const emailExits = await ShopModel.findOne({
            email,
            deletedAt: null,
        });

        if (emailExits) {
            return errorResponse(res, 'Email is already in use');
        }

        // // check phone number
        // const phoneNumberExits = await ShopModel.findOne({
        //     phone_number,
        //     deletedAt: null,
        // });

        // if (phoneNumberExits) {
        //     return errorResponse(res, 'Phone number is already in use');
        // }


        // Add exchange rate
        const appSetting = await AppSetting.findOne();
        const adminExchangeRate = appSetting?.adminExchangeRate || 0;
        const counter = await autoIncrement(`shops`);
        const shop = await ShopModel.create({
            autoGenId: counter.seq_value.toString().padStart(5, '0'),
            seller: sellerExits._id,
            shopType: sellerExits.sellerType,
            shopName,
            phone_number,
            email,
            password,
            shopLogo,
            unit,
            shopBanner,
            commercial_circular_document,
            tax_registration,
            contact_paper,
            shopID,
            shopStatus,
            tags,
            tagsId,
            expensive,
            minOrderAmount: deliveryType === 'self' ? minOrderAmount : appSetting._doc?.minOrderAmount ?? 0,
            maxOrderAmount,
            liveStatus,
            isCuisine,
            cuisineType: isCuisine ? cuisineType : [],
            freeDelivery,
            isFeatured,
            address: {
                address,
                addressDescription,
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                longitude,
                latitude,
                country,
                state,
                city,
                pin,
                note,
                placeId,
            },
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            haveOwnDeliveryBoy: deliveryType === 'self' ? true : false,
            deliveryFee: deliveryType === 'self' ? deliveryFee : 0,
            bank_name,
            bank_address,
            bank_city,
            bank_postal_code,
            account_type,
            account_name,
            account_number,
            account_swift,
            payout_frequency,
            maxDiscount,
            orderCapacity,
            paymentOption: appSetting?.paymentOption,
            dietary: dietaryType,
            normalHours,
            shopNote,
            shopNoteForRider,
            isShopNoteForRiderEnabled,
            name,
            specialInstructions,
            shopExchangeRate: adminExchangeRate,
            shopZone,
            shopBrand,
            shopReceivePaymentBy,
            defaultPreparationTime,
            productView,
            healthyCornerMinimumDays,
            assignedSalesManager: sellerExits.assignedSalesManager,
        });

        // update shop _id to SellerModel
        await SellerModel.updateOne(
            { _id: seller },
            {
                $push: {
                    shops: shop._id,
                },
            }
        );

        const newShop = await ShopModel.findOne({ _id: shop._id })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                // {
                //     path: 'deals',
                // },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'tagsId',
                },
            ])
            .select('-categories');

        successResponse(res, {
            message: 'Successfully added Shop',
            data: {
                shop: newShop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addShopCredential = async (req, res) => {
    try {
        let {
            shopId,
            name,
            email,
            password,
            credentialType = 'credentialUser',
        } = req.body;

        if (!email) {
            return errorResponse(res, 'email is required');
        }
        email = email.toLowerCase();

        if (!password) {
            return errorResponse(res, 'password is required');
        }

        const found = await ShopModel.findOne({ _id: shopId, deletedAt: null });
        if (!found) {
            return errorResponse(res, 'Shop not found');
        }

        // check gmail
        const gmailExits = await ShopModel.findOne({
            email: email,
            deletedAt: null,
        }).lean();
        if (gmailExits) {
            return errorResponse(res, 'email is already in use try another');
        }

        const shop = await ShopModel.create({
            email,
            name,
            password,
            parentShop: shopId,
            credentialType,
        });

        // update shop _id to SellerModel
        await ShopModel.updateOne(
            { _id: shopId },
            {
                $push: {
                    credentials: shop._id,
                },
            }
        );

        const list = await ShopModel.findById(shopId)
            .select('credentials')
            .populate({
                path: 'credentials',
                select: '-flags -reviews -banner -products',
            });

        successResponse(res, {
            message: 'Successfully added Shop credential',
            data: {
                list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateShopCredential = async (req, res) => {
    try {
        let { id, name, password, credentialType } = req.body;

        const shop = await ShopModel.findById(id);

        if (!shop) {
            return errorResponse(res, 'shop not found');
        }

        let encryptedPassword;

        if (password) {
            encryptedPassword = await bcrypt.hash(password, 10);
        }

        await ShopModel.updateOne(
            { _id: id },
            {
                name,
                password: encryptedPassword,
                credentialType,
            }
        );

        const list = await ShopModel.findById(shop.parentShop)
            .select('credentials')
            .populate({
                path: 'credentials',
                select: '-flags -reviews -banner -products',
            });

        successResponse(res, {
            message: 'Successfully updated Shop credential',
            data: {
                list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCredentialList = async (req, res) => {
    try {
        const { id, credentialType } = req.query;

        const shopFind = await ShopModel.findOne({
            _id: id,
        }).lean();

        if (!shopFind) {
            return errorResponse(res, 'shop not found');
        }
        let list = await ShopModel.findById(id).select('credentials').populate({
            path: 'credentials',
            select: '-flags -reviews -banner -products',
        });

        if (
            credentialType &&
            ['credentialUser', 'shopOrderManager'].includes(credentialType)
        ) {
            const filteredCredentials = list.credentials.filter(
                credential => credential.credentialType === credentialType
            );
            list._doc.credentials = filteredCredentials;
        }

        successResponse(res, {
            message: 'success',
            data: {
                credentials: list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.removeShopCredential = async (req, res) => {
    try {
        let { shopId } = req.body;

        const shop = await ShopModel.findById(shopId);

        if (!shop) {
            return errorResponse(res, 'shop not found');
        }

        if (!shop.parentShop) {
            return errorResponse(res, 'this is not a credential shop');
        }

        const parentShopId = shop.parentShop;

        // pull shopId from parentShopId shop
        await ShopModel.updateOne(
            { _id: parentShopId },
            {
                $pull: {
                    credentials: shopId,
                },
            }
        );

        await ShopModel.deleteOne({ _id: shopId });

        const list = await ShopModel.findById(parentShopId)
            .select('credentials')
            .populate({
                path: 'credentials',
                select: '-flags -reviews -banner -products',
            });

        successResponse(res, {
            message: 'Successfully removed Shop credential',
            data: {
                remaining: list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
exports.addFeatherShop = async (req, res) => {
    try {
        const { id, isFeatured } = req.body;

        const isExist = await ShopModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Shop not found');

        await ShopModel.updateOne(
            { _id: id },
            {
                $set: {
                    isFeatured: isFeatured,
                    featuredUpdatedTime: new Date(),
                },
            }
        );

        successResponse(res, {
            message: 'Successfully added Shop',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateShop = async (req, res) => {
    try {
        let {
            id,
            shopType,
            foodType,
            isCuisine,
            cuisineType,
            shopName,
            phone_number,
            email,
            password,
            shopLogo,
            shopBanner,
            commercial_circular_document,
            tax_registration,
            contact_paper,
            shopID,
            unit,
            shopStatus,
            tags,
            tagsId,
            expensive,
            minOrderAmount,
            liveStatus,
            freeDelivery,
            shopAddress,
            isFeatured,
            deliveryType,
            deliveryFee,
            bank_name,
            bank_address,
            bank_city,
            bank_postal_code,
            account_type,
            account_name,
            account_number,
            account_swift,
            payout_frequency,
            maxDiscount,
            orderCapacity,
            paymentOption,
            dietary,
            shopNote,
            shopNoteForRider,
            isShopNoteForRiderEnabled,
            name,
            specialInstructions,
            shopExchangeRate,
            shopZone,
            shopBrand,
            shopReceivePaymentBy,
            defaultPreparationTime,
            productView,
            healthyCornerMinimumDays,
        } = req.body;

        const {
            address,
            addressDescription,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            note,
            placeId,
        } = shopAddress;


        const isExist = await ShopModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Shop not found');

        if (shopName) {
            const shopExist = await ShopModel.findOne({
                _id: { $ne: id },
                shopName: { $regex: `^${shopName}$`, $options: 'i' },
                shopType: isExist.shopType,
                deletedAt: null,
            });

            if (shopExist)
                return errorResponse(res, 'This shop name is already exists.');
        }

        if (tags && tags.length < 3) {
            return errorResponse(res, 'Tags must be at least 3');
        }

        if (liveStatus) {
            if (!['online', 'offline'].includes(liveStatus)) {
                return errorResponse(
                    res,
                    'liveStatus must be online or offline'
                );
            }

            if (isExist.liveStatus === 'busy') {
                return errorResponse(res, 'Shop is busy');
            }
        }

        const appSetting = await AppSetting.findOne({});

        if (shopExchangeRate) {
            const adminExchangeRate = appSetting?.adminExchangeRate || 0;

            const exchangeRateLimit = adminExchangeRate * 0.1; //10% of adminExchangeRate
            const upperLimit = adminExchangeRate + exchangeRateLimit;
            const lowerLimit = adminExchangeRate - exchangeRateLimit;

            if (
                shopExchangeRate > upperLimit ||
                shopExchangeRate < lowerLimit
            ) {
                return errorResponse(
                    res,
                    `Exchange rate must be 10%  up and down of the admin exchange rate ${adminExchangeRate}.`
                );
            }
        }

        let updatedData = {
            isFeatured,
            shopType,
            foodType,
            isCuisine,
            cuisineType,
            shopName,
            shopLogo,
            shopBanner,
            commercial_circular_document,
            tax_registration,
            contact_paper,
            shopID,
            unit,
            shopStatus,
            tags,
            tagsId,
            expensive,
            minOrderAmount,
            freeDelivery,
            bank_name,
            bank_address,
            bank_city,
            bank_postal_code,
            account_type,
            account_name,
            account_number,
            account_swift,
            payout_frequency,
            address: {
                address,
                addressDescription,
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                longitude,
                latitude,
                country,
                state,
                city,
                pin,
                note,
                placeId,
            },
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
            maxDiscount,
            orderCapacity,
            paymentOption,
            dietary,
            shopNote,
            shopNoteForRider,
            isShopNoteForRiderEnabled,
            name,
            specialInstructions,
            shopExchangeRate,
            shopZone,
            shopBrand,
            shopReceivePaymentBy,
            defaultPreparationTime,
            productView,
            healthyCornerMinimumDays,
        };

        if (deliveryType) {
            if (
                (isExist?.haveOwnDeliveryBoy && deliveryType != 'self') ||
                (!isExist?.haveOwnDeliveryBoy && deliveryType == 'self')
            ) {
                const shopOngoingOrder = await OrderModel.countDocuments({
                    orderStatus: {
                        $in: [
                            'placed',
                            'accepted_delivery_boy',
                            'preparing',
                            'ready_to_pickup',
                            'order_on_the_way',
                        ],
                    },
                    shop: id,
                });

                if (shopOngoingOrder > 0) {
                    return errorResponse(
                        res,
                        'There are some ongoing orders. Please delivered or cancel the orders first.'
                    );
                }

                const findFreeDeliveryMarketing =
                    await MarketingModel.countDocuments({
                        shop: id,
                        type: 'free_delivery',
                        deletedAt: null,
                    });

                if (findFreeDeliveryMarketing > 0) {
                    return errorResponse(
                        res,
                        'This shop offers free delivery promotion. Please end this promotion before change deliveryType.'
                    );
                }
            }

            if (deliveryType == 'self') {
                updatedData.haveOwnDeliveryBoy = true;
                updatedData.minOrderAmount = minOrderAmount;

                if (!deliveryFee) {
                    return errorResponse(res, 'Delivery fee is required');
                }

                if (deliveryFee < 0) {
                    return errorResponse(
                        res,
                        'deliveryFee must be greater than 0'
                    );
                }

                if (deliveryFee > 0) {
                    updatedData.deliveryFee = deliveryFee;
                }
            } else {
                updatedData.haveOwnDeliveryBoy = false;
                updatedData.minOrderAmount = appSetting.minOrderAmount;
            }
        }

        if (email) {
            email = email.toLowerCase();

            const emailExits = await ShopModel.findOne({
                email: email,
                deletedAt: null,
                $nor: [{ _id: id }],
            });
            if (emailExits) {
                return errorResponse(res, 'Email is already in use');
            }

            updatedData.email = email;
        }

        if (phone_number) {
            // const phoneExits = await ShopModel.findOne({
            //     phone_number: phone_number,
            //     deletedAt: null,
            //     $nor: [{ _id: id }],
            // });
            // if (phoneExits) {
            //     return errorResponse(res, 'Phone number is already in use');
            // }

            updatedData.phone_number = phone_number;
        }

        if (password) {
            updatedData.password = await bcrypt.hash(password, 10);
        }

        await ShopModel.updateOne(
            { _id: id },
            {
                $set: updatedData,
            }
        );

        if (liveStatus) {
            if (liveStatus === 'online' && isExist.liveStatus === 'offline') {
                const lastOffline = isExist.lastOffline || new Date();

                const total = calcActiveTime(lastOffline, new Date());

                await ShopDowntimeModel.create({
                    shop: id,
                    seller: isExist.seller,
                    Date: new Date(),
                    timeOffline: moment(new Date(lastOffline)).format(
                        'DD MMM YYYY hh:mm A'
                    ),
                    timeOnline: moment(new Date()).format(
                        'DD MMM YYYY hh:mm A'
                    ),
                    downTimeTotal: total,
                });
                await ShopModel.updateOne(
                    { _id: id },
                    {
                        $set: {
                            liveStatus,
                            lastOffline: null,
                        },
                    }
                );
            }

            if (liveStatus === 'offline' && isExist.liveStatus === 'online') {
                await ShopModel.updateOne(
                    { _id: id },
                    {
                        $set: {
                            liveStatus,
                            lastOffline: moment(new Date()).format(
                                'DD MMM YYYY hh:mm A'
                            ),
                        },
                    }
                );
            }
        }

        if (orderCapacity != isExist.orderCapacity) {
            // Check shop order capacity
            await checkShopCapacity(id);
        }

        const shop = await ShopModel.findOne({ _id: id })
            .select('-categories')
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'tagsId',
                },
                {
                    path: 'credentials',
                },
                {
                    path: 'flags',
                    populate: 'user orderId shop delivery',
                },
                {
                    path: 'reviews',
                    populate: 'user product shop order',
                },
            ]);

        // update product all

        //**Comment this for don't getting any reason for this logic by Sajib */
        // const sStatus = shop.shopStatus; // active , inactive
        // const lStatus = shop.liveStatus; // online, offline

        // if (sStatus === 'active' && lStatus === 'online') {
        //     await ProductModel.updateMany(
        //         { shop: shop._id },
        //         {
        //             productVisibility: true,
        //         }
        //     );
        // } else {
        //     await ProductModel.updateMany(
        //         { shop: shop._id },
        //         {
        //             productVisibility: false,
        //         }
        //     );
        // }

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getSingleShopDetails = async (req, res) => {
    try {
        const { id } = req.query;

        const shop = await ShopModel.findById(id)
            .lean()
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },

                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        if (!shop) return errorResponse(res, 'shop not found');

        successResponse(res, {
            message: 'Successfully find shop',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//  Delete Admins ---

exports.deleteShopById = async (req, res) => {
    try {
        const { id } = req.body;

        const isExist = await ShopModel.findOne({ _id: id });

        if (!isExist) return errorHandler(res, { message: 'Shop not found' });

        await ShopModel.updateOne(
            { _id: id },
            {
                $set: {
                    deletedAt: new Date(),
                },
            }
        );

        await SellerModel.updateOne(
            { _id: isExist.seller },
            {
                $pull: {
                    shops: id,
                },
            }
        );

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopDetailsForAdmin = async (req, res) => {
    try {
        const { id } = req.query;

        const shop = await ShopModel.findOne({ _id: id })
            .populate([
                //     {
                //         path: 'seller',
                //         select: '-password',
                //     },

                // {
                //     path: 'banner',
                // },
                //     {
                //         path: 'marketings',
                //     },
                {
                    path: 'tagsId',
                },
                //     {
                //         path: 'cuisineType',
                //     },
                // {
                //     path: 'credentials',
                // },
                // {
                //     path: 'shopZone',
                // },
                // {
                //     path: 'flags',
                //     populate: [
                //         {
                //             path: 'user',
                //         },
                //         {
                //             path: 'orderId',
                //             populate: 'user deliveryBoy',
                //         },
                //         {
                //             path: 'shop',
                //         },
                //         {
                //             path: 'delivery',
                //         },
                //     ],
                // },
                {
                    path: 'reviews',
                    populate: 'user product shop order rating reviewVisibility',
                },
            ])
            .select([
                'address',
                'normalHours',
                'holidayHours',
                'seller',
                'paymentOption',
                'maxDiscount',
                'expensive',
                'dietary',
                'specialInstructions',
                'deliveryFee',
                'minOrderAmount',
                'haveOwnDeliveryBoy',
                'tags',
                // 'tagsId',
                'orderCapacity',
                'shopExchangeRate',
                'shopNote',
                'isShopNoteForRiderEnabled',
                'defaultPreparationTime',
                'productView',
                'shopType',
                'marketings',
                'shopName',
                'shopLogo',
                'shopStatus',
                'liveStatus',
                'shopBanner'
            ]);

        if (!shop) return errorResponse(res, 'Shop not found');

        const totalValue = await OrderModel.aggregate([
            {
                $match: { shop: ObjectId(shop._id), orderStatus: 'delivered' },
            },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    productAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_productAmount'] },
                    },
                    totalAmount: {
                        $sum: { $sum: ['$summary.baseCurrency_totalAmount'] },
                    },
                },
            },
        ]);

        if (totalValue.length < 1) {
            totalValue.push({
                count: 0,
                productAmount: 0,
                totalAmount: 0,
            });
        }

        const totalDeliveryFee = await OrderModel.aggregate([
            {
                $match: {
                    shop: ObjectId(shop._id),
                    orderFor: 'specific',
                    orderStatus: 'delivered',
                },
            },
            // {
            //     $match: {
            //         $and: [
            //             { orderFor: 'specific' },
            //             {
            //                 orderStatus: {
            //                     $nin: [
            //                         'cancelled',
            //                         'placed',
            //                         'refused',
            //                         'schedule',
            //                     ],
            //                 },
            //             },
            //         ],
            //     },
            // },
            {
                $group: {
                    _id: '',
                    count: { $sum: 1 },
                    deliveryFee: {
                        $sum: { $sum: ['$summary.baseCurrency_riderFee'] },
                    },
                },
            },
        ]);

        if (totalDeliveryFee.length < 1) {
            totalDeliveryFee.push({
                deliveryFee: 0,
            });
        }

        shop._doc.orderValue = {
            ...totalValue[0],
            deliveryFee: totalDeliveryFee[0].deliveryFee,
        };

        // const avgOrderDeliveryTime = await shopAvgDeliveryTime(shop._id);
        // shop._doc.avgOrderDeliveryTime = avgOrderDeliveryTime;

        // Finding account manager
        const accountManager = await AdminModel.findOne({
            sellers: { $in: [shop.seller._id] },
            adminType: 'accountManager',
        });
        shop._doc.accountManager = accountManager;

        // Check Shop Opening time
        const isShopOpen = checkShopOpeningHours(shop);
        shop._doc.isShopOpen = isShopOpen;

        // Finding shop zone
        // const zone = await findZone(
        //     shop.location.coordinates[1],
        //     shop.location.coordinates[0]
        // );
        // shop._doc.shopZone = zone;


        const ratingPercentage = {
            1: getRatingPercentage(shop.reviews, 1),
            2: getRatingPercentage(shop.reviews, 2),
            3: getRatingPercentage(shop.reviews, 3),
            4: getRatingPercentage(shop.reviews, 4),
            5: getRatingPercentage(shop.reviews, 5),
        };

        // shop.totalRating = shop.reviews.length;
        shop._doc.totalRating = shop.reviews.length;
        shop._doc.ratingPercentage = ratingPercentage;

        const { address, normalHours, holidayHours, seller, reviews, ...rest } =
            shop._doc;

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shop: rest,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.changeShopVisibility = async (req, res) => {
    try {
        const { id, liveStatus } = req.body;

        const isExist = await ShopModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Shop not found');

        if (!['online', 'offline'].includes(liveStatus))
            return errorResponse(res, 'liveStatus must be online or offline');

        await ShopModel.updateOne(
            { _id: id },
            {
                $set: {
                    liveStatus,
                },
            }
        );

        const shop = await ShopModel.findOne({ _id: id }).populate([
            {
                path: 'seller',
                select: '-password',
            },
            {
                path: 'banner',
            },
            {
                path: 'marketings',
            },
            // {
            //     path: 'deals',
            // },
            {
                path: 'cuisineType',
            },
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSuperMarket = async (req, res) => {
    try {
        const superMarkets = await ShopModel.aggregate([
            { $match: { foodType: 'supermarkets', deletedAt: null } },
            {
                $sample: {
                    size: 5,
                },
            },
            {
                $group: {
                    _id: '$_id',
                    result: { $push: '$$ROOT' },
                },
            },
            {
                $replaceRoot: {
                    newRoot: { $first: '$result' },
                },
            },
        ]);

        successResponse(res, {
            message: 'successfully find',
            data: superMarkets,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getShopForUserApp = async (req, res) => {
    try {
        const plusUser = req.plusUser;

        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            seller,
            shopType,
            cuisineType,
            latitude,
            longitude,
        } = req.query;

        const appSetting = await AppSetting.findOne({});
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let whereConfig = {
            _id: {
                $in: await findNearestShopIdsForEachBrand(
                    longitude,
                    latitude,
                    maxDistanceInMeters
                ),
            }, //TODO: need to test
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            deletedAt: null,
            // liveStatus: 'online',
            parentShop: null,
        };

        if (
            shopType &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(shopType)
        ) {
            whereConfig = {
                shopType: shopType,
                ...whereConfig,
            };
        }

        if (seller) {
            whereConfig = {
                seller: seller,
                ...whereConfig,
            };
        }

        let shopMatchConfig = {
            ...whereConfig,
        };

        if (cuisineType) {
            whereConfig = {
                isCuisine: true,
                cuisineType: cuisineType,
                ...whereConfig,
            };
        }

        // if (searchKey) {
        //     const newQuery = searchKey.split(/[ ,]+/);
        //     const nameSearchQuery = newQuery.map(str => ({
        //         shopName: RegExp(str, 'i'),
        //     }));

        //     const autoGenIdQ = newQuery.map(str => ({
        //         autoGenId: RegExp(str, 'i'),
        //     }));

        //     whereConfig = {
        //         ...whereConfig,
        //         $and: [
        //             {
        //                 $or: [{ $and: nameSearchQuery }, { $and: autoGenIdQ }],
        //             },
        //         ],
        //     };
        // }

        let shopList = await ShopModel.find(whereConfig)
            .sort(shopCommonSorting)
            .select('-categories')
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'credentials',
                    select: '_id email',
                },
            ]);

        if (searchKey) {
            shopList = shopList.filter(shop => {
                const searchTerm = searchKey.toLowerCase();

                const matchesName = shop?.shopName
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesId = shop?.autoGenId
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesTags = shop?.tags?.some(tag =>
                    tag?.toLowerCase().includes(searchTerm)
                );
                const matchesCuisines = shop?.cuisineType?.some(cuisine =>
                    cuisine?.name?.toLowerCase().includes(searchTerm)
                );

                return (
                    matchesName || matchesId || matchesTags || matchesCuisines
                );
            });
        }

        //** Find matching shop by first shop tags and cuisines */
        const shopTags = shopList[0]?.tags;
        const shopCuisines = shopList[0]?.cuisineType;

        let shopListMatchFirstShopTags = [];

        if (shopTags?.length > 0 || shopCuisines?.length > 0) {
            const newShopMatchConfig = {
                ...shopMatchConfig,
                $or: [
                    { tags: { $in: shopTags } },
                    { cuisineType: { $in: shopCuisines } },
                ],
            };

            shopListMatchFirstShopTags = await ShopModel.find(
                newShopMatchConfig
            )
                .sort(shopCommonSorting)
                .select('-categories')
                .populate([
                    {
                        path: 'seller',
                        select: '-password',
                    },
                    {
                        path: 'banner',
                    },
                    {
                        path: 'marketings',
                    },
                    {
                        path: 'cuisineType',
                    },
                    {
                        path: 'credentials',
                        select: '_id email',
                    },
                ]);
        }

        const featuredShops = await ShopModel.find({
            isFeatured: true,
            ...shopMatchConfig,
        })
            .sort({ featuredUpdatedTime: sortBy })
            .select('-categories')
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'credentials',
                    select: '_id email',
                },
            ]);

        let newShopList = [...shopList, ...shopListMatchFirstShopTags];

        if (newShopList.length > 0) {
            newShopList.push(...featuredShops);
        }

        const uniqueShopList = [];

        for (const shop of newShopList) {
            const findShop = uniqueShopList?.find(
                uniqueShop =>
                    uniqueShop?._id?.toString() === shop?._id?.toString()
            );
            if (!findShop) {
                uniqueShopList.push(shop);
            }
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: uniqueShopList.length,
            pagingRange: 5,
        });

        const finalShopList = uniqueShopList.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        let newList = [];
        for (let shop of finalShopList) {
            let deliveryFee = await getDeliveryCharge(
                shop,
                latitude,
                longitude,
                plusUser
            );
            const isShopOpen = checkShopOpeningHours(shop);

            if (!plusUser) {
                await checkPlusUserMarketing(shop, true);
            }

            newList.push({
                ...shop._doc,
                deliveryFee: deliveryFee,
                isShopOpen,
            });
        }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                shops: newList,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getNearByProductForUserApp = async (req, res) => {
    try {
        const { latitude, longitude, type } = req.query;
        const appSetting = await AppSetting.findOne();
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let config = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            shopStatus: 'active',
            // liveStatus: 'online',
            parentShop: null,
        };

        if (
            type &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(type)
        ) {
            config = {
                ...config,
                shopType: type,
            };
        }

        let list = await ShopModel.find(config)
            .sort({ createdAt: 'DESC' })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                // {
                //     path: 'deals',
                // },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'credentials',
                    select: '_id email',
                },
            ])
            .select('-categories');

        let deliveryRange = [];
        const globalDropCharge = await GlobalDropCharge.findOne({});
        if (globalDropCharge) {
            deliveryRange = globalDropCharge.deliveryRange;
        }

        //    add deliveryRange in every item in list
        list.map(item => {
            item._doc.deliveryRange = deliveryRange;
        });

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleShopDetailsForApps = async (req, res) => {
    try {
        const plusUser = req.plusUser;
        const userId = req.userId;
        const { id, latitude, longitude } = req.query;

        if (!id) return errorResponse(res, 'id is required');

        if (!latitude || !longitude)
            return errorResponse(res, 'latitude and longitude are required');

        let shop = await ShopModel.findById(id).select('-password -fcmToken -tagsId -bank_name -bank_address -flags -bank_address -bank_postal_code -productView -sortingOrder -dishes -mealPlans -commercial_circular_document -tax_registration -contact_paper -shopID -createdAt -updatedAt -autoGenId -shopFavourites -seller -pin -note -placeId -shopZone -__v -lastOffline -products -credentials -reviews').populate([

            {
                path: 'marketings',
            },

        ]);

        if (!shop) return errorResponse(res, 'shop not found');
        const productsGroupByCategory = {}

        if (shop.type != 'food') {
            const categoryList = await ShopCategory.find({
                shop: shop,
                status: 'active',
            }).select('-__v -createdAt -updatedAt').populate({ path: 'category', select: '-note -sortingOrder -updatedAt' });

            const updatedCategoryList = overwriteCategoryInfo(categoryList)

            shop._doc.categories = updatedCategoryList;

            const sortedCategoryList = updatedCategoryList.sort((a, b) => {
                if (a?.sortingOrder === b?.sortingOrder) {
                    return (
                        new Date(b?.category?.createdAt) -
                        new Date(a?.category?.createdAt)
                    );
                }
                return a?.sortingOrder - b?.sortingOrder;
            });


            productsGroupByCategory.category = sortedCategoryList

        }

        const deliveryFee = await getDeliveryCharge(
            shop,
            latitude,
            longitude,
            plusUser
        );
        shop._doc.deliveryFee = deliveryFee;
        const isShopOpen = checkShopOpeningHours(shop);
        shop._doc.isShopOpen = isShopOpen;
        const appSetting = await AppSetting.findOne({}).select('paymentOption');
        shop._doc.paymentOption = appSetting.paymentOption;
        successResponse(res, {
            message: 'Successfully find shop',
            data: {
                shop,
                productsGroupByCategory,

            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCategoryList = async (req, res) => {


    try {
        const plusUser = req.plusUser;
        const userId = req.userId;
        const id = req.params.id

        if (!id) return errorResponse(res, 'id is required');



        let shop = await ShopModel.findById(req.params.id).select('shopExchangeRate bestSeller shopFavourites').populate([
            {
                path: 'shopFavourites',
                populate: {
                    path: 'products',
                    populate: {
                        path: 'product',
                        oprtions: { sort: { sortingOrder: 1 } },

                        populate: 'category marketing addons',
                    },
                },
            }])

        if (!shop) return errorResponse(res, 'shop not found');


        const shopExchangeRate = shop?.shopExchangeRate || 0;

        const productList = await ProductModel.find({
            shop: id,
            status: 'active',
            productVisibility: true,
            // stockQuantity: { $gt: 0 },
            deletedAt: null,
        }).populate([

            {
                path: 'addons',
            },
            {
                path: 'marketing',
            },
            {
                path: 'attributes',
                populate: {
                    path: 'items',
                    model: 'attributeItems',
                },
            },
        ])

        if (shopExchangeRate !== 0 || !plusUser) {
            for (let product of productList) {
                if (!plusUser) {
                    await checkPlusUserProductMarketing(product);
                }

                if (shopExchangeRate !== 0) {
                    product = await applyExchangeRate(
                        product,
                        shopExchangeRate
                    );
                }
            }
        }

        const productsGroupByCategory = [];

        const categoryList = await ShopCategory.find({
            shop: shop,
            status: 'active',
        }).populate('category');

        const updatedCategoryList = overwriteCategoryInfo(categoryList)

        shop._doc.categories = updatedCategoryList;

        const sortedCategoryList = updatedCategoryList.sort((a, b) => {
            if (a?.sortingOrder === b?.sortingOrder) {
                return (
                    new Date(b?.category?.createdAt) -
                    new Date(a?.category?.createdAt)
                );
            }
            return a?.sortingOrder - b?.sortingOrder;
        });


        for (const category of sortedCategoryList) {
            // find product of this category

            if (category.category) {
                const product = productList.filter(
                    product =>
                        product.category._id.toString() ===
                        category.category._id.toString()
                );

                const sortedProducts = product.sort((a, b) => {
                    if (a.sortingOrder === b.sortingOrder) {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    }
                    return a.sortingOrder - b.sortingOrder;
                });

                productsGroupByCategory.push({
                    category,
                    product: sortedProducts,
                });
            }
        }

        let bestSellerItems = [];


        if (shop?.bestSeller?.isActive) {



            bestSellerItems = await findBestSellerItems(id, shopExchangeRate, plusUser)

        }

        let sortedShopFavouriteItems = [];

        if (shop?.shopFavourites?.isActive) {
            sortedShopFavouriteItems = await findShopFavourites(shop);
        }

        successResponse(res, {
            message: 'Successfully find shop',
            data: {
                // shop,
                // discount,
                favourite: sortedShopFavouriteItems,
                productsGroupByCategory,

            },
        });
    } catch (error) {
        errorHandler(res, error);
    }

}

const checkValidProduct = (product) => product?.status === 'active' && product?.category?.status === 'active' && product?.stockQuantity;

const findShopFavourites = async (shop) => {
    const shopFavouriteItems = shop._doc.shopFavourites.products;
    const newProductist = [];
    for (const product of shopFavouriteItems) {

        if (checkValidProduct(product?.product)) {

            let isAllocatedIntoBanner = false;
            const findProductBanner = await BannerModel.countDocuments({
                productId: product.product._id,
            });
            if (findProductBanner > 0) isAllocatedIntoBanner = true;

            product.product._doc.isAllocatedIntoBanner = isAllocatedIntoBanner;
            product.product._doc.shop = { _id: product.product.shop._id, shopExchangeRate: product.product.shop.shopExchangeRate }
            newProductist.push(product)
        }

    }
    return newProductist;

}
exports.getSingleShopByIdForApps = async (req, res) => {
    try {

        const plusUser = req.plusUser;
        const userId = req.userId;
        const { shopId, latitude, longitude } = req.query;

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate([
                {
                    path: 'cuisineType',
                    select: 'name',
                },
                {
                    path: 'products',
                    populate: {
                        path: 'marketing',
                        select: 'type products isActive status onlyForSubscriber',
                    },
                    select: 'name price unit unitQuantity images category subCategory status productVisibility deletedAt rewardBundle reward discountPercentage discountPrice discount dietary sortingOrder stockQuantity createdAt',
                },
                {
                    path: 'shopFavourites',
                    populate: {
                        path: 'products',
                        populate: {
                            path: 'product',
                            populate: {
                                path: 'marketing',
                                select: 'type products isActive status onlyForSubscriber',
                            },
                            select: 'name price unit unitQuantity images status productVisibility deletedAt rewardBundle reward discountPercentage discountPrice discount dietary stockQuantity',
                        },
                    },
                },
                {
                    path: 'marketings',
                    select: 'type isActive status onlyForSubscriber',
                },
            ])
            .select({
                shopType: 1,
                shopName: 1,
                shopLogo: 1,
                commercial_circular_document: 1,
                tax_registration: 1,
                contact_paper: 1,
                shopID: 1,
                shopBanner: 1,
                expensive: 1,
                shopStatus: 1,
                liveStatus: 1,
                tags: 1,
                minOrderAmount: 1,
                maxOrderAmount: 1,
                isCuisine: 1,
                address: 1,
                rating: 1,
                totalOrder: 1,
                haveOwnDeliveryBoy: 1,
                deliveryFee: 1,
                reviews: 1,
                maxDiscount: 1,
                freeDelivery: 1,
                isFeatured: 1,
                paymentOption: 1,
                dietary: 1,
                normalHours: 1,
                holidayHours: 1,
                shopNote: 1,
                isShopNoteForRiderEnabled: 1,
                specialInstructions: 1,
                shopExchangeRate: 1,
                shopBrand: 1,
                avgOrderDeliveryTime: 1,
                avgOrderValue: 1,
            })

        if (!shop) return errorResponse(res, 'shop not found');

        shop._doc.totalRating = shop.reviews.length;
        shop._doc.reviews = [];

        if (!plusUser) {
            await checkPlusUserMarketing(shop, true);
        }

        const shopExchangeRate = shop?.shopExchangeRate || 0;
        if (shopExchangeRate !== 0 || !plusUser) {
            for (let product of shop?.shopFavourites?.products) {
                if (!plusUser) {
                    await checkPlusUserProductMarketing(product.product);
                }

                if (shopExchangeRate !== 0) {
                    product.product = await applyExchangeRate(
                        product.product,
                        shopExchangeRate,
                        true,
                        true
                    );
                }
            }
        }

        const deliveryFee = await getDeliveryCharge(
            shop,
            latitude,
            longitude,
            plusUser
        );
        shop._doc.deliveryFee = deliveryFee;

        const isShopOpen = checkShopOpeningHours(shop);
        shop._doc.isShopOpen = isShopOpen;

        // Calc shop average delivered time
        // const avgOrderDeliveryTime = await shopAvgDeliveryTime(shop._id);
        // shop._doc.avgOrderDeliveryTime = avgOrderDeliveryTime;

        // Fetch products based on shopId
        const productList = await getProductsByShopId(
            shop.products,
            shopExchangeRate,
            plusUser
        );
        shop._doc.products = [];

        // Group products by category
        const productsGroupByCategory = await groupProductsByCategory(
            shop,
            productList
        );

        // let favorite = [];

        // if (userId) {
        //     favorite = await getFavouritesForUserByIdNew(
        //         userId,
        //         shopId,
        //         shopExchangeRate,
        //         plusUser
        //     );
        // }

        // let discount = await getDiscountForUserById(id, plusUser);

        // let deliveryRange = [];
        // const globalDropCharge = await GlobalDropCharge.findOne({});
        // if (globalDropCharge) {
        //     deliveryRange = globalDropCharge.deliveryRange;
        // }

        // Find best seller items
        const bestSellerItems = await findBestSellerItems(
            shopId,
            shopExchangeRate,
            plusUser
        );

        successResponse(res, {
            message: 'Successfully find shop',
            data: {
                shop,
                // discount,
                // favorite,
                productsGroupByCategory,
                // deliveryRange,
                bestSellerItems,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getProductsByShopId = async (products, shopExchangeRate, plusUser) => {
    const productList = products.filter(
        item =>
            item.status == 'active' &&
            item.productVisibility &&
            item.stockQuantity > 0 &&
            item.deletedAt === null
    );

    if (shopExchangeRate !== 0 || !plusUser) {
        for (let product of productList) {
            if (!plusUser) {
                await checkPlusUserProductMarketing(product);
            }

            if (shopExchangeRate !== 0) {
                product = await applyExchangeRate(
                    product,
                    shopExchangeRate,
                    true,
                    true
                );
            }
        }
    }

    return productList;
};

const groupProductsByCategory = async (shop, productList) => {
    const productsGroupByCategory = [];
    const shopCategoryList = await ShopCategory.find({
        shop: shop._id,
        status: 'active',
    })
        .populate({ path: 'category', select: 'createdAt' })
        .select('name sortingOrder');

    const sortedShopCategoryList = shopCategoryList.sort((a, b) => {
        if (a?.sortingOrder === b?.sortingOrder) {
            return (
                new Date(b?.category?.createdAt) -
                new Date(a?.category?.createdAt)
            );
        }
        return a?.sortingOrder - b?.sortingOrder;
    });

    shop._doc.categories = sortedShopCategoryList;

    for (const shopCategory of shopCategoryList) {
        if (shopCategory.category) {
            const products = productList.filter(
                product =>
                    product.category.toString() ===
                    shopCategory.category._id.toString()
            );

            const sortedProducts = products.sort((a, b) => {
                if (a.sortingOrder === b.sortingOrder) {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                }
                return a.sortingOrder - b.sortingOrder;
            });

            productsGroupByCategory.push({
                category: shopCategory,
                products: sortedProducts,
            });
        }
    }

    return productsGroupByCategory;
};

const findBestSellerItems = async (shopId, shopExchangeRate, plusUser) => {
    const orderItems = await OrderModel.aggregate([
        // match orders with orderStatus: delivered and shop: desiredShopId
        {
            $match: {
                orderStatus: 'delivered',
                shop: ObjectId(shopId),
            },
        },
        // unwind the products array to get one document per product
        {
            $unwind: '$products',
        },
        // join with the Product collection to get details about the product
        {
            $lookup: {
                from: 'products',
                localField: 'products.product',
                foreignField: '_id',
                as: 'product',
            },
        },
        // // unwind the product array to get one document per product
        {
            $unwind: '$product',
        },
        // // match products with status: active and productVisibility: true
        {
            $match: {
                'product.status': 'active',
                'product.productVisibility': true,
                'product.stockQuantity': { $gt: 0 },
                'product.deletedAt': null,
            },
        },
        // group by product id and sum the quantity of each product sold
        {
            $group: {
                _id: '$products.product',
                totalSold: { $sum: '$products.quantity' },
            },
        },
        // sort by totalSold in descending order
        {
            $sort: {
                totalSold: -1,
            },
        },
        // // limit to the top 10 best sellers
        {
            $limit: 3,
        },
    ]);

    const bestSellerItemsAll = await ProductModel.populate(orderItems, {
        path: '_id',
        populate: [
            {
                path: 'category',
                select: 'status',
            },
            {
                path: 'marketing',
                select: 'type products isActive status onlyForSubscriber',
            },
        ],
    });

    const renamedResults = bestSellerItemsAll.map(item => {

        const { _id, ...rest } = item;
        return {
            product: _id,
            ...rest,
        };
    });

    const bestSellerItems = [];
    for (let product of renamedResults) {

        if (checkValidProduct(product?.product)) {
            if (shopExchangeRate !== 0) {
                product.product = await applyExchangeRate(
                    product.product,
                    shopExchangeRate,
                    true,
                    true
                );
            }
            if (!plusUser) {
                await checkPlusUserProductMarketing(product.product);
            }
            bestSellerItems.push(product);
        }
    }

    return bestSellerItems;
};

// const getFavouritesForUserByIdNew = async (
//     userId,
//     shopId,
//     shopExchangeRate,
//     plusUser
// ) => {
// const user = await UserModel.findOne({ _id: userId })
//     .populate([
//         {
//             path: 'favoritesProducts',
//             populate: [
//                 {
//                     path: 'subCategory',
//                     select: 'name',
//                 },
//                 {
//                     path: 'marketing',
//                     select: 'type isActive status onlyForSubscriber',
//                 },
//             ],
//             select: 'name price unit unitQuantity shop images status productVisibility deletedAt rewardBundle reward discountPercentage discountPrice discount dietary sortingOrder stockQuantity createdAt',
//         },
//     ])
//     .select('favoritesProducts');

//     let shopFavProduct = user.favoritesProducts.filter(
//         item =>
//             item.shop.toString() === shopId.toString() &&
//             item.status == 'active' &&
//             item.productVisibility &&
//             item.stockQuantity > 0 &&
//             item.deletedAt === null
//     );

//     if (shopExchangeRate !== 0 || !plusUser) {
//         for (let product of shopFavProduct) {
//             if (!plusUser) {
//                 await checkPlusUserProductMarketing(product);
//             }

//             if (shopExchangeRate !== 0) {
//                 product = await applyExchangeRate(product, shopExchangeRate);
//             }
//         }
//     }

//     let subCategoryList = [];

//     // get subCategory from products using reduce

//     let newProducts = shopFavProduct.filter(item => item.subCategory == null);

//     shopFavProduct.map(product => {
//         if (product.subCategory) {
//             if (
//                 !subCategoryList.find(
//                     item => item._id === product.subCategory._id
//                 )
//             ) {
//                 subCategoryList.push(product.subCategory);
//             }
//         }
//     });

//     let productSubCategoryList = [];

//     productSubCategoryList.push({
//         subCategory: {
//             _id: '',
//             name: 'All',
//         },
//         products: newProducts,
//     });

//     for (let i = 0; i < subCategoryList.length; i++) {
//         let subCategory = subCategoryList[i];
//         let productList = shopFavProduct.filter(
//             product => product.subCategory?._id === subCategory?._id
//         );
//         productSubCategoryList.push({
//             subCategory: subCategory,
//             products: productList,
//         });
//     }

//     return productSubCategoryList;
// };

const getFavouritesForUserById = async (userId, shopId, plusUser) => {
    const user = await UserModel.findById(userId).populate([
        {
            path: 'favoritesProducts',
            populate: [
                {
                    path: 'category',
                },
                {
                    path: 'subCategory',
                },
                {
                    path: 'shop',
                    populate: [
                        {
                            path: 'address',
                        },
                        {
                            path: 'marketings',
                        },
                    ],
                    select: '-password -createdAt -updatedAt -deletedAt',
                },
                {
                    path: 'seller',
                    select: '-password -createdAt -updatedAt -deletedAt',
                },
                {
                    path: 'addons',
                    populate: [
                        {
                            path: 'category',
                        },
                        {
                            path: 'subCategory',
                        },
                    ],
                },
                {
                    path: 'marketing',
                },
            ],
        },
    ]);

    let shopFavProduct = user.favoritesProducts.filter(
        item => item.shop._id == shopId && item.status == 'active'
    );

    const shopExchangeRate = shopFavProduct[0]?.shop?.shopExchangeRate || 0;
    if (shopExchangeRate !== 0 || !plusUser) {
        for (let product of shopFavProduct) {
            if (!plusUser) {
                await checkPlusUserProductMarketing(product);
            }

            if (shopExchangeRate !== 0) {
                product = await applyExchangeRate(product, shopExchangeRate);
            }
        }
    }

    let subCategoryList = [];

    // get subCategory from products using reduce

    let newProducts = shopFavProduct.filter(item => item.subCategory == null);

    shopFavProduct.map(product => {
        if (product.subCategory) {
            if (
                !subCategoryList.find(
                    item => item._id === product.subCategory._id
                )
            ) {
                subCategoryList.push(product.subCategory);
            }
        }
    });

    let productSubCategoryList = [];

    productSubCategoryList.push({
        subCategory: {
            _id: '',
            name: 'All',
        },
        products: newProducts,
    });

    for (let i = 0; i < subCategoryList.length; i++) {
        let subCategory = subCategoryList[i];
        let productList = shopFavProduct.filter(
            product => product.subCategory?._id === subCategory?._id
        );
        productSubCategoryList.push({
            subCategory: subCategory,
            products: productList,
        });
    }

    return productSubCategoryList;
};

const getDiscountForUserById = async (shopId, plusUser) => {
    let productList = await ProductModel.find({
        shop: shopId,
        status: 'active',
        productVisibility: true,
        marketing: { $not: { $size: 0 } },
    }).populate([
        {
            path: 'category',
        },
        {
            path: 'subCategory',
        },
        {
            path: 'shop',
        },
        {
            path: 'seller',
        },
        {
            path: 'addons',
        },
        {
            path: 'marketing',
        },
    ]);

    productList = productList.filter(product => {
        const findActiveMarketing = product.marketing.some(
            item =>
                item.isActive &&
                item.status === 'active' &&
                ['percentage', 'double_menu'].includes(item.type)
        );

        return findActiveMarketing;
    });

    const shopExchangeRate = productList[0]?.shop?.shopExchangeRate || 0;
    if (shopExchangeRate !== 0 || !plusUser) {
        for (let product of productList) {
            if (!plusUser) {
                await checkPlusUserProductMarketing(product);
            }

            if (shopExchangeRate !== 0) {
                product = await applyExchangeRate(product, shopExchangeRate);
            }
        }
    }

    let products = productList;

    let subCategoryList = [];

    // get subCategory from products using reduce

    let newProducts = products.filter(item => item.subCategory == null);

    products.map(product => {
        if (product.subCategory) {
            if (
                !subCategoryList.find(
                    item => item._id === product.subCategory._id
                )
            ) {
                subCategoryList.push(product.subCategory);
            }
        }
    });

    let productSubCategoryList = [];

    productSubCategoryList.push({
        subCategory: {
            _id: '',
            name: 'All',
        },
        products: newProducts,
    });

    for (const element of subCategoryList) {
        let subCategory = element;
        let finalProductList = products.filter(
            product => product.subCategory?._id === subCategory?._id
        );
        productSubCategoryList.push({
            subCategory: subCategory,
            products: finalProductList,
        });
    }

    return productSubCategoryList;
};

exports.getSingleShopReviewsForApps = async (req, res) => {
    try {

        const { page = 1, pageSize = 10, sortBy = 'desc',

        } = req.query;

        const shop = await ShopModel.findOne({ _id: req?.params?.shopId })
            .populate({
                path: 'reviews',
                populate: { path: 'user', select: 'name profile_photo' },
                select: 'rating reviewDes reviewTags reviewVisibility',
            })
            .select({
                reviews: 1,
            })
            .lean();

        if (!shop) return errorResponse(res, 'Shop not found');

        let reviews = shop.reviews.filter(review => review.reviewVisibility);

        if (sortBy) {
            const sortOrder = sortBy.toLowerCase() === 'desc' ? -1 : 1;
            reviews.sort(
                (a, b) =>
                    sortOrder * (new Date(a.createdAt) - new Date(b.createdAt))
            );
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: reviews.length,
            pagingRange: 5,
        });

        const finalReviews = reviews.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        const ratingPercentage = {
            1: getRatingPercentage(reviews, 1),
            2: getRatingPercentage(reviews, 2),
            3: getRatingPercentage(reviews, 3),
            4: getRatingPercentage(reviews, 4),
            5: getRatingPercentage(reviews, 5),
        };

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                ratingPercentage,
                reviews: finalReviews,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getShopReviewsForApp = async (req, res) => {
    const { page = 1, pageSize = 10 } = req.query
    const options = {
        page: page,        // Page number
        limit: pageSize,      // Number of items per page
        sort: { createdAt: -1 },  // Sorting option
        select: 'rating user reviewDes reviewVisibility',
        populate: [{
            path: 'user',
            select: 'name profile_photo'
        }]
    };


    const result = await ReviewModel.paginate({ shop: req.params.shopId, reviewVisibility: true, reviewDes: { $ne: "" } }, options);
    const reviews = await ReviewModel.find({ shop: req.params.shopId, reviewVisibility: true, options });

    const ratingPercentage = {
        1: getRatingPercentage(reviews, 1),
        2: getRatingPercentage(reviews, 2),
        3: getRatingPercentage(reviews, 3),
        4: getRatingPercentage(reviews, 4),
        5: getRatingPercentage(reviews, 5),
    };
    const { docs, ...paginationDetails } = result;
    successResponse(res, {
        message: 'Successfully fetched',
        data: {
            ratingPercentage,
            reviews: docs,
            totalReviews: reviews?.length ?? 0,
            paginate: paginationDetails,
        },
    });

};




exports.getSingleShopPunchMarketingForApps = async (req, res) => {
    try {
        const { shopId } = req.query;
        const userId = req.userId;

        if (!shopId) return errorResponse(res, 'shopId is required');

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate({
                path: 'marketings',
                select: 'type isActive status punchTargetOrders punchMinimumOrderValue punchDayLimit punchCouponDiscountType punchCouponValue punchCouponDuration deletedAt',
            })
            .select({
                marketings: 1,
                isPunchMarketing: 1,
            })
            .lean();

        if (!shop) return errorResponse(res, 'Shop not found');

        const result = {
            status: null,
            punchTargetOrders: 0,
            punchMinimumOrderValue: 0,
            punchDayLimit: 0,
            punchCouponDiscountType: 'percentage',
            punchCouponValue: 0,
            punchCouponDuration: 0,
            completedOrders: 0,
            expiredDate: new Date(),
        };

        if (shop.isPunchMarketing) {
            const shopPunchMarketing = shop.marketings.find(
                marketing =>
                    marketing.type === 'punch_marketing' &&
                    marketing.isActive &&
                    marketing.status === 'active' &&
                    marketing.deletedAt === null
            );

            if (shopPunchMarketing) {
                result.punchTargetOrders = shopPunchMarketing.punchTargetOrders;
                result.punchMinimumOrderValue =
                    shopPunchMarketing.punchMinimumOrderValue;
                result.punchDayLimit = shopPunchMarketing.punchDayLimit;
                result.punchCouponDiscountType =
                    shopPunchMarketing.punchCouponDiscountType;
                result.punchCouponValue = shopPunchMarketing.punchCouponValue;
                result.punchCouponDuration =
                    shopPunchMarketing.punchCouponDuration;
                result.expiredDate = moment().add(
                    shopPunchMarketing.punchDayLimit,
                    'days'
                );
                result.status = 'initialize';
            }
        }

        if (userId) {
            const userOngoingPunchMarketing =
                await UserPunchMarketingModel.findOne({
                    user: userId,
                    shop: shopId,
                    status: { $in: ['ongoing', 'completed'] },
                });

            if (userOngoingPunchMarketing) {
                let userOngoingOrder = 0;
                if (userOngoingPunchMarketing?.status === 'completed') {
                    userOngoingOrder = await OrderModel.countDocuments({
                        user: userId,
                        shop: shopId,
                        orderStatus: {
                            $in: [
                                'schedule',
                                'placed',
                                'accepted_delivery_boy',
                                'preparing',
                                'ready_to_pickup',
                                'order_on_the_way',
                            ],
                        },
                        'summary.baseCurrency_punchMarketingDiscountAmount': {
                            $gt: 0,
                        },
                    });
                }

                if (
                    (userOngoingPunchMarketing?.status === 'ongoing' ||
                        (userOngoingPunchMarketing?.status === 'completed' &&
                            userOngoingOrder < 1)) && shop.isPunchMarketing
                ) {
                    result.punchTargetOrders =
                        userOngoingPunchMarketing.punchTargetOrders;
                    result.punchMinimumOrderValue =
                        userOngoingPunchMarketing.punchMinimumOrderValue;
                    result.punchDayLimit = moment(
                        userOngoingPunchMarketing.expiredDate
                    ).diff(moment(), 'days');
                    result.punchCouponDiscountType =
                        userOngoingPunchMarketing.punchCouponDiscountType;
                    result.punchCouponValue =
                        userOngoingPunchMarketing.punchCouponValue;
                    result.punchCouponDuration = moment(
                        userOngoingPunchMarketing.expiredDate
                    ).diff(moment(), 'days');
                    result.completedOrders =
                        userOngoingPunchMarketing.completedOrders;
                    result.expiredDate = userOngoingPunchMarketing.expiredDate;
                    result.status = userOngoingPunchMarketing.status;
                }
            }
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: result,
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

const getRatingPercentage = (reviews, value) => {
    const filter = reviews?.filter(item => item?.rating == value);
    let result = (filter?.length / reviews?.length) * 100;
    return reviews?.length == 0 ? `0%` : `${Math.round(result * 100) / 100}%`;
};

exports.getAllShopsCategoryForUserApp = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'ASC',
            type, // 'food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'
            shopId,
            pagingRange = 5,
        } = req.query;

        let whereConfig = {
            shop: shopId,
            type,
        };

        let paginate = await pagination({
            page,
            pageSize,
            model: ShopCategory,
            condition: whereConfig,
            pagingRange: pagingRange,
        });

        const list = await ShopCategory.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'category',
                },
            ]);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                categories: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.addDealsInShopFromAdmin = async (req, res) => {
    try {
        const { shopId, dealId } = req.body;

        const isExist = await ShopModel.findOne({ _id: shopId }).populate([
            'marketings',
        ]);

        if (!isExist) return errorResponse(res, 'Shop not found');

        const isDealExist = await DealModel.findOne({ _id: dealId });

        if (!isDealExist) return errorResponse(res, 'Deal not found');

        const isExistInShop = await ShopModel.findOne({
            _id: shopId,
            deals: dealId,
        });

        if (isExistInShop && isDealExist.option != 'percentage') {
            return errorResponse(res, 'Deal already exist in shop');
        }

        if (!isExistInShop && isDealExist.option != 'percentage') {
            await ShopModel.updateOne(
                { _id: shopId },
                {
                    $push: {
                        deals: dealId,
                    },
                }
            );

            if (isDealExist.option === 'double_menu') {
                await ShopModel.updateOne(
                    { _id: shopId },
                    {
                        $set: {
                            discountDealUpdateTime: new Date(),
                            itemsDeals: [],
                        },
                    }
                );

                const products = await ProductModel.find({ shop: shopId });

                for (const item of products) {
                    let itemDeal = item.deals;

                    await ProductModel.updateOne(
                        { _id: item._id },
                        {
                            $set: {
                                deals: dealId,
                            },
                        }
                    );
                }
            }

            if (isDealExist.option === 'free_delivery') {
                const products = await ProductModel.find({ shop: shopId });

                for (const product of products) {
                    let productId = product._id;

                    await ProductModel.updateOne(
                        { _id: productId },
                        {
                            $set: {
                                freeDelivery: true,
                            },
                        }
                    );
                }
                await ShopModel.updateOne(
                    { _id: shopId },
                    {
                        $set: {
                            freeDelivery: true,
                            freeDealUpdateTime: new Date(),
                        },
                    }
                );
            }
        }

        if (!isExistInShop && isDealExist.option === 'percentage') {

            // total deals
            const deals = isExist.deals;

            // find all percentage deals exist in shop
            const listOfPercentage = await deals.filter(
                deal => deal.option === 'percentage'
            );

            const newList = []; // new list of deals there isn't percentage deal
            for (const deal of deals) {
                const find = listOfPercentage.find(
                    item => item._id.toString() === deal._id.toString()
                );
                if (!find) {
                    newList.push(deal);
                }
            }

            newList.push(dealId);

            await ShopModel.updateOne(
                { _id: shopId },
                {
                    $set: {
                        deals: newList,
                        discountDealUpdateTime: new Date(),
                        itemsDeals: [],
                    },
                }
            );
            const products = await ProductModel.find({ shop: shopId });

            for (const item of products) {
                let itemDeal = item.deals;
                await ProductModel.updateOne(
                    { _id: item._id },
                    {
                        $set: {
                            // deals: dealId,
                            deals: newList,
                        },
                    }
                );
            }
        }

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },

                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                // {
                //     path: 'deals',
                // },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        successResponse(res, {
            message: 'Successfully added',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteDealsInShopFromAdmin = async (req, res) => {
    try {
        const { shopId, dealId } = req.body;

        const isExist = await ShopModel.findOne({ _id: shopId });

        if (!isExist) return errorResponse(res, 'Shop not found');

        const isDealExist = await DealModel.findOne({ _id: dealId });

        const isExistInShop = await ShopModel.findOne({
            _id: shopId,
            deals: dealId,
        });

        if (!isExistInShop) {
            return errorResponse(res, 'Deal Not exist in shop');
        }

        // add update deal in product
        await ShopModel.updateOne(
            { _id: shopId },
            {
                $pull: {
                    deals: dealId,
                },
            }
        );

        const products = await ProductModel.find({ shop: shopId });

        for (const item of products) {
            await ProductModel.updateOne(
                { _id: item._id },
                {
                    $pull: {
                        deals: dealId,
                    },
                }
            );
        }

        if (isDealExist.option === 'free_delivery') {
            const products = await ProductModel.find({ shop: shopId });

            for (const product of products) {
                let productId = product._id;

                await ProductModel.updateOne(
                    { _id: productId },
                    {
                        $set: {
                            freeDelivery: false,
                        },
                    }
                );
            }
            await ShopModel.updateOne(
                { _id: shopId },
                {
                    $set: {
                        freeDelivery: false,
                    },
                }
            );
        }

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },

                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                // {
                //     path: 'deals',
                // },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        successResponse(res, {
            message: 'Successfully added',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.shopStatusChange = async (req, res) => {
    try {
        const { id, status } = req.body;

        const isExist = await ShopModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Shop not found');

        if (!['active', 'inactive'].includes(status)) {
            return errorResponse(res, 'Invalid status');
        }

        await ShopModel.updateOne(
            { _id: id },
            {
                $set: {
                    shopStatus: status,
                },
            }
        );

        await ProductModel.updateMany(
            { shop: id },
            {
                $set: {
                    status: status,
                },
            }
        );

        successResponse(res, {
            message: `Successfully ${status}`,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

function distance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = (Math.PI * lat1) / 180;
    var radlat2 = (Math.PI * lat2) / 180;
    var theta = lon1 - lon2;
    var radtheta = (Math.PI * theta) / 180;
    var dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == 'K') {
        dist = dist * 1.609344;
    }
    if (unit == 'N') {
        dist = dist * 0.8684;
    }
    dist = parseFloat(dist.toFixed(4));
    return dist;
}

exports.getActiveOrderForStore = async (req, res) => {
    try {
        const { shopId } = req.query;

        const activeOrders = await OrderModel.find({
            shop: shopId,
            orderStatus: { $in: ['ready_to_pickup', 'preparing'] },
        });

        successResponse(res, {
            message: 'successfully find',
            data: {
                activeOrders,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getPastOrderForStore = async (req, res) => {
    try {
        const { shopId } = req.query;

        const pastOrders = await OrderModel.find({
            shop: shopId,
            orderStatus: { $in: ['order_on_the_way', 'delivered'] },
        });

        successResponse(res, {
            message: 'successfully find',
            data: {
                pastOrders,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getNewOrderForStore = async (req, res) => {
    try {
        const { shopId } = req.query;

        const newOrders = await OrderModel.find({
            shop: shopId,
            orderStatus: { $in: ['accepted_delivery_boy'] },
        });

        successResponse(res, {
            message: 'successfully find',
            data: {
                newOrders,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.orderHistoryForShop = async (req, res) => {
    try {
        const shopId = req.shopId;

        // orderStatus: "preparing" , orderStatus: "ready_to_pickup", orderStatus: "order_on_the_way"
        const activeOrders = await OrderModel.find({
            shop: shopId,
            orderStatus: { $in: ['ready_to_pickup', 'preparing'] },
        });
        const pastOrders = await OrderModel.find({
            shop: shopId,
            orderStatus: { $in: ['order_on_the_way', 'delivered'] },
        });
        const newOrders = await OrderModel.find({
            shop: shopId,
            orderStatus: { $in: ['accepted_delivery_boy'] },
        });

        successResponse(res, {
            message: 'successfully find',
            data: {
                activeOrders,
                pastOrders,
                newOrders,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.pastOrderFilterForShop = async (req, res) => {
    try {
        const { fromDate, toDate, shopId } = req.query;

        let whereConfig = {
            shop: shopId,
            orderStatus: { $in: ['order_on_the_way', 'delivered'] },
            createdAt: {
                $gte: moment(new Date(fromDate)),
                $lte: moment(new Date(toDate)),
            },
        };

        const pastOrders = await OrderModel.find(whereConfig);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                pastOrders,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getShopProductForUserApp = async (req, res) => {
    try {
        const plusUser = req.plusUser;
        const { shopId, categoryId, searchKey } = req.query;

        let whereConfig = {
            status: 'active',
            productVisibility: true,
            // stockQuantity: { $gt: 0 },
            deletedAt: null,
            shop: shopId,
            category: categoryId,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const seoTitleSearchQuery = newQuery.map(str => ({
                seoTitle: RegExp(str, 'i'),
            }));
            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: seoTitleSearchQuery },
                        ],
                    },
                ],
            };
        }

        // get product
        const productList = await ProductModel.find(whereConfig).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: [
                    {
                        path: 'address',
                    },
                    {
                        path: 'marketings',
                    },
                ],
                select: '-password -createdAt -updatedAt -deletedAt',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
            },
            {
                path: 'addons',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                ],
            },
            {
                path: 'marketing',
            },
        ]);

        const shopExchangeRate = productList[0]?.shop?.shopExchangeRate || 0;

        let products = [];
        for (let product of productList) {
            if (product.category.status === 'active') {
                if (product.type === 'food') {
                    const isShopOpen = checkShopOpeningHours(product.shop);
                    product.shop._doc.isShopOpen = isShopOpen;

                    if (shopExchangeRate !== 0) {
                        product = await applyExchangeRate(
                            product,
                            shopExchangeRate
                        );
                    }

                    if (!plusUser) {
                        await checkPlusUserProductMarketing(product);
                    }

                    products.push(product);
                } else {
                    if (product.subCategory.status === 'active') {
                        const isShopOpen = checkShopOpeningHours(product.shop);
                        product.shop._doc.isShopOpen = isShopOpen;

                        if (shopExchangeRate !== 0) {
                            product = await applyExchangeRate(
                                product,
                                shopExchangeRate
                            );
                        }

                        if (!plusUser) {
                            await checkPlusUserProductMarketing(product);
                        }

                        products.push(product);
                    }
                }
            }
        }

        let subCategoryList = [];
        products = products.sort((a, b) => {
            if (a.sortingOrder === b.sortingOrder)
                return new Date(b.createdAt) - new Date(a.createdAt);
            return a.sortingOrder - b.sortingOrder;
        });
        // get subCategory from products using reduce

        let newProducts = products.filter(item => item.subCategory == null);

        products.map(product => {
            if (product.subCategory) {
                if (
                    !subCategoryList.find(
                        item => item._id === product.subCategory._id
                    )
                ) {
                    subCategoryList.push(product.subCategory);
                }
            }
        });

        let productSubCategoryList = [];

        productSubCategoryList.push({
            subCategory: {
                _id: '',
                name: 'All',
            },
            products: newProducts,
        });

        for (let i = 0; i < subCategoryList.length; i++) {
            let subCategory = subCategoryList[i];
            let productList = products.filter(
                product => product.subCategory?._id === subCategory?._id
            );
            productSubCategoryList.push({
                subCategory: subCategory,
                products: productList,
            });
        }
        productSubCategoryList = productSubCategoryList.sort((a, b) => {
            if (a?.subCategory?.sortingOrder === b?.subCategory?.sortingOrder)
                return (
                    new Date(b?.subCategory?.createdAt) -
                    new Date(a?.subCategory?.createdAt)
                );
            return a?.subCategory?.sortingOrder - b?.subCategory?.sortingOrder;
        });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                products: productSubCategoryList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopProductWithCategory = async (req, res) => {
    try {
        const { shopId, categoryId, searchKey } = req.query;

        // const shop = await ShopModel.findOne({ _id: shopId })
        let whereConfig = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const seoTitleSearchQuery = newQuery.map(str => ({
                seoTitle: RegExp(str, 'i'),
            }));
            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: seoTitleSearchQuery },
                        ],
                    },
                ],
            };
        }

        whereConfig = {
            ...whereConfig,
            shop: shopId,
            category: categoryId,
        };

        // get product
        const products = await ProductModel.find(whereConfig).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: [
                    {
                        path: 'address',
                    },
                    {
                        path: 'marketings',
                    },
                ],
                select: '-password -createdAt -updatedAt -deletedAt',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
            },
            {
                path: 'addons',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                ],
            },
            {
                path: 'marketing',
            },
        ]);

        let subCategoryList = [];

        // get subCategory from products using reduce

        products.map(product => {
            if (product.subCategory) {
                if (
                    !subCategoryList.find(
                        item => item._id === product.subCategory._id
                    )
                ) {
                    subCategoryList.push(product.subCategory);
                }
            }
        });

        let productSubCategoryList = [];

        productSubCategoryList.push({
            subCategory: {
                _id: '',
                name: 'All',
            },
            products: products,
        });

        for (let i = 0; i < subCategoryList.length; i++) {
            let subCategory = subCategoryList[i];
            let productList = products.filter(
                product => product.subCategory?._id === subCategory?._id
            );
            productSubCategoryList.push({
                subCategory: subCategory,
                products: productList,
            });
        }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                products: productSubCategoryList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.findStoreByProduct = async (req, res) => {
    try {
        const { searchKey, type, longitude, latitude } = req.query;

        const appSetting = await AppSetting.findOne();
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let location = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            shopStatus: 'active',
            // liveStatus: 'online',
        };

        const nearShop = await ShopModel.find(location);

        const nearShopsIds = nearShop.map(item => item._id);

        let whereConfig = {
            shop: {
                $in: nearShopsIds,
            },
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));
            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }],
                    },
                ],
            };
        }

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            whereConfig = {
                shopType: shopType,
                ...whereConfig,
            };
        }

        const products = await ProductModel.find(whereConfig).populate([
            {
                path: 'category',
            },
            {
                path: 'subCategory',
            },
            {
                path: 'shop',
                populate: 'address',
            },
            {
                path: 'seller',
                select: '-password -createdAt -updatedAt -deletedAt',
            },
            {
                path: 'addons',
                populate: [
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                ],
            },
            {
                path: 'marketing',
            },
        ]);

        let shops = [];

        for (let product of products) {
            let res = false;

            for (let i = 0; i < shops.length; i++) {
                const element = shops[i];
                if (element._id === product.shop) {
                    res = true;
                }
            }
            if (res === false)
                shops.push({
                    ...product.shop?._doc,
                });
        }

        successResponse(res, {
            message: 'successfully get',
            data: {
                shops,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.forgetPasswordForStoreApp = async (req, res) => {
    try {
        let { password, token } = req.body;

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Bad Request',
            });
        }

        const { storeEmail } = verify(
            token,
            process.env.JWT_PRIVATE_KEY_STORE_FORGET
        );
        if (!storeEmail) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token 0',
            });
        }

        const store = await ShopModel.findOne({
            email: storeEmail,
            forgetToken: token,
            forgetExpired: {
                $gt: new Date(),
            },
        });

        if (!store) {
            return errorResponse(res, 'Please forget your password again');
        }

        const pass = await bcrypt.hash(password, 10);

        await ShopModel.updateOne(
            { _id: store._id },
            {
                forgetToken: null,
                forgetExpired: null,
                password: pass,
            }
        );

        successResponse(res, {
            message: 'Password changed successfully',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.termsAndConditionStoreApp = async (req, res) => {
    try {
        const setting = await AppSetting.findOne({});

        const termCondition = setting.shopAppTearmsAndConditions;

        successResponse(res, {
            message: 'Successfully Get',
            data: {
                termCondition,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.balanceSummeryOfShop = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const shopId = req.shopId;

        const shop = await ShopModel.findById(shopId);

        if (!shop) {
            return errorResponse(res, 'shop not found');
        }

        const totalUnSettleAmountFunc = await getShopUnSettleAmount({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
        });
        const totalUnSettleAmount = totalUnSettleAmountFunc.totalSellerUnsettle;

        const shopEarningFunc = await getShopEarning({
            type: 'shop',
            id: shop._id,
            startDate,
            endDate,
        });
        const shopEarning = shopEarningFunc.totalShopEarning;

        const totalProfitShop = totalUnSettleAmount + shopEarning;

        let whereConfig = {
            shop: shopId,
            type: {
                $in: [
                    'sellerGetPaymentFromOrder',
                    'sellerGetPaymentFromOrderCash',
                    'adminAddBalanceShop',
                    'adminSettlebalanceShop',
                ],
            },
        };

        // if (startDate) {
        //     whereConfig = {
        //         ...whereConfig,
        //         createdAt: {
        //             $gte: moment(new Date(startDate)),
        //             $lte: moment(endDate ? new Date(endDate) : new Date()).add(
        //                 1,
        //                 'days'
        //             ),
        //         },
        //     };
        // }
        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            whereConfig = {
                ...whereConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        const list = await Transection.find(whereConfig)
            .select('-password')
            .populate('user');

        return successResponse(res, {
            message: 'Successfully fetch',
            data: {
                summery: {
                    totalUnSettleAmount,
                    shopEarning,
                    totalProfitShop,
                },
                list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Add Max Discount in specific shop
exports.addMaxDiscountInShopFromAdmin = async (req, res) => {
    try {
        const { shopId, maxDiscount } = req.body;

        const isExist = await ShopModel.findOne({ _id: shopId });

        if (!isExist) return errorResponse(res, 'Shop not found');

        await ShopModel.updateOne(
            { _id: shopId },
            {
                $set: {
                    maxDiscount: maxDiscount,
                },
            }
        );

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },

                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                // {
                //     path: 'deals',
                // },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        successResponse(res, {
            message: 'Successfully added',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Best seller and shop favourites items
exports.addBestSellerInShopFromAdmin = async (req, res) => {
    try {
        const { shopId, title, isActive } = req.body;

        const isExist = await ShopModel.findOne({ _id: shopId });

        if (!isExist) return errorResponse(res, 'Shop not found');

        let bestSeller = { ...isExist.bestSeller };

        if (title) {
            bestSeller = {
                ...bestSeller,
                title,
            };
        }
        if ([true, false].includes(isActive)) {
            bestSeller = {
                ...bestSeller,
                isActive,
            };
        }

        await ShopModel.updateOne(
            { _id: shopId },
            {
                $set: {
                    bestSeller,
                },
            }
        );

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },

                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                // {
                //     path: 'deals',
                // },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        successResponse(res, {
            message: 'Successfully added',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
exports.addShopFavouritesInShopFromAdmin = async (req, res) => {
    try {
        const { shopId, title, isActive, products } = req.body;

        const isExist = await ShopModel.findOne({ _id: shopId });

        if (!isExist) return errorResponse(res, 'Shop not found');

        let shopFavourites = { ...isExist.shopFavourites };

        if (title) {
            shopFavourites = {
                ...shopFavourites,
                title,
            };
        }
        if ([true, false].includes(isActive)) {
            shopFavourites = {
                ...shopFavourites,
                isActive,
            };
        }
        if (products) {
            if (products.length > 3)
                return errorResponse(
                    res,
                    'Favourite items can not be more than 3'
                );

            shopFavourites = {
                ...shopFavourites,
                products,
            };
        }

        await ShopModel.updateOne(
            { _id: shopId },
            {
                $set: {
                    shopFavourites,
                },
            }
        );

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },

                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                // {
                //     path: 'deals',
                // },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        successResponse(res, {
            message: 'Successfully added',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Shop opening and closing hours feature
exports.editShopOpeningHoursFromAdmin = async (req, res) => {
    try {
        const { shopId, normalHours, holidayHours } = req.body;

        const isExist = await ShopModel.findOne({ _id: shopId });

        if (!isExist) return errorResponse(res, 'Shop not found');

        await ShopModel.updateOne(
            { _id: shopId },
            {
                $set: {
                    normalHours,
                    holidayHours,
                },
            }
        );

        const shop = await ShopModel.findOne({ _id: shopId })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },

                {
                    path: 'banner',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        // Cancel schedule order
        const scheduleOrders = await OrderModel.find({
            shop: shopId,
            orderStatus: 'schedule',
        }).populate([
            {
                path: 'products',
                populate: [
                    {
                        path: 'product',
                    },
                ],
            },
        ]);

        const cancelOrderPromises = scheduleOrders.map(async order => {
            const isShopOpen = checkShopOpeningHours(shop, order?.scheduleDate);

            if (!isShopOpen) {
                const flag = await FlagModel.create({
                    orderId: order._id,
                    comment: 'Shop has changed its working hours',
                    isAutomatic: true,
                    type: 'auto',
                    flaggedType: 'cancelled',
                });

                const stockUpdatePromises = order.products
                    .filter(element => element.product.isStockEnabled)
                    .map(element =>
                        Product.updateOne(
                            { _id: element.product._id },
                            {
                                $inc: {
                                    stockQuantity: element.quantity,
                                },
                            }
                        )
                    );

                await Promise.all(stockUpdatePromises);

                await OrderModel.updateOne(
                    {
                        _id: order._id,
                    },
                    {
                        $set: {
                            orderStatus: 'cancelled',
                            cancelledAt: new Date(),
                            orderCancel: {
                                canceledBy: 'automatically',
                                otherReason:
                                    'Shop has changed its working hours',
                            },
                            flaggedAt: new Date(),
                        },
                        $push: {
                            flag: flag._id,
                        },
                    }
                );

                const orderFullInformation = await getFullOrderInformation(
                    order._id
                );

                await Promise.all([
                    sendNotificationsAllApp(orderFullInformation),
                    notifiycancelOrder(orderFullInformation),
                ]);
            }
        });

        await Promise.all(cancelOrderPromises);

        // Check Shop Opening time
        const isShopOpen = checkShopOpeningHours(shop);
        shop._doc.isShopOpen = isShopOpen;

        successResponse(res, {
            message: 'Successfully added',
            data: {
                shop,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getScheduleOrderInUpdateClosingHours = async (req, res) => {
    try {
        const { shopId, normalHours, holidayHours } = req.body;

        const shop = await ShopModel.findOne({ _id: shopId }).lean();

        if (!shop) return errorResponse(res, 'Shop not found');

        shop.normalHours = normalHours;
        shop.holidayHours = holidayHours;

        let scheduleOrdersInClosingHours = 0;

        const scheduleOrders = await OrderModel.find({
            shop: shopId,
            orderStatus: 'schedule',
        });

        for (const order of scheduleOrders) {
            const isShopOpen = checkShopOpeningHours(shop, order?.scheduleDate);

            if (!isShopOpen) {
                scheduleOrdersInClosingHours++;
            }
        }

        successResponse(res, {
            message: 'Successfully added',
            data: {
                orders: scheduleOrdersInClosingHours,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// For specific user orders from this shop
exports.getSpecificUserOrders = async (req, res) => {
    try {
        const { userId, shopId } = req.query;

        let config = {
            user: userId,
            shop: shopId,
            orderStatus: 'delivered',
        };

        const uniqueCustomerOrders = await OrderModel.count(config);

        successResponse(res, {
            message: 'Successfully get orders count',
            data: {
                uniqueCustomerOrders,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Shop brand feature
exports.getShopBrands = async (req, res) => {
    try {
        const shopBrands = await ShopModel.distinct('shopBrand');
        // const shopBrands = await ShopModel.aggregate([
        //     {
        //         $group: {
        //             _id: { $toLower: '$shopBrand' }, // Convert shopBrand to lowercase
        //         },
        //     },
        //     {
        //         $project: {
        //             _id: 0,
        //             shopBrand: { $toUpper: '$_id' }, // Convert back to uppercase
        //         },
        //     },
        // ]);

        // const distinctShopBrands = shopBrands.map(item => item.shopBrand);

        successResponse(res, {
            message: 'Successfully get shop brands',
            data: {
                shopBrands,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopOngoingOrder = async (req, res) => {
    try {
        const { shopId } = req.query;

        let config = {
            orderStatus: {
                $in: [
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
            shop: shopId,
        };

        const shopOngoingOrder = await OrderModel.countDocuments(config);

        successResponse(res, {
            message: 'Successfully get',
            data: {
                shopOngoingOrder,
                haveOngoingOrder: shopOngoingOrder ? true : false,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOfferShops = async (req, res) => {
    try {
        const {
            searchKey,
            sortBy = 'desc',
            shopType,
            marketingType,
        } = req.query;

        let whereConfig = {
            shopStatus: 'active',
            deletedAt: null,
            parentShop: null,
            marketings: {
                $elemMatch: {
                    $exists: true,
                },
            },
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));

            const phone_numberQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: phone_numberQuery },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        if (
            shopType &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(shopType)
        ) {
            whereConfig.shopType = shopType;
        }

        const offerShops = await ShopModel.find(whereConfig)
            .sort({ sortingOrder: sortBy, isFeatured: 1, createdAt: 1 })
            .populate([
                {
                    path: 'seller',
                    select: 'company_name profile_photo',
                },
                {
                    path: 'tagsId',
                    select: 'name',
                },
                {
                    path: 'cuisineType',
                    select: 'name',
                },
                {
                    path: 'marketings',
                    select: 'type creatorType products isActive status discountPercentages onlyForSubscriber',
                },
            ])
            .select({
                shopName: 1,
                shopLogo: 1,
                commercial_circular_document: 1,
                tax_registration: 1,
                contact_paper: 1,
                shopID: 1,
                shopBanner: 1,
                expensive: 1,
                shopStatus: 1,
                liveStatus: 1,
                tags: 1,
                tagsId: 1,
                minOrderAmount: 1,
                maxOrderAmount: 1,
                isCuisine: 1,
                cuisineType: 1,
                address: 1,
                rating: 1,
                totalOrder: 1,
                maxDiscount: 1,
                normalHours: 1,
                holidayHours: 1,
                shopBrand: 1,
                avgOrderDeliveryTime: 1,
                avgOrderValue: 1,
            })
            .lean();

        const offerShopList = [];

        for (const shop of offerShops) {
            const findOffer = shop.marketings.some(marketing =>
                [
                    'percentage',
                    'double_menu',
                    'free_delivery',
                    'reward',
                    'featured',
                    'punch_marketing',
                ].includes(marketingType)
                    ? marketing.type === marketingType && marketing.isActive
                    : marketing.isActive
            );

            if (findOffer) {
                offerShopList.push(shop);
            }
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: offerShopList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getFeaturedShops = async (req, res) => {
    try {
        const { searchKey, sortBy = 'desc', shopType } = req.query;

        let whereConfig = {
            shopStatus: 'active',
            deletedAt: null,
            parentShop: null,
            isFeatured: true,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));

            const phone_numberQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: phone_numberQuery },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        if (
            shopType &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(shopType)
        ) {
            whereConfig.shopType = shopType;
        }

        const featuredShops = await ShopModel.find(whereConfig)
            .sort({
                sortingOrder: sortBy,
                featuredUpdatedTime: 1,
                createdAt: 1,
            })
            .populate([
                {
                    path: 'seller',
                    select: 'company_name profile_photo',
                },
                {
                    path: 'tagsId',
                    select: 'name',
                },
                {
                    path: 'cuisineType',
                    select: 'name',
                },
                {
                    path: 'marketings',
                    select: 'type creatorType products isActive status discountPercentages onlyForSubscriber',
                },
            ])
            .select({
                shopName: 1,
                shopLogo: 1,
                commercial_circular_document: 1,
                tax_registration: 1,
                contact_paper: 1,
                shopID: 1,
                shopBanner: 1,
                expensive: 1,
                shopStatus: 1,
                liveStatus: 1,
                tags: 1,
                tagsId: 1,
                minOrderAmount: 1,
                maxOrderAmount: 1,
                isCuisine: 1,
                cuisineType: 1,
                address: 1,
                rating: 1,
                totalOrder: 1,
                maxDiscount: 1,
                normalHours: 1,
                holidayHours: 1,
                shopBrand: 1,
                avgOrderDeliveryTime: 1,
                avgOrderValue: 1,
            })
            .lean();

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: featuredShops,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sortFeaturedShops = async (req, res) => {
    try {
        const { list } = req.body;

        if (!list || list.length === 0) {
            return errorResponse(res, 'List can not be empty.');
        }

        const updatePromises = list.map(async element => {
            await ShopModel.updateOne(
                { _id: element.id },
                {
                    $set: {
                        sortingOrder: element.sortingOrder,
                    },
                }
            );
        });

        await Promise.all(updatePromises);

        successResponse(res, {
            message: 'Successfully Updated',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getShopsByBrand = async (req, res) => {
    try {
        const { brand } = req.query;
        const shops = await ShopModel.find({
            shopBrand: brand,
        })
            .select({
                shopName: 1,
                shopLogo: 1,
                shopID: 1,
                shopBanner: 1,
                shopStatus: 1,
                liveStatus: 1,
                tags: 1,
                avgOrderDeliveryTime: 1,
                rating: 1
            })
            .lean();
        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
}
