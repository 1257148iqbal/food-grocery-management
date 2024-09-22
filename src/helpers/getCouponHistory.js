const AppSetting = require('../models/AppSetting');
const OrderModel = require('../models/OrderModel');
const ReferralSettingModel = require('../models/ReferralSettingModel');
const UserModel = require('../models/UserModel');
const moment = require('moment');
const { calculateSecondaryPrice } =require('./utils')

exports.getCouponHistory = async userId => {
    let appSetting = await AppSetting.findOne({}).select('adminExchangeRate');
    adminExchangeRate = appSetting?.adminExchangeRate ?? 0;
    const usedCouponOrders = await OrderModel.find({
        user: userId,
        orderStatus: { $nin: ['cancelled', 'refused'] },
        coupon: { $exists: true },
    })
        .sort({ createdAt: 'desc' })
        .populate([
            {
                path: 'user',
                select: 'name gender phone_number email status dob account_type',
            },
            {
                path: 'users',
                select: 'name gender phone_number email status dob account_type',
            },
            {
                path: 'deliveryBoy',
            },
            {
                path: 'shop',
                select: '-products',
            },
            {
                path: 'seller',
            },
            {
                path: 'transactions',
            },
            {
                path: 'transactionsDrop',
            },
            {
                path: 'transactionsStore',
            },
            {
                path: 'deliveryAddress',
            },
            {
                path: 'transactionHistory',
            },
            {
                path: 'orderDeliveryCharge',
            },
            {
                path: 'orderCancel',
                populate: 'cancelReason',
            },
            {
                path: 'coupon',
                populate: [
                    {
                        path: 'couponInfluencer',
                    },
                    {
                        path: 'couponReferralUser',
                    },
                    {
                        path: 'couponUsers',
                    },
                    {
                        path: 'couponShops',
                    },
                ],
            },
        ]);

    const usedCoupons = usedCouponOrders.map(order =>
        order.coupon._id.toString()
    );
    const user = await UserModel.findById(userId).populate([
        {
            path: 'coupons',
            populate: [
                {
                    path: 'couponInfluencer',
                },
                {
                    path: 'couponReferralUser',
                },
                {
                    path: 'couponUsers',
                },
                {
                    path: 'couponShops',
                },
            ],
        },
    ]);
    const validCoupons = [];
    const expiredCoupons = [];

    let sameDeviceUsersId = [user?._id?.toString()];
    if (user?.userRegisterDeviceId) {
        const sameDeviceUsers = await UserModel.find({
            userRegisterDeviceId: user.userRegisterDeviceId,
        });
        sameDeviceUsersId = sameDeviceUsers.map(user => user._id.toString());
    }

    for (const coupon of user?.coupons || []) {


      
        let checkCoupon = true;
        if (checkCoupon && coupon?.deletedAt) {
            checkCoupon = false;
        }

        if (checkCoupon && coupon?.couponStatus === 'inactive') {
            checkCoupon = false;
        }

        if (
            checkCoupon &&
            coupon?.couponType === 'global' &&
            coupon?.onlyForNewUser
        ) {
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
            ) {
                isUserFirstRegisteredUsingThisDevice = false;
            }

            if (isUserFirstRegisteredUsingThisDevice === false)
                checkCoupon = false;

            const couponIds = usedCoupons;
            let couponIdCount = 0;
            couponIds.forEach(id => {
                if (id === coupon?._id.toString()) couponIdCount++;
            });

            if (couponIds.length > couponIdCount) checkCoupon = false;
            if (couponIdCount >= coupon?.maxNumberOfOrdersForNewUsers)
                checkCoupon = false;
        }
           coupon._doc.secondaryCouponValue = calculateSecondaryPrice(coupon?.couponValue,adminExchangeRate)
           coupon._doc.secondaryCouponMinimumOrderValue = calculateSecondaryPrice(coupon?.couponMinimumOrderValue,adminExchangeRate)
           coupon._doc.secondaryCouponMaximumDiscountLimit = calculateSecondaryPrice(coupon?.couponMaximumDiscountLimit,adminExchangeRate)
        // const currentDate = new Date();
        // currentDate.setHours(0, 0, 0, 0); // Get the current date
        const currentDate = moment();

        if (
            checkCoupon &&
            coupon?.couponDuration?.start &&
            coupon?.couponDuration?.end
        ) {
            // const startDate = new Date(coupon?.couponDuration?.start); // Set the start date
            // startDate.setHours(0, 0, 0, 0);
            // const endDate = new Date(coupon?.couponDuration?.end);
            // endDate.setHours(0, 0, 0, 0);
            const startDate = moment(new Date(coupon?.couponDuration?.start));
            const endDate = moment(new Date(coupon?.couponDuration?.end));

            if (currentDate < startDate || currentDate > endDate) {
                checkCoupon = false;
            }
        }

        if (checkCoupon && coupon?.couponUserLimit > 0) {
            const userOrdersUsingThisCoupon = await OrderModel.countDocuments({
                orderStatus: { $nin: ['cancelled'] },
                // orderStatus: 'delivered',
                coupon: coupon._id,
                user: { $in: sameDeviceUsersId },
            });
            if (coupon?.couponUserLimit <= userOrdersUsingThisCoupon) {
                checkCoupon = false;
            }
        }
        if (checkCoupon && coupon?.couponOrderLimit > 0) {
            const totalOrders = await OrderModel.countDocuments({
                orderStatus: { $nin: ['cancelled'] },
                // orderStatus: 'delivered',
                coupon: coupon._id,
            });

            if (coupon?.couponOrderLimit <= totalOrders) {
                checkCoupon = false;
            }
        }
        if (checkCoupon && coupon?.couponAmountLimit > 0) {
            const totalUsagePipeline = [
                {
                    $match: {
                        orderStatus: { $nin: ['cancelled'] },
                        // orderStatus: 'delivered',
                        coupon: coupon._id,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalUsage: {
                            $sum: '$summary.baseCurrency_couponDiscountAmount',
                        },
                    },
                },
            ];

            const [totalUsageResult] = await OrderModel.aggregate(
                totalUsagePipeline
            );

            const totalUsage = totalUsageResult
                ? totalUsageResult.totalUsage
                : 0;

            if (coupon?.couponAmountLimit <= totalUsage) {
                checkCoupon = false;
            }
        }
        if (
            checkCoupon &&
            (['referral_code'].includes(coupon?.couponType) ||
                (coupon?.couponType === 'global' && coupon?.onlyForNewUser))
        ) {
            const totalUserOrders = await OrderModel.countDocuments({
                orderStatus: { $nin: ['cancelled'] },
                // orderStatus: 'delivered',
                user: { $in: sameDeviceUsersId },
            });
            // Need to change here for sameDevice using new user coupon on multiple accounts.
            // console.log(`totalUserOrders__`, totalUserOrders, sameDeviceUsersId);
            if (
                ['referral_code'].includes(coupon?.couponType) &&
                totalUserOrders > 0
            ) {
                checkCoupon = false;
            }
        }

        const couponUsersList = coupon?.couponUsers?.map(user =>
            user._id.toString()
        );

        // Need to work____ Skip this part
        // if (
        //     checkCoupon &&
        //     coupon?.couponUsers?.length &&
        //     !couponUsersList.includes(userId.toString())
        // ) {
        //     console.log('User already used this coupon____');
        //     checkCoupon = false;
        // }

        if (checkCoupon && ['referral_code'].includes(coupon?.couponType)) {
            const referralSetting = await ReferralSettingModel.findOne({});
            const duration = referralSetting?.receiver_referralDuration || 30;

            // const startDate = new Date(user.createdAt); // Set the start date
            // startDate.setHours(0, 0, 0, 0);
            // const endDate = new Date(user.createdAt);
            // endDate.setHours(0, 0, 0, 0);
            // const updatedEndDate = new Date(
            //     endDate.setDate(endDate.getDate() + duration)
            // );
            const startDate = moment(new Date(user.createdAt));
            const endDate = moment(new Date(user.createdAt)).add(
                duration,
                'days'
            );

            const couponDuration = {
                start: startDate.toDate(),
                end: endDate.toDate(),
            };
            coupon._doc.couponDuration = couponDuration;

          

            if (currentDate < startDate || currentDate >= endDate) {
                checkCoupon = false;
            }
        }

        if (checkCoupon) {
            validCoupons.push(coupon);
        } else {
            if (!usedCoupons.includes(coupon._id.toString())) {
                expiredCoupons.push(coupon);
            }
        }
    }

    const findReferralCoupon = usedCouponOrders.find(
        order => order.coupon.couponType === 'referral_code'
    );
    if (findReferralCoupon) {
        const referralSetting = await ReferralSettingModel.findOne({});
        const duration = referralSetting?.receiver_referralDuration || 30;

        const startDate = moment(new Date(user.createdAt));
        const endDate = moment(new Date(user.createdAt)).add(duration, 'days');

        const couponDuration = {
            start: startDate.toDate(),
            end: endDate.toDate(),
        };
        findReferralCoupon._doc.couponDuration = couponDuration;
    }

    return { usedCouponOrders, validCoupons, expiredCoupons };
};
