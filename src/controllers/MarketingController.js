const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const MarketingModel = require('../models/MarketingModel');
const ProductModel = require('../models/ProductModel');
const ShopModel = require('../models/ShopModel');
const moment = require('moment');
const { getGraphsForOrder } = require('./DashBoradController');
const Order = require('../models/OrderModel');
const GlobalDropCharge = require('../models/GlobalDropCharge');
const TransactionModel = require('../models/TransactionModel');
const ObjectId = require('mongoose').Types.ObjectId;
const short = require('short-uuid');
const { pagination } = require('../helpers/pagination');
const {
    getMarketingAmountSpent,
} = require('../helpers/getMarketingAmountSpent');
const { getDatesInRange } = require('../helpers/getDatesInRange');
const FeaturedSettingModel = require('../models/FeaturedSettingModel');
const DealSettingModel = require('../models/DealSettingModel');
const RewardSettingModel = require('../models/RewardSettingModel');

const {getCustomerIncreaseWithDiscount} = require('../helpers/marketingControllerHelper');

exports.getMarketing = async (req, res) => {
    try {
        const { shop, type = 'reward', creatorType = 'shop' } = req.query;

        let marketings = await MarketingModel.find({
            shop: shop,
            type: type,
            deletedAt: null,
        }).populate([
            {
                path: 'products.product',
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
                path: 'shop',
            },
        ]);

        if (!marketings.length) {
            if (type === 'free_delivery' && creatorType === 'admin') {
                const getShop = await ShopModel.findOne({ _id: shop });
                if (getShop.haveOwnDeliveryBoy)
                    return errorResponse(res, 'Shop has own rider');
            }

            return res.status(200).json({
                status: false,
                message: 'Marketing not found',
                error: 'Marketing not found',
                isMarketing: false,
            });
        }

        for (const marketing of marketings) {
            const amountSpent = await getMarketingAmountSpent(marketing._id);

            marketing._doc.amountSpent = amountSpent;
        }

        const checkCreatorType = marketings.some(
            item => item.creatorType === creatorType
        );

        const ongoingMarketing = marketings.some(item => item.isActive);
        const scheduledMarketing = marketings.some(
            item => item.status === 'active' && !item.isActive
        );

        if (!checkCreatorType)
            return res.status(200).json({
                // status: false,
                message: 'You are not eligible',
                error: 'You are not eligible',
                isNotEligible: true,
                status: ongoingMarketing
                    ? 'ongoing'
                    : scheduledMarketing
                        ? 'scheduled'
                        : 'paused',
                marketing: type !== 'percentage' ? marketings[0] : null,
                marketings,
            });

        return res.status(200).json({
            status: true,
            message: 'success',
            data: {
                marketing: type !== 'percentage' ? marketings[0] : null,
                marketings,
            },
            isMarketing: true,
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editMarketing = async (req, res) => {
    try {
        // "products": [
        //     {
        //         "id": "6411ad8db2ec7e19860eea96",
        //         "rewardCategory": "640ecd8e70ecae64b23cec08",
        //         "rewardBundle": 20,
        //         "reward": {
        //             "amount": 50,
        //             "points": 10
        //         },
        //         "discountPercentage": 20,
        //         "discount": 20,
        //         "discountPrice": 80
        //     }
        // ],

        // "duration": {
        //     "start": "2023-03-21T07:21:23.491Z",
        //     "end": "2023-04-13T07:21:23.491Z"
        // }

        let {
            shop,
            type = 'reward',
            creatorType = 'shop',
            products = [],
            duration,
            spendLimit,
            status,
            itemSelectionType,
            featuredDuration,
            featuredAmount,
            marketingRedeemReward,
            onlyForSubscriber = false,
            // Punch marketing feature
            punchTargetOrders,
            punchMinimumOrderValue,
            punchDayLimit,
            punchCouponDiscountType,
            punchCouponValue,
            punchCouponDuration,
            // set max discount per order
            maxDiscountPerOrder,
        } = req.body;
        if (maxDiscountPerOrder && maxDiscountPerOrder <= 0) return errorResponse(res, 'Max discount per order should be greater than 0');
        let marketing = null;
        if (type === 'percentage') {
            marketing = await MarketingModel.findOne({
                shop: shop,
                type: type,
                creatorType: creatorType,
                deletedAt: null,
            }).populate([{ path: 'products.product' }]);
        } else {
            marketing = await MarketingModel.findOne({
                shop: shop,
                type: type,
                deletedAt: null,
            }).populate([{ path: 'products.product' }]);
        }

        if (marketing?.type === 'featured')
            return errorResponse(
                res,
                'You have already been featured in a promotion'
            );

        const shopInfo = await ShopModel.findById(shop).select(
            'seller shopType shopExchangeRate'
        );

        if (!shopInfo) return errorResponse(res, 'Shop not found');

        if (type === 'featured') {
            const featuredSetting = await FeaturedSettingModel.findOne({
                featuredType: shopInfo.shopType,
            });

            if (creatorType === 'shop') {
                const findFeaturedValidation =
                    featuredSetting?.featuredItems?.some(
                        featured =>
                            featured.featuredDuration === featuredDuration &&
                            featured.featuredAmount === featuredAmount &&
                            featured.featuredStatus === 'active'
                    );

                if (!findFeaturedValidation) {
                    return errorResponse(
                        res,
                        'Featured amount has been changed'
                    );
                }
            } else {
                const findFeaturedValidation =
                    featuredSetting?.featuredItems?.some(
                        featured =>
                            featured.featuredDuration === featuredDuration &&
                            featured.featuredStatus === 'active'
                    );

                if (!findFeaturedValidation) {
                    return errorResponse(
                        res,
                        'Featured setting has been changed'
                    );
                }
            }
        }

        if (
            [
                'double_menu',
                'free_delivery',
                'percentage',
                'punch_marketing',
            ].includes(type)
        ) {
            const findDealSetting = await DealSettingModel.findOne({
                type:
                    shopInfo.shopType === 'food'
                        ? 'restaurant'
                        : shopInfo.shopType,
                option: { $in: [type] },
            });

            if (!findDealSetting) {
                return errorResponse(res, 'Admin deactivate this deal.');
            }

            if (type === 'percentage' && products?.length > 0) {
                const percentageBundle =
                    findDealSetting?.percentageBundle || [];

                const checkPercentageBundle = products.some(
                    product =>
                        !percentageBundle.includes(product.discountPercentage)
                );

                if (checkPercentageBundle) {
                    return errorResponse(
                        res,
                        'PercentageBundle has been changed'
                    );
                }
            }
        }

        if (type === 'reward') {
            const rewardSetting = await RewardSettingModel.findOne({});

            if (!rewardSetting) {
                return errorResponse(res, 'RewardSetting is not found.');
            }

            if (products?.length > 0) {
                const rewardBundle = rewardSetting.rewardBundle || [];
                const checkRewardBundle = products.some(
                    product => !rewardBundle.includes(product.rewardBundle)
                );
                if (checkRewardBundle) {
                    return errorResponse(res, 'RewardBundle has been changed.');
                }

                const rewardCategory = (rewardSetting.rewardCategory || [])
                    .map(category => {
                        if (category.status === 'active') {
                            return category._id.toString();
                        }
                    })
                    .filter(categoryId => categoryId);

                const checkRewardCategory = products.some(
                    product =>
                        !rewardCategory.includes(
                            product?.rewardCategory?.toString()
                        )
                );
                if (checkRewardCategory) {
                    return errorResponse(
                        res,
                        'RewardCategory has been changed.'
                    );
                }
            }
        }

        if (products?.length > 0) {
          
            const productsId = products?.map(product => product.id.toString());

            const findProductMarketing = await ProductModel.find({
                _id: { $in: productsId },
                'marketing.0': { $exists: true },
            })
                .populate('marketing')
                .select('marketing');

            for (const product of findProductMarketing) {
                if (product?.marketing[0]?.type !== type) {
                    return errorResponse(
                        res,
                        'Some products have already applied marketing'
                    );
                }
            }
        }

         if (marketing == null) {
            marketing = new MarketingModel({
                shop,
                shopType: shopInfo.shopType,
                type,
                creatorType,
            });
        }

        if (marketing.creatorType !== creatorType)
            return errorResponse(res, 'You are not eligible');

        let oldProducts = [];
        if (products?.length > 0) {
            
            const productsId = products?.map(product => product.id.toString());
            oldProducts = marketing?.products?.filter(
                product => !productsId.includes(product.product._id.toString())
            );
            const newProducts = products?.map(
                ({ id, discountPercentage, discount, discountPrice }) => ({
                    product: id.toString(),
                    discountPercentage,
                    discount,
                    discountPrice,
                })
            );

            console.log(newProducts,'new products')

            marketing.products = newProducts;
            if (type === 'percentage') {
                const productPercentages = products?.map(
                    product => product.discountPercentage
                );
                const uniqueProductPercentages = [
                    ...new Set(productPercentages),
                ];
                marketing.discountPercentages = uniqueProductPercentages;
            }
        }

        if (featuredDuration) {
            const start = moment();
            const end = moment().add(featuredDuration, 'days');
            duration = {
                start,
                end,
            };
            marketing.featuredDuration = featuredDuration;
        }
        if (featuredAmount) {
            marketing.featuredAmount = featuredAmount;
        }

        if (duration) {
            marketing.duration = duration;
        }

        if (spendLimit == 0 || spendLimit) {
            marketing.spendLimit = spendLimit;
        }

        if (status && ['active', 'inactive'].includes(status)) {
            if (status === 'active') {
                // const startDate = moment(new Date(duration?.start));
                // const currentDate = moment();
                //
                // // const startDay = startDate?.toISOString().substring(0, 10);
                // // const currentDay = currentDate?.toISOString().substring(0, 10);
                //
                // if (startDate <= currentDate) {
                //     marketing.isActive = true;
                // } else {
                //     marketing.isActive = false;
                // }
                marketing.isActive = true;
                marketing.status = status;
            } else {
                marketing.isActive = false;
                marketing.status = status;
                marketing.marketingPausedAt = new Date();
            }
        }

        if (
            itemSelectionType &&
            ['single', 'multiple'].includes(itemSelectionType)
        ) {
            marketing.itemSelectionType = itemSelectionType;
        }

        if (marketingRedeemReward) {
            marketing.marketingRedeemReward = marketingRedeemReward;
        }

        if ([true, false].includes(onlyForSubscriber)) {
            marketing.onlyForSubscriber = onlyForSubscriber;
        }

        // Punch marketing feature
        if (punchTargetOrders) {
            marketing.punchTargetOrders = punchTargetOrders;
        }

        if (punchMinimumOrderValue) {
            marketing.punchMinimumOrderValue = punchMinimumOrderValue;
        }

        if (punchDayLimit) {
            marketing.punchDayLimit = punchDayLimit;
        }

        if (punchCouponDiscountType) {
            marketing.punchCouponDiscountType = punchCouponDiscountType;
        }

        if (punchCouponValue) {
            marketing.punchCouponValue = punchCouponValue;
        }

        if (punchCouponDuration) {
            marketing.punchCouponDuration = punchCouponDuration;
        }

        if (maxDiscountPerOrder) {
            marketing.maxDiscountPerOrder = maxDiscountPerOrder;
        }
    //console.log(marketing,'check marketing');
        marketing = await marketing.save();

        // Update shop
        if (shop) {
            if (type === 'free_delivery') {
                await ShopModel.updateOne(
                    { _id: shop },
                    {
                        $addToSet: {
                            marketings: marketing._id,
                        },
                        $set: {
                            freeDelivery: true,
                            freeDealUpdateTime: new Date(),
                        },
                    }
                );
            } else if (['percentage', 'double_menu'].includes(type)) {
                await ShopModel.updateOne(
                    { _id: shop },
                    {
                        $addToSet: {
                            marketings: marketing._id,
                        },
                        $set: {
                            discountDealUpdateTime: new Date(),
                        },
                    }
                );
            } else if (['featured'].includes(type)) {
                await ShopModel.updateOne(
                    { _id: shop },
                    {
                        $addToSet: {
                            marketings: marketing._id,
                        },
                        $set: {
                            isFeatured: true,
                            featuredUpdatedTime: new Date(),
                        },
                    }
                );

                await ProductModel.updateMany(
                    { shop: shop },
                    {
                        $set: {
                            isFeatured: true,
                        },
                    }
                );

                if (creatorType === 'shop') {
                    await TransactionModel.create({
                        marketing: marketing._id,
                        autoTrxId: `TNX${moment().format(
                            'DDMMYYHmm'
                        )}${short().new()}`,
                        account: 'shop',
                        type: 'shopPayForFeatured',
                        status: 'success',
                        shop: shop,
                        seller: shopInfo.seller,
                        amount: featuredAmount,
                        secondaryCurrency_amount:
                            featuredAmount * shopInfo.shopExchangeRate,
                        adminNote: 'Shop pay for featured',
                        paidCurrency: 'baseCurrency',
                        orderType: shopInfo.shopType,
                    });
                }
            } else if (['punch_marketing'].includes(type)) {
                await ShopModel.updateOne(
                    { _id: shop },
                    {
                        $addToSet: {
                            marketings: marketing._id,
                        },
                        $set: {
                            isPunchMarketing: true,
                            punchMarketingUpdatedTime: new Date(),
                        },
                    }
                );
            } else {
                await ShopModel.updateOne(
                    { _id: shop },
                    {
                        $addToSet: {
                            marketings: marketing._id,
                        },
                    }
                );
            }
        }

        // Remove marketing from deleted product

        //console.log(oldProducts,'old product');
        if (oldProducts?.length > 0) {
            if (type === 'percentage') {
                for (const product of oldProducts) {
                    await ProductModel.updateOne(
                        { _id: { $in: product.product._id } },
                        {
                            $pull: {
                                marketing: marketing._id,
                            },
                            // $inc: {
                            //     discountPercentage: -product.discountPercentage,
                            //     discount: -product.discount,
                            //     discountPrice: -product.discountPrice,
                            // },
                        }
                    );

                    const findProduct = await ProductModel.findById(
                        product.product._id
                    ).populate('marketing');


                    console.log(findProduct,'find product')
                    const discountPercentage = findProduct.marketing.reduce(
                        (accumulator, marketing) => {
                            if (marketing.isActive) {
                                const marketingProduct =
                                    marketing.products.find(
                                        item =>
                                            item.product.toString() ===
                                            product.product._id.toString()
                                    );

                                return (
                                    accumulator +
                                    marketingProduct.discountPercentage
                                );
                            }
                            return accumulator + 0;
                        },
                        0
                    );
                    const discount = findProduct.marketing.reduce(
                        (accumulator, marketing) => {
                            if (marketing.isActive) {
                                const marketingProduct =
                                    marketing.products.find(
                                        item =>
                                            item.product.toString() ===
                                            product.product._id.toString()
                                    );

                                return accumulator + marketingProduct.discount;
                            }
                            return accumulator + 0;
                        },
                        0
                    );

                    const discountPrice = findProduct.price - discount;

                    findProduct.discountPercentage = discountPercentage;
                    findProduct.discount = discount;
                    findProduct.discountPrice = discountPrice;
                    await findProduct.save();
                }
            } else {
                const productsId = oldProducts?.map(product =>
                    product.product._id.toString()
                );
                await ProductModel.updateMany(
                    { _id: { $in: productsId } },
                    {
                        $pull: {
                            marketing: marketing._id,
                        },
                        $unset: {
                            rewardCategory: 1,
                            rewardBundle: 1,
                            reward: 1,
                        },
                    }
                );
            }
        }

        // Update product which is newly added
        if (products?.length > 0) {

            console.log('products if');
            if (type === 'percentage') {
                const discountPercentagesForPlusUser = [];
                const discountPercentagesForNormalUser = [];

                for (const product of products) {
                    await ProductModel.updateOne(
                        { _id: product.id },
                        {
                            $addToSet: {
                                marketing: marketing._id,
                            },
                        }
                    );

                    const findProduct = await ProductModel.findById(
                        product.id
                    ).populate('marketing');

                   console.log(findProduct,'shopExchnageRate')

                    const discountPercentage = findProduct.marketing.reduce(
                        (accumulator, marketing) => {
                            if (marketing.isActive) {
                                const marketingProduct =
                                    marketing.products.find(
                                        item =>
                                            item.product.toString() ===
                                            product.id.toString()
                                    );

                                return (
                                    accumulator +
                                    marketingProduct.discountPercentage
                                );
                            }
                            return accumulator + 0;
                        },
                        0
                    );
                    const discount = findProduct.marketing.reduce(
                        (accumulator, marketing) => {
                            if (marketing.isActive) {
                                const marketingProduct =
                                    marketing.products.find(
                                        item =>
                                            item.product.toString() ===
                                            product.id.toString()
                                    );

                                return accumulator + marketingProduct.discount;
                            }
                            return accumulator + 0;
                        },
                        0
                    );

                    const discountPrice = findProduct.price - discount;

                    findProduct.discountPercentage = discountPercentage;
                    findProduct.discount = discount;

                   
                    findProduct.discountPrice = discountPrice;
                //     const shopExchangeRate = await ShopModel.findById(shop).select('shopExchangeRate');
                //     console.log(shopExchangeRate,'check shop');
                //     let portionPrice = [];
                //     if (findProduct.portionPrices) {
                //       portionPrice = findProduct.portionPrices.map(data => {
                //         const discountAmount = Math.round(data.price * discountPercentage);
                //         const discountPrice = Math.round(data.price - discountAmount);
                //         const secondaryPrice = Math.round(data.price * shopExchangeRate.shopExchangeRate);
                      

                     
                //         return {
                //           ...data,
                //           discount: discountAmount,
                //           discountPrice: discountPrice,
                //           secondaryPrice: secondaryPrice,
                //           secondaryDiscount: Math.round(secondaryPrice * discountPercentage),
                //           secondaryDiscountPrice: secondaryPrice - (Math.round(secondaryPrice * discountPercentage))
                //         };
                //       });

                      
                //       findProduct.portionPrices = portionPrice;
                      
                //     } 
                  
                //   console.log(findProduct.portionPrices,'check portion prices');
                   await findProduct.save();

                    // Calc for frontend developer
                    const discountPercentageForNormalUser =
                        findProduct.marketing.reduce(
                            (accumulator, marketing) => {
                                if (marketing.isActive && !onlyForSubscriber) {
                                    const marketingProduct =
                                        marketing.products.find(
                                            item =>
                                                item.product.toString() ===
                                                product.id.toString()
                                        );

                                    return (
                                        accumulator +
                                        marketingProduct.discountPercentage
                                    );
                                }
                                return accumulator + 0;
                            },
                            0
                        );
                    discountPercentagesForPlusUser.push(discountPercentage);
                    if (discountPercentageForNormalUser) {
                        discountPercentagesForNormalUser.push(
                            discountPercentageForNormalUser
                        );
                    }
                }

                await MarketingModel.updateMany(
                    {
                        shop: shop,
                        type: 'percentage',
                        isActive: true,
                        deletedAt: null,
                    },
                    {
                        $set: {
                            discountPercentagesForPlusUser,
                            discountPercentagesForNormalUser,
                        },
                    }
                );
            } else if (type === 'double_menu') {
                products?.forEach(async product => {
                    await ProductModel.updateOne(
                        { _id: product.id },
                        {
                            $addToSet: {
                                marketing: marketing._id,
                            },
                        }
                    );
                });
            } else if (type === 'reward') {
                products?.forEach(async product => {
                    await ProductModel.updateOne(
                        { _id: product.id },
                        {
                            $addToSet: {
                                marketing: marketing._id,
                            },
                            $set: {
                                rewardCategory: product.rewardCategory,
                                rewardBundle: product.rewardBundle,
                                reward: product.reward,
                            },
                        }
                    );
                });
            }
        }

        const newMarketing = await MarketingModel.findOne({
            _id: marketing._id,
            shop: shop,
            deletedAt: null,
        }).populate([
            {
                path: 'products.product',
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
                path: 'shop',
            },
        ]);

        successResponse(res, {
            message: 'update successfully',
            data: {
                marketing: newMarketing,
            },
        });
    } catch (error) {
        console.error(error);
        errorHandler(res, error);
    }
};

exports.deleteMarketing = async (req, res) => {
    try {
        const { marketingId, shopId, creatorType, marketingDeletedType } =
            req.body;

        const isExist = await MarketingModel.findOne({
            _id: marketingId,
            shop: shopId,
            deletedAt: null,
        });

        if (!isExist) return errorResponse(res, 'Marketing not found');

        if (isExist.creatorType !== creatorType)
            return errorResponse(res, 'You are not eligible');

        await MarketingModel.updateOne(
            { _id: marketingId },
            {
                $set: {
                    deletedAt: new Date(),
                    isActive: false,
                    status: 'inactive',
                    marketingDeletedType: marketingDeletedType,
                },
            }
        );

        if (isExist.type === 'free_delivery') {
            await ShopModel.updateOne(
                { _id: shopId },
                {
                    freeDelivery: false,
                    sortingOrder: 0,
                    $pull: {
                        marketings: marketingId,
                    },
                }
            );
        } else if (isExist.type === 'featured') {
            await ShopModel.updateOne(
                { _id: shopId },
                {
                    isFeatured: false,
                    featuredUpdatedTime: null,
                    $pull: {
                        marketings: marketingId,
                    },
                    sortingOrder: 0,
                }
            );

            await ProductModel.updateMany(
                { shop: shopId },
                {
                    $set: {
                        isFeatured: false,
                    },
                }
            );
        } else if (isExist.type === 'punch_marketing') {
            await ShopModel.updateOne(
                { _id: shopId },
                {
                    isPunchMarketing: false,
                    sortingOrder: 0,
                    $pull: {
                        marketings: marketingId,
                    },
                }
            );
        } else {
            await ShopModel.updateOne(
                { _id: shopId },
                {
                    sortingOrder: 0,
                    $pull: {
                        marketings: marketingId,
                    },
                }
            );
        }

        if (isExist.type === 'percentage') {
            for (const product of isExist.products) {
                await ProductModel.updateOne(
                    { _id: { $in: product.product } },
                    {
                        $pull: {
                            marketing: marketingId,
                        },
                    }
                );

                const findProduct = await ProductModel.findById(
                    product.product
                ).populate('marketing');

                const discountPercentage = findProduct.marketing.reduce(
                    (accumulator, marketing) => {
                        if (marketing.isActive) {
                            const marketingProduct = marketing.products.find(
                                item =>
                                    item.product.toString() ===
                                    product.product.toString()
                            );

                            return (
                                accumulator +
                                marketingProduct.discountPercentage
                            );
                        }
                        return accumulator + 0;
                    },
                    0
                );
                const discount = findProduct.marketing.reduce(
                    (accumulator, marketing) => {
                        if (marketing.isActive) {
                            const marketingProduct = marketing.products.find(
                                item =>
                                    item.product.toString() ===
                                    product.product.toString()
                            );

                            return accumulator + marketingProduct.discount;
                        }
                        return accumulator + 0;
                    },
                    0
                );

                const discountPrice = findProduct.price - discount;

                findProduct.discountPercentage = discountPercentage;
                findProduct.discount = discount;
                findProduct.discountPrice = discountPrice;
                await findProduct.save();
            }
        } else {
            const productsId = isExist.products?.map(product =>
                product.product.toString()
            );

            await ProductModel.updateMany(
                { _id: { $in: productsId } },
                {
                    $pull: {
                        marketing: marketingId,
                    },
                    $unset: {
                        rewardCategory: 1,
                        rewardBundle: 1,
                        reward: 1,
                    },
                }
            );
        }

        successResponse(res, {
            message: 'Successfully Deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getDashboardInfo = async (req, res) => {
    try {
        const { marketingId } = req.query;

        const marketing = await MarketingModel.findOne({
            _id: marketingId,
            deletedAt: null,
        }).populate([{ path: 'products.product' }]);

        if (!marketing) return errorResponse(res, 'Marketing not found');

        const totalPromotionItems = marketing.products.length;

        let config = { orderStatus: 'delivered' };

        const timeDiff =
            new Date(marketing.duration.end).getTime() -
            new Date(marketing.duration.start).getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        const oldEndDate = new Date(marketing.duration.start);
        oldEndDate.setDate(oldEndDate.getDate() - 1);
        const oldStartDate = new Date(oldEndDate);
        oldStartDate.setDate(oldStartDate.getDate() - daysDiff);

        const totalOrders = await Order.count({
            ...config,
            shop: ObjectId(marketing.shop),
        });
        const totalOrdersOnPromotion = await Order.count({
            ...config,
            marketings: marketingId,
            shop: ObjectId(marketing.shop),
            createdAt: {
                $gte: moment(new Date(marketing.duration.start)),
                $lt: moment(new Date(marketing.duration.end)).add(1, 'days'),
            },
        });

        const totalOrdersBeforePromotion = await Order.count({
            ...config,
            shop: ObjectId(marketing.shop),
            createdAt: {
                $gte: oldStartDate,
                $lt: moment(new Date(oldEndDate)).add(1, 'days'),
            },
        });

        const totalOrdersLastMonth = await Order.count({
            ...config,
            shop: ObjectId(marketing.shop),
            createdAt: {
                $gte: moment(new Date(oldStartDate)),
                $lt: moment(new Date(oldEndDate)).add(1, 'days'),
            },
        });

        const orderIncreasePercentage =
            ((totalOrdersOnPromotion - totalOrdersBeforePromotion) / (totalOrdersBeforePromotion || 1)) * 100;
        const orderIncreasePercentageLastMonth =
            (totalOrdersLastMonth / (totalOrders || 1)) * 100;

        // console.log(`totalOrders---`,totalOrders,"--totalOrdersLastMonth---",totalOrdersLastMonth,`---totalOrdersOnPromotion---`,totalOrdersOnPromotion);
        const uniqueUsersSpecificShop = await Order.distinct('user', {
            ...config,
            shop: ObjectId(marketing.shop),
        });
        // const uniqueUsersSpecificShopOnPromotion = await Order.distinct(
        //     'user',
        //     {
        //         ...config,
        //         shop: ObjectId(marketing.shop),
        //         createdAt: {
        //             $gte: moment(new Date(marketing.duration.start)),
        //             $lt: moment(new Date(marketing.duration.end)).add(1, 'days'),
        //         },
        //     }
        // );


        // const uniqueUsersSpecificShopOnPromotion = await Order.aggregate([
        //     { $match: { ...config, marketings: ObjectId(marketingId), shop: ObjectId(marketing.shop) } },
        //     { $group: { _id: '$user', firstOrderDate: { $min: '$createdAt' } } },
        //     { $match: { firstOrderDate: { $gte: new Date(marketing.duration.start), $lt: new Date(moment(new Date(marketing.duration.end)).add(1, 'days')), } } },
        //     { $count: 'userCount' }
        // ]);

        // const uniqueUsersSpecificShopBeforePromotion = await Order.aggregate([
        //     { $match: { ...config, shop: ObjectId(marketing.shop) } },
        //     { $group: { _id: '$user', firstOrderDate: { $min: '$createdAt' } } },
        //     { $match: { firstOrderDate: { $gte: oldStartDate, $lt: moment(new Date(oldEndDate)).add(1, 'days'), } } },
        //     { $count: 'userCount' }
        // ]);



        // const uniqueUsersSpecificShopLastMonth = await Order.distinct('user', {
        //     ...config,
        //     shop: ObjectId(marketing.shop),
        //     createdAt: { $gte: moment(new Date(oldStartDate)), $lt: moment(new Date(oldEndDate)).add(1, 'days'), },
        // });
        const uniqueUsersSpecificShopLastMonth = await Order.aggregate([
            { $match: { ...config, shop: ObjectId(marketing.shop) } },
            { $group: { _id: '$user', firstOrderDate: { $min: '$createdAt' } } },
            { $match: { firstOrderDate: { $gte: new Date(oldStartDate), $lt: new Date(moment(new Date(oldEndDate)).add(1, 'days')), } } },
            { $count: 'userCount' }
        ]);

        const totalUsersSpecificShop = uniqueUsersSpecificShop.length;
        // const totalUsersSpecificShopOnPromotion =
        //     uniqueUsersSpecificShopOnPromotion?.[0]?.userCount ?? 0;
        // const totalUsersSpecificShopBeforePromotion =
        //     uniqueUsersSpecificShopBeforePromotion?.[0]?.userCount ?? 0;
        const totalUsersSpecificShopLastMonth =
            uniqueUsersSpecificShopLastMonth?.[0]?.userCount ?? 0;

        
        // const customerIncreasePercentage =
        //     ((totalUsersSpecificShopOnPromotion - totalUsersSpecificShopBeforePromotion) / (totalUsersSpecificShopBeforePromotion || 1)) * 100;
 
        const newCustomerOrders = await Order.aggregate([
            {
                $match: {
                    shop: ObjectId(marketing.shop),
                    marketings: {
                        $in: [ObjectId(marketing._id)],
                    },
                    orderStatus: 'delivered',
                    createdAt: {
                        $gte: new Date(marketing.duration.start),
                        $lt: moment(new Date(marketing.duration.end)).add(1, 'days').toDate(),
                    },
                },
            },
            {
                $group: {
                    _id: '$user',
                    firstOrderDate: { $min: '$createdAt' },
                },
            },
            {
                $match: {
                    firstOrderDate: {
                        $gte: new Date(marketing.duration.start),
                        $lt: moment(new Date(marketing.duration.end)).add(1, 'days').toDate(),
                    },
                },
            },
        ]);
        

        // Old Customer Calculation
        const oldCustomerOrders = await Order.aggregate([
            {
                $match: {
                    shop: ObjectId(marketing.shop),
                    orderStatus: 'delivered',
                    createdAt: {
                        $gte: oldStartDate,
                        $lt: moment(new Date(oldEndDate)).add(1, 'days').toDate(),
                    },
                },
            },
            {
                $group: {
                    _id: '$user',
                    firstOrderDate: { $min: '$createdAt' },
                },
            },
            {
                $match: {
                    firstOrderDate: {
                        $gte: oldStartDate,
                        $lt: moment(new Date(oldEndDate)).add(1, 'days').toDate(),
                    },
                },
            },
        ]);

        const newCustomers = newCustomerOrders.length;
        const oldCustomers = oldCustomerOrders.length;

        const customerIncreasePercentage = ((newCustomers - oldCustomers) / (oldCustomers || 1)) * 100;

        // const customerIncreasePercentage = await getCustomerIncreaseWithDiscount(marketing);

        const customerIncreasePercentageLastMonth =
            (totalUsersSpecificShopLastMonth / (totalUsersSpecificShop || 1)) * 100;

        let topSellingItems = [];
        if (marketing.type === 'reward') {
            marketing?.products?.forEach(async product => {
                const totalOrderOnProduct = await Order.aggregate([
                    {
                        $match: {
                            'products.product': ObjectId(product.product._id),
                            shop: ObjectId(marketing.shop),
                            marketings: {
                                $in: [ObjectId(marketing._id)],
                            },
                            isRedeemReward: true,
                            ...config,
                        },
                    },
                    {
                        $unwind: '$products',
                    },
                    {
                        $match: {
                            'products.product': ObjectId(product.product._id),
                        },
                    },
                    {
                        $group: {
                            _id: '$products.product',
                            quantity: { $sum: '$products.quantity' },
                            count: { $sum: 1 },
                        },
                    },
                ]);

                const totalOrderOnProductQuantity = totalOrderOnProduct[0]
                    ? totalOrderOnProduct[0].quantity
                    : 0;

                const totalPointUsed =
                    totalOrderOnProductQuantity *
                    product?.product?.reward?.points;

                topSellingItems.push({
                    ItemName: product.product.name,
                    pointsUsed: totalPointUsed,
                    itemsSold: totalOrderOnProductQuantity,
                });
            });

            topSellingItems?.sort((a, b) => b.itemsSold - a.itemsSold);
            topSellingItems = topSellingItems?.slice(0, 6);
        }

        let featuredAmount = 0;
        let featuredSpentAmount = 0;
        if (marketing.type === 'featured') {
            featuredAmount = marketing?.featuredAmount;

            const currentTimeDiff =
                new Date().getTime() -
                new Date(marketing.duration.start).getTime();
            const currentDaysDiff = Math.floor(
                currentTimeDiff / (1000 * 60 * 60 * 24)
            );
            featuredSpentAmount = parseFloat(
                ((featuredAmount * currentDaysDiff) / daysDiff).toFixed(2)
            );
            featuredSpentAmount =
                featuredSpentAmount > featuredAmount
                    ? featuredAmount
                    : featuredSpentAmount;
        }

        successResponse(res, {
            message: 'Successfully found',
            data: {
                summary: {
                    totalPromotionItems,
                    orderIncreasePercentage,
                    orderIncreasePercentageLastMonth,
                    customerIncreasePercentage,
                    customerIncreasePercentageLastMonth,
                    featuredAmount,
                    featuredSpentAmount,
                },
                topSellingItems,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getMarketingGraphOrders = async (req, res) => {
    try {
        const { marketingId, startDate, endDate } = req.query;
        const marketing = await MarketingModel.findOne({ _id: marketingId, deletedAt: null, });
        if (!marketing) return errorResponse(res, 'Marketing not found');
        if (!startDate || !endDate) return errorResponse(res, 'Dates not valid');

        let orderConfig = {
            shop: ObjectId(marketing.shop),
            orderStatus: 'delivered',
            marketings: marketing._id
        };
        let info = await getGraphsForOrder(new Date(startDate), new Date(endDate), orderConfig);

        successResponse(res, { message: 'Successfully found', data: { info, }, });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getMarketingGraphCustomers = async (req, res) => {
    try {
        const { marketingId, startDate, endDate } = req.query;
        const marketing = await MarketingModel.findOne({ _id: marketingId, deletedAt: null, });
        if (!marketing) return errorResponse(res, 'Marketing not found');
        if (!startDate || !endDate) return errorResponse(res, 'Dates not valid');

        let orderConfig = {
            shop: ObjectId(marketing.shop),
            orderStatus: 'delivered',
            marketings: marketing._id
        };
        let info = [];
        const dates = getDatesInRange(new Date(startDate), new Date(endDate));
        for (const date of dates) {
            const order = await Order.distinct('user', {
                ...orderConfig,
                createdAt: { $gte: moment(new Date(date)), $lt: moment(new Date(date)).add(1, 'days'), },
            });
            const orderCount = order.length;
            info.push({ customer: orderCount, date, });
        }

        successResponse(res, { message: 'Successfully found', data: { info, }, });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getMarketingGraphAmountSpent = async (req, res) => {
    try {
        const { marketingId, startDate, endDate } = req.query;
        const marketing = await MarketingModel.findOne({ _id: marketingId, deletedAt: null, });
        if (!marketing) return errorResponse(res, 'Marketing not found');
        if (!startDate || !endDate) return errorResponse(res, 'Dates not valid');

        let info = [];
        const dates = getDatesInRange(new Date(startDate), new Date(endDate));
        for (const date of dates) {
            const newStartDate = new Date(date);
            const newEndDate = new Date(date);
            const amountSpent = await getMarketingAmountSpent(marketing._id, newStartDate, newEndDate);
            info.push({ amountSpent, date, });
        }

        successResponse(res, { message: 'Successfully found', data: { info, }, });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getMarketingGraphLoyaltyPointsAmountSpent = async (req, res) => {
    try {
        const { marketingId, startDate, endDate } = req.query;
        const marketing = await MarketingModel.findOne({ _id: marketingId, type: 'reward', deletedAt: null, });
        if (!marketing) return errorResponse(res, 'Marketing not found');
        if (!startDate || !endDate) return errorResponse(res, 'Dates not valid');

        let orderConfig = {
            shop: ObjectId(marketing.shop),
            marketings: { $in: [ObjectId(marketing._id)], },
            orderStatus: 'delivered',
        };
        let info = [];
        const dates = getDatesInRange(new Date(startDate), new Date(endDate));
        for (const date of dates) {
            const sumOfOrderReward = await Order.aggregate([
                {
                    $match: {
                        ...orderConfig,
                        createdAt: { $gte: moment(new Date(date)).toDate(), $lt: moment(new Date(date)).add(1, 'days').toDate(), },
                    },
                },
                {
                    $group: {
                        _id: '',
                        shopCut: { $sum: { $sum: ['$rewardRedeemCut.rewardShopCut'], }, },
                        adminCut: { $sum: { $sum: ['$rewardRedeemCut.rewardAdminCut'], }, },
                        count: { $sum: 1 },
                    },
                },
            ]);

            const totalSumOfOrderRewardShopCut = sumOfOrderReward[0] ? sumOfOrderReward[0].shopCut : 0;
            const totalSumOfOrderRewardAdminCut = sumOfOrderReward[0] ? sumOfOrderReward[0].adminCut : 0;
            info.push({ shopAmountSpent: totalSumOfOrderRewardShopCut, adminAmountSpent: totalSumOfOrderRewardAdminCut, date, });
        }

        successResponse(res, { message: 'Successfully found', data: { info, }, });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getMarketingGraphLoyaltyPoints = async (req, res) => {
    try {
        const { marketingId, startDate, endDate } = req.query;
        const marketing = await MarketingModel.findOne({ _id: marketingId, type: 'reward', deletedAt: null, });
        if (!marketing) return errorResponse(res, 'Marketing not found');
        if (!startDate || !endDate) return errorResponse(res, 'Dates not valid');

        let orderConfig = { shop: ObjectId(marketing.shop), orderStatus: 'delivered', };
        let info = [];
        const dates = getDatesInRange(new Date(startDate), new Date(endDate));
        for (const date of dates) {
            const sumOfLoyaltyPoints = await Order.aggregate([
                {
                    $match: {
                        ...orderConfig,
                        createdAt: { $gte: moment(new Date(date)).toDate(), $lt: moment(new Date(date)).add(1, 'days').toDate(), },
                    },
                },
                {
                    $group: {
                        _id: '',
                        points: { $sum: { $sum: ['$summary.reward.points'], }, },
                        count: { $sum: 1 },
                    },
                },
            ]);

            const points = sumOfLoyaltyPoints[0] ? sumOfLoyaltyPoints[0].points : 0;
            info.push({ points, date, });
        }

        successResponse(res, { message: 'Successfully found', data: { info, }, });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.getMarketingHistory = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 50,
            pagingRange = 5,
            searchKey,
            sortBy = 'desc',
            startDate,
            endDate,
            shopId,
            creatorType,
            type,
            status,
        } = req.query;

        if (!shopId) {
            return errorResponse(res, 'ShopId must be required');
        }

        let whereConfig = {
            shop: shopId,
        };

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

        if (
            type &&
            [
                'percentage',
                'double_menu',
                'free_delivery',
                'reward',
                'featured',
                'punch_marketing',
            ].includes(type)
        ) {
            whereConfig = {
                type,
                ...whereConfig,
            };
        }

        if (creatorType && ['admin', 'shop'].includes(creatorType)) {
            whereConfig = {
                creatorType,
                ...whereConfig,
            };
        }
        if (status && ['active', 'inactive'].includes(status)) {
            whereConfig = {
                status,
                ...whereConfig,
            };
        }

        if (searchKey) {
            const newQuery = searchKey.split(/[ ,]+/);
            const typeSearchQuery = newQuery.map(str => ({
                type: RegExp(str, 'i'),
            }));

            whereConfig = {
                ...whereConfig,
                $and: [
                    {
                        $or: [{ $and: typeSearchQuery }],
                    },
                ],
            };
        }

        let paginate = await pagination({
            page,
            pageSize,
            model: MarketingModel,
            condition: whereConfig,
            pagingRange: pagingRange,
        });

        const marketings = await MarketingModel.find(whereConfig)
            .sort({ createdAt: sortBy })
            .skip(paginate.offset)
            .limit(paginate.limit);

        for (const marketing of marketings) {
            const amountSpent = await getMarketingAmountSpent(marketing._id);

            marketing._doc.amountSpent = amountSpent;
        }

        successResponse(res, {
            message: 'Successfully fetched',
            data: {
                marketings,
                paginate,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
