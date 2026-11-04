/**
 * 全局游戏状态：时钟、钱、体力、工具、背包、好感度……
 * 存档就是把这里的东西（加上地图和主角位置）存成 JSON，见 src/systems/save/。
 * 开局数值来自 src/data/start.ts，体力上限来自 src/data/housing.ts。
 */
import { START as startData } from '../data/start';
import { ITEMS as itemsData } from '../data/items';
import { HOUSING as housingData } from '../data/housing';
import type { Clock } from './Clock';
import type { SaveData } from './save/saveFormat';

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
    /** 界面正忙（对话框或小菜单开着），这时主角不能走、时间暂停 */
    uiBusy: false,
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
  if (load) {
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
    });
  }
}

/** 有没有这个工具 */
export function hasTool(id: string) {
  return gameState.tools.includes(id);
}

/** 现在手上的工具 id */
export function currentTool() {
  return gameState.tools[gameState.toolIndex];
}
