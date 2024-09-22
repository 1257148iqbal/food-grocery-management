const { errorResponse, successResponse } = require('../helpers/apiResponse');
const FilterContainerModel = require('../models/FilterContainerModel');
const { pagination } = require('../helpers/pagination');
const moment = require('moment');
const ShopModel = require('../models/ShopModel');
const { shopCommonSorting } = require('../helpers/shopCommonSorting');

exports.getFilterContainers = async (req, res) => {
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
            model: FilterContainerModel,
            condition: whereConfig,
            pagingRange: 5,
        });

        const filterContainer = await FilterContainerModel.find(whereConfig)
            .sort([
                ['sortingOrder', sortBy],
                ['createdAt', -1],
            ])
            .skip(paginate.offset)
            .limit(paginate.limit);

        successResponse(res, {
            message: 'Successfully find',
            data: {
                filterContainer,
                paginate,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.addFilterContainer = async (req, res) => {
    try {
        const { name, deals, shopType } = req.body;

        const filterContainer = await FilterContainerModel.create({
            name,
            deals,
            shopType,
        });

        successResponse(res, {
            message: 'Successfully added',
            data: {
                filterContainer,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.updateFilterContainer = async (req, res) => {
    try {
        const { id, name, deals, shopType, status } = req.body;

        const isExist = await FilterContainerModel.findOne({
            _id: id,
        });

        if (!isExist) return errorResponse(res, 'Filter Container not found');

        await FilterContainerModel.updateOne(
            { _id: id },
            {
                $set: {
                    name,
                    deals,
                    shopType,
                    status,
                },
            }
        );

        const filterContainer = await FilterContainerModel.findOne({ _id: id });

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                filterContainer,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.sortFilterContainer = async (req, res) => {
    try {
        const { list } = req.body;

        list?.forEach(async element => {
            await FilterContainerModel.updateOne(
                { _id: element.id },
                {
                    $set: {
                        sortingOrder: element.sortingOrder,
                    },
                }
            );
        });

        const filterContainer = await FilterContainerModel.find().sort([
            ['sortingOrder', 'asc'],
            ['createdAt', -1],
        ]);

        successResponse(res, {
            message: 'Successfully Updated',
            data: {
                filterContainer,
            },
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.deleteFilterContainer = async (req, res) => {
    try {
        const { id } = req.body;

        const filterContainer = await FilterContainerModel.findOne({
            _id: id,
        });

        if (!filterContainer) {
            return res.status(200).json({
                status: false,
                message: 'Filter container not found',
            });
        }

        await FilterContainerModel.findByIdAndDelete(id);

        return res.status(200).json({
            status: true,
            message: 'Tag Successfully Deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

exports.getShopByFilterContainer = async (req, res) => {
    try {
        const { id } = req.query;

        const filterContainer = await FilterContainerModel.findOne({
            _id: id,
        });

        if (!filterContainer)
            return errorResponse(res, 'Filter Container not found');

        const shops = await ShopModel.find({
            shopType: filterContainer?.shopType,
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

        if (filterContainer?.deals?.length > 0) {
            let isDoubleDeal = filterContainer?.deals?.includes('double_menu');
            let isFreeDelivery =
                filterContainer?.deals?.includes('free_delivery');
            let percentageDeals = filterContainer?.deals?.filter(
                singleDeal =>
                    !['double_menu', 'free_delivery'].includes(singleDeal)
            );

            if (isDoubleDeal) {
                const doubleDealShops = shops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'double_menu' &&
                            marketing.isActive
                    )
                );

                newShops = [...newShops, ...doubleDealShops];
            }

            if (isFreeDelivery) {
                const freeDeliveryShops = shops.filter(shop =>
                    shop.marketings.some(
                        marketing =>
                            marketing.type === 'free_delivery' &&
                            marketing.isActive
                    )
                );

                newShops = [...newShops, ...freeDeliveryShops];
            }

            if (percentageDeals.length > 0) {
                const percentageDealShops = shops.filter(shop =>
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

                newShops = [...newShops, ...percentageDealShops];
            }
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
