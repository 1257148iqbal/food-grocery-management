const ObjectId = require('mongoose').Types.ObjectId;
const {
    successResponse,
    errorHandler,
    errorResponse,
    scriptResponse,
} = require('../helpers/apiResponse');
const UserModel = require('../models/UserModel');
const AreebaCardModel = require('../models/AreebaCardModel');
const {
    areebaSession,
    areebaToken,
    areebaPaymentGateway,
} = require('../lib/areebaPaymentGateway');
const TransactionModel = require('../models/TransactionModel');
const AppSetting = require('../models/AppSetting');

exports.getUserAreebaCards = async (req, res) => {
    try {
        const userId = req.userId;

        const cards = await AreebaCardModel.find({
            user: userId,
            status: 'active',
        });

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

exports.validateAreebaCard = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await UserModel.findById(userId)
            .populate('address')
            .select('name gender phone_number email');

        if (!user) return errorResponse(res, 'User not found');

        const orderId = ObjectId();
        const currency = 'USD';
        const postData = {
            apiOperation: 'INITIATE_CHECKOUT',
            interaction: {
                merchant: {
                    name: process.env.AREEBA_MERCHANT_NAME,
                    url: process.env.AREEBA_MERCHANT_URL,
                    logo: process.env.AREEBA_MERCHANT_LOGO,
                },
                displayControl: {
                    billingAddress: 'MANDATORY',
                    customerEmail: 'MANDATORY',
                },
                // timeout: 1800,
                // timeoutUrl: "https://www.google.com",
                // cancelUrl: "http://www.google.com",
                returnUrl: `${process.env.WEBSITE_URL}app/user/areeba-card/add/${orderId}`,
                operation: 'NONE', //"AUTHORIZE" || "NONE" || "PURCHASE" || "VERIFY"
                style: {
                    accentColor: '#30cbe3',
                },
            },
            order: {
                amount: '1',
                currency: currency,
                description: 'Add card',
                id: orderId,
            },
            customer: {
                email: user.email,
                firstName: user.name,
                lastName: user.name,
                mobilePhone: user.phone_number,
                phone: user.phone_number,
            },
        };

        const { data: sessionData } = await areebaSession(postData);

        if (sessionData?.result == 'ERROR')
            return errorResponse(res, sessionData?.error?.explanation);

        const sessionId = sessionData?.session?.id;

        await AreebaCardModel.create({
            user: userId,
            orderId,
            sessionId,
            currency,
            status: 'pending',
        });

        successResponse(res, {
            message: 'Successfully fetched.',
            data: {
                sessionId,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addAreebaCard = async (req, res) => {
    try {
        const { orderId } = req.params;

        const areebaCard = await AreebaCardModel.findOne({
            orderId,
            status: 'pending',
        });

        if (!areebaCard) return errorResponse(res, 'areebaCardModel not found');
        // if (!areebaCard)
        //     return scriptResponse(res, `failed/areebaCardModel not found`);

        const { data: tokenData } = await areebaToken(areebaCard.sessionId);

        if (tokenData?.result == 'ERROR')
            return errorResponse(res, tokenData?.error?.explanation);
        // if (tokenData?.result == 'ERROR')
        //     return scriptResponse(
        //         res,
        //         `failed/${tokenData?.error?.explanation}`
        //     );

        const checkAreebaCard = await AreebaCardModel.findOne({
            user: areebaCard.user,
            token: tokenData.token,
        });
        if (checkAreebaCard) {
            return errorResponse(
                res,
                'This card is already exists in your list.'
            );
        }
        // if (!checkAreebaCard)
        //     return scriptResponse(
        //         res,
        //         `failed/This card is already exists in your list`
        //     );

        const cardInfo = tokenData.sourceOfFunds.provided.card;

        await AreebaCardModel.findByIdAndUpdate(areebaCard._id, {
            $set: {
                brand: cardInfo.brand,
                expiry: cardInfo.expiry,
                fundingMethod: cardInfo.fundingMethod,
                nameOnCard: cardInfo.nameOnCard,
                number: cardInfo.number,
                scheme: cardInfo.scheme,
                token: tokenData.token,
                status: 'active',
            },
        });

        // push to user areebaCards
        await UserModel.updateOne(
            { _id: areebaCard.user },
            { $push: { areebaCards: areebaCard._id } }
        );

        // delete all pending AreebaCardModel
        await AreebaCardModel.deleteMany({
            user: areebaCard.user,
            status: 'pending',
        });

        successResponse(res, {
            message: 'Successfully added.',
        });
        // return scriptResponse(res, `success/${areebaCard._id}`);
    } catch (error) {
        errorHandler(res, error);
        // console.log(error);
        // return scriptResponse(res, `failed/${error.message}`);
    }
};

exports.deleteAreebaCard = async (req, res) => {
    try {
        const userId = req.userId;
        const { cardId } = req.body;

        const count = await AreebaCardModel.countDocuments({
            user: userId,
            status: 'active',
        });
        if (count <= 1) {
            return errorResponse(
                res,
                'you can not delete last card! at least one card is required'
            );
        }

        const areebaCard = await AreebaCardModel.findById(cardId);

        if (!areebaCard) {
            return errorResponse(res, 'card not found');
        }

        if (areebaCard.user.toString() !== userId.toString()) {
            return errorResponse(
                res,
                'you are try to delete card that is not yours'
            );
        }

        await AreebaCardModel.findByIdAndDelete(cardId);

        // pull from user areebaCards
        await UserModel.findByIdAndUpdate(userId, {
            $pull: { areebaCards: areebaCard._id },
        });

        successResponse(res, {
            message: 'Successfully delete card',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

//*** Areeba payment gateway integration ***/
exports.areebaPaymentGenerate = async (req, res) => {
    try {
        const userId = req.userId;
        const { cardId, amount } = req.body;

        if (!cardId) return errorResponse(res, 'cardId is required');

        if (!ObjectId.isValid(cardId)) {
            return errorResponse(res, 'cardId is invalid');
        }

        const user = await UserModel.findById(userId);

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
                redirectResponseUrl: `${process.env.WEBSITE_URL}app/user/top-up/areeba-payment-completed/${userId}/${areebaCard.token}/${amount}`,
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
        const { 'order.id': orderId, 'transaction.id': transactionId } =
            req.body;
        const { userId, amount, token } = req.params;

        const newTransactionId = ObjectId();
        const currency = 'USD';

        const payPutData = {
            apiOperation: 'PAY',
            authentication: {
                transactionId: transactionId,
            },
            order: {
                amount: amount,
                currency: currency,
                reference: orderId,
            },
            sourceOfFunds: {
                token: token,
            },
            transaction: {
                reference: orderId,
            },
        };

        const { data: payData } = await areebaPaymentGateway(
            orderId,
            newTransactionId,
            payPutData
        );

        if (payData?.result == 'ERROR')
            return scriptResponse(res, `failed/${payData?.error?.explanation}`);

        const appSetting = await AppSetting.findOne({});
        const adminExchangeRate = appSetting?.adminExchangeRate || 0;

        await TransactionModel.create({
            user: userId,
            amount: amount,
            secondaryCurrency_amount: amount * adminExchangeRate,
            userNote: 'top-up balance',
            adminNote: `user Top-Up Balance by using card`,
            account: 'user',
            type: 'userTopUpBalance',
            status: 'success',
            paymentMethod: 'areeba',
            paymentType: 'card',
            isUserWalletRelated: true
        });

        await UserModel.updateOne(
            { _id: userId },
            {
                $inc: {
                    tempBalance: amount,
                },
            }
        );

        return scriptResponse(res, `success/Successfully top-up your balance`);
    } catch (error) {
        console.log(error);
        return scriptResponse(res, `failed/${error.message}`);
    }
};
