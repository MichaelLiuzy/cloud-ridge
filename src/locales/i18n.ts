/**
 * 多语言工具。
 * 游戏里所有玩家能看到的字，都通过 t('某个名字') 从语言文件里取，
 * 代码里不直接写中文。以后加英文版：复制 zh.ts 改名 en.ts 翻译（类型写成 LocaleStrings，
 * 这样漏翻会报错），在下面 LANGUAGES 里加一行即可。
 */
import { zh } from './zh';

type Dict = { [key: string]: string | Dict };

/** 每种语言：文字表 + 用什么字体 */
const LANGUAGES: Record<string, { dict: Dict; font: string }> = {
  zh: {
    dict: zh as unknown as Dict,
    // 中文用系统自带字体：Mac/iPhone 是苹方，Windows 是微软雅黑
    font: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  },
  // en: { dict: en as unknown as Dict, font: '"Georgia", serif' },
};

/** 当前语言。以后可以从设置菜单里切换。 */
let current = 'zh';

export function setLanguage(lang: string) {
  if (LANGUAGES[lang]) current = lang;
}
export function getLanguage() {
  return current;
}

/** 当前语言用的字体 */
export function font() {
  return LANGUAGES[current].font;
}

/**
 * 取一句话。key 用点号分层，例如 t('hint.rock')。
 * params 用来替换 {xxx}，例如 t('hud.date', { day: 3 })。
 * 找不到时直接显示 key，方便发现漏写的字。
 */
export function t(key: string, params: Record<string, string | number> = {}): string {
  let node: string | Dict | undefined = LANGUAGES[current].dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return key;
    node = node[part];
  }
  if (typeof node !== 'string') return key;
  return node.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}

/**
 * 数据表（src/data/*.ts）里的名字写成 { "zh": "小白菜", "en": "Bok choy" }，
 * 用这个函数取当前语言的那个。
 */
export function localName(name: { zh: string; en?: string } | undefined): string {
  if (!name) return '';
  const v = (name as Record<string, string | undefined>)[current];
  return v || name.zh;
}
