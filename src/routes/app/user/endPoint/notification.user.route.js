const express = require('express');
const router = express.Router();
const NotificationController = require('../../../../controllers/NotificationController');

/**
 * /app/user/notification
 * @url http://localhost:5001/app/user/notification
 *
 */

router.get('/', NotificationController.getNotificationForUser);
router.get(
    '/get-single-details',
    NotificationController.getSingleNotificationForUser
);
router.get('/delete', NotificationController.deleteAllNotificationForUserApp);

router.get('/unseen-count', NotificationController.getUnseenNotificationForUser);

module.exports = router;
