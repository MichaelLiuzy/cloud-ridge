/**
 * 界面场景：叠在地图上面，不跟着镜头动。
 * 负责：左上角的日期/时间/钱/体力、底部工具栏、对话框、小菜单、手机按钮。
 * 所有操作（键盘、鼠标、手指）都先到这里：对话框或小菜单开着时由这里处理，
 * 否则再转给地图（FarmScene）。
 * 文字内容在 src/locales/zh.json，颜色在 src/config/settings.ts。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { font, localName, t } from '../locales/i18n';
import { INPUT_EVENTS, PointerControls, makeRoundButton } from '../input/Controls';
import { gameState } from '../systems/GameState';
import itemsData from '../data/items.json';

/** 界面和地图之间互相传的消息 */
export const UI_EVENTS = {
  /** 显示一句话。参数：语言文件里的名字（如 'hint.rock'），以及要替换的内容 */
  say: 'ui:say',
  /** 弹出小菜单。参数：MenuOption 列表 */
  showMenu: 'ui:showMenu',
  /** 下面这些是转给地图的：回车交互、空格用工具、手机「使用」键、点屏幕 */
  worldAction: 'ui:worldAction',
  worldUseTool: 'ui:worldUseTool',
  worldSmart: 'ui:worldSmart',
  worldTap: 'ui:worldTap',
} as const;

/** 小菜单里的一项 */
export interface MenuOption {
  label: string;
  run: () => void;
}

export class HudScene extends Phaser.Scene {
  private dateText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private staminaText!: Phaser.GameObjects.Text;
  private staminaBar!: Phaser.GameObjects.Rectangle;

  private dialog!: Phaser.GameObjects.Container;
  private dialogBg!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;

  private menu?: Phaser.GameObjects.Container;
  private menuOptions: MenuOption[] = [];
  private menuRows: Phaser.GameObjects.Rectangle[] = [];
  private menuIndex = 0;

  private toolbar!: Phaser.GameObjects.Container;
  private toolSlots: Phaser.GameObjects.Rectangle[] = [];
  private touchButtons: Phaser.GameObjects.Container[] = [];
  private touch = false;

  constructor() {
    super('Hud');
  }

  create(data: { touch: boolean }) {
    this.touch = !!data?.touch;
    const res = window.devicePixelRatio || 1;
    const style = { fontFamily: font(), fontSize: '18px', color: SETTINGS.colors.hudText };

    // ---- 左上角：日期、时间、钱、体力 ----
    this.add.rectangle(12, 12, 236, 112, 0x000000, 0.35).setOrigin(0);
    this.dateText = this.add.text(24, 20, '', style).setResolution(res);
    this.timeText = this.add.text(24, 44, '', style).setResolution(res);
    this.moneyText = this.add.text(24, 68, '', { ...style, fontSize: '16px', color: '#e8c872' }).setResolution(res);
    this.add.rectangle(24, 98, 120, 10, 0x000000, 0.5).setOrigin(0, 0.5);
    this.staminaBar = this.add.rectangle(24, 98, 120, 10, 0x8fc25a).setOrigin(0, 0.5);
    this.staminaText = this.add.text(152, 98, '', { ...style, fontSize: '13px' }).setOrigin(0, 0.5).setResolution(res);

    // ---- 底部工具栏 ----
    this.buildToolbar(res);

    // ---- 对话框 ----
    this.dialogBg = this.add.rectangle(0, 0, 100, 100, SETTINGS.colors.dialogBg, 0.92).setOrigin(0).setStrokeStyle(2, 0xc9a86a);
    this.dialogText = this.add
      .text(0, 0, '', { fontFamily: font(), fontSize: '20px', color: SETTINGS.colors.dialogText, wordWrap: { width: 100, useAdvancedWrap: true } })
      .setResolution(res);
    this.dialog = this.add.container(0, 0, [this.dialogBg, this.dialogText]).setVisible(false).setDepth(50);
    this.dialogBg.setInteractive().on('pointerdown', () => this.closeDialog());

    // ---- 鼠标 / 手指 ----
    new PointerControls(this, this.touch);
    if (this.touch) {
      const cfg = SETTINGS.touch;
      const ev = this.game.events;
      this.touchButtons = [
        makeRoundButton(this, t('buttons.action'), cfg.actionButtonRadius, font(), () => ev.emit(INPUT_EVENTS.action, 'smart')),
        makeRoundButton(this, t('buttons.bag'), cfg.smallButtonRadius, font(), () => ev.emit(INPUT_EVENTS.bag)),
        makeRoundButton(this, t('buttons.menu'), cfg.smallButtonRadius, font(), () => ev.emit(INPUT_EVENTS.menu)),
      ];
    }

    this.layout();
    this.scale.on('resize', this.layout, this);

    // ---- 接收指令 ----
    const ev = this.game.events;
    const handlers: [string, (...a: any[]) => void][] = [
      [INPUT_EVENTS.action, (mode?: string) => this.onAction(mode)],
      [INPUT_EVENTS.useTool, () => !this.busy() && ev.emit(UI_EVENTS.worldUseTool)],
      [INPUT_EVENTS.cancel, () => (this.menu ? this.closeMenu() : this.closeDialog())],
      [INPUT_EVENTS.bag, () => !this.busy() && this.say('msg.bagNotReady')],
      [INPUT_EVENTS.menu, () => !this.busy() && this.say('msg.menuNotReady')],
      [INPUT_EVENTS.toolSlot, (i: number) => !this.busy() && this.selectTool(i)],
      [INPUT_EVENTS.nav, (dir: 'up' | 'down') => this.menu && this.moveMenu(dir === 'up' ? -1 : 1)],
      [INPUT_EVENTS.tap, (x: number, y: number) => this.onTap(x, y)],
      [UI_EVENTS.say, (key: string, params?: Record<string, string | number>) => this.say(key, params)],
      [UI_EVENTS.showMenu, (opts: MenuOption[]) => this.openMenu(opts)],
    ];
    for (const [name, fn] of handlers) ev.on(name, fn);
    this.events.once('shutdown', () => {
      for (const [name, fn] of handlers) ev.off(name, fn);
      this.scale.off('resize', this.layout, this);
    });
  }

