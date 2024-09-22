const express = require('express');
const router = express.Router();
const DropChargeController = require('../../../controllers/DropChargeController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');

/**
 * /admin/order
 * @url http://localhost:5001/admin/drop-charge
 *
 */

router.get('/', DropChargeController.getGlobalDropCharge);
router.get(
    '/get-related-seller',
    DropChargeController.getGlobalDropChargeSeller
);
router.post(
    '/seller-drop-charge-reset',
    checkAdminToken,
    DropChargeController.sellerDropChargeReset
);
router.post(
    '/add-global-drop-charge',
    checkAdminToken,
    DropChargeController.setGlobalDropCharge
);
router.post(
    '/add-global-delivery-cut',
    checkAdminToken,
    DropChargeController.setGlobalDeliveryCut
);
router.post(
    '/add-global-delivery-cut-for-butler',
    checkAdminToken,
    DropChargeController.setGlobalDeliveryCutForButler
);

module.exports = router;
