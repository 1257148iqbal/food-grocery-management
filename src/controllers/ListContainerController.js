const { errorResponse, successResponse } = require('../helpers/apiResponse');
const ListContainerModel = require('../models/ListContainerModel');
const ShopModel = require('../models/ShopModel');
const { pagination } = require('../helpers/pagination');
const moment = require('moment');
const { shopCommonSorting } = require('../helpers/shopCommonSorting');

exports.getListContainers = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            searchKey,
            sortBy = 'asc',
            shopType,
            status,
            startDate,
            endDate,
        } = req.query;

        var whereConfig = {};

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
                status,
                ...whereConfig,
            };
        }

        if (
            shopType &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                shopType
            )
        ) {
            whereConfig = {
                shopType,
                ...whereConfig,
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: ListContainerModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const listContainer = await ListContainerModel.find(whereConfig)
            .sort([
                ['sortingOrder', sortBy],
                ['createdAt', -1],
            ])
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                listContainer,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.addListContainer = async (req, res) => {
    try {
        const { name, image, banner, type, deals, tags, shops, shopType } =
            req.body;

        const listContainer = await ListContainerModel.create({
            name,
            image,
            banner,
            type,
            deals,
            tags,
            shops,
            shopType,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                listContainer,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateListContainer = async (req, res) => {
    try {
        const {
            id,
            name,
            image,
            banner,
            type,
            deals,
            tags,
            shops,
            shopType,
            status,
        } = req.body;

        const isExist = await ListContainerModel.findOne({
            _id: id,
        });

        if (!isExist) return errorResponse(res, 'List Container not found');

        await ListContainerModel.updateOne(
            { _id: id },
            {
                $set: {
                    name,
                    image,
                    banner,
                    type,
                    deals,
                    tags,
                    shops,
                    shopType,
                    status,
                },
            }
        );

        const listContainer = await ListContainerModel.findOne({ _id: id });

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                listContainer,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.sortListContainer = async (req, res) => {
    try {
        const { list } = req.body;

        list?.forEach(async element => {
            await ListContainerModel.updateOne(
                { _id: element.id },
                {
                    $set: {
                        sortingOrder: element.sortingOrder,
                    },
                }
            );
        });

        const listContainer = await ListContainerModel.find().sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                listContainer,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteListContainer = async (req, res) => {
    try {
        const { id } = req.body;

        const listContainer = await ListContainerModel.findOne({
            _id: id,
        });

        if (!listContainer) {
            return res.status(200).json({
                status: false,
                message: 'List container not found',
            });
        }

        await ListContainerModel.findByIdAndDelete(id);

        return res.status(200).json({
            status: true,
            message: 'Tag Successfully Deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getShopByListContainer = async (req, res) => {
    try {
        const { id } = req.query;

        const listContainer = await ListContainerModel.findOne({
            _id: id,
        });

        if (!listContainer)
            return errorResponse(res, 'List Container not found');

        const shops = await ShopModel.find({
            shopType: listContainer?.shopType,
        })
            .sort(shopCommonSorting)
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

        let dealsArr = listContainer.deals;
        let tagsArr = listContainer.tags;
        let shopsArr = listContainer.shops;

        if (shopsArr.length > 0) {
            const shopsArrString = shopsArr?.map(id => id.toString());

            const list = shops.filter(shop =>
                shopsArrString.includes(shop?._id?.toString())
            );

            newShops = [...newShops, ...list];
        }

        if (dealsArr.length > 0) {
            let isDoubleDeal = dealsArr?.includes('double_menu');
            let isFreeDelivery = dealsArr?.includes('free_delivery');
            let percentageDeals = dealsArr?.filter(
                singleDeal =>
                    !['double_menu', 'free_delivery'].includes(singleDeal)
            );

            if (isDoubleDeal) {
                const list = shops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );

                newShops = [...newShops, ...list];
            }

            if (isFreeDelivery) {
                const list = shops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );

                newShops = [...newShops, ...list];
            }

            if (percentageDeals.length > 0) {
                const list = shops.filter(shop =>
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

                newShops = [...newShops, ...list];
            }
        }

        if (tagsArr.length > 0) {
            const tagsArrString = tagsArr?.map(id => id.toString());

            const tagsList = shops.filter(shop =>
                shop.tagsId.some(tag =>
                    tagsArrString.includes(tag?._id?.toString())
                )
            );
            const cuisineList = shops.filter(shop =>
                shop.cuisineType.some(cuisine =>
                    tagsArrString.includes(cuisine?._id?.toString())
                )
            );

            newShops = [...newShops, ...tagsList, ...cuisineList];
        }

        const uniqueShopList = [];

        newShops?.forEach(shop => {
            const findShop = uniqueShopList?.find(
                uniqueShop =>
                    uniqueShop?._id?.toString() === shop?._id?.toString()
            );
            if (!findShop) {
                uniqueShopList.push(shop);
            }
        });

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                shops: uniqueShopList,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
