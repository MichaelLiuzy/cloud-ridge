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
import { TINY_DIGIT_H, drawCoin, drawTinyNumber } from '../ui/tinyDigits';
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
import { hasItem } from '../systems/GameState';
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


/** 底部工具栏、对话框的大小和位置（左上角时辰框的大小在 settings.ts 的 ui.infoBox） */
const SLOT = 18;
const SLOT_GAP = 2;
const BAR_PAD = 3;
const DIALOG = { w: 240, h: 46 };

export class HudScene extends Phaser.Scene {
  private dateText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  /** 时辰框的底板、钱数（迷你数字）、体力条：内容变了才重画 */
  private infoBg!: Phaser.GameObjects.Graphics;
  private infoMoney!: Phaser.GameObjects.Graphics;
  private infoW = 0;
  private shownCash = -1;
  private shownStamina = -1;

  private dialog!: Phaser.GameObjects.Container;
  private dialogText!: Phaser.GameObjects.Text;

  private menu?: ListMenu;
  /** 剧情对话框（ink 剧本） */
  private story!: DialogueBox;
  /** 正在输入名字 */
  private naming = false;
  /** 右上角的笔记本图标（拿到笔记本后出现，有新内容会闪） */
  private notebookIcon!: Phaser.GameObjects.Container;

  private toolCursor!: Phaser.GameObjects.Graphics;
  /** 工具栏的所有东西（工具变了时整个重画） */
  private toolbar?: Phaser.GameObjects.Container;
  /** 对话框开着时又来的话，排队等着 */
  private sayQueue: [string, Record<string, string | number> | undefined][] = [];
  /** 正在选数量 */
  private picker?: QuantityPicker;
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

    // ---- 左上角时辰框：第一行日期、时辰；第二行钱、体力条（大小在 settings.ts 的 ui.infoBox）----
    const box = ui.infoBox;
    this.infoBg = this.add.graphics();
    this.infoMoney = this.add.graphics();
    this.dateText = pixelText(this, box.x + box.padding, box.y + box.padding + box.textNudgeY, '');
    // 时辰用褐色字，和日期分开
    this.timeText = pixelText(this, 0, box.y + box.padding + box.textNudgeY, '', { color: ui.textDim2 }).setOrigin(1, 0);
    this.infoW = 0;
    this.shownCash = -1;
    this.shownStamina = -1;

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

