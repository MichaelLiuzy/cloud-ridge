/**
 * 多种颜色混排的文字（对话里的黄字要用）：自己量字宽、自己换行，每段同色的字是一个文字对象。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { font } from '../locales/i18n';
import { pixelText } from './pixelUi';

/** 一段同样样子的字。mark = 黄字背后垫一块深色，免得在米白底上看不清 */
export interface Run {
  text: string;
  color: string;
  mark?: string;
}

let ctx: CanvasRenderingContext2D | null = null;
function measure(text: string) {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * SETTINGS.fontSize;
  ctx.font = `${SETTINGS.fontSize}px ${font()}`;
  return ctx.measureText(text).width;
}

/** 不能放在行首的标点：碰到行尾时让它挂在上一行末尾（中文排版的规矩） */
const NO_LINE_START = '，。、！？；：」』）》〉…—,.!?;:)';

/** 按宽度换行，返回每一行的几段字 */
export function wrapRuns(runs: Run[], width: number): Run[][] {
  const lines: Run[][] = [[]];
  let x = 0;
  for (const run of runs) {
    for (const ch of run.text) {
      if (ch === '\n') {
        lines.push([]);
        x = 0;
        continue;
      }
      const w = measure(ch);
      if (x + w > width && x > 0 && !NO_LINE_START.includes(ch)) {
        lines.push([]);
        x = 0;
      }
      const line = lines[lines.length - 1];
      const last = line[line.length - 1];
      if (last && last.color === run.color && last.mark === run.mark) last.text += ch;
      else line.push({ ...run, text: ch });
      x += w;
    }
  }
  return lines.filter((l, i) => l.length > 0 || i < lines.length - 1);
}

/** 一种颜色的一段字按宽度换行，返回每一行的字 */
export function wrapText(text: string, width: number): string[] {
  return wrapRuns([{ text, color: '' }], width).map((line) => line.map((r) => r.text).join(''));
}

/** 把几行字画出来，返回画出来的所有东西（方便一起删） */
export function drawLines(scene: Phaser.Scene, lines: Run[][], x: number, y: number, lineH: number, align: 'left' | 'center' = 'left', width = 0) {
  const objs: Phaser.GameObjects.GameObject[] = [];
  lines.forEach((line, i) => {
    const total = line.reduce((w, r) => w + measure(r.text), 0);
    let cx = align === 'center' ? x + Math.round((width - total) / 2) : x;
    for (const run of line) {
      const w = Math.ceil(measure(run.text));
      if (run.mark) objs.push(scene.add.rectangle(cx - 1, y + i * lineH - 1, w + 2, lineH, Phaser.Display.Color.HexStringToColor(run.mark).color).setOrigin(0));
      objs.push(pixelText(scene, cx, y + i * lineH, run.text, { color: run.color }));
      cx += w;
    }
  });
  return objs;
}
