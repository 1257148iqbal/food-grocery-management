const express = require('express');
const router = express.Router();
const ServiceFeeController = require('../../../controllers/ServiceFeeController');
const { checkAdminToken } = require('../../../authentication/checkAdminToken');

/**
 * /admin/order
 * @url http://localhost:5001/admin/service-fee
 *
 */

router.get('/', ServiceFeeController.getServiceFee);
router.post(
    '/set-service-fee',
    checkAdminToken,
    ServiceFeeController.setServiceFee
);

module.exports = router;
