const OrderModel = require('../models/OrderModel');
const ShopModel = require('../models/ShopModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.checkShopCapacity = async shopId => {
    const shop = await ShopModel.findById(shopId);

    // Shop Live Status Online to Busy
    if (shop?.orderCapacity > 0 && shop?.liveStatus === 'online') {
        const totalOngoingOrder = await OrderModel.count({
            shop: ObjectId(shop._id),
            orderStatus: {
                $in: ['placed', 'accepted_delivery_boy', 'preparing'],
            },
        });

        if (totalOngoingOrder >= shop?.orderCapacity) {
            await ShopModel.findByIdAndUpdate(shop._id, {
                liveStatus: 'busy',
            });
        }
    }

    // Shop Live Status Busy to Online
    if (shop?.liveStatus === 'busy') {
        const totalOngoingOrder = await OrderModel.count({
            shop: ObjectId(shop._id),
            orderStatus: {
                $in: ['placed', 'accepted_delivery_boy', 'preparing'],
            },
        });

        if (
            shop?.orderCapacity === 0 ||
            totalOngoingOrder < shop?.orderCapacity
        ) {
            await ShopModel.findByIdAndUpdate(shop._id, {
                liveStatus: 'online',
            });
        }
    }
};
