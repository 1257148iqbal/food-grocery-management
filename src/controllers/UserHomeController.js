const {
    successResponse,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const ShopModel = require('../models/ShopModel');
const OrderModel = require('../models/OrderModel');
const ProductModel = require('../models/ProductModel');
const TagModel = require('../models/TagModel');
const AppSetting = require('../models/AppSetting');
const GlobalDropCharge = require('../models/GlobalDropCharge');
const DealModel = require('../models/DealModel');
const BannerModel = require('../models/BannerModel');
const {
    pagination,
    paginationMultipleModel,
    paginationWithLocation,
} = require('../helpers/pagination');
const ListContainerModel = require('../models/ListContainerModel');
const TagCuisineModel = require('../models/TagCuisineModel');
const FilterContainerModel = require('../models/FilterContainerModel');
const {
    getDeliveryCharge,
    getShopByDeliveryCharge,
    getDistance,
} = require('../helpers/getDeliveryCharge');
const { checkShopOpeningHours } = require('../helpers/checkShopOpeningHours');
const {
    checkPlusUserMarketing,
    checkPlusUserProductMarketing,
} = require('../helpers/checkPlusUserMarketing');
const UserPunchMarketingModel = require('../models/UserPunchMarketingModel');
const MarketingModel = require('../models/MarketingModel');
const moment = require('moment');
const UserAppScreenModel = require('../models/UserAppScreenModel');
const {
    shopCommonSorting,
    shopSortingFunc,
} = require('../helpers/shopCommonSorting');
const { findNearestShopIdsForEachBrand } = require('../services/shop.service');

const {
    processShops,
    processShopsForScreen,
} = require('../helpers/user_app_home/processShops');
const ZoneModel = require('../models/ZoneModel');
const fs = require('fs');

async function filterByShopZone(screen){
    // Fetch all active zones
    const allActiveZone = await ZoneModel.find({ zoneStatus: 'active' });
    // Get the IDs of the active zones
    const activeZoneIds = allActiveZone.map(item => item._id.toString());
    const filteredShops = screen?.shops?.filter(shop => {
        const shopZoneId = typeof shop?.shopZone === 'object' 
            ? shop?.shopZone?._id?.toString() 
            : shop?.shopZone?.toString();

        return activeZoneIds.includes(shopZoneId);
    });

    return {
        ...screen,
        shops: filteredShops
    };
}

async function filterScreensByActiveZones(screens) {
    // Fetch all active zones
    const allActiveZone = await ZoneModel.find({ zoneStatus: 'active' });
    const activeZoneIds = allActiveZone.map(item => item._id.toString());

    const shopZoneWishData = screens?.map(screen => {
        const filteredShops = screen?.shops?.filter(shop => {
            const shopZoneId = typeof shop?.shopZone === 'object' 
                ? shop?.shopZone?._id?.toString() 
                : shop?.shopZone?.toString();

            return activeZoneIds.includes(shopZoneId);
        });

        return {
            ...screen,
            shops: filteredShops
        };
    });

    return shopZoneWishData;
}

exports.getUserAppHomePageBanner = async (req, res) => {
    try {
        const { visibleUserType } = req.query;

        let whereConfig = { type: 'home', status: 'active' };

        if (visibleUserType === 'plus') {
            whereConfig = {
                ...whereConfig,
                visibleUserType: { $in: ['all', 'plus'] },
            };
        }

        if (visibleUserType === 'normal') {
            whereConfig = {
                ...whereConfig,
                visibleUserType: { $in: ['all', 'normal'] },
            };
        }

        const banners = await BannerModel.find(whereConfig)
            .populate([
                {
                    path: 'shopId',
                    populate: 'products cuisineType',
                },
                {
                    path: 'productId',
                },
                {
                    path: 'listContainerId',
                },
            ])
            .sort([
                ['sortingOrder', 'asc'],
                ['createdAt', -1],
            ]);

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                banners,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

const getNearBy = async (req, type) => {
    const {
        page = 1,
        pageSize = 50,
        latitude,
        longitude,
        listContainers,
        deals,
        mixProductPrice,
        tags,
        cuisineIds,
        dietaries,
        priceSort,
        ratingSort,
        deliveryTimeSort,
        maxDeliveryFee,
    } = req.query;
    const plusUser = req.plusUser;

    if (latitude == 0 || latitude == null || latitude == '') {
        return [];
    }
    const appSetting = await AppSetting.findOne().select('nearByShopKmForUserHomeScreen');
    const km = appSetting?.nearByShopKmForUserHomeScreen || 1;
    const maxDistanceInMeters = 1000 * km;

    let sort = shopCommonSorting;

    if (['asc', 'desc'].includes(priceSort)) {
        sort = {
            expensive: priceSort,
        };
    }

    if (ratingSort == 'yes') {
        sort = {
            rating: 'desc',
        };
    }

    let config = {
        _id: {
            $in: await findNearestShopIdsForEachBrand(
                longitude,
                latitude,
                maxDistanceInMeters
            ),
        }, //TODO: need to test
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                $maxDistance: maxDistanceInMeters,
            },
        },
        shopType: type,
        deletedAt: null,
    };

    if (mixProductPrice?.length >= 3) {
        const listOfExpensive = JSON.parse(mixProductPrice);

        config.expensive = {
            $in: listOfExpensive,
        };
    }

    if (tags?.length >= 3) {
        const listOfTags = JSON.parse(tags);

        config.tags = {
            $in: listOfTags,
        };
    }

    if (cuisineIds?.length >= 3) {
        const cuisineListIds = JSON.parse(cuisineIds);

        config.cuisineType = {
            $in: cuisineListIds,
        };
    }

    if (dietaries?.length >= 3) {
        const dietaryList = JSON.parse(dietaries);

        config.dietary = {
            $in: dietaryList,
        };
    }

    const shops = await ShopModel.find(config)
        .sort(sort)
        .populate([
            {
                path: 'seller',
                select: '-password',
            },
            {
                path: 'banner',
            },
            {
                path: 'products',
                populate: 'marketing',
            },
            {
                path: 'cuisineType',
            },
            {
                path: 'marketings',
            },
        ]);

    let newShops = [];
    if (maxDeliveryFee == 0) {
        for (const singleShop of shops) {
            let result = false;
            if (singleShop.freeDelivery) {
                result = singleShop.marketings.some(
                    marketing =>
                        marketing.type === 'free_delivery' && marketing.isActive
                );
            }

            if (result) {
                if (!plusUser) {
                    await checkPlusUserMarketing(singleShop);
                }
                singleShop._doc.deliveryFee = 0
                newShops.push(singleShop)
            }
        }
    } else if (maxDeliveryFee > 0) {
        for (const singleShop of shops) {
            const result = await getShopByDeliveryCharge(
                singleShop,
                latitude,
                longitude,
                maxDeliveryFee
            );

            if (result === true) {
                let deliveryFee = await getDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    plusUser
                );
                // console.log(deliveryFee);
                if (!plusUser) {
                    await checkPlusUserMarketing(singleShop);
                }

                singleShop._doc.deliveryFee = deliveryFee
                newShops.push(singleShop)
            }
        }
    } else {
        for (const singleShop of shops) {
            let deliveryFee = await getDeliveryCharge(
                singleShop,
                latitude,
                longitude,
                plusUser
            );

            if (!plusUser) {
                await checkPlusUserMarketing(singleShop);
            }

            singleShop._doc.deliveryFee = deliveryFee
            newShops.push(singleShop)
        }
    }

    if (deals?.length >= 3) {
        const listOfDeals = JSON.parse(deals);

        const dealsList = await FilterContainerModel.find({
            _id: { $in: listOfDeals },
        });

        let isDoubleDeal = false;
        let isFreeDelivery = false;
        let percentageDeals = [];

        for (const deal of dealsList) {
            isDoubleDeal = deal?.deals?.includes('double_menu');
            isFreeDelivery = deal?.deals?.includes('free_delivery');
            percentageDeals = deal?.deals?.filter(
                singleDeal =>
                    !['double_menu', 'free_delivery'].includes(singleDeal)
            );
        }

        let doubleDealShops = [];
        let freeDeliveryShops = [];
        let percentageDealShops = [];

        if (isDoubleDeal) {
            doubleDealShops = newShops.filter(shop =>
                shop.marketings.some(
                    marketing =>
                        marketing.type === 'double_menu' && marketing.isActive
                )
            );
        }

        if (isFreeDelivery) {
            freeDeliveryShops = newShops.filter(shop =>
                shop.marketings.some(
                    marketing =>
                        marketing.type === 'free_delivery' && marketing.isActive
                )
            );
        }

        if (percentageDeals.length > 0) {
            percentageDealShops = newShops.filter(shop =>
                shop.marketings.some(marketing => {
                    if (marketing.type === 'percentage' && marketing.isActive) {
                        const marketingDiscounts =
                            marketing.discountPercentages.map(String);
                        return percentageDeals.some(discount =>
                            marketingDiscounts.includes(discount)
                        );
                    }
                })
            );
        }

        const newShopList = [
            ...doubleDealShops,
            ...freeDeliveryShops,
            ...percentageDealShops,
        ];

        const uniqueShopList = [];

        for (const shop of newShopList) {
            const findShop = uniqueShopList?.find(
                uniqueShop =>
                    uniqueShop?._id?.toString() === shop?._id?.toString()
            );
            if (!findShop) {
                uniqueShopList.push(shop);
            }
        }

        newShops = uniqueShopList;
    }

    if (listContainers?.length >= 3) {
        const listOfDeals = JSON.parse(listContainers);

        const dealsList = await ListContainerModel.find({
            _id: { $in: listOfDeals },
        });

        let dealsArr = [];
        let tagsArr = [];
        let shopsArr = [];

        for (const deal of dealsList) {
            if (deal.type.includes('deal')) {
                dealsArr = [...dealsArr, ...deal.deals];
            }
            if (deal.type.includes('tag')) {
                tagsArr = [...tagsArr, ...deal.tags];
            }
            if (deal.type.includes('shop')) {
                shopsArr = [...shopsArr, ...deal.shops];
            }
        }

        let dealsShop = [];
        let tagsShop = [];
        let shopsShop = [];

        if (shopsArr.length > 0) {
            shopsArr = [...new Set(shopsArr)];

            const shopsArrString = shopsArr?.map(id => id.toString());

            shopsShop = newShops.filter(shop =>
                shopsArrString.includes(shop?._id?.toString())
            );
        }

        if (dealsArr.length > 0) {
            dealsArr = [...new Set(dealsArr)];

            let isDoubleDeal = dealsArr?.includes('double_menu');
            let isFreeDelivery = dealsArr?.includes('free_delivery');
            let percentageDeals = dealsArr?.filter(
                singleDeal =>
                    !['double_menu', 'free_delivery'].includes(singleDeal)
            );

            if (isDoubleDeal) {
                const list = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );
                dealsShop = [...dealsShop, ...list];
            }

            if (isFreeDelivery) {
                const list = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );
                dealsShop = [...dealsShop, ...list];
            }

            if (percentageDeals.length > 0) {
                const list = newShops.filter(shop =>
                    shop.marketings.some(marketing => {
                        if (
                            marketing.type === 'percentage' &&
                            marketing.isActive
                        ) {
                            const marketingDiscounts =
                                marketing.discountPercentages.map(String);

                            return percentageDeals.some(discount =>
                                marketingDiscounts.includes(discount)
                            );
                        }
                    })
                );

                dealsShop = [...dealsShop, ...list];
            }
        }

        if (tagsArr.length > 0) {
            tagsArr = [...new Set(tagsArr)];

            const tagsArrString = tagsArr?.map(id => id.toString());

            const tagsList = newShops.filter(shop =>
                shop.tagsId.some(tag =>
                    tagsArrString.includes(tag?._id?.toString())
                )
            );
            const cuisineList = newShops.filter(shop =>
                shop.cuisineType.some(cuisine =>
                    tagsArrString.includes(cuisine?._id?.toString())
                )
            );

            tagsShop = [...tagsList, ...cuisineList];
        }

        const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

        const uniqueShopList = [];

        for (const shop of newShopList) {
            const findShop = uniqueShopList?.find(
                uniqueShop =>
                    uniqueShop?._id?.toString() === shop?._id?.toString()
            );
            if (!findShop) {
                uniqueShopList.push(shop);
            }
        }

        newShops = uniqueShopList;
    }

    // sorting
    if (deliveryTimeSort == 'yes') {
        
        // for (const shop of newShops) {
        //     console.log('shop---',shop);
        //     let shopDistance = await getDistance(
        //         latitude,
        //         longitude,
        //         shop.location?.coordinates[1],
        //         shop.location?.coordinates[0],
        //         'k'
        //     );

        //     if (!shopDistance) {
        //         shopDistance = 1;
        //     }

        //     shop.shopDistance = shopDistance;
        // }

        newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20) - (b.avgOrderDeliveryTime || 20));
    }

   

    // Open shop need to show top and then closed shop
    const openShops = newShops
        .map(shop => {
            shop._doc.isShopOpen = checkShopOpeningHours(shop)
            return shop
        })
        .reduce(
            (accumulator, currentShop) => {
                if (
                    currentShop._doc.liveStatus === 'online' &&
                    currentShop._doc.isShopOpen
                ) {
                    accumulator[0].push(currentShop);
                } else {
                    accumulator[1].push(currentShop);
                }
                return accumulator;
            },
            [[], []]
        );

    const finalShops = [...openShops[0], ...openShops[1]];


   

    const paginate = await paginationMultipleModel({
        page,
        pageSize,
        total: finalShops.length,
        pagingRange: 5,
    });

    const list = finalShops.slice(
        paginate.offset,
        paginate.offset + paginate.limit
    );

    return { list, paginate };
};

