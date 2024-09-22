const UserModel = require('../models/UserModel');
const CouponModel = require('../models/CouponModel');
const OrderModel = require('../models/OrderModel');
const moment = require('moment');

// exports.checkCouponValidity = async coupon => {
exports.checkCouponValidity = async (coupon, user) => {
    const totalUsagePipeline = [
        {
            $match: {
                // orderStatus: { $nin: ['cancelled'] },
                orderStatus: 'delivered',
                coupon: coupon._id,
            },
        },
        {
            $group: {
                _id: null,
                couponTotalUsageOrders: { $sum: 1 },
                couponTotalUsageAmount: {
                    $sum: '$summary.baseCurrency_couponDiscountAmount',
                },
            },
        },
    ];

    const [couponUsageResult] = await OrderModel.aggregate(totalUsagePipeline);

    const couponTotalUsageOrders = couponUsageResult
        ? couponUsageResult.couponTotalUsageOrders
        : 0;
    const couponTotalUsageAmount = couponUsageResult
        ? couponUsageResult.couponTotalUsageAmount
        : 0;

    coupon._doc.couponTotalUsageOrders = couponTotalUsageOrders;
    coupon._doc.couponTotalUsageAmount = couponTotalUsageAmount;

    let isCouponValid = true;

    if (
        isCouponValid &&
        coupon.couponType === 'individual_user' &&
        coupon?.couponUserLimit > 0
    ) {
        if (coupon?.couponUserLimit <= couponTotalUsageOrders) {
            isCouponValid = false;

            if (!coupon?.couponExpiredReason) {
                await CouponModel.findByIdAndUpdate(coupon._id, {
                    $set: {
                        couponExpiredReason: 'couponUserLimit',
                    },
                });
                coupon._doc.couponExpiredReason = 'couponUserLimit';
            }
        }
    }

    if (isCouponValid && coupon?.couponOrderLimit > 0) {
        if (coupon?.couponOrderLimit <= couponTotalUsageOrders) {
            isCouponValid = false;

            if (!coupon?.couponExpiredReason) {
                await CouponModel.findByIdAndUpdate(coupon._id, {
                    $set: {
                        couponExpiredReason: 'couponOrderLimit',
                    },
                });
                coupon._doc.couponExpiredReason = 'couponOrderLimit';
            }
        }
    }

    if (isCouponValid && coupon?.couponAmountLimit > 0) {
        if (coupon?.couponAmountLimit <= couponTotalUsageAmount) {
            isCouponValid = false;

            if (!coupon?.couponExpiredReason) {
                await CouponModel.findByIdAndUpdate(coupon._id, {
                    $set: {
                        couponExpiredReason: 'couponAmountLimit',
                    },
                });
                coupon._doc.couponExpiredReason = 'couponAmountLimit';
            }
        }
    }

    // const currentDate = new Date();
    // currentDate.setHours(0, 0, 0, 0); // Get the current date
    const currentDate = moment();
    if (
        isCouponValid &&
        coupon?.couponDuration?.start &&
        coupon?.couponDuration?.end
    ) {
        // const startDate = new Date(coupon?.couponDuration?.start); // Set the start date
        // startDate.setHours(0, 0, 0, 0);
        // const endDate = new Date(coupon?.couponDuration?.end);
        // endDate.setHours(0, 0, 0, 0);

        const endDate = moment(new Date(coupon?.couponDuration?.end));

        if (currentDate > endDate) {
            isCouponValid = false;

            if (!coupon?.couponExpiredReason) {
                await CouponModel.findByIdAndUpdate(coupon._id, {
                    $set: {
                        couponExpiredReason: 'couponDuration',
                    },
                });
                coupon._doc.couponExpiredReason = 'couponDuration';
            }
        }
    }

    
    if (user) {
        let isUserFirstRegisteredUsingThisDevice = true;
        const usersListRegisteredUsingThisDevice = await UserModel.find({
            userRegisterDeviceId: user.userRegisterDeviceId,
            phoneVerify: true,
        }).sort({
            createdAt: 1,
        });

        if (
            usersListRegisteredUsingThisDevice.length &&
            usersListRegisteredUsingThisDevice[0]._id.toString() !==
                user._id.toString()
        )
            isUserFirstRegisteredUsingThisDevice = false;

        if (isUserFirstRegisteredUsingThisDevice === false)
            isCouponValid = false;
    }
    
    coupon._doc.isCouponValid = isCouponValid;

    return isCouponValid;
};
