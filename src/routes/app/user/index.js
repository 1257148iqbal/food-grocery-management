const express = require('express');
const { checkUserToken } = require('../../../authentication/checkUserToken');
const router = express.Router();

/**
 * /app/user
 * @url http://localhost:5001/app/user
 *
 */

router.use('/banner', require('./endPoint/banner.user.route'));
router.use('/auth', require('./endPoint/auth.user.route'));
router.use('/profile', checkUserToken, require('./endPoint/user.user.route'));
router.use('/address', require('./endPoint/address.user.route'));
router.use('/order', require('./endPoint/order.user.route'));
router.use('/butler', require('./endPoint/butler.user.route'));
router.use('/super-markets', require('./endPoint/superMarket.user.route'));
router.use('/product', require('./endPoint/product.user.route'));
router.use('/shop', require('./endPoint/shop.user.route'));
router.use('/home', require('./endPoint/home.user.route'));
router.use(
    '/favorite',
    checkUserToken,
    require('./endPoint/favourite.user.route')
);
router.use('/category', require('./endPoint/category.user.route'));
router.use('/sub-category', require('./endPoint/subCategory.user.route'));
router.use('/rating-setting', require('./endPoint/ratingSetting.user.route'));
router.use('/reward-setting', require('./endPoint/rewardSetting.user.route'));
router.use(
    '/reward-history',
    checkUserToken,
    require('./endPoint/rewardHistory.user.route')
);
router.use('/search', require('./endPoint/search.user.route'));
router.use('/deal', require('./endPoint/deal.user.route'));
router.use(
    '/notification',
    checkUserToken,
    require('./endPoint/notification.user.route')
);
router.use(
    '/admin-chat-request',
    checkUserToken,
    require('./endPoint/adminChat.user.route')
);
router.use('/top-up', require('./endPoint/topUp.user.route'));
router.use('/cart', require('./endPoint/cart.user.route'));

router.use('/faq', require('./endPoint/faq.user.route'));
router.use('/more', require('./endPoint/more.user.route'));

router.use('/request-area', require('./endPoint/requestArea.user.route'));
// Coupon feature
router.use('/coupon', checkUserToken, require('./endPoint/coupon.user.route'));
// Referral feature
router.use(
    '/referral',
    checkUserToken,
    require('./endPoint/referral.user.route')
);
// Zone feature
router.use('/zone', require('./endPoint/zone.user.route'));
// Subscription feature
router.use('/subscription', require('./endPoint/subscription.user.route'));

// Areeba payment gateway integration
router.use('/areeba-card', require('./endPoint/areebaCard.user.route'));
router.use('/privacy', require('./endPoint/privacy.user.route'));

module.exports = router;
