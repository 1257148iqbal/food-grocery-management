const express = require('express');
const router = express.Router();
const NotificationController = require('../../../../controllers/NotificationController');

/**
 * /app/seller/notification
 * @url http://localhost:5001/app/seller/notification
 *
 */

router.get('/', NotificationController.getNotificationForShop);
router.get(
    '/get-single-details',
    NotificationController.getSingleNotificationForSeller
);
router.get('/delete', NotificationController.deleteAllNotificationForShopApp);

router.get('/unseen-count', NotificationController.getUnseenNotificationForShop);

module.exports = router;
