/**
 * 把本周统计（src/systems/weekStats.ts）写成「本周总结」画面上的一句句话。
 * 显示哪几项、顺序在 src/data/weekSummary.ts；每句话的写法在 src/locales/zh.ts 的 weekSummary。
 */
import { WEEK_SUMMARY_ITEMS } from '../data/weekSummary';
import { TIME } from '../data/time';
import { localName, t } from '../locales/i18n';
import { stageInfo } from './home/house';
import { itemName } from './inventory';
import { dayEvents, dayName, monthName, weekdayName } from './days';
import type { WeekStats } from './weekStats';

export interface WeekSummary {
  title: string;
  subtitle: string;
  /** 这周做了什么（空的话显示「这一周过得很安静。」） */
  lines: string[];
  /** 下周提要（没有这一项是 null） */
  next: { title: string; lines: string[] } | null;
}

/**
 * week = 刚过完的这一周的统计；month/day = 这一周最后一天（周日）；
 * nextMonth/nextDay = 下周一。
 */
export function buildWeekSummary(week: WeekStats, month: number, day: number, nextMonth: number, nextDay: number): WeekSummary {
  const lines: string[] = [];
  let next: WeekSummary['next'] = null;
  for (const item of WEEK_SUMMARY_ITEMS) {
    if (item === 'money' && (week.income || week.spend)) {
      const net = week.income - week.spend;
      lines.push(t(net >= 0 ? 'weekSummary.money' : 'weekSummary.moneyLoss', { income: week.income, spend: week.spend, net: Math.abs(net) }));
    }
    if (item === 'harvest') {
      const entries = Object.entries(week.harvest).filter(([, n]) => n > 0);
      if (entries.length) {
        const total = entries.reduce((a, [, n]) => a + n, 0);
        const [id, most] = entries.sort((a, b) => b[1] - a[1])[0];
        lines.push(t('weekSummary.harvest', { n: total, name: itemName(id), most }));
      }
    }
    if (item === 'land') {
      if (week.tilled) lines.push(t('weekSummary.tilled', { n: week.tilled }));
      if (week.ruins) lines.push(t('weekSummary.ruins', { n: week.ruins }));
    }
    if (item === 'house') {
      for (const stage of week.house) lines.push(t('weekSummary.house', { name: localName(stageInfo(stage)?.name) }));
    }
    if (item === 'people' && week.met.length) lines.push(t('weekSummary.people', { n: week.met.length }));
    if (item === 'clues' && week.clues) lines.push(t('weekSummary.clues', { n: week.clues }));
    if (item === 'nextWeek') next = { title: t('weekSummary.nextWeek'), lines: nextWeekLines(nextMonth, nextDay) };
  }
  const weekNo = Math.floor((day - 1) / TIME.calendar.daysPerWeek);
  return {
    title: t('weekSummary.title'),
    subtitle: t('weekSummary.subtitle', { month: monthName(month), week: t('weekSummary.weekNames').split(',')[weekNo] ?? weekNo + 1 }),
    lines,
    next,
  };
}

/** 下周七天里的节气、节日（一行一样），最后一行是赶集日 */
function nextWeekLines(month: number, first: number): string[] {
  const out: string[] = [];
  const markets: string[] = [];
  const n = TIME.calendar.daysPerWeek;
  for (let d = first; d < first + n && d <= TIME.calendar.daysPerMonth; d++) {
    const e = dayEvents(month, d);
    const what = [e.festival && localName(e.festival.name), e.term && localName(e.term.name)].filter(Boolean).join(t('calendar.joiner'));
    if (what) out.push(t('weekSummary.nextItem', { date: monthName(month) + dayName(d), weekday: weekdayName(d), what }));
    if (e.market) markets.push(`${dayName(d)}（${weekdayName(d)}）`);
  }
  if (!out.length) out.push(t('weekSummary.nextNothing'));
  if (markets.length) out.push(t('weekSummary.nextMarket', { days: markets.join('、') }));
  return out;
}
