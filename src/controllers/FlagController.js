const FlagModel = require('../models/FlagModel');
const { successResponse, errorResponse } = require('../helpers/apiResponse');
const {
    pagination,
    paginationMultipleModel,
} = require('../helpers/pagination');
const OrderModel = require('../models/OrderModel');
const moment = require('moment');
const ButlerModel = require('../models/ButlerModel');

exports.resolvedFlag = async (req, res) => {
    try {
        const { id, resolved } = req.body;

        await FlagModel.updateOne(
            { _id: id },
            {
                isResolved: resolved,
            }
        );

        const flag = await FlagModel.findById(id).populate([
            {
                path: 'shop',
                select: '-password',
            },
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'delivery',
                select: '-password',
            },
            {
                path: 'orderId',
                populate: 'user shop seller deliveryBoy',
            },
            {
                path: 'butlerId',
                populate: 'user deliveryBoy',
            },
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: flag,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.resolvedMultipleFlag = async (req, res) => {
    try {
        const { flagIds, resolved } = req.body;

        await FlagModel.updateMany(
            { _id: { $in: flagIds } },
            {
                isResolved: resolved,
            }
        );

        const flags = await FlagModel.find({ _id: { $in: flagIds } }).populate([
            {
                path: 'shop',
                select: '-password',
            },
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'delivery',
                select: '-password',
            },
            {
                path: 'orderId',
                populate: 'user shop seller deliveryBoy',
            },
            {
                path: 'butlerId',
                populate: 'user deliveryBoy',
            },
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: flags,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getFlag = async (req, res) => {
    try {
        const {
            model, // order || butler
            type, // user || shop || delivery || refused || auto || delay
            flaggedType, // cancelled || replacement || refunded || late || normal
            resolved, // true || false
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
        } = req.query;

        let config = {};

        if (model === 'order') {
            config = {
                ...config,
                orderId: { $exists: true },
            };
        }
        if (model === 'butler') {
            config = {
                ...config,
                butlerId: { $exists: true },
            };
        }
        if (type === 'user') {
            config = {
                ...config,
                user: { $exists: true },
                type: 'user',
            };
        }
        if (type === 'shop') {
            config = {
                ...config,
                shop: { $exists: true },
                type: 'shop',
            };
        }
        if (type === 'delivery') {
            config = {
                ...config,
                delivery: { $exists: true },
                type: 'delivery',
            };
        }
        if (type === 'refused') {
            config = {
                ...config,
                isRefused: true,
                type: 'refused',
            };
        }
        if (type === 'auto') {
            config = {
                ...config,
                isAutomatic: true,
                type: 'auto',
            };
        }
        if (type === 'delay') {
            config = {
                ...config,
                isDelay: true,
                type: 'delay',
            };
        }
        if (resolved) {
            config = {
                ...config,
                isResolved: resolved,
            };
        }

        if (flaggedType) {
            config = {
                ...config,
                flaggedType,
            };
        }

        var paginate = await pagination({
            page,
            pageSize,
            model: FlagModel,
            condition: config,
            pagingRange,
        });

        const list = await FlagModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit)
            .populate([
                {
                    path: 'shop',
                    select: '-password',
                },
                {
                    path: 'user',
                    select: '-password',
                },
                {
                    path: 'delivery',
                    select: '-password',
                },
                {
                    path: 'orderId',
                    populate: 'user shop seller deliveryBoy flag',
                },
                {
                    path: 'butlerId',
                    populate: 'user deliveryBoy',
                },
            ]);

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getFlaggedOrder = async (req, res) => {
    try {
        const {
            category, // food || grocery || pharmacy || butler
            orderStatus, // schedule || placed || accepted_delivery_boy || preparing || ready_to_pickup || order_on_the_way || delivered || refused || cancelled
            type, // user || shop || delivery || refused || auto || delay
            flaggedType, // cancelled || replacement || refunded || late || normal
            resolved, // true || false
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
            startDate,
            endDate,
            searchKey,
        } = req.query;

        let config = {
            flag: {
                $elemMatch: {
                    $exists: true,
                },
            },
        };

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

        if (category && ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(category)) {
            config = {
                ...config,
                orderType: category,
            };
        }

        if (
            orderStatus &&
            [
                'schedule',
                'placed',
                'accepted_delivery_boy',
                'preparing',
                'ready_to_pickup',
                'order_on_the_way',
                'delivered',
                'refused',
                'cancelled',
            ].includes(orderStatus)
        ) {
            config = {
                ...config,
                orderStatus,
            };
        }

        let orderList = await OrderModel.find(config).populate([
            {
                path: 'shop',
                select: '-password',
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
                populate: 'user shop delivery',
            },
            {
                path: 'orderCancel',
                populate: 'cancelReason',
            },
            {
                path: 'seller',
                select: '-password',
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
                path: 'userCancelTnx',
            },
            {
                path: 'marketings',
            },
            {
                path: 'userRefundTnx',
            },
            {
                path: 'replacementOrder',
                populate: [
                    {
                        path: 'shop',
                        select: '-password',
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
                        populate: 'user shop delivery',
                    },
                    {
                        path: 'orderCancel',
                        populate: 'cancelReason',
                    },
                    {
                        path: 'seller',
                        select: '-password',
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
                        path: 'userCancelTnx',
                    },
                    {
                        path: 'marketings',
                    },
                    {
                        path: 'userRefundTnx',
                    },
                ],
            },
        ]);

        let butlerList = await ButlerModel.find(config).populate([
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

        let list = [...orderList, ...butlerList];

        if (category === 'butler') {
            list = [...butlerList];
        }

        // if (sortBy.toUpperCase() === 'DESC') {
        //     list = list.sort(
        //         (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        //     );
        // } else {
        //     list = list.sort(
        //         (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        //     );
        // }
        if (sortBy.toUpperCase() === 'DESC') {
            list = list.sort((a, b) => {
                const flaggedComparison =
                    new Date(b.flaggedAt) - new Date(a.flaggedAt);
                if (flaggedComparison === 0) {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                }
                return flaggedComparison;
            });
        } else {
            list = list.sort((a, b) => {
                const flaggedComparison =
                    new Date(a.flaggedAt) - new Date(b.flaggedAt);
                if (flaggedComparison === 0) {
                    return new Date(a.createdAt) - new Date(b.createdAt);
                }
                return flaggedComparison;
            });
        }

        if (resolved) {
            const updateList = [];

            for (const order of list) {
                if (
                    order.flag[0].isResolved.toString().toLowerCase() ===
                    resolved.toString().toLowerCase()
                ) {
                    updateList.push(order);
                }
            }

            list = updateList;
        }

        if (
            type &&
            ['user', 'shop', 'delivery', 'refused', 'auto', 'delay'].includes(
                type
            )
        ) {
            const updateList = [];

            for (const order of list) {
                const checkFlag = order?.flag?.find(
                    element => element.type === type
                );

                if (checkFlag) {
                    updateList.push(order);
                }
            }

            list = updateList;
        }

        if (
            flaggedType &&
            ['cancelled', 'replacement', 'refunded', 'late', 'normal'].includes(
                flaggedType
            )
        ) {
            const updateList = [];

            for (const order of list) {
                const checkFlag = order?.flag?.find(
                    element => element.flaggedType === flaggedType
                );

                if (checkFlag) {
                    updateList.push(order);
                }
            }

            list = updateList;
        }

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: list.length,
            pagingRange: 5,
        });

        list = list.slice(paginate.offset, paginate.offset + paginate.limit);

        successResponse(res, {
            message: 'Successfully Find',
            data: {
                list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.singleFlag = async (req, res) => {
    try {
        const { id } = req.query;

        const flag = await FlagModel.findById(id).populate([
            {
                path: 'shop',
                select: '-password',
            },
            {
                path: 'user',
                select: '-password',
            },
            {
                path: 'delivery',
                select: '-password',
            },
            {
                path: 'orderId',
            },
            {
                path: 'butlerId',
            },
        ]);

        successResponse(res, {
            message: 'Successfully find',
            data: flag,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
