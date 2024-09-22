const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const { checkCouponValidity } = require('../helpers/checkCouponValidity');
const { paginationMultipleModel } = require('../helpers/pagination');
const AppSetting = require('../models/AppSetting');
const CouponModel = require('../models/CouponModel');
const OrderModel = require('../models/OrderModel');
const ReferralSettingModel = require('../models/ReferralSettingModel');
const { addAdminLogAboutActivity } = require('./AdminController');
const moment = require('moment');

exports.getReferralSetting = async (req, res) => {
    try {
        const referralSetting = await ReferralSettingModel.findOne({});

        if (!referralSetting) {
            return errorResponse(res, 'Referral Setting not found');
        }

        //*** Apply exchange rate ***/
        // const appSetting = await AppSetting.findOne();
        // const adminExchangeRate = appSetting?.adminExchangeRate || 0;

        // if (adminExchangeRate !== 0) {
        //     if (referralSetting?.sender_referralDiscountType === 'fixed') {
        //         referralSetting._doc.secondarySender_referralDiscount =
        //             referralSetting?.sender_referralDiscount *
        //             adminExchangeRate;
        //     }
        //     referralSetting._doc.secondarySender_referralMinimumOrderValue =
        //         referralSetting?.sender_referralMinimumOrderValue *
        //         adminExchangeRate;
        //     if (referralSetting?.receiver_referralDiscountType === 'fixed') {
        //         referralSetting._doc.secondaryReceiver_referralDiscount =
        //             referralSetting?.receiver_referralDiscount *
        //             adminExchangeRate;
        //     }
        //     referralSetting._doc.secondaryReceiver_referralMinimumOrderValue =
        //         referralSetting?.receiver_referralMinimumOrderValue *
        //         adminExchangeRate;
        // }

        successResponse(res, {
            message: 'success',
            data: {
                referralSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getReferralHistory = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
        } = req.query;

        let config = {
            orderStatus: 'delivered',
            referFriend: { $exists: true },
        };

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            config = {
                ...config,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        let orders = await OrderModel.find(config)
            .sort({ createdAt: sortBy })
            .lean();

        if (searchKey) {
            orders = orders.filter(order => {
                const searchTerm = searchKey.toLowerCase();

                return (
                    order?.referFriend?.senderName
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    order?.referFriend?.receiverName
                        ?.toLowerCase()
                        .includes(searchTerm)
                );
            });
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: orders.length,
            pagingRange,
        });

        const list = orders.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // Calc total amount spent
        const totalAmountSpent = orders.reduce(
            (acc, curr) => acc + curr.summary.baseCurrency_couponDiscountAmount,
            0
        );

        // Calc customer increase
        const timeDiff =
            new Date(endDate).getTime() - new Date(startDate).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(startDate);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const ordersLastDays = await OrderModel.count({
            orderStatus: 'delivered',
            referFriend: { $exists: true },
            createdAt: {
                $gt: moment(new Date(oldStartDate)),
                $lt: moment(endDate ? new Date(oldEndDate) : new Date()).add(
                    1,
                    'days'
                ),
            },
        });

        const allCustomers = await OrderModel.distinct('user', {
            orderStatus: 'delivered',
        });
        const totalCustomers = allCustomers.length;

        const customerIncrease =
            parseFloat(((orders.length / totalCustomers) * 100).toFixed(2)) ||
            0;
        const customerIncreaseLastDays =
            parseFloat(((ordersLastDays / totalCustomers) * 100).toFixed(2)) ||
            0;
        const diffCustomerIncrease =
            customerIncrease - customerIncreaseLastDays;

        // Calc conversion rate
        const totalOrdersUsingReferral = await OrderModel.count({
            orderStatus: 'delivered',
            referFriend: { $exists: true },
        });
        const conversionRate =
            parseFloat(
                ((totalOrdersUsingReferral / totalCustomers) * 100).toFixed(2)
            ) || 0;

        successResponse(res, {
            message: 'success',
            data: {
                list,
                paginate,
                summery: {
                    totalAmountSpent,
                    customerIncrease,
                    diffCustomerIncrease,
                    conversionRate,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editReferralSetting = async (req, res) => {
    try {
        const id = req.adminId;
        const {
            sender_referralDiscountType,
            sender_referralDiscount,
            sender_referralMinimumOrderValue,
            sender_referralDuration,
            receiver_referralDiscountType,
            receiver_referralDiscount,
            receiver_referralMinimumOrderValue,
            receiver_referralDuration,
            type = [],
        } = req.body;

        let referralSetting = await ReferralSettingModel.findOne({});

        if (referralSetting == null) {
            referralSetting = new ReferralSettingModel({});
        }

        if (
            sender_referralDiscountType &&
            type.includes('sender_referralDiscountType')
        ) {
            let oldSender_referralDiscountType =
                referralSetting.sender_referralDiscountType || '';

            // addAdminLogAboutActivity(
            //     'sender_referralDiscountType',
            //     id,
            //     sender_referralDiscountType,
            //     oldSender_referralDiscountType
            // );

            referralSetting.sender_referralDiscountType =
                sender_referralDiscountType;
        }
        if (
            sender_referralDiscount &&
            type.includes('sender_referralDiscount')
        ) {
            let oldSender_referralDiscount =
                referralSetting.sender_referralDiscount || 0;

            // addAdminLogAboutActivity(
            //     'sender_referralDiscount',
            //     id,
            //     sender_referralDiscount,
            //     oldSender_referralDiscount
            // );

            referralSetting.sender_referralDiscount = sender_referralDiscount;
        }
        if (
            sender_referralMinimumOrderValue &&
            type.includes('sender_referralMinimumOrderValue')
        ) {
            let oldSender_referralMinimumOrderValue =
                referralSetting.sender_referralMinimumOrderValue || 0;

            // addAdminLogAboutActivity(
            //     'sender_referralMinimumOrderValue',
            //     id,
            //     sender_referralMinimumOrderValue,
            //     oldSender_referralMinimumOrderValue
            // );

            referralSetting.sender_referralMinimumOrderValue =
                sender_referralMinimumOrderValue;
        }
        if (
            sender_referralDuration &&
            type.includes('sender_referralDuration')
        ) {
            let oldSender_referralDuration =
                referralSetting.sender_referralDuration || 0;

            // addAdminLogAboutActivity(
            //     'sender_referralDuration',
            //     id,
            //     sender_referralDuration,
            //     oldSender_referralDuration
            // );

            referralSetting.sender_referralDuration = sender_referralDuration;
        }
        if (
            receiver_referralDiscountType &&
            type.includes('receiver_referralDiscountType')
        ) {
            let oldReceiver_referralDiscountType =
                referralSetting.receiver_referralDiscountType || '';

            // addAdminLogAboutActivity(
            //     'receiver_referralDiscountType',
            //     id,
            //     receiver_referralDiscountType,
            //     oldReceiver_referralDiscountType
            // );

            referralSetting.receiver_referralDiscountType =
                receiver_referralDiscountType;

            await CouponModel.updateMany(
                { couponType: 'referral_code' },
                { couponDiscountType: receiver_referralDiscountType }
            );
        }
        if (
            receiver_referralDiscount &&
            type.includes('receiver_referralDiscount')
        ) {
            let oldReceiver_referralDiscount =
                referralSetting.receiver_referralDiscount || 0;

            // addAdminLogAboutActivity(
            //     'receiver_referralDiscount',
            //     id,
            //     receiver_referralDiscount,
            //     oldReceiver_referralDiscount
            // );

            referralSetting.receiver_referralDiscount =
                receiver_referralDiscount;

            await CouponModel.updateMany(
                { couponType: 'referral_code' },
                { couponValue: receiver_referralDiscount }
            );
        }
        if (
            receiver_referralMinimumOrderValue &&
            type.includes('receiver_referralMinimumOrderValue')
        ) {
            let oldReceiver_referralMinimumOrderValue =
                referralSetting.receiver_referralMinimumOrderValue || 0;

            // addAdminLogAboutActivity(
            //     'receiver_referralMinimumOrderValue',
            //     id,
            //     receiver_referralMinimumOrderValue,
            //     oldReceiver_referralMinimumOrderValue
            // );

            referralSetting.receiver_referralMinimumOrderValue =
                receiver_referralMinimumOrderValue;

            await CouponModel.updateMany(
                { couponType: 'referral_code' },
                { couponMinimumOrderValue: receiver_referralMinimumOrderValue }
            );
        }
        if (
            receiver_referralDuration &&
            type.includes('receiver_referralDuration')
        ) {
            let oldReceiver_referralDuration =
                referralSetting.receiver_referralDuration || 0;

            // addAdminLogAboutActivity(
            //     'receiver_referralDuration',
            //     id,
            //     receiver_referralDuration,
            //     oldReceiver_referralDuration
            // );

            referralSetting.receiver_referralDuration =
                receiver_referralDuration;
        }

        referralSetting = await referralSetting.save();

        successResponse(res, {
            message: 'update successfully',
            data: {
                referralSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getReferralCodeForUserApp = async (req, res) => {
    try {
        const userId = req.userId;

        const customCoupons = await CouponModel.find({
            couponInfluencer: userId,
            couponType: 'custom_coupon',
            couponStatus: 'active',
            couponExpiredReason: { $exists: false },
            deletedAt: null,
        }).populate('couponShops couponInfluencer');

        let customCoupon = null;
        for (const coupon of customCoupons) {
            const isValidCoupons = await checkCouponValidity(coupon);

            if (isValidCoupons) {
                customCoupon = coupon;
                break;
            }
        }

        const referralCode = await CouponModel.findOne({
            couponReferralUser: userId,
            couponType: 'referral_code',
            couponStatus: 'active',
            deletedAt: null,
        });

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                customCoupon,
                referralCode,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.redirectInviteFriendScreen = async (req, res) => {
    try {
        const { referralCode } = req.query;

        return res.render('referral', { referralCode });
    } catch (error) {
        errorHandler(res, error);
    }
};
