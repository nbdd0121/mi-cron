/*!
 * mi-cron
 *
 * A microscopic parser for standard cron expressions.
 *
 * Copyright (c) 2020-present, cheap glitch
 * This software is distributed under the ISC license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCron = void 0;
const shorthands = {
    '@hourly': '0 * * * *',
    '@daily': '0 0 * * *',
    '@weekly': '0 0 * * 6',
    '@monthly': '0 0 1 * *',
    '@yearly': '0 0 1 1 *',
    '@annually': '0 0 1 1 *',
};
function parseCron(line) {
    const fields = line.trim().split(/\s+/);
    if (fields.length == 1) {
        return (fields[0] in shorthands) ? parseCron(shorthands[fields[0]]) : null;
    }
    if (fields.length == 5) {
        let schedule = null;
        try {
            schedule = {
                minutes: parseField(fields[0], 0, 59),
                hours: parseField(fields[1], 0, 23),
                days: parseField(fields[2], 1, 31),
                months: parseField(fields[3], 1, 12, ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']),
                weekDays: parseField(fields[4], 0, 6, ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']),
            };
        }
        catch (_a) {
            return null;
        }
        return schedule;
    }
    return null;
}
exports.parseCron = parseCron;
function parseField(field, min, max, aliases = []) {
    const values = Array.from(new Set(field.split(',').flatMap(item => {
        const [exp, stepStr = '1'] = item.split('/');
        const step = parseInt(stepStr, 10);
        if (Number.isNaN(step)) {
            throw Error();
        }
        if (exp == '*') {
            return range(min, max, step);
        }
        const matches = exp.match(rangePattern);
        if (!matches) {
            throw Error();
        }
        const start = parseRangeBoundary(matches[1], min, max, aliases);
        const stop = parseRangeBoundary(matches[2], min, max, aliases);
        if (start === null || (stop !== null && stop < start)) {
            throw Error();
        }
        return stop == null ? [start] : range(start, stop, step);
    })));
    values.sort((a, b) => a - b);
    return values;
}
const bound = '(\\d{1,2}|[a-z]{3})';
const rangePattern = new RegExp(`^${bound}(?:-${bound})?$`, 'i');
function parseRangeBoundary(bound, min, max, aliases = []) {
    if (!bound) {
        return null;
    }
    if (aliases.includes(bound)) {
        return aliases.indexOf(bound);
    }
    const value = parseInt(bound, 10);
    return (!Number.isNaN(value) && min <= value && value <= max) ? value : null;
}
parseCron.nextDate = function (schedule, from = new Date()) {
    schedule = typeof schedule == 'string' ? parseCron(schedule) : schedule;
    if (schedule === null) {
        return null;
    }
    const date = {
        minutes: from.getUTCMinutes(),
        hours: from.getUTCHours(),
        days: from.getUTCDate(),
        months: from.getUTCMonth() + 1,
        years: from.getUTCFullYear(),
    };
    findNextTime(schedule, date, 'minutes', 'hours');
    findNextTime(schedule, date, 'hours', 'days');
    do {
        findNextTime(schedule, date, 'days', 'months');
        findNextTime(schedule, date, 'months', 'years');
    } while (!schedule.weekDays.includes(cronDateToUTC(date).getUTCDay()) && ++date.days);
    return cronDateToUTC(date);
};
function findNextTime(schedule, date, elem, nextElem) {
    date[elem] = schedule[elem].find(elem == 'minutes' ? (time => time > date[elem]) : (time => time >= date[elem]));
    if (date[elem] === undefined) {
        date[elem] = schedule[elem][0],
            date[nextElem]++;
    }
}
function cronDateToUTC(date) {
    return new Date(Date.UTC(date.years, date.months - 1, date.days, date.hours, date.minutes));
}
function range(start, stop, step = 1) {
    return Array.from({ length: Math.floor((stop - start) / step) + 1 }).map((_, i) => start + i * step);
}