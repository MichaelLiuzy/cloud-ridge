/**
 * 启动场景：在没有正式美术之前，用代码画出占位的地块和小人图片。
 * 等美术素材到了，这里会改成加载图片文件（放在 public/assets/ 里）。
 * 颜色在 src/config/settings.ts 的 colors 里改。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const s = SETTINGS.tileSize;
    const c = SETTINGS.colors;
    const g = this.add.graphics();

    /** 画一张图并存起来，名字叫 key */
    const bake = (key: string, w: number, h: number, draw: () => void) => {
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };

    // ---- 地面 ----
    bake('grass', s, s, () => {
      g.fillStyle(c.grass).fillRect(0, 0, s, s);
      g.fillStyle(c.grassDark).fillRect(s * 0.2, s * 0.3, 2, 4).fillRect(s * 0.7, s * 0.65, 2, 4);
    });
    bake('grassDark', s, s, () => {
      g.fillStyle(c.grassDark).fillRect(0, 0, s, s);
      g.fillStyle(c.grass).fillRect(s * 0.3, s * 0.5, 2, 3);
    });
    bake('path', s, s, () => {
      g.fillStyle(c.path).fillRect(0, 0, s, s);
      g.fillStyle(0x000000, 0.08).fillRect(s * 0.25, s * 0.6, 3, 2).fillRect(s * 0.7, s * 0.2, 2, 2);
    });
    bake('tilled', s, s, () => {
      g.fillStyle(c.tilled).fillRect(0, 0, s, s);
      g.fillStyle(0x000000, 0.18);
      for (let y = 4; y < s; y += 8) g.fillRect(2, y, s - 4, 2);
    });
    bake('watered', s, s, () => {
      g.fillStyle(c.watered).fillRect(0, 0, s, s);
      g.fillStyle(0x000000, 0.2);
      for (let y = 4; y < s; y += 8) g.fillRect(2, y, s - 4, 2);
    });
    bake('water', s, s, () => {
      g.fillStyle(c.water).fillRect(0, 0, s, s);
      g.fillStyle(0xffffff, 0.25).fillRect(s * 0.2, s * 0.35, s * 0.3, 2).fillRect(s * 0.55, s * 0.7, s * 0.25, 2);
    });

    // ---- 地上的东西（画在草地上面）----
    bake('tree', s, s, () => {
      g.fillStyle(c.treeTrunk).fillRect(s * 0.42, s * 0.6, s * 0.16, s * 0.4);
      g.fillStyle(c.tree).fillCircle(s / 2, s * 0.42, s * 0.42);
    });
    bake('rock', s, s, () => {
      g.fillStyle(c.rock).fillEllipse(s / 2, s * 0.6, s * 0.7, s * 0.5);
      g.fillStyle(0xffffff, 0.2).fillEllipse(s * 0.4, s * 0.5, s * 0.25, s * 0.12);
    });
    bake('weed', s, s, () => {
      g.fillStyle(c.weed);
      g.fillTriangle(s * 0.2, s * 0.85, s * 0.3, s * 0.3, s * 0.4, s * 0.85);
      g.fillTriangle(s * 0.4, s * 0.85, s * 0.5, s * 0.2, s * 0.6, s * 0.85);
      g.fillTriangle(s * 0.6, s * 0.85, s * 0.72, s * 0.35, s * 0.8, s * 0.85);
    });
    bake('stump', s, s, () => {
      g.fillStyle(c.stump).fillRect(s * 0.25, s * 0.45, s * 0.5, s * 0.4);
      g.fillStyle(0xc8a070).fillEllipse(s / 2, s * 0.45, s * 0.5, s * 0.2);
    });
    bake('fireDebris', s, s, () => {
      g.fillStyle(c.fireDebris).fillRect(s * 0.1, s * 0.55, s * 0.8, s * 0.12);
      g.fillStyle(0x221c1a).fillRect(s * 0.3, s * 0.35, s * 0.12, s * 0.5);
      g.fillStyle(0x6a3a2a).fillRect(s * 0.55, s * 0.45, s * 0.25, s * 0.15);
    });
    bake('fence', s, s, () => {
      g.fillStyle(c.fence).fillRect(s * 0.42, s * 0.15, s * 0.16, s * 0.8);
      g.fillRect(0, s * 0.35, s, s * 0.1).fillRect(0, s * 0.62, s, s * 0.1);
    });

    // ---- 主角：四个朝向各一张 ----
    const drawPlayer = (facing: 'down' | 'up' | 'left' | 'right') => {
      g.fillStyle(0x000000, 0.2).fillEllipse(s / 2, s * 0.92, s * 0.55, s * 0.16); // 影子
      g.fillStyle(c.playerBody).fillRoundedRect(s * 0.28, s * 0.45, s * 0.44, s * 0.45, 4); // 衣服
      g.fillStyle(c.playerSkin).fillCircle(s / 2, s * 0.32, s * 0.2); // 头
      g.fillStyle(c.playerHair);
      if (facing === 'up') g.fillCircle(s / 2, s * 0.3, s * 0.2);
      else g.fillRect(s * 0.3, s * 0.12, s * 0.4, s * 0.1); // 头发
      g.fillStyle(0x222222);
      if (facing === 'down') g.fillRect(s * 0.4, s * 0.32, 2, 3).fillRect(s * 0.57, s * 0.32, 2, 3);
      if (facing === 'left') g.fillRect(s * 0.36, s * 0.32, 2, 3);
      if (facing === 'right') g.fillRect(s * 0.62, s * 0.32, 2, 3);
    };
    for (const f of ['down', 'up', 'left', 'right'] as const) bake(`player-${f}`, s, s, () => drawPlayer(f));

    g.destroy();
    this.scene.start('Title');
  }
}
