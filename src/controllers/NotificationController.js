const { validationResult } = require('express-validator');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const ObjectId = require('mongoose').Types.ObjectId;
const NotificationsModel = require('../models/NotificationsModel');
const UserModel = require('../models/UserModel');
const OrderModel = require('../models/OrderModel');
const ShopModel = require('../models/ShopModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const NotificationHistoriesModel = require('../models/NotificationHistoriesModel');
var FCM = require('fcm-node');
var serverKeyUser = process.env.SERVER_KEY_FIREBASE_USER;
var serverKeyRider = process.env.SERVER_KEY_FIREBASE_RIDER;
var serverKeyStore = process.env.SERVER_KEY_FIREBASE_STORE;
var fcmUser = new FCM(serverKeyUser);
var fcmRider = new FCM(serverKeyRider);
var fcmStore = new FCM(serverKeyStore);
const { pagination } = require('../helpers/pagination');
const moment = require('moment');
const AppSetting = require('../models/AppSetting');
const AdminModel = require('../models/AdminModel');
const { isJsonString } = require('../helpers/utility');

exports.sendNotificationByAdmin = async (req, res) => {
    try {
        let {
            title,
            description,
            descriptionHtml,
            image,
            type,
            accountType,
            user,
            shop,
            seller,
            deliveryBoy,
            userType,
            status
        } = req.body;

        if (!title || !description || !type || !accountType) {
            return errorResponse(res, 'validation error');
        }

        if (type === 'specific' && !(user||userType) && !seller && !deliveryBoy && !shop) {
            return errorResponse(
                res,
                'please make sure who get this notfication'
            );
        }

        if (type === 'specific' && accountType === 'user' && !(user||userType)) {
            return errorResponse(res, 'please select a user');
        }
        if (type === 'specific' && accountType === 'seller' && !seller) {
            return errorResponse(res, 'please select a seller');
        }
        if (type === 'specific' && accountType === 'shop' && !shop) {
            return errorResponse(res, 'please select a shop');
        }
        if (
            type === 'specific' &&
            accountType === 'deliveryBoy' &&
            !deliveryBoy
        ) {
            return errorResponse(res, 'please select a deliveryBoy');
        }

        let notification;

        if (type === 'global') {
            notification = await NotificationsModel.create({
                title,
                description,
                descriptionHtml,
                image,
                type,
                accountType,
                byAdmin: true,
            });
            pushNotificationAllDevice(accountType, notification);
        }

        if (type === 'specific' && userType && ['normal', 'subscribed'].includes(userType)) {
            let userQuery={}
            if (userType === 'subscribed') userQuery.isSubscribed = true;
            else userQuery.$or = [{ isSubscribed: { $exists: false } }, { isSubscribed: false },];
            if (status && ['pending', 'active', 'inactive'].includes(status)) userQuery.status= status
            const users = await UserModel.find(userQuery);
            const notificationsBody = users.map(singleUser=>({title,
                description,
                descriptionHtml,
                image,
                type,
                accountType,
                user:singleUser,
                byAdmin: true,
            }))
            const notifications = await NotificationsModel.insertMany(notificationsBody,{ lean: true });
            pushNotificationQueryDevice(accountType, (notifications?.[0]??{title,description,}), userQuery);
        }

        if (type === 'specific' && Array.isArray(user) && user.length) {
            for(const singleUser of user) {
                notification = await NotificationsModel.create({
                    title,
                    description,
                    descriptionHtml,
                    image,
                    type,
                    accountType,
                    user:singleUser,
                    byAdmin: true,
                });
                pushNotification('user', singleUser, notification);
            }

        }

        if (type === 'specific' && Array.isArray(shop) && shop.length) {
            for(const singleShop of shop) {
                notification = await NotificationsModel.create({
                    title,
                    description,
                    descriptionHtml,
                    image,
                    type,
                    accountType,
                    shop:singleShop,
                    byAdmin: true,
                });
                pushNotification('shop', singleShop, notification);
            }
        }

        if (type === 'specific' && Array.isArray(deliveryBoy) && deliveryBoy.length) {
            for(const singleDeliveryBoy of deliveryBoy) {
                notification = await NotificationsModel.create({
                    title,
                    description,
                    descriptionHtml,
                    image,
                    type,
                    accountType,
                    deliveryBoy:singleDeliveryBoy,
                    byAdmin: true,
                });
                pushNotification('delivery', singleDeliveryBoy, notification);
            }
        }

        successResponse(res, {
            message: 'Successfully added',
            data: {
                notification: notification,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.listNotificationFromAdmin = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            status,
            accountType,
            type,
            sortBy = 'desc',
            searchKey,
            startDate,
            endDate,
        } = req.query;

        let whereConfig = {
            byAdmin: true,
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const titleSearchQuery = newQuery.map(str => ({
                title: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: titleSearchQuery }],
                    },
                ],
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

        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status,
            };
        }

        if (
            accountType &&
            ['user', 'seller', 'deliveryBoy', 'shop'].includes(accountType)
        ) {
            whereConfig = {
                ...whereConfig,
                accountType,
            };
        }

        if (type && ['global', 'specific'].includes(type)) {
            whereConfig = {
                ...whereConfig,
                type,
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: NotificationsModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await NotificationsModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: 'name gender phone_number email status dob account_type',
                },
                {
                    path: 'admin',
                },
                {
                    path: 'shop',
                    select: '-products -categories',
                },
                {
                    path: 'seller',
                },
                {
                    path: 'deliveryBoy',
                },
            ]);

        successResponse(res, {
            message: 'Get Notifications',
            data: {
                notifications: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendNotificationsAllApp = async (
    order,
    isReplacementOrder = false,
    findRider = false
) => {
    if (findRider) {
        // Send Notification in Delivery boy--
        order?.deliveryBoyList?.forEach(async deliveryBoy => {
            let deliveryNotification = await NotificationsModel.create({
                title: `You have a new order !`,
                description: `Checkout your new order from ${order.user.name}`,
                type: 'specific',
                accountType: 'deliveryBoy',
                orderStatus: order.orderStatus,
                deliveryBoy: deliveryBoy,
                order: order._id,
            });
            pushNotification('delivery', deliveryBoy, deliveryNotification);
        });
    }

    // When order placed by user
    if (order?.orderStatus == 'placed' && !findRider) {
        // Send Notification in Store--
        if (!order.isButler) {
            const nameParts = order.user.name.trim().split(' ');
            const firstName = nameParts[0];
            const lastNameInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) : '';
            const formattedName = `${firstName} ${lastNameInitial}.`;
            let shopNotification = await NotificationsModel.create({
                title: `You have a new order!`,
                description: `Checkout your new order from ${formattedName}`,
                type: 'specific',
                accountType: 'shop',
                orderStatus: order.orderStatus,
                shop: order.shop._id,
                order: order._id,
            });
            pushNotification('shop', order.shop._id, shopNotification);
        }

        // Send Notification in User--
        if (order?.isReplacementOrder && isReplacementOrder) {
            let userNotification = await NotificationsModel.create({
                title: `Your order has been replaced.`,
                description: `Your original order is ${order.originalOrder.orderId}.`,
                type: 'specific',
                orderStatus: order.orderStatus,
                accountType: 'user',
                user: order.user._id,
                order: order._id,
                clickable: true,
            });
            pushNotification('user', order.user._id, userNotification);
        }
    }

    // When order accepted by Delivery Boy
    // if (order.orderStatus == 'accepted_delivery_boy') {
    //     // Send Notification in User--
    //     let userNotification = await NotificationsModel.create({
    //         title: `${order.shop?.shopName} has received your order.`,
    //         description: 'We’ll let you know once your order has been accepted',
    //         type: 'specific',
    //         orderStatus: order.orderStatus,
    //         accountType: 'user',
    //         user: order.user._id,
    //         order: order._id,
    //         clickable: true,
    //     });
    //     pushNotification('user', order.user._id, userNotification);

    //     // Send Notification in Store--
    //     let shopNotification = await NotificationsModel.create({
    //         title: `You have a new order!`,
    //         description: `Checkout your new order from ${order.user.name}`,
    //         type: 'specific',
    //         accountType: 'shop',
    //         orderStatus: order.orderStatus,
    //         shop: order.shop._id,
    //         order: order._id,
    //     });
    //     pushNotification('shop', order.shop._id, shopNotification);
    // }

    // When order accepted by Shop
    if (order?.orderStatus == 'preparing' && !findRider) {
        // Send Notification in User--
        let userNotification = await NotificationsModel.create({
            title: `Your order has been accepted.`,
            description:
                'We’ll let you know once your order has been picked up.',
            type: 'specific',
            accountType: 'user',
            orderStatus: order.orderStatus,
            user: order.user._id,
            order: order._id,
            clickable: true,
        });
        pushNotification('user', order.user._id, userNotification);
    }

    // When order placed by delivery boy
    if (order?.orderStatus == 'ready_to_pickup') {
        if (order?.orderFor === 'global') {
            // Send Notification in Store--
            // let shopNotification = await NotificationsModel.create({
            //     title: `The rider is on the way to your shop.`,
            //     description: `${order.deliveryBoy.name} will reach your shop in x minutes`,
            //     type: 'specific',
            //     accountType: 'shop',
            //     orderStatus: order.orderStatus,
            //     shop: order.shop._id,
            //     order: order._id,
            // });
            // pushNotification('shop', order.shop._id, shopNotification);

            // Send Notification in Delivery boy--
            let deliveryNotification = await NotificationsModel.create({
                title: `An order is ready for pick up`,
                description: `Order ${order.orderId}`,
                type: 'specific',
                accountType: 'deliveryBoy',
                orderStatus: order.orderStatus,
                deliveryBoy: order.deliveryBoy._id,
                order: order._id,
            });
            pushNotification(
                'delivery',
                order.deliveryBoy._id,
                deliveryNotification
            );
        }
    }

    // When order picked by delivery boy
    if (order?.orderStatus == 'order_on_the_way') {
        if (
            order.isReplacementOrder &&
            order.isReplacementItemPickFromUser &&
            order.replacementOrderDeliveryInfo.deliveryType !==
                'shop-customer-shop'
        ) {
            // Send Notification in User--
            let userNotification = await NotificationsModel.create({
                title: `Your replacement order drop-off and pickup old item.`,
                description: `Order ${order.orderId}`,
                type: 'specific',
                orderStatus: order.orderStatus,
                accountType: 'user',
                user: order.user._id,
                order: order._id,
                clickable: true,
            });
            pushNotification('user', order.user._id, userNotification);

            // Send Notification in Store--
            let shopNotification = await NotificationsModel.create({
                title: `Replacement item has been picked up from user.`,
                description: `Order ${order.orderId}`,
                type: 'specific',
                accountType: 'shop',
                orderStatus: order.orderStatus,
                shop: order.shop._id,
                order: order._id,
            });
            pushNotification('shop', order.shop._id, shopNotification);
        } else {
            // Send Notification in User--
            let userNotification = await NotificationsModel.create({
                title: `Your order on the way.`,
                description: `Order ${order.orderId}`,
                type: 'specific',
                orderStatus: order.orderStatus,
                accountType: 'user',
                user: order.user._id,
                order: order._id,
                clickable: true,
            });
            pushNotification('user', order.user._id, userNotification);

            // Send Notification in Store--
            // if (!order?.isButler) {
            //     let shopNotification = await NotificationsModel.create({
            //         title: `An order has been picked up.`,
            //         description: `Order ${order.orderId}`,
            //         type: 'specific',
            //         accountType: 'shop',
            //         orderStatus: order.orderStatus,
            //         shop: order.shop._id,
            //         order: order._id,
            //     });
            //     pushNotification('shop', order.shop._id, shopNotification);
            // }
        }
    }

    // When order Delivered
    if (order?.orderStatus == 'delivered') {
        const notifications = await NotificationsModel.find({
            user: order.user._id,
            order: order._id,
        });

        for (const singleNotification of notifications) {
            await NotificationsModel.updateOne(
                { _id: singleNotification._id },
                {
                    clickable: false,
                }
            );
        }

        // Send Notification in User--
        let userNotification = await NotificationsModel.create({
            title: `Your order has been delivered.`,
            description: 'We look forward to hearing from you again!',
            type: 'specific',
            accountType: 'user',
            orderStatus: order.orderStatus,
            user: order.user._id,
            order: order._id,
            clickable: true,
        });
        pushNotification('user', order.user._id, userNotification);

        // Send Notification in Store--
        if (!order?.isButler) {
            let shopNotification = await NotificationsModel.create({
                title: `An order has been delivered successfully.`,
                description: `Order ${order.orderId}`,
                type: 'specific',
                accountType: 'shop',
                orderStatus: order.orderStatus,
                shop: order.shop._id,
                order: order._id,
            });
            pushNotification('shop', order.shop._id, shopNotification, false, undefined, '', 'delivered');
        }
    }

    // When order cancelled
    if (order?.orderStatus == 'cancelled') {
        // Send Notification in User--
        if (order?.orderCancel?.canceledBy !== 'user') {
            let userNotification = await NotificationsModel.create({
                title: `Your order has been canceled.`,
                description:
                    order.paymentMethod == 'cash'
                        ? 'We are very sorry for the inconvenience, please reach out to our support team if you need any help.'
                        : 'We are very sorry for the inconvenience, your money has been refunded to your Lyxa wallet, please reach out to our support team if you need any help.',
                type: 'specific',
                accountType: 'user',
                orderStatus: order.orderStatus,
                user: order.user._id,
                order: order._id,
            });
            pushNotification('user', order.user._id, userNotification);
        }

        // Send Notification in Store--
        if (order?.orderCancel?.canceledBy !== 'shop' && !order?.isButler) {
            if (order?.timeline[2]?.active) {
                let shopNotification = await NotificationsModel.create({
                    title: `An order has been canceled`,
                    description: `Order ${order.orderId}`,
                    type: 'specific',
                    accountType: 'shop',
                    orderStatus: order.orderStatus,
                    shop: order?.shop?._id,
                    order: order._id,
                });
                pushNotification('shop', order?.shop?._id, shopNotification);
            }
        }

        // Send Notification in Delivery boy--
        if (order?.orderCancel?.canceledBy !== 'deliveryBoy') {
            if (order?.deliveryBoy) {
                let deliveryNotification = await NotificationsModel.create({
                    title: `An order has been canceled`,
                    description: `Order ${order.orderId}`,
                    type: 'specific',
                    accountType: 'deliveryBoy',
                    orderStatus: order.orderStatus,
                    deliveryBoy: order.deliveryBoy._id,
                    order: order._id,
                });
                pushNotification(
                    'delivery',
                    order.deliveryBoy._id,
                    deliveryNotification
                );
            }
        }
    }
};

// When admin add remove credit
exports.sendNotificationsForAddRemoveCredit = async (type, transaction) => {
    const appSetting = await AppSetting.findOne({}).select(
        'baseCurrency secondaryCurrency'
    );
    const currency =
        transaction.paidCurrency === 'baseCurrency'
            ? appSetting.baseCurrency.symbol
            : appSetting.secondaryCurrency.code;
    const amount =
        transaction.paidCurrency === 'baseCurrency'
            ? transaction.amount
            : transaction.secondaryCurrency_amount;

    if (transaction.account === 'user') {
        // Send Notification to User--
        let userNotification = await NotificationsModel.create({
            title: `Admin ${type} ${
                currency === 'LBP'
                    ? `${currency} ${amount}`
                    : `${currency}${amount}`
            }`,
            description: transaction.desc,
            type: 'specific',
            accountType: 'user',
            user: transaction.user,
            clickable: true,
        });
        pushNotification('user', transaction.user, userNotification);
    }

    if (transaction.account === 'shop') {
        // Send Notification to Shop--
        let shopNotification = await NotificationsModel.create({
            title: `Admin ${type} ${
                currency === 'LBP'
                    ? `${currency} ${amount}`
                    : `${currency}${amount}`
            }`,
            description: transaction.desc,
            type: 'specific',
            accountType: 'shop',
            shop: transaction.shop,
            clickable: true,
        });
        pushNotification('shop', transaction.shop, shopNotification);
    }

    if (transaction.account === 'deliveryBoy') {
        // Send Notification to DeliveryBoy--
        let deliveryNotification = await NotificationsModel.create({
            title: `Admin ${type} ${
                currency === 'LBP'
                    ? `${currency} ${amount}`
                    : `${currency}${amount}`
            }`,
            description: transaction.desc,
            type: 'specific',
            accountType: 'deliveryBoy',
            deliveryBoy: transaction.deliveryBoy,
        });
        pushNotification(
            'delivery',
            transaction.deliveryBoy,
            deliveryNotification
        );
    }
};

// When admin assign new deliveryBoy
exports.sendNotificationsDeliveryBoyUpdated = async (order, acceptedFromAdmin) => {
    // Send Notification in Delivery boy--
    if(acceptedFromAdmin){
        let deliveryNotification = await NotificationsModel.create({
            title: `You have a new order from admin !`,
            description: `Checkout your new order from ${order.user.name}`,
            type: 'specific',
            accountType: 'deliveryBoy',
            orderStatus: order.orderStatus,
            deliveryBoy: order.deliveryBoy._id,
            order: order._id,
        });
        pushNotification('delivery', order.deliveryBoy._id, deliveryNotification);
    }
  
        // When order accepted by Delivery Boy
        // Send Notification in User--
        let userNotification = await NotificationsModel.create({
            title: `Order assigned to rider`,
            description: `Your order has been assigned to ${order?.deliveryBoy?.name} and he is heading to pickup location`,
            type: 'specific',
            orderStatus: order.orderStatus,
            accountType: 'user',
            user: order.user._id,
            order: order._id,
            clickable: true,
        });
        pushNotification('user', order.user._id, userNotification);

        // // Send Notification in Store--
        // let shopNotification = await NotificationsModel.create({
        //     title: `You have a new order!`,
        //     description: `Checkout your new order from ${order.user.name}`,
        //     type: 'specific',
        //     accountType: 'shop',
        //     orderStatus: order.orderStatus,
        //     shop: order.shop._id,
        //     order: order._id,
        // });
        // pushNotification('shop', order.shop._id, shopNotification);
};

// When admin change delivery address
exports.sendNotificationsDeliveryAddressUpdated = async order => {
    // Send Notification in User--
    let userNotification = await NotificationsModel.create({
        title: `${order.orderId} order delivery address updated.`,
        description: `Your order delivery address has been changed by customer service, please check it!`,
        type: 'specific',
        accountType: 'user',
        orderStatus: order.orderStatus,
        user: order.user._id,
        order: order._id,
        clickable: true,
    });
    pushNotification('user', order.user._id, userNotification);

    // Send Notification in Delivery boy--
    if (order.deliveryBoy) {
        let deliveryNotification = await NotificationsModel.create({
            title: `${order.orderId} Order delivery address updated.`,
            description: `Hello rider, the order delivery address is changed, please check it!`,
            type: 'specific',
            accountType: 'deliveryBoy',
            orderStatus: order.orderStatus,
            deliveryBoy: order.deliveryBoy._id,
            order: order._id,
        });
        pushNotification(
            'delivery',
            order.deliveryBoy._id,
            deliveryNotification
        );
    }
};

// When adjust order
exports.sendNotificationsAdjustOrder = async (order, type, adjustmentReason) => {
    if (type === 'admin') {
        // Send Notification in User--
        let userNotification = await NotificationsModel.create({
            title: `We have made an adjustment to your order.`,
            description:`Your order has been adjusted by customer service, please check it! ${adjustmentReason?('Reason: '+adjustmentReason):''}
If you have any questions or concerns, please contact our support team.`,
            type: 'specific',
            accountType: 'user',
            orderStatus: order.orderStatus,
            user: order.user._id,
            order: order._id,
            clickable: true,
        });
        pushNotification('user', order.user._id, userNotification, false, undefined, 'admin');

        // Send Notification in Store--
        let shopNotification = await NotificationsModel.create({
            title: `We have made an adjustment to your order.`,
            description: `Your ongoing order has been adjusted by customer service, please check it! ${adjustmentReason?('Reason: '+adjustmentReason):''}
If you have any questions or concerns, please contact our support team.`,
            type: 'specific',
            accountType: 'shop',
            orderStatus: order.orderStatus,
            shop: order.shop._id,
            order: order._id,
        });
        pushNotification('shop', order.shop._id, shopNotification, true, undefined, 'admin');
    }

    if (type === 'shop') {
        // Send Notification in User--
        let userNotification = await NotificationsModel.create({
            title: `We have made an adjustment to your order.`,
            description: `Shop send an order adjustment request, please check it! ${adjustmentReason?('Reason: '+adjustmentReason):''}
If you have any questions or concerns, please contact our support team.`,
            type: 'specific',
            accountType: 'user',
            orderStatus: order.orderStatus,
            user: order.user._id,
            order: order._id,
            clickable: true,
        });
        pushNotification('user', order.user._id, userNotification, true);
    }

    if (type === 'user') {
        // Send Notification in Store--
        let shopNotification = await NotificationsModel.create({
            title: `${order.orderId} order has been adjusted.`,
            description: `Your ongoing order has been adjusted by user, please check it! ${adjustmentReason?('Reason: '+adjustmentReason):''}
If you have any questions or concerns, please contact our support team. `,
            type: 'specific',
            accountType: 'shop',
            orderStatus: order.orderStatus,
            shop: order.shop._id,
            order: order._id,
        });
        pushNotification('shop', order.shop._id, shopNotification, true);
    }
};

// When refund order
exports.sendNotificationForRefundOrder = async order => {
    // Send Notification in User--
    let userNotification = await NotificationsModel.create({
        title: `${order.orderId} order has been refunded.`,
        description: `Your order has been refunded by customer service, please check it!`,
        type: 'specific',
        accountType: 'user',
        orderStatus: order.orderStatus,
        user: order.user,
        order: order._id,
        clickable: true,
    });
    pushNotification('user', order.user, userNotification, undefined, true);
};

// When admin update product price
exports.sendNotificationToShopForUpdateItem = async (product, oldPrice) => {
    // Send Notification in Store--
    let shopNotification = await NotificationsModel.create({
        title: `Admin changed the price of the ${product.name}.`,
        description: `Admin changed your item price $${oldPrice} to $${product.price}.`,
        type: 'specific',
        accountType: 'shop',
        shop: product.shop._id,
    });
    pushNotification('shop', product.shop._id, shopNotification);
};

// When admin deactivates lyxa product
exports.sendNotificationToShopForUpdateLyxaProduct = async (shopId, title, description) => {
    // Send Notification in Store--
    let shopNotification = await NotificationsModel.create({
        title,
        description,
        type: 'specific',
        accountType: 'shop',
        shop: shopId,
    });
    pushNotification('shop', shopId, shopNotification);
};

// When admin deactivate marketing
exports.sendNotificationToShopForDeactivateMarketing = async (
    shopIds,
    marketingType
) => {
    const customizedMarketingType =
        marketingType === 'percentage'
            ? 'Discount'
            : marketingType === 'double_menu'
            ? 'Buy 1, Get 1 Free'
            : marketingType === 'free_delivery'
            ? 'Free Delivery'
            : 'Punch Marketing';

    // Send Notification in Store--
    for (const shopId of shopIds) {
        let shopNotification = await NotificationsModel.create({
            title: `Admin deactivated ${customizedMarketingType} promotion.`,
            description: `Since the admin deactivated this promotion, your ${customizedMarketingType} promotion has terminated.`,
            type: 'specific',
            accountType: 'shop',
            shop: shopId,
        });
        pushNotification('shop', shopId, shopNotification);
    }
};

// When settle bob trx
exports.sendNotificationForBobSettlement = async transaction => {
    const appSetting = await AppSetting.findOne({}).select(
        'baseCurrency secondaryCurrency'
    );
    const currency =
        transaction.paidCurrency === 'baseCurrency'
            ? appSetting.baseCurrency.symbol
            : appSetting.secondaryCurrency.code;
    const amount =
        transaction.paidCurrency === 'baseCurrency'
            ? transaction.amount
            : transaction.secondaryCurrency_amount;

    // Send Notification to DeliveryBoy--
    let deliveryNotification = await NotificationsModel.create({
        title: `Your settlement is well received.`,
        // description: `Settlement amount is ${
        //     currency === 'LBP'
        //         ? `${currency} ${amount}`
        //         : `${currency}${amount}`
        // }!`,
        description: `You can get back to fulfilling orders!`,
        type: 'specific',
        accountType: 'deliveryBoy',
        deliveryBoy: transaction.deliveryBoy,
        bobFinance: transaction._id,
    });
    pushNotification('delivery', transaction.deliveryBoy, deliveryNotification);
};

// When urgent order
exports.sendNotificationForUrgentOrder = async (order, type) => {
    if (type === 'shop') {
        // Send Notification in Store--
        let shopNotification = await NotificationsModel.create({
            title: `Your order has been urgent.`,
            description: `Order Id is ${order.orderId}. Please check it!`,
            type: 'specific',
            accountType: 'shop',
            shop: order.shop._id,
            order: order._id,
        });
        pushNotification('shop', order.shop._id, shopNotification);
    }

    if (type === 'rider') {
        // Send Notification to DeliveryBoy--
        let deliveryNotification = await NotificationsModel.create({
            title: `Your order has been urgent.`,
            description: `Order Id is ${order.orderId}. Please check it!`,
            type: 'specific',
            accountType: 'deliveryBoy',
            deliveryBoy: order.deliveryBoy._id,
            order: order._id,
        });
        pushNotification(
            'delivery',
            order.deliveryBoy._id,
            deliveryNotification
        );
    }
};

const pushNotification = async (
    accountType,
    id,
    notification,
    isOrderAdjusted,
    isOrderRefunded,
    adjustedFrom,
    orderStatus
) => {
    let token;
    let user;
    // let path;

    if (accountType == 'user') {
        user = await UserModel.findById(id);

        token = user.fcmToken;
    }
    if (accountType == 'shop') {
        user = await ShopModel.findById(id);

        token = user.fcmToken;
    }
    if (accountType == 'delivery') {
        user = await DeliveryBoyModel.findById(id);

        token = user.fcmToken;
    }

    // if (notification.orderStatus == 'delivered') {
    //     path = `lyxauserapp://OrderConfirm/${notification.order}`;
    // } else {
    //     path = `lyxauserapp://OrderConfirm/${notification.order}`;
    // }

    var message = {
        registration_ids: token,

        notification: {
            title: notification.title,
            body: notification.description,
            sound: orderStatus === 'delivered' ? 'default' : "alert_music.mp3",
            android_channel_id: "android_Push_Notification_Channel_1"
        },
        data: {
            orderStatus: notification.orderStatus,
            orderId: notification.order,
            transactionId: notification.bobFinance,
            isOrderAdjusted,
            isOrderRefunded,
            adjustedFrom: adjustedFrom,
        },
    };

    if (accountType == 'user') {
        fcmUser.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);

                // Check for errors
                let failedTokens = [];
                const resParse = JSON.parse(response);

                resParse?.results?.forEach((result, index) => {
                    if (result.error) {
                        failedTokens.push(token[index]);
                    }
                });

                if (failedTokens.length > 0) {
                    removeFailedTokens(accountType, id, failedTokens);
                }
            } else {
                // showToast("Successfully sent with response");
                console.log('Successfully sent with response: ', response);
            }
        });
    }
    if (accountType == 'shop') {
        fcmStore.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);

                // Check for errors
                let failedTokens = [];
                const resParse = JSON.parse(response);

                resParse?.results?.forEach((result, index) => {
                    if (result.error) {
                        failedTokens.push(token[index]);
                    }
                });

                if (failedTokens.length > 0) {
                    removeFailedTokens(accountType, id, failedTokens);
                }
            } else {
                // showToast("Successfully sent with response");
                console.log('Successfully sent with response: ', response);
            }
        });
    }
    if (accountType == 'delivery') {
        fcmRider.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);

                // Check for errors
                let failedTokens = [];
                const resParse = JSON.parse(response);

                resParse?.results?.forEach((result, index) => {
                    if (result.error) {
                        failedTokens.push(token[index]);
                    }
                });

                if (failedTokens.length > 0) {
                    removeFailedTokens(accountType, id, failedTokens);
                }
            } else {
                // showToast("Successfully sent with response");
                console.log('Successfully sent with response: ', response);
            }
        });
    }
};

