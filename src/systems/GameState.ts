/**
 * 全局游戏状态：现在只放了时钟和钱。
 * 以后的存档（背包、田地、好感度）也会放在这里，存成带版本号的 JSON。
 */
import startData from '../data/start.json';
import type { Clock } from './Clock';

export const gameState = {
  clock: null as Clock | null,
  /** 身上的钱（单位：文）。开局数值在 src/data/start.json 的 cash */
  cash: startData.cash,
  /** 界面正忙（比如对话框开着），这时主角不能走、时间暂停 */
  uiBusy: false,
};
