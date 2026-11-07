/**
 * 开局：钱、背包、农场大小、初始好感
 * ================================================================
 *  数值来自设计主管窗口（daily-systems）。可以直接改数字，保存后刷新游戏就生效。
 *  只改冒号右边的值。
 *  常改的：开局的钱（cash）、背包里带什么（inventory）、开局好感度。
 *  每个字段第一次出现时后面有中文说明；完整格式见 types.ts。
 *  改错了 npm run build 会报错，看报错信息或者告诉编程窗口。
 */

import type { StartTable } from './types';

export const START: StartTable = {
  schemaVersion: 2,  // 数据格式版本号（程序用，不用改）
  startDay: { month: 1, day: 16 },  // 开局日期：正月十六（month 1 = 正月）
  // 下面的钱和背包不是一开局就有：序章里周里正教完操作后交给玩家（剧本 src/story/zh/prologue.ink 的 #give_start）
  cash: 500,  // 开局的钱（火灾抚恤，单位：文）
  // 开局背包：物品 → 数量
  inventory: {
    bok_choy_seed: 15,
    radish_seed: 5,
    mantou: 5,
    hoe: 1,
    bucket: 1,
    sickle: 1,
    axe: 1,
    pickaxe: 1,
  },
  // 农场
  farm: {
    width: 15,  // 宽几格
    height: 12,  // 高几格
    preTilledTiles: 6,  // 开局已经开垦好的格数
    debris: ["weed", "rock", "stump", "fire_debris"],  // 地里会有的杂物
  },
  // 好感度变化
  affection: {
    clinic_doctor: 0,
    village_head: 0,
    store_keeper: 0,
    teahouse_keeper: 0,
    restaurant_owner: 0,
    dock_manager: 0,
    tutor: 0,
    carpenter: 0,
    blacksmith: 0,
    night_watchman: 0,
  },
};
