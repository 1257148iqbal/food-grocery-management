const express = require('express');
const router = express.Router();
const ShopController = require('../../../../controllers/ShopController');
const ProductController = require('../../../../controllers/ProductController');
const {
    checkUserTokenForUser,
    checkPlusUser,
} = require('../../../../authentication/checkUserToken');

/**
 * /app/user/shop
 * @url http://localhost:5001/app/user/shop
 *
 */

router.get('/', checkPlusUser, ShopController.getShopForUserApp);
router.get('/category/:id', checkPlusUser, ShopController.getCategoryList);
router.get(
    '/single-shop',
    checkUserTokenForUser,
    ShopController.getSingleShopDetailsForApps
);
router.get(
    '/single',
    checkUserTokenForUser,
    ShopController.getSingleShopByIdForApps
);
router.get('/reviews/:shopId', ShopController.getSingleShopReviewsForApps);
router.get('/get-reviews/:shopId', ShopController.getShopReviewsForApp);
router.get(
    '/punch-marketing',
    checkUserTokenForUser,
    ShopController.getSingleShopPunchMarketingForApps
);

router.get('/category-wise-shop', ShopController.getAllShopsCategoryForUserApp);
router.get('/near-by', ShopController.getNearByProductForUserApp);
router.get('/product', checkPlusUser, ShopController.getShopProductForUserApp);
router.get('/near-shops', ProductController.getUserNearShops);
router.get('/get-all-category', ProductController.getAllShopCategory);
router.get('/search-by-product-name', ProductController.shopSearch);
router.get('/shop-search-from-product', ShopController.findStoreByProduct);
// router.get('/shop-product-list-category-wise', ShopController.getNearByProductForUserApp);

module.exports = router;
