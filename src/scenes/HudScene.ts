/**
 * 界面场景：叠在地图上面，不跟着镜头动。
 * 负责：左上角的日期/时间/钱/体力、底部工具栏、对话框、小菜单、手机按钮。
 * 所有操作（键盘、鼠标、手指）都先到这里：对话框或小菜单开着时由这里处理，
 * 否则再转给地图（FarmScene）。
 * 文字内容在 src/locales/zh.ts，颜色在 src/config/settings.ts 的 ui。
 * 画面按 320×180 排，下面的数字都是这个大小里的像素。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { toColor } from '../config/palette';
import { localName, t } from '../locales/i18n';
import { INPUT_EVENTS, PointerControls, makeRoundButton } from '../input/Controls';
import { drawFrame, drawPanel, pixelText } from '../ui/pixelUi';
import { gameState } from '../systems/GameState';
import { ListMenu, type MenuOption } from '../ui/ListMenu';
import { downloadText } from '../ui/fileTransfer';
import { exportText } from '../systems/save/saveManager';
import { ITEMS as itemsData } from '../data/items';

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


/** 左上角时辰框、底部工具栏、对话框的大小和位置 */
const INFO = { x: 2, y: 2, w: 92, h: 46 };
const SLOT = 18;
const SLOT_GAP = 2;
const BAR_PAD = 3;
const DIALOG = { w: 240, h: 46 };

export class HudScene extends Phaser.Scene {
  private dateText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  /** 体力条（竖的，在时辰框右边） */
  private staminaBar!: Phaser.GameObjects.Rectangle;
  private staminaBarH = 0;

  private dialog!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;

  private menu?: ListMenu;

  private toolCursor!: Phaser.GameObjects.Graphics;
  private toolSlotX: number[] = [];
  private touchButtons: Phaser.GameObjects.Container[] = [];
  private touch = false;

  constructor() {
    super('Hud');
  }

