/**
 * 农场场景：画地图、放主角、走路和碰撞、点东西 / 对着东西做事。
 *  - 地图在 src/world/farmMap.ts 里画
 *  - 「对什么东西能做什么」在 src/world/actions.ts
 *  - 走路速度在 src/config/settings.ts
 *  - 用哪张图、缺图时的色块在 src/config/assets.ts
 *
 * 主角的位置 = 脚底中间那一点。图片从脚底往上画（16×32），所以站在树前面时会盖住树根。
 * 所有东西按脚底的 y 排前后：越靠下越在前面。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { VIEW, VIEW_EVENTS } from '../config/view';
import { GROUND_TILES, WALK_SHEET, frameIndex } from '../config/assets';
import { PALETTE, toColor } from '../config/palette';
import { BASKET_CELL, FARM_MAP, HOUSE_SITE, TILE_TYPES } from '../world/farmMap';
import { PLAIN_ACTIONS, heldActionFor, type CropState, type HeldAction } from '../world/actions';
import { KeyboardControls } from '../input/Controls';
import { gameState } from '../systems/GameState';
import { addItem, countItem, heldItem, inventoryCounts, itemInfo, roomFor, takeFromSlot } from '../systems/inventory';
import { basketPrice } from '../systems/economy/shop';
import { CROP_LOOKS, cropFromSeed, cropInfo, cropLook, growOvernight, harvest, inSowWindow, isRipe, nextSowTerm, plant } from '../systems/farming/crops';
import { buildOvernight, dwelling, requestBuild, ruinCleared, stageInfo } from '../systems/home/house';
import { putInBasket, sellableInBag, settleBasket, takeFromBasket } from '../systems/economy/pickup';
import { CHEST_SLOTS, putInChest, storableInBag, takeFromChest } from '../systems/home/storage';
import { HOUSING } from '../data/housing';
import type { SaveData } from '../systems/save/saveFormat';
import { stateFields } from '../systems/save/snapshot';
import { clearTemp, saveTemp, saveToSlot } from '../systems/save/saveManager';
import { findPath, type Cell } from '../systems/pathfind';
import { localName, t } from '../locales/i18n';
import { UI_EVENTS } from './HudScene';
import type { MenuOption } from '../ui/ListMenu';
import { TIME as timeData } from '../data/time';
import { ITEMS as itemsData } from '../data/items';

type Facing = 'down' | 'up' | 'left' | 'right';

/** 地图上一格现在的样子（地面图片 + 上面的东西 + 碰撞块） */
interface TileView {
  ground: Phaser.GameObjects.Image;
  object?: Phaser.GameObjects.Image;
  body?: Phaser.Physics.Arcade.Sprite;
}

/** 夜里会亮的地方（灯笼、窗户）。x, y 是世界坐标；fire 是火光类的图（回忆模式里保留颜色） */
export interface LightSpot {
  x: number;
  y: number;
  radius: number;
  fire?: Phaser.GameObjects.Image;
}

/** 站立图里每个朝向是第几格（顺序：下 左 右 上） */
const DIR_FRAME: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
/** 碰撞框（脚下那一小块）的宽高 */
const FEET_W = 10;
const FEET_H = 6;

/** 这些地块是「地面」，人可以站上去，菜单里会有「走到这里」 */
const GROUND_KINDS = ['grass', 'grassDark', 'path', 'tilled', 'watered', 'site'];

/** 一句要显示的话：语言文件里的名字 + 要替换的内容 */
type News = [string, Record<string, string | number>?];

export class FarmScene extends Phaser.Scene {
  /** 看不见的「脚」：负责碰撞和移动 */
  private feet!: Phaser.GameObjects.Zone;
  /** 看得见的主角图片，每帧跟着脚走（走路时上下颠一颠） */
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private moving = false;
  /** 有没有真正的走路动画图（player_walk.png） */
  private hasWalkSheet = false;
  /** 序章里站在农场等你的周里正（教完操作就回镇上） */
  private zhou?: { cell: Cell; sprite: Phaser.GameObjects.Sprite; marker: Phaser.GameObjects.Container; body: Phaser.Physics.Arcade.Sprite };
  /** 夜里会亮的地方，昼夜色层场景会来读 */
  lightSpots: LightSpot[] = [];
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
  /** 地里每格作物的图（「x,y」→ 图） */
  private cropViews = new Map<string, Phaser.GameObjects.Image>();
  /** 重建中的老宅的图 */
  private houseImage?: Phaser.GameObjects.Image;
  private houseLight?: LightSpot;
  /** 草棚（柴房）的图和窗户的光 */
  private hutImage?: Phaser.GameObjects.Image;
  private hutLight?: LightSpot;

  constructor() {
    super('Farm');
  }

