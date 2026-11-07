/**
 * 存档的格式，以及「旧存档自动升级」。
 * ================================================================
 *  存档是一个带版本号（saveVersion）的 JSON。以后游戏加了新东西（比如作物、NPC），
 *  就把 SAVE_VERSION 加 1，并在下面 MIGRATIONS 里写一步「从旧版本怎么变成新版本」。
 *  读档时会一步一步升级，所以很早以前的存档也能继续玩。
 */

import { FARM_MAP, RUIN_TILES } from '../../world/farmMap';
import type { PlantedCrop } from '../farming/crops';
import { slotsFromOld, type Slot } from '../inventory';
import { emptyWeek, type WeekStats } from '../weekStats';
import type { Weather } from '../../data/types';

export const SAVE_VERSION = 9;

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
  /** 草棚（柴房）箱子里的东西 */
  storage: Record<string, number>;
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
  prologue: 'opening' | 'clinic' | 'tutorial' | 'done';
}

/**
 * 升级步骤：MIGRATIONS[n] 把版本 n 的存档变成版本 n+1。
 * 例子（以后加了「天气」字段时）：
 *   1: (old) => ({ ...old, weather: 'sunny', saveVersion: 2 }),
 */
const MIGRATIONS: Record<number, (old: any) => any> = {
  // 1 → 2：画面从 32 像素一格改成 16 像素一格（美术规范），主角位置改成按脚底算；草棚门口加了一盏灯笼
  1: (old) => {
    const cx = Math.floor(old.player.x / 32);
    const cy = Math.floor((old.player.y + 9.6) / 32);
    const farm: string[] = [...old.farm];
    if (farm[4]?.[3] === '.') farm[4] = farm[4].slice(0, 3) + 'L' + farm[4].slice(4);
    return { ...old, saveVersion: 2, farm, player: { ...old.player, x: cx * 16 + 8, y: cy * 16 + 12 } };
  },
  // 2 → 3：日历从「4 季 × 28 天」改成「12 个月 × 28 天」，开局从正月十六算。
  // 旧存档里过了几天，换到新日历上也过几天（旧的春季第 1 天 = 新的正月十六）。
  2: (old) => {
    const passed = (old.clock.seasonIndex ?? 0) * 28 + (old.clock.day ?? 1) - 1;
    const total = 15 + passed; // 正月十六 = 从正月初一起第 15 天
    const month = (Math.floor(total / 28) % 12) + 1;
    const day = (total % 28) + 1;
    return { ...old, saveVersion: 3, clock: { month, day, minutes: old.clock.minutes } };
  },
  // 3 → 4：加了名字、章节、笔记本。旧存档当作已经看完序章，送笔记本；名字留空，读档时让玩家补填
  3: (old) => ({
    ...old,
    saveVersion: 4,
    playerName: '',
    chapter: 0,
    prologue: 'done',
    inventory: { ...old.inventory, notebook: 1 },
    notebook: { controls: ['move', 'tools', 'interact', 'save', 'menu'], learned: [] },
  }),
  // 4 → 5：重建老宅、种菜、收货服务。
  // 旧的住所等级换成修房阶段（草棚 = 废墟还没清）；地图上补上老宅废墟；开局物资当作已经给过。
  4: (old) => {
    const stage = ({ straw_hut: 0, thatched_cottage: 2, tiled_house: 3, courtyard: 4 } as Record<string, number>)[old.house] ?? 0;
    const farm: string[] = old.farm.map((row: string, y: number) =>
      [...row].map((ch, x) => (FARM_MAP[y]?.[x] === 'R' ? (stage === 0 ? 'R' : '_') : ch)).join(''),
    );
    const ruins = FARM_MAP.join('').split('R').length - 1;
    const { house: _house, ...rest } = old;
    return {
      ...rest,
      saveVersion: 5,
      farm,
      houseStage: stage,
      ruinsCleared: stage >= 1 ? ruins : 0,
      build: null,
      // 已经修好的阶段，日记碎片当作捡到了（还是烧焦的纸片，等章节开始再变成线索）
      diaryFound: stage >= 1 ? [1, 2, 3, 4].filter((n) => n <= stage) : [],
      inventory: stage >= 1 ? { ...old.inventory, burnt_paper: (old.inventory.burnt_paper ?? 0) + stage } : old.inventory,
      pickup: { unlocked: false },
      basket: {},
      crops: {},
      flags: { ...old.flags, startKitGiven: true },
    };
  },
  // 5 → 6：好感度改成按点数记（100 点 1 颗心），以前存的「几颗心」乘 100；
  // 草棚修完第 2 阶段后改成柴房；加了草棚里的箱子
  5: (old) => ({
    ...old,
    saveVersion: 6,
    npcs: { ...old.npcs, affection: Object.fromEntries(Object.entries(old.npcs.affection as Record<string, number>).map(([k, v]) => [k, v * 100])) },
    hutIsShed: old.houseStage >= 2,
    storage: {},
  }),
  // 6 → 7：宅基地上立起了整栋烧毁的老宅（Q），四周的废墟（R）换了位置；田的篱笆开了两个 2 格宽的门（G）。
  // 已经清掉的废墟还算清掉；变成挡路格子的地方，种的东西去掉；清了几格按地图重新数。
  6: (old) => {
    const stage: number = old.houseStage ?? 0;
    const crops = { ...(old.crops ?? {}) };
    const farm: string[] = old.farm.map((row: string, y: number) =>
      [...row]
        .map((ch, x) => {
          const want = FARM_MAP[y]?.[x];
          let out = ch;
          if (want === 'G') out = 'G';
          else if (want === 'Q') out = stage >= 2 ? 'K' : 'Q';
          else if (want === 'R') {
            if (stage >= 1) out = ch === 'E' ? 'E' : '_';
            else out = ch === '_' ? '_' : 'R';
          }
          if (out !== ch && (out === 'Q' || out === 'R' || out === 'K')) delete crops[`${x},${y}`];
          return out;
        })
        .join(''),
    );
    const left = farm.join('').split('R').length - 1;
    return { ...old, saveVersion: 7, farm, crops, ruinsCleared: stage >= 1 ? RUIN_TILES : RUIN_TILES - left };
  },
  // 7 → 8：背包从「物品 → 数量」改成工具栏 9 格 + 背包 27 格。
  // 原来的工具按原顺序先放，其他东西按物品表顺序放，工具栏满了再放背包；手上拿的工具还拿着。
  7: (old) => {
    const { tools = [], toolIndex = 0, inventory = {}, ...rest } = old;
    const { slots, keyItems } = slotsFromOld(inventory, tools);
    const held = tools[toolIndex];
    const selected = Math.max(0, slots.slice(0, 9).findIndex((s) => s?.id === held));
    return { ...rest, saveVersion: 8, slots, selected, keyItems };
  },
  // 8 → 9：吃东西、天气、每周总结。旧存档当作今天吃过了、今天是晴天、这周从零记起；
  // 看完序章的当作已经认识大夫、老范和周里正（医馆里说过话）
  8: (old) => ({
    ...old,
    saveVersion: 9,
    ateToday: true,
    weather: 'sunny',
    week: emptyWeek(),
    metNpcs: old.prologue === 'done' || old.prologue === 'tutorial' ? ['doctor', 'fan', 'zhou'] : [],
  }),
};

/** 把任意版本的存档升级到最新。认不出来的返回 null。 */
export function migrate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  let data = raw as any;
  if (typeof data.saveVersion !== 'number' || !data.clock || !data.farm) return null;
  if (data.saveVersion > SAVE_VERSION) return null; // 比游戏还新的存档，读不了
  while (data.saveVersion < SAVE_VERSION) {
    const step = MIGRATIONS[data.saveVersion];
    if (!step) return null;
    data = step(data);
  }
  return data as SaveData;
}
