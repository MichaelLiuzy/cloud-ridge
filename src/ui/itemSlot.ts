/**
 * 画一格物品：图标、右下角的数量、左上角的小锁、水桶底下的水量条。工具栏和背包共用。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { PALETTE, toColor } from '../config/palette';
import { TIME } from '../data/time';
import { gameState } from '../systems/GameState';
import { localName } from '../locales/i18n';
import { itemInfo, type Slot } from '../systems/inventory';
import { artIcon, pixelText } from './pixelUi';

/** 在 (x, y) 开始、边长 size 的格子里画 slot 的东西，画出来的东西都放进 into */
export function drawItemSlot(scene: Phaser.Scene, into: Phaser.GameObjects.Container, x: number, y: number, size: number, slot: Slot | null, alpha = 1) {
  if (!slot) return;
  const ui = SETTINGS.ui;
  const key = `icon_${slot.id}`;
  const icon = scene.textures.exists(key)
    ? scene.add.image(x + size / 2, y + size / 2, key).setScale(size >= 16 * ui.iconScale ? ui.iconScale : 1) // 格子太小（开着箱子时）就按原大小画
    : pixelText(scene, x + size / 2, y + size / 2, localName(itemInfo(slot.id)?.name).slice(0, 1)).setOrigin(0.5);
  icon.setAlpha(alpha);
  into.add(icon);
  if (slot.n > 1) {
    into.add(pixelText(scene, x + size - 1, y + size + 1, String(slot.n), { color: ui.text }).setOrigin(1, 1).setStroke(ui.panel, 3).setAlpha(alpha));
  }
  // 水桶：底下一条小水量条
  if (slot.id === 'bucket') {
    const full = TIME.stamina.bucket.capacity;
    const bar = scene.add.graphics().setAlpha(alpha);
    bar.fillStyle(toColor(ui.border)).fillRect(x + 2, y + size - 3, size - 4, 2);
    bar.fillStyle(toColor(PALETTE.teal)).fillRect(x + 2, y + size - 3, Math.round(((size - 4) * gameState.water) / full), 2);
    into.add(bar);
  }
  if (slot.locked) {
    const g = scene.add.graphics().setAlpha(alpha);
    const art = drawLock(g, x + 2, y + 2);
    into.add(art ? [g, art] : g);
  }
}

/** 一把 7×9 的小锁，左上角在 (x, y) */
export function drawLock(g: Phaser.GameObjects.Graphics, x: number, y: number) {
  // 有锁的图标就用图：返回这张图，调用的地方和 g 放在一起
  const art = artIcon(g.scene, 'icon_lock', x + 3.5, y + 4.5);
  if (art) return art.setAlpha(g.alpha);
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
  return null;
}
