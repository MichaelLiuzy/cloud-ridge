/**
 * 物品栏：屏幕下方的工具栏（9 格）+ 背包（27 格），一共 36 格，存在 gameState.slots 里。
 * ================================================================
 *  - 第 0 ~ 8 格是工具栏（数字键 1 ~ 9），第 9 ~ 35 格是背包。
 *  - 每格放一种东西：{ id, n（数量）, locked（上锁没有） }，空格是 null。
 *  - 同一种东西可以叠在一格里，最多 SETTINGS.inventory.stackMax 个；工具不叠放。
 *  - 「重要物品」（笔记本、烧焦的纸）不占格子，记在 gameState.keyItems 里。
 *  - 上锁的东西不能丢、不能卖；移动时锁跟着走。
 *  - 格子编号从 36 起是箱子里的格子（gameState.storage，见 src/systems/home/storage.ts），
 *    这样背包和箱子之间拖来拖去、丢弃、上锁都用同一套函数。
 * 别的地方加减东西都用这里的函数，不要直接改 gameState.slots。
 */
import { ITEMS } from '../data/items';
import { SETTINGS } from '../config/settings';
import { gameState } from './GameState';
import { localName } from '../locales/i18n';

export interface Slot {
  id: string;
  n: number;
  locked?: boolean;
}

export const TOOLBAR_SLOTS = SETTINGS.inventory.toolbarSlots;
export const BAG_SLOTS = SETTINGS.inventory.bagSlots;
export const ALL_SLOTS = TOOLBAR_SLOTS + BAG_SLOTS;

export function itemInfo(id: string) {
  return ITEMS.items.find((it) => it.id === id);
}

export function isTool(id: string) {
  return itemInfo(id)?.type === 'tool';
}

/** 重要物品：不占格子 */
export function isKeyItem(id: string) {
  return itemInfo(id)?.type === 'key';
}

/** 一格最多叠几个 */
export function stackMax(id: string) {
  return isTool(id) ? 1 : SETTINGS.inventory.stackMax;
}

/** 第 i 格：0 ~ 35 是身上（工具栏 + 背包），36 起是箱子 */
export function slotAt(i: number): Slot | null {
  return (i < ALL_SLOTS ? gameState.slots[i] : gameState.storage[i - ALL_SLOTS]) ?? null;
}

function setSlotAt(i: number, s: Slot | null) {
  if (i < ALL_SLOTS) gameState.slots[i] = s;
  else gameState.storage[i - ALL_SLOTS] = s;
}

/** 能不能放进箱子：工具和重要物品（笔记本、纸片）不放 */
export function canStore(id: string) {
  return !isTool(id) && !isKeyItem(id);
}

export function emptySlots(): (Slot | null)[] {
  return Array.from({ length: ALL_SLOTS }, () => null);
}

/** 一共有几个（locked: false = 不算上锁的） */
export function countItem(id: string, opts: { skipLocked?: boolean } = {}) {
  if (isKeyItem(id)) return gameState.keyItems[id] ?? 0;
  let n = 0;
  for (const s of gameState.slots) if (s && s.id === id && !(opts.skipLocked && s.locked)) n += s.n;
  return n;
}

export function hasItem(id: string) {
  return countItem(id) > 0;
}

/** 身上所有东西：id → 数量（含重要物品） */
export function inventoryCounts(opts: { skipLocked?: boolean } = {}) {
  const out: Record<string, number> = { ...gameState.keyItems };
  for (const s of gameState.slots) if (s && !(opts.skipLocked && s.locked)) out[s.id] = (out[s.id] ?? 0) + s.n;
  return out;
}

/** 还能放下几个这种东西 */
export function roomFor(id: string) {
  if (isKeyItem(id)) return Infinity;
  const max = stackMax(id);
  let room = 0;
  for (const s of gameState.slots) {
    if (!s) room += max;
    else if (s.id === id) room += max - s.n;
  }
  return room;
}

/** 这么多能不能全放下 */
export function canAdd(id: string, n = 1) {
  if (n <= 0 || isKeyItem(id)) return true;
  const max = stackMax(id);
  let room = 0;
  for (const s of gameState.slots) {
    if (!s) room += max;
    else if (s.id === id) room += max - s.n;
    if (room >= n) return true;
  }
  return false;
}

/** 好几样东西一起能不能放下（比如收货筐、箱子一次拿好几种时） */
export function canAddAll(list: Record<string, number>) {
  const saved = gameState.slots.map((s) => (s ? { ...s } : null));
  let ok = true;
  for (const [id, n] of Object.entries(list)) if (addItem(id, n) < n) ok = false;
  gameState.slots = saved;
  return ok;
}

/**
 * 放进来 n 个：先叠到已有的同种格子上，再放空格（工具栏先、背包后）。
 * 返回实际放进去几个（放不下的就没放）。
 */
export function addItem(id: string, n = 1): number {
  if (n <= 0) return 0;
  if (isKeyItem(id)) {
    gameState.keyItems[id] = (gameState.keyItems[id] ?? 0) + n;
    return n;
  }
  const max = stackMax(id);
  let left = n;
  for (const s of gameState.slots) {
    if (left <= 0) break;
    if (s && s.id === id && s.n < max) {
      const k = Math.min(left, max - s.n);
      s.n += k;
      left -= k;
    }
  }
  for (let i = 0; i < ALL_SLOTS && left > 0; i++) {
    if (gameState.slots[i]) continue;
    const k = Math.min(left, max);
    gameState.slots[i] = { id, n: k };
    left -= k;
  }
  return n - left;
}

/**
 * 拿走 n 个：先从背包后面拿，工具栏最后拿（手上那格尽量不动）。
 * skipLocked = 上锁的不拿（卖东西时用）。返回实际拿走几个。
 */
