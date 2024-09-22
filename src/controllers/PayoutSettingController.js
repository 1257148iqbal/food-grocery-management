const { restartPayoutScheduleCronJob } = require('../cronJob/payoutSystem');
const {
    errorHandler,
    successResponse,
    errorResponse,
} = require('../helpers/apiResponse');
const PayoutSettingModel = require('../models/PayoutSettingModel');
const axios = require('axios');

exports.getPayoutSetting = async (req, res) => {
    try {
        const payoutSetting = await PayoutSettingModel.findOne({});

        if (!payoutSetting) {
            return errorResponse(res, 'Payout Setting not found');
        }

        successResponse(res, {
            message: 'success',
            data: {
                payoutSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};

exports.editPayoutSetting = async (req, res) => {
    try {
        const id = req.adminId;
        const {
            firstDayOfWeek, // 0,1,2,3,4,5,6
            overDuePeriod,
            payoutType = [], // 'firstDayOfWeek', 'overDuePeriod'
        } = req.body;

        let payoutSetting = await PayoutSettingModel.findOne({});

        if (payoutSetting == null) {
            payoutSetting = new PayoutSettingModel({});
        }

        if (
            [0, 1, 2, 3, 4, 5, 6].includes(firstDayOfWeek) &&
            payoutType.includes('firstDayOfWeek')
        ) {
            payoutSetting.firstDayOfWeek = firstDayOfWeek;
        }

        if (overDuePeriod && payoutType.includes('overDuePeriod')) {
            payoutSetting.overDuePeriod = overDuePeriod;
        }

        await payoutSetting.save();

        if (
            [0, 1, 2, 3, 4, 5, 6].includes(firstDayOfWeek) &&
            payoutType.includes('firstDayOfWeek')
        ) {
            // For restart payout schedule cron
            // await axios.post(
            //     `${process.env.CRON_URL}/admin/payout/restart-payout-schedule-cron`,
            //     {}
            // );

            await restartPayoutScheduleCronJob();
        }

        const updatedPayoutSetting = await PayoutSettingModel.findOne({});

        successResponse(res, {
            message: 'update successfully',
            data: {
                payoutSetting: updatedPayoutSetting,
            },
        });
    } catch (error) {
        errorHandler(res, error);
    }
};
