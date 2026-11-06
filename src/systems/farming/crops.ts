/**
 * 种菜的规则（数值都在 src/data/crops.ts 和 src/data/time.ts 的 calendar.farmingRules）：
 *  - 只能在作物的播种节气里种（sowWindows，含结束节气整整 14 天）；
 *  - 浇过水的那一夜长一天；
 *  - 霜降当天，不耐寒的作物枯死，多年生的（韭菜）休眠；休眠的到立春自动接着长；
 *  - 小寒到立春前一天是冻土期：所有作物停止生长，但不枯死。
 * 这里只管「数」，画在地图上由农场场景负责。
 */
import { CROPS } from '../../data/crops';
import { TIME } from '../../data/time';
import type { Crop, CropId, SolarTermId } from '../../data/types';
import type { Clock } from '../Clock';
import { gameState } from '../GameState';

/** 地里一格作物现在的样子（存进存档） */
export interface PlantedCrop {
  crop: CropId;
  /** 已经长了几天 */
  days: number;
  /** 枯死了 */
  dead?: boolean;
  /** 在休眠（多年生作物过冬） */
  dormant?: boolean;
}

/** 作物图（crop_xxx）一共 5 格：种子、幼苗、半大、成熟、枯萎 */
export type CropLook = 'seed' | 'sprout' | 'half' | 'ripe' | 'withered';
export const CROP_LOOKS: CropLook[] = ['seed', 'sprout', 'half', 'ripe', 'withered'];

const TERMS = TIME.calendar.solarTerms.map((t) => t.id);
const termIndex = (id: SolarTermId) => TERMS.indexOf(id);

export function cropInfo(id: CropId): Crop {
  return CROPS.crops.find((c) => c.id === id)!;
}

/** 这个种子种下去长成什么（不是种子就是 undefined） */
export function cropFromSeed(itemId: string): Crop | undefined {
  return CROPS.crops.find((c) => c.seedItem === itemId);
}

/** 现在能不能种这种作物（看当前节气在不在它的播种时节里） */
export function inSowWindow(crop: Crop, clock: Clock) {
  const now = termIndex(clock.solarTerm.id);
  return crop.sowWindows.some(([from, to]) => now >= termIndex(from) && now <= termIndex(to));
}

/** 冻土期：从 frozenGround.from 节气到 until 节气的前一天 */
export function isFrozen(clock: Clock) {
  const { from, until } = TIME.calendar.farmingRules.frozenGround;
  const now = termIndex(clock.solarTerm.id);
  const a = termIndex(from);
  const b = termIndex(until);
  // 跨年（比如小寒 → 立春）：now 在 a 之后，或者在 b 之前
  return a <= b ? now >= a && now < b : now >= a || now < b;
}

/** 今天是不是某个节气的第一天 */
function isTermStart(clock: Clock, id: SolarTermId) {
  const t = TIME.calendar.solarTerms.find((s) => s.id === id)!;
  return clock.month === t.month && clock.day === t.day;
}

/** 这一格现在该画成哪一格图 */
export function cropLook(p: PlantedCrop): CropLook {
  if (p.dead) return 'withered';
  const grow = cropInfo(p.crop).growDays;
  if (p.days >= grow) return 'ripe';
  if (p.days === 0) return 'seed';
  return p.days * 2 < grow ? 'sprout' : 'half';
}

export function isRipe(p: PlantedCrop) {
  return !p.dead && !p.dormant && p.days >= cropInfo(p.crop).growDays;
}

/** 种下一颗种子 */
export function plant(key: string, crop: Crop) {
  gameState.crops[key] = { crop: crop.id, days: 0 };
}

/**
 * 收获：返回收到的东西。能重收的作物退回到「再长 regrowDays 天就熟」，否则这一格空出来。
 */
export function harvest(key: string): { item: string; amount: number } | null {
  const p = gameState.crops[key];
  if (!p || !isRipe(p)) return null;
  const crop = cropInfo(p.crop);
  let amount = crop.yield;
  if (crop.extraYield && Math.random() < crop.extraYield.chance) amount += crop.extraYield.amount;
  if (crop.regrowDays) p.days = crop.growDays - crop.regrowDays;
  else delete gameState.crops[key];
  return { item: crop.harvestItem, amount };
}

/**
 * 过了一夜（clock 已经是新的一天）：浇过水的长一天，然后按节气处理霜冻、冻土、休眠。
 * watered(key) 告诉我们这一格昨晚有没有浇水。返回发生了什么（给界面显示一句话）。
 */
export function growOvernight(clock: Clock, watered: (key: string) => boolean) {
  const rules = TIME.calendar.farmingRules;
  const frozen = isFrozen(clock);
  const frostDay = rules.frost.killsNonHardy && isTermStart(clock, rules.frost.term);
  // 多年生作物醒过来：过了冻土期、还没到霜降
  const wakeUp = !frozen && termIndex(clock.solarTerm.id) < termIndex(rules.frost.term);
  const report = { frostKilled: 0, dormant: 0, woke: 0 };
  for (const [key, p] of Object.entries(gameState.crops)) {
    if (p.dead) continue;
    const crop = cropInfo(p.crop);
    if (p.dormant && wakeUp) {
      p.dormant = false;
      report.woke += 1;
    }
    if (!p.dormant && !frozen && (watered(key) || !CROPS.rules.needsWaterToGrow)) p.days += 1;
    if (frostDay && !crop.frostHardy) {
      if (crop.perennial) {
        if (!p.dormant) report.dormant += 1;
        p.dormant = true;
      } else {
        p.dead = true;
        report.frostKilled += 1;
      }
    }
  }
  return report;
}
