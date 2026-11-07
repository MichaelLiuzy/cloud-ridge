/**
 * 小菜单（一列选项）：床边菜单、点东西弹出的菜单、标题画面、存档位选择都用它。
 *  - 键盘：上下键（或 W S）选，回车确认，Esc 取消
 *  - 鼠标 / 手指：直接点选项
 * 样子（框、颜色）在 src/config/settings.ts 的 ui 里改。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { keyIs } from '../input/Controls';
import { toColor } from '../config/palette';
import { drawPanel, pixelText } from './pixelUi';

export interface MenuOption {
  label: string;
  run: () => void;
  /** 灰掉、不能选（比如空的存档位不能「继续」） */
  disabled?: boolean;
}

/** 每一行多高、框的内边距（像素，界面像素，界面层大约 640×360） */
const ROW_H = 16;
const PAD = 4;

export class ListMenu {
  container: Phaser.GameObjects.Container;
  private rows: Phaser.GameObjects.Rectangle[] = [];
  private index = 0;
  private keyHandler?: (e: KeyboardEvent) => void;

  /**
   * @param title   菜单上方的标题（可以不写）
   * @param width   菜单宽度（像素）；不写就按最长的选项自动定
   * @param ownKeys true = 菜单自己听键盘（标题画面用）；false = 由别人调用 move / choose
   */
  constructor(
    private scene: Phaser.Scene,
    private options: MenuOption[],
    opts: { title?: string; width?: number; ownKeys?: boolean; onCancel?: () => void } = {},
  ) {
    const ui = SETTINGS.ui;
    // 最宽不超过这个场景的画面（界面层大约 640，标题画面 320）
    const cam = scene.cameras.main;
    const maxW = Math.floor(cam.width / cam.zoom) - 16;
    // 先把字写出来，量一下多宽
    const labels = options.map((opt) => pixelText(scene, 0, 0, opt.label, { color: opt.disabled ? ui.textDim : ui.text }));
    let widest = Math.max(0, ...labels.map((l) => l.width));
    if (opts.title) {
      // 标题尽量一行放下（太长了才换行）
      const probe = pixelText(scene, 0, 0, opts.title, { title: true });
      widest = Math.max(widest, probe.width - 4);
      probe.destroy();
    }
    const w = Math.min(maxW, Math.max(opts.width ?? 0, Math.ceil(widest) + PAD * 2 + 8));
    let top = PAD;
    const items: Phaser.GameObjects.GameObject[] = [];
    const bg = scene.add.graphics();
    items.push(bg);
    let titleText: Phaser.GameObjects.Text | undefined;
    if (opts.title) {
      titleText = pixelText(scene, w / 2, top, opts.title, { wrap: w - PAD * 2 - 4, align: 'center', title: true }).setOrigin(0.5, 0);
      top += Math.ceil(titleText.height) + 3;
    }
    // 每行至少 ROW_H 高；选项写了两行字（比如「查看存档」）就跟着变高
    let y = top;
    options.forEach((_, i) => {
      const rowH = Math.max(ROW_H, Math.ceil(labels[i].height) + 4);
      const row = scene.add.rectangle(PAD, y, w - PAD * 2, rowH, toColor(ui.highlight), 0).setOrigin(0);
      row.setInteractive().on('pointerdown', () => this.choose(i));
      row.on('pointerover', () => this.highlight(i));
      labels[i].setPosition(PAD + 4, Math.round(y + (rowH - labels[i].height) / 2));
      items.push(row, labels[i]);
      this.rows.push(row);
      y += rowH;
    });
    const h = y + PAD;
    drawPanel(bg, 0, 0, w, h);
    if (titleText) {
      items.push(titleText);
      // 标题和选项之间画一条细线
      bg.fillStyle(toColor(ui.innerBorder)).fillRect(PAD, top - 2, w - PAD * 2, 1);
    }
    this.container = scene.add.container(0, 0, items).setDepth(60);
    this.container.setSize(w, h);
    this.highlight(Math.max(0, options.findIndex((o) => !o.disabled)));

    if (opts.ownKeys) {
      this.keyHandler = (e: KeyboardEvent) => {
        if (keyIs(SETTINGS.keys.up, e)) this.move(-1);
        else if (keyIs(SETTINGS.keys.down, e)) this.move(1);
        else if (keyIs(SETTINGS.keys.action, e)) this.choose(this.index);
        else if (keyIs(SETTINGS.keys.cancel, e)) opts.onCancel?.();
      };
      scene.input.keyboard?.on('keydown', this.keyHandler);
    }
  }

  /** 把菜单放在某个位置（中心点） */
  centerAt(x: number, y: number) {
    this.container.setPosition(Math.round(x - this.container.width / 2), Math.round(y - this.container.height / 2));
    return this;
  }

  move(step: number) {
    const n = this.options.length;
    let i = this.index;
    for (let k = 0; k < n; k++) {
      i = (i + step + n) % n;
      if (!this.options[i].disabled) break;
    }
    this.highlight(i);
  }

  choose(i = this.index) {
    const opt = this.options[i];
    if (!opt || opt.disabled) return;
    opt.run();
  }

  private highlight(i: number) {
    this.index = i;
    this.rows.forEach((r, j) => r.setFillStyle(toColor(SETTINGS.ui.highlight), j === i ? 1 : 0));
  }

  destroy() {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.container.destroy();
  }
}