exports.getNearReataurent = async (req, res) => {
    try {
        const { list, paginate } = await getNearBy(req, 'food');

        successResponse(res, {
            message: 'Successfully get near food',
            data: { shops: list, paginate },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getNearGrocery = async (req, res) => {
    try {
        const { list, paginate } = await getNearBy(req, 'grocery');

        successResponse(res, {
            message: 'Successfully get near grocery',
            data: { shops: list, paginate },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getNearPharmacy = async (req, res) => {
    try {
        const { list, paginate } = await getNearBy(req, 'pharmacy');

        successResponse(res, {
            message: 'Successfully get near pharmacy',
            data: { shops: list, paginate },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getNearCoffee = async (req, res) => {
    try {
        const { list, paginate } = await getNearBy(req, 'coffee');

        successResponse(res, {
            message: 'Successfully get near coffee',
            data: { shops: list, paginate },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getNearFlower = async (req, res) => {
    try {
        const { list, paginate } = await getNearBy(req, 'flower');

        successResponse(res, {
            message: 'Successfully get near flower',
            data: { shops: list, paginate },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getNearPet = async (req, res) => {
    try {
        const { list, paginate } = await getNearBy(req, 'pet');

        successResponse(res, {
            message: 'Successfully get near pet',
            data: { shops: list, paginate },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};


// const { findNearestClosedBusyActiveShops } = 
//     require('../helpers/getClosedBusyShop');

exports.getUserHomeApiForShop = async (req, res) => {
    try {
        const userId = req.userId;
        const plusUser = req.plusUser;
        const {
            page = 1,
            pageSize = 50,
            type = 'food',
            latitude,
            longitude,
        } = req.query;

        const appSetting = await AppSetting.findOne().select('nearByShopKm');
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let locationRange = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
        };

        // const banners = await BannerModel.find({ type: type })
        //     .populate([
        //         {
        //             path: 'shopId',
        //             populate: 'products cuisineType marketings',
        //         },
        //         {
        //             path: 'shop',
        //         },
        //         {
        //             path: 'productId',
        //         },
        //     ])
        //     .sort([
        //         ['sortingOrder', 'asc'],
        //         ['createdAt', -1],
        //     ]);

        // //** Discount shops */
        // const discountShops = await ShopModel.find({
        //     shopType: type,
        //     shopStatus: 'active',
        //     // liveStatus: { $nin: ['offline'] },
        //     marketings: {
        //         $elemMatch: {
        //             $exists: true,
        //         },
        //     },
        //     ...locationRange,
        // })
        //     .sort({ isFeatured: -1, discountDealUpdateTime: 'desc' })
        //     .populate([
        //         {
        //             path: 'marketings',
        //         },
        //         {
        //             path: 'seller',
        //             select: '-password',
        //         },
        //         {
        //             path: 'banner',
        //         },
        //         {
        //             path: 'products',
        //             populate: 'marketing',
        //         },
        //         {
        //             path: 'cuisineType',
        //         },
        //     ])
        //     .select('-categories');

        // const activeDiscountShopsList = [];
        // const activeCrazyDiscountShopsList = [];

        // for (const shop of discountShops) {
        //     const findDiscount = shop.marketings.find(
        //         marketing =>
        //             ['percentage', 'double_menu', 'reward'].includes(
        //                 marketing.type
        //             ) &&
        //             marketing.isActive &&
        //             !marketing.onlyForSubscriber
        //     );

        //     if (findDiscount) {
        //         let deliveryFee = await getDeliveryCharge(
        //             shop,
        //             latitude,
        //             longitude,
        //             plusUser
        //         );
        //         const isShopOpen = checkShopOpeningHours(shop);

        //         if (!plusUser) {
        //             await checkPlusUserMarketing(shop);
        //         }

        //         activeDiscountShopsList.push({
        //             ...shop._doc,
        //             deliveryFee: deliveryFee,
        //             isShopOpen,
        //         });
        //     }

        //     // For finding crazy discount shop
        //     if (plusUser) {
        //         const findCrazyDiscount = shop.marketings.find(
        //             marketing =>
        //                 ['percentage', 'double_menu'].includes(
        //                     marketing.type
        //                 ) &&
        //                 marketing.isActive &&
        //                 marketing.onlyForSubscriber
        //         );

        //         if (findCrazyDiscount) {
        //             let deliveryFee = await getDeliveryCharge(
        //                 shop,
        //                 latitude,
        //                 longitude,
        //                 plusUser
        //             );
        //             const isShopOpen = checkShopOpeningHours(shop);

        //             if (!plusUser) {
        //                 await checkPlusUserMarketing(shop);
        //             }

        //             activeCrazyDiscountShopsList.push({
        //                 ...shop._doc,
        //                 deliveryFee: deliveryFee,
        //                 isShopOpen,
        //             });
        //         }
        //     }
        // }

        // //** Free Delivery shop */
        // const activeFreeDeliveryShopsList = [];

        // if (!plusUser) {
        //     const freeDeliveryShops = await ShopModel.find({
        //         shopType: type,
        //         shopStatus: 'active',
        //         // liveStatus: { $nin: ['offline'] },
        //         freeDelivery: true,
        //         marketings: {
        //             $elemMatch: {
        //                 $exists: true,
        //             },
        //         },
        //         ...locationRange,
        //     })
        //         .sort({ isFeatured: -1, freeDealUpdateTime: 'desc' })
        //         .populate([
        //             {
        //                 path: 'marketings',
        //             },
        //             {
        //                 path: 'seller',
        //                 select: '-password',
        //             },
        //             {
        //                 path: 'banner',
        //             },
        //             {
        //                 path: 'products',
        //                 populate: 'marketing',
        //             },
        //             {
        //                 path: 'cuisineType',
        //             },
        //         ])
        //         .select('-categories');

        //     for (const shop of freeDeliveryShops) {
        //         const marketings = shop?.marketings;

        //         if (marketings.length > 0) {
        //             for (const marketing of marketings) {
        //                 if (
        //                     marketing.isActive &&
        //                     ['free_delivery'].includes(marketing.type)
        //                 ) {
        //                     // let deliveryFee = await getDeliveryCharge(
        //                     //     shop,
        //                     //     latitude,
        //                     //     longitude,
        //                     //     plusUser
        //                     // );
        //                     const isShopOpen = checkShopOpeningHours(shop);

        //                     if (!plusUser) {
        //                         await checkPlusUserMarketing(shop);
        //                     }

        //                     activeFreeDeliveryShopsList.push({
        //                         ...shop._doc,
        //                         deliveryFee: 0,
        //                         isShopOpen,
        //                     });
        //                     break;
        //                 }
        //             }
        //         }
        //     }
        // }

        // //** Featured shops */
        // const featuredShops = await ShopModel.find({
        //     isFeatured: true,
        //     shopType: type,
        //     shopStatus: 'active',
        //     // liveStatus: { $nin: ['offline'] },
        //     ...locationRange,
        // })
        //     .populate([
        //         {
        //             path: 'seller',
        //             select: '-password',
        //         },
        //         {
        //             path: 'banner',
        //         },
        //         {
        //             path: 'products',
        //             populate: 'marketing',
        //         },
        //         {
        //             path: 'marketings',
        //         },
        //         {
        //             path: 'cuisineType',
        //         },
        //     ])
        //     .select('-categories');

        // featuredShops.sort(() => Math.random() - 0.5);
        // for (let shop of featuredShops) {
        //     let deliveryFee = await getDeliveryCharge(
        //         shop,
        //         latitude,
        //         longitude,
        //         plusUser
        //     );
        //     const isShopOpen = checkShopOpeningHours(shop);

        //     shop._doc.deliveryFee = deliveryFee;
        //     shop._doc.isShopOpen = isShopOpen;

        //     if (!plusUser) {
        //         await checkPlusUserMarketing(shop);
        //     }
        // }

        // //** Past order shops */
        // const pastOrders = await OrderModel.find({
        //     user: userId,
        //     orderStatus: 'delivered',
        //     orderType: type,
        // })
        //     .sort({ createdAt: 'desc' })
        //     .distinct('shop')
        //     .lean();

        // const pastOrderShops = await ShopModel.find({
        //     _id: { $in: pastOrders },
        //     // liveStatus: { $nin: ['offline'] },
        // })
        //     .sort(shopCommonSorting)
        //     .populate([
        //         {
        //             path: 'marketings',
        //         },
        //         {
        //             path: 'products',
        //             populate: 'marketing',
        //         },
        //         {
        //             path: 'cuisineType',
        //         },
        //     ]);

        // for (let shop of pastOrderShops) {
        //     let deliveryFee = await getDeliveryCharge(
        //         shop,
        //         latitude,
        //         longitude,
        //         plusUser
        //     );
        //     const isShopOpen = checkShopOpeningHours(shop);

        //     shop._doc.deliveryFee = deliveryFee;
        //     shop._doc.isShopOpen = isShopOpen;

        //     if (!plusUser) {
        //         await checkPlusUserMarketing(shop);
        //     }
        // }

        // //** Near by shops */
        // const nearShops = await ShopModel.find({
        //     ...locationRange,
        //     shopStatus: 'active',
        //     // liveStatus: { $nin: ['offline'] },
        //     shopType: type,
        // })
        //     .sort(shopCommonSorting)
        //     .populate([
        //         {
        //             path: 'seller',
        //             select: '-password',
        //         },
        //         {
        //             path: 'marketings',
        //         },
        //         {
        //             path: 'products',
        //             populate: 'marketing',
        //         },
        //         {
        //             path: 'cuisineType',
        //         },
        //     ]);

        // for (let shop of nearShops) {
        //     let deliveryFee = await getDeliveryCharge(
        //         shop,
        //         latitude,
        //         longitude,
        //         plusUser
        //     );
        //     const isShopOpen = checkShopOpeningHours(shop);

        //     shop._doc.deliveryFee = deliveryFee;
        //     shop._doc.isShopOpen = isShopOpen;

        //     if (!plusUser) {
        //         await checkPlusUserMarketing(shop);
        //     }
        // }

        //** All Shops */
        let allShops = await ShopModel.find({
            _id: {
                $in: await findNearestShopIdsForEachBrand(
                    longitude,
                    latitude,
                    maxDistanceInMeters
                ),
            }, //TODO: need to test
            shopType: type,
            shopStatus: 'active',
            deletedAt: null,
            ...locationRange,
        })
            .sort(shopCommonSorting)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'categories',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        for (let shop of allShops) {
            let deliveryFee = await getDeliveryCharge(
                shop,
                latitude,
                longitude,
                plusUser
            );
            const isShopOpen = checkShopOpeningHours(shop);

            shop._doc.deliveryFee = deliveryFee;
            shop._doc.isShopOpen = isShopOpen;

            if (!plusUser) {
                await checkPlusUserMarketing(shop);
            }
        }

        // function compareStatusAndShopOpen(a, b) {
        //     // Compare liveStatus and isShopOpen
        //     const statusA = a.liveStatus === 'online' && a._doc.isShopOpen;
        //     const statusB = b.liveStatus === 'online' && b._doc.isShopOpen;

        //     return statusA ? (statusB ? 0 : -1) : statusB ? 1 : 0;
        // }

        // const sortedShops = allShops.sort((a, b) => {
        //     // Compare liveStatus and isShopOpen first
        //     const statusComparison = compareStatusAndShopOpen(a, b);

        //     if (statusComparison !== 0) {
        //         // If different liveStatus or isShopOpen, prioritize by statusComparison
        //         return statusComparison;
        //     }

        //     // If liveStatus and isShopOpen are the same, compare isFeatured
        //     const featuredComparison =
        //         a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1;

        //     if (featuredComparison !== 0) {
        //         // If isFeatured is different, prioritize by featuredComparison
        //         return featuredComparison;
        //     }

        //     // If isFeatured is the same, compare createdAt in ascending order
        //     const createdAtComparison =
        //         new Date(a.createdAt) - new Date(b.createdAt);

        //     return createdAtComparison;
        // });

        // Open shop need to show top and then closed shop
        const openShops = allShops.reduce(
            (accumulator, currentShop) => {
                if (
                    currentShop.liveStatus === 'online' &&
                    currentShop._doc.isShopOpen
                ) {
                    accumulator[0].push(currentShop);
                } else {
                    accumulator[1].push(currentShop);
                }
                return accumulator;
            },
            [[], []]
        );

        const finalShops = [...openShops[0], ...openShops[1]];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalShops.length,
            pagingRange: 5,
        });

        const finalShopList = finalShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        //** List Container */
        const listContainer = await ListContainerModel.find({
            status: 'active',
            shopType: type,
        }).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        //** Tags and Cuisines */
        const tagsCuisines = await TagCuisineModel.find({
            status: 'active',
            shopType: type,
            visibility: true,
        }).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        // const allDeals = [];

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                // banners,
                // allDeals,
                // totalDiscountShop: activeDiscountShopsList.length,
                // discountShops: activeDiscountShopsList.slice(0, 5),
                // totalCrazyDiscountShop: activeCrazyDiscountShopsList.length,
                // crazyDiscountShops: activeCrazyDiscountShopsList.slice(0, 5),
                // totalFreeDeliveryShops: activeFreeDeliveryShopsList.length,
                // freeDeliveryShops: activeFreeDeliveryShopsList.slice(0, 5),
                // totalFeaturedShops: featuredShops.length,
                // featuredShops: featuredShops.slice(0, 5),
                // totalPastOrdersShops: pastOrderShops.length,
                // pastOrdersShops: pastOrderShops.slice(0, 5),
                // totalAllNearShops: nearShops.length,
                // allNearShops: nearShops.slice(0, 5),
                allShops: finalShopList,
                paginate,
                listContainer,
                tagsCuisines,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getfilterDataForUser = async (req, res) => {
    try {
        let deals = await DealModel.find({ status: 'active' }).populate(
            'shopId shop'
        );
        let maxpriceProduct = await ProductModel.find({
            productVisibility: true,
            status: 'active',
        })
            .sort({ price: -1 })
            .limit(1);
        let maxDeliveryCharge = await ProductModel.find({
            productVisibility: true,
            status: 'active',
        })
            .sort({ deliveryCharge: -1 })
            .limit(1);
        let tags = await TagModel.aggregate([
            {
                $sample: {
                    size: 10,
                },
            },
            {
                $group: {
                    _id: '$_id',
                    result: { $push: '$$ROOT' },
                },
            },
            {
                $replaceRoot: {
                    newRoot: { $first: '$result' },
                },
            },
        ]);

        const maxPrice = maxpriceProduct[0].price;
        const maxDelivery = maxDeliveryCharge[0].deliveryCharge;

        successResponse(res, {
            data: {
                deals,
                tags,
                maxPrice,
                maxDelivery,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getHomeApiFilterHelper = async (req, res) => {
    try {
        const { type, latitude, longitude } = req.query;

        const dealConfig = { status: 'active' };

        if (type && ['pharmacy', 'grocery', 'restaurant'].includes(type)) {
            dealConfig.shopType = type === 'restaurant' ? 'food' : type;
        }
        let deals = await FilterContainerModel.find(dealConfig).sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);


      
        
        const productConfig = {
            status: 'active',
            productVisibility: true,
        };

        if (type && ['pharmacy', 'grocery', 'restaurant'].includes(type)) {
            if (type === 'restaurant') {
                productConfig.type = 'food';
            } else {
                productConfig.type = type;
            }
        }

        let maxPriceProduct = await ProductModel.find(productConfig)
            .sort({ price: -1 })
            .limit(1);
        let minPriceProduct = await ProductModel.find(productConfig)
            .sort({ price: 1 })
            .limit(1);

        // let maxDeliveryCharge = await ProductModel.find().sort({ 'deliveryCharge': -1 }).limit(1)

        const tagsConfig = {
            shopStatus: 'active',
        };

        if (type && ['pharmacy', 'grocery', 'restaurant'].includes(type)) {
            if (type === 'restaurant') {
                tagsConfig.shopType = 'food';
            } else {
                tagsConfig.shopType = type;
            }
        }
       
        let tags = await TagCuisineModel.find({
            type: 'tag',
            shopType: type === 'restaurant' ? 'food' : type,
            status: 'active',
        })
            .sort({ sortingOrder: 'asc' })
           
            
          

        let newTags = await ShopModel.find(tagsConfig).distinct('tags');


      

        let cuisines = [];

        if (type === 'restaurant' || type === 'all') {
            let allShops = await ShopModel.find().populate('cuisineType');

            let newCuisine = [];
            for (const shop of allShops) {
                if (shop.cuisineType.length > 0) {
                    for (const cuisineItem of shop.cuisineType) {
                        newCuisine.push({
                            ...cuisineItem._doc,
                        });
                    }
                }
            }

            const newcuisineTypeIds = newCuisine.map(item =>
                item._id.toString()
            );
            const newcuisineTypeList = [...new Set(newcuisineTypeIds)];

            cuisines = await TagCuisineModel.find({
                _id: {
                    $in: newcuisineTypeList,
                },
                status: 'active',
            });
        }

        const globalDropCharge = await GlobalDropCharge.findOne({});
        const deliveryRange = globalDropCharge.deliveryRange;
        const maxDeliveryFee = deliveryRange[deliveryRange.length - 1];

        successResponse(res, {
            data: {
                deals,
                tags: newTags,
                cuisines,
                productPrice: {
                    maxPrice:
                        maxPriceProduct.length > 0
                            ? maxPriceProduct[0].price
                            : 0,
                    minPrice:
                        minPriceProduct.length > 0
                            ? minPriceProduct[0].price
                            : 0,
                },
                deliveryCharge: maxDeliveryFee.charge,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getAllShopsForMapView = async (req, res) => {
    try {
        const { longitude, latitude } = req.query;
        const plusUser = req.plusUser;

        if (!latitude && !longitude)
            return errorResponse(res, 'Longitude and latitude is required!');

        const appSetting = await AppSetting.findOne().select('nearByShopKm');
        const km = appSetting?.nearByShopKm || 1;
        const maxDistanceInMeters = 1000 * km;

        let config = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            shopStatus: 'active',
            deletedAt: null,
        };

        const shops = await ShopModel.find(config)
            .sort({ createdAt: 'desc' })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'marketings',
                },
            ]);

        for (const shop of shops) {
            const deliveryFee = await getDeliveryCharge(
                shop,
                latitude,
                longitude,
                plusUser
            );
            shop._doc.deliveryFee = deliveryFee;

            const isShopOpen = checkShopOpeningHours(shop);
            shop._doc.isShopOpen = isShopOpen;

            // const avgOrderDeliveryTime = await shopAvgDeliveryTime(shop._id);
            // shop._doc.avgOrderDeliveryTime = avgOrderDeliveryTime;

            if (!plusUser) {
                await checkPlusUserMarketing(shop);
            }
        }

        successResponse(res, {
            message: 'success',
            data: {
                shops,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getFreeDeliveryShops = async (req, res) => {
    try {
        const plusUser = req.plusUser;
        const {
            page = 1,
            pageSize = 50,
            longitude,
            latitude,
            listContainers,
            deals,
            mixProductPrice,
            tags,
            cuisineIds,
            dietaries,
            priceSort,
            ratingSort,
            deliveryTimeSort,
        } = req.query;

        if (plusUser) {
            return successResponse(res, {
                message: 'success',
                data: {
                    shops: [],
                },
            });
        }

        if (!latitude && !longitude)
            return errorResponse(res, 'Longitude and latitude is required!');

        const appSetting = await AppSetting.findOne().select('nearByShopKm');
        const km = appSetting?.nearByShopKm || 1;
        const maxDistanceInMeters = 1000 * km;

        let sort = shopCommonSorting;
        if (['asc', 'desc'].includes(priceSort)) {
            sort = {
                expensive: priceSort,
            };
        }

        if (ratingSort == 'yes') {
            sort = {
                rating: 'desc',
            };
        }

        let config = {
            _id: {
                $in: await findNearestShopIdsForEachBrand(
                    longitude,
                    latitude,
                    maxDistanceInMeters
                ),
            }, //TODO: need to test
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            deletedAt: null,
            marketings: {
                $elemMatch: {
                    $exists: true,
                },
            },
            freeDelivery: true,
        };

        if (listContainers?.length >= 3 || deals?.length >= 3) {
            let shopTypeList = [];

            const processDeals = async (dealType, model) => {
                if (dealType?.length >= 3) {
                    const listOfDeals = JSON.parse(dealType);
                    const dealsShopTypeList = await model
                        .find({ _id: { $in: listOfDeals } })
                        .distinct('shopType');
                    shopTypeList.push(...dealsShopTypeList);
                }
            };

            await Promise.all([
                processDeals(listContainers, ListContainerModel),
                processDeals(deals, FilterContainerModel),
            ]);

            config = {
                ...config,
                shopType: { $in: shopTypeList },
            };
        }

        if (mixProductPrice?.length >= 3) {
            const listOfExpensive = JSON.parse(mixProductPrice);

            config.expensive = {
                $in: listOfExpensive,
            };
        }

        if (tags?.length >= 3) {
            const listOfTags = JSON.parse(tags);

            config.tags = {
                $in: listOfTags,
            };
        }

        if (cuisineIds?.length >= 3) {
            const cuisineListIds = JSON.parse(cuisineIds);

            config.cuisineType = {
                $in: cuisineListIds,
            };
        }

        if (dietaries?.length >= 3) {
            const dietaryList = JSON.parse(dietaries);

            config.dietary = {
                $in: dietaryList,
            };
        }

        const shops = await ShopModel.find(config)
            .sort(sort)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'marketings',
                },
            ]);

        let newShops = [];

        for (const shop of shops) {
            const findFreeDelivery = shop.marketings.find(
                marketing =>
                    ['free_delivery'].includes(marketing.type) &&
                    marketing.isActive
            );

            if (findFreeDelivery) {
                if (!plusUser) {
                    await checkPlusUserMarketing(shop);
                }

                singleShop._doc.deliveryFee = 0
                newShops.push(singleShop)
            }
        }

        if (deals?.length >= 3) {
            const listOfDeals = JSON.parse(deals);

            const dealsList = await FilterContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let isDoubleDeal = false;
            let isFreeDelivery = false;
            let percentageDeals = [];

            for (const deal of dealsList) {
                isDoubleDeal = deal?.deals?.includes('double_menu');
                isFreeDelivery = deal?.deals?.includes('free_delivery');
                percentageDeals = deal?.deals?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );
            }

            let doubleDealShops = [];
            let freeDeliveryShops = [];
            let percentageDealShops = [];

            if (isDoubleDeal) {
                doubleDealShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );
            }

            if (isFreeDelivery) {
                freeDeliveryShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );
            }

            if (percentageDeals.length > 0) {
                percentageDealShops = newShops.filter(shop =>
                    shop.marketings.some(marketing => {
                        if (
                            marketing.type === 'percentage' &&
                            marketing.isActive
                        ) {
                            const marketingDiscounts =
                                marketing.discountPercentages.map(String);
                            return percentageDeals.some(discount =>
                                marketingDiscounts.includes(discount)
                            );
                        }
                    })
                );
            }

            const newShopList = [
                ...doubleDealShops,
                ...freeDeliveryShops,
                ...percentageDealShops,
            ];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (listContainers?.length >= 3) {
            const listOfDeals = JSON.parse(listContainers);

            const dealsList = await ListContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let dealsArr = [];
            let tagsArr = [];
            let shopsArr = [];

            for (const deal of dealsList) {
                if (deal.type.includes('deal')) {
                    dealsArr = [...dealsArr, ...deal.deals];
                }
                if (deal.type.includes('tag')) {
                    tagsArr = [...tagsArr, ...deal.tags];
                }
                if (deal.type.includes('shop')) {
                    shopsArr = [...shopsArr, ...deal.shops];
                }
            }

            let dealsShop = [];
            let tagsShop = [];
            let shopsShop = [];

            if (shopsArr.length > 0) {
                shopsArr = [...new Set(shopsArr)];

                const shopsArrString = shopsArr?.map(id => id.toString());

                shopsShop = newShops.filter(shop =>
                    shopsArrString.includes(shop?._id?.toString())
                );
            }

            if (dealsArr.length > 0) {
                dealsArr = [...new Set(dealsArr)];

                let isDoubleDeal = dealsArr?.includes('double_menu');
                let isFreeDelivery = dealsArr?.includes('free_delivery');
                let percentageDeals = dealsArr?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );

                if (isDoubleDeal) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'double_menu' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (isFreeDelivery) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (percentageDeals.length > 0) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(marketing => {
                            if (
                                marketing.type === 'percentage' &&
                                marketing.isActive
                            ) {
                                const marketingDiscounts =
                                    marketing.discountPercentages.map(String);

                                return percentageDeals.some(discount =>
                                    marketingDiscounts.includes(discount)
                                );
                            }
                        })
                    );

                    dealsShop = [...dealsShop, ...list];
                }
            }

            if (tagsArr.length > 0) {
                tagsArr = [...new Set(tagsArr)];

                const tagsArrString = tagsArr?.map(id => id.toString());

                const tagsList = newShops.filter(shop =>
                    shop.tagsId.some(tag =>
                        tagsArrString.includes(tag?._id?.toString())
                    )
                );
                const cuisineList = newShops.filter(shop =>
                    shop.cuisineType.some(cuisine =>
                        tagsArrString.includes(cuisine?._id?.toString())
                    )
                );

                tagsShop = [...tagsList, ...cuisineList];
            }

            const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (deliveryTimeSort == 'yes') {
            // for (const shop of newShops) {
            //     let shopDistance = await getDistance(
            //         latitude,
            //         longitude,
            //         shop.location?.coordinates[1],
            //         shop.location?.coordinates[0],
            //         'k'
            //     );

            //     if (!shopDistance) {
            //         shopDistance = 1;
            //     }

            //     shop.shopDistance = shopDistance;
            // }

            newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20) - (b.avgOrderDeliveryTime || 20));
        }

        // Open shop need to show top and then closed shop
        const openShops = newShops
            .map(shop => {
                shop._doc.isShopOpen = checkShopOpeningHours(shop)
                return shop
            })
            .reduce(
                (accumulator, currentShop) => {
                    if (
                        currentShop._doc.liveStatus === 'online' &&
                        currentShop._doc.isShopOpen
                    ) {
                        accumulator[0].push(currentShop);
                    } else {
                        accumulator[1].push(currentShop);
                    }
                    return accumulator;
                },
                [[], []]
            );

        const finalShops = [...openShops[0], ...openShops[1]];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalShops.length,
            pagingRange: 5,
        });

        const list = finalShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // for (const shop of list) {
        //     const isShopOpen = checkShopOpeningHours(shop);
        //     shop.isShopOpen = isShopOpen;
        // }

        successResponse(res, {
            message: 'success',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOfferShops = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            longitude,
            latitude,
            listContainers,
            deals,
            mixProductPrice,
            tags,
            cuisineIds,
            dietaries,
            priceSort,
            ratingSort,
            deliveryTimeSort,
            maxDeliveryFee,
        } = req.query;
        const plusUser = req.plusUser;

        if (!latitude && !longitude)
            return errorResponse(res, 'Longitude and latitude is required!');

        const appSetting = await AppSetting.findOne().select('nearByShopKm');
        const km = appSetting?.nearByShopKm || 1;
        const maxDistanceInMeters = 1000 * km;

        let sort = shopCommonSorting;
        if (['asc', 'desc'].includes(priceSort)) {
            sort = {
                expensive: priceSort,
            };
        }

        if (ratingSort == 'yes') {
            sort = {
                rating: 'desc',
            };
        }

        let config = {
            _id: {
                $in: await findNearestShopIdsForEachBrand(
                    longitude,
                    latitude,
                    maxDistanceInMeters
                ),
            }, //TODO: need to test
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            deletedAt: null,
            marketings: {
                $elemMatch: {
                    $exists: true,
                },
            },
        };

        if (listContainers?.length >= 3 || deals?.length >= 3) {
            let shopTypeList = [];

            const processDeals = async (dealType, model) => {
                if (dealType?.length >= 3) {
                    const listOfDeals = JSON.parse(dealType);
                    const dealsShopTypeList = await model
                        .find({ _id: { $in: listOfDeals } })
                        .distinct('shopType');
                    shopTypeList.push(...dealsShopTypeList);
                }
            };

            await Promise.all([
                processDeals(listContainers, ListContainerModel),
                processDeals(deals, FilterContainerModel),
            ]);

            config = {
                ...config,
                shopType: { $in: shopTypeList },
            };
        }

        if (mixProductPrice?.length >= 3) {
            const listOfExpensive = JSON.parse(mixProductPrice);

            config.expensive = {
                $in: listOfExpensive,
            };
        }

        if (tags?.length >= 3) {
            const listOfTags = JSON.parse(tags);

            config.tags = {
                $in: listOfTags,
            };
        }

        if (cuisineIds?.length >= 3) {
            const cuisineListIds = JSON.parse(cuisineIds);

            config.cuisineType = {
                $in: cuisineListIds,
            };
        }

        if (dietaries?.length >= 3) {
            const dietaryList = JSON.parse(dietaries);

            config.dietary = {
                $in: dietaryList,
            };
        }

        const shops = await ShopModel.find(config)
            .sort(sort)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'marketings',
                },
            ]);

        const offerShopsList = [];

        for (const shop of shops) {
            const findOffer = shop.marketings.find(
                marketing =>
                    ['percentage', 'double_menu', 'reward'].includes(
                        marketing.type
                    ) &&
                    marketing.isActive &&
                    !marketing.onlyForSubscriber
            );

            if (findOffer) {
                offerShopsList.push(shop);
            }
        }

        let newShops = [];
        if (maxDeliveryFee == 0) {
            for (const singleShop of offerShopsList) {
                let result = false;
                if (singleShop.freeDelivery) {
                    result = singleShop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    );
                }

                if (result) {
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }
                    singleShop._doc.deliveryFee = 0
                    newShops.push(singleShop)
                }
            }
        } else if (maxDeliveryFee > 0) {
            for (const singleShop of offerShopsList) {
                const result = await getShopByDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    maxDeliveryFee
                );

                if (result === true) {
                    let deliveryFee = await getDeliveryCharge(
                        singleShop,
                        latitude,
                        longitude,
                        plusUser
                    );
                    // console.log(deliveryFee);
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }

                    singleShop._doc.deliveryFee = deliveryFee
                    newShops.push(singleShop)
                }
            }
        } else {
            for (const singleShop of offerShopsList) {
                let deliveryFee = await getDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    plusUser
                );

                if (!plusUser) {
                    await checkPlusUserMarketing(singleShop);
                }

                singleShop._doc.deliveryFee = deliveryFee
                newShops.push(singleShop)
            }
        }
        if (deals?.length >= 3) {
            const listOfDeals = JSON.parse(deals);

            const dealsList = await FilterContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let isDoubleDeal = false;
            let isFreeDelivery = false;
            let percentageDeals = [];

            for (const deal of dealsList) {
                isDoubleDeal = deal?.deals?.includes('double_menu');
                isFreeDelivery = deal?.deals?.includes('free_delivery');
                percentageDeals = deal?.deals?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );
            }

            let doubleDealShops = [];
            let freeDeliveryShops = [];
            let percentageDealShops = [];

            if (isDoubleDeal) {
                doubleDealShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );
            }

            if (isFreeDelivery) {
                freeDeliveryShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );
            }

            if (percentageDeals.length > 0) {
                percentageDealShops = newShops.filter(shop =>
                    shop.marketings.some(marketing => {
                        if (
                            marketing.type === 'percentage' &&
                            marketing.isActive
                        ) {
                            const marketingDiscounts =
                                marketing.discountPercentages.map(String);
                            return percentageDeals.some(discount =>
                                marketingDiscounts.includes(discount)
                            );
                        }
                    })
                );
            }

            const newShopList = [
                ...doubleDealShops,
                ...freeDeliveryShops,
                ...percentageDealShops,
            ];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (listContainers?.length >= 3) {
            const listOfDeals = JSON.parse(listContainers);

            const dealsList = await ListContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let dealsArr = [];
            let tagsArr = [];
            let shopsArr = [];

            for (const deal of dealsList) {
                if (deal.type.includes('deal')) {
                    dealsArr = [...dealsArr, ...deal.deals];
                }
                if (deal.type.includes('tag')) {
                    tagsArr = [...tagsArr, ...deal.tags];
                }
                if (deal.type.includes('shop')) {
                    shopsArr = [...shopsArr, ...deal.shops];
                }
            }

            let dealsShop = [];
            let tagsShop = [];
            let shopsShop = [];

            if (shopsArr.length > 0) {
                shopsArr = [...new Set(shopsArr)];

                const shopsArrString = shopsArr?.map(id => id.toString());

                shopsShop = newShops.filter(shop =>
                    shopsArrString.includes(shop?._id?.toString())
                );
            }

            if (dealsArr.length > 0) {
                dealsArr = [...new Set(dealsArr)];

                let isDoubleDeal = dealsArr?.includes('double_menu');
                let isFreeDelivery = dealsArr?.includes('free_delivery');
                let percentageDeals = dealsArr?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );

                if (isDoubleDeal) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'double_menu' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (isFreeDelivery) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (percentageDeals.length > 0) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(marketing => {
                            if (
                                marketing.type === 'percentage' &&
                                marketing.isActive
                            ) {
                                const marketingDiscounts =
                                    marketing.discountPercentages.map(String);

                                return percentageDeals.some(discount =>
                                    marketingDiscounts.includes(discount)
                                );
                            }
                        })
                    );

                    dealsShop = [...dealsShop, ...list];
                }
            }

            if (tagsArr.length > 0) {
                tagsArr = [...new Set(tagsArr)];

                const tagsArrString = tagsArr?.map(id => id.toString());

                const tagsList = newShops.filter(shop =>
                    shop.tagsId.some(tag =>
                        tagsArrString.includes(tag?._id?.toString())
                    )
                );
                const cuisineList = newShops.filter(shop =>
                    shop.cuisineType.some(cuisine =>
                        tagsArrString.includes(cuisine?._id?.toString())
                    )
                );

                tagsShop = [...tagsList, ...cuisineList];
            }

            const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (deliveryTimeSort == 'yes') {
            for (const shop of newShops) {
                let shopDistance = await getDistance(
                    latitude,
                    longitude,
                    shop.location?.coordinates[1],
                    shop.location?.coordinates[0],
                    'k'
                );

                if (!shopDistance) {
                    shopDistance = 1;
                }

                shop.shopDistance = shopDistance;
            }

            newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20)  - (b.avgOrderDeliveryTime || 20));
            
        }

        // Open shop need to show top and then closed shop
        const openShops = newShops
            .map(shop => {
                shop._doc.isShopOpen = checkShopOpeningHours(shop)
                return shop
            })
            .reduce(
                (accumulator, currentShop) => {
                    if (
                        currentShop._doc.liveStatus === 'online' &&
                        currentShop._doc.isShopOpen
                    ) {
                        accumulator[0].push(currentShop);
                    } else {
                        accumulator[1].push(currentShop);
                    }
                    return accumulator;
                },
                [[], []]
            );

        const finalShops = [...openShops[0], ...openShops[1]];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalShops.length,
            pagingRange: 5,
        });

        const list = finalShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // for (const shop of list) {
        //     const isShopOpen = checkShopOpeningHours(shop);
        //     shop.isShopOpen = isShopOpen;
        // }

        successResponse(res, {
            message: 'success',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getCrazyOfferShops = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            longitude,
            latitude,
            listContainers,
            deals,
            mixProductPrice,
            tags,
            cuisineIds,
            dietaries,
            priceSort,
            ratingSort,
            deliveryTimeSort,
            maxDeliveryFee,
        } = req.query;
        const plusUser = req.plusUser;

        if (!plusUser) {
            return successResponse(res, {
                message: 'success',
                data: {
                    shops: [],
                },
            });
        }

        if (!latitude && !longitude)
            return errorResponse(res, 'Longitude and latitude is required!');

        const appSetting = await AppSetting.findOne().select('nearByShopKm');
        const km = appSetting?.nearByShopKm || 1;
        const maxDistanceInMeters = 1000 * km;

        let sort = shopCommonSorting;
        if (['asc', 'desc'].includes(priceSort)) {
            sort = {
                expensive: priceSort,
            };
        }

        if (ratingSort == 'yes') {
            sort = {
                rating: 'desc',
            };
        }

        let config = {
            _id: {
                $in: await findNearestShopIdsForEachBrand(
                    longitude,
                    latitude,
                    maxDistanceInMeters
                ),
            }, //TODO: need to test
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            deletedAt: null,
            marketings: {
                $elemMatch: {
                    $exists: true,
                },
            },
        };

        if (listContainers?.length >= 3 || deals?.length >= 3) {
            let shopTypeList = [];

            const processDeals = async (dealType, model) => {
                if (dealType?.length >= 3) {
                    const listOfDeals = JSON.parse(dealType);
                    const dealsShopTypeList = await model
                        .find({ _id: { $in: listOfDeals } })
                        .distinct('shopType');
                    shopTypeList.push(...dealsShopTypeList);
                }
            };

            await Promise.all([
                processDeals(listContainers, ListContainerModel),
                processDeals(deals, FilterContainerModel),
            ]);

            config = {
                ...config,
                shopType: { $in: shopTypeList },
            };
        }

        if (mixProductPrice?.length >= 3) {
            const listOfExpensive = JSON.parse(mixProductPrice);

            config.expensive = {
                $in: listOfExpensive,
            };
        }

        if (tags?.length >= 3) {
            const listOfTags = JSON.parse(tags);

            config.tags = {
                $in: listOfTags,
            };
        }

        if (cuisineIds?.length >= 3) {
            const cuisineListIds = JSON.parse(cuisineIds);

            config.cuisineType = {
                $in: cuisineListIds,
            };
        }

        if (dietaries?.length >= 3) {
            const dietaryList = JSON.parse(dietaries);

            config.dietary = {
                $in: dietaryList,
            };
        }

        const shops = await ShopModel.find(config)
            .sort(sort)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'marketings',
                },
            ]);

        const offerShopsList = [];

        for (const shop of shops) {
            const findOffer = shop.marketings.find(
                marketing =>
                    ['percentage', 'double_menu'].includes(marketing.type) &&
                    marketing.isActive &&
                    marketing.onlyForSubscriber
            );

            if (findOffer) {
                offerShopsList.push(shop);
            }
        }

        let newShops = [];
        if (maxDeliveryFee == 0) {
            for (const singleShop of offerShopsList) {
                let result = false;
                if (singleShop.freeDelivery) {
                    result = singleShop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    );
                }

                if (result) {
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }
                    singleShop._doc.deliveryFee = 0
                    newShops.push(singleShop)
                }
            }
        } else if (maxDeliveryFee > 0) {
            for (const singleShop of offerShopsList) {
                const result = await getShopByDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    maxDeliveryFee
                );

                if (result === true) {
                    let deliveryFee = await getDeliveryCharge(
                        singleShop,
                        latitude,
                        longitude,
                        plusUser
                    );
                    // console.log(deliveryFee);
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }

                    singleShop._doc.deliveryFee = deliveryFee
                    newShops.push(singleShop)
                }
            }
        } else {
            for (const singleShop of offerShopsList) {
                let deliveryFee = await getDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    plusUser
                );

                if (!plusUser) {
                    await checkPlusUserMarketing(singleShop);
                }

                singleShop._doc.deliveryFee = deliveryFee
                newShops.push(singleShop)
            }
        }

        if (deals?.length >= 3) {
            const listOfDeals = JSON.parse(deals);

            const dealsList = await FilterContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let isDoubleDeal = false;
            let isFreeDelivery = false;
            let percentageDeals = [];

            for (const deal of dealsList) {
                isDoubleDeal = deal?.deals?.includes('double_menu');
                isFreeDelivery = deal?.deals?.includes('free_delivery');
                percentageDeals = deal?.deals?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );
            }

            let doubleDealShops = [];
            let freeDeliveryShops = [];
            let percentageDealShops = [];

            if (isDoubleDeal) {
                doubleDealShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );
            }

            if (isFreeDelivery) {
                freeDeliveryShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );
            }

            if (percentageDeals.length > 0) {
                percentageDealShops = newShops.filter(shop =>
                    shop.marketings.some(marketing => {
                        if (
                            marketing.type === 'percentage' &&
                            marketing.isActive
                        ) {
                            const marketingDiscounts =
                                marketing.discountPercentages.map(String);
                            return percentageDeals.some(discount =>
                                marketingDiscounts.includes(discount)
                            );
                        }
                    })
                );
            }

            const newShopList = [
                ...doubleDealShops,
                ...freeDeliveryShops,
                ...percentageDealShops,
            ];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (listContainers?.length >= 3) {
            const listOfDeals = JSON.parse(listContainers);

            const dealsList = await ListContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let dealsArr = [];
            let tagsArr = [];
            let shopsArr = [];

            for (const deal of dealsList) {
                if (deal.type.includes('deal')) {
                    dealsArr = [...dealsArr, ...deal.deals];
                }
                if (deal.type.includes('tag')) {
                    tagsArr = [...tagsArr, ...deal.tags];
                }
                if (deal.type.includes('shop')) {
                    shopsArr = [...shopsArr, ...deal.shops];
                }
            }

            let dealsShop = [];
            let tagsShop = [];
            let shopsShop = [];

            if (shopsArr.length > 0) {
                shopsArr = [...new Set(shopsArr)];

                const shopsArrString = shopsArr?.map(id => id.toString());

                shopsShop = newShops.filter(shop =>
                    shopsArrString.includes(shop?._id?.toString())
                );
            }

            if (dealsArr.length > 0) {
                dealsArr = [...new Set(dealsArr)];

                let isDoubleDeal = dealsArr?.includes('double_menu');
                let isFreeDelivery = dealsArr?.includes('free_delivery');
                let percentageDeals = dealsArr?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );

                if (isDoubleDeal) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'double_menu' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (isFreeDelivery) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (percentageDeals.length > 0) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(marketing => {
                            if (
                                marketing.type === 'percentage' &&
                                marketing.isActive
                            ) {
                                const marketingDiscounts =
                                    marketing.discountPercentages.map(String);

                                return percentageDeals.some(discount =>
                                    marketingDiscounts.includes(discount)
                                );
                            }
                        })
                    );

                    dealsShop = [...dealsShop, ...list];
                }
            }

            if (tagsArr.length > 0) {
                tagsArr = [...new Set(tagsArr)];

                const tagsArrString = tagsArr?.map(id => id.toString());

                const tagsList = newShops.filter(shop =>
                    shop.tagsId.some(tag =>
                        tagsArrString.includes(tag?._id?.toString())
                    )
                );
                const cuisineList = newShops.filter(shop =>
                    shop.cuisineType.some(cuisine =>
                        tagsArrString.includes(cuisine?._id?.toString())
                    )
                );

                tagsShop = [...tagsList, ...cuisineList];
            }

            const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (deliveryTimeSort == 'yes') {
            // for (const shop of newShops) {
            //     let shopDistance = await getDistance(
            //         latitude,
            //         longitude,
            //         shop.location?.coordinates[1],
            //         shop.location?.coordinates[0],
            //         'k'
            //     );

            //     if (!shopDistance) {
            //         shopDistance = 1;
            //     }

            //     shop.shopDistance = shopDistance;
            // }

            newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20) - (b.avgOrderDeliveryTime || 20));

        }

        // Open shop need to show top and then closed shop
        const openShops = newShops
            .map(shop => {
                shop._doc.isShopOpen = checkShopOpeningHours(shop)
                return shop
            })
            .reduce(
                (accumulator, currentShop) => {
                    if (
                        currentShop._doc.liveStatus === 'online' &&
                        currentShop._doc.isShopOpen
                    ) {
                        accumulator[0].push(currentShop);
                    } else {
                        accumulator[1].push(currentShop);
                    }
                    return accumulator;
                },
                [[], []]
            );

        const finalShops = [...openShops[0], ...openShops[1]];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalShops.length,
            pagingRange: 5,
        });

        const list = finalShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // for (const shop of list) {
        //     const isShopOpen = checkShopOpeningHours(shop);
        //     shop.isShopOpen = isShopOpen;
        // }

        successResponse(res, {
            message: 'success',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOfferShopsByShopType = async (req, res) => {
    try {
        const plusUser = req.plusUser;
        const { searchKey, longitude, latitude } = req.query;

        if (!latitude && !longitude)
            return errorResponse(res, 'Longitude and latitude is required!');

        const appSetting = await AppSetting.findOne().select('nearByShopKm');
        const km = appSetting?.nearByShopKm || 1;
        const maxDistanceInMeters = 1000 * km;

        let locationRange = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
        };

        let whereConfig = {
            shopStatus: 'active',
            deletedAt: null,
            marketings: {
                $elemMatch: {
                    $exists: true,
                },
            },
        };

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const nameSearchQuery = newQuery.map(str => ({
                shopName: RegExp(str, 'i'),
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

        const foodShops = await ShopModel.find({
            shopType: 'food',
            ...whereConfig,
            ...locationRange,
        })
            .sort({ createdAt: 'desc' })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'marketings',
                },
            ]);

        let newFoodShops = [];
        for (let shop of foodShops) {
            const findOffer = shop.marketings.find(
                marketing =>
                    [
                        'percentage',
                        'double_menu',
                        'free_delivery',
                        'reward',
                    ].includes(marketing.type) && marketing.isActive
            );

            if (findOffer) {
                let deliveryFee = await getDeliveryCharge(
                    shop,
                    latitude,
                    longitude,
                    plusUser
                );
                const isShopOpen = checkShopOpeningHours(shop);

                if (!plusUser) {
                    await checkPlusUserMarketing(shop);
                }

                newFoodShops.push({
                    ...shop._doc,
                    deliveryFee: deliveryFee,
                    isShopOpen,
                });
            }
        }

        const groceryShops = await ShopModel.find({
            shopType: 'grocery',
            ...whereConfig,
            ...locationRange,
        })
            .sort({ createdAt: 'desc' })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'marketings',
                },
            ]);

        let newGroceryShops = [];
        for (let shop of groceryShops) {
            const findOffer = shop.marketings.find(
                marketing =>
                    [
                        'percentage',
                        'double_menu',
                        'free_delivery',
                        'reward',
                    ].includes(marketing.type) && marketing.isActive
            );

            if (findOffer) {
                let deliveryFee = await getDeliveryCharge(
                    shop,
                    latitude,
                    longitude,
                    plusUser
                );
                const isShopOpen = checkShopOpeningHours(shop);

                if (!plusUser) {
                    await checkPlusUserMarketing(shop);
                }

                newGroceryShops.push({
                    ...shop._doc,
                    deliveryFee: deliveryFee,
                    isShopOpen,
                });
            }
        }

        const pharmacyShops = await ShopModel.find({
            shopType: 'pharmacy',
            ...whereConfig,
            ...locationRange,
        })
            .sort({ createdAt: 'desc' })
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'marketings',
                },
            ]);

        let newPharmacyShops = [];
        for (let shop of pharmacyShops) {
            const findOffer = shop.marketings.find(
                marketing =>
                    [
                        'percentage',
                        'double_menu',
                        'free_delivery',
                        'reward',
                    ].includes(marketing.type) && marketing.isActive
            );

            if (findOffer) {
                let deliveryFee = await getDeliveryCharge(
                    shop,
                    latitude,
                    longitude,
                    plusUser
                );
                const isShopOpen = checkShopOpeningHours(shop);

                if (!plusUser) {
                    await checkPlusUserMarketing(shop);
                }

                newPharmacyShops.push({
                    ...shop._doc,
                    deliveryFee: deliveryFee,
                    isShopOpen,
                });
            }
        }

        const data = [
            {
                title: 'Food',
                data: newFoodShops,
            },
            {
                title: 'Grocery',
                data: newGroceryShops,
            },
            {
                title: 'Pharmacy',
                data: newPharmacyShops,
            },
        ];

        successResponse(res, {
            message: 'success',
            data: {
                offerShops: data,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getOfferItems = async (req, res) => {
    try {
        const { searchKey, delivery, type, longitude, latitude } = req.query;

        const limit = 20;

        const appSetting = await AppSetting.findOne({}).select('nearByShopKm');
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let locationRange = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
        };

        var whereConfig = {
            deletedAt: null,
        };

        // delivery
        if (delivery && ['drop', 'pickup'].includes(delivery)) {
            whereConfig.delivery = delivery;
        }

        let data = [];

        if (type === 'shop') {
            if (searchKey) {
                const newQuery = searchKey.split(/[ ,]+/);
                const nameSearchQuery = newQuery.map(str => ({
                    shopName: RegExp(str, 'i'),
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
            // deals getter then one
            const foodShops = await ShopModel.find({
                ...whereConfig,
                ...locationRange,
            })
                .populate('marketings')
                .limit(limit);
            // .aggregate([
            //     {
            //         $match: {
            //             ...whereConfig,
            //             shopStatus: 'active',
            //             shopType: 'food',
            //             deals: {
            //                 $exists: true,
            //                 $not: { $size: 0 },
            //             },
            //         },
            //     },
            //     // { $sample: { size: 10 } },
            //     {
            //         $project: {
            //             cuisineType: 0,
            //             categories: 0,
            //             banner: 0,
            //         },
            //     },
            //     { $limit: limit },
            // ]);
            // await DealModel.populate(foodShops, { path: 'deals' });

            const groceryShops = await ShopModel.find({
                ...whereConfig,
                ...locationRange,
            })
                .populate('marketings')
                .limit(limit);
            // .aggregate([
            //     {
            //         $match: {
            //             ...whereConfig,
            //             shopStatus: 'active',
            //             shopType: 'grocery',
            //             deals: {
            //                 $exists: true,
            //                 $not: { $size: 0 },
            //             },
            //         },
            //     },
            //     // { $sample: { size: 10 } },
            //     {
            //         $project: {
            //             cuisineType: 0,
            //             categories: 0,
            //             banner: 0,
            //         },
            //     },
            //     { $limit: limit },
            // ]);
            // await DealModel.populate(groceryShops, { path: 'deals' });

            const pharmacyShops = await ShopModel.find({
                ...whereConfig,
                ...locationRange,
            })
                .populate('marketings')
                .limit(limit);
            // .aggregate([
            //     {
            //         $match: {
            //             ...whereConfig,
            //             shopStatus: 'active',
            //             shopType: 'pharmacy',
            //             deals: {
            //                 $exists: true,
            //                 $not: { $size: 0 },
            //             },
            //         },
            //     },
            //     // { $sample: { size: 10 } },
            //     {
            //         $project: {
            //             cuisineType: 0,
            //             categories: 0,
            //             banner: 0,
            //         },
            //     },
            //     { $limit: limit },
            // ]);
            // await DealModel.populate(pharmacyShops, { path: 'deals' });

            data = [
                {
                    title: 'Food',
                    data: foodShops,
                },
                {
                    title: 'Grocery',
                    data: groceryShops,
                },
                {
                    title: 'Pharmacy',
                    data: pharmacyShops,
                },
            ];
        }

        if (type === 'product') {
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

            const foodProducts = await ProductModel.aggregate([
                {
                    $match: {
                        ...whereConfig,
                        productVisibility: true,
                        status: 'active',
                        type: 'food',
                        deals: {
                            $exists: true,
                            $not: { $size: 0 },
                        },
                    },
                },
                // { $sample: { size: 10 } },
                {
                    $project: {
                        cuisineType: 0,
                        categories: 0,
                        banner: 0,
                    },
                },
                { $limit: limit },
            ]);
            await DealModel.populate(foodProducts, { path: 'deals' });

            const groceryProducts = await ProductModel.aggregate([
                {
                    $match: {
                        ...whereConfig,
                        productVisibility: true,
                        status: 'active',
                        type: 'grocery',
                        deals: {
                            $exists: true,
                            $not: { $size: 0 },
                        },
                    },
                },
                // { $sample: { size: 10 } },
                {
                    $project: {
                        cuisineType: 0,
                        categories: 0,
                        banner: 0,
                    },
                },
                { $limit: limit },
            ]);
            await DealModel.populate(groceryProducts, { path: 'deals' });

            const pharmacyProducts = await ProductModel.aggregate([
                {
                    $match: {
                        ...whereConfig,
                        productVisibility: true,
                        status: 'active',
                        type: 'pharmacy',
                        deals: {
                            $exists: true,
                            $not: { $size: 0 },
                        },
                    },
                },
                // { $sample: { size: 10 } },
                {
                    $project: {
                        cuisineType: 0,
                        categories: 0,
                        banner: 0,
                    },
                },
                { $limit: limit },
            ]);
            await DealModel.populate(pharmacyProducts, { path: 'deals' });

            data = [
                {
                    title: 'Food',
                    data: foodProducts,
                },
                {
                    title: 'Grocery',
                    data: groceryProducts,
                },
                {
                    title: 'Pharmacy',
                    data: pharmacyProducts,
                },
            ];
        }

        successResponse(res, {
            message: 'success',
            data: {
                offer: data,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserFilterPageApi = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'desc',
            type,
            cuisineIds,
            tags,
            dining,
            deals,
            minProductPrice,
            mixProductPrice,
            freeDelivery,
            ratingSort,
            priceSort,
            maxDeliveryFee,
        } = req.query;

        let shopFilter = {
            shopStatus: 'active',
        };
        let productFilter = {
            status: 'active',
            productVisibility: true,
        };
        let sort = {};

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            shopFilter = {
                ...shopFilter,
                shopType: type,
            };
            productFilter = {
                ...productFilter,
                type,
            };
        }

        if (priceSort === 'yes') {
            sort = {
                ...sort,
                price: 'asc',
            };
        }

        if (ratingSort === 'yes') {
            sort = {
                ...sort,
                rate: 'Desc',
            };
        }

        if (maxDeliveryFee) {
            productFilter = {
                ...productFilter,
                $and: [{ deliveryCharge: { $lte: maxDeliveryFee } }],
            };
        }

        if (minProductPrice && mixProductPrice) {
            productFilter = {
                ...productFilter,
                $and: [
                    { price: { $gt: minProductPrice } },
                    { price: { $lte: mixProductPrice } },
                ],
            };
        }

        if (dining && ['drop', 'pickup'].includes(dining)) {
            filter.delivery = dining;
        }

        if (deals.length >= 3) {
            const listOfDeals = JSON.parse(deals);
            shopFilter.deals = {
                $in: listOfDeals,
                $not: { $size: 0 },
            };
            productFilter.deals = {
                $in: listOfDeals,
                $not: { $size: 0 },
            };
        }

        if (tags.length >= 3) {
            // console.log(tags.length);
            const listOfTags = JSON.parse(tags);
            shopFilter.tags = {
                $in: listOfTags,
            };
        }

        if (cuisineIds.length >= 3) {
            // console.log(cuisineIds.length);
            const cuisineListIds = JSON.parse(cuisineIds);
            shopFilter.cuisines = {
                $in: cuisineListIds,
            };
            productFilter.cuisines = {
                $in: cuisineListIds,
            };
        }

        // var paginate = await pagination({
        //     page,
        //     pageSize,
        //     model: ShopModel,
        //     condition: filter,
        //     pagingRange: 5,
        // });

        const shops = await ShopModel.find(shopFilter).populate([
            {
                path: 'address',
            },
            {
                path: 'seller',
                select: '-favoritesShops',
            },
            {
                path: 'cuisineType',
            },
            // {
            //     path: 'deals',
            // },
            {
                path: 'marketings',
            },
        ]);

        let products;
        if (!tags) {
            products = await ProductModel.find(productFilter)
                .sort({ rate: 'desc' })
                .populate([
                    {
                        path: 'category',
                    },
                    {
                        path: 'subCategory',
                    },
                    {
                        path: 'shop',
                        populate: [
                            {
                                path: 'address',
                            },
                            {
                                path: 'seller',
                                select: '-favoritesShops',
                            },
                            {
                                path: 'products',
                                populate: 'marketing',
                            },
                            {
                                path: 'cuisineType',
                            },
                            {
                                path: 'marketings',
                            },
                        ],
                    },
                    {
                        path: 'seller',
                        select: '-password -createdAt -updatedAt -deletedAt',
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
                ]);
        }

        let filterResult = shops;

        if (!tags) {
            for (let product of products) {
                if (product.shop.shopStatus === 'active') {
                    filterResult.push({
                        ...product.shop._doc,
                    });
                }
            }
        }

        const newShopIds = filterResult.map(shop => shop._id.toString());
        const newShopList = [...new Set(newShopIds)];

        // get shop
        const _shopList = await ShopModel.find({
            _id: {
                $in: newShopList,
            },
        }).populate([
            {
                path: 'seller',
            },
            {
                path: 'cuisineType',
            },
            {
                path: 'tagsId',
            },
            {
                path: 'categories',
            },
            {
                path: 'products',
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
                    // {
                    //     path: 'deals',
                    // },
                ],
            },
            {
                path: 'marketings',
            },
        ]);

        // let filterResult = [...shopsFromProduct, ...shops]

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                filterResult: _shopList,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.newFilterForUserApp = async (req, res) => {
    try {
        const {
            latitude,
            longitude,
            type,
            cuisineIds,
            tags,
            deals,
            listContainers,
            dietaries,
            ratingSort,
            priceSort,
            deliveryTimeSort,
            mixProductPrice,
            maxDeliveryFee,
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            searchKey,
        } = req.query;
        const plusUser = req.plusUser;

        const appSetting = await AppSetting.findOne().select('nearByShopKm');
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let filteringInShop = {
            shopStatus: 'active',
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            deletedAt: null,
        };

        let sort = shopCommonSorting;
        if (['asc', 'desc'].includes(priceSort)) {
            sort = {
                expensive: priceSort,
                ...sort,
            };
        }

        if (ratingSort == 'yes') {
            sort = {
                rating: 'desc',
                ...sort,
            };
        }

        if (
            ![
                'food',
                'grocery',
                'pharmacy',
                'coffee',
                'flower',
                'pet',
            ].includes(type) &&
            (listContainers?.length >= 3 || deals?.length >= 3)
        ) {
            let shopTypeList = [];

            const processDeals = async (dealType, model) => {
                if (dealType?.length >= 3) {
                    const listOfDeals = JSON.parse(dealType);
                    const dealsShopTypeList = await model
                        .find({ _id: { $in: listOfDeals } })
                        .distinct('shopType');
                    shopTypeList.push(...dealsShopTypeList);
                }
            };

            await Promise.all([
                processDeals(listContainers, ListContainerModel),
                processDeals(deals, FilterContainerModel),
            ]);

            filteringInShop = {
                ...filteringInShop,
                shopType: { $in: shopTypeList },
            };
        }

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            filteringInShop = {
                ...filteringInShop,
                shopType: type,
            };
        }

        // if (mixProductPrice) {
        //     filteringInShop = {
        //         ...filteringInShop,
        //         $and: [{ expensive: { $lte: mixProductPrice } }],
        //     };
        // }

        if (mixProductPrice?.length >= 3) {
            const listOfExpensive = JSON.parse(mixProductPrice);

            filteringInShop.expensive = {
                $in: listOfExpensive,
            };
        }

        if (tags?.length >= 3) {
            const listOfTags = JSON.parse(tags);

            filteringInShop.tags = {
                $in: listOfTags,
            };
        }

        if (cuisineIds?.length >= 3) {
            const cuisineListIds = JSON.parse(cuisineIds);

            filteringInShop.cuisineType = {
                $in: cuisineListIds,
            };
        }

        if (dietaries?.length >= 3) {
            const dietaryList = JSON.parse(dietaries);

            filteringInShop.dietary = {
                $in: dietaryList,
            };
        }

        const shops = await ShopModel.find(filteringInShop)
            .sort(sort)
            .populate([
                {
                    path: 'seller',
                },
                {
                    path: 'cuisineType',
                },
                {
                    path: 'tagsId',
                },
                {
                    path: 'categories',
                },
                {
                    path: 'products',
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
                    ],
                },
                {
                    path: 'marketings',
                },
            ]);

        let newShops = [];

        if (maxDeliveryFee == 0) {
            for (const singleShop of shops) {
                let result = false;
                if (singleShop.freeDelivery) {
                    result = singleShop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    );
                }

                if (result) {
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }
                    singleShop._doc.deliveryFee = 0
                    newShops.push(singleShop)
                }
            }
        } else if (maxDeliveryFee > 0) {
            for (const singleShop of shops) {
                const result = await getShopByDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    maxDeliveryFee
                );

                if (result === true) {
                    let deliveryFee = await getDeliveryCharge(
                        singleShop,
                        latitude,
                        longitude,
                        plusUser
                    );
                    // console.log(deliveryFee);
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }

                    singleShop._doc.deliveryFee = deliveryFee
                    newShops.push(singleShop)
                }
            }
        } else {
            for (const singleShop of shops) {
                let deliveryFee = await getDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    plusUser
                );

                if (!plusUser) {
                    await checkPlusUserMarketing(singleShop);
                }

                singleShop._doc.deliveryFee = deliveryFee
                newShops.push(singleShop)
            }
        }

        if (deals?.length >= 3) {
            const listOfDeals = JSON.parse(deals);

            const dealsList = await FilterContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let isDoubleDeal = false;
            let isFreeDelivery = false;
            let percentageDeals = [];

            for (const deal of dealsList) {
                isDoubleDeal = deal?.deals?.includes('double_menu');
                isFreeDelivery = deal?.deals?.includes('free_delivery');
                percentageDeals = deal?.deals?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );
            }

            let doubleDealShops = [];
            let freeDeliveryShops = [];
            let percentageDealShops = [];

            if (isDoubleDeal) {
                doubleDealShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );
            }

            if (isFreeDelivery) {
                freeDeliveryShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );
            }

            if (percentageDeals.length > 0) {
                percentageDealShops = newShops.filter(shop =>
                    shop.marketings.some(marketing => {
                        if (
                            marketing.type === 'percentage' &&
                            marketing.isActive
                        ) {
                            const marketingDiscounts =
                                marketing.discountPercentages.map(String);
                            return percentageDeals.some(discount =>
                                marketingDiscounts.includes(discount)
                            );
                        }
                    })
                );
            }

            const newShopList = [
                ...doubleDealShops,
                ...freeDeliveryShops,
                ...percentageDealShops,
            ];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (listContainers?.length >= 3) {
            const listOfDeals = JSON.parse(listContainers);

            const dealsList = await ListContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let dealsArr = [];
            let tagsArr = [];
            let shopsArr = [];

            for (const deal of dealsList) {
                if (deal.type.includes('deal')) {
                    dealsArr = [...dealsArr, ...deal.deals];
                }
                if (deal.type.includes('tag')) {
                    tagsArr = [...tagsArr, ...deal.tags];
                }
                if (deal.type.includes('shop')) {
                    shopsArr = [...shopsArr, ...deal.shops];
                }
            }

            let dealsShop = [];
            let tagsShop = [];
            let shopsShop = [];

            if (shopsArr.length > 0) {
                shopsArr = [...new Set(shopsArr)];

                const shopsArrString = shopsArr?.map(id => id.toString());

                shopsShop = newShops.filter(shop =>
                    shopsArrString.includes(shop?._id?.toString())
                );
            }

            if (dealsArr.length > 0) {
                dealsArr = [...new Set(dealsArr)];

                let isDoubleDeal = dealsArr?.includes('double_menu');
                let isFreeDelivery = dealsArr?.includes('free_delivery');
                let percentageDeals = dealsArr?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );

                if (isDoubleDeal) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'double_menu' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (isFreeDelivery) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (percentageDeals.length > 0) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(marketing => {
                            if (
                                marketing.type === 'percentage' &&
                                marketing.isActive
                            ) {
                                const marketingDiscounts =
                                    marketing.discountPercentages.map(String);

                                return percentageDeals.some(discount =>
                                    marketingDiscounts.includes(discount)
                                );
                            }
                        })
                    );

                    dealsShop = [...dealsShop, ...list];
                }
            }

            if (tagsArr.length > 0) {
                tagsArr = [...new Set(tagsArr)];

                const tagsArrString = tagsArr?.map(id => id.toString());

                const tagsList = newShops.filter(shop =>
                    shop.tagsId.some(tag =>
                        tagsArrString.includes(tag?._id?.toString())
                    )
                );
                const cuisineList = newShops.filter(shop =>
                    shop.cuisineType.some(cuisine =>
                        tagsArrString.includes(cuisine?._id?.toString())
                    )
                );

                tagsShop = [...tagsList, ...cuisineList];
            }

            const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        // For search shop on applied filter
        if (searchKey) {
            newShops = newShops.filter(shop => {
                const searchTerm = searchKey.toLowerCase();

                const matchesName = shop?.shopName
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesId = shop?.autoGenId
                    ?.toLowerCase()
                    .includes(searchTerm);
                const matchesTags = shop?.tags?.some(tag =>
                    tag?.toLowerCase().includes(searchTerm)
                );
                const matchesCuisines = shop?.cuisineType?.some(cuisine =>
                    cuisine?.name?.toLowerCase().includes(searchTerm)
                );

                return (
                    matchesName || matchesId || matchesTags || matchesCuisines
                );
            });
        }

        if (deliveryTimeSort == 'yes') {
            // for (const shop of newShops) {
            //     let shopDistance = await getDistance(
            //         latitude,
            //         longitude,
            //         shop.location?.coordinates[1],
            //         shop.location?.coordinates[0],
            //         'k'
            //     );

            //     if (!shopDistance) {
            //         shopDistance = 1;
            //     }

               // shop.shopDistance = shopDistance;
           // }

            newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20)  - (b.avgOrderDeliveryTime || 20));
        }

        // Open shop need to show top and then closed shop
        const openShops = newShops
            .map(shop => {
                shop._doc.isShopOpen = checkShopOpeningHours(shop)
                return shop
            })
            .reduce(
                (accumulator, currentShop) => {
                    if (
                        currentShop._doc.liveStatus === 'online' &&
                        currentShop._doc.isShopOpen
                    ) {
                        accumulator[0].push(currentShop);
                    } else {
                        accumulator[1].push(currentShop);
                    }
                    return accumulator;
                },
                [[], []]
            );

        const finalShops = [...openShops[0], ...openShops[1]];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalShops.length,
            pagingRange,
        });

        const list = finalShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // find is shop open or not
        // for (const shop of list) {
        //     const isShopOpen = checkShopOpeningHours(shop);
        //     shop.isShopOpen = isShopOpen;
        // }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                filterResult: list,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

