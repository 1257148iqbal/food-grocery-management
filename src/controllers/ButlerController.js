const {
    errorResponse,
    errorHandler,
    successResponse,
    scriptResponse,
} = require('../helpers/apiResponse');
const { pagination } = require('../helpers/pagination');
const { getUserBalance } = require('../helpers/BalanceQuery');
const {
    sendNotificationsAllApp,
    pushNotificationForChat,
    sendNotificationsDeliveryBoyUpdated,
} = require('./NotificationController');
const {
    getCancelObject,
    OrderCancel,
    getFullOrderInformationForButler,
} = require('../helpers/orderHelper');
const { sendPlaceOrderEmail } = require('./EmailController');
const { getRendomString } = require('../helpers/utility');
const {
    DistanceInfoGoogle,
    DistanceInfoGoogleWithWayPoints,
} = require('../lib/getDistanceInfo');
const Order = require('../models/OrderModel');
const Butler = require('../models/ButlerModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const UniqueId = require('../models/UniqueIdModel');
const TransactionModel = require('../models/TransactionModel');
const OrderDeliveryCharge = require('../models/OrderDeliveryCharge');
const UserModel = require('../models/UserModel');
const FlagModel = require('../models/FlagModel');
const ReviewModel = require('../models/ReviewModel');
const CardModel = require('../models/CardModel');
const FlutterTransaction = require('../models/FlutterTransaction');
const GlobalDropCharge = require('../models/GlobalDropCharge');
const Admin = require('../models/AdminModel');
const AppSetting = require('../models/AppSetting');
const ObjectId = require('mongoose').Types.ObjectId;
const moment = require('moment');
const Flutterwave = require('flutterwave-node-v3');
const short = require('short-uuid');
const ZoneModel = require('../models/ZoneModel');
const {
    checkNearByDeliveryBoyShuForButler,
    checkNearByDeliveryBoyForButler,
} = require('../config/socket');
const { getRiderCashInHand } = require('./FinancialController');
const { calcActiveTime } = require('./DeliveryBoyController');
const DeliveryBoyTimeModel = require('../models/DeliveryBoyTimeModel');
const { getAverageRate } = require('./OrderController');
const AreebaCardModel = require('../models/AreebaCardModel');
const ButlerRequestModel = require('../models/ButlerRequestModel');
const { areebaPaymentGateway } = require('../lib/areebaPaymentGateway');
// const open = require('open');
// const util = require('util');
// const axios = require('axios').default;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const flw = new Flutterwave(PUBLIC_KEY, SECRET_KEY);

const checkOrderDistance = async (receivedAddress, deliveryAddress) => {
    const appSetting = await AppSetting.findOne();
    const km = appSetting ? appSetting.maxDistanceForButler : 10;
    // const maxDistanceInMeters = 1000 * km;

    let distance = await getDistance(
        deliveryAddress.latitude,
        deliveryAddress.longitude,
        receivedAddress.latitude,
        receivedAddress.longitude,
        'k'
    );

    if (distance === 0) {
        return 0;
    }

    if (!distance) {
        // distance = 1;
        return false;
    }

    if (distance > km) {
        return false;
    }

    return true;
};

const orderCountInDetails = async order => {
    await UserModel.updateOne(
        { _id: order.user },
        { $inc: { orderCompleted: 1 } }
    ).exec();
    await DeliveryBoyModel.updateOne(
        { _id: order.deliveryBoy },
        { $inc: { totalOrder: 1 } }
    ).exec();
};

async function getDistance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = (Math.PI * lat1) / 180;
    var radlat2 = (Math.PI * lat2) / 180;
    var theta = lon1 - lon2;
    var radtheta = (Math.PI * theta) / 180;
    var dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == 'K') {
        dist = dist * 1.609344;
    }
    if (unit == 'N') {
        dist = dist * 0.8684;
    }
    dist = parseFloat(dist.toFixed(4));
    return dist;
}

/********** Transaction Creation Start **********/
const userOrderCreateTransection = async (
    order,
    userId,
    amount,
    secondaryCurrency_amount,
    summary,
    paymentMethod,
    cardTypeString,
    cardId = null
) => {
    try {
        const transaction = await TransactionModel.create({
            user: userId,
            amount: amount,
            secondaryCurrency_amount: secondaryCurrency_amount,
            summary: summary,
            userNote: 'Order Payment Completed',
            adminNote: `user payment for order by using ${cardTypeString}`,
            account: 'user',
            type: 'userPayForOrder',
            status: 'success',
            paymentMethod,
            paymentType: 'flutterWave',
            cardId: cardId,
            butler: order._id,
            paidCurrency: order.paidCurrency,
            isButler: true,
        });

        return transaction;
    } catch (error) {
        console.log(error);
    }
};

const deliveryBoyBalanceAddForOrder = async (
    order,
    type,
    status = 'success',
    pos = false,
    baseCurrency_collectCash = 0,
    secondaryCurrency_collectCash = 0,
    baseCurrency_receivedCash = 0,
    secondaryCurrency_receivedCash = 0,
    baseCurrency_returnedCash = 0,
    secondaryCurrency_returnedCash = 0,
) => {
    const transactionDeliveryBoy = await TransactionModel.create({
        butler: order._id,
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        account: 'deliveryBoy',
        type: type,
        paymentMethod: order.paymentMethod,
        pos: pos,
        status: status,
        user: order.user,
        deliveryBoy: order.deliveryBoy,
        summary: order.summary,
        amount: order.baseCurrency_riderFee,
        secondaryCurrency_amount: order.secondaryCurrency_riderFee,
        deliveryBoyGet: order.baseCurrency_riderFee,
        unSettleAmount: order.baseCurrency_riderFee,
        dropGet: order.adminCharge.baseCurrency_totalAdminCharge,
        adminCharge: order.adminCharge,
        dropGetFromDeliveryBoy:
            order.adminCharge.baseCurrency_adminChargeFromDelivery,
        paidCurrency: order.paidCurrency,
        deliveryBoyHand:
            type === 'deliveryBoyOrderDeliveredCash' ? true : false,
        receivedAmount:
            type === 'deliveryBoyOrderDeliveredCash'
                ? order.summary.baseCurrency_cash
                : 0,
        secondaryCurrency_receivedAmount:
            type === 'deliveryBoyOrderDeliveredCash'
                ? order.summary.secondaryCurrency_cash
                : 0,
        sendToDropAmount:
            type === 'deliveryBoyOrderDeliveredCash'
                ? order.summary.baseCurrency_cash
                : 0, // add this field for adam request
        baseCurrency_collectCash,
        secondaryCurrency_collectCash,
        baseCurrency_collectCash_sc:
            baseCurrency_collectCash * order.adminExchangeRate,
        secondaryCurrency_collectCash_bc:
            secondaryCurrency_collectCash / order.adminExchangeRate || 0,
        isButler: true,
        baseCurrency_receivedCash,
        secondaryCurrency_receivedCash,
        baseCurrency_returnedCash,
        secondaryCurrency_returnedCash,
    });
    return transactionDeliveryBoy;
};

const addDropBalanceForOrder = async order => {
    // drop earning
    const transactionDrop = await TransactionModel.create({
        butler: order._id,
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        account: 'admin',
        type: 'DropGetFromOrder',
        paymentMethod: order.paymentMethod,
        status: 'success',
        user: order.user,
        deliveryBoy: order.deliveryBoy,
        summary: order.summary,
        amount: order.adminCharge.baseCurrency_totalAdminCharge,
        secondaryCurrency_amount:
            order.adminCharge.secondaryCurrency_totalAdminCharge,
        deliveryBoyGet: order.baseCurrency_riderFee,
        dropGet: order.adminCharge.baseCurrency_totalAdminCharge,
        dropGetFromDeliveryBoy: order.adminCharge.baseCurrency_totalAdminCharge,
        isButler: true,
        paidCurrency: order.paidCurrency,
    });

    return transactionDrop;
};

exports.userRefundMoney = async (
    order,
    userNote,
    adminNote,
    baseCurrency_adminCut = 0,
    baseCurrency_adminVatCut = 0,
    baseCurrency_deliveryBoyCut = 0,
    secondaryCurrency_adminCut = 0,
    secondaryCurrency_adminVatCut = 0,
    secondaryCurrency_deliveryBoyCut = 0,
    isPartialRefund = false
) => {
    const transaction = await TransactionModel.create({
        butler: order._id,
        user: order.user,
        autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
        amount:
            order?.summary?.baseCurrency_card +
            order?.summary?.baseCurrency_wallet,
        secondaryCurrency_amount:
            order?.summary?.secondaryCurrency_card +
            order?.summary?.secondaryCurrency_wallet,
        userNote: userNote,
        adminNote: adminNote,
        account: 'user',
        type: 'userCancelOrderGetWallet',
        status: 'success',
        orderId: order._id,
        paymentMethod: order.paymentMethod,
        isButler: true,
        isRefund: true,
        baseCurrency_adminCut,
        baseCurrency_adminVatCut,
        baseCurrency_deliveryBoyCut,
        secondaryCurrency_adminCut,
        secondaryCurrency_adminVatCut,
        secondaryCurrency_deliveryBoyCut,
        isPartialRefund,
        paidCurrency: order.paidCurrency,
    });

    await UserModel.updateOne(
        { _id: order.user },
        {
            $inc: {
                tempBalance:
                    order.summary.baseCurrency_card +
                    order.summary.baseCurrency_wallet,
            },
        }
    );
    return transaction;
};
/********** Transaction Creation End **********/

/********** Checking order before placed order Start **********/
const checkingPlaceOrderValidity = async (
    userId,
    receivedAddress,
    deliveryAddress,
    summary
) => {
    //*** Checking User Info ***/
    const userInfo = await UserModel.findOne({
        _id: userId,
        deletedAt: null,
    });
    if (userInfo.status !== 'active')
        return `Your account is ${userInfo.status}. Please contact support.`;

    const orders = await Order.countDocuments({
        user: userId,
        orderStatus: {
            $nin: ['delivered', 'cancelled', 'refused', 'schedule'],
        },
    });

    const butlerOrders = await Butler.countDocuments({
        user: userId,
        orderStatus: {
            $nin: ['delivered', 'cancelled', 'refused', 'schedule'],
        },
    });

    if (orders + butlerOrders >= 3)
        return 'You have 3 pending order. please complete your order first.';

    const { secondaryCurrency_availableBalance } = await getUserBalance(userId);

    if (secondaryCurrency_availableBalance < 0)
        return `You can't place any order, please check your balance.`;

    if (
        summary?.secondaryCurrency_wallet > 0 &&
        secondaryCurrency_availableBalance < summary.secondaryCurrency_wallet
    )
        return 'Insufficient wallet balance';

    //*** Checking maximum total est product price ***/
    // const appSetting = await AppSetting.findOne();
    // const maxTotalEstItemsPriceForButler = appSetting
    //     ? appSetting.maxTotalEstItemsPriceForButler
    //     : 100;
    // if (summary?.productAmount > maxTotalEstItemsPriceForButler)
    //     return 'You have exceed maximum total est items price.';

    // Checking delivery location zone
    const zoneConfig = {
        zoneGeometry: {
            $geoIntersects: {
                $geometry: {
                    type: 'Point',
                    coordinates: [
                        deliveryAddress.location.coordinates[0],
                        deliveryAddress.location.coordinates[1],
                    ],
                },
            },
        },
        zoneStatus: 'active',
    };
    const zone = await ZoneModel.findOne(zoneConfig);
    if (!zone) return 'Delivery address is out of our service.';

    if (zone.zoneAvailability === 'busy')
        return 'Selected delivery address is inside a busy zone.';

    // Checking received location zone
    const zoneConfigForReceivedAddress = {
        zoneGeometry: {
            $geoIntersects: {
                $geometry: {
                    type: 'Point',
                    coordinates: [
                        receivedAddress.location.coordinates[0],
                        receivedAddress.location.coordinates[1],
                    ],
                },
            },
        },
        zoneStatus: 'active',
    };
    const zoneForReceivedAddress = await ZoneModel.findOne(
        zoneConfigForReceivedAddress
    );
    if (!zoneForReceivedAddress)
        return 'Drop-off address is out of our service.';

    if (zoneForReceivedAddress.zoneAvailability === 'busy')
        return 'Selected drop-off address is inside a busy zone.';

    //*** Checking shop and delivery distance ***/
    const distanceStatus = await checkOrderDistance(
        {
            latitude: receivedAddress?.location?.coordinates[1],
            longitude: receivedAddress?.location?.coordinates[0],
        },
        {
            latitude: deliveryAddress?.location?.coordinates[1],
            longitude: deliveryAddress?.location?.coordinates[0],
        }
    );

    if (distanceStatus === 0) {
        return `You can't use same delivery address as the pickup address`;
    }
    if (!distanceStatus) {
        return 'Your selected address is out of range';
    }

    const receivedAddressToDeliveryAddressDistance = await DistanceInfoGoogle({
        origin: {
            latitude: receivedAddress?.location?.coordinates[1],
            longitute: receivedAddress?.location?.coordinates[0],
        },
        distination: {
            latitude: deliveryAddress?.location?.coordinates[1],
            longitute: deliveryAddress?.location?.coordinates[0],
        },
    });

    if (!receivedAddressToDeliveryAddressDistance?.duration?.value) {
        return 'Your selected address is out of range';
    }

    return false;
};
/********** Checking order before placed order End **********/

