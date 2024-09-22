const {
    checkDeliveryBoyToken,
} = require('../../../authentication/checkDeliveryBoyToken');
const express = require('express');
const router = express.Router();
const DeliveryController = require('../../../controllers/DeliveryBoyController');
const {
    DeliveryAddValidation,
    DeliveryUpdateValidation,
} = require('../../../validation/DeliveryValidation');

/**
 * /app/delivery
 * @url http://localhost:5001/app/delivery
 *
 */

router.use(
    '/profile',
    checkDeliveryBoyToken,
    require('./endPoint/profile.delivery.route')
);
router.use('/auth', require('./endPoint/auth.delivery.route'));
router.use(
    '/order',
    checkDeliveryBoyToken,
    require('./endPoint/order.delivery.route')
);
router.use(
    '/butler',
    checkDeliveryBoyToken,
    require('./endPoint/butler.delivery.route')
);
router.use(
    '/address',
    checkDeliveryBoyToken,
    require('./endPoint/address.delivery.route')
);
router.use(
    '/notification',
    checkDeliveryBoyToken,
    require('./endPoint/notification.delivery.route')
);
router.use('/status', require('./endPoint/status.delivery.route'));
router.use(
    '/balance',
    checkDeliveryBoyToken,
    require('./endPoint/balance.delivery.route')
);

router.use('/faq', require('./endPoint/faq.delivery.route'));
router.use('/home', require('./endPoint/home.delivery.route'));
// Zone feature
router.use('/zone', require('./endPoint/zone.delivery.route'));
// Shop rider feature
router.use('/shop', require('./endPoint/shop.delivery.route'));
// BoB feature
router.use(
    '/bobFinance',
    checkDeliveryBoyToken,
    require('./endPoint/bobFinance.delivery.route')
);

module.exports = router;
