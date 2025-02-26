export function humanizeCronInChinese(cron) {
    const tokens = cron.trim().split(' ');
    const cronStruct = {
        time: {
            second: compileNode(tokens[0]), // 新增秒
            minute: compileNode(tokens[1]),
            hour: compileNode(tokens[2])
        },
        date: {
            dayInMonth: compileNode(tokens[3]),
            month: compileNode(tokens[4]),
            dayInWeek: compileNode(tokens[5])
        }
    };

    cronStruct.date = compileDatePart(cronStruct.date);
    cronStruct.time = compileTimePart(cronStruct.time);

    if (cronStruct.date.anyCount === 3 && cronStruct.time.text[0] === '每') {
        // 避免 '每日每分钟' 出现
        cronStruct.date.text = '';
    }

    return cronStruct.date.text + cronStruct.time.text;
}

function compileNode(raw) {
    const compiled = { raw };
    compiled.isAny = raw === '*';
    compiled.hasStepping = raw.indexOf('/') >= 0;
    compiled.hasList = raw.indexOf(',') >= 0;
    compiled.hasRange = raw.indexOf('-') >= 0;
    compiled.values = raw.split(',');
    return compiled;
}

function compileDatePart(date) {
    date.anyCount = date.month.isAny + date.dayInMonth.isAny + date.dayInWeek.isAny;
    if (date.anyCount === 3) {
        date.text = '每日';
    } else if (date.anyCount === 2) {
        if (date.month.isAny === false) {
            // X 月每日
            date.text = parseMonthToken(date.month.raw) + '每日';
        } else if (date.dayInMonth.isAny === false) {
            // 每月 X 日
            date.text = '每月' + parseDayInMonthToken(date.dayInMonth.raw);
        } else {
            // 每周 X
            date.text = '每' + parseDayInWeekToken(date.dayInWeek.raw);
        }
    } else if (date.anyCount === 1) {
        if (date.month.isAny) {
            // 每月 X 日或周 X
            date.text = '每月' + parseDayInMonthToken(date.dayInMonth.raw) + '或' + parseDayInWeekToken(date.dayInWeek.raw);
        } else if (date.dayInMonth.isAny) {
            // X 月的每周 X
            date.text = parseMonthToken(date.month.raw) + '的每' + parseDayInWeekToken(date.dayInWeek.raw);
        } else {
            // X 月 X 日
            date.text = parseMonthToken(date.month.raw) + parseDayInMonthToken(date.dayInMonth.raw);
        }
    } else {
        // X月X日或周X
        date.text = parseMonthToken(date.month.raw) + parseDayInMonthToken(date.dayInMonth.raw) + '或' + parseDayInWeekToken(date.dayInWeek.raw);
    }

    return date;
}

