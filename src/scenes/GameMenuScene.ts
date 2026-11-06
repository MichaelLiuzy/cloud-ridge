/**
 * Q 总菜单：一个叠在游戏上面的全屏面板。
 *  - 顶部一排栏目（背包 / 笔记本 / 地图，栏目表在 src/data/menuTabs.ts）。
 *    Tab 切到下一栏，Shift+Tab 切回上一栏；手机上直接点栏目名。
 *  - Q 或 Esc 关闭；右上角的 ✕ 也能关。
 *  - 打开时游戏时间暂停（gameState.menuOpen = true，农场场景看到它就停）。
 * 背包格子的行列数在 src/config/settings.ts 的 bag 里。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { toColor } from '../config/palette';
import { CHAPTERS, CLUES, QUESTIONS, type ClueId, type QuestionId } from '../data/clues';
import { MENU_TABS, NOTEBOOK_SECTIONS, type MenuTabId, type NotebookSectionId } from '../data/menuTabs';
import { ITEMS } from '../data/items';
import { isTouchDevice } from '../input/Controls';
import { localName, t } from '../locales/i18n';
import { fillNames } from '../story/text';
import { gameState, hasItem } from '../systems/GameState';
import { chaptersInOrder, chapterStarted, questionState } from '../systems/story/notebook';
import { drawFrame, drawPanel, pixelText } from '../ui/pixelUi';
import { wrapText } from '../ui/richText';

const { gameWidth: W, gameHeight: H } = SETTINGS;
/** 内容区（栏目条下面那块） */
const AREA = { x: 8, y: 28, w: W - 16, h: H - 34 };
const LINE_H = 14;

export class GameMenuScene extends Phaser.Scene {
  private tab: MenuTabId = 'bag';
  private section: NotebookSectionId = 'story';
  /** 栏目条和内容各放一层，切栏目时只重画内容 */
  private tabBar!: Phaser.GameObjects.Container;
  private content!: Phaser.GameObjects.Container;
  /** 打开后一小会儿不理按键（免得打开菜单的那下 Q 又把它关掉） */
  private openedAt = 0;
  /** 背包里选中第几格 */
  private slot = 0;
  /** 笔记本：往下滚了多少像素，最多能滚多少 */
  private scroll = 0;
  private maxScroll = 0;
  private scrollLayer?: Phaser.GameObjects.Container;
  private touch = false;

  constructor() {
    super('GameMenu');
  }

  create(data: { tab?: MenuTabId }) {
    this.tab = data?.tab ?? 'bag';
    this.slot = 0;
    this.scroll = 0;
    this.touch = isTouchDevice();
    this.openedAt = this.time.now;
    gameState.menuOpen = true;

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
      if (dragY === null || !p.isDown) return;
      const d = dragY - p.y;
      if (Math.abs(d) >= 1) {
        this.scrollBy(d);
        dragY = p.y;
      }
    });
    this.input.on('pointerup', () => (dragY = null));
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
      if (e.key === 'Tab') return this.switchTab(e.shiftKey ? -1 : 1);
      if (is(keys.bag, e) || is(keys.cancel, e)) return this.close();
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
      const { cols } = SETTINGS.bag;
      const total = this.bagEntries().length;
      if (!total) return;
      const step = { up: -cols, down: cols, left: -1, right: 1 }[dir];
      const next = this.slot + step;
      if (next >= 0 && next < total) {
        this.slot = next;
        this.redraw();
      }
    } else if (this.tab === 'notebook') {
      if (dir === 'up' || dir === 'down') this.scrollBy(dir === 'down' ? LINE_H : -LINE_H);
      else this.switchSection(dir === 'right' ? 1 : -1);
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
    // 右上角 ✕
    const close = pixelText(this, W - 20, 8, '✕');
    const hit = this.add.zone(W - 26, 4, 22, 22).setOrigin(0).setInteractive();
    hit.on('pointerdown', () => this.close());
    this.tabBar.add([close, hit]);
  }

  // ---------------- 背包 ----------------

  /** 背包里有什么：工具在前，然后重要物品，然后其他东西（按物品表的顺序） */
  private bagEntries() {
    const rank: Record<string, number> = { tool: 0, key: 1 };
    return ITEMS.items
      .filter((it) => (gameState.inventory[it.id] ?? 0) > 0 || gameState.tools.includes(it.id))
      .map((it, order) => ({ item: it, order, count: gameState.inventory[it.id] ?? 1 }))
      .sort((a, b) => (rank[a.item.type] ?? 2) - (rank[b.item.type] ?? 2) || a.order - b.order);
  }

  private drawBag() {
    const ui = SETTINGS.ui;
    const { cols, rows, slotSize: S } = SETTINGS.bag;
    const gap = 2;
    const gridW = cols * S + (cols - 1) * gap;
    const x0 = Math.round((W - gridW) / 2);
    const y0 = AREA.y + 4;
    const entries = this.bagEntries();
    if (this.slot >= entries.length) this.slot = Math.max(0, entries.length - 1);
    const g = this.add.graphics();
    this.content.add(g);
    for (let i = 0; i < cols * rows; i++) {
      const x = x0 + (i % cols) * (S + gap);
      const y = y0 + Math.floor(i / cols) * (S + gap);
      g.fillStyle(toColor(ui.innerBorder)).fillRect(x, y, S, S);
      drawFrame(g, x, y, S, S, toColor(i === this.slot && entries.length ? ui.toolSelected : ui.border));
      const e = entries[i];
      if (!e) continue;
      const key = `icon_${e.item.id}`;
      if (this.textures.exists(key)) this.content.add(this.add.image(x + S / 2, y + S / 2, key));
      else this.content.add(pixelText(this, x + S / 2, y + S / 2, localName(e.item.name).slice(0, 1)).setOrigin(0.5));
      if (e.item.type !== 'tool' && e.count > 1) {
        this.content.add(pixelText(this, x + S, y + S + 2, String(e.count), { color: ui.text }).setOrigin(1, 1).setStroke(ui.panel, 3));
      }
      const hit = this.add.zone(x, y, S, S).setOrigin(0).setInteractive();
      hit.on('pointerdown', () => {
        this.slot = i;
        this.redraw();
      });
      this.content.add(hit);
    }
    // 底下一行：选中的东西叫什么、有几个
    const y = y0 + rows * (S + gap) + 6;
    const sel = entries[this.slot];
    let line = t('bag.empty');
    if (sel) {
      const extra = sel.item.type === 'tool' ? `（${t('bag.tool')}）` : sel.count > 1 || sel.item.type !== 'key' ? `  ${t('bag.count', { n: sel.count })}` : '';
      line = localName(sel.item.name) + extra;
    }
    this.content.add(pixelText(this, W / 2, y, line).setOrigin(0.5, 0));
    // 物品说明（物品表里的 desc）
    if (sel?.item.desc) this.content.add(pixelText(this, W / 2, y + LINE_H + 2, localName(sel.item.desc), { color: SETTINGS.ui.textDim2 }).setOrigin(0.5, 0));
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

  private scrollBy(dy: number) {
    if (!this.scrollLayer || this.tab !== 'notebook') return;
    this.scroll = Phaser.Math.Clamp(this.scroll + dy, 0, this.maxScroll);
    this.scrollLayer.setY(AREA.y + 2 - this.scroll);
  }
}
