exports.applyExchangeRate = async (
    product,
    shopExchangeRate,
    skipAttribute = false,
    skipAddons = false
) => {
    product._doc.shopExchangeRate = shopExchangeRate;

    const secondaryPrice = roundToNearest500(product.price, shopExchangeRate);

    product._doc.secondaryPrice = secondaryPrice;

    // Secondary reward amount calc
    if (product?.reward?.amount) {
        let secondaryReward = { ...product.reward };

        secondaryReward.amount = roundToNearest500(product?.reward?.amount, shopExchangeRate);

        // Math.round(
        //     product?.reward?.amount * shopExchangeRate
        // );


        product._doc.secondaryReward = secondaryReward;
    }

    // Secondary discount price calc
    if (product?.discountPrice) {
        const secondaryDiscountPrice =

            roundToNearest500(product?.discountPrice, shopExchangeRate)

        // Math.round(
        //     product?.discountPrice * shopExchangeRate
        // );
        const secondaryDiscount = roundToNearest500(product?.discount, shopExchangeRate)


        // Math.round(
        //     product?.discount * shopExchangeRate
        // );


        product._doc.secondaryDiscountPrice = secondaryDiscountPrice;
        product._doc.secondaryDiscount = secondaryDiscount;
    }

    // Attribute calc
    if (!skipAttribute) {
        if (product?.attributes) {
            for (const attribute of product?.attributes) {
                if (attribute?.items) {
                    for (const item of attribute.items) {
                        const secondaryExtraPrice =
                            roundToNearest500(item.extraPrice, shopExchangeRate)
                        item._doc.secondaryExtraPrice = secondaryExtraPrice;
                    }
                }
            }
        }
    }

    // Addons calc
    if (!skipAddons) {
        for (const addon of product?.addons) {
            if (addon) {
                // Addon secondary price calc
                const addonSecondaryPrice = roundToNearest500(addon.price, shopExchangeRate)

                // Math.round(
                //     addon.price * shopExchangeRate
                // );
                addon._doc.secondaryPrice = addonSecondaryPrice;

                // Addon Secondary reward amount calc
                if (addon?.reward?.amount) {
                    let addonSecondaryReward = { ...addon.reward };
                    addonSecondaryReward.amount = roundToNearest500(addon?.reward?.amount, shopExchangeRate)

                    // Math.round(
                    //     addon?.reward?.amount * shopExchangeRate
                    // );
                    addon._doc.secondaryReward = addonSecondaryReward;
                }

                // Addon secondary discount price calc
                if (addon?.discountPrice) {
                    const addonSecondaryDiscountPrice = roundToNearest500(addon?.discountPrice, shopExchangeRate)

                    // Math.round(
                    //     addon?.discountPrice * shopExchangeRate
                    // );
                    const addonSecondaryDiscount = roundToNearest500(addon?.discount, shopExchangeRate);

                    // Math.round(
                    //     addon?.discount * shopExchangeRate
                    // );
                    addon._doc.secondaryDiscountPrice = addonSecondaryDiscountPrice;
                    addon._doc.secondaryDiscount = addonSecondaryDiscount;
                }
            }
        }
    }

    return product;
};

const roundToNearest500 = (price, exchangeRate) => {
    const convertedValue = Math.round(price * exchangeRate);

    let secondaryPrice = 0;

    const remainder = Math.round(convertedValue % 500);
    if (remainder < 250) {
        secondaryPrice = Math.floor(convertedValue / 500) * 500;
    } else {
        secondaryPrice = Math.ceil(convertedValue / 500) * 500;
    }

    return secondaryPrice;
}
