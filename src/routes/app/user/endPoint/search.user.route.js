const express = require('express');
const router = express.Router();
const userController = require('../../../../controllers/UserController');
const UserHomeController = require('../../../../controllers/UserHomeController');
const TagCuisineController = require('../../../../controllers/TagCuisineController');

/**
 * /app/user/search
 * @url http://localhost:5001/app/user/search
 *
 */

router.get('/', userController.searchForUserApp);
router.get('/data', UserHomeController.getfilterDataForUser);
router.get('/top-tags', TagCuisineController.getTopTagsForUserApp);

module.exports = router;
