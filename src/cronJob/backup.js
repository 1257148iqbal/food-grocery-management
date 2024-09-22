const cron = require('node-cron');
const CronJob = require('../models/CronJobModel');
const { autoBackupCollection } = require('../controllers/BackUpController');

// every day at 00:00:00 AM
cron.schedule(
    '00 00 * * *',
    async () => {
        try {
            // console.log("Database Backup Cron Job")
            await autoBackupCollection();
            const cronJob = new CronJob({
                name: 'Database Backup Cron Job',
                status: 1,
                error: null,
            });
            await cronJob.save();
        } catch (error) {
            console.log(error);
            const cronJob = new CronJob({
                name: 'Database Backup Cron Job',
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
