/**
 * 房子升级：要什么材料、多少钱、体力上限
 * ================================================================
 *  数值来自设计主管窗口（daily-systems）。可以直接改数字，保存后刷新游戏就生效。
 *  只改冒号右边的值。
 *  常改的：升级要的材料（materials）和钱（cost）、升级后体力上限（maxStamina）。
 *  每个字段第一次出现时后面有中文说明；完整格式见 types.ts。
 *  改错了 npm run build 会报错，看报错信息或者告诉编程窗口。
 */

import type { HousingTable } from './types';

export const HOUSING: HousingTable = {
  schemaVersion: 1,  // 数据格式版本号（程序用，不用改）
  buildDays: 2,  // 盖房要几天
  builder: "carpenter",  // 谁来盖
  // 房子等级
  levels: [
    {
      level: 0,  // 等级
      id: "straw_hut",  // 程序用的英文名字，其他表靠它互相引用，不要改
      name: { zh: "草棚", en: "Straw hut" },  // 名字：zh 中文，en 英文（英文以后再填）
      materials: {},  // 需要的材料和数量
      cost: 0,  // 要花多少文
      maxStamina: 100,  // 体力上限
      storageSlots: 12,  // 储物箱格数
      unlocks: ["bed", "small_chest"],  // 解锁的家具或功能
    },
    {
      level: 1,
      id: "thatched_cottage",
      name: { zh: "茅屋", en: "Thatched cottage" },
      materials: { wood: 40, thatch: 30 },
      cost: 400,
      maxStamina: 110,
      storageSlots: 24,
      unlocks: ["stove"],
    },
    {
      level: 2,
      id: "tiled_house",
      name: { zh: "瓦房", en: "Tiled house" },
      materials: { wood: 100, stone: 40, roof_tile: 60 },
      cost: 3000,
      maxStamina: 130,
      storageSlots: 36,
      unlocks: ["cabinet", "indoor_visits"],
    },
    {
      level: 3,
      id: "courtyard",
      name: { zh: "小院", en: "Courtyard home" },
      materials: { wood: 150, stone: 100, brick: 80 },
      cost: 8000,
      maxStamina: 160,
      storageSlots: 36,
      unlocks: ["courtyard_wall", "well", "cellar"],
    },
  ],
};
