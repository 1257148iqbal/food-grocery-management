const express = require('express');
const backupController = require('../../../controllers/BackUpController');
const router = express.Router();

/**
 * /admin
 * @url http://localhost:5001/admin/database
 *
 */

router.get('/all-data', backupController.backupAllData);

router.get('/collections', backupController.getAllCollections);

router.post('/back-up', backupController.backupCollection);

// router.get('/back-up-all',(req, res, next) => {
//     req.allBackUp = true;
//     next();
// }, backupController.backupCollection);

router.get('/delete-all', backupController.deleteAllCollections);

router.post('/delete-collection', backupController.deleteCollection);

router.post('/restore-backup', backupController.reStoreCollection);
router.get('/restore-all-backup', backupController.reStoreAllCollection);

router.post(
    '/storage-bucket/restore-backup',
    backupController.reStoreCollectionFromStorageBucket
);
router.get(
    '/storage-bucket/restore-all-backup',
    backupController.reStoreAllCollectionFromStorageBucket
);

module.exports = router;
