/**
 * 打工任务（还没做：游戏现在不读这张表，改了暂时没效果）
 * ================================================================
 *  数值来自设计主管窗口（daily-systems）。可以直接改数字，保存后刷新游戏就生效。
 *  只改冒号右边的值。
 *  常改的：打工报酬（reward）、花多少时间体力、加多少好感。每个字段的说明见 types.ts 里的 Job。
 *  每个字段第一次出现时后面有中文说明；完整格式见 types.ts。
 *  改错了 npm run build 会报错，看报错信息或者告诉编程窗口。
 */

import type { JobsTable } from './types';

export const JOBS: JobsTable = {
  schemaVersion: 1,  // 数据格式版本号（程序用，不用改）
  // 告示栏
  noticeBoard: {
    refreshHour: 6,  // 每天几点换新告示
    postsPerDay: [2, 3],  // 每天贴几张 [最少, 最多]
  },
  // 镇上的人（等剧情窗口起名字）
  npcRoles: [
    "clinic_doctor",
    "village_head",
    "store_keeper",
    "teahouse_keeper",
    "restaurant_owner",
    "dock_manager",
    "tutor",
    "carpenter",
    "blacksmith",
    "night_watchman",
  ],
  // 打工任务列表
  jobs: [
    {
      id: "deliver_medicine",  // 程序用的英文名字，其他表靠它互相引用，不要改
      name: { zh: "送药包", en: "Deliver medicine" },  // 名字：zh 中文，en 英文（英文以后再填）
      type: "delivery",  // 类型
      giver: "clinic_doctor",  // 谁给的活
      source: "notice_board",  // 在哪接活
      timeCostHours: 0,  // 要花几小时
      staminaCost: 0,  // 花多少体力
      reward: 100,  // 报酬（文）
      affection: { clinic_doctor: 10 },  // 好感度变化
      repeatable: true,  // 能不能重复做
      unlock: null,  // 什么时候解锁（null = 一开始就有）
      clueHook: null,  // 和主线线索的关联（等剧情窗口填）
      note: { zh: "当天送到镇东头", en: "" },  // 备注说明
      deadlineDays: 0,  // 几天内要做完（0 = 当天）
    },
    {
      id: "deliver_letter",
      name: { zh: "送家书", en: "Deliver a letter" },
      type: "delivery",
      giver: "store_keeper",
      source: "notice_board",
      timeCostHours: 0,
      staminaCost: 0,
      reward: 60,
      affection: { store_keeper: 10 },
      repeatable: true,
      unlock: null,
      clueHook: null,
      note: { zh: "当天有效", en: "" },
      deadlineDays: 0,
    },
    {
      id: "deliver_tea",
      name: { zh: "给里正送茶叶", en: "Deliver tea to the village head" },
      type: "delivery",
      giver: "teahouse_keeper",
      source: "notice_board",
      timeCostHours: 0,
      staminaCost: 0,
      reward: 80,
      affection: { village_head: 10, teahouse_keeper: 5 },
      repeatable: true,
      unlock: null,
      clueHook: null,
      note: { zh: "当天有效", en: "" },
      deadlineDays: 0,
    },
    {
      id: "deliver_tools",
      name: { zh: "帮铁匠送农具", en: "Deliver farm tools" },
      type: "delivery",
      giver: "blacksmith",
      source: "notice_board",
      timeCostHours: 0,
      staminaCost: 0,
      reward: 150,
      affection: { blacksmith: 10 },
      repeatable: true,
      unlock: null,
      clueHook: null,
      note: { zh: "路远，送到镇外农户", en: "" },
      deadlineDays: 0,
    },
    {
      id: "gather_firewood",
      name: { zh: "给酒楼送柴火", en: "Firewood for the restaurant" },
      type: "gather",
      giver: "restaurant_owner",
      source: "notice_board",
      timeCostHours: 0,
      staminaCost: 0,
      reward: null,
      affection: { restaurant_owner: 15 },
      repeatable: true,
      unlock: null,
      clueHook: null,
      note: { zh: "3 天内交，报酬 = 物品价 × 1.5", en: "" },
      requires: { firewood: 10 },  // 前提条件
      rewardMultiplier: 1.5,  // 报酬倍数
      deadlineDays: 3,
    },
    {
      id: "gather_thatch",
      name: { zh: "帮木匠收纤维", en: "Fiber for the carpenter" },
      type: "gather",
      giver: "carpenter",
      source: "notice_board",
      timeCostHours: 0,
      staminaCost: 0,
      reward: null,
      affection: { carpenter: 15 },
      repeatable: true,
      unlock: null,
      clueHook: null,
      note: { zh: "3 天内交", en: "" },
      requires: { thatch: 20 },
      rewardMultiplier: 1.5,
      deadlineDays: 3,
    },
    {
      id: "teahouse_waiter",
      name: { zh: "茶馆跑堂", en: "Teahouse waiting" },
      type: "shift",
      giver: "teahouse_keeper",
      source: "notice_board",
      timeCostHours: 3,
      staminaCost: 15,
      reward: 150,
      affection: { teahouse_keeper: 5 },
      repeatable: true,
      unlock: null,
      clueHook: null,
      note: { zh: "10:00–20:00 之间开工", en: "" },
    },
    {
      id: "dock_hauling",
      name: { zh: "码头搬货", en: "Dock hauling" },
      type: "heavy",
      giver: "dock_manager",
      source: "notice_board",
      timeCostHours: 4,
      staminaCost: 40,
      reward: 320,
      affection: { dock_manager: 5 },
      repeatable: true,
      unlock: null,
      clueHook: null,
      note: { zh: "只在早上 6:00–10:00 接", en: "" },
    },
    {
      id: "copy_books",
      name: { zh: "给私塾先生抄书", en: "Copy books for the tutor" },
      type: "skill",
      giver: "tutor",
      source: "talk",
      timeCostHours: 2,
      staminaCost: 10,
      reward: 200,
      affection: { tutor: 10 },
      repeatable: true,
      unlock: {
        affection: { tutor: 20 },
      },
      clueHook: null,
      note: { zh: "字迹设定待主线定", en: "" },
    },
    {
      id: "clue_old_ledger",
      name: { zh: "帮杂货铺整理旧账本", en: "Sort the old ledgers" },
      type: "clue",
      giver: "store_keeper",
      source: "talk",
      timeCostHours: 2,
      staminaCost: 10,
      reward: 120,
      affection: { store_keeper: 20 },
      repeatable: false,
      unlock: { storyChapter: 1 },
      clueHook: "TBD_clue_old_ledger",
      note: { zh: "线索占位", en: "" },
    },
    {
      id: "clue_watchman_rounds",
      name: { zh: "替更夫巡一夜", en: "Take the night watch" },
      type: "clue",
      giver: "night_watchman",
      source: "talk",
      timeCostHours: 3,
      staminaCost: 20,
      reward: 100,
      affection: { night_watchman: 20 },
      repeatable: false,
      unlock: {
        affection: { night_watchman: 30 },
      },
      clueHook: "TBD_clue_watchman_rounds",
      note: { zh: "线索占位，晚上 22:00 后开始", en: "" },
    },
    {
      id: "clue_fire_debris",
      name: { zh: "清理火灾残骸", en: "Clear the fire debris" },
      type: "clue",
      giver: "village_head",
      source: "talk",
      timeCostHours: 0,
      staminaCost: 0,
      reward: 0,
      affection: { village_head: 20 },
      repeatable: false,
      unlock: { storyChapter: 1 },
      clueHook: "TBD_clue_fire_debris",
      note: { zh: "在自家田里清理时触发，线索占位", en: "" },
    },
  ],
};
