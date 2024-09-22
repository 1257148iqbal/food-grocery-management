const express = require('express');
const router = express.Router();
const adminController = require('../../../controllers/AdminController');
const EmailController = require('../../../controllers/EmailController');
const userController = require('../../../controllers/UserController');
const SellerController = require('../../../controllers/SellerController');
const DeliveryBoyController = require('../../../controllers/DeliveryBoyController');
/**
 * /admin/auth
 * @url http://localhost:5001/admin/auth
 *
 */

router.post('/login', adminController.adminLogin);
router.post('/add-default-admin', adminController.addDefaultAdmin);

module.exports = router;
