const Order = require('../models/OrderModel');
const ObjectId = require('mongoose').Types.ObjectId;


exports.getCustomerIncreaseWithDiscount = async marketing => {
    const marketingId = marketing._id;

    let config = { orderStatus: 'delivered' };

    const startDate = new Date(marketing.createdAt);

    const currentDate = new Date();

    const endDate =
        marketing.duration.end < currentDate
            ? marketing.duration.end
            : currentDate;

    const difference = endDate - startDate;

    const oldEndDate = startDate;

    const oldStartDate = new Date(startDate.getTime() - difference);

    // console.log('================================================================');
    // console.log(startDate, endDate);
    // console.log(oldStartDate, oldEndDate);
    // console.log('______Check Diff__________',endDate - startDate, oldEndDate - oldStartDate);
    // console.log('================================================================');

    const uniqueUsersSpecificShopOnPromotion = await Order.aggregate([
        {
            $match: {
                ...config,
                marketings: { $in: [ObjectId(marketingId)] },
                marketings: ObjectId(marketingId),
                shop: ObjectId(marketing.shop),
            },
        },
        { $group: { _id: '$user', firstOrderDate: { $min: '$createdAt' } } },
        { $match: { firstOrderDate: { $gte: startDate, $lte: endDate } } },
        { $count: 'userCount' },
    ]);

    const uniqueUsersSpecificShopBeforePromotion = await Order.aggregate([
        { $match: { ...config, shop: ObjectId(marketing.shop) } },
        { $group: { _id: '$user', firstOrderDate: { $min: '$createdAt' } } },
        { $match: { firstOrderDate: { $gte: oldStartDate, $lt: oldEndDate } } },
        { $count: 'userCount' },
    ]);

    const totalUsersSpecificShopOnPromotion =
        uniqueUsersSpecificShopOnPromotion?.[0]?.userCount ?? 0;
    const totalUsersSpecificShopBeforePromotion =
        uniqueUsersSpecificShopBeforePromotion?.[0]?.userCount ?? 0;

    const customerIncreasePercentage =
        ((totalUsersSpecificShopOnPromotion -
            totalUsersSpecificShopBeforePromotion) /
            (totalUsersSpecificShopBeforePromotion || 1)) *
        100;

    return customerIncreasePercentage;
};
