/**
 * 存档的格式，以及「旧存档自动升级」。
 * ================================================================
 *  存档是一个带版本号（saveVersion）的 JSON。改了存档里存的东西，就把 SAVE_VERSION 加 1。
 *  原型期不写升级步骤，旧版本的存档直接读不了（见下面 MIGRATIONS）。
 */

import type { MailEntry } from '../mail';
import type { PlantedCrop } from '../farming/crops';
import type { Slot } from '../inventory';
import type { WeekStats } from '../weekStats';
import type { Weather } from '../../data/types';
import type { PrologueStep } from '../GameState';

export const SAVE_VERSION = 15;

/** 存档里存了什么 */
export interface SaveData {
  saveVersion: number;
  /** 什么时候存的（现实时间） */
  savedAt: string;
  /** 存在第几个存档位（1~3） */
  slot: number;
  /** 游戏里的时间 */
  /** month：1 = 正月 …… 12 = 腊月；day：1 ~ 28 */
  clock: { month: number; day: number; minutes: number };
  /** 主角站在哪、朝哪 */
  player: { x: number; y: number; facing: string };
  cash: number;
  stamina: number;
  maxStamina: number;
  /** 今天吃过东西没有（一整天没吃，第二天体力最多 80） */
  ateToday: boolean;
  /** 今天的天气：sunny 晴 / cloudy 阴 / rain 雨 / snow 雪 */
  weather: Weather;
  /** 本周统计（每周总结用） */
  week: WeekStats;
  /** 认识了哪些人 */
  metNpcs: string[];
  /** 水桶里还有多少水 */
  water: number;
  /** 玩家自己种的树（「x,y」） */
  plantedTrees: string[];
  /** 背包满了掉在地上的东西：「x,y」→ { 物品 id: 数量 } */
  drops: Record<string, Record<string, number>>;
  /** 田里的杂物上次是哪天重新摆的（「月-日」） */
  debrisDay: string;
  /** 信箱里的信（哪封、哪天到、读过没有、还没收下的附件） */
  mail: MailEntry[];
  /** 已经寄出过的信 id */
  mailSent: string[];
  /** 门口灯笼灭了没有 */
  lanternOff: boolean;
  /** 重建老宅到第几阶段（0 = 住草棚、废墟没清完；1 = 废墟清完；2~4 = 木匠修好的阶段） */
  houseStage: number;
  /** 废墟清了几格 */
  ruinsCleared: number;
  /** 木匠正在修第几阶段、还剩几天（没在修是 null） */
  build: { stage: number; daysLeft: number } | null;
  /** 找到了哪几片日记（按修房阶段记） */
  diaryFound: number[];
  /** 杂货铺上门收货开通了没有 */
  pickup: { unlocked: boolean };
  /** 草棚是不是已经改成柴房了 */
  hutIsShed: boolean;
  /** 草棚（柴房）箱子里的东西：一格一格的，和背包一样（每格放了什么、几个、上锁没有） */
  storage: (Slot | null)[];
  /** 收货筐里放的东西 */
  basket: Record<string, number>;
  /** 地里种的东西：「x,y」→ 作物 */
  crops: Record<string, PlantedCrop>;
  /** 工具栏 9 格 + 背包 27 格：每格放了什么、几个、上锁没有（空格是 null） */
  slots: (Slot | null)[];
  /** 手上拿的是工具栏第几格（0 ~ 8） */
  selected: number;
  /** 重要物品（笔记本、烧焦的纸）：不占格子 */
  keyItems: Record<string, number>;
  /** 农场地图（每行一串字符，含开垦、浇水情况），见 src/world/farmMap.ts */
  farm: string[];
  /** 镇上的人：好感度、位置和状态（位置等有小镇地图后再加） */
  npcs: { affection: Record<string, number> };
  /** 任务进度：任务 id → 状态（打工系统做好后会用） */
  quests: Record<string, string>;
  /** 找到的线索 id（主线做好后会用） */
  clues: string[];
  /** 剧情进度标记（以后剧情窗口会用）。发生过的剧情事件记成 event:事件id */
  flags: Record<string, boolean | number | string>;
  /** 玩家起的名字（空 = 还没起） */
  playerName: string;
  /** 现在是第几章（0 = 序章） */
  chapter: number;
  /** 笔记本「操作」「已学会」两栏的条目 */
  notebook: { controls: string[]; learned: string[] };
  /** 序章走到哪一步：opening / clinic / tutorial / done */
  prologue: PrologueStep;
}

/**
 * 原样存进存档、读档时原样拷回来的字段（名字在游戏状态和存档里一样）。
 * 新加一样要存档的东西：在 GameState.ts 的 freshState()、上面的 SaveData 和这里各加一处就行。
 * 不在这里的特殊字段：clock（时钟对象）、npcs.affection（状态里叫 affection）、saveVersion / savedAt / slot、farm / player。
 */
export const SAVED_KEYS = [
  'cash',
  'stamina',
  'maxStamina',
  'ateToday',
  'weather',
  'week',
  'metNpcs',
  'water',
  'plantedTrees',
  'drops',
  'debrisDay',
  'mail',
  'mailSent',
  'lanternOff',
  'houseStage',
  'ruinsCleared',
  'build',
  'diaryFound',
  'pickup',
  'basket',
  'hutIsShed',
  'storage',
  'crops',
  'slots',
  'selected',
  'keyItems',
  'flags',
  'quests',
  'clues',
  'playerName',
  'chapter',
  'notebook',
  'prologue',
] as const;
export type SavedKey = (typeof SAVED_KEYS)[number];

/**
 * 升级步骤：MIGRATIONS[n] 把版本 n 的存档变成版本 n+1。
 * 原型期的旧存档（第 15 版以前）已经不再支持（用户 2026-11-07 定），读不出来就当这个存档位是空的。
 * 以后正式给人玩了，再改存档格式时在这里加一步。
 */
const MIGRATIONS: Record<number, (old: any) => any> = {};

/** 把任意版本的存档升级到最新。认不出来的返回 null。 */
export function migrate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  let data = raw as any;
  if (typeof data.saveVersion !== 'number' || !data.clock || !data.farm) return null;
  if (data.saveVersion > SAVE_VERSION) return null; // 比游戏还新的存档，读不了（太旧的在下面找不到升级步骤，也读不了）
  while (data.saveVersion < SAVE_VERSION) {
    const step = MIGRATIONS[data.saveVersion];
    if (!step) return null;
    data = step(data);
  }
  return data as SaveData;
}
