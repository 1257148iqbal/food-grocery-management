const express = require('express');
const router = express.Router();
const TagCuisineController = require('../../../controllers/TagCuisineController');

/**
 * /admin
 * @url http://localhost:5001/admin/tags-cuisines
 *
 */

router.get('/', TagCuisineController.getTagsCuisines);
router.get('/shop', TagCuisineController.getShopByTagsAndCuisines);
router.post('/add', TagCuisineController.addTagCuisine);
router.post('/update', TagCuisineController.updateTagCuisine);
router.post('/delete', TagCuisineController.deleteTagCuisine);
router.post('/sort', TagCuisineController.sortTagCuisine);

module.exports = router;
