/**
 * 本周统计：每周日晚上的「本周总结」用（显示哪几项在 src/data/weekSummary.ts）。
 * 一周 = 周一早上到周日晚上。数字存在 gameState.week 里，跟着存档走，周中存档读档后接着累计。
 * 游戏里发生这些事的地方会调用下面的函数记一笔：
 *   赚钱 earn、花钱 spend、收菜 noteHarvest、开垦 noteTilled、清废墟 noteRuin、
 *   修房 noteHouse、认识新镇民 noteMet、新线索 noteClue。
 */
import { gameState } from './GameState';

export interface WeekStats {
  /** 收入、支出（文） */
  income: number;
  spend: number;
  /** 收了哪些作物各几个（物品 id → 数量） */
  harvest: Record<string, number>;
  /** 新开垦了几格田 */
  tilled: number;
  /** 清了几格废墟 */
  ruins: number;
  /** 这周修好的老宅阶段（阶段号，见 src/data/housing.ts） */
  house: number[];
  /** 这周新认识的人（names 里的 id） */
  met: string[];
  /** 这周新记下的线索有几条 */
  clues: number;
}

export function emptyWeek(): WeekStats {
  return { income: 0, spend: 0, harvest: {}, tilled: 0, ruins: 0, house: [], met: [], clues: 0 };
}

/** 赚了钱：加到身上，也记进本周收入 */
export function earn(n: number) {
  if (n <= 0) return;
  gameState.cash += n;
  gameState.week.income += n;
}

/** 花了钱：从身上扣，也记进本周支出 */
export function spend(n: number) {
  if (n <= 0) return;
  gameState.cash -= n;
  gameState.week.spend += n;
}

export function noteHarvest(item: string, n: number) {
  gameState.week.harvest[item] = (gameState.week.harvest[item] ?? 0) + n;
}

export function noteTilled() {
  gameState.week.tilled += 1;
}

export function noteRuin() {
  gameState.week.ruins += 1;
}

export function noteHouse(stage: number) {
  gameState.week.house.push(stage);
}

export function noteClue() {
  gameState.week.clues += 1;
}

/** 和某人说上话了：第一次说话就算认识（主角自己不算） */
export function noteMet(who: string) {
  if (!who || who === 'player' || gameState.metNpcs.includes(who)) return;
  gameState.metNpcs.push(who);
  gameState.week.met.push(who);
}
