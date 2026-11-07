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
import { VIEW, VIEW_EVENTS, setupUiCamera, uiSize } from '../config/view';
import { SETTINGS_EVENTS } from './SettingsScene';
import { toColor } from '../config/palette';
import { localName, t } from '../locales/i18n';
import { INPUT_EVENTS, PointerControls, makeRoundButton } from '../input/Controls';
import { drawFrame, drawPanel, pixelText } from '../ui/pixelUi';
import { drawCoin } from '../ui/tinyDigits';
import { DialogueBox } from '../ui/DialogueBox';
import { askName } from '../ui/nameInput';
import { CHAPTERS, type ChapterId } from '../data/clues';
import { localName as nameOf } from '../locales/i18n';
import { fillNames } from '../story/text';
import { STORY_EVENTS, debugNextChapter, fireStoryEvent, storyEvents } from '../systems/story/notebook';
import { FARM_EVENTS } from './FarmScene';
import { debugSetAffection } from '../systems/affection';
import { AFFECTION } from '../data/affection';
import { pickupOfferReady, unlockPickup } from '../systems/economy/pickup';
import { SERVICES } from '../data/services';
import { TOOLBAR_SLOTS, hasItem } from '../systems/inventory';
import { drawItemSlot } from '../ui/itemSlot';
import type { MenuTabId } from '../data/menuTabs';
import { gameState } from '../systems/GameState';
import { ListMenu, type MenuOption } from '../ui/ListMenu';
import { QuantityPicker } from '../ui/QuantityPicker';
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
  /** 播一段剧本对话。参数：剧本里的段落名（knot），播完后调用的函数 */
  playDialogue: 'ui:playDialogue',
  /** 工具变了（比如拿到开局物资）：重画工具栏 */
  toolsChanged: 'ui:toolsChanged',
  /** 让玩家选数量。参数：标题、最多几个、选好后调用的函数（取消时传 null） */
  askQuantity: 'ui:askQuantity',
} as const;


/**
 * 底部工具栏、提示框的大小（界面像素；左上角时辰框的大小在 settings.ts 的 ui.infoBox）。
 * 工具栏格子随图标放大倍数（settings.ts 的 ui.iconScale）变；提示框整体再放大 ui.dialogueScale 倍。
 */
const SLOT = () => 16 * SETTINGS.ui.iconScale + 2;
const SLOT_GAP = 2;
const BAR_PAD = 3;
const DIALOG = { w: 240, h: 46 };

export class HudScene extends Phaser.Scene {
  private dateText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  /** 钟点「6:00 am」（整点才变） */
  private clockText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private staminaLabel!: Phaser.GameObjects.Text;
  /** 时辰框的底板、铜钱和体力条：内容变了才重画 */
  private infoBg!: Phaser.GameObjects.Graphics;
  private infoMoney!: Phaser.GameObjects.Graphics;
  /** 体力条上面的透明感应区，和弹出的「81/100」小提示 */
  private staminaHit!: Phaser.GameObjects.Zone;
  private staminaTip?: Phaser.GameObjects.Container;
  private staminaTipTimer?: Phaser.Time.TimerEvent;
  private infoKey = '';
  /** 界面大小变了但正忙着（对话、菜单），等空下来再重新排版 */
  private relayoutPending = false;

  private dialog!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;

  private menu?: ListMenu;
  /** 剧情对话框（ink 剧本） */
  private story!: DialogueBox;
  /** 正在输入名字 */
  private naming = false;
  /** 右上角的笔记本图标（拿到笔记本后出现，有新内容会闪） */
  private notebookIcon!: Phaser.GameObjects.Container;
  /** 右上角的齿轮（设置） */
  private gearButton!: Phaser.GameObjects.Container;

