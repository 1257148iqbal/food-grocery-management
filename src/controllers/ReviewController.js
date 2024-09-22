const {
    validationError,
    successResponse,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');
const DeliveryBoyModel = require('../models/DeliveryBoyModel');
const ReviewModel = require('../models/ReviewModel');
const ShopModel = require('../models/ShopModel');
const { getAverageRate } = require('./OrderController');

exports.deleteReviewById = async (req, res) => {
    try {
        const { reviewId } = req.body;

        const isExist = await ReviewModel.findOne({ _id: reviewId });
        if (!isExist) return errorResponse(res, 'Review not found');

        if (isExist.type === 'deliveryBoy') {
            await ReviewModel.deleteOne({ _id: reviewId });

            const averageRateOfDeliveryBoy = await getAverageRate(
                isExist.deliveryBoy,
                'deliveryBoy'
            );
            await DeliveryBoyModel.updateOne(
                { _id: isExist.deliveryBoy },
                {
                    rating: Math.round(averageRateOfDeliveryBoy),
                    $pull: {
                        reviews: isExist._id,
                    },
                }
            );
        }

        if (isExist.type === 'shop') {
            await ReviewModel.deleteMany({
                order: isExist.order,
                shop: isExist.shop,
                user: isExist.user,
                type: 'shop',
            });

            const averageRateOfShop = await getAverageRate(
                isExist.shop,
                'shop'
            );
            await ShopModel.updateOne(
                { _id: isExist.shop },
                {
                    rating: Math.round(averageRateOfShop),
                    $pull: {
                        reviews: isExist._id,
                    },
                }
            );
        }

        successResponse(res, {
            message: 'Successfully deleted',
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.updateReviewVisibility = async (req, res) => {
    try {
        const { reviewId } = req.body;

        const isExist = await ReviewModel.findOne({ _id: reviewId });
        if (!isExist) return errorResponse(res, 'Review not found');

        if (isExist.type === 'deliveryBoy') {
            await ReviewModel.findByIdAndUpdate(reviewId, {
                reviewVisibility: !isExist.reviewVisibility,
            });

            const averageRateOfDeliveryBoy = await getAverageRate(
                isExist.deliveryBoy,
                'deliveryBoy'
            );
            await DeliveryBoyModel.updateOne(
                { _id: isExist.deliveryBoy },
                {
                    rating: Math.round(averageRateOfDeliveryBoy),
                }
            );
        }

        if (isExist.type === 'shop') {
            await ReviewModel.updateMany(
                {
                    order: isExist.order,
                    shop: isExist.shop,
                    user: isExist.user,
                    type: 'shop',
                },
                {
                    reviewVisibility: !isExist.reviewVisibility,
                }
            );

            const averageRateOfShop = await getAverageRate(
                isExist.shop,
                'shop'
            );
            await ShopModel.updateOne(
                { _id: isExist.shop },
                {
                    rating: Math.round(averageRateOfShop),
                }
            );
        }

        const updatedReview = await ReviewModel.findById(reviewId);

        successResponse(res, {
            message: 'Successfully updated',
            data: {
                review: updatedReview,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
