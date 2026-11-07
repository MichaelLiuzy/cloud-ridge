/**
 * 界面场景：叠在地图上面，不跟着镜头动。
 * 负责：左上角的日期/时间/钱/体力、底部工具栏、对话框、小菜单、手机按钮。
 * 所有操作（键盘、鼠标、手指）都先到这里：对话框或小菜单开着时由这里处理，
 * 否则再转给地图（FarmScene）。
 * 文字内容在 src/locales/zh.ts，颜色在 src/config/settings.ts 的 ui。
 * 画在界面层（大约 640×360），下面的数字都是界面像素。
 */
import { UI_EVENTS, FARM_EVENTS, SETTINGS_EVENTS } from '../config/events';
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { VIEW, VIEW_EVENTS, setupUiCamera, uiSize } from '../config/view';
import { PALETTE, toColor } from '../config/palette';
import { dayTagsText, weatherName, weekdayName } from '../systems/days';
import { localName, t } from '../locales/i18n';
import { INPUT_EVENTS, PointerControls, makeRoundButton } from '../input/Controls';
import { drawFrame, drawPanel, pixelText, artIcon } from '../ui/pixelUi';
import { drawCoin } from '../ui/tinyDigits';
import { DialogueBox } from '../ui/DialogueBox';
import { askName } from '../ui/nameInput';
import { CHAPTERS, type ChapterId } from '../data/clues';
import { fillNames } from '../story/text';
import { STORY_EVENTS, debugNextChapter, fireStoryEvent, storyEvents } from '../systems/story/notebook';
import type { FarmScene } from './FarmScene';
import { debugSetAffection } from '../systems/affection';
import { AFFECTION } from '../data/affection';
import { pickupOfferReady, unlockPickup } from '../systems/economy/pickup';
import { SERVICES } from '../data/services';
import { TOOLBAR_SLOTS, hasItem, itemName } from '../systems/inventory';
import { drawItemSlot } from '../ui/itemSlot';
import { wrapText } from '../ui/richText';
import type { MenuTabId } from '../data/menuTabs';
import { loadPrefs, setPref } from '../systems/prefs';
import { gameState } from '../systems/GameState';
import { ListMenu, type MenuOption } from '../ui/ListMenu';
import { QuantityPicker } from '../ui/QuantityPicker';
import { downloadText } from '../ui/fileTransfer';
import { exportText } from '../systems/save/saveManager';
import { eatFromSlot, isFood } from '../systems/food';
import { sendLetter } from '../systems/mail';



/**
 * 底部工具栏、提示框的大小（界面像素；左上角时辰框的大小在 settings.ts 的 ui.infoBox）。
 * 工具栏格子随图标放大倍数（settings.ts 的 ui.iconScale）变；提示框整体再放大 ui.dialogueScale 倍。
 */
const SLOT = () => 16 * SETTINGS.ui.iconScale + 2;
const SLOT_GAP = 2;
const BAR_PAD = 3;

export class HudScene extends Phaser.Scene {
  private dateText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  /** 钟点「6:00 am」（整点才变） */
  private clockText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  /** 第三行天气、第四行节日 / 节气 / 赶集（没有就不显示这一行） */
  private weatherText!: Phaser.GameObjects.Text;
  private tagsText!: Phaser.GameObjects.Text;
  private staminaLabel!: Phaser.GameObjects.Text;
  private purseIcon!: Phaser.GameObjects.Image | null;
  private staminaIcon!: Phaser.GameObjects.Image | null;
  /** 时辰框的底板、铜钱和体力条：内容变了才重画 */
  private infoBg!: Phaser.GameObjects.Graphics;
  private infoMoney!: Phaser.GameObjects.Graphics;
  /** 体力条上面的透明感应区，和弹出的「81/100」小提示 */
  private staminaHit!: Phaser.GameObjects.Zone;
  private staminaTip?: Phaser.GameObjects.Container;
  private staminaTipTimer?: Phaser.Time.TimerEvent;
  private infoKey = '';
  /** 时辰框整体（收起时往左滑出去）、框右边的收起箭头、收起后左上角的小标签 */
  private infoLayer!: Phaser.GameObjects.Container;
  private foldArrow!: Phaser.GameObjects.Text;
  private foldTab!: Phaser.GameObjects.Container;
  private foldTabText!: Phaser.GameObjects.Text;
  /** 时辰框现在多宽（含箭头那一条） */
  private infoW = 0;
  /** 界面大小变了但正忙着（对话、菜单），等空下来再重新排版 */
  private relayoutPending = false;