exports.pushNotificationForChat = async (
    accountType,
    id,
    order,
    status,
    notification
) => {
    let token;
    // let path;
    let user;
    let data;

    if (accountType == 'user') {
        user = await UserModel.findById(id);

        // name = user.name;
        token = user.fcmToken;
    }
    if (accountType == 'shop') {
        user = await ShopModel.findById(id);

        // name = shop.shopName;
        token = user.fcmToken;
    }
    if (accountType == 'delivery') {
        user = await DeliveryBoyModel.findById(id);

        // name = delivery.name;
        token = user.fcmToken;
    }

    // if (accountType == 'user') {
    //     path = `lyxauserapp://OrderConfirm/${notification.order}`;
    // } else if (accountType == 'shop') {
    //     path = `lyxauserapp://OrderConfirm/${notification.order}`;
    // } else {
    //     path = `lyxauserapp://OrderConfirm/${notification.order}`;
    // }
    if (status == 'chatWithRider') {
        data = {
            chatStatus: status,
            orderId: order._id,
            name:
                accountType == 'user'
                    ? order.deliveryBoy.name
                    : order.user.name,
            image:
                accountType == 'user'
                    ? order.deliveryBoy.image
                    : order.user.profile_photo,
        };
        // user.name=data.name
    } else {
        data = {
            chatStatus: status,
            orderId: order?._id,
        };
    }

    var message = {
        registration_ids: token,

        notification: {
            title: (status === 'chatWithRider')?((accountType === 'user')?'Lyxa Rider':'Lyxa User'):'Lyxa Customer Support',
            body: isJsonString(notification) ? (JSON.parse(notification).type === 'image' ? 'received an image' : notification) : notification,
            sound: "alert_music.mp3",
            android_channel_id: "android_Push_Notification_Channel_1"
        },
        data: data,
    };

    if (accountType == 'user') {
        fcmUser.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);

                // Check for errors
                let failedTokens = [];
                const resParse = JSON.parse(response);

                resParse?.results?.forEach((result, index) => {
                    if (result.error) {
                        failedTokens.push(token[index]);
                    }
                });

                if (failedTokens.length > 0) {
                    removeFailedTokens(accountType, id, failedTokens);
                }
            } else {
                // showToast("Successfully sent with response");
                console.log('Successfully sent with response: ', response);
            }
        });
    }
    if (accountType == 'shop') {
        fcmStore.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);

                // Check for errors
                let failedTokens = [];
                const resParse = JSON.parse(response);

                resParse?.results?.forEach((result, index) => {
                    if (result.error) {
                        failedTokens.push(token[index]);
                    }
                });

                if (failedTokens.length > 0) {
                    removeFailedTokens(accountType, id, failedTokens);
                }
            } else {
                // showToast("Successfully sent with response");
                console.log('Successfully sent with response: ', response);
            }
        });
    }
    if (accountType == 'delivery') {
        fcmRider.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);

                // Check for errors
                let failedTokens = [];
                const resParse = JSON.parse(response);

                resParse?.results?.forEach((result, index) => {
                    if (result.error) {
                        failedTokens.push(token[index]);
                    }
                });

                if (failedTokens.length > 0) {
                    removeFailedTokens(accountType, id, failedTokens);
                }
            } else {
                // showToast("Successfully sent with response");
                console.log('Successfully sent with response: ', response);
            }
        });
    }
};

