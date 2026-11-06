/**
 * 玩家名字的规则：只能用汉字、英文字母和数字；按「汉字宽度」算长度。
 * 具体数字在 src/config/settings.ts 的 nameRules 里改。
 */
import { SETTINGS } from '../config/settings';
import { t } from '../locales/i18n';

/** 名字有多长：一个汉字算 cjkWidth，一个字母或数字算 latinWidth */
export function nameWidth(name: string) {
  const r = SETTINGS.nameRules;
  let w = 0;
  for (const ch of name) w += /[A-Za-z0-9]/.test(ch) ? r.latinWidth : r.cjkWidth;
  return w;
}

/** 检查名字。合格返回 null，不合格返回一句说明原因的话 */
export function checkName(name: string): string | null {
  const r = SETTINGS.nameRules;
  if (name.length === 0) return t('nameInput.errEmpty');
  if (!/^[\p{Script=Han}A-Za-z0-9]+$/u.test(name)) return t('nameInput.errChars');
  const w = nameWidth(name);
  if (w < r.minWidth) return t('nameInput.errEmpty');
  if (w > r.maxWidth) return t('nameInput.errLong', { max: r.maxWidth });
  return null;
}