  /** 右下角的提示字幕（最新的在最下面） */
  private subtitles: Phaser.GameObjects.Text[] = [];

  private menu?: ListMenu;
  /** 剧情对话框（ink 剧本） */
  private story!: DialogueBox;
  /** 正在输入名字 */
  private naming = false;
  /** 右上角的笔记本图标（拿到笔记本后出现，有新内容会闪） */
  private notebookIcon!: Phaser.GameObjects.Container;
  /** 右上角的齿轮（设置） */

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
  private touch = false;
  /** 一格的说明：鼠标停住 / 手机长按时跟着手指的小框，键盘时工具栏上面那一条（settings.ts 的 ui.hoverTip） */
  private tip!: Phaser.GameObjects.Container;
  private facingTip!: Phaser.GameObjects.Container;
  /** 鼠标最后停在哪、什么时候停下的（停在按钮上不算）；手机上按住的那根手指 */
  private hover: { x: number; y: number; at: number; onUi: boolean } | null = null;
  private press: { p: Phaser.Input.Pointer; x: number; y: number } | null = null;

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

    // ---- 左上角时辰框（大小在 settings.ts 的 ui.infoBox）----
    //  日期和星期 / 时辰和钟点 / 天气 /（节日、节气、赶集）/ 钱和体力。每行的 y 在 refreshInfoBox 里排
    const box = ui.infoBox;
    this.infoBg = this.add.graphics();
    this.infoMoney = this.add.graphics();
    const x0 = box.x + box.padding;
    this.dateText = pixelText(this, x0, 0, '');
    // 时辰用褐色字，和钟点分开
    this.timeText = pixelText(this, x0, 0, '', { color: ui.textDim2 });
    this.clockText = pixelText(this, 0, 0, '');
    this.weatherText = pixelText(this, x0 + 12, 0, '');
    this.tagsText = pixelText(this, x0, 0, '', { color: ui.money });
    this.moneyText = pixelText(this, x0 + 9, 0, '', { color: ui.money });
    this.staminaLabel = pixelText(this, 0, 0, t('hud.staminaLabel'));
    // 有钱袋、体力的图标就用图（没有就是代码画的铜钱和「体力」两个字）
    this.purseIcon = artIcon(this, 'icon_purse', x0 + 3, 0);
    this.staminaIcon = artIcon(this, 'icon_stamina', 0, 0);
    this.staminaLabel.setVisible(!this.staminaIcon);
    this.staminaHit = this.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive();
    this.staminaHit.on('pointerover', () => !this.touch && this.showStaminaTip());
    this.staminaHit.on('pointerout', () => !this.touch && this.hideStaminaTip());
    this.staminaHit.on('pointerdown', () => this.touch && this.showStaminaTip(ui.staminaTipMs));
    this.infoKey = '';
    this.staminaTip = undefined;
    // 收起箭头（在框的右边）和收起后的小标签（左上角）
    const fold = ui.infoFold;
    this.foldArrow = pixelText(this, 0, 0, '◀', { color: ui.textDim2, size: ui.smallFontSize }).setOrigin(0.5);
    const arrowHit = this.add.zone(0, 0, fold.arrowW, box.h).setOrigin(0).setInteractive();
    arrowHit.on('pointerdown', () => this.toggleInfo());
    this.foldArrow.setData('hit', arrowHit);
    this.infoLayer = this.add.container(0, 0, [
      this.infoBg, this.infoMoney, this.dateText, this.timeText, this.clockText, this.weatherText, this.tagsText,
      this.moneyText, this.staminaLabel, this.staminaHit, this.foldArrow, arrowHit,
      ...[this.purseIcon, this.staminaIcon].filter((x): x is Phaser.GameObjects.Image => !!x),
    ]);
    const tabG = this.add.graphics();
    drawPanel(tabG, 0, 0, fold.tabW, fold.tabH);
    this.foldTabText = pixelText(this, fold.tabW / 2, fold.tabH / 2, '', { color: ui.text }).setOrigin(0.5);
    const tabHit = this.add.zone(0, 0, fold.tabW, fold.tabH).setOrigin(0).setInteractive();
    tabHit.on('pointerdown', () => this.toggleInfo());
    this.foldTab = this.add.container(box.x, box.y, [tabG, this.foldTabText, tabHit]).setVisible(loadPrefs().infoFolded);

