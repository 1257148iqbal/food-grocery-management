exports.validatePortionPrices = async (portionPrices) => {
    // Returns true when the portion prices are valid
    for (let index = 0; index < portionPrices.length; index++) {
        const item = portionPrices[index];
        const itemErrors = {};
        if (!item.price) {
            return false;
        }
        if (!item.size) {
            return false;
        }
        if (!item.unit) {
            return false;
        }
    }
    return true;
}