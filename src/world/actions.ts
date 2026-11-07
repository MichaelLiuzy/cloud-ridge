/**
 * 拿着什么、对着什么，就做什么 —— 「顺手」规则表
 * ================================================================
 *  点一格（鼠标、手机轻点）、按空格、按手机「使用」键时，先看手上拿的东西：
 *  能对这一格起作用，就直接做，不弹菜单；没用的话再走「交互」（说话、打开箱子……）。
 *  回车永远是「交互」，空格永远是「用手上的东西」。
 *
 *  每一条规则：手上拿什么（item = 某一样东西，itemType = 某一类，比如所有种子；anyItem = 拿什么都行，空手也行）、
 *  对哪种地块（on）、这一格上有没有作物（crop）、做完变成什么、花多少体力。
 *  从上往下找，用第一条对得上的。
 *
 *  - 体力花多少来自 src/data/time.ts 的 stamina.costs（用 cost 字段对应）。
 *  - 动作的名字在 src/locales/zh.ts 的 action 里。
 *  - 地块种类（on）见 src/world/farmMap.ts 的 TILE_TYPES。
 *  - turnsInto 写的是地图字符：'.' 草地，'o' 开垦好的田，'O' 浇过水的田。
 *  - crop：这一格上的作物要是什么样子才算数。none = 没种东西，growing = 正在长，
 *    ripe = 熟了，dead = 枯死了。不写 = 只在没种东西时算。
 */

import { HOUSING } from '../data/housing';

export type CropState = 'none' | 'growing' | 'ripe' | 'dead';

export interface HeldAction {
  /** 动作名字，对应语言文件 action.xxx */
  id: string;
  /** 手上拿着哪样东西（物品 id，见 src/data/items.ts） */
  item?: string;
  /** 或者：手上拿着哪一类东西（seed 种子、food 食物……） */
  itemType?: string;
  /** 或者：拿什么都行（空手也行） */
  anyItem?: boolean;
  /** 对哪些地块有效 */
  on: string[];
  /** 这一格的作物要是什么样子（不写 = 只在没种东西时） */
  crop?: CropState[];
  /** 做完后这一格变成什么（地图字符）。不写就是不变。 */
  turnsInto?: string;
  /** 体力消耗，对应 time.ts 里 stamina.costs 的名字 */
  cost: string;
  /** 做完后显示的话（可选） */
  doneHint?: string;
}

export const HELD_ACTIONS: HeldAction[] = [
  // 熟了的菜：拿着什么都直接收（点一下就走过去收）
  { id: 'harvest', anyItem: true, on: ['tilled', 'watered'], crop: ['ripe'], cost: 'harvest' },
  // 锄头点草地：开垦
  { id: 'till', item: 'hoe', on: ['grass', 'grassDark'], turnsInto: 'o', cost: 'hoe' },
  // 水桶点田（没种东西，或者菜正在长）：浇水
  { id: 'water', item: 'bucket', on: ['tilled'], crop: ['none', 'growing'], turnsInto: 'O', cost: 'water' },
  // 种子点锄过的地（浇没浇水都行）：播种
  { id: 'sow', itemType: 'seed', on: ['tilled', 'watered'], cost: 'plant' },
  // 镰刀点杂草：割掉
  { id: 'cutGrass', item: 'sickle', on: ['weed'], turnsInto: '.', cost: 'cut_grass' },
  // 斧头点树桩、烧焦的木头：砍掉
  { id: 'chop', item: 'axe', on: ['stump', 'fireDebris'], turnsInto: '.', cost: 'chop_tree' },
  // 镐点石头：敲掉
  { id: 'mine', item: 'pickaxe', on: ['rock'], turnsInto: '.', cost: 'mine_rock' },
  // 清老宅废墟：能用哪些工具在 src/data/housing.ts 的 ruins.tools 里改
  ...HOUSING.ruins.tools.map((tool) => ({ id: 'clearRuin', item: tool, on: ['ruin'], turnsInto: '_', cost: 'clear_ruin' })),
];

/** 手上拿着 item（类型 type），对着 kind 地块、作物状态 crop：用哪条规则（没有返回 undefined） */
export function heldActionFor(item: string | undefined, type: string | undefined, kind: string, crop: CropState) {
  return HELD_ACTIONS.find(
    (a) => (a.anyItem || (!!item && (a.item ? a.item === item : a.itemType === type))) && a.on.includes(kind) && (a.crop ?? ['none']).includes(crop),
  );
}

/**
 * 不用工具、直接能做的事（对着这种地块时菜单里会多一项）。
 * 床边菜单：睡觉（进入第二天并自动存档）/ 存档（不睡，白天也能存）。
 * 现在草棚就当床用，以后有室内地图了会改成对着床。
 */
export const PLAIN_ACTIONS: { id: string; on: string[] }[] = [
  { id: 'sleep', on: ['hut', 'house'] },
  { id: 'saveOnly', on: ['hut', 'house'] },
];
