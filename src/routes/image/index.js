const express = require('express');
const router = express.Router();
const controller = require('../../controllers/ImageController');

/**
 * /admin
 * @url http://localhost:5001/image
 *
 */

router.post('/single-image-upload', controller.singleImageUpload);
router.get('/files', controller.getListFiles);
router.get('/files/:name', controller.download);
router.get('/download', controller.imageDownload);

module.exports = router;
