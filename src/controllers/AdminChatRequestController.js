const {
    successResponse,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const AdminChatRequest = require('../models/AdminChatRequest');
const Order = require('../models/OrderModel');
const Admins = require('../models/AdminModel');
const ChatsMessage = require('../models/ChatsMessage');
const { pushNotificationForChat } = require('./NotificationController');
const moment = require('moment');
const { getCouponHistory } = require('../helpers/getCouponHistory');
const ButlerModel = require('../models/ButlerModel');
const Transection = require('../models/TransactionModel');
const SellerModel = require('../models/SellerModel');

exports.userSendChatRequest = async (req, res) => {
    try {
        const { reasonMessage, order, chatType = 'order' } = req.body;
        // const userId = req.userId;
        const customQuery = req.shopId ? { shop: req.shopId } : { user: req.userId };


        let orderData = await Order.findOne({ _id: order });

        if (!orderData) {
            orderData = await ButlerModel.findOne({ _id: order });
        }

        if (chatType === 'order' && !orderData) {
            return errorResponse(res, 'Order not found');
        }

        // check on going chat
        // const onGoingChat = await AdminChatRequest.findOne({
        //     user: userId,
        //     order: order,
        //     status: {
        //         $in: ['pending', 'accepted'],
        //     },
        // });
        let onGoingChat = null;

        if (chatType === 'order') {
            if (orderData.isButler) {
                onGoingChat = await AdminChatRequest.findOne({
                    ...customQuery,
                    chatType: 'order',
                    butler: order,
                    status: {
                        $in: ['pending', 'accepted'],
                    },
                });
            } else {
                onGoingChat = await AdminChatRequest.findOne({
                    ...customQuery,
                    chatType: 'order',
                    order: order,
                    status: {
                        $in: ['pending', 'accepted'],
                    },
                });
            }
        } else {
            onGoingChat = await AdminChatRequest.findOne({
                ...customQuery,
                chatType: 'account',
                status: {
                    $in: ['pending', 'accepted'],
                },
            });
        }

        if (onGoingChat) {
            return errorResponse(res, 'You have an ongoing chat');
        }

        const newAdminChatRequest = await AdminChatRequest.create({
            ...customQuery,
            reasonMessage: reasonMessage ? reasonMessage : null,
            order:
                chatType === 'order' && !orderData.isButler ? order : undefined,
            butler:
                chatType === 'order' && orderData.isButler ? order : undefined,
            chatType,
        });

        const newListCre = await ChatsMessage.create([
            {
                message:
                    chatType === 'order'
                        ? `Welcome to LYXA Customer Support, OrderID #${orderData.orderId}, one of our agents will be available soon. enquiry number #${newAdminChatRequest.shortId}`
                        : `Welcome to LYXA Customer Support, one of our agents will be available soon. enquiry number #${newAdminChatRequest.shortId}`,
                type: 'system',
                adminChatRequest: newAdminChatRequest._id,
                order:
                    chatType === 'order' && !orderData.isButler
                        ? order
                        : undefined,
                butler:
                    chatType === 'order' && orderData.isButler
                        ? order
                        : undefined,
                ...customQuery,
                seen: true,
            },
            {
                message: reasonMessage,
                type: req.shopId ? 'shop' : 'user',
                adminChatRequest: newAdminChatRequest._id,
                order:
                    chatType === 'order' && !orderData.isButler
                        ? order
                        : undefined,
                butler:
                    chatType === 'order' && orderData.isButler
                        ? order
                        : undefined,
                ...customQuery,
                seen: true,
            },
        ]);

        for (let i = 0; i < newListCre.length; i++) {
            await AdminChatRequest.findOneAndUpdate(
                { _id: newAdminChatRequest._id },
                {
                    $push: {
                        chats: newListCre[i]._id,
                    },
                },
            );
        }

        if (chatType === 'order') {
            // update data._id in order admin_chat_request field
            if (orderData.isButler) {
                await ButlerModel.findOneAndUpdate(
                    { _id: orderData._id },
                    {
                        $push: {
                            admin_chat_request: newAdminChatRequest._id,
                        },
                        $set: {
                            isChat: true,
                            lastChatTime: new Date(),
                        },
                    },
                );
            } else {
                await Order.findOneAndUpdate(
                    { _id: orderData._id },
                    {
                        $push: {
                            admin_chat_request: newAdminChatRequest._id,
                        },
                        //isChat : true
                        $set: {
                            isChat: true,
                            lastChatTime: new Date(),
                        },
                    },
                );
            }
        }

        const lists = await ChatsMessage.find({
            adminChatRequest: newAdminChatRequest._id,
        }).populate([
            {
                path: 'adminChatRequest',
            },
            {
                path: req.shopId ? 'shop' : 'user',
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
        ]);

        for (const chat of lists) {
            if (chat.adminChatRequest.chatType === 'order' && !chat.order) {
                chat._doc.order = chat.butler;
            }
        }

        successResponse(res, {
            message: 'Chat request sent successfully',
            data: {
                request: lists,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllChatsOfOrder = async (req, res) => {
    try {
        // const userId = req.userId;
        const { orderId } = req.query;
        const customQuery = req.shopId ? { shop: req.shopId } : { user: req.userId };

        const list = await ChatsMessage.find({
            ...customQuery,
            $or: [{ order: orderId }, { butler: orderId }],
        })
            .sort({ createdAt: 'asc' })
            .populate([
                {
                    path: 'adminChatRequest',
                },
                {
                    path: 'user',
                },
                {
                    path: 'shop',
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
            ]);

        // seen all chats
        await ChatsMessage.updateMany(
            {
                $or: [{ order: orderId }, { butler: orderId }],
                ...customQuery,
                seen: false,
            },
            {
                $set: {
                    seen: true,
                },
            },
        );

        for (const chat of list) {
            if (chat.adminChatRequest.chatType === 'order' && !chat.order) {
                chat._doc.order = chat.butler;
            }
        }

        return successResponse(res, {
            message: 'fetch successfully',
            data: {
                chats: list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllChatsOfAccount = async (req, res) => {
    try {
        // const userId = req.userId;
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            startDate,
            endDate,
            searchKey,
            chatStatus,
        } = req.query;
        const customQuery = req.shopId ? { shop: req.shopId } : { user: req.userId };

        let whereConfig = {
            ...customQuery,
            chatType: 'account',
        };

        if (chatStatus && chatStatus === 'ongoing') {
            whereConfig = {
                ...whereConfig,
                status: { $in: ['pending', 'accepted'] },
            };
        }

        if (chatStatus && chatStatus === 'past') {
            whereConfig = {
                ...whereConfig,
                status: { $in: ['rejected', 'closed'] },
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

        const chatList = await AdminChatRequest.find(whereConfig)
            .sort({ createdAt: sortBy })
            .populate([
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
                },
            ]);

        let newList = [...chatList];

        if (searchKey) {
            newList = chatList.filter(chat => {
                const searchTerm = searchKey.toLowerCase();

                return (
                    chat?.user?.name?.toLowerCase().includes(searchTerm) ||
                    chat?.order?.deliveryBoy?.name
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.shop?.shopName
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.orderId?.toLowerCase().includes(searchTerm) ||
                    chat?.order?.autoGenId
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.note?.toLowerCase().includes(searchTerm)
                );
            });
        }

        let paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: newList.length,
            pagingRange: 5,
        });

        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit,
        );

        if (chatStatus === 'ongoing') {
            for (const chat of chatList) {
                // seen all chats
                await ChatsMessage.updateMany(
                    {
                        ...customQuery,
                        adminChatRequest: chat._id,
                        seen: false,
                    },
                    {
                        $set: {
                            seen: true,
                        },
                    },
                );
            }
        }

        return successResponse(res, {
            message: 'fetch successfully',
            data: {
                chats: newList,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllChatsOfOrderAdmin = async (req, res) => {
    try {
        // const adminId = req.adminId;
        const { orderId, userType = 'user' } = req.query;
        const customQuery = (userType === 'shop') ? { shop: { $exists: true } } : { user: { $exists: true } };

        const list = await ChatsMessage.find({ ...customQuery, $or: [{ order: orderId }, { butler: orderId }] })
            .sort({ createdAt: 'asc' })
            .populate([
                {
                    path: 'adminChatRequest',
                },
                {
                    path: 'user',
                },
                {
                    path: 'shop',
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
            ]);

        for (let chat of list) {
            if (chat?.user) {
                const { usedCouponOrders, validCoupons, expiredCoupons } =
                    await getCouponHistory(chat.user._id);
                chat.user._doc.usedCouponOrders = usedCouponOrders;
                chat.user._doc.validCoupons = validCoupons;
                chat.user._doc.expiredCoupons = expiredCoupons;
            }
            if (chat.adminChatRequest.chatType === 'order' && !chat.order) chat._doc.order = chat.butler;
        }

        // seen all chats
        await ChatsMessage.updateMany(
            { ...customQuery, $or: [{ order: orderId }, { butler: orderId }], adminSeen: false },
            { $set: { adminSeen: true } },
        );

        return successResponse(res, { message: 'fetch successfully', data: { chats: list } });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllChatsOfAccountAdmin = async (req, res) => {
    try {
        const adminId = req.adminId;
        const { requestId } = req.query;

        const adminChat = await AdminChatRequest.findById(requestId).populate([
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
        ]);

        if (adminChat?.user) {
            const { usedCouponOrders, validCoupons, expiredCoupons } =
                await getCouponHistory(adminChat.user._id);
            adminChat.user._doc.usedCouponOrders = usedCouponOrders;
            adminChat.user._doc.validCoupons = validCoupons;
            adminChat.user._doc.expiredCoupons = expiredCoupons;
        }
        // seen all chats
        await ChatsMessage.updateMany(
            {
                adminChatRequest: requestId,
                seen: false,
            },
            {
                $set: {
                    adminSeen: true,
                },
            },
        );

        return successResponse(res, {
            message: 'fetch successfully',
            data: {
                chats: adminChat,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.closeChatRequestByUser = async (req, res) => {
    try {
        // const userId = req.userId;

        const { requestId } = req.body;
        const customQuery = req.shopId ? { shop: req.shopId } : { user: req.userId };

        await AdminChatRequest.findOneAndUpdate(
            { _id: requestId, ...customQuery },
            {
                status: 'closed',
                closedAt: new Date(),
            },
        );

        const chatRequest = await AdminChatRequest.findOne({
            _id: requestId,
        });

        if (chatRequest.chatType === 'order') {
            if (chatRequest.order) {
                await Order.updateOne(
                    { _id: chatRequest.order },
                    { lastChatTime: new Date() },
                );
            } else {
                await ButlerModel.updateOne(
                    { _id: chatRequest.butler },
                    { lastChatTime: new Date() },
                );
            }
        }

        successResponse(res, {
            message: 'Chat request closed successfully',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.closeChatRequestByAdmin = async (req, res) => {
    try {
        const adminId = req.adminId;

        const { requestId, resolveReason } = req.body;

        const chatRequest = await AdminChatRequest.findOne({
            _id: requestId,
        });

        if (!chatRequest) {
            return errorResponse(res, 'Chat request not found');
        }

        if (chatRequest.status === 'closed') {
            return errorResponse(res, 'Chat request already closed');
        }

        const chat = await ChatsMessage.create({
            ...(chatRequest?.shop) ? { shop: chatRequest.shop } : { user: chatRequest.user },
            admin: adminId,
            message:
                'Thank you for contacting our live support. If you need any help, feel free to start a new session. Have a good day!',
            type: 'admin',
            adminChatRequest: chatRequest._id,
            order:
                chatRequest.chatType === 'order' && chatRequest.order
                    ? chatRequest.order
                    : undefined,
            butler:
                chatRequest.chatType === 'order' && chatRequest.butler
                    ? chatRequest.butler
                    : undefined,
            seen: false,
        });

        await AdminChatRequest.updateOne(
            { _id: requestId },
            {
                $push: { chats: chat._id },
                $set: {
                    isAdminReplay: true,
                    status: 'closed',
                    closeAdmin: adminId,
                    resolveReason,
                    closedAt: new Date(),
                },
            },
        );

        const updatredData = await AdminChatRequest.findOne({
            _id: requestId,
        });

        if (chatRequest.chatType === 'order') {
            if (chatRequest.order) {
                await Order.updateOne(
                    { _id: chatRequest.order },
                    { lastChatTime: new Date() },
                );
            } else {
                await ButlerModel.updateOne(
                    { _id: chatRequest.butler },
                    { lastChatTime: new Date() },
                );
            }
        }

        successResponse(res, {
            message: 'Chat request closed successfully',
            data: {
                updatredData,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderByChats = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId } = req.query;

        const list = await AdminChatRequest.find({
            user: userId,
            order: orderId,
        }).populate([
            {
                path: 'user',
                select: 'name email phone_number profile_photo',
            },
            {
                path: 'admin',
            },
            {
                path: 'chats',
                populate: [
                    {
                        path: 'user',
                        select: 'name phone_number email profile_photo',
                    },
                    {
                        path: 'admin',
                        select: 'name phone_number email profile_photo',
                    },
                ],
            },
        ]);

        successResponse(res, {
            message: 'Chat request list',
            data: {
                list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOrderByChatsAdmin = async (req, res) => {
    try {
        // const userId = req.userId;
        const { orderId } = req.query;

        const list = await AdminChatRequest.find({
            $or: [{ order: orderId }, { butler: orderId }],
        }).populate([
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
                        select: 'name phone_number email profile_photo',
                    },
                ],
            },
        ]);

        // console.log(list);

        successResponse(res, {
            message: 'Chat request list',
            data: {
                list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getLastFiveOrderAdmin = async (req, res) => {
    try {
        if(!req.query.userId && !req.query.shopId) return errorResponse(res, 'userId or shopId is required');
        const customQuery = req.query.userId ? { user: req.query.userId } : {shop: req.query.shopId};

        const list = await Order.find(customQuery)
            .sort({ createdAt: 'desc' })
            .limit(5)
            .populate([
                {
                    path: 'user',
                    select: 'name email phone_number profile_photo',
                },
                {
                    path:'shop',
                    select:'shopName shopLogo'
                }
            ]);

        successResponse(res, {
            message: 'last 5 order',
            data: {
                list,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getLastFiveTransactionAdmin = async (req, res) => {
    try {
        if(!req.query.userId && !req.query.shopId) return errorResponse(res, 'userId or shopId is required');
        const customQuery = req.query.userId ? { user: req.query.userId } : {shop: req.query.shopId};
        if(req.query.shopId) customQuery.type={$in:['adminAddBalanceShop', 'adminRemoveBalanceShop', 'adminSettlebalanceShop',]};
        else if(req.query.userId) customQuery.type={$in:['userBalanceWithdrawAdmin', 'userBalanceAddAdmin', 'userCancelOrderGetWallet', 'topUpAdminWallet']};

        const list = await Transection.find(customQuery)
            .sort({ createdAt: 'desc' })
            .limit(5)
            .populate([
                {
                    path: 'user',
                    select: 'name gender phone_number email status dob account_type profile_photo',
                },
                {
                    path: 'admin',
                },
                {
                    path: 'shop',
                },
                {
                    path: 'seller',
                },
                {
                    path: 'deliveryBoy',
                },
                {
                    path: 'adminBy',
                },
            ]);

        await successResponse(res, {
            message: 'last 5 order',
            data: { list, },
        });
    } catch (error) {
        await errorHandler(res, error);
    }
};

exports.getOrderByAllChat = async (req, res) => {
    try {
        const { page = 1, pageSize = 50 } = req.query;

        // const userId = req.userId;
        const customQuery = (req.shopId) ? { shop: req.shopId } : { user: req.userId };

        let whereConfig = {
            ...customQuery,
            isChat: true,
        };

        const orderList = await Order.find(whereConfig)
            .populate([
                {
                    path: 'admin_chat_request',
                    match: { ...customQuery },
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
            .select('admin_chat_request shop lastChatTime');

        const butlerList = await ButlerModel.find(whereConfig)
            .populate([
                {
                    path: 'admin_chat_request',
                    match: { ...customQuery },
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
            .select('admin_chat_request lastChatTime');

        let list = [...orderList, ...butlerList].sort(
            (a, b) => new Date(b.lastChatTime) - new Date(a.lastChatTime),
        );
        list = list.filter((order) => order.admin_chat_request && order.admin_chat_request.length);
        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        const newList = [];

        for (let i = 0; i < list.length; i++) {
            const order = list[i];
            // get total unread message
            let totalUnreadMessage = 0;

            if (order.isButler) {
                totalUnreadMessage = await ChatsMessage.countDocuments({
                    ...customQuery,
                    butler: order._id,
                    seen: false,
                });
            } else {
                totalUnreadMessage = await ChatsMessage.countDocuments({
                    ...customQuery,
                    order: order._id,
                    seen: false,
                });
            }

            newList.push({
                ...order._doc,
                totalUnreadMessage,
            });
        }

        return res.status(200).json({
            status: true,
            data: {
                list: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getOrderByAllChatAdmin = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            userId,
            shopId,
            searchKey,
        } = req.query;

        let whereConfig = {
            isChat: true,
        };

        if (userId) {
            whereConfig.user = userId;
        }

        if (shopId) {
            whereConfig.shop = shopId;
        }

        if (searchKey) {
            // Escape special characters in the search key
            const escapedSearchKey = searchKey.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
            );

            const newQuery = escapedSearchKey.split(/[ ,]+/);
            const orderIDSearchQuery = newQuery.map(str => ({
                orderId: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const noteSearchQuery = newQuery.map(str => ({
                note: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
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

        const orderList = await Order.find(whereConfig)
            .populate([
                {
                    path: 'admin_chat_request',
                    populate: [
                        {
                            path: 'user',
                            select: 'id name email phone_number profile_photo',
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
                {
                    path: 'user',
                    select: 'id name email phone_number profile_photo',
                },
            ])
            .select('admin_chat_request shop orderId user');

        const butlerList = await ButlerModel.find(whereConfig)
            .populate([
                {
                    path: 'admin_chat_request',
                    populate: [
                        {
                            path: 'user',
                            select: 'id name email phone_number profile_photo',
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
                    path: 'user',
                    select: 'id name email phone_number profile_photo',
                },
            ])
            .select('admin_chat_request orderId user');

        let list = [...orderList, ...butlerList].sort(
            (a, b) => new Date(b.lastChatTime) - new Date(a.lastChatTime),
        );

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        const newList = [];

        for (let i = 0; i < list.length; i++) {
            let order = list[i];
            // get total unread message
            let totalUnreadMessage = 0;
            if (order.isButler) {
                totalUnreadMessage = await ChatsMessage.countDocuments({
                    butler: order._id,
                    adminSeen: false,
                });
            } else {
                totalUnreadMessage = await ChatsMessage.countDocuments({
                    order: order._id,
                    adminSeen: false,
                });
            }

            const { usedCouponOrders, validCoupons, expiredCoupons } =
                await getCouponHistory(order.user._id);
            order.user._doc.usedCouponOrders = usedCouponOrders;
            order.user._doc.validCoupons = validCoupons;
            order.user._doc.expiredCoupons = expiredCoupons;

            newList.push({
                ...order._doc,
                totalUnreadMessage,
            });
        }

        return res.status(200).json({
            status: true,
            data: {
                list: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.seenChatMessage = async (req, res) => {
    try {
        // const userId = req.userId;
        const { orderId } = req.body;
        const customQuery = req.shopId ? { shop: req.shopId } : { user: req.userId };

        await ChatsMessage.updateMany(
            { ...customQuery, $or: [{ order: orderId }, { butler: orderId }] },
            { seen: true },
        );
    } catch (error) {
        errorHandler(res, error);
    }
};

// exports.getOrderByAllChatAdmin = async (req, res) => {
//     try {
//         const { page = 1, pageSize = 50 } = req.query;

//         var whereConfig = {
//         };

//         let paginate = await pagination({
//             page,
//             pageSize,
//             model: Order,
//             condition: whereConfig,
//             pagingRange: 5,
//         });

//         const list = await Order.find(whereConfig)
//             .sort({ createdAt: "desc" })
//             .skip(paginate.offset)
//             .limit(paginate.limit)
//             .populate([
//                 {
//                     path: 'admin_chat_request',
//                     populate: [
//                         {
//                             path: 'user',
//                             select: 'name email phone_number profile_photo',
//                         },
//                         {
//                             path: 'admin',
//                         },
//                         {
//                             path: 'order',
//                         },
//                         {
//                             path: 'chats',
//                             populate: [
//                                 {
//                                     path: 'user',
//                                     select: 'name phone_number email profile_photo',
//                                 },
//                                 {
//                                     path: 'admin',
//                                     select: 'name phone_number email profile_photo',
//                                 },
//                             ],
//                         },
//                     ],
//                 },
//             ]).select('admin_chat_request');

//         return res.status(200).json({
//             status: true,
//             data: {
//                 list: list,
//                 paginate,
//             },
//         });
//     } catch (err) {
//         errorHandler(res, err);
//     }
// };

exports.getUserChatRequestForAdmin = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, sortBy = 'desc', status } = req.query;

        var whereConfig = {};

        if (
            status &&
            ['pending', 'accepted', 'rejected', 'closed'].includes(status)
        ) {
            whereConfig = {
                ...whereConfig,
                status: status,
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: AdminChatRequest,
            condition: whereConfig,
            pagingRange: 5,
        });

        let list = await AdminChatRequest.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: 'name email phone_number profile_photo',
                },
                {
                    path: 'admin',
                },
                {
                    path: 'order',
                },
                {
                    path: 'chats',
                    populate: [
                        {
                            path: 'user',
                            select: 'name phone_number email profile_photo',
                        },
                        {
                            path: 'admin',
                        },
                    ],
                },
            ]);

        // console.log(list);

        // get latest 5 order for user list

        const newList = [];

        for (let i = 0; i < list.length; i++) {
            const element = list[i];
            const order = await Order.find({ user: element.user._id })
                .sort({ createdAt: 'desc' })
                .limit(5);
            newList.push({
                ...element._doc,
                lastFiveOrder: order,
            });
        }

        return res.status(200).json({
            status: true,
            data: {
                request: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getSingleDetailsForAdmin = async (req, res) => {
    try {
        const { id } = req.query;

        const chatRequest = await AdminChatRequest.findById(id).populate([
            {
                path: 'user',
                select: 'name email phone_number profile_photo',
            },
            {
                path: 'admin',
            },
            {
                path: 'chats',
                populate: [
                    {
                        path: 'user',
                        select: 'name phone_number email profile_photo',
                    },
                    {
                        path: 'admin',
                    },
                ],
            },
        ]);

        if (!chatRequest) {
            return errorResponse(res, 'chat request not found');
        }

        const orders = await Order.find({ user: chatRequest.user }).limit(5);

        return res.status(200).json({
            status: true,
            data: {
                chatRequest,
                orders,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getSingleDetailsForUser = async (req, res) => {
    try {
        const { id } = req.query;

        const chatRequest = await AdminChatRequest.findById(id).populate([
            {
                path: 'user',
                select: 'name email phone_number profile_photo',
            },
            {
                path: 'admin',
            },
            {
                path: 'chats',
                populate: [
                    {
                        path: 'user',
                        select: 'name phone_number email profile_photo',
                    },
                    {
                        path: 'admin',
                    },
                ],
            },
            {
                path: 'order',
            },
        ]);

        return res.status(200).json({
            status: true,
            data: {
                chatRequest,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.acceptedChatRequest = async (req, res) => {
    try {
        const adminId = req.adminId;

        const { id } = req.body;

        const chatRequest = await AdminChatRequest.findOne({
            _id: id,
        });
        if (!chatRequest) {
            return errorResponse(res, 'chatRequest not found');
        }

        if (chatRequest.status === 'accepted') {
            return errorResponse(res, 'chatRequest is already accepted');
        }

        const adminInfo = await Admins.findOne({ _id: adminId });

        chatRequest.admin = adminId;
        chatRequest.acceptedAt = new Date();
        chatRequest.status = 'accepted';

        await chatRequest.save();
        const chat = await ChatsMessage.create({
            ...(chatRequest?.shop) ? { shop: chatRequest.shop } : { user: chatRequest.user },
            admin: adminInfo._id,
            message: `Hi, I am ${adminInfo['name']}. How can I help you.`,
            type: 'admin',
            adminChatRequest: chatRequest._id,
            order:
                chatRequest.chatType === 'order' && chatRequest.order
                    ? chatRequest.order
                    : undefined,
            butler:
                chatRequest.chatType === 'order' && chatRequest.butler
                    ? chatRequest.butler
                    : undefined,
            seen: false,
        });

        await AdminChatRequest.updateOne(
            { _id: chatRequest._id },
            { $push: { chats: chat._id } },
        );

        if (chatRequest.chatType === 'order') {
            // set order lastChatTime
            if (chatRequest.order) {
                await Order.updateOne(
                    { _id: chatRequest.order },
                    { lastChatTime: new Date() },
                );
            } else {
                await ButlerModel.updateOne(
                    { _id: chatRequest.butler },
                    { lastChatTime: new Date() },
                );

                chatRequest._doc.order = chatRequest.butler;
            }
        }

        const updatedData = await AdminChatRequest.findOne({
            _id: id,
        }).populate([
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
        ]);

        await pushNotificationForChat(
            (chatRequest?.shop) ? 'shop' : 'user',
            chatRequest?.user ?? chatRequest?.shop,
            chatRequest?.order,
            'chatWithAdmin',
            chat.message,
        );
        successResponse(res, {
            message: 'Chat request accepted successfully',
            data: {
                request: updatedData,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.rejectChatRequest = async (req, res) => {
    try {
        const adminId = req.adminId;

        const { id } = req.body;

        const chatRequest = await AdminChatRequest.findOne({
            _id: id,
        });
        if (!chatRequest) {
            return errorResponse(res, 'chatRequest not found');
        }

        chatRequest.admin = adminId;
        chatRequest.rejectedAt = new Date();
        chatRequest.status = 'rejected';
        // chatRequest.chats.push({
        //     user: chatRequest.user,
        //     admin: chatRequest.admin,
        //     message: 'Hi, I am admin. How can i help you.',
        //     type: 'admin',
        // });

        await chatRequest.save();

        const updatredData = await AdminChatRequest.findOne({
            _id: id,
        }).populate([
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
                populate: [
                    {
                        path: 'user',
                        select: 'name email phone_number profile_photo',
                    },
                    {
                        path: 'admin',
                    },
                ],
            },
        ]);

        if (chatRequest.chatType === 'order' && !chatRequest.order) {
            chatRequest._doc.order = chatRequest.butler;
        }

        await pushNotificationForChat(
            (chatRequest?.shop) ? 'shop' : 'user',
            chatRequest?.user ?? chatRequest?.shop,
            chatRequest?.order,
            'chatWithAdmin',
            'Your chat request rejected',
        );
        successResponse(res, {
            message: 'Chat request rejected successfully',
            data: {
                request: updatredData,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendMessageToAdmin = async (req, res) => {
    try {
        const { id, message } = req.body;
        const chatRequest = await AdminChatRequest.findOne({ _id: id });

        if (!chatRequest) return errorResponse(res, 'chatRequest not found');
        if (chatRequest.status !== 'accepted') return errorResponse(res, `chatRequest is ${chatRequest.status}`);

        const chat = await ChatsMessage.create({
            ...req.shopId ? { shop: chatRequest.shop } : { user: chatRequest.user },
            admin: chatRequest.admin,
            message: message,
            type: req.shopId ? 'shop' : 'user',
            adminChatRequest: chatRequest._id,
            order:
                chatRequest.chatType === 'order' && chatRequest.order
                    ? chatRequest.order
                    : undefined,
            butler:
                chatRequest.chatType === 'order' && chatRequest.butler
                    ? chatRequest.butler
                    : undefined,
            seen: true,
        });

        await AdminChatRequest.updateOne(
            { _id: chatRequest._id },
            {
                $push: { chats: chat._id },
                $set: {
                    userLastMessageSendAt: new Date(),
                    isAdminReplay: false,
                },
            },
        );

        if (chatRequest.chatType === 'order') {
            // set order lastChatTime
            if (chatRequest.order) {
                await Order.updateOne(
                    { _id: chatRequest.order },
                    { lastChatTime: new Date() },
                );
            } else {
                await ButlerModel.updateOne(
                    { _id: chatRequest.butler },
                    { lastChatTime: new Date() },
                );
            }
        }

        successResponse(res, {
            message: 'send',
            data: {
                request: chat,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.checkOngoingChat = async (req, res) => {
    try {
        const { orderId } = req.query;

        if (!orderId) {
            return errorResponse(res, 'orderId is required');
        }

        let isExits = await AdminChatRequest.findOne({
            ...(req.shopId) ? { shop: req.shopId } : { user: req.userId },
            $or: [{ order: orderId }, { butler: orderId }],
            status: {
                $in: ['accepted', 'pending'],
            },
        });

        successResponse(res, {
            message: 'success',
            data: {
                onGoingChat: isExits ? true : false,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.sendMessageToUser = async (req, res) => {
    try {
        const adminId = req.adminId;

        const { id, message } = req.body;

        const chatRequest = await AdminChatRequest.findOne({
            _id: id,
        });
        if (!chatRequest) {
            return errorResponse(res, 'chatRequest not found');
        }

        const chat = await ChatsMessage.create({
            ...(chatRequest?.shop) ? { shop: chatRequest.shop } : { user: chatRequest.user },
            admin: adminId,
            message: message,
            type: 'admin',
            adminChatRequest: chatRequest._id,
            order:
                chatRequest.chatType === 'order' && chatRequest.order
                    ? chatRequest.order
                    : undefined,
            butler:
                chatRequest.chatType === 'order' && chatRequest.butler
                    ? chatRequest.butler
                    : undefined,
            seen: false,
        });

        await AdminChatRequest.updateOne(
            { _id: chatRequest._id },
            { $push: { chats: chat._id }, $set: { isAdminReplay: true } },
        );

        if (chatRequest.chatType === 'order') {
            // set order lastChatTime
            if (chatRequest.order) {
                await Order.updateOne(
                    { _id: chatRequest.order },
                    { lastChatTime: new Date() },
                );
            } else {
                await ButlerModel.updateOne(
                    { _id: chatRequest.butler },
                    { lastChatTime: new Date() },
                );

                chatRequest._doc.order = chatRequest.butler;
            }
        }

        await pushNotificationForChat(
            (chatRequest?.shop) ? 'shop' : 'user',
            chatRequest?.user ?? chatRequest?.shop,
            chatRequest?.order,
            'chatWithAdmin',
            message,
        );

        successResponse(res, {
            message: 'send',
            data: {
                request: chat,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserChatRequestForUser = async (req, res) => {
    try {
        const userId = req.userId;
        const { page = 1, pageSize = 50, sortBy = 'desc', status } = req.query;

        let whereConfig = {
            user: userId,
        };

        if (
            status &&
            ['pending', 'accepted', 'rejected', 'closed'].includes(status)
        ) {
            whereConfig = {
                ...whereConfig,
                status: status,
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: AdminChatRequest,
            condition: whereConfig,
            pagingRange: 5,
        });

        const list = await AdminChatRequest.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'user',
                    select: 'name email phone_number profile_photo',
                },
                {
                    path: 'admin',
                },
                {
                    path: 'chats',
                    populate: [
                        {
                            path: 'user',
                            select: '-favoritesProducts -favoritesShops -shops',
                        },
                        {
                            path: 'admin',
                        },
                    ],
                },
            ]);

        return res.status(200).json({
            status: true,
            data: {
                request: list,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAllOngoingChatSpecificAdmin = async (req, res) => {
    try {
        const adminId = req.adminId;

        const { page = 1, pageSize = 50, chatType } = req.query;

        let whereConfig = {
            status: 'accepted',
            admin: adminId,
            ...chatType ? { chatType } : {},
        };

        const paginate = await pagination({
            page,
            pageSize,
            model: AdminChatRequest,
            condition: whereConfig,
            pagingRange: 5,
        });

        const adminChatList = await AdminChatRequest.find(whereConfig)
            .sort({ createdAt: 'desc' })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'order',
                    populate: [
                        {
                            path: 'flag',
                        },
                        {
                            path: 'shop',
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

        for (let chat of adminChatList) {
            if (chat?.user && chat?.user?._id) {
                const { usedCouponOrders, validCoupons, expiredCoupons } =
                    chat?.user?._id ? await getCouponHistory(chat?.user?._id) : { usedCouponOrders: [], validCoupons: [], expiredCoupons: [] };
                chat.user._doc.usedCouponOrders = usedCouponOrders;
                chat.user._doc.validCoupons = validCoupons;
                chat.user._doc.expiredCoupons = expiredCoupons;
            }
            if (chat.chatType === 'order' && !chat.order) {
                chat._doc.order = chat.butler;
            }
        }

        return res.status(200).json({
            status: true,
            data: {
                list: adminChatList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAllNewChat = async (req, res) => {
    try {
        const { page = 1, pageSize = 50, chatType, sellerId } = req.query;

        const shopList = await SellerModel.findById(sellerId).select('shops');

        let whereConfig = {
            status: 'pending',
        };

        if (sellerId) {
            whereConfig = {
                ...whereConfig,
                shop: { $in: shopList.shops },
            };
        }

        if (chatType) {
            whereConfig = {
                ...whereConfig,
                chatType,
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: AdminChatRequest,
            condition: whereConfig,
            pagingRange: 5,
        });

        const newChatList = await AdminChatRequest.find(whereConfig)
            .sort({ createdAt: 'desc' })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'order',
                    populate: [
                        {
                            path: 'flag',
                        },
                        {
                            path: 'shop',
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

        for (let chat of newChatList) {
            if (chat?.user?._doc) {
                const { usedCouponOrders, validCoupons, expiredCoupons } =
                    await getCouponHistory(chat?.user?._id);
                chat.user._doc.usedCouponOrders = usedCouponOrders;
                chat.user._doc.validCoupons = validCoupons;
                chat.user._doc.expiredCoupons = expiredCoupons;

                if (chat?.chatType === 'order' && !chat?.order) {
                    chat._doc.order = chat.butler;
                }
            }
        }

        return res.status(200).json({
            status: true,
            data: {
                list: newChatList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAllPastAccountChatSpecificAdmin = async (req, res) => {
    try {

        
        const adminId = req.adminId;

        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            status,
            startDate,
            endDate,
            searchKey,
            chatType= 'account',
            userType
        } = req.query;
        const customQuery = (userType === 'shop') ? { shop: { $exists: true } } : (userType === 'user')?{ user: { $exists: true } }:{};

        let whereConfig = {
            ...customQuery,
            chatType,
            admin: adminId,
        };

        if (status && ['rejected', 'closed'].includes(status)) {
            whereConfig = {
                ...whereConfig,
                status,
            };
        } else {
            whereConfig = {
                ...whereConfig,
                status: { $in: ['rejected', 'closed'] },
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

        const chatList = await AdminChatRequest.find(whereConfig)
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'chats',
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
                {
                    path: 'order',
                },
                {
                    path: 'admin'
                }
            ]);

        for (let chat of chatList) {
            if(chat?.user?._id) {
                const { usedCouponOrders, validCoupons, expiredCoupons } = await getCouponHistory(chat.user._id);
                chat.user._doc.usedCouponOrders = usedCouponOrders;
                chat.user._doc.validCoupons = validCoupons;
                chat.user._doc.expiredCoupons = expiredCoupons;
            }
        }

        let newList = [...chatList];

        if (searchKey) {
            newList = chatList.filter(chat => {
                const searchTerm = searchKey.toLowerCase();

                return (
                    chat?.user?.name?.toLowerCase().includes(searchTerm) ||
                    chat?.order?.deliveryBoy?.name
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.shop?.shopName
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.orderId?.toLowerCase().includes(searchTerm) ||
                    chat?.order?.autoGenId
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.note?.toLowerCase().includes(searchTerm)
                );
            });
        }

        let paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: newList.length,
            pagingRange: 5,
        });

        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit,
        );

        return res.status(200).json({
            status: true,
            data: {
                list: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAllPastOrderChatSpecificAdmin = async (req, res) => {
    try {

    
        const adminId = req.adminId;

        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            userId,
            shopId,
            searchKey,
            startDate,
            endDate,
        } = req.query;

        let whereConfig = {
            isChat: true,
        };

        if (userId) {
            whereConfig.user = userId;
        }

        if (shopId) {
            whereConfig.shop = shopId;
        }

        if (searchKey) {
            // Escape special characters in the search key
            const escapedSearchKey = searchKey.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
            );

            const newQuery = escapedSearchKey.split(/[ ,]+/);
            const orderIDSearchQuery = newQuery.map(str => ({
                orderId: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const noteSearchQuery = newQuery.map(str => ({
                note: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
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

        if (startDate) {
            whereConfig = {
                ...whereConfig,
                lastChatTime: {
                    $gte: moment(new Date(startDate)),
                    $lt: moment(endDate ? new Date(endDate) : new Date()).add(
                        1,
                        'days',
                    ),
                },
            };
        }

        const orderList = await Order.find(whereConfig).populate([
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
        ]);

        

        const butlerList = await ButlerModel.find(whereConfig).populate([
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
                path: 'deliveryBoy',
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
        ]);

        let list = [...orderList, ...butlerList].sort(
            (a, b) => new Date(b.lastChatTime) - new Date(a.lastChatTime),
        );

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        let newList = [];

        for (let order of list) {

        
            const isChat = order.admin_chat_request.find(
                chat =>
                    chat.status !== 'pending' &&
                    chat.admin._id.toString() === adminId.toString(),
            );

            

            if (isChat && order?.user?._id) {
                const { usedCouponOrders, validCoupons, expiredCoupons } = await getCouponHistory(order.user?._id);
              
              
                    order.user._doc.usedCouponOrders = usedCouponOrders;
                    order.user._doc.validCoupons = validCoupons;
                    order.user._doc.expiredCoupons = expiredCoupons;
    
                    newList.push({ ...order._doc });
                
                }
               
        }

        return res.status(200).json({
            status: true,
            data: {
                list: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAllAccountChatSpecificUser = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            status,
            startDate,
            endDate,
            searchKey,
            userId,
            shopId,
            chatType= 'account',
            userType
        } = req.query;
        const customQuery = (userType === 'shop') ? { shop: { $exists: true } } : (userType === 'user')?{ user: { $exists: true } }:{};

        let whereConfig = {
            ...customQuery,
            ...shopId ? { shop: shopId } : userId?{ user: userId }:{},
            chatType,
        };

        if (
            status &&
            ['pending', 'accepted', 'rejected', 'closed'].includes(status)
        ) {
            whereConfig = {
                ...whereConfig,
                status,
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

        const chatList = await AdminChatRequest.find(whereConfig)
            .sort({ createdAt: sortBy })
            .populate([
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

        for (let chat of chatList) if (chat?.[0]?.user){
                const { usedCouponOrders, validCoupons, expiredCoupons } = await getCouponHistory(chat.user._id);
                chat.user._doc.usedCouponOrders = usedCouponOrders;
                chat.user._doc.validCoupons = validCoupons;
                chat.user._doc.expiredCoupons = expiredCoupons;
            }


        let newList = [...chatList];

        if (searchKey) {
            newList = chatList.filter(chat => {
                const searchTerm = searchKey.toLowerCase();

                return (
                    chat?.user?.name?.toLowerCase().includes(searchTerm) ||
                    chat?.order?.deliveryBoy?.name
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.shop?.shopName
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.orderId?.toLowerCase().includes(searchTerm) ||
                    chat?.order?.autoGenId
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.note?.toLowerCase().includes(searchTerm)
                );
            });
        }

        let paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: newList.length,
            pagingRange: 5,
        });

        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit,
        );

        return res.status(200).json({
            status: true,
            data: {
                list: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAllOrderChatSpecificUser = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            // searchKey,
            startDate,
            endDate,
            userId,
            // shopId,
        } = req.query;

        let whereConfig = {
            isChat: true,
            user: userId,
        };

        // if (shopId) {
        //     whereConfig.shop = shopId;
        // }

        // if (searchKey) {
        //     // Escape special characters in the search key
        //     const escapedSearchKey = searchKey.replace(
        //         /[.*+?^${}()|[\]\\]/g,
        //         '\\$&',
        //     );

        //     const newQuery = escapedSearchKey.split(/[ ,]+/);
        //     const orderIDSearchQuery = newQuery.map(str => ({
        //         orderId: RegExp(str, 'i'),
        //     }));

        //     const autoGenIdQ = newQuery.map(str => ({
        //         autoGenId: RegExp(str, 'i'),
        //     }));

        //     const noteSearchQuery = newQuery.map(str => ({
        //         note: RegExp(str, 'i'),
        //     }));

        //     whereConfig = {
        //         ...whereConfig,
        //         $and: [
        //             {
        //                 $or: [
        //                     { $and: orderIDSearchQuery },
        //                     { $and: noteSearchQuery },
        //                     { $and: autoGenIdQ },
        //                 ],
        //             },
        //         ],
        //     };
        // }

        if (startDate) {
            whereConfig = {
                ...whereConfig,
                lastChatTime: {
                    $gte: moment(new Date(startDate)),
                    $lt: moment(endDate ? new Date(endDate) : new Date()).add(
                        1,
                        'days',
                    ),
                },
            };
        }

        const orderList = await Order.find(whereConfig).populate([
            {
                path: 'admin_chat_request',
                match: { user: { $exists: true } },
                
                populate: [
                    {
                        path: 'admin',
                    },
                    {
                        path:'user',
                        select:'name'
                },
                    {
                        path: 'chats',
                        populate:{
                            path:'user',
                            select:'name'
                        },
                        populate:{
                            path:'admin',
                            select:'name'
                        }
                    },
                ],
            },
            {
                path: 'shop',
            },
            // {
            //     path: 'deliveryBoy',
            // },
            {
                path: 'user',
                populate: [
                    // {
                    //     path: 'cards',
                    //     select: '-cvv -expiry_month -expiry_year -expiryDateString -expiryDate -security -pins -mode',
                    // },
                    {
                        path: 'address',
                    },
                    // {
                    //     path: 'coupons',
                    // },
                ],
            },
        ]);

        const butlerList = await ButlerModel.find(whereConfig).populate([
            {
                path: 'admin_chat_request',
                match: { user: { $exists: true } },
                populate: [
                    {
                        path: 'admin',
                    },
                    {
                            path:'user',
                            select:'name'
                    },
                    
                    {
                        path: 'chats',
                        populate:{
                            path:'user',
                            select:'name'
                        },
                        populate:{
                            path:'admin',
                            select:'name'
                        }
                    },
                ],
            },
            // {
            //     path: 'deliveryBoy',
            // },
            {
                path: 'user',
                populate: [
                    // {
                    //     path: 'cards',
                    //     select: '-cvv -expiry_month -expiry_year -expiryDateString -expiryDate -security -pins -mode',
                    // },
                    {
                        path: 'address',
                    },
                    // {
                    //     path: 'coupons',
                    // },
                ],
            },
        ]);

        let lists = [...orderList, ...butlerList].sort(
            (a, b) => new Date(b.lastChatTime) - new Date(a.lastChatTime),
        );

        let list = lists.filter(order => 
            order.admin_chat_request.some(acr => acr.user !== undefined)
        );

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        if (list.length && list?.[0]?.user) for (let chat of list) {
            
            chat.user._doc.userName = list?.[0]?.user?.name
            const { usedCouponOrders, validCoupons, expiredCoupons } =
                await getCouponHistory(chat.user._id);
            chat.user._doc.usedCouponOrders = usedCouponOrders;
            chat.user._doc.validCoupons = validCoupons;
            chat.user._doc.expiredCoupons = expiredCoupons;
          
        }

        return res.status(200).json({
            status: true,
            data: {
                list: list,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAllOrdersChat = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            searchKey,
            startDate,
            endDate,
            status,
        } = req.query;

        let whereConfig = {
            isChat: true,
        };

        if (searchKey) {
            // Escape special characters in the search key
            const escapedSearchKey = searchKey.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
            );

            const newQuery = escapedSearchKey.split(/[ ,]+/);
            const orderIDSearchQuery = newQuery.map(str => ({
                orderId: RegExp(str, 'i'),
            }));

            const autoGenIdQ = newQuery.map(str => ({
                autoGenId: RegExp(str, 'i'),
            }));

            const noteSearchQuery = newQuery.map(str => ({
                note: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
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

        if (startDate) {
            whereConfig = {
                ...whereConfig,
                lastChatTime: {
                    $gte: moment(new Date(startDate)),
                    $lt: moment(endDate ? new Date(endDate) : new Date()).add(
                        1,
                        'days',
                    ),
                },
            };
        }

        const orderList = await Order.find(whereConfig).populate([
            {
                path: 'admin_chat_request',
                populate: [
                    {
                        path: 'admin',
                    },
                    {
                        path: 'chats',
                    },
                    {
                        path: 'chatType',
                    },
                ],
            },
            {
                path: 'shop',
            },
            {
                path: 'deliveryBoy',
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
        ]);

        const butlerList = await ButlerModel.find(whereConfig).populate([
            {
                path: 'admin_chat_request',
                populate: [
                    {
                        path: 'admin',
                    },
                    {
                        path: 'chats',
                    },
                    {
                        path: 'chatType',
                    },
                ],
            },
            {
                path: 'deliveryBoy',
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
        ]);

        let list = [...orderList, ...butlerList].sort(
            (a, b) => new Date(b.lastChatTime) - new Date(a.lastChatTime),
        );

        let newList = [...list];

        newList = list.filter(order => {
            const chatFind = order.admin_chat_request.find(
                chat => chat.chatType === 'order' && chat.user
            );
            if (chatFind) {
                return order;
            }
            // order.admin_chat_request.chatType === 'account'
        });

        if (
            status &&
            ['pending', 'accepted', 'rejected', 'closed'].includes(status)
        ) {
            newList = newList.filter(order => {
                const chatFind = order.admin_chat_request.find(
                    chat => chat.status === status,
                );
                if (chatFind) {
                    return order;
                }
            });
        }

        let paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: newList.length,
            pagingRange: 5,
        });

        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit,
        );

        for (let chat of newList) {
            const { usedCouponOrders, validCoupons, expiredCoupons } =
                await getCouponHistory(chat.user._id);
            chat.user._doc.usedCouponOrders = usedCouponOrders;
            chat.user._doc.validCoupons = validCoupons;
            chat.user._doc.expiredCoupons = expiredCoupons;
        }

        return res.status(200).json({
            status: true,
            data: {
                list: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};

exports.getAllAccountsChat = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'DESC',
            status,
            startDate,
            endDate,
            searchKey,
            chatType= 'account',
            userType
        } = req.query;

        const customQuery = (userType === 'shop') ? { shop: { $exists: true } } : (userType === 'user')?{ user: { $exists: true } }:{};

        let whereConfig = {
            ...customQuery,
            chatType,
        };

        if (
            status &&
            ['pending', 'accepted', 'rejected', 'closed'].includes(status)
        ) {
            whereConfig = {
                ...whereConfig,
                status,
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

        const chatList = await AdminChatRequest.find(whereConfig)
            .sort({ createdAt: sortBy })
            .populate([
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
                    path: 'order',
                },
                {
                    path: 'shop'
                }

            ]);

        let newList = [...chatList];

        if (searchKey) {
            newList = chatList.filter(chat => {
                const searchTerm = searchKey.toLowerCase();

                return (
                    chat?.user?.name?.toLowerCase().includes(searchTerm) ||
                    chat?.order?.deliveryBoy?.name
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.shop?.shopName
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.orderId?.toLowerCase().includes(searchTerm) ||
                    chat?.order?.autoGenId
                        ?.toLowerCase()
                        .includes(searchTerm) ||
                    chat?.order?.note?.toLowerCase().includes(searchTerm)
                );
            });
        }

        let paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: newList.length,
            pagingRange: 5,
        });

        newList = newList.slice(
            paginate.offset,
            paginate.offset + paginate.limit,
        );

        for (let chat of newList) {
            if(chat?.user?._id) {
                const { usedCouponOrders, validCoupons, expiredCoupons } =
                    await getCouponHistory(chat.user._id);
                chat.user._doc.usedCouponOrders = usedCouponOrders;
                chat.user._doc.validCoupons = validCoupons;
                chat.user._doc.expiredCoupons = expiredCoupons;
            }
        }

        return res.status(200).json({
            status: true,
            data: {
                list: newList,
                paginate,
            },
        });
    } catch (err) {
        errorHandler(res, err);
    }
};
