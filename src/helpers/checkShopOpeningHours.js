const { find } = require('geo-tz');
const moment = require('moment');
require('moment-timezone');

exports.checkShopOpeningHours = (shop, scheduleDate = new Date()) => {
    const timeZone = find(
        shop?.address?.location?.coordinates[1],
        shop?.address?.location?.coordinates[0]
    );
    const currentDay = moment(new Date(scheduleDate))
        .tz(timeZone[0])
        .format('dddd');
    const currentDayOpeningHours = shop?.normalHours?.find(
        element => element.day === currentDay
    );

    if (currentDayOpeningHours) {
        if (currentDayOpeningHours?.isActive === false) {
            return false;
        }

        for (const holidayHour of shop.holidayHours) {
            const currentDate = moment(new Date(scheduleDate))
                .tz(timeZone[0])
                .format('MMM Do YY');
            const holidayDate = moment(holidayHour.date)
                .tz(timeZone[0])
                .format('MMM Do YY');
            if (currentDate === holidayDate) {
                if (holidayHour.isFullDayOff) {
                    return false;
                }
                var closeStartTime = moment(holidayHour?.closedStart, 'HH:mm');
                var closeEndTime = moment(holidayHour?.closedEnd, 'HH:mm');
                const currentTime = moment(new Date(scheduleDate))
                    .tz(timeZone[0])
                    .format('HH:mm');
                const testDate = moment(currentTime, 'HH:mm');
                let result = testDate.isBetween(
                    closeStartTime,
                    closeEndTime,
                    'minutes',
                    true
                );
                if (result) {
                    return false;
                }
            }
        }

        if (currentDayOpeningHours?.isFullDayOpen) {
            return true;
        }

        for (const openingHour of currentDayOpeningHours?.openingHours) {
            var startTime = moment(openingHour?.open, 'HH:mm');
            var endTime = moment(openingHour?.close, 'HH:mm');
            const currentTime = moment(new Date(scheduleDate))
                .tz(timeZone[0])
                .format('HH:mm');
            const testDate = moment(currentTime, 'HH:mm');
            let result = testDate.isBetween(
                startTime,
                endTime,
                'minutes',
                true
            );
            if (result) {
                return true;
            }
        }
    }

    return false;
};
