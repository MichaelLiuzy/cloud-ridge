/**
 * 农场场景：画地图、放主角、走路和碰撞、点东西 / 对着东西做事。
 *  - 地图在 src/world/farmMap.ts 里画
 *  - 「对什么东西能做什么」在 src/world/actions.ts
 *  - 走路速度在 src/config/settings.ts
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { FARM_MAP, TILE_TYPES } from '../world/farmMap';
import { PLAIN_ACTIONS, TOOL_ACTIONS, type ToolAction } from '../world/actions';
import { KeyboardControls } from '../input/Controls';
import { Clock } from '../systems/Clock';
import { currentTool, gameState, hasTool } from '../systems/GameState';
import { findPath, type Cell } from '../systems/pathfind';
import { localName, t } from '../locales/i18n';
import { UI_EVENTS, type MenuOption } from './HudScene';
import timeData from '../data/time.json';
import itemsData from '../data/items.json';

type Facing = 'down' | 'up' | 'left' | 'right';

/** 地图上一格现在的样子（地面图片 + 上面的东西 + 碰撞块） */
interface TileView {
  ground: Phaser.GameObjects.Image;
  object?: Phaser.GameObjects.Image;
  body?: Phaser.Physics.Arcade.Sprite;
}

/** 这些地块是「地面」，人可以站上去，菜单里会有「走到这里」 */
const GROUND_KINDS = ['grass', 'grassDark', 'path', 'tilled', 'watered'];

