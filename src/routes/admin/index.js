const express = require('express');
const router = express.Router();
const { checkGlobalToken } = require('../../authentication/checkGlobalToken');
const { checkAdminToken } = require('../../authentication/checkAdminToken');
const { checkShopToken } = require('../../authentication/checkShopToken');
const { checkSellerToken } = require('../../authentication/checkSellerToken.js');
const { checkShopOrSellerToken } = require('../../authentication/checkShopOrSellerToken.js');

const {
    dynamicToken,
} = require('../../authentication/dynamicToken.js');
/**
 * /admin
 * @url http://localhost:5001/admin
 *
 */

router.use('/auth', require('./endPoint/auth.admin.route'));
router.use(
    '/admins',
    checkGlobalToken,
    require('./endPoint/admins.admin.route')
);
router.use('/banner', require('./endPoint/banner.admin.route'));
router.use('/review', require('./endPoint/review.admin.route'));
router.use('/category', require('./endPoint/category.admin.route'));
router.use('/sub-category', require('./endPoint/subCategory.admin.route'));
router.use('/product', require('./endPoint/product.admin.route'));
// Add new controller for attribute
router.use('/attribute', require('./endPoint/attribute.admin.route'));
router.use('/shop', require('./endPoint/shop.admin.route'));
router.use('/address', require('./endPoint/address.admin.route'));
router.use('/user', require('./endPoint/user.admin.route'));
router.use('/seller', require('./endPoint/seller.admin.route'));
router.use('/delivery-boy', require('./endPoint/delivery.admin.route'));
router.use('/firebase', require('./endPoint/firebase.admin.route'));
router.use('/cuisines', require('./endPoint/cuisines.admin.route'));
router.use('/tags', require('./endPoint/tag.admin.route'));
router.use('/tags-cuisines', require('./endPoint/tagCuisine.admin.route'));
router.use('/list-container', require('./endPoint/listContainer.admin.route'));
router.use(
    '/filter-container',
    require('./endPoint/filterContainer.admin.route')
);
router.use('/setting', require('./endPoint/setting.admin.route'));
router.use('/deal', require('./endPoint/deal.admin.route'));
router.use('/notification', require('./endPoint/notification.admin.route'));
router.use('/drop-pay', require('./endPoint/dropPay.admin.route'));
router.use('/order', require('./endPoint/order.admin.route'));
router.use('/butler', require('./endPoint/butler.admin.route'));
router.use(
    '/user-chat-request',
    // checkAdminToken,
    dynamicToken,
    require('./endPoint/chat.admin.route')
);
router.use('/wallet', require('./endPoint/wallet.admin.route'));
router.use('/faq', require('./endPoint/faq.admin.route'));
router.use('/flag', require('./endPoint/flag.admin.route'));
router.use('/order-cancel', require('./endPoint/orderCancel.admin.route'));
router.use('/chat-reason', require('./endPoint/chatReason.admin.route'));
router.use('/drop-charge', require('./endPoint/dropCharge.admin.route'));
router.use('/drop-wallet', require('./endPoint/dropWallet.admin.route'));

router.use('/message', require('./endPoint/message.admin.route'));

router.use('/dashboard', require('./endPoint/dashboard.admin.route'));
router.use('/financial', require('./endPoint/financial.admin.route'));

router.use(
    '/database',
    // checkAdminToken,
    require('./endPoint/backup.admin.route')
);

// Marketing System
router.use('/marketing', require('./endPoint/marketing.admin.route'));
// Request new area
router.use('/request-area', require('./endPoint/requestArea.admin.route'));
// Coupon feature
router.use('/coupon', require('./endPoint/coupon.admin.route'));
// Zone feature
router.use('/zone', require('./endPoint/zone.admin.route'));
// Payout feature
router.use('/payout', require('./endPoint/payout.admin.route'));
// BoB feature
router.use('/bobFinance', require('./endPoint/bobFinance.admin.route'));
// Rider weekly and Sales manager monthly reward feature
router.use('/reward', require('./endPoint/reward.admin.route'));
// Control User app screen
router.use('/userAppScreen', require('./endPoint/userAppScreen.admin.route'));
// Nutrition feature
router.use('/nutrition', require('./endPoint/nutrition.admin.route'));
// Healthy Corner feature
router.use('/globalMealPlan', require('./endPoint/globalMealPlan.admin.route'));
router.use('/mealPlan', require('./endPoint/mealPlan.admin.route'));
router.use('/dish', require('./endPoint/dish.admin.route'));
router.use('/admin-chat-request', checkShopOrSellerToken, require('./endPoint/adminChat.admin.route'));

// lyxa service fee
router.use('/service-fee', require('./endPoint/serviceFee.admin.route'));


// fixing
module.exports = router;
