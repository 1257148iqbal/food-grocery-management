const { getUserBalance } = require('../helpers/BalanceQuery');
const {
    errorHandler,
    successResponse,
    errorResponse,
    scriptResponse,
} = require('../helpers/apiResponse');
const AppSetting = require('../models/AppSetting');
const ButlerModel = require('../models/ButlerModel');
const CardModel = require('../models/CardModel');
const FlutterTransaction = require('../models/FlutterTransaction');
const OrderCancelReason = require('../models/OrderCancelReason');
const OrderModel = require('../models/OrderModel');
const SubscriptionModel = require('../models/SubscriptionModel');
const TransactionModel = require('../models/TransactionModel');
const UserModel = require('../models/UserModel');
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(PUBLIC_KEY, SECRET_KEY);
const moment = require('moment');
const short = require('short-uuid');
const { getSubscriptionSpent } = require('./FinancialController');
const ProductModel = require('../models/ProductModel');
const ShopModel = require('../models/ShopModel');
const {
    paginationMultipleModel,
    pagination,
} = require('../helpers/pagination');
const SubscriptionRequestModel = require('../models/SubscriptionRequestModel');
const AreebaCardModel = require('../models/AreebaCardModel');
const { areebaPaymentGateway } = require('../lib/areebaPaymentGateway');
const { shopCommonSorting } = require('../helpers/shopCommonSorting');
const ObjectId = require('mongoose').Types.ObjectId;

