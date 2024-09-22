const express = require('express');
const router = express.Router();
const CouponController = require('../../../../controllers/CouponController');

/**
 * /app/user/banner
 * @url http://localhost:5001/app/user/coupon
 *
 */

router.get('/check', CouponController.checkCouponForUserApp);
router.post('/add', CouponController.addCouponForUserApp);
router.get('/history', CouponController.couponHistoryForUserApp);
router.get('/shop', CouponController.userValidCouponForShop);

module.exports = router;
