exports.getOrderFinancialBreakdown = order => {
    // Calculate order amount breakdown
    const baseCurrency_orderAmount_cash =
        order?.paymentMethod === 'cash'
            ? order?.summary?.baseCurrency_productAmount +
              order?.summary?.baseCurrency_doubleMenuItemPrice
            : 0;
    const secondaryCurrency_orderAmount_cash =
        order.paymentMethod === 'cash'
            ? order?.summary?.secondaryCurrency_productAmount +
              order?.summary?.secondaryCurrency_doubleMenuItemPrice
            : 0;

    const baseCurrency_orderAmount_online =
        order?.paymentMethod !== 'cash'
            ? order?.summary?.baseCurrency_productAmount +
              order?.summary?.baseCurrency_doubleMenuItemPrice
            : 0;
    const secondaryCurrency_orderAmount_online =
        order?.paymentMethod !== 'cash'
            ? order?.summary?.secondaryCurrency_productAmount +
              order?.summary?.secondaryCurrency_doubleMenuItemPrice
            : 0;

    const baseCurrency_orderAmount_discount =
        order?.summary?.baseCurrency_discount;
    const secondaryCurrency_orderAmount_discount =
        order?.summary?.secondaryCurrency_discount;

    const baseCurrency_orderAmount_buy1Get1 =
        order?.summary?.baseCurrency_doubleMenuItemPrice;
    const secondaryCurrency_orderAmount_buy1Get1 =
        order?.summary?.secondaryCurrency_doubleMenuItemPrice;

    const baseCurrency_orderAmount_loyaltyPoints =
        order?.summary?.reward?.baseCurrency_amount;
    const secondaryCurrency_orderAmount_loyaltyPoints =
        order?.summary?.reward?.secondaryCurrency_amount;

    const baseCurrency_orderAmount =
        order?.summary?.baseCurrency_productAmount -
        baseCurrency_orderAmount_discount -
        baseCurrency_orderAmount_loyaltyPoints;
    const secondaryCurrency_orderAmount =
        order?.summary?.secondaryCurrency_productAmount -
        secondaryCurrency_orderAmount_discount -
        secondaryCurrency_orderAmount_loyaltyPoints;

    // Calculate lyxa fees
    const baseCurrency_lyxaFees =
        order?.adminCharge.baseCurrency_adminChargeFromOrder +
        order?.summary?.baseCurrency_couponDiscountAmount +
        order?.baseCurrency_rewardRedeemCashback;
    const secondaryCurrency_lyxaFees =
        order?.adminCharge.secondaryCurrency_adminChargeFromOrder +
        order?.summary?.secondaryCurrency_couponDiscountAmount +
        order?.secondaryCurrency_rewardRedeemCashback;

    // Calculate total vat
    const baseCurrency_totalVat = order?.vatAmount?.baseCurrency_vatForShop;
    const secondaryCurrency_totalVat =
        order?.vatAmount?.secondaryCurrency_vatForShop;

    // Calculate other payments breakdown
    const baseCurrency_otherPayments_freeDelivery =
        order?.orderDeliveryCharge?.shopCut;
    const secondaryCurrency_otherPayments_freeDelivery =
        order?.orderDeliveryCharge?.shopCut * order?.adminExchangeRate;

    const baseCurrency_cancelOrder_getRefundAmount =
        order?.orderStatus === 'cancelled' && order?.refundType === 'partial'
            ? order?.adminCharge?.baseCurrency_adminChargeFromOrder < 0
                ? order?.baseCurrency_shopEarnings +
                  order?.adminCharge.baseCurrency_adminChargeFromOrder +
                  order?.vatAmount.baseCurrency_vatForShop -
                  order?.userCancelTnx[0]?.baseCurrency_shopCut
                : order.baseCurrency_shopEarnings +
                  order.vatAmount.baseCurrency_vatForShop -
                  order?.userCancelTnx[0]?.baseCurrency_shopCut
            : 0;
    const secondaryCurrency_cancelOrder_getRefundAmount =
        baseCurrency_cancelOrder_getRefundAmount * order?.shopExchangeRate;

    const baseCurrency_afterDeliveredRefundAmount =
        order?.isRefundedAfterDelivered
            ? order?.userRefundTnx[0]?.baseCurrency_shopCut
            : 0;
    const secondaryCurrency_afterDeliveredRefundAmount =
        order?.isRefundedAfterDelivered
            ? order?.userRefundTnx[0]?.secondaryCurrency_shopCut
            : 0;

    const baseCurrency_otherPayments_refundAmount =
        baseCurrency_afterDeliveredRefundAmount -
        baseCurrency_cancelOrder_getRefundAmount;
    const secondaryCurrency_otherPayments_refundAmount =
        secondaryCurrency_afterDeliveredRefundAmount -
        secondaryCurrency_cancelOrder_getRefundAmount;

    const baseCurrency_otherPayments =
        baseCurrency_otherPayments_freeDelivery +
        baseCurrency_otherPayments_refundAmount;
    const secondaryCurrency_otherPayments =
        secondaryCurrency_otherPayments_freeDelivery +
        secondaryCurrency_otherPayments_refundAmount;

    // Calculate delivery fee breakdown
    const baseCurrency_deliveryFee =
        order?.orderFor === 'specific'
            ? order?.summary?.baseCurrency_riderFee +
              order?.summary?.baseCurrency_riderTip
            : 0;
    const secondaryCurrency_deliveryFee =
        order?.orderFor === 'specific'
            ? order?.summary?.secondaryCurrency_riderFee +
              order?.summary?.secondaryCurrency_riderTip
            : 0;

    const baseCurrency_deliveryFee_cash =
        order?.orderFor === 'specific' && order?.paymentMethod === 'cash'
            ? order?.summary?.baseCurrency_riderFee +
              order?.summary?.baseCurrency_riderTip
            : 0;
    const secondaryCurrency_deliveryFee_cash =
        order?.orderFor === 'specific' && order?.paymentMethod === 'cash'
            ? order?.summary?.secondaryCurrency_riderFee +
              order?.summary?.secondaryCurrency_riderTip
            : 0;

    const baseCurrency_deliveryFee_online =
        order?.orderFor === 'specific' && order?.paymentMethod !== 'cash'
            ? order?.summary?.baseCurrency_riderFee +
              order?.summary?.baseCurrency_riderTip
            : 0;
    const secondaryCurrency_deliveryFee_online =
        order?.orderFor === 'specific' && order?.paymentMethod !== 'cash'
            ? order?.summary?.secondaryCurrency_riderFee +
              order?.summary?.secondaryCurrency_riderTip
            : 0;

    const baseCurrency_riderTip =
        order?.orderFor === 'specific' && order?.paymentMethod !== 'cash'
            ? order?.summary?.baseCurrency_riderTip
            : 0;
    const secondaryCurrency_riderTip =
        order?.orderFor === 'specific' && order?.paymentMethod !== 'cash'
            ? order?.summary?.secondaryCurrency_riderTip
            : 0;

    // Calculate points cashback
    const baseCurrency_pointsCashback =
        order?.baseCurrency_rewardRedeemCashback;
    const secondaryCurrency_pointsCashback =
        order?.secondaryCurrency_rewardRedeemCashback;

    // Calculate points cashback
    const baseCurrency_totalProfit =
        baseCurrency_orderAmount -
        baseCurrency_lyxaFees +
        baseCurrency_totalVat -
        baseCurrency_otherPayments +
        baseCurrency_deliveryFee;
    const secondaryCurrency_totalProfit =
        secondaryCurrency_orderAmount -
        secondaryCurrency_lyxaFees +
        secondaryCurrency_totalVat -
        secondaryCurrency_otherPayments +
        secondaryCurrency_deliveryFee;

    const financialBreakdown = {
        baseCurrency_orderAmount_cash,
        secondaryCurrency_orderAmount_cash,
        baseCurrency_orderAmount_online,
        secondaryCurrency_orderAmount_online,
        baseCurrency_orderAmount_discount,
        secondaryCurrency_orderAmount_discount,
        baseCurrency_orderAmount_buy1Get1,
        secondaryCurrency_orderAmount_buy1Get1,
        baseCurrency_orderAmount_loyaltyPoints,
        secondaryCurrency_orderAmount_loyaltyPoints,
        baseCurrency_orderAmount,
        secondaryCurrency_orderAmount,
        baseCurrency_lyxaFees,
        secondaryCurrency_lyxaFees,
        baseCurrency_totalVat,
        secondaryCurrency_totalVat,
        baseCurrency_otherPayments_freeDelivery,
        secondaryCurrency_otherPayments_freeDelivery,
        baseCurrency_otherPayments_refundAmount,
        secondaryCurrency_otherPayments_refundAmount,
        baseCurrency_otherPayments,
        secondaryCurrency_otherPayments,
        baseCurrency_deliveryFee,
        secondaryCurrency_deliveryFee,
        baseCurrency_deliveryFee_cash,
        secondaryCurrency_deliveryFee_cash,
        baseCurrency_deliveryFee_online,
        secondaryCurrency_deliveryFee_online,
        baseCurrency_riderTip,
        secondaryCurrency_riderTip,
        baseCurrency_pointsCashback,
        secondaryCurrency_pointsCashback,
        baseCurrency_totalProfit,
        secondaryCurrency_totalProfit,
    };

    order._doc.financialBreakdown = financialBreakdown;
};