export class FarmScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private controls!: KeyboardControls;
  private facing: Facing = 'down';
  private doorTile: Cell = { x: 0, y: 0 };
  /** 地图字符（会随着开垦、割草改变） */
  private grid: string[][] = [];
  private views: TileView[][] = [];
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  /** 自动走路：要经过的格子，以及走到后要做的事 */
  private route: Cell[] = [];
  private onArrive?: () => void;

  constructor() {
    super('Farm');
  }

  create() {
    const s = SETTINGS.tileSize;
    this.grid = FARM_MAP.map((row) => [...row]);
    const rows = this.grid.length;
    const cols = Math.max(...this.grid.map((r) => r.length));
    this.solids = this.physics.add.staticGroup();

    // ---- 一格一格把地图画出来 ----
    let spawn = { x: 0, y: 0 };
    const hutTiles: Cell[] = [];
    this.grid.forEach((row, ty) => {
      this.views[ty] = [];
      row.forEach((ch, tx) => {
        if (ch === 'P') spawn = this.cellCenter({ x: tx, y: ty });
        if (ch === 'D') this.doorTile = { x: tx, y: ty };
        if (ch === 'H') hutTiles.push({ x: tx, y: ty });
        this.views[ty][tx] = { ground: this.add.image(0, 0, 'grass') };
        this.refreshTile(tx, ty);
      });
    });
    if (hutTiles.length) this.drawHut(hutTiles);

    // ---- 主角 ----
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'player-down');
    // 碰撞框只算脚下那一小块，这样走在树前面时头可以盖住树根，更自然
    this.player.body!.setSize(s * 0.5, s * 0.3).setOffset(s * 0.25, s * 0.65);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);

    // ---- 镜头 ----
    this.physics.world.setBounds(0, 0, cols * s, rows * s);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, cols * s, rows * s);
    cam.setBackgroundColor(SETTINGS.backgroundColor);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.roundPixels = true;
    const fitZoom = () => cam.setZoom(this.scale.height / (SETTINGS.tilesVisibleVertically * s));
    fitZoom();
    this.scale.on('resize', fitZoom);
    if (SETTINGS.debugPhysics) this.physics.world.createDebugGraphic();

    // ---- 操作（界面场景先处理，没被对话框/菜单拦下才轮到这里）----
    this.controls = new KeyboardControls(this);
    const ev = this.game.events;
    ev.on(UI_EVENTS.worldAction, this.interactFacing, this);
    ev.on(UI_EVENTS.worldUseTool, this.useToolFacing, this);
    ev.on(UI_EVENTS.worldSmart, this.smartFacing, this);
    ev.on(UI_EVENTS.worldTap, this.tapScreen, this);

    // ---- 时间 ----
    gameState.clock = new Clock();
    gameState.clock.onLateNight = () => this.faint('late');

    this.events.once('shutdown', () => {
      ev.off(UI_EVENTS.worldAction, this.interactFacing, this);
      ev.off(UI_EVENTS.worldUseTool, this.useToolFacing, this);
      ev.off(UI_EVENTS.worldSmart, this.smartFacing, this);
      ev.off(UI_EVENTS.worldTap, this.tapScreen, this);
      this.scale.off('resize', fitZoom);
    });
  }

  update(_time: number, delta: number) {
    const paused = gameState.uiBusy;
    if (gameState.clock) gameState.clock.paused = paused;
    gameState.clock?.update(delta);

    // 体力很低时走得慢（数值见 time.json 的 stamina）
    const slow = gameState.stamina <= timeData.stamina.lowThreshold ? timeData.stamina.lowSpeedMultiplier : 1;
    let { x, y } = paused ? { x: 0, y: 0 } : this.controls.moveVector();

    if (x !== 0 || y !== 0) {
      this.route = []; // 自己动了方向键/摇杆，就取消自动走路
      this.onArrive = undefined;
    } else if (this.route.length && !paused) {
      ({ x, y } = this.followRoute());
    }

    const speed = (this.route.length ? SETTINGS.autoWalkSpeed : SETTINGS.playerSpeed) * slow;
    this.player.setVelocity(x * speed, y * speed);
    if (x !== 0 || y !== 0) {
      this.facing = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
      this.player.setTexture(`player-${this.facing}`);
    }
    this.player.setDepth(this.player.y + 1);
  }

  // =================================================================
  //  三种操作入口
  // =================================================================

  /** 回车：查看 / 对话（不用工具的事） */
  private interactFacing() {
    const cell = this.facingCell();
    const options = this.optionsFor(cell, { tools: false, walk: false });
    this.runOptions(options, cell);
  }

  /** 空格：用手上的工具对着面前那一格 */
  private useToolFacing() {
    const tool = currentTool();
    if (!tool) return this.say('msg.noTool');
    const cell = this.facingCell();
    const rule = TOOL_ACTIONS.find((a) => a.tool === tool && a.on.includes(this.kindAt(cell)));
    if (!rule) return this.say('msg.cantUseTool', { tool: this.itemName(tool) });
    this.doToolAction(rule, cell);
  }

  /** 手机「使用」键：对面前那一格做最合适的事（只有一件就直接做，多件弹菜单） */
  private smartFacing() {
    const cell = this.facingCell();
    this.runOptions(this.optionsFor(cell, { tools: true, walk: false }), cell);
  }

  /** 点了屏幕上某个位置（鼠标或手指） */
  private tapScreen(sx: number, sy: number) {
    const p = this.cameras.main.getWorldPoint(sx, sy);
    const s = SETTINGS.tileSize;
    const cell = { x: Math.floor(p.x / s), y: Math.floor(p.y / s) };
    if (!this.grid[cell.y]?.[cell.x]) return;
    this.runOptions(this.optionsFor(cell, { tools: true, walk: true }), cell, true);
  }

  // =================================================================
  //  「能做什么」和「去做」
  // =================================================================

  /** 列出对这一格能做的事 */
  private optionsFor(cell: Cell, opts: { tools: boolean; walk: boolean }): (MenuOption & { needReach: boolean })[] {
    const kind = this.kindAt(cell);
    const list: (MenuOption & { needReach: boolean })[] = [];
    if (opts.tools) {
      for (const rule of TOOL_ACTIONS) {
        if (rule.on.includes(kind) && hasTool(rule.tool)) {
          list.push({ label: t(`action.${rule.id}`), run: () => this.doToolAction(rule, cell), needReach: true });
        }
      }
    }
    for (const plain of PLAIN_ACTIONS) {
      if (plain.on.includes(kind)) {
        list.push({ label: t(`action.${plain.id}`), run: () => this.doPlainAction(plain.id), needReach: true });
      }
    }
    const isGround = GROUND_KINDS.includes(kind);
    if (!isGround) {
      const hint = TILE_TYPES[this.grid[cell.y][cell.x]]?.hint ?? 'hint.nothing';
      list.push({ label: t('action.look'), run: () => this.say(hint), needReach: true });
    }
    if (opts.walk && isGround && !this.isSolid(cell)) {
      list.push({ label: t('action.walk'), run: () => {}, needReach: false });
    }
    return list;
  }

  /**
   * 执行选项：只有一个就直接做，多个就弹小菜单。
   * fromTap = 点屏幕来的，这时如果离得远，会先自动走过去。
   */
  private runOptions(options: (MenuOption & { needReach: boolean })[], cell: Cell, fromTap = false) {
    if (options.length === 0) return this.say('hint.nothing');
    const wrap = (o: MenuOption & { needReach: boolean }): MenuOption => ({
      label: o.label,
      run: () => {
        if (!fromTap) return o.run();
        if (o.needReach) this.walkNextTo(cell, o.run);
        else this.walkOnto(cell);
      },
    });
    if (options.length === 1) return wrap(options[0]).run();
    this.game.events.emit(UI_EVENTS.showMenu, options.map(wrap));
  }

  private doToolAction(rule: ToolAction, cell: Cell) {
    // 顺手把工具栏切到这把工具上
    const idx = gameState.tools.indexOf(rule.tool);
    if (idx >= 0) gameState.toolIndex = idx;
    if (rule.turnsInto) this.setTile(cell, rule.turnsInto);
    if (rule.doneHint) this.say(rule.doneHint);
    this.spendStamina((timeData.stamina.costs as Record<string, number>)[rule.cost] ?? 0);
  }

  private doPlainAction(id: string) {
    if (id === 'sleep') this.sleep();
  }

  // =================================================================
  //  一天结束：睡觉、昏倒
  // =================================================================

  private sleep() {
    const clock = gameState.clock!;
    // 半夜前睡觉体力全满，过了半夜只恢复一部分（time.json 的 sleep）
    const ratio = clock.minutes < 24 * 60 ? timeData.sleep.beforeMidnightRestore : timeData.sleep.afterMidnightRestore;
    this.startNewDay(ratio);
    this.say('msg.sleep');
  }

  private spendStamina(cost: number) {
    gameState.stamina = Math.max(0, gameState.stamina - cost);
    if (gameState.stamina <= 0) this.faint('exhausted');
  }

  /** 昏倒：late = 熬到凌晨两点，exhausted = 体力用完（数值见 time.json 的 faint） */
  private faint(reason: 'late' | 'exhausted') {
    if (reason === 'late') {
      this.startNewDay(timeData.faint.lateNight.nextDayStamina);
      this.say('msg.lateNightFaint');
    } else {
      const f = timeData.faint.exhausted;
      const fee = Math.min(f.fee, Math.floor(gameState.cash * f.feeMaxFractionOfCash));
      gameState.cash -= fee;
      this.startNewDay(f.nextDayStamina);
      this.say('msg.exhaustedFaint', { fee });
    }
  }

  private startNewDay(staminaRatio: number) {
    gameState.clock!.nextDay();
    gameState.stamina = Math.round(gameState.maxStamina * staminaRatio);
    // 浇过的水第二天就干了
    this.grid.forEach((row, y) => row.forEach((ch, x) => ch === 'O' && this.setTile({ x, y }, 'o')));
    this.route = [];
    this.onArrive = undefined;
    const door = this.cellCenter(this.doorTile);
    this.player.setPosition(door.x, door.y);
    this.facing = 'down';
    this.player.setTexture('player-down');
  }

  // =================================================================
  //  自动走路
  // =================================================================

  /** 走到某一格旁边（上下左右相邻），然后面朝它做事 */
  private walkNextTo(target: Cell, then: () => void) {
    const here = this.playerCell();
    const face = () => {
      this.faceToward(target);
      then();
    };
    if (Math.abs(here.x - target.x) + Math.abs(here.y - target.y) === 1) return face();
    const goals = [
      { x: target.x, y: target.y + 1 },
      { x: target.x, y: target.y - 1 },
      { x: target.x - 1, y: target.y },
      { x: target.x + 1, y: target.y },
    ];
    const path = findPath(here, goals, (c) => this.isWalkable(c));
    if (!path) return this.say('msg.cantReach');
    this.route = path;
    this.onArrive = face;
  }

  /** 走到某一格上 */
  private walkOnto(target: Cell) {
    const path = findPath(this.playerCell(), [target], (c) => this.isWalkable(c));
    if (!path) return this.say('msg.cantReach');
    this.route = path;
    this.onArrive = undefined;
  }

  /** 每帧：朝路线上的下一格走，返回移动方向 */
  private followRoute(): { x: number; y: number } {
    const next = this.cellCenter(this.route[0]);
    const dx = next.x - this.player.x;
    const dy = next.y - this.player.y;
    if (Math.hypot(dx, dy) < 3) {
      this.player.setPosition(next.x, next.y);
      this.route.shift();
      if (!this.route.length) {
        const done = this.onArrive;
        this.onArrive = undefined;
        done?.();
        return { x: 0, y: 0 };
      }
      return this.followRoute();
    }
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  }

  // =================================================================
  //  地图小工具
  // =================================================================

  private cellCenter(c: Cell) {
    const s = SETTINGS.tileSize;
    return { x: c.x * s + s / 2, y: c.y * s + s / 2 };
  }

  /** 主角站在哪一格（按脚的位置算） */
  private playerCell(): Cell {
    const s = SETTINGS.tileSize;
    return { x: Math.floor(this.player.x / s), y: Math.floor((this.player.y + s * 0.3) / s) };
  }

  private facingCell(): Cell {
    const c = this.playerCell();
    if (this.facing === 'up') c.y -= 1;
    if (this.facing === 'down') c.y += 1;
    if (this.facing === 'left') c.x -= 1;
    if (this.facing === 'right') c.x += 1;
    return c;
  }

  private faceToward(target: Cell) {
    const here = this.playerCell();
    const dx = target.x - here.x;
    const dy = target.y - here.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    this.player.setTexture(`player-${this.facing}`);
  }

  private kindAt(c: Cell) {
    const ch = this.grid[c.y]?.[c.x];
    return ch ? (TILE_TYPES[ch]?.kind ?? 'grass') : 'none';
  }

  private isSolid(c: Cell) {
    const ch = this.grid[c.y]?.[c.x];
    return ch === undefined || (TILE_TYPES[ch]?.solid ?? false);
  }

  private isWalkable(c: Cell) {
    return !this.isSolid(c);
  }

  /** 把一格改成别的字符（比如草地 → 田），并重画 */
  private setTile(c: Cell, ch: string) {
    this.grid[c.y][c.x] = ch;
    this.refreshTile(c.x, c.y);
  }

  /** 按地图字符重画一格 */
  private refreshTile(tx: number, ty: number) {
    const ch = this.grid[ty][tx];
    const view = this.views[ty][tx];
    const info = TILE_TYPES[ch] ?? TILE_TYPES['.'];
    const { x: px, y: py } = this.cellCenter({ x: tx, y: ty });
    const groundKinds = ['path', 'tilled', 'watered', 'water', 'grassDark'];
    view.ground.setPosition(px, py).setTexture(groundKinds.includes(info.kind) ? info.kind : 'grass');

    view.object?.destroy();
    view.object = undefined;
    if (!GROUND_KINDS.includes(info.kind) && !['hut', 'water'].includes(info.kind)) {
      // 树、石头这些东西画在草地上面，按 y 排前后（下面的挡住上面的）
      view.object = this.add.image(px, py, info.kind).setDepth(py);
    }

    if (info.solid && !view.body) {
      view.body = this.solids.create(px, py, undefined) as Phaser.Physics.Arcade.Sprite;
      view.body.setVisible(false).setSize(SETTINGS.tileSize, SETTINGS.tileSize).refreshBody();
    } else if (!info.solid && view.body) {
      view.body.destroy();
      view.body = undefined;
    }
  }

  private itemName(id: string) {
    return localName(itemsData.items.find((it) => it.id === id)?.name);
  }

  private say(key: string, params?: Record<string, string | number>) {
    this.game.events.emit(UI_EVENTS.say, key, params);
  }

  /** 把连在一起的 H 画成一座草棚（占位画法） */
  private drawHut(tiles: Cell[]) {
    const s = SETTINGS.tileSize;
    const c = SETTINGS.colors;
    const minX = Math.min(...tiles.map((t) => t.x));
    const maxX = Math.max(...tiles.map((t) => t.x));
    const minY = Math.min(...tiles.map((t) => t.y));
    const maxY = Math.max(...tiles.map((t) => t.y));
    const x = minX * s;
    const y = minY * s;
    const w = (maxX - minX + 1) * s;
    const h = (maxY - minY + 1) * s;
    const g = this.add.graphics().setDepth(y + h);
    g.fillStyle(c.hutWall).fillRect(x + 4, y + h * 0.4, w - 8, h * 0.6);
    g.fillStyle(c.hutRoof).fillTriangle(x - 6, y + h * 0.48, x + w / 2, y - s * 0.5, x + w + 6, y + h * 0.48);
    g.fillStyle(0x3a2a1a).fillRect(x + w / 2 - s * 0.3, y + h - s * 0.75, s * 0.6, s * 0.75); // 门
  }
}
