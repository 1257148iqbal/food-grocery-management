const SmsSend = require('../lib/smsSend');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const UserModel = require('../models/UserModel');
const CardModel = require('../models/CardModel');
const ShopModel = require('../models/ShopModel');
const ProductModel = require('../models/ProductModel');
const OrderModel = require('../models/OrderModel');
const AddressModel = require('../models/AddressModel');
const ObjectId = require('mongoose').Types.ObjectId;
const { validationResult } = require('express-validator');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppSetting = require('../models/AppSetting');
const TransactionModel = require('../models/TransactionModel');
const {
    getUserBalance,
    getDropBalance,
    getAdminWalletBalance,
} = require('../helpers/BalanceQuery');
const moment = require('moment');
const Flutterwave = require('flutterwave-node-v3');
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const flw = new Flutterwave(PUBLIC_KEY, SECRET_KEY);
const short = require('short-uuid');
const { creditCardType } = require('../helpers/utility');
const CouponModel = require('../models/CouponModel');
const ReferralSettingModel = require('../models/ReferralSettingModel');
const ZoneModel = require('../models/ZoneModel');
const ReviewModel = require('../models/ReviewModel');
const { getCouponHistory } = require('../helpers/getCouponHistory');
const ButlerModel = require('../models/ButlerModel');
const {
    sendNotificationsForAddRemoveCredit,
} = require('./NotificationController');
const { cancelUserOngoingOrder } = require('./OrderController');
const FlagModel = require('../models/FlagModel');
const {
    pushNotificationForDeactivateUserByAdmin,
} = require('./NotificationController');
const { getUserRewardPoints } = require('../services/transaction.service');
const { sendWhatsappOTP } = require('../lib/twilio');
const parsePhoneNumber = require('libphonenumber-js');

// User login