exports.enrollSubscription = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            subscriptionPackage,
            baseCurrency_subscriptionFee,
            summary,
            paymentMethod,
        } = req.body;

        if (
            !subscriptionPackage ||
            !baseCurrency_subscriptionFee ||
            !paymentMethod
        ) {
            return errorResponse(
                res,
                'subscriptionPackage, subscriptionFee and paymentMethod are required'
            );
        }

        if (!['monthly', 'yearly'].includes(subscriptionPackage)) {
            return errorResponse(
                res,
                'Subscription Package can be monthly or yearly'
            );
        }

        const userInfo = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });
        if (userInfo?.status !== 'active')
            return errorResponse(
                res,
                `Your account is ${userInfo?.status}. Please contact support.`
            );

        const checkUserSubscription = await SubscriptionModel.findOne({
            user: userId,
            subscriptionStatus: 'ongoing',
        });

        if (checkUserSubscription) {
            return errorResponse(res, 'User already have a subscription.');
        }

        if (summary.secondaryCurrency_wallet) {
            const { secondaryCurrency_availableBalance } = await getUserBalance(
                userId
            );

            if (
                secondaryCurrency_availableBalance <
                summary.secondaryCurrency_wallet
            ) {
                return errorResponse(res, 'Insufficient wallet balance');
            }
        }

        const subscription = await enrollSubscriptionFunc(req);

        successResponse(res, {
            message: 'Subscription enrolled successfully',
            data: {
                subscription,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.paymentGenerate = async (req, res) => {
    try {
        const userId = req.userId;
        let {
            cardId,
            pin,
            amount,
            subscriptionPackage,
            baseCurrency_subscriptionFee,
            summary,
            paymentMethod,
        } = req.body;

        if (
            !subscriptionPackage ||
            !baseCurrency_subscriptionFee ||
            !paymentMethod
        ) {
            return errorResponse(
                res,
                'subscriptionPackage, subscriptionFee and paymentMethod are required'
            );
        }

        if (!['monthly', 'yearly'].includes(subscriptionPackage)) {
            return errorResponse(
                res,
                'Subscription Package can be monthly or yearly'
            );
        }

        const checkUserSubscription = await SubscriptionModel.findOne({
            user: userId,
            subscriptionStatus: 'ongoing',
        });

        if (checkUserSubscription) {
            return errorResponse(res, 'User already have a subscription.');
        }

        if (summary.secondaryCurrency_wallet) {
            const { secondaryCurrency_availableBalance } = await getUserBalance(
                userId
            );

            if (
                secondaryCurrency_availableBalance <
                summary.secondaryCurrency_wallet
            ) {
                return errorResponse(res, 'Insufficient wallet balance');
            }
        }

        if (!cardId) {
            return res.json({
                status: false,
                message: 'Please fill all fields',
            });
        }

        if (!ObjectId.isValid(cardId)) {
            return errorResponse(res, 'cardId is invalid');
        }

        const user = await UserModel.findById(userId).select(
            'name gender phone_number email status'
        );

        if (!user) return errorResponse(res, `User not found.`);

        if (user?.status !== 'active')
            return errorResponse(
                res,
                `Your account is ${user?.status}. Please contact support.`
            );

        const card = await CardModel.findOne({ _id: cardId });

        // check pin have or not in cardModel
        if (card.pins?.length.length > 0 && !pin) {
            // get last pin
            pin = card.pins[card.pins.length - 1];
        }

        if (card.pins.length.length <= 0 && !pin) {
            return res.json({
                status: false,
                message: 'Please enter a pin',
                error_type: 'empty_pin',
            });
        }

        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;

        const cardInformation = {
            card_number: card.card_number,
            cvv: card.cvv,
            expiry_month: card.expiry_month,
            expiry_year: card.expiry_year,
            currency: card.currency || 'NGN',
            amount,
            fullname: user.name,
            email: user.email,
            phone_number: user.phone_number,
            tx_ref,
            // redirect_url: null,
            enckey: ENCRYPTION_KEY,
        };

        if (card.mode === 'pin') {
            let payload2 = cardInformation;
            payload2.authorization = {
                mode: 'pin',
                // fields: ['pin'],
                pin: pin,
            };

            const reCallCharge = await flw.Charge.card(payload2);

            if (reCallCharge.status === 'error') {
                if (reCallCharge.message.includes('Invalid PIN')) {
                    return res.json({
                        status: false,
                        message: reCallCharge.message,
                        error_type: 'invalid_pin',
                    });
                }

                return res.json({
                    status: false,
                    message: reCallCharge.message,
                });
            }

            // check pin have in card.pins in mongoose
            if (card.pins.length.length > 0) {
                if (card.pins[card.pins.length - 1] !== pin) {
                    await CardModel.updateOne(
                        { _id: cardId },
                        { $push: { pins: pin } }
                    );
                }
            } else {
                // update CardModel in pin add
                await CardModel.updateOne(
                    { _id: cardId },
                    { $push: { pins: pin } }
                );
            }

            const flutterTransaction = await FlutterTransaction.create({
                user: userId,
                flutterWave: reCallCharge,
                cardInfo: {
                    cardId,
                    card_number: card.card_number,
                    cvv: card.cvv,
                    expiry_month: card.expiry_month,
                    expiry_year: card.expiry_year,
                    currency: cardInformation.currency,
                    amount: cardInformation.amount,
                    validationType: card.mode,
                    pin,
                    tx_ref,
                },
                type: 'order',
            });

            return res.json({
                status: reCallCharge.status == 'success' ? true : false,
                message:
                    reCallCharge.status == 'success'
                        ? 'payment generate'
                        : reCallCharge.message,
                data: {
                    flw: reCallCharge,
                    flutter: flutterTransaction,
                },
                error_type:
                    reCallCharge.status == 'success'
                        ? null
                        : reCallCharge.message,
            });
        } else {
            return res.json({
                status: false,
                message: 'security type not others. contact to support',
            });
        }
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.userPayWithCard = async (req, res) => {
    try {
        const { card } = req.body;
        const { token, token_id, otp } = card;

        if (!otp) {
            return res.json({
                status: false,
                message: 'please enter your otp',
                error_type: 'otp_empty',
            });
        }

        const flutterTransaction = await FlutterTransaction.findOne({
            _id: token_id,
            token: token,
        });

        if (!flutterTransaction) {
            return res.json({
                status: false,
                message: 'Transaction not found',
            });
        }

        const flw_ref = flutterTransaction.flutterWave.data.flw_ref;

        const callValidate = await flw.Charge.validate({
            otp: otp,
            flw_ref: flw_ref,
        });

        if (callValidate.status === 'success') {
            flutterTransaction.status = 'success';
            await flutterTransaction.save();

            // set balance to user

            const amount = flutterTransaction.flutterWave.data.amount;

            const cardTypeString = callValidate.data.card.issuer;

            await CardModel.updateOne(
                { _id: flutterTransaction.cardInfo.cardId },
                {
                    $set: {
                        cardTypeString: cardTypeString,
                    },
                }
            );

            const subscription = await enrollSubscriptionFunc(
                req,
                flutterTransaction.cardInfo.cardId,
                cardTypeString
            );

            successResponse(res, {
                message: 'Subscription enrolled successfully',
                data: {
                    subscription,
                },
            });
        } else {
            return res.json({
                status: false,
                message: callValidate.message,
                error: callValidate.message,
                data: {
                    flw: callValidate,
                },
            });
        }
    } catch (error) {
        errorHandler(res, error);
    }
};

const enrollSubscriptionFunc = async (req, cardId, cardTypeString) => {
    try {
        const userId = req.userId;

        const {
            subscriptionPackage,
            baseCurrency_subscriptionFee,
            secondaryCurrency_subscriptionFee,
            summary,
            paymentMethod,
        } = req.body;

        if (
            !subscriptionPackage ||
            !baseCurrency_subscriptionFee ||
            !paymentMethod
        ) {
            return errorResponse(
                res,
                'subscriptionPackage, subscriptionFee and paymentMethod are required'
            );
        }

        if (!['monthly', 'yearly'].includes(subscriptionPackage)) {
            return errorResponse(
                res,
                'Subscription Package can be monthly or yearly'
            );
        }

        const userInfo = await UserModel.findOne({
            _id: userId,
            deletedAt: null,
        });
        if (userInfo?.status !== 'active')
            return errorResponse(
                res,
                `Your account is ${userInfo?.status}. Please contact support.`
            );

        const checkUserSubscription = await SubscriptionModel.findOne({
            user: userId,
            subscriptionStatus: 'ongoing',
        });

        if (checkUserSubscription) {
            return errorResponse(res, 'User already have a subscription.');
        }

        if (summary.secondaryCurrency_wallet) {
            const { secondaryCurrency_availableBalance } = await getUserBalance(
                userId
            );

            if (
                secondaryCurrency_availableBalance <
                summary.secondaryCurrency_wallet
            ) {
                return errorResponse(res, 'Insufficient wallet balance');
            }
        }

        let subscriptionDuration;
        const startDate = moment().startOf('day');

        if (subscriptionPackage === 'monthly') {
            subscriptionDuration = {
                start: startDate,
                end: moment(startDate).add(30, 'days'),
            };
        } else {
            subscriptionDuration = {
                start: startDate,
                end: moment(startDate).add(365, 'days'),
            };
        }

        const subscriptionData = {
            user: userId,
            subscriptionStatus: 'ongoing',
            subscriptionAutoRenew: true,
            paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
            subscriptionPackage,
            baseCurrency_subscriptionFee,
            secondaryCurrency_subscriptionFee,
            summary,
            subscriptionDuration,
            paymentMethod,
        };

        const subscription = await SubscriptionModel.create(subscriptionData);

        await UserModel.findByIdAndUpdate(userId, {
            $set: {
                subscription: subscription._id,
                isSubscribed: true,
            },
        });

        let transactions = [];
        if (summary.baseCurrency_wallet) {
            const transaction = await TransactionModel.create({
                user: userId,
                amount: summary.baseCurrency_wallet,
                secondaryCurrency_amount: summary.secondaryCurrency_wallet,
                userNote: 'Subscription Payment Completed',
                adminNote: `User payment for subscription by using wallet`,
                account: 'user',
                type: 'userPayForSubscriptionByWallet',
                status: 'success',
                paymentMethod: paymentMethod,
                paidCurrency: 'baseCurrency',
                isUserWalletRelated:true

            });

            transactions.push(transaction._id);

            await UserModel.updateOne(
                { _id: userId },
                {
                    $inc: {
                        tempBalance: -summary.baseCurrency_wallet,
                    },
                }
            );
        }

        if (summary.baseCurrency_card) {
            const transaction = await TransactionModel.create({
                user: userId,
                amount: summary.baseCurrency_card,
                secondaryCurrency_amount: summary.secondaryCurrency_card,
                userNote: 'Subscription Payment Completed',
                adminNote: `User payment for subscription by using ${cardTypeString}`,
                account: 'user',
                type: 'userPayForSubscription',
                status: 'success',
                paymentMethod: paymentMethod,
                paymentType: 'flutterWave',
                cardId: cardId,
                paidCurrency: 'baseCurrency',
            });

            transactions.push(transaction._id);
        }

        if (transactions.length) {
            await SubscriptionModel.findByIdAndUpdate(subscription._id, {
                $set: {
                    transactions,
                },
            });
        }

        return subscription;
    } catch (error) {
        console.log(error);
    }
};

exports.cancelSubscription = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await UserModel.findById(userId);

        if (!user) {
            return errorResponse(res, 'user not found');
        }

        if (!user.subscription) {
            return errorResponse(res, 'you have no subscription');
        }

        await SubscriptionModel.findByIdAndUpdate(user.subscription, {
            $set: {
                subscriptionStatus: 'expired',
            },
        });

        await UserModel.findByIdAndUpdate(userId, {
            $unset: {
                subscription: 1,
            },
            $set: {
                isSubscribed: false,
            },
        });

        const updatedUser = await UserModel.findById(userId);

        successResponse(res, {
            message: 'Subscription cancelled successfully',
            data: {
                user: updatedUser,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.updateAutoRenewSubscription = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await UserModel.findById(userId).populate('subscription');

        if (!user) {
            return errorResponse(res, 'user not found');
        }

        if (!user.subscription) {
            return errorResponse(res, 'you have no subscription');
        }

        await SubscriptionModel.findByIdAndUpdate(user.subscription._id, {
            $set: {
                subscriptionAutoRenew: !user.subscription.subscriptionAutoRenew,
            },
        });

        const updatedUser = await UserModel.findById(userId).populate(
            'subscription'
        );

        successResponse(res, {
            message: 'Update auto renew subscription successfully',
            data: {
                user: updatedUser,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.getAutoRenewCancelReasons = async (req, res) => {
    try {
        const subscriptionCancelReasons = await OrderCancelReason.find({
            type: 'subscriptionCancelReason',
            status: 'active',
            deletedAt: null,
        }).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully found subscriptionCancelReasons',
            data: {
                subscriptionCancelReasons,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.cancelAutoRenewSubscription = async (req, res) => {
    try {
        const userId = req.userId;

        const { subscriptionCancelReason = 'No reason' } = req.body;

        const user = await UserModel.findById(userId);

        if (!user) {
            return errorResponse(res, 'user not found');
        }

        if (!user.subscription) {
            return errorResponse(res, 'you have no subscription');
        }

        await SubscriptionModel.findByIdAndUpdate(user.subscription, {
            $set: {
                subscriptionAutoRenew: false,
                subscriptionCancelReason,
            },
        });

        const updatedUser = await UserModel.findById(userId).populate(
            'subscription'
        );

        successResponse(res, {
            message: 'Auto renew subscription cancelled successfully',
            data: {
                user: updatedUser,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.addCancelAutoRenewReason = async (req, res) => {
    try {
        const userId = req.userId;

        const { subscriptionCancelReason } = req.body;

        if (!subscriptionCancelReason) {
            return errorResponse(res, 'subscriptionCancelReason is required');
        }

        const user = await UserModel.findById(userId).populate('subscription');

        if (!user) {
            return errorResponse(res, 'user not found');
        }

        if (!user.subscription) {
            return errorResponse(res, 'you have no subscription');
        }

        if (user.subscription.subscriptionAutoRenew) {
            return errorResponse(
                res,
                'please subscription auto renew cancel first'
            );
        }

        await SubscriptionModel.findByIdAndUpdate(user.subscription._id, {
            $set: {
                subscriptionCancelReason,
            },
        });

        const updatedUser = await UserModel.findById(userId).populate(
            'subscription'
        );

        successResponse(res, {
            message:
                'Add auto renew subscription cancelled reason successfully',
            data: {
                user: updatedUser,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.reactiveAutoRenewSubscription = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await UserModel.findById(userId);

        if (!user) {
            return errorResponse(res, 'user not found');
        }

        if (!user.subscription) {
            return errorResponse(res, 'you have no subscription');
        }

        await SubscriptionModel.findByIdAndUpdate(user.subscription, {
            $set: {
                subscriptionAutoRenew: true,
            },
            $unset: {
                subscriptionCancelReason: 1,
            },
        });

        const updatedUser = await UserModel.findById(userId).populate(
            'subscription'
        );

        successResponse(res, {
            message: 'Auto renew subscription reactive successfully',
            data: {
                user: updatedUser,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.getPendingAmountForSubscription = async (req, res) => {
    try {
        const userId = req.userId;

        const subscription = await SubscriptionModel.findOne({
            user: userId,
            subscriptionStatus: 'ongoing',
            paymentMethod: 'cash',
            paymentStatus: 'pending',
        });

        if (!subscription) {
            return successResponse(res, {
                message: 'You have no pending amount.',
                data: {
                    baseCurrency_pendingSubscriptionFee: 0,
                    secondaryCurrency_pendingSubscriptionFee: 0,
                },
            });
        }

        successResponse(res, {
            message: 'Successfully found pending amount',
            data: {
                baseCurrency_pendingSubscriptionFee:
                    subscription.summary.baseCurrency_cash,
                secondaryCurrency_pendingSubscriptionFee:
                    subscription.summary.secondaryCurrency_cash,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.getSavingsForSubscription = async (req, res) => {
    try {
        const userId = req.userId;

        const { subscriptionId } = req.query;

        if (!subscriptionId) {
            return errorResponse(res, 'subscriptionId is required.');
        }

        const appSetting = await AppSetting.findOne({});
        const currency =
            appSetting?.adminExchangeRate === 0
                ? 'baseCurrency'
                : 'secondaryCurrency';

        let savingsForDiscount = 0;
        let savingsForBuy1Get1 = 0;
        let savingsForFreeDelivery = 0;

        if (currency === 'baseCurrency') {
            const result = await getSubscriptionSpent({
                userId,
                subscriptionId,
            });

            savingsForDiscount = result.baseCurrency_discount;
            savingsForBuy1Get1 = result.baseCurrency_doubleMenuDiscount;
            savingsForFreeDelivery = result.baseCurrency_freeDelivery;
        } else {
            const result = await getSubscriptionSpent({
                userId,
                subscriptionId,
            });

            savingsForDiscount = result.secondaryCurrency_discount;
            savingsForBuy1Get1 = result.secondaryCurrency_doubleMenuDiscount;
            savingsForFreeDelivery = result.secondaryCurrency_freeDelivery;
        }

        successResponse(res, {
            message: 'Successfully found savings.',
            data: {
                savingsForDiscount,
                savingsForBuy1Get1,
                savingsForFreeDelivery,
                totalSavings:
                    savingsForDiscount +
                    savingsForBuy1Get1 +
                    savingsForFreeDelivery,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.getSavingsForNormalUser = async (req, res) => {
    try {
        const { products, deliveryFee } = req.body;

        const productsId = products.map(item => item.product.toString());
        const findProducts = await ProductModel.find({
            _id: { $in: productsId },
        }).populate('marketing');

        let savings = deliveryFee;
        for (const product of findProducts) {
            const findPlusMarketing = product.marketing.find(
                marketing => marketing.onlyForSubscriber
            );
            if (findPlusMarketing?.type === 'percentage') {
                const marketingProduct = findPlusMarketing.products.find(
                    item => item.product.toString() === product._id.toString()
                );

                const productQuantity = products.find(
                    item => item.product.toString() === product._id.toString()
                );

                savings += marketingProduct.discount * productQuantity.quantity;
            }
            if (findPlusMarketing?.type === 'double_menu') {
                const productQuantity = products.find(
                    item => item.product.toString() === product._id.toString()
                );

                savings += product.price * (productQuantity.quantity / 2);
            }
        }

        successResponse(res, {
            message: 'Successfully found savings.',
            data: {
                savings,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.getCrazyOfferShops = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, longitude, latitude } = req.query;

        if (!latitude && !longitude)
            return errorResponse(res, 'Longitude and latitude is required!');

        const appSetting = await AppSetting.findOne();
        const km = appSetting?.nearByShopKm || 1;
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
            deletedAt: null,
            // marketings: {
            //     $elemMatch: {
            //         $exists: true,
            //     },
            // },
        };

        const shops = await ShopModel.find(config)
            .sort(shopCommonSorting)
            .populate([
                {
                    path: 'marketings',
                },
            ])
            .select('shopName shopLogo marketings')
            .lean();

        // const offerShopList = [];

        // for (const shop of shops) {
        //     const findOffer = shop.marketings.find(
        //         marketing =>
        //             ['percentage', 'double_menu'].includes(marketing.type) &&
        //             marketing.isActive &&
        //             marketing.onlyForSubscriber
        //     );

        //     if (findOffer) {
        //         shop.marketings = undefined;
        //         offerShopList.push(shop);
        //     }
        // }

        const shuffledShops = shops.sort(() => Math.random() - 0.5);

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: shuffledShops.length,
            pagingRange: 5,
        });

        const list = shuffledShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'success',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserSubscriptionPaymentHistory = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            startDate,
            endDate,
            sortBy = 'desc',
        } = req.body;
        const userId = req.userId;

        let config = { user: userId, paymentStatus: 'paid' };

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

        const paginate = await pagination({
            page,
            pageSize,
            model: SubscriptionModel,
            condition: config,
            pagingRange: 5,
        });

        const paymentHistory = await SubscriptionModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .select(
                'subscriptionPackage baseCurrency_subscriptionFee secondaryCurrency_subscriptionFee paymentMethod paidCurrency createdAt'
            );

        successResponse(res, {
            message: 'Successfully fetched.',
            data: {
                paymentHistory,
                paginate,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

//*** Areeba payment gateway integration ***/
exports.areebaPaymentGenerate = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            cardId,
            amount,
            subscriptionPackage,
            baseCurrency_subscriptionFee,
            summary,
            paymentMethod,
        } = req.body;

        if (
            !subscriptionPackage ||
            !baseCurrency_subscriptionFee ||
            !paymentMethod
        ) {
            return errorResponse(
                res,
                'subscriptionPackage, subscriptionFee and paymentMethod are required'
            );
        }

        if (!['monthly', 'yearly'].includes(subscriptionPackage)) {
            return errorResponse(
                res,
                'Subscription Package can be monthly or yearly'
            );
        }

        const checkUserSubscription = await SubscriptionModel.findOne({
            user: userId,
            subscriptionStatus: 'ongoing',
        });

        if (checkUserSubscription) {
            return errorResponse(res, 'User already have a subscription.');
        }

        if (summary.secondaryCurrency_wallet) {
            const { secondaryCurrency_availableBalance } = await getUserBalance(
                userId
            );

            if (
                secondaryCurrency_availableBalance <
                summary.secondaryCurrency_wallet
            ) {
                return errorResponse(res, 'Insufficient wallet balance');
            }
        }

        if (!cardId) return errorResponse(res, 'cardId is required');

        if (!ObjectId.isValid(cardId)) {
            return errorResponse(res, 'cardId is invalid');
        }

        const user = await UserModel.findById(userId).select(
            'name gender phone_number email status'
        );

        if (!user) return errorResponse(res, `User not found.`);

        if (user?.status !== 'active')
            return errorResponse(
                res,
                `Your account is ${user?.status}. Please contact support.`
            );

        const areebaCard = await AreebaCardModel.findOne({
            _id: cardId,
            user: userId,
        });

        if (!areebaCard) return errorResponse(res, 'areebaCard not found');

        const orderId = ObjectId();
        const transactionId = ObjectId();
        const currency = 'USD';
        const initiateAuthenticationPutData = {
            authentication: {
                acceptVersions: '3DS1,3DS2',
                channel: 'PAYER_BROWSER',
                purpose: 'PAYMENT_TRANSACTION',
            },
            correlationId: 'test',
            order: {
                currency: currency,
            },
            sourceOfFunds: {
                token: areebaCard.token,
            },
            apiOperation: 'INITIATE_AUTHENTICATION',
        };

        const { data: initiateAuthenticationData } = await areebaPaymentGateway(
            orderId,
            transactionId,
            initiateAuthenticationPutData
        );

        if (initiateAuthenticationData?.result == 'ERROR')
            return errorResponse(
                res,
                initiateAuthenticationData?.error?.explanation
            );

        if (
            initiateAuthenticationData?.transaction?.authenticationStatus !=
            'AUTHENTICATION_AVAILABLE'
        )
            return errorResponse(res, 'Authentication is not available');

        const authenticatePayerPutData = {
            authentication: {
                redirectResponseUrl: `${process.env.WEBSITE_URL}app/user/subscription/enroll/areeba-payment-completed`,
            },
            correlationId: 'test',
            device: {
                browser: 'MOZILLA',
                browserDetails: {
                    '3DSecureChallengeWindowSize': 'FULL_SCREEN',
                    acceptHeaders: 'application/json',
                    colorDepth: 24,
                    javaEnabled: true,
                    language: 'en-US',
                    screenHeight: 640,
                    screenWidth: 480,
                    timeZone: 273,
                },
                // ipAddress: "127.0.0.1"
            },
            order: {
                amount: amount,
                currency: currency,
            },
            sourceOfFunds: {
                token: areebaCard.token,
            },
            apiOperation: 'AUTHENTICATE_PAYER',
        };

        const { data: authenticatePayerData } = await areebaPaymentGateway(
            orderId,
            transactionId,
            authenticatePayerPutData
        );

        if (authenticatePayerData?.result == 'ERROR')
            return errorResponse(
                res,
                authenticatePayerData?.error?.explanation
            );

        const redirectHtml = authenticatePayerData.authentication.redirect.html;

        await SubscriptionRequestModel.create({
            ...req.body,
            userId,
            areebaCard: { orderId, transactionId, token: areebaCard.token },
        });

        successResponse(res, {
            message: 'Successfully fetched.',
            data: {
                redirectHtml,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.areebaPaymentComplete = async (req, res) => {
    try {
        const { 'order.id': orderId } = req.body;

        const orderRequest = await SubscriptionRequestModel.findOne({
            'areebaCard.orderId': orderId,
        });

        if (!orderRequest)
            return scriptResponse(res, `failed/orderRequest not found`);

        req.body = orderRequest;
        req.userId = orderRequest.userId;

        const { summary, areebaCard } = req.body;

        await SubscriptionRequestModel.findByIdAndDelete(orderRequest._id);

        const newTransactionId = ObjectId();
        const currency = 'USD';

        const payPutData = {
            apiOperation: 'PAY',
            authentication: {
                transactionId: areebaCard?.transactionId,
            },
            order: {
                amount: summary?.baseCurrency_card,
                currency: currency,
                reference: areebaCard?.orderId,
            },
            sourceOfFunds: {
                token: areebaCard?.token,
            },
            transaction: {
                reference: areebaCard?.orderId,
            },
        };

        const { data: payData } = await areebaPaymentGateway(
            areebaCard?.orderId,
            newTransactionId,
            payPutData
        );

        if (payData?.result == 'ERROR')
            return scriptResponse(res, `failed/${payData?.error?.explanation}`);

        const subscription = await enrollSubscriptionFunc(req);

        return scriptResponse(res, `success/${subscription._id}`);
    } catch (error) {
        console.log(error);
        return scriptResponse(res, `failed/${error.message}`);
    }
};
