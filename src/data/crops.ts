/**
 * 作物：多少天成熟、卖多少钱
 * ================================================================
 *  数值来自设计主管窗口（daily-systems）。可以直接改数字，保存后刷新游戏就生效。
 *  只改冒号右边的值。
 *  常改的：每种作物几天成熟（growDays）、种子价格（seedPrice）、卖多少钱（sellPrice）、哪个季节能种（seasons）。
 *  每个字段第一次出现时后面有中文说明；完整格式见 types.ts。
 *  改错了 npm run build 会报错，看报错信息或者告诉编程窗口。
 */

import type { CropsTable } from './types';

export const CROPS: CropsTable = {
  schemaVersion: 1,  // 数据格式版本号（程序用，不用改）
  // 种植规则
  rules: {
    needsWaterToGrow: true,  // 不浇水就不长
    unwateredDies: false,  // 不浇水会不会死
    outOfSeasonWithers: true,  // 换季时不当季的作物会枯死
    fertilizer: { item: "plant_ash", growDaysReduction: 0.1, minReductionDays: 1 },  // 肥料
  },
  // 作物列表
  crops: [
    {
      id: "bok_choy",  // 程序用的英文名字，其他表靠它互相引用，不要改
      name: { zh: "小白菜", en: "Bok choy" },  // 名字：zh 中文，en 英文（英文以后再填）
      seasons: ["spring"],  // 季节
      seedItem: "bok_choy_seed",  // 种子物品
      seedPrice: 20,  // 种子价格（文）
      growDays: 4,  // 几天成熟
      regrowDays: null,  // 收完后几天再长出来（null = 收一次就没了）
      harvestItem: "bok_choy",  // 收获得到的物品
      yield: 1,  // 一次收几个
      sellPrice: 35,  // 卖出价格（文）
      seedSoldAt: "general_store",  // 种子在哪买
    },
    {
      id: "radish",
      name: { zh: "萝卜", en: "Radish" },
      seasons: ["spring"],
      seedItem: "radish_seed",
      seedPrice: 30,
      growDays: 6,
      regrowDays: null,
      harvestItem: "radish",
      yield: 1,
      sellPrice: 60,
      seedSoldAt: "general_store",
    },
    {
      id: "potato",
      name: { zh: "土豆", en: "Potato" },
      seasons: ["spring"],
      seedItem: "potato_seed",
      seedPrice: 50,
      growDays: 6,
      regrowDays: null,
      harvestItem: "potato",
      yield: 1,
      sellPrice: 80,
      seedSoldAt: "general_store",
      extraYield: { chance: 0.25, amount: 1 },  // 有几率多收
    },
    {
      id: "pea",
      name: { zh: "豌豆", en: "Pea" },
      seasons: ["spring"],
      seedItem: "pea_seed",
      seedPrice: 60,
      growDays: 9,
      regrowDays: 3,
      harvestItem: "pea",
      yield: 1,
      sellPrice: 30,
      seedSoldAt: "general_store",
    },
    {
      id: "chive",
      name: { zh: "韭菜", en: "Chinese chive" },
      seasons: ["spring", "summer", "autumn"],
      seedItem: "chive_seed",
      seedPrice: 80,
      growDays: 10,
      regrowDays: 4,
      harvestItem: "chive",
      yield: 1,
      sellPrice: 45,
      seedSoldAt: "market",
    },
    {
      id: "cucumber",
      name: { zh: "黄瓜", en: "Cucumber" },
      seasons: ["summer"],
      seedItem: "cucumber_seed",
      seedPrice: 40,
      growDays: 8,
      regrowDays: 3,
      harvestItem: "cucumber",
      yield: 1,
      sellPrice: 35,
      seedSoldAt: "general_store",
    },
    {
      id: "eggplant",
      name: { zh: "茄子", en: "Eggplant" },
      seasons: ["summer"],
      seedItem: "eggplant_seed",
      seedPrice: 50,
      growDays: 7,
      regrowDays: 4,
      harvestItem: "eggplant",
      yield: 1,
      sellPrice: 50,
      seedSoldAt: "general_store",
    },
    {
      id: "cowpea",
      name: { zh: "豇豆", en: "Long bean" },
      seasons: ["summer"],
      seedItem: "cowpea_seed",
      seedPrice: 60,
      growDays: 10,
      regrowDays: 3,
      harvestItem: "cowpea",
      yield: 1,
      sellPrice: 40,
      seedSoldAt: "general_store",
    },
    {
      id: "chili",
      name: { zh: "辣椒", en: "Chili" },
      seasons: ["summer"],
      seedItem: "chili_seed",
      seedPrice: 40,
      growDays: 5,
      regrowDays: 3,
      harvestItem: "chili",
      yield: 1,
      sellPrice: 25,
      seedSoldAt: "general_store",
    },
    {
      id: "watermelon",
      name: { zh: "西瓜", en: "Watermelon" },
      seasons: ["summer"],
      seedItem: "watermelon_seed",
      seedPrice: 120,
      growDays: 12,
      regrowDays: null,
      harvestItem: "watermelon",
      yield: 1,
      sellPrice: 300,
      seedSoldAt: "market",
    },
    {
      id: "napa_cabbage",
      name: { zh: "大白菜", en: "Napa cabbage" },
      seasons: ["autumn"],
      seedItem: "napa_cabbage_seed",
      seedPrice: 50,
      growDays: 8,
      regrowDays: null,
      harvestItem: "napa_cabbage",
      yield: 1,
      sellPrice: 110,
      seedSoldAt: "general_store",
    },
    {
      id: "taro",
      name: { zh: "芋头", en: "Taro" },
      seasons: ["autumn"],
      seedItem: "taro_seed",
      seedPrice: 60,
      growDays: 9,
      regrowDays: null,
      harvestItem: "taro",
      yield: 1,
      sellPrice: 120,
      seedSoldAt: "general_store",
    },
    {
      id: "sweet_potato",
      name: { zh: "红薯", en: "Sweet potato" },
      seasons: ["autumn"],
      seedItem: "sweet_potato_seed",
      seedPrice: 70,
      growDays: 10,
      regrowDays: null,
      harvestItem: "sweet_potato",
      yield: 1,
      sellPrice: 150,
      seedSoldAt: "general_store",
    },
    {
      id: "pumpkin",
      name: { zh: "南瓜", en: "Pumpkin" },
      seasons: ["autumn"],
      seedItem: "pumpkin_seed",
      seedPrice: 100,
      growDays: 13,
      regrowDays: null,
      harvestItem: "pumpkin",
      yield: 1,
      sellPrice: 320,
      seedSoldAt: "market",
    },
    {
      id: "spinach",
      name: { zh: "菠菜", en: "Spinach" },
      seasons: ["winter"],
      seedItem: "spinach_seed",
      seedPrice: 30,
      growDays: 7,
      regrowDays: null,
      harvestItem: "spinach",
      yield: 1,
      sellPrice: 55,
      seedSoldAt: "general_store",
    },
    {
      id: "garlic",
      name: { zh: "大蒜", en: "Garlic" },
      seasons: ["winter"],
      seedItem: "garlic_seed",
      seedPrice: 40,
      growDays: 10,
      regrowDays: null,
      harvestItem: "garlic",
      yield: 1,
      sellPrice: 90,
      seedSoldAt: "general_store",
    },
  ],
};
