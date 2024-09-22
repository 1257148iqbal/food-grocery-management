const express = require('express');
const sellerController = require('../../../controllers/SellerController');
const OrderController = require('../../../controllers/OrderController');
const AddressController = require('../../../controllers/AddressController');
const {
    sellerAddValidation,
    sellerUpdateValidation,
} = require('../../../validation/sellerValidation');
const {
    addressAddValidation,
} = require('../../../validation/addressValidation');
const router = express.Router();
const { checkAdminToken } = require('../../../authentication/checkAdminToken');

/**
 * /seller
 * @url http://localhost:5001/admin/seller
 *
 *
 */

router.get('/', sellerController.getSeller);
router.post('/add', checkAdminToken, sellerController.createSellerByAdmin);
router.post('/update', sellerController.updateSeller);
router.post('/delete', sellerController.deleteSellerById);

router.get('/get-seller-details', sellerController.getSellerDetailsForAdmin);
router.post('/add-credential', sellerController.addCredential);
router.post('/update-credential', sellerController.updateCredential);
router.post(
    '/add-drop-charge',
    checkAdminToken,
    sellerController.addSellerDropCharge
);
router.post(
    '/add-delivery-cut',
    checkAdminToken,
    sellerController.setSellerDeliveryCut
);
router.get('/credential', sellerController.getCredentialList);
router.post('/delete-credential', sellerController.deleteCredential);
// For filtering account manager remaining seller
router.get(
    '/account-manager/remaining',
    sellerController.getRemainingSellerForAccountManager
);
// For filtering sales manager remaining seller
router.get(
    '/sales-manager/remaining',
    sellerController.getRemainingSellerForSalesManager
);
router.get(
    '/sales-manager/assigned',
    sellerController.getAssignedSellerForSalesManager
);

module.exports = router;
