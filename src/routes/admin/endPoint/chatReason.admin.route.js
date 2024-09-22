const express = require('express');
const router = express.Router();
const ChatReasonController = require('../../../controllers/ChatReasonController');

/**
 * /admin/order
 * @url http://localhost:5001/admin/chat-reason
 *
 */

router.get('/', ChatReasonController.getChatReasonForAdmin);
router.post('/add', ChatReasonController.addChatReason);
router.post('/edit', ChatReasonController.editChatReason);
router.post('/delete', ChatReasonController.deleteChatReason);
router.post('/sort', ChatReasonController.sortChatReason);

module.exports = router;