exports.pushNotificationForGroupCart = async (cart, user, type, users = [],updatingMessage='') => {
    // const user = await UserModel.findById(cart.creator._id);
    let token = cart.creator.fcmToken;
    if (type === 'delete' || type === 'update') {
        const guestUser = cart.cartItems.filter(
            item => item.user._id.toString() !== user._id.toString()
        );
        token = guestUser.flatMap(item => item.user.fcmToken);
    }
    if (type === 'remove') {
        token = users?.flatMap(user => user.fcmToken);
    }
    const data = {
        cartId: cart._id,
        shopId: cart.shop._id,
        type: type,
    };

    const message = {
        registration_ids: token,

        notification: {
            title: cart.name,
            body:
                type === 'join'
                    ? `${user.name} has just joined the group order`
                    : type === 'leave'
                    ? `${user.name} has left your group order and all their items have been removed from your cart`
                    : type === 'payment'
                    ? `${user.name} paid his group cart amount`
                    : type === 'delete'
                    ? `${user.name} has deleted their group order and you can no longer proceed with your selected items. Please initiate your own cart if you want to place an order.`
                    : type === 'ready'
                    ? `${user.name} is ready`
                    : type === 'remove'
                    ? `${user.name} has removed you from their group order and you can no longer proceed with your selected items. Please initiate your own cart if you want to place an order.`
                    : type === 'update'
                    ? updatingMessage
                    : `${user.name} changed his item`,
            sound: "alert_music.mp3",
            android_channel_id: "android_Push_Notification_Channel_1"
        },
        data: data,
    };

    fcmUser.send(message, function (err, response) {
        if (err) {
            console.log('Something has gone wrong!' + err);
            console.log('Respponse:! ' + response);

            // Check for errors
            let failedTokens = [];
            const resParse = JSON.parse(response);

            resParse?.results?.forEach((result, index) => {
                if (result.error) {
                    failedTokens.push(token[index]);
                }
            });

            if (failedTokens.length > 0) {
                removeFailedTokens('user', cart?.creator?._id, failedTokens);
            }
        } else {
            console.log('Successfully sent with response: ', response);
        }
    });
};

