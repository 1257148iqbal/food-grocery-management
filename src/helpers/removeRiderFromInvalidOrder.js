const { DistanceInfoGoogle } = require('../lib/getDistanceInfo');
const Butler = require('../models/ButlerModel');
const Order = require('../models/OrderModel');
const { getDistance } = require('./getDeliveryCharge');
const ObjectId = require('mongoose').Types.ObjectId;

// exports.removeRiderFromInvalidOrder = async deliveryBoyId => {
//     await Butler.updateMany(
//         {
//             orderStatus: 'placed',
//             deliveryBoy: { $exists: false },
//             deliveryBoyList: {
//                 $in: [deliveryBoyId],
//             },
//         },
//         {
//             $pull: {
//                 deliveryBoyList: deliveryBoyId,
//             },
//         }
//     );

//     const requestedOrders = await Order.find({
//         orderStatus: {
//             $in: ['placed', 'preparing'],
//         },
//         deliveryBoy: { $exists: false },
//         deliveryBoyList: {
//             $in: [deliveryBoyId],
//         },
//     });

//     const invalidOrdersId = [];
//     const deliveredFirstOrderList = [];
//     for (const order of requestedOrders) {
//         const { firstCase, secondCase } =
//             await getDeliveryBoyFromDataBaseSecondCase(deliveryBoyId, order);

//         if (!firstCase && !secondCase) {
//             invalidOrdersId.push(order._id.toString());
//         }

//         if (secondCase) {
//             deliveredFirstOrderList.push(order._id.toString());
//         }
//     }

//     if (invalidOrdersId.length > 0) {
//         await Order.updateMany(
//             {
//                 _id: {
//                     $in: invalidOrdersId,
//                 },
//             },
//             {
//                 $pull: {
//                     deliveryBoyList: deliveryBoyId,
//                 },
//             }
//         );
//     }

//     if (deliveredFirstOrderList.length > 0) {
//         await Order.updateMany(
//             {
//                 _id: {
//                     $in: deliveredFirstOrderList,
//                 },
//             },
//             {
//                 $push: {
//                     deliveredFirstDeliveryBoyList: deliveryBoyId,
//                 },
//             }
//         );
//     }
// };
exports.removeRiderFromInvalidOrder = async deliveryBoyId => {
    const updateButlerPromise = Butler.updateMany(
        {
            orderStatus: 'placed',
            deliveryBoy: { $exists: false },
            deliveryBoyList: { $in: [deliveryBoyId] },
        },
        { $pull: { deliveryBoyList: deliveryBoyId } }
    ).lean();

    const requestedOrders = await Order.find({
        orderStatus: { $in: ['placed', 'preparing'] },
        deliveryBoy: { $exists: false },
        deliveryBoyList: { $in: [deliveryBoyId] },
    }).lean();

    const promises = requestedOrders.map(async order => {
        const { firstCase, secondCase } =
            await getDeliveryBoyFromDataBaseSecondCase(deliveryBoyId, order);

        if (!firstCase && !secondCase) {
            await Order.updateOne(
                { _id: order._id },
                {
                    $pull: { deliveryBoyList: deliveryBoyId },
                }
            ).lean();
        }

        if (secondCase) {
            await Order.updateOne(
                { _id: order._id },
                {
                    $push: { deliveredFirstDeliveryBoyList: deliveryBoyId },
                }
            ).lean();
        }
    });

    await Promise.all([...promises, updateButlerPromise]);
};

