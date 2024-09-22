const express = require('express');
const router = express.Router();
const CartController = require('../../../../controllers/CartController');
const { checkUserToken } = require('../../../../authentication/checkUserToken');

/**
 * /app/user/top-up
 * @url http://localhost:5001/app/user/cart
 *
 */
router.get('/', checkUserToken, CartController.getCartsForUserApp);
router.get('/shop', checkUserToken, CartController.getSpecificShopCart);
router.get('/id', checkUserToken, CartController.getCartByID);

router.post('/edit', checkUserToken, CartController.editCartForUserApp);
router.post(
    '/add-product',
    checkUserToken,
    CartController.addItemToCartForUserApp
);
router.post(
    '/update-extra-info',
    checkUserToken,
    CartController.updateExtraInfoCartForUserApp
);
router.post(
    '/update-ready-status',
    checkUserToken,
    CartController.updateReadyStatusForUserApp
);
router.post('/join', checkUserToken, CartController.joinUserToGroupCart);
router.post('/leave', checkUserToken, CartController.leaveUserFromGroupCart);
router.post(
    '/remove',
    checkUserToken,
    CartController.removeMultipleUserFromGroupCart
);
router.post('/delete', checkUserToken, CartController.deleteCart);
router.post(
    '/payment-wallet',
    checkUserToken,
    CartController.userPayWithWallet
);
router.post(
    '/payment-generate',
    checkUserToken,
    CartController.paymentGenerate
);
router.post('/payment-card', checkUserToken, CartController.userPayWithCard);

// Areeba payment gateway integration
router.post(
    '/areeba-payment-generate',
    checkUserToken,
    CartController.areebaPaymentGenerate
);
router.post('/areeba-payment-completed', CartController.areebaPaymentComplete);

module.exports = router;