exports.pushNotificationForCoupon = async coupon => {
    let token = [];
    let users = [];

    if (
        coupon.couponType === 'global' ||
        coupon.couponType === 'individual_store'
    ) {
        users = await UserModel.find({
            deletedAt: null,
            status: 'active',
        });

        token = users.flatMap(user => user.fcmToken);
    }
    if (coupon.couponType === 'individual_user') {
        users = await UserModel.find({ _id: { $in: coupon.couponUsers } });

        token = users?.flatMap(user => user.fcmToken);
    }

    const data = {
        couponId: coupon._id,
    };

    const message = {
        registration_ids: token,

        notification: {
            title: coupon.couponName,
            body: coupon.referralCouponUsedBy
                ? 'You got a coupon for successfully referred.'
                : `You got a coupon.`,
            sound: "alert_music.mp3",
            android_channel_id: "android_Push_Notification_Channel_1"
        },
        data: data,
    };

    fcmUser.send(message, function (err, response) {
        if (err) {
            console.log('Something has gone wrong!' + err);
            console.log('Respponse:! ' + response);

            // Check for errors
            let failedTokens = [];
            const resParse = JSON.parse(response);

            resParse?.results?.forEach((result, index) => {
                if (result.error) {
                    failedTokens.push(token[index]);
                }
            });

            if (failedTokens.length > 0) {
                for (const user of users) {
                    removeFailedTokens('user', user?._id, failedTokens);
                }
            }
        } else {
            console.log('Successfully sent with response: ', response);
        }
    });
};

