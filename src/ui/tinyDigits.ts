/**
 * 迷你数字（每个 3×5 像素）和一枚小铜钱图标：时辰框里写钱数用。
 * 中文像素字体不能再缩小（会看不清），阿拉伯数字可以，这样时辰框能省出一整行。
 */
import Phaser from 'phaser';

/** 0~9 每个数字 5 行，每行 3 位：1 = 涂色 */
const GLYPHS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};

/** 一个数字多宽（含后面 1 像素空隙） */
export const TINY_DIGIT_W = 4;
export const TINY_DIGIT_H = 5;

/** 在 (x, y)（左上角）写一串数字，返回写了多宽 */
export function drawTinyNumber(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number, color: number) {
  const s = String(Math.max(0, Math.floor(n)));
  g.fillStyle(color);
  [...s].forEach((ch, i) => {
    GLYPHS[ch]?.forEach((row, ry) => {
      [...row].forEach((bit, rx) => bit === '1' && g.fillRect(x + i * TINY_DIGIT_W + rx, y + ry, 1, 1));
    });
  });
  return s.length * TINY_DIGIT_W - 1;
}

/** 5×5 的小铜钱（外圆内方），左上角在 (x, y) */
export function drawCoin(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
  g.fillStyle(color);
  g.fillRect(x + 1, y, 3, 1).fillRect(x + 1, y + 4, 3, 1).fillRect(x, y + 1, 1, 3).fillRect(x + 4, y + 1, 1, 3);
  g.fillRect(x + 1, y + 1, 3, 1).fillRect(x + 1, y + 3, 3, 1).fillRect(x + 1, y + 2, 1, 1).fillRect(x + 3, y + 2, 1, 1);
}
