const express = require('express');
const router = express.Router();
const messageController = require('../../../controllers/MessageController');

/**
 * /admins/user-chat-request
 * @url http://localhost:5001/admin/message
 *
 *
 */

router.get('/', messageController.getMessage);
router.post('/', messageController.addMessage);
router.post('/update', messageController.editMessage);
router.post('/delete', messageController.deleteMessage);

module.exports = router;
