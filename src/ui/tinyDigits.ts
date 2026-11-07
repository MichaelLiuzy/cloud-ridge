/**
 * 小铜钱图标（时辰框里钱数前面那个）。
 */
import Phaser from 'phaser';

/** 5×5 的小铜钱（外圆内方），左上角在 (x, y) */
export function drawCoin(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
  g.fillStyle(color);
  g.fillRect(x + 1, y, 3, 1).fillRect(x + 1, y + 4, 3, 1).fillRect(x, y + 1, 1, 3).fillRect(x + 4, y + 1, 1, 3);
  g.fillRect(x + 1, y + 1, 3, 1).fillRect(x + 1, y + 3, 3, 1).fillRect(x + 1, y + 2, 1, 1).fillRect(x + 3, y + 2, 1, 1);
}
