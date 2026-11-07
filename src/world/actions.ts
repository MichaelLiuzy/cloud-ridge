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
 *  - turnsInto 写的是地图字符：'.' 草地，'o' 开垦好的田，'O' 浇过水的田，'y' 树苗，'#' 栅栏，'=' 小路。
 *    老宅废墟里的东西清掉后一律变成地基 '_'。
 *  - drop：做完掉什么、掉几个 [最少, 最多]（概率见下面的 DROP_CHANCES）；extra = 另外有几成概率再掉一个什么。
 *    掉的东西直接进背包，背包满了就掉在地上，走过去就捡起来。
 *  - crop：这一格上的作物要是什么样子才算数。none = 没种东西，growing = 正在长，
 *    ripe = 熟了，dead = 枯死了。不写 = 只在没种东西时算。
 */
import type { StaminaAction } from '../data/types';


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
  cost: StaminaAction | 'none';
  /** 做完后显示的话（可选） */
  doneHint?: string;
  /** 掉什么材料 */
  drop?: { item: string; amount: [number, number]; extra?: { item: string; chance: number } };
}

/**
 * 掉落数量的概率：从最少到最多，每个数各占几成。现在的数量都是 3 个连着的数（比如 1–3），
 * 所以是「最少 20%、中间 60%、最多 20%」。数字个数和这里对不上时，就每个数一样多。
 */
export const DROP_CHANCES = [0.2, 0.6, 0.2];

export const HELD_ACTIONS: HeldAction[] = [
  // 熟了的菜：拿着什么都直接收（点一下就走过去收）
  { id: 'harvest', anyItem: true, on: ['tilled', 'watered'], crop: ['ripe'], cost: 'harvest' },
  // 锄头点草地：开垦
  { id: 'till', item: 'hoe', on: ['grass', 'grassDark'], turnsInto: 'o', cost: 'hoe' },
  // 水桶点田（没种东西，或者菜正在长）：浇水（用水，见 time.ts 的 stamina.bucket）
  { id: 'water', item: 'bucket', on: ['tilled'], crop: ['none', 'growing'], turnsInto: 'O', cost: 'water' },
  // 水桶点池塘：打满水，不花体力
  { id: 'refill', item: 'bucket', on: ['water'], cost: 'none' },
  // 树种点空地：种下一棵树苗
  { id: 'plantTree', item: 'tree_seed', on: ['grass', 'grassDark'], turnsInto: 'y', cost: 'plant' },
  // 种子点锄过的地（浇没浇水都行）：播种
  { id: 'sow', itemType: 'seed', on: ['tilled', 'watered'], cost: 'plant' },
  // 镰刀点杂草：割掉，得纤维（物品 id 还叫 thatch）
  { id: 'cutGrass', item: 'sickle', on: ['weed'], turnsInto: '.', cost: 'cut_grass', drop: { item: 'thatch', amount: [1, 3] } },
  // 斧头点木头（树桩、火灾残骸）、树苗：砍掉，得木材
  { id: 'chop', item: 'axe', on: ['stump', 'fireDebris', 'sapling'], turnsInto: '.', cost: 'chop_wood', drop: { item: 'wood', amount: [2, 4] } },
  // 斧头点小树、大树：大树还有三成概率掉一颗树种
  { id: 'chop', item: 'axe', on: ['smallTree'], turnsInto: '.', cost: 'chop_small_tree', drop: { item: 'wood', amount: [4, 6] } },
  { id: 'chop', item: 'axe', on: ['bigTree'], turnsInto: '.', cost: 'chop_tree', drop: { item: 'wood', amount: [10, 12], extra: { item: 'tree_seed', chance: 0.3 } } },
  // 镐点石头：敲掉，得石块
  { id: 'mine', item: 'pickaxe', on: ['rock'], turnsInto: '.', cost: 'mine_rock', drop: { item: 'stone', amount: [3, 5] } },
  // 镐点田：填平成普通地；种着东西（没枯）先问一次，作物不退回（熟了的菜会先被上面第一条收走）
  { id: 'flatten', item: 'pickaxe', on: ['tilled', 'watered'], crop: ['none', 'growing', 'dead'], turnsInto: '.', cost: 'flatten' },
  // 镐点栅栏：拆下一节，进背包（栅栏门 G 不能拆）
  { id: 'removeFence', item: 'pickaxe', on: ['fence'], turnsInto: '.', cost: 'remove_fence', drop: { item: 'fence', amount: [1, 1] } },
  // 镐点小路：敲回普通土地，不掉东西（草棚、老宅门口那格不算小路）
  { id: 'unpave', item: 'pickaxe', on: ['path'], turnsInto: '.', cost: 'none' },
  // 拿着栅栏点空地：放下一节（不能放在自己脚下、宅基地和收货筐的位置，见 FarmScene 的 canBuildAt）
  { id: 'placeFence', item: 'fence', on: ['grass', 'grassDark'], turnsInto: '#', cost: 'none' },
  // 拿着「小路」点空地：铺成小路，用不完
  { id: 'pave', item: 'path', on: ['grass', 'grassDark'], turnsInto: '=', cost: 'none' },
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

/** 按 DROP_CHANCES 抽这次掉几个（[最少, 最多]） */
export function rollAmount([min, max]: [number, number], rand = Math.random) {
  const n = max - min + 1;
  const chances = DROP_CHANCES.length === n ? DROP_CHANCES : Array(n).fill(1 / n);
  let r = rand();
  for (let i = 0; i < n; i++) {
    if (r < chances[i]) return min + i;
    r -= chances[i];
  }
  return max;
}
