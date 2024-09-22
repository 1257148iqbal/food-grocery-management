const express = require('express');
const router = express.Router();
const FilterContainerController = require('../../../controllers/FilterContainerController');

/**
 * /admin
 * @url http://localhost:5001/admin/filter-container
 *
 */

router.get('/', FilterContainerController.getFilterContainers);
router.get('/shop', FilterContainerController.getShopByFilterContainer);
router.post('/add', FilterContainerController.addFilterContainer);
router.post('/update', FilterContainerController.updateFilterContainer);
router.post('/delete', FilterContainerController.deleteFilterContainer);
router.post('/sort', FilterContainerController.sortFilterContainer);

module.exports = router;
