const Flutterwave = require('flutterwave-node-v3');
const open = require('open');
const util = require('util');
const UserModel = require('../models/UserModel');
const FlutterTransaction = require('../models/FlutterTransaction');
const CardModel = require('../models/CardModel');
const { errorHandler } = require('../helpers/apiResponse');
const axios = require('axios').default;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const flw = new Flutterwave(PUBLIC_KEY, SECRET_KEY);
const moment = require('moment');
const short = require('short-uuid');
const TransactionModel = require('../models/TransactionModel');
const AppSetting = require('../models/AppSetting');

const chargeCard = async res => {
    try {
        const payload = {
            card_number: '5531886652142950',
            cvv: '564',
            expiry_month: '09',
            expiry_year: '32',
            currency: 'NGN',
            amount: '10',
            redirect_url: 'https://www.google.com',
            fullname: 'Olufemi Obafunmiso',
            email: 'olufemi@flw.com',
            phone_number: '0902620185',
            enckey: ENCRYPTION_KEY,
            tx_ref: 'MC-32444ee--4eerye4euee3rerds4423e43e', // This is a unique reference, unique to the particular transaction being carried out. It is generated when it is not provided by the merchant for every transaction.
        };
        const response = await flw.Charge.card(payload);

        if (response.meta.authorization.mode === 'pin') {
            let payload2 = payload;
            payload2.authorization = {
                mode: 'pin',
                // fields: ['pin'],
                pin: 3310,
            };
            const reCallCharge = await flw.Charge.card(payload2);

            const callValidate = await flw.Charge.validate({
                otp: '12345',
                flw_ref: reCallCharge.data.flw_ref,
            });
        }
        if (response.meta.authorization.mode === 'redirect') {
            var url = response.meta.authorization.redirect;
            open(url);
        }
    } catch (error) {
        return res.json({
            status: false,
            message: error.message,
        });
    }
};