    // ---- 底部工具栏 ----
    this.buildToolbar(W, H);

    // ---- 提示字幕（右下角，见 say()）----
    this.subtitles = [];
    this.sayQueue = [];

    // ---- 一格的说明（悬停、长按、面前那一格）----
    this.tip = this.add.container(0, 0).setDepth(55).setVisible(false);
    this.facingTip = this.add.container(0, 0).setDepth(44).setVisible(false);
    this.hover = null;
    this.press = null;
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.touch) return;
      const at = this.cameras.main.getWorldPoint(p.x, p.y);
      this.hover = { x: at.x, y: at.y, at: this.time.now, onUi: this.input.hitTestPointer(p).length > 0 };
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: unknown[]) => {
      this.hover = null; // 点了就先收起
      if (this.touch && over.length === 0) this.press = { p, x: p.x, y: p.y };
    });
    this.input.on('pointerup', () => (this.press = null));

    // ---- 剧情对话框、右上角的齿轮和笔记本 ----
    this.story = new DialogueBox(this);
    this.buildCornerButtons(W);

    // ---- 鼠标 / 手指 ----
    new PointerControls(this, this.touch);
    if (this.touch) {
      // 右下角的交互按钮（背包从右上角的菜单进）
      const cfg = SETTINGS.touch;
      const action = makeRoundButton(this, cfg.actionButtonRadius, () => this.game.events.emit(INPUT_EVENTS.action, 'smart'));
      action.setPosition(W - cfg.actionButtonRadius - cfg.actionButtonMargin.right, H - cfg.actionButtonRadius - cfg.actionButtonMargin.bottom);
    }

    // ---- 接收指令 ----
    const ev = this.game.events;
    const handlers: [string, (...a: any[]) => void][] = [
      [INPUT_EVENTS.action, (mode?: string) => this.onAction(mode)],
      [INPUT_EVENTS.useTool, () => (this.story.active ? this.story.advance() : !this.busy() && (this.offerEat() || ev.emit(UI_EVENTS.worldUseTool)))],
      // Esc：先关掉正开着的东西；什么都没开就打开设置
      [INPUT_EVENTS.cancel, () => this.onCancel()],
      [INPUT_EVENTS.bag, () => !this.busy() && this.openGameMenu('bag')],
      [INPUT_EVENTS.menu, () => !this.busy() && this.openSettings()],
      [SETTINGS_EVENTS.action, (id: string) => this.settingsAction(id)],
      [INPUT_EVENTS.toolSlot, (i: number) => !this.busy() && this.selectTool(i)],
      [INPUT_EVENTS.nav, (dir: 'up' | 'down') => (this.picker ? this.picker.nudge(dir) : this.menu?.move(dir === 'up' ? -1 : 1))],
      [INPUT_EVENTS.tap, (x: number, y: number) => this.onTap(x, y)],
      [INPUT_EVENTS.debugMemory, () => (gameState.memoryMode = !gameState.memoryMode)],
      [INPUT_EVENTS.foldInfo, () => this.toggleInfo()],
      [UI_EVENTS.say, (key: string, params?: Record<string, string | number>) => this.say(key, params)],
      [UI_EVENTS.showMenu, (opts: MenuOption[], title?: string) => this.openMenu(opts, title)],
      [VIEW_EVENTS.changed, () => this.relayout()],
      [UI_EVENTS.askQuantity, (title: string, max: number, onDone: (n: number | null) => void) => this.askQuantity(title, max, onDone)],
      [UI_EVENTS.playDialogue, (knot: string, onDone?: () => void) => this.playStory(knot, onDone)],
    ];
    const onNew = () => this.flashNotebook();
    const onChapter = (id: ChapterId) => this.say('notebook.newChapter', { name: fillNames(localName(CHAPTERS[id].name)) });
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
    });
  }

  update() {
    const clock = gameState.clock;
    if (!clock) return;
    if (this.relayoutPending) this.relayout();
    this.refreshInfoBox(t('hud.dateWeek', { date: clock.shortDateText(), weekday: weekdayName(clock.day) }), clock.shichen, clock.clockText(), dayTagsText(clock.month, clock.day));
    // 工具栏里的东西变了（用掉种子、在背包里挪了位置……）：重画
    const sig = this.toolbarSignature();
    if (sig !== this.toolbarSig) this.buildToolbar(this.layoutW, this.layoutH);
    const x = this.toolSlotX[gameState.selected];
    if (x !== undefined) this.toolCursor?.setX(x - 1);
    this.refreshTips();
  }

  /** 一格的说明：鼠标停住一会儿 / 手机按住不放时在旁边弹小框；键盘玩时面前那一格写在工具栏上面 */
  private refreshTips() {
    const cfg = SETTINGS.ui.hoverTip;
    const farm = this.scene.get('Farm') as FarmScene;
    const idle = !this.busy() && this.scene.isActive('Farm');
    let text: string | null = null;
    let at = { x: 0, y: 0 };
    if (idle && this.hover && !this.hover.onUi && this.time.now - this.hover.at >= cfg.delayMs) {
      at = this.hover;
      text = farm.infoAtScreen(at.x, at.y);
    }
    const pr = this.press;
    if (idle && pr && pr.p.isDown && this.time.now - pr.p.downTime >= cfg.longPressMs) {
      if (Math.hypot(pr.p.x - pr.x, pr.p.y - pr.y) > SETTINGS.touch.joystickDeadZone * VIEW.ui) this.press = null; // 手指动了：是摇杆，不是长按
      else {
        at = this.cameras.main.getWorldPoint(pr.x, pr.y);
        text = farm.infoAtScreen(at.x, at.y);
      }
    }
    this.setTip(this.tip, text, at.x + cfg.offsetX, at.y + cfg.offsetY);
    // 键盘：面前那一格（手机上不显示，免得挡住）
    const facing = idle && !this.touch ? farm.infoFacing() : null;
    const { w: W, h: H } = uiSize();
    this.setTip(this.facingTip, facing, W / 2, H - 2 - (SLOT() + BAR_PAD * 2) - 4, true);
  }

  /** 把说明写进小框。center = 以 (x, y) 为底边中点；否则 (x, y) 是左上角（太靠边会挪回屏幕里） */
  private setTip(box: Phaser.GameObjects.Container, text: string | null, x: number, y: number, center = false) {
    if (!text) return void box.setVisible(false);
    if (box.getData('text') !== text) {
      box.removeAll(true).setData('text', text);
      const label = pixelText(this, 5, 3, wrapText(text, SETTINGS.ui.hoverTip.maxW).join('\n'));
      const g = this.add.graphics();
      drawPanel(g, 0, 0, Math.ceil(label.width) + 10, Math.ceil(label.height) + 6);
      box.add([g, label]).setSize(Math.ceil(label.width) + 10, Math.ceil(label.height) + 6);
    }
    const { w: W, h: H } = uiSize();
    if (center) {
      x -= box.width / 2;
      y -= box.height;
    }
    box.setPosition(Math.round(Math.max(2, Math.min(x, W - box.width - 2))), Math.round(Math.max(2, Math.min(y, H - box.height - 2)))).setVisible(true);
  }

  /** 工具栏 9 格现在放了什么（变了才重画） */
  private toolbarSignature() {
    const show = gameState.flags.startKitGiven || gameState.slots.slice(0, TOOLBAR_SLOTS).some(Boolean);
    return show ? JSON.stringify(gameState.slots.slice(0, TOOLBAR_SLOTS)) + gameState.water : ''; // 水桶的水量变了也要重画
  }

  // ---------------- 左上角时辰框 ----------------

  /** 日期、时辰、钟点、天气、节日、钱、体力有变化时才重画（每帧都会调用） */
  private refreshInfoBox(date: string, shichen: string, hourText: string, tags: string) {
    const ui = SETTINGS.ui;
    const box = ui.infoBox;
    const bar = ui.staminaBar;
    const stamina = Math.round(Math.max(0, Math.min(1, gameState.stamina / gameState.maxStamina)) * bar.w);
    const weather = gameState.weather;
    const key = [date, shichen, hourText, tags, weather, gameState.cash, stamina].join('|');
    if (key === this.infoKey) return;
    this.infoKey = key;
    // 一行一行往下排；今天没有节日 / 节气 / 赶集，就少一行
    let y = box.y + box.padding + box.textNudgeY;
    const nextRow = () => {
      const at = y;
      y += box.lineH;
      return at;
    };
    // 第一行：正月十六 周二
    this.dateText.setText(date).setY(nextRow());
    // 第二行：辰时 · 8:00 am
    const row2 = nextRow();
    this.timeText.setText(`${shichen}${t('calendar.joiner')}`).setY(row2);
    this.clockText.setText(hourText).setPosition(this.timeText.x + Math.ceil(this.timeText.width), row2);
    // 第三行：天气图标 + 晴
    const row3 = nextRow();
    this.weatherText.setText(weatherName(weather)).setY(row3);
    // 第四行：元宵 · 立春 · 赶集日
    this.tagsText.setText(tags).setVisible(!!tags);
    if (tags) this.tagsText.setY(nextRow());
    // 最后一行：铜钱 + 钱数（左），「体力」+ 体力条（右）
    const rowY = nextRow();
    this.moneyText.setText(String(gameState.cash)).setY(rowY);
    this.staminaLabel.setY(rowY);
    const widest = Math.max(
      this.dateText.width,
      this.clockText.x - this.timeText.x + this.clockText.width,
      12 + this.weatherText.width,
      tags ? this.tagsText.width : 0,
    );
    const rowsW = Math.ceil(widest) + box.padding * 2;
    const labelW = this.staminaIcon ? 8 : Math.ceil(this.staminaLabel.width);
    const moneyW = 9 + Math.ceil(this.moneyText.width) + 10 + labelW + 4 + bar.w + box.padding * 2;
    const w = Math.max(box.w, rowsW, moneyW);
    const fold = ui.infoFold;
    const h = Math.max(box.h, y - box.y - box.textNudgeY + box.padding - 2);
    // 底板
    this.infoBg.clear();
    drawPanel(this.infoBg, box.x, box.y, w + fold.arrowW, h);
    this.infoW = w + fold.arrowW;
    // 收起箭头：框右边那一条，竖着居中
    this.foldArrow.setPosition(box.x + w + fold.arrowW / 2 - 1, box.y + h / 2);
    (this.foldArrow.getData('hit') as Phaser.GameObjects.Zone).setPosition(box.x + w - 2, box.y).setSize(fold.arrowW + 2, h);
    // 收起后的小标签：钟点 + ▶（放不下就只有 ▶）
    this.foldTabText.setText(`${hourText} ▶`);
    if (this.foldTabText.width > fold.tabW - 6) this.foldTabText.setText('▶');
    if (loadPrefs().infoFolded && !this.tweens.isTweening(this.infoLayer)) this.infoLayer.x = this.foldedX();
    const g = this.infoMoney.clear();
    drawWeatherIcon(g, box.x + box.padding, row3 + 7, weather);
    const money = toColor(ui.money);
    const midY = rowY + 7; // 字的中线
    if (this.purseIcon) this.purseIcon.setY(midY);
    else drawCoin(g, box.x + box.padding, midY - 2, money);
    const bx = box.x + w - box.padding - bar.w;
    const by = midY - Math.floor(bar.h / 2);
    this.staminaLabel.setX(bx - 4 - labelW);
    this.staminaIcon?.setPosition(bx - 4 - labelW / 2, midY);
    const low = stamina <= bar.w * 0.25;
    g.fillStyle(toColor(ui.border)).fillRect(bx - 1, by - 1, bar.w + 2, bar.h + 2);
    g.fillStyle(toColor(ui.innerBorder)).fillRect(bx, by, bar.w, bar.h);
    g.fillStyle(toColor(low ? ui.staminaLow : ui.staminaFull)).fillRect(bx, by, stamina, bar.h);
    // 鼠标移上去 / 手指点一下的感应区：「体力」两个字加体力条
    this.staminaHit.setPosition(this.staminaLabel.x - 2, rowY - 1).setSize(bx + bar.w + 2 - this.staminaLabel.x + 2, 16);
    this.staminaHit.input?.hitArea.setTo(0, 0, this.staminaHit.width, this.staminaHit.height);
    if (this.staminaTip) this.showStaminaTip();
  }

  /** 收起时时辰框滑到哪（整个框滑出屏幕左边） */
  private foldedX() {
    return -(SETTINGS.ui.infoBox.x + this.infoW + 2);
  }

  /** 收起 / 展开时辰框（记在这台设备上） */
  private toggleInfo() {
    const folded = !loadPrefs().infoFolded;
    setPref('infoFolded', folded);
    this.hideStaminaTip();
    if (!folded) this.foldTab.setVisible(false);
    this.tweens.killTweensOf(this.infoLayer);
    this.tweens.add({
      targets: this.infoLayer,
      x: folded ? this.foldedX() : 0,
      duration: SETTINGS.ui.infoFold.slideMs,
      ease: 'Quad.easeOut',
      onComplete: () => this.foldTab.setVisible(folded),
    });
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
    return !!this.menu || !!this.picker || this.story.active || this.naming || gameState.menuOpen;
  }

  /** 回车 / 手机交互按钮 */
  private onAction(mode?: string) {
    if (gameState.menuOpen || this.naming) return;
    if (this.picker) return this.picker.confirm();
    if (this.story.active) return this.story.advance();
    if (this.menu) return this.menu.choose();
    if (mode === 'smart' && this.offerEat()) return;
    this.game.events.emit(mode === 'smart' ? UI_EVENTS.worldSmart : UI_EVENTS.worldAction);
  }

  /** 点了屏幕空白处（不是按钮） */
  private onTap(x: number, y: number) {
    if (gameState.menuOpen || this.naming || this.picker) return;
    if (this.story.active) return this.story.advance();
    if (this.menu) return this.closeMenu(); // 点菜单外面 = 取消
    this.game.events.emit(UI_EVENTS.worldTap, x, y);
  }

  // ---------------- 提示字幕 ----------------

  /**
   * 系统提示（得到东西、背包满了……）：右下角一行字，不挡操作、不用点。
   * 停 ui.subtitle.holdMs 后渐隐；新提示从下面出来，旧的往上推，最多 maxLines 条，再多的排队等前面的消失。
   * 人物对话、剧情还是用对话框（DialogueBox）。
   */
  say(key: string, params?: Record<string, string | number>) {
    const cfg = SETTINGS.ui.subtitle;
    if (this.subtitles.length >= cfg.maxLines) {
      this.sayQueue.push([key, params]);
      return;
    }
    const line = pixelText(this, 0, 0, t(key, params), { color: cfg.color, wrap: cfg.maxW, align: 'right' })
      .setOrigin(1, 1)
      .setStroke(cfg.stroke, 3)
      .setDepth(50);
    this.subtitles.push(line);
    this.layoutSubtitles();
    this.tweens.add({
      targets: line,
      alpha: 0,
      delay: cfg.holdMs,
      duration: cfg.fadeMs,
      onComplete: () => {
        line.destroy();
        this.subtitles = this.subtitles.filter((l) => l !== line);
        this.layoutSubtitles();
        const next = this.sayQueue.shift();
        if (next) this.say(next[0], next[1]);
      },
    });
  }

  /** 字幕从下往上排：最新的贴着工具栏上方（手机上在交互按钮上方）的右边 */
  private layoutSubtitles() {
    const { w: W, h: H } = uiSize();
    const cfg = SETTINGS.ui.subtitle;
    const touch = SETTINGS.touch;
    let y = this.touch ? H - touch.actionButtonRadius * 2 - 8 - cfg.gap : H - SLOT() - BAR_PAD * 2 - 2 - cfg.gap;
    for (let i = this.subtitles.length - 1; i >= 0; i--) {
      const l = this.subtitles[i];
      l.setPosition(W - cfg.right, y);
      y -= Math.ceil(l.height) + cfg.gap;
    }
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
        { label: t('menu.debugToSunday'), run: () => ev.emit(FARM_EVENTS.debugToSunday) },
        { label: t('menu.debugLetter'), run: () => (sendLetter('debug_test'), this.say('msg.mailArrived')) },
        { label: t('menu.debugBuild'), run: () => ev.emit(FARM_EVENTS.debugBuild) },
        { label: t('menu.debugPickup', { points: SERVICES.pickup.unlockHearts * AFFECTION.pointsPerHeart, hearts: SERVICES.pickup.unlockHearts }), run: () => this.debugPickup() },
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
    button(W - size - 4, (g) => {
      const icon = artIcon(this, 'icon_gear', size / 2, size / 2, 1);
      if (!icon) drawGear(g, size / 2, size / 2, toColor(SETTINGS.ui.text));
      return icon;
    }, () => this.openSettings());
    this.notebookIcon = button(W - 2 * size - 8, () => this.add.image(size / 2, size / 2, 'icon_notebook'), () => !this.busy() && this.openGameMenu('notebook'));
    this.refreshNotebookIcon();
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
      // 点一下换到这一格；是食物的话顺便问「吃一个」
      slot.on('pointerdown', () => {
        if (this.busy()) return;
        this.selectTool(i);
        this.offerEat();
      });
      drawItemSlot(this, this.toolbar, x, y, SL, gameState.slots[i]);
    }
    // 当前那格的框：画在 (0,0)，每帧挪到选中的那格
    this.toolCursor = this.add.graphics().setY(y0 + BAR_PAD - 1);
    this.toolbar.add(this.toolCursor);
    drawFrame(this.toolCursor, 0, 0, SL + 2, SL + 2, toColor(SETTINGS.ui.toolSelected));
  }


  private selectTool(i: number) {
    if (i >= 0 && i < TOOLBAR_SLOTS) gameState.selected = i;
  }

  /** 手上拿的是食物：弹出「吃一个 / 算了」（体力满着时再问一次）。不是食物返回 false */
  private offerEat() {
    const s = gameState.slots[gameState.selected];
    if (!s || !isFood(s.id)) return false;
    const name = itemName(s.id);
    const eat = () => {
      const ate = eatFromSlot(gameState.selected);
      if (ate) this.say('msg.ate', { name, n: ate.gain });
    };
    const full = () => gameState.stamina >= gameState.maxStamina;
    this.openMenu([{ label: t('bag.eat'), run: () => (full() ? this.openMenu([{ label: t('bag.eatAnyway'), run: eat }], t('bag.staminaFull')) : eat()) }], name);
    return true;
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

/**
 * 时辰框里的小天气图标（占位画法，9×9 像素左右），左边在 x、中线在 cy。
 * 以后有了天气图标的美术图，换成图片就行。
 */
function drawWeatherIcon(g: Phaser.GameObjects.Graphics, x: number, cy: number, weather: string) {
  const sun = toColor(PALETTE.candle);
  const sunEdge = toColor(PALETTE.orange);
  const cloud = toColor(PALETTE.ash);
  const cloudDark = toColor(PALETTE.stone);
  const drop = toColor(PALETTE.indigo);
  const snow = toColor(PALETTE.mist);
  const y = cy - 4;
  const drawCloud = (oy: number) => {
    g.fillStyle(cloudDark).fillRect(x, y + oy + 2, 9, 3).fillRect(x + 2, y + oy, 4, 2);
    g.fillStyle(cloud).fillRect(x + 1, y + oy + 2, 7, 2).fillRect(x + 3, y + oy + 1, 2, 1);
  };
  if (weather === 'sunny') {
    g.fillStyle(sunEdge).fillRect(x + 4, y, 1, 9).fillRect(x, y + 4, 9, 1);
    g.fillStyle(sunEdge).fillRect(x + 2, y + 2, 5, 5);
    g.fillStyle(sun).fillRect(x + 3, y + 2, 3, 5).fillRect(x + 2, y + 3, 5, 3);
  } else if (weather === 'cloudy') {
    drawCloud(2);
  } else if (weather === 'rain') {
    drawCloud(0);
    g.fillStyle(drop).fillRect(x + 1, y + 6, 1, 2).fillRect(x + 4, y + 7, 1, 2).fillRect(x + 7, y + 6, 1, 2);
  } else if (weather === 'snow') {
    drawCloud(0);
    g.fillStyle(snow).fillRect(x + 1, y + 6, 2, 2).fillRect(x + 5, y + 7, 2, 2);
  }
}
