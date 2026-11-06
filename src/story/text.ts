/**
 * 剧本和线索里的文字处理：
 *  - @fan、@zhou 这种写法换成语言文件里的名字（src/locales/zh.ts 的 names）
 *  - <<clue:线索id=显示的字>> 拆出来，标成黄字并给线索
 */
import { t } from '../locales/i18n';
import { gameState } from '../systems/GameState';

/** 把 @名字id 换成真名字；@player 换成玩家名字 */
export function fillNames(text: string): string {
  // 「@fan 说」里名字后面那个空格只是写剧本时隔开用的：后面跟着中文时去掉
  return text.replace(/@([a-z_]+)(?: (?=[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]))?/g, (whole, id: string) => {
    if (id === 'player') return gameState.playerName || t('names.playerUnknown');
    const name = t(`names.${id}`);
    return name === `names.${id}` ? whole : name;
  });
}

/** 一段文字：普通字，或者带线索的黄字 */
export interface TextPiece {
  text: string;
  clue?: string;
}

/** 把一句台词拆成几段：<<clue:id=字>> 变成带 clue 的一段，其他是普通字 */
export function parseClueMarks(line: string): TextPiece[] {
  const out: TextPiece[] = [];
  const re = /<<clue:([a-z0-9_]+)=([^>]*)>>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index) });
    out.push({ text: m[2], clue: m[1] });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out.map((p) => ({ ...p, text: fillNames(p.text) }));
}
