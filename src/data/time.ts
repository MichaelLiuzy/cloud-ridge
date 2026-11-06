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
  schemaVersion: 2,  // 数据格式版本号（程序用，不用改）
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
  // 日历：一年 12 个月，每月 28 天（4 周），24 节气，每月 2 个节日（11 月 5 日新版）
  calendar: {
    // 月份（按顺序，第 1 个是正月）
    months: [
      { id: "month_1", name: { zh: "正月", en: "First Month" } },  // 程序用的英文名字，其他表靠它互相引用，不要改
      { id: "month_2", name: { zh: "二月", en: "Second Month" } },
      { id: "month_3", name: { zh: "三月", en: "Third Month" } },
      { id: "month_4", name: { zh: "四月", en: "Fourth Month" } },
      { id: "month_5", name: { zh: "五月", en: "Fifth Month" } },
      { id: "month_6", name: { zh: "六月", en: "Sixth Month" } },
      { id: "month_7", name: { zh: "七月", en: "Seventh Month" } },
      { id: "month_8", name: { zh: "八月", en: "Eighth Month" } },
      { id: "month_9", name: { zh: "九月", en: "Ninth Month" } },
      { id: "month_10", name: { zh: "十月", en: "Tenth Month" } },
      { id: "month_11", name: { zh: "十一月", en: "Eleventh Month" } },
      { id: "month_12", name: { zh: "腊月", en: "Twelfth Month" } },
    ],
    daysPerMonth: 28,  // 每月几天
    daysPerWeek: 7,  // 每周几天
    // 季节：包含哪几个月（1 = 正月）。天气概率按季节算
    seasons: [
      { id: "spring", name: { zh: "春", en: "Spring" }, months: [1, 2, 3] },
      { id: "summer", name: { zh: "夏", en: "Summer" }, months: [4, 5, 6] },
      { id: "autumn", name: { zh: "秋", en: "Autumn" }, months: [7, 8, 9] },
      { id: "winter", name: { zh: "冬", en: "Winter" }, months: [10, 11, 12] },
    ],
    // 24 节气：每月 10 日和 24 日。每个节气从当天算到下一个节气的前一天（14 天）
    solarTerms: [
      { id: "lichun", name: { zh: "立春", en: "Start of Spring" }, month: 1, day: 10 },
      { id: "yushui", name: { zh: "雨水", en: "Rain Water" }, month: 1, day: 24 },
      { id: "jingzhe", name: { zh: "惊蛰", en: "Awakening of Insects" }, month: 2, day: 10 },
      { id: "chunfen", name: { zh: "春分", en: "Spring Equinox" }, month: 2, day: 24 },
      { id: "qingming", name: { zh: "清明", en: "Clear and Bright" }, month: 3, day: 10 },
      { id: "guyu", name: { zh: "谷雨", en: "Grain Rain" }, month: 3, day: 24 },
      { id: "lixia", name: { zh: "立夏", en: "Start of Summer" }, month: 4, day: 10 },
      { id: "xiaoman", name: { zh: "小满", en: "Grain Buds" }, month: 4, day: 24 },
      { id: "mangzhong", name: { zh: "芒种", en: "Grain in Ear" }, month: 5, day: 10 },
      { id: "xiazhi", name: { zh: "夏至", en: "Summer Solstice" }, month: 5, day: 24 },
      { id: "xiaoshu", name: { zh: "小暑", en: "Minor Heat" }, month: 6, day: 10 },
      { id: "dashu", name: { zh: "大暑", en: "Major Heat" }, month: 6, day: 24 },
      { id: "liqiu", name: { zh: "立秋", en: "Start of Autumn" }, month: 7, day: 10 },
      { id: "chushu", name: { zh: "处暑", en: "End of Heat" }, month: 7, day: 24 },
      { id: "bailu", name: { zh: "白露", en: "White Dew" }, month: 8, day: 10 },
      { id: "qiufen", name: { zh: "秋分", en: "Autumn Equinox" }, month: 8, day: 24 },
      { id: "hanlu", name: { zh: "寒露", en: "Cold Dew" }, month: 9, day: 10 },
      { id: "shuangjiang", name: { zh: "霜降", en: "Frost's Descent" }, month: 9, day: 24 },
      { id: "lidong", name: { zh: "立冬", en: "Start of Winter" }, month: 10, day: 10 },
      { id: "xiaoxue", name: { zh: "小雪", en: "Minor Snow" }, month: 10, day: 24 },
      { id: "daxue", name: { zh: "大雪", en: "Major Snow" }, month: 11, day: 10 },
      { id: "dongzhi", name: { zh: "冬至", en: "Winter Solstice" }, month: 11, day: 24 },
      { id: "xiaohan", name: { zh: "小寒", en: "Minor Cold" }, month: 12, day: 10 },
      { id: "dahan", name: { zh: "大寒", en: "Major Cold" }, month: 12, day: 24 },
    ],
    marketDays: [4, 11, 18, 25],  // 每月哪几天赶集
    marketPriceBonus: 0.1,  // 赶集日镇上所有买卖价格都涨多少（0.1 = 贵 10%）：卖东西多赚，买东西（包括种子）也多花。家门口的收货筐不算
    marketOnlySeeds: ["chive_seed", "watermelon_seed", "pumpkin_seed"],  // 只在赶集日卖的种子（同样按上面的涨幅卖）
    // 节日：每月 2 个，暂用传统节日占日期，活动以后再定（activities 先空着）。
    // 「空位」= 还没定是什么节（placeholder: true，day: null）。冬至和节气同一天是有意的。
    festivals: [
      { id: "spring_festival", name: { zh: "春节", en: "Spring Festival" }, month: 1, day: 1, activities: [] },
      { id: "lantern_festival", name: { zh: "元宵", en: "Lantern Festival" }, month: 1, day: 15, activities: [] },
      { id: "longtaitou", name: { zh: "龙抬头", en: "Dragon Raises Its Head" }, month: 2, day: 2, activities: [] },
      { id: "flower_festival", name: { zh: "花朝节", en: "Flower Festival" }, month: 2, day: 12, activities: [] },
      { id: "shangsi", name: { zh: "上巳", en: "Shangsi Festival" }, month: 3, day: 3, activities: [] },
      { id: "cold_food", name: { zh: "寒食", en: "Cold Food Festival" }, month: 3, day: 9, activities: [] },
      { id: "buddha_bathing", name: { zh: "浴佛节", en: "Buddha Bathing Festival" }, month: 4, day: 8, activities: [] },
      { id: "slot_4", name: { zh: "空位", en: "Open slot" }, month: 4, day: null, activities: [], placeholder: true },
      { id: "dragon_boat", name: { zh: "端午", en: "Dragon Boat Festival" }, month: 5, day: 5, activities: [] },
      { id: "slot_5", name: { zh: "空位", en: "Open slot" }, month: 5, day: null, activities: [], placeholder: true },
      { id: "sunning_clothes", name: { zh: "晒衣节", en: "Sunning Clothes Day" }, month: 6, day: 6, activities: [] },
      { id: "slot_6", name: { zh: "空位", en: "Open slot" }, month: 6, day: null, activities: [], placeholder: true },
      { id: "qixi", name: { zh: "七夕", en: "Qixi Festival" }, month: 7, day: 7, activities: [] },
      { id: "zhongyuan", name: { zh: "中元", en: "Ghost Festival" }, month: 7, day: 15, activities: [] },
      { id: "mid_autumn", name: { zh: "中秋", en: "Mid-Autumn Festival" }, month: 8, day: 15, activities: [] },
      { id: "slot_8", name: { zh: "空位", en: "Open slot" }, month: 8, day: null, activities: [], placeholder: true },
      { id: "double_ninth", name: { zh: "重阳", en: "Double Ninth Festival" }, month: 9, day: 9, activities: [] },
      { id: "slot_9", name: { zh: "空位", en: "Open slot" }, month: 9, day: null, activities: [], placeholder: true },
      { id: "winter_clothes", name: { zh: "寒衣节", en: "Winter Clothes Festival" }, month: 10, day: 1, activities: [] },
      { id: "xiayuan", name: { zh: "下元", en: "Xiayuan Festival" }, month: 10, day: 15, activities: [] },
      { id: "dongzhi_festival", name: { zh: "冬至", en: "Winter Solstice" }, month: 11, day: 24, activities: [] },
      { id: "slot_11", name: { zh: "空位", en: "Open slot" }, month: 11, day: null, activities: [], placeholder: true },
      { id: "laba", name: { zh: "腊八", en: "Laba Festival" }, month: 12, day: 8, activities: [] },
      { id: "new_years_eve", name: { zh: "除夕", en: "New Year's Eve" }, month: 12, day: 28, activities: [] },
    ],
    // 农事规则
    farmingRules: {
      frost: { term: "shuangjiang", killsNonHardy: true },  // 霜降当天，不耐寒的作物枯死（多年生的休眠）
      frozenGround: { from: "xiaohan", until: "lichun" },  // 小寒到立春前一天是冻土期：作物停止生长，不枯死
    },
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
      clear_ruin: 4,  // 清废墟：每清一格
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
