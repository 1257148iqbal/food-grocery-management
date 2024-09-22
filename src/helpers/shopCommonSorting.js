const { checkShopOpeningHours } = require('./checkShopOpeningHours');
const { getDistance } = require('./getDeliveryCharge');

exports.shopCommonSorting = {
    isFeatured: -1,
    sortingOrder: -1,
    featuredUpdatedTime: 1,
    createdAt: 1,
};

exports.shopSortingFunc = shops => {
    try {
        // Open shop need to show top and then closed shop
        const openShops = shops
            .map(shop => {
                shop._doc.isShopOpen = checkShopOpeningHours(shop);
                return shop;
            })
            .reduce(
                (accumulator, currentShop) => {
                    if (
                        currentShop.liveStatus === 'online' &&
                        currentShop._doc.isShopOpen
                    ) {
                        accumulator[0].push(currentShop);
                    } else {
                        accumulator[1].push(currentShop);
                    }
                    return accumulator;
                },
                [[], []]
            );

        const finalShops = [...openShops[0], ...openShops[1]];

        return finalShops;
    } catch (error) {
        console.log(error);
    }
};
