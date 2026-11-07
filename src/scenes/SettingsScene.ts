/**
 * 设置面板（右上角齿轮、M 键、Esc 打开）。
 *  - 项目列表在 src/data/settingsMenu.ts，名字在语言文件的 settings 里。
 *  - 上下键选，左右键改；回车 / 空格做事；Esc 或 M 关。鼠标、手指直接点：点左半边减、右半边加。
 *  - 打开时游戏时间暂停。文字速度、音量、界面大小这些存在这台设备上（src/systems/prefs.ts），不放进存档。
 *  - 改名字、导出存档、回标题、测试菜单要界面配合：关掉设置，发 SETTINGS_EVENTS.action 给界面场景。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { toColor } from '../config/palette';
import { VIEW_EVENTS, setupUiCamera, uiSize } from '../config/view';
import { SETTINGS_MENU, type SettingItem } from '../data/settingsMenu';
import { isTouchDevice } from '../input/Controls';
import { t } from '../locales/i18n';
import { gameState } from '../systems/GameState';
import { loadPrefs, setPref, type Prefs } from '../systems/prefs';
import { listSlots, parseImport, saveToSlot } from '../systems/save/saveManager';
import { describeClock } from '../systems/Clock';
import type { SaveData } from '../systems/save/saveFormat';
import { pickTextFile } from '../ui/fileTransfer';
import { drawFrame, drawPanel, pixelText } from '../ui/pixelUi';
import { wrapText } from '../ui/richText';

export const SETTINGS_EVENTS = {
  /** 设置里选了要界面配合的一项。参数：项目 id（rename / export / backToTitle / debug） */
  action: 'settings:action',
} as const;

/** 一行：显示什么、左右键 / 点击做什么 */
interface Row {
  label: string;
  /** 右边显示的值（没有就不显示） */
  value?: string;
  /** 滑块的值 0~100（有就画滑块） */
  slider?: number;
  /** 回车 / 点一下 */
  run?: () => void;
  /** 左右键：-1 / +1 */
  change?: (dir: -1 | 1) => void;
  /** 点滑块：按点的位置（0~1）设值 */
  setRatio?: (r: number) => void;
  dim?: boolean;
}

const ROW_H = 18;

export class SettingsScene extends Phaser.Scene {
  private view: 'main' | 'controls' | 'confirmTitle' | 'import' = 'main';
  private selected = 0;
  private rows: Row[] = [];
  private layer!: Phaser.GameObjects.Container;
  private note = '';
  private imported?: SaveData;
  private openedAt = 0;
  private touch = false;
  private panel = { x: 0, y: 0, w: 0, h: 0 };

  constructor() {
    super('Settings');
  }

