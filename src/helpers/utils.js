
const moment = require('moment');

//addtion two value

const calculateEarnings = (earnings,vat)=> Number(earnings ?? 0) + Number(vat ?? 0)

const nearestRoundedValue = 500;

const checkRoundedValue = (value) => {
    let number = Number(value);
    number = isNaN(number) ? 0 : number;
    const flag = number % nearestRoundedValue === 0 ? true : false;
    return flag;
}

const calculateSecondaryPrice  =  (price, exchangeRate = 1) => {
    price = Number(price);
    price = isNaN(price)? 0 : price;

    exchangeRate = Number(exchangeRate);
    exchangeRate = isNaN(exchangeRate)? 0 : exchangeRate;
    
    const convertedValue = Math.round(price * exchangeRate);

    let secondaryPrice = 0;

    /*
    const remainder = Math.round(convertedValue % 500);
    if (remainder < 250) {
        secondaryPrice = Math.floor(convertedValue / 500) * 500;
    } else {
        secondaryPrice = Math.ceil(convertedValue / 500) * 500;
    }
    */
    
    const remainder = Math.round(convertedValue % nearestRoundedValue);
    if (remainder * 2.0 < nearestRoundedValue) {
        secondaryPrice = Math.floor(convertedValue / nearestRoundedValue) * nearestRoundedValue;
    } else {
        secondaryPrice = Math.ceil(convertedValue / nearestRoundedValue) * nearestRoundedValue;
    }
    
    return secondaryPrice;
}

// calculate Number of Days between two date

 exports.calculateNumberOfDays = (startDate,endDate)=>{
    const start = moment(startDate, "YYYY-MM-DD");   
    const end = moment(endDate, "YYYY-MM-DD");
    return Math.abs(moment.duration(start.diff(end)).asDays()) + 1;
  
}

// converting startDate and end date to db query format

exports.getDateRange = (startDate,endDate) =>{
    const startOfWeek = moment(startDate).toDate();
    const endOfWeek = moment(endDate).toDate();
    return {startOfWeek,endOfWeek}
}

// validate the start date and end date format

exports.isDateValid = (startDate,endDate, format = "YYYY-MM-DD") => moment(startDate, format, true).isValid() && moment(endDate, format, true).isValid();


// calculate Number of Days between two date

 exports.calculateNumberOfDays = (startDate,endDate)=>{
    const start = moment(startDate, "YYYY-MM-DD");   
    const end = moment(endDate, "YYYY-MM-DD");
    return Math.abs(moment.duration(start.diff(end)).asDays()) + 1;
  
}

// converting startDate and end date to db query format

exports.getDateRange = (startDate,endDate) =>{
    const startOfWeek = moment(startDate).toDate();
    const endOfWeek = moment(endDate).toDate();
    return {startOfWeek,endOfWeek}
}

// validate the start date and end date format

exports.isDateValid = (startDate,endDate, format = "YYYY-MM-DD") => moment(startDate, format, true).isValid() && moment(endDate, format, true).isValid();

exports.calculateEarnings = calculateEarnings
exports.nearestRoundedValue = nearestRoundedValue
exports.checkRoundedValue = checkRoundedValue
exports.calculateSecondaryPrice = calculateSecondaryPrice