exports.getOrderShopProfitBreakdownInBaseCurrency = order => {
    let originalOrderAmount_cash = 0;
    let discount_cash = 0;
    let loyaltyPoints_cash = 0;
    let buy1Get1_cash = 0;
    let couponDiscount_cash = 0;
    let wallet_cash = 0;

    let originalOrderAmount_online = 0;
    let discount_online = 0;
    let loyaltyPoints_online = 0;
    let buy1Get1_online = 0;
    let couponDiscount_online = 0;
    let wallet_online = 0;

    if (order?.paymentMethod === 'cash') {
        originalOrderAmount_cash =
            order?.summary?.baseCurrency_productAmount +
            order?.summary?.baseCurrency_doubleMenuItemPrice;
        discount_cash = order?.summary?.baseCurrency_discount;
        loyaltyPoints_cash = order?.summary?.reward?.baseCurrency_amount;
        buy1Get1_cash = order?.summary?.baseCurrency_doubleMenuItemPrice;
        couponDiscount_cash =
            order?.summary.baseCurrency_couponDiscountAmount +
            order?.summary.baseCurrency_punchMarketingDiscountAmount;
        wallet_cash = order?.summary?.baseCurrency_wallet;
    } else {
        originalOrderAmount_online =
            order?.summary?.baseCurrency_productAmount +
            order?.summary?.baseCurrency_doubleMenuItemPrice;
        discount_online = order?.summary?.baseCurrency_discount;
        loyaltyPoints_online = order?.summary?.reward?.baseCurrency_amount;
        buy1Get1_online = order?.summary?.baseCurrency_doubleMenuItemPrice;
        couponDiscount_online =
            order?.summary?.baseCurrency_couponDiscountAmount +
            order?.summary.baseCurrency_punchMarketingDiscountAmount;
        wallet_online = order?.summary?.baseCurrency_wallet;
    }

    const totalCash =
        originalOrderAmount_cash -
        discount_cash -
        loyaltyPoints_cash -
        buy1Get1_cash -
        couponDiscount_cash;

    const totalOnline =
        originalOrderAmount_online -
        discount_online -
        loyaltyPoints_online -
        buy1Get1_online -
        couponDiscount_online;

    const discount_amc = order?.discountCut?.baseCurrency_discountAdminCut;
    const buy1Get1_amc =
        order?.doubleMenuItemPrice?.baseCurrency_doubleMenuItemPriceAdmin;
    const couponDiscount_amc =
        order?.couponDiscountCut?.baseCurrency_couponAdminCut;
    const pointsCashback = order?.baseCurrency_rewardRedeemCashback;
    const adminMarketingCashback =
        discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

    const orderAmount = totalCash + totalOnline + adminMarketingCashback;

    const adminFees =
        order?.adminCharge?.baseCurrency_adminChargeFromOrder +
        adminMarketingCashback;

    const freeDeliveryByShop =
        order?.freeDeliveryCut?.baseCurrency_freeDeliveryShopCut || 0;

    const customerRefund = order?.isRefundedAfterDelivered
        ? order?.userRefundTnx[0]?.baseCurrency_shopCut +
          order?.userRefundTnx[0]?.baseCurrency_adminVatCut
        : 0;

    let deliveryFee_cash = 0;
    let deliveryFee_online = 0;
    let riderTip_online = 0;
    if (order?.orderFor === 'specific' && order?.paymentMethod === 'cash') {
        deliveryFee_cash = order?.inEndorseLossDeliveryFeeIncluded
            ? order?.summary?.baseCurrency_riderFeeWithFreeDelivery
            : order?.summary?.baseCurrency_riderFee +
              (order?.subscriptionLoss?.baseCurrency_freeDelivery || 0);
    } else if (
        order?.orderFor === 'specific' &&
        order?.paymentMethod !== 'cash'
    ) {
        deliveryFee_online = order?.inEndorseLossDeliveryFeeIncluded
            ? order?.summary?.baseCurrency_riderFeeWithFreeDelivery
            : order?.summary?.baseCurrency_riderFee +
              (order?.subscriptionLoss?.baseCurrency_freeDelivery || 0);
        riderTip_online = order?.summary?.baseCurrency_riderTip;
    }

    const totalVat = order?.isRefundedAfterDelivered
        ? order?.vatAmount?.baseCurrency_vatForAdmin -
          order?.userRefundTnx[0]?.baseCurrency_adminVatCut
        : order?.vatAmount?.baseCurrency_vatForAdmin;

    //** Calc Shop Cash In Hand Start **/
    let cashInHand = 0;
    if (
        order?.orderFor === 'specific' &&
        order?.paymentMethod === 'cash' &&
        order?.orderStatus === 'delivered'
    ) {
        cashInHand = order?.summary?.baseCurrency_cash;
    }
    //** Calc Shop Cash In Hand End **/

    const totalPayout =
        order?.baseCurrency_shopEarnings - customerRefund - cashInHand;

    const profitBreakdown = {
        cash: {
            originalOrderAmount_cash,
            discount_cash,
            loyaltyPoints_cash,
            buy1Get1_cash,
            couponDiscount_cash,
            totalCash,
            wallet_cash,
        },
        online: {
            originalOrderAmount_online,
            discount_online,
            loyaltyPoints_online,
            buy1Get1_online,
            couponDiscount_online,
            totalOnline,
            wallet_online,
        },
        AdminMarketingCashback: {
            discount_amc,
            buy1Get1_amc,
            couponDiscount_amc,
            pointsCashback,
            adminMarketingCashback,
        },
        orderAmount,
        adminFees,
        // pointsCashback,
        totalVat,
        otherPayments: {
            freeDeliveryByShop,
            customerRefund,
            totalOtherPayments: freeDeliveryByShop + customerRefund,
        },
        deliveryFee: {
            deliveryFee:
                deliveryFee_cash + deliveryFee_online + riderTip_online,
            cash: deliveryFee_cash,
            online: deliveryFee_online + riderTip_online,
            deliveryFee_online,
            riderTip_online,
        },
        cashInHand,
        totalPayout,
    };

    return { profitBreakdown };
};

