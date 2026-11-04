/**
 * 游戏时钟：管「现在是哪个季节、第几天、几点」。
 * 所有数值来自 src/data/time.ts（比如现实多少秒 = 游戏一小时）。
 * 想让一天过得快一点或慢一点，改 time.ts 里的 realSecondsPerGameHour。
 */
import { TIME as timeData } from '../data/time';
import { localName, t } from '../locales/i18n';

export class Clock {
  seasonIndex = 0;
  day = 1;
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
    if (this.day > timeData.calendar.daysPerSeason) {
      this.day = 1;
      this.seasonIndex = (this.seasonIndex + 1) % timeData.calendar.seasons.length;
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

  /** 屏幕上显示的日期：「春 · 第1天」 */
  dateText() {
    const season = timeData.calendar.seasons[this.seasonIndex];
    return t('hud.date', { season: localName(season.name), day: this.day });
  }

  /** 屏幕上显示的时间：「辰时（7:00）」 */
  timeText() {
    const minute = String(this.minutes % 60).padStart(2, '0');
    return t('hud.time', { shichen: this.shichen, hour: this.hour, minute });
  }
}

/** 不用开游戏，直接把存档里的时间变成「春 · 第3天」「午时（11:20）」这样的字 */
export function describeClock(c: { seasonIndex: number; day: number; minutes: number }) {
  const clock = new Clock();
  Object.assign(clock, c);
  return { date: clock.dateText(), time: clock.timeText() };
}
