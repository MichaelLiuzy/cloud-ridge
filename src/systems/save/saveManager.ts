/**
 * 存档管理：3 个存档位 + 1 份「临时进度」。
 *  - 存档位 1~3：睡觉时自动存；白天在床边选「存档（不睡）」也会存。
 *  - 临时进度：游戏切到后台（切 app、锁屏、关网页）时自动存一份，
 *    下次打开时会问要不要接着玩。它和存档位分开，不会覆盖你的正式存档。
 *  - 导出 / 导入：把存档变成一个文件，可以备份、换设备。
 */
import { storage } from './storage';
import { migrate, type SaveData } from './saveFormat';

export const SLOT_COUNT = 3;
const slotKey = (n: number) => `slot${n}`;
const TEMP_KEY = 'temp';

async function read(key: string): Promise<SaveData | null> {
  const text = await storage.get(key);
  if (!text) return null;
  try {
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
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
export function parseImport(text: string): SaveData | null {
  try {
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
}