const pushNotificationQueryDevice = async (accountType, notification, query) => {
    let deviceTokens = [];
    if (accountType === 'user') deviceTokens = await UserModel.distinct('fcmToken', query);
    if (accountType === 'shop') deviceTokens = await ShopModel.distinct('fcmToken', query);
    if (accountType === 'deliveryBoy') deviceTokens = await DeliveryBoyModel.distinct('fcmToken', query);

    var message = {
        registration_ids: deviceTokens,
        notification: {
            title: notification.title,
            body: notification.description,
            notifiation: notification,
            sound: "alert_music.mp3",
            android_channel_id: "android_Push_Notification_Channel_1"
        },
    };

    if (accountType === 'user') fcmUser.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);
            } else console.log('Successfully sent with response: ', response);
        });

    if (accountType === 'shop') fcmStore.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);
            } else console.log('Successfully sent with response: ', response);
        });

    if (accountType === 'deliveryBoy') fcmRider.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);
            } else console.log('Successfully sent with response: ', response);
        });

};

const pushNotificationAllDevice = async (accountType, notification) => {
    let deviceTokens = [];

    if (accountType == 'user') {
        deviceTokens = await UserModel.distinct('fcmToken');
    }
    if (accountType == 'shop') {
        deviceTokens = await ShopModel.distinct('fcmToken');
    }
    if (accountType == 'deliveryBoy') {
        deviceTokens = await DeliveryBoyModel.distinct('fcmToken');
    }

    var message = {
        registration_ids: deviceTokens,

        notification: {
            title: notification.title,
            body: notification.description,
            notifiation: notification,
            sound: "alert_music.mp3",
            android_channel_id: "android_Push_Notification_Channel_1"
        },

        // data: { //you can send only notification or only data(or include both)
        //     title: 'ok cdfsdsdfsd',
        //     body: '{"name" : "okg ooggle ogrlrl","product_id" : "123","final_price" : "0.00035"}'
        // }
    };

    if (accountType == 'user') {
        fcmUser.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);
            } else {
                // showToast("Successfully sent with response");
                console.log('Successfully sent with response: ', response);
            }
        });
    }
    if (accountType == 'shop') {
        fcmStore.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);
            } else {
                // showToast("Successfully sent with response");
                console.log('Successfully sent with response: ', response);
            }
        });
    }
    if (accountType == 'deliveryBoy') {
        fcmRider.send(message, function (err, response) {
            if (err) {
                console.log('Something has gone wrong!' + err);
                console.log('Respponse:! ' + response);
            } else {
                // showToast("Successfully sent with response");
                console.log('Successfully sent with response: ', response);
            }
        });
    }
};

