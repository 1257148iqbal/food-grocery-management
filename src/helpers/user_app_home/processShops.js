const { getDeliveryCharge } = require('../getDeliveryCharge');
const { shopSortingFunc } = require('../shopCommonSorting');
const { checkPlusUserMarketing } = require('../checkPlusUserMarketing');

const processShops = async (screen, shops, plusUser, latitude, longitude) => {
    screen.shops = await Promise.all(
        shops.map(async shop => {
            if (!plusUser) {
                await checkPlusUserMarketing(shop);
            }
            return {
                ...shop._doc,
                deliveryFee: await getDeliveryCharge(
                    shop,
                    latitude,
                    longitude,
                    plusUser
                ),
                // isShopOpen: checkShopOpeningHours(shop),
            };
        })
    );
};

exports.processShops = processShops

exports.processShopsForScreen = async (shops, screen, filterCondition, plusUser, latitude, longitude) => {
    // const newShops = shops.filter(filterCondition).slice(0, 5);
    const newShops = shops.filter(filterCondition);

    const sortedShops = shopSortingFunc(newShops).slice(0, 5);
    await processShops(screen, sortedShops, plusUser, latitude, longitude);
};