/**
 * 把现在的游戏状态打包成存档。
 *  - 在农场里：由农场场景提供地图和主角位置。
 *  - 不在农场（比如还在看开场过场、医馆对话）：地图和位置用读档时的，新游戏就用开局的。
 */
import { gameState } from '../GameState';
import { FARM_MAP } from '../../world/farmMap';
import { SAVE_VERSION, type SaveData } from './saveFormat';

/** 除了地图和主角位置以外，存档里的其他东西 */
export function stateFields(): Omit<SaveData, 'farm' | 'player'> {
  const c = gameState.clock!;
  return {
    saveVersion: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    slot: gameState.slot,
    clock: { month: c.month, day: c.day, minutes: c.minutes },
    cash: gameState.cash,
    stamina: gameState.stamina,
    maxStamina: gameState.maxStamina,
    ateToday: gameState.ateToday,
    weather: gameState.weather,
    week: JSON.parse(JSON.stringify(gameState.week)),
    metNpcs: [...gameState.metNpcs],
    water: gameState.water,
    plantedTrees: [...gameState.plantedTrees],
    drops: JSON.parse(JSON.stringify(gameState.drops)),
    debrisDay: gameState.debrisDay,
    mail: JSON.parse(JSON.stringify(gameState.mail)),
    mailSent: [...gameState.mailSent],
    lanternOff: gameState.lanternOff,
    houseStage: gameState.houseStage,
    ruinsCleared: gameState.ruinsCleared,
    build: gameState.build ? { ...gameState.build } : null,
    diaryFound: [...gameState.diaryFound],
    pickup: { ...gameState.pickup },
    basket: { ...gameState.basket },
    hutIsShed: gameState.hutIsShed,
    storage: gameState.storage.map((x) => (x ? { ...x } : null)),
    crops: JSON.parse(JSON.stringify(gameState.crops)),
    slots: gameState.slots.map((x) => (x ? { ...x } : null)),
    selected: gameState.selected,
    keyItems: { ...gameState.keyItems },
    npcs: { affection: { ...gameState.affection } },
    flags: { ...gameState.flags },
    quests: { ...gameState.quests },
    clues: [...gameState.clues],
    playerName: gameState.playerName,
    chapter: gameState.chapter,
    notebook: { controls: [...gameState.notebook.controls], learned: [...gameState.notebook.learned] },
    prologue: gameState.prologue,
  };
}

/** 现在的存档（在不在农场都能用） */
export function currentSave(): SaveData {
  if (gameState.snapshot) return gameState.snapshot();
  const base = gameState.pendingLoad;
  return { ...stateFields(), farm: base ? [...base.farm] : [...FARM_MAP], player: base ? { ...base.player } : spawnPoint() };
}

/** 开局时主角站的位置（地图上 P 那一格，脚底） */
function spawnPoint() {
  const y = FARM_MAP.findIndex((row) => row.includes('P'));
  const x = FARM_MAP[y].indexOf('P');
  return { x: x * 16 + 8, y: y * 16 + 12, facing: 'down' };
}
