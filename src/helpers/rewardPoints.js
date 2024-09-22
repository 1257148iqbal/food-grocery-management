const RewardSettingModel = require('../models/RewardSettingModel');

exports.getRewardPoints = async amount => {
    const rewardSetting = await RewardSettingModel.findOne({});

    const rewardPoints = Math.round(
        (rewardSetting?.getReward?.points * amount) /
            rewardSetting?.getReward?.amount
    );

    const redeemPoints = Math.round(
        (rewardSetting?.redeemReward?.points * amount) /
            rewardSetting?.redeemReward?.amount
    );

    return { rewardPoints, redeemPoints };
};

exports.getRewardAmount = async points => {
    const rewardSetting = await RewardSettingModel.findOne({});

    const rewardAmount = parseFloat(
        (
            (rewardSetting?.getReward?.amount * points) /
            rewardSetting?.getReward?.points
        ).toFixed(2)
    );

    const redeemAmount = parseFloat(
        (
            (rewardSetting?.redeemReward?.amount * points) /
            rewardSetting?.redeemReward?.points
        ).toFixed(2)
    );

    return { rewardAmount, redeemAmount };
};
