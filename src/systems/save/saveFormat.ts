/**
 * 存档的格式，以及「旧存档自动升级」。
 * ================================================================
 *  存档是一个带版本号（saveVersion）的 JSON。以后游戏加了新东西（比如作物、NPC），
 *  就把 SAVE_VERSION 加 1，并在下面 MIGRATIONS 里写一步「从旧版本怎么变成新版本」。
 *  读档时会一步一步升级，所以很早以前的存档也能继续玩。
 */

export const SAVE_VERSION = 4;

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
  house: string;
  tools: string[];
  toolIndex: number;
  /** 背包：物品 id → 数量 */
  inventory: Record<string, number>;
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
