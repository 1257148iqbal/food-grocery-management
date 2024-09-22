const express = require('express');
const router = express.Router();
const EmailController = require('../controllers/EmailController');
const moment = require('moment-timezone');
/**
 * @url http://localhost:5001/
 */

router.get('/', async (req, res) => {
    res.send('Welcome to Lyxa Backend--Develop');
});

router.post('/forget', EmailController.sendEmailMainForgetPassword);
router.post('/forget/check-validity', EmailController.checkForgetPasswordLinkValidity);
router.post('/forget/password', EmailController.passwordChangeForEveryOne);

router.use('/admin', require('./admin'));
router.use('/app', require('./app'));
router.use('/image', require('./image'));
router.use('/test', require('./test'));

router.use('/ready', require('./ready'));
router.use('/live', require('./live'));
router.use('/health', require('./health'));

router.get('/server-time', (req, res) => {
    const serverTime = moment().tz(process.env.TZ).format();
    res.json({ serverTime });
});
//Below code is written by niloy
const HealthyCorner = require('./healthyCorner')
router.use('/healthy-corner', HealthyCorner);
router.get('/healthcheck', async (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
    };
    try {
        res.send(healthcheck);
    } catch (error) {
        healthcheck.message = error;
        res.status(503).send();
    }
});
module.exports = router;
