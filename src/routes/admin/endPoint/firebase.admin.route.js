const express = require('express');
const router = express.Router();
const FirebaseController = require('../../../controllers/FirebaseController');

/**
 * /app/user/auth
 * @url http://localhost:5001/admin/firebase
 *
 */

router.get('/', FirebaseController.getData);
router.post('/add', FirebaseController.addPerson);
router.post('/update', FirebaseController.updateData);
router.post('/delete', FirebaseController.deleteData);

module.exports = router;
