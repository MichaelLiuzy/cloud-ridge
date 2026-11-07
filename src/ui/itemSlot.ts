/**
 * 画一格物品：图标、右下角的数量、左上角的小锁。工具栏和背包共用。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { toColor } from '../config/palette';
import { localName } from '../locales/i18n';
import { itemInfo, type Slot } from '../systems/inventory';
import { pixelText } from './pixelUi';

/** 在 (x, y) 开始、边长 size 的格子里画 slot 的东西，画出来的东西都放进 into */
export function drawItemSlot(scene: Phaser.Scene, into: Phaser.GameObjects.Container, x: number, y: number, size: number, slot: Slot | null, alpha = 1) {
  if (!slot) return;
  const ui = SETTINGS.ui;
  const key = `icon_${slot.id}`;
  const icon = scene.textures.exists(key)
    ? scene.add.image(x + size / 2, y + size / 2, key).setScale(ui.iconScale)
    : pixelText(scene, x + size / 2, y + size / 2, localName(itemInfo(slot.id)?.name).slice(0, 1)).setOrigin(0.5);
  icon.setAlpha(alpha);
  into.add(icon);
  if (slot.n > 1) {
    into.add(pixelText(scene, x + size - 1, y + size + 1, String(slot.n), { color: ui.text }).setOrigin(1, 1).setStroke(ui.panel, 3).setAlpha(alpha));
  }
  if (slot.locked) {
    const g = scene.add.graphics().setAlpha(alpha);
    drawLock(g, x + 2, y + 2);
    into.add(g);
  }
}

/** 一把 7×9 的小锁，左上角在 (x, y) */
export function drawLock(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  const ui = SETTINGS.ui;
  const dark = toColor(ui.border);
  const body = toColor(ui.toolSelected);
  // 锁环
  g.fillStyle(dark).fillRect(x + 1, y, 5, 1).fillRect(x + 1, y, 1, 4).fillRect(x + 5, y, 1, 4);
  // 锁身：深色描边 + 橘色
  g.fillStyle(dark).fillRect(x, y + 3, 7, 6);
  g.fillStyle(body).fillRect(x + 1, y + 4, 5, 4);
  // 锁孔
  g.fillStyle(dark).fillRect(x + 3, y + 5, 1, 2);
}
