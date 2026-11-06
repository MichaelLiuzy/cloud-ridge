/**
 * 选数量的小框：往收货筐、箱子里放东西（以后店里买卖也用它）。
 *  - 一排按钮：「1 个」「一半」「全部」「－」「＋」，下面「确定」「算了」
 *  - 键盘：左右键（A D）减一 / 加一，上下键（W S）加十 / 减十，回车确定，Esc 取消
 * 位置和颜色按 320×180 的画面排，颜色在 src/config/settings.ts 的 ui 里。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { toColor } from '../config/palette';
import { t } from '../locales/i18n';
import { drawFrame, drawPanel, pixelText } from './pixelUi';

const W = 196;
const H = 76;
const BTN_H = 16;

export class QuantityPicker {
  private container: Phaser.GameObjects.Container;
  private countText: Phaser.GameObjects.Text;
  private value: number;
  private keyHandler: (e: KeyboardEvent) => void;

  /**
   * @param title 上面一行写什么（比如「放几个萝卜进收货筐？」）
   * @param max   最多能选几个
   * @param onDone 选好了调用（取消时传 null）
   */
  constructor(
    private scene: Phaser.Scene,
    title: string,
    private max: number,
    private onDone: (n: number | null) => void,
  ) {
    const ui = SETTINGS.ui;
    this.value = max;
    const x0 = Math.round((SETTINGS.gameWidth - W) / 2);
    const y0 = Math.round((SETTINGS.gameHeight - H) / 2) - 10;
    const g = scene.add.graphics();
    drawPanel(g, 0, 0, W, H);
    const parts: Phaser.GameObjects.GameObject[] = [g];
    parts.push(pixelText(scene, W / 2, 4, title, { wrap: W - 12, align: 'center' }).setOrigin(0.5, 0));
    this.countText = pixelText(scene, W / 2, 20, '').setOrigin(0.5, 0);
    parts.push(this.countText);

    // 按钮：一行快捷数量，一行确定 / 取消
    const button = (x: number, y: number, w: number, label: string, run: () => void, strong = false) => {
      const bg = scene.add.graphics();
      if (strong) bg.fillStyle(toColor(ui.highlight)).fillRect(x, y, w, BTN_H);
      drawFrame(bg, x, y, w, BTN_H, toColor(ui.border));
      const text = pixelText(scene, x + w / 2, y + 2, label).setOrigin(0.5, 0);
      const hit = scene.add.zone(x, y, w, BTN_H).setOrigin(0).setInteractive();
      hit.on('pointerdown', run);
      parts.push(bg, text, hit);
    };
    const row1 = [
      { label: t('quantity.one'), run: () => this.set(1) },
      { label: t('quantity.half'), run: () => this.set(Math.max(1, Math.floor(this.max / 2))) },
      { label: t('quantity.all'), run: () => this.set(this.max) },
      { label: '－', run: () => this.set(this.value - 1) },
      { label: '＋', run: () => this.set(this.value + 1) },
    ];
    const bw = Math.floor((W - 12 - 4 * 3) / row1.length);
    row1.forEach((b, i) => button(6 + i * (bw + 3), 36, bw, b.label, b.run));
    const half = Math.floor((W - 12 - 4) / 2);
    button(6, 56, half, t('quantity.ok'), () => this.finish(this.value), true);
    button(6 + half + 4, 56, half, t('quantity.cancel'), () => this.finish(null));

    this.container = scene.add.container(x0, y0, parts).setDepth(65);
    this.set(max);

    // 左右键加减一个（上下、回车、Esc 由界面场景转过来）
    this.keyHandler = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.set(this.value - 1);
      if (['ArrowRight', 'd', 'D'].includes(e.key)) this.set(this.value + 1);
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);
  }

  /** 上下键：加十 / 减十 */
  nudge(dir: 'up' | 'down') {
    this.set(this.value + (dir === 'up' ? 10 : -10));
  }

  confirm() {
    this.finish(this.value);
  }

  cancel() {
    this.finish(null);
  }

  private set(n: number) {
    this.value = Phaser.Math.Clamp(n, 1, this.max);
    this.countText.setText(t('quantity.count', { n: this.value, max: this.max }));
  }

  private finish(n: number | null) {
    this.destroy();
    this.onDone(n);
  }

  destroy() {
    this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.container.destroy();
  }
}