function compileTimePart(time) {
    time.anyCount = time.hour.isAny + time.minute.isAny + time.second.isAny;
    if (time.anyCount === 3) {
        time.text = '每秒钟';
    } else if (time.anyCount === 2) {
        if(time.hour.isAny) {
            if(time.minute.isAny) {
                if(time.second.raw == '0') {// 0 * *
                    time.text = '每分鐘';
                    return;
                }
                if (time.second.hasStepping) {
                    const parts = time.second.raw.split('/');
                    if (time.second.hasRange || time.second.hasList) {
                        time.text = '每分钟的第' + parts[0] + '秒(间隔' + parts[1] + '秒钟)';
                    } else {
                        time.text = '每隔' + time.second.raw.split('/')[1] + '秒钟';
                    }
                } else {
                    time.text = '每分钟的第' + time.second.raw + '秒钟'
                }
            } else { // hour second 都為任意
                if(time.minute.raw == '0') {// * 0 *
                    time.text = '每小時的整點 每秒钟';
                    return;
                }
                if (time.minute.hasStepping) {
                    const parts = time.minute.raw.split('/');
                    if (time.minute.hasRange || time.minute.hasList) {
                        time.text = '每小时的第' + parts[0] + '分钟(间隔' + parts[1] + '分钟)';
                    } else {
                        time.text = '每隔' + time.minute.raw.split('/')[1] + '分钟';
                    }
                } else {
                    time.text = '每小时的第' + time.minute.raw + '分钟'
                } 
            }
        } else {// minute second 都為任意 * * x
            if (time.hour.hasStepping) {
                const parts = time.hour.raw.split('/');
                if (time.hour.hasRange || time.hour.hasList) {
                    time.text = parts[0] + '时的每一秒秒钟(间隔' + parts[1] + '小时)';
                } else {
                    time.text = '每隔' + time.minute.raw.split('/')[1] + '秒钟';
                }
            } else {
                time.text = time.hour.raw + '时的每一秒钟';
            }
        }
    } else if (time.anyCount === 1) {
        // x x *
        if(time.hour.isAny) {
            if (time.minute.hasStepping || time.second.hasStepping) {
                let minuteString;
                if (time.minute.hasStepping) {
                    const parts = time.minute.raw.split('/');
                    if (time.minute.hasList || time.minute.hasRange) {
                        minuteString = parts[0] + '分鐘(间隔' + parts[1] + '分鐘)';
                    } else {
                        minuteString = '每' + parts[1] + '分钟';
                    }
                } else {
                    minuteString = time.minute.raw + '分';
                }
    
                let secondString;
                if (time.second.hasStepping) {
                    const parts = time.second.raw.split('/');
                    if (time.second.hasRange || time.second.hasList) {
                        secondString = '第' + parts[0] + '秒(间隔' + parts[1] + '秒)';
                    } else {
                        secondString = '每' + parts[1] + '秒';
                    }
                } else {
                    secondString = '第' + time.second.raw + '秒';
                }
    
                time.text = minuteString + '的' + secondString;
                return time;
            }

            if (!time.minute.hasList && !time.minute.hasRange) {
                if (!time.second.hasList) { 
                    if (time.second.hasRange) {
                        // XX:XX - XX:YY
                        const secondRange = time.second.raw.split('-');
                        time.text = time.minute.raw.padStart(2, '0') + ':' + secondRange[0].padStart(2, '0') + '-' + time.minute.raw.padStart(2, '0') + ':' + secondRange[1].padStart(2, '0');
                    } else {
                        // XX:XX
                        time.text = time.minute.raw.padStart(2, '0') + ':' + time.second.raw.padStart(2, '0');
                    }
                } else {
                    time.text = time.minute.raw + '分鐘的第' + time.second.raw + '秒鐘';
                }
            } else {
                time.text = time.minute.raw + '分鐘的第' + time.second.raw + '秒鐘';
            }
        } 
        // x * x
        else if(time.minute.isAny) {
            if (time.hour.hasStepping || time.second.hasStepping) {
                let hourString;
                if (time.hour.hasStepping) {
                    const parts = time.hour.raw.split('/');
                    if (time.hour.hasList || time.hour.hasRange) {
                        hourString = parts[0] + '時(间隔' + parts[1] + '小時)';
                    } else {
                        hourString = '每' + parts[1] + '小時';
                    }
                } else {
                    hourString = time.hour.raw + '小時';
                }
    
                let secondString;
                if (time.second.hasStepping) {
                    const parts = time.second.raw.split('/');
                    if (time.second.hasRange || time.second.hasList) {
                        secondString = '第' + parts[0] + '秒(间隔' + parts[1] + '秒)';
                    } else {
                        secondString = '每' + parts[1] + '秒';
                    }
                } else {
                    secondString = '第' + time.second.raw + '秒';
                }
    
                time.text = minuteString + '的' + secondString;
                return time;
            }

            if (!time.hour.hasList && !time.hour.hasRange) {
                if (!time.second.hasList) { 
                    if (time.second.hasRange) {
                        // XX:XX - XX:YY TODO 
                        const secondRange = time.second.raw.split('-');
                        time.text = time.hour.raw.padStart(2, '0') + ':' + secondRange[0].padStart(2, '0') + '-' + time.hour.raw.padStart(2, '0') + ':' + secondRange[1].padStart(2, '0');
                    } else {
                        // XX:XX
                        time.text = time.hour.raw.padStart(2, '0') + ':' + time.second.raw.padStart(2, '0');
                    }
                } else {
                    time.text = time.hour.raw + '小時的第' + time.second.raw + '秒鐘';
                }
            } else {
                time.text = time.hour.raw + '小時的第' + time.second.raw + '秒鐘';
            }
        } 
        // * x x
        else {
            if (time.hour.hasStepping || time.minute.hasStepping) {
                let hourString;
                if (time.hour.hasStepping) {
                    const parts = time.hour.raw.split('/');
                    if (time.hour.hasList || time.hour.hasRange) {
                        hourString = parts[0] + '时(间隔' + parts[1] + '小时)';
                    } else {
                        hourString = '每' + parts[1] + '小时';
                    }
                } else {
                    hourString = time.hour.raw + '时';
                }
    
                let minuteString;
                if (time.minute.hasStepping) {
                    const parts = time.minute.raw.split('/');
                    if (time.minute.hasRange || time.minute.hasList) {
                        minuteString = '第' + parts[0] + '分钟(间隔' + parts[1] + '分钟)';
                    } else {
                        minuteString = '每' + parts[1] + '分钟';
                    }
                } else {
                    minuteString = '第' + time.minute.raw + '分钟';
                }
    
                time.text = hourString + '的' + minuteString;
                return time;
            }
    
            if (!time.hour.hasList && !time.hour.hasRange) {
                if (!time.minute.hasList) {
                    if (time.minute.hasRange) {
                        // XX:XX - XX:YY
                        const minuteRange = time.minute.raw.split('-');
                        time.text = time.hour.raw.padStart(2, '0') + ':' + minuteRange[0].padStart(2, '0') + '-' + time.hour.raw.padStart(2, '0') + ':' + minuteRange[1].padStart(2, '0');
                    } else {
                        // XX:XX
                        time.text = time.hour.raw.padStart(2, '0') + ':' + time.minute.raw.padStart(2, '0');
                    }
                } else {
                    time.text = time.hour.raw + '时的第' + time.minute.raw + '分钟';
                }
            } else {
                time.text = time.hour.raw + '时的第' + time.minute.raw + '分钟';
            }
        }
    } else {// 
        if (time.hour.hasStepping || time.minute.hasStepping) {
            let hourString;
            if (time.hour.hasStepping) {
                const parts = time.hour.raw.split('/');
                if (time.hour.hasList || time.hour.hasRange) {
                    hourString = parts[0] + '时(间隔' + parts[1] + '小时)';
                } else {
                    hourString = '每' + parts[1] + '小时';
                }
            } else {
                hourString = time.hour.raw + '时';
            }

            let minuteString;
            if (time.minute.hasStepping) {
                const parts = time.minute.raw.split('/');
                if (time.minute.hasRange || time.minute.hasList) {
                    minuteString = '第' + parts[0] + '分钟(间隔' + parts[1] + '分钟)';
                } else {
                    minuteString = '每' + parts[1] + '分钟';
                }
            } else {
                minuteString = '第' + time.minute.raw + '分钟';
            }

            time.text = hourString + '的' + minuteString;
            return time;
        }

        if (!time.hour.hasList && !time.hour.hasRange) {
            if (!time.minute.hasList) {
                if (time.minute.hasRange) {
                    // XX:XX - XX:YY
                    const minuteRange = time.minute.raw.split('-');
                    time.text = time.hour.raw.padStart(2, '0') + ':' + minuteRange[0].padStart(2, '0') + '-' + time.hour.raw.padStart(2, '0') + ':' + minuteRange[1].padStart(2, '0');
                } else {
                    // XX:XX
                    time.text = time.hour.raw.padStart(2, '0') + ':' + time.minute.raw.padStart(2, '0');
                }
            } else {
                time.text = time.hour.raw + '时的第' + time.minute.raw + '分钟';
            }
        } else {
            time.text = time.hour.raw + '时的第' + time.minute.raw + '分钟';
        }
    }

    return time;
}