  private toolCursor?: Phaser.GameObjects.Graphics;
  /** 工具栏的所有东西（工具变了时整个重画） */
  private toolbar?: Phaser.GameObjects.Container;
  /** 对话框开着时又来的话，排队等着 */
  private sayQueue: [string, Record<string, string | number> | undefined][] = [];
  /** 正在选数量 */
  private picker?: QuantityPicker;
  private toolSlotX: number[] = [];
  /** 工具栏上次画的时候放了什么、画在多大的界面上 */
  private toolbarSig = '';
  private layoutW = 0;
  private layoutH = 0;
  private touchButtons: Phaser.GameObjects.Container[] = [];
  private touch = false;

  constructor() {
    super('Hud');
  }

  create(data: { touch: boolean }) {
    this.touch = !!data?.touch;
    this.toolSlotX = [];
    this.relayoutPending = false;
    // 界面层：按大约 640×360 排版（倍数见 src/config/view.ts）
    setupUiCamera(this);
    const { w: W, h: H } = uiSize();
    const ui = SETTINGS.ui;

    // ---- 左上角时辰框：第一行日期、时辰、钟点；第二行钱、体力（大小在 settings.ts 的 ui.infoBox）----
    const box = ui.infoBox;
    this.infoBg = this.add.graphics();
    this.infoMoney = this.add.graphics();
    const row1 = box.y + box.padding + box.textNudgeY;
    const row2 = row1 + box.lineH;
    this.dateText = pixelText(this, box.x + box.padding, row1, '');
    // 时辰用褐色字，和日期分开
    this.timeText = pixelText(this, 0, row1, '', { color: ui.textDim2 });
    this.clockText = pixelText(this, 0, row1, '');
    this.moneyText = pixelText(this, box.x + box.padding + 9, row2, '', { color: ui.money });
    this.staminaLabel = pixelText(this, 0, row2, t('hud.staminaLabel'));
    this.staminaHit = this.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive();
    this.staminaHit.on('pointerover', () => !this.touch && this.showStaminaTip());
    this.staminaHit.on('pointerout', () => !this.touch && this.hideStaminaTip());
    this.staminaHit.on('pointerdown', () => this.touch && this.showStaminaTip(ui.staminaTipMs));
    this.infoKey = '';
    this.staminaTip = undefined;

    // ---- 底部工具栏 ----
    this.buildToolbar(W, H);

    // ---- 提示框（工具栏上面；和剧情对话框一样再放大 dialogueScale 倍，好读） ----
    // 按屏幕真实像素取整数倍（字清楚），太窄就一档档减小，但不小于界面倍数
    let px = VIEW.ui * Math.max(1, ui.dialogueScale);
    while (px > VIEW.ui && VIEW.canvasW / px < DIALOG.w + 8) px -= 1;
    const ds = px / VIEW.ui;
    const dx = Math.round((W - DIALOG.w * ds) / 2);
    const dy = H - 2 - (SLOT() + BAR_PAD * 2) - 2 - DIALOG.h * ds;
    const dialogBg = this.add.graphics();
    drawPanel(dialogBg, 0, 0, DIALOG.w, DIALOG.h);
    this.dialogText = pixelText(this, 6, 4, '', { wrap: DIALOG.w - 12 });
    const hit = this.add.zone(0, 0, DIALOG.w, DIALOG.h).setOrigin(0).setInteractive();
    hit.on('pointerdown', () => this.closeDialog());
    this.dialog = this.add.container(dx, dy, [dialogBg, this.dialogText, hit]).setScale(ds).setVisible(false).setDepth(50);

    // ---- 剧情对话框、右上角的齿轮和笔记本 ----
    this.story = new DialogueBox(this);
    this.buildCornerButtons(W);

    // ---- 鼠标 / 手指 ----
    new PointerControls(this, this.touch);
    if (this.touch) {
      const cfg = SETTINGS.touch;
      const ev = this.game.events;
      const [action, bag] = (this.touchButtons = [
        makeRoundButton(this, t('buttons.action'), cfg.actionButtonRadius, () => ev.emit(INPUT_EVENTS.action, 'smart')),
        makeRoundButton(this, t('buttons.bag'), cfg.smallButtonRadius, () => ev.emit(INPUT_EVENTS.bag)),
      ]);
      const ax = W - cfg.actionButtonRadius - 8;
      const ay = H - cfg.actionButtonRadius - 8;
      action.setPosition(ax, ay);
      bag.setPosition(ax - cfg.actionButtonRadius - cfg.smallButtonRadius - 8, ay + 8);
    }

    // ---- 接收指令 ----
    const ev = this.game.events;
    const handlers: [string, (...a: any[]) => void][] = [
      [INPUT_EVENTS.action, (mode?: string) => this.onAction(mode)],
      [INPUT_EVENTS.useTool, () => (this.story.active ? this.story.advance() : !this.busy() && ev.emit(UI_EVENTS.worldUseTool))],
      // Esc：先关掉正开着的东西；什么都没开就打开设置
      [INPUT_EVENTS.cancel, () => this.onCancel()],
      [INPUT_EVENTS.bag, () => !this.busy() && this.openGameMenu('bag')],
      [INPUT_EVENTS.menu, () => !this.busy() && this.openSettings()],
      [SETTINGS_EVENTS.action, (id: string) => this.settingsAction(id)],
      [INPUT_EVENTS.toolSlot, (i: number) => !this.busy() && this.selectTool(i)],
      [INPUT_EVENTS.nav, (dir: 'up' | 'down') => (this.picker ? this.picker.nudge(dir) : this.menu?.move(dir === 'up' ? -1 : 1))],
      [INPUT_EVENTS.tap, (x: number, y: number) => this.onTap(x, y)],
      [INPUT_EVENTS.debugMemory, () => (gameState.memoryMode = !gameState.memoryMode)],
      [UI_EVENTS.say, (key: string, params?: Record<string, string | number>) => this.say(key, params)],
      [UI_EVENTS.showMenu, (opts: MenuOption[], title?: string) => this.openMenu(opts, title)],
      [UI_EVENTS.toolsChanged, () => this.buildToolbar(W, H)],
      [VIEW_EVENTS.changed, () => this.relayout()],
      [UI_EVENTS.askQuantity, (title: string, max: number, onDone: (n: number | null) => void) => this.askQuantity(title, max, onDone)],
      [UI_EVENTS.playDialogue, (knot: string, onDone?: () => void) => this.playStory(knot, onDone)],
    ];
    const onNew = () => this.flashNotebook();
    const onChapter = (id: ChapterId) => this.say('notebook.newChapter', { name: fillNames(nameOf(CHAPTERS[id].name)) });
    storyEvents.on(STORY_EVENTS.notebookNew, onNew);
    storyEvents.on(STORY_EVENTS.chapterStart, onChapter);
    for (const [name, fn] of handlers) ev.on(name, fn);
    this.events.once('shutdown', () => {
      storyEvents.off(STORY_EVENTS.notebookNew, onNew);
      storyEvents.off(STORY_EVENTS.chapterStart, onChapter);
      this.story.destroy();
      this.scene.stop('GameMenu');
      for (const [name, fn] of handlers) ev.off(name, fn);
      this.closeMenu();
      this.picker?.destroy();
      this.picker = undefined;
      this.touchButtons = [];
    });
  }

