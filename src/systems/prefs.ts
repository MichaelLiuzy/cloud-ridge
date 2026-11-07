/**
 * 这台设备上的偏好设置（文字速度、音量、界面大小……）。
 * 存在浏览器的 localStorage 里，不放进存档：换存档位、读档都不会变。
 * 每一项的默认值在 src/config/settings.ts 的 prefsDefaults；设置菜单里有哪些项目见 src/data/settingsMenu.ts。
 */
import { SETTINGS } from '../config/settings';

export type UiSize = 'small' | 'medium' | 'large';
export type TextSpeed = 'slow' | 'medium' | 'fast' | 'instant';

export interface Prefs {
  /** 界面大小 */
  uiSize: UiSize;
  /** 对话逐字出现的速度 */
  textSpeed: TextSpeed;
  /** 过场自动翻页开不开 */
  autoAdvance: boolean;
  /** 过场自动翻页等几秒 */
  autoAdvanceSec: number;
  /** 音乐、音效音量：0 ~ 100 */
  musicVolume: number;
  sfxVolume: number;
  /** 左上角时辰框收起来了没有 */
  infoFolded: boolean;
}

const KEY = 'cloud-ridge-prefs';
let cache: Prefs | null = null;

export function loadPrefs(): Prefs {
  if (cache) return cache;
  let saved: Partial<Prefs> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    // 私密模式等情况读不到，就用默认值
  }
  cache = { ...(SETTINGS.prefsDefaults as Prefs), ...saved };
  return cache;
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  const p = loadPrefs();
  p[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // 存不了也不影响这次玩
  }
}
