const express = require('express');
const router = express.Router();

/**
 * 
 * @url http://localhost:5001/ready/
 *
 */

router.get('/', (req,res) => {
    res.status(200).json({
        status: true,
        message: 'Endpoint is ready'
    });
});

module.exports = router;