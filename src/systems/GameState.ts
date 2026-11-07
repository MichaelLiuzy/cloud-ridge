/**
 * 全局游戏状态：时钟、钱、体力、工具、背包、好感度……
 * 存档就是把这里的东西（加上地图和主角位置）存成 JSON，见 src/systems/save/。
 * 开局数值来自 src/data/start.ts，体力上限来自 src/data/housing.ts。
 */
import { START as startData } from '../data/start';
import { ITEMS as itemsData } from '../data/items';
import { HOUSING as housingData } from '../data/housing';
import { Clock } from './Clock';
import type { SaveData } from './save/saveFormat';
import type { PlantedCrop } from './farming/crops';
import { SETTINGS } from '../config/settings';
import { addItem, isTool, type Slot } from './inventory';
import { emptyWeek, type WeekStats } from './weekStats';
import { normalizeChest } from './home/storage';
import type { Weather } from '../data/types';
import { TIME as timeData } from '../data/time';

export type PrologueStep = 'opening' | 'clinic' | 'tutorial' | 'done';

function freshState() {
  // 开局身上什么都没有：钱、种子和工具由周里正在序章里交给玩家（giveStartKit）
  const hut = housingData.hut;
  return {
    clock: null as Clock | null,
    /** 现在用的是第几个存档位（1~3） */
    slot: 1,
    cash: 0,
    /** 重建老宅到第几阶段：0 = 住草棚、废墟还没清完；1 = 废墟清完了；2~4 = 木匠修好的阶段（见 src/data/housing.ts） */
    houseStage: 0,
    /** 废墟清了几格 */
    ruinsCleared: 0,
    /** 木匠正在修：修的是第几阶段、还要几天（没在修是 null） */
    build: null as { stage: number; daysLeft: number } | null,
    /** 找到了哪几片日记（按修房阶段记：1 ~ 4） */
    diaryFound: [] as number[],
    /** 杂货铺上门收货：开通了没有 */
    pickup: { unlocked: false },
    /** 草棚已经改成柴房了（第 2 阶段修好、搬进老宅以后）：不能再睡觉 */
    hutIsShed: false,
    /** 草棚（柴房）里那个箱子：一格一格的，和背包一样（见 src/systems/home/storage.ts） */
    storage: [] as (Slot | null)[],
    /** 收货筐里放了什么（物品 id → 数量），第二天早上结算 */
    basket: {} as Record<string, number>,
    /** 地里种的东西：「x,y」→ 这一格的作物 */
    crops: {} as Record<string, PlantedCrop>,
    maxStamina: hut.maxStamina as number,
    stamina: hut.maxStamina as number,
    /** 今天（从早上醒来起）吃过东西没有。一整天没吃，第二天醒来体力最多 80（src/data/time.ts 的 hunger） */
    ateToday: false,
    /** 今天的天气（每天早上 6 点抽，见 src/systems/days.ts）。开局那天是晴天 */
    weather: 'sunny' as Weather,
    /** 本周统计（每周总结用，见 src/systems/weekStats.ts） */
    week: emptyWeek() as WeekStats,
    /** 认识了哪些人（第一次说话就算认识；names 里的 id） */
    metNpcs: [] as string[],
    /** 水桶里还有多少水（满是 src/data/time.ts 的 stamina.bucket.capacity） */
    water: timeData.stamina.bucket.capacity as number,
    /** 玩家自己种的树在哪几格（「x,y」）：不算进自然长树的上限 */
    plantedTrees: [] as string[],
    /** 背包满了掉在地上的东西：「x,y」→ { 物品 id: 数量 }，走过去就捡起来 */
    drops: {} as Record<string, Record<string, number>>,
    /** 工具栏 + 背包的格子（前 9 格是工具栏），见 src/systems/inventory.ts */
    slots: Array.from({ length: SETTINGS.inventory.toolbarSlots + SETTINGS.inventory.bagSlots }, () => null) as (Slot | null)[],
    /** 手上拿的是工具栏第几格（0 ~ 8） */
    selected: 0,
    /** 重要物品（笔记本、烧焦的纸）：不占格子 */
    keyItems: {} as Record<string, number>,
    affection: { ...startData.affection } as Record<string, number>,
    flags: {} as Record<string, boolean | number | string>,
    quests: {} as Record<string, string>,
    clues: [] as string[],
    /** 玩家起的名字（还没起是空的） */
    playerName: '',
    /** 现在是第几章（0 = 序章） */
    chapter: 0,
    /** 笔记本「操作」「已学会」两栏记了哪些条目（条目 id，文字在语言文件 notebook 里） */
    notebook: { controls: [] as string[], learned: [] as string[] },
    /**
     * 序章走到哪一步：opening = 开场过场；clinic = 医馆对话；tutorial = 在农场醒来、还没和周里正说话；done = 序章结束
     * 中途退出时，下次从这一步的开头重来。
     */
    prologue: 'opening' as PrologueStep,
    /** Q 总菜单开着（这时时间暂停、主角不能走） */
    menuOpen: false,
    /** 界面正忙（对话框或小菜单开着），这时主角不能走、时间暂停 */
    uiBusy: false,
    /** 回忆模式：画面去色、叠一层黛青，只有火光保留颜色（剧情回忆时用，不存档） */
    memoryMode: false,
    /** 进农场时要读进来的存档（新游戏为 null） */
    pendingLoad: null as SaveData | null,
    /** 由农场场景提供：把现在的样子打包成存档 */
    snapshot: null as (() => SaveData) | null,
  };
}

