const express = require('express');
const router = express.Router();
const adminChatRequestController = require('../../../controllers/AdminChatRequestController');

/**
 * /admins/user-chat-request
 * @url http://localhost:5001/admin/user-chat-request
 *
 *
 */
// router.get('/', adminChatRequestController.getUserChatRequestForAdmin);
router.get('/', adminChatRequestController.getOrderByAllChatAdmin);
router.get(
    '/chats-by-order',
    adminChatRequestController.getAllChatsOfOrderAdmin
);
router.get(
    '/chats-by-account',
    adminChatRequestController.getAllChatsOfAccountAdmin
);

router.post('/accept', adminChatRequestController.acceptedChatRequest);
router.post('/reject', adminChatRequestController.rejectChatRequest);
router.post('/send-message', adminChatRequestController.sendMessageToUser);
router.post('/close', adminChatRequestController.closeChatRequestByAdmin);
router.get('/chats-in-order', adminChatRequestController.getOrderByChatsAdmin);
router.get('/last-five-order', adminChatRequestController.getLastFiveOrderAdmin);
router.get('/last-five-transaction', adminChatRequestController.getLastFiveTransactionAdmin);

router.get('/new-chats', adminChatRequestController.getAllNewChat);
router.get(
    '/ongoing-chats',
    adminChatRequestController.getAllOngoingChatSpecificAdmin
);
router.get(
    '/order/past-chats',
    adminChatRequestController.getAllPastOrderChatSpecificAdmin
);
router.get(
    '/account/past-chats',
    adminChatRequestController.getAllPastAccountChatSpecificAdmin
);
router.get(
    '/user/all-order-chats',
    adminChatRequestController.getAllOrderChatSpecificUser
);
router.get(
    '/user/all-account-chats',
    adminChatRequestController.getAllAccountChatSpecificUser
);
router.get('/all-order-chats', adminChatRequestController.getAllOrdersChat);
router.get('/all-account-chats', adminChatRequestController.getAllAccountsChat);

module.exports = router;
