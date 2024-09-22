require('../cronJob/orderCounterReset');
require('../cronJob/orderSchedule');
// require('../cronJob/backup');
require('../cronJob/marketingSystem');
// require('../cronJob/payoutSystem');
require('../cronJob/subscriptionSystem');
require('../cronJob/bobFinanceSystem');
require('../cronJob/rewardSystem');

const {
    payoutScheduleCronJob,
    scheduleCronJob,
} = require('../cronJob/payoutSystem');
payoutScheduleCronJob();
scheduleCronJob();
