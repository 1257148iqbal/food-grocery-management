const express = require('express');
const {
    addUserAddressFromUserApp,
    getUserAddressForUserApp,
    updateUserAddressFromUserApp,
    deleteAddressById,
} = require('../../../../controllers/AddressController');
const router = express.Router();
const userController = require('../../../../controllers/UserController');
const AddressController = require('../../../../controllers/AddressController');
const {
    getUserTransaction,
} = require('../../../../controllers/DropPayController');

/**
 * /app/user/profile
 * @url http://localhost:5001/app/user/profile
 *
 */

router.get('/', userController.getUserProfile);
router.get('/account-delete', userController.deleteAccountFromUserApp);
router.post('/update', userController.updateUserProfile);
router.post('/update-fcm-token', userController.updateUserFcmToken);
router.post('/remove-fcm-token', userController.removeUserFcmToken);
router.post('/add-address', addUserAddressFromUserApp);
router.get('/get-address', getUserAddressForUserApp);
router.post('/update-address', updateUserAddressFromUserApp);
router.post('/delete-address', deleteAddressById);
router.post('/password-change', userController.changeUserPassword);
router.get('/cards', userController.getUserCards);
router.post('/add-card', userController.addCard);
router.post('/update-card', userController.updateCard);
router.post('/delete-card', userController.deleteCard);
router.get('/balance', userController.getUserOwnBalance);
router.get('/get-transaction', getUserTransaction);
router.post('/add-default-card', userController.defaultCardSet);

module.exports = router;
