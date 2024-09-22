class PriceValidator {
    async priceValidate(productsInfo, summary, products) {
        let status = true;
        for (let element of products) {
            const product = productsInfo?.find(
                item => item?._id == element?.product
            );

            if (product?.price !== element?.perProduct) {
                status = false;
            }
            let price = Number(product?.price) * Number(element?.quantity);
            // Need to calculate total discount for each product later
            price -= Number(element?.totalDiscount);
            if (price !== Number(element?.totalProductAmount)) {
                status = false;
            }
        }
        return status;
    }
}

module.exports = new PriceValidator();