    // ---- 剧情对话框、笔记本图标 ----
    this.story = new DialogueBox(this);
    this.buildNotebookIcon();

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
      [INPUT_EVENTS.useTool, () => (this.story.active ? this.story.advance() : !this.busy() && ev.emit(UI_EVENTS.worldUseTool))],
      [INPUT_EVENTS.cancel, () => !gameState.menuOpen && (this.picker ? this.picker.cancel() : this.menu ? this.closeMenu() : this.closeDialog())],
      [INPUT_EVENTS.bag, () => !this.busy() && this.openGameMenu('bag')],
      [INPUT_EVENTS.menu, () => !this.busy() && this.gameMenu()],
      [INPUT_EVENTS.toolSlot, (i: number) => !this.busy() && this.selectTool(i)],
      [INPUT_EVENTS.nav, (dir: 'up' | 'down') => (this.picker ? this.picker.nudge(dir) : this.menu?.move(dir === 'up' ? -1 : 1))],
      [INPUT_EVENTS.tap, (x: number, y: number) => this.onTap(x, y)],
      [INPUT_EVENTS.debugMemory, () => (gameState.memoryMode = !gameState.memoryMode)],
      [UI_EVENTS.say, (key: string, params?: Record<string, string | number>) => this.say(key, params)],
      [UI_EVENTS.showMenu, (opts: MenuOption[], title?: string) => this.openMenu(opts, title)],
      [UI_EVENTS.toolsChanged, () => this.buildToolbar(W, H)],
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
    this.refreshInfoBox(clock.shortDateText(), clock.shichen);
    const x = this.toolSlotX[gameState.toolIndex];
    if (x !== undefined) this.toolCursor.setX(x - 1);
  }

  // ---------------- 左上角时辰框 ----------------

  /** 日期、时辰、钱、体力有变化时才重画（每帧都会调用） */
  private refreshInfoBox(date: string, shichen: string) {
    const ui = SETTINGS.ui;
    const box = ui.infoBox;
    const bar = ui.staminaBar;
    if (this.dateText.text !== date) this.dateText.setText(date);
    if (this.timeText.text !== shichen) this.timeText.setText(shichen);
    // 框的宽度：至少 box.w；日期 + 时辰放不下就加宽
    const need = Math.ceil(this.dateText.width + 2 + this.timeText.width) + box.padding * 2;
    const w = Math.max(box.w, need);
    const stamina = Math.round((Math.max(0, Math.min(1, gameState.stamina / gameState.maxStamina))) * bar.w);
    if (w === this.infoW && gameState.cash === this.shownCash && stamina === this.shownStamina) return;
    this.infoW = w;
    this.shownCash = gameState.cash;
    this.shownStamina = stamina;
    this.timeText.setX(box.x + w - box.padding);
    // 底板
    this.infoBg.clear();
    drawPanel(this.infoBg, box.x, box.y, w, box.h);
    // 第二行：小铜钱 + 钱数（左），体力条（右），都贴着框的下边
    const rowY = box.y + box.h - box.padding - TINY_DIGIT_H;
    const g = this.infoMoney.clear();
    const money = toColor(ui.money);
    drawCoin(g, box.x + box.padding, rowY, money);
    drawTinyNumber(g, box.x + box.padding + 7, rowY, gameState.cash, money);
    const bx = box.x + w - box.padding - bar.w;
    const by = rowY + Math.floor((TINY_DIGIT_H - bar.h) / 2);
    const low = stamina <= bar.w * 0.25;
    g.fillStyle(toColor(ui.border)).fillRect(bx - 1, by - 1, bar.w + 2, bar.h + 2);
    g.fillStyle(toColor(ui.innerBorder)).fillRect(bx, by, bar.w, bar.h);
    g.fillStyle(toColor(low ? ui.staminaLow : ui.staminaFull)).fillRect(bx, by, stamina, bar.h);
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
        { label: t('menu.rename'), run: () => void this.rename() },
        // 测试用（settings.ts 的 debugMenu 改成 false 就没有了）
        ...(SETTINGS.debugMenu ? [{ label: t('menu.debug'), run: () => this.debugMenu() }] : []),
      ],
      t('menu.title'),
    );
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

  /** 右上角（手机上在菜单键左边）的笔记本图标：点一下打开笔记本 */
  private buildNotebookIcon() {
    const { gameWidth: W } = SETTINGS;
    const x = this.touch ? W - 2 * SETTINGS.touch.smallButtonRadius - 8 - 22 : W - 22;
    const g = this.add.graphics();
    drawPanel(g, 0, 0, 20, 20);
    const icon = this.add.image(10, 10, 'icon_notebook');
    const hit = this.add.zone(0, 0, 20, 20).setOrigin(0).setInteractive();
    hit.on('pointerdown', () => !this.busy() && this.openGameMenu('notebook'));
    this.notebookIcon = this.add.container(x, 2, [g, icon, hit]).setDepth(45);
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

  /** 底部正中一排格子，每格放工具图标；当前拿着的那格有橘色框 */
  private buildToolbar(W: number, H: number) {
    this.toolbar?.destroy();
    this.toolSlotX = [];
    this.toolbar = this.add.container(0, 0).setDepth(40);
    const n = gameState.tools.length;
    if (!n) return; // 还没拿到工具（序章里周里正给之前）
    const w = BAR_PAD * 2 + n * SLOT + (n - 1) * SLOT_GAP;
    const h = BAR_PAD * 2 + SLOT;
    const x0 = Math.round((W - w) / 2);
    const y0 = H - 2 - h;
    const g = this.add.graphics();
    this.toolbar.add(g);
    drawPanel(g, x0, y0, w, h);
    gameState.tools.forEach((id, i) => {
      const x = x0 + BAR_PAD + i * (SLOT + SLOT_GAP);
      const y = y0 + BAR_PAD;
      this.toolSlotX.push(x);
      g.fillStyle(toColor(SETTINGS.ui.innerBorder)).fillRect(x, y, SLOT, SLOT);
      const slot = this.add.zone(x, y, SLOT, SLOT).setOrigin(0).setInteractive();
      this.toolbar!.add(slot);
      slot.on('pointerdown', () => !this.busy() && this.selectTool(i));
      const key = `icon_${id}`;
      this.toolbar!.add(
        this.textures.exists(key)
          ? this.add.image(x + SLOT / 2, y + SLOT / 2, key)
          : pixelText(this, x + SLOT / 2, y + SLOT / 2, this.itemName(id).slice(0, 1)).setOrigin(0.5),
      );
    });
    // 当前工具的框：画在 (0,0)，每帧挪到选中的那格
    this.toolCursor = this.add.graphics().setY(y0 + BAR_PAD - 1);
    this.toolbar.add(this.toolCursor);
    drawFrame(this.toolCursor, 0, 0, SLOT + 2, SLOT + 2, toColor(SETTINGS.ui.toolSelected));
  }

  private itemName(id: string) {
    return localName(itemsData.items.find((it) => it.id === id)?.name);
  }

  private selectTool(i: number) {
    if (i < gameState.tools.length) gameState.toolIndex = i;
  }
}
