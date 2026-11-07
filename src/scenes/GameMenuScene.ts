/**
 * Q 总菜单：一个叠在游戏上面的全屏面板。
 *  - 顶部一排栏目（背包 / 笔记本 / 日历 / 地图，栏目表在 src/data/menuTabs.ts）。
 *    Tab 切到下一栏，Shift+Tab 切回上一栏；手机上直接点栏目名。
 *  - Q 或 Esc 关闭；右上角的 ✕ 也能关。
 *  - 打开时游戏时间暂停（gameState.menuOpen = true，农场场景看到它就停）。
 * 背包格子的行列数在 src/config/settings.ts 的 bag 里。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { VIEW_EVENTS, setupUiCamera, uiSize } from '../config/view';
import { toColor } from '../config/palette';
import { CHAPTERS, CLUES, QUESTIONS, type ClueId, type QuestionId } from '../data/clues';
import { MENU_TABS, NOTEBOOK_SECTIONS, type MenuTabId, type NotebookSectionId } from '../data/menuTabs';
import { ITEMS } from '../data/items';
import { isTouchDevice } from '../input/Controls';
import { localName, t } from '../locales/i18n';
import { fillNames } from '../story/text';
import { gameState } from '../systems/GameState';
import { ALL_SLOTS, TOOLBAR_SLOTS, hasItem, isTool, itemInfo, moveSlot, takeFromSlot, toggleLock, whyCantDiscard } from '../systems/inventory';
import { drawItemSlot, drawLock } from '../ui/itemSlot';
import { ListMenu } from '../ui/ListMenu';
import { QuantityPicker } from '../ui/QuantityPicker';
import { chaptersInOrder, chapterStarted, questionState } from '../systems/story/notebook';
import { drawFrame, drawPanel, pixelText } from '../ui/pixelUi';
import { wrapText } from '../ui/richText';
import { PALETTE } from '../config/palette';
import { TIME } from '../data/time';
import { eatFromSlot, isFood } from '../systems/food';
import { dayEvents, dayName, monthName, seasonOf, weekdayIndex, weekdayName } from '../systems/days';

/** 面板大小 = 界面层大小（大约 640×360，打开时按当前界面大小算） */
let W = 640;
let H = 360;
/** 内容区（栏目条下面那块） */
let AREA = { x: 8, y: 28, w: W - 16, h: H - 34 };
const LINE_H = 14;

export class GameMenuScene extends Phaser.Scene {
  private tab: MenuTabId = 'bag';
  private section: NotebookSectionId = 'story';
  /** 栏目条和内容各放一层，切栏目时只重画内容 */
  private tabBar!: Phaser.GameObjects.Container;
  private content!: Phaser.GameObjects.Container;
  /** 打开后一小会儿不理按键（免得打开菜单的那下 Q 又把它关掉） */
  private openedAt = 0;
  /** 背包：光标在第几格（0 ~ 8 是工具栏，9 ~ 35 是背包） */
  private slot = 0;
  /** 拿起来、正要挪的是第几格（没拿是 null） */
  private held: number | null = null;
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

  constructor() {
    super('GameMenu');
  }

