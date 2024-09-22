const {
    errorResponse,
    errorHandler,
    successResponse,
} = require('../helpers/apiResponse');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const ObjectId = require('mongoose').Types.ObjectId;
const moment = require('moment');
const short = require('short-uuid');
const axios = require('axios');
const https = require('https');
const TransactionModel = require('../models/TransactionModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const BOBFinanceModel = require('../models/BOBFinanceModel');
const PayoutModel = require('../models/PayoutModel');
const { decompressedResponse } = require('../helpers/decompressedResponse');
const { notifyAfterPaidBOBTrx } = require('../config/socket');
const { calcActiveTime } = require('./DeliveryBoyController');
const DeliveryBoyTimeModel = require('../models/DeliveryBoyTimeModel');
const {
    removeCountryCode,
    splitName,
    convertNumberToCode,
} = require('../helpers/utility');
const { autoIncrement } = require('../services/counter.service');

const BoBUserName = process.env.BOB_USER_NAME;
const BoBUserNameApi = process.env.BOB_USER_NAME_API;
const BoBPassword = process.env.BOB_PASSWORD;
const BoBurl = process.env.BOB_URL;
const BoBItemId = process.env.BOB_ITEMID;
const BoBVenId = process.env.BOB_VENID;
const BoBProductId = process.env.BOB_PRODUCTID;
const BoBCompanyName = process.env.BOB_COMPANYNAME;

//*** Start BoB Finance API ***/
exports.GetTransfers = async (req, res) => {
    try {
        const { startDate, endDate, Model, TransferNumber, StatusCode } =
            req.query;

        const { status, message, responseObject } = await this.GetTransfersFunc(
            { startDate, endDate, Model, TransferNumber, StatusCode }
        );

        if (!status) {
            return errorResponse(res, message);
        }

        successResponse(res, {
            message: 'Successfully fetched.',
            data: responseObject,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.GetTransfersFunc = async ({
    startDate,
    endDate,
    Model,
    TransferNumber,
    StatusCode,
}) => {
    try {
        const DateTimeFrom =
            new Date(startDate).toISOString().split('.')[0] + 'Z';
        const DateTimeTo = new Date(endDate).toISOString().split('.')[0] + 'Z';

        const bobData = {
            ChannelType: 'CO',
            Credentials: {
                User: BoBUserName,
                Password: BoBPassword,
            },
            DateTimeFrom,
            DateTimeTo,
            Model,
            TransferNumber,
            StatusCode,
        };

        const { data } = await axios.post(`${BoBurl}GetTransfers`, bobData, {
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });

        if (data.ErrorCode != 100)
            return {
                status: false,
                message: data.ErrorDescription,
                responseObject: [],
            };

        const { status, message, responseObject } = await decompressedResponse(
            data.Response
        );

        if (!status) {
            return { status, message, responseObject: [] };
        }

        return { status, message: '', responseObject };
    } catch (error) {
        return { status: false, message: error.message, responseObject: [] };
    }
};

exports.GetTransferStatus = async (req, res) => {
    try {
        const { CRMNumber } = req.query;

        const { status, message, responseObject } =
            await this.GetTransferStatusFunc(CRMNumber);

        if (!status) {
            return errorResponse(res, message);
        }

        successResponse(res, {
            message: 'Successfully fetched.',
            data: responseObject,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.GetTransferStatusFunc = async CRMNumber => {
    try {
        const bobData = {
            ChannelType: 'CO',
            Credentials: {
                User: BoBUserName,
                Password: BoBPassword,
            },
            Model: 'C2B',
            CRMNumber,
        };

        const { data } = await axios.post(
            `${BoBurl}GetTransferStatus`,
            bobData,
            {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            }
        );

        if (data.ErrorCode != 100)
            return { status: false, message: data.ErrorDescription };

        const { status, message, responseObject } = await decompressedResponse(
            data.Response
        );

        if (!status) {
            return { status, message };
        }

        return { status, responseObject };
    } catch (error) {
        return { status: false, message: error.message };
    }
};

exports.GetTransactionDetails = async (req, res) => {
    try {
        const { ReferenceNumber } = req.query;

        const { status, message, responseObject } =
            await this.GetTransactionDetailsFunc(ReferenceNumber);

        if (!status) {
            return errorResponse(res, message);
        }

        successResponse(res, {
            message: 'Successfully fetched.',
            data: responseObject,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.GetTransactionDetailsFunc = async ReferenceNumber => {
    try {
        const bobData = {
            ItemId: BoBItemId,
            VenId: BoBVenId,
            ProductId: BoBProductId,
            ChannelType: 'API',
            Parameters: {
                ReferenceNumber,
            },
            Credentials: {
                User: BoBUserNameApi,
                Password: BoBPassword,
            },
        };

        const { data } = await axios.post(
            `${BoBurl}GetTransactionDetails`,
            bobData,
            {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            }
        );

        if (data.ErrorCode != 100)
            return { status: false, message: data.ErrorDescription };

        const { status, message, responseObject } = await decompressedResponse(
            data.Response
        );

        if (!status) {
            return { status, message };
        }

        return { status, responseObject };
    } catch (error) {
        return { status: false, message: error.message };
    }
};

exports.ClearTransfers = async (req, res) => {
    try {
        const { ChannelType, Model } = req.query;

        const bobData = {
            ChannelType,
            Credentials: {
                User: BoBUserName,
                Password: BoBPassword,
            },
            Model,
        };

        const { data } = await axios.post(`${BoBurl}ClearTransfers`, bobData, {
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });

        if (data.ErrorCode != 100)
            return errorResponse(res, data.ErrorDescription);

        const { status, message, responseObject } = await decompressedResponse(
            data.Response
        );

        if (!status) {
            return errorResponse(res, message);
        }

        successResponse(res, {
            message: 'Successfully fetched.',
            data: responseObject,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.RemoveTransfer = async (req, res) => {
    try {
        const { ChannelType, Model, CRMNumber } = req.query;

        const bobData = {
            ChannelType,
            Credentials: {
                User: BoBUserName,
                Password: BoBPassword,
            },
            Model,
            CRMNumber,
        };

        const { data } = await axios.post(`${BoBurl}RemoveTransfer`, bobData, {
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });

        if (data.ErrorCode != 100)
            return errorResponse(res, data.ErrorDescription);

        const { status, message, responseObject } = await decompressedResponse(
            data.Response
        );

        if (!status) {
            return errorResponse(res, message);
        }

        successResponse(res, {
            message: 'Successfully fetched.',
            data: responseObject,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.GetLimit = async (req, res) => {
    try {
        const bobData = {
            ChannelType: 'CO',
            Credentials: {
                User: BoBUserName,
                Password: BoBPassword,
            },
        };

        const { data } = await axios.post(`${BoBurl}GetLimit`, bobData, {
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });

        if (data.ErrorCode != 100)
            return errorResponse(res, data.ErrorDescription);

        const { status, message, responseObject } = await decompressedResponse(
            data.Response
        );

        if (!status) {
            return errorResponse(res, message);
        }

        successResponse(res, {
            message: 'Successfully fetched.',
            data: responseObject,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
//*** End BoB Finance API ***/

exports.getBoBFinanceTransaction = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'desc',
            searchKey,
            startDate,
            endDate,
            status,
            bobType,
            bobLocation,
            paidCurrency,
        } = req.query;

        let whereConfig = {};

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

        if (status && ['NOT PAID', 'PAID'].includes(status)) {
            whereConfig = {
                status,
                ...whereConfig,
            };
        }

        if (bobType && ['inward', 'outward'].includes(bobType)) {
            whereConfig = {
                bobType,
                ...whereConfig,
            };
        }

        if (
            paidCurrency &&
            ['baseCurrency', 'secondaryCurrency'].includes(paidCurrency)
        ) {
            whereConfig = {
                paidCurrency,
                ...whereConfig,
            };
        }

        if (bobLocation) {
            whereConfig = {
                bobLocation,
                ...whereConfig,
            };
        }

        let bobTransactions = await BOBFinanceModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'deliveryBoy',
                    select: 'name image',
                },
                {
                    path: 'shop',
                    select: 'shopName shopLogo',
                },
                {
                    path: 'payout',
                    select: 'autoGenId autoPayoutId',
                },
            ])
            .select({
                autoGenId: 1,
                autoTrxId: 1,
                account: 1,
                amount: 1,
                secondaryCurrency_amount: 1,
                status: 1,
                shop: 1,
                deliveryBoy: 1,
                payout: 1,
                bobType: 1,
                bobLocation: 1,
                paidCurrency: 1,
                createdAt: 1,
            });

        if (searchKey) {
            bobTransactions = bobTransactions.filter(trx => {
                const searchTerm = searchKey.toLowerCase();

                return (
                    trx?.autoGenId?.toLowerCase().includes(searchTerm) ||
                    trx?.deliveryBoy?.name
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    trx?.shop?.shopName?.toLowerCase().includes(searchTerm)
                );
            });
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: bobTransactions.length,
            pagingRange: 5,
        });

        const list = bobTransactions.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully find',
            data: {
                transactions: list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getBoBFinanceCurrentBalance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let commonConfig = { status: 'PAID' };

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            commonConfig = {
                ...commonConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        const calculateBalance = async pipeline => {
            const [result] = await BOBFinanceModel.aggregate(pipeline);
            return result ? result.balance : 0;
        };

        // Calculate addBalance
        const baseCurrencyAddBalancePipeline = [
            {
                $match: {
                    ...commonConfig,
                    paidCurrency: 'baseCurrency',
                    bobType: 'inward',
                },
            },
            {
                $group: {
                    _id: '',
                    balance: { $sum: '$amount' },
                },
            },
        ];

        const baseCurrencyAddBalance = await calculateBalance(
            baseCurrencyAddBalancePipeline
        );

        const secondaryCurrencyAddBalancePipeline = [
            {
                $match: {
                    ...commonConfig,
                    paidCurrency: 'secondaryCurrency',
                    bobType: 'inward',
                },
            },
            {
                $group: {
                    _id: '',
                    balance: { $sum: '$secondaryCurrency_amount' },
                },
            },
        ];

        const secondaryCurrencyAddBalance = await calculateBalance(
            secondaryCurrencyAddBalancePipeline
        );

        // Calculate removeBalance
        const baseCurrencyRemoveBalancePipeline = [
            {
                $match: {
                    ...commonConfig,
                    paidCurrency: 'baseCurrency',
                    bobType: 'outward',
                },
            },
            {
                $group: {
                    _id: '',
                    balance: { $sum: '$amount' },
                },
            },
        ];

        const baseCurrencyRemoveBalance = await calculateBalance(
            baseCurrencyRemoveBalancePipeline
        );

        const secondaryCurrencyRemoveBalancePipeline = [
            {
                $match: {
                    ...commonConfig,
                    paidCurrency: 'secondaryCurrency',
                    bobType: 'outward',
                },
            },
            {
                $group: {
                    _id: '',
                    balance: { $sum: '$secondaryCurrency_amount' },
                },
            },
        ];

        const secondaryCurrencyRemoveBalance = await calculateBalance(
            secondaryCurrencyRemoveBalancePipeline
        );

        const baseCurrency_balance =
            baseCurrencyAddBalance - baseCurrencyRemoveBalance;
        const secondaryCurrency_balance =
            secondaryCurrencyAddBalance - secondaryCurrencyRemoveBalance;

        successResponse(res, {
            message: 'Successfully find',
            data: {
                baseCurrency_balance,
                secondaryCurrency_balance,
                baseCurrency_totalInward: baseCurrencyAddBalance,
                baseCurrency_totalOutward: baseCurrencyRemoveBalance,
                secondaryCurrency_totalInward: secondaryCurrencyAddBalance,
                secondaryCurrency_totalOutward: secondaryCurrencyRemoveBalance,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getRiderSettlementByIdForApp = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;
        const { transactionId } = req.query;

        if (!transactionId)
            return errorResponse(res, 'transactionId is required.');

        const findBobTrx = await BOBFinanceModel.findById(transactionId);

        if (!findBobTrx) return errorResponse(res, 'Transaction not found.');

        successResponse(res, {
            message: 'Successfully fetched.',
            data: {
                transaction: findBobTrx,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderOngoingRequestForApp = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const rider = await DeliveryBoyModel.findById(deliveryBoyId);
        if (!rider) return errorResponse(res, 'Rider not found');

        const bobData = {
            ChannelType: 'CO',
            Credentials: {
                User: BoBUserName,
                Password: BoBPassword,
            },
            Model: 'C2B',
            CRMNumber: rider._id,
        };

        const { data } = await axios.post(
            `${BoBurl}GetTransferStatus`,
            bobData,
            { httpsAgent: new https.Agent({ rejectUnauthorized: false }) }
        );

        if (data.ErrorCode != 100)
            return errorResponse(res, data.ErrorDescription);

        const { status, message, responseObject } = await decompressedResponse(
            data.Response
        );

        if (!status) {
            return errorResponse(res, message);
        }

        successResponse(res, {
            message: 'Successfully fetched.',
            data: responseObject,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getRiderUnpaidRequestForApp = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const rider = await DeliveryBoyModel.findById(deliveryBoyId);
        if (!rider) return errorResponse(res, 'Rider not found');

        const bobTransaction = await BOBFinanceModel.findOne({
            account: 'deliveryBoy',
            type: 'riderSettleCasInHand',
            deliveryBoy: ObjectId(deliveryBoyId),
            $or: [{ status: 'NOT PAID' }, { status: 'PAID', riderSeen: false }],
        });

        if (
            bobTransaction &&
            bobTransaction.status === 'PAID' &&
            !bobTransaction.riderSeen
        ) {
            bobTransaction.riderSeen = true;
            await bobTransaction.save();
        }

        successResponse(res, {
            message: 'Successfully fetched.',
            data: {
                transaction: bobTransaction || null,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.settleRiderCashInHandForApp = async (req, res) => {
    console.log('test connection delivery');
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const { amount, secondaryCurrency_amount, paidCurrency, bobLocation } =
            req.body;

           

        const rider = await DeliveryBoyModel.findById(deliveryBoyId);
        if (!rider) return errorResponse(res, 'Rider not found');
        const { firstName: FirstName, lastName: LastName } = splitName(
            rider.name
        );
        const counter = await autoIncrement('CRMNumber');
        const bobData = {
            ChannelType: 'CO',
            Credentials: {
                User: BoBUserName,
                Password: BoBPassword,
            },
            Model: 'C2B',
            FirstName,
            LastName,
            // CRMNumber: rider._id,
            CRMNumber: convertNumberToCode(counter.seq_value),
            Amount:
                paidCurrency === 'baseCurrency'
                    ? amount
                    : secondaryCurrency_amount,
            Currency: paidCurrency === 'baseCurrency' ? 'USD' : 'LBP',
            Description1: '',
            Description2: '',
            Description3: '',
        };
        console.log(bobData);
        const { data } = await axios.post(
            `${BoBurl}InsertTransferData`,
            bobData,
            { httpsAgent: new https.Agent({ rejectUnauthorized: false }) }
        );

        if (data.ErrorCode != 100)
            return errorResponse(res, data.ErrorDescription);

        const { status, message, responseObject } = await decompressedResponse(
            data.Response
        );

        if (!status) {
            return errorResponse(res, message);
        }

        // Create BobFinancial Transaction
        const bobFinanceTrx = {
            autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
            account: 'deliveryBoy',
            type: 'riderSettleCasInHand',
            amount: amount,
            secondaryCurrency_amount: secondaryCurrency_amount,
            status: 'NOT PAID',
            deliveryBoy: deliveryBoyId,
            bobModel: 'C2B',
            bobType: 'inward',
            crmNumber: responseObject.CRMNumber,
            bobLocation: bobLocation,
            paidCurrency: paidCurrency,
        };
        const bobTrx = await BOBFinanceModel.create(bobFinanceTrx);

        // Check rider cash settlement limit
        if (
            rider.liveStatus !== 'offline' ||
            rider.isCashSettlementLimitReached
        ) {
            if (rider.liveStatus !== 'offline') {
                const lastOnline = rider.lastOnline || new Date();

                const total = calcActiveTime(lastOnline, new Date());
                await DeliveryBoyTimeModel.create({
                    delivery: deliveryBoyId,
                    Date: new Date(),
                    timeIn: lastOnline,
                    timeOut: moment(new Date()).format('DD MMM YYYY hh:mm A'),
                    activeTotal: total,
                });
            }

            rider.liveStatus = 'offline';
            rider.isCashSettlementLimitReached = false;
            await rider.save();
        }

        successResponse(res, {
            message: 'Successfully created.',
            data: { ...responseObject, transaction: bobTrx },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.settlePayout = async (req, res) => {
    try {
        const adminId = req.adminId;
        const {
            payoutId,
            baseCurrency_payoutPaidAmount,
            baseCurrency_payoutPaidAmount_sc,
            secondaryCurrency_payoutPaidAmount,
            secondaryCurrency_payoutPaidAmount_bc,
            baseCurrency_riderTip,
            secondaryCurrency_riderTip,
            bobLocation,
        } = req.body;

        if (
            baseCurrency_payoutPaidAmount < 0 ||
            secondaryCurrency_payoutPaidAmount < 0
        ) {
            return errorResponse(res, 'Amount cannot be negative');
        }

        if (
            !baseCurrency_payoutPaidAmount &&
            !secondaryCurrency_payoutPaidAmount
        ) {
            return errorResponse(res, 'invalid amount');
        }

        const payout = await PayoutModel.findOne({
            _id: payoutId,
            payoutStatus: { $nin: ['paid'] },
        }).populate('shop deliveryBoy');

        if (!payout) {
            return errorResponse(res, 'payout not found');
        }

        const countryCode = '+961';
        const bobReferenceNumber = [];

        if (payout.payoutAccount === 'shop') {
            if (baseCurrency_payoutPaidAmount) {
                const bobData = {
                    ItemId: BoBItemId,
                    VenId: BoBVenId,
                    ProductId: BoBProductId,
                    B2CResult: {
                        Amount: baseCurrency_payoutPaidAmount.toString(),
                        ReceiverEmail: payout.shop.email,
                        ReceiverMobile: removeCountryCode(
                            payout.shop.phone_number
                        ),
                        ReceiverFirstName: payout.shop.shopName,
                        CompanyName: BoBCompanyName,
                        AccountNumber: '',
                        ReceiverLastName: payout.shop.name,
                        Currency: 'USD',
                    },
                    ChannelType: 'API',
                    Credentials: {
                        User: BoBUserNameApi,
                        Password: BoBPassword,
                    },
                };

                const { data } = await axios.post(
                    `${BoBurl}InjectTransactionalPayment`,
                    bobData,
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false,
                        }),
                    }
                );

                if (data.ErrorCode != 100)
                    return errorResponse(res, data.ErrorDescription);

                const { status, message, responseObject } =
                    await decompressedResponse(data.Response);

                if (!status) {
                    return errorResponse(res, message);
                }

                bobReferenceNumber.push(responseObject.TransactionReference);
                // Create BobFinancial Transaction
                const bobFinanceTrx = {
                    autoTrxId: `${moment().format(
                        'DDMMYYHmmss'
                    )}${short().new()}`,
                    account: 'shop',
                    type: 'settleShopPayout',
                    amount: baseCurrency_payoutPaidAmount,
                    secondaryCurrency_amount: baseCurrency_payoutPaidAmount_sc,
                    status: 'PAID',
                    admin: adminId,
                    shop: payout.shop._id,
                    seller: payout.shop.seller,
                    payout: payoutId,
                    bobModel: 'B2C',
                    bobType: 'outward',
                    referenceNumber: responseObject.TransactionReference,
                    bobLocation: bobLocation,
                    paidCurrency: 'baseCurrency',
                };

                const bobTrx = await BOBFinanceModel.create(bobFinanceTrx);
                await createSettlePayoutTransaction(bobTrx, payout);
            }
            if (secondaryCurrency_payoutPaidAmount) {
                const bobData = {
                    ItemId: BoBItemId,
                    VenId: BoBVenId,
                    ProductId: BoBProductId,
                    B2CResult: {
                        Amount: secondaryCurrency_payoutPaidAmount.toString(),
                        ReceiverEmail: payout.shop.email,
                        ReceiverMobile: removeCountryCode(
                            payout.shop.phone_number
                        ),
                        ReceiverFirstName: payout.shop.shopName,
                        CompanyName: BoBCompanyName,
                        AccountNumber: '',
                        ReceiverLastName: payout.shop.name,
                        Currency: 'LBP',
                    },
                    ChannelType: 'API',
                    Credentials: {
                        User: BoBUserNameApi,
                        Password: BoBPassword,
                    },
                };

                console.log(bobData);

                const { data } = await axios.post(
                    `${BoBurl}InjectTransactionalPayment`,
                    bobData,
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false,
                        }),
                    }
                );

                if (data.ErrorCode != 100)
                    return errorResponse(res, data.ErrorDescription);

                const { status, message, responseObject } =
                    await decompressedResponse(data.Response);

                if (!status) {
                    return errorResponse(res, message);
                }

                bobReferenceNumber.push(responseObject.TransactionReference);

                // Create BobFinancial Transaction
                const bobFinanceTrx = {
                    autoTrxId: `${moment().format(
                        'DDMMYYHmmss'
                    )}${short().new()}`,
                    account: 'shop',
                    type: 'settleShopPayout',
                    amount: secondaryCurrency_payoutPaidAmount_bc,
                    secondaryCurrency_amount:
                        secondaryCurrency_payoutPaidAmount,
                    status: 'PAID',
                    admin: adminId,
                    shop: payout.shop._id,
                    seller: payout.shop.seller,
                    payout: payoutId,
                    bobModel: 'B2C',
                    bobType: 'outward',
                    referenceNumber: responseObject.TransactionReference,
                    bobLocation: bobLocation,
                    paidCurrency: 'secondaryCurrency',
                };

                const bobTrx = await BOBFinanceModel.create(bobFinanceTrx);
                await createSettlePayoutTransaction(bobTrx, payout);
            }
        } else {
            if (baseCurrency_payoutPaidAmount) {
                const bobData = {
                    ItemId: BoBItemId,
                    VenId: BoBVenId,
                    ProductId: BoBProductId,
                    B2CResult: {
                        Amount: baseCurrency_payoutPaidAmount.toString(),
                        ReceiverEmail: payout.deliveryBoy.email,
                        ReceiverMobile: removeCountryCode(
                            payout.deliveryBoy.number
                        ),
                        ReceiverFirstName: payout.deliveryBoy.name,
                        CompanyName: BoBCompanyName,
                        AccountNumber: '',
                        ReceiverLastName: 'Rider',
                        Currency: 'USD',
                    },
                    ChannelType: 'API',
                    Credentials: {
                        User: BoBUserNameApi,
                        Password: BoBPassword,
                    },
                };

                const { data } = await axios.post(
                    `${BoBurl}InjectTransactionalPayment`,
                    bobData,
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false,
                        }),
                    }
                );

                if (data.ErrorCode != 100)
                    return errorResponse(res, data.ErrorDescription);

                const { status, message, responseObject } =
                    await decompressedResponse(data.Response);

                if (!status) {
                    return errorResponse(res, message);
                }

                bobReferenceNumber.push(responseObject.TransactionReference);

                // Create BobFinancial Transaction
                const bobFinanceTrx = {
                    autoTrxId: `${moment().format(
                        'DDMMYYHmmss'
                    )}${short().new()}`,
                    account: 'deliveryBoy',
                    type: 'settleRiderPayout',
                    amount: baseCurrency_payoutPaidAmount,
                    secondaryCurrency_amount: baseCurrency_payoutPaidAmount_sc,
                    status: 'PAID',
                    admin: adminId,
                    deliveryBoy: payout.deliveryBoy._id,
                    payout: payoutId,
                    bobModel: 'B2C',
                    bobType: 'outward',
                    referenceNumber: responseObject.TransactionReference,
                    bobLocation: bobLocation,
                    paidCurrency: 'baseCurrency',
                    riderTip: baseCurrency_riderTip,
                    secondaryCurrency_riderTip: secondaryCurrency_riderTip,
                };

                const bobTrx = await BOBFinanceModel.create(bobFinanceTrx);
                await createSettlePayoutTransaction(bobTrx, payout);
            }
            if (secondaryCurrency_payoutPaidAmount) {
                const bobData = {
                    ItemId: BoBItemId,
                    VenId: BoBVenId,
                    ProductId: BoBProductId,
                    B2CResult: {
                        Amount: secondaryCurrency_payoutPaidAmount.toString(),
                        ReceiverEmail: payout.deliveryBoy.email,
                        ReceiverMobile: removeCountryCode(
                            payout.deliveryBoy.number
                        ),
                        ReceiverFirstName: payout.deliveryBoy.name,
                        CompanyName: BoBCompanyName,
                        AccountNumber: '',
                        ReceiverLastName: 'Rider',
                        Currency: 'LBP',
                    },
                    ChannelType: 'API',
                    Credentials: {
                        User: BoBUserNameApi,
                        Password: BoBPassword,
                    },
                };

                const { data } = await axios.post(
                    `${BoBurl}InjectTransactionalPayment`,
                    bobData,
                    {
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false,
                        }),
                    }
                );

                if (data.ErrorCode != 100)
                    return errorResponse(res, data.ErrorDescription);

                const { status, message, responseObject } =
                    await decompressedResponse(data.Response);

                if (!status) {
                    return errorResponse(res, message);
                }

                bobReferenceNumber.push(responseObject.TransactionReference);

                // Create BobFinancial Transaction
                const bobFinanceTrx = {
                    autoTrxId: `${moment().format(
                        'DDMMYYHmmss'
                    )}${short().new()}`,
                    account: 'deliveryBoy',
                    type: 'settleRiderPayout',
                    amount: secondaryCurrency_payoutPaidAmount_bc,
                    secondaryCurrency_amount:
                        secondaryCurrency_payoutPaidAmount,
                    status: 'PAID',
                    admin: adminId,
                    deliveryBoy: payout.deliveryBoy._id,
                    payout: payoutId,
                    bobModel: 'B2C',
                    bobType: 'outward',
                    referenceNumber: responseObject.TransactionReference,
                    bobLocation: bobLocation,
                    paidCurrency: 'secondaryCurrency',
                    riderTip: baseCurrency_riderTip,
                    secondaryCurrency_riderTip: secondaryCurrency_riderTip,
                };

                const bobTrx = await BOBFinanceModel.create(bobFinanceTrx);
                await createSettlePayoutTransaction(bobTrx, payout);
            }
        }

        await PayoutModel.updateOne(
            { _id: payoutId },
            {
                $set: {
                    payoutStatus: 'paid',
                    baseCurrency_payoutPaidAmount,
                    secondaryCurrency_payoutPaidAmount,
                    bobReferenceNumber,
                },
            }
        );

        const updatedPayout = await PayoutModel.findById(payoutId).populate(
            'shop deliveryBoy'
        );

        return successResponse(res, {
            message: 'Successfully paid',
            data: {
                payout: updatedPayout,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const createSettlePayoutTransaction = async (trx, payout) => {
    try {
        if (trx.account === 'shop') {
            await TransactionModel.create({
                autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
                account: 'shop',
                type: 'adminSettlebalanceShop',
                status: 'success',
                shop: trx.shop,
                seller: trx.seller,
                amount: trx.amount,
                secondaryCurrency_amount: trx.secondaryCurrency_amount,
                adminBy: trx.admin,
                payout: trx.payout,
                paidCurrency: trx.paidCurrency,
                orderType: payout.shop.shopType,
                bobFinance: trx._id,
            });
        } else if (trx.account === 'deliveryBoy') {
            await TransactionModel.create({
                autoTrxId: `TNX${moment().format('DDMMYYHmm')}${short().new()}`,
                account: 'deliveryBoy',
                type: 'deliveryBoyAmountSettle',
                status: 'success',
                deliveryBoy: trx.deliveryBoy,
                amount: trx.amount,
                secondaryCurrency_amount: trx.secondaryCurrency_amount,
                adminBy: trx.admin,
                payout: trx.payout,
                riderTip: trx.riderTip,
                secondaryCurrency_riderTip: trx.secondaryCurrency_riderTip,
                paidCurrency: trx.paidCurrency,
                bobFinance: trx._id,
            });
        }
    } catch (error) {
        throw error;
    }
};

exports.updateBoBFinanceStatus = async (req, res) => {
    try {
        const notPaidBOBTrx = await BOBFinanceModel.find({
            status: 'NOT PAID',
        }).populate({ path: 'shop', select: 'shopType' });

        if (notPaidBOBTrx.length) {
            const createdAtDates = notPaidBOBTrx.map(
                item => new Date(item.createdAt)
            );
            // Find maximum and minimum dates
            const maxDate = new Date(Math.max(...createdAtDates));
            const minDate = new Date(Math.min(...createdAtDates));

            // Add 1 day to maxDate and subtract 1 day from minDate
            const oneDay = 24 * 60 * 60 * 1000; // 1 day in milliseconds
            const maxDatePlusOneDay = new Date(maxDate.getTime() + oneDay);
            const minDateMinusOneDay = new Date(minDate.getTime() - oneDay);

            const notPaidC2BTrx = notPaidBOBTrx.filter(
                item => item.bobModel === 'C2B'
            );

            if (notPaidC2BTrx.length) {
                const { responseObject: C2BTrx } = await this.GetTransfersFunc({
                    startDate: minDateMinusOneDay,
                    endDate: maxDatePlusOneDay,
                    Model: 'C2B',
                });

                console.log({ C2BTrx });

                await Promise.all(
                    notPaidC2BTrx.map(async trx => {
                        const findNotPaidReq = C2BTrx.some(
                            item =>
                                item.ReferenceNumber == trx.crmNumber &&
                                item.Status == 'NOT PAID'
                        );

                        console.log({ trx });
                        console.log({ findNotPaidReq });

                        if (!findNotPaidReq) {
                            await TransactionModel.create({
                                autoTrxId: `${moment().format(
                                    'DDMMYYHmm'
                                )}${short().new()}`,
                                account: 'deliveryBoy',
                                type: 'deliveryBoyAdminAmountReceivedCash',
                                status: 'success',
                                deliveryBoy: trx.deliveryBoy,
                                amount: trx.amount,
                                secondaryCurrency_amount:
                                    trx.secondaryCurrency_amount,
                                paidCurrency: trx.paidCurrency,
                                bobFinance: trx._id,
                            });

                            await BOBFinanceModel.findByIdAndUpdate(trx._id, {
                                $set: { status: 'PAID' },
                            });

                            await notifyAfterPaidBOBTrx(trx);
                        }
                    })
                );
            }

            const notPaidB2CTrx = notPaidBOBTrx.filter(
                item => item.bobModel === 'B2C'
            );

            if (notPaidB2CTrx.length) {
                const { responseObject: B2CTrx } = await this.GetTransfersFunc({
                    startDate: minDateMinusOneDay,
                    endDate: maxDatePlusOneDay,
                    Model: 'B2C',
                });

                console.log({ B2CTrx });

                await Promise.all(
                    notPaidB2CTrx.map(async trx => {
                        const findNotPaidReq = B2CTrx.some(
                            item =>
                                item.TransferNumber == trx.referenceNumber &&
                                item.Status == 'NOT PAID'
                        );

                        console.log({ trx });
                        console.log({ findNotPaidReq });

                        if (!findNotPaidReq) {
                            if (trx.account === 'shop') {
                                await TransactionModel.create({
                                    autoTrxId: `TNX${moment().format(
                                        'DDMMYYHmm'
                                    )}${short().new()}`,
                                    account: 'shop',
                                    type: 'adminSettlebalanceShop',
                                    status: 'success',
                                    shop: trx.shop._id,
                                    seller: trx.seller,
                                    amount: trx.amount,
                                    secondaryCurrency_amount:
                                        trx.secondaryCurrency_amount,
                                    adminBy: trx.admin,
                                    payout: trx.payout,
                                    paidCurrency: trx.paidCurrency,
                                    orderType: trx.shop.shopType,
                                    bobFinance: trx._id,
                                });
                            } else if (trx.account === 'deliveryBoy') {
                                await TransactionModel.create({
                                    autoTrxId: `TNX${moment().format(
                                        'DDMMYYHmm'
                                    )}${short().new()}`,
                                    account: 'deliveryBoy',
                                    type: 'deliveryBoyAmountSettle',
                                    status: 'success',
                                    deliveryBoy: trx.deliveryBoy,
                                    amount: trx.amount,
                                    secondaryCurrency_amount:
                                        trx.secondaryCurrency_amount,
                                    adminBy: trx.admin,
                                    payout: trx.payout,
                                    riderTip: trx.riderTip,
                                    secondaryCurrency_riderTip:
                                        trx.secondaryCurrency_riderTip,
                                    paidCurrency: trx.paidCurrency,
                                    bobFinance: trx._id,
                                });
                            }

                            await BOBFinanceModel.findByIdAndUpdate(trx._id, {
                                $set: { status: 'PAID' },
                            });
                        }
                    })
                );
            }
        }

        successResponse(res, {
            message: `Successfully updated`,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateBoBFinanceStatusForcefully = async (req, res) => {
    try {
        const { trxId } = req.body;

        const BOBTrx = await BOBFinanceModel.findById(trxId);

        if (!BOBTrx) return errorResponse(res, 'Bob transaction not found');

        if (BOBTrx.status === 'PAID')
            return errorResponse(res, 'Bob transaction is already paid');

        if (BOBTrx.type !== 'riderSettleCasInHand')
            return errorResponse(res, 'Bob transaction is not valid type');

        await TransactionModel.create({
            autoTrxId: `${moment().format('DDMMYYHmm')}${short().new()}`,
            account: 'deliveryBoy',
            type: 'deliveryBoyAdminAmountReceivedCash',
            status: 'success',
            deliveryBoy: BOBTrx.deliveryBoy,
            amount: BOBTrx.amount,
            secondaryCurrency_amount: BOBTrx.secondaryCurrency_amount,
            paidCurrency: BOBTrx.paidCurrency,
            bobFinance: BOBTrx._id,
        });

        BOBTrx.status = 'PAID';
        await BOBTrx.save();

        notifyAfterPaidBOBTrx(BOBTrx);

        successResponse(res, {
            message: `Successfully updated`,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
