const express = require('express');
const router = express.Router();
const FavouriteController = require('../../../../controllers/FavouriteController');

/**
 * /app/user/favorite
 * @url http://localhost:5001/app/user/favorite
 *
 */

// router.get('/', FavouriteController.getFavouritesForUser);
router.get('/', FavouriteController.getFavouritesForUserById);
router.post('/add', FavouriteController.addFavouritesForUser);
router.post('/delete', FavouriteController.deleteFavouriteForUser);

module.exports = router;
