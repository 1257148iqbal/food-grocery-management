const Shop = require('../models/ShopModel');
const { log } = require('util');
const moment = require('moment-timezone');

const { find } = require('geo-tz');
const mongoose = require('mongoose');


const holidayNormalDayFilter = (
    currentDateUTC_00,
    dayLocalTimeZone,
    currentTimeLocalTimeZone
) => {
    const pipeline = [
        {
            $match: {
                $and: [
                    // Exclude full-day holidays for the current day
                    {
                        holidayHours: {
                            $not: {
                                $elemMatch: {
                                    date: { $eq: new Date(currentDateUTC_00) },
                                    isFullDayOff: true,
                                },
                            },
                        },
                    },
                    // Exclude shops that are closed during the current time
                    {
                        holidayHours: {
                            $not: {
                                $elemMatch: {
                                    date: { $eq: new Date(currentDateUTC_00) },
                                    isFullDayOff: false,
                                    closedStart: {
                                        $lte: currentTimeLocalTimeZone,
                                    },
                                    closedEnd: {
                                        $gte: currentTimeLocalTimeZone,
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        },
        {
            $match: {
                normalHours: {
                    $elemMatch: {
                        day: dayLocalTimeZone,
                        isActive: true,
                        $or: [
                            { isFullDayOpen: true },
                            {
                                $and: [
                                    { isFullDayOpen: false },
                                    {
                                        openingHours: {
                                            $elemMatch: {
                                                open: {
                                                    $lte: currentTimeLocalTimeZone,
                                                },
                                                close: {
                                                    $gte: currentTimeLocalTimeZone,
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
        },
    ];
    return pipeline;
};

/*
    The goal of this module is to find shops for each group containing {shopType, shopBrand}
    and sort them according to the distance. Continue taking closed/busy shops until you find a shop that is open and livestatus: online. After that you no longer need to take any shop from that group.
*/


const getOfflineClosedShop = async (group, excludeIds) => {
    try {
        const pipeline = [
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [
                            Number(group.longitude),
                            Number(group.latitude),
                        ],
                    },
                    distanceField: 'distance',
                    spherical: true,
                    maxDistance: Number(group.distance),
                },
            },
            {
                $match: {
                    _id: { $nin: excludeIds },
                    shopStatus: 'active',
                    shopType: group.shopType,
                    shopBrand: group.shopBrand,
                },
            },
            {
                $sort: {
                    distance: 1,
                },
            },
            {
                $project: {
                    _id: 1,
                    shopName: 1,
                    distance: 1,
                },
            },
        ];

        const shops = await Shop.aggregate(pipeline);
        const offlineShops = [];
        for(const singleShop of shops) {
            offlineShops.push(singleShop._id.toString());
        }
        return offlineShops;

    } catch (err) {
        console.log(err);
        return [];
    }
};

// grouped by shopType, shopBrand
const getOnlineActiveShop = async (
    isShopOpenPipeline,
    longitude,
    latitude,
    maxShopDistanceInMeters,
    shopType,
    shopBrand
) => {
    const shopPipeline = [
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [Number(longitude), Number(latitude)],
                },
                distanceField: 'distance',
                spherical: true,
                maxDistance: maxShopDistanceInMeters,
            },
        },
        {
            $match: {
                shopStatus: 'active',
                liveStatus: { $in: ['online'] },
                shopType: shopType,
                shopBrand: shopBrand,
                deletedAt: null,
            },
        },
        ...isShopOpenPipeline,
        { $sort: { distance: 1 } },
        {
            $group: {
                _id: {
                    shopBrand: '$shopBrand',
                    shopType: '$shopType',
                },
                nearestShop: { $first: '$$ROOT' },
            },
        },
        { $replaceRoot: { newRoot: '$nearestShop' } },
        {
            $project: {
                _id: 1,
                shopName: 1,
                distance: 1,
            },
        },
    ];

    const shops = await Shop.aggregate(shopPipeline);

    let distance = maxShopDistanceInMeters;
    const shopIds = [];

    // shops length is 1 or 0.
    shops.forEach(shop => {
        shopIds.push(shop._id.toString());
        distance = Math.min(distance, Number(shop.distance));
    });

    return { shopIds, distance };
};

const getAllGroup = async () => {
    try {
        const pipeline = [
            {
                $match: {
                    shopStatus: 'active',
                    shopBrand: { $exists: true, $ne: '' },
                    shopType: { $exists: true, $ne: '' },
                    deletedAt: null,
                },
            },
            {
                $group: {
                    _id: {
                        shopBrand: '$shopBrand',
                        shopType: '$shopType',
                    },
                    groupList: { $first: '$$ROOT' },
                },
            },
            { $replaceRoot: { newRoot: '$groupList' } },
            {
                $project: {
                    _id: 1,
                    distance: 1,
                    shopType: 1,
                    shopBrand: 1,
                },
            },
        ];
        const groupList = await Shop.aggregate(pipeline);
        return groupList;
    } catch (err) {
        console.log('error--->', err);
        return [];
    }
};

const findNearestShopIdsForEachBrand = async (
    longitude,
    latitude,
    maxShopDistanceInMeters,
) => {
    try {
        const startOfDayLocal = moment.tz().startOf('day');
        const currentDateUTC_00 = startOfDayLocal
            .utc()
            .format('YYYY-MM-DDTHH:mm:ss.SSS');

        const nowInTimeZone = moment().tz(process.env.TZ);
        const dayLocalTimeZone = nowInTimeZone.format('dddd'); // e.g., 'Wednesday'
        const currentTimeLocalTimeZone = nowInTimeZone.format('HH:mm');

        const isShopOpenPipeline = holidayNormalDayFilter(
            currentDateUTC_00,
            dayLocalTimeZone,
            currentTimeLocalTimeZone
        );

        const groupList = await getAllGroup();


        const closedBusyShopList = [];
        const onlineShopList = [];

        const processGroup = async group => {
            const { shopIds: nearestActiveOnlineShop, distance } =
                await getOnlineActiveShop(
                    isShopOpenPipeline,
                    longitude,
                    latitude,
                    maxShopDistanceInMeters,
                    group.shopType,
                    group.shopBrand
                );

            const excludeIds = [];

            if (nearestActiveOnlineShop.length) {
                excludeIds.push(
                    mongoose.Types.ObjectId(nearestActiveOnlineShop[0])
                );
            }

            const singleGroup = {
                shopType: group.shopType,
                shopBrand: group.shopBrand,
                distance,
                longitude,
                latitude,
            };

            const closedBusyShops = await getOfflineClosedShop(
                singleGroup,
                excludeIds
            );

            onlineShopList.push(...nearestActiveOnlineShop);
            closedBusyShopList.push(...closedBusyShops);
        };

        await Promise.all(groupList.map(processGroup));

        // console.log('\n\nonLineShops__');
        // console.log(onlineShopList);
        // console.log('\n\nclosedBusyShops__');
        // console.log(closedBusyShopList);

        return [...onlineShopList, ...closedBusyShopList];
    } catch (e) {
        console.log('error--->', e);
        return [];
    }
};


// module.exports = {
//     findNearestClosedBusyActiveShops,
// };


/*
const findNearestShopIdsForEachBrand = async (
    longitude,
    latitude,
    maxShopDistanceInMeters
) => {
    try {

        // process.env.TZ is the Local time zone. Added in server.js

        const startOfDayLocal = moment.tz().startOf('day');

        const currentDateUTC_00 = startOfDayLocal
            .utc()
            .format('YYYY-MM-DDTHH:mm:ss.SSS');

        const nowInTimeZone = moment().tz(process.env.TZ);

        const dayLocalTimeZone = nowInTimeZone.format('dddd'); // e.g., 'Wednesday'
        const currentTimeLocalTimeZone = nowInTimeZone.format('HH:mm');

        const isShopOpenPipeline = holidayNormalDayFilter(
            currentDateUTC_00,
            dayLocalTimeZone,
            currentTimeLocalTimeZone
        );

        const shopPipeline = [
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [Number(longitude), Number(latitude)],
                    },
                    distanceField: 'distance',
                    spherical: true,
                    maxDistance: maxShopDistanceInMeters,
                },
            },
            {
                $match: {
                    shopStatus: 'active',
                    shopBrand: { $exists: true, $ne: '' },
                    shopType: { $exists: true, $ne: '' },
                    // liveStatus: { $in: ['online', 'busy'] },
                    deletedAt: null,
                },
            },
            ...isShopOpenPipeline,
            { $sort: { distance: 1 } },
            {
                $group: {
                    _id: {
                        shopBrand: '$shopBrand',
                        shopType: '$shopType',
                    },
                    nearestShop: { $first: '$$ROOT' },
                },
            },
            { $replaceRoot: { newRoot: '$nearestShop' } },
            { $project: { _id: 1 } },
        ];

        const shops = await Shop.aggregate(shopPipeline);
        return shops.map(shop => shop._id.toString());
    } catch (e) {
        console.log('error--->', e);
        return [];
    }
};

*/

module.exports = {
    holidayNormalDayFilter,
    findNearestShopIdsForEachBrand,
}