const AppSetting = require('../models/AppSetting');
const AdminChatRequest = require('../models/AdminChatRequest');
const DeliveryBoy = require('../models/DeliveryBoyModel');
const { verify } = require('jsonwebtoken');
const Order = require('../models/OrderModel');
const Butler = require('../models/ButlerModel');
const {
    errorResponse,
    errorHandler,
    successResponse,
} = require('../helpers/apiResponse');

const globalRoom = 'drop_room'; // for all client -> user/seller/shop/deliveryBoy
const adminRoom = 'drop_room_admin';
const userRoom = 'drop_room_user';
const shopRoom = 'drop_room_shop';
const deliveryBoyRoom = 'drop_room_deliveryBoy';
const onlineClient = [];
const { Server } = require('socket.io');
const redisAdapter = require('socket.io-redis');

const {
    getFullOrderInformation,
    getFullOrderInformationForButler,
} = require('../helpers/orderHelper');
const {
    sendNotificationsAllApp,
    sendNotificationForBobSettlement,
    sendNotificationForUrgentOrder,
    pushNotificationUserWhenRiderBeClosest,
} = require('../controllers/NotificationController');
const CartModel = require('../models/CartModel');
const { DistanceInfoGoogle } = require('../lib/getDistanceInfo');
const AdminModel = require('../models/AdminModel');
const NotificationsModel = require('../models/NotificationsModel');
const { getRiderCashInHand } = require('../controllers/FinancialController');
let io = null;

// socketId: data.socketId,
//         type: data.type,
//         name: data.name,
//         id: data.id,
//         platform: data.platform,
//         rooms: data.rooms,
//         location: data.location,

module.exports.totalLiveUsers = async type => {
    if (['admin', 'user', 'seller', 'shop', 'deliveryBoy'].includes(type)) {
        return onlineClient.filter(client => client.type === type).length;
    }
    return onlineClient.length;
};

const addNewUser = async data => {
    const client = onlineClient.find(cli => cli.socketId == data?.socketId);
    if (client) {
        return {
            status: false,
            message: 'already join',
            client: client,
        };
    }
    const newUser = {
        socketId: data.socketId,
        type: data.type,
        name: data.name,
        id: data.id,
        platform: data.platform,
        rooms: data.rooms,
        location: data.location,
    };
    onlineClient.push(newUser);

    console.log('*********Call addNewUser', onlineClient);

    return {
        status: true,
        message: 'new Delivery Boy join',
        client: newUser,
    };
};

const sendAdminNotificationForJoined = (io, data) => {
    io.to(adminRoom).emit('drop_room_joined', data);
};

