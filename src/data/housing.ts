/**
 * 修房 = 重建烧掉的老宅
 * ================================================================
 *  数值来自设计主管窗口（daily-systems）。可以直接改数字，保存后刷新游戏就生效。
 *  只改冒号右边的值。
 *  开局住在镇上的人搭的草棚里，旁边是宿主被烧掉的老宅（一片废墟）。
 *  第 1 阶段玩家自己清废墟（废墟里随机生成杂草、石头、木头，见下面的 ruins.mix；处理方法和体力同普通的）；
 *  清完以后，第 2~4 阶段请木匠来修，每次动工 buildDays 天。
 *  每个阶段修好时会找到一片日记（位置文字在 src/locales/zh.ts 的 diary，线索在 src/data/clues.ts）。
 *  常改的：每阶段要的材料（materials）和钱（cost）、修好后体力上限（maxStamina）、学会什么（learns）。
 *  完整格式见 types.ts。改错了 npm run build 会报错。
 */

import type { HousingTable } from './types';

export const HOUSING: HousingTable = {
  schemaVersion: 2,  // 数据格式版本号（程序用，不用改）
  buildDays: 2,  // 木匠动工要几天
  builder: "du",  // 谁来修（杜木匠）
  // 开局住的草棚
  hut: {
    maxStamina: 100,  // 体力上限
    unlocks: ["bed", "small_chest"],  // 解锁的家具或功能
  },
  // 清废墟
  ruins: {
    // 废墟（地图上的 R）开新档时随机变成这三种东西，各占几成（加起来是 1）。处理方法、掉落和普通的杂草、石头、木头一样
    mix: { weed: 0.3, rock: 0.4, wood: 0.3 },
  },
  // 重建的四个阶段
  stages: [
    {
      stage: 1,  // 第几阶段
      id: "clear_ruins",  // 程序用的英文名字，不要改
      name: { zh: "清废墟", en: "Clear the ruins" },
      materials: {},  // 需要的材料和数量
      cost: 0,  // 要花多少文
      byCarpenter: false,  // 是不是请木匠来修（这一阶段玩家自己动手）
      maxStamina: 100,  // 修好后体力上限
      unlocks: [],
      learns: [],  // 修好后学会的本事（笔记本「已学会」栏）
    },
    {
      stage: 2,
      id: "timber_frame",
      name: { zh: "立梁架", en: "Raise the frame" },
      materials: { wood: 40, thatch: 30 },  // thatch = 纤维
      cost: 400,
      byCarpenter: true,
      maxStamina: 110,
      unlocks: ["stove", "chest_24"],  // 灶台、箱子 24 格；搬进去住
      learns: ["recipe_veg_porridge", "recipe_radish_soup", "recipe_roast_sweet_potato", "make_plant_ash"],
    },
    {
      stage: 3,
      id: "tiled_roof",
      name: { zh: "换瓦顶", en: "Tile the roof" },
      materials: { wood: 100, stone: 40, roof_tile: 60 },
      cost: 3000,
      byCarpenter: true,
      maxStamina: 130,
      unlocks: ["cabinet", "indoor_visits"],  // 储物柜 36 格、客人可以进门拜访
      learns: [],
    },
    {
      stage: 4,
      id: "courtyard",
      name: { zh: "修院墙", en: "Build the courtyard" },
      materials: { wood: 150, stone: 100, brick: 80 },
      cost: 8000,
      byCarpenter: true,
      maxStamina: 160,
      unlocks: ["courtyard_wall", "well", "cellar"],  // 院墙、水井、地窖
      learns: [],
    },
  ],
};
