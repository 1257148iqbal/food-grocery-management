const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const DealSettingModel = require('../models/DealSettingModel');
const MarketingModel = require('../models/MarketingModel');
const ProductModel = require('../models/ProductModel');
const ShopModel = require('../models/ShopModel');
const { addAdminLogAboutActivity } = require('./AdminController');
const {
    sendNotificationToShopForDeactivateMarketing,
} = require('./NotificationController');

exports.getDealSetting = async (req, res) => {
    try {
        const { type } = req.query;

        let config = {};

        if (type && ['pharmacy', 'grocery', 'restaurant'].includes(type)) {
            config = {
                type,
            };
        }

        const dealSetting = await DealSettingModel.find(config);

        if (!dealSetting) {
            return errorResponse(res, 'Deal Setting not found');
        }

        successResponse(res, {
            message: 'success',
            data: {
                dealSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editDealSetting = async (req, res) => {
    try {
        const id = req.adminId;
        const {
            deals = [], // [{percentageBundle: [],type: 'pharmacy' || 'grocery' || 'restaurant', option: ['double_menu', 'free_delivery', 'percentage', 'punch_marketing']}],
            type = [], //'pharmacy', 'grocery', 'restaurant'
        } = req.body;

        if (type && type.includes('pharmacy')) {
            let dealSetting = await DealSettingModel.findOne({
                type: 'pharmacy',
            });

            if (dealSetting == null) {
                dealSetting = new DealSettingModel({ type: 'pharmacy' });
            }

            const deal = deals.find(deal => deal.type === 'pharmacy');

            // await addAdminLogAboutActivity('pharmacy', id, deal, dealSetting);

            if (
                dealSetting.option.includes('percentage') &&
                !deal.option.includes('percentage')
            ) {
                await processMarketing('pharmacy', 'percentage');
            }

            if (
                dealSetting.option.includes('double_menu') &&
                !deal.option.includes('double_menu')
            ) {
                await processMarketing('pharmacy', 'double_menu');
            }

            if (
                dealSetting.option.includes('free_delivery') &&
                !deal.option.includes('free_delivery')
            ) {
                await processMarketing('pharmacy', 'free_delivery', {
                    freeDelivery: false,
                });
            }

            if (
                dealSetting.option.includes('punch_marketing') &&
                !deal.option.includes('punch_marketing')
            ) {
                await processMarketing('pharmacy', 'punch_marketing', {
                    isPunchMarketing: false,
                });
            }

            dealSetting.percentageBundle = deal.percentageBundle;
            dealSetting.option = deal.option;
            await dealSetting.save();
        }

        if (type && type.includes('grocery')) {
            let dealSetting = await DealSettingModel.findOne({
                type: 'grocery',
            });

            if (dealSetting == null) {
                dealSetting = new DealSettingModel({ type: 'grocery' });
            }

            const deal = deals.find(deal => deal.type === 'grocery');

            // await addAdminLogAboutActivity('grocery', id, deal, dealSetting);

            if (
                dealSetting.option.includes('percentage') &&
                !deal.option.includes('percentage')
            ) {
                await processMarketing('grocery', 'percentage');
            }

            if (
                dealSetting.option.includes('double_menu') &&
                !deal.option.includes('double_menu')
            ) {
                await processMarketing('grocery', 'double_menu');
            }

            if (
                dealSetting.option.includes('free_delivery') &&
                !deal.option.includes('free_delivery')
            ) {
                await processMarketing('grocery', 'free_delivery', {
                    freeDelivery: false,
                });
            }

            if (
                dealSetting.option.includes('punch_marketing') &&
                !deal.option.includes('punch_marketing')
            ) {
                await processMarketing('grocery', 'punch_marketing', {
                    isPunchMarketing: false,
                });
            }

            dealSetting.percentageBundle = deal.percentageBundle;
            dealSetting.option = deal.option;
            await dealSetting.save();
        }

        if (type && type.includes('restaurant')) {
            let dealSetting = await DealSettingModel.findOne({
                type: 'restaurant',
            });

            if (dealSetting == null) {
                dealSetting = new DealSettingModel({ type: 'restaurant' });
            }

            const deal = deals.find(deal => deal.type === 'restaurant');

            // await addAdminLogAboutActivity('restaurant', id, deal, dealSetting);

            if (
                dealSetting.option.includes('percentage') &&
                !deal.option.includes('percentage')
            ) {
                await processMarketing('food', 'percentage');
            }

            if (
                dealSetting.option.includes('double_menu') &&
                !deal.option.includes('double_menu')
            ) {
                await processMarketing('food', 'double_menu');
            }

            if (
                dealSetting.option.includes('free_delivery') &&
                !deal.option.includes('free_delivery')
            ) {
                await processMarketing('food', 'free_delivery', {
                    freeDelivery: false,
                });
            }

            if (
                dealSetting.option.includes('punch_marketing') &&
                !deal.option.includes('punch_marketing')
            ) {
                await processMarketing('food', 'punch_marketing', {
                    isPunchMarketing: false,
                });
            }

            dealSetting.percentageBundle = deal.percentageBundle;
            dealSetting.option = deal.option;
            await dealSetting.save();
        }

        const updatedDealSetting = await DealSettingModel.find();

        successResponse(res, {
            message: 'update successfully',
            data: {
                dealSetting: updatedDealSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

async function processMarketing(shopType, marketingType, updateShop = {}) {
    const marketings = await MarketingModel.find({
        shopType,
        type: marketingType,
        deletedAt: null,
    });
    const shopIds = await MarketingModel.find({
        shopType,
        type: marketingType,
        creatorType: 'shop',
        deletedAt: null,
    }).distinct('shop');

    const marketingIds = marketings.map(marketing => marketing._id);

    if (marketingIds.length > 0) {
        // Perform bulk update for MarketingModel
        await MarketingModel.updateMany(
            { _id: { $in: marketingIds } },
            {
                $set: {
                    deletedAt: new Date(),
                    isActive: false,
                    status: 'inactive',
                    marketingDeletedType: 'before_expired',
                },
            }
        );

        // Perform bulk update for ShopModel
        await ShopModel.updateMany(
            { marketings: { $in: marketingIds } },
            {
                ...updateShop,
                $pull: {
                    marketings: { $in: marketingIds },
                },
            }
        );

        if (marketingType === 'percentage') {
            // Process each marketing document for percentage type
            for (const marketing of marketings) {
                const productUpdates = marketing.products.map(async product => {
                    await ProductModel.updateOne(
                        { _id: { $in: product.product } },
                        {
                            $pull: {
                                marketing: marketing._id,
                            },
                        }
                    );

                    const findProduct = await ProductModel.findById(
                        product.product
                    ).populate('marketing');

                    const discounts = findProduct.marketing.reduce(
                        (accumulator, marketing) => {
                            if (marketing.isActive) {
                                const marketingProduct =
                                    marketing.products.find(
                                        item =>
                                            item.product.toString() ===
                                            product.product.toString()
                                    );

                                accumulator.discount +=
                                    marketingProduct.discount;
                                accumulator.percentageDiscount +=
                                    marketingProduct.discountPercentage;
                            }
                            return accumulator;
                        },
                        { discount: 0, percentageDiscount: 0 }
                    );

                    const discountPrice =
                        findProduct.price - discounts.discount;

                    findProduct.discountPercentage =
                        discounts.percentageDiscount;
                    findProduct.discount = discounts.discount;
                    findProduct.discountPrice = discountPrice;
                    await findProduct.save();
                });

                // Wait for all product updates to complete
                await Promise.all(productUpdates);
            }
        }

        if (marketingType === 'double_menu') {
            // Extract product IDs from marketing documents
            const productsId = marketings.flatMap(
                marketing =>
                    marketing.products?.map(product =>
                        product.product.toString()
                    ) || []
            );

            // Perform bulk update for ProductModel
            if (productsId.length > 0) {
                await ProductModel.updateMany(
                    { _id: { $in: productsId } },
                    {
                        $pull: {
                            marketing: { $in: marketingIds },
                        },
                    }
                );
            }
        }
    }

    if (shopIds.length > 0) {
        await sendNotificationToShopForDeactivateMarketing(
            shopIds,
            marketingType
        );
    }
}