/********** Apply Exchange Rate Start **********/
const applyExchangeRateInButlerSummary = (summary, adminExchangeRate) => {
    summary.secondaryCurrency_riderFee =
        summary.baseCurrency_riderFee * adminExchangeRate;

    summary.secondaryCurrency_productAmount =
        summary?.baseCurrency_productAmount * adminExchangeRate;

    summary.secondaryCurrency_totalAmount =
        summary.baseCurrency_totalAmount * adminExchangeRate;

    summary.secondaryCurrency_vat =
        summary.baseCurrency_vat * adminExchangeRate;

    summary.secondaryCurrency_wallet =
        summary.baseCurrency_wallet * adminExchangeRate;

    summary.secondaryCurrency_card =
        summary.baseCurrency_card * adminExchangeRate;

    summary.secondaryCurrency_cash =
        summary.baseCurrency_cash * adminExchangeRate;

    return summary;
};

const applyExchangeRateInButlerAdminCharge = (
    adminCharge,
    adminExchangeRate
) => {
    adminCharge.secondaryCurrency_adminChargeFromDelivery =
        adminCharge.baseCurrency_adminChargeFromDelivery * adminExchangeRate;

    adminCharge.secondaryCurrency_totalAdminCharge =
        adminCharge.baseCurrency_totalAdminCharge * adminExchangeRate;

    return adminCharge;
};

const applyExchangeRateInButlerProducts = (products, adminExchangeRate) => {
    for (const product of products) {
        product.secondaryCurrency__perProductPrice =
            product?.baseCurrency_perProductPrice * adminExchangeRate;

        product.secondaryCurrency_totalProductAmount =
            product?.baseCurrency_totalProductAmount * adminExchangeRate;
    }

    return products;
};
/********** Apply Exchange Rate End **********/