exports.deleteNotificationByadmin = async (req, res) => {
    try {
        const { id } = req.body;

        const exist = await NotificationsModel.findById(id);

        if (!exist) return errorResponse(res, 'Notification not found');

        await NotificationsModel.findByIdAndDelete(id);

        successResponse(res, {
            message: `Successfully Delete`,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getNotificationForAdmin = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
        } = req.query;
        const adminId = req.adminId;

        const admin = await AdminModel.findById(adminId);
        if (!admin) return errorResponse(res, 'Admin not found');

        const accountType = admin.adminType;

        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType,
            $or: [{ admin: adminId }, { type: 'global' }],
        };

        const paginate = await pagination({
            page,
            pageSize,
            model: NotificationsModel,
            condition: whereConfig,
            pagingRange,
        });

        const list = await NotificationsModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'order',
                    populate: 'shop user deliveryBoy',
                },
            ]);

        whereConfig = {
            ...whereConfig,
            seenBy: {
                $nin: [adminId],
            },
        };

        await NotificationsModel.updateMany(whereConfig, {
            $push: {
                seenBy: adminId,
            },
        });

        successResponse(res, {
            message: 'Get Notifications',
            data: {
                notifications: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
exports.getUnseenNotificationForAdmin = async (req, res) => {
    try {
        const adminId = req.adminId;

        if (!ObjectId.isValid(adminId)) {
            return errorResponse(res, 'adminId is invalid');
        }

        const admin = await AdminModel.findById(adminId);
        if (!admin) return errorResponse(res, 'Admin not found');

        const accountType = admin.adminType;

        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType,
            $or: [{ admin: adminId }, { type: 'global' }],
            seenBy: { $nin: [adminId] },
        };

        const unseenCount = await NotificationsModel.countDocuments(
            whereConfig
        );

        // const unseenCount = list.reduce((count, notification) => {
        //     if (!notification.seenBy.includes(userId)) {
        //         return count + 1;
        //     }
        //     return count;
        // }, 0);

        successResponse(res, {
            message: 'Get unseen notifications',
            data: {
                unseenCount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getNotificationForUser = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
        } = req.query;

        const userId = req.userId;

        const user = await UserModel.findById(userId).select('createdAt');

        if (!user) return errorResponse(res, 'User not found.');

        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType: 'user',
            $or: [{ user: userId }, { type: 'global' }],
            createdAt: { $gte: moment(new Date(user.createdAt)) },
        };

        const paginate = await pagination({
            page,
            pageSize,
            model: NotificationsModel,
            condition: whereConfig,
            pagingRange,
        });

        const list = await NotificationsModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'order',
                    populate: 'shop user deliveryBoy adjustOrderRequest',
                },
            ]);

        whereConfig = {
            ...whereConfig,
            seenBy: {
                $nin: [userId],
            },
        };

        await NotificationsModel.updateMany(whereConfig, {
            $push: {
                seenBy: userId,
            },
        });

        successResponse(res, {
            message: 'Get Notifications',
            data: {
                notifications: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
exports.getUnseenNotificationForUser = async (req, res) => {
    try {
        const userId = req.userId;

        if (!ObjectId.isValid(userId)) {
            return errorResponse(res, 'userId is invalid');
        }

        const user = await UserModel.findById(userId).select('createdAt');

        if (!user) return errorResponse(res, 'User not found.');

        // let whereConfig = {
        //     deleteAt: null,
        //     status: 'active',
        //     accountType: 'user',
        //     $or: [{ user: userId }, { type: 'global' }],
        //     createdAt: { $gte: moment(new Date(user.createdAt)) },
        // };

        // const list = await NotificationsModel.find(whereConfig);

        // const unseenCount = list.reduce((count, notification) => {
        //     if (!notification.seenBy.includes(userId)) {
        //         return count + 1;
        //     }
        //     return count;
        // }, 0);
        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType: 'user',
            $or: [{ user: userId }, { type: 'global' }],
            createdAt: { $gte: moment(new Date(user.createdAt)) },
            seenBy: {
                $ne: ObjectId(userId),
            },
        };

        const unseenCount = await NotificationsModel.countDocuments(
            whereConfig
        );

        successResponse(res, {
            message: 'Get unseen notifications',
            data: {
                unseenCount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getNotificationForDeliveryBoy = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
        } = req.query;

        const deliveryBoyId = req.deliveryBoyId;

        const rider = await DeliveryBoyModel.findById(deliveryBoyId).select(
            'createdAt'
        );

        if (!rider) return errorResponse(res, 'Rider not found.');

        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType: 'deliveryBoy',
            $or: [{ deliveryBoy: deliveryBoyId }, { type: 'global' }],
            createdAt: { $gte: moment(new Date(rider.createdAt)) },
        };

        const paginate = await pagination({
            page,
            pageSize,
            model: NotificationsModel,
            condition: whereConfig,
            pagingRange,
        });

        const list = await NotificationsModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'order',
                    populate: 'shop user deliveryBoy',
                },
            ]);

        whereConfig = {
            ...whereConfig,
            seenBy: {
                $nin: [deliveryBoyId],
            },
        };

        await NotificationsModel.updateMany(whereConfig, {
            $push: {
                seenBy: deliveryBoyId,
            },
        });

        successResponse(res, {
            message: 'Get Notifications',
            data: {
                notifications: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
exports.getUnseenNotificationForDeliveryBoy = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        if (!ObjectId.isValid(deliveryBoyId)) {
            return errorResponse(res, 'deliveryBoyId is invalid');
        }

        const rider = await DeliveryBoyModel.findById(deliveryBoyId).select(
            'createdAt'
        );

        if (!rider) return errorResponse(res, 'Rider not found.');

        // let whereConfig = {
        //     deleteAt: null,
        //     status: 'active',
        //     accountType: 'deliveryBoy',
        //     $or: [{ deliveryBoy: deliveryBoyId }, { type: 'global' }],
        //     createdAt: { $gte: moment(new Date(rider.createdAt)) },
        // };

        // const list = await NotificationsModel.find(whereConfig);

        // const unseenCount = list.reduce((count, notification) => {
        //     if (!notification.seenBy.includes(deliveryBoyId)) {
        //         return count + 1;
        //     }
        //     return count;
        // }, 0);
        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType: 'deliveryBoy',
            $or: [{ deliveryBoy: deliveryBoyId }, { type: 'global' }],
            createdAt: { $gte: moment(new Date(rider.createdAt)) },
            seenBy: {
                $ne: ObjectId(deliveryBoyId),
            },
        };

        const unseenCount = await NotificationsModel.countDocuments(
            whereConfig
        );

        successResponse(res, {
            message: 'Get unseen notifications',
            data: {
                unseenCount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getNotificationForShop = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
        } = req.query;

        const shopId = req.shopId;

        const shop = await ShopModel.findById(shopId).select('createdAt');

        if (!shop) return errorResponse(res, 'Shop not found.');

        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType: 'shop',
            $or: [{ shop: shopId }, { type: 'global' }],
            createdAt: { $gte: moment(new Date(shop.createdAt)) },
        };

        const paginate = await pagination({
            page,
            pageSize,
            model: NotificationsModel,
            condition: whereConfig,
            pagingRange,
        });

        const list = await NotificationsModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'order',
                    populate: 'shop user deliveryBoy',
                },
            ]);

        whereConfig = {
            ...whereConfig,
            seenBy: {
                $nin: [shopId],
            },
        };

        await NotificationsModel.updateMany(whereConfig, {
            $push: {
                seenBy: shopId,
            },
        });

        successResponse(res, {
            message: 'Get Notifications',
            data: {
                notifications: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
exports.getUnseenNotificationForShop = async (req, res) => {
    try {
        const shopId = req.shopId;

        if (!ObjectId.isValid(shopId)) {
            return errorResponse(res, 'shopId is invalid');
        }

        const shop = await ShopModel.findById(shopId).select('createdAt');

        if (!shop) return errorResponse(res, 'Shop not found.');

        // let whereConfig = {
        //     deleteAt: null,
        //     status: 'active',
        //     accountType: 'shop',
        //     $or: [{ shop: shopId }, { type: 'global' }],
        //     createdAt: { $gte: moment(new Date(shop.createdAt)) },
        // };

        // const list = await NotificationsModel.find(whereConfig);

        // const unseenCount = list.reduce((count, notification) => {
        //     if (!notification.seenBy.includes(shopId)) {
        //         return count + 1;
        //     }
        //     return count;
        // }, 0);
        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType: 'shop',
            $or: [{ shop: shopId }, { type: 'global' }],
            createdAt: { $gte: moment(new Date(shop.createdAt)) },
            seenBy: {
                $ne: ObjectId(shopId),
            },
        };

        const unseenCount = await NotificationsModel.countDocuments(
            whereConfig
        );

        successResponse(res, {
            message: 'Get unseen notifications',
            data: {
                unseenCount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getNotificationForShopConsole = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
            shopId,
        } = req.query;

        const shop = await ShopModel.findById(shopId).select('createdAt');

        if (!shop) return errorResponse(res, 'Shop not found.');

        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType: 'shop',
            $or: [{ shop: shopId }, { type: 'global' }],
            createdAt: { $gte: moment(new Date(shop.createdAt)) },
        };

        const paginate = await pagination({
            page,
            pageSize,
            model: NotificationsModel,
            condition: whereConfig,
            pagingRange,
        });

        const list = await NotificationsModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'order',
                    populate: 'shop user deliveryBoy',
                },
            ]);

        whereConfig = {
            ...whereConfig,
            seenBy: {
                $nin: [shopId],
            },
        };

        await NotificationsModel.updateMany(whereConfig, {
            $push: {
                seenBy: shopId,
            },
        });

        successResponse(res, {
            message: 'Get Notifications',
            data: {
                notifications: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
exports.getUnseenNotificationForShopConsole = async (req, res) => {
    try {
        const { shopId } = req.query;

        if (!ObjectId.isValid(shopId)) {
            return errorResponse(res, 'shopId is invalid');
        }

        const shop = await ShopModel.findById(shopId).select('createdAt');

        if (!shop) return errorResponse(res, 'Shop not found.');

        let whereConfig = {
            deleteAt: null,
            status: 'active',
            accountType: 'shop',
            $or: [{ shop: shopId }, { type: 'global' }],
            seenBy: { $nin: [shopId] },
            createdAt: { $gte: moment(new Date(shop.createdAt)) },
        };

        const unseenCount = await NotificationsModel.countDocuments(
            whereConfig
        );

        successResponse(res, {
            message: 'Get unseen notifications',
            data: {
                unseenCount,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleNotificationForUser = async (req, res) => {
    try {
        const { id } = req.query;
        const userId = req.userId;

        const notification = await NotificationsModel.findById(id);

        if (!notification) return errorResponse(res, 'Notification not find');

        const exitsHistory = await NotificationHistoriesModel.findOne({
            notificationId: id,
            user: userId,
        });

        if (!exitsHistory) {
            await NotificationHistoriesModel.create({
                notificationId: id,
                user: userId,
            });
        }

        successResponse(res, {
            message: 'successfully find',
            data: {
                notification: notification,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleNotificationForDeliiveryBoy = async (req, res) => {
    try {
        const { id } = req.query;
        const deliveryBoyId = req.deliveryBoyId;

        const notification = await NotificationsModel.findById(id);

        if (!notification) return errorResponse(res, 'Notification not find');

        const exitsHistory = await NotificationHistoriesModel.findOne({
            notificationId: id,
            deliveryBoy: deliveryBoyId,
        });

        if (!exitsHistory) {
            await NotificationHistoriesModel.create({
                notificationId: id,
                deliveryBoy: deliveryBoyId,
            });
        }

        successResponse(res, {
            message: 'successfully find',
            data: {
                notification: notification,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getSingleNotificationForSeller = async (req, res) => {
    try {
        const { id } = req.query;
        const shopId = req.shopId;

        const notification = await NotificationsModel.findById(shopId);

        if (!notification) return errorResponse(res, 'Notification not find');

        const exitsHistory = await NotificationHistoriesModel.findOne({
            notificationId: id,
            shop: shopId,
        });

        if (!exitsHistory) {
            await NotificationHistoriesModel.create({
                notificationId: id,
                shop: shopId,
            });
        }

        successResponse(res, {
            message: 'successfully find',
            data: {
                notification: notification,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteAllNotificationForUserApp = async (req, res) => {
    try {
        const userId = req.userId;

        await NotificationsModel.deleteMany({ user: userId });
        await NotificationHistoriesModel.deleteMany({ user: userId });

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteAllNotificationForDeliveryApp = async (req, res) => {
    try {
        const deliveryBoyId = req.deliveryBoyId;

        await NotificationsModel.deleteMany({ deliveryBoy: deliveryBoyId });
        await NotificationHistoriesModel.deleteMany({
            deliveryBoy: deliveryBoyId,
        });

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteAllNotificationForShopApp = async (req, res) => {
    try {
        const shopId = req.shopId;

        await NotificationsModel.deleteMany({ shop: shopId });
        await NotificationHistoriesModel.deleteMany({ shop: shopId });

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const removeFailedTokens = async (accountType, id, failedTokens) => {
    let user;

    if (accountType == 'user') {
        user = await UserModel.findById(id);
    }
    if (accountType == 'shop') {
        user = await ShopModel.findById(id);
    }
    if (accountType == 'delivery') {
        user = await DeliveryBoyModel.findById(id);
    }

    const newFcmToken = user?.fcmToken?.filter(
        value => !failedTokens.includes(value)
    );

    user.fcmToken = newFcmToken;

    await user.save();
};

exports.pushNotificationForDeactivateUserByAdmin = async (userId) => {
    let userNotification = await NotificationsModel.create({
        title: `Your account has been deactivated.`,
        description: `Your account has been deactivated.`,
        type: 'specific',
        orderStatus: null,
        accountType: 'user',
        user: userId,
        order: null,
        clickable: true,
    });
    pushNotification('user', userId, userNotification);
}
exports.pushNotificationForDeleteCart = async (userId) => {
    let userNotification = await NotificationsModel.create({
        title: `Admin delete the group cart.`,
        description: `Admin delete his group cart. Your money has been refunded to your card.`,
        type: 'specific',
        orderStatus: null,
        accountType: 'user',
        user: userId,
        order: null,
        clickable: true,
    });
    pushNotification('user', userId, userNotification);
}
// When rider be closest
exports.pushNotificationUserWhenRiderBeClosest = async (userId) => { // only for user
    let userNotification = await NotificationsModel.create({
        title: `Your order is at corner, please be ready.`,
        description: `Your order is at corner, please be ready to receive it.`,
        type: 'specific',
        orderStatus: null,
        accountType: 'user',
        user: userId,
        order: null,
        clickable: true,
    });
    pushNotification('user', userId, userNotification);
}
