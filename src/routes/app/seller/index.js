const express = require('express');
const {
    checkSellerToken,
} = require('../../../authentication/checkSellerToken');
const { checkShopToken } = require('../../../authentication/checkShopToken');
const { checkUserToken } = require('../../../authentication/checkUserToken');
const router = express.Router();

/**
 * /app/store
 * @url http://localhost:5001/app/seller
 *
 */

router.use('/', require('./endPoint/address.seller.route'));
router.use('/auth', require('./endPoint/auth.seller.route'));
router.use(
    '/profile',
    checkShopToken,
    require('./endPoint/seller.seller.route')
);
router.use(
    '/notification',
    checkShopToken,
    require('./endPoint/notification.seller.route')
);
router.use(
    '/status',
    checkShopToken,
    require('./endPoint/status.seller.route')
);
router.use('/orders', checkShopToken, require('./endPoint/order.seller.route'));
router.use('/products', checkShopToken, require('./endPoint/product.seller.route'));
router.use('/category', checkShopToken, require('./endPoint/category.seller.route'));
router.use('/sub-category', checkShopToken, require('./endPoint/subCategory.seller.route'));

router.use('/faq', require('./endPoint/faq.seller.route'));
router.use('/more', require('./endPoint/more.seller.route'));
router.use('/admin-chat-request', checkShopToken, require('./endPoint/adminChat.seller.route'));
// separate deliveryBoy feature
router.use('/delivery-boy', checkShopToken, require('./endPoint/delivery.seller.route'));

module.exports = router;
