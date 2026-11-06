/**
 * 杂货铺上门收货（数值在 src/data/services.ts）：
 *  - 杂货铺掌柜好感度到 unlockHearts 颗心 → 他主动提出（剧本 prologue.ink 里的 pickup_offer）；
 *  - 付 fee 文开通 → 家门口出现收货筐；
 *  - 筐里的东西第二天早上按收购价结算，钱直接到手上。
 */
import { SERVICES } from '../../data/services';
import { addItem, gameState } from '../GameState';
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

/** 能放进筐里的东西：杂货铺收、背包里有 */
export function sellableInBag() {
  return Object.keys(gameState.inventory).filter((id) => (gameState.inventory[id] ?? 0) > 0 && basketPrice(id) != null);
}

/** 把背包里某样东西全部放进筐 */
export function putInBasket(id: string) {
  const n = gameState.inventory[id] ?? 0;
  if (n <= 0) return 0;
  addItem(id, -n);
  gameState.basket[id] = (gameState.basket[id] ?? 0) + n;
  return n;
}

/** 把筐里的东西全拿回来 */
export function takeBackAll() {
  for (const [id, n] of Object.entries(gameState.basket)) addItem(id, n);
  gameState.basket = {};
}

/** 第二天早上：结算筐里的东西，返回一共卖了多少文（筐是空的返回 0） */
export function settleBasket() {
  let total = 0;
  for (const [id, n] of Object.entries(gameState.basket)) total += (basketPrice(id) ?? 0) * n;
  gameState.basket = {};
  gameState.cash += total;
  return total;
}
