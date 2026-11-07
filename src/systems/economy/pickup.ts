/**
 * 杂货铺上门收货（数值在 src/data/services.ts）：
 *  - 杂货铺掌柜好感度到 unlockHearts 颗心 → 他主动提出（剧本 prologue.ink 里的 pickup_offer）；
 *  - 付 fee 文开通 → 家门口出现收货筐；
 *  - 筐里的东西第二天早上按收购价结算，钱直接到手上。
 */
import { SERVICES } from '../../data/services';
import { gameState } from '../GameState';
import { addItem, countItem, inventoryCounts, removeItem, roomFor } from '../inventory';
import { heartsOf } from '../affection';
import { basketPrice } from './shop';

const cfg = SERVICES.pickup;

/** 掌柜现在会不会来提这件事 */
export function pickupOfferReady() {
  return !gameState.pickup.unlocked && heartsOf(cfg.npc) >= cfg.unlockHearts;
}

/** 付钱开通。钱不够返回 false */
export function unlockPickup(): boolean {
  if (gameState.pickup.unlocked) return true;
  if (gameState.cash < cfg.fee) return false;
  gameState.cash -= cfg.fee;
  gameState.pickup.unlocked = true;
  return true;
}

/** 能放进筐里的东西：杂货铺收、背包里有、没上锁（上锁的不能卖）。返回 id → 能放几个 */
export function sellableInBag() {
  const counts = inventoryCounts({ skipLocked: true });
  return Object.fromEntries(Object.entries(counts).filter(([id, n]) => n > 0 && basketPrice(id) != null));
}

/** 把背包里的某样东西放 n 个进筐（最多放背包里有的数），返回实际放了几个 */
export function putInBasket(id: string, n: number) {
  const k = removeItem(id, Math.min(n, countItem(id, { skipLocked: true })), { skipLocked: true });
  if (k <= 0) return 0;
  gameState.basket[id] = (gameState.basket[id] ?? 0) + k;
  return k;
}

/** 从筐里拿回 n 个（还没结算的当天都能拿回；背包放不下的留在筐里），返回实际拿了几个 */
export function takeFromBasket(id: string, n: number) {
  const k = Math.min(n, gameState.basket[id] ?? 0, roomFor(id));
  if (k <= 0) return 0;
  addItem(id, k);
  const left = (gameState.basket[id] ?? 0) - k;
  if (left > 0) gameState.basket[id] = left;
  else delete gameState.basket[id];
  return k;
}

/** 第二天早上：结算筐里的东西，返回一共卖了多少文（筐是空的返回 0） */
export function settleBasket() {
  let total = 0;
  for (const [id, n] of Object.entries(gameState.basket)) total += (basketPrice(id) ?? 0) * n;
  gameState.basket = {};
  gameState.cash += total;
  return total;
}
