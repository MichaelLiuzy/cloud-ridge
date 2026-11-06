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

export type PrologueStep = 'opening' | 'clinic' | 'tutorial' | 'done';

/** 背包里有哪些工具（按物品表里的顺序放进工具栏） */
function toolsIn(inventory: Record<string, number>) {
  return itemsData.items.filter((it) => it.type === 'tool' && (inventory[it.id] ?? 0) > 0).map((it) => it.id as string);
}

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
    /** 收货筐里放了什么（物品 id → 数量），第二天早上结算 */
    basket: {} as Record<string, number>,
    /** 地里种的东西：「x,y」→ 这一格的作物 */
    crops: {} as Record<string, PlantedCrop>,
    maxStamina: hut.maxStamina as number,
    stamina: hut.maxStamina as number,
    tools: [] as string[],
    toolIndex: 0,
    inventory: {} as Record<string, number>,
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
      crops: JSON.parse(JSON.stringify(load.crops)),
      maxStamina: load.maxStamina,
      stamina: load.stamina,
      tools: [...load.tools],
      toolIndex: load.toolIndex,
      inventory: { ...load.inventory },
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
}

/**
 * 周里正交给玩家的开局物资（数量在 src/data/start.ts）：钱、种子、工具、馒头。
 * 只给一次（记在 flags.startKitGiven）。
 */
export function giveStartKit() {
  if (gameState.flags.startKitGiven) return;
  gameState.flags.startKitGiven = true;
  gameState.cash += startData.cash;
  for (const [id, n] of Object.entries(startData.inventory)) gameState.inventory[id] = (gameState.inventory[id] ?? 0) + (n ?? 0);
  syncTools();
}

/** 背包里的工具变了：重新排工具栏（手上拿的那件不变） */
export function syncTools() {
  const holding = currentTool();
  gameState.tools = toolsIn(gameState.inventory);
  gameState.toolIndex = Math.max(0, gameState.tools.indexOf(holding ?? ''));
}

/** 背包里加 / 减东西（减到 0 就从背包里拿掉） */
export function addItem(id: string, n = 1) {
  const left = (gameState.inventory[id] ?? 0) + n;
  if (left > 0) gameState.inventory[id] = left;
  else delete gameState.inventory[id];
}

/** 有没有这件东西（背包里数量大于 0） */
export function hasItem(id: string) {
  return (gameState.inventory[id] ?? 0) > 0;
}

/** 有没有这个工具 */
export function hasTool(id: string) {
  return gameState.tools.includes(id);
}

/** 现在手上的工具 id */
export function currentTool() {
  return gameState.tools[gameState.toolIndex];
}
