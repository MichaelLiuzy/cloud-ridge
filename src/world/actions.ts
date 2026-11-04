/**
 * 地块能做的事 —— 「对着什么东西，能干什么」
 * ================================================================
 *  每一条规则：用什么工具、对哪种地块、做完变成什么、花多少体力。
 *  体力花多少来自 src/data/time.ts 的 stamina.costs（用 cost 字段对应）。
 *  菜单上显示的字在 src/locales/zh.ts 的 action 里。
 *
 *  地块种类（kind）见 src/world/farmMap.ts 的 TILE_TYPES。
 *  turnsInto 写的是地图字符：'.' 草地，'o' 开垦好的田，'O' 浇过水的田。
 */

export interface ToolAction {
  /** 动作名字，对应语言文件 action.xxx */
  id: string;
  /** 需要哪个工具（物品 id，见 src/data/items.ts） */
  tool: string;
  /** 对哪些地块有效 */
  on: string[];
  /** 做完后这一格变成什么（地图字符）。不写就是不变。 */
  turnsInto?: string;
  /** 体力消耗，对应 time.ts 里 stamina.costs 的名字 */
  cost: string;
  /** 做完后显示的话（可选） */
  doneHint?: string;
}

export const TOOL_ACTIONS: ToolAction[] = [
  { id: 'till', tool: 'hoe', on: ['grass', 'grassDark'], turnsInto: 'o', cost: 'hoe' },
  { id: 'water', tool: 'bucket', on: ['tilled'], turnsInto: 'O', cost: 'water' },
  { id: 'cutGrass', tool: 'sickle', on: ['weed'], turnsInto: '.', cost: 'cut_grass' },
  { id: 'chop', tool: 'axe', on: ['stump', 'fireDebris'], turnsInto: '.', cost: 'chop_tree' },
  { id: 'mine', tool: 'pickaxe', on: ['rock'], turnsInto: '.', cost: 'mine_rock' },
];

/**
 * 不用工具、直接能做的事（对着这种地块时菜单里会多一项）。
 * 床边菜单：睡觉（进入第二天并自动存档）/ 存档（不睡，白天也能存）。
 * 现在草棚就当床用，以后有室内地图了会改成对着床。
 */
export const PLAIN_ACTIONS: { id: string; on: string[] }[] = [
  { id: 'sleep', on: ['hut'] },
  { id: 'saveOnly', on: ['hut'] },
];
