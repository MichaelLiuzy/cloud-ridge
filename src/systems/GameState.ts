/**
 * 全局游戏状态：时钟、钱、体力、手上拿的工具。
 * 以后的存档（背包、田地、好感度）也会放在这里，存成带版本号的 JSON。
 * 开局数值来自 src/data/start.json，体力上限来自 src/data/housing.json。
 */
import startData from '../data/start.json';
import itemsData from '../data/items.json';
import housingData from '../data/housing.json';
import type { Clock } from './Clock';

/** 开局背包里的工具（按 start.json 里写的顺序排进工具栏） */
const startTools = Object.keys(startData.inventory).filter(
  (id) => itemsData.items.find((it) => it.id === id)?.type === 'tool',
);

const house = housingData.levels.find((h) => h.id === startData.house)!;

export const gameState = {
  clock: null as Clock | null,
  /** 身上的钱（单位：文） */
  cash: startData.cash,
  /** 现在住的房子（决定体力上限） */
  house: startData.house,
  maxStamina: house.maxStamina,
  stamina: house.maxStamina,
  /** 工具栏里的工具（物品 id），以及现在拿着第几个 */
  tools: startTools,
  toolIndex: 0,
  /** 界面正忙（对话框或小菜单开着），这时主角不能走、时间暂停 */
  uiBusy: false,
};

/** 有没有这个工具 */
export function hasTool(id: string) {
  return gameState.tools.includes(id);
}

/** 现在手上的工具 id */
export function currentTool() {
  return gameState.tools[gameState.toolIndex];
}
