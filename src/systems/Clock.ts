/**
 * 游戏时钟：管「现在是几月几日、几点」。一年 12 个月，每月 28 天（见 src/data/time.ts 的 calendar）。
 * 所有数值来自 src/data/time.ts（比如现实多少秒 = 游戏一小时）。
 * 想让一天过得快一点或慢一点，改 time.ts 里的 realSecondsPerGameHour。
 */
import { TIME as timeData } from '../data/time';
import { START as startData } from '../data/start';
import { localName, t } from '../locales/i18n';

export class Clock {
  /** 几月：1 = 正月 …… 12 = 腊月 */
  month = startData.startDay.month;
  /** 几日：1 ~ 28 */
  day = startData.startDay.day;
  /** 从当天 0 点算起的分钟数。6:00 = 360。凌晨 2 点记作 26:00 = 1560。 */
  minutes = timeData.clock.dayStartHour * 60;

  private carryMs = 0;
  /** 时间是否暂停（比如正在看对话时） */
  paused = false;

  /** 到点昏迷时会调用这个（由场景设置） */
  onLateNight?: () => void;

  /** 每帧调用。delta 是这一帧过去了多少毫秒（现实时间）。 */
  update(deltaMs: number) {
    if (this.paused) return;
    const { realSecondsPerGameHour, tickMinutes, dayEndHour } = timeData.clock;
    // 现实多少毫秒 = 游戏 tickMinutes 分钟
    const msPerTick = (realSecondsPerGameHour * 1000 * tickMinutes) / 60;
    this.carryMs += deltaMs;
    while (this.carryMs >= msPerTick) {
      this.carryMs -= msPerTick;
      this.minutes += tickMinutes;
      if (this.minutes >= dayEndHour * 60) {
        this.onLateNight?.();
        return;
      }
    }
  }

  /** 进入新的一天（睡觉或昏迷之后） */
  nextDay() {
    this.day += 1;
    const cal = timeData.calendar;
    if (this.day > cal.daysPerMonth) {
      this.day = 1;
      this.month = (this.month % cal.months.length) + 1;
    }
    this.minutes = timeData.clock.dayStartHour * 60;
    this.carryMs = 0;
  }

  get hour() {
    return Math.floor(this.minutes / 60) % 24;
  }

  /** 当前的时辰名（子时、丑时……） */
  get shichen() {
    // 时辰表按开始的钟点排列；23 点以后、1 点以前是子时
    const h = this.hour;
    const list = timeData.shichenDisplay;
    let name = list[0].name;
    for (const s of list) {
      if (s.from <= h && s.from !== 23) name = s.name;
    }
    if (h >= 23 || h < 1) name = list[0].name;
    return name;
  }

  /** 现在是哪个季节（春 1–3 月、夏 4–6 月……） */
  get season() {
    const list = timeData.calendar.seasons;
    return list.find((s) => s.months.includes(this.month)) ?? list[0];
  }

  /** 现在在哪个节气里（每个节气从当天算到下一个节气的前一天） */
  get solarTerm() {
    const terms = timeData.calendar.solarTerms;
    const today = this.month * 100 + this.day;
    let current = terms[terms.length - 1]; // 正月十日立春之前，还在上一年的大寒里
    for (const term of terms) if (term.month * 100 + term.day <= today) current = term;
    return current;
  }

  /** 今天是不是赶集日 */
  get isMarketDay() {
    return timeData.calendar.marketDays.includes(this.day);
  }

  /** 今天的节日（没有就是 undefined） */
  get festival() {
    return timeData.calendar.festivals.find((f) => f.month === this.month && f.day === this.day);
  }

  /** 屏幕上显示的日期：「正月十六 · 立春」 */
  dateText() {
    const month = timeData.calendar.months[this.month - 1];
    const days = t('calendar.dayNames').split(',');
    return t('hud.date', { month: localName(month.name), day: days[this.day - 1] ?? String(this.day), term: localName(this.solarTerm.name) });
  }

  /** 左上角时辰框用的短日期：「正月十六」 */
  shortDateText() {
    const month = timeData.calendar.months[this.month - 1];
    const days = t('calendar.dayNames').split(',');
    return t('hud.shortDate', { month: localName(month.name), day: days[this.day - 1] ?? String(this.day) });
  }

  /** 左上角的钟点：「6:00 am」。只显示整点（每小时才跳一次，不用每十分钟一跳那么紧张） */
  clockText() {
    const h = this.hour;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return t('hud.clock', { hour: h12, ampm: t(h < 12 ? 'hud.am' : 'hud.pm') });
  }

  /** 屏幕上显示的时间：「辰时（7:00）」 */
  timeText() {
    const minute = String(this.minutes % 60).padStart(2, '0');
    return t('hud.time', { shichen: this.shichen, hour: this.hour, minute });
  }
}

/** 不用开游戏，直接把存档里的时间变成「正月十八」「午时（11:20）」这样的字 */
export function describeClock(c: { month: number; day: number; minutes: number }) {
  const clock = new Clock();
  Object.assign(clock, c);
  return { date: clock.dateText(), time: clock.timeText() };
}
