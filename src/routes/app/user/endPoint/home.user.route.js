const express = require('express');
const router = express.Router();
const userHomeController = require('../../../../controllers/UserHomeController');
const {
    checkUserToken,
    checkUserTokenForUser,
    checkPlusUser,
} = require('../../../../authentication/checkUserToken');
const appSettingController = require('../../../../controllers/AppSettingController');
/**
 * /app/user/home
 * @url http://localhost:5001/app/user/home
 *
 */

router.get('/banner', userHomeController.getUserAppHomePageBanner);
router.get(
    '/shop',
    checkUserTokenForUser,
    userHomeController.getUserHomeApiForShop
);
router.get('/near-food', checkPlusUser, userHomeController.getNearReataurent);
router.get('/near-grocery', checkPlusUser, userHomeController.getNearGrocery);
router.get('/near-pharmacy', checkPlusUser, userHomeController.getNearPharmacy);
router.get('/near-coffee', checkPlusUser, userHomeController.getNearCoffee);
router.get('/near-flower', checkPlusUser, userHomeController.getNearFlower);
router.get('/near-pet', checkPlusUser, userHomeController.getNearPet);
router.get('/offer-shops', checkPlusUser, userHomeController.getOfferShops);
router.get(
    '/free-delivery-shops',
    checkPlusUser,
    userHomeController.getFreeDeliveryShops
);
router.get(
    '/crazy-offer-shops',
    checkPlusUser,
    userHomeController.getCrazyOfferShops
);

router.get(
    '/map-view-shops',
    checkPlusUser,
    userHomeController.getAllShopsForMapView
);

router.get('/filter-info', userHomeController.getHomeApiFilterHelper);
router.get('/offer', checkPlusUser, userHomeController.getOfferShopsByShopType);
router.get('/offer-item', userHomeController.getOfferItems);
router.get(
    '/filter-page',
    checkPlusUser,
    userHomeController.newFilterForUserApp
);
router.get('/currency', appSettingController.getAppSetting); //have to remove after deployment
router.get('/app-setting', appSettingController.getAppSetting);

router.get(
    '/love',
    checkUserTokenForUser,
    userHomeController.getUserHomeApiForLovingShop
);
router.get(
    '/punch-marketing',
    checkUserTokenForUser,
    userHomeController.getUserPunchMarketingForApps
);
router.get('/', checkPlusUser, userHomeController.getUserHomeForApps);
router.get('/order-again', checkPlusUser, userHomeController.getUserOrderAgain);
router.get(
    '/type-of-shops',
    checkPlusUser,
    userHomeController.getTypeOfShopsForApps
);

module.exports = router;
