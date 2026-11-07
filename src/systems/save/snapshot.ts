/**
 * 把现在的游戏状态打包成存档。
 *  - 在农场里：由农场场景提供地图和主角位置。
 *  - 不在农场（比如还在看开场过场、医馆对话）：地图和位置用读档时的，新游戏就用开局的。
 */
import { SETTINGS } from '../../config/settings';
import { gameState } from '../GameState';
import { FARM_MAP } from '../../world/farmMap';
import { SAVED_KEYS, SAVE_VERSION, type SaveData, type SavedKey } from './saveFormat';

/** 除了地图和主角位置以外，存档里的其他东西 */
export function stateFields(): Omit<SaveData, 'farm' | 'player'> {
  const c = gameState.clock!;
  return {
    saveVersion: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    slot: gameState.slot,
    clock: { month: c.month, day: c.day, minutes: c.minutes },
    npcs: { affection: { ...gameState.affection } },
    ...(Object.fromEntries(SAVED_KEYS.map((k) => [k, structuredClone(gameState[k])])) as Pick<SaveData, SavedKey>),
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
  const s = SETTINGS.tileSize;
  return { x: x * s + s / 2, y: y * s + s - 4, facing: 'down' };
}
