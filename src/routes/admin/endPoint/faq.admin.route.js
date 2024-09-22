const express = require('express');
const router = express.Router();
const FaqController = require('../../../controllers/FaqController');

/**
 * /admin
 * @url http://localhost:5001/admin/faq
 *
 *
 */

router.get('/', FaqController.getFaq);
router.get('/single-faq', FaqController.singleFaq);
router.post('/add', FaqController.addFaq);
router.post('/update', FaqController.updateFaq);
router.post('/delete', FaqController.deleteFaq);
router.post('/sort', FaqController.sortFaq);

module.exports = router;
