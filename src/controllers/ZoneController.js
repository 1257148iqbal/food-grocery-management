const { validationResult } = require('express-validator');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const ZoneModel = require('../models/ZoneModel');
const { pagination } = require('../helpers/pagination');
const UserModel = require('../models/UserModel');
const ShopModel = require('../models/ShopModel');
const OrderModel = require('../models/OrderModel');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const ButlerModel = require('../models/ButlerModel');
const ObjectId = require('mongoose').Types.ObjectId;

exports.getAllZone = async (req, res) => {
    try {
        const {
            zoneStatus,
            searchKey,
            page = 1,
            pageSize = 50,
            pagingRange = 50,
            sortBy = 'desc',
        } = req.query;

        let config = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                zoneName: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }],
                    },
                ],
            };
        }
        if (zoneStatus && ['active', 'inactive'].includes(zoneStatus)) {
            config = {
                ...config,
                zoneStatus,
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: ZoneModel,
            condition: config,
            pagingRange,
        });

        const zones = await ZoneModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                zones,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getSingleZoneById = async (req, res) => {
    try {
        const { zoneId } = req.query;

        const zone = await ZoneModel.findById(zoneId);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                zone,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.addZone = async (req, res) => {
    try {
        let {
            zoneName,
            zoneArea,
            zoneGeometry,
            riderWeeklyTarget,
            riderWeeklyReward,
        } = req.body;

        const findZone = await ZoneModel.findOne({
            zoneName: { $regex: `^${zoneName}$`, $options: 'i' },
        });

        if (findZone)
            return errorResponse(
                res,
                'Zone name already exists. Please try another name.'
            );

        const zone = await ZoneModel.create({
            zoneName,
            zoneArea,
            zoneGeometry,
            riderWeeklyTarget,
            riderWeeklyReward,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                zone,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateZoneById = async (req, res) => {
    try {
        let {
            zoneId,
            zoneName,
            zoneArea,
            zoneGeometry,
            zoneStatus,
            zoneAvailability,
            zoneBusyTitle,
            zoneBusyDescription,
            riderWeeklyTarget,
            riderWeeklyReward,
        } = req.body;

        if (!ObjectId.isValid(zoneId)) {
            return errorResponse(res, 'zoneId is invalid');
        }

        const isExist = await ZoneModel.findById(zoneId);
        if (!isExist) return errorResponse(res, 'Zone not found');

        if (zoneName) {
            const findZone = await ZoneModel.findOne({
                _id: { $ne: zoneId },
                zoneName: { $regex: `^${zoneName}$`, $options: 'i' },
            });

            if (findZone)
                return errorResponse(
                    res,
                    'Zone name already exists. Please try another name.'
                );
        }

        const oldShops = await ShopModel.find({ shopZone: isExist._id });

        await ZoneModel.findByIdAndUpdate(zoneId, {
            zoneName,
            zoneArea,
            zoneGeometry,
            zoneStatus,
            zoneAvailability,
            zoneBusyTitle,
            zoneBusyDescription,
            riderWeeklyTarget,
            riderWeeklyReward,
        });

        const updatedZone = await ZoneModel.findById(zoneId);

        for (const shop of oldShops) {
            let zoneConfig = {
                zoneGeometry: {
                    $geoIntersects: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [
                                shop.location.coordinates[0],
                                shop.location.coordinates[1],
                            ],
                        },
                    },
                },
            };

            const zones = await ZoneModel.find(zoneConfig);

            const isShopInZone = zones?.find(
                zone => zone._id.toString() === zoneId.toString()
            );

            if (!isShopInZone) {
                await ShopModel.updateOne(
                    { _id: shop._id },
                    { $set: { shopZone: null } }
                );
            }
        }

        if (zoneStatus !== isExist.zoneStatus) {
            await ShopModel.updateMany(
                {
                    shopZone: isExist._id,
                },
                { shopStatus: zoneStatus }
            );
        }

        if (zoneAvailability !== isExist.zoneAvailability) {
            await ShopModel.updateMany(
                {
                    shopZone: isExist._id,
                },
                { liveStatus: zoneAvailability }
            );
        }

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                zone: updatedZone,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateMultipleZoneByIds = async (req, res) => {
    try {
        let { zoneIds = [], riderWeeklyTarget, riderWeeklyReward } = req.body;

        if (zoneIds.length < 1)
            return errorResponse(res, 'zoneIds are required');

        const countZone = await ZoneModel.countDocuments({
            _id: { $in: zoneIds },
        });
        if (countZone !== zoneIds.length)
            return errorResponse(res, 'Some Zone not found');

        await ZoneModel.updateMany(
            { _id: { $in: zoneIds } },
            {
                riderWeeklyTarget,
                riderWeeklyReward,
            }
        );

        const updatedZones = await ZoneModel.find({ _id: { $in: zoneIds } });

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                zones: updatedZones,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.deleteZoneById = async (req, res) => {
    try {
        const { zoneId } = req.body;

        const isExist = await ZoneModel.findById(zoneId);

        if (!isExist) return errorResponse(res, 'Zone not found');

        await ZoneModel.findByIdAndDelete(zoneId);

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.checkZoneForUserApp = async (req, res) => {
    try {
        const { longitude, latitude } = req.query;

        if (!longitude || !latitude) {
            return errorResponse(res, 'Longitude and latitude are required!');
        }

        let config = {
            zoneGeometry: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                },
            },
            zoneStatus: 'active',
        };

        const zone = await ZoneModel.findOne(config);

        successResponse(res, {
            message: 'Successfully checked',
            data: {
                zone,
                isUserInZone: zone ? true : false,
                isZoneBusy: zone?.zoneAvailability === 'busy' ? true : false,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getStatisticsForSpecificZone = async (req, res) => {
    try {
        const { zoneId } = req.query;

        const zone = await ZoneModel.findById(zoneId);

        if (!zone) return errorResponse(res, 'Zone not found');

        const users = await UserModel.find({
            location: { $geoWithin: { $geometry: zone.zoneGeometry } },
            status: 'active',
            deletedAt: null,
        });

        // const riders = await DeliveryBoyModel.find({
        //     location: { $geoWithin: { $geometry: zone.zoneGeometry } },
        // });
        const riders = await DeliveryBoyModel.find({
            zone: zoneId,
            status: 'active',
            liveStatus: 'online',
            deliveryBoyType: 'dropRider',
            deletedAt: null,
        });

        const shops = await ShopModel.find({
            shopZone: zoneId,
            shopStatus: 'active',
            liveStatus: 'online',
            deletedAt: null,
        });

        const orderList = await OrderModel.find({
            location: { $geoWithin: { $geometry: zone.zoneGeometry } },
            orderStatus: {
                $in: [
                    'placed',
                    'accepted_delivery_boy',
                    'preparing',
                    'ready_to_pickup',
                    'order_on_the_way',
                ],
            },
        }).populate('user');
        const butlerList = await ButlerModel.find({
            location: { $geoWithin: { $geometry: zone.zoneGeometry } },
            orderStatus: {
                $in: ['placed', 'accepted_delivery_boy', 'order_on_the_way'],
            },
        }).populate('user');

        const list = [...orderList, ...butlerList].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        successResponse(res, {
            message: 'Successfully find users',
            data: {
                users,
                riders,
                shops,
                orders: list,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.getZoneMapOverview = async (req, res) => {
    try {
        const {
            zoneStatus,
            searchKey,
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            sortBy = 'desc',
        } = req.query;

        let config = {};

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                zoneName: RegExp(str, 'i'),
            }));

            config = {
                ...config,
                $and: [
                    {
                        $or: [{ $and: nameSearchQuery }],
                    },
                ],
            };
        }

        if (zoneStatus && ['active', 'inactive'].includes(zoneStatus)) {
            config = {
                ...config,
                zoneStatus,
            };
        }

        const paginate = await pagination({
            page,
            pageSize,
            model: ZoneModel,
            condition: config,
            pagingRange,
        });

        const zones = await ZoneModel.find(config)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        for (const zone of zones) {
            const users = await UserModel.find({
                location: { $geoWithin: { $geometry: zone.zoneGeometry } },
                status: 'active',
                deletedAt: null,
            });
            zone._doc.users = users;

            const riders = await DeliveryBoyModel.find({
                zone: zone._id,
                status: 'active',
                liveStatus: 'online',
                deliveryBoyType: 'dropRider',
                deletedAt: null,
            });
            zone._doc.riders = riders;

            const shops = await ShopModel.find({
                shopZone: zone._id,
                shopStatus: 'active',
                liveStatus: 'online',
                deletedAt: null,
            });
            zone._doc.shops = shops;

            
            const orderList = await OrderModel.find({
                location: { $geoWithin: { $geometry: zone.zoneGeometry } },
                orderStatus: {
                    $in: [
                        'delivered',
                    ],
                },
            }).populate('user');
            
            const butlerList = await ButlerModel.find({
                location: { $geoWithin: { $geometry: zone.zoneGeometry } },
                orderStatus: {
                    $in: [
                        'placed',
                        'accepted_delivery_boy',
                        'order_on_the_way',
                    ],
                },
            }).populate('user');

            const orders = [...orderList, ...butlerList].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            zone._doc.orders = orders;
        }

        successResponse(res, {
            message: 'Successfully find',
            data: {
                zones,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};

exports.findZone = async (latitude, longitude) => {
    let config = {
        zoneGeometry: {
            $geoIntersects: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
            },
        },
    };

    const zone = await ZoneModel.findOne(config);

    return zone;
};

exports.getZonesByCoordinates = async (req, res) => {
    try {
        const { longitude, latitude } = req.query;

        if (!longitude || !latitude)
            return errorResponse(res, 'longitude and latitude are required');

        let config = {
            zoneGeometry: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                },
            },
        };

        const zones = await ZoneModel.find(config);

        successResponse(res, {
            message: 'Successfully get',
            data: {
                zones,
            },
        });
    } catch (error) {
        errorHandler(res, error.message);
    }
};
