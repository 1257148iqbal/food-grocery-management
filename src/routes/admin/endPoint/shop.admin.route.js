const express = require('express');
const router = express.Router();
const shopController = require('../../../controllers/ShopController');
const ZoneController = require('../../../controllers/ZoneController');
const {
    shopAddValidation,
    shopUpdateValidation,
} = require('../../../validation/shopValidation');
const AddressController = require('../../../controllers/AddressController');
const {
    addressAddValidation,
} = require('../../../validation/addressValidation');
/**
 * /admins
 * @url http://localhost:5001/admin/shop
 *
 *
 */

router.post('/login', shopController.useSignInFromShopApp);

router.get('/', shopController.getShops);
router.get('/get-shops-by-query', shopController.getShopsByQuery);
router.get('/all', shopController.getAllShops);
router.get('/seller-shop', shopController.getSellerShops);
router.get('/seller-all-shop', shopController.getSellerAllShops);
router.get('/single', shopController.getSingleShopById);
router.get('/reviews', shopController.getSingleShopReviews);
router.get('/flags', shopController.getSingleShopFlags);
router.get('/get-shops-by-brand', shopController.getShopsByBrand);

router.get('/category-subcategory-list', shopController.getCategorySubcategoryList);

router.post('/add', shopController.createShops);
router.post(
    '/add-feather-shop',
    shopAddValidation,
    shopController.addFeatherShop
);
router.post('/update', shopController.updateShop);
router.post('/delete', shopController.deleteShopById);
router.get(
    '/get-shop-details',
    shopController.getShopDetailsForAdmin
);
router.post(
    '/shop-visibility-change',
    shopController.changeShopVisibility
);
// router.post(
//     '/shop-reward-system-change',
//     addressAddValidation,
//     shopController.changeShopRewardSystem
// );
router.post('/add-deal', shopController.addDealsInShopFromAdmin);
router.post('/status', shopController.shopStatusChange);
router.post('/delete-deal', shopController.deleteDealsInShopFromAdmin);
router.post('/add-credential', shopController.addShopCredential);
router.post('/update-credential', shopController.updateShopCredential);
router.get('/credential', shopController.getCredentialList);
router.post('/delete-credential', shopController.removeShopCredential);
// Add max discount in specific shop
router.post('/add-maxDiscount', shopController.addMaxDiscountInShopFromAdmin);
// Best seller and shop favourites items
router.post('/add-best-seller', shopController.addBestSellerInShopFromAdmin);
router.post(
    '/add-shop-favourites',
    shopController.addShopFavouritesInShopFromAdmin
);
// Shop opening and closing hours feature
router.post(
    '/edit-shop-opening-hours',
    shopController.editShopOpeningHoursFromAdmin
);
router.post(
    '/get-schedule-orders',
    shopController.getScheduleOrderInUpdateClosingHours
);

// For specific user orders from specific shop
router.get('/order/specific-user', shopController.getSpecificUserOrders);
// Check shop location zones
router.get('/get-zones', ZoneController.getZonesByCoordinates);
// Shop brand feature
router.get('/brands', shopController.getShopBrands);

router.get('/ongoing-order', shopController.getShopOngoingOrder);

router.get('/offer-shops', shopController.getOfferShops);
router.get('/featured-shops', shopController.getFeaturedShops);
router.post('/sort', shopController.sortFeaturedShops);

module.exports = router;
