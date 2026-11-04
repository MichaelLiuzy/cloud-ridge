/**
 * 时间、体力、昏倒、天气
 * ================================================================
 *  数值来自设计主管窗口（daily-systems）。可以直接改数字，保存后刷新游戏就生效。
 *  只改冒号右边的值。
 *  常改的：一天过多快（clock.realSecondsPerGameHour）、几点醒几点昏倒、各动作花多少体力（stamina.costs）、天气概率。
 *  每个字段第一次出现时后面有中文说明；完整格式见 types.ts。
 *  改错了 npm run build 会报错，看报错信息或者告诉编程窗口。
 */

import type { TimeTable } from './types';

export const TIME: TimeTable = {
  schemaVersion: 1,  // 数据格式版本号（程序用，不用改）
  // 时钟
  clock: {
    dayStartHour: 6,  // 每天几点醒（6 = 早上 6 点）
    dayEndHour: 26,  // 几点强制昏倒（26 = 第二天凌晨 2 点）
    realSecondsPerGameHour: 45,  // 现实几秒 = 游戏一小时（改大，一天就过得慢）
    tickMinutes: 10,  // 时钟每次跳几分钟
    pauseDuringDialogue: true,  // 对话时时间是否暂停
  },
  // 时辰表：从几点开始算哪个时辰
  shichenDisplay: [
    { from: 23, name: "子时" },
    { from: 1, name: "丑时" },
    { from: 3, name: "寅时" },
    { from: 5, name: "卯时" },
    { from: 7, name: "辰时" },
    { from: 9, name: "巳时" },
    { from: 11, name: "午时" },
    { from: 13, name: "未时" },
    { from: 15, name: "申时" },
    { from: 17, name: "酉时" },
    { from: 19, name: "戌时" },
    { from: 21, name: "亥时" },
  ],
  // 日历
  calendar: {
    // 季节
    seasons: [
      {
        id: "spring",  // 程序用的英文名字，其他表靠它互相引用，不要改
        name: { zh: "春", en: "Spring" },  // 名字：zh 中文，en 英文（英文以后再填）
      },
      {
        id: "summer",
        name: { zh: "夏", en: "Summer" },
      },
      {
        id: "autumn",
        name: { zh: "秋", en: "Autumn" },
      },
      {
        id: "winter",
        name: { zh: "冬", en: "Winter" },
      },
    ],
    daysPerSeason: 28,  // 每季几天
    marketDays: [5, 12, 19, 26],  // 每季哪几天赶集
    marketSellBonus: 0.2,  // 赶集日卖东西多赚多少（0.2 = 多 20%）
  },
  // 店铺营业时间 [开门, 关门]（24 小时制）
  openingHours: {
    general_store: [9, 17],
    carpenter: [9, 17],
    blacksmith: [9, 17],
    kiln: [9, 17],
    teahouse: [10, 22],
    clinic: [8, 18],
  },
  // 体力
  stamina: {
    base: 100,  // 基础体力上限
    lowThreshold: 15,  // 体力低于多少算「很累」（走路变慢）
    lowSpeedMultiplier: 0.7,  // 很累时走路速度（0.7 = 原来的 70%）
    // 每个动作花多少体力
    costs: {
      hoe: 2,
      water: 1,
      plant: 0,
      harvest: 0,
      cut_grass: 1,
      chop_tree: 6,
      mine_rock: 4,
    },
    wateringCanCapacity: 20,  // 水桶装满能浇几格
  },
  sleep: { beforeMidnightRestore: 1.0, afterMidnightRestore: 0.9 },  // 睡觉
  // 昏倒
  faint: {
    // 熬到凌晨两点昏倒
    lateNight: {
      hour: 26,
      nextDayStamina: 0.7,  // 第二天体力剩多少（0.7 = 70%）
      fee: 0,  // 被送回去要付多少文
      wakeAt: "home",  // 在哪醒来
      event: "night_watchman_escort",  // 触发的剧情事件
    },
    // 体力用完昏倒
    exhausted: {
      nextDayStamina: 0.5,
      fee: 50,
      feeMaxFractionOfCash: 0.1,  // 最多收身上钱的几成（0.1 = 10%）
      wakeAt: "clinic",
    },
  },
  // 天气
  weather: {
    firstDayOfSeason: "sunny",  // 每季第一天的天气
    rainWatersCrops: true,  // 下雨是否自动浇水
    // 各季节天气概率（加起来是 1）
    chances: {
      spring: { sunny: 0.5, cloudy: 0.25, rain: 0.25, snow: 0 },
      summer: { sunny: 0.55, cloudy: 0.15, rain: 0.3, snow: 0 },
      autumn: { sunny: 0.6, cloudy: 0.25, rain: 0.15, snow: 0 },
      winter: { sunny: 0.45, cloudy: 0.3, rain: 0.05, snow: 0.2 },
    },
  },
};
