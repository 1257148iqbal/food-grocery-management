const express = require('express');
const { engine } = require('express-handlebars'); // "express-handlebars"
require('dotenv').config();
const middlewareRoot = require('../middleware/middlewareRoot');
// const cookieParser = require('cookie-parser');
const app = express();
const server = require('http').createServer(app);
const PORT = process.env.PORT || 5001;

const cors = require('cors');
const path = require('path');
var bodyParser = require('body-parser');

// Modify the bodyParser.json configuration to include the verify function
app.use(
    bodyParser.json({
        limit: '50mb',
        strict: true, // enable strict mode to reject non-conforming input
        verify: function (req, res, buf) {
            try {
                JSON.parse(buf);
            } catch (err) {
                return res.status(400).send('Invalid JSON format.');
            }
        },
    })
);

// app.use(express.json());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(middlewareRoot);
app.use(express.static(__dirname + '/assets'));
app.use('/static', express.static('public'));

// For redirect screen when join group cart
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, '../views'));

// Set default timezone
process.env.TZ = 'Asia/Dhaka';

// api route
app.use('/', require('../routes/api'));

// 404 page
app.use((req, res, next) => {
    res.status(404).json({
        status: false,
        error: '404 Page not found',
    });
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        status: false,
        error: 'Internal Server Error',
    });
});

server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});
module.exports = server;
