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

export type PrologueStep = 'opening' | 'clinic' | 'tutorial' | 'done';

function freshState() {
  const inventory: Record<string, number> = { ...startData.inventory };
  // 工具放进工具栏（按 start.ts 里写的顺序）
  const tools = Object.keys(inventory).filter((id) => itemsData.items.find((it) => it.id === id)?.type === 'tool');
  const house = housingData.levels.find((h) => h.id === startData.house)!;
  return {
    clock: null as Clock | null,
    /** 现在用的是第几个存档位（1~3） */
    slot: 1,
    cash: startData.cash as number,
    house: startData.house as string,
    maxStamina: house.maxStamina as number,
    stamina: house.maxStamina as number,
    tools,
    toolIndex: 0,
    inventory,
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
      house: load.house,
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