  update() {
    const clock = gameState.clock;
    if (!clock) return;
    if (this.relayoutPending) this.relayout();
    this.refreshInfoBox(clock.shortDateText(), clock.shichen, clock.clockText());
    // 工具栏里的东西变了（用掉种子、在背包里挪了位置……）：重画
    const sig = this.toolbarSignature();
    if (sig !== this.toolbarSig) this.buildToolbar(this.layoutW, this.layoutH);
    const x = this.toolSlotX[gameState.selected];
    if (x !== undefined) this.toolCursor?.setX(x - 1);
  }

  /** 工具栏 9 格现在放了什么（变了才重画） */
  private toolbarSignature() {
    const show = gameState.flags.startKitGiven || gameState.slots.slice(0, TOOLBAR_SLOTS).some(Boolean);
    return show ? JSON.stringify(gameState.slots.slice(0, TOOLBAR_SLOTS)) : '';
  }

  // ---------------- 左上角时辰框 ----------------

  /** 日期、时辰、钟点、钱、体力有变化时才重画（每帧都会调用） */
  private refreshInfoBox(date: string, shichen: string, hourText: string) {
    const ui = SETTINGS.ui;
    const box = ui.infoBox;
    const bar = ui.staminaBar;
    const stamina = Math.round(Math.max(0, Math.min(1, gameState.stamina / gameState.maxStamina)) * bar.w);
    const key = [date, shichen, hourText, gameState.cash, stamina].join('|');
    if (key === this.infoKey) return;
    this.infoKey = key;
    // 第一行：正月十六　卯时　6:00 am
    this.dateText.setText(date);
    this.timeText.setText(shichen).setX(this.dateText.x + Math.ceil(this.dateText.width) + 6);
    this.clockText.setText(hourText).setX(this.timeText.x + Math.ceil(this.timeText.width) + 6);
    // 第二行：铜钱 + 钱数（左），「体力」+ 体力条（右）
    this.moneyText.setText(String(gameState.cash));
    const row1W = this.clockText.x + Math.ceil(this.clockText.width) - box.x + box.padding;
    const row2W = 9 + Math.ceil(this.moneyText.width) + 10 + Math.ceil(this.staminaLabel.width) + 4 + bar.w + box.padding * 2;
    const w = Math.max(box.w, row1W, row2W);
    // 底板
    this.infoBg.clear();
    drawPanel(this.infoBg, box.x, box.y, w, box.h);
    const g = this.infoMoney.clear();
    const money = toColor(ui.money);
    const rowY = this.moneyText.y;
    const midY = rowY + 7; // 字的中线
    drawCoin(g, box.x + box.padding, midY - 2, money);
    const bx = box.x + w - box.padding - bar.w;
    const by = midY - Math.floor(bar.h / 2);
    this.staminaLabel.setX(bx - 4 - Math.ceil(this.staminaLabel.width));
    const low = stamina <= bar.w * 0.25;
    g.fillStyle(toColor(ui.border)).fillRect(bx - 1, by - 1, bar.w + 2, bar.h + 2);
    g.fillStyle(toColor(ui.innerBorder)).fillRect(bx, by, bar.w, bar.h);
    g.fillStyle(toColor(low ? ui.staminaLow : ui.staminaFull)).fillRect(bx, by, stamina, bar.h);
    // 鼠标移上去 / 手指点一下的感应区：「体力」两个字加体力条
    this.staminaHit.setPosition(this.staminaLabel.x - 2, rowY - 1).setSize(bx + bar.w + 2 - this.staminaLabel.x + 2, 16);
    this.staminaHit.input?.hitArea.setTo(0, 0, this.staminaHit.width, this.staminaHit.height);
    if (this.staminaTip) this.showStaminaTip();
  }

