const express = require('express');
const router = express.Router();
const adminChatRequestController = require('../../../controllers/AdminChatRequestController');
const ChatReasonController = require('../../../controllers/ChatReasonController');

/**
 * /app/user/admin-chat-request
 * @url http://localhost:5001/app/user/admin-chat-request
 *
 */

router.get('/', adminChatRequestController.getOrderByAllChat);
router.post('/', adminChatRequestController.userSendChatRequest);
router.post('/send', adminChatRequestController.sendMessageToAdmin);
router.get('/check-ongoing', adminChatRequestController.checkOngoingChat);//
router.get('/chats-by-order', adminChatRequestController.getAllChatsOfOrder);
router.get('/chats-by-account', adminChatRequestController.getAllChatsOfAccount);
router.post('/close', adminChatRequestController.closeChatRequestByUser);
router.post('/seen', adminChatRequestController.seenChatMessage);

router.get('/chat-reason', ChatReasonController.getChatReasonForUserApp);
module.exports = router;
