const moment = require('moment');

exports.getDatesInRange = (startDate, endDate) => {
    const date = new Date(startDate.getTime());

    const dates = [];

    while (date <= endDate) {
        dates.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }

    return dates;
};

exports.formatDate = (startDate, endDate) => {
    const startDateTime = moment(new Date(startDate)).startOf('day').toDate();
    const endDateTime = moment(new Date(endDate)).endOf('day').toDate();

    const daysDiff = moment(new Date(endDate)).diff(
        moment(new Date(startDate)),
        'days'
    );

    const oldEndDate = moment(new Date(startDate))
        .subtract(1, 'days')
        .endOf('day')
        .toDate();
    const oldStartDate = moment(oldEndDate)
        .subtract(daysDiff, 'days')
        .startOf('day')
        .toDate();

    return { startDateTime, endDateTime, oldStartDate, oldEndDate };
};