  /** 体力条旁边弹出「81/100」。ms = 几毫秒后自动收起（手机）；不写就一直显示到鼠标移开 */
  private showStaminaTip(ms?: number) {
    this.staminaTip?.destroy();
    const ui = SETTINGS.ui;
    const text = pixelText(this, 5, 2, t('hud.staminaTip', { value: Math.round(gameState.stamina), max: gameState.maxStamina }), { size: ui.smallFontSize });
    const g = this.add.graphics();
    drawPanel(g, 0, 0, Math.ceil(text.width) + 10, 18);
    const x = this.staminaHit.x + this.staminaHit.width - Math.ceil(text.width) - 10;
    this.staminaTip = this.add.container(x, this.staminaHit.y + this.staminaHit.height + 3, [g, text]).setDepth(60);
    if (ms) {
      this.staminaTipTimer?.remove();
      this.staminaTipTimer = this.time.delayedCall(ms, () => this.hideStaminaTip());
    }
  }

  private hideStaminaTip() {
    this.staminaTipTimer?.remove();
    this.staminaTipTimer = undefined;
    this.staminaTip?.destroy();
    this.staminaTip = undefined;
  }

  /** 界面大小变了（转屏、设置里改了界面大小）：整个界面重新排一遍。正忙着就等空下来再排 */
  private relayout() {
    if (this.busy()) {
      this.relayoutPending = true;
      return;
    }
    this.relayoutPending = false;
    this.scene.restart({ touch: this.touch });
  }