exports.getOrderShopProfitBreakdownInSecondaryCurrency = order => {
    let originalOrderAmount_cash = 0;
    let discount_cash = 0;
    let loyaltyPoints_cash = 0;
    let buy1Get1_cash = 0;
    let couponDiscount_cash = 0;
    let wallet_cash = 0;

    let originalOrderAmount_online = 0;
    let discount_online = 0;
    let loyaltyPoints_online = 0;
    let buy1Get1_online = 0;
    let couponDiscount_online = 0;
    let wallet_online = 0;

    if (order?.paymentMethod === 'cash') {
        originalOrderAmount_cash =
            order?.summary?.secondaryCurrency_productAmount +
            order?.summary?.secondaryCurrency_doubleMenuItemPrice;
        discount_cash = order?.summary?.secondaryCurrency_discount;
        loyaltyPoints_cash = order?.summary?.reward?.secondaryCurrency_amount;
        buy1Get1_cash = order?.summary?.secondaryCurrency_doubleMenuItemPrice;
        couponDiscount_cash =
            order?.summary.secondaryCurrency_couponDiscountAmount +
            order?.summary.secondaryCurrency_punchMarketingDiscountAmount;
        wallet_cash = order?.summary?.secondaryCurrency_wallet;
    } else {
        originalOrderAmount_online =
            order?.summary?.secondaryCurrency_productAmount +
            order?.summary?.secondaryCurrency_doubleMenuItemPrice;
        discount_online = order?.summary?.secondaryCurrency_discount;
        loyaltyPoints_online = order?.summary?.reward?.secondaryCurrency_amount;
        buy1Get1_online = order?.summary?.secondaryCurrency_doubleMenuItemPrice;
        couponDiscount_online =
            order?.summary?.secondaryCurrency_couponDiscountAmount +
            order?.summary.secondaryCurrency_punchMarketingDiscountAmount;
        wallet_online = order?.summary?.secondaryCurrency_wallet;
    }

    const totalCash =
        originalOrderAmount_cash -
        discount_cash -
        loyaltyPoints_cash -
        buy1Get1_cash -
        couponDiscount_cash;

    const totalOnline =
        originalOrderAmount_online -
        discount_online -
        loyaltyPoints_online -
        buy1Get1_online -
        couponDiscount_online;

    const discount_amc = order?.discountCut?.secondaryCurrency_discountAdminCut;
    const buy1Get1_amc =
        order?.doubleMenuItemPrice?.secondaryCurrency_doubleMenuItemPriceAdmin;
    const couponDiscount_amc =
        order?.couponDiscountCut?.secondaryCurrency_couponAdminCut;
    const pointsCashback = order?.secondaryCurrency_rewardRedeemCashback;
    const adminMarketingCashback =
        discount_amc + buy1Get1_amc + couponDiscount_amc + pointsCashback;

    const orderAmount = totalCash + totalOnline + adminMarketingCashback;

    const adminFees =
        order?.adminCharge?.secondaryCurrency_adminChargeFromOrder +
        adminMarketingCashback;

    const freeDeliveryByShop =
        order?.freeDeliveryCut?.secondaryCurrency_freeDeliveryShopCut || 0;

    const customerRefund = order?.isRefundedAfterDelivered
        ? order?.userRefundTnx[0]?.secondaryCurrency_shopCut +
          order?.userRefundTnx[0]?.secondaryCurrency_adminVatCut
        : 0;

    let deliveryFee_cash = 0;
    let deliveryFee_online = 0;
    let riderTip_online = 0;
    if (order?.orderFor === 'specific' && order?.paymentMethod === 'cash') {
        deliveryFee_cash = order?.inEndorseLossDeliveryFeeIncluded
            ? order?.summary?.secondaryCurrency_riderFeeWithFreeDelivery
            : order?.summary?.secondaryCurrency_riderFee +
              (order?.subscriptionLoss?.secondaryCurrency_freeDelivery || 0);
    } else if (
        order?.orderFor === 'specific' &&
        order?.paymentMethod !== 'cash'
    ) {
        deliveryFee_online = order?.inEndorseLossDeliveryFeeIncluded
            ? order?.summary?.secondaryCurrency_riderFeeWithFreeDelivery
            : order?.summary?.secondaryCurrency_riderFee +
              (order?.subscriptionLoss?.secondaryCurrency_freeDelivery || 0);
        riderTip_online = order?.summary?.secondaryCurrency_riderTip;
    }

    // const totalVat = order?.vatAmount?.secondaryCurrency_vatForShop;
    const totalVat = order?.isRefundedAfterDelivered
        ? order?.vatAmount?.secondaryCurrency_vatForAdmin -
          order?.userRefundTnx[0]?.secondaryCurrency_adminVatCut
        : order?.vatAmount?.secondaryCurrency_vatForAdmin;

    //** Calc Shop Cash In Hand Start **/
    let cashInHand = 0;
    if (
        order?.orderFor === 'specific' &&
        order?.paymentMethod === 'cash' &&
        order?.orderStatus === 'delivered'
    ) {
        cashInHand = order?.summary?.secondaryCurrency_cash;
    }
    //** Calc Shop Cash In Hand End **/

    // const totalPayout =
    //     order?.secondaryCurrency_shopEarnings +
    //     totalVat -
    //     customerRefund -
    //     cashInHand;
    const totalPayout =
        order?.secondaryCurrency_shopEarnings - customerRefund - cashInHand;

    const profitBreakdown = {
        cash: {
            originalOrderAmount_cash,
            discount_cash,
            loyaltyPoints_cash,
            buy1Get1_cash,
            couponDiscount_cash,
            totalCash,
            wallet_cash,
        },
        online: {
            originalOrderAmount_online,
            discount_online,
            loyaltyPoints_online,
            buy1Get1_online,
            couponDiscount_online,
            totalOnline,
            wallet_online,
        },
        AdminMarketingCashback: {
            discount_amc,
            buy1Get1_amc,
            couponDiscount_amc,
            pointsCashback,
            adminMarketingCashback,
        },
        orderAmount,
        adminFees,
        // pointsCashback,
        totalVat,
        otherPayments: {
            freeDeliveryByShop,
            customerRefund,
            totalOtherPayments: freeDeliveryByShop + customerRefund,
        },
        deliveryFee: {
            deliveryFee:
                deliveryFee_cash + deliveryFee_online + riderTip_online,
            cash: deliveryFee_cash,
            online: deliveryFee_online + riderTip_online,
            deliveryFee_online,
            riderTip_online,
        },
        cashInHand,
        totalPayout,
    };

    return { profitBreakdown };
};
