/**
 * 日子的小工具：星期几、今天有什么（节日 / 节气 / 赶集）、天气。
 * 数据都在 src/data/time.ts 的 calendar 和 weather 里；显示的字在 src/locales/zh.ts。
 *
 *  - 星期：每月 28 天正好 4 周，每月 1、8、15、22 日是周一，依次到周日。
 *  - 天气：每天早上 6 点按季节概率抽一次（weather.chances），每月 1 日固定（weather.firstDayOfMonth）。
 */
import { TIME } from '../data/time';
import type { Weather } from '../data/types';
import { localName, t } from '../locales/i18n';

const cal = TIME.calendar;

/** 第几天是星期几：0 = 周一 …… 6 = 周日 */
export function weekdayIndex(day: number) {
  return (day - 1) % cal.daysPerWeek;
}

/** 「周一」……「周日」 */
export function weekdayName(day: number) {
  return t('calendar.weekdays').split(',')[weekdayIndex(day)] ?? '';
}

/** 今天是不是周日（一周的最后一天） */
export function isLastDayOfWeek(day: number) {
  return weekdayIndex(day) === cal.daysPerWeek - 1;
}

/** 「正月」「二月」…… */
export function monthName(month: number) {
  return localName(cal.months[month - 1]?.name);
}

/** 「初一」……「廿八」 */
export function dayName(day: number) {
  return t('calendar.dayNames').split(',')[day - 1] ?? String(day);
}

/** 这个月属于哪个季节 */
export function seasonOf(month: number) {
  return cal.seasons.find((s) => s.months.includes(month)) ?? cal.seasons[0];
}

/** 这一天有什么：节日（空位不算）、节气（正好是这一天开始的）、是不是赶集日 */
export function dayEvents(month: number, day: number) {
  const festival = cal.festivals.find((f) => !f.placeholder && f.month === month && f.day === day);
  const term = cal.solarTerms.find((s) => s.month === month && s.day === day);
  const market = cal.marketDays.includes(day);
  return { festival, term, market };
}

/** 时辰框里的「元宵 · 立春 · 赶集日」（这天什么都没有就是空字符串） */
export function dayTagsText(month: number, day: number) {
  const e = dayEvents(month, day);
  const parts: string[] = [];
  if (e.festival) parts.push(localName(e.festival.name));
  if (e.term) parts.push(localName(e.term.name));
  if (e.market) parts.push(t('calendar.market'));
  return parts.join(t('calendar.joiner'));
}

/** 早上 6 点抽今天的天气 */
export function rollWeather(month: number, day: number, rand = Math.random): Weather {
  if (day === 1) return TIME.weather.firstDayOfMonth;
  const chances = TIME.weather.chances[seasonOf(month).id];
  let r = rand();
  for (const [w, p] of Object.entries(chances) as [Weather, number][]) {
    if (r < p) return w;
    r -= p;
  }
  return 'sunny';
}

/** 天气的名字：晴 / 阴 / 雨 / 雪 */
export function weatherName(w: string) {
  return t(`weather.${w}`);
}