  // ---------------- 操作分配 ----------------

  private busy() {
    return this.dialog.visible || !!this.menu || !!this.picker || this.story.active || this.naming || gameState.menuOpen;
  }

  /** 回车 / 「使用」键 */
  private onAction(mode?: string) {
    if (gameState.menuOpen || this.naming) return;
    if (this.picker) return this.picker.confirm();
    if (this.story.active) return this.story.advance();
    if (this.menu) return this.menu.choose();
    if (this.dialog.visible) return this.closeDialog();
    this.game.events.emit(mode === 'smart' ? UI_EVENTS.worldSmart : UI_EVENTS.worldAction);
  }

  /** 点了屏幕空白处（不是按钮） */
  private onTap(x: number, y: number) {
    if (gameState.menuOpen || this.naming || this.picker) return;
    if (this.story.active) return this.story.advance();
    if (this.menu) return this.closeMenu(); // 点菜单外面 = 取消
    if (this.dialog.visible) return this.closeDialog();
    this.game.events.emit(UI_EVENTS.worldTap, x, y);
  }

  // ---------------- 对话框 ----------------

  say(key: string, params?: Record<string, string | number>) {
    // 上一句还没看完：排在后面，关掉上一句时再显示
    if (this.dialog.visible) {
      this.sayQueue.push([key, params]);
      return;
    }
    this.closeMenu();
    this.dialogText.setText(t(key, params));
    this.dialog.setVisible(true);
    this.syncBusy();
  }

  closeDialog() {
    this.dialog.setVisible(false);
    const next = this.sayQueue.shift();
    if (next) return this.say(next[0], next[1]);
    this.syncBusy();
  }

  // ---------------- 选数量 ----------------

  private askQuantity(title: string, max: number, onDone: (n: number | null) => void) {
    this.closeMenu();
    this.picker?.destroy();
    this.picker = new QuantityPicker(this, title, max, (n) => {
      this.picker = undefined;
      this.syncBusy();
      onDone(n);
    });
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
    const { w: W, h: H } = uiSize();
    this.menu.centerAt(W / 2, Math.min(H / 2, H - 30 - this.menu.container.height / 2));
    this.syncBusy();
  }

  closeMenu() {
    this.menu?.destroy();
    this.menu = undefined;
    this.syncBusy();
  }

  /** Esc：先关掉正开着的小框；什么都没开，就打开设置 */
  private onCancel() {
    if (gameState.menuOpen || this.naming) return;
    if (this.picker) return this.picker.cancel();
    if (this.menu) return this.closeMenu();
    if (this.dialog.visible) return this.closeDialog();
    if (this.story.active) return;
    this.openSettings();
  }

  /** 打开设置（齿轮、M 键、Esc） */
  private openSettings() {
    if (this.busy() || this.scene.isActive('Settings')) return;
    this.hideStaminaTip();
    this.scene.launch('Settings', { touch: this.touch });
  }

  /** 设置里要界面配合的几项：改名字、导出存档、回标题、测试菜单 */
  private settingsAction(id: string) {
    if (id === 'rename') return void this.rename();
    if (id === 'export') {
      const snap = gameState.snapshot?.();
      if (!snap) return;
      const { filename, text } = exportText(snap);
      downloadText(filename, text);
      return this.say('msg.exported');
    }
    if (id === 'backToTitle') return this.backToTitle();
    if (id === 'debug' && SETTINGS.debugMenu) return this.debugMenu();
  }

