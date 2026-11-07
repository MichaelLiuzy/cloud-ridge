/**
 * 作物：多少天成熟、什么时候能种
 * ================================================================
 *  数值来自设计主管窗口（daily-systems）。可以直接改数字，保存后刷新游戏就生效。
 *  只改冒号右边的值。
 *  常改的：每种作物几天成熟（growDays）、哪几个节气能播种（sowWindows）。
 *  价格不在这里：种子和收成的买卖价格都在 src/data/items.ts（seedItem、harvestItem 对应那里的物品）。
 *  每个字段第一次出现时后面有中文说明；完整格式见 types.ts。
 *  改错了 npm run build 会报错，看报错信息或者告诉编程窗口。
 */

import type { CropsTable } from './types';

export const CROPS: CropsTable = {
  schemaVersion: 2,  // 数据格式版本号（程序用，不用改）
  // 种植规则
  rules: {
    needsWaterToGrow: true,  // 不浇水就不长
    unwateredDies: false,  // 不浇水会不会死（还没做，改了暂时没效果）
    fertilizer: { item: "plant_ash", growDaysReduction: 0.1, minReductionDays: 1 },  // 肥料（还没做，改了暂时没效果）
  },
  // 作物列表
  crops: [
    {
      id: "bok_choy",  // 程序用的英文名字，其他表靠它互相引用，不要改
      name: { zh: "小白菜", en: "Bok choy" },  // 名字：zh 中文，en 英文（英文以后再填）
      sowWindows: [["lichun", "guyu"], ["bailu", "shuangjiang"]],  // 哪几段能播种：[起始节气, 结束节气]，含结束节气整整 14 天
      frostHardy: true,  // 耐不耐寒：false 的霜降当天枯死
      seedItem: "bok_choy_seed",  // 种子物品
      growDays: 6,  // 几天成熟
      regrowDays: null,  // 收完后几天再长出来（null = 收一次就没了）
      harvestItem: "bok_choy",  // 收获得到的物品
      yield: 1,  // 一次收几个
    },
    {
      id: "radish",
      name: { zh: "萝卜", en: "Radish" },
      sowWindows: [["jingzhe", "qingming"], ["chushu", "qiufen"]],
      frostHardy: true,
      seedItem: "radish_seed",
      growDays: 9,
      regrowDays: null,
      harvestItem: "radish",
      yield: 1,
    },
    {
      id: "potato",
      name: { zh: "土豆", en: "Potato" },
      sowWindows: [["jingzhe", "chunfen"]],
      frostHardy: false,
      seedItem: "potato_seed",
      growDays: 10,
      regrowDays: null,
      harvestItem: "potato",
      yield: 1,
      extraYield: { chance: 0.25, amount: 1 },  // 有几率多收
    },
    {
      id: "pea",
      name: { zh: "豌豆", en: "Pea" },
      sowWindows: [["lichun", "jingzhe"]],
      frostHardy: false,
      seedItem: "pea_seed",
      growDays: 14,
      regrowDays: 4,
      harvestItem: "pea",
      yield: 1,
    },
    {
      id: "chive",
      name: { zh: "韭菜", en: "Chinese chive" },
      sowWindows: [["chunfen", "guyu"]],
      frostHardy: false,
      perennial: true,  // 多年生：霜降时休眠不死，立春自动重新长
      seedItem: "chive_seed",
      growDays: 15,
      regrowDays: 6,
      harvestItem: "chive",
      yield: 1,
    },
    {
      id: "cucumber",
      name: { zh: "黄瓜", en: "Cucumber" },
      sowWindows: [["guyu", "mangzhong"]],
      frostHardy: false,
      seedItem: "cucumber_seed",
      growDays: 12,
      regrowDays: 4,
      harvestItem: "cucumber",
      yield: 1,
    },
    {
      id: "eggplant",
      name: { zh: "茄子", en: "Eggplant" },
      sowWindows: [["guyu", "lixia"]],
      frostHardy: false,
      seedItem: "eggplant_seed",
      growDays: 11,
      regrowDays: 5,
      harvestItem: "eggplant",
      yield: 1,
    },
    {
      id: "cowpea",
      name: { zh: "豇豆", en: "Long bean" },
      sowWindows: [["lixia", "xiaoshu"]],
      frostHardy: false,
      seedItem: "cowpea_seed",
      growDays: 15,
      regrowDays: 4,
      harvestItem: "cowpea",
      yield: 1,
    },
    {
      id: "chili",
      name: { zh: "辣椒", en: "Chili" },
      sowWindows: [["qingming", "xiaoman"]],
      frostHardy: false,
      seedItem: "chili_seed",
      growDays: 8,
      regrowDays: 4,
      harvestItem: "chili",
      yield: 1,
    },
    {
      id: "watermelon",
      name: { zh: "西瓜", en: "Watermelon" },
      sowWindows: [["qingming", "lixia"]],
      frostHardy: false,
      seedItem: "watermelon_seed",
      growDays: 18,
      regrowDays: null,
      harvestItem: "watermelon",
      yield: 1,
    },
    {
      id: "napa_cabbage",
      name: { zh: "大白菜", en: "Napa cabbage" },
      sowWindows: [["liqiu", "chushu"]],
      frostHardy: true,
      seedItem: "napa_cabbage_seed",
      growDays: 12,
      regrowDays: null,
      harvestItem: "napa_cabbage",
      yield: 1,
    },
    {
      id: "taro",
      name: { zh: "芋头", en: "Taro" },
      sowWindows: [["qingming", "guyu"]],
      frostHardy: false,
      seedItem: "taro_seed",
      growDays: 28,
      regrowDays: null,
      harvestItem: "taro",
      yield: 1,
    },
    {
      id: "sweet_potato",
      name: { zh: "红薯", en: "Sweet potato" },
      sowWindows: [["lixia", "xiaoshu"]],
      frostHardy: false,
      seedItem: "sweet_potato_seed",
      growDays: 20,
      regrowDays: null,
      harvestItem: "sweet_potato",
      yield: 1,
    },
    {
      id: "pumpkin",
      name: { zh: "南瓜", en: "Pumpkin" },
      sowWindows: [["qingming", "lixia"]],
      frostHardy: false,
      seedItem: "pumpkin_seed",
      growDays: 25,
      regrowDays: null,
      harvestItem: "pumpkin",
      yield: 1,
    },
    {
      id: "spinach",
      name: { zh: "菠菜", en: "Spinach" },
      sowWindows: [["bailu", "lidong"]],
      frostHardy: true,
      seedItem: "spinach_seed",
      growDays: 10,
      regrowDays: null,
      harvestItem: "spinach",
      yield: 1,
    },
    {
      id: "garlic",
      name: { zh: "大蒜", en: "Garlic" },
      sowWindows: [["qiufen", "hanlu"]],
      frostHardy: true,
      seedItem: "garlic_seed",
      growDays: 20,
      regrowDays: null,
      harvestItem: "garlic",
      yield: 1,
    },
    {
      id: "mustard_greens",
      name: { zh: "雪里蕻", en: "Mustard greens" },
      sowWindows: [["shuangjiang", "daxue"]],
      frostHardy: true,
      seedItem: "mustard_greens_seed",
      growDays: 12,
      regrowDays: 5,
      harvestItem: "mustard_greens",
      yield: 1,
    },
  ],
};
