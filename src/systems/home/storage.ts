/**
 * 草棚（以后的柴房）里的储物箱：能放几种东西看 src/data/housing.ts 的 hut.storageSlots（一种东西占一格，数量不限）。
 * 草棚改成柴房时，箱子和里面的东西原样留着。
 */
import { HOUSING } from '../../data/housing';
import { addItem, gameState } from '../GameState';

export const CHEST_SLOTS = HOUSING.hut.storageSlots;

/** 放 n 个进箱子。箱子满了（又是新的一种东西）返回 -1，否则返回实际放了几个 */
export function putInChest(id: string, n: number) {
  const isNew = !(gameState.storage[id] > 0);
  if (isNew && Object.keys(gameState.storage).length >= CHEST_SLOTS) return -1;
  const k = Math.min(n, gameState.inventory[id] ?? 0);
  if (k <= 0) return 0;
  addItem(id, -k);
  gameState.storage[id] = (gameState.storage[id] ?? 0) + k;
  return k;
}

/** 从箱子里拿 n 个出来，返回实际拿了几个 */
export function takeFromChest(id: string, n: number) {
  const k = Math.min(n, gameState.storage[id] ?? 0);
  if (k <= 0) return 0;
  addItem(id, k);
  const left = gameState.storage[id] - k;
  if (left > 0) gameState.storage[id] = left;
  else delete gameState.storage[id];
  return k;
}

/** 背包里能放进箱子的东西：工具和重要物品（笔记本、纸片）不放 */
export function storableInBag(isTool: (id: string) => boolean) {
  return Object.keys(gameState.inventory).filter((id) => (gameState.inventory[id] ?? 0) > 0 && !isTool(id));
}
