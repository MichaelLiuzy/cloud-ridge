/**
 * 存档管理：3 个存档位 + 1 份「临时进度」。
 *  - 存档位 1~3：睡觉时自动存；白天在床边选「存档（不睡）」也会存。
 *  - 临时进度：游戏切到后台（切 app、锁屏、关网页）时自动存一份，
 *    下次打开时会问要不要接着玩。它和存档位分开，不会覆盖你的正式存档。
 *  - 导出 / 导入：把存档变成一个文件，可以备份、换设备。
 */
import { storage } from './storage';
import { migrate, type SaveData } from './saveFormat';
import { describeClock } from '../Clock';
import { dayName, monthName, weekNumber } from '../days';
import { CHAPTERS } from '../../data/clues';
import { localName, t } from '../../locales/i18n';
import { fillNames } from '../../story/text';

export const SLOT_COUNT = 3;
const slotKey = (n: number) => `slot${n}`;
const TEMP_KEY = 'temp';

async function read(key: string): Promise<SaveData | null> {
  const text = await storage.get(key);
  return text ? parseImport(text) : null;
}

export async function saveToSlot(data: SaveData) {
  await storage.set(slotKey(data.slot), JSON.stringify(data));
}

export function loadSlot(n: number) {
  return read(slotKey(n));
}

/** 三个存档位现在的情况（空的是 null） */
export async function listSlots(): Promise<(SaveData | null)[]> {
  const out: (SaveData | null)[] = [];
  for (let i = 1; i <= SLOT_COUNT; i++) out.push(await loadSlot(i));
  return out;
}

/** 删掉一个存档位（删了就没了） */
export async function deleteSlot(n: number) {
  await storage.remove(slotKey(n));
}

export async function saveTemp(data: SaveData) {
  await storage.set(TEMP_KEY, JSON.stringify(data));
}
export function loadTemp() {
  return read(TEMP_KEY);
}
export async function clearTemp() {
  await storage.remove(TEMP_KEY);
}

/** 导出：返回文件名和文件内容 */
export function exportText(data: SaveData) {
  const d = new Date(data.savedAt);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return { filename: `cloud-ridge-save${data.slot}-${stamp}.json`, text: JSON.stringify(data, null, 2) };
}

/** 导入：读文件内容，升级到最新版本。认不出来返回 null。 */
/** 存档位那一行字：「存档 1：正月十八 午时 · 500 文」，空的是「存档 1：（空）」 */
export function slotLabel(save: SaveData | null, n: number) {
  return save ? t('title.slotFull', { n, ...describeClock(save.clock), cash: save.cash }) : t('title.slotEmpty', { n });
}

/**
 * 「查看存档」里一个存档的两行摘要（直接从存档里读，不用进游戏）：
 * 「存档1　阿木　正月十六 · 第 1 周　500 文」/「序章：醒来　玩了 3 小时 25 分　11月7日 14:30 存」
 * which = 「存档1」或「临时进度」
 */
export function saveSummary(save: SaveData, which: string) {
  const { month, day } = save.clock;
  const mins = Math.floor((save.playMs ?? 0) / 60000);
  const play = mins >= 60 ? t('title.playHours', { h: Math.floor(mins / 60), m: mins % 60 }) : t('title.playMinutes', { m: mins });
  const chapter = Object.values(CHAPTERS).find((c) => c.number === save.chapter);
  const at = new Date(save.savedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return t('title.summary', {
    which,
    name: save.playerName || t('names.playerUnknown'),
    date: t('hud.shortDate', { month: monthName(month), day: dayName(day) }),
    week: weekNumber(month, day),
    cash: save.cash,
    chapter: chapter ? fillNames(localName(chapter.name)) : '',
    play,
    saved: t('title.savedAt', { mo: at.getMonth() + 1, d: at.getDate(), time: `${pad(at.getHours())}:${pad(at.getMinutes())}` }),
  });
}

export function parseImport(text: string): SaveData | null {
  try {
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
}
