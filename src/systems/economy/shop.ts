/**
 * 买卖价格（数值在 src/data/items.ts 和 src/data/time.ts 的 calendar）：
 *  - 只能在镇上的店里买卖；赶集日（每月 4、11、18、25 日）镇上所有买卖价格都涨 marketPriceBonus（现在是 10%）。
 *  - 家门口的收货筐按杂货铺的收购价算，没有赶集涨价。
 * 镇上的商店界面还没做，做的时候用这里的函数算价钱。
 */
import { ITEMS } from '../../data/items';
import { TIME } from '../../data/time';
import type { Clock } from '../Clock';

function item(id: string) {
  return ITEMS.items.find((it) => it.id === id);
}

/** 今天镇上的价格要乘多少（赶集日 1.1，平时 1） */
export function marketMultiplier(clock: Clock) {
  return clock.isMarketDay ? 1 + TIME.calendar.marketPriceBonus : 1;
}

/** 在镇上买一个要多少文（买不到返回 null） */
export function shopBuyPrice(id: string, clock: Clock): number | null {
  const base = item(id)?.buyPrice;
  return base == null ? null : Math.round(base * marketMultiplier(clock));
}

/** 在镇上卖一个能得多少文（卖不掉返回 null） */
export function shopSellPrice(id: string, clock: Clock): number | null {
  const base = item(id)?.sellPrice;
  return base == null ? null : Math.round(base * marketMultiplier(clock));
}

/** 只在赶集日才有得卖的种子：今天店里有没有 */
export function seedAvailableToday(id: string, clock: Clock) {
  return !TIME.calendar.marketOnlySeeds.includes(id as never) || clock.isMarketDay;
}

/** 收货筐按什么价收（杂货铺收购价，不涨价） */
export function basketPrice(id: string): number | null {
  return item(id)?.sellPrice ?? null;
}
