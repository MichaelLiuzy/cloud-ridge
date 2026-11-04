/**
 * 小菜单（一列选项）：床边菜单、点东西弹出的菜单、标题画面、存档位选择都用它。
 *  - 键盘：上下键（或 W S）选，回车确认，Esc 取消
 *  - 鼠标 / 手指：直接点选项
 * 颜色在 src/config/settings.ts 的 colors 里（dialogBg、menuHighlight）。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { font } from '../locales/i18n';

export interface MenuOption {
  label: string;
  run: () => void;
  /** 灰掉、不能选（比如空的存档位不能「继续」） */
  disabled?: boolean;
}

export class ListMenu {
  container: Phaser.GameObjects.Container;
  private rows: Phaser.GameObjects.Rectangle[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private index = 0;
  private keyHandler?: (e: KeyboardEvent) => void;

  /**
   * @param title   菜单上方的标题（可以不写）
   * @param ownKeys true = 菜单自己听键盘（标题画面用）；false = 由别人调用 move / choose
   */
  constructor(
    private scene: Phaser.Scene,
    private options: MenuOption[],
    opts: { title?: string; width?: number; ownKeys?: boolean; onCancel?: () => void } = {},
  ) {
    const res = window.devicePixelRatio || 1;
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const rowH = touch ? 44 : 38;
    const w = opts.width ?? 200;
    const items: Phaser.GameObjects.GameObject[] = [];
    let top = 0;
    if (opts.title) {
      const title = scene.add
        .text(w / 2, 0, opts.title, { fontFamily: font(), fontSize: '18px', color: SETTINGS.colors.hudText, align: 'center', wordWrap: { width: w + 120 } })
        .setOrigin(0.5, 0)
        .setResolution(res);
      items.push(title);
      top = title.height + 10;
    }
    options.forEach((opt, i) => {
      const y = top + i * rowH;
      const row = scene.add.rectangle(0, y, w, rowH, SETTINGS.colors.dialogBg, 0.95).setOrigin(0).setStrokeStyle(1, 0xc9a86a, 0.5);
      row.setInteractive().on('pointerdown', () => this.choose(i));
      row.on('pointerover', () => this.highlight(i));
      const label = scene.add
        .text(16, y + rowH / 2, opt.label, { fontFamily: font(), fontSize: '17px', color: SETTINGS.colors.dialogText })
        .setOrigin(0, 0.5)
        .setResolution(res)
        .setAlpha(opt.disabled ? 0.4 : 1);
      items.push(row, label);
      this.rows.push(row);
      this.labels.push(label);
    });
    this.container = scene.add.container(0, 0, items).setDepth(60);
    this.container.setSize(w, top + options.length * rowH);
    this.highlight(Math.max(0, options.findIndex((o) => !o.disabled)));

    if (opts.ownKeys) {
      const has = (names: string[], e: KeyboardEvent) =>
        names.some((n) => (Phaser.Input.Keyboard.KeyCodes as Record<string, number>)[n] === e.keyCode);
      this.keyHandler = (e: KeyboardEvent) => {
        if (has(SETTINGS.keys.up, e)) this.move(-1);
        else if (has(SETTINGS.keys.down, e)) this.move(1);
        else if (has(SETTINGS.keys.action, e)) this.choose(this.index);
        else if (has(SETTINGS.keys.cancel, e)) opts.onCancel?.();
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
    this.rows.forEach((r, j) => r.setFillStyle(j === i ? SETTINGS.colors.menuHighlight : SETTINGS.colors.dialogBg, 0.95));
  }

  destroy() {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.container.destroy();
  }
}
