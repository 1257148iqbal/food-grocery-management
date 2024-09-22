const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const { pagination } = require('../helpers/pagination');
const Admins = require('../models/AdminModel');
const ShopModel = require('../models/ShopModel');
const SellerModel = require('../models/SellerModel');
const AdminLogModel = require('../models/AdminLogModel');
const DeliveryBoyTracking = require('../models/DeliveryBoyTracking');
const OrderModel = require('../models/OrderModel');
const { shopAvgDeliveryTime } = require('../helpers/shopAvgDeliveryTme');
const moment = require('moment');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const { findZone } = require('./ZoneController');
const ObjectId = require('mongoose').Types.ObjectId;

exports.adminLogin = async (req, res) => {
    try {
        let { email, password, type } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email or password is required');
        }

        email = email.toLowerCase();

        if (
            !type &&
            ![
                'admin',
                'seller',
                'shopsOrderManager',
                'shop',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
                'generalManager',
                'orderManagementManager',
            ].includes(type)
        ) {
            return errorResponse(res, 'Invalid login type');
        }

        if (
            [
                'admin',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
                'generalManager',
                'orderManagementManager',
            ].includes(type)
        ) {
            let admin = await Admins.findOne({
                email: email,
                adminType: type,
                deletedAt: null,
            }).populate([
                {
                    path: 'sellers',
                    populate: [
                        {
                            path: 'shops',
                            populate: 'marketings shopZone',
                        },
                    ],
                },
            ]);

            if (!admin) {
                return errorResponse(
                    res,
                    `${
                        type === 'admin'
                            ? 'Admin'
                            : type === 'customerService'
                            ? 'Customer Service'
                            : type === 'sales'
                            ? 'Sales Manager'
                            : type === 'accounting'
                            ? 'Accounting'
                            : type === 'marketing'
                            ? 'Marketing'
                            : type === 'generalManager'
                            ? 'General Manager'
                            : type === 'orderManagementManager'
                            ? 'Order Management Manager'
                            : 'Account Manager'
                    } not found. Please sign up first`
                );
            }

            if (admin.status === 'inactive') {
                return errorResponse(
                    res,
                    'Your account is inactive. Please contact Support'
                );
            }

            const matchPassword = bcrypt.compareSync(password, admin.password);

            if (!matchPassword) {
                return errorResponse(res, 'Wrong password.');
            }

            const jwtData = {
                id: admin._id,
                adminId: admin._id,
                name: admin.name,
            };

            const token = jwt.sign(
                jwtData,
                process.env.JWT_PRIVATE_KEY_ADMIN,
                {}
            );

            delete admin._doc.password;

            // for (let seller of admin?.sellers || []) {
            //     for (let shop of seller?.shops || []) {
            //         // Finding shop zone
            //         const zone = await findZone(
            //             shop.location.coordinates[1],
            //             shop.location.coordinates[0]
            //         );
            //         shop._doc.shopZone = zone;
            //     }
            // }

            return successResponse(res, {
                message: 'Login Success.',
                data: {
                    admin: {
                        token,
                        ...admin._doc,
                        account_type: 'admin',
                    },
                },
            });
        } else if (['seller', 'shopsOrderManager'].includes(type)) {
            let config = {
                email: email,
                deletedAt: null,
            };

            if (type === 'shopsOrderManager') {
                config.credentialType = 'shopsOrderManager';
            }

            let seller = await SellerModel.findOne(config).select(
                '-createdAt -updatedAt -shops'
            );

            if (!seller) {
                return errorResponse(
                    res,
                    'Seller not found. Please sign up first'
                );
            }

            if (seller.status === 'inactive') {
                return errorResponse(
                    res,
                    'Your account is inactive. Please contact Support'
                );
            }

            if (seller.status === 'pending') {
                return errorResponse(
                    res,
                    'Your account is under progress. Please contact Support'
                );
            }

            const matchPassword = bcrypt.compareSync(password, seller.password);

            if (!matchPassword) {
                return errorResponse(res, 'Wrong password.');
            }

            // if (seller.parentSeller !== null) {
            //     let parentSeller = await SellerModel.findById(
            //         seller.parentSeller
            //     );

            //     const jwtData = {
            //         id: parentSeller._id,
            //         sellerId: parentSeller._id,
            //         name: parentSeller.name,
            //     };

            //     const token = jwt.sign(
            //         jwtData,
            //         process.env.JWT_PRIVATE_KEY_SELLER,
            //         {}
            //     );

            //     delete parentSeller._doc.password;

            //     return successResponse(res, {
            //         message: 'Login Success.',
            //         data: {
            //             admin: {
            //                 token,
            //                 ...parentSeller._doc,
            //                 account_type: 'seller',
            //             },
            //         },
            //     });
            // }

            const jwtData = {
                id: seller._id,
                sellerId: seller._id,
                name: seller.name,
            };

            const token = jwt.sign(
                jwtData,
                process.env.JWT_PRIVATE_KEY_SELLER,
                {}
            );

            delete seller._doc.password;

            // Finding account manager
            const accountManager = await Admins.findOne({
                sellers: { $in: [seller._id] },
                adminType: 'accountManager',
            });
            seller._doc.accountManager = accountManager;

            return successResponse(res, {
                message: 'Login Success.',
                data: {
                    admin: {
                        token,
                        ...seller._doc,
                        account_type: 'seller',
                    },
                },
            });
        } else if (type == 'shop') {
            shopLoginFromConsole(req, res);
        }
    } catch (err) {
        errorHandler(res, err);
    }
};