  /** 测试用的选项（settings.ts 的 debugMenu 改成 false 就没有了） */
  private debugMenu() {
    const ev = this.game.events;
    this.openMenu(
      [
        { label: t('menu.debugSkipTime'), run: () => gameState.clock && (gameState.clock.minutes += 180) },
        { label: t('menu.debugDay1'), run: () => ev.emit(FARM_EVENTS.debugDays, 1) },
        { label: t('menu.debugDay7'), run: () => ev.emit(FARM_EVENTS.debugDays, 7) },
        { label: t('menu.debugBuild'), run: () => ev.emit(FARM_EVENTS.debugBuild) },
        { label: t('menu.debugPickup'), run: () => this.debugPickup() },
        { label: t('menu.debugPoster'), run: () => fireStoryEvent('saw_missing_poster') },
        { label: t('menu.debugChapter'), run: () => debugNextChapter() },
        { label: t('menu.debugMemory'), run: () => (gameState.memoryMode = !gameState.memoryMode) },
      ],
      t('menu.debug'),
    );
  }

  /** （测试）杂货铺掌柜好感到够，然后他来提上门收货 */
  private debugPickup() {
    const cfg = SERVICES.pickup;
    debugSetAffection(cfg.npc, cfg.unlockHearts * AFFECTION.pointsPerHeart);
    if (!pickupOfferReady()) return this.say('pickup.already');
    this.playStory('pickup_offer', () => {
      this.openMenu(
        [
          {
            label: t('pickup.pay', { fee: cfg.fee }),
            run: () => {
              if (!unlockPickup()) return this.say('pickup.noMoney', { fee: cfg.fee });
              this.game.events.emit(FARM_EVENTS.basketUnlocked);
              this.say('pickup.unlocked');
            },
          },
        ],
        t('pickup.question', { fee: cfg.fee }),
      );
    });
  }

  private backToTitle() {
    gameState.memoryMode = false;
    this.scene.stop('Farm');
    this.scene.start('Title');
  }

  private syncBusy() {
    gameState.uiBusy = this.busy();
  }

  // ---------------- 剧情对话、名字、总菜单 ----------------

  /** 播一段剧本对话（比如和周里正说话） */
  private playStory(knot: string, onDone?: () => void) {
    this.closeMenu();
    this.closeDialog();
    this.story.play(knot, () => {
      this.syncBusy();
      this.refreshNotebookIcon();
      onDone?.();
    });
    this.syncBusy();
  }

  /** M 菜单里的「改名字」 */
  private async rename() {
    this.naming = true;
    this.syncBusy();
    const name = await askName(this.game, { title: t('nameInput.renameTitle'), initial: gameState.playerName, cancellable: true });
    this.naming = false;
    if (name) {
      gameState.playerName = name;
      this.say('nameInput.renamed', { name });
    }
    this.syncBusy();
  }

  /** 旧存档没有名字：先补填（不能跳过） */
  private async fillInName() {
    this.naming = true;
    this.syncBusy();
    const name = await askName(this.game, { title: t('nameInput.fillIn') });
    gameState.playerName = name ?? '';
    this.naming = false;
    this.syncBusy();
  }

  /** 打开 Q 总菜单 */
  private openGameMenu(tab: MenuTabId) {
    if (this.scene.isActive('GameMenu')) return;
    this.scene.launch('GameMenu', { tab });
    this.notebookIcon.getData('flash')?.stop();
    this.notebookIcon.setAlpha(1);
  }

