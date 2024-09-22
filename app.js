const server = require('./src/config/server');
require('./src/config/mongodb');
require('./src/config/socket')(server);
require('./src/config/cronJob');