export function removeItem(id: string, n = 1, opts: { skipLocked?: boolean } = {}): number {
  if (n <= 0) return 0;
  if (isKeyItem(id)) {
    const k = Math.min(n, gameState.keyItems[id] ?? 0);
    const left = (gameState.keyItems[id] ?? 0) - k;
    if (left > 0) gameState.keyItems[id] = left;
    else delete gameState.keyItems[id];
    return k;
  }
  let left = n;
  const order = [...Array(ALL_SLOTS).keys()].reverse();
  // 手上那格放到最后
  order.splice(order.indexOf(gameState.selected), 1);
  order.push(gameState.selected);
  for (const i of order) {
    const s = gameState.slots[i];
    if (left <= 0) break;
    if (!s || s.id !== id || (opts.skipLocked && s.locked)) continue;
    const k = Math.min(left, s.n);
    s.n -= k;
    left -= k;
    if (s.n <= 0) gameState.slots[i] = null;
  }
  return n - left;
}

/** 从某一格拿走 n 个（用掉手上的种子、丢弃） */
export function takeFromSlot(i: number, n = 1) {
  const s = slotAt(i);
  if (!s) return 0;
  const k = Math.min(n, s.n);
  s.n -= k;
  if (s.n <= 0) setSlotAt(i, null);
  return k;
}

/** 手上拿的那格（工具栏里选中的） */
export function heldSlot(): Slot | null {
  return gameState.slots[gameState.selected] ?? null;
}

/** 手上拿的东西 id（空手是 undefined） */
export function heldItem(): string | undefined {
  return heldSlot()?.id;
}

/**
 * 把 from 格的东西移到 to 格：to 是空的就移过去；同一种能叠就叠上去（叠不下的留在原格）；
 * 不同的东西就两格交换。锁跟着东西走。工具不能进箱子（这时不动，返回 false）。
 */
export function moveSlot(from: number, to: number) {
  const a = slotAt(from);
  const b = slotAt(to);
  if (from === to || !a) return false;
  if ((to >= ALL_SLOTS && !canStore(a.id)) || (b && from >= ALL_SLOTS && !canStore(b.id))) return false;
  if (b && b.id === a.id && b.n < stackMax(a.id)) {
    const k = Math.min(a.n, stackMax(a.id) - b.n);
    b.n += k;
    b.locked = b.locked || a.locked;
    a.n -= k;
    if (a.n <= 0) setSlotAt(from, null);
    return true;
  }
  setSlotAt(from, b);
  setSlotAt(to, a);
  return true;
}

/**
 * 整理：list 里从 from 格到 to 格之前（不含 to），按类别（settings.ts 的 inventory.sortOrder）、再按名字排好，
 * 同一种东西叠到一起（上锁的和没上锁的分开叠，锁跟着东西走），前面不留空格。
 */
export function sortSlots(list: (Slot | null)[], from = 0, to = list.length) {
  const order = SETTINGS.inventory.sortOrder as readonly string[];
  const rank = (id: string) => {
    const i = order.indexOf(itemInfo(id)?.type ?? '');
    return i < 0 ? order.length : i;
  };
  // 先把同一种（锁的状态也一样）的数量加起来
  const total = new Map<string, Slot>();
  for (const s of list.slice(from, to)) {
    if (!s) continue;
    const key = `${s.id}|${s.locked ? 1 : 0}`;
    const t = total.get(key);
    if (t) t.n += s.n;
    else total.set(key, { ...s });
  }
  const name = (id: string) => localName(itemInfo(id)?.name) || id;
  const sorted = [...total.values()].sort((a, b) => rank(a.id) - rank(b.id) || name(a.id).localeCompare(name(b.id), 'zh') || Number(!!a.locked) - Number(!!b.locked));
  let i = from;
  for (const s of sorted) {
    for (let left = s.n; left > 0; ) {
      const k = Math.min(left, stackMax(s.id));
      list[i++] = s.locked ? { id: s.id, n: k, locked: true } : { id: s.id, n: k };
      left -= k;
    }
  }
  while (i < to) list[i++] = null;
}

/** 能不能丢：空格、工具、上锁的都不能。返回不能丢的原因（语言文件的 key），能丢返回 null */
export function whyCantDiscard(i: number): string | null {
  const s = slotAt(i);
  if (!s) return 'bag.nothing';
  if (isTool(s.id)) return 'bag.cantDiscardTool';
  if (s.locked) return 'bag.cantDiscardLocked';
  return null;
}

export function toggleLock(i: number) {
  const s = slotAt(i);
  if (s) s.locked = !s.locked;
}

/** 旧格式（物品 id → 数量 + 工具列表）换成格子：工具先按原来的顺序放，其他东西按物品表顺序，放满工具栏再放背包 */
export function slotsFromOld(inventory: Record<string, number>, tools: string[] = []) {
  const slots = emptySlots();
  const keyItems: Record<string, number> = {};
  let i = 0;
  const put = (id: string, n: number) => {
    const max = stackMax(id);
    while (n > 0 && i < ALL_SLOTS) {
      const k = Math.min(n, max);
      slots[i++] = { id, n: k };
      n -= k;
    }
  };
  const order = [...tools.filter((id) => (inventory[id] ?? 0) > 0)];
  for (const it of ITEMS.items) if (!order.includes(it.id) && (inventory[it.id] ?? 0) > 0) order.push(it.id);
  // 物品表里没有的（理论上不会有）也放进去
  for (const id of Object.keys(inventory)) if (!order.includes(id) && (inventory[id] ?? 0) > 0) order.push(id);
  for (const id of order) {
    const n = inventory[id] ?? 0;
    if (isKeyItem(id)) keyItems[id] = n;
    else put(id, n);
  }
  return { slots, keyItems };
}
