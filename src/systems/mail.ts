/**
 * 信箱（信的内容和寄到的条件在 src/data/letters.ts）：
 *  - 每天早上 6 点 deliverMail()：条件满足、还没寄过的信放进信箱（新信排最上面）；
 *  - 打开信箱读信、点「收下」拿附件（takeAttachments）：背包放不下的留在信里，不会丢。
 */
import { LETTERS, type Letter } from '../data/letters';
import { gameState } from './GameState';
import { addItem } from './inventory';
import { chapterStarted, eventHappened } from './story/notebook';

/** 信箱里的一封信：哪封、哪天到的、读过没有、还没收下的附件 */
export interface MailEntry {
  id: string;
  month: number;
  day: number;
  read: boolean;
  items: Record<string, number>;
  money: number;
  /** 信里要填的数（比如晕倒收了多少钱 {fee}） */
  params?: Record<string, number>;
}

export function letterInfo(id: string) {
  return LETTERS.find((l) => l.id === id);
}

/** 这封信今天能不能寄到 */
function ready(l: Letter) {
  const w = l.when;
  const c = gameState.clock!;
  if (l.debugOnly) return false;
  if (w.date && c.month * 100 + c.day < w.date.month * 100 + w.date.day) return false;
  if (w.houseStage !== undefined && gameState.houseStage < w.houseStage) return false;
  if (w.pickup && !gameState.pickup.unlocked) return false;
  if (w.event && !eventHappened(w.event)) return false;
  if (w.affection && (gameState.affection[w.affection.npc] ?? 0) < w.affection.points) return false;
  if (w.chapter && !chapterStarted(w.chapter)) return false;
  const fee = gameState.faintFee;
  if (w.fainted && (fee === null || (w.fainted === 'paid') !== fee > 0)) return false;
  return true;
}

/** 放一封信进信箱（不管条件；测试菜单也用它） */
export function sendLetter(id: string) {
  const l = letterInfo(id);
  const c = gameState.clock!;
  if (!l) return;
  const params = l.when.fainted ? { fee: gameState.faintFee ?? 0 } : undefined;
  gameState.mail.unshift({ id, month: c.month, day: c.day, read: false, items: { ...l.items }, money: l.money ?? 0, params });
  if (!l.debugOnly && !l.repeat) gameState.mailSent.push(id);
}

/** 早上 6 点：寄到了几封新信 */
export function deliverMail() {
  const due = LETTERS.filter((l) => !gameState.mailSent.includes(l.id) && ready(l));
  for (const l of due) sendLetter(l.id);
  return due.length;
}

export function hasUnreadMail() {
  return gameState.mail.some((m) => !m.read);
}

/** 收下附件：放得下的放进背包，钱加到身上。返回收下了什么（物品 id → 数量，钱记在 money）、是不是还有没收下的 */
export function takeAttachments(m: MailEntry) {
  const got: Record<string, number> = {};
  for (const [id, n] of Object.entries(m.items)) {
    const k = addItem(id, n);
    if (k > 0) got[id] = k;
    if (k >= n) delete m.items[id];
    else m.items[id] = n - k;
  }
  const money = m.money;
  gameState.cash += money; // 别人送的钱，不算进每周总结的收入
  m.money = 0;
  return { got, money, left: Object.keys(m.items).length > 0 };
}
