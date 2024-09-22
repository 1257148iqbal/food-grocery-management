const AppSetting = require('../models/AppSetting');
const GlobalDropCharge = require('../models/GlobalDropCharge');

exports.getDeliveryCharge = async (
    shop,
    latitude,
    longitude,
    plusUser = false
) => {
    // total distance between to place pick & drop
    let distance = await this.getDistance(
        latitude,
        longitude,
        shop.address?.location?.coordinates[1],
        shop.address?.location?.coordinates[0],
        'k'
    );

    if (!distance) {
        distance = 1;
    }

    let deliveryRange = [];
    let freeDeliveryMarketing = shop?.marketings?.find(
        marketing =>
            marketing.type === 'free_delivery' &&
            marketing.isActive === true &&
            marketing.status === 'active'
    );

    const globalDropCharge = await GlobalDropCharge.findOne({}).select(
        'deliveryRange'
    );
    if (globalDropCharge) {
        deliveryRange = globalDropCharge.deliveryRange;
    }

    let deliveryFee = 0;

    if (shop.haveOwnDeliveryBoy) {
        deliveryFee = freeDeliveryMarketing || plusUser ? 0 : shop.deliveryFee;
    } else {
        if (deliveryRange.length > 0) {
            let found = deliveryRange.find(item => {
                return distance >= item.from && distance <= item.to;
            });

            if (!found) {
                found = deliveryRange[deliveryRange.length - 1];
            }

            if (found) {
                deliveryFee =
                    freeDeliveryMarketing || plusUser ? 0 : found.charge;
            }
        }
    }

    return deliveryFee;
};

exports.getShopByDeliveryCharge = async (
    shop,
    latitude,
    longitude,
    maxDeliveryFee
) => {
    // total distance between to place pick & drop
    let distance = await this.getDistance(
        latitude,
        longitude,
        shop.location?.coordinates[1],
        shop.location?.coordinates[0],
        'k'
    );

    if (!distance) {
        distance = 1;
    }

    let dropChargeId = null;

    let distanceSelectObject = null;
    let deliveryRange = [];

    const globalDropCharge = await GlobalDropCharge.findOne({});
    if (globalDropCharge) {
        deliveryRange = globalDropCharge.deliveryRange;
        dropChargeId = globalDropCharge._id;
    }

    let deliveryFee = 0;

    if (shop.haveOwnDeliveryBoy) {
        deliveryFee = shop.deliveryFee;
    } else {
        if (deliveryRange.length > 0) {
            let found = deliveryRange.find(item => {
                return distance >= item.from && distance <= item.to;
            });

            if (!found) {
                found = deliveryRange[deliveryRange.length - 1];
            }

            distanceSelectObject = found;
            if (found) {
                deliveryFee = found.charge;
            }
        }
    }

    let result = false;

    if (maxDeliveryFee >= deliveryFee) {
        result = true;
    }

    return result;
};

exports.getDistance = async (lat1, lon1, lat2, lon2, unit) => {
    var radlat1 = (Math.PI * lat1) / 180;
    var radlat2 = (Math.PI * lat2) / 180;
    var theta = lon1 - lon2;
    var radtheta = (Math.PI * theta) / 180;
    var dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == 'K') {
        dist = dist * 1.609344;
    }
    if (unit == 'N') {
        dist = dist * 0.8684;
    }
    dist = parseFloat(dist.toFixed(4));
    return dist;
};