const getDeliveryBoyFromDataBaseSecondCase = async (deliveryBoyId, order) => {
    //*** Check pick-up order and ongoing order***/
    const readyOrders = await Order.find({
        deliveryBoy: deliveryBoyId,
        orderStatus: {
            $in: ['ready_to_pickup', 'order_on_the_way'],
        },
    });
    const ongoingOrders = await Order.find({
        deliveryBoy: deliveryBoyId,
        orderStatus: {
            $in: ['accepted_delivery_boy', 'preparing'],
        },
    });

    const butlers = await Butler.find({
        deliveryBoy: deliveryBoyId,
        orderStatus: {
            $in: ['accepted_delivery_boy', 'order_on_the_way'],
        },
    });

    // For replacement order feature
    const replacementOrders = await Order.find({
        deliveryBoy: deliveryBoyId,
        orderStatus: {
            $in: [
                'accepted_delivery_boy',
                'preparing',
                'ready_to_pickup',
                'order_on_the_way',
            ],
        },
        isReplacementOrder: true,
        'replacementOrderDeliveryInfo.deliveryType': 'shop-customer-shop',
    });

    if (
        ongoingOrders.length < 2 &&
        !readyOrders.length &&
        !butlers.length &&
        !replacementOrders.length
    ) {
        // Calc order remaining preparing time
        let firstShopPreparingTime = ongoingOrders[0]?.preparingTime;

        if (!firstShopPreparingTime) {
            const firstShopTotalOrders = await Order.find({
                shop: ongoingOrders[0]?.shop,
                orderStatus: 'delivered',
            });
            const firstShopTotalPreparationTime = firstShopTotalOrders.reduce(
                (accumulator, order) => accumulator + order.preparingTime,
                0
            );

            firstShopPreparingTime =
                firstShopTotalPreparationTime / firstShopTotalOrders.length ||
                20;
        }

        const firstShopPreparingAt = ongoingOrders[0]?.preparingAt
            ? new Date(ongoingOrders[0].preparingAt)
            : new Date();
        const currentTime = new Date();
        const timeDiff = Math.abs(currentTime - firstShopPreparingAt);
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));

        let firstShopRemainingPreparingTime =
            firstShopPreparingTime - minutesDiff;
        if (firstShopRemainingPreparingTime < 0) {
            firstShopRemainingPreparingTime = 0;
        }

        // Calc second shop average preparation time
        let secondShopAvgPreparationTime = order.preparingTime;

        if (!secondShopAvgPreparationTime) {
            const secondShopTotalOrders = await Order.find({
                shop: order.shop,
                orderStatus: 'delivered',
            });
            const secondShopTotalPreparationTime = secondShopTotalOrders.reduce(
                (accumulator, order) => accumulator + order.preparingTime,
                0
            );

            secondShopAvgPreparationTime =
                secondShopTotalPreparationTime / secondShopTotalOrders.length ||
                20;
        }

        //*** Check distance between both shop***/
        const distanceBetweenBothShops = await DistanceInfoGoogle({
            origin: {
                latitude: ongoingOrders[0]?.pickUpLocation?.latitude,
                longitute: ongoingOrders[0]?.pickUpLocation?.longitude,
            },
            distination: {
                latitude: order?.pickUpLocation?.latitude,
                longitute: order?.pickUpLocation?.longitude,
            },
        });

        const distanceTimeBetweenBothShops =
            Number(distanceBetweenBothShops?.duration?.value) / 60;

        if (
            distanceTimeBetweenBothShops <= 15 &&
            secondShopAvgPreparationTime + 5 >=
                firstShopRemainingPreparingTime +
                    distanceTimeBetweenBothShops &&
            secondShopAvgPreparationTime - 5 <=
                firstShopRemainingPreparingTime + distanceTimeBetweenBothShops
        ) {
            //*** Check distance between both users***/
            const distanceBetweenBothUsers = await DistanceInfoGoogle({
                origin: {
                    latitude: ongoingOrders[0]?.dropOffLocation?.latitude,
                    longitute: ongoingOrders[0]?.dropOffLocation?.longitude,
                },
                distination: {
                    latitude: order?.dropOffLocation?.latitude,
                    longitute: order?.dropOffLocation?.longitude,
                },
            });
            const distanceTimeBetweenBothUsers =
                Number(distanceBetweenBothUsers?.duration?.value) / 60;

            if (distanceTimeBetweenBothUsers <= 10) {
                //*** Check firstShop to firstUser distance and secondShop to firstUser distance***/
                const distanceBetweenOngoingShopToOngoingUser =
                    await getDistance(
                        ongoingOrders[0]?.pickUpLocation?.latitude,
                        ongoingOrders[0]?.pickUpLocation?.longitude,
                        ongoingOrders[0]?.dropOffLocation?.latitude,
                        ongoingOrders[0]?.dropOffLocation?.longitude,
                        'k'
                    );
                const distanceBetweenOrderShopToOngoingUser = await getDistance(
                    order?.pickUpLocation?.latitude,
                    order?.pickUpLocation?.longitude,
                    ongoingOrders[0]?.dropOffLocation?.latitude,
                    ongoingOrders[0]?.dropOffLocation?.longitude,
                    'k'
                );

                if (
                    distanceBetweenOngoingShopToOngoingUser >=
                    distanceBetweenOrderShopToOngoingUser
                ) {
                    return { firstCase: true, secondCase: false };
                }
            }
        }

        //*** Rider complete first order after will pick second order ***/

        // Calc first shop to first user distance time
        const firstShopToUserDistanceTime =
            Number(order.userShopDistance?.duration?.value) / 60;

        // Calc first user to second shop distance time
        const firstUserToSecondShopDistance = await DistanceInfoGoogle({
            origin: {
                latitude: ongoingOrders[0]?.dropOffLocation.latitude,
                longitute: ongoingOrders[0]?.dropOffLocation.longitude,
            },
            distination: {
                latitude: order.pickUpLocation.latitude,
                longitute: order.pickUpLocation.longitude,
            },
        });
        const firstUserToSecondShopDistanceTime =
            Number(firstUserToSecondShopDistance?.duration?.value) / 60;

        if (
            firstShopRemainingPreparingTime +
                firstShopToUserDistanceTime +
                firstUserToSecondShopDistanceTime <=
            secondShopAvgPreparationTime + 5
        ) {
            return { firstCase: false, secondCase: true };
        }
    }

    return { firstCase: false, secondCase: false };
};