  create(data: { touch: boolean }) {
    this.touch = !!data?.touch;
    this.toolSlotX = [];
    const { gameWidth: W, gameHeight: H } = SETTINGS;
    const ui = SETTINGS.ui;

    // ---- 左上角：日期、时辰、钱，右边一条竖的体力条 ----
    drawPanel(this.add.graphics(), INFO.x, INFO.y, INFO.w, INFO.h);
    const tx = INFO.x + 5;
    this.dateText = pixelText(this, tx, INFO.y + 3, '');
    this.timeText = pixelText(this, tx, INFO.y + 16, '');
    this.moneyText = pixelText(this, tx, INFO.y + 29, '', { color: ui.money });
    const barX = INFO.x + INFO.w - 9;
    const barY = INFO.y + 5;
    this.staminaBarH = INFO.h - 10;
    this.add.rectangle(barX - 1, barY - 1, 6, this.staminaBarH + 2, toColor(ui.border)).setOrigin(0);
    this.add.rectangle(barX, barY, 4, this.staminaBarH, toColor(ui.innerBorder)).setOrigin(0);
    this.staminaBar = this.add.rectangle(barX, barY + this.staminaBarH, 4, this.staminaBarH, toColor(ui.staminaFull)).setOrigin(0, 1);

    // ---- 底部工具栏 ----
    this.buildToolbar(W, H);

    // ---- 对话框（工具栏上面） ----
    const dx = Math.round((W - DIALOG.w) / 2);
    const dy = H - 2 - (SLOT + BAR_PAD * 2) - 2 - DIALOG.h;
    const dialogBg = this.add.graphics();
    drawPanel(dialogBg, 0, 0, DIALOG.w, DIALOG.h);
    this.dialogText = pixelText(this, 6, 4, '', { wrap: DIALOG.w - 12 });
    const hit = this.add.zone(0, 0, DIALOG.w, DIALOG.h).setOrigin(0).setInteractive();
    hit.on('pointerdown', () => this.closeDialog());
    this.dialog = this.add.container(dx, dy, [dialogBg, this.dialogText, hit]).setVisible(false).setDepth(50);

    // ---- 鼠标 / 手指 ----
    new PointerControls(this, this.touch);
    if (this.touch) {
      const cfg = SETTINGS.touch;
      const ev = this.game.events;
      const [action, bag, menu] = (this.touchButtons = [
        makeRoundButton(this, t('buttons.action'), cfg.actionButtonRadius, () => ev.emit(INPUT_EVENTS.action, 'smart')),
        makeRoundButton(this, t('buttons.bag'), cfg.smallButtonRadius, () => ev.emit(INPUT_EVENTS.bag)),
        makeRoundButton(this, t('buttons.menu'), cfg.smallButtonRadius, () => ev.emit(INPUT_EVENTS.menu)),
      ]);
      const ax = W - cfg.actionButtonRadius - 4;
      const ay = H - cfg.actionButtonRadius - 4;
      action.setPosition(ax, ay);
      bag.setPosition(ax - cfg.actionButtonRadius - cfg.smallButtonRadius - 4, ay + 4);
      menu.setPosition(W - cfg.smallButtonRadius - 4, cfg.smallButtonRadius + 4);
    }

    // ---- 接收指令 ----
    const ev = this.game.events;
    const handlers: [string, (...a: any[]) => void][] = [
      [INPUT_EVENTS.action, (mode?: string) => this.onAction(mode)],
      [INPUT_EVENTS.useTool, () => !this.busy() && ev.emit(UI_EVENTS.worldUseTool)],
      [INPUT_EVENTS.cancel, () => (this.menu ? this.closeMenu() : this.closeDialog())],
      [INPUT_EVENTS.bag, () => !this.busy() && this.say('msg.bagNotReady')],
      [INPUT_EVENTS.menu, () => !this.busy() && this.gameMenu()],
      [INPUT_EVENTS.toolSlot, (i: number) => !this.busy() && this.selectTool(i)],
      [INPUT_EVENTS.nav, (dir: 'up' | 'down') => this.menu?.move(dir === 'up' ? -1 : 1)],
      [INPUT_EVENTS.tap, (x: number, y: number) => this.onTap(x, y)],
      [INPUT_EVENTS.debugMemory, () => (gameState.memoryMode = !gameState.memoryMode)],
      [UI_EVENTS.say, (key: string, params?: Record<string, string | number>) => this.say(key, params)],
      [UI_EVENTS.showMenu, (opts: MenuOption[]) => this.openMenu(opts)],
    ];
    for (const [name, fn] of handlers) ev.on(name, fn);
    this.events.once('shutdown', () => {
      for (const [name, fn] of handlers) ev.off(name, fn);
      this.closeMenu();
      this.touchButtons = [];
    });
  }

  update() {
    const clock = gameState.clock;
    if (!clock) return;
    this.dateText.setText(clock.dateText());
    this.timeText.setText(clock.timeText());
    this.moneyText.setText(t('hud.money', { amount: gameState.cash, unit: localName(itemsData.currency.name) }));
    const ratio = Math.max(0, Math.min(1, gameState.stamina / gameState.maxStamina));
    this.staminaBar.height = Math.round(this.staminaBarH * ratio);
    this.staminaBar.setFillStyle(toColor(ratio <= 0.25 ? SETTINGS.ui.staminaLow : SETTINGS.ui.staminaFull));
    const x = this.toolSlotX[gameState.toolIndex];
    if (x !== undefined) this.toolCursor.setX(x - 1);
  }

  // ---------------- 操作分配 ----------------

  private busy() {
    return this.dialog.visible || !!this.menu;
  }

