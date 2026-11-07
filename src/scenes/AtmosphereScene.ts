/**
 * 氛围场景：叠在农场上面、界面下面，负责
 *  - 昼夜色层：按游戏时间平滑变色（清晨暖米、白天不叠、傍晚橘、夜里冷蓝）；
 *  - 夜里在灯笼、窗户处挖出暖色光圈；
 *  - 回忆模式：农场画面去色 + 叠黛青，只有火光类（灯笼、烛台）保留颜色；
 *  - 雨天稍暗 + 斜斜的雨丝，雪天稍亮 + 慢慢飘的雪花（数量、颜色在 src/config/settings.ts 的 weatherFx）。
 * 昼夜颜色、时间点、浓淡都在 src/config/atmosphere.ts 里改。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { followView, setupWorldCamera } from '../config/view';
import { ATMOSPHERE } from '../config/atmosphere';
import { toColor } from '../config/palette';
import { gameState } from '../systems/GameState';
import type { FarmScene } from './FarmScene';
import { isTouchDevice } from '../input/Controls';
import type { Weather } from '../data/types';

/** 光圈笔刷的半径（像素）。实际光圈按灯的半径缩放 */
const BRUSH_R = 32;

export class AtmosphereScene extends Phaser.Scene {
  private layer!: Phaser.GameObjects.RenderTexture;
  private brush!: Phaser.GameObjects.Image;
  private glows: Phaser.GameObjects.Image[] = [];
  private memoryTint!: Phaser.GameObjects.Rectangle;
  private fireCopies: Phaser.GameObjects.Image[] = [];
  private grayFx?: Phaser.FX.ColorMatrix;
  /** 雨雪：叠色和落下来的雨丝 / 雪花（现在显示的是哪种天气） */
  private weatherShade!: Phaser.GameObjects.Rectangle;
  private weatherFx?: Phaser.GameObjects.Particles.ParticleEmitter;
  private weatherNow: Weather | null = null;

  constructor() {
    super('Atmosphere');
  }

  create() {
    const { gameWidth: w, gameHeight: h } = SETTINGS;
    this.makeBrush();
    // 和地图一样放大（色层按 320×180 画）
    followView(this, () => setupWorldCamera(this));
    this.layer = this.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(0);
    this.brush = this.make.image({ key: 'light-brush', add: false }).setOrigin(0.5);
    const mem = ATMOSPHERE.memory;
    this.memoryTint = this.add.rectangle(0, 0, w, h, toColor(mem.color), mem.alpha).setOrigin(0).setDepth(1).setVisible(false);
    this.glows = [];
    this.fireCopies = [];
    this.weatherShade = this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0).setDepth(0.5);
    this.weatherFx = undefined;
    this.weatherNow = null;
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

    this.refreshWeather(memory ? null : gameState.weather);

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

  /** 天气变了才换：雨天 / 雪天放叠色和粒子，别的天气什么都不放 */
  private refreshWeather(weather: Weather | null) {
    const kind = weather === 'rain' || weather === 'snow' ? weather : null;
    if (kind === this.weatherNow) return;
    this.weatherNow = kind;
    this.weatherFx?.destroy();
    this.weatherFx = undefined;
    this.weatherShade.setFillStyle(0, 0);
    if (!kind) return;
    const fx = SETTINGS.weatherFx;
    const c = fx[kind];
    this.weatherShade.setFillStyle(toColor(c.shade), c.alpha);
    const { gameWidth: w, gameHeight: h } = SETTINGS;
    const perSecond = c.perSecond * (isTouchDevice() ? fx.touchFactor : 1);
    // 雨丝：顺着落下的方向斜着画；雪花：一个小方块
    const key = `weather-${kind}`;
    if (!this.textures.exists(key)) {
      const g = this.add.graphics().fillStyle(0xffffff);
      if (kind === 'rain') {
        const r = fx.rain;
        for (let i = 0; i < r.length; i++) g.fillRect(Math.round(((r.length - 1 - i) * -r.speedX) / r.speedY), i, 1, 1);
      } else g.fillRect(0, 0, fx.snow.size, fx.snow.size);
      g.generateTexture(key, kind === 'rain' ? Math.ceil((fx.rain.length * -fx.rain.speedX) / fx.rain.speedY) + 1 : fx.snow.size, kind === 'rain' ? fx.rain.length : fx.snow.size);
      g.destroy();
    }
    const sway = kind === 'snow' ? fx.snow.sway : 0;
    // 从画面上方一条线上随机落下；往左斜着落，所以线往右多放一截
    this.weatherFx = this.add
      .particles(0, -8, key, {
        x: { min: 0, max: w + Math.abs(c.speedX) * 2 },
        speedY: { min: c.speedY * 0.85, max: c.speedY * 1.15 },
        speedX: { min: c.speedX - sway, max: c.speedX + sway },
        lifespan: ((h + 16) / c.speedY) * 1000,
        frequency: 1000 / perSecond,
        tint: toColor(c.color),
        alpha: c.dropAlpha,
      })
      .setDepth(0.6);
    this.weatherFx.fastForward(((h + 16) / c.speedY) * 1000); // 一进来画面上就已经在下了
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