  update() {
    const clock = gameState.clock;
    if (!clock) return;
    this.dateText.setText(clock.dateText());
    this.timeText.setText(clock.timeText());
    this.moneyText.setText(t('hud.money', { amount: gameState.cash, unit: localName(itemsData.currency.name) }));
    this.staminaText.setText(t('hud.stamina', { value: gameState.stamina, max: gameState.maxStamina }));
    this.staminaBar.width = 120 * (gameState.stamina / gameState.maxStamina);
    this.toolSlots.forEach((slot, i) =>
      slot.setStrokeStyle(i === gameState.toolIndex ? 3 : 1, i === gameState.toolIndex ? SETTINGS.colors.toolSelected : 0xffffff, i === gameState.toolIndex ? 1 : 0.4),
    );
  }

  // ---------------- 操作分配 ----------------

  private busy() {
    return this.dialog.visible || !!this.menu;
  }

  /** 回车 / 「使用」键 */
  private onAction(mode?: string) {
    if (this.menu) return this.chooseMenu(this.menuIndex);
    if (this.dialog.visible) return this.closeDialog();
    this.game.events.emit(mode === 'smart' ? UI_EVENTS.worldSmart : UI_EVENTS.worldAction);
  }

  /** 点了屏幕空白处（不是按钮） */
  private onTap(x: number, y: number) {
    if (this.menu) return this.closeMenu(); // 点菜单外面 = 取消
    if (this.dialog.visible) return this.closeDialog();
    this.game.events.emit(UI_EVENTS.worldTap, x, y);
  }

  // ---------------- 对话框 ----------------

  say(key: string, params?: Record<string, string | number>) {
    this.closeMenu();
    this.dialogText.setText(t(key, params));
    this.dialog.setVisible(true);
    this.syncBusy();
  }

  closeDialog() {
    this.dialog.setVisible(false);
    this.syncBusy();
  }

  // ---------------- 小菜单 ----------------

