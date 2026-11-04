/**
 * 农场场景：画地图、放主角、处理走路和碰撞、对着东西按「使用」。
 * 地图在 src/world/farmMap.ts 里画；走路速度在 src/config/settings.ts 里改。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { FARM_MAP, TILE_TYPES } from '../world/farmMap';
import { KeyboardControls } from '../input/Controls';
import { Clock } from '../systems/Clock';
import { gameState } from '../systems/GameState';
import { UI_EVENTS } from './HudScene';

type Facing = 'down' | 'up' | 'left' | 'right';

export class FarmScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private controls!: KeyboardControls;
  private facing: Facing = 'down';
  private spawn = { x: 0, y: 0 };
  private doorTile = { x: 0, y: 0 };

  constructor() {
    super('Farm');
  }

  create() {
    const s = SETTINGS.tileSize;
    const rows = FARM_MAP.length;
    const cols = Math.max(...FARM_MAP.map((r) => r.length));
    const solids = this.physics.add.staticGroup();

    // ---- 一格一格把地图画出来 ----
    const hutTiles: { x: number; y: number }[] = [];
    FARM_MAP.forEach((row, ty) => {
      [...row].forEach((ch, tx) => {
        const info = TILE_TYPES[ch] ?? TILE_TYPES['.'];
        const px = tx * s + s / 2;
        const py = ty * s + s / 2;
        const ground = ['path', 'tilled', 'water', 'grassDark'].includes(info.kind) ? info.kind : 'grass';
        this.add.image(px, py, ground);
        if (ch === 'P') this.spawn = { x: px, y: py };
        if (ch === 'D') this.doorTile = { x: tx, y: ty };
        if (info.kind === 'hut') hutTiles.push({ x: tx, y: ty });
        else if (!['grass', 'grassDark', 'path', 'tilled', 'water'].includes(info.kind)) {
          // 树、石头这些东西画在草地上面，按 y 排前后（下面的挡住上面的）
          this.add.image(px, py, info.kind).setDepth(py);
        }
        if (info.solid) {
          const block = solids.create(px, py, undefined) as Phaser.Physics.Arcade.Sprite;
          block.setVisible(false).setSize(s, s).refreshBody();
        }
      });
    });
    if (hutTiles.length) this.drawHut(hutTiles);

    // ---- 主角 ----
    this.player = this.physics.add.sprite(this.spawn.x, this.spawn.y, 'player-down');
    // 碰撞框只算脚下那一小块，这样走在树前面时头可以盖住树根，更自然
    this.player.body!.setSize(s * 0.5, s * 0.3).setOffset(s * 0.25, s * 0.65);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, solids);

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

    // ---- 操作 ----
    this.controls = new KeyboardControls(this);
    // 「使用」由界面场景先处理（对话框开着时先关对话框），没被拦下才轮到这里
    this.game.events.on(UI_EVENTS.interactWorld, this.interact, this);

    // ---- 时间 ----
    gameState.clock = new Clock();
    gameState.clock.onLateNight = () => this.faintLateNight();

    this.events.once('shutdown', () => {
      this.game.events.off(UI_EVENTS.interactWorld, this.interact, this);
      this.scale.off('resize', fitZoom);
    });
  }

  update(_time: number, delta: number) {
    const paused = gameState.uiBusy;
    if (gameState.clock) gameState.clock.paused = paused;
    gameState.clock?.update(delta);

    const { x, y } = paused ? { x: 0, y: 0 } : this.controls.moveVector();
    this.player.setVelocity(x * SETTINGS.playerSpeed, y * SETTINGS.playerSpeed);
    if (x !== 0 || y !== 0) {
      // 朝向：哪个方向推得多就面朝哪边
      this.facing = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
      this.player.setTexture(`player-${this.facing}`);
    }
    this.player.setDepth(this.player.y + 1);
  }

  /** 面前那一格是什么，就显示对应的说明 */
  private interact() {
    const s = SETTINGS.tileSize;
    const feetY = this.player.y + s * 0.3;
    let tx = Math.floor(this.player.x / s);
    let ty = Math.floor(feetY / s);
    if (this.facing === 'up') ty -= 1;
    if (this.facing === 'down') ty += 1;
    if (this.facing === 'left') tx -= 1;
    if (this.facing === 'right') tx += 1;
    const ch = FARM_MAP[ty]?.[tx];
    const info = ch ? TILE_TYPES[ch] : undefined;
    this.game.events.emit(UI_EVENTS.say, info ? info.hint : 'hint.nothing');
  }

  /** 凌晨两点到了：昏倒，第二天在草棚门口醒来（数值见 time.json 的 faint.lateNight） */
  private faintLateNight() {
    const clock = gameState.clock!;
    this.game.events.emit(UI_EVENTS.say, 'msg.lateNightFaint');
    clock.nextDay();
    const s = SETTINGS.tileSize;
    this.player.setPosition(this.doorTile.x * s + s / 2, this.doorTile.y * s + s / 2);
    this.facing = 'down';
    this.player.setTexture('player-down');
  }

  /** 把连在一起的 H 画成一座草棚（占位画法） */
  private drawHut(tiles: { x: number; y: number }[]) {
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
