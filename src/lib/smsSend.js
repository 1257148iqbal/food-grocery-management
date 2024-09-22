const axios = require('axios').default;

const SmsSend = async ({ phoneNumbers, message }) => {
    // console.log('otp data => ', phoneNumbers, message);

    if (process.env.SMS_TEST == 'YES') {
        return {
            status: true,
            message: 'Successfully send',
            error: null,
        };
    }

    try {
        let params = {
            pd_m: 'send',
            id: '61498',
            secret: 'lFKQCeXIpZ7wAVyAkWQVrHreaaTxa4Fw',
            pass: 'qnmFk45jcBU89vs6loy3PMdZFLaKqGuR3QxnUCH7dCfn8Itu',
            senderID: '61498',
            to_number: phoneNumbers,
            textmessage: message,
        };

        const { data } = await axios.get('http://www.padisms.com/smsapi', {
            params: params,
        });

        // console.log('otp data', data);

        let responses = `${data}`.split(' ');
        const code = responses[0];

        const object = {
            status: true,
            message: data,
            error: null,
        };

        object.status = code == 9000 ? true : false;

        return object;
    } catch (error) {
        return { status: false, message: error.message };
    }
};

module.exports = SmsSend;

// Our SMS API
// SMS API
// You will need both your api secret key and pass to send a valid request to our endpoint

// To send sms, you connect to:
// http://www.padisms.com/smsapi?pd_m=send&id=[id]&secret=[secret]&pass=[pass]&senderID=[senderid]&to_number=[to_number]&textmessage=[textmessage]

// Where
// [id]: Your gateway ID
// [senderid]: Is your sender ID
// [to_number]: Phone numbers of recipients for this message. Separate multiple phone numbers with a comma (,)
// [textmessage]: The text message to be sent
// [dateTime]: The time the SMS should be sent. This is applicable for scheduling messages. Supported format is "2009-10-01 12:30:00" i.e "YYYY-MM-DD HH:mm:ss". This parameter is optional.
// [secret]: Your API secret
// [pass]: Your API pass

// To check sms balance:
// http://www.padisms.com/smsapi?pd_m=balance&id=[id]&secret=[secret]&pass=[pass]

// API Response Codes:
// 9000 [230] OK: SMS sent successfully and [230] is the no. of units used.
// 9001 ERROR: Sender ID is missing.
// 9002 ERROR: Text message is missing.
// 9003 ERROR: SMS has been scheduled.
// 9004 ERROR: SMS balance is 0.00
// 9005 ERROR: Internal error with the gateway.
// 9006 ERROR: Insufficient sms units for this message.
// 9007 ERROR: Something went wrong with this sms gateway. Please check with your provider
// 9008 ERROR: Invalid secret or pass.
