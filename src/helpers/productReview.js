const ReviewModel = require('../models/ReviewModel');
const ProductModel = require('../models/ProductModel');
const { getRewardPoints, getRewardAmount } = require('./rewardPoints');
const ObjectId = require('mongoose').Types.ObjectId;
exports.getProductReview = async productId => {
    const reviews = await ReviewModel.aggregate([
        {
            $match: {
                product: ObjectId(productId),
                type: 'shop',
            },
        },
        {
            $group: {
                _id: '',
                count: { $sum: 1 },
                totalRating: { $sum: { $sum: ['$rating'] } },
            },
        },
    ]);
    if (reviews.length < 1) {
        return null;
    }
    const { count, totalRating } = reviews[0];
    const rating = totalRating / count;
    if (rating >= 1 && rating < 2) {
        return 'Bad';
    } else if (rating >= 2 && rating < 3) {
        return 'Good';
    } else if (rating >= 3 && rating < 4) {
        return 'Very Good';
    } else if (rating >= 4) {
        return 'Excellent';
    }
};

exports.getProductReward = async productId => {
    const product = await ProductModel.findById(productId).populate(
        'marketing'
    );

    if (!product) {
        return errorResponse(res, 'Product not found');
    }

    let amount = 0;
    let points = 0;

    if (
        product?.marketing[0]?.isActive &&
        product?.marketing[0]?.type === 'reward'
    ) {
        const rewardCut = (product.price * product.rewardBundle) / 100;
        const rewardPoints = await getRewardPoints(rewardCut);

        points = rewardPoints.redeemPoints;
        amount = parseFloat((product?.price - rewardCut).toFixed(2));
    }

    return { amount, points };
};
