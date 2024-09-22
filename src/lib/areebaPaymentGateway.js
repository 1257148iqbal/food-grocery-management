const axios = require('axios').default;

exports.areebaPaymentGateway = async (orderId, transactionId, putData) => {
    try {
        // Encode the credentials in base64
        const base64Credentials = Buffer.from(
            `merchant.${process.env.AREEBA_MERCHANT_ID}:${process.env.AREEBA_PASSWORD}`,
            'utf-8'
        ).toString('base64');

        const { data } = await axios.put(
            `https://epayment.areeba.com/api/rest/version/${process.env.AREEBA_VERSION}/merchant/${process.env.AREEBA_MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`,
            putData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${base64Credentials}`,
                },
            }
        );

        return { data };
    } catch (error) {
        console.log(error);
        return { status: false, message: error.message };
    }
};

exports.areebaSession = async postData => {
    try {
        // Encode the credentials in base64
        const base64Credentials = Buffer.from(
            `merchant.${process.env.AREEBA_MERCHANT_ID}:${process.env.AREEBA_PASSWORD}`,
            'utf-8'
        ).toString('base64');

        const { data } = await axios.post(
            `https://epayment.areeba.com/api/rest/version/${process.env.AREEBA_VERSION}/merchant/${process.env.AREEBA_MERCHANT_ID}/session`,
            postData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${base64Credentials}`,
                },
            }
        );

        return { data };
    } catch (error) {
        console.log(error);
        return { status: false, message: error.message };
    }
};

exports.areebaToken = async sessionId => {
    try {
        // Encode the credentials in base64
        const base64Credentials = Buffer.from(
            `merchant.${process.env.AREEBA_MERCHANT_ID}:${process.env.AREEBA_PASSWORD}`,
            'utf-8'
        ).toString('base64');

        const { data } = await axios.post(
            `https://epayment.areeba.com/api/rest/version/${process.env.AREEBA_VERSION}/merchant/${process.env.AREEBA_MERCHANT_ID}/token`,
            {
                session: {
                    id: sessionId,
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${base64Credentials}`,
                },
            }
        );

        return { data };
    } catch (error) {
        console.log(error);
        return { status: false, message: error.message };
    }
};
