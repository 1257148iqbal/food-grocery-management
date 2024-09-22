exports.randomNumber = function(length) {
    let text = '';
    let possible = '123456789';
    for (let i = 0; i < length; i++) {
        let sup = Math.floor(Math.random() * possible.length);
        text += i > 0 && sup === i ? '0' : possible.charAt(sup);
    }
    return Number(text);
};

exports.normalizePort = val => {
    let port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
};

exports.makeSlug = slug => {
    let newSlug = slug.toLowerCase().replace(/[^\w-]+/g, '-');

    // console.log('newSlug', newSlug);

    while (newSlug.indexOf('--') !== -1) {
        // console.log('newSlug', newSlug);
        newSlug = newSlug.replace('--', '-');
    }

    return newSlug;
};

exports.creditCardType = cc => {
    let amex = new RegExp('^3[47][0-9]{13}$');
    let visa = new RegExp('^4[0-9]{12}(?:[0-9]{3})?$');
    let cup1 = new RegExp('^62[0-9]{14}[0-9]*$');
    let cup2 = new RegExp('^81[0-9]{14}[0-9]*$');

    let mastercard = new RegExp('^5[1-5][0-9]{14}$');
    let mastercard2 = new RegExp('^2[2-7][0-9]{14}$');

    let disco1 = new RegExp('^6011[0-9]{12}[0-9]*$');
    let disco2 = new RegExp('^62[24568][0-9]{13}[0-9]*$');
    let disco3 = new RegExp('^6[45][0-9]{14}[0-9]*$');

    let diners = new RegExp('^3[0689][0-9]{12}[0-9]*$');
    let jcb = new RegExp('^35[0-9]{14}[0-9]*$');

    if (visa.test(cc)) {
        return 'VISA';
    }
    if (amex.test(cc)) {
        return 'AMEX';
    }
    if (mastercard.test(cc) || mastercard2.test(cc)) {
        return 'MASTERCARD';
    }
    if (disco1.test(cc) || disco2.test(cc) || disco3.test(cc)) {
        return 'DISCOVER';
    }
    if (diners.test(cc)) {
        return 'DINERS';
    }
    if (jcb.test(cc)) {
        return 'JCB';
    }
    if (cup1.test(cc) || cup2.test(cc)) {
        return 'CHINA_UNION_PAY';
    }
    return 'OTHER';
};


exports.getRendomString = (length) => {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

exports.isJsonString = (str) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

exports.getIncreasePercentage = (backDateData, currentDateData) => {
    return ((currentDateData - backDateData) / (backDateData  || 1)) * 100;
};

exports.removeCountryCode = (phoneNumber) => {
    let localNumber = phoneNumber.replace(/^\+\d+/, '');
    return localNumber.slice(-8);
};

exports.convertNumberToCode = (number) => { // convert a number to a code (e.g. 0 -> aa00)
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const lettersLength = letters.length;

    const firstCharIndex = Math.floor(number / lettersLength) % lettersLength;
    const secondCharIndex = number % lettersLength;

    const digits = number % 100; // Ensures two digits (00 to 99)
    return letters[firstCharIndex] + letters[secondCharIndex] + digits.toString().padStart(2, '0');
};

exports.splitName = (fullName) => {
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length === 0) return { firstName: '', lastName: '' };
    return { firstName: nameParts[0], lastName: nameParts.slice(1).join(' ') };
};