  create() {
    // 读档时用存档里的地图（开垦、浇水情况都在里面），新游戏用 farmMap.ts 里的
    const load = gameState.pendingLoad;
    gameState.pendingLoad = null;
    this.grid = (load ? load.farm : FARM_MAP).map((row) => [...row]);
    this.views = [];
    this.lightSpots = [];
    this.cropViews = new Map();
    this.houseImage = undefined;
    this.houseLight = undefined;
    this.hutImage = undefined;
    this.hutLight = undefined;
    this.route = [];
    this.onArrive = undefined;
    const rows = this.grid.length;
    const cols = Math.max(...this.grid.map((r) => r.length));
    this.solids = this.physics.add.staticGroup();

    // ---- 一格一格把地图画出来 ----
    let spawn = { x: 0, y: 0 };
    const hutTiles: Cell[] = [];
    this.grid.forEach((row, ty) => {
      this.views[ty] = [];
      row.forEach((ch, tx) => {
        if (ch === 'P') spawn = this.cellFeet({ x: tx, y: ty });
        if (ch === 'D') this.doorTile = { x: tx, y: ty };
        if (ch === 'H') hutTiles.push({ x: tx, y: ty });
        this.views[ty][tx] = { ground: this.add.image(0, 0, 'tiles_farm', 0).setOrigin(0).setDepth(0) };
        this.refreshTile(tx, ty);
      });
    });
    if (hutTiles.length) this.placeHut(hutTiles);
    this.refreshHouse();
    this.startWaterShimmer();
    if (gameState.pickup.unlocked) this.placeBasket();
    for (const key of Object.keys(gameState.crops)) this.refreshCrop(key);

    // ---- 主角 ----
    this.feet = this.add.zone(spawn.x, spawn.y - FEET_H / 2, FEET_W, FEET_H);
    this.physics.add.existing(this.feet);
    this.feetBody().setCollideWorldBounds(true);
    this.physics.add.collider(this.feet, this.solids);
    this.shadow = this.add.ellipse(0, 0, 12, 4, toColor(PALETTE.ink), 0.3).setDepth(1);
    this.sprite = this.add.sprite(0, 0, 'player_stand', 0).setOrigin(0.5, 1);
    this.setupWalkAnims();
    if (load) {
      this.setFeet(load.player.x, load.player.y);
      this.facing = (load.player.facing as Facing) ?? 'down';
    }
    // 序章：刚在农场醒来，周里正站在旁边等你过去说话
    if (gameState.prologue === 'tutorial') {
      const door = this.cellFeet(this.doorTile);
      this.setFeet(door.x, door.y);
      this.facing = 'right';
      this.placeZhou({ x: this.doorTile.x + 1, y: this.doorTile.y });
    }
    // 万一站在了挡路的格子上（比如旧存档里这里后来变成了废墟），挪到门口
    if (this.isSolid(this.playerCell())) {
      const door = this.cellFeet(this.doorTile);
      this.setFeet(door.x, door.y);
    }
    this.showStanding();
    this.syncSprite();
    // 物理移动算完之后再把图片挪过去，镜头和人物就不会差一帧
    this.events.on('postupdate', this.syncSprite, this);

    // ---- 镜头 ----
    const s = SETTINGS.tileSize;
    this.physics.world.setBounds(0, 0, cols * s, rows * s);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, cols * s, rows * s);
    cam.setBackgroundColor(SETTINGS.backgroundColor);
    cam.startFollow(this.feet, true, 0.2, 0.2);
    cam.setRoundPixels(true);
    // 地图放大 VIEW.world 倍（画布是屏幕的真实像素）；窗口大小变了就跟着改
    const zoomCam = () => cam.setSize(this.scale.width, this.scale.height).setZoom(VIEW.world);
    zoomCam();
    this.game.events.on(VIEW_EVENTS.changed, zoomCam);
    this.events.once('shutdown', () => this.game.events.off(VIEW_EVENTS.changed, zoomCam));
    if (SETTINGS.debugPhysics) this.physics.world.createDebugGraphic();

    // ---- 操作（界面场景先处理，没被对话框/菜单拦下才轮到这里）----
    this.controls = new KeyboardControls(this);
    const ev = this.game.events;
    ev.on(UI_EVENTS.worldAction, this.interactFacing, this);
    ev.on(UI_EVENTS.worldUseTool, this.useToolFacing, this);
    ev.on(UI_EVENTS.worldSmart, this.smartFacing, this);
    ev.on(UI_EVENTS.worldTap, this.tapScreen, this);
    ev.on(FARM_EVENTS.debugDays, this.debugDays, this);
    ev.on(FARM_EVENTS.debugBuild, this.debugBuild, this);
    ev.on(FARM_EVENTS.basketUnlocked, this.placeBasket, this);

    // ---- 时间 ----
    // 时钟在开局 / 读档时已经建好（GameState.resetGameState）
    gameState.clock!.onLateNight = () => this.faint('late');

    // ---- 存档 ----
    gameState.snapshot = () => this.snapshot();
    // 切到后台（切 app、锁屏、关网页）时，自动存一份临时进度
    const onHide = () => {
      if (document.visibilityState === 'hidden') void saveTemp(this.snapshot());
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    this.events.once('shutdown', () => {
      ev.off(UI_EVENTS.worldAction, this.interactFacing, this);
      ev.off(UI_EVENTS.worldUseTool, this.useToolFacing, this);
      ev.off(UI_EVENTS.worldSmart, this.smartFacing, this);
      ev.off(UI_EVENTS.worldTap, this.tapScreen, this);
      ev.off(FARM_EVENTS.debugDays, this.debugDays, this);
      ev.off(FARM_EVENTS.debugBuild, this.debugBuild, this);
      ev.off(FARM_EVENTS.basketUnlocked, this.placeBasket, this);
      this.zhou = undefined;
      this.events.off('postupdate', this.syncSprite, this);
      this.lightSpots = [];
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      gameState.snapshot = null;
      this.scene.stop('Atmosphere');
      this.input.keyboard?.removeAllKeys(true);
    });
  }

  update(_time: number, delta: number) {
    const paused = gameState.uiBusy || gameState.menuOpen;
    if (gameState.clock) gameState.clock.paused = paused;
    gameState.clock?.update(delta);

    // 体力很低时走得慢（数值见 time.ts 的 stamina）
    const slow = gameState.stamina <= timeData.stamina.lowThreshold ? timeData.stamina.lowSpeedMultiplier : 1;
    let { x, y } = paused ? { x: 0, y: 0 } : this.controls.moveVector();

    if (x !== 0 || y !== 0) {
      this.route = []; // 自己动了方向键/摇杆，就取消自动走路
      this.onArrive = undefined;
      ({ x, y } = this.cornerSlide(x, y));
    } else if (this.route.length && !paused) {
      // 这一帧大约走多远：离下一格比这还近就直接站上去（帧率低时一步走得远，不然会在格子两边来回晃）
      const step = (SETTINGS.autoWalkSpeed * slow * delta) / 1000;
      ({ x, y } = this.followRoute(step));
    }

    const speed = (this.route.length ? SETTINGS.autoWalkSpeed : SETTINGS.playerSpeed) * slow;
    this.feetBody().setVelocity(x * speed, y * speed);
    this.moving = x !== 0 || y !== 0;
    if (this.moving) {
      this.facing = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
      if (this.hasWalkSheet) this.sprite.anims.play(`walk-${this.facing}`, true);
      else this.sprite.setFrame(DIR_FRAME[this.facing]);
    } else {
      this.showStanding();
    }
  }

