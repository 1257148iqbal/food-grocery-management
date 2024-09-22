const express = require('express');
const router = express.Router();
const ListContainerController = require('../../../controllers/ListContainerController');

/**
 * /admin
 * @url http://localhost:5001/admin/list-container
 *
 */

router.get('/', ListContainerController.getListContainers);
router.get('/shop', ListContainerController.getShopByListContainer);
router.post('/add', ListContainerController.addListContainer);
router.post('/update', ListContainerController.updateListContainer);
router.post('/delete', ListContainerController.deleteListContainer);
router.post('/sort', ListContainerController.sortListContainer);

module.exports = router;
