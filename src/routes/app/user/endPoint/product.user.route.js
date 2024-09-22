const express = require('express');
const {
    checkUserToken,
    checkPlusUser,
} = require('../../../../authentication/checkUserToken');
const router = express.Router();
const ProductController = require('../../../../controllers/ProductController');

/**
 * /app/user/product
 * @url http://localhost:5001/app/user/product
 *
 */

router.get('/', checkPlusUser, ProductController.getProductsForUserApp);
router.get(
    '/get-reward-category-wise-product',
    ProductController.getRewardCategoryWiseProducts
);
router.get('/get-reviews', ProductController.getAllProductReviewsForUserApp);
router.post('/add-reviews', checkUserToken, ProductController.addProductReview);
router.get(
    '/product-details',
    checkPlusUser,
    ProductController.getProductDetailsForUserApp
);

// router.get('/recommend', ProductController.recommendProduct);
// router.get('/free-delivery-item', ProductController.freeDeliveryProduct);
// router.get('/feature-product', ProductController.getFeatureProduct);
// router.get('/discount-product', ProductController.getDiscountProduct);
router.get('/popular-food', ProductController.popularFoodForUser);
router.get('/filter', ProductController.getProductsByfilterForUser);
router.get(
    '/get-product-with-deal',
    ProductController.getProductsByfilterForUser
);

router.get(
    '/discount',
    checkPlusUser,
    ProductController.getUserDiscountProduct
);
router.get(
    '/featured',
    checkPlusUser,
    ProductController.getUserFeaturedProduct
);
router.get(
    '/free-delivery',
    checkPlusUser,
    ProductController.getUserFreeDeliveryProduct
);
router.get(
    '/past-order',
    checkUserToken,
    ProductController.getUserPastOrderShop
);
router.get('/near-by', ProductController.getUserPastOrderShop);
router.get(
    '/specific-shop',
    ProductController.getProductsFromSpecificRestuarent
);
router.get(
    '/product-search-category-wise',
    ProductController.getCategoryWiseSearchUnderShop
);

router.post('/check-cart-new', ProductController.checkProductInCartNew);

module.exports = router;
