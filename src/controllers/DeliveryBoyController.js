const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { verify } = require('jsonwebtoken');
const jwt = require('jsonwebtoken');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const ObjectId = require('mongoose').Types.ObjectId;
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const DeliveryBoyTracking = require('../models/DeliveryBoyTracking');
const DeliveryBoyTimeModel = require('../models/DeliveryBoyTimeModel');
const OrderModel = require('../models/OrderModel');
const AddressModel = require('../models/AddressModel');
const moment = require('moment');
const { getDeliveryBoyBalance } = require('../helpers/BalanceQuery');
const TransactionModel = require('../models/TransactionModel');
const AppSetting = require('../models/AppSetting');
const ZoneModel = require('../models/ZoneModel');
const ButlerModel = require('../models/ButlerModel');
const BOBFinanceModel = require('../models/BOBFinanceModel');
const FlagModel = require('../models/FlagModel');
const { getRiderCashInHand } = require('./FinancialController');
const Order = require('../models/OrderModel');
const DeliveryBoy = require('../models/DeliveryBoyModel');
const Butler = require('../models/ButlerModel');
const {
    checkNearByDeliveryBoy,
    notifyForRemoveRider,
    checkNearByDeliveryBoyForButler,
} = require('../config/socket');
const { getDistance } = require('../helpers/getDeliveryCharge');

//Get Delivery boy

