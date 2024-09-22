const express = require('express');
const AttributeController = require('../../../controllers/AttributeController');
const router = express.Router();

router.post('/add-new', AttributeController.createAttribute);
router.post('/add-multiple', AttributeController.createMultipleAttributes);
router.get('/get-all', AttributeController.getAllAttributes);
router.get('/get-by-id', AttributeController.getAttributeById);
router.get('/get-by-shop-id', AttributeController.getAttributesByShopId);
router.put('/update', AttributeController.updateAttribute);
router.put('/update-multiple', AttributeController.updateOrCreateMultipleAttributes);
router.delete('/delete', AttributeController.deleteAttribute);

module.exports = router;
 