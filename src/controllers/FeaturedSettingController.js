const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const FeaturedSettingModel = require('../models/FeaturedSettingModel');
const ShopModel = require('../models/ShopModel');
const { addAdminLogAboutActivity } = require('./AdminController');

exports.getFeaturedSetting = async (req, res) => {
    try {
        const { featuredType, featuredStatus, shopId } = req.query;

        let config = {};

        if (
            featuredType &&
            ['food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'].includes(
                featuredType
            )
        ) {
            config = {
                featuredType,
            };
        }

        const featuredSetting = await FeaturedSettingModel.find(config);

        if (!featuredSetting.length) {
            return errorResponse(res, 'Featured Setting not found');
        }

        const shop = await ShopModel.findById(shopId);
        const shopExchangeRate = shop?.shopExchangeRate || 0;

        for (const featured of featuredSetting) {
            if (['active', 'inactive'].includes(featuredStatus)) {
                const findFeaturedItems = featured.featuredItems.filter(
                    item => item.featuredStatus === featuredStatus
                );
                featured._doc.featuredItems = findFeaturedItems;
            }

            for (const item of featured?.featuredItems) {
                if (shopExchangeRate !== 0) {
                    item._doc.secondaryFeaturedAmount =
                        item.featuredAmount * shopExchangeRate;
                }
            }
        }

        successResponse(res, {
            message: 'success',
            data: {
                featuredSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editFeaturedSetting = async (req, res) => {
    try {
        const id = req.adminId;
        const {
            features = [], // [{featuredType: 'food' || 'grocery' || 'pharmacy', featuredItems: [{featuredDuration:1,featuredAmount: 10, featuredStatus: 'active'}],
            featuredType = [], //'food', 'grocery', 'pharmacy', 'coffee', 'flower', 'pet'
        } = req.body;

        if (featuredType && featuredType.includes('food')) {
            let featuredSetting = await FeaturedSettingModel.findOne({
                featuredType: 'food',
            });

            if (featuredSetting == null) {
                featuredSetting = new FeaturedSettingModel({
                    featuredType: 'food',
                });
            }

            const featured = features.find(
                featured => featured.featuredType === 'food'
            );

            // await addAdminLogAboutActivity(
            //     'food',
            //     id,
            //     featured,
            //     featuredSetting
            // );

            featuredSetting.featuredItems = featured.featuredItems;
            await featuredSetting.save();
        }

        if (featuredType && featuredType.includes('grocery')) {
            let featuredSetting = await FeaturedSettingModel.findOne({
                featuredType: 'grocery',
            });

            if (featuredSetting == null) {
                featuredSetting = new FeaturedSettingModel({
                    featuredType: 'grocery',
                });
            }

            const featured = features.find(
                featured => featured.featuredType === 'grocery'
            );

            // await addAdminLogAboutActivity(
            //     'grocery',
            //     id,
            //     featured,
            //     featuredSetting
            // );

            featuredSetting.featuredItems = featured.featuredItems;
            await featuredSetting.save();
        }

        if (featuredType && featuredType.includes('pharmacy')) {
            let featuredSetting = await FeaturedSettingModel.findOne({
                featuredType: 'pharmacy',
            });

            if (featuredSetting == null) {
                featuredSetting = new FeaturedSettingModel({
                    featuredType: 'pharmacy',
                });
            }

            const featured = features.find(
                featured => featured.featuredType === 'pharmacy'
            );

            // await addAdminLogAboutActivity(
            //     'pharmacy',
            //     id,
            //     featured,
            //     featuredSetting
            // );

            featuredSetting.featuredItems = featured.featuredItems;
            await featuredSetting.save();
        }

        const updatedFeaturedSetting = await FeaturedSettingModel.find();

        successResponse(res, {
            message: 'update successfully',
            data: {
                featuredSetting: updatedFeaturedSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