exports.cardCharge = async (req, res) => {
    try {
        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;
        const data = {
            card_number: '5531886652142950',
            cvv: '564',
            expiry_month: '09',
            expiry_year: '32',
            currency: 'NGN',
            amount: '10',
            redirect_url: 'https://www.google.com',
            fullname: 'Olufemi Obafunmiso',
            email: 'olufemi@flw.com',
            phone_number: '0902620185',
            enckey: ENCRYPTION_KEY,
            tx_ref: tx_ref,
        };
        const response = await flw.Charge.card(data);
        if (response.meta.authorization.mode === 'pin') {
            let payload2 = data;
            payload2.authorization = {
                mode: 'pin',
                // fields: ['pin'],
                pin: 3310,
            };
            const reCallCharge = await flw.Charge.card(payload2);

            const callValidate = await flw.Charge.validate({
                otp: '12345',
                flw_ref: reCallCharge.data.flw_ref,
            });

            return res.json({
                status: true,
                message: 'successfully pay',
                data: {
                    flw: callValidate,
                },
            });
        }

        if (response.meta.authorization.mode === 'redirect') {
            var url = response.meta.authorization.redirect;
            open(url);
        }

        return res.json({
            status: true,
            message: 'successfully pay',
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.fetch_transactions = async (req, res) => {
    try {
        const payload = {
            from: '2022-01-01',
            to: '2022-12-12',
        };
        const response = await flw.Transaction.fetch(payload);

        res.json({
            status: true,
            message: 'successfully fetched',
            data: {
                flwTransaction: response,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Flutterwave Standard

exports.flutterWaveStandard = async (req, res) => {
    try {
        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;

        const response = await axios.post(
            'https://api.flutterwave.com/v3/payments',
            {
                tx_ref: tx_ref,
                amount: '20',
                currency: 'NGN',
                redirect_url: 'https://google.com',
                meta: {
                    consumer_id: 23,
                    consumer_mac: '92a3-912ba-1192a',
                    consumer_type: 'user',
                },
                customer: {
                    email: 'user@gmail.com',
                    phonenumber: '080****4528',
                    name: 'Yemi Desola',
                },
                customizations: {
                    title: 'Pied Piper Payments',
                    logo: 'http://www.piedpiper.com/app/themes/joystick-v27/images/logo.png',
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${SECRET_KEY}`,
                },
            }
        );

        return res.json({
            status: true,
            message: 'link generated',
            data: {
                flw: response.data,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.flwCardStep1 = async (req, res) => {
    try {
        const {
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            amount,
            redirect_url,
            fullname,
            email,
        } = req.body;

        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;

        const data = {
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            amount,
            email,
            tx_ref,
            enckey: ENCRYPTION_KEY,
        };

        const response = await flw.Charge.card(data);

        return res.json({
            status: true,
            message: 'successfully pay',
            data: {
                flw: response,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};
exports.flwCardStep2 = async (req, res) => {
    try {
        const {
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            amount,
            redirect_url,
            fullname,
            email,
            phone_number,
            validationType,
        } = req.body;

        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;

        const data = {
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            amount,
            redirect_url,
            fullname,
            email,
            phone_number,
            enckey: ENCRYPTION_KEY,
            tx_ref: tx_ref,
        };

        if (validationType === 'pin') {
            let payload2 = data;
            payload2.authorization = {
                mode: 'pin',
                // fields: ['pin'],
                pin: 3310,
            };
            const reCallCharge = await flw.Charge.card(payload2);

            return res.json({
                status: true,
                message: 'payment generate',
                data: {
                    flw: reCallCharge,
                },
            });
        }
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.flwCardStep3 = async (req, res) => {
    try {
        const { reCallCharge, otp } = req.body;

        const callValidate = await flw.Charge.validate({
            otp: otp,
            flw_ref: reCallCharge.data.flw_ref,
        });

        return res.json({
            status: true,
            message: 'successfully pay',
            data: {
                flw: callValidate,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.TopUpCheckSecurityType = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            amount,
        } = req.body;

        if (
            !card_number ||
            !cvv ||
            !expiry_month ||
            !expiry_year ||
            !currency ||
            !amount
        ) {
            return res.json({
                status: false,
                message: 'Please fill all fields',
            });
        }

        const user = await UserModel.findById(userId).select(
            'name gender phone_number email'
        );

        // const isExistCard = await CardModel.findOne({
        //     card_number: card_number,
        // });

        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;

        const cardInformation = {
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            amount,
            fullname: user.name,
            email: user.email,
            tx_ref,
            // redirect_url: null,
            enckey: ENCRYPTION_KEY,
        };

        const response = await flw.Charge.card(cardInformation);

        if (response) {
            return res.json({
                ...response,
                status: response.status == 'success' ? true : false,
            });
        }
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.topUpGeneratePayment = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            amount,
            validationType,
            pin,
        } = req.body;

        if (
            !card_number ||
            !cvv ||
            !expiry_month ||
            !expiry_year ||
            !currency ||
            !amount ||
            !validationType ||
            !pin
        ) {
            return res.json({
                status: false,
                message: 'Please fill all fields',
            });
        }

        const user = await UserModel.findById(userId).select(
            'name gender phone_number email'
        );

        // const isExistCard = await CardModel.findOne({
        //     card_number: card_number,
        // });

        const tx_ref = `${moment().format('DDMMYYHmm')}${short().new()}`;

        const cardInformation = {
            card_number,
            cvv,
            expiry_month,
            expiry_year,
            currency,
            amount,
            fullname: user.name,
            email: user.email,
            phone_number: user.phone_number,
            tx_ref,
            // redirect_url: null,
            enckey: ENCRYPTION_KEY,
        };

        if (validationType === 'pin') {
            let payload2 = cardInformation;
            payload2.authorization = {
                mode: 'pin',
                // fields: ['pin'],
                pin: pin,
            };
            const reCallCharge = await flw.Charge.card(payload2);

            const flutterTransaction = await FlutterTransaction.create({
                user: userId,
                flutterWave: reCallCharge,
                cardInfo: {
                    card_number,
                    cvv,
                    expiry_month,
                    expiry_year,
                    currency,
                    amount,
                    validationType,
                    pin,
                    tx_ref,
                },
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
            });
        } else {
            return res.json({
                status: false,
                message: 'security type not others. contact to support',
            });
        }
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.topUpPaymentGenerate = async (req, res) => {
    try {
        const userId = req.userId;

        let { cardId, pin, amount } = req.body;

        if (!cardId || !pin) {
            return res.json({
                status: false,
                message: 'Please fill all fields',
            });
        }

        const user = await UserModel.findById(userId).select(
            'name gender phone_number email'
        );

        const card = await CardModel.findOne({ _id: cardId });

        // // check pin have or not in cardModel
        // if (card.pins.length.length > 0 && !pin) {
        //     // get last pin
        //     pin = card.pins[card.pins.length - 1];
        // }

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
                        showPinField: true,
                    });
                }

                return res.json({
                    status: false,
                    message: reCallCharge.message,
                    showPinField: false,
                });
            }

            const pinList = card.pins;

            if (pinList[pinList.length - 1] != pin) {
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
            });

            return res.json({
                status: reCallCharge.status == 'success' ? true : false,
                message:
                    reCallCharge.status == 'success'
                        ? 'payment generate'
                        : reCallCharge.message,
                showPinField: false,
                data: {
                    flw: reCallCharge,
                    flutter: flutterTransaction,
                },
            });
        } else {
            return res.json({
                status: false,
                message: 'security type not others. contact to support',
            });
        }
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.topUpVerifyPayment = async (req, res) => {
    try {
        const { token, token_id, otp } = req.body;

        if (!otp) {
            return res.json({
                status: false,
                message: 'please enter your otp',
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

            // set card to userModel and cardModel & set balance to user

            return res.json({
                status: true,
                message: 'successfully pay',
                data: {
                    flw: callValidate,
                },
            });
        }

        return res.json({
            status: false,
            message: callValidate.message,
            error: callValidate.message,
            data: {
                flw: callValidate,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.topUpCompletePayment = async (req, res) => {
    try {
        const userId = req.userId;
        const { token, token_id, otp } = req.body;

        if (!otp) {
            return res.json({
                status: false,
                message: 'please enter your otp',
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

            const appSetting = await AppSetting.findOne({});
            const adminExchangeRate = appSetting?.adminExchangeRate || 0;

            const transaction = await TransactionModel.create({
                user: userId,
                amount: amount,
                secondaryCurrency_amount: amount * adminExchangeRate,
                userNote: 'top-up balance',
                adminNote: `user Top-Up Balance by using ${cardTypeString}`,
                account: 'user',
                type: 'userTopUpBalance',
                status: 'success',
                paymentMethod: 'flutterWave',
                paymentType: 'card',
                cardId: flutterTransaction.cardInfo.cardId,
                isUserWalletRelated:true
            });

            await UserModel.updateOne(
                { _id: userId },
                {
                    $inc: {
                        tempBalance: amount,
                    },
                }
            );

            return res.json({
                status: true,
                message: 'successfully Payment completed & top-up your balance',
                data: {
                    flw: callValidate,
                },
            });
        }

        return res.json({
            status: false,
            message: callValidate.message,
            error: callValidate.message,
            data: {
                flw: callValidate,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};
