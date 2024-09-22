const express = require('express');
const router = express.Router();
const NotificationController = require('../../../../controllers/NotificationController');

/**
 * /app/delivery/notification
 * @url http://localhost:5001/app/delivery/notification
 *
 */

router.get('/', NotificationController.getNotificationForDeliveryBoy);
router.get(
    '/get-single-details',
    NotificationController.getSingleNotificationForDeliiveryBoy
);
router.get(
    '/delete',
    NotificationController.deleteAllNotificationForDeliveryApp
);

router.get('/unseen-count', NotificationController.getUnseenNotificationForDeliveryBoy);

module.exports = router;
