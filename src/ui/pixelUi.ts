/**
 * 像素界面的小工具：画框、写字。对话框、物品栏、时辰框、小菜单都用它，样子统一。
 * 颜色在 src/config/settings.ts 的 ui 里改。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { toColor } from '../config/palette';
import { font, titleFont } from '../locales/i18n';
import { VIEW } from '../config/view';

/**
 * 画一个界面框：最外 1 像素深色边，里面一圈旧纸色，再里面是米白底。
 * 画在 g 上，(x, y) 是左上角。
 */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
  const ui = SETTINGS.ui;
  g.fillStyle(toColor(ui.border)).fillRect(x, y, w, h);
  g.fillStyle(toColor(ui.innerBorder)).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(toColor(ui.panel)).fillRect(x + 2, y + 2, w - 4, h - 4);
}

/**
 * 写一行（或几行）字。color 不写就是框里的深色字；title = 用标题字体（粗体、标题字号）。
 * 字不是像素字：按屏幕真实像素（世界层倍数，界面里最大的放大倍数）画，再平滑缩放，所以不会有锯齿。
 */
export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: { color?: string; wrap?: number; align?: 'left' | 'center' | 'right'; size?: number; title?: boolean } = {},
) {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: opts.title ? titleFont() : font(),
    fontSize: `${opts.size ?? (opts.title ? SETTINGS.titleFontSize : SETTINGS.fontSize)}px`,
    resolution: VIEW.world,
    color: opts.color ?? SETTINGS.ui.text,
    align: opts.align ?? 'left',
    lineSpacing: 2,
  };
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
  const obj = scene.add.text(Math.round(x), Math.round(y), text, style);
  obj.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return obj;
}

/** 画一个 1 像素粗的空心方框（不用 strokeRect，免得线落在半个像素上变糊） */
export function drawFrame(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
  g.fillStyle(color);
  g.fillRect(x, y, w, 1).fillRect(x, y + h - 1, w, 1).fillRect(x, y, 1, h).fillRect(x + w - 1, y, 1, h);
}

/**
 * 界面小图标（齿轮、钱袋、体力、锁、背包）：art_raw 里有 icons_ui 的图就用图，返回这张图；
 * 没有图返回 null，调用的地方接着用代码画的。scale 0.5 = 16×16 的图在界面上占 8 格（屏幕上正好是原图像素）。
 */
export function artIcon(scene: Phaser.Scene, key: string, x: number, y: number, scale = 0.5) {
  return scene.textures.exists(key) ? scene.add.image(x, y, key).setScale(scale) : null;
}
