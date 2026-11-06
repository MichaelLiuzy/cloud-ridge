/**
 * 27 色调色板（美术规范；2026-11-06 加了肤色阶，从 24 色扩成 27 色）。颜色本身写在 palette.json 里，整理脚本和游戏共用同一份。
 * 用法：PALETTE.leaf → '#6F8A4C'；toColor('#6F8A4C') → 0x6f8a4c（Phaser 画图要这种数字）
 */
import paletteFile from './palette.json';

export type PaletteName = keyof typeof paletteFile.colors;
export const PALETTE: Record<PaletteName, string> = paletteFile.colors;

/** '#RRGGBB' → 0xRRGGBB */
export function toColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
