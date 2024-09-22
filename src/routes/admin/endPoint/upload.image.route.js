const express = require('express');
const router = express.Router();
const ImageController = require('../../../controllers/ImageController');

/**
 * /uploads
 * @url http://localhost:5001/admin/image/
 *
 */

router.post('/upload', ImageController.upload);
router.get('/files', ImageController.getListFiles);
router.get('/files/:name', ImageController.download);

module.exports = router;