const shopLoginFromConsole = async (req, res) => {
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
                    path: 'tagsId',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'credentials',
                },
                {
                    path: 'flags',
                    populate: [
                        {
                            path: 'user',
                        },
                        {
                            path: 'orderId',
                            populate: 'user deliveryBoy',
                        },
                        {
                            path: 'shop',
                        },
                        {
                            path: 'delivery',
                        },
                    ],
                },
                {
                    path: 'reviews',
                    populate: 'user product shop order',
                },
            ])
            .select('-categories');

        if (!shop) {
            return errorResponse(res, 'Shop not found. Please sign up first');
        }

        if (shop.shopStatus === 'blocked' || shop.shopStatus === 'inactive') {
            return errorResponse(
                res,
                `Your account is ${shop.shopStatus}. Please contact Support`
            );
        }

        const matchPassword = bcrypt.compareSync(password, shop.password);

        if (!matchPassword) {
            return errorResponse(res, 'Wrong password.');
        }

        const jwtData = {
            shopId: shop._id,
            id: shop._id,
            name: shop.shopName,
        };

        // console.log(jwtData);

        const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_SHOP, {});

        delete shop._doc.password;

        if (!shop.parentShop) {
            // Calc shop average delivered time
            // const avgOrderDeliveryTime = await shopAvgDeliveryTime(shop._id);
            // shop._doc.avgOrderDeliveryTime = avgOrderDeliveryTime;

            // Finding account manager
            const accountManager = await Admins.findOne({
                sellers: { $in: [shop.seller._id] },
                adminType: 'accountManager',
            });
            shop._doc.accountManager = accountManager;

            // Check Shop Opening time
            const isShopOpen = checkShopOpeningHours(shop);
            shop._doc.isShopOpen = isShopOpen;
        }

        return successResponse(res, {
            message: 'Login Success.',
            data: {
                admin: {
                    token,
                    ...shop._doc,
                    account_type: 'shop',
                },
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAdmin = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            status,
            adminType,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
        };

        if (searchKey) {
            // Escape special characters in the search key
            const escapedSearchKey = searchKey.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&'
            );

            const newQuery = escapedSearchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));
            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));
            const phoneNumberQ = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
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
                            { $and: phoneNumberQ },
                            { $and: emailQ },
                        ],
                    },
                ],
            };
        }

        if (status && ['pending', 'active', 'inactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status: status,
            };
        }

        if (
            adminType &&
            [
                'admin',
                'customerService',
                'sales',
                'accountManager',
                'accounting',
                'marketing',
                'generalManager',
                'orderManagementManager',
            ].includes(adminType)
        ) {
            whereConfig = {
                ...whereConfig,
                adminType: adminType,
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: Admins,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await Admins.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'sellers',
                    populate: [
                        {
                            path: 'shops',
                            populate: 'marketings',
                        },
                    ],
                },
            ]);

        if (adminType === 'sales') {
            // Calc sales manager monthly created shop
            const firstDayOfPreviousMonth = moment(new Date())
                .startOf('month')
                .toDate();
            const lastDayOfPreviousMonth = moment(new Date())
                .endOf('month')
                .toDate();

            for (const admin of list) {
                const salesManagerMonthlyCreatedShop =
                    await ShopModel.countDocuments({
                        shopStatus: 'active',
                        deletedAt: null,
                        assignedSalesManager: ObjectId(admin._id),
                        createdAt: {
                            $gte: firstDayOfPreviousMonth,
                            $lte: lastDayOfPreviousMonth,
                        },
                    });

                admin._doc.salesManagerMonthlyCreatedShop =
                    salesManagerMonthlyCreatedShop;
            }
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                Admins: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Create Admin

exports.addAdmin = async (req, res) => {
    try {
        let {
            email,
            name,
            number,
            password,
            adminType,
            sellers = [],
            profile_photo,
            address,
        } = req.body;

        if (!email) {
            return errorResponse(res, 'email is required');
        }
        email = email.toLowerCase();

        if (!password) {
            return errorResponse(res, 'password is required');
        }

        //Check Number
        const numberExits = await Admins.findOne({
            phone_number: number,
            deletedAt: null,
        });
        if (numberExits) return errorResponse(res, 'Number already exist');

        //Check Email
        const emailExits = await Admins.findOne({
            email: email,
            deletedAt: null,
        });
        if (emailExits) return errorResponse(res, 'Email already exist');

        password = await bcrypt.hash(password, 10);

        const admin = await Admins.create({
            email,
            name,
            phone_number: number,
            password,
            adminType,
            sellers,
            profile_photo,
            address,
        });

        successResponse(res, {
            message: 'Successfully added admin',
            data: {
                admin,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

// Update admin

exports.updateAdmin = async (req, res) => {
    try {
        let {
            id,
            email,
            status,
            name,
            number,
            password,
            adminType,
            sellers,
            profile_photo,
            address,
        } = req.body;

        const admin = await Admins.findOne({ _id: id });

        if (!admin) return errorResponse(res, 'Admin not found');

        if (number) {
            const phoneNumberExits = await Admins.findOne({
                phone_number: number,
                $nor: [{ _id: id }],
                deletedAt: null,
            });

            if (phoneNumberExits)
                return errorResponse(res, 'Phone number already exist');
        }

        if (email) {
            email = email.toLowerCase();

            const emailExits = await Admins.findOne({
                email: email,
                $nor: [{ _id: id }],
                deletedAt: null,
            });
            if (emailExits) return errorResponse(res, 'Email already exist');
        }

        const data = {
            email,
            name,
            status,
            phone_number: number,
            adminType,
            profile_photo,
            address,
        };

        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        if (sellers?.length > 0) {
            const findAccountManagers = await Admins.countDocuments({
                _id: { $ne: ObjectId(id) },
                adminType: 'accountManager',
                sellers: { $in: sellers },
                deletedAt: null,
            });

            if (findAccountManagers > 0)
                return errorResponse(
                    res,
                    'This seller is already assigned to account manager.'
                );

            data.sellers = sellers;
        }

        await Admins.updateOne(
            { _id: id },
            {
                $set: data,
            }
        );

        const updatedAdmin = await Admins.findById(id);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                admin: updatedAdmin,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Delete Admin

exports.deleteAdminById = async (req, res) => {
    try {
        const { id } = req.body;

        const admin = await Admins.findById(id);

        if (!admin) return errorHandler(res, 'Admin not found');

        // delete user
        // await Admins.deleteOne({ _id: id });
        await Admins.updateOne(
            { _id: id },
            {
                $set: {
                    deletedAt: new Date(),
                },
            }
        );

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.addDefaultAdmin = async (req, res) => {
    try {
        const email = 'admin@gmail.com';
        const admin = await Admins.findOne({ email });
        if (admin) return errorResponse(res, 'Admin already exist');
        // let password = await bcrypt.hash('12345', 10);

        let password = await bcrypt.hash('123321', 10);
        const addAdmin = await Admins.create({
            email,
            status: 'active',
            name: 'Super Active',
            phone_number: '00000000000',
            password: password,
        });
        delete addAdmin._doc.password;
        successResponse(res, {
            message: 'Successfully added',
            data: {
                admin: {
                    ...addAdmin._doc,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Get single details

exports.getSingleAdminDetails = async (req, res) => {
    try {
        const { id } = req.query;

        let admin = await Admins.findById(id)
            .populate([
                {
                    path: 'sellers',
                    populate: [
                        {
                            path: 'shops',
                            populate: 'marketings shopZone',
                        },
                    ],
                },
            ])
            .lean();

        if (!admin) return errorResponse(res, 'Admin not found');

        // for (let seller of admin?.sellers || []) {
        //     for (let shop of seller?.shops || []) {
        //         // Finding shop zone
        //         const zone = await findZone(
        //             shop.location.coordinates[1],
        //             shop.location.coordinates[0]
        //         );
        //         console.log(zone);
        //         shop.shopZone = zone;
        //     }
        // }

        successResponse(res, {
            message: 'Successfully find admin',
            data: {
                admin,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.changePasswordForAdmin = async (req, res) => {
    try {
        const adminId = req.adminId;
        const sellerId = req.sellerId;
        const shopId = req.shopId;

        const { userType } = req.query;
        let { password } = req.body;

        if (!['admin', 'seller', 'shop'].includes(userType))
            return errorResponse(res, 'Invaild Type');

        password = await bcrypt.hash(password, 10);

        if (userType === 'admin') {
            await Admins.updateOne(
                { _id: adminId },
                {
                    $set: {
                        password,
                    },
                }
            );
        } else if (userType === 'seller') {
            await SellerModel.updateOne(
                { _id: sellerId },
                {
                    $set: {
                        password,
                    },
                }
            );
        } else if (userType === 'shop') {
            await ShopModel.updateOne(
                { _id: shopId },
                {
                    $set: {
                        password,
                    },
                }
            );
        }
        successResponse(res, {
            message: 'Successfully Change',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deliveryTracking = async (req, res) => {
    try {
        const { id, page = 1, pageSize = 50, sortBy } = req.query;

        let whereConfig = {};

        if (id) {
            whereConfig = {
                ...whereConfig,
                delivery: id,
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: DeliveryBoyTracking,
            condition: whereConfig,
            pagingRange: 5,
        });

        const trackingData = await DeliveryBoyTracking.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'delivery',
                    select: '-password',
                },
            ]);

        if (!trackingData) return errorResponse(res, 'No tracking data');

        successResponse(res, {
            message: 'Successfully track',
            data: {
                trackingData,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.addAdminLogAboutActivity = async (
    type,
    id,
    newValue,
    oldValue,
    seller
) => {
    await AdminLogModel.create({
        admin: id,
        type,
        seller,
        newValue,
        oldValue,
        date: new Date(),
    });
};

exports.getAdminLogHistory = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            type,
            sortBy,
            searchKey,
            startDate,
            endDate,
            adminId,
            sellerId,
        } = req.query;

        let whereConfig = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const typeSearchQuery = newQuery.map(str => ({
                type: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: typeSearchQuery }],
                    },
                ],
            };
        }

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

        if (adminId) {
            whereConfig = {
                ...whereConfig,
                admin: adminId,
            };
        }
        if (sellerId) {
            whereConfig = {
                ...whereConfig,
                seller: sellerId,
            };
        }

        if (
            type &&
            [
                'maxDiscount',
                'maxTotalEstItemsPriceForButler',
                'maxDistanceForButler',
                'maxCustomerServiceValue',
                'baseCurrency',
                'secondaryCurrency',
                'adminExchangeRate',
                'acceptedCurrency',
                'vat',
                'searchDeliveryBoyKm',
                'nearByShopKm',
                'nearByShopKmForUserHomeScreen',
                'units',
                'riderWorkingHoursPerDay',
                'riderBOBCashSettlementLimit',
                'salesManagerMonthlyTarget',
                'salesManagerMonthlyReward',
                'customerSupportPhoneNumber',

                'globalDropCharge',
                'specificSellerDropCharge',
                'sellerDropChargeReset',
                'globalDeliveryCut',
                'globalDeliveryCutForButler',

                'specificSellerDeliveryCut',
                // 'pharmacy',
                // 'grocery',
                // 'restaurant',
                // 'food',
                // 'sender_referralDiscountType',
                // 'sender_referralDiscount',
                // 'sender_referralMinimumOrderValue',
                // 'sender_referralDuration',
                // 'receiver_referralDiscountType',
                // 'receiver_referralDiscount',
                // 'receiver_referralMinimumOrderValue',
                // 'receiver_referralDuration',
                // 'rewardCategory',
                // 'rewardBundle',
                // 'getReward',
                // 'redeemReward',
                // 'adminCutForReward',
                // 'expiration_period',
            ].includes(type)
        ) {
            whereConfig = {
                ...whereConfig,
                type: type,
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: AdminLogModel,
            condition: whereConfig,
            pagingRange,
        });

        const list = await AdminLogModel.find(whereConfig)
            .populate('admin seller')
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                logs: list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateAdminLiveStatus = async (req, res) => {
    try {
        const adminId = req.adminId;

        const admin = await Admins.findById(adminId);

        let updateStatus =
            admin?.liveStatus === 'online' ? 'offline' : 'online';

        await Admins.updateOne(
            { _id: adminId },
            {
                $set: {
                    liveStatus: updateStatus,
                    lastOnline:
                        updateStatus === 'online'
                            ? moment(new Date()).format('DD MMM YYYY hh:mm A')
                            : undefined,
                },
            }
        );

        const updatedAdmin = await Admins.findById(adminId);

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                admin: updatedAdmin,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