  create(data: { tab?: MenuTabId }) {
    this.tab = data?.tab ?? 'bag';
    this.slot = gameState.selected;
    this.held = null;
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
    ({ w: W, h: H } = uiSize());
    AREA = { x: 8, y: 28, w: W - 16, h: H - 34 };
    // 界面大小变了（转屏）：重新打开
    const relayout = () => this.scene.restart({ tab: this.tab });
    this.game.events.on(VIEW_EVENTS.changed, relayout);
    this.events.once('shutdown', () => {
      this.game.events.off(VIEW_EVENTS.changed, relayout);
      this.modal?.destroy();
      this.modal = undefined;
      this.picker = undefined;
    });

    // 挡住下面的游戏：点在面板上不会穿到农场里
    this.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(toColor(SETTINGS.ui.border), 0.55).fillRect(0, 0, W, H);
    drawPanel(g, 2, 2, W - 4, H - 4);
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
    kb.addCapture('TAB');
    const keys = SETTINGS.keys;
    const is = (names: string[], e: KeyboardEvent) => names.some((n) => Phaser.Input.Keyboard.KeyCodes[n as keyof typeof Phaser.Input.Keyboard.KeyCodes] === e.keyCode);
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
      if (e.key === 'Tab') return this.switchTab(e.shiftKey ? -1 : 1);
      // 背包里拿着东西时，Esc 先放回去
      if (is(keys.cancel, e) && this.tab === 'bag' && this.held !== null) {
        this.held = null;
        this.note = '';
        return this.redraw();
      }
      if (is(keys.bag, e) || is(keys.cancel, e)) return this.close();
      if (this.tab === 'bag') {
        if (is(keys.action, e)) return this.bagPick(this.slot);
        if (e.key === 'x' || e.key === 'X') return this.discard();
        if (e.key === 'l' || e.key === 'L') return this.lock();
        if (e.key === 'e' || e.key === 'E') return this.eat();
      }
      if (this.tab === 'calendar' && (e.key === '[' || e.key === ']')) return this.flipMonth(e.key === ']' ? 1 : -1);
      const dir = is(keys.up, e) ? 'up' : is(keys.down, e) ? 'down' : is(keys.left, e) ? 'left' : is(keys.right, e) ? 'right' : null;
      if (dir) this.nav(dir);
    };
    kb.on('keydown', onKey);
    this.events.once('shutdown', () => {
      kb.off('keydown', onKey);
      kb.removeCapture('TAB');
    });
  }

  private nav(dir: 'up' | 'down' | 'left' | 'right') {
    if (this.tab === 'bag') {
      const cols = TOOLBAR_SLOTS;
      const step = { up: -cols, down: cols, left: -1, right: 1 }[dir];
      const next = this.slot + step;
      // 左右到头不换行，上下到头不动
      if (next < 0 || next >= ALL_SLOTS) return;
      if ((dir === 'left' || dir === 'right') && Math.floor(next / cols) !== Math.floor(this.slot / cols)) return;
      this.slot = next;
      if (this.held === null) this.note = '';
      this.redraw();
    } else if (this.tab === 'notebook') {
      if (dir === 'up' || dir === 'down') this.scrollBy(dir === 'down' ? LINE_H : -LINE_H);
      else this.switchSection(dir === 'right' ? 1 : -1);
    } else if (this.tab === 'calendar') {
      // 选日子：左右一天、上下一周；翻过这个月的头尾就到上个月 / 下个月
      const step = { up: -7, down: 7, left: -1, right: 1 }[dir];
      const n = TIME.calendar.daysPerMonth;
      let d = this.calDay + step;
      let m = this.calMonth;
      const months = TIME.calendar.months.length;
      if (d < 1) {
        d += n;
        m = m === 1 ? months : m - 1;
      } else if (d > n) {
        d -= n;
        m = m === months ? 1 : m + 1;
      }
      this.calMonth = m;
      this.calDay = d;
      this.redraw();
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
    else this.content.add(pixelText(this, W / 2, H / 2, t('map.placeholder'), { color: SETTINGS.ui.textDim }).setOrigin(0.5));
  }

  /** 顶部栏目条：当前那栏垫底色 */
  private drawTabBar() {
    this.tabBar.removeAll(true);
    const ui = SETTINGS.ui;
    let x = 8;
    for (const tab of MENU_TABS) {
      const label = pixelText(this, 0, 0, t(tab.label));
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
      const info = pixelText(this, W - 30, 9, `${clock.dateText()}　${money}`, { color: ui.textDim2 }).setOrigin(1, 0);
      this.tabBar.add(info);
    }
    // 右上角 ✕
    const close = pixelText(this, W - 20, 8, '✕');
    const hit = this.add.zone(W - 26, 4, 22, 22).setOrigin(0).setInteractive();
    hit.on('pointerdown', () => this.close());
    this.tabBar.add([close, hit]);
  }

  // ---------------- 背包 ----------------

  /** 第 i 格画在哪（上面一排是工具栏，空一点再是背包 3 行） */
  private cellRect(i: number) {
    const S = SETTINGS.bag.slotSize;
    const gap = 2;
    const sep = 8;
    const cols = TOOLBAR_SLOTS;
    const gridW = cols * S + (cols - 1) * gap;
    const x0 = Math.round((W - gridW) / 2);
    const y0 = AREA.y + 4;
    const row = Math.floor(i / cols);
    return { x: x0 + (i % cols) * (S + gap), y: y0 + row * (S + gap) + (row >= 1 ? sep : 0), size: S };
  }

  /** 界面坐标 (x, y) 落在第几格（没落在格子上返回 -1） */
  private cellAt(x: number, y: number) {
    for (let i = 0; i < ALL_SLOTS; i++) {
      const r = this.cellRect(i);
      if (x >= r.x && x < r.x + r.size && y >= r.y && y < r.y + r.size) return i;
    }
    return -1;
  }

  private drawBag() {
    const ui = SETTINGS.ui;
    const rows = ALL_SLOTS / TOOLBAR_SLOTS;
    const g = this.add.graphics();
    this.content.add(g);
    for (let i = 0; i < ALL_SLOTS; i++) {
      const { x, y, size: S } = this.cellRect(i);
      g.fillStyle(toColor(i === this.held ? ui.highlight : ui.innerBorder)).fillRect(x, y, S, S);
      drawFrame(g, x, y, S, S, toColor(i === this.slot ? ui.toolSelected : ui.border));
      // 拿起来的那格画淡一点
      drawItemSlot(this, this.content, x, y, S, gameState.slots[i], i === this.held ? 0.4 : 1);
      const hit = this.add.zone(x, y, S, S).setOrigin(0).setInteractive();
      hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (this.modal) return;
        const at = this.cameras.main.getWorldPoint(p.x, p.y);
        this.press = { i, x: at.x, y: at.y, dragging: false };
      });
      this.content.add(hit);
    }
    // 左边写「工具栏」「背包」
    const r0 = this.cellRect(0);
    const r1 = this.cellRect(TOOLBAR_SLOTS);
    this.content.add(pixelText(this, r0.x - 6, r0.y + r0.size / 2, t('bag.toolbarLabel'), { color: ui.textDim2 }).setOrigin(1, 0.5));
    this.content.add(pixelText(this, r1.x - 6, r1.y + r1.size / 2, t('bag.bagLabel'), { color: ui.textDim2 }).setOrigin(1, 0.5));

    // 底下：选中的东西叫什么、有几个；说明或提示；按钮
    const last = this.cellRect(ALL_SLOTS - 1);
    const left = this.cellRect((rows - 1) * TOOLBAR_SLOTS);
    let y = last.y + last.size + 6;
    const sel = gameState.slots[this.slot];
    const info = sel ? itemInfo(sel.id) : undefined;
    let line = t('bag.empty');
    if (sel) {
      const extra = isTool(sel.id) ? `（${t('bag.tool')}）` : `  ${t('bag.count', { n: sel.n })}`;
      line = localName(info?.name) + extra;
    }
    const nameText = pixelText(this, left.x, y, line);
    this.content.add(nameText);
    if (sel?.locked) {
      const lg = this.add.graphics();
      drawLock(lg, left.x + Math.ceil(nameText.width) + 6, y + 2);
      this.content.add([lg, pixelText(this, left.x + Math.ceil(nameText.width) + 16, y, t('bag.locked'), { color: ui.textDim2 })]);
    }
    y += LINE_H + 2;
    // 第二行：刚做的事 / 不能丢的原因 / 物品说明
    const why = sel ? whyCantDiscard(this.slot) : null;
    const second = this.note || (why && sel ? t(why) : '') || (info?.desc ? localName(info.desc) : '');
    if (second) this.content.add(pixelText(this, left.x, y, second, { color: ui.textDim2, wrap: last.x + last.size - left.x }));
    y += LINE_H * 2 + 4;

    // 按钮：丢弃（工具、上锁的、空格是灰的）、上锁 / 解锁
    let bx = left.x;
    const button = (label: string, enabled: boolean, run: () => void) => {
      const txt = pixelText(this, 0, 0, label, { color: enabled ? ui.text : ui.textDim });
      const w = Math.ceil(txt.width) + 14;
      const bg = this.add.graphics();
      bg.fillStyle(toColor(ui.highlight), enabled ? 1 : 0.4).fillRect(bx, y, w, 18);
      drawFrame(bg, bx, y, w, 18, toColor(enabled ? ui.border : ui.innerBorder));
      txt.setPosition(bx + 7, y + 3);
      const hit = this.add.zone(bx, y, w, 18).setOrigin(0).setInteractive();
      hit.on('pointerdown', () => !this.modal && run());
      this.content.add([bg, txt, hit]);
      bx += w + 6;
    };
    const keys = !this.touch;
    button(t('bag.discard') + (keys ? ' X' : ''), !!sel && !why, () => this.discard());
    button((sel?.locked ? t('bag.unlock') : t('bag.lock')) + (keys ? ' L' : ''), !!sel, () => this.lock());
    if (sel && isFood(sel.id)) button(t('bag.eat') + (keys ? ' E' : ''), true, () => this.eat());
    // 操作提示 / 拿起来了
    const held = this.held !== null ? gameState.slots[this.held] : null;
    const hint = held
      ? t(this.touch ? 'bag.pickedTouch' : 'bag.picked', { name: localName(itemInfo(held.id)?.name) })
      : t(this.touch ? 'bag.touchHint' : 'bag.keyHint');
    this.content.add(pixelText(this, bx + 6, y + 3, hint, { color: held ? ui.text : ui.textDim }));
  }

  /** 回车 / 点一下：没拿东西就拿起这一格，拿着东西就放到这一格（交换或叠上去） */
  private bagPick(i: number) {
    if (this.held === null) {
      this.slot = i;
      if (gameState.slots[i]) this.held = i;
    } else {
      if (this.held !== i) moveSlot(this.held, i);
      this.held = null;
      this.slot = i;
    }
    this.note = '';
    this.redraw();
  }

  /** 按住拖：超过几个像素就算拖动，图标跟着走 */
  private dragMove(p: Phaser.Input.Pointer) {
    if (!this.press || !p.isDown || this.modal) return;
    const at = this.cameras.main.getWorldPoint(p.x, p.y);
    if (!this.press.dragging) {
      if (Math.hypot(at.x - this.press.x, at.y - this.press.y) < 6 || !gameState.slots[this.press.i]) return;
      this.press.dragging = true;
      const S = SETTINGS.bag.slotSize;
      this.ghost = this.add.container(0, 0).setDepth(70);
      drawItemSlot(this, this.ghost, -S / 2, -S / 2, S, gameState.slots[this.press.i]);
    }
    this.ghost?.setPosition(Math.round(at.x), Math.round(at.y));
  }

  /** 松手：拖到另一格就移过去；没拖动就是「点了一下」 */
  private dragEnd(p: Phaser.Input.Pointer) {
    const press = this.press;
    this.press = null;
    this.ghost?.destroy();
    this.ghost = undefined;
    if (!press || this.modal) return;
    if (!press.dragging) return this.bagPick(press.i);
    const at = this.cameras.main.getWorldPoint(p.x, p.y);
    const to = this.cellAt(at.x, at.y);
    if (to >= 0 && to !== press.i) {
      moveSlot(press.i, to);
      this.slot = to;
    }
    this.held = null;
    this.note = '';
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
    const s = gameState.slots[i]!;
    const name = localName(itemInfo(s.id)?.name);
    const confirm = (n: number) =>
      this.confirm(t('bag.discardConfirm', { name, n }), t('bag.discardYes'), () => {
        takeFromSlot(i, n);
        if (this.held === i && !gameState.slots[i]) this.held = null;
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
    const s = gameState.slots[this.slot];
    if (!s) return;
    const ate = eatFromSlot(this.slot);
    this.note = ate ? t('msg.ate', { name: localName(itemInfo(ate.id)?.name), n: ate.gain }) : t('bag.cantEat');
    if (this.held === this.slot && !gameState.slots[this.slot]) this.held = null;
    this.redraw();
  }

  /** 上锁 / 解锁 */
  private lock() {
    const s = gameState.slots[this.slot];
    if (!s) return;
    toggleLock(this.slot);
    const name = localName(itemInfo(s.id)?.name);
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
    ).centerAt(W / 2, H / 2);
    this.modal = { destroy: close };
  }

  /** 弹框下面垫一层：点不到后面的格子 */
  private blocker() {
    return this.add.zone(0, 0, W, H).setOrigin(0).setInteractive().setDepth(59);
  }

  // ---------------- 笔记本 ----------------

  private drawNotebook() {
    const ui = SETTINGS.ui;
    if (!hasItem('notebook')) {
      this.content.add(pixelText(this, W / 2, H / 2, t('notebook.noNotebook'), { color: ui.textDim }).setOrigin(0.5));
      return;
    }
    // 左边一列：主线 / 操作 / 已学会
    const colW = 58;
    NOTEBOOK_SECTIONS.forEach((s, i) => {
      const y = AREA.y + 2 + i * 20;
      const g = this.add.graphics();
      if (s.id === this.section) g.fillStyle(toColor(ui.highlight)).fillRect(AREA.x, y, colW, 18);
      const label = pixelText(this, AREA.x + 6, y + 3, t(s.label));
      const hit = this.add.zone(AREA.x, y, colW, 18).setOrigin(0).setInteractive();
      hit.on('pointerdown', () => {
        this.section = s.id;
        this.scroll = 0;
        this.redraw();
      });
      this.content.add([g, label, hit]);
    });
    const sep = this.add.graphics().fillStyle(toColor(ui.innerBorder)).fillRect(AREA.x + colW + 4, AREA.y, 1, AREA.h);
    this.content.add(sep);

    // 右边：能上下滚的一页
    const box = { x: AREA.x + colW + 10, y: AREA.y + 2, w: AREA.w - colW - 12, h: AREA.h - 4 };
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
    const write = (text: string, opts: { color?: string; indent?: number; strike?: boolean; gapAfter?: number; bullet?: string } = {}) => {
      const indent = opts.indent ?? 0;
      // 行首的小记号（· 或 ？）单独放在左边，文字整段往右缩
      if (opts.bullet) layer.add(pixelText(this, indent - 9, y, opts.bullet, { color: opts.color }));
      // 先折好行，再一行一行写（划掉线要按每行的长度画）
      const lines = wrapText(text, w - indent);
      for (const line of lines) {
        const tx = pixelText(this, indent, y, line, { color: opts.color });
        layer.add(tx);
        if (opts.strike && tx.width > 0) {
          layer.add(this.add.graphics().fillStyle(toColor(opts.color ?? ui.text)).fillRect(indent, y + 7, Math.ceil(tx.width), 1));
        }
        y += LINE_H;
      }
      y += opts.gapAfter ?? 0;
    };

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
      write(fillNames(localName(CHAPTERS[ch].name)), { color: ui.money, gapAfter: 2 });
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
    const head = pixelText(this, W / 2, AREA.y + 2, t('calendarTab.header', { month: monthName(this.calMonth), season: localName(seasonOf(this.calMonth).name) }), { color: ui.money }).setOrigin(0.5, 0);
    this.content.add(head);
    const arrow = (label: string, x: number, delta: number) => {
      const a = pixelText(this, x, AREA.y + 2, label).setOrigin(0.5, 0);
      const hit = this.add.zone(x - 14, AREA.y - 2, 28, 22).setOrigin(0).setInteractive();
      hit.on('pointerdown', () => this.flipMonth(delta));
      this.content.add([a, hit]);
    };
    arrow('◀', W / 2 - head.width / 2 - 18, -1);
    arrow('▶', W / 2 + head.width / 2 + 18, 1);

    // 格子大小：按面板大小算（手机上会小一点）
    const cols = cal.daysPerWeek;
    const rows = Math.ceil(cal.daysPerMonth / cols);
    const top = AREA.y + 22;
    const bottomSpace = 52; // 图例 + 说明两行
    const cellW = Math.min(84, Math.floor((AREA.w - 8) / cols));
    const cellH = Math.max(30, Math.min(56, Math.floor((AREA.y + AREA.h - top - 14 - bottomSpace) / rows)));
    const x0 = Math.round((W - cellW * cols) / 2);
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

  private scrollBy(dy: number) {
    if (!this.scrollLayer || this.tab !== 'notebook') return;
    this.scroll = Phaser.Math.Clamp(this.scroll + dy, 0, this.maxScroll);
    this.scrollLayer.setY(AREA.y + 2 - this.scroll);
  }
}
