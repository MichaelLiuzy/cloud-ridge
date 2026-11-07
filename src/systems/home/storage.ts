/**
 * 草棚（以后的柴房）里的储物箱：和背包一样一格一格放（gameState.storage）。
 *  - 每页 6 行 × 9 格（settings.ts 的 inventory.chestRows / chestCols），最后一页放满了自动加一页，页数不限。
 *  - 每格叠放上限和背包一样（inventory.stackMax）。工具和重要物品不能放进来（inventory.ts 的 canStore）。
 *  - 箱子格子在 inventory.ts 里编号从 36 起，所以拖动、丢弃、上锁都用背包那一套函数。
 * 草棚改成柴房时，箱子和里面的东西原样留着。
 */
import { SETTINGS } from '../../config/settings';
import { gameState } from '../GameState';
import { ALL_SLOTS, TOOLBAR_SLOTS, canStore, moveSlot, slotAt, stackMax, type Slot } from '../inventory';

/** 箱子一页几格 */
export const CHEST_PAGE = SETTINGS.inventory.chestRows * SETTINGS.inventory.chestCols;

/** 让箱子正好是整页：至少一页；最后一页满了就加一页；最后多出来的空页去掉（留一页空的） */
export function normalizeChest() {
  const c = gameState.storage;
  while (c.length % CHEST_PAGE !== 0 || c.length === 0) c.push(null);
  while (c.length > CHEST_PAGE && c.slice(-2 * CHEST_PAGE).every((s) => !s)) c.length -= CHEST_PAGE;
  if (c.slice(-CHEST_PAGE).every(Boolean)) c.push(...Array<Slot | null>(CHEST_PAGE).fill(null));
}

/**
 * 把第 from 格（背包或箱子）整格搬到另一边：先叠到同一种的格子上，再放空格。
 * 搬去背包时先放下面 27 格，再放工具栏。返回搬了几个。
 */
export function transferSlot(from: number) {
  const s = slotAt(from);
  if (!s || !canStore(s.id)) return 0;
  const toChest = from < ALL_SLOTS;
  if (toChest) normalizeChest();
  const n0 = s.n;
  const targets = toChest
    ? gameState.storage.map((_, k) => ALL_SLOTS + k)
    : [...Array(ALL_SLOTS).keys()].slice(TOOLBAR_SLOTS).concat([...Array(TOOLBAR_SLOTS).keys()]);
  // 先叠，后放空格
  for (const pass of ['stack', 'empty']) {
    for (const to of targets) {
      const t = slotAt(from);
      if (!t) break;
      const d = slotAt(to);
      if (pass === 'stack' ? d?.id === t.id && d.n < stackMax(t.id) : !d) moveSlot(from, to);
    }
  }
  normalizeChest();
  return n0 - (slotAt(from)?.n ?? 0);
}

/** 旧存档里的箱子（物品 id → 数量）换成格子：按原顺序放，超过叠放上限的拆成几格 */
export function chestFromOld(old: Record<string, number>) {
  const list: (Slot | null)[] = [];
  for (const [id, n] of Object.entries(old)) {
    for (let left = n; left > 0; ) {
      const k = Math.min(left, SETTINGS.inventory.stackMax);
      list.push({ id, n: k });
      left -= k;
    }
  }
  return list;
}
