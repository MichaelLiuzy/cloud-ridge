/**
 * 设置菜单（右上角齿轮 / M 键 / Esc）里有哪些项目，从上往下排。
 * ================================================================
 *  想加一项：在下面加一行，名字写进语言文件 src/locales/zh.ts 的 settings.items。
 *  kind（是哪种项目）：
 *    choice  几个选项里挑一个（左右键切换），存在这台设备上；pref 是存的名字，options 是选项
 *    toggle  开 / 关
 *    number  数字，min ~ max，每次加减 step；unit 是后面的单位（语言文件里的名字）
 *    slider  滑块 0 ~ 100（音量）
 *    action  点一下做一件事（改名字、导出存档……）
 *  pref 的默认值在 src/config/settings.ts 的 prefsDefaults。
 */
import type { Prefs } from '../systems/prefs';

export type SettingItem =
  | { id: string; kind: 'choice'; pref: keyof Prefs; options: string[] }
  | { id: string; kind: 'toggle'; pref: keyof Prefs }
  | { id: string; kind: 'number'; pref: keyof Prefs; min: number; max: number; step: number; unit: string }
  | { id: string; kind: 'slider'; pref: keyof Prefs }
  | { id: string; kind: 'action'; debugOnly?: boolean };

export const SETTINGS_MENU: SettingItem[] = [
  { id: 'rename', kind: 'action' },
  { id: 'textSpeed', kind: 'choice', pref: 'textSpeed', options: ['slow', 'medium', 'fast', 'instant'] },
  { id: 'autoAdvance', kind: 'toggle', pref: 'autoAdvance' },
  { id: 'autoAdvanceSec', kind: 'number', pref: 'autoAdvanceSec', min: 2, max: 10, step: 1, unit: 'settings.seconds' },
  { id: 'uiSize', kind: 'choice', pref: 'uiSize', options: ['small', 'medium', 'large'] },
  { id: 'musicVolume', kind: 'slider', pref: 'musicVolume' },
  { id: 'sfxVolume', kind: 'slider', pref: 'sfxVolume' },
  { id: 'controls', kind: 'action' },
  { id: 'export', kind: 'action' },
  { id: 'import', kind: 'action' },
  { id: 'backToTitle', kind: 'action' },
  // 测试用（src/config/settings.ts 的 debugMenu 改成 false 就不显示）
  { id: 'debug', kind: 'action', debugOnly: true },
];