  // =================================================================
  //  主角的图：站立 / 走路颠动 / 走路动画 / 工具挥动
  // =================================================================

  private feetBody() {
    return this.feet.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * 贴边滑入：朝一个方向直走、被墙角挡住，而旁边差几个像素就能对准通道（门、窄路）时，
   * 先往通道那边挪，对准了再接着往前走。最多挪 SETTINGS.cornerSlidePixels 像素。
   * 斜着走（两个方向都按得很明显）时不管，免得抢玩家的方向。
   */
  private cornerSlide(x: number, y: number) {
    const max = SETTINGS.cornerSlidePixels;
    const horiz = Math.abs(x) >= Math.abs(y);
    const main = horiz ? x : y;
    const side = horiz ? y : x;
    if (max <= 0 || Math.abs(side) > Math.abs(main) * 0.5) return { x, y };
    const b = this.feetBody();
    const dir = Math.sign(main);
    // 把脚的框挪 (ox, oy) 以后，再往前走一步会不会撞上
    const stepBlocked = (ox: number, oy: number) =>
      this.rectBlocked(b.x + ox + (horiz ? dir : 0), b.y + oy + (horiz ? 0 : dir), b.width, b.height);
    if (!stepBlocked(0, 0)) return { x, y };
    // 往两边找最近的空当；摇杆稍微偏向哪边，就先试哪边
    const sides = side < 0 ? [-1, 1] : [1, -1];
    for (let d = 1; d <= max; d++) {
      for (const s of sides) {
        const ox = horiz ? 0 : s * d;
        const oy = horiz ? s * d : 0;
        if (stepBlocked(ox, oy)) continue;
        // 挪过去的路上不能有东西挡着
        let clear = true;
        for (let k = 1; k <= d && clear; k++) clear = !this.rectBlocked(b.x + (horiz ? 0 : s * k), b.y + (horiz ? s * k : 0), b.width, b.height);
        if (clear) return horiz ? { x: 0, y: s } : { x: s, y: 0 };
      }
    }
    return { x, y };
  }

  /** 左上角 (x, y)、宽 w 高 h 的框（单位像素）有没有碰到挡路的格子 */
  private rectBlocked(x: number, y: number, w: number, h: number) {
    const s = SETTINGS.tileSize;
    const x0 = Math.floor(x / s), x1 = Math.floor((x + w - 0.01) / s);
    const y0 = Math.floor(y / s), y1 = Math.floor((y + h - 0.01) / s);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.isSolid({ x: tx, y: ty })) return true;
    return false;
  }

  /** 脚底中间的位置 */
  private feetPos() {
    return { x: this.feet.x, y: this.feet.y + FEET_H / 2 };
  }

  private setFeet(x: number, y: number) {
    this.feet.setPosition(x, y - FEET_H / 2);
    this.feetBody().reset(x, y - FEET_H / 2);
  }

  /** 每帧：图片和影子跟着脚走；走路时（没有走路动画图的话）上下颠 1 像素 */
  private syncSprite() {
    const { x, y } = this.feetPos();
    const px = Math.round(x);
    const py = Math.round(y);
    let bob = 0;
    if (this.moving && !this.hasWalkSheet) {
      const step = Math.floor((this.time.now / 1000) * SETTINGS.walkBobPerSecond * 2);
      bob = step % 2 === 0 ? -SETTINGS.walkBobPixels : 0;
    }
    this.sprite.setPosition(px, py + bob).setDepth(py);
    this.shadow.setPosition(px, py - 1);
  }

  private showStanding() {
    if (this.hasWalkSheet) {
      this.sprite.anims.stop();
      this.sprite.setTexture('player_walk', DIR_FRAME[this.facing] * WALK_SHEET.framesPerDir);
    } else {
      this.sprite.setTexture('player_stand', DIR_FRAME[this.facing]);
    }
  }