/********** 1.User Placed Order Start **********/
exports.userPlaceOrderWithCash = async (req, res) => {
    try {
        const userId = req.userId;
        let {
            orderType,
            receivedAddress,
            deliveryAddress,
            itemDescription,
            products,
            deliveryBoyNote,
            order_delivery_charge_id,
            summary,
            paymentMethod,
            pos,
            type,
            note,
            scheduleDate,
            rewardPoints,
            bringChangeAmount,
            adminExchangeRate = 0,
            paymentOn,
            selectedPaymentMethod,
        } = req.body;

        const checkingOrderValidity = await checkingPlaceOrderValidity(
            userId,
            receivedAddress,
            deliveryAddress,
            summary
        );
        if (checkingOrderValidity)
            return errorResponse(res, checkingOrderValidity);

        //Set order timeline
        let timeline = [
            {
                title: 'Accepted delivery boy',
                status: 'accepted_delivery_boy',
                note: 'Accepted delivery boy',
                active: false,
                createdAt: null,
            },
            {
                title: 'Order on the way',
                status: 'order_on_the_way',
                note: 'Order on the way',
                active: false,
                createdAt: null,
            },
            {
                title: 'Delivered',
                status: 'delivered',
                note: 'Delivered',
                active: false,
                createdAt: null,
            },
        ];

        let orderActivity = [];

        //Check order is sheduled or not and update timeline according to it.
        if (type == 'schedule') {
            timeline.unshift({
                title: 'Order placed',
                status: 'placed',
                note: `Schedule Order placed ${scheduleDate}`,
                active: false,
                createdAt: null,
            });

            orderActivity.push({
                note: `Schedule Order placed ${scheduleDate}`,
                activityBy: 'user',
                userId: userId,
                createdAt: new Date(),
                scheduleDate,
            });
        } else {
            timeline.unshift({
                title: 'Order placed',
                status: 'placed',
                note: 'New Order placed',
                active: true,
                createdAt: new Date(),
            });

            orderActivity.push({
                note: 'user order placed',
                activityBy: 'user',
                userId: userId,
                createdAt: new Date(),
            });
        }

        //Generate unique order id
        const incOrder = await UniqueId.findOneAndUpdate(
            {},
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        let orderIdUnique = String(incOrder.count).padStart(6, '0');
        orderIdUnique = '' + moment().format('DDMMYY') + orderIdUnique;
        // orderIdUnique = getRendomString(3) + orderIdUnique;

        const order_delivery_charge = await OrderDeliveryCharge.findOne({
            _id: order_delivery_charge_id,
        }).populate('dropChargeId');

        let adminCharge = {
            baseCurrency_adminChargeFromDelivery: order_delivery_charge.dropFee,
            baseCurrency_totalAdminCharge: order_delivery_charge.dropFee,
        };

        const deliveryBoyFee = order_delivery_charge.deliveryBoyFee;

        const receivedAddressToDeliveryAddressDistance =
            await DistanceInfoGoogle({
                origin: {
                    latitude: receivedAddress.location.coordinates[1],
                    longitute: receivedAddress.location.coordinates[0],
                },
                distination: {
                    latitude: deliveryAddress.location.coordinates[1],
                    longitute: deliveryAddress.location.coordinates[0],
                },
            });

        // Calculate delivered_time
        const delivered_time = new Date();
        delivered_time.setMinutes(
            delivered_time.getMinutes() +
            Number(
                receivedAddressToDeliveryAddressDistance?.duration?.value
            ) /
            60 +
            10
        );

        //*** Start apply exchange rate ***/
        summary = applyExchangeRateInButlerSummary(summary, adminExchangeRate);
        adminCharge = applyExchangeRateInButlerAdminCharge(
            adminCharge,
            adminExchangeRate
        );

        products = applyExchangeRateInButlerProducts(
            products,
            adminExchangeRate
        );

        const baseCurrency_riderFee = deliveryBoyFee;
        const secondaryCurrency_riderFee = deliveryBoyFee * adminExchangeRate;
        //*** End apply exchange rate ***/

        const appSetting = await AppSetting.findOne({});
        const orderData = {
            orderId: orderIdUnique,
            user: userId,
            orderStatus: type === 'now' ? 'placed' : 'schedule',
            orderCancel: null,
            orderType: orderType,
            paymentMethod: 'cash',
            selectPos: pos, // yes , no
            paymentStatus: 'pending',
            deliveryAddress: deliveryAddress,
            receivedAddress: receivedAddress,
            // duplicate for frontend demand
            dropOffLocation: deliveryAddress,
            pickUpLocation: receivedAddress,
            summary: summary,
            itemDescription: itemDescription,
            products: products,
            timeline: timeline,
            orderActivity: orderActivity,
            note: note,
            deliveryDistance: order_delivery_charge.distance,
            orderDeliveryCharge: order_delivery_charge_id,
            adminCharge: adminCharge,
            baseCurrency_adminCommission:
                adminCharge.baseCurrency_totalAdminCharge,
            secondaryCurrency_adminCommission:
                adminCharge.secondaryCurrency_totalAdminCharge,
            deliveryBoyNote,
            type,
            scheduleDate: type === 'now' ? null : scheduleDate,
            baseCurrency_riderFee,
            secondaryCurrency_riderFee,
            searchingTime: new Date(),
            receivedAddressToDeliveryAddressDistance,
            delivered_time,
            rewardPoints,
            location: receivedAddress.location,
            bringChangeAmount,
            adminExchangeRate,
            baseCurrency: appSetting?.baseCurrency,
            secondaryCurrency: appSetting?.secondaryCurrency,
            order_placedAt: new Date(),
            paymentOn,
            selectedPaymentMethod,
        };

        const order = await Butler.create(orderData);

        //*** Create trip summary start ***/
        const userInfo = await UserModel.findOne({
            _id: userId,
        });

        const { distance, duration, legs, overview_polyline } =
            await DistanceInfoGoogleWithWayPoints({
                origin: {
                    latitude: receivedAddress.location.coordinates[1],
                    longitude: receivedAddress.location.coordinates[0],
                },
                destination: {
                    latitude: deliveryAddress.location.coordinates[1],
                    longitude: deliveryAddress.location.coordinates[0],
                },
                waypoints: [],
            });

        let orderTripSummary = [
            {
                name: receivedAddress.name || 'Shop',
                address: receivedAddress.address,
                latitude: receivedAddress.location.coordinates[1],
                longitude: receivedAddress.location.coordinates[0],
                type: 'user',
                user: userInfo._id,
                order: [order._id],
                totalDistance: distance,
                totalDuration: duration,
                total_overview_polyline: overview_polyline,
                distance: legs[0].distance,
                duration: legs[0].duration,
                overview_polyline: legs[0].overview_polyline,
            },
            {
                name: deliveryAddress.name,
                address: deliveryAddress.address,
                latitude: deliveryAddress.location.coordinates[1],
                longitude: deliveryAddress.location.coordinates[0],
                type: 'user',
                order: [order._id],
            },
        ];

        await Butler.findByIdAndUpdate(order._id, {
            $set: { orderTripSummary: orderTripSummary },
        });
        //*** Create trip summary end ***/

        //*** Find Rider Start***/
        if (type !== 'schedule') {
            await checkNearByDeliveryBoyForButler(order._id);
        }
        //*** Find Rider End***/

        const orderFullInformation = await getFullOrderInformationForButler(
            order._id
        );

        await sendNotificationsAllApp(orderFullInformation);
        // await sendPlaceOrderEmail(order._id);

        successResponse(res, {
            message: 'Order placed successfully',
            data: {
                order: orderFullInformation,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

// Payment generator before order
exports.orderPaymentGenerate = async (req, res) => {
    try {
        const userId = req.userId;

        let { cardId, pin, amount, deliveryAddress, receivedAddress, summary } =
            req.body;

        if (!deliveryAddress || !receivedAddress) {
            return errorResponse(
                res,
                'deliveryAddress or receivedAddress is required'
            );
        }

        if (!cardId) {
            return res.json({
                status: false,
                message: 'Please fill all fields',
            });
        }

        const checkingOrderValidity = await checkingPlaceOrderValidity(
            userId,
            receivedAddress,
            deliveryAddress,
            summary
        );
        if (checkingOrderValidity)
            return errorResponse(res, checkingOrderValidity);

        const user = await UserModel.findById(userId).select(
            'name gender phone_number email'
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

            //return res.json({payload2})

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
        return errorHandler(res, error);
    }
};
// After payment generate placed order
exports.orderCompletePayment = async (req, res) => {
    try {
        const userId = req.userId;
        const { card } = req.body;
        const { token, token_id, otp, defaultPayment } = card;

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

            // place order now
            userPlaceOrderWithCard(
                req,
                res,
                flutterTransaction.cardInfo.cardId,
                cardTypeString
            );
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
        return errorHandler(res, error);
    }
};
const userPlaceOrderWithCard = async (req, res, cardId, cardTypeString) => {
    try {
        const userId = req.userId;
        let {
            orderType,
            receivedAddress,
            deliveryAddress,
            itemDescription,
            products,
            deliveryBoyNote,
            order_delivery_charge_id,
            summary,
            paymentMethod,
            type = 'now',
            note,
            scheduleDate,
            rewardPoints,
            adminExchangeRate = 0,
            paymentOn,
            selectedPaymentMethod,
        } = req.body;

        let timeline = [
            {
                title: 'Order placed',
                status: 'placed',
                note: 'New Order placed',
                active: true,
                createdAt: new Date(),
            },
            {
                title: 'Accepted delivery boy',
                status: 'accepted_delivery_boy',
                note: 'Accepted delivery boy',
                active: false,
                createdAt: null,
            },

            {
                title: 'Order on the way',
                status: 'order_on_the_way',
                note: 'Order on the way',
                active: false,
                createdAt: null,
            },
            {
                title: 'Delivered',
                status: 'delivered',
                note: 'Delivered',
                active: false,
                createdAt: null,
            },
        ];

        let orderActivity = [
            {
                note: 'user order placed',
                activityBy: 'user',
                userId: userId,
                createdAt: new Date(),
            },
        ];

        const incOrder = await UniqueId.findOneAndUpdate(
            {},
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        let orderIdUnique = String(incOrder.count).padStart(6, '0');
        orderIdUnique = '' + moment().format('DDMMYY') + orderIdUnique;
        orderIdUnique = getRendomString(1) + orderIdUnique;

        const order_delivery_charge = await OrderDeliveryCharge.findOne({
            _id: order_delivery_charge_id,
        }).populate('dropChargeId');

        let adminCharge = {
            baseCurrency_adminChargeFromDelivery: order_delivery_charge.dropFee,
            baseCurrency_totalAdminCharge: order_delivery_charge.dropFee,
        };

        const deliveryBoyFee = order_delivery_charge.deliveryBoyFee;

        const receivedAddressToDeliveryAddressDistance =
            await DistanceInfoGoogle({
                origin: {
                    latitude: receivedAddress.location.coordinates[1],
                    longitute: receivedAddress.location.coordinates[0],
                },
                distination: {
                    latitude: deliveryAddress.location.coordinates[1],
                    longitute: deliveryAddress.location.coordinates[0],
                },
            });

        // Calculate delivered_time
        const delivered_time = new Date();
        delivered_time.setMinutes(
            delivered_time.getMinutes() +
            Number(
                receivedAddressToDeliveryAddressDistance?.duration?.value
            ) /
            60 +
            10
        );

        //*** Start apply exchange rate ***/
        summary = applyExchangeRateInButlerSummary(summary, adminExchangeRate);
        adminCharge = applyExchangeRateInButlerAdminCharge(
            adminCharge,
            adminExchangeRate
        );

        products = applyExchangeRateInButlerProducts(
            products,
            adminExchangeRate
        );

        const baseCurrency_riderFee = deliveryBoyFee;
        const secondaryCurrency_riderFee = deliveryBoyFee * adminExchangeRate;
        //*** End apply exchange rate ***/

        const appSetting = await AppSetting.findOne({});
        const orderData = {
            orderId: orderIdUnique,
            user: userId,
            orderStatus: type === 'now' ? 'placed' : 'schedule',
            orderCancel: null,
            orderType: orderType,
            paymentMethod: paymentMethod,
            selectPos: 'no', // yes , no
            paymentStatus: 'paid',
            deliveryAddress: deliveryAddress,
            receivedAddress: receivedAddress,
            // duplicate for frontend demand
            dropOffLocation: deliveryAddress,
            pickUpLocation: receivedAddress,
            summary: summary,
            itemDescription: itemDescription,
            products: products,
            timeline: timeline,
            orderActivity: orderActivity,
            note: note,
            deliveryDistance: order_delivery_charge.distance,
            orderDeliveryCharge: order_delivery_charge_id,
            adminCharge: adminCharge,
            baseCurrency_adminCommission:
                adminCharge.baseCurrency_totalAdminCharge,
            secondaryCurrency_adminCommission:
                adminCharge.secondaryCurrency_totalAdminCharge,
            deliveryBoyNote,
            type,
            scheduleDate: type === 'now' ? null : scheduleDate,
            baseCurrency_riderFee,
            secondaryCurrency_riderFee,
            searchingTime: new Date(),
            receivedAddressToDeliveryAddressDistance,
            delivered_time,
            rewardPoints,
            location: receivedAddress.location,
            adminExchangeRate,
            baseCurrency: appSetting?.baseCurrency,
            secondaryCurrency: appSetting?.secondaryCurrency,
            order_placedAt: new Date(),
            // Store card info for taking money after delivered
            cardId,
            cardTypeString,
            paymentOn,
            selectedPaymentMethod,
        };

        const order = await Butler.create(orderData);

        //*** Create trip summary start ***/
        const userInfo = await UserModel.findOne({
            _id: userId,
        });

        const { distance, duration, legs, overview_polyline } =
            await DistanceInfoGoogleWithWayPoints({
                origin: {
                    latitude: receivedAddress.location.coordinates[1],
                    longitude: receivedAddress.location.coordinates[0],
                },
                destination: {
                    latitude: deliveryAddress.location.coordinates[1],
                    longitude: deliveryAddress.location.coordinates[0],
                },
                waypoints: [],
            });

        let orderTripSummary = [
            {
                name: receivedAddress.name || 'Shop',
                address: receivedAddress.address,
                latitude: receivedAddress.location.coordinates[1],
                longitude: receivedAddress.location.coordinates[0],
                type: 'user',
                user: userInfo._id,
                order: [order._id],
                totalDistance: distance,
                totalDuration: duration,
                total_overview_polyline: overview_polyline,
                distance: legs[0].distance,
                duration: legs[0].duration,
                overview_polyline: legs[0].overview_polyline,
            },
            {
                name: deliveryAddress.name,
                address: deliveryAddress.address,
                latitude: deliveryAddress.location.coordinates[1],
                longitude: deliveryAddress.location.coordinates[0],
                type: 'user',
                order: [order._id],
            },
        ];

        await Butler.findByIdAndUpdate(order._id, {
            $set: { orderTripSummary: orderTripSummary },
        });
        //*** Create trip summary end ***/

        //*** Find Rider Start***/
        if (type !== 'schedule') {
            await checkNearByDeliveryBoyForButler(order._id);
        }
        //*** Find Rider End***/

        // for adjust balance
        // if (summary?.baseCurrency_wallet > 0) {
        //     const transaction_user = await TransactionModel.create({
        //         user: order.user,
        //         amount: order.summary.baseCurrency_wallet,
        //         secondaryCurrency_amount:
        //             order.summary.secondaryCurrency_wallet,
        //         userNote: 'Order Payment Completed',
        //         adminNote: 'User order pay throw wallet & card adjustable',
        //         account: 'user',
        //         type: 'userPayBeforeReceivedOrderByWallet',
        //         status: 'success',
        //         orderId: order._id,
        //         isButler: true,
        //         paidCurrency: order.paidCurrency,
        //     });

        //     await UserModel.updateOne(
        //         { _id: userId },
        //         {
        //             $inc: {
        //                 tempBalance: -order.summary.baseCurrency_wallet,
        //             },
        //         }
        //     );
        // }

        // const transaction = await userOrderCreateTransection(
        //     order,
        //     cardTypeString,
        //     cardId
        // );

        // const tnxHistory = [transaction._id];

        // await Butler.updateOne(
        //     { _id: order._id },
        //     {
        //         $set: {
        //             transactionHistory: tnxHistory,
        //             transactions: transaction._id,
        //         },
        //     }
        // );

        const orderFullInformation = await getFullOrderInformationForButler(
            order._id
        );

        await sendNotificationsAllApp(orderFullInformation);
        // await sendPlaceOrderEmail(order._id);

        successResponse(res, {
            message: 'Order placed successfully',
            data: {
                order: orderFullInformation,
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
        const { cardId, amount, deliveryAddress, receivedAddress, summary } =
            req.body;

        if (!deliveryAddress || !receivedAddress) {
            return errorResponse(
                res,
                'deliveryAddress or receivedAddress is required'
            );
        }

        if (!cardId) return errorResponse(res, 'cardId is required');

        const checkingOrderValidity = await checkingPlaceOrderValidity(
            userId,
            receivedAddress,
            deliveryAddress,
            summary
        );
        if (checkingOrderValidity)
            return errorResponse(res, checkingOrderValidity);

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
                redirectResponseUrl: `${process.env.WEBSITE_URL}app/user/butler/areeba-payment-completed`,
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

        await ButlerRequestModel.create({
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
        const { 'order.id': orderId, 'transaction.id': transactionId } =
            req.body;

        const orderRequest = await ButlerRequestModel.findOne({
            'areebaCard.orderId': orderId,
        }).lean();

        if (!orderRequest)
            return scriptResponse(res, `failed/orderRequest not found`);

        const { summary, areebaCard } = orderRequest;

        await ButlerRequestModel.findByIdAndDelete(orderRequest._id);

        const newTransactionId = ObjectId();
        const currency = 'USD';

        const authorizePutData = {
            apiOperation: 'AUTHORIZE',
            authentication: {
                transactionId: transactionId,
            },
            order: {
                amount: summary?.baseCurrency_card,
                currency: currency,
                reference: orderId,
            },
            sourceOfFunds: {
                token: areebaCard?.token,
            },
            transaction: {
                reference: transactionId,
            },
        };

        const { data: authorizeData } = await areebaPaymentGateway(
            orderId,
            newTransactionId,
            authorizePutData
        );

        if (authorizeData?.result == 'ERROR')
            return scriptResponse(
                res,
                `failed/${authorizeData?.error?.explanation}`
            );

        if (
            authorizeData?.transaction?.authenticationStatus !=
            'AUTHENTICATION_SUCCESSFUL'
        )
            return scriptResponse(
                res,
                `failed/Authentication is not successful`
            );

        orderRequest.areebaCard.transactionId = newTransactionId;
        req.body = orderRequest;
        req.userId = orderRequest.userId;

        const order = await placeOrderFunc(req);

        const orderFullInformation = await getFullOrderInformationForButler(
            order._id
        );

        await sendNotificationsAllApp(orderFullInformation);
        // await sendPlaceOrderEmail(order._id);

        return scriptResponse(res, `success/${order._id}`);
    } catch (error) {
        console.log(error);
        return scriptResponse(res, `failed/${error.message}`);
    }
};

const placeOrderFunc = async req => {
    try {
        const userId = req.userId;
        let {
            orderType,
            receivedAddress,
            deliveryAddress,
            itemDescription,
            products,
            deliveryBoyNote,
            order_delivery_charge_id,
            summary,
            paymentMethod,
            type = 'now',
            note,
            scheduleDate,
            rewardPoints,
            adminExchangeRate = 0,
            paymentOn,
            selectedPaymentMethod,
            areebaCard,
        } = req.body;

        let timeline = [
            {
                title: 'Order placed',
                status: 'placed',
                note: 'New Order placed',
                active: true,
                createdAt: new Date(),
            },
            {
                title: 'Accepted delivery boy',
                status: 'accepted_delivery_boy',
                note: 'Accepted delivery boy',
                active: false,
                createdAt: null,
            },

            {
                title: 'Order on the way',
                status: 'order_on_the_way',
                note: 'Order on the way',
                active: false,
                createdAt: null,
            },
            {
                title: 'Delivered',
                status: 'delivered',
                note: 'Delivered',
                active: false,
                createdAt: null,
            },
        ];

        let orderActivity = [
            {
                note: 'user order placed',
                activityBy: 'user',
                userId: userId,
                createdAt: new Date(),
            },
        ];

        const incOrder = await UniqueId.findOneAndUpdate(
            {},
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        let orderIdUnique = String(incOrder.count).padStart(6, '0');
        orderIdUnique = '' + moment().format('DDMMYY') + orderIdUnique;
        orderIdUnique = getRendomString(1) + orderIdUnique;

        const order_delivery_charge = await OrderDeliveryCharge.findOne({
            _id: order_delivery_charge_id,
        }).populate('dropChargeId');

        let adminCharge = {
            baseCurrency_adminChargeFromDelivery: order_delivery_charge.dropFee,
            baseCurrency_totalAdminCharge: order_delivery_charge.dropFee,
        };

        const deliveryBoyFee = order_delivery_charge.deliveryBoyFee;

        const receivedAddressToDeliveryAddressDistance =
            await DistanceInfoGoogle({
                origin: {
                    latitude: receivedAddress.location.coordinates[1],
                    longitute: receivedAddress.location.coordinates[0],
                },
                distination: {
                    latitude: deliveryAddress.location.coordinates[1],
                    longitute: deliveryAddress.location.coordinates[0],
                },
            });

        // Calculate delivered_time
        const delivered_time = new Date();
        delivered_time.setMinutes(
            delivered_time.getMinutes() +
            Number(
                receivedAddressToDeliveryAddressDistance?.duration?.value
            ) /
            60 +
            10
        );

        //*** Start apply exchange rate ***/
        summary = applyExchangeRateInButlerSummary(summary, adminExchangeRate);
        adminCharge = applyExchangeRateInButlerAdminCharge(
            adminCharge,
            adminExchangeRate
        );

        products = applyExchangeRateInButlerProducts(
            products,
            adminExchangeRate
        );

        const baseCurrency_riderFee = deliveryBoyFee;
        const secondaryCurrency_riderFee = deliveryBoyFee * adminExchangeRate;
        //*** End apply exchange rate ***/

        const appSetting = await AppSetting.findOne({});
        const orderData = {
            orderId: orderIdUnique,
            user: userId,
            orderStatus: type === 'now' ? 'placed' : 'schedule',
            orderCancel: null,
            orderType: orderType,
            paymentMethod: paymentMethod,
            selectPos: 'no', // yes , no
            paymentStatus: 'paid',
            deliveryAddress: deliveryAddress,
            receivedAddress: receivedAddress,
            // duplicate for frontend demand
            dropOffLocation: deliveryAddress,
            pickUpLocation: receivedAddress,
            summary: summary,
            itemDescription: itemDescription,
            products: products,
            timeline: timeline,
            orderActivity: orderActivity,
            note: note,
            deliveryDistance: order_delivery_charge.distance,
            orderDeliveryCharge: order_delivery_charge_id,
            adminCharge: adminCharge,
            baseCurrency_adminCommission:
                adminCharge.baseCurrency_totalAdminCharge,
            secondaryCurrency_adminCommission:
                adminCharge.secondaryCurrency_totalAdminCharge,
            deliveryBoyNote,
            type,
            scheduleDate: type === 'now' ? null : scheduleDate,
            baseCurrency_riderFee,
            secondaryCurrency_riderFee,
            searchingTime: new Date(),
            receivedAddressToDeliveryAddressDistance,
            delivered_time,
            rewardPoints,
            location: receivedAddress.location,
            adminExchangeRate,
            baseCurrency: appSetting?.baseCurrency,
            secondaryCurrency: appSetting?.secondaryCurrency,
            order_placedAt: new Date(),
            paymentOn,
            selectedPaymentMethod,
        };
        if (paymentMethod === 'card') {
            delete areebaCard.token;
            orderData.areebaCard = areebaCard;
        }
        const order = await Butler.create(orderData);

        //*** Create trip summary start ***/
        const userInfo = await UserModel.findOne({
            _id: userId,
        });

        const { distance, duration, legs, overview_polyline } =
            await DistanceInfoGoogleWithWayPoints({
                origin: {
                    latitude: receivedAddress.location.coordinates[1],
                    longitude: receivedAddress.location.coordinates[0],
                },
                destination: {
                    latitude: deliveryAddress.location.coordinates[1],
                    longitude: deliveryAddress.location.coordinates[0],
                },
                waypoints: [],
            });

        let orderTripSummary = [
            {
                name: receivedAddress.name || 'Shop',
                address: receivedAddress.address,
                latitude: receivedAddress.location.coordinates[1],
                longitude: receivedAddress.location.coordinates[0],
                type: 'user',
                user: userInfo._id,
                order: [order._id],
                totalDistance: distance,
                totalDuration: duration,
                total_overview_polyline: overview_polyline,
                distance: legs[0].distance,
                duration: legs[0].duration,
                overview_polyline: legs[0].overview_polyline,
            },
            {
                name: deliveryAddress.name,
                address: deliveryAddress.address,
                latitude: deliveryAddress.location.coordinates[1],
                longitude: deliveryAddress.location.coordinates[0],
                type: 'user',
                order: [order._id],
            },
        ];

        await Butler.findByIdAndUpdate(order._id, {
            $set: { orderTripSummary: orderTripSummary },
        });
        //*** Create trip summary end ***/

        //*** Find Rider Start***/
        if (type !== 'schedule') {
            await checkNearByDeliveryBoyForButler(order._id);
        }
        //*** Find Rider End***/

        return order;
    } catch (error) {
        console.log(error);
    }
};

exports.userPlaceOrderWithWallet = async (req, res) => {
    try {
        const userId = req.userId;
        let {
            orderType,
            receivedAddress,
            deliveryAddress,
            itemDescription,
            products,
            deliveryBoyNote,
            order_delivery_charge_id,
            summary,
            paymentMethod,
            pos,
            type,
            note,
            scheduleDate,
            rewardPoints,
            adminExchangeRate = 0,
            paymentOn,
            selectedPaymentMethod,
        } = req.body;

        const checkingOrderValidity = await checkingPlaceOrderValidity(
            userId,
            receivedAddress,
            deliveryAddress,
            summary
        );
        if (checkingOrderValidity)
            return errorResponse(res, checkingOrderValidity);

        let timeline = [
            {
                title: 'Accepted delivery boy',
                status: 'accepted_delivery_boy',
                note: 'Accepted delivery boy',
                active: false,
                createdAt: null,
            },
            {
                title: 'Order on the way',
                status: 'order_on_the_way',
                note: 'Order on the way',
                active: false,
                createdAt: null,
            },
            {
                title: 'Delivered',
                status: 'delivered',
                note: 'Delivered',
                active: false,
                createdAt: null,
            },
        ];

        let orderActivity = [];

        //Check order is sheduled or not and update timeline according to it.
        if (type == 'schedule') {
            timeline.unshift({
                title: 'Order placed',
                status: 'placed',
                note: `Schedule Order placed ${scheduleDate}`,
                active: false,
                createdAt: null,
            });

            orderActivity.push({
                note: `Schedule Order placed ${scheduleDate}`,
                activityBy: 'user',
                userId: userId,
                createdAt: new Date(),
                scheduleDate,
            });
        } else {
            timeline.unshift({
                title: 'Order placed',
                status: 'placed',
                note: 'New Order placed',
                active: true,
                createdAt: new Date(),
            });

            orderActivity.push({
                note: 'user order placed',
                activityBy: 'user',
                userId: userId,
                createdAt: new Date(),
            });
        }

        const incOrder = await UniqueId.findOneAndUpdate(
            {},
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        let orderIdUnique = String(incOrder.count).padStart(6, '0');
        orderIdUnique = '' + moment().format('DDMMYY') + orderIdUnique;
        //orderIdUnique = getRendomString(3) + orderIdUnique;

        const order_delivery_charge = await OrderDeliveryCharge.findOne({
            _id: order_delivery_charge_id,
        }).populate('dropChargeId');

        let adminCharge = {
            baseCurrency_adminChargeFromDelivery: order_delivery_charge.dropFee,
            baseCurrency_totalAdminCharge: order_delivery_charge.dropFee,
        };

        const deliveryBoyFee = order_delivery_charge.deliveryBoyFee;

        const receivedAddressToDeliveryAddressDistance =
            await DistanceInfoGoogle({
                origin: {
                    latitude: receivedAddress.location.coordinates[1],
                    longitute: receivedAddress.location.coordinates[0],
                },
                distination: {
                    latitude: deliveryAddress.location.coordinates[1],
                    longitute: deliveryAddress.location.coordinates[0],
                },
            });

        // Calculate delivered_time
        const delivered_time = new Date();
        delivered_time.setMinutes(
            delivered_time.getMinutes() +
            Number(
                receivedAddressToDeliveryAddressDistance?.duration?.value
            ) /
            60 +
            10
        );

        //*** Start apply exchange rate ***/
        summary = applyExchangeRateInButlerSummary(summary, adminExchangeRate);
        adminCharge = applyExchangeRateInButlerAdminCharge(
            adminCharge,
            adminExchangeRate
        );

        products = applyExchangeRateInButlerProducts(
            products,
            adminExchangeRate
        );

        const baseCurrency_riderFee = deliveryBoyFee;
        const secondaryCurrency_riderFee = deliveryBoyFee * adminExchangeRate;
        //*** End apply exchange rate ***/

        const appSetting = await AppSetting.findOne({});
        const orderData = {
            orderId: orderIdUnique,
            user: userId,
            orderStatus: type === 'now' ? 'placed' : 'schedule',
            orderCancel: null,
            orderType: orderType,
            paymentMethod: 'wallet',
            selectPos: 'no', // yes , no
            paymentStatus: 'paid',
            deliveryAddress: deliveryAddress,
            receivedAddress: receivedAddress,
            // duplicate for frontend demand
            dropOffLocation: deliveryAddress,
            pickUpLocation: receivedAddress,
            summary: summary,
            itemDescription: itemDescription,
            products: products,
            timeline: timeline,
            orderActivity: orderActivity,
            note: note,
            deliveryDistance: order_delivery_charge.distance,
            orderDeliveryCharge: order_delivery_charge_id,
            adminCharge: adminCharge,
            baseCurrency_adminCommission:
                adminCharge.baseCurrency_totalAdminCharge,
            secondaryCurrency_adminCommission:
                adminCharge.secondaryCurrency_totalAdminCharge,
            deliveryBoyNote,
            type,
            scheduleDate: type === 'now' ? null : scheduleDate,
            baseCurrency_riderFee,
            secondaryCurrency_riderFee,
            searchingTime: new Date(),
            receivedAddressToDeliveryAddressDistance,
            delivered_time,
            rewardPoints,
            location: receivedAddress.location,
            adminExchangeRate,
            baseCurrency: appSetting?.baseCurrency,
            secondaryCurrency: appSetting?.secondaryCurrency,
            order_placedAt: new Date(),
            paymentOn,
            selectedPaymentMethod,
        };

        const order = await Butler.create(orderData);

        //*** Create trip summary start ***/
        const userInfo = await UserModel.findOne({
            _id: userId,
        });

        const { distance, duration, legs, overview_polyline } =
            await DistanceInfoGoogleWithWayPoints({
                origin: {
                    latitude: receivedAddress.location.coordinates[1],
                    longitude: receivedAddress.location.coordinates[0],
                },
                destination: {
                    latitude: deliveryAddress.location.coordinates[1],
                    longitude: deliveryAddress.location.coordinates[0],
                },
                waypoints: [],
            });

        let orderTripSummary = [
            {
                name: receivedAddress.name || 'Shop',
                address: receivedAddress.address,
                latitude: receivedAddress.location.coordinates[1],
                longitude: receivedAddress.location.coordinates[0],
                type: 'user',
                user: userInfo._id,
                order: [order._id],
                totalDistance: distance,
                totalDuration: duration,
                total_overview_polyline: overview_polyline,
                distance: legs[0].distance,
                duration: legs[0].duration,
                overview_polyline: legs[0].overview_polyline,
            },
            {
                name: deliveryAddress.name,
                address: deliveryAddress.address,
                latitude: deliveryAddress.location.coordinates[1],
                longitude: deliveryAddress.location.coordinates[0],
                type: 'user',
                order: [order._id],
            },
        ];

        await Butler.findByIdAndUpdate(order._id, {
            $set: { orderTripSummary: orderTripSummary },
        });
        //*** Create trip summary end ***/

        //*** Find Rider Start***/
        if (type !== 'schedule') {
            await checkNearByDeliveryBoyForButler(order._id);
        }
        //*** Find Rider End***/

        // const transaction = await TransactionModel.create({
        //     user: order.user,
        //     amount:
        //         order.summary.baseCurrency_totalAmount +
        //         order.summary.baseCurrency_vat,
        //     secondaryCurrency_amount:
        //         order.summary.secondaryCurrency_totalAmount +
        //         order.summary.secondaryCurrency_vat,
        //     userNote: 'Order Payment Completed',
        //     adminNote: 'User order pay throw wallet',
        //     account: 'user',
        //     type: 'userPayBeforeReceivedOrderByWallet',
        //     status: 'success',
        //     orderId: order._id,
        //     isButler: true,
        //     paidCurrency: order.paidCurrency,
        // });

        // await UserModel.updateOne(
        //     { _id: userId },
        //     {
        //         $inc: {
        //             tempBalance:
        //                 -order.summary.baseCurrency_totalAmount -
        //                 order.summary.baseCurrency_vat,
        //         },
        //     }
        // );

        // const tnxHistory = [transaction._id];

        // await Butler.updateOne(
        //     { _id: order._id },
        //     {
        //         $set: {
        //             transactionHistory: tnxHistory,
        //             transactions: transaction._id,
        //         },
        //     }
        // );

        const orderFullInformation = await getFullOrderInformationForButler(
            order._id
        );

        await sendNotificationsAllApp(orderFullInformation);
        // await sendPlaceOrderEmail(order._id);

        successResponse(res, {
            message: 'Order placed successfully',
            data: {
                order: orderFullInformation,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
/********** User Placed Order End **********/

/********** 2.DeliveryMan Accept Order **********/
exports.deliveryManAcceptOrder = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const { orderId } = req.body;

        // order check
        const order = await Butler.findOne({ _id: orderId });

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        const { sta, message } = await deliveryBoyAcceptedWork(
            order,
            deliveryBoyId,
            false
        );
        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformationForButler(order._id);

        await sendNotificationsAllApp(updatedOrder);

        successResponse(res, {
            message: 'Order accepted successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};
const deliveryBoyAcceptedWork = async (order, deliveryBoyId, admin = false) => {
    if (!admin) {
        if (order.orderStatus !== 'placed') {
            return {
                sta: false,
                message: 'Order already accepted',
            };
        }
    }

    let newTimeline = order.timeline;
    newTimeline[1] = {
        title: 'Accepted delivery boy',
        status: 'accepted_delivery_boy',
        note: 'New Order placed',
        active: true,
        createdAt: new Date(),
    };

    const deliveryBoy = await DeliveryBoyModel.findOne({
        _id: deliveryBoyId,
    });

    const userInfo = await UserModel.findOne({
        _id: order.user,
    });

    const deliveryBoyReceivedAddressDistance = await DistanceInfoGoogle({
        origin: {
            latitude: deliveryBoy.location.coordinates[1],
            longitute: deliveryBoy.location.coordinates[0],
        },
        distination: {
            latitude: order.receivedAddress.location.coordinates[1],
            longitute: order.receivedAddress.location.coordinates[0],
        },
    });

    // Calculate delivered_time
    const delivered_time = new Date();
    delivered_time.setMinutes(
        delivered_time.getMinutes() +
        Number(deliveryBoyReceivedAddressDistance?.duration?.value) / 60 +
        Number(
            order.receivedAddressToDeliveryAddressDistance?.duration?.value
        ) /
        60
    );

    //*** Create trip summary start ***/
    const { distance, duration, legs, overview_polyline } =
        await DistanceInfoGoogleWithWayPoints({
            origin: {
                latitude: deliveryBoy.location.coordinates[1],
                longitude: deliveryBoy.location.coordinates[0],
            },
            destination: {
                latitude: order.deliveryAddress.location.coordinates[1],
                longitude: order.deliveryAddress.location.coordinates[0],
            },
            waypoints: [
                {
                    latitude: order.receivedAddress.location.coordinates[1],
                    longitude: order.receivedAddress.location.coordinates[0],
                },
            ],
        });

    let orderTripSummary = [
        {
            name: deliveryBoy.name,
            address: deliveryBoy.address,
            latitude: deliveryBoy.location.coordinates[1],
            longitude: deliveryBoy.location.coordinates[0],
            type: 'rider',
            deliveryBoy: deliveryBoy._id,
            order: [order._id],
            totalDistance: distance,
            totalDuration: duration,
            total_overview_polyline: overview_polyline,
            distance: legs[0].distance,
            duration: legs[0].duration,
            overview_polyline: legs[0].overview_polyline,
        },
        {
            name: order.receivedAddress.name || 'Shop',
            address: order.receivedAddress.address,
            latitude: order.receivedAddress.location.coordinates[1],
            longitude: order.receivedAddress.location.coordinates[0],
            type: 'user',
            user: userInfo._id,
            order: [order._id],
            distance: legs[1].distance,
            duration: legs[1].duration,
            overview_polyline: legs[1].overview_polyline,
        },
        {
            name: order.deliveryAddress.name,
            address: order.deliveryAddress.address,
            latitude: order.deliveryAddress.location.coordinates[1],
            longitude: order.deliveryAddress.location.coordinates[0],
            type: 'user',
            order: [order._id],
        },
    ];
    //*** Create trip summary end ***/

    // Check delivery boy order limitation
    const orders = await Order.countDocuments({
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
    const butlers = await Butler.countDocuments({
        deliveryBoy: ObjectId(deliveryBoyId),
        orderStatus: {
            $in: ['accepted_delivery_boy', 'order_on_the_way'],
        },
    });

    if (orders > 0 || butlers > 0) {
        return {
            sta: false,
            message: `Delivery Boy isn't available right now.`,
        };
    }

    if (
        admin &&
        ['accepted_delivery_boy', 'order_on_the_way'].includes(
            order.orderStatus
        )
    ) {
        await Butler.updateOne(
            {
                _id: order._id,
            },
            {
                $set: {
                    deliveryBoy: deliveryBoyId,
                    deliveryBoyReceivedAddressDistance:
                        deliveryBoyReceivedAddressDistance,
                    orderTripSummary: orderTripSummary,
                    delivered_time: delivered_time,
                },
            }
        );
    } else {
        await Butler.updateOne(
            {
                _id: order._id,
            },
            {
                $set: {
                    orderStatus: 'accepted_delivery_boy',
                    deliveryBoy: deliveryBoyId,
                    timeline: newTimeline,
                    accepted_delivery_boyAt: new Date(),
                    deliveryBoyReceivedAddressDistance:
                        deliveryBoyReceivedAddressDistance,
                    orderTripSummary: orderTripSummary,
                    delivered_time: delivered_time,
                },
                $push: {
                    orderActivity: admin
                        ? {
                            note: 'Admin assign delivery Boy',
                            activityBy: 'deliveryBoy',
                            deliveryBoy: deliveryBoyId,
                            createdAt: new Date(),
                        }
                        : {
                            note: 'Accepted Order by delivery Boy',
                            activityBy: 'deliveryBoy',
                            deliveryBoy: deliveryBoyId,
                            createdAt: new Date(),
                        },
                },
            }
        );
    }

    // for clear delivery boy remaining request orders list
    await Order.updateMany(
        {
            orderStatus: {
                $in: ['placed', 'preparing'],
            },
            deliveryBoy: { $exists: false },
            deliveryBoyList: {
                $in: [deliveryBoyId],
            },
        },
        {
            $pull: {
                deliveryBoyList: deliveryBoyId,
            },
        }
    );
    await Butler.updateMany(
        {
            orderStatus: 'placed',
            deliveryBoy: { $exists: false },
            deliveryBoyList: {
                $in: [deliveryBoyId],
            },
        },
        {
            $pull: {
                deliveryBoyList: deliveryBoyId,
            },
        }
    );

    return {
        sta: true,
        message: 'Order accepted successfully',
    };
};

/********** 3.DeliveryMan Pick Order **********/
exports.deliveryManPickOrder = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const {
            orderId,
            paidCurrency,
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        } = req.body;

        // order timeline update
        const order = await Butler.findOne({ _id: orderId }).lean();

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (deliveryBoyId != order.deliveryBoy) {
            return errorResponse(res, 'you are not allowed to pick this order');
        }

        const { sta, message } = await deliveryBoyPickOrderWork(
            order,
            paidCurrency,
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        );

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformationForButler(order._id);

        await sendNotificationsAllApp(updatedOrder);

        res.status(200).json({
            status: true,
            message: 'Order Picked successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};
const deliveryBoyPickOrderWork = async (
    order,
    paidCurrency,
    baseCurrency_collectCash,
    secondaryCurrency_collectCash,
    baseCurrency_receivedCash,
    secondaryCurrency_receivedCash,
    baseCurrency_returnedCash,
    secondaryCurrency_returnedCash,
) => {
    if (!order.deliveryBoy) {
        return {
            sta: false,
            message: 'You need to assign a rider first',
        };
    }

    if (order.orderStatus !== 'accepted_delivery_boy') {
        return {
            sta: false,
            message: `Order has already been ${order?.orderStatus}`,
        };
    }

    let newTimeline = order.timeline;

    newTimeline[2] = {
        title: 'Order on the way',
        status: 'order_on_the_way',
        note: 'Order on the way',
        active: true,
        createdAt: new Date(),
    };

    // update order with new timeline & history
    await Butler.updateOne(
        { _id: order._id },
        {
            orderStatus: 'order_on_the_way',
            timeline: newTimeline,
            order_on_the_wayAt: new Date(),
            paidCurrency,
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
            $push: {
                orderActivity: {
                    note: 'Order Picked',
                    activityBy: 'deliveryBoy',
                    deliveryBoy: order.deliveryBoy,
                    createdAt: new Date(),
                },
            },
        }
    );

    // Update all order transaction paidCurrency
    if (paidCurrency && paidCurrency !== 'baseCurrency') {
        await TransactionModel.updateMany(
            {
                butler: order._id,
            },
            {
                paidCurrency: paidCurrency,
            }
        );
    }

    return {
        sta: true,
        message: 'Order updated',
    };
};

/********** 4.DeliveryMan Accept Order **********/
exports.deliveryManCompletedOrder = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const {
            orderId,
            pos,
            paidCurrency,
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        } = req.body;

        // order check
        const order = await Butler.findOne({ _id: orderId }).lean();

        if (order.deliveryBoy != deliveryBoyId) {
            return errorResponse(res, 'delivery boy not permitted ');
        }

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        const { sta, message } = await deliveryManCompletedOrderWork(
            order,
            pos,
            paidCurrency,
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        );

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformationForButler(order._id);

        await sendNotificationsAllApp(updatedOrder);

        successResponse(res, {
            message: 'Order Delivered successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};
const deliveryManCompletedOrderWork = async (
    order,
    pos,
    paidCurrency,
    baseCurrency_collectCash,
    secondaryCurrency_collectCash,
    baseCurrency_receivedCash,
    secondaryCurrency_receivedCash,
    baseCurrency_returnedCash,
    secondaryCurrency_returnedCash,
) => {
    if (!order.deliveryBoy) {
        return {
            sta: false,
            message: 'You need to assign a rider first',
        };
    }

    if (order.orderStatus !== 'order_on_the_way') {
        return {
            sta: false,
            message: `Order has already been ${order?.orderStatus}`,
        };
    }

    let newTimeline = order.timeline;
    newTimeline.pop();
    newTimeline.push({
        title: 'Order Delivered',
        status: 'delivered',
        note: 'Order Delivered',
        active: true,
        createdAt: new Date(),
    });

    // update order with new timeline & history

    let transactionList = [];
    let transactionDeliveryBoy = null;
    let transaction = null;
    let transactionDrop = null;

    if (order.paymentMethod === 'cash') {
        if (pos) {
            transaction = await userOrderCreateTransection(
                order,
                order.user,
                order.summary.baseCurrency_cash,
                order.summary.secondaryCurrency_cash,
                order.summary,
                order.paymentMethod,
                'Cash With POS'
            );

            transactionDrop = await addDropBalanceForOrder(order);

            transactionDeliveryBoy = await deliveryBoyBalanceAddForOrder(
                order,
                'deliveryBoyOrderDelivered',
                'success',
                true
            );

            if (transaction) {
                transactionList.push(transaction._id);
            }
            if (transactionDrop) {
                transactionList.push(transactionDrop._id);
            }
            if (transactionDeliveryBoy) {
                transactionList.push(transactionDeliveryBoy._id);
            }
        } else {
            transactionDrop = await addDropBalanceForOrder(order);

            transactionDeliveryBoy = await deliveryBoyBalanceAddForOrder(
                order,
                'deliveryBoyOrderDeliveredCash',
                'success',
                false,
                baseCurrency_collectCash,
                secondaryCurrency_collectCash,
                baseCurrency_receivedCash,
                secondaryCurrency_receivedCash,
                baseCurrency_returnedCash,
                secondaryCurrency_returnedCash,
            );

            if (transactionDrop) {
                transactionList.push(transactionDrop._id);
            }
            if (transactionDeliveryBoy) {
                transactionList.push(transactionDeliveryBoy._id);
            }
        }
    } else {
        transactionDrop = await addDropBalanceForOrder(order);

        transactionDeliveryBoy = await deliveryBoyBalanceAddForOrder(
            order,
            'deliveryBoyOrderDelivered'
        );

        if (transactionDeliveryBoy) {
            transactionList.push(transactionDeliveryBoy._id);
        }
        if (transactionDrop) {
            transactionList.push(transactionDrop._id);
        }
    }

    //*** Calc user wallet and card start***/

    // for wallet
    if (order?.summary?.baseCurrency_wallet > 0) {
        const transactionUser = await TransactionModel.create({
            user: order.user,
            amount: order.summary.baseCurrency_wallet,
            secondaryCurrency_amount: order.summary.secondaryCurrency_wallet,
            userNote: 'Order Payment Completed',
            adminNote: 'User order pay throw wallet',
            account: 'user',
            type: 'userPayBeforeReceivedOrderByWallet',
            status: 'success',
            butlerId: order._id,
            paidCurrency: order.paidCurrency,
            isButler: true,
            isUserWalletRelated: true,
        });

        transactionList.push(transactionUser._id);
        transaction = transaction ? transaction : transactionUser;

        await UserModel.updateOne(
            { _id: order.user },
            {
                $inc: {
                    tempBalance: -order.summary.baseCurrency_wallet,
                },
            }
        );
    }

    // for card
    if (order?.summary?.baseCurrency_card > 0) {
        const transactionUser = await userOrderCreateTransection(
            order,
            order?.user,
            order?.summary?.baseCurrency_card,
            order?.summary?.secondaryCurrency_card,
            order?.summary,
            order?.paymentMethod,
            order?.cardTypeString,
            order?.cardId
        );

        transactionList.push(transactionUser._id);
        transaction = transaction ? transaction : transactionUser;

        // Areeba payment gateway integration
        const newTransactionId = ObjectId();
        const currency = 'USD';

        const capturePutData = {
            apiOperation: 'CAPTURE',
            transaction: {
                amount: order?.summary?.baseCurrency_card,
                currency: currency,
            },
        };

        const { data: captureData } = await areebaPaymentGateway(
            order?.areebaCard?.orderId,
            newTransactionId,
            capturePutData
        );

        if (captureData?.result == 'ERROR')
            return errorResponse(res, captureData?.error?.explanation);
    }
    //*** Calc user wallet and card end***/

    // get total delivery time take to complete a order
    const format = 'YYYY-MM-DD H:mm:ss';
    const currentDate = moment(new Date()).format(format);
    const recevingDate = moment(new Date(order.order_placedAt)).format(format);
    const differ = new Date(currentDate) - new Date(recevingDate);
    let minutes = parseInt(differ / (1000 * 60));

    // For adjust butler purchase and delivery product amount
    // let newSummary = order.summary;
    // if (butlerAdjustedAmount) {
    //     const appSetting = await AppSetting.findOne({}).select(
    //         'adminExchangeRate'
    //     );
    //     const adminExchangeRate = appSetting?.adminExchangeRate || 0;

    //     if (paidCurrency === 'secondaryCurrency') {
    //         newSummary = {
    //             ...newSummary,
    //             baseCurrency_butlerAdjustedAmount: Number(
    //                 (butlerAdjustedAmount / adminExchangeRate).toFixed(2)
    //             ),
    //             secondaryCurrency_butlerAdjustedAmount: butlerAdjustedAmount,
    //         };
    //     } else {
    //         newSummary = {
    //             ...newSummary,
    //             baseCurrency_butlerAdjustedAmount: butlerAdjustedAmount,
    //             secondaryCurrency_butlerAdjustedAmount: Math.round(
    //                 butlerAdjustedAmount * adminExchangeRate
    //             ),
    //         };
    //     }
    // }

    await Butler.updateOne(
        { _id: order._id },
        {
            orderStatus: 'delivered',
            deliveredAt: new Date(),
            paymentStatus: 'paid',
            timeline: newTimeline,
            // summary: newSummary,
            $push: {
                orderActivity: {
                    note: 'Order Delivered',
                    activityBy: 'deliveryBoy',
                    deliveryBoy: order.deliveryBoy,
                    createdAt: new Date(),
                },
            },
            $set: {
                transactionHistory: transactionList,
                transactions: transaction?._id,
                transactionsDeliveryBoy: transactionDeliveryBoy
                    ? transactionDeliveryBoy?._id
                    : null,
                transactionsDrop: transactionDrop?._id,
                deliveredMinutes: minutes || 0,
                paidCurrency,
                baseCurrency_collectCash,
                secondaryCurrency_collectCash,
                baseCurrency_receivedCash,
                secondaryCurrency_receivedCash,
                baseCurrency_returnedCash,
                secondaryCurrency_returnedCash,
            },
        }
    );

    // Update all order transaction paidCurrency
    if (paidCurrency && paidCurrency !== 'baseCurrency') {
        await TransactionModel.updateMany(
            {
                butler: order._id,
            },
            {
                paidCurrency: paidCurrency,
            }
        );
    }

    await orderCountInDetails(order);

    // Check rider cash settlement limit
    if (order.deliveryBoy && order.summary.baseCurrency_cash > 0) {
        const appSetting = await AppSetting.findOne({}).select(
            'riderBOBCashSettlementLimit'
        );
        const riderBOBCashSettlementLimit =
            appSetting?.riderBOBCashSettlementLimit || 0;

        if (riderBOBCashSettlementLimit > 0) {
            const { riderCashInHand } = await getRiderCashInHand({
                riderId: order.deliveryBoy,
            });

            if (riderCashInHand >= riderBOBCashSettlementLimit) {
                const rider = await DeliveryBoyModel.findById(
                    order.deliveryBoy
                ).select('liveStatus');

                if (rider.liveStatus !== 'offline') {
                    const lastOnline = rider.lastOnline || new Date();

                    const total = calcActiveTime(lastOnline, new Date());
                    await DeliveryBoyTimeModel.create({
                        delivery: order.deliveryBoy,
                        Date: new Date(),
                        timeIn: lastOnline,
                        timeOut: moment(new Date()).format(
                            'DD MMM YYYY hh:mm A'
                        ),
                        activeTotal: total,
                    });
                }

                await DeliveryBoyModel.findByIdAndUpdate(order.deliveryBoy, {
                    $set: {
                        liveStatus: 'offline',
                        isCashSettlementLimitReached: true,
                    },
                });
            }
        }
    }

    return {
        sta: true,
        message: 'Order updated',
    };
};

/********** User Cancel Order **********/
exports.cancelOrderByUser = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, cancelReasonId, otherReason = 'No reason' } = req.body;

        const order = await Butler.findById(orderId);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        // check proper user
        if (order.user.toString() !== userId) {
            return errorResponse(res, 'You are not a valid user');
        }

        if (
            !['schedule', 'placed', 'accepted_delivery_boy'].includes(
                order.orderStatus
            )
        ) {
            return errorResponse(res, "You Can't Cancel this Order");
        }

        const cancelObject = getCancelObject({
            canceledBy: 'user',
            userId: order.user,
            cancelReasonId: cancelReasonId,
            otherReason: otherReason,
        });

        // Areeba payment gateway integration
        if (order.summary.baseCurrency_card > 0) {
            const newTransactionId = ObjectId();

            const voidPutData = {
                apiOperation: 'VOID',
                transaction: {
                    targetTransactionId: order?.areebaCard?.transactionId,
                },
            };

            const { data: voidData } = await areebaPaymentGateway(
                order?.areebaCard?.orderId,
                newTransactionId,
                voidPutData
            );

            if (voidData?.result == 'ERROR')
                return errorResponse(res, voidData?.error?.explanation);
        }

        await OrderCancel({
            orderId: order._id,
            cancelObject,
            // userCancelTnx: refundTransaction,
            Model: Butler,
        });

        const updatedOrder = await getFullOrderInformationForButler(order._id);

        return successResponse(res, {
            message: 'Order cancelled successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.addOrderCancelReasonForUserApp = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, cancelReasonId, otherReason } = req.body;

        if (!cancelReasonId && !otherReason) {
            return errorResponse(
                res,
                'need a cancel reason . Please give proper reason to cancel'
            );
        }

        const order = await Butler.findById(orderId);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (order.orderStatus !== 'cancelled') {
            return errorResponse(res, 'Order is not cancelled order');
        }

        // check proper user
        if (order.user.toString() !== userId.toString()) {
            return errorResponse(res, 'You are not a valid user');
        }

        order.orderCancel.cancelReason = cancelReasonId;
        order.orderCancel.otherReason = cancelReasonId ? null : otherReason;

        await order.save();

        const updatedOrder = await getFullOrderInformationForButler(order._id);

        return successResponse(res, {
            message: 'Order cancelled reason added',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

/********** DeliveryMan Reject and Cancel Order **********/
exports.rejectOrderByDeliveryBoy = async (req, res) => {
    try {
        const { orderId } = req.body;
        const deliveryBoyId = req.deliveryBoyId;

        const order = await Butler.findById(orderId);
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (order.orderStatus !== 'placed') {
            return errorResponse(res, 'Order can not be rejected');
        }

        await Butler.updateOne(
            { _id: orderId },
            {
                $push: {
                    rejectedDeliveryBoy: deliveryBoyId,
                },
                $pull: {
                    deliveryBoyList: deliveryBoyId,
                },
            }
        );

        const updatedOrder = await getFullOrderInformationForButler(order._id);

        if (!updatedOrder.deliveryBoyList.length) {
            checkNearByDeliveryBoyShuForButler(order._id);
        }

        return res.json({
            message: 'Order Rejected',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.cancelOrderByDeliveryBoy = async (req, res) => {
    try {
        const { orderId, cancelReasonId, otherReason } = req.body;
        const deliveryBoyId = req.deliveryBoyId;

        if (!cancelReasonId && !otherReason) {
            return errorResponse(
                res,
                'need a cancel reason . Please give proper reason to cancel'
            );
        }

        const order = await Butler.findOne({
            _id: orderId,
            deliveryBoy: deliveryBoyId,
        });
        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (order.orderStatus !== 'accepted_delivery_boy') {
            return errorResponse(res, 'Order can not be canceled');
        }

        let newTimeline = order.timeline;
        newTimeline[1] = {
            title: 'Accepted delivery boy',
            status: 'accepted_delivery_boy',
            note: 'Accepted delivery boy',
            active: false,
            createdAt: null,
        };

        const cancelObject = getCancelObject({
            canceledBy: 'deliveryBoy',
            deliveryBoyId: order.deliveryBoy,
            cancelReasonId: cancelReasonId,
            otherReason: otherReason,
        });

        await Butler.updateOne(
            { _id: orderId },
            {
                $push: {
                    canceledDeliveryBoy: deliveryBoyId,
                    rejectedDeliveryBoy: deliveryBoyId,
                    orderActivity: {
                        note: 'Canceled Order by delivery Boy',
                        activityBy: 'deliveryBoy',
                        deliveryBoy: deliveryBoyId,
                        createdAt: new Date(),
                    },
                },
                $pull: {
                    deliveryBoyList: deliveryBoyId,
                },
                $set: {
                    orderStatus: 'placed',
                    orderCancel: cancelObject,
                    deliveryBoy: null,
                    accepted_delivery_boyAt: null,
                    timeline: newTimeline,
                },
            }
        );

        const updatedOrder = await getFullOrderInformationForButler(order._id);

        checkNearByDeliveryBoyShuForButler(order._id);

        await sendNotificationsAllApp(updatedOrder);

        return res.json({
            message: 'Successfully order canceled',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

/********** Admin Cancel Order **********/
exports.adminCancelOrder = async (req, res) => {
    try {
        const adminId = req.adminId;
        let {
            orderId,
            logUser, // ["rider", "user"]
            cancelReasonId,
            otherReason,
            isEndorseLoss, // true, false
            endorseLoss, // { baseCurrency_adminLoss: 11, secondaryCurrency_adminLoss: 110}
        } = req.body;

        const order = await Butler.findById(orderId);

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        if (
            ['cancelled', 'delivered', 'rejected'].includes(order.orderStatus)
        ) {
            return errorResponse(res, `Order already ${order.orderStatus}`);
        }

        let adminTransaction = null;

        // For Endorse Loss feature
        if (isEndorseLoss) {
            if (endorseLoss?.baseCurrency_adminLoss) {
                adminTransaction = await createTransaction({
                    order,
                    account: 'admin',
                    type: 'adminEndorseLoss',
                    amount: endorseLoss.baseCurrency_adminLoss,
                    secondaryCurrency_amount:
                        endorseLoss.secondaryCurrency_adminLoss,
                    adminNote: 'Admin loss money for endorse loss',
                });
            }
        }

        //*** Operations feature set flag start ***/
        if (logUser.includes('user')) {
            const userFlag = await FlagModel.create({
                butlerId: order._id,
                user: order.user,
                type: 'user',
                flaggedType: 'cancelled',
                flaggedReason: 'others',
                otherReason,
            });

            await UserModel.updateOne(
                { _id: order.user },
                {
                    $push: {
                        flags: userFlag._id,
                    },
                }
            );
        }

        if (logUser.includes('rider')) {
            const riderFlag = await FlagModel.create({
                butlerId: order._id,
                delivery: order.deliveryBoy,
                type: 'delivery',
                flaggedType: 'cancelled',
                flaggedReason: 'others',
                otherReason,
            });

            await DeliveryBoyModel.updateOne(
                { _id: order.deliveryBoy },
                {
                    $push: {
                        flags: riderFlag._id,
                    },
                }
            );
        }
        //*** Operations feature set flag end ***/

        const cancelObject = getCancelObject({
            canceledBy: 'admin',
            adminId: adminId,
            cancelReasonId: cancelReasonId,
            otherReason: otherReason,
        });

        // Areeba payment gateway integration
        if (order.summary.baseCurrency_card > 0) {
            const newTransactionId = ObjectId();

            const voidPutData = {
                apiOperation: 'VOID',
                transaction: {
                    targetTransactionId: order?.areebaCard?.transactionId,
                },
            };

            const { data: voidData } = await areebaPaymentGateway(
                order?.areebaCard?.orderId,
                newTransactionId,
                voidPutData
            );

            if (voidData?.result == 'ERROR')
                return errorResponse(res, voidData?.error?.explanation);
        }

        await OrderCancel({
            orderId: order._id,
            cancelObject,
            adminCancelTnx: adminTransaction ? adminTransaction._id : null,
            Model: Butler,
        });

        const cancelOrder = await Butler.findById(order._id).populate([
            {
                path: 'user',
                select: 'name email phone_number profile_photo',
            },
            {
                path: 'deliveryBoy',
            },
            {
                path: 'transactionsDeliveryBoy',
            },
            {
                path: 'transactionsDrop',
            },
            {
                path: 'transactionHistory',
            },
            {
                path: 'orderDeliveryCharge',
            },
            {
                path: 'transactions',
            },
            {
                path: 'userCancelTnx',
            },
            {
                path: 'cancelDeliveryTnx',
            },
            {
                path: 'adminCancelTnx',
            },
            {
                path: 'orderCancel.userId',
            },
            {
                path: 'orderCancel.cancelReason',
            },
            {
                path: 'orderCancel.deliveryBoyId',
            },
            {
                path: 'orderCancel.adminId',
            },
            {
                path: 'chats.user',
            },
            {
                path: 'chats.deliveryBoy',
            },
            {
                path: 'flag',
                populate: 'user delivery',
            },
            {
                path: 'deliveryBoyList',
            },
            {
                path: 'rejectedDeliveryBoy',
            },
        ]);

        successResponse(res, {
            message: 'Order cancelled successfully',
            data: {
                order: cancelOrder,
            },
        });
    } catch (err) {
        return errorHandler(res, err);
    }
};

/********** DeliveryMan Refused Order because User didn't agree to receive **********/
exports.deliveryManCompletedOrderRefused = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        const { orderId, pos } = req.body;

        // order check
        const order = await Butler.findOne({ _id: orderId }).lean();

        if (order.deliveryBoy != deliveryBoyId) {
            return errorResponse(res, 'delivery boy not permitted ');
        }

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        const { sta, message } = await deliveryManCompletedOrderWorkRefuse(
            order,
            pos
        );

        if (!sta) {
            return errorResponse(res, message);
        }

        const updatedOrder = await getFullOrderInformationForButler(order._id);

        await sendNotificationsAllApp(updatedOrder);

        successResponse(res, {
            message: 'Order Refused successfully',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};
const deliveryManCompletedOrderWorkRefuse = async (order, pos) => {
    if (!order.deliveryBoy) {
        return {
            sta: false,
            message: 'You need to assign a rider first',
        };
    }

    let newTimeline = order.timeline;
    newTimeline.pop();
    newTimeline.push({
        title: 'Order refused',
        status: 'refused',
        note: 'Order refused',
        active: true,
        createdAt: new Date(),
    });

    // update order with new timeline & history

    let transactionList = [];
    let transactionDeliveryBoy = null;
    let transaction = null;

    if (order.paymentMethod == 'cash') {
        if (pos) {
            transactionDeliveryBoy = await deliveryBoyBalanceAddForOrder(
                order,
                'deliveryBoyOrderDeliveredCashRefused'
            );

            if (transactionDeliveryBoy) {
                transactionList.push(transactionDeliveryBoy._id);
            }
        } else {
            transactionDeliveryBoy = await TransactionModel.create({
                order: order._id,
                autoTrxId: `${moment().format('DDMMYYHmmss')}${short().new()}`,
                account: 'deliveryBoy',
                type: 'deliveryBoyOrderDeliveredCashRefused',
                paymentMethod: 'cash',
                pos: pos ? true : false,
                status: 'success',
                deliveryBoyHand: true,
                user: order.user,
                deliveryBoy: order.deliveryBoy,
                summary: order.summary,
                amount: order.baseCurrency_riderFee,
                secondaryCurrency_amount: order.secondaryCurrency_riderFee,
                deliveryBoyGet: order.baseCurrency_riderFee,
                unSettleAmount: order.baseCurrency_riderFee,
                dropGet: order.adminCharge.baseCurrency_totalAdminCharge,
                dropGetFromDeliveryBoy:
                    order.adminCharge.baseCurrency_totalAdminCharge,
                sendToDropAmount: 0,
                isButler: true,
                paidCurrency: order.paidCurrency,
            });

            if (transactionDeliveryBoy) {
                transactionList.push(transactionDeliveryBoy._id);
            }
        }
    }

    // get total delivery time take to complete a order
    const format = 'YYYY-MM-DD H:mm:ss';
    const currentDate = moment(new Date()).format(format);
    const recevingDate = moment(new Date(order.order_placedAt)).format(format);
    const differ = new Date(currentDate) - new Date(recevingDate);
    let minutes = parseInt(differ / (1000 * 60));

    const flag = await FlagModel.create({
        butlerId: order._id,
        comment: 'Butler order refused by user',
        isRefused: true,
        type: 'refused',
    });

    await Butler.updateOne(
        { _id: order._id },
        {
            orderStatus: 'refused',
            refusedAt: new Date(),
            timeline: newTimeline,
            $push: {
                orderActivity: {
                    note: 'Order refused',
                    activityBy: 'deliveryBoy',
                    deliveryBoy: order.deliveryBoy,
                    createdAt: new Date(),
                },
                flag: flag._id,
            },
            $set: {
                transactionHistory: transactionList,
                transactions: transaction?._id,
                transactionsDeliveryBoy: transactionDeliveryBoy
                    ? transactionDeliveryBoy?._id
                    : null,
                deliveredMinutes: minutes || 0,
                flaggedAt: new Date(),
            },
        }
    );

    return {
        sta: true,
        message: 'Order accepted successfully',
    };
};

exports.getFiveOrder = async (req, res) => {
    try {
        const { userId } = req.query;

        const orders = await Butler.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(5);

        successResponse(res, {
            message: 'Successfully get',
            data: orders,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getOrderListForAdmin = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            type = 'all',
            startDate,
            endDate,
            searchKey,
            user,
            deliveryBoy,
            orderType,
        } = req.query;

        let config = {};

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

        if (type != 'all') {
            config.orderStatus = type;
        }

        if (user) {
            config.user = user;
        }

        if (deliveryBoy) {
            config.deliveryBoy = deliveryBoy;
        }

        if (
            orderType &&
            ['delivery_only', 'purchase_delivery'].includes(orderType)
        ) {
            config.orderType = orderType;
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const orderIDSearchQuery = newQuery.map(str => ({
                orderId: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const noteSearchQuery = newQuery.map(str => ({
                note: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [
                            { $and: orderIDSearchQuery },
                            { $and: noteSearchQuery },
                            { $and: autoGenIdQ },
                        ],
                    },
                ],
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: Butler,
            condition: config,
            pagingRange: 5,
        });

        const orders = await Butler.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: '-password',
                },
                {
                    path: 'deliveryBoy',
                    select: '-password',
                },
                {
                    path: 'chats.user',
                },
                {
                    path: 'chats.deliveryBoy',
                },
                {
                    path: 'flag',
                    populate: 'user delivery',
                },
                {
                    path: 'orderCancel',
                    populate: 'cancelReason',
                },
                {
                    path: 'deliveryBoyList',
                    select: '-password',
                },
                {
                    path: 'rejectedDeliveryBoy',
                    select: '-password',
                },
            ]);

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                orders,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderListForDeliveryBoy = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            type,
            startDate,
            endDate,
            filterUser,
        } = req.query;

        const deliveryBoyId = req.deliveryBoyId;

        if (
            !type ||
            !['requested', 'active', 'completed', 'cancelled'].includes(type)
        ) {
            return errorResponse(res, 'Invalid type');
        }

        // type = >
        // 1. requested
        // 2. active order
        // 3. completed order
        // 4. cancelled order

        let config = {};

        if (type && type == 'requested') {
            config = {
                ...config,
                orderStatus: 'placed',
                deliveryBoyList: {
                    $in: [deliveryBoyId],
                },
                rejectedDeliveryBoy: {
                    $nin: [deliveryBoyId],
                },
            };
        }

        if (type && type == 'active') {
            config = {
                ...config,
                deliveryBoy: deliveryBoyId,
                orderStatus: {
                    $in: ['accepted_delivery_boy', 'order_on_the_way'],
                },
            };
        }

        if (type && type == 'completed') {
            config = {
                ...config,
                deliveryBoy: deliveryBoyId,
                orderStatus: {
                    $in: ['delivered', 'refused'],
                },
            };
            if (filterUser.length >= 3) {
                const listOfUsers = JSON.parse(filterUser);
                config = {
                    ...config,
                    user: {
                        $in: listOfUsers,
                    },
                };
            }
        }

        if (type && type == 'cancelled') {
            config = {
                ...config,
                deliveryBoy: deliveryBoyId,
                orderStatus: 'cancelled',
            };
        }

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

        const paginate = await pagination({
            page,
            pageSize,
            model: Butler,
            condition: config,
            pagingRange: 5,
        });

        const orders = await Butler.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: '-shops -address -favoritesProducts -favoritesShops',
                },
                {
                    path: 'deliveryBoy',
                },
            ]);

        const newOrders = orders.map(order => {
            const newOrder = order.toObject();
            newOrder.paymentStatusOrginal = order.paymentStatus;
            newOrder.paymentStatus =
                order.paymentStatus === 'pending'
                    ? 'cash'
                    : order.paymentStatus;
            return newOrder;
        });

        successResponse(res, {
            message: 'Successfully get orders',
            data: {
                orders: newOrders,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.orderSingleDetails = async (req, res) => {
    try {
        const { id } = req.query;

        const order = await Butler.findById(id).populate([
            {
                path: 'user',
                select: 'name email phone_number profile_photo',
            },
            {
                path: 'deliveryBoy',
            },
            {
                path: 'transactionsDeliveryBoy',
            },
            {
                path: 'transactionsDrop',
            },
            {
                path: 'transactionHistory',
            },
            {
                path: 'orderDeliveryCharge',
            },
            {
                path: 'transactions',
            },
            {
                path: 'userCancelTnx',
            },
            {
                path: 'cancelDeliveryTnx',
            },
            {
                path: 'adminCancelTnx',
            },
            {
                path: 'orderCancel.userId',
            },
            {
                path: 'orderCancel.cancelReason',
            },
            {
                path: 'orderCancel.deliveryBoyId',
            },
            {
                path: 'orderCancel.adminId',
            },
            {
                path: 'chats.user',
            },
            {
                path: 'chats.deliveryBoy',
            },
            {
                path: 'flag',
                populate: 'user delivery',
            },
            {
                path: 'deliveryBoyList',
            },
            {
                path: 'rejectedDeliveryBoy',
            },
        ]);

        // products
        // add a colum in order.

        if (!order) {
            return errorResponse(res, 'Order not found');
        }

        successResponse(res, {
            message: 'Successfully get Order',
            data: {
                order,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateOrderStatusByAdmin = async (req, res) => {
    try {
        const {
            orderId,
            orderStatus,
            deliveryBoy,
            paidCurrency,
            baseCurrency_collectCash,
            secondaryCurrency_collectCash,
            baseCurrency_receivedCash,
            secondaryCurrency_receivedCash,
            baseCurrency_returnedCash,
            secondaryCurrency_returnedCash,
        } = req.body;

        const order = await Butler.findOne({ _id: orderId }).lean();

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        if (orderStatus === 'accepted_delivery_boy') {
            if (deliveryBoy) {
                const { sta, message } = await deliveryBoyAcceptedWork(
                    order,
                    deliveryBoy,
                    true
                );
                if (!sta) {
                    return errorResponse(res, message);
                }
            } else {
                return errorResponse(res, 'select a delivery boy');
            }
        } else if (orderStatus === 'order_on_the_way') {
            const { sta, message } = await deliveryBoyPickOrderWork(
                order,
                paidCurrency,
                baseCurrency_collectCash,
                secondaryCurrency_collectCash,
                baseCurrency_receivedCash,
                secondaryCurrency_receivedCash,
                baseCurrency_returnedCash,
                secondaryCurrency_returnedCash,
            );

            if (!sta) {
                return errorResponse(res, message);
            }
        } else if (orderStatus === 'delivered') {
            const { sta, message } = await deliveryManCompletedOrderWork(
                order,
                false,
                paidCurrency,
                baseCurrency_collectCash,
                secondaryCurrency_collectCash,
                baseCurrency_receivedCash,
                secondaryCurrency_receivedCash,
                baseCurrency_returnedCash,
                secondaryCurrency_returnedCash,
            );

            if (!sta) {
                return errorResponse(res, message);
            }
        }

        const updatedOrder = await getFullOrderInformationForButler(order._id);

        if (orderStatus === 'accepted_delivery_boy') {
            await sendNotificationsDeliveryBoyUpdated(updatedOrder);
        } else {
            await sendNotificationsAllApp(updatedOrder);
        }

        return res.json({
            message: 'Order Updated',
            status: true,
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

exports.userOrdersforAdmin = async (req, res) => {
    try {
        const { userId, page = 1, pageSize = 50 } = req.query;

        let whereConfig = {
            user: userId,
        };

        const orders = await Butler.find(whereConfig).populate([
            {
                path: 'user',
            },
            {
                path: 'deliveryBoy',
            },
        ]);

        var paginate = await pagination({
            page,
            pageSize,
            model: Butler,
            condition: whereConfig,
            pagingRange: 5,
        });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                orders,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deliveryBoyOrdersforAdmin = async (req, res) => {
    try {
        const { deliveryId, page = 1, pageSize = 50 } = req.query;

        let whereConfig = {
            deliveryBoy: deliveryId,
            orderStatus: 'delivered',
        };

        const orders = await Butler.find(whereConfig).populate([
            {
                path: 'user',
            },
            {
                path: 'deliveryBoy',
            },
        ]);

        var paginate = await pagination({
            page,
            pageSize,
            model: Butler,
            condition: whereConfig,
            pagingRange: 5,
        });

        successResponse(res, {
            message: 'Successfully find',
            data: {
                orders,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getDeliveryChargeForButler = async (req, res) => {
    try {
        const { latitudeFrom, longitudeFrom, latitudeTo, longitudeTo } =
            req.query;

        if (!latitudeFrom && !longitudeFrom && latitudeTo && longitudeTo) {
            return errorResponse(
                res,
                'receivedAddress and  deliveryAddress not found'
            );
        }

        // total distance between to place pick & drop
        let distance = await getDistance(
            latitudeTo,
            longitudeTo,
            latitudeFrom,
            longitudeFrom,
            'k'
        );

        if (!distance) {
            distance = 1;
        }

        let dropChargeId = null;

        let distanceSelectObject = null;
        let deliveryRange = [];

        const globalDropCharge = await GlobalDropCharge.findOne({});
        if (globalDropCharge) {
            deliveryRange = globalDropCharge.deliveryRangeButler;
            dropChargeId = globalDropCharge._id;
        }

        let deliveryFee = 0;
        let deliveryPersonCut = 0;
        let dropGetFromDeliveryFee = 0;

        if (deliveryRange.length > 0) {
            let found = deliveryRange.find(item => {
                return distance >= item.from && distance <= item.to;
            });

            if (!found) {
                found = deliveryRange[deliveryRange.length - 1];
            }

            distanceSelectObject = found;
            if (found) {
                deliveryFee = found.charge;
                deliveryPersonCut = found.deliveryPersonCut;
                dropGetFromDeliveryFee = deliveryFee - deliveryPersonCut;
            }
        }

        const order_delivery_charge = await OrderDeliveryCharge.create({
            deliveryFee: deliveryFee,
            distance: distance,
            deliveryBoyFee: deliveryPersonCut,
            dropFee: dropGetFromDeliveryFee,
            dropChargeId: dropChargeId,
            selectedRangeItem: distanceSelectObject
                ? distanceSelectObject?._id
                : null,
            receiveLocation: [longitudeFrom, latitudeFrom],
            deliveryLocation: [longitudeTo, latitudeTo],
        });

        successResponse(res, {
            message: 'Delivery charge',
            data: {
                order_delivery_charge,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserOrderListForApp = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            type = 'upcoming', // upcoming & past
        } = req.query;

        let config = {
            user: userId,
        };

        if (type === 'upcoming') {
            config = {
                ...config,
                orderStatus: ['schedule', 'placed', 'accepted_delivery_boy'],
            };
        } else if (type === 'past') {
            config = {
                ...config,
                orderStatus: ['delivered', 'refused', 'cancelled'],
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: Butler,
            condition: config,
            pagingRange: 5,
        });

        const list = await Butler.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: 'name gender phone_number email status dob account_type',
                },
                {
                    path: 'deliveryBoy',
                },
                {
                    path: 'transactions',
                },
                {
                    path: 'transactionsDrop',
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
            ]);

        successResponse(res, {
            message: 'Successfully get transactions',
            data: {
                order: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserPastOrder = async (req, res) => {
    try {
        const { userId } = req.query;

        const pastOrders = await Butler.find({
            user: userId,
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

/********** Rating system Start **********/
exports.orderRatingForUserApp = async (req, res) => {
    try {
        const { orderId, rating, reviewDes, reviewTags, type } = req.body;

        if (type && !['deliveryBoy'].includes(type))
            return errorResponse(res, `${type} is not a valid type`);

        const order = await Butler.findById(orderId);

        if (!order) return errorResponse(res, 'Order not found');

        if (type === 'deliveryBoy') {
            if (order.deliveryBoyRated == true)
                return errorResponse(res, 'Already rated to deliverBoy');
        }

        await Butler.updateOne(
            { _id: orderId },
            {
                $push: {
                    reviews: {
                        type,
                        rating,
                        reviewDes,
                        reviewTags,
                    },
                },
                deliveryBoyRated: type === 'deliveryBoy' && true,
            }
        );

        if (type === 'deliveryBoy') {
            const reviewOfUser = await ReviewModel.create({
                user: order.user,
                deliveryBoy: order.deliveryBoy,
                butler: order._id,
                type,
                rating,
                reviewDes,
                reviewTags,
            });

            const averageRateOfDeliveryBoy = await getAverageRate(
                order.deliveryBoy,
                'deliveryBoy'
            );
            await DeliveryBoyModel.updateOne(
                { _id: order.deliveryBoy },
                {
                    rating: Math.round(averageRateOfDeliveryBoy),
                    $push: {
                        reviews: reviewOfUser._id,
                    },
                }
            );
        }

        const updatedOrder = await Butler.findById(orderId).populate(
            'deliveryBoy'
        );

        successResponse(res, {
            message: 'Successfully Rated',
            data: {
                order: updatedOrder,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
/********** Rating system End **********/

/********** Flag Section Start **********/
exports.makeFlagOrderByAdmin = async (req, res) => {
    try {
        const { orderId, comment, user, delivery, flaggedReason, otherReason } =
            req.body;

        const flagOrder = await Butler.findById(orderId);

        if (!flagOrder) return errorResponse(res, 'Order not found');

        if (user) {
            const flag = await FlagModel.create({
                butlerId: orderId,
                comment,
                user,
                type: 'user',
                flaggedType: 'normal',
                flaggedReason,
                otherReason,
            });

            await UserModel.updateOne(
                { _id: user },
                {
                    $push: {
                        flags: flag._id,
                    },
                }
            );

            await Butler.updateOne(
                { _id: orderId },
                {
                    $addToSet: {
                        flag: flag._id,
                        flaggedReason,
                    },
                    $set: {
                        flaggedAt: new Date(),
                    },
                }
            );
        }

        if (delivery) {
            const flag = await FlagModel.create({
                butlerId: orderId,
                comment,
                delivery,
                type: 'delivery',
                flaggedType: 'normal',
                flaggedReason,
                otherReason,
            });

            await DeliveryBoyModel.updateOne(
                { _id: delivery },
                {
                    $push: {
                        flags: flag._id,
                    },
                }
            );

            await Butler.updateOne(
                { _id: orderId },
                {
                    $addToSet: {
                        flag: flag._id,
                        flaggedReason,
                    },
                    $set: {
                        flaggedAt: new Date(),
                    },
                }
            );
        }

        const updatedFlagOrder = await Butler.findById(orderId).populate([
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'deliveryBoy',
                select: '-password',
            },
            {
                path: 'chats.user',
            },
            {
                path: 'chats.deliveryBoy',
            },
            {
                path: 'flag',
                populate: 'user delivery',
            },
            {
                path: 'orderCancel',
                populate: 'cancelReason',
            },
            {
                path: 'deliveryBoyList',
                select: '-password',
            },
            {
                path: 'rejectedDeliveryBoy',
                select: '-password',
            },
            {
                path: 'orderDeliveryCharge',
            },
        ]);

        successResponse(res, {
            message: 'Successfully Flagged',
            data: {
                order: updatedFlagOrder,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.editOrderFlag = async (req, res) => {
    try {
        const { id, comment, user, delivery, flaggedReason, otherReason } =
            req.body;

        const flag = await FlagModel.findById(id);

        if (!flag) return errorResponse(res, 'Flag Not found');

        await FlagModel.updateOne(
            { _id: id },
            {
                comment,
                user: user && user,
                delivery: delivery && delivery,
                flaggedReason,
                otherReason,
            }
        );

        // Find flag in user
        const findUser = await UserModel.findOne({
            _id: user,
            flags: { $in: id },
        });

        // Find flag in Delivery boy
        const findDelivery = await DeliveryBoyModel.findOne({
            _id: delivery,
            flags: { $in: id },
        });

        if (!user && findUser) {
            await UserModel.updateOne(
                { _id: user },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        } else if (user && !findUser) {
            await UserModel.updateOne(
                { _id: user },
                {
                    $push: {
                        flags: id,
                    },
                }
            );
        }

        if (!delivery && findDelivery) {
            await DeliveryBoyModel.updateOne(
                { _id: delivery },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        } else if (delivery && !findDelivery) {
            await DeliveryBoyModel.updateOne(
                { _id: delivery },
                {
                    $push: {
                        flags: id,
                    },
                }
            );
        }

        const updatedFlag = await FlagModel.findById(id);

        successResponse(res, {
            message: 'flag Updated',
            data: updatedFlag,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteFlagFromAdmin = async (req, res) => {
    try {
        const { id } = req.body;

        const flag = await FlagModel.findById(id);

        if (flag.user) {
            await UserModel.updateOne(
                { _id: flag.user },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        } else if (flag.delivery) {
            await DeliveryBoyModel.updateOne(
                { _id: flag.delivery },
                {
                    $pull: {
                        flags: id,
                    },
                }
            );
        }

        await Butler.updateOne(
            { _id: flag.orderId },
            {
                $pull: {
                    flag: id,
                },
            }
        );

        await FlagModel.findByIdAndDelete(id);

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
/********** Flag Section End **********/

/********** Message Section Start **********/
exports.sendMessageToDeliveryBoy = async (req, res) => {
    try {
        const { orderId, message } = req.body;

        const order = await Butler.findOne({ _id: orderId }).populate(
            'user deliveryBoy'
        );

        // update
        await Butler.updateOne(
            { _id: orderId },
            {
                $push: {
                    chats: {
                        user: order?.user,
                        deliveryBoy: order?.deliveryBoy,
                        message,
                        sender: 'user',
                    },
                },
            }
        );

        // await pushNotificationForChat(
        //     order.deliveryBoy ? 'delivery' : 'shop',
        //     order.deliveryBoy ? order.deliveryBoy._id : order.shop._id,
        //     order,
        //     'chatWithRider',
        //     message
        // );
        successResponse(res, {
            message: `Message sent`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendMessageToUser = async (req, res) => {
    try {
        const { orderId, message, type } = req.body;

        if (!['deliveryBoy'].includes(type)) {
            return errorResponse(res, 'Invalid type');
        }

        const order = await Butler.findOne({ _id: orderId }).populate(
            'user deliveryBoy'
        );

        if (!order.deliveryBoy && type === 'deliveryBoy') {
            return errorResponse(
                res,
                "Delivery Boy can't send message to user"
            );
        }

        // update
        await Butler.updateOne(
            { _id: orderId },
            {
                $push: {
                    chats: {
                        user: order?.user,
                        deliveryBoy: order?.deliveryBoy,
                        message,
                        sender: type,
                    },
                },
            }
        );

        // await pushNotificationForChat(
        //     'user',
        //     order.user._id,
        //     order,
        //     'chatWithRider',
        //     message
        // );
        successResponse(res, {
            message: `Message sent`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderChats = async (req, res) => {
    try {
        const { orderId } = req.query;

        if (!orderId) {
            return errorResponse(res, 'Order id is required');
        }

        const order = await Butler.findOne({ _id: orderId }).populate([
            {
                path: 'chats',
                populate: [
                    {
                        path: 'user',
                        select: 'name email phone_number profile_photo',
                    },
                    {
                        path: 'deliveryBoy',
                    },
                ],
            },
        ]);

        const chats = order.chats;

        successResponse(res, {
            message: `Chats`,
            data: {
                chats,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
/********** Message Section End **********/