//** Love to section */
exports.getUserHomeApiForLovingShop = async (req, res) => {
    try {
        const plusUser = req.plusUser;
        const userId = req.userId;

        const {
            page,
            pageSize,
            type = 'food',
            latitude,
            longitude,
            listContainers,
            deals,
            mixProductPrice,
            dietaries,
            priceSort,
            ratingSort,
            deliveryTimeSort,
            maxDeliveryFee,
        } = req.query;

        const appSetting = await AppSetting.findOne().select('nearByShopKm');
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        const lastOrder = await OrderModel.findOne({
            user: userId,
            orderType: type,
        })
            .sort({ createdAt: 'desc' })
            .populate({
                path: 'shop',
                select: 'cuisineType tags',
            });

        const shopTags = lastOrder?.shop?.tags || [];
        const shopCuisines = lastOrder?.shop?.cuisineType || [];

        let sort = shopCommonSorting;
        if (['asc', 'desc'].includes(priceSort)) {
            sort = {
                expensive: priceSort,
            };
        }

        if (ratingSort == 'yes') {
            sort = {
                rating: 'desc',
            };
        }

        let config = {
            _id: {
                $in: await findNearestShopIdsForEachBrand(
                    longitude,
                    latitude,
                    maxDistanceInMeters
                ),
            }, //TODO: need to test
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            // liveStatus: { $nin: ['offline'] },
            $or: [
                { tags: { $in: shopTags } },
                { cuisineType: { $in: shopCuisines } },
            ],
        };

        if (
            type &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                type
            )
        ) {
            config = {
                ...config,
                shopType: type,
            };
        }

        if (mixProductPrice?.length >= 3) {
            const listOfExpensive = JSON.parse(mixProductPrice);

            config.expensive = {
                $in: listOfExpensive,
            };
        }

        if (dietaries?.length >= 3) {
            const dietaryList = JSON.parse(dietaries);

            config.dietary = {
                $in: dietaryList,
            };
        }

        const shops = await ShopModel.find(config)
            .sort(sort)
            .populate([
                {
                    path: 'seller',
                    select: '-password',
                },
                {
                    path: 'banner',
                },
                {
                    path: 'products',
                    populate: 'marketing',
                },
                {
                    path: 'marketings',
                },
                {
                    path: 'cuisineType',
                },
            ])
            .select('-categories');

        let newShops = [];
        if (maxDeliveryFee == 0) {
            for (const singleShop of shops) {
                let result = false;
                if (singleShop.freeDelivery) {
                    result = singleShop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    );
                }

                if (result) {
                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }
                    singleShop._doc.deliveryFee = 0
                    newShops.push(singleShop)
                }
            }
        } else if (maxDeliveryFee > 0) {
            for (const singleShop of shops) {
                const result = await getShopByDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    maxDeliveryFee
                );

                if (result === true) {
                    let deliveryFee = await getDeliveryCharge(
                        singleShop,
                        latitude,
                        longitude,
                        plusUser
                    );

                    if (!plusUser) {
                        await checkPlusUserMarketing(singleShop);
                    }

                    singleShop._doc.deliveryFee = deliveryFee
                    newShops.push(singleShop)
                }
            }
        } else {
            for (const singleShop of shops) {
                let deliveryFee = await getDeliveryCharge(
                    singleShop,
                    latitude,
                    longitude,
                    plusUser
                );

                if (!plusUser) {
                    await checkPlusUserMarketing(singleShop);
                }

                singleShop._doc.deliveryFee = deliveryFee
                newShops.push(singleShop)
            }
        }

        if (deals?.length >= 3) {
            const listOfDeals = JSON.parse(deals);

            const dealsList = await FilterContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let isDoubleDeal = false;
            let isFreeDelivery = false;
            let percentageDeals = [];

            for (const deal of dealsList) {
                isDoubleDeal = deal?.deals?.includes('double_menu');
                isFreeDelivery = deal?.deals?.includes('free_delivery');
                percentageDeals = deal?.deals?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );
            }

            let doubleDealShops = [];
            let freeDeliveryShops = [];
            let percentageDealShops = [];

            if (isDoubleDeal) {
                doubleDealShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );
            }

            if (isFreeDelivery) {
                freeDeliveryShops = newShops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );
            }

            if (percentageDeals.length > 0) {
                percentageDealShops = newShops.filter(shop =>
                    shop.marketings.some(marketing => {
                        if (
                            marketing.type === 'percentage' &&
                            marketing.isActive
                        ) {
                            const marketingDiscounts =
                                marketing.discountPercentages.map(String);
                            return percentageDeals.some(discount =>
                                marketingDiscounts.includes(discount)
                            );
                        }
                    })
                );
            }

            const newShopList = [
                ...doubleDealShops,
                ...freeDeliveryShops,
                ...percentageDealShops,
            ];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (listContainers?.length >= 3) {
            const listOfDeals = JSON.parse(listContainers);

            const dealsList = await ListContainerModel.find({
                _id: { $in: listOfDeals },
            });

            let dealsArr = [];
            let tagsArr = [];
            let shopsArr = [];

            for (const deal of dealsList) {
                if (deal.type.includes('deal')) {
                    dealsArr = [...dealsArr, ...deal.deals];
                }
                if (deal.type.includes('tag')) {
                    tagsArr = [...tagsArr, ...deal.tags];
                }
                if (deal.type.includes('shop')) {
                    shopsArr = [...shopsArr, ...deal.shops];
                }
            }

            let dealsShop = [];
            let tagsShop = [];
            let shopsShop = [];

            if (shopsArr.length > 0) {
                shopsArr = [...new Set(shopsArr)];

                const shopsArrString = shopsArr?.map(id => id.toString());

                shopsShop = newShops.filter(shop =>
                    shopsArrString.includes(shop?._id?.toString())
                );
            }

            if (dealsArr.length > 0) {
                dealsArr = [...new Set(dealsArr)];

                let isDoubleDeal = dealsArr?.includes('double_menu');
                let isFreeDelivery = dealsArr?.includes('free_delivery');
                let percentageDeals = dealsArr?.filter(
                    singleDeal =>
                        !['double_menu', 'free_delivery'].includes(singleDeal)
                );

                if (isDoubleDeal) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'double_menu' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (isFreeDelivery) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        )
                    );
                    dealsShop = [...dealsShop, ...list];
                }

                if (percentageDeals.length > 0) {
                    const list = newShops.filter(shop =>
                        shop.marketings.some(marketing => {
                            if (
                                marketing.type === 'percentage' &&
                                marketing.isActive
                            ) {
                                const marketingDiscounts =
                                    marketing.discountPercentages.map(String);

                                return percentageDeals.some(discount =>
                                    marketingDiscounts.includes(discount)
                                );
                            }
                        })
                    );

                    dealsShop = [...dealsShop, ...list];
                }
            }

            if (tagsArr.length > 0) {
                tagsArr = [...new Set(tagsArr)];

                const tagsArrString = tagsArr?.map(id => id.toString());

                const tagsList = newShops.filter(shop =>
                    shop.tagsId.some(tag =>
                        tagsArrString.includes(tag?._id?.toString())
                    )
                );
                const cuisineList = newShops.filter(shop =>
                    shop.cuisineType.some(cuisine =>
                        tagsArrString.includes(cuisine?._id?.toString())
                    )
                );

                tagsShop = [...tagsList, ...cuisineList];
            }

            const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

            const uniqueShopList = [];

            for (const shop of newShopList) {
                const findShop = uniqueShopList?.find(
                    uniqueShop =>
                        uniqueShop?._id?.toString() === shop?._id?.toString()
                );
                if (!findShop) {
                    uniqueShopList.push(shop);
                }
            }

            newShops = uniqueShopList;
        }

        if (deliveryTimeSort == 'yes') {
            for (const shop of newShops) {
                let shopDistance = await getDistance(
                    latitude,
                    longitude,
                    shop.location?.coordinates[1],
                    shop.location?.coordinates[0],
                    'k'
                );

                if (!shopDistance) {
                    shopDistance = 1;
                }

                shop.shopDistance = shopDistance;
            }

            newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20)  - (b.avgOrderDeliveryTime || 20));
        }

        // Open shop need to show top and then closed shop
        const openShops = newShops
            .map(shop => {
                shop._doc.isShopOpen = checkShopOpeningHours(shop)
                return shop
            })
            .reduce(
                (accumulator, currentShop) => {
                    if (
                        currentShop._doc.liveStatus === 'online' &&
                        currentShop._doc.isShopOpen
                    ) {
                        accumulator[0].push(currentShop);
                    } else {
                        accumulator[1].push(currentShop);
                    }
                    return accumulator;
                },
                [[], []]
            );

        const finalShops = [...openShops[0], ...openShops[1]];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: finalShops.length,
            pagingRange: 5,
        });

        const list = finalShops.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        // for (const shop of list) {
        //     const isShopOpen = checkShopOpeningHours(shop);
        //     shop.isShopOpen = isShopOpen;
        // }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserPunchMarketingForApps = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            page,
            pageSize,
            sortBy = 'desc',
            latitude,
            longitude,
        } = req.query;

        //*** For finding shop within location range ***/
        const appSetting = await AppSetting.findOne({}).select('nearByShopKm');
        const km = appSetting ? appSetting.nearByShopKm : 0;
        const maxDistanceInMeters = 1000 * km;

        let shopConfig = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxDistanceInMeters,
                },
            },
            deletedAt: null,
            shopStatus: 'active',
            parentShop: null,
        };

        const shopList = await ShopModel.find(shopConfig);

        const shopListId = shopList.map(shop => shop._id.toString());

        let userPunchMarketingConfig = {
            user: userId,
            shop: { $in: shopListId },
            status: 'ongoing',
            completedOrders: { $gte: 1 },
        };

        const userPunchMarketings = await UserPunchMarketingModel.find(
            userPunchMarketingConfig
        )
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'shop',
                    select: 'shopType shopName shopLogo shopExchangeRate',
                },
            ])
            .select(
                'shop marketing punchTargetOrders punchMinimumOrderValue punchCouponDiscountType punchCouponValue completedOrders expiredDate'
            )
            .lean();

        const marketingIds = userPunchMarketings.map(userPunchMarketing =>
            userPunchMarketing.marketing.toString()
        );

        let shopPunchMarketingConfig = {
            _id: { $nin: marketingIds },
            shop: { $in: shopListId },
            type: 'punch_marketing',
            isActive: true,
            status: 'active',
        };

        const shopPunchMarketings = await MarketingModel.find(
            shopPunchMarketingConfig
        )
            .sort({ createdAt: sortBy })
            .populate([
                {
                    path: 'shop',
                    select: 'shopType shopName shopLogo shopExchangeRate',
                },
            ])
            .select(
                'shop punchTargetOrders punchMinimumOrderValue punchDayLimit punchCouponDiscountType punchCouponValue'
            )
            .lean();

        for (const marketing of shopPunchMarketings) {
            marketing.completedOrders = 0;
            marketing.expiredDate = moment().add(
                marketing.punchDayLimit,
                'days'
            );
            marketing.punchDayLimit = undefined;
        }

        const punchMarketings = [
            ...userPunchMarketings,
            // ...shopPunchMarketings,
        ];

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: punchMarketings.length,
            pagingRange: 5,
        });

        const list = punchMarketings.slice(
            paginate.offset,
            paginate.offset + paginate.limit
        );

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                punchMarketings: list,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getUserHomeForApps = async (req, res) => {
    try {
        // const startTime = moment.now()

        const { longitude, latitude } = req.query;
        const plusUser = req.plusUser;
        const userId = req.userId;

        if (!latitude && !longitude)
            return errorResponse(res, 'Longitude and latitude is required!');

        const appSetting = await AppSetting.findOne().select("nearByShopKm nearByShopKmForUserHomeScreen");

        // console.log(`Got appSetting after ${moment.now() - startTime} ms`)

        const nearByShopKm = appSetting?.nearByShopKm || 1;
        const nearByShopKmForUserHomeScreen =
            appSetting?.nearByShopKmForUserHomeScreen || 1;
        const maxShopDistanceInMeters = 1000 * nearByShopKm;
        const maxNearShopDistanceInMeters =
            1000 * nearByShopKmForUserHomeScreen;

        let userAppScreen = await UserAppScreenModel.find({
            screen: 'home',
            status: 'active',
        })
            .sort({ sortingOrder: 1, createdAt: -1 })
            .select('title section shopType')
            .lean();

        // console.log(`Got userAppScreen after ${moment.now() - startTime} ms`)

        const commonShopConfig = {
            _id: {
                $in: await findNearestShopIdsForEachBrand(
                    longitude,
                    latitude,
                    maxShopDistanceInMeters
                ),
            }, //TODO: need to test
            parentShop: null,
            deletedAt: null,
        };
        // console.log(`Got commonShopConfig after ${moment.now() - startTime} ms`)

        const shopConfig = {
            ...commonShopConfig,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxShopDistanceInMeters,
                },
            },
        };

        const nearShopConfig = {
            ...commonShopConfig,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxNearShopDistanceInMeters,
                },
            },
        };


        // Store Punches
        const findStorePunches = userAppScreen.find(
            screen => screen.section === 'store-punches'
        );

        const shopList = await ShopModel.find({
            ...shopConfig,
        }).sort(shopCommonSorting)
        .populate({
            path: 'shopZone',
            match: { zoneStatus: 'active' },
            select: 'zoneStatus',
        });

        const filteredShops = shopList?.filter(shop => shop?.shopZone);

        if (findStorePunches) {
            const shopListId = filteredShops.map(shop =>
                shop._id.toString()
            );

            const userPunchMarketings = await UserPunchMarketingModel.find({
                user: userId,
                shop: { $in: shopListId },
                status: 'ongoing',
            })
                .sort({ createdAt: 'asc' })
                .limit(5)
                .populate([
                    {
                        path: 'shop',
                        select: 'shopType shopName shopLogo shopExchangeRate',
                    },
                ])
                .select(
                    'shop marketing punchTargetOrders punchMinimumOrderValue punchCouponDiscountType punchCouponValue completedOrders expiredDate'
                )
                .lean();

            let shopPunchMarketings = [];
            if (userPunchMarketings.length < 5) {
                const marketingIds = userPunchMarketings.map(
                    userPunchMarketing =>
                        userPunchMarketing.marketing.toString()
                );

                shopPunchMarketings = await MarketingModel.find({
                    _id: { $nin: marketingIds },
                    shop: { $in: shopListId },
                    type: 'punch_marketing',
                    isActive: true,
                    status: 'active',
                })
                    .sort({ createdAt: 'asc' })
                    .limit(5 - userPunchMarketings.length)
                    .populate([
                        {
                            path: 'shop',
                            select: 'shopType shopName shopLogo shopExchangeRate',
                        },
                    ])
                    .select(
                        'shop punchTargetOrders punchMinimumOrderValue punchDayLimit punchCouponDiscountType punchCouponValue'
                    )
                    .lean();

                shopPunchMarketings.forEach(marketing => {
                    marketing.completedOrders = 0;
                    marketing.expiredDate = moment().add(
                        marketing.punchDayLimit,
                        'days'
                    );
                    marketing.punchDayLimit = undefined;
                });
            }

            findStorePunches.punchMarketings = [
                ...userPunchMarketings,
                // ...shopPunchMarketings,
            ];
        }
        // console.log(`After Store Punches ${moment.now() - startTime} ms`)

        // Nearby Shop
        const findNearbyShop = async (screen, shopType) => {
            // const nearbyShopStartTime = moment.now()
            const shops = await ShopModel.find({
                ...nearShopConfig,
                shopType,
            })
                .sort(shopCommonSorting)
                // .limit(5)
                .populate([
                    { path: 'seller', select: '-password' },
                    { path: 'banner' },
                    { path: 'products', populate: 'marketing' },
                    { path: 'cuisineType' },
                    { path: 'marketings' },
                    {
                        path: 'shopZone',
                        match: { zoneStatus: 'active' },
                        select: 'zoneStatus',
                    }
                ]);

            const filteredShopsAll = shops.filter(shop => shop?.shopZone);
            // console.log(`Got nearby shops ${moment.now() - nearbyShopStartTime}`)
            const sortedShops = shopSortingFunc(filteredShopsAll).slice(0, 5);
            // console.log(`sorted shops ${moment.now() - nearbyShopStartTime}`)

            await processShops(screen, sortedShops, plusUser, latitude, longitude);
            // console.log(`processed shops ${moment.now() - nearbyShopStartTime}`)

        };

        const findNearbyRestaurant = userAppScreen.find(
            screen => screen.section === 'nearby-restaurant'
        );
        const findNearbyGrocery = userAppScreen.find(
            screen => screen.section === 'nearby-grocery'
        );
        const findNearbyPharmacy = userAppScreen.find(
            screen => screen.section === 'nearby-pharmacy'
        );

        if (findNearbyRestaurant) {
            await findNearbyShop(findNearbyRestaurant, 'food');
            // console.log(`Found food ${moment.now() - startTime} ms`)

        }
        if (findNearbyGrocery) {
            await findNearbyShop(findNearbyGrocery, 'grocery');
            // console.log(`Found grocery ${moment.now() - startTime} ms`)
        }
        if (findNearbyPharmacy) {
            await findNearbyShop(findNearbyPharmacy, 'pharmacy');
            // console.log(`Found pharmacy ${moment.now() - startTime} ms`)
        }
        // console.log(`After Nearby Shop ${moment.now() - startTime} ms`)

        // Offers || Free Delivery || Crazy Deals
        const findOffersScreen = userAppScreen.find(
            screen => screen.section === 'discount' && screen.shopType === 'all'
        );
        const findOffersScreenForFood = userAppScreen.find(
            screen =>
                screen.section === 'discount' && screen.shopType === 'food'
        );
        const findOffersScreenForGrocery = userAppScreen.find(
            screen =>
                screen.section === 'discount' && screen.shopType === 'grocery'
        );
        const findOffersScreenForPharmacy = userAppScreen.find(
            screen =>
                screen.section === 'discount' && screen.shopType === 'pharmacy'
        );

        const findFreeDeliveryScreen = userAppScreen.find(
            screen =>
                screen.section === 'free-delivery' && screen.shopType === 'all'
        );
        const findFreeDeliveryScreenForFood = userAppScreen.find(
            screen =>
                screen.section === 'free-delivery' && screen.shopType === 'food'
        );
        const findFreeDeliveryScreenForGrocery = userAppScreen.find(
            screen =>
                screen.section === 'free-delivery' &&
                screen.shopType === 'grocery'
        );
        const findFreeDeliveryScreenForPharmacy = userAppScreen.find(
            screen =>
                screen.section === 'free-delivery' &&
                screen.shopType === 'pharmacy'
        );

        const findCrazyDealsScreen = userAppScreen.find(
            screen =>
                screen.section === 'crazy-offer-shops' &&
                screen.shopType === 'all'
        );
        const findCrazyDealsScreenForFood = userAppScreen.find(
            screen =>
                screen.section === 'crazy-offer-shops' &&
                screen.shopType === 'food'
        );
        const findCrazyDealsScreenForGrocery = userAppScreen.find(
            screen =>
                screen.section === 'crazy-offer-shops' &&
                screen.shopType === 'grocery'
        );
        const findCrazyDealsScreenForPharmacy = userAppScreen.find(
            screen =>
                screen.section === 'crazy-offer-shops' &&
                screen.shopType === 'pharmacy'
        );

        if (
            findOffersScreen ||
            findOffersScreenForFood ||
            findOffersScreenForPharmacy ||
            findOffersScreenForGrocery ||
            findFreeDeliveryScreen ||
            findFreeDeliveryScreenForFood ||
            findFreeDeliveryScreenForPharmacy ||
            findFreeDeliveryScreenForGrocery ||
            findCrazyDealsScreen ||
            findCrazyDealsScreenForFood ||
            findCrazyDealsScreenForPharmacy ||
            findCrazyDealsScreenForGrocery
        ) {
            const shops = filteredShops?.filter(shop => shop?.marketings?.length > 0);
            // const shops = await ShopModel.find({
            //     ...shopConfig,
            //     marketings: { $elemMatch: { $exists: true } },
            // })
            //     .sort(shopCommonSorting)
            //     .populate([
            //         {
            //             path: 'seller',
            //             select: '-password',
            //         },
            //         {
            //             path: 'banner',
            //         },
            //         {
            //             path: 'products',
            //             populate: 'marketing',
            //         },
            //         {
            //             path: 'cuisineType',
            //         },
            //         {
            //             path: 'marketings',
            //         },
            //     ]);


            if (findOffersScreen) {
                await processShopsForScreen(shops, findOffersScreen, shop => {
                    const findOffer = shop.marketings.find(
                        marketing =>
                            ['percentage', 'double_menu', 'reward'].includes(
                                marketing.type
                            ) &&
                            marketing.isActive &&
                            !marketing.onlyForSubscriber
                    );
                    return findOffer;
                }, plusUser, latitude, longitude);
            }
            if (findOffersScreenForFood) {
                await processShopsForScreen(shops, findOffersScreenForFood, shop => {
                    const checkShopType = shop.shopType === 'food';
                    if (!checkShopType) {
                        return false;
                    }

                    const findOffer = shop.marketings.find(
                        marketing =>
                            ['percentage', 'double_menu', 'reward'].includes(
                                marketing.type
                            ) &&
                            marketing.isActive &&
                            !marketing.onlyForSubscriber
                    );
                    return findOffer;
                }, plusUser, latitude, longitude);
            }
            if (findOffersScreenForGrocery) {
                await processShopsForScreen(
                    shops,
                    findOffersScreenForGrocery,
                    shop => {
                        const checkShopType = shop.shopType === 'grocery';
                        if (!checkShopType) {
                            return false;
                        }

                        const findOffer = shop.marketings.find(
                            marketing =>
                                [
                                    'percentage',
                                    'double_menu',
                                    'reward',
                                ].includes(marketing.type) &&
                                marketing.isActive &&
                                !marketing.onlyForSubscriber
                        );
                        return findOffer;
                    }, plusUser, latitude, longitude
                );
            }
            if (findOffersScreenForPharmacy) {
                await processShopsForScreen(
                    shops,
                    findOffersScreenForPharmacy,
                    shop => {
                        const checkShopType = shop.shopType === 'pharmacy';
                        if (!checkShopType) {
                            return false;
                        }

                        const findOffer = shop.marketings.find(
                            marketing =>
                                [
                                    'percentage',
                                    'double_menu',
                                    'reward',
                                ].includes(marketing.type) &&
                                marketing.isActive &&
                                !marketing.onlyForSubscriber
                        );
                        return findOffer;
                    }, plusUser, latitude, longitude
                );
            }

            if (findFreeDeliveryScreen) {
                if (!plusUser) {
                    await processShopsForScreen(
                        shops,
                        findFreeDeliveryScreen,
                        shop => {
                            const findFreeDelivery = shop.marketings.find(
                                marketing =>
                                    ['free_delivery'].includes(
                                        marketing.type
                                    ) && marketing.isActive
                            );
                            return findFreeDelivery;
                        }, plusUser, latitude, longitude
                    );
                } else {
                    findFreeDeliveryScreen.shops = [];
                }
            }
            if (findFreeDeliveryScreenForFood) {
                if (!plusUser) {
                    await processShopsForScreen(
                        shops,
                        findFreeDeliveryScreenForFood,
                        shop => {
                            const checkShopType = shop.shopType === 'food';
                            if (!checkShopType) {
                                return false;
                            }

                            const findFreeDelivery = shop.marketings.find(
                                marketing =>
                                    ['free_delivery'].includes(
                                        marketing.type
                                    ) && marketing.isActive
                            );
                            return findFreeDelivery;
                        }, plusUser, latitude, longitude
                    );
                } else {
                    findFreeDeliveryScreenForFood.shops = [];
                }
            }
            if (findFreeDeliveryScreenForGrocery) {
                if (!plusUser) {
                    await processShopsForScreen(
                        shops,
                        findFreeDeliveryScreenForGrocery,
                        shop => {
                            const checkShopType = shop.shopType === 'grocery';
                            if (!checkShopType) {
                                return false;
                            }

                            const findFreeDelivery = shop.marketings.find(
                                marketing =>
                                    ['free_delivery'].includes(
                                        marketing.type
                                    ) && marketing.isActive
                            );
                            return findFreeDelivery;
                        }, plusUser, latitude, longitude
                    );
                } else {
                    findFreeDeliveryScreenForGrocery.shops = [];
                }
            }
            if (findFreeDeliveryScreenForPharmacy) {
                if (!plusUser) {
                    await processShopsForScreen(
                        shops,
                        findFreeDeliveryScreenForPharmacy,
                        shop => {
                            const checkShopType = shop.shopType === 'pharmacy';
                            if (!checkShopType) {
                                return false;
                            }

                            const findFreeDelivery = shop.marketings.find(
                                marketing =>
                                    ['free_delivery'].includes(
                                        marketing.type
                                    ) && marketing.isActive
                            );
                            return findFreeDelivery;
                        }, plusUser, latitude, longitude
                    );
                } else {
                    findFreeDeliveryScreenForPharmacy.shops = [];
                }
            }

            if (findCrazyDealsScreen) {
                if (plusUser) {
                    await processShopsForScreen(shops, findCrazyDealsScreen, shop => {
                        const findOffer = shop.marketings.find(
                            marketing =>
                                ['percentage', 'double_menu'].includes(
                                    marketing.type
                                ) &&
                                marketing.isActive &&
                                marketing.onlyForSubscriber
                        );
                        return findOffer;
                    }, plusUser, latitude, longitude);
                } else {
                    findCrazyDealsScreen.shops = [];
                }
            }
            if (findCrazyDealsScreenForFood) {
                if (plusUser) {
                    await processShopsForScreen(
                        shops,
                        findCrazyDealsScreenForFood,
                        shop => {
                            const checkShopType = shop.shopType === 'food';
                            if (!checkShopType) {
                                return false;
                            }

                            const findOffer = shop.marketings.find(
                                marketing =>
                                    ['percentage', 'double_menu'].includes(
                                        marketing.type
                                    ) &&
                                    marketing.isActive &&
                                    marketing.onlyForSubscriber
                            );
                            return findOffer;
                        }, plusUser, latitude, longitude
                    );
                } else {
                    findCrazyDealsScreenForFood.shops = [];
                }
            }
            if (findCrazyDealsScreenForGrocery) {
                if (plusUser) {
                    await processShopsForScreen(shops,
                        findCrazyDealsScreenForGrocery,
                        shop => {
                            const checkShopType = shop.shopType === 'grocery';
                            if (!checkShopType) {
                                return false;
                            }

                            const findOffer = shop.marketings.find(
                                marketing =>
                                    ['percentage', 'double_menu'].includes(
                                        marketing.type
                                    ) &&
                                    marketing.isActive &&
                                    marketing.onlyForSubscriber
                            );
                            return findOffer;
                        }, plusUser, latitude, longitude
                    );
                } else {
                    findCrazyDealsScreenForGrocery.shops = [];
                }
            }
            if (findCrazyDealsScreenForPharmacy) {
                if (plusUser) {
                    await processShopsForScreen(shops,
                        findCrazyDealsScreenForPharmacy,
                        shop => {
                            const checkShopType = shop.shopType === 'pharmacy';
                            if (!checkShopType) {
                                return false;
                            }

                            const findOffer = shop.marketings.find(
                                marketing =>
                                    ['percentage', 'double_menu'].includes(
                                        marketing.type
                                    ) &&
                                    marketing.isActive &&
                                    marketing.onlyForSubscriber
                            );
                            return findOffer;
                        }, plusUser, latitude, longitude
                    );
                } else {
                    findCrazyDealsScreenForPharmacy.shops = [];
                }
            }
        }
        // console.log(`After Offers ${moment.now() - startTime} ms`)

        // Order Again
        const findOrderAgainScreen = userAppScreen.find(
            screen =>
                screen.section === `order-again` && screen.shopType === 'all'
        );
        const findOrderAgainScreenForFood = userAppScreen.find(
            screen =>
                screen.section === `order-again` && screen.shopType === 'food'
        );
        const findOrderAgainScreenForGrocery = userAppScreen.find(
            screen =>
                screen.section === `order-again` &&
                screen.shopType === 'grocery'
        );
        const findOrderAgainScreenForPharmacy = userAppScreen.find(
            screen =>
                screen.section === `order-again` &&
                screen.shopType === 'pharmacy'
        );

        if (
            findOrderAgainScreen ||
            findOrderAgainScreenForFood ||
            findOrderAgainScreenForPharmacy ||
            findOrderAgainScreenForGrocery
        ) {
            const pastOrderShopIds = await OrderModel.find({
                user: userId,
                orderStatus: 'delivered',
            })
                .sort({ createdAt: 'desc' })
                .distinct('shop')
                .lean();

            const processOrderAgainShops = async (screen, shopType) => {
                const pastOrderShops = await ShopModel.find({
                    // ...shopConfig,
                    _id: { $in: pastOrderShopIds },
                    shopType,
                })
                    .sort(shopCommonSorting)
                    // .limit(5)
                    .populate([
                        {
                            path: 'marketings',
                        },
                        {
                            path: 'products',
                            populate: 'marketing',
                        },
                        {
                            path: 'cuisineType',
                        },
                    ]);

                const sortedShops = shopSortingFunc(pastOrderShops).slice(0, 5);

                await processShops(screen, sortedShops, plusUser, latitude, longitude);
            };

            if (findOrderAgainScreen) {
                await processOrderAgainShops(findOrderAgainScreen);
            }
            if (findOrderAgainScreenForFood) {
                await processOrderAgainShops(
                    findOrderAgainScreenForFood,
                    'food'
                );
            }
            if (findOrderAgainScreenForGrocery) {
                await processOrderAgainShops(
                    findOrderAgainScreenForGrocery,
                    'grocery'
                );
            }
            if (findOrderAgainScreenForPharmacy) {
                await processOrderAgainShops(
                    findOrderAgainScreenForPharmacy,
                    'pharmacy'
                );
            }
        }
        // console.log(`After Order Again ${moment.now() - startTime} ms`)

        // Our Top Picks
        const processOurTopPicksShops = async (screen, shopType) => {
            const shops = await ShopModel.find({
                ...shopConfig,
                isFeatured: true,
                shopType,
            })
                .sort(shopCommonSorting)
                // .limit(5)
                .populate([
                    {
                        path: 'seller',
                        select: '-password',
                    },
                    {
                        path: 'banner',
                    },
                    {
                        path: 'products',
                        populate: 'marketing',
                    },
                    {
                        path: 'marketings',
                    },
                    {
                        path: 'cuisineType',
                    },
                ])
                .select('-categories');
              const featuredShops = shops?.filter(shop => shop?.shopZone)

            // featuredShops.sort(() => Math.random() - 0.5);

            // const newFeaturedShops = featuredShops.slice(0, 5);

            const sortedShops = shopSortingFunc(featuredShops).slice(0, 5);

            await processShops(screen, sortedShops, plusUser, latitude, longitude);
        };

        const findOurTopPicksScreen = userAppScreen.find(
            screen => screen.section === `featured` && screen.shopType === 'all'
        );
        const findOurTopPicksScreenForFood = userAppScreen.find(
            screen =>
                screen.section === `featured` && screen.shopType === 'food'
        );
        const findOurTopPicksScreenForGrocery = userAppScreen.find(
            screen =>
                screen.section === `featured` && screen.shopType === 'grocery'
        );
        const findOurTopPicksScreenForPharmacy = userAppScreen.find(
            screen =>
                screen.section === `featured` && screen.shopType === 'pharmacy'
        );

        if (findOurTopPicksScreen) {
            await processOurTopPicksShops(findOurTopPicksScreen);
        }
        if (findOurTopPicksScreenForFood) {
            await processOurTopPicksShops(findOurTopPicksScreenForFood, 'food');
        }
        if (findOurTopPicksScreenForGrocery) {
            await processOurTopPicksShops(
                findOurTopPicksScreenForGrocery,
                'grocery'
            );
        }
        if (findOurTopPicksScreenForPharmacy) {
            await processOurTopPicksShops(
                findOurTopPicksScreenForPharmacy,
                'pharmacy'
            );
        }
        // console.log(`After Our Top Picks ${moment.now() - startTime} ms`)

        // You Will Love To
        const processYouWillLoveToShops = async (screen, orderType) => {
            const lastOrder = await OrderModel.findOne({
                user: userId,
                orderType,
            })
                .sort({ createdAt: 'desc' })
                .populate({
                    path: 'shop',
                    select: 'cuisineType tags',
                });

            const shopTags = lastOrder?.shop?.tags || [];
            const shopCuisines = lastOrder?.shop?.cuisineType || [];

            const shops = await ShopModel.find({
                ...shopConfig,
                $or: [
                    { tags: { $in: shopTags } },
                    { cuisineType: { $in: shopCuisines } },
                ],
            })
                .sort(shopCommonSorting)
                // .limit(5)
                .populate([
                    {
                        path: 'seller',
                        select: '-password',
                    },
                    {
                        path: 'banner',
                    },
                    {
                        path: 'products',
                        populate: 'marketing',
                    },
                    {
                        path: 'marketings',
                    },
                    {
                        path: 'cuisineType',
                    },
                ])
                .select('-categories');

            const filteredShopsAll = shops?.filter(shop => shop?.shopZone);
                
            const sortedShops = shopSortingFunc(filteredShopsAll).slice(0, 5);

            await processShops(screen, sortedShops, plusUser, latitude, longitude);
        };

        const findYouWillLoveToScreen = userAppScreen.find(
            screen => screen.section === `love` && screen.shopType === 'all'
        );
        const findYouWillLoveToScreenForFood = userAppScreen.find(
            screen => screen.section === `love` && screen.shopType === 'food'
        );
        const findYouWillLoveToScreenForGrocery = userAppScreen.find(
            screen => screen.section === `love` && screen.shopType === 'grocery'
        );
        const findYouWillLoveToScreenForPharmacy = userAppScreen.find(
            screen =>
                screen.section === `love` && screen.shopType === 'pharmacy'
        );

        if (findYouWillLoveToScreen) {
            await processYouWillLoveToShops(findYouWillLoveToScreen);
        }
        if (findYouWillLoveToScreenForFood) {
            await processYouWillLoveToShops(
                findYouWillLoveToScreenForFood,
                'food'
            );
        }
        if (findYouWillLoveToScreenForGrocery) {
            await processYouWillLoveToShops(
                findYouWillLoveToScreenForGrocery,
                'grocery'
            );
        }
        if (findYouWillLoveToScreenForPharmacy) {
            await processYouWillLoveToShops(
                findYouWillLoveToScreenForPharmacy,
                'pharmacy'
            );
        }
        userAppScreen = await filterScreensByActiveZones(userAppScreen);

        successResponse(res, {
            message: 'success',
            data: {
                userAppScreen,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getTypeOfShopsForApps = async (req, res) => {
    try {
        const { longitude, latitude, shopType } = req.query;
        const plusUser = req.plusUser;
        const userId = req.userId;

        if (!latitude && !longitude && !shopType)
            return errorResponse(
                res,
                'Longitude, latitude and shopType are required!'
            );

        const appSetting = await AppSetting.findOne().select("nearByShopKm");
        const km = appSetting?.nearByShopKm || 1;
        const maxDistanceInMeters = 1000 * km;

        let userAppScreen = await UserAppScreenModel.find({
            screen: shopType,
            shopType,
            status: 'active',
        })
            .sort({ sortingOrder: 1, createdAt: -1 })
            .select('title section')
            .lean();

        const shopConfig = {
            _id: {
                $in: await findNearestShopIdsForEachBrand(
                    longitude,
                    latitude,
                    maxDistanceInMeters
                ),
            }, //TODO: need to test
            shopType,
            // location: {
            //     $near: {
            //         $geometry: {
            //             type: 'Point',
            //             coordinates: [longitude, latitude],
            //         },
            //         $maxDistance: maxDistanceInMeters,
            //     },
            // },
            parentShop: null,
            deletedAt: null,
        };

        // Order Again
        const findOrderAgainScreen = userAppScreen.find(
            screen => screen.section === 'order-again'
        );
        if (findOrderAgainScreen) {
            const pastOrderShopIds = await OrderModel.find({
                user: userId,
                orderStatus: 'delivered',
                orderType: shopType,
            })
                .sort({ createdAt: 'desc' })
                 .distinct('shop')
                .lean();

            const pastOrderShops = await ShopModel.find({
                _id: { $in: pastOrderShopIds },
                //  ...shopConfig,
            })
                .sort(shopCommonSorting)
                // .limit(5)
                .populate([
                    {
                        path: 'marketings',
                    },
                    {
                        path: 'products',
                        populate: 'marketing',
                    },
                    {
                        path: 'cuisineType',
                    },
                ]);
             
            const sortedShops = shopSortingFunc(pastOrderShops).slice(0, 5);
            await processShops(findOrderAgainScreen, sortedShops, latitude, longitude);
        }

        // Our Top Picks
        const findOurTopPicksScreen = userAppScreen.find(
            screen => screen.section === 'featured'
        );

        if (findOurTopPicksScreen) {
            const featuredShops = await ShopModel.find({
                ...shopConfig,
                isFeatured: true,
            })
                .sort(shopCommonSorting)
                // .limit(5)
                .populate([
                    {
                        path: 'seller',
                        select: '-password',
                    },
                    {
                        path: 'banner',
                    },
                    {
                        path: 'products',
                        populate: 'marketing',
                    },
                    {
                        path: 'marketings',
                    },
                    {
                        path: 'cuisineType',
                    },
                ])
                .select('-categories');

            // featuredShops.sort(() => Math.random() - 0.5);

            // const newFeaturedShops = featuredShops.slice(0, 5);

            const sortedShops = shopSortingFunc(featuredShops).slice(0, 5);

            await processShops(findOurTopPicksScreen, sortedShops, plusUser, latitude, longitude);
        }

        // Offers || Free Delivery || Crazy Deals
        const findOffersScreen = userAppScreen.find(
            screen => screen.section === 'discount'
        );
        const findFreeDeliveryScreen = userAppScreen.find(
            screen => screen.section === 'free-delivery'
        );
        const findCrazyDealsScreen = userAppScreen.find(
            screen => screen.section === 'crazy-offer-shops'
        );

        if (
            findOffersScreen ||
            findFreeDeliveryScreen ||
            findCrazyDealsScreen
        ) {
            // const shops = filteredShops.filter(shop => shop?.marketings?.length > 0);
            const shops = await ShopModel.find({
                ...shopConfig,
                marketings: { $elemMatch: { $exists: true } },
            })
                .sort(shopCommonSorting)
                .populate([
                    {
                        path: 'seller',
                        select: '-password',
                    },
                    {
                        path: 'banner',
                    },
                    {
                        path: 'products',
                        populate: 'marketing',
                    },
                    {
                        path: 'cuisineType',
                    },
                    {
                        path: 'marketings',
                    },
                ]);


            if (findOffersScreen) {
                await processShopsForScreen(shops, findOffersScreen, shop => {
                    const findOffer = shop.marketings.find(
                        marketing =>
                            ['percentage', 'double_menu', 'reward'].includes(
                                marketing.type
                            ) &&
                            marketing.isActive &&
                            !marketing.onlyForSubscriber
                    );
                    return findOffer;
                }, plusUser, latitude, longitude);
            }

            if (findFreeDeliveryScreen) {
                if (!plusUser) {
                    await processShopsForScreen(
                        shops,
                        findFreeDeliveryScreen,
                        shop => {
                            const findFreeDelivery = shop.marketings.find(
                                marketing =>
                                    ['free_delivery'].includes(
                                        marketing.type
                                    ) && marketing.isActive
                            );
                            return findFreeDelivery;
                        }, plusUser, latitude, longitude
                    );
                } else {
                    findFreeDeliveryScreen.shops = [];
                }
            }

            if (findCrazyDealsScreen) {
                if (plusUser) {
                    await processShopsForScreen(shops, findCrazyDealsScreen, shop => {
                        const findOffer = shop.marketings.find(
                            marketing =>
                                ['percentage', 'double_menu'].includes(
                                    marketing.type
                                ) &&
                                marketing.isActive &&
                                marketing.onlyForSubscriber
                        );
                        return findOffer;
                    }, plusUser, latitude, longitude);
                } else {
                    findCrazyDealsScreen.shops = [];
                }
            }
        }

        // You Will Love To
        const findYouWillLoveToScreen = userAppScreen.find(
            screen => screen.section === 'love'
        );

        if (findYouWillLoveToScreen) {
            const lastOrder = await OrderModel.findOne({
                user: userId,
                orderType: shopType,
            })
                .sort({ createdAt: 'desc' })
                .populate({
                    path: 'shop',
                    select: 'cuisineType tags',
                });

            const shopTags = lastOrder?.shop?.tags || [];
            const shopCuisines = lastOrder?.shop?.cuisineType || [];

            const shops = await ShopModel.find({
                ...shopConfig,
                $or: [
                    { tags: { $in: shopTags } },
                    { cuisineType: { $in: shopCuisines } },
                ],
            })
                .sort(shopCommonSorting)
                // .limit(5)
                .populate([
                    {
                        path: 'seller',
                        select: '-password',
                    },
                    {
                        path: 'banner',
                    },
                    {
                        path: 'products',
                        populate: 'marketing',
                    },
                    {
                        path: 'marketings',
                    },
                    {
                        path: 'cuisineType',
                    },
                ])
                .select('-categories');

            const sortedShops = shopSortingFunc(shops).slice(0, 5);

            await processShops(findYouWillLoveToScreen, sortedShops, plusUser, latitude, longitude);
        }
        userAppScreen = await filterScreensByActiveZones(userAppScreen);

        successResponse(res, {
            message: 'success',
            data: {
                userAppScreen,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
exports.getUserOrderAgain = async (req, res) => {
    try {
        const {
            longitude,
            latitude,
            page = 1,
            pageSize = 50,
            shopType,
            listContainers,
            deals,
            mixProductPrice,
            dietaries,
            priceSort,
            ratingSort,
            deliveryTimeSort,
            maxDeliveryFee,
        } = req.query;
        const plusUser = req.plusUser;
        const userId = req.userId;
        if (!latitude && !longitude)
            return errorResponse(res, 'Longitude and latitude is required!');
        const appSetting = await AppSetting.findOne().select('nearByShopKm');
        const nearByShopKm = appSetting?.nearByShopKm || 1;
        const maxShopDistanceInMeters = 1000 * nearByShopKm;
        const commonShopConfig = {
            shopStatus: 'active',
            parentShop: null,
            deletedAt: null,
        };
        let sort = shopCommonSorting;
        if (mixProductPrice?.length >= 3)
            commonShopConfig.expensive = { $in: JSON.parse(mixProductPrice) };
        if (dietaries?.length >= 3)
            commonShopConfig.dietary = { $in: JSON.parse(dietaries) };
        if (['asc', 'desc'].includes(priceSort))
            sort = { expensive: priceSort };
        if (ratingSort === 'yes') sort = { rating: 'desc' };

        const shopConfig = {
            ...commonShopConfig,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: maxShopDistanceInMeters,
                },
            },
        };
        const checkPlusUserMarketing = async (shop, skipProduct = false) => {
            shop.marketings = shop.marketings.filter(
                marketing => !marketing.onlyForSubscriber
            );

            if (!skipProduct) {
                for (const product of shop.products) {
                    await checkPlusUserProductMarketing(product);
                }
            }
        };

        const pastOrderShopIds = await OrderModel.find({
            user: userId,
            orderStatus: 'delivered',
        })
            .sort({ createdAt: 'desc' })
            .distinct('shop')
            .lean();


        const processOrderAgainShops = async (screen, shopType) => {
            let shops = await ShopModel.find({
                _id: { $in: pastOrderShopIds },
                ...shopConfig,
                shopType,
            })
                .sort(sort)
                // .limit(5)
                .populate([
                    { path: 'marketings' },
                    { path: 'products', populate: 'marketing' },
                    { path: 'cuisineType' },
                ]);

            let newShops = [];

            if (maxDeliveryFee === 0)
                for (const singleShop of shops) {
                    let result = false;
                    if (singleShop.freeDelivery)
                        result = singleShop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        );
                    if (result) {
                        if (!plusUser) await checkPlusUserMarketing(singleShop);
                        singleShop._doc.deliveryFee = 0
                        newShops.push(singleShop)
                    }
                }
            else if (maxDeliveryFee > 0)
                for (const singleShop of shops) {
                    const result = await getShopByDeliveryCharge(
                        singleShop,
                        latitude,
                        longitude,
                        maxDeliveryFee
                    );
                    if (result === true) {
                        let deliveryFee = await getDeliveryCharge(
                            singleShop,
                            latitude,
                            longitude,
                            plusUser
                        );
                        if (!plusUser) await checkPlusUserMarketing(singleShop);
                        singleShop._doc.deliveryFee = deliveryFee
                        newShops.push(singleShop)
                    }
                }
            else
                for (const singleShop of shops) {

                    let deliveryFee = await getDeliveryCharge(
                        singleShop,
                        latitude,
                        longitude,
                        plusUser
                    );
                    if (!plusUser) await checkPlusUserMarketing(singleShop);
                    singleShop._doc.deliveryFee = deliveryFee
                    newShops.push(singleShop)
                }

            if (deals?.length >= 3) {
                const listOfDeals = JSON.parse(deals);

                const dealsList = await FilterContainerModel.find({
                    _id: { $in: listOfDeals },
                });

                let isDoubleDeal = false;
                let isFreeDelivery = false;
                let percentageDeals = [];

                for (const deal of dealsList) {
                    isDoubleDeal = deal?.deals?.includes('double_menu');
                    isFreeDelivery = deal?.deals?.includes('free_delivery');
                    percentageDeals = deal?.deals?.filter(
                        singleDeal =>
                            !['double_menu', 'free_delivery'].includes(
                                singleDeal
                            )
                    );
                }

                let doubleDealShops = [];
                let freeDeliveryShops = [];
                let percentageDealShops = [];

                if (isDoubleDeal) {
                    doubleDealShops = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'double_menu' &&
                                marketing.isActive
                        )
                    );
                }

                if (isFreeDelivery) {
                    freeDeliveryShops = newShops.filter(shop =>
                        shop.marketings.some(
                            marketing =>
                                marketing.type === 'free_delivery' &&
                                marketing.isActive
                        )
                    );
                }

                if (percentageDeals.length > 0) {
                    percentageDealShops = newShops.filter(shop =>
                        shop.marketings.some(marketing => {
                            if (
                                marketing.type === 'percentage' &&
                                marketing.isActive
                            ) {
                                const marketingDiscounts =
                                    marketing.discountPercentages.map(String);
                                return percentageDeals.some(discount =>
                                    marketingDiscounts.includes(discount)
                                );
                            }
                        })
                    );
                }

                const newShopList = [
                    ...doubleDealShops,
                    ...freeDeliveryShops,
                    ...percentageDealShops,
                ];

                const uniqueShopList = [];

                for (const shop of newShopList) {
                    const findShop = uniqueShopList?.find(
                        uniqueShop =>
                            uniqueShop?._id?.toString() ===
                            shop?._id?.toString()
                    );
                    if (!findShop) {
                        uniqueShopList.push(shop);
                    }
                }

                newShops = uniqueShopList;
            }

            if (listContainers?.length >= 3) {
                const listOfDeals = JSON.parse(listContainers);

                const dealsList = await ListContainerModel.find({
                    _id: { $in: listOfDeals },
                });

                let dealsArr = [];
                let tagsArr = [];
                let shopsArr = [];

                for (const deal of dealsList) {
                    if (deal.type.includes('deal')) {
                        dealsArr = [...dealsArr, ...deal.deals];
                    }
                    if (deal.type.includes('tag')) {
                        tagsArr = [...tagsArr, ...deal.tags];
                    }
                    if (deal.type.includes('shop')) {
                        shopsArr = [...shopsArr, ...deal.shops];
                    }
                }

                let dealsShop = [];
                let tagsShop = [];
                let shopsShop = [];

                if (shopsArr.length > 0) {
                    shopsArr = [...new Set(shopsArr)];

                    const shopsArrString = shopsArr?.map(id => id.toString());

                    shopsShop = newShops.filter(shop =>
                        shopsArrString.includes(shop?._id?.toString())
                    );
                }

                if (dealsArr.length > 0) {
                    dealsArr = [...new Set(dealsArr)];

                    let isDoubleDeal = dealsArr?.includes('double_menu');
                    let isFreeDelivery = dealsArr?.includes('free_delivery');
                    let percentageDeals = dealsArr?.filter(
                        singleDeal =>
                            !['double_menu', 'free_delivery'].includes(
                                singleDeal
                            )
                    );

                    if (isDoubleDeal) {
                        const list = newShops.filter(shop =>
                            shop.marketings.some(
                                marketing =>
                                    marketing.type === 'double_menu' &&
                                    marketing.isActive
                            )
                        );
                        dealsShop = [...dealsShop, ...list];
                    }

                    if (isFreeDelivery) {
                        const list = newShops.filter(shop =>
                            shop.marketings.some(
                                marketing =>
                                    marketing.type === 'free_delivery' &&
                                    marketing.isActive
                            )
                        );
                        dealsShop = [...dealsShop, ...list];
                    }

                    if (percentageDeals.length > 0) {
                        const list = newShops.filter(shop =>
                            shop.marketings.some(marketing => {
                                if (
                                    marketing.type === 'percentage' &&
                                    marketing.isActive
                                ) {
                                    const marketingDiscounts =
                                        marketing.discountPercentages.map(
                                            String
                                        );

                                    return percentageDeals.some(discount =>
                                        marketingDiscounts.includes(discount)
                                    );
                                }
                            })
                        );

                        dealsShop = [...dealsShop, ...list];
                    }
                }

                if (tagsArr.length > 0) {
                    tagsArr = [...new Set(tagsArr)];

                    const tagsArrString = tagsArr?.map(id => id.toString());

                    const tagsList = newShops.filter(shop =>
                        shop.tagsId.some(tag =>
                            tagsArrString.includes(tag?._id?.toString())
                        )
                    );
                    const cuisineList = newShops.filter(shop =>
                        shop.cuisineType.some(cuisine =>
                            tagsArrString.includes(cuisine?._id?.toString())
                        )
                    );

                    tagsShop = [...tagsList, ...cuisineList];
                }

                const newShopList = [...dealsShop, ...tagsShop, ...shopsShop];

                const uniqueShopList = [];

                for (const shop of newShopList) {
                    const findShop = uniqueShopList?.find(
                        uniqueShop =>
                            uniqueShop?._id?.toString() ===
                            shop?._id?.toString()
                    );
                    if (!findShop) {
                        uniqueShopList.push(shop);
                    }
                }

                newShops = uniqueShopList;
            }
            if (deliveryTimeSort === 'yes') {
                // for (const shop of newShops) {
                //     let shopDistance = await getDistance(
                //         latitude,
                //         longitude,
                //         shop.location?.coordinates[1],
                //         shop.location?.coordinates[0],
                //         'k'
                //     );
                //     if (!shopDistance) shopDistance = 1;
                //     shop.shopDistance = shopDistance;
                // }
                // newShops = newShops.sort(
                //     (a, b) => a.shopDistance - b.shopDistance
                // );
                newShops = newShops.sort((a, b) => (a.avgOrderDeliveryTime || 20)  - (b.avgOrderDeliveryTime || 20));
            }

            // Open shop need to show top and then closed shop
            const openShops = newShops
                .map(shop => {
                    shop._doc.isShopOpen = checkShopOpeningHours(shop)
                    return shop
                })
                .reduce(
                    (accumulator, currentShop) => {
                        if (
                            currentShop._doc.liveStatus === 'online' &&
                            currentShop._doc.isShopOpen
                        )
                            accumulator[0].push(currentShop);
                        else accumulator[1].push(currentShop);
                        return accumulator;
                    },
                    [[], []]
                );

            const finalShops = [...openShops[0], ...openShops[1]];
            await processShops(screen, finalShops, plusUser, latitude, longitude);
        };

        let findOrderAgainScreen = { shops: [] };
        await processOrderAgainShops(findOrderAgainScreen, shopType);

        const paginate = await paginationMultipleModel({
            page,
            pageSize,
            total: findOrderAgainScreen.shops.length,
            pagingRange: 5,
        });

        findOrderAgainScreen= await filterByShopZone(findOrderAgainScreen);

        successResponse(res, {
            message: 'success',
            data: { ...findOrderAgainScreen, paginate },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
