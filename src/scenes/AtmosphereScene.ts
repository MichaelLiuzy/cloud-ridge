/**
 * 氛围场景：叠在农场上面、界面下面，负责
 *  - 昼夜色层：按游戏时间平滑变色（清晨暖米、白天不叠、傍晚橘、夜里冷蓝）；
 *  - 夜里在灯笼、窗户处挖出暖色光圈；
 *  - 回忆模式：农场画面去色 + 叠黛青，只有火光类（灯笼、烛台）保留颜色。
 * 颜色、时间点、浓淡都在 src/config/atmosphere.ts 里改。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { VIEW_EVENTS, setupWorldCamera } from '../config/view';
import { ATMOSPHERE } from '../config/atmosphere';
import { toColor } from '../config/palette';
import { gameState } from '../systems/GameState';
import type { FarmScene } from './FarmScene';

/** 光圈笔刷的半径（像素）。实际光圈按灯的半径缩放 */
const BRUSH_R = 32;

export class AtmosphereScene extends Phaser.Scene {
  private layer!: Phaser.GameObjects.RenderTexture;
  private brush!: Phaser.GameObjects.Image;
  private glows: Phaser.GameObjects.Image[] = [];
  private memoryTint!: Phaser.GameObjects.Rectangle;
  private fireCopies: Phaser.GameObjects.Image[] = [];
  private grayFx?: Phaser.FX.ColorMatrix;

  constructor() {
    super('Atmosphere');
  }

  create() {
    const { gameWidth: w, gameHeight: h } = SETTINGS;
    this.makeBrush();
    // 和地图一样放大（色层按 320×180 画）
    setupWorldCamera(this);
    const rezoom = () => setupWorldCamera(this);
    this.game.events.on(VIEW_EVENTS.changed, rezoom);
    this.events.once('shutdown', () => this.game.events.off(VIEW_EVENTS.changed, rezoom));
    this.layer = this.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(0);
    this.brush = this.make.image({ key: 'light-brush', add: false }).setOrigin(0.5);
    const mem = ATMOSPHERE.memory;
    this.memoryTint = this.add.rectangle(0, 0, w, h, toColor(mem.color), mem.alpha).setOrigin(0).setDepth(1).setVisible(false);
    this.glows = [];
    this.fireCopies = [];
    this.events.once('shutdown', () => this.setGray(false));
  }

  update() {
    const farm = this.scene.get('Farm') as unknown as FarmScene;
    const clock = gameState.clock;
    if (!clock || !farm?.cameras?.main) return;
    const cam = farm.cameras.main;
    const hour = clock.minutes / 60;
    const memory = gameState.memoryMode;

    // ---- 昼夜色层 + 光圈 ----
    const tint = sampleTint(hour);
    const light = memory ? 0 : sampleValue(ATMOSPHERE.lightLevel, hour);
    this.layer.clear();
    if (!memory && tint.alpha > 0) {
      this.layer.fill(tint.color, tint.alpha);
      if (light > 0) {
        for (const l of farm.lightSpots) {
          this.brush.setScale(l.radius / BRUSH_R).setAlpha(light);
          this.layer.erase(this.brush, Math.round(l.x - cam.worldView.x), Math.round(l.y - cam.worldView.y));
        }
      }
    }
    farm.lightSpots.forEach((l, i) => {
      const glow = (this.glows[i] ??= this.add
        .image(0, 0, 'light-brush')
        .setTint(toColor(ATMOSPHERE.light.color))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2));
      glow
        .setVisible(light > 0)
        .setPosition(Math.round(l.x - cam.worldView.x), Math.round(l.y - cam.worldView.y))
        .setScale(l.radius / BRUSH_R)
        .setAlpha(light * ATMOSPHERE.light.glowAlpha);
    });
    this.glows.slice(farm.lightSpots.length).forEach((g) => g.setVisible(false));

    // ---- 回忆模式 ----
    this.memoryTint.setVisible(memory);
    this.setGray(memory, cam);
    const fires = memory ? farm.lightSpots.filter((l) => l.fire?.active) : [];
    fires.forEach((l, i) => {
      const src = l.fire!;
      const copy = (this.fireCopies[i] ??= this.add.image(0, 0, src.texture.key).setDepth(3));
      copy
        .setTexture(src.texture.key, src.frame.name)
        .setOrigin(src.originX, src.originY)
        .setPosition(Math.round(src.x - cam.worldView.x), Math.round(src.y - cam.worldView.y))
        .setVisible(true);
    });
    this.fireCopies.slice(fires.length).forEach((c) => c.setVisible(false));
  }

  /** 农场镜头去色（只有 WebGL 才支持；老设备上就只叠黛青） */
  private setGray(on: boolean, cam?: Phaser.Cameras.Scene2D.Camera) {
    if (on && !this.grayFx && cam && this.renderer.type === Phaser.WEBGL) {
      this.grayFx = cam.postFX.addColorMatrix();
      this.grayFx.grayscale(1);
    } else if (!on && this.grayFx) {
      const farm = this.scene.get('Farm');
      farm?.cameras?.main?.postFX.clear();
      this.grayFx = undefined;
    }
  }

  /** 画一个一圈一圈的圆形笔刷（像素风光圈）：中间最实，往外变淡 */
  private makeBrush() {
    if (this.textures.exists('light-brush')) return;
    const g = this.add.graphics();
    const rings = ATMOSPHERE.light.rings;
    // 从外往里一圈圈叠：叠完后最外圈 1/3 实、中间 2/3 实、正中全实（以 3 圈为例）
    for (let i = 0; i < rings; i++) {
      const r = BRUSH_R * (1 - i / rings);
      const before = i / rings;
      const after = (i + 1) / rings;
      g.fillStyle(0xffffff, 1 - (1 - after) / (1 - before)).fillCircle(BRUSH_R, BRUSH_R, r);
    }
    g.generateTexture('light-brush', BRUSH_R * 2, BRUSH_R * 2);
    g.destroy();
  }
}

/** 某个时间点的叠色（在前后两个设定之间平滑过渡） */
function sampleTint(hour: number) {
  const keys = ATMOSPHERE.dayTint;
  const [a, b, f] = around(keys, hour);
  const ca = Phaser.Display.Color.HexStringToColor(a.color);
  const cb = Phaser.Display.Color.HexStringToColor(b.color);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, f * 100);
  return { color: Phaser.Display.Color.GetColor(c.r, c.g, c.b), alpha: a.alpha + (b.alpha - a.alpha) * f };
}

function sampleValue(keys: { hour: number; value: number }[], hour: number) {
  const [a, b, f] = around(keys, hour);
  return a.value + (b.value - a.value) * f;
}

/** 找到 hour 前后的两个设定，以及走到中间的几成（0~1） */
function around<T extends { hour: number }>(keys: T[], hour: number): [T, T, number] {
  if (hour <= keys[0].hour) return [keys[0], keys[0], 0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (hour <= b.hour) return [a, b, b.hour === a.hour ? 0 : (hour - a.hour) / (b.hour - a.hour)];
  }
  const last = keys[keys.length - 1];
  return [last, last, 0];
}
