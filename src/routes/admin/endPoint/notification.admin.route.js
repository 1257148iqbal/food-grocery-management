const express = require('express');
const router = express.Router();
const NotificationController = require('../../../controllers/NotificationController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');

/**
 * /admin/notification
 * @url http://localhost:5001/admin/notification
 *
 */

router.get('/', NotificationController.listNotificationFromAdmin);
router.post('/add', NotificationController.sendNotificationByAdmin);
router.post('/delete', NotificationController.deleteNotificationByadmin);

router.get(
    '/specific-admin',
    checkAdminToken,
    NotificationController.getNotificationForAdmin
);
router.get(
    '/specific-admin/unseen-count',
    checkAdminToken,
    NotificationController.getUnseenNotificationForAdmin
);

router.get('/shop', NotificationController.getNotificationForShopConsole);
router.get('/shop/unseen-count', NotificationController.getUnseenNotificationForShopConsole);

module.exports = router;
