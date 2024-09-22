const express = require('express');
const router = express.Router();

/**
 * 
 * @url http://localhost:5001/live/
 *
 */

router.get('/', (req,res) => {
    res.status(200).json({
        status: true,
        message: 'Endpoint is live'
    });
});

module.exports = router;