exports.userLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email or password is required');
        }

        const user = await UserModel.findOne({
            email: email,
            deletedAt: null,
        }).select('-createdAt -updatedAt');

        if (!user) {
            return errorResponse(
                res,
                'user not found . Please contact higher authorize person.'
            );
        }

        if (user.status === 'blocked') {
            return errorResponse(
                res,
                'Your account is blocked. Please contact admin and ask to activate your account.'
            );
        }

        const matchPassword = bcrypt.compareSync(password, user.password);

        if (!matchPassword) {
            return errorResponse(res, 'Wrong password.');
        }

        const jwtData = {
            id: user._id,
            name: user.name,
        };

        // console.log(jwtData);

        const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_USER, {});

        delete user._doc.password;
        delete user._doc._id;

        successResponse(res, {
            message: 'Login Success.',
            data: {
                admin: {
                    token,
                    ...user._doc,
                },
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sort_by,
            status,
            zoneId,
            userType, // normal || subscribed
        } = req.query;
        let sortBy = {};
        if (sort_by) sortBy = JSON.parse(sort_by);
        let whereConfig = {
            deletedAt: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const phoneSearchQuery = newQuery.map(str => ({
                phone_number: RegExp(str, 'i'),
            }));

            const autoGenIdSearchQuery = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: phoneSearchQuery },
                            { $and: autoGenIdSearchQuery },
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

        if (zoneId) {
            const zone = await ZoneModel.findById(zoneId);

            if (!zone) return errorResponse(res, 'Zone not found');

            whereConfig = {
                ...whereConfig,
                location: { $geoWithin: { $geometry: zone.zoneGeometry } },
            };
        }

        if (userType && ['normal', 'subscribed'].includes(userType)) {
            if (userType === 'subscribed') {
                whereConfig.isSubscribed = true;
            } else {
                // Considering the case where isSubscribed might not exist
                whereConfig.$or = [
                    { isSubscribed: { $exists: false } },
                    { isSubscribed: false },
                ];
            }
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: UserModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await UserModel.find(whereConfig)
            .sort(sortBy)
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select('-shops -favoritesProducts -favoritesShops')
            .populate([
                {
                    path: 'flags',
                    populate: 'user orderId shop delivery',
                },
                {
                    path: 'address',
                },
                {
                    path: 'subscription',
                },
            ]);

        const newList = [];

        for (const element of list) {
            const user = element;
            const {
                availableBalance: balance,
                secondaryCurrency_availableBalance: secondaryCurrency_balance,
            } = await getUserBalance(user._id);
            let zone = null;
            if (user?.location?.coordinates[0]) {
                let zoneConfig = {
                    zoneGeometry: {
                        $geoIntersects: {
                            $geometry: {
                                type: 'Point',
                                coordinates: [
                                    user?.location?.coordinates[0],
                                    user?.location?.coordinates[1],
                                ],
                            },
                        },
                    },
                };

                zone = await ZoneModel.findOne(zoneConfig);
            }

            const newUser = {
                ...user._doc,
                tempBalance: balance,
                balance,
                secondaryCurrency_balance,
                zone,
            };
            newList.push(newUser);
        }

        return res.status(200).json({
            status: true,
            data: {
                users: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.query;

        const user = await UserModel.findOne({ _id: id, deletedAt: null });

        if (!user) {
            return res.status(200).json({
                status: false,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            status: true,
            data: {
                user,
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message,
        });
    }
};

exports.deleteUserById = async (req, res) => {
    try {
        const { id } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(200).json({
                status: false,
                message: 'id is invalid',
            });
        }

        const user = await UserModel.findOne({ _id: id, deletedAt: null });

        if (!user) {
            return res.status(200).json({
                status: false,
                message: 'User not found',
            });
        }

        await UserModel.updateOne({ _id: id }, { deletedAt: new Date() });

        return res.status(200).json({
            status: true,
            message: 'User Successfully Deleted',
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message,
        });
    }
};

exports.updateUserById = async (req, res) => {
    try {
        const { id } = req.body;
        let { name, email, phone_number, status, gender, dob, profile_photo } =
            req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(200).json({
                status: false,
                message: 'id is invalid',
            });
        }

        const user = await UserModel.findOne({ _id: id, deletedAt: null });

        if (!user) {
            return res.status(200).json({
                status: false,
                message: 'User not found',
            });
        }

        let updatedData = {};

        if (phone_number) {
            const phoneNumberExits = await UserModel.findOne({
                phone_number: phone_number,
                deletedAt: null,
                $nor: [{ _id: id }],
            });

            if (phoneNumberExits) {
                return res.json({
                    status: false,
                    message: 'phone number is already in use try another',
                });
            }
            updatedData.phone_number = phone_number;
        }

        if (email) {
            const emailExits = await UserModel.findOne({
                email: email,
                deletedAt: null,
                $nor: [{ _id: id }],
            });

            // console.log(emailExits);
            if (emailExits) {
                return res.json({
                    status: false,
                    message: 'email number is already in use try another',
                });
            }

            updatedData.email = email;
        }

        if (dob) {
            dob = new Date(dob);
            updatedData.dob = dob;
        }

        if (name) {
            updatedData.name = name;
        }

        if (status) {
            updatedData.status = status;

            if (user.status === 'active' && status === 'inactive') {
                await pushNotificationForDeactivateUserByAdmin(id);
                await cancelUserOngoingOrder(id);
            }
        }

        if (gender) {
            updatedData.gender = gender;
        }

        if (profile_photo || profile_photo == '') {
            updatedData.profile_photo = profile_photo;
        }

        await UserModel.updateOne({ _id: id }, updatedData);

        const updatedUser = await UserModel.findById(id)
            .select('-shops')
            .populate('address');

        return res.status(200).json({
            status: true,
            message: 'User Successfully Updated',
            data: {
                user: updatedUser,
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message,
        });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.body;
        let { status } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(200).json({
                status: false,
                message: 'id is invalid',
            });
        }

        const user = await UserModel.findOne({ _id: id, deletedAt: null });

        if (!user) {
            return res.status(200).json({
                status: false,
                message: 'User not found',
            });
        }

        await UserModel.updateOne(
            { _id: id },
            {
                status: status,
            }
        );

        return res.status(200).json({
            status: true,
            message: 'User Successfully Updated',
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message,
        });
    }
};

exports.addUserByAdmin = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }

        const {
            name,
            email,
            phone_number,
            profile_photo,
            dob,
            password = '12345',
            gender,
        } = req.body;

        const phoneNumberExits = await UserModel.findOne({
            phone_number: phone_number,
        });
        if (phoneNumberExits)
            return res.json({
                status: false,
                message: 'phone number is already in use try another',
            });

        const emailExits = await UserModel.findOne({
            email: email,
        });

        if (emailExits)
            return res.json({
                status: false,
                message: 'email number is already in use try another',
            });

        const user = await UserModel.create({
            name,
            email,
            phone_number,
            status: 'active',
            dob: new Date(dob),
            password,
            account_type: 'user',
            profile_photo,
            gender,
        });

        const newUser = await UserModel.findById(user._id)
            .populate([
                {
                    path: 'address',
                },
            ])
            .select('-password -shops');

        res.json({
            status: true,
            message: 'successfully create new user',
            data: {
                user: newUser,
            },
        });
    } catch (error) {
        res.json({
            status: false,
            message: error.message,
        });
    }
};

exports.useSignUpFromUserApp = async (req, res) => {
    try {
        let { name, email, dob, password, gender, userRegisterDeviceId } =
            req.body;

        if (!name || !email || !password) {
            return errorResponse(res, 'validation error');
        }

        email = email.toLowerCase();

        const emailExits = await UserModel.findOne({
            email: email,
            deletedAt: null,
        });

        if (emailExits)
            return errorResponse(res, 'email is already in use try another');

        const user = await UserModel.create({
            name,
            email,
            status: 'active',
            dob: dob ? new Date(dob) : null,
            password,
            account_type: 'user',
            gender,
            userRegisterDeviceId,
        });

        const referralSetting = await ReferralSettingModel.findOne({});
        const referralCode = await generateReferralCode(name);
        const coupon = await CouponModel.create({
            couponName: referralCode,
            couponType: 'referral_code',
            couponReferralUser: user._id,
            couponDiscountType:
                referralSetting?.receiver_referralDiscountType || 'percentage',
            couponValue: referralSetting?.receiver_referralDiscount || 0,
            couponMinimumOrderValue:
                referralSetting?.receiver_referralMinimumOrderValue || 0,
            couponUserLimit: 1,
        });
        // await UserModel.findByIdAndUpdate(user._id, {
        //     referralCode: coupon._id,
        // });

        const currentDate = new Date();
        const newUserCoupon = await CouponModel.findOne({
            couponType: 'global',
            couponStatus: 'active',
            onlyForNewUser: true,
            deletedAt: null,

            // global not-deleted active coupon which end date are greater than or equal to current date. Also didn't expire yet.
            couponExpiredReason: { $exists: false },
            'couponDuration.end': {
                $gte: currentDate, // should match with admin panel's today's date
            },
        });

        const updatedUser = await UserModel.findByIdAndUpdate(
            user._id,
            {
                $set: {
                    referralCode: coupon._id,
                },
                $push: {
                    coupons: newUserCoupon?._id,
                },
            },
            { new: true }
        );

        const jwtData = {
            userId: user._id,
            name: user.name,
        };

        const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_USER, {});

        successResponse(res, {
            message: 'Successfully Register',
            data: {
                token,
                needPhoneVerify: user.phoneVerify ? false : true,
                user: updatedUser,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.facebookRegister = async (req, res) => {
//     try {
//         let {
//             name,
//             email,
//             type,
//             profile_photo,
//             userRegisterDeviceId,
//             appleUserId,
//         } = req.body;

//         let user = null;

//         if (!type) {
//             return res.status(400).json({
//                 status: false,
//                 message: 'bad request',
//             });
//         }

//         if (type === 'apple') {
//             if (!appleUserId) {
//                 return res.status(400).json({
//                     status: false,
//                     message: 'bad request',
//                 });
//             }

//             user = await UserModel.findOne({
//                 appleUserId: appleUserId,
//                 deletedAt: null,
//             }).select(
//                 '-favoritesProducts -favoritesShops -address -shops -sellerStatus -company_name '
//             );

//             if (!user) {
//                 user = await UserModel.findOne({
//                     email: email,
//                     deletedAt: null,
//                 }).select(
//                     '-favoritesProducts -favoritesShops -address -shops -sellerStatus -company_name '
//                 );

//                 if (user) {
//                     user.appleUserId = appleUserId;
//                     await user.save();
//                 }
//             }
//         } else {
//             if (!name || !email) {
//                 return res.status(400).json({
//                     status: false,
//                     message: 'bad request',
//                 });
//             }

//             email = email.toLowerCase();

//             user = await UserModel.findOne({
//                 email: email,
//                 deletedAt: null,
//             }).select(
//                 '-favoritesProducts -favoritesShops -address -shops -sellerStatus -company_name '
//             );
//         }

//         if (!user) {
//             if (!name || !email) {
//                 return res.status(400).json({
//                     status: false,
//                     message: 'bad request',
//                 });
//             }

//             user = await UserModel.create({
//                 name,
//                 email,
//                 registerType: type,
//                 account_type: 'user',
//                 profile_photo,
//                 userRegisterDeviceId,
//                 appleUserId,
//             });

//             const referralSetting = await ReferralSettingModel.findOne({});
//             const referralCode = await generateReferralCode(name);
//             const coupon = await CouponModel.create({
//                 couponName: referralCode,
//                 couponType: 'referral_code',
//                 couponReferralUser: user._id,
//                 couponDiscountType:
//                     referralSetting?.receiver_referralDiscountType ||
//                     'percentage',
//                 couponValue: referralSetting?.receiver_referralDiscount || 0,
//                 couponMinimumOrderValue:
//                     referralSetting?.receiver_referralMinimumOrderValue || 0,
//                 couponUserLimit: 1,
//             });
//             // await UserModel.findByIdAndUpdate(user._id, {
//             //     referralCode: coupon._id,
//             // });

//             const newUserCoupon = await CouponModel.findOne({
//                 couponType: 'global',
//                 couponStatus: 'active',
//                 onlyForNewUser: true,
//                 deletedAt: null,
//             });

//             await UserModel.findByIdAndUpdate(user._id, {
//                 $set: {
//                     referralCode: coupon._id,
//                 },
//                 $push: {
//                     coupons: newUserCoupon?._id,
//                 },
//             });
//         } else {
//             if (!user.profile_photo) {
//                 user.profile_photo = profile_photo;
//                 await user.save();
//             }
//             if (user.registerType !== type) {
//                 return res.status(200).json({
//                     status: false,
//                     message: `Your email ${user.email} is already used with ${user.registerType}`,
//                 });
//             }
//         }

//         const updatedUser = await UserModel.findOne({
//             email: user.email,
//             deletedAt: null,
//         }).select('-favoritesProducts -address ');

//         const jwtData = {
//             userId: user._id,
//             name: user.name,
//         };

//         const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_USER, {});

//         return successResponse(res, {
//             message: 'Successfully Register',
//             data: {
//                 token,
//                 needPhoneVerify: user.phoneVerify ? false : true,
//                 user: updatedUser,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };

exports.facebookRegister = async (req, res) => {
    try {
        let {
            name,
            email,
            type,
            profile_photo,
            userRegisterDeviceId,
            identityToken,
        } = req.body;

        let user = null;

        if (!type) {
            return res.status(400).json({
                status: false,
                message: 'bad request',
            });
        }

        if (type === 'apple' && !email) {
            if (!identityToken) {
                return res.status(400).json({
                    status: false,
                    message: 'bad request',
                });
            }

            const decodedToken = jwt.decode(identityToken);
            email = decodedToken?.email;
        }

        if (!email) {
            return res.status(400).json({
                status: false,
                message: 'bad request',
            });
        }

        email = email.toLowerCase();

        user = await UserModel.findOne({
            email: email,
            deletedAt: null,
        }).select(
            '-favoritesProducts -favoritesShops -address -shops -sellerStatus -company_name '
        );

        if (!user) {
            // if (!name) {
            //     return res.status(400).json({
            //         status: false,
            //         message: 'bad request',
            //     });
            // }

            user = await UserModel.create({
                name,
                email,
                registerType: type,
                account_type: 'user',
                profile_photo,
                userRegisterDeviceId,
            });

            const referralSetting = await ReferralSettingModel.findOne({});
            const referralCode = await generateReferralCode(name);
            const coupon = await CouponModel.create({
                couponName: referralCode,
                couponType: 'referral_code',
                couponReferralUser: user._id,
                couponDiscountType:
                    referralSetting?.receiver_referralDiscountType ||
                    'percentage',
                couponValue: referralSetting?.receiver_referralDiscount || 0,
                couponMinimumOrderValue:
                    referralSetting?.receiver_referralMinimumOrderValue || 0,
                couponUserLimit: 1,
            });
            // await UserModel.findByIdAndUpdate(user._id, {
            //     referralCode: coupon._id,
            // });

            const newUserCoupon = await CouponModel.findOne({
                couponType: 'global',
                couponStatus: 'active',
                onlyForNewUser: true,
                deletedAt: null,
            });

            await UserModel.findByIdAndUpdate(user._id, {
                $set: {
                    referralCode: coupon._id,
                },
                $push: {
                    coupons: newUserCoupon?._id,
                },
            });
        } else {
            if (!user.profile_photo && profile_photo) {
                user.profile_photo = profile_photo;
                await user.save();
            }
            if (user.registerType !== type) {
                return res.status(200).json({
                    status: false,
                    message: `Your email ${user.email} is already used with ${user.registerType}`,
                });
            }
        }

        const updatedUser = await UserModel.findOne({
            email: user.email,
            deletedAt: null,
        }).select('-favoritesProducts -address ');

        const jwtData = {
            userId: user._id,
            name: user.name,
        };

        const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_USER, {});

        return successResponse(res, {
            message: 'Successfully Register',
            data: {
                token,
                needPhoneVerify: user.phoneVerify ? false : true,
                user: updatedUser,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendOtpForUserPhoneVerify = async (req, res) => {
    try {
        const userId = req.userId;
        const { phoneNumber, countryShortName } = req.body;

        let alreadyExits = await UserModel.findOne({
            phone_number: phoneNumber,
            countryShortName: countryShortName,
            $nor: [{ _id: userId }],
        });

        if (alreadyExits) {
            return errorResponse(
                res,
                'already have this number to another user'
            );
        }

        let otp = '';
        if (process.env.SMS_TEST == 'YES') {
            otp = '12345';
        } else {
            otp = Math.floor(10000 + Math.random() * 90000);
        }

        // const { status, message } = await SmsSend({
        //     phoneNumbers: phoneNumber,
        //     message: `${otp} is Your OTP for Drop`,
        // });

        const formattedNumber = parsePhoneNumber(phoneNumber, countryShortName);

        if (!formattedNumber) {
            return errorResponse(res, 'Invalid phone number');
        }

        const { status, message, result } = await sendWhatsappOTP(
            formattedNumber.number,
            otp
        );

        if (!status) {
            return errorResponse(res, message);
        }

        let user = await UserModel.findOne({
            _id: userId,
        });

        user.loginOtpExpired = moment()
            .add(4, 'minutes')
            .format('YYYY-MM-DD HH:mm:ss');
        user.loginOtp = otp;
        user.phone_number = phoneNumber;
        user.countryShortName = countryShortName;
        await user.save();

        successResponse(res, {
            message: 'successfully send otp',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendOtp = async (req, res) => {
    try {
        const userId = req.userId;
        const { phoneNumber, countryShortName } = req.body;

        let alreadyExits = await UserModel.findOne({
            phone_number: phoneNumber,
            countryShortName: countryShortName,
            $nor: [{ _id: userId }],
        });

        if (alreadyExits) {
            return errorResponse(
                res,
                'already have this number to another user'
            );
        }

        let otp = '';

        if (process.env.SMS_TEST == 'YES') {
            otp = '12345';
        } else {
            otp = Math.floor(10000 + Math.random() * 90000);
        }

        // const { status, message } = await SmsSend({
        //     phoneNumbers: phoneNumber,
        //     message: `${otp} is Your OTP for Drop`,
        // });

        const formattedNumber = parsePhoneNumber(phoneNumber, countryShortName);

        if (!formattedNumber) {
            return errorResponse(res, 'Invalid phone number');
        }

        const { status, message, result } = await sendWhatsappOTP(
            formattedNumber.number,
            otp
        );

        if (!status) {
            return errorResponse(res, message);
        }

        let user = await UserModel.findOne({
            _id: userId,
        });

        user.loginOtpExpired = moment()
            .add(4, 'minutes')
            .format('YYYY-MM-DD HH:mm:ss');
        user.loginOtp = otp;
        user.phone_number = phoneNumber;
        user.countryShortName = countryShortName;
        await user.save();

        successResponse(res, {
            message: 'successfully send otp',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.changeNumber = async (req, res) => {
    try {
        const userId = req.userId;
        const { phoneNumber, countryShortName } = req.body;

        if (!phoneNumber) {
            return errorResponse(res, 'bad request');
        }

        let alreadyExits = await UserModel.findOne({
            phone_number: phoneNumber,
            countryShortName: countryShortName,
            deletedAt: null,
        });

        if (alreadyExits) {
            if (alreadyExits._id == userId) {
                return errorResponse(
                    res,
                    'Already add this number in your profile'
                );
            }
            return errorResponse(
                res,
                'Already have this number to another user'
            );
        }

        let otp = '';

        if (process.env.SMS_TEST == 'YES') {
            otp = '12345';
        } else {
            otp = Math.floor(10000 + Math.random() * 90000);
        }

        const formattedNumber = parsePhoneNumber(phoneNumber, countryShortName);

        if (!formattedNumber) {
            return errorResponse(res, 'Invalid phone number');
        }

        const { status, message, result } = await sendWhatsappOTP(
            formattedNumber.number,
            otp
        );

        if (!status) {
            return errorResponse(res, message);
        }

        let user = await UserModel.findOne({
            _id: userId,
        });

        user.loginOtpExpired = moment()
            .add(4, 'minutes')
            .format('YYYY-MM-DD HH:mm:ss');
        user.loginOtp = otp;
        await user.save();

        successResponse(res, {
            message: 'successfully send otp',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.verifyOtpForChangeNumber = async (req, res) => {
    try {
        const userId = req.userId;
        const { otp, phoneNumber, countryShortName } = req.body;

        if (!otp || !phoneNumber) {
            return errorResponse(res, 'bad Request');
        }

        const user = await UserModel.findOne({
            _id: userId,
            loginOtp: otp,
            loginOtpExpired: {
                $gt: new Date(),
            },
        });

        if (!user) {
            return errorResponse(res, 'Wrong Otp');
        }

        await UserModel.updateOne(
            { _id: userId },
            {
                phone_number: phoneNumber,
                countryShortName: countryShortName,
            }
        );

        successResponse(res, {
            message: 'OTP Verified & profile Successfully Updated',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.verifyOtpSocial = async (req, res) => {
    try {
        const userId = req.userId;
        const { otp } = req.body;

        if (!otp) {
            return errorResponse(res, 'bad Request');
        }

        const user = await UserModel.findOne({
            _id: userId,
            loginOtp: otp,
            loginOtpExpired: {
                $gt: new Date(),
            },
        });

        if (!user) {
            return errorResponse(res, 'Wrong Otp');
        }

        await UserModel.updateOne(
            { _id: userId },
            {
                phoneVerify: true,
            }
        );

        successResponse(res, {
            message: 'OTP Verify Successfully',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const userId = req.userId;
        const { otp } = req.body;

        if (!otp) {
            return errorResponse(res, 'bad Request');
        }

        const user = await UserModel.findOne({
            _id: userId,
            loginOtp: otp,
            loginOtpExpired: {
                $gt: new Date(),
            },
        });

        if (!user) {
            return errorResponse(res, 'Wrong Otp');
        }

        await UserModel.updateOne(
            { _id: userId },
            {
                phoneVerify: true,
            }
        );

        successResponse(res, {
            message: 'OTP Verify Successfully',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendOptViaEmail = async (req, res) => {
    try {
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.sendOtpForForgetPassword = async (req, res) => {
    try {
        const { phoneNumber, countryShortName } = req.body;

        let alreadyExits = await UserModel.findOne({
            phone_number: phoneNumber,
            countryShortName: countryShortName,
        });

        if (!alreadyExits) {
            return errorResponse(res, 'user not found');
        }

        let otp = '';

        if (process.env.SMS_TEST == 'YES') {
            otp = '12345';
        } else {
            otp = Math.floor(10000 + Math.random() * 90000);
        }

        const { status, message } = await SmsSend({
            phoneNumbers: phoneNumber,
            message: `${otp} is Your OTP for Drop`,
        });

        if (!status) {
            return errorResponse(res, message);
        }

        let user = await UserModel.findOne({
            phone_number: phoneNumber,
            countryShortName: countryShortName,
        });

        user.forgetOtpExpired = moment()
            .add(4, 'minutes')
            .format('YYYY-MM-DD HH:mm:ss');
        user.forgetOtp = otp;
        await user.save();

        successResponse(res, {
            message: 'successfully send otp',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.verifyOtpForForgetPassword = async (req, res) => {
    try {
        const { otp, phoneNumber, countryShortName } = req.body;

        if (!otp || !phoneNumber) {
            return errorResponse(res, 'bad Request');
        }

        const user = await UserModel.findOne({
            phone_number: phoneNumber,
            countryShortName: countryShortName,
            forgetOtp: otp,
            forgetOtpExpired: {
                $gt: new Date(),
            },
        });

        if (!user) {
            return errorResponse(res, 'Wrong Otp');
        }

        await UserModel.updateOne(
            { _id: user._id },
            {
                forgetVerify: true,
            }
        );

        successResponse(res, {
            message: 'OTP Verify Successfully',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.forgetPassword = async (req, res) => {
    try {
        const { password, phoneNumber } = req.body;

        if (!password) {
            return errorResponse('enter a password');
        }

        const user = await UserModel.findOne({
            phoneNumber: phoneNumber,
            forgetVerify: true,
        });

        if (!user) {
            return errorResponse(res, 'Not change password. Please try again!');
        }

        const pass = await bcrypt.hash(password, 10);

        await UserModel.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: pass,
                    forgetVerify: false,
                    forgetOtp: '',
                    forgetOtpExpired: '',
                },
            }
        );

        successResponse(res, {
            message: 'Successfully forget password',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.useSignInFromUserApp = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email or password is required');
        }

        email = email.toLowerCase();

        let user = await UserModel.findOne({
            email: email,
            deletedAt: null,
            account_type: 'user',
        }).select(
            '-createdAt -updatedAt -favoritesProducts -favoritesShops -address -shops'
        );

        if (!user) {
            return errorResponse(res, 'user not found . please sign up first');
        }

        if (user.registerType !== 'mail') {
            return errorResponse(
                res,
                `Your email ${user.email} is already used with ${user.registerType}`
            );
        }

        if (user.status === 'blocked') {
            return errorResponse(
                res,
                'Your account is blocked. Please contact Support'
            );
        }

        const matchPassword = bcrypt.compareSync(password, user.password);

        if (!matchPassword) {
            return errorResponse(res, 'Wrong password.');
        }

        const jwtData = {
            userId: user._id,
            name: user.name,
        };

        const token = jwt.sign(jwtData, process.env.JWT_PRIVATE_KEY_USER, {});

        successResponse(res, {
            message: 'Login Successfully',
            data: {
                token,
                needPhoneVerify: user.phoneVerify ? false : true,
                user: user,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await UserModel.findById(userId)
            .select(
                '-createdAt -updatedAt -password -shops -favoritesShops -favoritesProducts'
            )
            .populate('address subscription');

        const {
            availableBalance: balance,
            secondaryCurrency_availableBalance: secondaryCurrency_balance,
        } = await getUserBalance(userId);
        user.tempRewardPoints = await getUserRewardPoints(userId); // TODO: need to check
        successResponse(res, {
            message: 'user profile',
            data: {
                balance,
                secondaryCurrency_balance,
                user,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserOwnBalance = async (req, res) => {
    try {
        const userId = req.userId;
        let {
            availableBalance: balance,
            secondaryCurrency_availableBalance: secondaryCurrency_balance,
            pendingAmount,
            secondaryCurrency_pendingAmount,
        } = await getUserBalance(userId);

        const appSetting = await AppSetting.findOne({}).select(
            'adminExchangeRate'
        );
        const adminExchangeRate = appSetting?.adminExchangeRate || 0;

        if (adminExchangeRate > 0) {
            balance = secondaryCurrency_balance / adminExchangeRate;
        }

        successResponse(res, {
            message: 'success',
            data: {
                balance,
                secondaryCurrency_balance,
                pendingAmount,
                secondaryCurrency_pendingAmount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const id = req.userId;
        const {
            name,
            email,
            profile_photo,
            gender,
            dob,
            phone_number,
            countryShortName,
        } = req.body;

        let updatedData = {};

        if (name) {
            updatedData.name = name;
        }

        if (profile_photo) {
            updatedData.profile_photo = profile_photo;
        }
        if (profile_photo) {
            updatedData.profile_photo = profile_photo;
        }

        if (email) {
            const emailExits = await UserModel.findOne({
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

        if (gender) {
            updatedData.gender = gender;
        }

        if (dob) {
            updatedData.dob = new Date(dob);
        }

        if (phone_number) {
            const phoneNumberExits = await UserModel.findOne({
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

        if (countryShortName) {
            updatedData.countryShortName = countryShortName;
        }

        await UserModel.updateOne(
            { _id: id },
            {
                $set: {
                    ...updatedData,
                },
            }
        );

        const user = await UserModel.findById(id).select(
            '-createdAt -updatedAt -password'
        );

        successResponse(res, {
            message: 'user profile',
            data: {
                user,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.changeUserPassword = async (req, res) => {
    try {
        const id = req.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return errorResponse(
                res,
                'currentPassword and newPassword is required'
            );
        }

        const user = await UserModel.findById(id);

        if (!user) {
            return errorResponse(res, 'User not found.');
        }

        const matchPassword = bcrypt.compareSync(
            currentPassword,
            user.password
        );

        if (!matchPassword) {
            return errorResponse(res, 'Current password is wrong.');
        }

        const password = await bcrypt.hash(newPassword, 10);

        await UserModel.updateOne(
            { _id: id },
            {
                $set: {
                    password,
                },
            }
        );

        successResponse(res, {
            message: 'Successfully change password',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateUserFcmToken = async (req, res) => {
    try {
        const id = req.userId;
        const { fcmToken } = req.body;

        const user = await UserModel.findById(id);

        const isMatchFcmToken = user?.fcmToken?.includes(fcmToken);

        if (!isMatchFcmToken) {
            await UserModel.updateOne(
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
exports.removeUserFcmToken = async (req, res) => {
    try {
        const id = req.userId;
        const { fcmToken } = req.body;

        await UserModel.updateOne(
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
//Get single user

exports.getUserDetailsForAdmin = async (req, res) => {
    try {
        const userId = req.query.id;
        const user = await UserModel.findById(userId)
            .select('-shops')
            .populate([
                {
                    path: 'flags',
                    populate: 'user orderId shop delivery',
                },
                {
                    path: 'address',
                },
            ]);
        if (!user) {
            return errorResponse(res, 'user not found');
        }

        const { availableBalance, secondaryCurrency_availableBalance } =
            await getUserBalance(userId);

        const { usedCouponOrders, validCoupons, expiredCoupons } =
            await getCouponHistory(user._id);

        successResponse(res, {
            message: 'user profile',
            data: {
                user: {
                    ...user._doc,
                    tempBalance: availableBalance,
                    balance: availableBalance,
                    secondaryCurrency_balance:
                        secondaryCurrency_availableBalance,
                    usedCouponOrders,
                    validCoupons,
                    expiredCoupons,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAddress = async (req, res) => {
    try {
        const { id } = req.query;

        const userAddress = await AddressModel.findOne({ ownerId: id });

        if (!userAddress) return errorResponse(res, 'User address not found');

        successResponse(res, {
            message: 'Find address',
            data: {
                userAddress,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateUserAddress = async (req, res) => {
    try {
        const { id } = req.query;

        const user = await UserModel.findOne({ _id: id }).populate([
            {
                path: 'address',
            },
        ]);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                user,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.userPastOrder = async (req, res) => {
    try {
        const { userId } = req.query;

        const pastOrders = await OrderModel.find({
            users: { $in: userId },
            orderStatus: 'delivered',
        });

        if (pastOrders.length === 0)
            return errorResponse(res, 'There no past order found');

        successResponse(res, {
            message: 'Successfully get past orders',
            data: {
                pastOrders,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.searchForUserApp = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            highPrice,
            isFreeDelivery,
            isFastDelivery,
            deliveryCharge,
            isFeatured,
            type,
            foodType,
            longitude,
            latitude,
        } = req.query;

        const appSetting = await AppSetting.findOne({});
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let locationRange = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
        };

        var shopConfig = {
            deletedAt: null,
            shopStatus: 'active',
        };

        var productConfig = {
            deletedAt: null,
            status: 'active',
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const productSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));
            const shopSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
            }));
            shopConfig = {
                ...shopConfig,
                $and: [
                    {
                        $or: [{ $and: shopSearchQuery }],
                    },
                ],
            };
            productConfig = {
                ...productConfig,
                $and: [
                    {
                        $or: [{ $and: productSearchQuery }],
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
            productConfig = {
                type,
                ...productConfig,
            };
        }

        if (
            foodType &&
            ['meat', 'vegetable', 'fruit', 'other'].includes(foodType)
        ) {
            productConfig = {
                type,
                ...productConfig,
            };
        }

        // Price range filter ---

        if (highPrice) {
            productConfig = {
                ...productConfig,
                price: { $lt: highPrice },
            };
        }

        // filter for free delivery product

        if (isFreeDelivery) {
            productConfig = {
                ...productConfig,
                freeDelivery: true,
            };
        }

        // filter for fast delivery product

        if (isFastDelivery) {
            productConfig = {
                ...productConfig,
                isFastDelivery: true,
            };
        }

        // Delivery charge maximum filter

        if (deliveryCharge) {
            productConfig = {
                ...productConfig,
                deliveryCharge: { $lt: deliveryCharge },
            };
        }

        // Delivery charge maximum filter

        if (isFeatured) {
            productConfig = {
                ...productConfig,
                isFeatured: true,
            };
        }

        var shopPaginate = await pagination({
            page,
            pageSize,
            model: ShopModel,
            condition: shopConfig,
            pagingRange: 5,
        });

        var productPaginate = await pagination({
            page,
            pageSize,
            model: ProductModel,
            condition: productConfig,
            pagingRange: 5,
        });

        const shopList = await ShopModel.find(shopConfig)
            .sort({ createdAt: sortBy })
            .skip(shopPaginate.offset)
            .limit(shopPaginate.limit);

        const productList = await ProductModel.find(productConfig)
            .sort({ createdAt: sortBy })
            .skip(productPaginate.offset)
            .limit(productPaginate.limit);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                shops: {
                    shopList,
                    shopPaginate,
                },
                products: {
                    productList,
                    productPaginate,
                },
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.addBalanceByAdmin = async (req, res) => {
    try {
        const {
            userId,
            amount,
            secondaryCurrency_amount,
            paidCurrency,
            userNote,
            adminNote,
        } = req.body;
        const user = await UserModel.findById(userId);
        if (!user) return errorResponse(res, 'User not found');

        const appSetting = await AppSetting.findOne({}).select(
            'maxCustomerServiceValue'
        );
        const maxAmount = appSetting?.maxCustomerServiceValue
            ? appSetting.maxCustomerServiceValue
            : 0;

        if (amount > maxAmount) {
            return errorResponse(res, `Max limit ${maxAmount} USD`);
        }

        // const dropWallet = await getDropBalance();
        let { availableBalance: dropWallet } = await getAdminWalletBalance();

        if (dropWallet < amount) {
            return errorResponse(
                res,
                'Due to lower Lyxa wallet balance, credit cannot be added.'
            );
        }

        const transaction = await TransactionModel.create({
            user: userId,
            amount,
            secondaryCurrency_amount,
            userNote,
            adminNote,
            account: 'user',
            type: 'userBalanceAddAdmin',
            status: 'success',
            paidCurrency,
        });

        const {
            availableBalance: balance,
            secondaryCurrency_availableBalance: secondaryCurrency_balance,
        } = await getUserBalance(userId);

        await UserModel.updateOne(
            { _id: userId },
            {
                $inc: {
                    tempBalance: amount,
                },
            }
        );

        await sendNotificationsForAddRemoveCredit('add', transaction);

        successResponse(res, {
            message: 'Successfully added balance',
            data: {
                balance,
                secondaryCurrency_balance,
                transaction,
                dropWallet,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.withdrawBalanceByAdmin = async (req, res) => {
    try {
        const {
            userId,
            amount,
            secondaryCurrency_amount,
            paidCurrency,
            userNote,
            adminNote,
        } = req.body;
        const user = await UserModel.findById(userId);
        if (!user) return errorResponse(res, 'User not found');

        const appSetting = await AppSetting.findOne({}).select(
            'maxCustomerServiceValue'
        );
        const maxAmount = appSetting?.maxCustomerServiceValue
            ? appSetting.maxCustomerServiceValue
            : 0;

        if (amount > maxAmount) {
            return errorResponse(res, `max limit ${maxAmount} NGN`);
        }

        const transaction = await TransactionModel.create({
            user: userId,
            amount,
            secondaryCurrency_amount,
            userNote,
            adminNote,
            account: 'user',
            type: 'userBalanceWithdrawAdmin',
            status: 'success',
            paidCurrency,
        });

        const {
            availableBalance: balance,
            secondaryCurrency_availableBalance: secondaryCurrency_balance,
        } = await getUserBalance(userId);

        await UserModel.updateOne(
            { _id: userId },
            {
                $inc: {
                    tempBalance: -amount,
                },
            }
        );

        await sendNotificationsForAddRemoveCredit('remove', transaction);

        successResponse(res, {
            message: 'Successfully withdraw balance',
            data: {
                balance,
                secondaryCurrency_balance,
                transaction,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserBalanceForAdmin = async (req, res) => {
    try {
        const { userId } = req.query;

        // TransactionModel get total amount of user
        // const data = await TransactionModel.aggregate([
        //     {

        //         $match: {

        //         },

        //         $group:
        //         {
        //             _id: {},
        //             totalAmount: { $sum: { $multiply: ["$amount"] } },
        //             count: { $sum: 1 }
        //         }
        //     }
        // ])

        // [
        //     'userBalanceAddAdmin',
        //     'orderRefundFood',
        //     'orderRefundGrocery',
        //     'orderRefundPharmacy'
        // ],

        // const data = await TransactionModel.aggregate(
        //     [
        //         {
        //             "$match": {
        //                 "user": ObjectId(userId),
        //                 "type": {
        //                     $in: [
        //                         'userBalanceAddAdmin',
        //                         'orderRefundFood',
        //                         'orderRefundGrocery',
        //                         'orderRefundPharmacy'
        //                     ]
        //                 }
        //             }
        //         },
        //         {
        //             $group: {
        //                 _id: '',
        //                 count: { $sum: 1 },
        //                 balance: { $sum: { $sum: ['$amount'] } }
        //             }
        //         }
        //     ]
        // );

        const {
            availableBalance: balance,
            secondaryCurrency_availableBalance: secondaryCurrency_balance,
        } = await getUserBalance(userId);

        successResponse(res, {
            message: 'Successfully get user balance',
            data: {
                userId,
                balance,
                secondaryCurrency_balance,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserTransactions = async (req, res) => {
    try {
        const {
            userId,
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            startDate,
            endDate,
        } = req.query;

        const user = await UserModel.findById(userId);
        if (!user) return errorResponse(res, 'User not found');

        const startDateTime = moment(new Date(startDate))
            .startOf('day')
            .toDate();
        const endDateTime = moment(endDate ? new Date(endDate) : new Date())
            .endOf('day')
            .toDate();

        let config = {
            user: userId,
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime,
            },
        };

        const paginate = await pagination({
            page,
            pageSize,
            model: TransactionModel,
            condition: config,
            pagingRange: 5,
        });

        const transactionList = await TransactionModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully get user transactions',
            data: {
                transactionList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addCard = async (req, res) => {
    try {
        const userId = req.userId;

        let {
            nameOfCard,
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            defaultCard,
        } = req.body;

        if (!card_number) {
            return errorResponse(res, 'enter card_number number');
        }

        if (!cvv) {
            return errorResponse(res, 'enter cvv number');
        }

        if (!expiry_month || !expiry_year) {
            return errorResponse(res, 'enter expiry date');
        }

        // comment this condition if you want to add multiple card || admin confirm this
        // const alreadyExist = await CardModel.findOne({ card_number });
        // if (alreadyExist) {
        //     return errorResponse(res, 'card already exist');
        // }

        const user = await UserModel.findById(userId)
            .populate('cards')
            .select('name gender phone_number email cards');

        const cardExists = user.cards.some(
            card => card.card_number.toString() === card_number.toString()
        );

        if (cardExists) {
            return errorResponse(
                res,
                'This card is already exists in your list.'
            );
        }

        if (user.cards.length === 0) {
            defaultCard = true;
        }

        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;

        const cardType = creditCardType(card_number);

        const cardInformation = {
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency: currency || 'NGN',
            fullname: user.name,
            email: user.email,
            amount: 10,
            tx_ref,
            // redirect_url: null,
            enckey: ENCRYPTION_KEY,
        };

        const response = await flw.Charge.card(cardInformation);

        if (response.status == 'success') {
            const card = await CardModel.create({
                owner: userId,
                userType: 'user',
                card_number,
                cvv,
                expiry_month,
                expiry_year,
                expiryDateString: `${expiry_month}/${expiry_year}`,
                expiryDate: new Date(`${expiry_month}-01-${expiry_year}`),
                currency,
                defaultCard,
                nameOfCard,
                mode: response.meta.authorization.mode || null,
                cardType,
            });

            // update this card _id to user cards
            await UserModel.updateOne(
                { _id: userId },
                { $push: { cards: card._id } }
            );

            successResponse(res, {
                message: 'Successfully change password',
                data: {
                    card,
                },
            });
        } else {
            errorResponse(res, response.message);
        }
    } catch (error) {
        if (error.message == `"card_number" must be a credit card`) {
            return errorResponse(res, 'Card Number must be a credit card');
        }

        errorHandler(res, error);
    }
};

exports.updateCard = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            cardId,
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            defaultCard,
            nameOfCard,
        } = req.body;

        if (!card_number) {
            return errorResponse(res, 'enter card_number number');
        }

        if (!cvv) {
            return errorResponse(res, 'enter cvv number');
        }

        if (!expiry_month || !expiry_year) {
            return errorResponse(res, 'enter expiry date');
        }

        const card = await CardModel.findOne({ _id: cardId });

        if (!card) {
            return errorResponse(res, 'card not found');
        }

        if (card.owner == !userId) {
            return errorResponse(
                res,
                'you are try to update card that is not yours'
            );
        }

        await CardModel.updateOne(
            { _id: card._id },
            {
                $set: {
                    card_number,
                    cvv,
                    expiry_month,
                    expiry_year,
                    expiryDateString: `${expiry_month}/${expiry_year}`,
                    expiryDate: new Date(`${expiry_month}-01-${expiry_year}`),
                    currency,
                    defaultCard,
                    nameOfCard,
                },
            }
        );

        const updatedCard = await CardModel.findOne({ _id: cardId });

        successResponse(res, {
            message: 'Successfully change password',
            data: {
                card: updatedCard,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserCards = async (req, res) => {
    try {
        const userId = req.userId;

        const cards = await CardModel.find({ owner: userId });

        successResponse(res, {
            message: 'Successfully get user cards',
            data: {
                cards,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteCard = async (req, res) => {
    try {
        const userId = req.userId;
        const { cardId } = req.body;

        const count = await CardModel.count({ owner: userId });
        if (count <= 1) {
            return errorResponse(
                res,
                'you can not delete last card! at least one card is required'
            );
        }

        const card = await CardModel.findOne({ _id: cardId });

        if (!card) {
            return errorResponse(res, 'card not found');
        }

        if (card.owner == !userId) {
            return errorResponse(
                res,
                'you are try to delete card that is not yours'
            );
        }

        await CardModel.deleteOne({ _id: card._id });

        // pull from user cards
        await UserModel.updateOne(
            { _id: userId },
            { $pull: { cards: card._id } }
        );

        successResponse(res, {
            message: 'Successfully delete card',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.defaultCardSet = async (req, res) => {
    try {
        const userId = req.userId;

        const { cardId } = req.body;

        const card = await CardModel.findOne({ _id: cardId });

        if (!card) {
            return errorResponse(res, 'invalid card id');
        }

        await CardModel.updateMany(
            { owner: userId },
            { $set: { defaultCard: false } }
        );

        await CardModel.updateOne(
            { _id: cardId },
            { $set: { defaultCard: true } }
        );

        successResponse(res, {
            message: 'Successfully add card',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.forgetPasswordForUserApp = async (req, res) => {
    try {
        let { password, token } = req.body;

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Bad request',
            });
        }

        const { userEmail } = jwt.verify(
            token,
            process.env.JWT_PRIVATE_KEY_USER_FORGET
        );

        // console.log(userEmail);
        if (!userEmail) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token 0',
            });
        }

        const user = await UserModel.findOne({
            email: userEmail,
            forgetToken: token,
            forgetExpired: {
                $gt: new Date(),
            },
        });

        if (!user) {
            return errorResponse(res, 'Please forget your password again');
        }

        const pass = await bcrypt.hash(password, 10);

        await UserModel.updateOne(
            { _id: user._id },
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

exports.termsAndCondition = async (req, res) => {
    try {
        const setting = await AppSetting.find({});

        const termCondition = setting[0]?.userAppTearmsAndConditions;

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

exports.getSubscriptionTermsAndConditions = async (req, res) => {
    try {
        const setting = await AppSetting.findOne({});

        const termCondition = setting?.subscriptionTermsAndConditions || '';

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

exports.deleteAccountFromUserApp = async (req, res) => {
    try {
        const userId = req.userId;

        const findUser = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });

        if (!findUser) return errorResponse(res, 'User Not found');

        await UserModel.updateOne(
            { _id: userId },
            {
                deletedAt: new Date(),
            }
        );

        successResponse(res, {
            message: 'successfully deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

const generateReferralCode = async name => {
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    const trimmedName = name.trim().replace(/\s+/g, ' ').toUpperCase();
    const referralCode = `${trimmedName.substring(0, 3)}${trimmedName.substring(
        trimmedName.indexOf(' ') + 1,
        trimmedName.indexOf(' ') + 4
    )}${randomNumber}`;

    return (await checkReferralCode(referralCode))
        ? await generateReferralCode()
        : referralCode;
};

const checkReferralCode = async referralCode => {
    const checkCoupon = await CouponModel.findOne({
        couponName: referralCode,
        deletedAt: null,
    });

    if (checkCoupon) return true;

    return false;
};

//*** For getting user reviews***/
exports.getUserReviews = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            type, //'shop' || 'deliveryBoy'
            userId,
        } = req.query;

        const user = await UserModel.findById(userId);
        if (!user) {
            return errorResponse(res, 'User not found');
        }

        let dateConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            dateConfig = {
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        let config = {
            ...dateConfig,
            user: ObjectId(userId),
        };

        if (type && ['shop', 'deliveryBoy'].includes(type)) {
            config = {
                ...config,
                type: type,
            };
        }

        let reviews = await ReviewModel.find(config)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'deliveryBoy',
                    select: '-password',
                },
                {
                    path: 'order',
                    populate: [
                        {
                            path: 'shop',
                            select: '-password',
                        },
                    ],
                },
            ])
            .lean();

        if (searchKey) {
            reviews = reviews.filter(review => {
                const searchTerm = searchKey.toLowerCase();

                return (
                    review?.deliveryBoy?.name
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    review?.order?.shop?.shopName
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    review?.order?.orderId
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    review?.order?.autoGenId
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    review?.order?.note?.toLowerCase().includes(searchTerm)
                );
            });
        }
        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: reviews.length,
            pagingRange,
        });

        const list = reviews.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully get user reviews',
            data: {
                reviews: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** For getting user flags***/
exports.getUserFlags = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            startDate,
            endDate,
            sortBy = 'desc',
            userId,
            flaggedType, // cancelled || flagged
        } = req.query;

        let config = {
            type: 'user',
            user: userId,
        };

        if (startDate && endDate) {
            config = {
                ...config,
                createdAt: {
                    $gte: moment(new Date(startDate)).startOf('day'),
                    $lte: moment(new Date(endDate)).endOf('day'),
                },
            };
        }

        if (flaggedType === 'cancelled') {
            config = {
                ...config,
                flaggedType,
            };
        }

        if (flaggedType === 'flagged') {
            config = {
                ...config,
                flaggedType: {
                    $nin: ['cancelled'],
                },
            };
        }

        const userFlags = await FlagModel.find(config)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'orderId',
                    populate: 'shop seller deliveryBoy',
                },
                {
                    path: 'butlerId',
                    populate: 'deliveryBoy',
                },
            ]);

        let flags = [...userFlags];

        if (searchKey) {
            const searchTerm = searchKey.toLowerCase();
            flags = userFlags.filter(
                flag =>
                    flag.orderId?.orderId.toLowerCase().includes(searchTerm) ||
                    flag.butlerId?.orderId.toLowerCase().includes(searchTerm)
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
        errorHandler(res, error);
    }
};
