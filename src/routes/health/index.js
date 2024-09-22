const express = require('express');
const router = express.Router();

/**
 *
 * @url http://localhost:5001/health/
 *
 */

router.get('/', (req, res) => {
    res.status(200).json({
        status: true,
        message: 'Endpoint is healthy',
    });
});

module.exports = router;