function parseMonthToken(month) {
    // replace month name if any
    monthMap.forEach((x, i) => {
        month = month.replace(x, (i + 1).toString());
    });
    if (month.indexOf('/') >= 0) {
        const parts = month.split('/');
        return parts[0] === '*' ? ('每' + parts[1] + '月') : (parts[0] + '月(间隔' + parts[1] + '月)');
    }

    return month + '月';
}

function parseDayInMonthToken(dayInMonth) {
    if (dayInMonth.indexOf('/') >= 0) {
        const parts = dayInMonth.split('/');
        return parts[0] === '*' ? ('每' + parts[1] + '日') : (parts[1] + '日(间隔' + parts[1] + '日)');
    }
    return dayInMonth + '日';
}

function parseDayInWeekToken(dayInWeek) {
    dayInWeekMap.forEach((x, i) => {
        dayInWeek = dayInWeek.replace(x, i.toString());
    });
    if (dayInWeek.indexOf(',') >= 0) {
        if (dayInWeek.indexOf('-') < 0) {
            // 周三、四、六
            return '周' + dayInWeek.split(',').map(x => dayInWeekNameMap[Number(x)]).join('、');
        }

        return dayInWeek.split(',').map(x => parseDayInWeekToken(x)).join(',');
    }

    if (dayInWeek.indexOf('-') >= 0) {
        return dayInWeek.split('-').map(x => parseDayInWeekToken(x)).join('~');
    }

    return '周' + dayInWeekNameMap[Number(dayInWeek)];
}

const dayInWeekNameMap = ['日', '一', '二', '三', '四', '五', '六'];
const dayInWeekMap = ['SUN', 'MON', 'TUE', 'WEB', 'THU', 'FRI', 'SAT'].map(x => new RegExp(x, 'ig'));
const monthMap = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(x => new RegExp(x, 'ig'));