  /** 右上角：最右边是齿轮（设置），左边是笔记本（拿到笔记本后出现，点一下打开） */
  private buildCornerButtons(W: number) {
    const size = SETTINGS.ui.cornerButton;
    const button = (x: number, draw: (g: Phaser.GameObjects.Graphics) => Phaser.GameObjects.GameObject | null, onPress: () => void) => {
      const g = this.add.graphics();
      drawPanel(g, 0, 0, size, size);
      const extra = draw(g);
      const hit = this.add.zone(0, 0, size, size).setOrigin(0).setInteractive();
      hit.on('pointerdown', onPress);
      return this.add.container(x, 4, extra ? [g, extra, hit] : [g, hit]).setDepth(45);
    };
    this.gearButton = button(W - size - 4, (g) => {
      drawGear(g, size / 2, size / 2, toColor(SETTINGS.ui.text));
      return null;
    }, () => this.openSettings());
    this.notebookIcon = button(W - 2 * size - 8, () => this.add.image(size / 2, size / 2, 'icon_notebook'), () => !this.busy() && this.openGameMenu('notebook'));
    this.refreshNotebookIcon();
    if (!gameState.playerName && (gameState.prologue === 'tutorial' || gameState.prologue === 'done')) void this.fillInName();
  }

  private refreshNotebookIcon() {
    this.notebookIcon.setVisible(hasItem('notebook'));
  }

  /** 笔记本有新内容：图标闪几下 */
  private flashNotebook() {
    this.refreshNotebookIcon();
    this.notebookIcon.getData('flash')?.stop();
    this.notebookIcon.setAlpha(1);
    const tw = this.tweens.add({ targets: this.notebookIcon, alpha: 0.2, duration: 220, yoyo: true, repeat: 5, onComplete: () => this.notebookIcon.setAlpha(1) });
    this.notebookIcon.setData('flash', tw);
  }

  // ---------------- 工具栏 ----------------

  /** 底部正中 9 格（工具栏）：什么都能放；当前拿着的那格有橘色框。还没拿到开局物资时不显示 */
  private buildToolbar(W: number, H: number) {
    this.toolbar?.destroy();
    this.toolSlotX = [];
    this.layoutW = W;
    this.layoutH = H;
    this.toolbarSig = this.toolbarSignature();
    this.toolbar = this.add.container(0, 0).setDepth(40);
    if (!this.toolbarSig) return;
    const SL = SLOT();
    const n = TOOLBAR_SLOTS;
    const w = BAR_PAD * 2 + n * SL + (n - 1) * SLOT_GAP;
    const h = BAR_PAD * 2 + SL;
    const x0 = Math.round((W - w) / 2);
    const y0 = H - 2 - h;
    const g = this.add.graphics();
    this.toolbar.add(g);
    drawPanel(g, x0, y0, w, h);
    for (let i = 0; i < n; i++) {
      const x = x0 + BAR_PAD + i * (SL + SLOT_GAP);
      const y = y0 + BAR_PAD;
      this.toolSlotX.push(x);
      g.fillStyle(toColor(SETTINGS.ui.innerBorder)).fillRect(x, y, SL, SL);
      const slot = this.add.zone(x, y, SL, SL).setOrigin(0).setInteractive();
      this.toolbar.add(slot);
      slot.on('pointerdown', () => !this.busy() && this.selectTool(i));
      drawItemSlot(this, this.toolbar, x, y, SL, gameState.slots[i]);
    }
    // 当前那格的框：画在 (0,0)，每帧挪到选中的那格
    this.toolCursor = this.add.graphics().setY(y0 + BAR_PAD - 1);
    this.toolbar.add(this.toolCursor);
    drawFrame(this.toolCursor, 0, 0, SL + 2, SL + 2, toColor(SETTINGS.ui.toolSelected));
  }

  private itemName(id: string) {
    return localName(itemsData.items.find((it) => it.id === id)?.name);
  }

  private selectTool(i: number) {
    if (i >= 0 && i < TOOLBAR_SLOTS) gameState.selected = i;
  }
}

/** 画一个小齿轮（设置按钮），中心在 (cx, cy) */
function drawGear(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number) {
  g.fillStyle(color);
  // 八个齿
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.fillRect(Math.round(cx + Math.cos(a) * 6.5) - 1, Math.round(cy + Math.sin(a) * 6.5) - 1, 3, 3);
  }
  g.fillCircle(cx, cy, 6);
  g.fillStyle(toColor(SETTINGS.ui.panel)).fillCircle(cx, cy, 2.5);
}
