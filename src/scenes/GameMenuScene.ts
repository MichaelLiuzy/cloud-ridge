/**
 * Q 总菜单：一个叠在游戏上面的全屏面板。
 *  - 顶部一排栏目（背包 / 笔记本 / 日历 / 地图，栏目表在 src/data/menuTabs.ts）。
 *    Tab 切到下一栏，Shift+Tab 切回上一栏；手机上直接点栏目名。
 *  - Q 或 Esc 关闭；右上角的 ✕ 也能关。
 *  - 点草棚里的箱子也是打开这里（chest = true）：只有背包一栏，左边多出箱子的格子。
 *  - 打开时游戏时间暂停（gameState.menuOpen = true，农场场景看到它就停）。
 * 背包、工具栏的格子数在 src/config/settings.ts 的 inventory 里，每格大小在 bag.slotSize。
 */
import { UI_EVENTS } from '../config/events';
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { VIEW_EVENTS, setupUiCamera, uiSize } from '../config/view';
import { toColor } from '../config/palette';
import { CHAPTERS, CLUES, QUESTIONS, type ClueId, type QuestionId } from '../data/clues';
import { MENU_TABS, NOTEBOOK_SECTIONS, type MenuTabId, type NotebookSectionId } from '../data/menuTabs';
import { ITEMS } from '../data/items';
import { isTouchDevice, keyIs } from '../input/Controls';
import { localName, t } from '../locales/i18n';
import { fillNames } from '../story/text';
import { gameState } from '../systems/GameState';
import { ALL_SLOTS, TOOLBAR_SLOTS, canStore, hasItem, isTool, itemInfo, itemName, moveSlot, slotAt, sortSlots, takeFromSlot, toggleLock, whyCantDiscard } from '../systems/inventory';
import { CHEST_PAGE, normalizeChest, transferSlot } from '../systems/home/storage';
import { shopSellPrice } from '../systems/economy/shop';
import { drawItemSlot, drawLock } from '../ui/itemSlot';
import { ListMenu } from '../ui/ListMenu';
import { QuantityPicker } from '../ui/QuantityPicker';
import { chaptersInOrder, chapterStarted, questionState } from '../systems/story/notebook';
import { drawFrame, drawPanel, pixelText } from '../ui/pixelUi';
import { drawLines, wrapRuns, wrapText, type Run } from '../ui/richText';
import { parseClueMarks } from '../story/text';
import { canGetClue, giveClue } from '../systems/story/notebook';
import { letterInfo, takeAttachments, type MailEntry } from '../systems/mail';
import { PLACEHOLDERS } from './BootScene';
import { PALETTE } from '../config/palette';
import { TIME } from '../data/time';
import { eatFromSlot, isFood } from '../systems/food';
import { dayEvents, dayName, monthName, seasonOf, weekdayIndex, weekdayName } from '../systems/days';

const LINE_H = 14;

export class GameMenuScene extends Phaser.Scene {
  /** 面板大小 = 界面层大小（大约 640×360，打开时按当前界面大小算） */
  private W = 640;
  private H = 360;
  /** 内容区（栏目条下面那块） */
  private AREA = { x: 8, y: 28, w: 640 - 16, h: 360 - 34 };
  private tab: MenuTabId | 'mail' = 'bag';
  private section: NotebookSectionId = 'story';
  /** 栏目条和内容各放一层，切栏目时只重画内容 */
  private tabBar!: Phaser.GameObjects.Container;
  private content!: Phaser.GameObjects.Container;
  /** 打开后一小会儿不理按键（免得打开菜单的那下 Q 又把它关掉） */
  private openedAt = 0;
  /** 背包：选中第几格（0 ~ 8 是工具栏，9 ~ 35 是背包，36 起是箱子） */
  private slot = 0;
  /** 鼠标停在第几格（没停在格子上是 null）：说明先显示这一格 */
  private hover: number | null = null;
  /** 开着箱子；箱子看到第几页 */
  private chest = false;
  private page = 0;
  /** 说明那块：画在哪、一层（鼠标移来移去时只重画这一层） */
  private infoBox = { x: 0, y: 0, w: 0 };
  private info?: Phaser.GameObjects.Container;
  /** 背包底下显示的一句话（丢掉了、不能丢的原因……） */
  private note = '';
  /** 数量框、确认框开着：这时背包不理按键和点击 */
  private modal?: { destroy: () => void };
  /** 鼠标 / 手指按在哪一格、按下的位置（拖动用） */
  private press: { i: number; x: number; y: number; dragging: boolean } | null = null;
  private ghost?: Phaser.GameObjects.Container;
  /** 丢弃时问「丢几个」的数量框 */
  private picker?: QuantityPicker;
  /** 笔记本：往下滚了多少像素，最多能滚多少 */
  private scroll = 0;
  private maxScroll = 0;
  private scrollLayer?: Phaser.GameObjects.Container;
  private touch = false;
  /** 日历：正在看几月、选中了哪一天 */
  private calMonth = 1;
  private calDay = 1;
  /** 开着信箱；选中第几封信 */
  private mail = false;
  private mailSel = 0;

  constructor() {
    super('GameMenu');
  }