exports.getDeliveryBoy = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            status,
            liveStatus,
            shift, // 'day' || 'night'
            zoneId,
            deliveryBoyType,
            shopId,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));
            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));
            const emailQ = newQuery.map(str => ({
                email: RegExp(str, 'i'),
            }));
            const numberQ = newQuery.map(str => ({
                number: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [
                            { $and: nameSearchQuery },
                            { $and: autoGenIdQ },
                            { $and: emailQ },
                            { $and: numberQ },
                        ],
                    },
                ],
            };
        }

        if (status && ['active', 'deactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status: status,
            };
        }

        if (liveStatus && ['online', 'offline'].includes(liveStatus)) {
            whereConfig = {
                ...whereConfig,
                liveStatus: liveStatus,
            };
        }

        if (shift && ['day', 'night'].includes(shift)) {
            whereConfig = {
                ...whereConfig,
                shift: shift,
            };
        }
        if (
            deliveryBoyType &&
            ['shopRider', 'dropRider'].includes(deliveryBoyType)
        ) {
            whereConfig = {
                ...whereConfig,
                deliveryBoyType: deliveryBoyType,
            };
        }
        if (zoneId) {
            whereConfig = {
                ...whereConfig,
                zone: ObjectId(zoneId),
            };
        }
        if (shopId) {
            whereConfig = {
                ...whereConfig,
                shop: ObjectId(shopId),
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: DeliveryBoyModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await DeliveryBoyModel.find(whereConfig)
            .sort(
                sortBy == 'createdAt'
                    ? { createdAt: 'desc' }
                    : { totalOrder: sortBy }
            )
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'flags',
                    populate: 'user orderId shop delivery',
                },
                {
                    path: 'address',
                },
                {
                    path: 'zone',
                },
                {
                    path: 'shop',
                },
            ]);

        const newList = [];

        for (const item of list) {
            const balance = await getDeliveryBoyBalance(item._id);

            const totalIncomeAllOver = await TransactionModel.aggregate([
                {
                    $match: {
                        deliveryBoy: ObjectId(item._id),
                        type: {
                            $in: [
                                'deliveryBoyOnlinePaymentReceived',
                                'adminBalanceAddToDeliveryBoy',
                                'deliveryBoyCashPaymentReceived',
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: '',
                        count: { $sum: 1 },
                        balance: { $sum: { $sum: ['$amount'] } },
                    },
                },
            ]);

            let totalIncome = 0;

            if (totalIncomeAllOver.length > 0) {
                totalIncome = totalIncomeAllOver[0].balance;
            }

            const totalFoodOrder = await OrderModel.countDocuments({
                deliveryBoy: item._id,
                orderStatus: 'delivered',
            });
            const totalButlerOrder = await ButlerModel.countDocuments({
                deliveryBoy: item._id,
                orderStatus: 'delivered',
            });
            const totalOrder = totalFoodOrder + totalButlerOrder;

            const readyOrders = await OrderModel.countDocuments({
                deliveryBoy: item._id,
                orderStatus: {
                    $in: ['ready_to_pickup', 'order_on_the_way'],
                },
            });

            const ongoingOrders = await OrderModel.countDocuments({
                deliveryBoy: item._id,
                orderStatus: {
                    $in: ['accepted_delivery_boy', 'preparing'],
                },
            });

            const butlers = await ButlerModel.countDocuments({
                deliveryBoy: item._id,
                orderStatus: {
                    $in: ['accepted_delivery_boy', 'order_on_the_way'],
                },
            });
            // For replacement order feature
            const replacementOrders = await OrderModel.countDocuments({
                deliveryBoy: item._id,
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
                isReplacementOrder: true,
                'replacementOrderDeliveryInfo.deliveryType':
                    'shop-customer-shop',
            });

            const availability =
                !readyOrders &&
                !butlers &&
                !replacementOrders &&
                ongoingOrders < 2
                    ? true
                    : false;

            // Calc rider weekly completed order
            const startOfWeek = moment(new Date()).startOf('isoWeek'); // Using the 'isoWeek' to consider Monday as the start of the isoWeek
            const endOfWeek = moment(new Date()).endOf('isoWeek');

            const riderWeeklyNormalOrder = await OrderModel.countDocuments({
                deliveryBoy: ObjectId(item._id),
                orderStatus: 'delivered',
                createdAt: {
                    $gte: startOfWeek,
                    $lte: endOfWeek,
                },
            });
            const riderWeeklyButlerOrder = await ButlerModel.countDocuments({
                deliveryBoy: ObjectId(item._id),
                orderStatus: 'delivered',
                createdAt: {
                    $gte: startOfWeek,
                    $lte: endOfWeek,
                },
            });
            const riderWeeklyOrder =
                riderWeeklyNormalOrder + riderWeeklyButlerOrder;

            newList.push({
                balance,
                totalIncome,
                ...item._doc,
                totalOrder,
                availability: availability,
                ongoingOrders,
                riderWeeklyOrder,
            });
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                deliveryBoys: newList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getDeliveryBoyCurrentLocation = async (req, res) => {
    try {
        const {
            searchKey,
            sortBy = 'desc',
            status,
            liveStatus,
            shift, // 'day' || 'night'
            zoneId,
            deliveryBoyType,
            type, // available, all
        } = req.query;

        let whereConfig = {
            deletedAt: null,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }, { $and: autoGenIdQ }],
                    },
                ],
            };
        }

        if (status && ['active', 'deactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status: status,
            };
        }

        if (liveStatus && ['online', 'offline'].includes(liveStatus)) {
            whereConfig = {
                ...whereConfig,
                liveStatus: liveStatus,
            };
        }

        if (shift && ['day', 'night'].includes(shift)) {
            whereConfig = {
                ...whereConfig,
                shift: shift,
            };
        }
        if (
            deliveryBoyType &&
            ['shopRider', 'dropRider'].includes(deliveryBoyType)
        ) {
            whereConfig = {
                ...whereConfig,
                deliveryBoyType: deliveryBoyType,
            };
        }
        if (zoneId) {
            whereConfig = {
                ...whereConfig,
                zone: ObjectId(zoneId),
            };
        }

        const list = await DeliveryBoyModel.find(whereConfig)
            .sort(
                sortBy == 'createdAt'
                    ? { createdAt: 'desc' }
                    : { totalOrder: sortBy }
            )
            .select('name image location');

        let newList = [];
        for (const deliveryBoy of list) {
            const orders = await OrderModel.find({
                deliveryBoy: deliveryBoy._id,
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
            });
            const butlers = await ButlerModel.find({
                deliveryBoy: deliveryBoy._id,
                orderStatus: {
                    $in: ['accepted_delivery_boy', 'order_on_the_way'],
                },
            });

            const ongoingOrders = orders.length + butlers.length;

            if (type === 'available') {
                let isAvailable = true;
                if (isAvailable && butlers.length) {
                    isAvailable = false;
                }
                if (isAvailable && orders.length >= 2) {
                    isAvailable = false;
                }

                if (isAvailable) {
                    newList.push({
                        ...deliveryBoy._doc,
                        ongoingOrders: ongoingOrders,
                    });
                }
            } else {
                newList.push({
                    ...deliveryBoy._doc,
                    ongoingOrders: ongoingOrders,
                });
            }
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                deliveryBoys: newList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getDeliveryBoyForShopApp = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            liveStatus,
            shift, // 'day' || 'night'
        } = req.query;

        const shopId = req.shopId;

        let whereConfig = {
            deletedAt: null,
            status: 'active',
            deliveryBoyType: 'shopRider',
            shop: ObjectId(shopId),
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }, { $and: autoGenIdQ }],
                    },
                ],
            };
        }

        if (liveStatus && ['online', 'offline'].includes(liveStatus)) {
            whereConfig = {
                ...whereConfig,
                liveStatus: liveStatus,
            };
        }

        if (shift && ['day', 'night'].includes(shift)) {
            whereConfig = {
                ...whereConfig,
                shift: shift,
            };
        }

        // let paginate = await pagination({
        //     page,
        //     pageSize,
        //     model: DeliveryBoyModel,
        //     condition: whereConfig,
        //     pagingRange: 5,
        // });

        const list = await DeliveryBoyModel.find(whereConfig)
            .sort(
                sortBy == 'createdAt'
                    ? { createdAt: 'desc' }
                    : { totalOrder: sortBy }
            )
            // .skip(paginate.offset)
            // .limit(paginate.limit)
            .populate([
                {
                    path: 'flags',
                    populate: 'user orderId shop delivery',
                },
                {
                    path: 'address',
                },
            ]);

        let newList = [];

        for (const item of list) {
            const riderOngoingOrders = await OrderModel.find({
                deliveryBoy: item._id,
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
            }).sort({ createdAt: 'desc' });

            if (riderOngoingOrders.length < 5) {
                newList.push({
                    ...item._doc,
                    availability: riderOngoingOrders.length ? false : true,
                });
            }
        }

        let paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: newList.length,
            pagingRange: 5,
        });

        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                deliveryBoys: newList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getShopDeliveryBoyForAssignInOrder = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            liveStatus,
            shift, // 'day' || 'night'
            shopId,
        } = req.query;

        let whereConfig = {
            deletedAt: null,
            status: 'active',
            deliveryBoyType: 'shopRider',
            shop: ObjectId(shopId),
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }, { $and: autoGenIdQ }],
                    },
                ],
            };
        }

        if (liveStatus && ['online', 'offline'].includes(liveStatus)) {
            whereConfig = {
                ...whereConfig,
                liveStatus: liveStatus,
            };
        }

        if (shift && ['day', 'night'].includes(shift)) {
            whereConfig = {
                ...whereConfig,
                shift: shift,
            };
        }

        const list = await DeliveryBoyModel.find(whereConfig)
            .sort(
                sortBy == 'createdAt'
                    ? { createdAt: 'desc' }
                    : { totalOrder: sortBy }
            )
            .populate([
                {
                    path: 'flags',
                    populate: 'user orderId shop delivery',
                },
                {
                    path: 'address',
                },
            ]);

        let newList = [];

        for (const item of list) {
            const riderOngoingOrders = await OrderModel.find({
                deliveryBoy: item._id,
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
            }).sort({ createdAt: 'desc' });

            if (riderOngoingOrders.length < 5) {
                newList.push({
                    ...item._doc,
                    availability: riderOngoingOrders.length ? false : true,
                });
            }
        }

        let paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: newList.length,
            pagingRange: 5,
        });

        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                deliveryBoys: newList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.addDeliveryBoyByAdmin = async (req, res) => {
    try {
        let {
            name,
            gender,
            dob,
            email,
            password,
            countryCode,
            number,
            image,
            address,
            nationalIdDocument,
            vehicleRegistrationDocument,
            vehicleType,
            vehicleNumber,
            contractImage,
            shift,
            zoneId,
            deliveryBoyType,
            shopId,
            deliveryBoyNationality,
            deliveryBoyEquipment,
            deliveryBoyEquipments,
            insurance,
            powerOfAttorney,
            proofOfResidence,
        } = req.body;

        if (!email) {
            return errorResponse(res, 'email is required');
        }

        if (!password) {
            return errorResponse(res, 'password is required');
        }

        //Check Number
        const numberExits = await DeliveryBoyModel.findOne({
            countryCode: countryCode,
            number: number,
            deletedAt: null,
        });
        if (numberExits) return errorResponse(res, 'Number already exist');

        //Check Email
        const emailExits = await DeliveryBoyModel.findOne({
            email: email,
            deletedAt: null,
        });

        if (emailExits) return errorResponse(res, 'Email already exist');

        //Check vehicleNumber
        const vehicleNumberExits = await DeliveryBoyModel.findOne({
            vehicleNumber: vehicleNumber,
            deletedAt: null,
        });

        if (vehicleNumberExits)
            return errorResponse(res, 'Vehicle number already exist');
        // password = await bcrypt.hash(password, 10);

        const deliveryBoy = await DeliveryBoyModel.create({
            name,
            gender,
            dob,
            email,
            password,
            countryCode,
            number,
            image,
            address: address,
            nationalIdDocument,
            vehicleRegistrationDocument,
            vehicleType,
            vehicleNumber,
            status: 'active',
            createBy: 'admin',
            contractImage,
            shift,
            zone: zoneId,
            deliveryBoyType,
            shop: shopId,
            deliveryBoyNationality,
            deliveryBoyEquipment,
            firstActiveAt: new Date(),
            deliveryBoyEquipments,
            insurance,
            powerOfAttorney,
            proofOfResidence,
        });

        const deliveryBoyFinal = await DeliveryBoyModel.findById(
            deliveryBoy._id
        );

        successResponse(res, {
            message: 'Successfully added',
            data: {
                deliveryBoyFinal,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addDeliveryBoy = async (req, res) => {
    try {
        let { name, email, password, number, contractPaper } = req.body;

        //Check Number
        const numberExits = await DeliveryBoyModel.findOne({
            number: number,
            deletedAt: null,
        });
        if (numberExits) return errorResponse(res, 'Number already exist');

        //Check Email
        const emailExits = await DeliveryBoyModel.findOne({
            email: email,
            deletedAt: null,
        });

        if (emailExits) return errorResponse(res, 'Email already exist');

        // password = await bcrypt.hash(password, 10);

        const deliveryBoy = await DeliveryBoyModel.create({
            name,
            email,
            password,
            number,
            contractPaper,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                deliveryBoy,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.updateDeliveryBoyByAdmin = async (req, res) => {
    try {
        let {
            id,
            name,
            gender,
            dob,
            email,
            password,
            status,
            countryCode,
            number,
            image,
            address,
            nationalIdDocument,
            vehicleRegistrationDocument,
            vehicleType,
            vehicleNumber,
            contractImage,
            isLogin,
            shift,
            zoneId,
            deliveryBoyNationality,
            deliveryBoyEquipment,
            deliveryBoyEquipments,
            insurance,
            powerOfAttorney,
            proofOfResidence,
        } = req.body;

        const delivery = await DeliveryBoyModel.findOne({ _id: id });

        if (!delivery) return errorResponse(res, 'Delivery boy not found');

        if (
            (status === 'deactive' && delivery.status === 'active') ||
            (!isLogin && delivery.isLogin)
        ) {
            const riderOngoingOrders = await OrderModel.countDocuments({
                deliveryBoy: id,
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
            });

            if (riderOngoingOrders > 0)
                return errorResponse(
                    res,
                    `Due to a ongoing order, you are unable to deactivate this rider.`
                );

            const riderOngoingButlerOrders = await ButlerModel.countDocuments({
                deliveryBoy: id,
                orderStatus: {
                    $in: ['accepted_delivery_boy', 'order_on_the_way'],
                },
            });

            if (riderOngoingButlerOrders > 0)
                return errorResponse(
                    res,
                    `Due to a ongoing order, you are unable to deactivate this rider.`
                );
        }

        if (number) {
            const phoneNumberExits = await DeliveryBoyModel.findOne({
                countryCode: countryCode,
                number: number,
                $nor: [{ _id: id }],
                deletedAt: null,
            });
            if (phoneNumberExits)
                return errorResponse(res, 'Phone number already exist');
        }

        if (email) {
            const emailExits = await DeliveryBoyModel.findOne({
                email: email,
                $nor: [{ _id: id }],
                deletedAt: null,
            });
            if (emailExits) return errorResponse(res, 'Email already exist');
        }

        if (vehicleNumber) {
            const vehicleNumberExits = await DeliveryBoyModel.findOne({
                vehicleNumber: vehicleNumber,
                $nor: [{ _id: id }],
                deletedAt: null,
            });
            if (vehicleNumberExits)
                return errorResponse(res, 'Vehicle number already exist');
        }

        const riderUpdatedData = {
            name,
            gender,
            dob,
            status,
            email,
            countryCode,
            number,
            image,
            address: address,
            nationalIdDocument,
            vehicleRegistrationDocument,
            vehicleType,
            vehicleNumber,
            contractImage,
            isLogin,
            shift,
            zone: zoneId,
            deliveryBoyNationality,
            deliveryBoyEquipment,
            deliveryBoyEquipments,
            insurance,
            powerOfAttorney,
            proofOfResidence,
        };

        if (password) {
            riderUpdatedData.password = await bcrypt.hash(password, 10);
            // riderUpdatedData.password = password;
        }

        if (status === 'active' && !delivery.firstActiveAt) {
            riderUpdatedData.firstActiveAt = new Date();
        }

        if (!isLogin) {
            if (delivery.liveStatus === 'online') {
                const lastOnline = delivery.lastOnline || new Date();

                const total = this.calcActiveTime(lastOnline, new Date());
                await DeliveryBoyTimeModel.create({
                    delivery: delivery._id,
                    Date: new Date(),
                    timeIn: lastOnline,
                    timeOut: moment(new Date()).format('DD MMM YYYY hh:mm A'),
                    activeTotal: total,
                });

                riderUpdatedData.liveStatus = 'offline';
            }

            riderUpdatedData.fcmToken = [];
        }

        await DeliveryBoyModel.updateOne(
            { _id: id },
            {
                $set: riderUpdatedData,
            }
        );

        const updatedDelivery = await DeliveryBoyModel.findById(id).select(
            '-password'
        );

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                delivery: updatedDelivery,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.activeDeliveryBoyByAdmin = async (req, res) => {
    try {
        const { id } = req.body;

        const delivery = await DeliveryBoyModel.findOne({ _id: id });

        if (!delivery) return errorHandler(res, 'Delivery boy not found');

        let firstActiveAt = delivery.firstActiveAt;
        if (!delivery.firstActiveAt) {
            firstActiveAt = new Date();
        }

        await DeliveryBoyModel.updateOne(
            { _id: id },
            {
                $set: {
                    status: 'active',
                    firstActiveAt,
                },
            }
        );
        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                delivery: updatedDelivery,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Update Delivery

exports.updateDeliveryBoy = async (req, res) => {
    try {
        const errorValidation = validationResult(req);
        if (!errorValidation.isEmpty()) {
            const errors = errorValidation.array();
            return validationError(res, errors[0].msg);
        }
        const {
            id,
            name,
            email,
            number,
            countryCode,
            password,
            status,
            contractPaper,
        } = req.body;

        const delivery = await DeliveryBoyModel.findOne({ _id: id });

        if (!delivery) return errorHandler(res, 'Delivery boy not found');

        if (number) {
            const phoneNumberExits = await DeliveryBoyModel.findOne({
                countryCode: countryCode,
                number: number,
                $nor: [{ _id: id }],
                deletedAt: null,
            });
            if (phoneNumberExits)
                return errorResponse(res, 'Phone number already exist');
        }

        if (email) {
            const emailExits = await DeliveryBoyModel.findOne({
                email: email,
                $nor: [{ _id: id }],
                deletedAt: null,
            });
            if (emailExits) return errorResponse(res, 'Email already exist');
        }

        const data = {
            name,
            email,
            number,
            password,
            status,
            contractPaper,
        };

        if (password) {
            const pass = await bcrypt.hash(password, 10);
            data.password = pass;
        }

        await DeliveryBoyModel.updateOne(
            { _id: id },
            {
                $set: data,
            }
        );

        const updatedDelivery = await DeliveryBoyModel.findById(id);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                delivery: updatedDelivery,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Delete Delivery

exports.deleteDeliveryBoyById = async (req, res) => {
    try {
        const { id } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(200).json({
                status: false,
                message: 'id is invalid',
            });
        }

        const delivery = await DeliveryBoyModel.findOne({
            _id: id,
            deletedAt: null,
        });

        if (!delivery) {
            return res.status(200).json({
                status: false,
                message: 'Rider not found',
            });
        }

        const riderOngoingOrders = await OrderModel.countDocuments({
            deliveryBoy: id,
            orderStatus: {
                $in: [
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
        });

        if (riderOngoingOrders > 0)
            return errorResponse(
                res,
                `Due to a ongoing order, you are unable to delete this rider.`
            );

        const riderOngoingButlerOrders = await ButlerModel.countDocuments({
            deliveryBoy: id,
            orderStatus: {
                $in: ['accepted_delivery_boy', 'order_on_the_way'],
            },
        });

        if (riderOngoingButlerOrders > 0)
            return errorResponse(
                res,
                `Due to a ongoing order, you are unable to delete this rider.`
            );

        await DeliveryBoyModel.updateOne(
            { _id: id },
            { deletedAt: new Date(), status: 'deactive', liveStatus: 'offline' }
        );

        return res.status(200).json({
            status: true,
            message: 'Rider Successfully Deleted',
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message,
        });
    }
};

exports.getCurrentLocation = async (req, res) => {
    try {
        const { deliveryBoyId } = req.query;

        const deliveryBoy = await DeliveryBoyModel.findById(deliveryBoyId);

        if (!deliveryBoy) return errorResponse(res, 'delivery boy not found');

        return successResponse(res, {
            message: 'Successfully get current location',
            data: {
                location: deliveryBoy.location,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleDeliveryBoyDetailsForAdmin = async (req, res) => {
    const deliveryBoyId = req.query.id;

    if (!deliveryBoyId) return errorResponse(res, 'DeliveryBoyId is required.');

    if (!ObjectId.isValid(deliveryBoyId)) {
        return errorResponse(res, 'deliveryBoyId is invalid');
    }

    const delivery = await DeliveryBoyModel.findById(deliveryBoyId)
        .populate([
            {
                path: 'flags',
                populate: 'user orderId shop delivery',
            },
            {
                path: 'address',
            },
            {
                path: 'zone',
            },
        ])
        .select('-password')
        .lean();

    if (!delivery) return errorResponse(res, 'Delivery Boy not found');

    const balance = await getDeliveryBoyBalance(deliveryBoyId);

    const totalIncomeAllOver = await TransactionModel.aggregate([
        {
            $match: {
                deliveryBoy: ObjectId(deliveryBoyId),
                type: {
                    $in: [
                        'deliveryBoyOnlinePaymentReceived',
                        'adminBalanceAddToDeliveryBoy',
                        'deliveryBoyCashPaymentReceived',
                    ],
                },
            },
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                balance: { $sum: { $sum: ['$amount'] } },
            },
        },
    ]);

    let totalIncome = 0;

    if (totalIncomeAllOver.length > 0) {
        totalIncome = totalIncomeAllOver[0].balance;
    }

    const totalFoodOrder = await OrderModel.countDocuments({
        deliveryBoy: deliveryBoyId,
        orderStatus: 'delivered',
    });
    const totalButlerOrder = await ButlerModel.countDocuments({
        deliveryBoy: deliveryBoyId,
        orderStatus: 'delivered',
    });
    const totalOrder = totalFoodOrder + totalButlerOrder;

    const readyOrders = await OrderModel.countDocuments({
        deliveryBoy: deliveryBoyId,
        orderStatus: {
            $in: ['ready_to_pickup', 'order_on_the_way'],
        },
    });

    const ongoingOrders = await OrderModel.countDocuments({
        deliveryBoy: deliveryBoyId,
        orderStatus: {
            $in: ['accepted_delivery_boy', 'preparing'],
        },
    });

    const butlers = await ButlerModel.countDocuments({
        deliveryBoy: deliveryBoyId,
        orderStatus: {
            $in: ['accepted_delivery_boy', 'order_on_the_way'],
        },
    });
    // For replacement order feature
    const replacementOrders = await OrderModel.countDocuments({
        deliveryBoy: deliveryBoyId,
        orderStatus: {
            $in: [
                'accepted_delivery_boy',
                'preparing',
                'ready_to_pickup',
                'order_on_the_way',
            ],
        },
        isReplacementOrder: true,
        'replacementOrderDeliveryInfo.deliveryType': 'shop-customer-shop',
    });

    const availability =
        !readyOrders && !butlers && !replacementOrders && ongoingOrders < 2
            ? true
            : false;

    successResponse(res, {
        message: 'Successfully find Delivery boy',
        data: {
            delivery: {
                totalOrder,
                balance,
                totalIncome,
                ...delivery,
                availability,
                ongoingOrders,
            },
            summery: {},
        },
    });
};

// // Delivery boy signup app

exports.deliveryBoySignUpFromDeliveryApp = async (req, res) => {
    try {
        let {
            name,
            gender, // not required
            dob, // not required
            email,
            number,
            countryCode,
            image,
            address,
            vehicleType,
            vehicleNumber,
            password,
            nationalIdDocument,
            vehicleRegistrationDocument,
            contractImage,
            zoneId,
            deliveryBoyType,
            shopId,
            deliveryBoyNationality,
        } = req.body;

        // gender / date of birth

        if (!name) return errorResponse(res, 'Name is required');
        if (!email) return errorResponse(res, 'Email is required');
        if (!number) return errorResponse(res, 'Phone number is required');
        if (!password) return errorResponse(res, 'Password is required');
        if (!nationalIdDocument)
            return errorResponse(res, 'National ID is required');
        if (!vehicleRegistrationDocument)
            return errorResponse(
                res,
                'Vehicle Registration Document is required'
            );
        if (!contractImage)
            return errorResponse(res, 'Contract Image is required');
        if (!vehicleType) return errorResponse(res, 'Vehicle Type is required');
        if (!vehicleNumber)
            return errorResponse(res, 'Vehicle Number is required');
        if (!address) return errorResponse(res, 'Address is required');
        if (!countryCode) return errorResponse(res, 'Country Code is required');
        if (!image) return errorResponse(res, 'Image is required');

        email = email.toLowerCase();

        const emailExits = await DeliveryBoyModel.findOne({
            email: email,
            deletedAt: null,
        });

        if (emailExits)
            return errorResponse(res, 'email is already in use try another');

        const vehicleNumberExits = await DeliveryBoyModel.findOne({
            vehicleNumber: vehicleNumber,
            deletedAt: null,
        });

        if (vehicleNumberExits)
            return errorResponse(
                res,
                'vehicleNumber is already in use try another'
            );

        const phoneNumberExits = await DeliveryBoyModel.findOne({
            countryCode: countryCode,
            number: number,
            deletedAt: null,
        });

        if (phoneNumberExits)
            return errorResponse(
                res,
                'phone number is already in use try another'
            );

        if (gender) {
            if (!['male', 'female'].includes(gender)) {
                return errorResponse('give wrong gender');
            }
        }

        let createData = {
            name,
            gender, // not required
            dob, // not required
            email,
            number,
            countryCode,
            image,
            address,
            vehicleType,
            vehicleNumber,
            password,
            nationalIdDocument,
            vehicleRegistrationDocument,
            contractImage,
            status: 'deactive',
            createBy: 'deliveryBoy',
            zone: zoneId,
            deliveryBoyType,
            shop: shopId,
            deliveryBoyNationality,
        };

        if (gender) {
            createData = {
                ...createData,
                gender,
            };
        }

        if (dob) {
            createData = {
                ...createData,
                dob,
            };
        }

        const delivery = await DeliveryBoyModel.create(createData);

        successResponse(res, {
            message: 'successfully create',
            data: {
                delivery,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// //Delivery sign in app

exports.signInFromDeliveryApp = async (req, res) => {
    try {
        let { email, password, lastLoginDeviceId } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email or password is required');
        }

        email = email.toLowerCase();

        const delivery = await DeliveryBoyModel.findOne({
            email: email,
            deletedAt: null,
        })
            .populate('zone')
            .select('-createdAt -updatedAt');

        if (!delivery) {
            return errorResponse(res, 'Email or password is wrong');
        }

        if (
            delivery.isLogin &&
            delivery.lastLoginDeviceId !== lastLoginDeviceId
        ) {
            return errorResponse(
                res,
                'Your account is already logged in. Please contact Support'
            );
        }

        // if (!delivery) {
        //     return errorResponse(res, 'user not found . please sign up first');
        // }

        if (delivery.status === 'blocked') {
            return errorResponse(
                res,
                'Your account is blocked. Please contact Support'
            );
        }

        if (delivery.status === 'deactive') {
            return errorResponse(
                res,
                'Your account is deactive. Please contact Support'
            );
        }

        const matchPassword = bcrypt.compareSync(password, delivery.password);

        if (!matchPassword) {
            return errorResponse(res, 'Wrong password.');
        }

        const jwtData = {
            deliveryBoyId: delivery._id,
            id: delivery._id,
            name: delivery.name,
            time: new Date(),
        };

        const token = jwt.sign(
            jwtData,
            process.env.JWT_PRIVATE_KEY_DELIVERY_BOY,
            {}
        );

        delete delivery._doc.password;
        // delete delivery._doc._id;

        await DeliveryBoyModel.updateOne(
            { email: email, deletedAt: null },
            {
                lastLogin: new Date(),
                isLogin: true,
                lastLoginDeviceId,
            }
        );

        successResponse(res, {
            message: 'Login Success.',
            data: {
                deliveryBoy: {
                    token,
                    ...delivery._doc,
                },
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

// Get Address

exports.getAddress = async (req, res) => {
    try {
        const { id } = req.query;

        const deliveryBoyAddress = await AddressModel.findOne({
            deliveryBoyAddress: id,
        });

        if (!deliveryBoyAddress)
            return errorResponse(res, 'Delivery boy Address not found');

        successResponse(res, {
            message: 'Find address',
            data: {
                deliveryBoyAddress,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// Update Delivery boy address
exports.useSignUpFromDeliveryApp = async (req, res) => {
    try {
        const {
            name,
            gender,
            dob,
            email,
            password,
            number,
            status,
            national_id,
            vehicle_data,
            vehicle_number,
        } = req.body;

        if (
            !name ||
            !gender ||
            !email ||
            !password ||
            !national_id ||
            !vehicle_data ||
            !vehicle_number ||
            !number
        ) {
            return errorResponse(res, 'validation error');
        }

        const emailExits = await DeliveryBoyModel.findOne({
            email: email,
            deletedAt: null,
        });

        if (emailExits)
            return errorResponse(res, 'email is already in use try another');

        const deliveryBoy = await DeliveryBoyModel.create({
            name,
            gender,
            dob: new Date(dob),
            email,
            password,
            number,
            status,
            national_id,
            vehicle_data,
            vehicle_number,
            vehicle_type: 'Motor Cycle',
        });

        const jwtData = {
            deliveryBoyId: deliveryBoy._id,
            id: deliveryBoy._id,
            name: deliveryBoy.name,
        };

        //         console.log(jwtData);

        const token = jwt.sign(
            jwtData,
            process.env.JWT_PRIVATE_KEY_DELIVERY_BOY,
            {}
        );

        delete deliveryBoy._doc.password;
        delete deliveryBoy._doc._id;

        successResponse(res, {
            message: 'Login Success.',
            data: {
                user: {
                    token,
                    ...deliveryBoy._doc,
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.useSignInFromDeliveryApp = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email or password is required');
        }

        const deliveryBoy = await DeliveryBoyModel.findOne({
            email: email,
            deletedAt: null,
        }).select('-createdAt -updatedAt');

        if (!deliveryBoy) {
            return errorResponse(
                res,
                'delivery boy not found . please sign up first'
            );
        }

        if (deliveryBoy.status === 'blocked') {
            return errorResponse(
                res,
                'Your account is blocked. Please contact Support'
            );
        }

        const matchPassword = bcrypt.compareSync(
            password,
            deliveryBoy.password
        );

        if (!matchPassword) {
            return errorResponse(res, 'Wrong password.');
        }

        const jwtData = {
            deliverBoyId: deliveryBoy._id,
            id: deliveryBoy._id,
            name: deliveryBoy.name,
        };

        // console.log(jwtData);

        const token = jwt.sign(
            jwtData,
            process.env.JWT_PRIVATE_KEY_DELIVERY_BOY,
            {}
        );

        // delete deliveryBoy._doc.password;
        // delete deliveryBoy._doc._id;

        successResponse(res, {
            message: 'Login Success.',
            data: {
                deliveryBoy: {
                    token,
                    ...deliveryBoy._doc,
                },
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getSingleDeliveryBoyDetailsForDeliveryBoy = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;
        // console.log(deliveryBoyId);

        const delivery = await DeliveryBoyModel.findById(deliveryBoyId)
            .populate('zone')
            .select('-password')
            .lean();

        if (!delivery) return errorResponse(res, 'Delivery Boy not found');

        //*** Check rider cash settlement limit ***/
        const appSetting = await AppSetting.findOne({}).select(
            'riderBOBCashSettlementLimit'
        );
        const riderBOBCashSettlementLimit =
            appSetting?.riderBOBCashSettlementLimit || 0;

        if (riderBOBCashSettlementLimit > 0) {
            const findRiderOngoingOrders = await OrderModel.countDocuments({
                deliveryBoy: ObjectId(deliveryBoyId),
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
            });

            const { riderCashInHand } = await getRiderCashInHand({
                riderId: deliveryBoyId,
            });

            if (!delivery.isCashSettlementLimitReached) {
                if (
                    findRiderOngoingOrders < 1 &&
                    riderCashInHand >= riderBOBCashSettlementLimit
                ) {
                    if (delivery.liveStatus !== 'offline') {
                        const lastOnline = delivery.lastOnline || new Date();
                        const total = calcActiveTime(lastOnline, new Date());

                        await DeliveryBoyTimeModel.create({
                            delivery: deliveryBoyId,
                            Date: new Date(),
                            timeIn: lastOnline,
                            timeOut: moment(new Date()).format(
                                'DD MMM YYYY hh:mm A'
                            ),
                            activeTotal: total,
                        });

                        await DeliveryBoyModel.findByIdAndUpdate(
                            deliveryBoyId,
                            {
                                $set: {
                                    liveStatus: 'offline',
                                    isCashSettlementLimitReached: true,
                                },
                            }
                        );

                        delivery.liveStatus = 'offline';
                        delivery.isCashSettlementLimitReached = true;
                    }
                }
            } else if (riderCashInHand < riderBOBCashSettlementLimit) {
                await DeliveryBoyModel.findByIdAndUpdate(deliveryBoyId, {
                    $set: { isCashSettlementLimitReached: false },
                });

                delivery.isCashSettlementLimitReached = false;
            }
        }
        //*** Check rider cash settlement limit end ***/

        let lastLogin = new Date();
        // update profile data
        await DeliveryBoyModel.updateOne(
            { _id: deliveryBoyId },
            {
                $set: {
                    lastLogin,
                },
            }
        );

        successResponse(res, {
            message: 'Successfully find Delivery boy',
            data: {
                delivery,
                lastLogin: {
                    time: moment(lastLogin).format('hh:mm A'),
                    date: moment(lastLogin).format('DD MMM YYYY'),
                    dateTime: moment(lastLogin).format('DD MMM YYYY hh:mm A'),
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.checkDeliveryBoyLoginStatus = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const delivery = await DeliveryBoyModel.findById(deliveryBoyId)
            .select('isLogin status')
            .lean();

        // console.log(delivery);
        // if (!delivery) return errorResponse(res, 'Delivery Boy not found');

        const forceLogout =
            !delivery ||
            delivery?.isLogin === false ||
            delivery?.status === 'deactive'
                ? true
                : false;

        successResponse(res, {
            message: 'Successfully find delivery boy status',
            data: {
                forceLogout,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteDeliveryBoy = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const riderOngoingOrders = await OrderModel.countDocuments({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: [
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
        });

        if (riderOngoingOrders > 0)
            return errorResponse(
                res,
                `Due to a ongoing order, you are unable to delete your account.`
            );

        const riderOngoingButlerOrders = await ButlerModel.countDocuments({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: ['accepted_delivery_boy', 'order_on_the_way'],
            },
        });

        if (riderOngoingButlerOrders > 0)
            return errorResponse(
                res,
                `Due to a ongoing order, you are unable to delete your account.`
            );

        // update profile data
        await DeliveryBoyModel.updateOne(
            { _id: deliveryBoyId },
            {
                $set: {
                    deletedAt: new Date(),
                    status: 'deactive',
                    liveStatus: 'offline',
                },
            }
        );

        return successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deliveryBoyProfileUpdateFromDeliveryBoyApp = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const {
            name,
            gender,
            dob,
            email,
            number,
            countryCode,
            image,
            address,
            vehicleType,
            vehicleNumber,
        } = req.body;

        const delivery = await DeliveryBoyModel.findById(deliveryBoyId)
            .select('-password')
            .lean();

        if (!delivery) return errorResponse(res, 'Delivery Boy not found');

        let updateDate = {};

        if (number) {
            const phoneNumberExits = await DeliveryBoyModel.findOne({
                countryCode: countryCode,
                number: number,
                $nor: [{ _id: deliveryBoyId }],
                deletedAt: null,
            });
            if (phoneNumberExits)
                return errorResponse(res, 'Phone number already exist');

            updateDate = {
                ...updateDate,
                number,
            };

            if (countryCode) {
                updateDate = {
                    ...updateDate,
                    countryCode,
                };
            } else {
                return errorResponse(res, 'Country code is required');
            }
        }

        if (email) {
            const emailExits = await DeliveryBoyModel.findOne({
                email: email,
                $nor: [{ _id: deliveryBoyId }],
                deletedAt: null,
            });
            if (emailExits) return errorResponse(res, 'Email already exist');
        }

        if (name) {
            updateDate = {
                ...updateDate,
                name,
            };
        }

        if (gender) {
            if (['male', 'female'].includes(gender)) {
                updateDate = {
                    ...updateDate,
                    gender,
                };
            } else {
                errorResponse(res, 'wrong gender type give male & female');
            }
        }

        if (dob) {
            updateDate = {
                ...updateDate,
                dob,
            };
        }

        if (vehicleNumber) {
            const vehicleNumberExits = await DeliveryBoyModel.findOne({
                vehicleNumber: vehicleNumber,
                $nor: [{ _id: deliveryBoyId }],
                deletedAt: null,
            });
            if (vehicleNumberExits)
                return errorResponse(res, 'Vehicle number already exist');

            updateDate = {
                ...updateDate,
                vehicleNumber,
            };
        }

        if (vehicleType) {
            updateDate = {
                ...updateDate,
                vehicleType,
            };
        }

        if (address) {
            updateDate = {
                ...updateDate,
                address,
            };
        }

        if (image) {
            updateDate = {
                ...updateDate,
                image,
            };
        }

        await DeliveryBoyModel.updateOne(
            {
                _id: deliveryBoyId,
            },
            updateDate
        );

        const data = await DeliveryBoyModel.findById(deliveryBoyId)
            .select('-password')
            .lean();

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                deliveryBoy: data,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateDeliveryBoyFcmToken = async (req, res) => {
    try {
        const id = req.deliveryBoyId;
        const { fcmToken } = req.body;

        const deliverBoy = await DeliveryBoyModel.findById(id);

        const isMatchFcmToken = deliverBoy?.fcmToken?.includes(fcmToken);

        if (!isMatchFcmToken) {
            await DeliveryBoyModel.updateOne(
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
exports.removeDeliveryBoyFcmToken = async (req, res) => {
    try {
        const id = req.deliveryBoyId;
        const { fcmToken } = req.body;

        const isExist = await DeliveryBoyModel.findById(id);
        if (!isExist)
            successResponse(res, {
                message: 'Rider not found',
            });

        const riderOngoingOrders = await OrderModel.countDocuments({
            deliveryBoy: id,
            orderStatus: {
                $in: [
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
        });

        if (riderOngoingOrders > 0)
            return errorResponse(
                res,
                `Due to a ongoing order, you are unable to logout.`
            );

        const riderOngoingButlerOrders = await ButlerModel.countDocuments({
            deliveryBoy: id,
            orderStatus: {
                $in: ['accepted_delivery_boy', 'order_on_the_way'],
            },
        });

        if (riderOngoingButlerOrders > 0)
            return errorResponse(
                res,
                `Due to a ongoing order, you are unable to logout.`
            );

        if (fcmToken) {
            await DeliveryBoyModel.updateOne(
                { _id: id },
                {
                    $pull: {
                        fcmToken: fcmToken,
                    },
                }
            );
        }

        if (isExist.liveStatus !== 'offline') {
            const lastOnline = isExist.lastOnline || new Date();

            const total = this.calcActiveTime(lastOnline, new Date());
            await DeliveryBoyTimeModel.create({
                delivery: id,
                Date: new Date(),
                timeIn: lastOnline,
                timeOut: moment(new Date()).format('DD MMM YYYY hh:mm A'),
                activeTotal: total,
            });
        }

        await DeliveryBoyModel.updateOne(
            { _id: id },
            {
                isLogin: false,
                liveStatus: 'offline',
            }
        );

        successResponse(res, {
            message: 'remove fcm token successfully',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateDeliveryBoyStatusFromApp = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        const deliveryBoyId = req.deliveryBoyId;

        const delivery = await DeliveryBoyModel.findById(deliveryBoyId)
            .populate('zone')
            .select('-password')
            .lean();

        if (!delivery) return errorResponse(res, 'Rider not found');

        if (delivery.liveStatus === 'offline') {
            const riderNotPaidBOBTrx = await BOBFinanceModel.countDocuments({
                account: 'deliveryBoy',
                type: 'riderSettleCasInHand',
                deliveryBoy: ObjectId(deliveryBoyId),
                status: 'NOT PAID',
            });

            if (riderNotPaidBOBTrx > 0)
                return errorResponse(res, 'Rider have unpaid bob request');
        }

        let currentStatus =
            delivery.liveStatus === 'online' ? 'offline' : 'online';

        // delivery.lastOnline assign if delivery.lastOnline is null or undefined
        let lastOnline = delivery.lastOnline || new Date();

        if (currentStatus === 'offline') {
            const total = this.calcActiveTime(lastOnline, new Date());
            // console.log('total', total);
            await DeliveryBoyTimeModel.create({
                delivery: deliveryBoyId,
                Date: new Date(),
                timeIn: lastOnline,
                timeOut: moment(new Date()).format('DD MMM YYYY hh:mm A'),
                activeTotal: total,
            });
        } else {
            await DeliveryBoyModel.updateOne(
                { _id: deliveryBoyId },
                {
                    $set: {
                        lastOnline: moment(new Date()).format(
                            'DD MMM YYYY hh:mm A'
                        ),
                    },
                }
            );
        }

        await DeliveryBoyTracking.create({
            delivery: deliveryBoyId,
            latitude,
            longitude,
            status: currentStatus,
            time: new Date(),
        });
        // update profile data
        await DeliveryBoyModel.updateOne(
            { _id: deliveryBoyId },
            {
                $set: {
                    liveStatus: currentStatus,
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    lastLocationUpdateAt: new Date(),
                },
            }
        );

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                online: currentStatus == 'online' ? true : false,
                deliveryBoy: currentStatus,
                zone: delivery.zone,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.calcActiveTime = (inTime, outTime) => {
    const format = 'YYYY-MM-DD H:mm:ss';
    const currentDate = moment(inTime).format(format);
    const recevingDate = moment(new Date(outTime)).format(format);
    const differ = new Date(recevingDate) - new Date(currentDate);
    let minutes = parseInt(differ / (1000 * 60));

    return minutes;

    // console.log(inTime, outTime);
    // const startTime = moment(inTime, 'HH:mm a');
    // const endTime = moment(outTime, 'HH:mm a');
    // const duration = moment.duration(endTime.diff(startTime));
    // const hours = parseInt(duration.asHours());
    // const minutes = parseInt(duration.asMinutes()) % 60;

    // return `${hours > 0 ? `${hours}` : 0}:${minutes}`;
};

exports.getDeliveryBoyTimeOutForAdmin = async (req, res) => {
    try {
        const {
            id,
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'desc',
            pagingRange = 5,
            startDate,
            endDate,
        } = req.query;

        let whereConfig = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                name: RegExp(str, 'i'),
            }));
            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }],
                    },
                ],
            };
        }

        if (id) {
            whereConfig = {
                ...whereConfig,
                delivery: id,
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

        let paginate = await pagination({
            page,
            pageSize,
            model: DeliveryBoyTimeModel,
            condition: whereConfig,
            pagingRange,
        });

        const getTotalTime = await getTotalTimes(whereConfig);

        const activity = await DeliveryBoyTimeModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate('delivery');

        successResponse(res, {
            message: 'Successfully get',
            data: {
                getTotalTime,
                activity,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

function timeConvert(n) {
    var num = n;
    var hours = num / 60;
    var rhours = Math.floor(hours);
    var minutes = (hours - rhours) * 60;
    var rminutes = Math.round(minutes);
    return {
        hour: rhours,
        minutes: rminutes,
    };
}

const getTotalTimes = async config => {
    const totalTime = await DeliveryBoyTimeModel.aggregate([
        {
            $match: config,
        },
        {
            $group: {
                _id: '',
                totalMinites: {
                    $sum: {
                        $divide: [
                            { $subtract: ['$timeOut', '$timeIn'] },
                            1000 * 60,
                        ],
                    },
                },
            },
        },
    ]);

    let time = timeConvert(totalTime[0]?.totalMinites || 0);

    return time;
};

exports.getLastLoginForAdmin = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        let lastLogin = new Date();

        // update profile data
        await DeliveryBoyModel.updateOne(
            { _id: deliveryBoyId },
            {
                $set: {
                    lastLogin,
                },
            }
        );

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                lastLogin: {
                    time: moment(lastLogin).format('hh:mm A'),
                    date: moment(lastLogin).format('DD MMM YYYY'),
                    dateTime: moment(lastLogin).format('DD MMM YYYY hh:mm A'),
                },
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.orderHistoryForDeliveryBoy = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;
        // console.log(deliveryBoyId);

        // {orderStatus: "preparing" , orderStatus: "ready_to_pickup", orderStatus: "order_on_the_way"
        const activeOrders = await OrderModel.find({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: ['preparing', 'ready_to_pickup', 'order_on_the_way'],
            },
        });
        const pastOrders = await OrderModel.find({
            deliveryBoy: deliveryBoyId,
            orderStatus: 'delivered',
        });
        const newOrders = await OrderModel.find({
            deliveryBoy: deliveryBoyId,
            orderStatus: 'placed',
        });

        successResponse(res, {
            message: 'successfully find',
            data: {
                activeOrders,
                pastOrders,
                newOrders,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.pastOrderFilterForDeliveryBoy = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;
        const { fromDate, toDate, shopId } = req.query;

        let whereConfig = {
            deliveryBoy: deliveryBoyId,
            orderStatus: 'delivered',
            createdAt: {
                $gte: moment(new Date(fromDate)),
                $lte: moment(new Date(toDate)),
            },
        };

        if (shopId) {
            whereConfig = {
                ...whereConfig,
                shop: shopId,
            };
        }

        const pastOrders = await OrderModel.find(whereConfig);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                pastOrders,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getDeliveryBoyPastShops = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        let getShops = OrderModel.find({ deliveryBoy: deliveryBoyId }).distinct(
            'shop'
        );
        let list = await getShops.populate([
            {
                path: 'shop',
            },
        ]);

        successResponse(res, {
            message: 'Successfully get',
            data: {
                list,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.changePasswordForDeliveryApp = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return errorResponse(
                res,
                'currentPassword and newPassword is required'
            );
        }

        const rider = await DeliveryBoyModel.findById(deliveryBoyId);

        if (!rider) {
            return errorResponse(res, 'Rider not found.');
        }

        const matchPassword = bcrypt.compareSync(
            currentPassword,
            rider.password
        );

        if (!matchPassword) {
            return errorResponse(res, 'Current password is wrong.');
        }

        const password = await bcrypt.hash(newPassword, 10);

        await DeliveryBoyModel.updateOne(
            { _id: deliveryBoyId },
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

// exports.addDeliveryBoyBalanceByAdmin = async (req, res) => {
//     try {
//         const { deliveryBoyId, amount, userNote, adminNote, remark } = req.body;
//         const boy = await DeliveryBoyModel.findById(deliveryBoyId);
//         if (!boy) return errorResponse(res, 'DeliveryBoy not found');

//         const transaction = await TransactionModel.create({
//             deliveryBoy: deliveryBoyId,
//             amount,
//             userNote,
//             adminNote,
//             account: 'deliveryBoy',
//             type: 'adminBalanceAddToDeliveryBoy',
//             status: 'success',
//             remark,
//         });

//         const balance = await getDeliveryBoyBalance(userId);

//         successResponse(res, {
//             message: 'Successfully added balance',
//             data: {
//                 balance,
//                 transaction,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };

// exports.withdrawDeliveryBoyBalanceByAdmin = async (req, res) => {
//     try {
//         const { deliveryBoyId, amount, userNote, adminNote, remark } = req.body;
//         const boy = await DeliveryBoyModel.findById(deliveryBoyId);
//         if (!boy) return errorResponse(res, 'DeliveryBoy not found');

//         const transaction = await TransactionModel.create({
//             user: deliveryBoyId,
//             amount,
//             userNote,
//             adminNote,
//             account: 'deliveryBoy',
//             type: 'adminBalanceRemoveFromDeliveryBoy',
//             status: 'success',
//             remark,
//         });

//         const balance = await getDeliveryBoyBalance(userId);

//         successResponse(res, {
//             message: 'Successfully withdraw balance',
//             data: {
//                 balance,
//                 transaction,
//             },
//         });
//     } catch (error) {
//         errorHandler(res, error);
//     }
// };

exports.getDeliveryAppPrivacyPolicy = async (req, res) => {
    try {
        const appSetting = await AppSetting.findOne({});

        successResponse(res, {
            message: 'Successfully find',
            data: appSetting.deliveryAppPrivacyPolicy,
        });
    } catch (error) {
        errorRespose(res, error.message);
    }
};

exports.getDeliveryAppAboutUs = async (req, res) => {
    try {
        const appSetting = await AppSetting.findOne({});

        successResponse(res, {
            message: 'Successfully find',
            data: appSetting.deliveryAppAboutUs,
        });
    } catch (error) {
        errorRespose(res, error.message);
    }
};

exports.getDeliveryAppContactUs = async (req, res) => {
    try {
        const appSetting = await AppSetting.findOne({});

        successResponse(res, {
            message: 'Successfully find',
            data: appSetting.deliveryAppContactUs,
        });
    } catch (error) {
        errorRespose(res, error.message);
    }
};

exports.getDeliveryAppReturnPolicy = async (req, res) => {
    try {
        const appSetting = await AppSetting.findOne({});

        successResponse(res, {
            message: 'Successfully find',
            data: appSetting.deliveryAppReturnPolicy,
        });
    } catch (error) {
        errorRespose(res, error.message);
    }
};

exports.forgetPasswordForDeliveryBoyApp = async (req, res) => {
    try {
        let { password, token } = req.body;

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Bad request',
            });
        }

        const { deliveryBoyEmail } = verify(
            token,
            process.env.JWT_PRIVATE_KEY_DELIVERY_BOY_FORGET
        );

        if (!deliveryBoyEmail) {
            return res.status(403).json({
                status: false,
                message: 'Invalid token 0',
            });
        }

        const deliveryBoy = await DeliveryBoyModel.findOne({
            email: deliveryBoyEmail,
            forgetToken: token,
            forgetExpired: {
                $gt: new Date(),
            },
        });

        if (!deliveryBoy) {
            return errorResponse(res, 'Please forget your password again');
        }

        const pass = await bcrypt.hash(password, 10);

        await DeliveryBoyModel.updateOne(
            { _id: deliveryBoy._id },
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

exports.termsAndConditionDeliveryBoy = async (req, res) => {
    try {
        const setting = await AppSetting.findOne({});

        const termCondition = setting.deliveryAppTearmsAndConditions;

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

exports.getDeliveryBoyActivity = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, startDate, endDate } = req.query;
        const deliveryBoyId = req.deliveryBoyId;

        let whereConfig = {
            delivery: ObjectId(deliveryBoyId),
        };

        if (startDate && endDate) {
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

        // console.log("where",whereConfig);

        // activeTotal

        const paginate = await pagination({
            page,
            pageSize,
            model: DeliveryBoyTimeModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const activities = await DeliveryBoyTimeModel.find(whereConfig)
            .sort({ createdAt: 'desc' })
            .skip(paginate.offset)
            .limit(paginate.limit);

        // add a getter to modify timeIn and timeout format

        const newActivities = activities.map(activity => {
            const newObject = {
                ...activity._doc,
                activityOn: moment(activity.createdAt).format('DD-MM-YYYY'),
                timeInString: moment(activity.timeIn).format('hh:mm A'),
                timeOutString: moment(activity.timeOut).format('hh:mm A'),
                totalMinutes: activity.activeTotal,
                summeryString: this.getSummeryString(activity.activeTotal),
            };
            return newObject;
        });

        // get total active time in minutes from start date to end date

        const activeTotal = await DeliveryBoyTimeModel.find(whereConfig);

        const totalMinutes = activeTotal.reduce((acc, item) => {
            return acc + item.activeTotal;
        }, 0);

        const toalHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
        const totalDays = toalHours > 0 ? toalHours / 24 : 0;

        const deliveryBoySummery = {
            totalMinutes: Number(totalMinutes.toFixed(2)),
            totalHours: Number(toalHours.toFixed(2)),
            totalDays: Number(totalDays.toFixed(2)),
            totalMinutesString: `${totalMinutes.toFixed(2)} Minutes`,
            totalHoursString: `${toalHours.toFixed(2)} Hours`,
            totalDaysString: `${totalDays.toFixed(2)} Days`,
            finalSummeryString: this.getSummeryString(totalMinutes),
        };

        successResponse(res, {
            message: 'Successfully track',
            data: {
                deliveryBoySummery: deliveryBoySummery,
                activities: newActivities,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getSummeryString = totalMinutes => {
    // return a string like 2 Days 2 Hours 2 Minutes

    const totalHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
    const totalDays = totalHours > 0 ? totalHours / 24 : 0;

    const days = Math.floor(totalDays);
    const hours = Math.floor(totalHours % 24);
    const minutes = Math.floor(totalMinutes % 60);

    let summeryString = '';

    if (days > 0) {
        summeryString = `${days} Days`;
    }

    if (hours > 0) {
        summeryString = `${summeryString} ${hours} Hours`;
    }

    if (minutes > 0) {
        summeryString = `${summeryString} ${minutes} Minutes`;
    }

    return summeryString.trim();
};

exports.getDeliveryBoyActivityAdmin = async (req, res) => {
    try {
        const { id, page = 1, pageSize = 50, startDate, endDate } = req.query;

        let dateConfig = {};

        if (startDate) {
            const startDateTime = moment(new Date(startDate))
                .startOf('day')
                .toDate();
            const endDateTime = moment(endDate ? new Date(endDate) : new Date())
                .endOf('day')
                .toDate();

            dateConfig = {
                ...dateConfig,
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
            };
        }

        let whereConfig = { ...dateConfig };
        if (id) {
            whereConfig = {
                ...whereConfig,
                delivery: id,
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: DeliveryBoyTimeModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const activities = await DeliveryBoyTimeModel.find(whereConfig)
            .sort({ createdAt: 'desc' })
            .skip(paginate.offset)
            .limit(paginate.limit);

        // add a getter to modify timeIn and timeout format

        const newActivities = activities.map(activity => {
            const newObject = {
                ...activity._doc,
                activityOn: moment(activity.createdAt).format('DD-MM-YYYY'),
                timeInString: moment(activity.timeIn).format('hh:mm A'),
                timeOutString: moment(activity.timeOut).format('hh:mm A'),
                totalMinutes: activity.activeTotal,
                summeryString: this.getSummeryString(activity.activeTotal),
            };
            return newObject;
        });

        // get total active time in minutes from start date to end date

        const activeTotal = await DeliveryBoyTimeModel.find(whereConfig);

        const totalMinutes = activeTotal.reduce((acc, item) => {
            return acc + item.activeTotal;
        }, 0);

        const toalHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
        const totalDays = toalHours > 0 ? toalHours / 24 : 0;

        const deliveryBoySummery = {
            totalMinutes: Number(totalMinutes.toFixed(2)),
            totalHours: Number(toalHours.toFixed(2)),
            totalDays: Number(totalDays.toFixed(2)),
            totalMinutesString: `${totalMinutes.toFixed(2)} Minutes`,
            totalHoursString: `${toalHours.toFixed(2)} Hours`,
            totalDaysString: `${totalDays.toFixed(2)} Days`,
            finalSummeryString: this.getSummeryString(totalMinutes),
        };

        const riderCanceledConfig = {
            ...dateConfig,
            canceledDeliveryBoy: { $in: [id] },
        };
        const totalRiderCanceledOrder = await OrderModel.countDocuments(
            riderCanceledConfig
        );

        const riderRejectedConfig = {
            ...dateConfig,
            rejectedDeliveryBoy: { $in: [id] },
            canceledDeliveryBoy: { $nin: [id] },
        };
        const totalRiderRejectedOrder = await OrderModel.countDocuments(
            riderRejectedConfig
        );

        const riderMissedConfig = {
            ...dateConfig,
            deliveryBoyList: { $in: [id] },
            deliveryBoy: { $ne: id },
        };
        const totalRiderMissedOrder = await OrderModel.countDocuments(
            riderMissedConfig
        );

        successResponse(res, {
            message: 'Successfully track',
            data: {
                deliveryBoySummery: deliveryBoySummery,
                totalRiderCanceledOrder,
                totalRiderRejectedOrder,
                totalRiderMissedOrder,
                activities: newActivities,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getDeliveryBoyActiveTime = async (
    deliveryBoyId,
    startDate,
    endDate
) => {
    let whereConfig = { delivery: deliveryBoyId };

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

    const activeTotal = await DeliveryBoyTimeModel.find(whereConfig);

    const totalMinutes = activeTotal.reduce((acc, item) => {
        return acc + item.activeTotal;
    }, 0);

    const toalHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
    const totalDays = toalHours > 0 ? toalHours / 24 : 0;

    const deliveryBoySummery = {
        totalMinutes: Number(totalMinutes.toFixed(2)),
        totalHours: Number(toalHours.toFixed(2)),
        totalDays: Number(totalDays.toFixed(2)),
        totalMinutesString: `${totalMinutes.toFixed(2)} Minutes`,
        totalHoursString: `${toalHours.toFixed(2)} Hours`,
        totalDaysString: `${totalDays.toFixed(2)} Days`,
        finalSummeryString: this.getSummeryString(totalMinutes),
    };

    return deliveryBoySummery;
};

//*** For getting deliveryBoy flags***/
exports.getDeliveryBoyFlags = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            startDate,
            endDate,
            sortBy = 'desc',
            riderId,
            flaggedType, // cancelled || flagged
        } = req.query;

        let config = {
            type: 'delivery',
            delivery: riderId,
        };

        if (startDate && endDate) {
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

        const riderFlags = await FlagModel.find(config)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'orderId',
                    populate: 'user shop seller',
                },
                {
                    path: 'butlerId',
                    populate: 'user',
                },
            ]);

        let flags = [...riderFlags];

        if (searchKey) {
            const searchTerm = searchKey.toLowerCase();
            flags = riderFlags.filter(
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

module.exports.getRelatedDeliveryBoy = async (req, res) => {
    try {
        const { orderId } = req.query;

        const order = await Order.findOne({ _id: orderId }).populate(['shop']);

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        const { coordinates } = order.shop.location;

        let appSetting = await AppSetting.findOne({});

        const searchDeliveryBoyKm = appSetting?.searchDeliveryBoyKm || [5, 10];

        const MaxSearchDeliveryBoyKm = Math.max(...searchDeliveryBoyKm);

        const maxDistanceInMeters = 1000 * MaxSearchDeliveryBoyKm;

        const nearByDeliveryBoys = await DeliveryBoy.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: coordinates,
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            status: 'active',
            liveStatus: 'online',
            deliveryBoyType: 'dropRider',
            deletedAt: null,
        })
            .limit(50)
            .select('name image location');

        const newList = [];
        for (const deliveryBoy of nearByDeliveryBoys) {
            const readyOrders = await Order.find({
                deliveryBoy: deliveryBoy._id,
                orderStatus: {
                    $in: ['ready_to_pickup', 'order_on_the_way'],
                },
            });
            const ongoingOrders = await Order.find({
                deliveryBoy: deliveryBoy._id,
                orderStatus: {
                    $in: ['accepted_delivery_boy', 'preparing'],
                },
            });

            const butlers = await Butler.find({
                deliveryBoy: deliveryBoy._id,
                orderStatus: {
                    $in: ['accepted_delivery_boy', 'order_on_the_way'],
                },
            });
            // For replacement order feature
            const replacementOrders = await Order.find({
                deliveryBoy: deliveryBoy._id,
                orderStatus: {
                    $in: [
                        'accepted_delivery_boy',
                        'preparing',
                        'ready_to_pickup',
                        'order_on_the_way',
                    ],
                },
                isReplacementOrder: true,
                'replacementOrderDeliveryInfo.deliveryType':
                    'shop-customer-shop',
            });

            if (
                ongoingOrders.length < 2 &&
                !readyOrders.length &&
                !butlers.length &&
                !replacementOrders.length
            ) {
                //*** Calc shop and deliveryBoy distance ***/
                const distance = await getDistance(
                    deliveryBoy.location.coordinates[1],
                    deliveryBoy.location.coordinates[0],
                    coordinates[1],
                    coordinates[0],
                    'k'
                );
                newList.push({ ...deliveryBoy._doc, shopDistance: distance });
            }
        }

        let list = newList.sort((a, b) => a.shopDistance - b.shopDistance);

        return successResponse(res, {
            message: 'fetch successfully completed',
            data: {
                nearByDeliveryBoys: list,
            },
        });
    } catch (e) {
        errorHandler(res, e);
    }
};

module.exports.sendOrderRequestForAutoAssign = async (req, res) => {
    try {
        const { orderId, butlerId } = req.body;

        let order;
        let updatedOrder;

        if (orderId) {
            order = await Order.findOne({ _id: orderId }).lean();
        } else if (butlerId) {
            order = await Butler.findOne({ _id: butlerId }).lean();
        }

        if (!order) return errorResponse(res, 'order not found');

        // if (order.orderFor === 'specific) return errorResponse(res, 'This order has shop rider');

        if (
            ![
                'placed',
                'accepted_delivery_boy',
                'preparing',
                'ready_to_pickup',
            ].includes(order.orderStatus)
        )
            return errorResponse(
                res,
                `Order has already been ${order.orderStatus}`
            );

        const orderTripSummary = order?.orderTripSummary
            .filter(item => item.type !== 'rider')
            .map(item => {
                if (item.type === 'shop')
                    return {
                        totalDistance: item.distance,
                        totalDuration: item.duration,
                        ...item,
                    };
                return item;
            });

        let newTimeline = order.timeline;
        const acceptedDeliveryBoyTimeline = newTimeline.find(
            timeline => timeline.status === 'accepted_delivery_boy'
        );
        acceptedDeliveryBoyTimeline.active = false;
        acceptedDeliveryBoyTimeline.createdAt = null;

        const updateQuery = {
            $set: {
                orderStatus:
                    order.orderStatus === 'accepted_delivery_boy'
                        ? 'placed'
                        : order.orderStatus,
                orderTripSummary: orderTripSummary,
                timeline: newTimeline,
                lastSearchKm: 0,
            },
            $unset: { deliveryBoy: 1 },
            $inc: { resendRiderRequestCount: 1 },
            ...(order?.deliveryBoy && {
                $push: { rejectedDeliveryBoy: order.deliveryBoy },
            }),
        };

        if (orderId) {
            updatedOrder = await Order.findByIdAndUpdate(orderId, updateQuery, {
                new: true,
            });

            if (order?.deliveryBoy)
                await notifyForRemoveRider(updatedOrder, order?.deliveryBoy);

            await checkNearByDeliveryBoy(orderId);
        } else if (butlerId) {
            updatedOrder = await Butler.findByIdAndUpdate(
                butlerId,
                updateQuery,
                { new: true }
            );

            if (order?.deliveryBoy)
                await notifyForRemoveRider(updatedOrder, order?.deliveryBoy);

            await checkNearByDeliveryBoyForButler(butlerId);
        }

        return successResponse(res, {
            message: 'send order request successfully completed',
            data: { order: updatedOrder },
        });
    } catch (e) {
        errorHandler(res, e);
    }
};