  create(data: { touch?: boolean; selected?: number }) {
    this.touch = data?.touch ?? isTouchDevice();
    this.view = 'main';
    this.selected = data?.selected ?? 0;
    this.note = '';
    this.openedAt = this.time.now;
    gameState.menuOpen = true;
    setupUiCamera(this);
    const { w: W, h: H } = uiSize();
    const pw = Math.min(W - 24, 360);
    const ph = Math.min(H - 24, 280);
    this.panel = { x: Math.round((W - pw) / 2), y: Math.round((H - ph) / 2), w: pw, h: ph };

    // 挡住下面的游戏
    const shade = this.add.graphics();
    shade.fillStyle(toColor(SETTINGS.ui.border), 0.5).fillRect(0, 0, W, H);
    this.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    drawPanel(g, this.panel.x, this.panel.y, pw, ph);
    this.layer = this.add.container(0, 0);
    this.redraw();

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || this.time.now - this.openedAt < 120) return;
      const k = e.key;
      if (k === 'Escape' || k === 'm' || k === 'M') return this.back();
      if (['ArrowUp', 'w', 'W'].includes(k)) return this.move(-1);
      if (['ArrowDown', 's', 'S'].includes(k)) return this.move(1);
      if (['ArrowLeft', 'a', 'A'].includes(k)) return this.rows[this.selected]?.change?.(-1);
      if (['ArrowRight', 'd', 'D'].includes(k)) return this.rows[this.selected]?.change?.(1);
      if (k === 'Enter' || k === ' ') {
        const row = this.rows[this.selected];
        if (row?.run) row.run();
        else row?.change?.(1);
      }
    };
    this.input.keyboard?.on('keydown', onKey);
    // 界面大小变了：重新排一遍，停在同一项
    const relayout = () => this.scene.restart({ touch: this.touch, selected: this.selected });
    this.game.events.on(VIEW_EVENTS.changed, relayout);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', onKey);
      this.game.events.off(VIEW_EVENTS.changed, relayout);
    });
  }

  // ---------------- 画 ----------------

  private redraw() {
    this.layer.removeAll(true);
    this.rows = this.buildRows();
    if (this.selected >= this.rows.length) this.selected = 0;
    const { x, y, w, h } = this.panel;
    const ui = SETTINGS.ui;
    const titleKey = { main: 'settings.title', controls: 'settings.items.controls', confirmTitle: 'settings.items.backToTitle', import: 'settings.items.import' }[this.view];
    this.layer.add(pixelText(this, x + 10, y + 7, t(titleKey)));
    // 右上角 ✕
    const close = pixelText(this, x + w - 18, y + 6, '✕');
    const hit = this.add.zone(x + w - 24, y + 2, 22, 20).setOrigin(0).setInteractive();
    hit.on('pointerdown', () => this.back());
    this.layer.add([close, hit]);
    let ry = y + 26;
    // 说明文字（操作说明、确认的话、导入的结果）
    if (this.note) {
      for (const line of wrapText(this.note, w - 24)) {
        this.layer.add(pixelText(this, x + 12, ry, line, { color: ui.textDim2 }));
        ry += 14;
      }
      ry += 6;
    }
    const maxRows = Math.floor((y + h - 8 - ry) / ROW_H);
    // 选中的那一行要在可见范围内
    const first = Math.max(0, Math.min(this.selected - maxRows + 1, this.rows.length - maxRows));
    this.rows.slice(first, first + maxRows).forEach((row, i) => this.drawRow(row, first + i, x + 6, ry + i * ROW_H, w - 12));
  }

  private drawRow(row: Row, index: number, x: number, y: number, w: number) {
    const ui = SETTINGS.ui;
    const g = this.add.graphics();
    if (index === this.selected) g.fillStyle(toColor(ui.highlight)).fillRect(x, y, w, ROW_H - 2);
    this.layer.add(g);
    this.layer.add(pixelText(this, x + 6, y + 1, row.label, { color: row.dim ? ui.textDim : ui.text }));
    const valueX = x + w - 6;
    if (row.slider !== undefined) {
      const bw = 90;
      const bx = valueX - bw - 30;
      g.fillStyle(toColor(ui.border)).fillRect(bx - 1, y + 5, bw + 2, 6);
      g.fillStyle(toColor(ui.innerBorder)).fillRect(bx, y + 6, bw, 4);
      g.fillStyle(toColor(ui.staminaFull)).fillRect(bx, y + 6, Math.round((bw * row.slider) / 100), 4);
      this.layer.add(pixelText(this, valueX, y + 1, String(row.slider)).setOrigin(1, 0));
      const sl = this.add.zone(bx - 4, y, bw + 8, ROW_H).setOrigin(0).setInteractive();
      sl.on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.selected = index;
        const px = this.cameras.main.getWorldPoint(p.x, p.y).x;
        row.setRatio?.(Phaser.Math.Clamp((px - bx) / bw, 0, 1));
      });
      this.layer.add(sl);
    } else if (row.value !== undefined) {
      const text = row.change ? `‹ ${row.value} ›` : row.value;
      this.layer.add(pixelText(this, valueX, y + 1, text, { color: ui.textDim2 }).setOrigin(1, 0));
    }
    // 点这一行：选中；有左右的，点左半边减、右半边加；能做事的就做
    const hit = this.add.zone(x, y, row.slider !== undefined ? w - 130 : w, ROW_H).setOrigin(0).setInteractive();
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.selected = index;
      if (row.run) return row.run();
      if (row.change) {
        const px = this.cameras.main.getWorldPoint(p.x, p.y).x;
        return row.change(px < x + w * 0.75 ? -1 : 1);
      }
      this.redraw();
    });
    this.layer.add(hit);
    if (index === this.selected) drawFrame(g, x, y, w, ROW_H - 2, toColor(ui.border));
  }

  // ---------------- 每一页有哪些行 ----------------

  private buildRows(): Row[] {
    if (this.view === 'controls') return [{ label: t('settings.back'), run: () => this.back() }];
    if (this.view === 'confirmTitle') {
      return [
        { label: t('settings.yesBackToTitle'), run: () => this.finish('backToTitle') },
        { label: t('settings.cancel'), run: () => this.back() },
      ];
    }
    if (this.view === 'import') return this.importRows;
    const prefs = loadPrefs();
    return SETTINGS_MENU.filter((it) => !(it.kind === 'action' && it.debugOnly && !SETTINGS.debugMenu)).map((it) => this.rowFor(it, prefs));
  }

  private rowFor(it: SettingItem, prefs: Prefs): Row {
    const label = t(`settings.items.${it.id}`);
    const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
      setPref(key, value);
      if (key === 'uiSize') this.game.events.emit(VIEW_EVENTS.refit);
      this.redraw();
    };
    switch (it.kind) {
      case 'choice': {
        const cur = String(prefs[it.pref]);
        const i = Math.max(0, it.options.indexOf(cur));
        return {
          label,
          value: t(`settings.options.${cur}`),
          change: (d) => set(it.pref, it.options[(i + d + it.options.length) % it.options.length] as never),
        };
      }
      case 'toggle':
        return { label, value: t(prefs[it.pref] ? 'settings.on' : 'settings.off'), change: () => set(it.pref, !prefs[it.pref] as never) };
      case 'number': {
        const v = Number(prefs[it.pref]);
        const dim = it.pref === 'autoAdvanceSec' && !prefs.autoAdvance;
        return { label, dim, value: `${v} ${t(it.unit)}`, change: (d) => set(it.pref, Phaser.Math.Clamp(v + d * it.step, it.min, it.max) as never) };
      }
      case 'slider': {
        const v = Number(prefs[it.pref]);
        return {
          label,
          slider: v,
          change: (d) => set(it.pref, Phaser.Math.Clamp(v + d * 10, 0, 100) as never),
          setRatio: (r) => set(it.pref, Math.round(r * 10) * 10 as never),
        };
      }
      case 'action':
        return { label, value: '›', run: () => this.action(it.id) };
    }
  }

  private action(id: string) {
    if (id === 'controls') {
      const mode = this.touch ? 'touch' : 'keyboard';
      const keys = ['move', 'tools', 'interact', 'save', 'menu'];
      this.note = [...keys.map((k) => t(`notebook.controls.${k}.${mode}`)), t(`settings.controlsSettings.${mode}`)].join('\n');
      return this.go('controls');
    }
    if (id === 'backToTitle') {
      this.note = t('settings.backConfirm');
      return this.go('confirmTitle');
    }
    if (id === 'import') return void this.importFlow();
    this.finish(id);
  }

  // ---------------- 导入存档 ----------------

  private importRows: Row[] = [];

  private async importFlow() {
    const text = await pickTextFile();
    if (!text) return;
    const data = parseImport(text);
    if (!data) {
      this.note = t('title.importBad');
      this.importRows = [{ label: t('settings.back'), run: () => this.back() }];
      return this.go('import');
    }
    this.imported = data;
    const slots = await listSlots();
    this.note = t('settings.importPick');
    this.importRows = [
      ...slots.map((save, i) => {
        const n = i + 1;
        const current = n === gameState.slot;
        return {
          label: save ? t('title.slotFull', { n, ...describeClock(save.clock), cash: save.cash }) : t('title.slotEmpty', { n }),
          dim: current,
          run: () => (current ? undefined : void this.finishImport(n)),
        };
      }),
      { label: t('settings.cancel'), run: () => this.back() },
    ];
    this.go('import');
  }

  private async finishImport(n: number) {
    if (!this.imported) return;
    await saveToSlot({ ...this.imported, slot: n });
    this.imported = undefined;
    this.note = t('settings.importDone', { n });
    this.importRows = [{ label: t('settings.back'), run: () => this.back() }];
    this.redraw();
  }

  // ---------------- 切换、关闭 ----------------

  /** 从主页面进子页面前停在哪一项，回来时还停在那里 */
  private mainSelected = 0;

  private go(view: SettingsScene['view']) {
    if (this.view === 'main') this.mainSelected = this.selected;
    this.selected = view === 'main' ? this.mainSelected : 0;
    this.view = view;
    this.redraw();
  }

  private move(d: number) {
    if (!this.rows.length) return;
    this.selected = (this.selected + d + this.rows.length) % this.rows.length;
    this.redraw();
  }

  /** Esc / ✕：在子页面就回到主页面，在主页面就关掉 */
  private back() {
    if (this.view !== 'main') {
      this.note = '';
      return this.go('main');
    }
    this.close();
  }

  private close() {
    gameState.menuOpen = false;
    this.scene.stop();
  }

  /** 关掉设置，让界面场景接着做（改名字、导出、回标题、测试菜单） */
  private finish(id: string) {
    this.close();
    this.game.events.emit(SETTINGS_EVENTS.action, id);
  }
}