export const gameState = freshState();

/** 开新游戏 / 回标题时，把状态清空回开局 */
export function resetGameState(slot: number, load: SaveData | null = null) {
  Object.assign(gameState, freshState(), { slot, pendingLoad: load });
  gameState.clock = new Clock();
  if (load) {
    Object.assign(gameState.clock, load.clock);
    Object.assign(gameState, {
      cash: load.cash,
      houseStage: load.houseStage,
      ruinsCleared: load.ruinsCleared,
      build: load.build ? { ...load.build } : null,
      diaryFound: [...load.diaryFound],
      pickup: { ...load.pickup },
      basket: { ...load.basket },
      hutIsShed: load.hutIsShed,
      storage: load.storage.map((x) => (x ? { ...x } : null)),
      crops: JSON.parse(JSON.stringify(load.crops)),
      maxStamina: load.maxStamina,
      stamina: load.stamina,
      ateToday: load.ateToday,
      weather: load.weather,
      week: JSON.parse(JSON.stringify(load.week)),
      metNpcs: [...load.metNpcs],
      water: load.water,
      plantedTrees: [...load.plantedTrees],
      drops: JSON.parse(JSON.stringify(load.drops)),
      slots: load.slots.map((x) => (x ? { ...x } : null)),
      selected: load.selected,
      keyItems: { ...load.keyItems },
      affection: { ...load.npcs.affection },
      flags: { ...load.flags },
      quests: { ...load.quests },
      clues: [...load.clues],
      playerName: load.playerName,
      chapter: load.chapter,
      notebook: { controls: [...load.notebook.controls], learned: [...load.notebook.learned] },
      prologue: load.prologue,
    });
  }
  normalizeChest();
}

/**
 * 周里正交给玩家的开局物资（数量在 src/data/start.ts）：钱、种子、工具、馒头。
 * 只给一次（记在 flags.startKitGiven）。
 */
export function giveStartKit() {
  if (gameState.flags.startKitGiven) return;
  gameState.flags.startKitGiven = true;
  gameState.cash += startData.cash;
  // 工具栏依次放：工具、种子、别的东西
  const rank = (id: string) => (isTool(id) ? 0 : itemsData.items.find((it) => it.id === id)?.type === 'seed' ? 1 : 2);
  const kit = Object.entries(startData.inventory).sort(([a], [b]) => rank(a) - rank(b));
  for (const [id, n] of kit) addItem(id, n ?? 0);
}
