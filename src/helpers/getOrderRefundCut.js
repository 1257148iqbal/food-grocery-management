exports.getOrderRefundCut = order => {
    const baseCurrency_adminChargeFromOrder =
        order.adminCharge.baseCurrency_adminChargeFromOrder < 0
            ? 0
            : order.adminCharge.baseCurrency_adminChargeFromOrder;
    const baseCurrency_adminChargeFromDelivery =
        order.adminCharge.baseCurrency_adminChargeFromDelivery < 0
            ? 0
            : order.adminCharge.baseCurrency_adminChargeFromDelivery;
    const baseCurrency_adminCut =
        baseCurrency_adminChargeFromOrder +
        baseCurrency_adminChargeFromDelivery;
    const baseCurrency_adminVatCut = order.vatAmount.baseCurrency_vatForAdmin;
    const baseCurrency_shopCut =
        order.adminCharge.baseCurrency_adminChargeFromOrder < 0
            ? order.baseCurrency_shopEarnings +
              order.adminCharge.baseCurrency_adminChargeFromOrder +
              order.vatAmount.baseCurrency_vatForShop
            : order.baseCurrency_shopEarnings +
              order.vatAmount.baseCurrency_vatForShop;
    const baseCurrency_deliveryBoyCut =
        order.adminCharge.baseCurrency_adminChargeFromDelivery < 0
            ? order.baseCurrency_riderFee +
              order.adminCharge.baseCurrency_adminChargeFromDelivery
            : order.baseCurrency_riderFee;

    const secondaryCurrency_adminChargeFromOrder =
        order.adminCharge.secondaryCurrency_adminChargeFromOrder < 0
            ? 0
            : order.adminCharge.secondaryCurrency_adminChargeFromOrder;
    const secondaryCurrency_adminChargeFromDelivery =
        order.adminCharge.secondaryCurrency_adminChargeFromDelivery < 0
            ? 0
            : order.adminCharge.secondaryCurrency_adminChargeFromDelivery;
    const secondaryCurrency_adminCut =
        secondaryCurrency_adminChargeFromOrder +
        secondaryCurrency_adminChargeFromDelivery;
    const secondaryCurrency_adminVatCut =
        order.vatAmount.secondaryCurrency_vatForAdmin;
    const secondaryCurrency_shopCut =
        order.adminCharge.secondaryCurrency_adminChargeFromOrder < 0
            ? order.secondaryCurrency_shopEarnings +
              order.adminCharge.secondaryCurrency_adminChargeFromOrder +
              order.vatAmount.secondaryCurrency_vatForShop
            : order.secondaryCurrency_shopEarnings +
              order.vatAmount.secondaryCurrency_vatForShop;
    const secondaryCurrency_deliveryBoyCut =
        order.adminCharge.secondaryCurrency_adminChargeFromDelivery < 0
            ? order.secondaryCurrency_riderFee +
              order.adminCharge.secondaryCurrency_adminChargeFromDelivery
            : order.secondaryCurrency_riderFee;

    return {
        baseCurrency_adminCut,
        baseCurrency_adminVatCut,
        baseCurrency_shopCut,
        baseCurrency_deliveryBoyCut,
        secondaryCurrency_adminCut,
        secondaryCurrency_adminVatCut,
        secondaryCurrency_shopCut,
        secondaryCurrency_deliveryBoyCut,
    };
};