  /** 回车 / 「使用」键 */
  private onAction(mode?: string) {
    if (this.menu) return this.menu.choose();
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
  openMenu(options: MenuOption[], title?: string) {
    this.closeMenu();
    // 每个选项选中后先关菜单，再做事；最后自动加一项「算了」
    const all = [...options, { label: t('action.cancel'), run: () => {} }].map((o) => ({
      ...o,
      run: () => {
        this.closeMenu();
        o.run();
      },
    }));
    this.menu = new ListMenu(this, all, { title, width: 120 });
    const { gameWidth: W, gameHeight: H } = SETTINGS;
    this.menu.centerAt(W / 2, Math.min(H / 2, H - 30 - this.menu.container.height / 2));
    this.syncBusy();
  }

  closeMenu() {
    this.menu?.destroy();
    this.menu = undefined;
    this.syncBusy();
  }

  /** 菜单键（M / 手机右上「菜单」）：导出存档、回标题 */
  private gameMenu() {
    this.openMenu(
      [
        {
          label: t('menu.export'),
          run: () => {
            const snap = gameState.snapshot?.();
            if (!snap) return;
            const { filename, text } = exportText(snap);
            downloadText(filename, text);
            this.say('msg.exported');
          },
        },
        {
          label: t('menu.backToTitle'),
          run: () => this.openMenu([{ label: t('menu.yes'), run: () => this.backToTitle() }], t('menu.backConfirm')),
        },
        // 测试用（settings.ts 的 debugMenu 改成 false 就没有了）
        ...(SETTINGS.debugMenu
          ? [
              { label: t('menu.debugSkipTime'), run: () => gameState.clock && (gameState.clock.minutes += 180) },
              { label: t('menu.debugMemory'), run: () => (gameState.memoryMode = !gameState.memoryMode) },
            ]
          : []),
      ],
      t('menu.title'),
    );
  }

  private backToTitle() {
    gameState.memoryMode = false;
    this.scene.stop('Farm');
    this.scene.start('Title');
  }

  private syncBusy() {
    gameState.uiBusy = this.busy();
  }

  // ---------------- 工具栏 ----------------

  /** 底部正中一排格子，每格放工具图标；当前拿着的那格有橘色框 */
  private buildToolbar(W: number, H: number) {
    const n = gameState.tools.length;
    const w = BAR_PAD * 2 + n * SLOT + (n - 1) * SLOT_GAP;
    const h = BAR_PAD * 2 + SLOT;
    const x0 = Math.round((W - w) / 2);
    const y0 = H - 2 - h;
    const g = this.add.graphics().setDepth(40);
    drawPanel(g, x0, y0, w, h);
    gameState.tools.forEach((id, i) => {
      const x = x0 + BAR_PAD + i * (SLOT + SLOT_GAP);
      const y = y0 + BAR_PAD;
      this.toolSlotX.push(x);
      g.fillStyle(toColor(SETTINGS.ui.innerBorder)).fillRect(x, y, SLOT, SLOT);
      const slot = this.add.zone(x, y, SLOT, SLOT).setOrigin(0).setInteractive().setDepth(41);
      slot.on('pointerdown', () => !this.busy() && this.selectTool(i));
      const key = `icon_${id}`;
      if (this.textures.exists(key)) this.add.image(x + SLOT / 2, y + SLOT / 2, key).setDepth(41);
      else pixelText(this, x + SLOT / 2, y + SLOT / 2, this.itemName(id).slice(0, 1)).setOrigin(0.5).setDepth(41);
    });
    // 当前工具的框：画在 (0,0)，每帧挪到选中的那格
    this.toolCursor = this.add.graphics().setDepth(42).setY(y0 + BAR_PAD - 1);
    drawFrame(this.toolCursor, 0, 0, SLOT + 2, SLOT + 2, toColor(SETTINGS.ui.toolSelected));
  }

  private itemName(id: string) {
    return localName(itemsData.items.find((it) => it.id === id)?.name);
  }

  private selectTool(i: number) {
    if (i < gameState.tools.length) gameState.toolIndex = i;
  }
}
