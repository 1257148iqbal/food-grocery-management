const express = require('express');
const router = express.Router();
const appSettingController = require('../../../controllers/AppSettingController');
const RewardSettingController = require('../../../controllers/RewardSettingController');
const DealSettingController = require('../../../controllers/DealSettingController');
const FeaturedSettingController = require('../../../controllers/FeaturedSettingController');
const ReferralSettingController = require('../../../controllers/ReferralSettingController');
const PayoutSettingController = require('../../../controllers/PayoutSettingController');
const SubscriptionSettingController = require('../../../controllers/SubscriptionSettingController');
const AdminController = require('../../../controllers/AdminController');
const RatingSettingController = require('../../../controllers/RatingSettingController');
const ProductController = require('../../../controllers/ProductController');
const HealthyCornerSettingController = require('../../../controllers/HealthyCornerSettingController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');
const BrandController = require('../../../controllers/BrandController');
/**
 * /admin
 * @url http://localhost:5001/admin/setting
 *
 */

// app-setting
router.get('/app-setting', appSettingController.getAppSetting);
router.post(
    '/app-setting/add-near-by-shop-km',
    checkAdminToken,
    appSettingController.addNearByShopKm
);
router.post(
    '/app-setting/edit',
    checkAdminToken,
    appSettingController.editAppSetting
);

router.get(
    '/app-setting/cs-max-value',
    appSettingController.getMaxCustomerServiceValue
);
router.get('/app-setting/terms', appSettingController.getTermsAndCondition);
router.post(
    '/app-setting/terms/edit',
    appSettingController.editTermsAndCondition
);
router.post(
    '/app-setting/search-delivery-boy-km',
    checkAdminToken,
    appSettingController.editSearchDeliveryBoyKM
);

router.get('/admin-logs', AdminController.getAdminLogHistory);

// Reward Setting
router.get('/reward-setting', RewardSettingController.getRewardSetting);
router.get(
    '/get-reward-category-wise-product',
    ProductController.getRewardCategoryWiseProducts
);
router.post(
    '/reward-setting/edit',
    checkAdminToken,
    RewardSettingController.editRewardSetting
);

// Deal Setting
router.get('/deal-setting', DealSettingController.getDealSetting);
router.post(
    '/deal-setting/edit',
    checkAdminToken,
    DealSettingController.editDealSetting
);

// Rating Setting
router.get('/rating', RatingSettingController.getRatingSettingForAdmin);
router.post('/rating/add', RatingSettingController.addRatingSetting);
router.post('/rating/edit', RatingSettingController.editRatingSetting);
router.post('/rating/delete', RatingSettingController.deleteRatingSetting);

// Referral Setting
router.get('/referral-setting', ReferralSettingController.getReferralSetting);
router.get('/referral-history', ReferralSettingController.getReferralHistory);
router.post(
    '/referral-setting/edit',
    checkAdminToken,
    ReferralSettingController.editReferralSetting
);

// Featured Setting
router.get('/featured-setting', FeaturedSettingController.getFeaturedSetting);
router.post(
    '/featured-setting/edit',
    checkAdminToken,
    FeaturedSettingController.editFeaturedSetting
);

// Payout Setting
router.get('/payout-setting', PayoutSettingController.getPayoutSetting);
router.post(
    '/payout-setting/edit',
    checkAdminToken,
    PayoutSettingController.editPayoutSetting
);

// Subscription Setting
router.get(
    '/subscription-setting',
    SubscriptionSettingController.getSubscriptionSetting
);
router.post(
    '/subscription-setting/edit',
    checkAdminToken,
    SubscriptionSettingController.editSubscriptionSetting
);

// Healthy Corner Setting
router.get(
    '/healthyCorner-setting',
    HealthyCornerSettingController.getHealthyCornerSetting
);
router.post(
    '/healthyCorner-setting/edit',
    checkAdminToken,
    HealthyCornerSettingController.editHealthyCornerSetting
);

// Privacy
router.get('/app-setting/privacy', appSettingController.getPrivacySettings);
router.post(
    '/app-setting/privacy/edit',
    appSettingController.editPrivacySettings
);

router.get('/brand/', BrandController.getBrands);
router.post('/brand/add', BrandController.addBrand);
router.post('/brand/edit', BrandController.editBrand);
router.post('/brand/delete', BrandController.deleteBrand);

module.exports = router;
