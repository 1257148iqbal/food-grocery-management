exports.checkPlusUserMarketing = async (shop, skipProduct = false) => {
    const shopMarketings = shop.marketings?.filter(
        marketing => !marketing.onlyForSubscriber
    );

    shop.marketings = shopMarketings;
   

    if (!skipProduct) {
        for (const product of shop?.products) {
            await this.checkPlusUserProductMarketing(product);
        }
    }
};

exports.checkPlusUserProductMarketing = async product => {
    const productMarketing = product.marketing?.filter(
        marketing => !marketing?.onlyForSubscriber
    );
    product._doc.marketing = productMarketing;

    const discountPercentage = productMarketing.reduce(
        (accumulator, marketing) => {
            if (marketing?.isActive) {
                const marketingProduct = marketing?.products?.find(
                    item => item.product.toString() === product._id.toString()
                );

                return accumulator + marketingProduct.discountPercentage;
            }
            return accumulator + 0;
        },
        0
    );

    const discount = productMarketing.reduce((accumulator, marketing) => {
        if (marketing.isActive) {
            const marketingProduct = marketing.products.find(
                item => item.product.toString() === product._id.toString()
            );

            return accumulator + marketingProduct.discount;
        }
        return accumulator + 0;
    }, 0);

    const discountPrice = product.price - discount;

    product._doc.discountPercentage = discountPercentage;
    product._doc.discount = discount;
    product._doc.discountPrice = discountPrice;
};
