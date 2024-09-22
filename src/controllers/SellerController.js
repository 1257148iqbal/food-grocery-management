const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const AddressModel = require('../models/AddressModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pagination } = require('../helpers/pagination');
const SellerModel = require('../models/SellerModel');
const ShopModel = require('../models/ShopModel');
const ProductModel = require('../models/ProductModel');
const { addAdminLogAboutActivity } = require('./AdminController');
const GlobalDropCharge = require('../models/GlobalDropCharge');
const ZoneModel = require('../models/ZoneModel');
const AdminModel = require('../models/AdminModel');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const { findZone } = require('./ZoneController');
const ObjectId = require('mongoose').Types.ObjectId;

exports.sellerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email or password is required');
        }

        const seller = await SellerModel.findOne({
            email: email,
            deletedAt: null,
        }).select('-createdAt -updatedAt');

        if (!seller) {
            return errorResponse(
                res,
                'seller not found . Please contact higher authorize person.'
            );
        }

        if (seller.status === 'blocked') {
            return errorResponse(
                res,
                'Your account is blocked. Please contact admin and ask to activate your account.'
            );
        }

        const matchPassword = bcrypt.compareSync(password, seller.password);

        if (!matchPassword) {
            return errorResponse(res, 'Wrong password.');
        }

        const jwtData = {
            id: seller._id,
            name: seller.name,
        };

        const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_SELLER, {});

        delete seller._doc.password;
        delete seller._doc._id;

        successResponse(res, {
            message: 'Login Success.',
            data: {
                seller: {
                    token,
                    ...seller._doc,
                },
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getSeller = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            sellerStatus,
            pagingRange = 5,
            sellerType,
            subType,
            createdBy,
            zoneId,
            adminId,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            parentSeller: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const nationalIdSearchQuery = newQuery.map(str => ({
                national_id: RegExp(str, 'i'),
            }));

            const emailSearchQuery = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            const company_nameSearchQuery = newQuery.map(str => ({
                company_name: RegExp(str, 'i'),
            }));

            const phone_numberSearchQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: nationalIdSearchQuery },
                            { $and: emailSearchQuery },
                            { $and: company_nameSearchQuery },
                            { $and: phone_numberSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (
            sellerStatus &&
            ['pending', 'active', 'inactive'].includes(sellerStatus)
        ) {
            whereConfig = {
                ...whereConfig,
                status: sellerStatus,
            };
        }

        if (
            sellerType &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(sellerType)
        ) {
            whereConfig = {
                ...whereConfig,
                sellerType: sellerType,
            };
        }

        if (
            subType &&
            ['restaurants', 'foodCut', 'superMarket'].includes(subType)
        ) {
            whereConfig = {
                ...whereConfig,
                subType: subType,
            };
        }
        if (createdBy) {
            whereConfig = {
                ...whereConfig,
                createdBy: ObjectId(createdBy),
            };
        }

        if (zoneId) {
            const zone = await ZoneModel.findById(zoneId);

            if (!zone) return errorResponse(res, 'Zone not found');

            whereConfig = {
                ...whereConfig,
                location: { $geoWithin: { $geometry: zone.zoneGeometry } },
            };
        }
        if (adminId) {
            const admin = await AdminModel.findById(adminId);
            if (!admin) return errorResponse(res, 'Admin not found');
            const adminSellers = admin.sellers;

            whereConfig = {
                ...whereConfig,
                _id: { $in: adminSellers },
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: SellerModel,
            condition: whereConfig,
            pagingRange,
        });

        const list = await SellerModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select('-password -address')
            .populate([
                {
                    path: 'shops',
                    populate: 'marketings cuisineType shopZone',
                },
                {
                    path: 'childSellers',
                },
                {
                    path: 'dropCharge',
                },
                {
                    path: 'assignedSalesManager',
                    select: 'name phone_number email profile_photo adminType',
                },
            ]);

        for (const seller of list) {
            // Finding account manager
            const accountManager = await AdminModel.findOne({
                sellers: { $in: [seller._id] },
                adminType: 'accountManager',
            });
            seller._doc.accountManager = accountManager;

            for (const shop of seller.shops) {
                // Check Shop Opening time
                const isShopOpen = checkShopOpeningHours(shop);
                shop._doc.isShopOpen = isShopOpen;

                // Finding shop zone
                // const zone = await findZone(
                //     shop.location.coordinates[1],
                //     shop.location.coordinates[0]
                // );
                // shop._doc.shopZone = zone;
            }
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                sellers: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.createSellerByAdmin = async (req, res) => {
    try {
        let {
            name,
            phone_number,
            company_name,
            email,
            password,
            profile_photo,
            bank_name,
            account_name,
            account_number,
            certificate_of_incorporation,
            national_id,
            sellerType,
            sellerStatus,
            sellerAddress,
            sellerContractPaper,
            dropPercentage,
            dropPercentageType,
            assignedSalesManager,
            paysServiceFee,
        } = req.body;

        const id = req.adminId;

        const sellerExists = await SellerModel.findOne({
            company_name: { $regex: `^${company_name}$`, $options: 'i' },
            sellerType,
            deletedAt: null,
        });

        if (sellerExists)
            return errorResponse(
                res,
                'This seller company name is already exists.'
            );

        if (!sellerContractPaper) {
            return errorResponse(res, 'sellerContractPaper is required');
        }

        if (!email) {
            return errorResponse(res, 'email is required');
        }
        email = email.toLowerCase();

        if (!password) {
            return errorResponse(res, 'password is required');
        }

        //Check Number
        const numberExits = await SellerModel.findOne({
            phone_number: phone_number,
            deletedAt: null,
        }).lean();
        if (numberExits)
            return res.json({
                status: false,
                message: 'phone number is already in use try another',
            });

        //Check Email
        const emailExits = await SellerModel.findOne({
            email: email,
            deletedAt: null,
        }).lean();

        if (emailExits)
            return res.json({
                status: false,
                message: 'email is already in use try another',
            });

        if (
            ![
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(sellerType)
        ) {
            return errorResponse(res, 'not valid seller type');
        }

        if (!['pending', 'active', 'inactive'].includes(sellerStatus)) {
            return errorResponse(res, 'not valid seller status');
        }

        // check dropPercentageType
        if (
            dropPercentage &&
            !['percentage', 'amount'].includes(dropPercentageType)
        ) {
            return errorResponse(
                res,
                'DropPercentageType must be percentage or amount'
            );
        }

        let encryptedPassword = await bcrypt.hash(password, 10);

        const {
            address,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            note,
            placeId,
        } = sellerAddress;

        // For Adam requirement
        const globalCharge = await GlobalDropCharge.findOne();

        const sellerData = {
            name,
            phone_number,
            company_name,
            email,
            password: encryptedPassword,
            profile_photo,
            status: sellerStatus ? sellerStatus : 'active',
            bank_name,
            account_name,
            account_number,
            certificate_of_incorporation,
            national_id,
            sellerType,
            sellerContractPaper,
            sellerAddress: {
                address: address,
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                latitude,
                longitude,
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
            createdBy: id,
            dropPercentageType: globalCharge
                ? globalCharge.dropPercentageType
                : null,
            globalDropPercentage: globalCharge
                ? globalCharge.dropPercentage
                : null,
            paysServiceFee
        };

        if (assignedSalesManager) {
            sellerData.assignedSalesManager = assignedSalesManager;
        }

        if (dropPercentage) {
            sellerData.dropPercentage = dropPercentage;
            sellerData.dropPercentageType = dropPercentageType;
            sellerData.sellerChargeType = 'specific';
            sellerData.globalDropPercentage = null;
        }

        const seller = await SellerModel.create(sellerData);

        const finalSeller = await SellerModel.findOne({ _id: seller._id })
            .populate('shops')
            .select('-password')
            .lean();

        const admin = await AdminModel.findById(finalSeller.createdBy);
        if (admin?.adminType === 'accountManager') {
            await AdminModel.updateOne(
                { _id: admin._id },
                {
                    $push: {
                        sellers: seller._id,
                    },
                }
            );
        }

        if (assignedSalesManager) {
            await AdminModel.updateOne(
                { _id: assignedSalesManager },
                {
                    $push: {
                        sellers: seller._id,
                    },
                }
            );
        }

        successResponse(res, {
            message: 'Successfully added',
            data: {
                seller: finalSeller,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addCredential = async (req, res) => {
    try {
        let {
            sellerId,
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

        const exits = await SellerModel.findOne({
            _id: sellerId,
            deletedAt: null,
        }).lean();
        if (!exits) {
            return errorResponse(res, 'seller not found');
        }

        // check gmail

        const gmailExits = await SellerModel.findOne({
            email: email,
            deletedAt: null,
        }).lean();
        if (gmailExits) {
            return errorResponse(res, 'email is already in use try another');
        }

        let encryptedPassword = await bcrypt.hash(password, 10);

        const seller = await SellerModel.create({
            email,
            name,
            password: encryptedPassword,
            parentSeller: sellerId,
            credentialType,
        });

        await SellerModel.updateOne(
            { _id: sellerId },
            { $push: { childSellers: seller._id } }
        );

        const list = await SellerModel.findById(sellerId)
            .select('childSellers')
            .populate('childSellers');

        successResponse(res, {
            message: 'Successfully added credentials',
            data: {
                list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateCredential = async (req, res) => {
    try {
        const { id, name, password, credentialType } = req.body;

        const seller = await SellerModel.findById(id);

        if (!seller) {
            return errorResponse(res, 'seller not found');
        }

        let encryptedPassword;

        if (password) {
            encryptedPassword = await bcrypt.hash(password, 10);
        }

        await SellerModel.updateOne(
            { _id: id },
            {
                name,
                password: encryptedPassword,
                credentialType,
            }
        );

        const list = await SellerModel.findById(seller.parentSeller)
            .select('childSellers')
            .populate('childSellers');

        // For frontend requirements
        const updateList = {
            credentials: list?.childSellers,
        };

        successResponse(res, {
            message: 'Successfully updated credentials',
            data: {
                credentials: updateList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteCredential = async (req, res) => {
    try {
        const { sellerId } = req.body;

        const seller = await SellerModel.findById(sellerId).lean();

        if (!seller) {
            return errorResponse(res, 'seller not found');
        }

        if (!seller.parentSeller) {
            return errorResponse(res, 'seller is not a credental seller');
        }

        const parentSellerId = seller.parentSeller;

        await SellerModel.updateOne(
            { _id: parentSellerId },
            { $pull: { credentials: sellerId } }
        );

        await SellerModel.deleteOne({ _id: sellerId });

        const list = await SellerModel.findById(parentSellerId)
            .select('childSellers')
            .populate('childSellers');

        successResponse(res, {
            message: 'Successfully deleted credentials',
            data: {
                remaining: list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCredentialList = async (req, res) => {
    try {
        const { id } = req.query;

        const sellerFind = await SellerModel.findOne({
            _id: id,
        }).lean();

        if (!sellerFind) {
            return errorResponse(res, 'seller not found');
        }

        const list = await SellerModel.findById(id)
            .select('childSellers')
            .populate('childSellers');

        // For frontend requirements
        const updateList = {
            credentials: list.childSellers,
        };

        successResponse(res, {
            message: 'success',
            data: {
                credentials: updateList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateSeller = async (req, res) => {
    try {
        let {
            id,
            name,
            phone_number,
            company_name,
            email,
            password,
            profile_photo,
            sellerStatus,
            bank_name,
            account_name,
            account_number,
            certificate_of_incorporation,
            national_id,
            sellerAddress,
            sellerContractPaper,
            dropPercentage,
            dropPercentageType,
            sellerChargeType,
            paysServiceFee
        } = req.body;

        const isExist = await SellerModel.findOne({ _id: id });

        if (!isExist) return errorResponse(res, 'Seller not found');

        if (company_name) {
            const sellerExist = await SellerModel.findOne({
                _id: { $ne: id },
                company_name: { $regex: `^${company_name}$`, $options: 'i' },
                sellerType: isExist.sellerType,
                deletedAt: null,
            });

            if (sellerExist)
                return errorResponse(
                    res,
                    'This seller company name is already exists.'
                );
        }

        if (email) {
            email = email.toLowerCase();

            const emailExits = await SellerModel.findOne({
                email: email,
                deletedAt: null,
                _id: { $ne: id },
            }).lean();

            if (emailExits)
                return res.json({
                    status: false,
                    message: 'email is already in use try another',
                });
        }

        if (phone_number) {
            const numberExits = await SellerModel.findOne({
                phone_number: phone_number,
                deletedAt: null,
                _id: { $ne: id },
            }).lean();

            if (numberExits)
                return res.json({
                    status: false,
                    message: 'phone number is already in use try another',
                });
        }

        // check dropPercentageType
        if (
            dropPercentage &&
            !['percentage', 'amount'].includes(dropPercentageType)
        ) {
            return errorResponse(
                res,
                'DropPercentageType must be percentage or amount'
            );
        }

        if (password) {
            password = await bcrypt.hash(password, 10);
        }

        const {
            address,
            latitude,
            longitude,
            country,
            state,
            city,
            pin,
            note,
            placeId,
        } = sellerAddress;

        await SellerModel.updateOne(
            { _id: id },
            {
                $set: {
                    name,
                    phone_number,
                    company_name,
                    email,
                    password,
                    profile_photo,
                    status: sellerStatus,
                    bank_name,
                    account_name,
                    account_number,
                    certificate_of_incorporation,
                    national_id,
                    sellerAddress: {
                        address: address,
                        location: {
                            type: 'Point',
                            coordinates: [longitude, latitude],
                        },
                        latitude,
                        longitude,
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
                    sellerContractPaper,
                    paysServiceFee
                },
            }
        );

        if (dropPercentage && sellerChargeType === 'specific') {
            await SellerModel.updateOne(
                { _id: id },
                {
                    $set: {
                        dropPercentage,
                        dropPercentageType,
                        sellerChargeType: 'specific',
                        globalDropPercentage: null,
                    },
                }
            );
        }
        if (sellerChargeType === 'global') {
            const globalCharge = await GlobalDropCharge.findOne();

            await SellerModel.updateOne(
                { _id: id },
                {
                    $set: {
                        dropPercentage: null,
                        dropPercentageType: globalCharge?.dropPercentageType,
                        sellerChargeType: 'global',
                        globalDropPercentage: globalCharge?.dropPercentage,
                    },
                }
            );
        }

        if (sellerStatus) {
            // update many ShopModel shopStatus
            await ShopModel.updateMany(
                { seller: id },
                {
                    $set: {
                        shopStatus: sellerStatus,
                    },
                }
            );

            await ProductModel.updateMany(
                { seller: id },
                {
                    $set: {
                        status: sellerStatus,
                    },
                }
            );
        }

        const seller = await SellerModel.findOne({ _id: id })
            .populate('shops')
            .select('-password')
            .lean();

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                seller,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteSellerById = async (req, res) => {
    try {
        const { id } = req.body;

        const isExist = await SellerModel.findOne({ _id: id });

        if (!isExist) return errorHandler(res, { message: 'seller not found' });

        if (isExist.shops.length > 0) {
            return errorResponse(
                res,
                'seller has shop . not be deleted now . first delete shop'
            );
        }

        await SellerModel.updateOne(
            { _id: id },
            {
                $set: {
                    deletedAt: new Date(),
                },
            }
        );

        const seller = await SellerModel.findOne({ _id: id });
        successResponse(res, {
            message: 'Successfully Deleted',
            data: {
                seller,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getSellerDetailsForAdmin = async (req, res) => {
    try {
        const { id } = req.query;

        const seller = await SellerModel.findOne({ _id: id })
            .populate([
                {
                    path: 'shops',
                    populate: 'marketings cuisineType shopZone',
                },
                {
                    path: 'childSellers',
                },
                {
                    path: 'dropCharge',
                },
                {
                    path: 'assignedSalesManager',
                    select: 'name phone_number email profile_photo adminType',
                },
            ])
            .select('-password');
        // .populate([
        //     {
        //         path: 'users',
        //         select: 'name phone_number profile_photo _id'
        //     },
        //     {
        //         path: 'address',
        //     },
        // ]);

        // Finding account manager
        const accountManager = await AdminModel.findOne({
            sellers: { $in: [seller._id] },
            adminType: 'accountManager',
        });
        seller._doc.accountManager = accountManager;

        for (const shop of seller.shops) {
            // Check Shop Opening time
            const isShopOpen = checkShopOpeningHours(shop);
            shop._doc.isShopOpen = isShopOpen;

            // Finding shop zone
            // const zone = await findZone(
            //     shop.location.coordinates[1],
            //     shop.location.coordinates[0]
            // );
            // shop._doc.shopZone = zone;
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                seller,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.useSignUpFromStoreApp = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone_number,
            company_name,
            sellerAddress,
        } = req.body;

        if (!name || !email || !password || !phone_number || !company_name) {
            return errorResponse(res, 'validation error');
        }

        const emailExits = await SellerModel.findOne({
            email: email,
            deletedAt: null,
        });

        if (emailExits)
            return errorResponse(res, 'email is already in use try another');

        const seller = await SellerModel.create({
            name,
            email,
            password,
            status: 'active',
            phone_number,
            company_name,
            sellerAddress,
        });

        const jwtData = {
            sellerId: seller._id,
            name: seller.name,
        };

        //         console.log(jwtData);

        const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_SELLER, {});

        delete seller._doc.password;
        delete seller._doc._id;

        successResponse(res, {
            message: 'Sign up Success.',
            data: {
                seller: {
                    token,
                    ...seller._doc,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.useSignInFromStoreApp = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email or password is required');
        }

        const seller = await SellerModel.findOne({
            email: email,
            deletedAt: null,
        }).select('-createdAt -updatedAt');

        if (!seller) {
            return errorResponse(
                res,
                'Seller not found . please sign up first'
            );
        }

        if (seller.status === 'inactive') {
            return errorResponse(
                res,
                'Your account is blocked. Please contact Support'
            );
        }

        const matchPassword = bcrypt.compareSync(password, seller.password);

        if (!matchPassword) {
            return errorResponse(res, 'Wrong password.');
        }

        const jwtData = {
            sellerId: seller._id,
            name: seller.name,
        };

        // console.log(jwtData);

        const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_SELLER, {});

        delete seller._doc.password;
        delete seller._doc._id;

        successResponse(res, {
            message: 'Login Success.',
            data: {
                seller: {
                    token,
                    ...seller._doc,
                },
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getSellerProfile = async (req, res) => {
    try {
        const sellerId = req.sellerId;

        // console.log(sellerId);
        const seller = await SellerModel.findById(sellerId).select(
            '-createdAt -updatedAt -password'
        );
        successResponse(res, {
            message: 'seller profile',
            data: {
                seller,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateSellerProfile = async (req, res) => {
    try {
        const id = req.sellerId;
        const { name, email, phone_number, company_name, sellerAddress } =
            req.body;

        let updatedData = {};

        if (name) {
            updatedData.name = name;
        }
        if (company_name) {
            updatedData.company_name = company_name;
        }

        if (email) {
            const emailExits = await SellerModel.findOne({
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

        // if (gender) {
        //     updatedData.gender = gender;
        // }

        if (phone_number) {
            const phoneNumberExits = await SellerModel.findOne({
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

        await SellerModel.updateOne(
            { _id: id },
            {
                $set: {
                    ...updatedData,
                },
            }
        );

        const seller = await SellerModel.findById(id).select(
            '-createdAt -updatedAt -password'
        );

        successResponse(res, {
            message: 'user profile',
            data: {
                seller,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.changePasswordForShopApp = async (req, res) => {
    try {
        const sellerId = req.sellerId;

        let { password } = req.body;

        password = await bcrypt.hash(password, 10);

        await SellerModel.updateOne(
            { _id: sellerId },
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

exports.addSellerDropCharge = async (req, res) => {
    try {
        const id = req.adminId;
        const { sellerId, dropPercentage, dropPercentageType } = req.body;

        if (!sellerId || !dropPercentage || !dropPercentageType) {
            return errorResponse(res, {
                message: 'Please provide dropPercentage and dropPercentageType',
            });
        }

        // check dropPercentageType
        if (!['percentage', 'amount'].includes(dropPercentageType)) {
            return errorResponse(res, {
                message: 'dropPercentageType must be percentage or amount',
            });
        }

        const beforeUpdate = await SellerModel.findById(sellerId).lean();

        await SellerModel.updateOne(
            { _id: sellerId },
            {
                $set: {
                    dropPercentage,
                    dropPercentageType,
                    sellerChargeType: 'specific',
                    globalDropPercentage: null,
                },
            }
        );

        const seller = await SellerModel.findById(sellerId).lean();

        let charge;
        if (beforeUpdate.dropPercentage == null) {
            let globalCharge = await GlobalDropCharge.findOne();

            charge = {
                dropPercentage: globalCharge.dropPercentage,
                dropPercentageType: globalCharge.dropPercentageType,
            };
        } else {
            charge = {
                dropPercentage: beforeUpdate.dropPercentage,
                dropPercentageType: beforeUpdate.dropPercentageType,
            };
        }

        let newParcentage = {
            dropPercentage: dropPercentage,
            dropPercentageType: dropPercentageType,
        };
        // console.log('coe');
        addAdminLogAboutActivity(
            'specificSellerDropCharge',
            id,
            newParcentage,
            charge,
            sellerId
        );

        successResponse(res, {
            message: 'Successfully Change',
            data: {
                seller,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.setSellerDeliveryCut = async (req, res) => {
    try {
        const id = req.adminId;
        const { sellerId, deliveryRange } = req.body;

        if (!deliveryRange) {
            return errorResponse(res, {
                message: 'Please provide deliveryRange',
            });
        }

        await SellerModel.updateOne(
            { _id: sellerId },
            {
                $set: {
                    deliveryRange,
                },
            }
        );

        const seller = await SellerModel.findById(sellerId).lean();

        const globalCharge = await GlobalDropCharge.findOne();

        addAdminLogAboutActivity(
            'specificSellerDeliveryCut',
            id,
            deliveryRange,
            globalCharge.deliveryRange,
            sellerId
        );

        successResponse(res, {
            message: 'Successfully Change',
            data: {
                seller,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getRemainingSellerForAccountManager = async (req, res) => {
    try {
        const {
            searchKey,
            sortBy = 'desc',
            sellerStatus,
            sellerType,
            subType,
            zoneId,
            accountManagerId,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            parentSeller: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const nationalIdSearchQuery = newQuery.map(str => ({
                national_id: RegExp(str, 'i'),
            }));

            const emailSearchQuery = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            const company_nameSearchQuery = newQuery.map(str => ({
                company_name: RegExp(str, 'i'),
            }));

            const phone_numberSearchQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: nationalIdSearchQuery },
                            { $and: emailSearchQuery },
                            { $and: company_nameSearchQuery },
                            { $and: phone_numberSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (
            sellerStatus &&
            ['pending', 'active', 'inactive'].includes(sellerStatus)
        ) {
            whereConfig = {
                ...whereConfig,
                status: sellerStatus,
            };
        }

        if (
            sellerType &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(sellerType)
        ) {
            whereConfig = {
                ...whereConfig,
                sellerType: sellerType,
            };
        }

        if (
            subType &&
            ['restaurants', 'foodCut', 'superMarket'].includes(subType)
        ) {
            whereConfig = {
                ...whereConfig,
                subType: subType,
            };
        }

        if (zoneId) {
            const zone = await ZoneModel.findById(zoneId);

            if (!zone) return errorResponse(res, 'Zone not found');

            whereConfig = {
                ...whereConfig,
                location: { $geoWithin: { $geometry: zone.zoneGeometry } },
            };
        }

        const sellers = await SellerModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .select('-password -address')
            .populate([
                {
                    path: 'shops',
                    populate: 'marketings cuisineType',
                },
                {
                    path: 'childSellers',
                },
                {
                    path: 'dropCharge',
                },
            ]);

        const accountManagers = await AdminModel.find({
            deletedAt: null,
            adminType: 'accountManager',
        });

        let assignSellerList = [];
        for (const accountManager of accountManagers) {
            assignSellerList = [...assignSellerList, ...accountManager.sellers];
        }
        const assignSellerListString = assignSellerList.map(element =>
            element.toString()
        );
        const remainingList = sellers.filter(
            seller => !assignSellerListString.includes(seller._id.toString())
        );

        let list = [];
        if (accountManagerId) {
            const expectedAccountManager = accountManagers.find(
                accountManager =>
                    accountManager._id.toString() ===
                    accountManagerId.toString()
            );
            const expectedAccountManagerSellerList =
                expectedAccountManager.sellers.map(element =>
                    element.toString()
                );
            list = sellers.filter(seller =>
                expectedAccountManagerSellerList.includes(seller._id.toString())
            );
        }

        const finalList = [...list, ...remainingList];

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                sellers: finalList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRemainingSellerForSalesManager = async (req, res) => {
    try {
        const {
            searchKey,
            sortBy = 'desc',
            sellerStatus,
            sellerType,
            subType,
            zoneId,
            salesManagerId,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            parentSeller: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const nationalIdSearchQuery = newQuery.map(str => ({
                national_id: RegExp(str, 'i'),
            }));

            const emailSearchQuery = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            const company_nameSearchQuery = newQuery.map(str => ({
                company_name: RegExp(str, 'i'),
            }));

            const phone_numberSearchQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: nationalIdSearchQuery },
                            { $and: emailSearchQuery },
                            { $and: company_nameSearchQuery },
                            { $and: phone_numberSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (
            sellerStatus &&
            ['pending', 'active', 'inactive'].includes(sellerStatus)
        ) {
            whereConfig = {
                ...whereConfig,
                status: sellerStatus,
            };
        }

        if (
            sellerType &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(sellerType)
        ) {
            whereConfig = {
                ...whereConfig,
                sellerType: sellerType,
            };
        }

        if (
            subType &&
            ['restaurants', 'foodCut', 'superMarket'].includes(subType)
        ) {
            whereConfig = {
                ...whereConfig,
                subType: subType,
            };
        }

        if (zoneId) {
            const zone = await ZoneModel.findById(zoneId);

            if (!zone) return errorResponse(res, 'Zone not found');

            whereConfig = {
                ...whereConfig,
                location: { $geoWithin: { $geometry: zone.zoneGeometry } },
            };
        }

        const sellers = await SellerModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .select('-password -address')
            .populate([
                {
                    path: 'shops',
                    populate: 'marketings cuisineType',
                },
                {
                    path: 'childSellers',
                },
                {
                    path: 'dropCharge',
                },
            ]);

        const salesManagers = await AdminModel.find({
            deletedAt: null,
            adminType: 'sales',
        });

        let assignSellerList = [];
        for (const salesManager of salesManagers) {
            assignSellerList = [...assignSellerList, ...salesManager.sellers];
        }
        const assignSellerListString = assignSellerList.map(element =>
            element.toString()
        );
        const remainingList = sellers.filter(
            seller => !assignSellerListString.includes(seller._id.toString())
        );

        let list = [];
        if (salesManagerId) {
            const expectedSalesManager = salesManagers.find(
                salesManager =>
                    salesManager._id.toString() === salesManagerId.toString()
            );
            const expectedSalesManagerSellerList =
                expectedSalesManager.sellers.map(element => element.toString());
            list = sellers.filter(seller =>
                expectedSalesManagerSellerList.includes(seller._id.toString())
            );
        }

        const finalList = [...list, ...remainingList];

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                sellers: finalList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAssignedSellerForSalesManager = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            searchKey,
            sortBy = 'desc',
            sellerStatus,
            sellerType,
            subType,
            zoneId,
            salesManagerId,
        } = req.query;

        if (!salesManagerId)
            return errorResponse(res, 'salesManagerId is required');

        let whereConfig = {
            deletedAt: null,
            parentSeller: null,
            assignedSalesManager: salesManagerId,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const nationalIdSearchQuery = newQuery.map(str => ({
                national_id: RegExp(str, 'i'),
            }));

            const emailSearchQuery = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));

            const company_nameSearchQuery = newQuery.map(str => ({
                company_name: RegExp(str, 'i'),
            }));

            const phone_numberSearchQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: nationalIdSearchQuery },
                            { $and: emailSearchQuery },
                            { $and: company_nameSearchQuery },
                            { $and: phone_numberSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        if (
            sellerStatus &&
            ['pending', 'active', 'inactive'].includes(sellerStatus)
        ) {
            whereConfig = {
                ...whereConfig,
                status: sellerStatus,
            };
        }

        if (
            sellerType &&
            [
                'food',
                'grocery',
                'pharmacy',
                'healthy_corner',
                'coffee',
                'flower',
                'pet',
            ].includes(sellerType)
        ) {
            whereConfig = {
                ...whereConfig,
                sellerType: sellerType,
            };
        }

        if (
            subType &&
            ['restaurants', 'foodCut', 'superMarket'].includes(subType)
        ) {
            whereConfig = {
                ...whereConfig,
                subType: subType,
            };
        }

        if (zoneId) {
            const zone = await ZoneModel.findById(zoneId);

            if (!zone) return errorResponse(res, 'Zone not found');

            whereConfig = {
                ...whereConfig,
                location: { $geoWithin: { $geometry: zone.zoneGeometry } },
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: SellerModel,
            condition: whereConfig,
            pagingRange,
        });

        const sellers = await SellerModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select('name company_name shops profile_photo');

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                sellers,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