  /** 弹出小菜单：方向键上下选、回车确认；手机直接点；点外面或 Esc 取消 */
  openMenu(options: MenuOption[]) {
    this.closeMenu();
    const res = window.devicePixelRatio || 1;
    const all = [...options, { label: t('action.cancel'), run: () => {} }];
    const rowH = this.touch ? 44 : 36;
    const w = 168;
    const items: Phaser.GameObjects.GameObject[] = [];
    this.menuRows = [];
    all.forEach((opt, i) => {
      const row = this.add.rectangle(0, i * rowH, w, rowH, SETTINGS.colors.dialogBg, 0.95).setOrigin(0).setStrokeStyle(1, 0xc9a86a, 0.5);
      row.setInteractive().on('pointerdown', () => this.chooseMenu(i));
      row.on('pointerover', () => this.highlight(i));
      const label = this.add
        .text(16, i * rowH + rowH / 2, opt.label, { fontFamily: font(), fontSize: '18px', color: SETTINGS.colors.dialogText })
        .setOrigin(0, 0.5)
        .setResolution(res);
      items.push(row, label);
      this.menuRows.push(row);
    });
    this.menuOptions = all;
    const { width, height } = this.scale;
    const h = all.length * rowH;
    this.menu = this.add.container(width / 2 - w / 2, Math.max(16, height / 2 - h - 24), items).setDepth(60);
    this.highlight(0);
    this.syncBusy();
  }

  private moveMenu(step: number) {
    const n = this.menuOptions.length;
    this.highlight((this.menuIndex + step + n) % n);
  }

  private highlight(i: number) {
    this.menuIndex = i;
    this.menuRows.forEach((r, j) => r.setFillStyle(j === i ? SETTINGS.colors.menuHighlight : SETTINGS.colors.dialogBg, 0.95));
  }

  private chooseMenu(i: number) {
    const opt = this.menuOptions[i];
    this.closeMenu();
    opt?.run();
  }

  closeMenu() {
    this.menu?.destroy();
    this.menu = undefined;
    this.menuOptions = [];
    this.menuRows = [];
    this.syncBusy();
  }

  private syncBusy() {
    gameState.uiBusy = this.busy();
  }

  // ---------------- 工具栏 ----------------

  private buildToolbar(res: number) {
    const size = 52;
    const gap = 6;
    const items: Phaser.GameObjects.GameObject[] = [];
    gameState.tools.forEach((id, i) => {
      const x = i * (size + gap);
      const slot = this.add.rectangle(x, 0, size, size, 0x000000, 0.45).setOrigin(0);
      slot.setInteractive().on('pointerdown', () => !this.busy() && this.selectTool(i));
      const name = localName(itemsData.items.find((it) => it.id === id)?.name);
      const label = this.add
        .text(x + size / 2, size / 2 + 4, name, { fontFamily: font(), fontSize: '14px', color: '#ffffff', align: 'center', wordWrap: { width: size - 4 } })
        .setOrigin(0.5)
        .setResolution(res);
      const num = this.add.text(x + 4, 2, String(i + 1), { fontFamily: font(), fontSize: '11px', color: '#c9bfa8' }).setResolution(res);
      items.push(slot, label, num);
      this.toolSlots.push(slot);
    });
    this.toolbar = this.add.container(0, 0, items).setDepth(40);
    this.toolbar.setSize(gameState.tools.length * (size + gap) - gap, size);
  }

  private selectTool(i: number) {
    if (i < gameState.tools.length) gameState.toolIndex = i;
  }

  // ---------------- 摆放位置 ----------------

  /** 按屏幕大小摆放（横竖屏切换、窗口变大小时都会重新摆） */
  private layout() {
    const { width, height } = this.scale;
    // 工具栏：底部正中
    const tbW = this.toolbar.width;
    this.toolbar.setPosition((width - tbW) / 2, height - 52 - 12);

    // 对话框：工具栏上面
    const w = Math.min(720, width - 260);
    const h = 96;
    const x = (width - w) / 2;
    const y = height - 52 - 12 - h - 12;
    this.dialogBg.setPosition(x, y).setSize(w, h);
    this.dialogBg.input?.hitArea.setTo(0, 0, w, h);
    this.dialogText.setPosition(x + 18, y + 14).setWordWrapWidth(w - 36, true);

    // 手机按钮：右下角
    if (this.touchButtons.length) {
      const cfg = SETTINGS.touch;
      const margin = 24;
      const [action, bag, menu] = this.touchButtons;
      const ax = width - margin - cfg.actionButtonRadius - 10;
      const ay = height - margin - cfg.actionButtonRadius - 10;
      action.setPosition(ax, ay);
      bag.setPosition(ax - cfg.actionButtonRadius - cfg.smallButtonRadius - 18, ay + 10);
      menu.setPosition(width - margin - cfg.smallButtonRadius, margin + cfg.smallButtonRadius + 40);
    }
  }
}
