const express = require('express');
const router = express.Router();
const TagController = require('../../../controllers/TagController');

/**
 * /admin
 * @url http://localhost:5001/admin/tags
 *
 */

router.get('/', TagController.getTags);
router.post('/add', TagController.addTag);
router.post(
    '/update',
    TagController.updateTag
);
router.post('/delete', TagController.deleteTag);

module.exports = router;