  create(data: { tab?: MenuTabId; chest?: boolean; mail?: boolean }) {
    this.chest = !!data?.chest;
    this.mail = !!data?.mail;
    this.mailSel = 0;
    this.tab = this.mail ? 'mail' : this.chest ? 'bag' : (data?.tab ?? 'bag');
    this.slot = gameState.selected;
    this.hover = null;
    this.page = 0;
    normalizeChest();
    this.note = '';
    this.modal = undefined;
    this.picker = undefined;
    this.press = null;
    this.scroll = 0;
    this.touch = isTouchDevice();
    this.calMonth = gameState.clock?.month ?? 1;
    this.calDay = gameState.clock?.day ?? 1;
    this.openedAt = this.time.now;
    gameState.menuOpen = true;
    setupUiCamera(this);
    ({ w: this.W, h: this.H } = uiSize());
    this.AREA = { x: 8, y: 28, w: this.W - 16, h: this.H - 34 };
    // 界面大小变了（转屏）：重新打开
    const relayout = () => this.scene.restart({ tab: this.tab === 'mail' ? 'bag' : this.tab, chest: this.chest, mail: this.mail });
    this.game.events.on(VIEW_EVENTS.changed, relayout);
    this.events.once('shutdown', () => {
      this.game.events.off(VIEW_EVENTS.changed, relayout);
      this.modal?.destroy();
      this.modal = undefined;
      this.picker = undefined;
    });

    // 挡住下面的游戏：点在面板上不会穿到农场里
    this.add.zone(0, 0, this.W, this.H).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(toColor(SETTINGS.ui.border), 0.55).fillRect(0, 0, this.W, this.H);
    drawPanel(g, 2, 2, this.W - 4, this.H - 4);
    this.tabBar = this.add.container(0, 0);
    this.content = this.add.container(0, 0);
    this.buildKeys();
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scrollBy(dy > 0 ? LINE_H * 2 : -LINE_H * 2));
    // 手指 / 鼠标拖动：滚笔记本
    let dragY: number | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (dragY = p.y));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.tab === 'bag') return this.dragMove(p);
      if (dragY === null || !p.isDown) return;
      const d = dragY - p.y;
      if (Math.abs(d) >= 1) {
        this.scrollBy(d);
        dragY = p.y;
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      dragY = null;
      if (this.tab === 'bag') this.dragEnd(p);
    });
    this.redraw();
  }

  // ---------------- 按键 ----------------

  private buildKeys() {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.addCapture(SETTINGS.keys.switchTab.join(','));
    const keys = SETTINGS.keys;
    const is = keyIs;
    const onKey = (e: KeyboardEvent) => {
      if (this.time.now - this.openedAt < 120) return;
      // 数量框开着：回车确定、Esc 取消、上下加减十（左右由数量框自己管）
      if (this.picker) {
        if (is(keys.action, e)) this.picker.confirm();
        else if (is(keys.cancel, e)) this.picker.cancel();
        else if (is(keys.up, e)) this.picker.nudge('up');
        else if (is(keys.down, e)) this.picker.nudge('down');
        return;
      }
      if (this.modal) return;
      const page = is(keys.pagePrev, e) ? -1 : is(keys.pageNext, e) ? 1 : 0;
      if (is(keys.switchTab, e) && !this.chest && !this.mail) return this.switchTab(e.shiftKey ? -1 : 1);
      if (is(keys.bag, e) || is(keys.cancel, e)) return this.close();
      if (this.tab === 'bag') {
        if (is(keys.action, e)) return this.select(this.slot);
        if (is(keys.bagSort, e)) return this.sort(this.slot >= ALL_SLOTS);
        if (is(keys.bagTransfer, e) && this.chest) return this.transfer();
        if (page && this.chest) return this.flipPage(page);
        if (is(keys.bagDiscard, e)) return this.discard();
        if (is(keys.bagLock, e)) return this.lock();
        if (is(keys.bagEat, e)) return this.eat();
      }
      if (this.tab === 'mail' && is(keys.action, e)) return this.takeMail();
      if (this.tab === 'calendar' && page) return this.flipMonth(page);
      const dir = is(keys.up, e) ? 'up' : is(keys.down, e) ? 'down' : is(keys.left, e) ? 'left' : is(keys.right, e) ? 'right' : null;
      if (dir) this.nav(dir, e.shiftKey);
    };
    kb.on('keydown', onKey);
    this.events.once('shutdown', () => {
      kb.off('keydown', onKey);
      kb.removeCapture(SETTINGS.keys.switchTab.join(','));
    });
  }

  /** 方向键。背包里：移到那个方向最近的一格；按住 Shift 就把选中的东西也带过去 */
  private nav(dir: 'up' | 'down' | 'left' | 'right', shift = false) {
    if (this.tab === 'bag') {
      const c = (i: number) => {
        const r = this.cellRect(i);
        return { x: r.x + r.size / 2, y: r.y + r.size / 2 };
      };
      const here = c(this.slot);
      const [ax, ay] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
      let best = -1;
      let bestScore = Infinity;
      for (const i of this.visibleCells()) {
        const p = c(i);
        const along = (p.x - here.x) * ax + (p.y - here.y) * ay;
        const side = Math.abs((p.x - here.x) * ay + (p.y - here.y) * ax);
        if (along <= 1 || side > along * 2) continue;
        if (along + side * 2 < bestScore) [best, bestScore] = [i, along + side * 2];
      }
      if (best < 0) return;
      if (shift && slotAt(this.slot)) return this.moveTo(this.slot, best);
      this.select(best);
    } else if (this.tab === 'notebook') {
      if (dir === 'up' || dir === 'down') this.scrollBy(dir === 'down' ? LINE_H : -LINE_H);
      else this.switchSection(dir === 'right' ? 1 : -1);
    } else if (this.tab === 'mail') {
      if (dir === 'up' || dir === 'down') this.pickMail(this.mailSel + (dir === 'down' ? 1 : -1));
    } else if (this.tab === 'calendar') {
      // 选日子：左右一天、上下一周；翻过这个月的头尾就到上个月 / 下个月
      const step = { up: -7, down: 7, left: -1, right: 1 }[dir];
      const n = TIME.calendar.daysPerMonth;
      const d = this.calDay + step;
      const delta = d < 1 ? -1 : d > n ? 1 : 0;
      this.calDay = d - delta * n;
      this.flipMonth(delta);
    }
  }

  private switchTab(delta: number) {
    const i = MENU_TABS.findIndex((tb) => tb.id === this.tab);
    this.tab = MENU_TABS[(i + delta + MENU_TABS.length) % MENU_TABS.length].id;
    this.scroll = 0;
    this.redraw();
  }

  private switchSection(delta: number) {
    const i = NOTEBOOK_SECTIONS.findIndex((s) => s.id === this.section);
    const n = NOTEBOOK_SECTIONS.length;
    this.section = NOTEBOOK_SECTIONS[(i + delta + n) % n].id;
    this.scroll = 0;
    this.redraw();
  }

  private close() {
    this.scene.stop();
    // 等这一下按键处理完再放开，免得同一下 Q 又把菜单打开
    setTimeout(() => (gameState.menuOpen = false), 0);
  }

  // ---------------- 画 ----------------

  private redraw() {
    this.drawTabBar();
    this.content.removeAll(true);
    this.scrollLayer = undefined;
    if (this.tab === 'bag') this.drawBag();
    else if (this.tab === 'notebook') this.drawNotebook();
    else if (this.tab === 'calendar') this.drawCalendar();
    else if (this.tab === 'mail') this.drawMail();
    else this.content.add(pixelText(this, this.W / 2, this.H / 2, t('map.placeholder'), { color: SETTINGS.ui.textDim }).setOrigin(0.5));
  }

  /** 顶部栏目条：当前那栏垫底色 */
  private drawTabBar() {
    this.tabBar.removeAll(true);
    const ui = SETTINGS.ui;
    let x = 8;
    const tabs = this.chest ? [{ id: 'bag' as const, label: 'chest.tab' }] : this.mail ? [{ id: 'mail' as const, label: 'mail.tab' }] : MENU_TABS;
    for (const tab of tabs) {
      const label = pixelText(this, 0, 0, t(tab.label), { title: true });
      const w = Math.ceil(label.width) + 12;
      const g = this.add.graphics();
      if (tab.id === this.tab) g.fillStyle(toColor(ui.highlight)).fillRect(x, 6, w, 18);
      drawFrame(g, x, 6, w, 18, toColor(ui.border));
      label.setPosition(x + 6, 9);
      const hit = this.add.zone(x, 6, w, 18).setOrigin(0).setInteractive();
      hit.on('pointerdown', () => {
        this.tab = tab.id;
        this.scroll = 0;
        this.redraw();
      });
      this.tabBar.add([g, label, hit]);
      x += w + 4;
    }
    // 右边：完整的日期和节气、钱（左上角时辰框里放不下的）
    const clock = gameState.clock;
    if (clock) {
      const money = t('hud.money', { amount: gameState.cash, unit: localName(ITEMS.currency.name) });
      const info = pixelText(this, this.W - 30, 9, `${clock.dateText()}　${money}`, { color: ui.textDim2 }).setOrigin(1, 0);
      this.tabBar.add(info);
    }
    // 右上角 ✕
    const close = pixelText(this, this.W - 20, 8, '✕');
    const hit = this.add.zone(this.W - 26, 4, 22, 22).setOrigin(0).setInteractive();
    hit.on('pointerdown', () => this.close());
    this.tabBar.add([close, hit]);
  }

  // ---------------- 背包（和箱子共用）----------------
  //  格子编号：0 ~ 8 工具栏，9 ~ 35 背包，36 起是箱子（见 src/systems/inventory.ts 的 slotAt）。
  //  鼠标停在一格上：看说明；单击：选中这一格（下面出现能做的事）；拖动：才换位置。

  /** 这一页能看到哪些格子 */
  private visibleCells() {
    const list = [...Array(ALL_SLOTS).keys()];
    if (this.chest) for (let k = 0; k < CHEST_PAGE; k++) list.push(ALL_SLOTS + this.page * CHEST_PAGE + k);
    return list;
  }

  /**
   * 第 i 格画在哪。
   *  - 背包：上面一排是工具栏，空一点再是背包 3 行，放在正中。
   *  - 开着箱子：左边是箱子这一页（6 行 × 9 格），右边是身上的东西；格子小一点才放得下。
   */
  private cellRect(i: number) {
    const gap = 2;
    const sep = 6;
    const cols = TOOLBAR_SLOTS;
    const S = this.chest ? Math.min(SETTINGS.bag.slotSize, Math.floor((this.AREA.w - 24) / (cols * 2)) - gap) : SETTINGS.bag.slotSize;
    const gridW = cols * S + (cols - 1) * gap;
    const y0 = this.AREA.y + (this.chest ? 22 : 4);
    if (i >= ALL_SLOTS) {
      const k = (i - ALL_SLOTS) % CHEST_PAGE;
      return { x: this.AREA.x + 4 + (k % cols) * (S + gap), y: y0 + Math.floor(k / cols) * (S + gap), size: S };
    }
    const x0 = this.chest ? this.AREA.x + this.AREA.w - 4 - gridW : Math.round((this.W - gridW) / 2);
    const row = Math.floor(i / cols);
    return { x: x0 + (i % cols) * (S + gap), y: y0 + row * (S + gap) + (row >= 1 ? sep : 0), size: S };
  }

  /** 界面坐标 (x, y) 落在第几格（没落在格子上返回 -1） */
  private cellAt(x: number, y: number) {
    return this.visibleCells().find((i) => {
      const r = this.cellRect(i);
      return x >= r.x && x < r.x + r.size && y >= r.y && y < r.y + r.size;
    }) ?? -1;
  }

  /** 画一个小按钮，返回它右边的 x */
  private button(x: number, y: number, label: string, enabled: boolean, run: () => void, into = this.content) {
    const ui = SETTINGS.ui;
    const txt = pixelText(this, 0, 0, label, { color: enabled ? ui.text : ui.textDim });
    const w = Math.ceil(txt.width) + 12;
    const bg = this.add.graphics();
    bg.fillStyle(toColor(ui.highlight), enabled ? 1 : 0.4).fillRect(x, y, w, 18);
    drawFrame(bg, x, y, w, 18, toColor(enabled ? ui.border : ui.innerBorder));
    txt.setPosition(x + 6, y + 3);
    const hit = this.add.zone(x, y, w, 18).setOrigin(0).setInteractive();
    hit.on('pointerdown', () => !this.modal && enabled && run());
    into.add([bg, txt, hit]);
    return x + w + 4;
  }

  private drawBag() {
    const ui = SETTINGS.ui;
    const keys = !this.touch;
    const g = this.add.graphics();
    this.content.add(g);
    for (const i of this.visibleCells()) {
      const { x, y, size: S } = this.cellRect(i);
      g.fillStyle(toColor(i === this.slot ? ui.highlight : ui.innerBorder)).fillRect(x, y, S, S);
      drawFrame(g, x, y, S, S, toColor(i === this.slot ? ui.toolSelected : ui.border));
      drawItemSlot(this, this.content, x, y, S, slotAt(i));
      const hit = this.add.zone(x, y, S, S).setOrigin(0).setInteractive();
      hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (this.modal) return;
        const at = this.cameras.main.getWorldPoint(p.x, p.y);
        this.press = { i, x: at.x, y: at.y, dragging: false };
      });
      hit.on('pointerover', () => this.setHover(i));
      hit.on('pointerout', () => this.hover === i && this.setHover(null));
      this.content.add(hit);
    }
    // 格子旁边的字和「整理」按钮
    const r0 = this.cellRect(0);
    const r9 = this.cellRect(TOOLBAR_SLOTS);
    const sortKey = keys ? ` ${SETTINGS.keys.bagSort[0]}` : '';
    if (this.chest) {
      const c0 = this.cellRect(ALL_SLOTS + this.page * CHEST_PAGE);
      const pages = gameState.storage.length / CHEST_PAGE;
      const head = pixelText(this, c0.x, this.AREA.y + 3, t('chest.title', { page: this.page + 1, pages }), { color: ui.textDim2 });
      this.content.add(head);
      let bx = c0.x + Math.ceil(head.width) + 6;
      bx = this.button(bx, this.AREA.y, '◀', this.page > 0, () => this.flipPage(-1));
      bx = this.button(bx, this.AREA.y, '▶', this.page < pages - 1, () => this.flipPage(1));
      this.button(bx + 4, this.AREA.y, t('bag.sort') + sortKey, true, () => this.sort(true));
      this.content.add(pixelText(this, r0.x, this.AREA.y + 3, t('bag.bagLabel'), { color: ui.textDim2 }));
      this.button(r0.x + 40, this.AREA.y, t('bag.sort') + sortKey, true, () => this.sort(false));
    } else {
      this.content.add(pixelText(this, r0.x - 6, r0.y + r0.size / 2, t('bag.toolbarLabel'), { color: ui.textDim2 }).setOrigin(1, 0.5));
      this.content.add(pixelText(this, r9.x - 6, r9.y + r9.size / 2, t('bag.bagLabel'), { color: ui.textDim2 }).setOrigin(1, 0.5));
      const last = this.cellRect(TOOLBAR_SLOTS * 2 - 1);
      this.button(last.x + last.size + 6, last.y + (last.size - 18) / 2, t('bag.sort') + sortKey, true, () => this.sort(false));
    }

    // 底下：说明（鼠标停着的那格，没有就是选中的那格），再下面是选中那格能做的事
    const bottom = Math.max(...this.visibleCells().map((i) => this.cellRect(i).y + this.cellRect(i).size));
    const left = this.chest ? this.AREA.x + 4 : this.cellRect(TOOLBAR_SLOTS * 3).x;
    this.infoBox = { x: left, y: bottom + 6, w: (this.chest ? this.AREA.x + this.AREA.w - 4 : this.cellRect(ALL_SLOTS - 1).x + r0.size) - left };
    this.info = this.add.container(0, 0);
    this.content.add(this.info);
    this.drawInfo();
    const sel = slotAt(this.slot);
    const why = whyCantDiscard(this.slot);
    let bx = left;
    const by = Math.min(this.infoBox.y + LINE_H * 3 + 6, this.AREA.y + this.AREA.h - 20);
    bx = this.button(bx, by, t('bag.discard') + (keys ? ` ${SETTINGS.keys.bagDiscard[0]}` : ''), !!sel && !why, () => this.discard());
    bx = this.button(bx, by, (sel?.locked ? t('bag.unlock') : t('bag.lock')) + (keys ? ` ${SETTINGS.keys.bagLock[0]}` : ''), !!sel, () => this.lock());
    if (sel && isFood(sel.id) && this.slot < ALL_SLOTS) bx = this.button(bx, by, t('bag.eat') + (keys ? ` ${SETTINGS.keys.bagEat[0]}` : ''), true, () => this.eat());
    if (sel && this.chest) {
      const label = this.slot < ALL_SLOTS ? t('chest.put') : t('chest.take');
      bx = this.button(bx, by, label + (keys ? ` ${SETTINGS.keys.bagTransfer[0]}` : ''), canStore(sel.id), () => this.transfer());
    }
    this.content.add(pixelText(this, bx + 4, by + 3, t(this.touch ? 'bag.touchHint' : 'bag.keyHint'), { color: ui.textDim }));
  }

  /** 说明：名字和数量（上锁的加小锁）、物品说明或刚做的事、能卖的话今日售价 */
  private drawInfo() {
    const info = this.info;
    if (!info?.active) return;
    info.removeAll(true);
    const ui = SETTINGS.ui;
    const { x, y, w } = this.infoBox;
    const i = this.hover ?? this.slot;
    const s = slotAt(i);
    const item = s ? itemInfo(s.id) : undefined;
    // 工具名字后面写「（工具）」；水桶再写还有多少水
    const water = s?.id === 'bucket' ? `　${t('bag.water', { n: gameState.water, max: TIME.stamina.bucket.capacity })}` : '';
    const line = s ? localName(item?.name) + (isTool(s.id) ? `（${t('bag.tool')}）${water}` : `  ${t('bag.count', { n: s.n })}`) : t('bag.empty');
    const name = pixelText(this, x, y, line);
    info.add(name);
    if (s?.locked) {
      const lg = this.add.graphics();
      const art = drawLock(lg, x + Math.ceil(name.width) + 6, y + 2);
      if (art) info.add(art);
      info.add([lg, pixelText(this, x + Math.ceil(name.width) + 16, y, t('bag.locked'), { color: ui.textDim2 })]);
    }
    const price = s && gameState.clock ? shopSellPrice(s.id, gameState.clock) : null;
    if (price != null) info.add(pixelText(this, x + w, y, t('bag.price', { price }), { color: ui.money }).setOrigin(1, 0));
    const second = (i === this.slot && this.note) || (item?.desc ? localName(item.desc) : '');
    if (second) info.add(pixelText(this, x, y + LINE_H + 2, second, { color: ui.textDim2, wrap: w }));
  }

  private setHover(i: number | null) {
    if (this.hover === i || this.touch) return;
    this.hover = i;
    this.drawInfo();
  }

  /** 选中一格（单击、方向键）。不会动东西 */
  private select(i: number) {
    this.slot = i;
    this.note = '';
    this.redraw();
  }

  /** 按住拖：超过几个像素就算拖动，图标跟着走 */
  private dragMove(p: Phaser.Input.Pointer) {
    if (!this.press || !p.isDown || this.modal) return;
    const at = this.cameras.main.getWorldPoint(p.x, p.y);
    if (!this.press.dragging) {
      if (Math.hypot(at.x - this.press.x, at.y - this.press.y) < 6 || !slotAt(this.press.i)) return;
      this.press.dragging = true;
      const S = this.cellRect(this.press.i).size;
      this.ghost = this.add.container(0, 0).setDepth(70);
      drawItemSlot(this, this.ghost, -S / 2, -S / 2, S, slotAt(this.press.i));
    }
    this.ghost?.setPosition(Math.round(at.x), Math.round(at.y));
  }

  /** 松手：拖到另一格就移过去（同一种就叠上去）；没拖动就是「单击」= 选中 */
  private dragEnd(p: Phaser.Input.Pointer) {
    const press = this.press;
    this.press = null;
    this.ghost?.destroy();
    this.ghost = undefined;
    if (!press || this.modal) return;
    if (!press.dragging) return this.select(press.i);
    const at = this.cameras.main.getWorldPoint(p.x, p.y);
    this.moveTo(press.i, this.cellAt(at.x, at.y));
  }

  /** 把 from 格的东西挪到 to 格（工具放不进箱子时说一声） */
  private moveTo(from: number, to: number) {
    if (to < 0 || to === from) return;
    const s = slotAt(from);
    this.note = '';
    if (moveSlot(from, to)) this.slot = to;
    else if (s) this.note = t('chest.cantStore', { name: itemName(s.id) });
    normalizeChest();
    this.redraw();
  }

  /** 箱子翻页 */
  private flipPage(delta: number) {
    const pages = gameState.storage.length / CHEST_PAGE;
    this.page = Phaser.Math.Clamp(this.page + delta, 0, pages - 1);
    if (this.slot >= ALL_SLOTS) this.slot = ALL_SLOTS + this.page * CHEST_PAGE;
    this.redraw();
  }

  /** 整理：箱子整个排；背包只排下面 27 格，工具栏不动 */
  private sort(chest: boolean) {
    if (chest) {
      sortSlots(gameState.storage);
      normalizeChest();
      this.page = 0;
    } else {
      // 工具栏和背包各排各的（东西不会在两边之间挪）；手上拿的东西整理完还拿着
      const held = gameState.slots[gameState.selected]?.id;
      sortSlots(gameState.slots, 0, TOOLBAR_SLOTS);
      sortSlots(gameState.slots, TOOLBAR_SLOTS);
      const at = gameState.slots.slice(0, TOOLBAR_SLOTS).findIndex((s) => s?.id === held);
      if (at >= 0) gameState.selected = at;
    }
    this.note = '';
    this.redraw();
  }

  /** 开着箱子时：选中的那格整格放进箱子 / 拿回身上 */
  private transfer() {
    const s = slotAt(this.slot);
    if (!s) return;
    const name = itemName(s.id);
    if (!canStore(s.id)) this.note = t('chest.cantStore', { name });
    else {
      const n = transferSlot(this.slot);
      const toChest = this.slot < ALL_SLOTS;
      this.note = n > 0 ? t(toChest ? 'chest.putDone' : 'chest.takeDone', { name, n }) : t(toChest ? 'chest.full' : 'msg.bagFull');
    }
    this.redraw();
  }

  /** 丢弃：工具、上锁的不能丢；叠着的先问丢几个，再确认一次 */
  private discard() {
    const i = this.slot;
    const why = whyCantDiscard(i);
    if (why) {
      this.note = t(why);
      return this.redraw();
    }
    const s = slotAt(i)!;
    const name = itemName(s.id);
    const confirm = (n: number) =>
      this.confirm(t('bag.discardConfirm', { name, n }), t('bag.discardYes'), () => {
        takeFromSlot(i, n);
        this.note = t('bag.discarded', { name, n });
        this.redraw();
      });
    if (s.n <= 1) return confirm(1);
    const block = this.blocker();
    const picker = new QuantityPicker(this, t('bag.discardHowMany', { name }), s.n, (n) => {
      block.destroy();
      this.picker = undefined;
      this.modal = undefined;
      if (n) confirm(n);
    });
    this.picker = picker;
    this.modal = { destroy: () => (picker.destroy(), block.destroy()) };
  }

  /** 吃掉选中那格的一个（只有食物能吃，src/systems/food.ts） */
  private eat() {
    const ate = this.slot < ALL_SLOTS ? eatFromSlot(this.slot) : null;
    if (!slotAt(this.slot) && !ate) return;
    this.note = ate ? t('msg.ate', { name: itemName(ate.id), n: ate.gain }) : t('bag.cantEat');
    this.redraw();
  }

  /** 上锁 / 解锁 */
  private lock() {
    const s = slotAt(this.slot);
    if (!s) return;
    toggleLock(this.slot);
    const name = itemName(s.id);
    this.note = t(s.locked ? 'bag.lockedNow' : 'bag.unlockedNow', { name });
    this.redraw();
  }

  /** 弹一个「确定 / 取消」 */
  private confirm(title: string, yesLabel: string, yes: () => void) {
    const block = this.blocker();
    const close = () => {
      menu.destroy();
      block.destroy();
      // 等这一下按键处理完再放开
      setTimeout(() => (this.modal = undefined), 0);
    };
    const menu = new ListMenu(
      this,
      [
        { label: yesLabel, run: () => (close(), yes()) },
        { label: t('settings.cancel'), run: close },
      ],
      { title, ownKeys: true, onCancel: close, width: 200 },
    ).centerAt(this.W / 2, this.H / 2);
    this.modal = { destroy: close };
  }

  /** 弹框下面垫一层：点不到后面的格子 */
  private blocker() {
    return this.add.zone(0, 0, this.W, this.H).setOrigin(0).setInteractive().setDepth(59);
  }

  // ---------------- 笔记本 ----------------

  private drawNotebook() {
    const ui = SETTINGS.ui;
    if (!hasItem('notebook')) {
      this.content.add(pixelText(this, this.W / 2, this.H / 2, t('notebook.noNotebook'), { color: ui.textDim }).setOrigin(0.5));
      return;
    }
    // 左边一列：主线 / 操作 / 已学会
    const colW = 58;
    NOTEBOOK_SECTIONS.forEach((s, i) => {
      const y = this.AREA.y + 2 + i * 20;
      const g = this.add.graphics();
      if (s.id === this.section) g.fillStyle(toColor(ui.highlight)).fillRect(this.AREA.x, y, colW, 18);
      const label = pixelText(this, this.AREA.x + 6, y + 3, t(s.label), { title: true });
      const hit = this.add.zone(this.AREA.x, y, colW, 18).setOrigin(0).setInteractive();
      hit.on('pointerdown', () => {
        this.section = s.id;
        this.scroll = 0;
        this.redraw();
      });
      this.content.add([g, label, hit]);
    });
    const sep = this.add.graphics().fillStyle(toColor(ui.innerBorder)).fillRect(this.AREA.x + colW + 4, this.AREA.y, 1, this.AREA.h);
    this.content.add(sep);

    // 右边：能上下滚的一页
    const box = { x: this.AREA.x + colW + 10, y: this.AREA.y + 2, w: this.AREA.w - colW - 12, h: this.AREA.h - 4 };
    const layer = this.add.container(box.x, box.y);
    const mask = this.make.graphics({}).fillRect(box.x, box.y, box.w, box.h).createGeometryMask();
    layer.setMask(mask);
    this.content.add(layer);
    this.scrollLayer = layer;
    const end = this.writeSection(layer, box.w);
    this.maxScroll = Math.max(0, end - box.h);
    this.scroll = Phaser.Math.Clamp(this.scroll, 0, this.maxScroll);
    layer.setY(box.y - this.scroll);
  }

  /** 把这一栏的文字写进 layer，返回写到了多高 */
  private writeSection(layer: Phaser.GameObjects.Container, w: number): number {
    const ui = SETTINGS.ui;
    let y = 0;
    const write = (text: string, opts: { color?: string; indent?: number; strike?: boolean; gapAfter?: number; bullet?: string; title?: boolean } = {}) => {
      const indent = opts.indent ?? 0;
      // 行首的小记号（· 或 ？）单独放在左边，文字整段往右缩
      if (opts.bullet) layer.add(pixelText(this, indent - 9, y, opts.bullet, { color: opts.color }));
      // 先折好行，再一行一行写（划掉线要按每行的长度画）
      const lines = wrapText(text, w - indent);
      for (const line of lines) {
        const tx = pixelText(this, indent, y, line, { color: opts.color, title: opts.title });
        layer.add(tx);
        if (opts.strike && tx.width > 0) {
          layer.add(this.add.graphics().fillStyle(toColor(opts.color ?? ui.text)).fillRect(indent, y + 7, Math.ceil(tx.width), 1));
        }
        y += LINE_H;
      }
      y += opts.gapAfter ?? 0;
    };

    // 周里正交馒头时说的那句，拿到开局物资以后每一栏最上面都写着
    if (gameState.flags.startKitGiven) write(t('notebook.pinned'), { color: ui.money, gapAfter: 6 });

    if (this.section === 'controls') {
      const ids = gameState.notebook.controls;
      if (!ids.length) write(t('notebook.none'), { color: ui.textDim });
      for (const id of ids) write(t(`notebook.controls.${id}.${this.touch ? 'touch' : 'keyboard'}`), { gapAfter: 4 });
      return y;
    }
    if (this.section === 'learned') {
      const ids = gameState.notebook.learned;
      if (!ids.length) write(t('notebook.none'), { color: ui.textDim });
      for (const id of ids) write(fillNames(t(`notebook.learned.${id}`)), { gapAfter: 4 });
      return y;
    }

    // 主线：每个已开始的章节，写下拿到的线索、推断、问题
    let wrote = false;
    for (const ch of chaptersInOrder()) {
      if (!chapterStarted(ch)) continue;
      const clues = (gameState.clues as ClueId[]).filter((c) => CLUES[c]?.chapter === ch);
      const questions = (Object.keys(QUESTIONS) as QuestionId[]).filter(
        (q) => CLUES[QUESTIONS[q].raisedBy].chapter === ch && questionState(q) !== 'hidden',
      );
      write(fillNames(localName(CHAPTERS[ch].name)), { color: ui.money, gapAfter: 2, title: true });
      wrote = true;
      // 这一章的去处提示（序章：周里正教完以后才有）
      const goalKey = `notebook.goals.${ch}`;
      const goal = t(goalKey);
      if (goal !== goalKey && (ch !== 'prologue' || gameState.prologue === 'done')) write(fillNames(goal), { indent: 10, bullet: '·', color: ui.textDim2, gapAfter: 3 });
      if (!clues.length && !questions.length) write(t('notebook.none'), { color: ui.textDim, indent: 10, gapAfter: 6 });
      for (const c of clues) {
        write(fillNames(localName(CLUES[c].text)), { indent: 10, bullet: '·' });
        const inf = CLUES[c].inference;
        if (inf && localName(inf)) write(t('notebook.inference', { text: fillNames(localName(inf)) }), { color: ui.textDim2, indent: 18 });
        y += 3;
      }
      for (const q of questions) {
        const solved = questionState(q) === 'solved';
        const head = solved ? t('notebook.solved') : t('notebook.open');
        write(`（${head}）${fillNames(localName(QUESTIONS[q].text))}`, { indent: 10, bullet: '？', strike: solved, color: solved ? ui.textDim : ui.text });
        const ans = QUESTIONS[q].answeredBy;
        if (solved && ans) write(t('notebook.answer', { text: fillNames(localName(CLUES[ans].text)) }), { color: ui.textDim2, indent: 18 });
        y += 3;
      }
      y += 6;
    }
    if (!wrote) write(t('notebook.none'), { color: ui.textDim });
    return y;
  }

  // ---------------- 日历 ----------------

  /** 日历往前 / 往后翻几个月（0 = 不翻，只重画） */
  private flipMonth(delta: number) {
    const months = TIME.calendar.months.length;
    this.calMonth = ((this.calMonth - 1 + delta + months) % months) + 1;
    this.redraw();
  }

  /**
   * 一个月一页：顶上「◀ 正月 · 春 ▶」，下面 4 行 × 7 列（周一到周日），
   * 格子里写日子、节气、节日，赶集日右上角有个小橘块；今天涂黄底，选中的那天加橘框。
   * 最底下是图例和选中那天的说明。
   */
  private drawCalendar() {
    const ui = SETTINGS.ui;
    const cal = TIME.calendar;
    const clock = gameState.clock;
    const colors = {
      today: toColor(PALETTE.candle),
      term: PALETTE.indigo,
      festival: PALETTE.vermilion,
      market: toColor(PALETTE.orange),
    };
    // 顶上：月份 + 季节，两边箭头
    const head = pixelText(this, this.W / 2, this.AREA.y + 2, t('calendarTab.header', { month: monthName(this.calMonth), season: localName(seasonOf(this.calMonth).name) }), { color: ui.money }).setOrigin(0.5, 0);
    this.content.add(head);
    const arrow = (label: string, x: number, delta: number) => {
      const a = pixelText(this, x, this.AREA.y + 2, label).setOrigin(0.5, 0);
      const hit = this.add.zone(x - 14, this.AREA.y - 2, 28, 22).setOrigin(0).setInteractive();
      hit.on('pointerdown', () => this.flipMonth(delta));
      this.content.add([a, hit]);
    };
    arrow('◀', this.W / 2 - head.width / 2 - 18, -1);
    arrow('▶', this.W / 2 + head.width / 2 + 18, 1);

    // 格子大小：按面板大小算（手机上会小一点）
    const cols = cal.daysPerWeek;
    const rows = Math.ceil(cal.daysPerMonth / cols);
    const top = this.AREA.y + 22;
    const bottomSpace = 52; // 图例 + 说明两行
    const cellW = Math.min(84, Math.floor((this.AREA.w - 8) / cols));
    const cellH = Math.max(30, Math.min(56, Math.floor((this.AREA.y + this.AREA.h - top - 14 - bottomSpace) / rows)));
    const x0 = Math.round((this.W - cellW * cols) / 2);
    const weekdays = t('calendar.weekdays').split(',');
    weekdays.forEach((w, i) => this.content.add(pixelText(this, x0 + i * cellW + cellW / 2, top, w, { color: ui.textDim2 }).setOrigin(0.5, 0)));
    const gy = top + 14;
    const g = this.add.graphics();
    this.content.add(g);
    for (let d = 1; d <= cal.daysPerMonth; d++) {
      const col = weekdayIndex(d);
      const row = Math.floor((d - 1) / cols);
      const x = x0 + col * cellW;
      const y = gy + row * cellH;
      const isToday = !!clock && clock.month === this.calMonth && clock.day === d;
      g.fillStyle(isToday ? colors.today : toColor(ui.panel), isToday ? 0.85 : 1).fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
      drawFrame(g, x, y, cellW, cellH, toColor(ui.innerBorder));
      const e = dayEvents(this.calMonth, d);
      if (e.market) g.fillStyle(colors.market).fillRect(x + cellW - 8, y + 3, 5, 5);
      this.content.add(pixelText(this, x + 4, y + 2, dayName(d), { color: isToday ? ui.text : ui.textDim2 }));
      let ty = y + 2 + LINE_H;
      const tag = (text: string, color: string) => {
        if (ty + 12 > y + cellH) return;
        this.content.add(pixelText(this, x + 4, ty, text, { color }));
        ty += LINE_H - 1;
      };
      if (e.festival) tag(localName(e.festival.name), colors.festival);
      if (e.term) tag(localName(e.term.name), colors.term);
      const hit = this.add.zone(x, y, cellW, cellH).setOrigin(0).setInteractive();
      hit.on('pointerdown', () => {
        this.calDay = d;
        this.redraw();
      });
      this.content.add(hit);
    }
    // 选中的那天：橘色粗框
    {
      const col = weekdayIndex(this.calDay);
      const row = Math.floor((this.calDay - 1) / cols);
      const sx = x0 + col * cellW;
      const sy = gy + row * cellH;
      drawFrame(g, sx, sy, cellW, cellH, toColor(ui.toolSelected));
      drawFrame(g, sx + 1, sy + 1, cellW - 2, cellH - 2, toColor(ui.toolSelected));
    }

    // 图例
    let ly = gy + rows * cellH + 5;
    let lx = x0;
    const legend = (draw: (gx: number, gy: number) => void, label: string, color: string = ui.textDim2) => {
      draw(lx, ly + 3);
      const tx = pixelText(this, lx + 12, ly, label, { color });
      this.content.add(tx);
      lx += 12 + Math.ceil(tx.width) + 14;
    };
    legend((a, b) => g.fillStyle(colors.today).fillRect(a, b, 8, 8), t('calendarTab.legendToday'));
    legend((a, b) => g.fillStyle(toColor(colors.term)).fillRect(a, b + 2, 8, 3), t('calendarTab.legendTerm'), colors.term);
    legend((a, b) => g.fillStyle(toColor(colors.festival)).fillRect(a, b + 2, 8, 3), t('calendarTab.legendFestival'), colors.festival);
    legend((a, b) => g.fillStyle(colors.market).fillRect(a + 1, b + 1, 5, 5), t('calendarTab.legendMarket'));
    const hint = pixelText(this, x0 + cellW * cols, ly, t(this.touch ? 'calendarTab.touchHint' : 'calendarTab.keyHint'), { color: ui.textDim }).setOrigin(1, 0);
    if (hint.x - hint.width > lx) this.content.add(hint);
    else hint.destroy();

    // 选中那天的说明
    ly += LINE_H + 4;
    const e = dayEvents(this.calMonth, this.calDay);
    const isToday = !!clock && clock.month === this.calMonth && clock.day === this.calDay;
    let title = t('calendarTab.dayTitle', { month: monthName(this.calMonth), day: dayName(this.calDay), weekday: weekdayName(this.calDay) });
    if (isToday) title += `（${t('calendarTab.today')}）`;
    const parts: string[] = [];
    if (e.festival) parts.push(t('calendarTab.festival', { name: localName(e.festival.name) }));
    if (e.term) parts.push(t('calendarTab.term', { name: localName(e.term.name) }));
    if (e.market) parts.push(t('calendarTab.market', { pct: Math.round(cal.marketPriceBonus * 100) }));
    if (!parts.length) parts.push(t('calendarTab.nothing'));
    this.content.add(pixelText(this, x0, ly, `${title}　${parts.join('　')}`, { wrap: cellW * cols }));
  }

  // ---------------- 信箱（信的内容在 src/data/letters.ts，收信规则在 src/systems/mail.ts）----------------

  /** 左边一列信（新的在上面，没读过的有个小红点），右边是选中的那封信 */
  private drawMail() {
    const ui = SETTINGS.ui;
    const list = gameState.mail;
    if (!list.length) {
      this.content.add(pixelText(this, this.W / 2, this.H / 2, t('mail.empty'), { color: ui.textDim }).setOrigin(0.5));
      return;
    }
    this.mailSel = Phaser.Math.Clamp(this.mailSel, 0, list.length - 1);
    list[this.mailSel].read = true;
    // 左边：能上下滚的信件列表
    const colW = 116;
    const rowH = 20;
    const layer = this.add.container(this.AREA.x, this.AREA.y + 2);
    layer.setMask(this.make.graphics({}).fillRect(this.AREA.x, this.AREA.y + 2, colW, this.AREA.h - 4).createGeometryMask());
    list.forEach((m, i) => {
      const y = i * rowH;
      const g = this.add.graphics();
      if (i === this.mailSel) g.fillStyle(toColor(ui.highlight)).fillRect(0, y, colW, rowH - 2);
      if (!m.read) g.fillStyle(toColor(ui.letter.unread)).fillCircle(6, y + 9, 2.5);
      const title = wrapText(t(`letters.${m.id}.title`), colW - 16)[0];
      const hit = this.add.zone(0, y, colW, rowH - 2).setOrigin(0).setInteractive();
      hit.on('pointerup', (p: Phaser.Input.Pointer) => p.getDistance() < 6 && this.pickMail(i));
      layer.add([g, pixelText(this, 12, y + 3, title, { color: m.read ? ui.textDim2 : ui.text }), hit]);
    });
    this.content.add([layer, this.add.graphics().fillStyle(toColor(ui.innerBorder)).fillRect(this.AREA.x + colW + 4, this.AREA.y, 1, this.AREA.h)]);
    this.scrollLayer = layer;
    this.maxScroll = Math.max(0, list.length * rowH - (this.AREA.h - 4));
    // 选中的那封要露出来
    this.scroll = Phaser.Math.Clamp(this.scroll, this.mailSel * rowH + rowH - (this.AREA.h - 4), this.mailSel * rowH);
    this.scroll = Phaser.Math.Clamp(this.scroll, 0, this.maxScroll);
    layer.setY(this.AREA.y + 2 - this.scroll);
    this.drawLetter(list[this.mailSel], { x: this.AREA.x + colW + 10, y: this.AREA.y + 2, w: this.AREA.w - colW - 12, h: this.AREA.h - 4 });
  }

  /** 一封信：信纸、标题、正文（黄字线索照对话的规矩）、落款，有附件的话下面是附件和「收下」 */
  private drawLetter(m: MailEntry, box: { x: number; y: number; w: number; h: number }) {
    const ui = SETTINGS.ui;
    const c = this.content;
    // 信纸：有 ui_letter 的图就铺图，没有就浅色底加一圈细朱红框
    if (!PLACEHOLDERS.has('ui_letter')) c.add(this.add.image(box.x, box.y, 'ui_letter').setOrigin(0).setDisplaySize(box.w, box.h));
    else {
      const g = this.add.graphics().fillStyle(toColor(ui.letter.paper)).fillRect(box.x, box.y, box.w, box.h);
      drawFrame(g, box.x + 3, box.y + 3, box.w - 6, box.h - 6, toColor(ui.letter.border));
      c.add(g);
    }
    const pad = 12;
    const x = box.x + pad;
    const w = box.w - pad * 2;
    let y = box.y + pad;
    c.add(pixelText(this, x, y, t(`letters.${m.id}.title`), { color: ui.money, title: true }));
    y += LINE_H + 6;
    const runs: Run[] = parseClueMarks(fillNames(t(`letters.${m.id}.body`, m.params))).map((p) => {
      if (p.clue && canGetClue(p.clue)) {
        giveClue(p.clue);
        return { text: p.text, color: ui.clueText, mark: ui.clueMark };
      }
      return { text: p.text, color: ui.text };
    });
    const lines = runs.length ? wrapRuns(runs, w) : [];
    c.add(drawLines(this, lines, x, y, LINE_H));
    y += lines.length * LINE_H + 6;
    const from = letterInfo(m.id)?.from ?? 'unknown';
    const sign = t('mail.sign', { name: t(`names.${from}`), date: `${monthName(m.month)}${dayName(m.day)}` });
    c.add(pixelText(this, x + w, y, sign, { color: ui.textDim2 }).setOrigin(1, 0));
    // 附件
    const items = Object.entries(m.items);
    if (!items.length && !m.money) return;
    const S = 20;
    const ay = box.y + box.h - pad - S - (this.note ? LINE_H : 0);
    c.add(pixelText(this, x, ay + 4, t('mail.attach'), { color: ui.textDim2 }));
    let ax = x + 64;
    for (const [id, n] of items) {
      const g = this.add.graphics();
      drawFrame(g, ax, ay, S, S, toColor(ui.innerBorder));
      c.add(g);
      drawItemSlot(this, c, ax, ay, S, { id, n });
      ax += S + 4;
    }
    if (m.money) {
      const money = pixelText(this, ax + 2, ay + 4, t('mail.money', { n: m.money }), { color: ui.money });
      c.add(money);
      ax += Math.ceil(money.width) + 10;
    }
    this.button(ax, ay + 1, t('mail.take') + (this.touch ? '' : ' ↵'), true, () => this.takeMail());
    if (this.note) c.add(pixelText(this, x, ay + S + 4, this.note, { color: ui.textDim2, wrap: w }));
  }

  private pickMail(i: number) {
    if (i < 0 || i >= gameState.mail.length) return;
    this.mailSel = i;
    this.note = '';
    this.redraw();
  }

  /** 收下选中那封信的附件：放不下的留在信里 */
  private takeMail() {
    const m = gameState.mail[this.mailSel];
    if (!m || (!Object.keys(m.items).length && !m.money)) return;
    const { got, money, left } = takeAttachments(m);
    const parts = Object.entries(got).map(([id, n]) => `${itemName(id)} ×${n}`);
    if (money) parts.push(t('mail.money', { n: money }));
    const said = parts.length ? t('mail.taken', { items: parts.join('、') }) : '';
    this.note = [said, left ? t('mail.bagFull') : ''].filter(Boolean).join(' ');
    if (said) this.game.events.emit(UI_EVENTS.say, 'mail.taken', { items: parts.join('、') });
    if (left) this.game.events.emit(UI_EVENTS.say, 'mail.bagFull');
    this.redraw();
  }

  private scrollBy(dy: number) {
    if (!this.scrollLayer || (this.tab !== 'notebook' && this.tab !== 'mail')) return;
    this.scroll = Phaser.Math.Clamp(this.scroll + dy, 0, this.maxScroll);
    this.scrollLayer.setY(this.AREA.y + 2 - this.scroll);
  }
}
