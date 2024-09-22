const mongoose = require('mongoose');
/**
 * MongoDB Connection
 */

mongoose.set('strictQuery', true);

mongoose
    .connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        //don't show the log when it is test
        console.log(
            'Mongodb Connected to %s',
            process.env.MONGODB_URL.substring(
                process.env.MONGODB_URL.lastIndexOf('/') + 1
            )
        );
    })
    .catch(err => {
        console.error('App starting error:', err.message);
        // process.exit(1);
    });
