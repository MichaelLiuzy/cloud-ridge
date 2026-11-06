/**
 * 启动场景：读美术素材。
 *  1. 读 public/assets/manifest.json（整理脚本 npm run art 生成的清单），把里面的图都读进来。
 *  2. src/config/assets.ts 里列的图，如果没有真图，就画一个同样大小的占位色块（颜色取调色板）。
 * 所以图没到也能玩；图到了（运行整理脚本后）会自动换上。
 */
import Phaser from 'phaser';
import { ASSETS, type AssetSpec } from '../config/assets';
import { PALETTE, toColor, type PaletteName } from '../config/palette';

/** manifest.json 的格式（由 tools/art.mjs 生成） */
interface ArtManifest {
  textures: Record<string, { file: string; frameWidth: number; frameHeight: number; frames: string[] }>;
}

/** 哪些图是占位色块（还没有真图）。剧情画面没图时要额外写一句说明 */
export const PLACEHOLDERS = new Set<string>();

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 清单可能不存在（还没有任何图），读不到也没关系
    this.load.json('art-manifest', 'assets/manifest.json');
  }

  create() {
    const manifest = this.cache.json.get('art-manifest') as ArtManifest | undefined;
    const textures = manifest?.textures ?? {};
    for (const [key, info] of Object.entries(textures)) {
      this.load.spritesheet(key, `assets/${info.file}`, { frameWidth: info.frameWidth, frameHeight: info.frameHeight });
    }
    this.load.once('complete', () => {
      this.makePlaceholders();
      this.scene.start('Title');
    });
    this.load.start();
  }

  /** 给缺图的素材画占位色块 */
  private makePlaceholders() {
    const g = this.add.graphics();
    for (const [key, spec] of Object.entries(ASSETS)) {
      if (this.textures.exists(key)) continue;
      PLACEHOLDERS.add(key);
      g.clear();
      spec.frames.forEach((_, i) => drawPlaceholder(g, spec, i, i * spec.w));
      g.generateTexture(key, spec.w * spec.frames.length, spec.h);
      // 切成一格一格（和真图的精灵表一样，按第几格取）
      const tex = this.textures.get(key);
      spec.frames.forEach((_, i) => tex.add(i, 0, i * spec.w, 0, spec.w, spec.h));
    }
    g.destroy();
  }
}

/** 画第 i 格占位图，左上角在 (ox, 0) */
function drawPlaceholder(g: Phaser.GameObjects.Graphics, spec: AssetSpec, i: number, ox: number) {
  const name: PaletteName = Array.isArray(spec.color) ? spec.color[i] ?? spec.color[0] : spec.color;
  const c = toColor(PALETTE[name]);
  const ink = toColor(PALETTE.outline);
  const { w, h } = spec;
  const rect = (x: number, y: number, rw: number, rh: number, color: number) => g.fillStyle(color).fillRect(ox + x, y, rw, rh);

  switch (spec.shape) {
    case 'full':
      rect(0, 0, w, h, c);
      break;
    case 'object':
      rect(2, h - 11, w - 4, 10, ink);
      rect(3, h - 10, w - 6, 8, c);
      break;
    case 'icon':
      rect(2, 2, w - 4, h - 4, ink);
      rect(3, 3, w - 6, h - 6, c);
      break;
    case 'tree':
      rect(6, h - 12, 4, 12, toColor(PALETTE.brown)); // 树干
      rect(1, 2, w - 2, h - 14, ink);
      rect(2, 3, w - 4, h - 16, c); // 树冠
      break;
    case 'lantern':
      rect(7, 8, 2, h - 8, toColor(PALETTE.brownDark)); // 杆子
      rect(3, 2, 10, 12, ink);
      rect(4, 3, 8, 10, c); // 灯笼
      rect(6, 5, 4, 6, toColor(PALETTE.candle)); // 里面的火
      break;
    case 'building': {
      const roofH = Math.round(h * 0.4);
      rect(3, roofH, w - 6, h - roofH, ink);
      rect(4, roofH, w - 8, h - roofH - 1, c); // 墙
      rect(0, 2, w, roofH, ink);
      rect(1, 3, w - 2, roofH - 2, toColor(PALETTE.ochre)); // 屋顶
      rect(w / 2 - 5, h - 14, 10, 14, toColor(PALETTE.brownDark)); // 门
      rect(w - 15, roofH + 6, 8, 6, toColor(PALETTE.ink)); // 窗
      break;
    }
    case 'crop': {
      // 0 种子：土里一个小点；1 幼苗；2 半大；3 成熟（带果实颜色）；4 枯萎（褐色）
      const leaf = toColor(PALETTE.leaf);
      const brown = toColor(PALETTE.brown);
      if (i === 0) rect(6, h - 6, 4, 3, brown);
      if (i === 1) rect(7, h - 8, 2, 6, leaf);
      if (i === 2) {
        rect(7, h - 12, 2, 10, leaf);
        rect(4, h - 10, 8, 3, leaf);
      }
      if (i === 3) {
        rect(7, h - 16, 2, 14, leaf);
        rect(3, h - 13, 10, 4, leaf);
        rect(4, h - 20, 8, 7, ink);
        rect(5, h - 19, 6, 5, c);
      }
      if (i === 4) {
        rect(7, h - 10, 2, 8, brown);
        rect(5, h - 6, 6, 2, brown);
      }
      break;
    }
    case 'cg':
      rect(0, 0, w, h, c);
      rect(0, h - 4, w, 4, ink);
      break;
    case 'portrait': {
      // 头像：脸 + 头发 + 身子，每格表情用嘴巴形状区分
      rect(0, 0, w, h, toColor(PALETTE.paperDark));
      rect(12, 44, 40, 20, c); // 衣服
      rect(18, 12, 28, 32, toColor(PALETTE.skin)); // 脸
      rect(16, 8, 32, 8, toColor(PALETTE.brownDark)); // 头发
      rect(24, 24, 4, 4, ink).fillRect(ox + 36, 24, 4, 4); // 眼睛
      const mouth = [[28, 35, 8, 2], [27, 34, 10, 3], [29, 36, 6, 1], [30, 34, 4, 5]][i] ?? [28, 35, 8, 2];
      rect(mouth[0], mouth[1], mouth[2], mouth[3], toColor(PALETTE.maroon));
      break;
    }
    case 'char': {
      // 身子 + 头；用一个深色小点表示朝向（下 左 右 上）
      const dir = ['down', 'left', 'right', 'up'][i] ?? 'down';
      rect(3, 12, 10, 20, ink);
      rect(4, 13, 8, 18, c);
      rect(3, 1, 10, 12, ink);
      rect(4, 2, 8, 10, toColor(dir === 'up' ? PALETTE.brownDark : PALETTE.skin));
      rect(4, 2, 8, 3, toColor(PALETTE.brownDark)); // 头发
      const eye = { down: [7, 7], left: [4, 7], right: [10, 7], up: [-1, -1] }[dir]!;
      if (eye[0] >= 0) rect(eye[0], eye[1], 2, 2, ink);
      break;
    }
  }
}
