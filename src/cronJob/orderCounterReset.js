var cron = require('node-cron');
const UniqueId = require('../models/UniqueIdModel');
const CronJob = require('../models/CronJobModel');
const moment = require('moment');

// every day at 00:00:00 AM
cron.schedule(
    '00 00 * * *',
    async () => {
        try {
            await UniqueId.findOneAndUpdate({}, { count: 0 });
            // console.log(`Running a job at ${moment()}`);
            const cronJob = new CronJob({
                name: 'Daily Order Counter Reset',
                status: 1,
                error: null,
            });
            await cronJob.save();
        } catch (error) {
            console.log(error);
            const cronJob = new CronJob({
                name: 'Daily Order Counter Reset',
                status: 0,
                error: error,
            });
            await cronJob.save();
        }
    },
    {
        scheduled: true,
        timezone: 'Asia/Beirut',
    }
);
