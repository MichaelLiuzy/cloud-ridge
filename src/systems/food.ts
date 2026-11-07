/**
 * 吃东西：在工具栏拿着食物按「使用」（Mac 空格 / 手机「使用」键），或在背包里选中食物按「吃一个」。
 *  - 每样食物回复多少体力写在 src/data/items.ts 的 stamina 里，不会超过体力上限。
 *  - 吃了就记下「今天吃过东西」：一整天都没吃的话，第二天醒来体力最多 80（src/data/time.ts 的 hunger）。
 */
import { gameState } from './GameState';
import { itemInfo, takeFromSlot } from './inventory';

/** 这样东西能不能吃 */
export function isFood(id: string | undefined) {
  return !!id && itemInfo(id)?.type === 'food';
}

/** 吃掉第 i 格里的一个。返回吃的是什么、实际回复了几点体力（这一格不是食物返回 null） */
export function eatFromSlot(i: number): { id: string; gain: number } | null {
  const s = gameState.slots[i];
  if (!s || !isFood(s.id)) return null;
  const info = itemInfo(s.id) as { stamina?: number } | undefined;
  takeFromSlot(i, 1);
  const before = gameState.stamina;
  gameState.stamina = Math.min(gameState.maxStamina, before + (info?.stamina ?? 0));
  gameState.ateToday = true;
  return { id: s.id, gain: Math.round(gameState.stamina - before) };
}