  /** 如果有 player_walk.png（每个方向 5 格：站立 + 走 4 格），就做成走路动画 */
  private setupWalkAnims() {
    this.hasWalkSheet = this.textures.exists('player_walk');
    if (!this.hasWalkSheet) return;
    WALK_SHEET.dirs.forEach((dir, row) => {
      const key = `walk-${dir}`;
      if (this.anims.exists(key)) return;
      const first = row * WALK_SHEET.framesPerDir + 1;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('player_walk', { start: first, end: first + 3 }),
        frameRate: SETTINGS.walkFrameRate,
        repeat: -1,
      });
    });
  }

  /** 用工具时，把工具图标在人物面前挥一下（原型期代替动作图） */
  private swingTool(tool: string) {
    const key = `icon_${tool}`;
    if (!this.textures.exists(key)) return;
    const { x, y } = this.feetPos();
    // 每个朝向：图标放哪、从什么角度挥到什么角度、在人物前面还是后面
    const poses: Record<Facing, { dx: number; dy: number; from: number; to: number; front: boolean; flip: boolean }> = {
      down: { dx: 4, dy: -8, from: -60, to: 50, front: true, flip: false },
      up: { dx: -4, dy: -22, from: 60, to: -50, front: false, flip: true },
      left: { dx: -6, dy: -12, from: 60, to: -50, front: true, flip: true },
      right: { dx: 6, dy: -12, from: -60, to: 50, front: true, flip: false },
    };
    const p = poses[this.facing];
    const icon = this.add
      .image(Math.round(x + p.dx), Math.round(y + p.dy), key)
      .setOrigin(p.flip ? 0.8 : 0.2, 0.8)
      .setFlipX(p.flip)
      .setAngle(p.from)
      .setDepth(y + (p.front ? 1 : -1));
    this.tweens.add({
      targets: icon,
      angle: p.to,
      duration: SETTINGS.toolSwingMs,
      ease: 'Quad.easeOut',
      onComplete: () => icon.destroy(),
    });
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

  /** 空格：用手上的东西对着面前那一格（规则在 src/world/actions.ts） */
  private useToolFacing() {
    const held = heldItem();
    if (!held) return this.say('msg.noTool');
    const cell = this.facingCell();
    const rule = this.heldRule(cell);
    if (!rule) return this.say('msg.cantUseTool', { tool: this.itemName(held) });
    this.doHeld(rule, cell);
  }

  /** 手机「使用」键：手上的东西对面前那一格有用就直接用，没用就「交互」（多件事才弹菜单） */
  private smartFacing() {
    const cell = this.facingCell();
    const rule = this.heldRule(cell);
    if (rule) return this.doHeld(rule, cell);
    this.runOptions(this.optionsFor(cell, { tools: false, walk: false }), cell);
  }

  /** 点了屏幕上某个位置（鼠标或手指） */
  private tapScreen(sx: number, sy: number) {
    // 点的位置是界面坐标：先换成画布坐标，再换成地图坐标
    const p = this.cameras.main.getWorldPoint(sx * VIEW.ui, sy * VIEW.ui);
    const s = SETTINGS.tileSize;
    const cell = { x: Math.floor(p.x / s), y: Math.floor(p.y / s) };
    if (!this.grid[cell.y]?.[cell.x]) return;
    // 手上的东西对这一格有用：走过去直接做，不弹菜单
    const rule = this.heldRule(cell);
    if (rule) return this.walkNextTo(cell, () => this.heldRule(cell) === rule && this.doHeld(rule, cell));
    this.runOptions(this.optionsFor(cell, { tools: false, walk: true }), cell, true);
  }

  /** 这一格的作物现在什么样（没种东西 = none） */
  private cropStateAt(cell: Cell): CropState {
    const c = gameState.crops[cellKey(cell)];
    if (!c) return 'none';
    if (c.dead) return 'dead';
    return isRipe(c) ? 'ripe' : 'growing';
  }

  /** 手上拿的东西能对这一格做什么（规则表在 src/world/actions.ts；没有返回 undefined） */
  private heldRule(cell: Cell) {
    const id = heldItem();
    return heldActionFor(id, id ? itemInfo(id)?.type : undefined, this.kindAt(cell), this.cropStateAt(cell));
  }

  private doHeld(rule: HeldAction, cell: Cell) {
    if (rule.id === 'sow') return this.doSow(cell);
    this.doToolAction(rule, cell);
  }

  // =================================================================
  //  「能做什么」和「去做」
  // =================================================================

  /** 列出对这一格能做的事 */
  private optionsFor(cell: Cell, opts: { tools: boolean; walk: boolean }): (MenuOption & { needReach: boolean })[] {
    const kind = this.kindAt(cell);
    const list: (MenuOption & { needReach: boolean })[] = [];
    if (this.zhou && this.zhou.cell.x === cell.x && this.zhou.cell.y === cell.y) {
      return [{ label: t('action.talk'), run: () => this.talkToZhou(), needReach: true }];
    }
    const key = cellKey(cell);
    const crop = gameState.crops[key];
    if (crop) {
      const name = localName(cropInfo(crop.crop).name);
      if (isRipe(crop)) list.push({ label: t('action.harvest', { name }), run: () => this.doHarvest(cell), needReach: true });
      if (crop.dead) list.push({ label: t('action.clearDead'), run: () => this.clearCrop(cell), needReach: true });
      list.push({ label: t('action.look'), run: () => this.say(this.cropHint(crop), { name }), needReach: true });
    } else if ((kind === 'tilled' || kind === 'watered') && !opts.walk) {
      // 锄好的空地：告诉玩家拿着种子就能种（点屏幕时不加，免得每次点田都弹菜单）
      list.push({ label: t('action.look'), run: () => this.say('hint.sowHow'), needReach: true });
    }
    if (kind === 'basket') {
      list.push({ label: t('action.basketPut'), run: () => this.basketMenu(), needReach: true });
      if (Object.keys(gameState.basket).length) list.push({ label: t('action.basketTake'), run: () => this.basketTake(), needReach: true });
    }
    if (kind === 'site' || kind === 'house' || kind === 'ruinHouse') {
      list.push({ label: t('action.houseStatus'), run: () => this.sayHouseStatus(), needReach: false });
    }
    if (kind === 'hut') list.push({ label: t('action.chest'), run: () => this.chestMenu(), needReach: true });
    for (const plain of PLAIN_ACTIONS) {
      // 草棚改成柴房以后不能睡、不能存档（去老宅）
      if (kind === 'hut' && gameState.hutIsShed) continue;
      if (plain.on.includes(kind)) {
        list.push({ label: t(`action.${plain.id}`), run: () => this.doPlainAction(plain.id), needReach: true });
      }
    }
    const isGround = GROUND_KINDS.includes(kind);
    if (!isGround) {
      const hint = kind === 'hut' && gameState.hutIsShed ? 'hint.shed' : (TILE_TYPES[this.grid[cell.y][cell.x]]?.hint ?? 'hint.nothing');
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

  private doToolAction(rule: HeldAction, cell: Cell) {
    if (rule.item) this.swingTool(rule.item);
    if (rule.turnsInto) this.setTile(cell, rule.turnsInto);
    if (rule.doneHint) this.say(rule.doneHint);
    if (rule.id === 'clearRuin') this.afterRuinCleared();
    this.spendStamina((timeData.stamina.costs as Record<string, number>)[rule.cost] ?? 0);
  }

  // =================================================================
  //  种菜（规则在 src/systems/farming/crops.ts）
  // =================================================================

  /** 用手上的种子种这一格 */
  private doSow(cell: Cell) {
    const seed = heldItem();
    const crop = seed ? cropFromSeed(seed) : undefined;
    if (!seed || !crop) return;
    if (!inSowWindow(crop, gameState.clock!)) {
      const term = timeData.calendar.solarTerms.find((s) => s.id === nextSowTerm(crop, gameState.clock!))!;
      return this.say('msg.notSowTime', { name: localName(crop.name), term: localName(term.name) });
    }
    plant(cellKey(cell), crop);
    // 用掉手上这格的一粒（用完这一格就空了）
    takeFromSlot(gameState.selected, 1);
    this.refreshCrop(cellKey(cell));
    this.spendStamina(timeData.stamina.costs.plant);
  }

  private doHarvest(cell: Cell) {
    // 背包放不下：菜留在地里
    const info = cropInfo(gameState.crops[cellKey(cell)].crop);
    if (roomFor(info.harvestItem) < info.yield + (info.extraYield?.amount ?? 0)) return this.say('msg.bagFull');
    const got = harvest(cellKey(cell));
    this.refreshCrop(cellKey(cell));
    if (!got) return;
    addItem(got.item, got.amount);
    this.say('msg.harvested', { name: this.itemName(got.item), n: got.amount });
    this.spendStamina(timeData.stamina.costs.harvest);
  }

  private clearCrop(cell: Cell) {
    delete gameState.crops[cellKey(cell)];
    this.refreshCrop(cellKey(cell));
  }

  private cropHint(c: (typeof gameState.crops)[string]) {
    if (c.dead) return 'hint.cropDead';
    if (c.dormant) return 'hint.cropDormant';
    if (isRipe(c)) return 'hint.cropRipe';
    return 'hint.cropGrowing';
  }

  /** 按作物现在的样子重画这一格（没有作物就拿掉图） */
  private refreshCrop(key: string) {
    const p = gameState.crops[key];
    const old = this.cropViews.get(key);
    if (!p) {
      old?.destroy();
      this.cropViews.delete(key);
      return;
    }
    const [x, y] = key.split(',').map(Number);
    const s = SETTINGS.tileSize;
    const tex = `crop_${p.crop}`;
    const frame = CROP_LOOKS.indexOf(cropLook(p));
    const img = old ?? this.add.image(x * s + s / 2, (y + 1) * s, tex, frame).setOrigin(0.5, 1).setDepth((y + 1) * s - 1);
    img.setTexture(tex, frame).setAlpha(p.dormant ? 0.6 : 1);
    this.cropViews.set(key, img);
  }

  // =================================================================
  //  重建老宅（规则在 src/systems/home/house.ts）
  // =================================================================

  private afterRuinCleared() {
    const done = ruinCleared();
    if (!done) return;
    this.say('house.ruinsCleared');
    if (done.page) this.sayDiary(done.page);
  }

  private sayDiary(page: { where: string; readable: boolean }) {
    this.say(page.readable ? 'diary.foundReadable' : 'diary.foundPaper', { where: t(page.where) });
  }

  private sayHouseStatus() {
    const b = gameState.build;
    if (b) return this.say('house.building', { name: localName(stageInfo(b.stage)!.name), days: b.daysLeft });
    if (gameState.houseStage < 1) return this.say('house.statusRuins', { left: Object.values(this.grid).flat().filter((c) => c === 'R').length });
    const next = stageInfo(gameState.houseStage + 1);
    if (!next) return this.say('house.allDone');
    const mats = Object.entries(next.materials).map(([id, n]) => `${this.itemName(id)}×${n}`).join('、');
    this.say('house.statusNext', { name: localName(next.name), mats, cost: next.cost });
  }

  /**
   * 按修房阶段画老宅：
   *  - 第 0、1 阶段：宅基地上立着烧毁的老宅（house_old_ruin），四周是一格格的废墟；
   *  - 第 2 阶段起：换成新房子，并且搬进去住（醒来在老宅门口）。
   */
  private refreshHouse() {
    const s = SETTINGS.tileSize;
    const { house, door } = HOUSE_SITE;
    const cx = (house.x + house.w / 2) * s;
    const bottom = (house.y + house.h) * s;
    if (gameState.houseStage < 2) {
      if (this.grid[house.y]?.[house.x] !== 'Q') return;
      this.houseImage?.destroy();
      this.houseImage = this.add.image(cx, bottom, 'house_old_ruin', 0).setOrigin(0.5, 1).setDepth(bottom);
      return;
    }
    for (let y = house.y; y < house.y + house.h; y++) {
      for (let x = house.x; x < house.x + house.w; x++) if (this.grid[y][x] !== 'K') this.setTile({ x, y }, 'K');
    }
    if (this.grid[door.y][door.x] !== 'E') this.setTile(door, 'E');
    this.doorTile = { ...door };
    const key = `house_${stageInfo(gameState.houseStage)!.id}`;
    this.houseImage?.destroy();
    this.houseImage = this.add.image(cx, bottom, key, 0).setOrigin(0.5, 1).setDepth(bottom);
    if (this.houseLight) this.lightSpots = this.lightSpots.filter((l) => l !== this.houseLight);
    this.houseLight = { x: cx + this.houseImage.width / 2 - 14, y: bottom - this.houseImage.height * 0.45, radius: 22 };
    this.lightSpots.push(this.houseLight);
  }

  // =================================================================
  //  收货筐（规则在 src/systems/economy/pickup.ts）
  // =================================================================

  private placeBasket() {
    if (this.grid[BASKET_CELL.y][BASKET_CELL.x] !== 'B') this.setTile(BASKET_CELL, 'B');
  }

  /**
   * 先选一样东西，再选几个（数量框），然后 move(id, n) 真正去放 / 拿。
   * from = 从哪里选（物品 id → 有几个）
   */
  private pickItemAndCount(from: Record<string, number>, ids: string[], menuTitle: string, askKey: string, move: (id: string, n: number) => void) {
    const options: MenuOption[] = ids.map((id) => ({
      label: `${this.itemName(id)} ×${from[id]}`,
      run: () => {
        const max = from[id] ?? 0;
        if (max <= 0) return;
        this.game.events.emit(UI_EVENTS.askQuantity, t(askKey, { name: this.itemName(id) }), max, (n: number | null) => n && move(id, n));
      },
    }));
    this.game.events.emit(UI_EVENTS.showMenu, options, menuTitle);
  }

  /** 往收货筐里放：选东西、选数量 */
  private basketMenu() {
    const have = sellableInBag();
    const ids = Object.keys(have);
    // 什么都没有能卖的：要是只是因为上了锁，就说清楚
    const locked = Object.keys(inventoryCounts()).some((id) => basketPrice(id) != null);
    if (!ids.length) return this.say(locked ? 'msg.lockedCantSell' : 'msg.nothingToSell');
    this.pickItemAndCount(have, ids, t('action.basketPut'), 'quantity.askBasket', (id, n) => {
      const k = putInBasket(id, n);
      this.say('msg.basketPut', { name: this.itemName(id), n: k });
    });
  }

  /** 从收货筐里拿回来（还没结算的当天都能拿） */
  private basketTake() {
    this.pickItemAndCount(gameState.basket, Object.keys(gameState.basket), t('action.basketTake'), 'quantity.askTake', (id, n) => {
      const k = takeFromBasket(id, n);
      if (k < n) this.say('msg.bagFull');
      if (k > 0) this.say('msg.taken', { name: this.itemName(id), n: k });
    });
  }

  // =================================================================
  //  草棚（柴房）里的箱子（规则在 src/systems/home/storage.ts）
  // =================================================================

  private chestMenu() {
    const options: MenuOption[] = [
      { label: t('action.chestPut'), run: () => this.chestPut() },
      { label: t('action.chestTake'), run: () => this.chestTake(), disabled: !Object.keys(gameState.storage).length },
    ];
    const used = Object.keys(gameState.storage).length;
    this.game.events.emit(UI_EVENTS.showMenu, options, t('msg.chestTitle', { used, slots: CHEST_SLOTS }));
  }

  private chestPut() {
    const have = storableInBag();
    const ids = Object.keys(have);
    if (!ids.length) return this.say('msg.nothingToStore');
    this.pickItemAndCount(have, ids, t('action.chestPut'), 'quantity.askChest', (id, n) => {
      const k = putInChest(id, n);
      if (k < 0) return this.say('msg.chestFull', { slots: CHEST_SLOTS });
      this.say('msg.chestPut', { name: this.itemName(id), n: k });
    });
  }

  private chestTake() {
    this.pickItemAndCount(gameState.storage, Object.keys(gameState.storage), t('action.chestTake'), 'quantity.askTake', (id, n) => {
      const k = takeFromChest(id, n);
      if (k < n) this.say('msg.bagFull');
      if (k > 0) this.say('msg.taken', { name: this.itemName(id), n: k });
    });
  }

  // =================================================================
  //  测试用（M 菜单）
  // =================================================================

  /** 直接过 n 天（每天都按睡了一觉算：作物生长、木匠干活、收货筐结算） */
  private debugDays(n: number) {
    const news: News[] = [];
    for (let i = 0; i < n; i++) news.push(...this.startNewDay(1));
    this.say('msg.debugDays', { n, date: gameState.clock!.dateText() });
    for (const [k, p] of news) this.say(k, p);
  }

  /** 给够材料和钱，然后请木匠修下一阶段 */
  private debugBuild() {
    const next = stageInfo(gameState.houseStage + 1);
    if (next?.byCarpenter && !gameState.build) {
      for (const [id, n] of Object.entries(next.materials)) addItem(id, Math.max(0, (n ?? 0) - countItem(id)));
      gameState.cash = Math.max(gameState.cash, next.cost);
    }
    const err = requestBuild();
    if (err) return this.say(err, { days: gameState.build?.daysLeft ?? 0 });
    this.say('house.started', { name: localName(next!.name), days: HOUSING.buildDays });
  }

  private doPlainAction(id: string) {
    if (id === 'sleep') this.sleep();
    if (id === 'saveOnly') void this.saveNow('msg.saved');
  }

  // =================================================================
  //  存档
  // =================================================================

  /** 把现在的样子打包成存档 */
  private snapshot(): SaveData {
    return {
      ...stateFields(),
      player: { x: Math.round(this.feetPos().x), y: Math.round(this.feetPos().y), facing: this.facing },
      farm: this.grid.map((row) => row.join('')),
    };
  }

  /** 存进当前存档位，然后显示一句话 */
  private async saveNow(msgKey: string) {
    try {
      await saveToSlot(this.snapshot());
      await clearTemp(); // 正式存过了，临时进度就不需要了
      this.say(msgKey, { slot: gameState.slot });
    } catch {
      this.say('msg.saveFailed');
    }
  }

  // =================================================================
  //  一天结束：睡觉、昏倒
  // =================================================================

  private sleep() {
    const clock = gameState.clock!;
    // 半夜前睡觉体力全满，过了半夜只恢复一部分（time.ts 的 sleep）
    const ratio = clock.minutes < 24 * 60 ? timeData.sleep.beforeMidnightRestore : timeData.sleep.afterMidnightRestore;
    const news = this.startNewDay(ratio);
    void this.saveNow('msg.sleep').then(() => news.forEach(([k, p]) => this.say(k, p))); // 睡觉 = 自动存档
  }

  private spendStamina(cost: number) {
    gameState.stamina = Math.max(0, gameState.stamina - cost);
    if (gameState.stamina <= 0) this.faint('exhausted');
  }

  /** 昏倒：late = 熬到凌晨两点，exhausted = 体力用完（数值见 time.ts 的 faint） */
  private faint(reason: 'late' | 'exhausted') {
    let news: News[];
    if (reason === 'late') {
      news = this.startNewDay(timeData.faint.lateNight.nextDayStamina);
      this.say('msg.lateNightFaint');
    } else {
      const f = timeData.faint.exhausted;
      const fee = Math.min(f.fee, Math.floor(gameState.cash * f.feeMaxFractionOfCash));
      gameState.cash -= fee;
      news = this.startNewDay(f.nextDayStamina);
      this.say('msg.exhaustedFaint', { fee });
    }
    for (const [k, p] of news) this.say(k, p);
  }

  /** 进入新的一天。返回早上要告诉玩家的事（作物冻死、木匠修好了、收货筐结算……） */
  private startNewDay(staminaRatio: number): News[] {
    const news: News[] = [];
    const clock = gameState.clock!;
    clock.nextDay();
    // 作物：昨晚浇过水的长一天；霜降、冻土、休眠按节气算
    const grew = growOvernight(clock, (key) => {
      const [x, y] = key.split(',').map(Number);
      return this.grid[y]?.[x] === 'O';
    });
    if (grew.frostKilled) news.push(['msg.frost', { n: grew.frostKilled }]);
    if (grew.dormant) news.push(['msg.dormant']);
    if (grew.woke) news.push(['msg.woke']);
    for (const key of Object.keys(gameState.crops)) this.refreshCrop(key);
    // 木匠
    const built = buildOvernight();
    if (built) {
      news.push(['house.finished', { name: localName(stageInfo(built.stage)!.name) }]);
      if (stageInfo(built.stage)!.learns.length) news.push(['house.learned']);
      if (built.page) news.push([built.page.readable ? 'diary.foundReadable' : 'diary.foundPaper', { where: t(built.page.where) }]);
      gameState.maxStamina = Math.max(gameState.maxStamina, dwelling().maxStamina);
      this.refreshHouse();
      if (gameState.hutIsShed && !this.hutImage?.texture.key.includes('woodshed')) news.push(['house.hutToShed']);
      this.refreshHut();
    }
    // 收货筐
    const sold = settleBasket();
    if (sold > 0) news.push(['msg.basketSold', { total: sold }]);
    gameState.stamina = Math.round(gameState.maxStamina * staminaRatio);
    // 浇过的水第二天就干了
    this.grid.forEach((row, y) => row.forEach((ch, x) => ch === 'O' && this.setTile({ x, y }, 'o')));
    this.route = [];
    this.onArrive = undefined;
    const door = this.cellFeet(this.doorTile);
    this.setFeet(door.x, door.y);
    this.facing = 'down';
    this.showStanding();
    return news;
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
  private followRoute(step = 0): { x: number; y: number } {
    const next = this.cellFeet(this.route[0]);
    const here = this.feetPos();
    const dx = next.x - here.x;
    const dy = next.y - here.y;
    if (Math.hypot(dx, dy) < Math.max(1.5, step)) {
      this.setFeet(next.x, next.y);
      this.route.shift();
      if (!this.route.length) {
        const done = this.onArrive;
        this.onArrive = undefined;
        done?.();
        return { x: 0, y: 0 };
      }
      return this.followRoute(step);
    }
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  }

  // =================================================================
  //  地图小工具
  // =================================================================

  /** 站在某一格时，脚底应该在哪（格子正中偏下） */
  private cellFeet(c: Cell) {
    const s = SETTINGS.tileSize;
    return { x: c.x * s + s / 2, y: c.y * s + s - 4 };
  }

  /** 主角站在哪一格（按脚的位置算） */
  private playerCell(): Cell {
    const s = SETTINGS.tileSize;
    const { x, y } = this.feetPos();
    return { x: Math.floor(x / s), y: Math.floor((y - 3) / s) };
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
    this.showStanding();
  }

  private kindAt(c: Cell) {
    const ch = this.grid[c.y]?.[c.x];
    return ch ? (TILE_TYPES[ch]?.kind ?? 'grass') : 'none';
  }

  private isSolid(c: Cell) {
    if (this.zhou && this.zhou.cell.x === c.x && this.zhou.cell.y === c.y) return true;
    const ch = this.grid[c.y]?.[c.x];
    return ch === undefined || (TILE_TYPES[ch]?.solid ?? false);
  }

  private isWalkable(c: Cell) {
    return !this.isSolid(c);
  }

  /** 水面：每隔 SETTINGS.waterShimmerMs 在「平静」「波光」两格之间换一次 */
  private startWaterShimmer() {
    const water = GROUND_TILES.water;
    const frames = [frameIndex(water.texture, 'water'), frameIndex(water.texture, 'water_shimmer')];
    if (frames[0] === frames[1]) return; // 水面图只有一格，就不换了
    let i = 0;
    this.time.addEvent({
      delay: SETTINGS.waterShimmerMs,
      loop: true,
      callback: () => {
        i = 1 - i;
        this.views.flat().forEach((v) => {
          if (v.ground.texture.key === water.texture) v.ground.setFrame(frames[i]);
        });
      },
    });
  }

  /** 把一格改成别的字符（比如草地 → 田），并重画 */
  private setTile(c: Cell, ch: string) {
    this.grid[c.y][c.x] = ch;
    this.refreshTile(c.x, c.y);
  }

  /** 按地图字符重画一格：地面 + 上面的东西 + 碰撞块 + 灯光 */
  private refreshTile(tx: number, ty: number) {
    const s = SETTINGS.tileSize;
    const ch = this.grid[ty][tx];
    const view = this.views[ty][tx];
    const info = TILE_TYPES[ch] ?? TILE_TYPES['.'];
    const ground = GROUND_TILES[info.ground] ?? GROUND_TILES.grass;
    view.ground.setPosition(tx * s, ty * s).setTexture(ground.texture, frameIndex(ground.texture, ground.frame));

    // 树、石头这些东西：脚底对齐格子底边，按 y 排前后（下面的挡住上面的）
    if (view.object) this.lightSpots = this.lightSpots.filter((l) => l.fire !== view.object);
    view.object?.destroy();
    view.object = undefined;
    if (info.object) {
      const bottom = (ty + 1) * s;
      view.object = this.add.image(tx * s + s / 2, bottom, info.object, 0).setOrigin(0.5, 1).setDepth(bottom);
      if (info.light) {
        this.lightSpots.push({ x: tx * s + s / 2, y: bottom - 22, radius: 30, fire: info.fire ? view.object : undefined });
      }
    }

    if (info.solid && !view.body) {
      view.body = this.solids.create(tx * s + s / 2, ty * s + s / 2, undefined) as Phaser.Physics.Arcade.Sprite;
      view.body.setVisible(false).setDisplaySize(s, s).refreshBody(); // 先设显示大小再 refreshBody：碰撞块正好一格（以前写 setSize 被 refreshBody 冲掉，碰撞块变成 32×32，把窄路都堵上了）
    } else if (!info.solid && view.body) {
      view.body.destroy();
      view.body = undefined;
    }
  }

  private itemName(id: string) {
    return localName(itemsData.items.find((it) => it.id === id)?.name);
  }

  // =================================================================
  //  序章：周里正
  // =================================================================

  /** 把周里正放在某一格，头上有个「！」提示过去说话（序章唯一一处明确的引导） */
  private placeZhou(cell: Cell) {
    const s = SETTINGS.tileSize;
    const feet = this.cellFeet(cell);
    const sprite = this.add.sprite(feet.x, feet.y, 'npc_zhou_stand', DIR_FRAME.left).setOrigin(0.5, 1).setDepth(feet.y);
    const g = this.add.graphics();
    g.fillStyle(toColor(PALETTE.outline)).fillRect(-4, -6, 9, 12);
    g.fillStyle(toColor(PALETTE.candle)).fillRect(-3, -5, 7, 10);
    g.fillStyle(toColor(PALETTE.outline)).fillRect(-1, -4, 3, 5).fillRect(-1, 2, 3, 2);
    const marker = this.add.container(feet.x, feet.y - 40, [g]).setDepth(10000);
    this.tweens.add({ targets: marker, y: feet.y - 43, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const body = this.solids.create(cell.x * s + s / 2, cell.y * s + s / 2, undefined) as Phaser.Physics.Arcade.Sprite;
    body.setVisible(false).setDisplaySize(s, s).refreshBody();
    this.zhou = { cell, sprite, marker, body };
  }

  private talkToZhou() {
    const zhou = this.zhou;
    if (!zhou) return;
    // 周里正转过来看着你
    const here = this.playerCell();
    const dx = here.x - zhou.cell.x;
    const dy = here.y - zhou.cell.y;
    zhou.sprite.setFrame(DIR_FRAME[Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up']);
    const first = gameState.prologue === 'tutorial';
    this.game.events.emit(UI_EVENTS.playDialogue, first ? 'tutorial' : 'zhou_idle', () => {
      if (!first) return;
      gameState.prologue = 'done';
      zhou.marker.destroy();
      // 说完就回镇上了
      this.tweens.add({
        targets: zhou.sprite,
        alpha: 0,
        duration: 800,
        onComplete: () => {
          zhou.sprite.destroy();
          zhou.body.destroy();
          this.zhou = undefined;
        },
      });
    });
  }

  private say(key: string, params?: Record<string, string | number>) {
    this.game.events.emit(UI_EVENTS.say, key, params);
  }

  /** 在连在一起的 H 上放一座草棚（图片底边对齐 H 的底边，屋顶可以伸出去）。窗户夜里会亮。 */
  private placeHut(tiles: Cell[]) {
    const s = SETTINGS.tileSize;
    const minX = Math.min(...tiles.map((t) => t.x));
    const maxX = Math.max(...tiles.map((t) => t.x));
    const maxY = Math.max(...tiles.map((t) => t.y));
    const cx = ((minX + maxX + 1) / 2) * s;
    const bottom = (maxY + 1) * s;
    this.hutImage = this.add.image(cx, bottom, 'house_straw_hut', 0).setOrigin(0.5, 1).setDepth(bottom);
    this.hutLight = { x: cx + this.hutImage.width / 2 - 11, y: bottom - this.hutImage.height * 0.45, radius: 20 };
    this.refreshHut();
  }

  /** 草棚改成柴房：换图，窗户不再亮灯 */
  private refreshHut() {
    if (!this.hutImage || !this.hutLight) return;
    this.hutImage.setTexture(gameState.hutIsShed ? 'house_woodshed' : 'house_straw_hut', 0);
    this.lightSpots = this.lightSpots.filter((l) => l !== this.hutLight);
    if (!gameState.hutIsShed) this.lightSpots.push(this.hutLight);
  }
}

/** 作物、收货筐按「x,y」记格子 */
function cellKey(c: Cell) {
  return `${c.x},${c.y}`;
}

/** 农场场景另外听的消息（M 菜单的测试选项、开通收货服务） */
export const FARM_EVENTS = {
  /** 直接过几天。参数：天数 */
  debugDays: 'farm:debugDays',
  /** 给够材料，请木匠修下一阶段 */
  debugBuild: 'farm:debugBuild',
  /** 收货服务开通了：门口放上收货筐 */
  basketUnlocked: 'farm:basketUnlocked',
} as const;