module.exports = server => {
    try {
        io = new Server(server, {
            connectionStateRecovery: {}
        });

        // io.adapter(
        //     redisAdapter({
        //         host: process.env.REDIS_HOST,
        //         port: process.env.REDIS_PORT,
        //     })
        // );

        io.on('connection', socket => {
            console.log(
                `${socket.conn.server.clientsCount} connected => `,
                socket.id
            );

            // join drop_room
            socket.on('join_drop', async (data, callback) => {
                try {
                    if (callback && typeof callback !== 'function') {
                        // not an acknowledgement
                        return socket.disconnect();
                    }
                    const socketId = socket.id;

                    const platform = data.platform;
                    const type = data.type;
                    const token = data.token;

                    let room = type === 'admin' ? adminRoom : globalRoom;
                    const { id, name } = await getIdFromToken(token, type);

                    const { status, message, client } = await addNewUser({
                        socketId: socketId,
                        name,
                        id,
                        type,
                        platform: platform,
                        rooms: [room],
                        location: {
                            type: 'Point',
                            coordinates: [
                                data?.location?.longitude,
                                data?.location?.latitude,
                            ],
                        },
                    });

                    if (status) {
                        socket.join(room);

                        if (type === 'deliveryBoy') {
                            socket.join(deliveryBoyRoom);
                        } else if (type === 'user') {
                            socket.join(userRoom);
                        } else if (type === 'shop') {
                            socket.join(shopRoom);
                        }

                        setTimeout(() => {
                            sendAdminNotificationForJoined(io, {
                                totalLiveUser: onlineClient.length,
                                client,
                            });
                        }, 1000);
                    } else {
                        if (callback) {
                            return callback({
                                status: false,
                                error: message,
                            });
                        }
                    }
                } catch (error) {
                    console.log(error);
                    if (callback) {
                        return callback({
                            status: false,
                            error: error,
                        });
                    }
                }
            });

            // connect any existing rooms
            socket.on('join_room', ({ room }) => {
                socket.join(room);
            });

            // connect any existing rooms
            socket.on('deliveryBoyAcceptedOrder', async ({ orderId }) => {
                let order = await Order.findById(orderId).populate([
                    {
                        path: 'shop',
                    },
                    {
                        path: 'user',
                        select: '-password',
                    },
                    {
                        path: 'users',
                        select: '-password',
                    },
                    {
                        path: 'deliveryBoy',
                    },
                    {
                        path: 'seller',
                    },
                    {
                        path: 'deliveryAddress',
                    },
                    {
                        path: 'orderCancel.cancelReason',
                    },
                    {
                        path: 'cart',
                        populate: [
                            {
                                path: 'cartItems.user',
                            },
                            {
                                path: 'creator',
                            },
                        ],
                    },
                ]);

                if (!order) {
                    order = await Butler.findById(orderId).populate([
                        {
                            path: 'user',
                            select: '-password',
                        },

                        {
                            path: 'deliveryBoy',
                        },

                        {
                            path: 'orderCancel.cancelReason',
                        },
                    ]);
                }

                if (order) {
                    io.to(orderId).emit('updateOrder', {
                        order,
                        type: 'deliveryBoyAcceptedOrder',
                        orderStatus: order['orderStatus'],
                    });

                    for (const riderId of order.deliveryBoyList) {
                        if (
                            riderId.toString() !==
                            order.deliveryBoy._id.toString()
                        ) {
                            socket
                                .to(deliveryBoyRoom)
                                .emit(`received_order_request-${riderId}`, {
                                    order,
                                    type: 'cancel',
                                    orderStatus: order['orderStatus'],
                                });

                            console.log(
                                `**********remove other rider, received_order_request-${riderId}`
                            );
                        }
                    }
                }
            });

            //from Admin
            socket.on('adminAcceptedOrder', async ({ orderId }) => {
                // socket.join(room);

                let order = await Order.findById(orderId).populate([
                    {
                        path: 'shop',
                    },
                    {
                        path: 'user',
                        select: '-password',
                    },
                    {
                        path: 'users',
                        select: '-password',
                    },
                    {
                        path: 'deliveryBoy',
                    },
                    {
                        path: 'seller',
                    },
                    {
                        path: 'deliveryAddress',
                    },
                    {
                        path: 'orderCancel.cancelReason',
                    },
                    {
                        path: 'cart',
                        populate: [
                            {
                                path: 'cartItems.user',
                            },
                            {
                                path: 'creator',
                            },
                        ],
                    },
                ]);

                if (!order) {
                    order = await Butler.findById(orderId).populate([
                        {
                            path: 'user',
                            select: '-password',
                        },

                        {
                            path: 'deliveryBoy',
                        },

                        {
                            path: 'orderCancel.cancelReason',
                        },
                    ]);
                }

                if (order) {
                    if (order.deliveryBoy) {
                        io.to(deliveryBoyRoom).emit(
                            `admin_updated_order_status-${order.deliveryBoy._id}`,
                            {
                                order,
                                type: 'assignedDeliveryBoyByAdmin',
                            }
                        );
                    }

                    for (const riderId of order.deliveryBoyList) {
                        if (
                            riderId.toString() !==
                            order.deliveryBoy._id.toString()
                        ) {
                            io.to(deliveryBoyRoom).emit(
                                `admin_updated_order_status-${riderId}`,
                                {
                                    order,
                                    type: 'removeDeliveryBoyByAdmin',
                                }
                            );
                        }
                    }

                    io.to(orderId).emit('updateOrder', {
                        order,
                        type: 'deliveryBoyAcceptedOrder',
                        from: 'admin',
                        orderStatus: order['orderStatus'],
                    });
                }
            });

            // socket.on('place_order', async data => {
            //     try {
            //         console.log('**********call place_order');
            //         const { orderId } = data;
            //         checkNearByDeliveryBoy(orderId);
            //     } catch (error) {
            //         console.log(error);
            //     }
            // });

            // placed order for butler
            // socket.on('place_butler_order', async data => {
            //     try {
            //         const { orderId } = data;
            //         checkNearByDeliveryBoyForButler(orderId);
            //     } catch (error) {
            //         console.log(error);
            //     }
            // });

            socket.on('updateOrder', async ({ orderId }) => {
                let order = await Order.findById(orderId).populate([
                    {
                        path: 'shop',
                    },
                    {
                        path: 'user',
                        select: '-password',
                    },
                    {
                        path: 'users',
                        select: '-password',
                    },
                    {
                        path: 'deliveryBoy',
                    },
                    {
                        path: 'seller',
                    },
                    {
                        path: 'deliveryAddress',
                    },
                    {
                        path: 'orderCancel.cancelReason',
                    },
                    {
                        path: 'cart',
                        populate: [
                            {
                                path: 'cartItems.user',
                            },
                            {
                                path: 'creator',
                            },
                        ],
                    },
                    {
                        path: 'adjustOrderRequest',
                    },
                ]);

                if (!order) {
                    order = await Butler.findById(orderId).populate([
                        {
                            path: 'user',
                            select: '-password',
                        },
                        {
                            path: 'deliveryBoy',
                        },
                        {
                            path: 'orderCancel.cancelReason',
                        },
                    ]);
                }

                if (order) {
                    socket.broadcast.emit('updateOrder', {
                        order,
                        type: 'normal',
                        orderStatus: order['orderStatus'],
                    }); // send to all client except sender
                }


                console.log('********call updateOrder -->', order);
            });

            socket.on('cancelOrder', async ({ orderId }) => {
                let order = await Order.findById(orderId).populate([
                    {
                        path: 'shop',
                    },
                    {
                        path: 'user',
                        select: '-password',
                    },
                    {
                        path: 'users',
                        select: '-password',
                    },
                    {
                        path: 'deliveryBoy',
                    },
                    {
                        path: 'seller',
                    },
                    {
                        path: 'deliveryAddress',
                    },
                    {
                        path: 'orderCancel.cancelReason',
                    },
                    {
                        path: 'cart',
                        populate: [
                            {
                                path: 'cartItems.user',
                            },
                            {
                                path: 'creator',
                            },
                        ],
                    },
                ]);

                if (!order) {
                    order = await Butler.findById(orderId).populate([
                        {
                            path: 'user',
                            select: '-password',
                        },

                        {
                            path: 'deliveryBoy',
                        },
                        {
                            path: 'orderCancel.cancelReason',
                        },
                        {
                            path: 'deliveryAddress',
                        },
                    ]);
                }

                if (order) {
                    socket.to(orderId).emit('updateOrder', {
                        order,
                        type: 'cancel',
                        orderStatus: order['orderStatus'],
                    });

                    if (!order?.accepted_delivery_boyAt) {
                        for (const riderId of order.deliveryBoyList) {
                            socket
                                .to(deliveryBoyRoom)
                                .emit(`received_order_request-${riderId}`, {
                                    order,
                                    type: 'cancel',
                                    orderStatus: order['orderStatus'],
                                });
                        }
                    } else {
                        socket
                            .to(deliveryBoyRoom)
                            .emit(
                                `received_order_request-${order?.deliveryBoy?._id}`,
                                {
                                    order,
                                    type: 'cancel',
                                    orderStatus: order['orderStatus'],
                                }
                            );
                    }

                    if (order?.shop) {
                        io.to(shopRoom).emit(
                            `received_order_request-${order.shop._id}`,
                            {
                                order,
                                type: 'cancel',
                                orderStatus: order['orderStatus'],
                            }
                        );
                    }
                }
            });

            //****** admin and user chats start ******/

            // admin send message to user
            socket.on('user_send_chat_request', async ({ room }) => {
                socket.join(room);
                console.log(`**********user_send_chat_request room-->`, room);

                const item = await AdminChatRequest.findOne({
                    _id: room,
                }).populate([
                    {
                        path: 'order',
                        populate: [
                            {
                                path: 'flag',
                            },
                            {
                                path: 'admin_chat_request',
                                populate: [
                                    {
                                        path: 'admin',
                                    },
                                    {
                                        path: 'chats',
                                    },
                                ],
                            },
                            {
                                path: 'shop',
                            },
                            {
                                path: 'deliveryBoy',
                            },
                        ],
                    },
                    {
                        path: 'butler',
                        populate: [
                            {
                                path: 'flag',
                            },
                            {
                                path: 'deliveryBoy',
                            },
                            {
                                path: 'admin_chat_request',
                                populate: [
                                    {
                                        path: 'admin',
                                    },
                                    {
                                        path: 'chats',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        path: 'chats',
                    },
                    {
                        path: 'admin',
                    },
                    {
                        path: 'user',
                        populate: [
                            {
                                path: 'cards',
                                select: '-cvv -expiry_month -expiry_year -expiryDateString -expiryDate -security -pins -mode',
                            },
                            {
                                path: 'address',
                            },
                            {
                                path: 'coupons',
                            },
                        ],
                    },
                    {
                        path: 'shop',
                        select: 'shopName email phone_number shopLogo shopType address',
                    },
                ]);

                if (item?.chatType === 'order' && !item?.order) {
                    item._doc.order = item?.butler;
                }

                io.to(adminRoom).emit('user_send_chat_request', item);
            });

            // when user goto screen join chat room
            socket.on('user_join_chat_room', async ({ room }) => {
                socket.join(room);
                console.log(`**********user_join_chat_room--> ${room}`);
            });

            // for leave room
            socket.on('leaveRoom', async ({ room }) => {
                socket.leave(room);
                console.log(`**********Client left room--> ${room}`);
            });

            socket.on('admin_accepted_chat_request', async ({ requestId }) => {
                try {
                    socket.join(requestId);

                    const chatRequest = await AdminChatRequest.findById(
                        requestId
                    ).populate('admin');

                    // socket
                    //     .to(requestId)
                    //     .emit('admin_accepted_chat_request', chatRequest);

                    socket
                        .to(userRoom)
                        .emit(
                            `admin_accepted_chat_request-${
                                chatRequest.user ?? chatRequest.shop
                            }`,
                            {
                                ...chatRequest._doc,
                                acceptedStatus: `Hi, I am ${chatRequest?.admin?.name?.split(' ')[0]}. How can i help you.`,
                            }
                        );

                    socket
                        .to(requestId)
                        .emit(`admin_accepted_chat_request-${requestId}`, {
                            acceptedStatus: `Hi, I am ${chatRequest?.admin?.name?.split( ' ')[0]}. How can i help you.`,
                        });

                    console.log(
                        `***********admin_accepted_chat_request-${
                            chatRequest.user ?? chatRequest.shop
                        }`
                    );

                    io.to(adminRoom).emit(
                        'admin_accepted_chat_remove',
                        chatRequest
                    );
                } catch (error) {
                    console.log(error);
                }
            });

            socket.on('chat-close', async ({ requestId }) => {
                await notifyForCloseChat(requestId);
                // const chatRequest = await AdminChatRequest.findById(requestId);
                //
                // // remove from room name - requestId
                // // socket.to(requestId).emit('chat-close', {
                // //     requestId,
                // //     orderId: chatRequest.order,
                // // });
                //
                // socket.to(userRoom).emit(`chat-close-${chatRequest.user??chatRequest.shop}`, {
                //     requestId,
                //     orderId: chatRequest.order,
                // });
                //
                // socket.to(requestId).emit(`chat-close-${requestId}`, {
                //     requestId,
                //     orderId: chatRequest.order,
                // });
                //
                // console.log(`**********chat-close-${chatRequest.user??chatRequest.shop}`);
            });

            socket.on('typeing', ({ requestId }) => {
                socket.to(requestId).emit(`typeing-${requestId}`);
                console.log(`************typeing--- ${requestId}`);
            });

            socket.on('join_user_and_admin_chat', ({ room, data }) => {
                try {
                    socket.join(room);
                    console.log(
                        `************join_user_and_admin_chat room---`,
                        room
                    );
                } catch (error) {
                    console.log(error);
                }
            });

            // admin send message to user
            socket.on(
                'admin_message_sent',
                async ({ room, messageId, data }) => {
                    // room is request id =>
                    const chatRequest = await AdminChatRequest.findById(
                        room
                    ).populate([
                        {
                            path: 'chats',
                            populate: [
                                {
                                    path: 'user',
                                    select: 'name phone_number email profile_photo',
                                },
                                {
                                    path: 'shop',
                                    select: 'shopName email phone_number shopLogo shopType address',
                                },
                                {
                                    path: 'admin',
                                },
                                {
                                    path: 'order',
                                },
                                {
                                    path: 'butler',
                                },
                            ],
                        },
                    ]);

                    const lastChat = chatRequest.chats.at(-1);

                    console.log(
                        '*********admin_message_sent lastChat---',
                        lastChat
                    );

                    let order;

                    if (chatRequest.order) {
                        order = await Order.findOne({
                            _id: chatRequest.order,
                        })
                            .populate([
                                {
                                    path: 'admin_chat_request',
                                    populate: [
                                        {
                                            path: 'user',
                                            select: 'name email phone_number profile_photo',
                                        },
                                        {
                                            path: 'shop',
                                            select: 'shopName email phone_number shopLogo shopType address',
                                        },
                                        {
                                            path: 'admin',
                                        },
                                        {
                                            path: 'chats',
                                        },
                                    ],
                                },
                                {
                                    path: 'shop',
                                    select: 'shopName shopLogo',
                                },
                            ])
                            .select(
                                'user admin_chat_request shop lastChatTime'
                            );
                    } else {
                        order = await Butler.findOne({
                            _id: chatRequest.butler,
                        })
                            .populate([
                                {
                                    path: 'admin_chat_request',
                                    populate: [
                                        {
                                            path: 'user',
                                            select: 'name email phone_number profile_photo',
                                        },
                                        {
                                            path: 'shop',
                                            select: 'shopName email phone_number shopLogo shopType address',
                                        },
                                        {
                                            path: 'admin',
                                        },
                                        {
                                            path: 'chats',
                                        },
                                    ],
                                },
                            ])
                            .select('user admin_chat_request  lastChatTime');
                    }

                    socket
                        .to(room)
                        .emit(`admin_message_sent-${room}`, lastChat);

                    console.log('**********admin_message_sent order---', order);

                    if (chatRequest.user || chatRequest.shop) {
                        io.to(userRoom).emit(
                            `message_notify-${
                                chatRequest.user ?? chatRequest.shop
                            }`,
                            order
                        );
                    }

                    console.log(
                        '**********admin_message_sent onlineClient',
                        onlineClient
                    );
                }
            );

            // user sent message to admin
            socket.on('user_message_sent', async ({ room }) => {
                // room is request id
                const chatRequest = await AdminChatRequest.findById(
                    room
                ).populate([
                    {
                        path: 'chats',
                        populate: [
                            {
                                path: 'user',
                                select: 'name phone_number email profile_photo',
                            },
                            {
                                path: 'shop',
                                select: 'shopName email phone_number shopLogo shopType address',
                            },
                            {
                                path: 'admin',
                            },
                        ],
                    },
                ]);

                const lastChat = chatRequest.chats.at(-1);

                console.log('******user_message_sent lastChat---', lastChat);

                socket.to(room).emit(`user_message_sent-${room}`, lastChat);

                console.log(
                    '**********user_message_sent onlineClient---',
                    onlineClient
                );
            });

            //****** admin and user chats end ******/

            socket.on('requestOnlineUser', (data, callback) => {
                callback(drop_room_joined, length);
            });

            // detiveryBoy update last location and if have own order then send notification to rooms (order_id)
            socket.on('deliveryBoyCurrentLocationUpdate', async data => {
                const latitude = data.latitude;
                const longitude = data.longitude;
                const orderIds = data.orderIds || [];
                const orderTripSummaryIndex = data.orderTripSummaryIndex;
                const remainingDuration = data.duration; // {}
                const remainingDistance = data.distance; // {}

                // console.log('********deliveryBoyCurrentLocationUpdate', data);
                const { id, name } = await getIdFromToken(
                    data.token,
                    'deliveryBoy'
                );

                await DeliveryBoy.updateOne(
                    {
                        _id: id,
                    },
                    {
                        location: {
                            type: 'Point',
                            coordinates: [longitude, latitude],
                        },
                        lastLocationUpdateAt: new Date(),
                    }
                );

                for (const orderId of orderIds) {
                    let findOrder = await Order.findOne({ _id: orderId });

                    if (!findOrder) {
                        findOrder = await Butler.findOne({ _id: orderId });
                    }

                    if (
                        remainingDuration?.value <= 180 &&
                        findOrder?.orderStatus === 'order_on_the_way' &&
                        !findOrder?.isSendNotificationUserWhenRiderBeClosest
                    ) {
                        pushNotificationUserWhenRiderBeClosest(findOrder.user);
                        findOrder.isSendNotificationUserWhenRiderBeClosest = true; // send only once
                    }

                    findOrder.orderTripSummary[
                        orderTripSummaryIndex
                    ].duration.text = remainingDuration?.text;
                    findOrder.orderTripSummary[
                        orderTripSummaryIndex
                    ].duration.value = remainingDuration?.value;
                    findOrder.orderTripSummary[
                        orderTripSummaryIndex
                    ].distance.text = remainingDistance?.text;
                    findOrder.orderTripSummary[
                        orderTripSummaryIndex
                    ].distance.value = remainingDistance?.value;
                    findOrder.paidCurrency = 'baseCurrency';

                    await findOrder.save();
                }

                const normalOrders = await Order.find({
                    deliveryBoy: id,
                    orderStatus: {
                        $in: [
                            'order_on_the_way',
                            'preparing',
                            'ready_to_pickup',
                        ],
                    },
                });

                const butlerOrders = await Butler.find({
                    deliveryBoy: id,
                    orderStatus: {
                        $in: ['order_on_the_way'],
                    },
                });

                const orders = [...normalOrders, ...butlerOrders];

                console.log('*****orders length-->', orders.length);

                for (const order of orders) {
                    if (order.orderStatus == 'order_on_the_way') {
                        io.to(String(order._id)).emit(
                            'deliveryBoyCurrentLocationUpdate',
                            {
                                location: {
                                    type: 'Point',
                                    coordinates: [longitude, latitude],
                                },
                            }
                        );

                        io.to(String(order._id)).emit(
                            `deliveryBoyCurrentLocationUpdate-${String(
                                order._id
                            )}`,
                            {
                                location: {
                                    type: 'Point',
                                    coordinates: [longitude, latitude],
                                },
                            }
                        );

                        // console.log(
                        //     `*************call deliveryBoyCurrentLocationUpdate-${String(
                        //         order._id
                        //     )}`
                        // );
                    }

                    io.to(String(order._id)).emit(
                        `deliveryBoyCurrentLocationUpdateShop`,
                        {
                            location: {
                                type: 'Point',
                                coordinates: [longitude, latitude],
                            },
                            order: order._id,
                        }
                    );

                    io.to(String(order._id)).emit(
                        `deliveryBoyCurrentLocationUpdateShop-${String(
                            order._id
                        )}`,
                        {
                            order: order._id,
                            location: {
                                type: 'Point',
                                coordinates: [longitude, latitude],
                            },
                        }
                    );

                    console.log(
                        `*************call deliveryBoyCurrentLocationUpdateShop-${String(
                            order._id
                        )}`
                    );
                }
            });

            socket.on('order_room_join', ({ room, data }) => {
                try {
                    socket.join(room);
                    io.to(room).emit('order_room_join', data);
                } catch (error) {
                    console.log(error);
                }
            });

            // user sent message to delivery boy
            socket.on(
                'order_send_message_to_delivery_boy',
                ({ room, data }) => {
                    // room is request id
                    io.to(room).emit(
                        'order_received_message_delivery_boy',
                        data
                    );
                }
            );

            // delivery boy sent message to user
            socket.on('order_send_message_to_user', ({ room, data }) => {
                // room is request id
                io.to(room).emit('order_received_message_user', data);
            });

            socket.on('disconnect', async () => {
                const index = onlineClient.findIndex(
                    client => client.socketId == socket.id
                );

                if (index !== -1) {
                    const client = onlineClient[index];
                    onlineClient.splice(index, 1)[0];
                }
            });

            //*** Update Group Cart ***/
            socket.on(
                'updateCart',
                async ({ cartId, orderId = null, status, userName }) => {
                    const cart = await CartModel.findById(cartId).populate([
                        {
                            path: 'cartItems.user',
                        },
                        {
                            path: 'cartItems.products.product',
                            populate: [
                                {
                                    path: 'category',
                                },
                                {
                                    path: 'subCategory',
                                },
                                {
                                    path: 'addons',
                                    populate: [
                                        {
                                            path: 'category',
                                        },
                                        {
                                            path: 'subCategory',
                                        },
                                    ],
                                },
                                {
                                    path: 'marketing',
                                },
                                {
                                    path: 'shop',
                                    populate: 'address cuisineType marketings',
                                },
                            ],
                        },
                        {
                            path: 'creator',
                        },
                        {
                            path: 'deliveryAddress',
                        },
                        {
                            path: 'shop',
                            populate: 'address cuisineType marketings',
                        },
                    ]);

                    let order = null;
                    if (orderId) {
                        order = await Order.findById(orderId).populate([
                            {
                                path: 'shop',
                            },
                            {
                                path: 'user',
                                select: '-password',
                            },
                            {
                                path: 'users',
                                select: '-password',
                            },
                            {
                                path: 'deliveryBoy',
                            },
                            {
                                path: 'seller',
                            },
                            {
                                path: 'deliveryAddress',
                            },
                            {
                                path: 'orderCancel.cancelReason',
                            },
                            {
                                path: 'cart',
                                populate: [
                                    {
                                        path: 'cartItems.user',
                                    },
                                    {
                                        path: 'creator',
                                    },
                                ],
                            },
                        ]);
                    }

                    socket.to(cartId).emit('updateCart', {
                        cart,
                        order,
                        status,
                        message: status === 'guestRemoved' ? `${userName} has left your group order and all their items have been removed from your cart`
                        : status === 'deleted' 
                        ? `${userName} has deleted his group order and you can no longer proceed with your selected items. Please initiate your own cart if you want to place an order.`
                        : status === 'hostRemoved' ? `${userName} has removed you from their group order and you can no longer proceed with your selected items. Please initiate your own cart if you want to place an order.`
                        : ''
                    }); // send to all client in room except sender
                }
            );

            //*** Rider force logout feature ***/
            socket.on(
                'deliveryBoyLoginStatusUpdate',
                async ({ deliveryBoyId }) => {
                    const rider = await DeliveryBoy.findById(deliveryBoyId)
                        .select('isLogin')
                        .lean();

                    if (rider) {
                        socket
                            .to(deliveryBoyRoom)
                            .emit(`deliveryBoyLoginStatusUpdate-${rider._id}`, {
                                rider,
                            });
                    }
                }
            );

            //*** Shop liveStatus updated realtime ***/
            socket.on(
                'shopLiveStatusUpdated',
                async ({ liveStatus, shopId }) => {
                    console.log(
                        '*******shopLiveStatusUpdated',
                        liveStatus,
                        shopId
                    );

                    socket.broadcast.emit(
                        `shopLiveStatusUpdated-${String(shopId)}`,
                        {
                            liveStatus,
                            shopId,
                        }
                    );
                }
            );
        });

        return io;
    } catch (error) {
        console.log(error);
    }
};

const getIdFromToken = async (token, type) => {
    if (!token) {
        return {
            id: null,
            name: null,
        };
    }

    try {
        const secure_key = await getSecurityKey(type);
        if (type == 'deliveryBoy') {
            const { deliveryBoyId, name } = verify(token, secure_key);
            return { id: deliveryBoyId, name };
        } else if (type == 'admin') {
            const { id, name } = verify(token, secure_key);
            return { id, name };
        } else if (type == 'shop') {
            const { shopId, name } = verify(token, secure_key);
            return { id: shopId, name };
        } else if (type == 'user') {
            const { userId, name } = verify(token, secure_key);
            return { id: userId, name };
        }
    } catch (err) {
        console.log('err', err);
        return {
            id: null,
            name: null,
        };
    }
};

const getSecurityKey = async type => {
    if (type == 'user') {
        return process.env.JWT_PRIVATE_KEY_USER;
    } else if (type == 'deliveryBoy') {
        return process.env.JWT_PRIVATE_KEY_DELIVERY_BOY;
    } else if (type == 'admin') {
        return process.env.JWT_PRIVATE_KEY_ADMIN;
    } else if (type == 'seller') {
        return process.env.JWT_PRIVATE_KEY_SELLER;
    } else if (type == 'shop') {
        return process.env.JWT_PRIVATE_KEY_SHOP;
    }
};

module.exports.getRelatedDeliveryBoyForButler = async (req, res) => {
    try {
        const { orderId } = req.query;

        const order = await Butler.findOne({ _id: orderId });

        if (!order) {
            return errorResponse(res, 'order not found');
        }

        const { coordinates } = order.receivedAddress.location;

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
            .sort({ createdAt: 'asc' })
            .select('name image location');

        const newList = [];
        for (const deliveryBoy of nearByDeliveryBoys) {
            const orders = await Order.countDocuments({
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
            const butlers = await Butler.countDocuments({
                deliveryBoy: deliveryBoy._id,
                orderStatus: {
                    $in: ['accepted_delivery_boy', 'order_on_the_way'],
                },
            });

            if (!orders && !butlers) {
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

module.exports.uploadProgressBar = (
    shopId,
    uniqueKey,
    startPercentage,
    progressBarData,
    message
) => {
    progressBarData.processedItems++;
    let percentage = Math.floor(
        (startPercentage === 0 ? 0.2 : 0.8) *
            (progressBarData.processedItems / progressBarData.totalItems) *
            100
    );
    percentage += startPercentage;
    const data = {
        percentage,
        message: message,
    };
    io.emit(`progress_bar_shop_${uniqueKey}`, data);
};

// module.exports.preventSameShopUpload = async (shopId, isUploading = false) => {
//     const emitInterval = 1000; // Emit every second
//     const maxDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
//     const startTime = Date.now();

//     const intervalId = setInterval(() => {
//         if (!isUploading || Date.now() - startTime >= maxDuration) {
//             clearInterval(intervalId); // Stop emitting after conditions are met
//             return;
//         }
//         io.emit(`isUploading_${shopId}`, { isUploading });
//         console.log(
//             `Emitting isUploading_${shopId} with status ${isUploading}`
//         );
//     }, emitInterval);
// };

module.exports.uploadProgressBarLyxa = (
    uniqueKey,
    startPercentage,
    progressBarData,
    message
) => {
    /*
    progressBarData.processedItems++;
    const percentage = Math.round(
        (progressBarData.processedItems / progressBarData.totalItems) * 100
    );
    const data = {
        percentage,
        message: message,
    };
    io.emit(`progress_bar_lyxa_${uniqueKey}`, data);
*/
    progressBarData.processedItems++;
    let percentage = Math.floor(
        (startPercentage === 0 ? 0.2 : 0.8) *
            (progressBarData.processedItems / progressBarData.totalItems) *
            100
    );
    percentage += startPercentage;
    const data = {
        percentage,
        message: message,
    };
    io.emit(`progress_bar_lyxa_${uniqueKey}`, data);
};

const checkDeliveryBoy = async order => {
    console.log('*******search checking delivery boy');

    const appSetting = await AppSetting.findOne();
    let searchDeliveryBoyKm = appSetting?.searchDeliveryBoyKm || [1, 5, 10];

    const {
        nearByDeliveryBoysId,
        km,
        deliveredFirstDeliveryBoyList,
        deliveredSecondDeliveryBoyList,
    } = await getDeliveryBoyFromDataBase(searchDeliveryBoyKm, order);

    console.log('******nearByDeliveryBoysId');
    console.log(nearByDeliveryBoysId);

    if (nearByDeliveryBoysId.length) {
        const updatedOrder = await Order.findByIdAndUpdate(
            order._id,
            {
                $set: {
                    deliveryBoyList: nearByDeliveryBoysId,
                    lastSearchKm: km,
                    searchingTime: new Date(),
                    deliveredFirstDeliveryBoyList,
                    deliveredSecondDeliveryBoyList,
                },
                $inc: { totalSearching: 1 },
            },
            { new: true }
        ).populate('shop');

        for (const deliveryBoyId of nearByDeliveryBoysId) {
            io.to(deliveryBoyRoom).emit(
                `received_order_request-${deliveryBoyId}`,
                { order: updatedOrder }
            );
            console.log(`***********received_order_request-${deliveryBoyId}`);
        }

        console.log(`***********searchingTime-${updatedOrder.searchingTime}`);
        console.log(`***********totalSearching-${updatedOrder.totalSearching}`);

        const orderFullInformation = await getFullOrderInformation(order._id);

        await sendNotificationsAllApp(orderFullInformation, false, true);
    } else {
        await Order.updateOne(
            { _id: order._id },
            {
                $set: {
                    searchingTime: new Date(),
                },
                $inc: { totalSearching: 1 },
            }
        );
    }
};

const checkDeliveryBoyForButler = async order => {
    console.log('search checking delivery boy for butler');

    const appSetting = await AppSetting.findOne();
    let searchDeliveryBoyKm = appSetting?.searchDeliveryBoyKm || [1, 5, 10];

    const { nearByDeliveryBoysId, km } =
        await getDeliveryBoyFromDataBaseForButler(searchDeliveryBoyKm, order);

    console.log('******nearByDeliveryBoysId');
    console.log(nearByDeliveryBoysId);

    if (nearByDeliveryBoysId.length) {
        const updatedOrder = await Butler.findByIdAndUpdate(
            order._id,
            {
                $set: {
                    deliveryBoyList: nearByDeliveryBoysId,
                    lastSearchKm: km,
                    searchingTime: new Date(),
                },
                $inc: { totalSearching: 1 },
            },
            { new: true }
        );

        for (const deliveryBoyId of nearByDeliveryBoysId) {
            io.to(deliveryBoyRoom).emit(
                `received_order_request-${deliveryBoyId}`,
                { order: updatedOrder }
            );
        }
        const orderFullInformation = await getFullOrderInformationForButler(
            order._id
        );

        await sendNotificationsAllApp(orderFullInformation, false, true);
    } else {
        await Butler.updateOne(
            { _id: order._id },
            {
                $set: {
                    searchingTime: new Date(),
                },
                $inc: { totalSearching: 1 },
            }
        );
    }
};

const getDeliveryBoyFromDataBaseForButler = async (
    searchDeliveryBoyKm,
    order
) => {
    //*** Which rider have no order ***/
    for (const element of searchDeliveryBoyKm) {
        if (
            order.lastSearchKm < element ||
            element === searchDeliveryBoyKm[searchDeliveryBoyKm.length - 1]
        ) {
            const findDeliveryBoysObj =
                await getDeliveryBoyFromDataBaseFirstCase(element, order);

            if (findDeliveryBoysObj.nearByDeliveryBoysId.length) {
                return findDeliveryBoysObj;
            }
        }
    }

    return {
        nearByDeliveryBoysId: [],
        km: searchDeliveryBoyKm[searchDeliveryBoyKm.length - 1],
    };
};

const getDeliveryBoyFromDataBase = async (searchDeliveryBoyKm, order) => {
    let searchDeliveryBoyKmFirstRange = searchDeliveryBoyKm;
    let searchDeliveryBoyKmThirdRange;

    if (searchDeliveryBoyKm.length > 2) {
        searchDeliveryBoyKmFirstRange = [
            searchDeliveryBoyKm[0],
            searchDeliveryBoyKm[1],
        ];
        searchDeliveryBoyKmThirdRange = searchDeliveryBoyKm[2];
    }

    //*** Which rider have no order ***/
    for (const element of searchDeliveryBoyKmFirstRange) {
        if (
            order.lastSearchKm < element ||
            element === searchDeliveryBoyKm[searchDeliveryBoyKm.length - 1]
        ) {
            const findDeliveryBoysObj =
                await getDeliveryBoyFromDataBaseFirstCase(element, order);

            if (findDeliveryBoysObj.nearByDeliveryBoysId.length) {
                return findDeliveryBoysObj;
            }
        }
    }

    //*** Which rider have one order and fulfill our condition ***/
    for (const element of searchDeliveryBoyKmFirstRange) {
        // For replacement order feature
        if (
            order?.isReplacementOrder &&
            order?.replacementOrderDeliveryInfo?.deliveryType ===
                'shop-customer-shop'
        ) {
            break;
        }

        if (
            order.lastSearchKm < element ||
            element === searchDeliveryBoyKm[searchDeliveryBoyKm.length - 1]
        ) {
            const findDeliveryBoysObj =
                await getDeliveryBoyFromDataBaseSecondCase(element, order);
            if (findDeliveryBoysObj.nearByDeliveryBoysId.length) {
                return findDeliveryBoysObj;
            }
        }
    }

    //*** Check third range for all case***/
    if (searchDeliveryBoyKmThirdRange) {
        if (order.totalSearching >= 3 || order.resendRiderRequestCount > 0) {
            const findRiderResult = {
                nearByDeliveryBoysId: [],
                km: searchDeliveryBoyKm[searchDeliveryBoyKm.length - 1],
                deliveredFirstDeliveryBoyList: [],
            };

            const findDeliveryBoysObj =
                await getDeliveryBoyFromDataBaseFirstCase(
                    searchDeliveryBoyKmThirdRange,
                    order
                );
            if (findDeliveryBoysObj.nearByDeliveryBoysId.length) {
                findRiderResult.nearByDeliveryBoysId = [
                    ...new Set([
                        ...findRiderResult.nearByDeliveryBoysId,
                        ...findDeliveryBoysObj.nearByDeliveryBoysId,
                    ]),
                ];
            }

            // For replacement order feature
            if (
                order?.isReplacementOrder &&
                order?.replacementOrderDeliveryInfo?.deliveryType ===
                    'shop-customer-shop'
            ) {
                return findRiderResult;
            }

            const findDeliveryBoysObj2 =
                await getDeliveryBoyFromDataBaseSecondCase(
                    searchDeliveryBoyKmThirdRange,
                    order
                );
            if (findDeliveryBoysObj2.nearByDeliveryBoysId.length) {
                findRiderResult.nearByDeliveryBoysId = [
                    ...new Set([
                        ...findRiderResult.nearByDeliveryBoysId,
                        ...findDeliveryBoysObj2.nearByDeliveryBoysId,
                    ]),
                ];
                findRiderResult.deliveredFirstDeliveryBoyList = [
                    ...new Set([
                        ...findRiderResult.deliveredFirstDeliveryBoyList,
                        ...findDeliveryBoysObj2.deliveredFirstDeliveryBoyList,
                    ]),
                ];
            }

            return findRiderResult;
        } else {
            const findDeliveryBoysObj =
                await getDeliveryBoyFromDataBaseFirstCase(
                    searchDeliveryBoyKmThirdRange,
                    order
                );
            if (findDeliveryBoysObj.nearByDeliveryBoysId.length) {
                return findDeliveryBoysObj;
            }

            // For replacement order feature
            if (
                order?.isReplacementOrder &&
                order?.replacementOrderDeliveryInfo?.deliveryType ===
                    'shop-customer-shop'
            ) {
                return {
                    nearByDeliveryBoysId: [],
                    km: searchDeliveryBoyKm[searchDeliveryBoyKm.length - 1],
                    deliveredFirstDeliveryBoyList: [],
                    deliveredSecondDeliveryBoyList: [],
                };
            }

            const findDeliveryBoysObj2 =
                await getDeliveryBoyFromDataBaseSecondCase(
                    searchDeliveryBoyKmThirdRange,
                    order
                );
            if (findDeliveryBoysObj2.nearByDeliveryBoysId.length) {
                return findDeliveryBoysObj2;
            }
        }
    }

    return {
        nearByDeliveryBoysId: [],
        km: searchDeliveryBoyKm[searchDeliveryBoyKm.length - 1],
        deliveredFirstDeliveryBoyList: [],
        deliveredSecondDeliveryBoyList: [],
    };
};

//*** Find valid near by rider ***/
const findNearByValidDeliveryBoy = async (element, order) => {
    const nearByDeliveryBoys = await DeliveryBoy.find({
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: order.pickUpLocation.location.coordinates,
                },
                $maxDistance: 1000 * element,
            },
        },
        status: 'active',
        liveStatus: 'online',
        deliveryBoyType: 'dropRider',
        deletedAt: null,
    }).sort({ createdAt: 'asc' });

    if (nearByDeliveryBoys.length) {
        const nearByDeliveryBoysId = nearByDeliveryBoys.map(
            deliveryBoy => deliveryBoy._id
        );

        const rejectedDeliveryBoysId = order.rejectedDeliveryBoy;
        const rejectedDeliveryBoysIdStringList = rejectedDeliveryBoysId?.map(
            id => id.toString()
        );

        // filter rejected delivery boy
        const deliveryBoysId = nearByDeliveryBoysId.filter(
            deliveryBoyId =>
                !rejectedDeliveryBoysIdStringList.includes(
                    deliveryBoyId.toString()
                )
        );

        return deliveryBoysId;
    }
    return [];
};

//*** Find rider who have no order ***/
const getDeliveryBoyFromDataBaseFirstCase = async (element, order) => {
    const deliveryBoysId = await findNearByValidDeliveryBoy(element, order);

    const nearByValidDeliveryBoysId = [];
    for (const deliveryBoyId of deliveryBoysId) {
        const orderCount = await Order.countDocuments({
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

        if (orderCount < 1) {
            const butlerCount = await Butler.countDocuments({
                deliveryBoy: deliveryBoyId,
                orderStatus: {
                    $in: ['accepted_delivery_boy', 'order_on_the_way'],
                },
            });

            if (butlerCount < 1) {
                if (
                    order?.isButler &&
                    order?.orderType === 'purchase_delivery'
                ) {
                    const { riderCashInHand } = await getRiderCashInHand({
                        riderId: deliveryBoyId,
                    });

                    if (
                        riderCashInHand <
                        order?.summary?.baseCurrency_productAmount
                    ) {
                        continue;
                    }
                }

                nearByValidDeliveryBoysId.push(deliveryBoyId);
            }
        }
    }

    return {
        nearByDeliveryBoysId: nearByValidDeliveryBoysId,
        km: element,
        deliveredFirstDeliveryBoyList: [],
        deliveredSecondDeliveryBoyList: [],
    };
};

//*** Find rider who have one order ***/
const getDeliveryBoyFromDataBaseSecondCase = async (element, order) => {
    const deliveryBoysId = await findNearByValidDeliveryBoy(element, order);

    const nearByValidDeliveryBoysIdSecondCase = [];
    const nearByValidDeliveryBoysIdThirdCase = [];
    const nearByValidDeliveryBoysIdFourthCase = [];
    for (const deliveryBoyId of deliveryBoysId) {
        //*** Check pick-up order and ongoing order***/
        const ongoingOrders = await Order.find({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: ['accepted_delivery_boy', 'preparing'],
            },
        });
        const readyOrders = await Order.countDocuments({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: ['ready_to_pickup', 'order_on_the_way'],
            },
        });
        const butlers = await Butler.countDocuments({
            deliveryBoy: deliveryBoyId,
            orderStatus: {
                $in: ['accepted_delivery_boy', 'order_on_the_way'],
            },
        });

        // For replacement order feature
        const replacementOrders = await Order.countDocuments({
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

        console.log('****************************');
        console.log('ongoingOrders.length < 2 -->', ongoingOrders.length);
        console.log('!readyOrders -->', readyOrders);
        console.log('!butlers -->', butlers);
        console.log('!replacementOrders -->', replacementOrders);

        if (
            ongoingOrders.length > 0 &&
            ongoingOrders.length < 2 &&
            !readyOrders &&
            !butlers &&
            !replacementOrders
        ) {
            // Calc order remaining preparing time
            let shop1PreparingTime = ongoingOrders[0]?.preparingTime;

            if (!shop1PreparingTime) {
                const shop1TotalOrders = await Order.find({
                    shop: ongoingOrders[0]?.shop,
                    orderStatus: 'delivered',
                });
                const shop1TotalPreparationTime = shop1TotalOrders.reduce(
                    (accumulator, order) => accumulator + order.preparingTime,
                    0
                );

                shop1PreparingTime =
                    shop1TotalPreparationTime / shop1TotalOrders.length || 20;
            }

            const shop1PreparingAt = ongoingOrders[0]?.preparingAt
                ? new Date(ongoingOrders[0].preparingAt)
                : new Date();
            const currentTime = new Date();
            const timeDiff = Math.abs(currentTime - shop1PreparingAt);
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));

            let shop1RemainingPreparingTime = shop1PreparingTime - minutesDiff;
            if (shop1RemainingPreparingTime < 0) {
                shop1RemainingPreparingTime = 0;
            }

            // Calc second shop average preparation time
            let shop2AvgPreparationTime = order.preparingTime;

            if (!shop2AvgPreparationTime) {
                const shop2TotalOrders = await Order.find({
                    shop: order.shop._id,
                    orderStatus: 'delivered',
                });
                const shop2TotalPreparationTime = shop2TotalOrders.reduce(
                    (accumulator, order) => accumulator + order.preparingTime,
                    0
                );

                shop2AvgPreparationTime =
                    shop2TotalPreparationTime / shop2TotalOrders.length || 20;
            }

            //*** Check distance between both shop***/
            const distanceBetweenBothShops = await DistanceInfoGoogle({
                origin: {
                    latitude: ongoingOrders[0]?.pickUpLocation?.latitude,
                    longitute: ongoingOrders[0]?.pickUpLocation?.longitude,
                },
                distination: {
                    latitude: order?.pickUpLocation?.latitude,
                    longitute: order?.pickUpLocation?.longitude,
                },
            });

            const distanceTimeBetweenBothShops =
                Number(distanceBetweenBothShops?.duration?.value) / 60;

            console.log(
                'distanceTimeBetweenBothShops <= 5 && shop2AvgPreparationTime + 5 >= shop1RemainingPreparingTime + distanceTimeBetweenBothShops && shop2AvgPreparationTime - 5 <= shop1RemainingPreparingTime + distanceTimeBetweenBothShops'
            );
            console.log('shop2AvgPreparationTime -->', shop2AvgPreparationTime);
            console.log(
                'shop1RemainingPreparingTime -->',
                shop1RemainingPreparingTime
            );
            console.log(
                'distanceTimeBetweenBothShops -->',
                distanceTimeBetweenBothShops
            );

            if (
                distanceTimeBetweenBothShops <= 5 &&
                shop2AvgPreparationTime + 5 >=
                    shop1RemainingPreparingTime +
                        distanceTimeBetweenBothShops &&
                shop2AvgPreparationTime - 5 <=
                    shop1RemainingPreparingTime + distanceTimeBetweenBothShops
            ) {
                // if (true) {
                //*** Check distance between both users***/
                const distanceBetweenBothUsers = await DistanceInfoGoogle({
                    origin: {
                        latitude: ongoingOrders[0]?.dropOffLocation?.latitude,
                        longitute: ongoingOrders[0]?.dropOffLocation?.longitude,
                    },
                    distination: {
                        latitude: order?.dropOffLocation?.latitude,
                        longitute: order?.dropOffLocation?.longitude,
                    },
                });
                const distanceTimeBetweenBothUsers =
                    Number(distanceBetweenBothUsers?.duration?.value) / 60;

                console.log(
                    'distanceTimeBetweenBothUsers <= 5 -->',
                    distanceTimeBetweenBothUsers
                );
                if (distanceTimeBetweenBothUsers <= 5) {
                    //*** Check firstShop to firstUser distance and secondShop to firstUser distance***/
                    const distanceBetweenOngoingShopToOngoingUser =
                        await getDistance(
                            ongoingOrders[0]?.pickUpLocation?.latitude,
                            ongoingOrders[0]?.pickUpLocation?.longitude,
                            ongoingOrders[0]?.dropOffLocation?.latitude,
                            ongoingOrders[0]?.dropOffLocation?.longitude,
                            'k'
                        );
                    const distanceBetweenOrderShopToOngoingUser =
                        await getDistance(
                            order?.pickUpLocation?.latitude,
                            order?.pickUpLocation?.longitude,
                            ongoingOrders[0]?.dropOffLocation?.latitude,
                            ongoingOrders[0]?.dropOffLocation?.longitude,
                            'k'
                        );

                    console.log(
                        'distanceBetweenOngoingShopToOngoingUser > distanceBetweenOrderShopToOngoingUser'
                    );
                    console.log(
                        'distanceBetweenOngoingShopToOngoingUser -->',
                        distanceBetweenOngoingShopToOngoingUser
                    );
                    console.log(
                        'distanceBetweenOrderShopToOngoingUser -->',
                        distanceBetweenOrderShopToOngoingUser
                    );
                    if (
                        distanceBetweenOngoingShopToOngoingUser >=
                        distanceBetweenOrderShopToOngoingUser
                    ) {
                        // if (true) {
                        nearByValidDeliveryBoysIdSecondCase.push(deliveryBoyId);
                        continue;
                    }
                }
            }

            //*** Rider complete first order after will pick second order ***/

            // Calc first shop to first user distance time
            const shop1ToUser1DistanceTime =
                Number(ongoingOrders[0]?.userShopDistance?.duration?.value) /
                60;

            // Calc first user to second shop distance time
            const user1ToShop2Distance = await DistanceInfoGoogle({
                origin: {
                    latitude: ongoingOrders[0]?.dropOffLocation.latitude,
                    longitute: ongoingOrders[0]?.dropOffLocation.longitude,
                },
                distination: {
                    latitude: order.pickUpLocation.latitude,
                    longitute: order.pickUpLocation.longitude,
                },
            });
            const user1ToShop2DistanceTime =
                Number(user1ToShop2Distance?.duration?.value) / 60;

            console.log(
                'shop1RemainingPreparingTime + shop1ToUser1DistanceTime + user1ToShop2DistanceTime <= shop2AvgPreparationTime + 5'
            );
            console.log(
                'shop1RemainingPreparingTime -->',
                shop1RemainingPreparingTime
            );
            console.log(
                'shop1ToUser1DistanceTime -->',
                shop1ToUser1DistanceTime
            );
            console.log(
                'user1ToShop2DistanceTime -->',
                user1ToShop2DistanceTime
            );
            console.log('shop2AvgPreparationTime -->', shop2AvgPreparationTime);

            if (
                shop1RemainingPreparingTime +
                    shop1ToUser1DistanceTime +
                    user1ToShop2DistanceTime <=
                shop2AvgPreparationTime + 5
            ) {
                // if (true) {
                nearByValidDeliveryBoysIdThirdCase.push(deliveryBoyId);
            }

            // Calc first shop to first user distance time
            const shop2ToUser2DistanceTime =
                Number(order.userShopDistance?.duration?.value) / 60;

            // Calc first user to second shop distance time
            const user2ToShop1Distance = await DistanceInfoGoogle({
                origin: {
                    latitude: order.dropOffLocation.latitude,
                    longitute: order.dropOffLocation.longitude,
                },
                distination: {
                    latitude: ongoingOrders[0]?.pickUpLocation.latitude,
                    longitute: ongoingOrders[0]?.pickUpLocation.longitude,
                },
            });
            const user2ToShop1DistanceTime =
                Number(user2ToShop1Distance?.duration?.value) / 60;

            console.log(
                'shop2AvgPreparationTime + shop2ToUser2DistanceTime + user2ToShop1DistanceTime <= shop1RemainingPreparingTime + 5'
            );
            console.log('shop2AvgPreparationTime -->', shop2AvgPreparationTime);
            console.log(
                'shop2ToUser2DistanceTime -->',
                shop2ToUser2DistanceTime
            );
            console.log(
                'user2ToShop1DistanceTime -->',
                user2ToShop1DistanceTime
            );
            console.log(
                'shop1RemainingPreparingTime -->',
                shop1RemainingPreparingTime
            );

            if (
                shop2AvgPreparationTime +
                    shop2ToUser2DistanceTime +
                    user2ToShop1DistanceTime <=
                shop1RemainingPreparingTime + 5
            ) {
                // if (true) {
                nearByValidDeliveryBoysIdFourthCase.push(deliveryBoyId);
            }
        }
    }

    return {
        nearByDeliveryBoysId: [
            ...nearByValidDeliveryBoysIdSecondCase,
            ...nearByValidDeliveryBoysIdThirdCase,
            ...nearByValidDeliveryBoysIdFourthCase,
        ],
        km: element,
        deliveredFirstDeliveryBoyList: nearByValidDeliveryBoysIdThirdCase,
        deliveredSecondDeliveryBoyList: nearByValidDeliveryBoysIdFourthCase,
    };
};

module.exports.checkNearByDeliveryBoy = async orderId => {
    try {
        Order.findOne({ _id: orderId })
            .populate(['shop', 'user', 'deliveryAddress'])
            .then(async order => {
                if (order) {
                    // For Shop App
                    !order.resendRiderRequestCount &&
                        io
                            .to(shopRoom)
                            .emit(`received_order_request-${order.shop._id}`, {
                                order,
                            });
                    // For Shop Console
                    !order.resendRiderRequestCount &&
                        io
                            .to(adminRoom)
                            .emit(`received_order_request-${order.shop._id}`, {
                                order,
                            });
                    // For Team
                    !order.resendRiderRequestCount &&
                        io.to(adminRoom).emit(`received_order_request`, {
                            order,
                        });

                    if (order.orderFor === 'global') {
                        checkDeliveryBoy(order);
                    }
                }
            });
    } catch (error) {
        console.log(error);
    }
};

module.exports.checkNearByDeliveryBoyForButler = async orderId => {
    try {
        Butler.findOne({ _id: orderId }).then(async order => {
            if (order) {
                checkDeliveryBoyForButler(order);
            }
        });
    } catch (error) {
        console.log(error);
    }
};

module.exports.checkNearByDeliveryBoyShu = async orderId => {
    const order = await Order.findOne({ _id: orderId }).populate(['shop']);

    if (order) {
        if (order.orderFor === 'global') {
            checkDeliveryBoy(order);
        }
    }
};

module.exports.checkNearByDeliveryBoyShuForButler = async orderId => {
    const order = await Butler.findOne({ _id: orderId });

    if (order) {
        checkDeliveryBoyForButler(order);
    }
};

module.exports.notifiycancelOrder = async order => {
    try {
        io.to(order._id.toString()).emit('updateOrder', {
            order,
            type: 'cancel',
            orderStatus: order.orderStatus,
        });
    } catch (err) {
        console.error(err.message);
    }
};
module.exports.notifyRiderForLateOrder = async order => {
    try {
        io.to(order._id.toString()).emit('updateOrder', {
            order,
            type: 'late',
            orderStatus: order.orderStatus,
        });
    } catch (err) {
        console.error(err.message);
    }
};

module.exports.notifyForRemoveRider = async (order, deliveryBoyId) => {
    try {
        io.to(deliveryBoyRoom).emit(
            `admin_updated_order_status-${deliveryBoyId}`,
            {
                order,
                type: 'removeDeliveryBoyByAdmin',
            }
        );
    } catch (err) {
        console.error(err.message);
    }
};

module.exports.notifyAfterPaidBOBTrx = async trx => {
    try {
        // For notify rider after paid bob transaction
        trx._doc.status = 'PAID';
        io.to(deliveryBoyRoom).emit(
            `notify-bob-transaction-${trx.deliveryBoy}`,
            {
                transaction: trx,
            }
        );

        await sendNotificationForBobSettlement(trx);
    } catch (err) {
        console.error(err.message);
    }
};

module.exports.notifyForTimeoutMessage = async message => {
    try {
        console.log(`*******call --> notify-timeout-message-${message.admin}`);
        // For notify if customer service not replay within 3mins
        io.to(adminRoom).emit(`notify-timeout-message-${message.admin}`, {
            message,
        });
        
        io.emit(`chat-close-${requestId}`, {
            requestId,
            orderId: chatRequest.order,
        });

    } catch (err) {
        console.error(err.message);
    }
};
const notifyForCloseChat = async requestId => {
    try {
        const chatRequest = await AdminChatRequest.findById(requestId);

        // remove from room name - requestId
        // socket.to(requestId).emit('chat-close', {
        //     requestId,
        //     orderId: chatRequest.order,
        // });

        console.log(`chatRequest: ${chatRequest}`);

        io.to(userRoom).emit(
            `chat-close-${chatRequest.user ?? chatRequest.shop}`,
            {
                requestId,
                orderId: chatRequest.order,
            }
        );

        io.to(requestId).emit(`chat-close-${requestId}`, {
            requestId,
            orderId: chatRequest.order,
        });

        io.emit(`chat-close-${requestId}`, {
            requestId,
            orderId: chatRequest.order,
        });

        console.log(
            `**********chat-close-${chatRequest.user ?? chatRequest.shop}`
        );
    } catch (err) {
        console.error(err.message);
    }
};
module.exports.notifyForCloseChat = notifyForCloseChat;
module.exports.notifyForAdjustOrder = async order => {
    try {
        // For Shop App
        io.to(shopRoom).emit(`notify-adjust-order-${order.shop._id}`, {
            order,
        });
        // For Shop Console
        io.to(adminRoom).emit(`notify-adjust-order-${order.shop._id}`, {
            order,
        });
    } catch (err) {
        console.error(err.message);
    }
};

// module.exports.notifyForLateOrder = async (order, isNew = true) => {
//     try {
//         // For urgent order count realtime
//         io.to(adminRoom).emit(`notify-late-order`, {
//             order,
//         });

//         if (isNew) {
//             //For creating notification
//             await NotificationsModel.create({
//                 title: 'You got a late order!',
//                 description: `Order Id is ${order.orderId}`,
//                 descriptionHtml: '',
//                 image: '',
//                 type: 'global',
//                 accountType: 'admin',
//                 order: order._id,
//                 clickable: true,
//             });
//         }
//     } catch (err) {
//         console.error(err.message);
//     }
// };

module.exports.notifyRiderForUrgentOrder = async order => {
    try {
        // Notify rider for urgent order
        await sendNotificationForUrgentOrder(order, 'rider');

        console.log(
            `*******call --> notify-rider-urgent-order-${order?.deliveryBoy?._id}`
        );
        io.to(deliveryBoyRoom).emit(
            `notify-rider-urgent-order-${order?.deliveryBoy?._id}`,
            {
                order,
            }
        );
    } catch (err) {
        console.error(err.message);
    }
};

module.exports.notifyShopForUrgentOrder = async order => {
    try {
        // Notify shop for urgent order
        await sendNotificationForUrgentOrder(order, 'shop');

        console.log(
            `*******call --> notify-shop-urgent-order-${order?.shop?._id}`
        );
        io.to(adminRoom).emit(`notify-shop-urgent-order-${order?.shop?._id}`, {
            order,
        });
        io.to(shopRoom).emit(`notify-shop-urgent-order-${order?.shop?._id}`, {
            order,
        });
    } catch (err) {
        console.error(err.message);
    }
};

module.exports.notifyForUrgentOrder = async (order, isNew = true) => {
    try {
        if (!order) return;
        // For urgent order count realtime
        io.to(adminRoom).emit(`notify-urgent-order`, {
            order,
        });

        if (isNew) {
            // if (!order?.isButler && order.orderStatus !== 'preparing') {
            //     io.to(shopRoom).emit(
            //         `received_order_request-${order.shop._id}`,
            //         {
            //             order,
            //             type: 'cancel',
            //             orderStatus: order['orderStatus'],
            //         }
            //     );
            // }

            // if (!order.deliveryBoy) {
            //     for (const riderId of order.deliveryBoyList) {
            //         io.to(deliveryBoyRoom).emit(
            //             `received_order_request-${riderId}`,
            //             {
            //                 order,
            //                 type: 'cancel',
            //                 orderStatus: order['orderStatus'],
            //             }
            //         );
            //     }
            // }

            await notifyCustomerServiceForUrgentOrder(order);
        }
    } catch (err) {
        console.error(err.message);
    }
};

const notifyCustomerServiceForUrgentOrder = async (order, retries = 0) => {
    try {
        if (retries >= 3) {
            return;
        }
        if (!order) return;

        console.log('*******call notifyCustomerServiceForUrgentOrder');
        const customerServices = await AdminModel.find({
            status: 'active',
            adminType: {
                $in: [
                    'customerService',
                    'generalManager',
                    'orderManagementManager',
                ],
            },
            liveStatus: 'online',
        }).sort({ lastOnline: 'asc' });

        if (!customerServices.length) {
            return;
        }

        const customerServicesId = customerServices.map(customerService =>
            customerService._id.toString()
        );

        await notifyNextCustomerService(
            order,
            customerServicesId,
            retries,
            true
        );
    } catch (err) {
        console.error(err.message);
    }
};

const notifyNextCustomerService = async (
    order,
    customerServicesId,
    retries,
    increaseRetries,
    previousCustomerServiceId
) => {
    if (!order) return;

    // For remove previous customer list real time
    if (previousCustomerServiceId) {
        console.log(
            `*********call --> urgent-notification-remove-${previousCustomerServiceId}`
        );

        io.to(adminRoom).emit(
            `urgent-notification-remove-${previousCustomerServiceId}`,
            {
                order,
            }
        );
    }

    if (customerServicesId.length > 0) {
        console.log('*******customerServicesId --->', customerServicesId);
        const nextCustomerServiceId = customerServicesId.shift();

        console.log('*******nextCustomerServiceId --->', nextCustomerServiceId);
        console.log(
            '*******updated customerServicesId --->',
            customerServicesId
        );
        //*** For handle if customer service have ongoing request skip him start ***/
        const findUrgentOrders = await Order.countDocuments({
            orderStatus: {
                $in: [
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
            assignedCustomerService: nextCustomerServiceId,
            isCustomerServiceAccepted: false,
        });

        if (findUrgentOrders > 0) {
            setTimeout(async () => {
                await notifyNextCustomerService(
                    order,
                    customerServicesId,
                    retries,
                    false
                );
            }, 2000);

            return true;
        }

        const findUrgentButlerOrders = await Butler.countDocuments({
            orderStatus: {
                $in: ['placed', 'accepted_delivery_boy', 'order_on_the_way'],
            },
            assignedCustomerService: nextCustomerServiceId,
            isCustomerServiceAccepted: false,
        });

        if (findUrgentButlerOrders > 0) {
            setTimeout(async () => {
                await notifyNextCustomerService(
                    order,
                    customerServicesId,
                    retries,
                    false
                );
            }, 2000);

            return true;
        }
        //*** For handle if customer service have ongoing request skip him end ***/

        if (order?.isButler) {
            await Butler.updateOne(
                { _id: order._id },
                {
                    $set: {
                        assignedCustomerService: nextCustomerServiceId,
                        isCustomerServiceAccepted: false,
                    },
                    $pull: {
                        missedCustomerService: nextCustomerServiceId,
                    },
                }
            );
        } else {
            await Order.updateOne(
                { _id: order._id },
                {
                    $set: {
                        assignedCustomerService: nextCustomerServiceId,
                        isCustomerServiceAccepted: false,
                    },
                    $pull: {
                        missedCustomerService: nextCustomerServiceId,
                    },
                }
            );
        }

        //For creating notification
        const findCustomerServiceNotification =
            await NotificationsModel.countDocuments({
                title: 'You got a urgent order!',
                type: 'specific',
                accountType: 'customerService',
                admin: nextCustomerServiceId,
                order: order._id,
            });

        if (findCustomerServiceNotification < 1) {
            await NotificationsModel.create({
                title: 'You got a urgent order!',
                description: `Order Id is ${order.orderId}`,
                descriptionHtml: '',
                image: '',
                type: 'specific',
                accountType: 'customerService',
                admin: nextCustomerServiceId,
                order: order._id,
                clickable: true,
            });
        }

        console.log(
            `*********call --> urgent-notification-${nextCustomerServiceId}`
        );
        io.to(adminRoom).emit(`urgent-notification-${nextCustomerServiceId}`, {
            order,
        });

        setTimeout(async () => {
            let checkOrder = await Order.findById(order._id);

            if (!checkOrder) {
                checkOrder = await Butler.findById(order._id);
            }

            if (
                ![
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ].includes(checkOrder?.orderStatus)
            ) {
                return true;
            }

            if (!checkOrder?.isCustomerServiceAccepted) {
                if (order?.isButler) {
                    await Butler.updateOne(
                        {
                            _id: order._id,
                        },
                        {
                            $push: {
                                missedCustomerService: nextCustomerServiceId,
                            },
                            $unset: {
                                assignedCustomerService: 1,
                            },
                        }
                    );
                } else {
                    await Order.updateOne(
                        {
                            _id: order._id,
                        },
                        {
                            $push: {
                                missedCustomerService: nextCustomerServiceId,
                            },
                            $unset: {
                                assignedCustomerService: 1,
                            },
                        }
                    );
                }

                await notifyNextCustomerService(
                    order,
                    customerServicesId,
                    retries,
                    true,
                    nextCustomerServiceId
                );
            }
        }, 30000);
    } else {
        if (increaseRetries) {
            retries++;
        }
        await notifyCustomerServiceForUrgentOrder(order, retries);
    }
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
