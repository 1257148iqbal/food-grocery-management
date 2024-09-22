const express = require('express');
const router = express.Router();
const walletController = require('../../../controllers/WalletController');

/**
 * /admins/user-chat-request
 * @url http://localhost:5001/admin/wallet
 *
 *
 */

router.get('/admin', walletController.getAdminTransaction);
router.get('/delivery-boy', walletController.getDeliveryBoyTransaction);
router.get('/seller', walletController.getShopTransaction);

module.exports = router;
