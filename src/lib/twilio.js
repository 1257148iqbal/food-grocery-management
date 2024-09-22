const twilio = require('twilio');
const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

exports.sendWhatsappOTP = async (toNumber, message) => {
    try {
        if (process.env.SMS_TEST == 'YES') {
            return {
                status: true,
                message: 'Successfullyy send',
            };
        }

        const result = await client.messages.create({
            from: process.env.TWILIO_FROM_NUMBER,
            to: `whatsapp:${toNumber}`,
            messagingServiceSid: 'MG7388a0916945dcd333451f22f9f723f7',
            contentSid: 'HXbd364741884cfdbbfd7dd38ce7f6b5d3',
            contentVariables: JSON.stringify({
                "1": String(message)
            })
        });


        console.log(result);

        return {
            status: true,
            message: 'Successfully send',
            result,
        };
    } catch (error) {
        console.log(error);
        return { status: false, message: error.message };
    }
};
