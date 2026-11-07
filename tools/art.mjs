/**
 * 美术素材自动整理脚本：npm run art
 * ================================================================
 *  把 art_raw/ 里 ChatGPT 生成的原图（大图、品红背景、按格子排）
 *  变成游戏能直接用的小像素图，放进 public/assets/。全程在本机运行，不联网。
 *
 *  对每张图：
 *   1. 按文件名在 tools/art_rules.json 里找规则（几行几格、每格多大、存到哪）。
 *   2. 抠掉品红背景（带容差，顺便清掉边缘的品红杂边）。地面纹理（tile: true）不抠，只用品红空隙分格。
 *   3. 切格：先找格子之间的品红空隙；找不到就按行列平均分。
 *   4. 每格裁到内容边界，等比例缩小到目标尺寸里（先平均缩小，再去掉半透明），底部居中；地面纹理拉满整格。
 *   5. 每个像素换成 24 色调色板里最近的颜色（不抖动）。
 *   6. 存成精灵表或单张图，并更新 public/assets/manifest.json（游戏靠它知道有哪些图）。
 *   7. 生成预览页 public/art_preview/index.html：原图旁边放 4 倍放大的结果。
 *
 *  想调「抠图有多狠」「空隙多宽才算空隙」，改下面 TUNING 里的数。
 *  用法：npm run art            （默认读 art_raw/，写 public/assets/）
 *        node tools/art.mjs 原图文件夹 输出文件夹   （测试用）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.resolve(process.argv[2] ?? path.join(ROOT, 'art_raw'));
const OUT_DIR = path.resolve(process.argv[3] ?? path.join(ROOT, 'public', 'assets'));
const PREVIEW_DIR = path.resolve(OUT_DIR, '..', 'art_preview');
const RULES = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'art_rules.json'), 'utf8')).rules;
const PALETTE_NAMED = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'config', 'palette.json'), 'utf8')).colors;
const hexToRgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const PALETTE = Object.values(PALETTE_NAMED).map(hexToRgb);

/** 可以调的数 */
const TUNING = {
  /** 和纯品红 #FF00FF 的颜色距离小于这个，就算背景（0~441，越大抠得越狠） */
  keyDistance: 110,
  /** 挨着背景的像素，如果「偏品红」超过这个程度（红和蓝都比绿高这么多），也当杂边去掉 */
  fringeStrength: 60,
  /** 背景不是品红时（比如 ChatGPT 给了白底、黑底）：从图边上往里「漫水」抠掉和底色接近的像素，这是接近的程度 */
  plainBgDistance: 40,
  /** 图边上至少这么多比例的像素是同一种颜色，才认为它是纯色底 */
  plainBgShare: 0.7,
  /** 去杂边做几圈 */
  fringePasses: 2,
  /** 一列（或一行）里非背景像素少于这个比例，算作空隙（防止零星噪点把空隙打断） */
  gapNoise: 0.004,
  /** 缩小后不透明度低于这个（0~1）就变全透明，高于就变全不透明 */
  alphaCut: 0.5,
  /** 地面纹理每格四周往里收几成（去掉贴着空隙的杂色边），0.03 = 3% */
  tileInset: 0.03,
  /**
   * 肤色保护（只对规则里写了 "skin": true 的图生效：人物、头像。过场 CG 不开，因为木头、红衣服会被误当成皮肤）：
   * 色相在 hue 范围内、饱和度在 sat 范围内、亮度不低于 minValue 的像素算作皮肤，
   * 先把饱和度降低 desaturate（0.3 = 降 30%），再只在 5 个肤色和两个墨色里找最近色，
   * 不会落到橘火、朱红、赭石上。ChatGPT 画的皮肤普遍偏艳，不这样脸会发橙、花成斑点。
   */
  skin: {
    hue: [10, 45],
    sat: [0.2, 0.8],
    minValue: 0.5,
    desaturate: 0.3,
    colors: ['skinHighlight', 'skin', 'skinMid', 'skinDark', 'skinDeep', 'ink', 'outline'],
  },
  /**
   * 火光色锁：烛黄（candle F2C46B）、橘火（orange D97B3A）只留给会发光的东西。
   * 只有规则里写了 "fire": true（整条规则）或 "fire": ["lantern"]（只对这几个 id）的图才能用这两色：
   * 现在是灯笼 prop_lantern、过场 CG；以后的烛台、火堆也加上。
   * 其他图里本来会落到这两色的像素，改在剩下的颜色里找最近的（土墙一般落到旧纸或黄土），不会看着像还在烧。
   */
  fire: {
    colors: ['candle', 'orange'],
  },
  /** 生成精灵表的输出文件夹（每次运行先清空，fonts 等别的文件夹不动） */
  outFolders: ['chars', 'tiles', 'objects', 'buildings', 'crops', 'icons', 'portraits', 'cg'],
};

// =================================================================
//  主流程
// =================================================================

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of TUNING.outFolders) fs.rmSync(path.join(OUT_DIR, f), { recursive: true, force: true });
  fs.rmSync(PREVIEW_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(PREVIEW_DIR, 'raw'), { recursive: true });

  const files = fs.existsSync(RAW_DIR) ? fs.readdirSync(RAW_DIR).filter((f) => f.toLowerCase().endsWith('.png')).sort() : [];
  const manifest = { generatedAt: new Date().toISOString(), textures: {} };
  const report = [];

  for (const file of files) {
    const base = file.slice(0, -4);
    const found = findRule(base);
    if (!found) {
      console.log(`· 跳过 ${file}：文件名认不出（规则见 tools/art_rules.json）`);
      report.push({ file, skipped: '文件名认不出，没处理。看看是不是拼错了，或者在 tools/art_rules.json 里加规则。' });
      continue;
    }
    try {
      const outputs = processFile(path.join(RAW_DIR, file), found.rule, found.id);
      for (const o of outputs) manifest.textures[o.key] = o.entry;
      fs.copyFileSync(path.join(RAW_DIR, file), path.join(PREVIEW_DIR, 'raw', file));
      report.push({ file, outputs, split: outputs.split });
      console.log(`✓ ${file} → ${outputs.map((o) => o.entry.file).join(', ')}${outputs.split === 'even' ? '（没找到空隙，按平均分格）' : ''}`);
      if (outputs.bgNote) console.log(`  注意：${outputs.bgNote}`);
    } catch (err) {
      console.log(`✗ ${file} 处理失败：${err.message}`);
      report.push({ file, skipped: `处理失败：${err.message}` });
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  warnUnregistered(Object.keys(manifest.textures));
  writePreview(report);
  console.log(`\n整理完：${Object.keys(manifest.textures).length} 张图 → ${path.relative(ROOT, OUT_DIR)}/`);
  console.log(`预览页：${path.relative(ROOT, path.join(PREVIEW_DIR, 'index.html'))}`);
}

/**
 * 整理出来的图，如果 src/config/assets.ts 里没有登记，游戏里大多用不上（比如人物图、头像）。
 * 打一行警告，免得「图传了却看不到」。作物图按 src/data/crops.ts 自动登记，不用管。
 */
function warnUnregistered(keys) {
  const assetsFile = path.join(ROOT, 'src', 'config', 'assets.ts');
  if (!fs.existsSync(assetsFile)) return;
  const text = fs.readFileSync(assetsFile, 'utf8');
  for (const key of keys) {
    if (key.startsWith('crop_') || key.startsWith('icon_')) continue; // 作物图、物品图标按数据表自动登记；界面小图标有图才用，不用登记
    if (new RegExp(`\\b${key}\\s*:`).test(text)) continue;
    console.log(`⚠ ${key} 整理好了，但 src/config/assets.ts 里没有登记，游戏里可能用不上。请在 ASSETS 里加一行。`);
  }
}

/** 按文件名找规则，{id} 匹配英文小写、数字和下划线 */
function findRule(base) {
  for (const rule of RULES) {
    const pattern = '^' + rule.name.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace('{id}', '([a-z0-9_]+?)') + '$';
    const m = base.match(new RegExp(pattern));
    if (m) return { rule, id: m[1] ?? '' };
  }
  return null;
}

// =================================================================
//  处理一张图
// =================================================================

function processFile(file, rule, id) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const img = { w: png.width, h: png.height, data: png.data };
  // full = 整张画（过场 CG）：不抠图，从正中裁成目标比例再缩小
  const isFull = !!rule.full;
  const isTile = !!rule.tile || isFull;
  const [cw, ch] = rule.sizes?.[id] ?? rule.cell;
  // 能不能用火光色（见 TUNING.fire）
  const q = { skin: !!rule.skin, fire: rule.fire === true || (Array.isArray(rule.fire) && rule.fire.includes(id)) };

  // 1. 哪些像素是背景（不是品红底时，自动认出白底、黑底这类纯色底）
  const plain = isTile ? null : plainBackground(img);
  const bg = plain ? floodMask(img, plain) : backgroundMask(img, !isTile);
  // 2. 抠图（地面纹理不抠）
  if (!isTile) for (let i = 0; i < bg.length; i++) if (bg[i]) img.data[i * 4 + 3] = 0;

  // 3. 切格
  const { cells, split } = splitCells(bg, img.w, img.h, rule.rows, rule.cols);

  // 4~5. 每格：裁边 → 缩小 → 硬边 → 套色
  const boxes = cells.map((c) => contentBox(bg, img.w, c));
  // uniformScale：整张图只用一个缩放比例（按最大的那一格算），种子和成熟的菜、各个朝向之间原有的大小差别保留下来
  const shared = rule.uniformScale
    ? Math.min(...boxes.filter(Boolean).map((b) => Math.min(cw / b.w, ch / b.h)))
    : null;
  const frames = cells.map((c, ci) => {
    const box = boxes[ci];
    if (!box) return blank(cw, ch);
    if (isFull) {
      const scale = Math.min(box.w / cw, box.h / ch);
      const w = Math.round(cw * scale), h = Math.round(ch * scale);
      const inner = { x: box.x + Math.floor((box.w - w) / 2), y: box.y + Math.floor((box.h - h) / 2), w, h };
      return quantize(hardEdge(resize(img, inner, cw, ch, false), true), q);
    }
    if (isTile) {
      const ix = Math.round(box.w * TUNING.tileInset);
      const iy = Math.round(box.h * TUNING.tileInset);
      const inner = { x: box.x + ix, y: box.y + iy, w: Math.max(1, box.w - 2 * ix), h: Math.max(1, box.h - 2 * iy) };
      return quantize(hardEdge(resize(img, inner, cw, ch, false), true), q);
    }
    const scale = shared ?? Math.min(cw / box.w, ch / box.h);
    const w = Math.max(1, Math.min(cw, Math.round(box.w * scale)));
    const h = Math.max(1, Math.min(ch, Math.round(box.h * scale)));
    const small = quantize(hardEdge(resize(img, box, w, h, true), false), q);
    // 底部居中放进格子
    const out = blank(cw, ch);
    blit(small, out, Math.floor((cw - w) / 2), ch - h);
    return out;
  });

  // 6. 输出
  const names = rule.frames ?? frames.map((_, i) => String(i));
  const outputs = [];
  if (rule.out.includes('{frame}')) {
    frames.forEach((f, i) => {
      const rel = rule.out.replace('{id}', id).replace('{frame}', names[i] ?? String(i));
      writePng(f, path.join(OUT_DIR, rel));
      outputs.push({ key: keyOf(rel), entry: { file: rel, frameWidth: cw, frameHeight: ch, frames: [names[i] ?? String(i)], source: path.basename(file) } });
    });
  } else {
    const sheet = blank(cw * rule.cols, ch * rule.rows);
    frames.forEach((f, i) => blit(f, sheet, (i % rule.cols) * cw, Math.floor(i / rule.cols) * ch));
    const rel = rule.out.replace('{id}', id);
    writePng(sheet, path.join(OUT_DIR, rel));
    outputs.push({ key: keyOf(rel), entry: { file: rel, frameWidth: cw, frameHeight: ch, frames: names, source: path.basename(file) } });
  }
  outputs.split = split;
  outputs.bgNote = plain ? `背景不是品红，是 ${hex(plain)}，已自动按这个颜色从边上往里抠。` : null;
  if (!isTile && !plain && !hasMagenta(bg)) outputs.bgNote = '没找到品红背景，也不是纯色底，所以没抠掉背景。请让 ChatGPT 用纯品红 #FF00FF 背景重出。';
  return outputs;
}

/** 文件路径 → 游戏里的图片名，例如 chars/player_stand.png → player_stand */
function keyOf(rel) {
  return path.basename(rel, '.png');
}

// =================================================================
//  抠背景
// =================================================================

function backgroundMask(img, defringe) {
  const { w, h, data } = img;
  const bg = new Uint8Array(w * h);
  const key2 = TUNING.keyDistance ** 2;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    if (a < 128) bg[i] = 1;
    else if ((r - 255) ** 2 + g ** 2 + (b - 255) ** 2 < key2) bg[i] = 1;
  }
  if (!defringe) return bg;
  // 杂边：挨着背景、而且颜色偏品红（红、蓝都比绿高）的像素
  for (let pass = 0; pass < TUNING.fringePasses; pass++) {
    const add = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (bg[i]) continue;
        const near = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
        if (!near) continue;
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        if (Math.min(r, b) - g > TUNING.fringeStrength) add.push(i);
      }
    }
    for (const i of add) bg[i] = 1;
  }
  return bg;
}

/** 看图边一圈：如果大部分是同一种颜色、而且不是品红，就返回这个颜色 */
function plainBackground(img) {
  const { w, h, data } = img;
  const edge = [];
  for (let x = 0; x < w; x += 2) edge.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 2) edge.push(y * w, y * w + w - 1);
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  const isMagenta = ([r, g, b]) => (r - 255) ** 2 + g ** 2 + (b - 255) ** 2 < TUNING.keyDistance ** 2;
  const cols = edge.map(px);
  if (cols.filter(isMagenta).length > cols.length * 0.3) return null;
  // 每个通道取中位数当底色
  const med = [0, 1, 2].map((k) => cols.map((c) => c[k]).sort((a, b) => a - b)[cols.length >> 1]);
  const d2 = TUNING.plainBgDistance ** 2;
  const near = cols.filter((c) => (c[0] - med[0]) ** 2 + (c[1] - med[1]) ** 2 + (c[2] - med[2]) ** 2 < d2).length;
  return near >= cols.length * TUNING.plainBgShare ? med : null;
}

/** 从图边开始漫水：和底色接近、又连着图边的像素都算背景（图里面同色的地方不会被抠掉） */
function floodMask(img, color) {
  const { w, h, data } = img;
  const bg = new Uint8Array(w * h);
  const d2 = TUNING.plainBgDistance ** 2;
  const close = (i) =>
    (data[i * 4] - color[0]) ** 2 + (data[i * 4 + 1] - color[1]) ** 2 + (data[i * 4 + 2] - color[2]) ** 2 < d2 || data[i * 4 + 3] < 128;
  const stack = [];
  const push = (i) => {
    if (!bg[i] && close(i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) push(x), push((h - 1) * w + x);
  for (let y = 0; y < h; y++) push(y * w), push(y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  return bg;
}

function hasMagenta(bg) {
  let n = 0;
  for (let i = 0; i < bg.length; i++) n += bg[i];
  return n > bg.length * 0.05;
}

function hex([r, g, b]) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// =================================================================
//  切格
// =================================================================

/** 先切行、再在每一行里切格。返回每格在原图里的范围 */
function splitCells(bg, w, h, rows, cols) {
  let even = false;
  const rowRanges = splitAxis((y) => countRow(bg, w, y, 0, w), h, rows, w);
  if (!rowRanges.found) even = true;
  const cells = [];
  for (const [y0, y1] of rowRanges.ranges) {
    const colRanges = splitAxis((x) => countCol(bg, w, x, y0, y1), w, cols, y1 - y0);
    if (!colRanges.found) even = true;
    for (const [x0, x1] of colRanges.ranges) cells.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  return { cells, split: even ? 'even' : 'gaps' };
}

/**
 * 在一个方向上切成 n 段：找出最宽的 n-1 条「空隙」（几乎全是背景的行/列），从空隙中间切开。
 * 找不够空隙就平均分。
 */
function splitAxis(countAt, length, n, span) {
  const evenRanges = Array.from({ length: n }, (_, i) => [Math.round((i * length) / n), Math.round(((i + 1) * length) / n)]);
  if (n <= 1) return { ranges: [[0, length]], found: true };
  const limit = Math.max(1, span * TUNING.gapNoise);
  const empty = Array.from({ length }, (_, i) => countAt(i) < limit);
  // 内容的首尾（两头的空白不算空隙）
  let first = empty.indexOf(false);
  let last = empty.lastIndexOf(false);
  if (first < 0) return { ranges: evenRanges, found: false };
  const gaps = [];
  let start = -1;
  for (let i = first; i <= last; i++) {
    if (empty[i] && start < 0) start = i;
    if (!empty[i] && start >= 0) {
      gaps.push({ start, end: i, size: i - start });
      start = -1;
    }
  }
  if (gaps.length < n - 1) return { ranges: evenRanges, found: false };
  const chosen = gaps
    .sort((a, b) => b.size - a.size)
    .slice(0, n - 1)
    .sort((a, b) => a.start - b.start);
  // 选出的空隙要比较均匀：每段至少有平均长度的 25%，否则说明认错了，退回平均分
  const cuts = [0, ...chosen.map((g) => Math.round((g.start + g.end) / 2)), length];
  const ranges = [];
  for (let i = 0; i < n; i++) ranges.push([cuts[i], cuts[i + 1]]);
  const minLen = (last - first) / n / 4;
  if (ranges.some(([a, b]) => b - a < minLen)) return { ranges: evenRanges, found: false };
  return { ranges, found: true };
}

function countRow(bg, w, y, x0, x1) {
  let n = 0;
  for (let x = x0; x < x1; x++) n += bg[y * w + x] ? 0 : 1;
  return n;
}
function countCol(bg, w, x, y0, y1) {
  let n = 0;
  for (let y = y0; y < y1; y++) n += bg[y * w + x] ? 0 : 1;
  return n;
}

/** 一格里内容（非背景）的边界；全空返回 null。零星噪点不算。 */
function contentBox(bg, w, c) {
  const limitX = Math.max(1, c.h * TUNING.gapNoise);
  const limitY = Math.max(1, c.w * TUNING.gapNoise);
  let x0 = -1, x1 = -1, y0 = -1, y1 = -1;
  for (let x = c.x; x < c.x + c.w; x++) {
    if (countCol(bg, w, x, c.y, c.y + c.h) >= limitX) {
      if (x0 < 0) x0 = x;
      x1 = x + 1;
    }
  }
  for (let y = c.y; y < c.y + c.h; y++) {
    if (countRow(bg, w, y, c.x, c.x + c.w) >= limitY) {
      if (y0 < 0) y0 = y;
      y1 = y + 1;
    }
  }
  if (x0 < 0 || y0 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// =================================================================
//  缩小、硬边、套色
// =================================================================

/** 平均缩小（每个新像素 = 原图对应一块的平均，透明部分不把颜色拉脏） */
function resize(img, box, w, h) {
  const out = blank(w, h);
  const sx = box.w / w;
  const sy = box.h / h;
  for (let y = 0; y < h; y++) {
    const ya = box.y + Math.floor(y * sy);
    const yb = Math.max(ya + 1, box.y + Math.floor((y + 1) * sy));
    for (let x = 0; x < w; x++) {
      const xa = box.x + Math.floor(x * sx);
      const xb = Math.max(xa + 1, box.x + Math.floor((x + 1) * sx));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = ya; yy < yb; yy++) {
        for (let xx = xa; xx < xb; xx++) {
          const i = (yy * img.w + xx) * 4;
          const al = img.data[i + 3] / 255;
          r += img.data[i] * al;
          g += img.data[i + 1] * al;
          b += img.data[i + 2] * al;
          a += al;
          n++;
        }
      }
      const o = (y * w + x) * 4;
      if (a > 0) {
        out.data[o] = r / a;
        out.data[o + 1] = g / a;
        out.data[o + 2] = b / a;
      }
      out.data[o + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

/** 去掉半透明：要么全透明，要么全不透明（地面纹理全部不透明） */
function hardEdge(img, opaque) {
  for (let i = 0; i < img.w * img.h; i++) {
    img.data[i * 4 + 3] = opaque || img.data[i * 4 + 3] >= TUNING.alphaCut * 255 ? 255 : 0;
  }
  return img;
}

/** 每个像素换成调色板里最近的颜色（按人眼感觉的距离），不抖动。skin = 开肤色保护（见 TUNING.skin），fire = 能用火光色（见 TUNING.fire） */
function quantize(img, { skin = false, fire = false } = {}) {
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4;
    if (img.data[o + 3] === 0) {
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 0;
      continue;
    }
    const r0 = img.data[o], g0 = img.data[o + 1], b0 = img.data[o + 2];
    const [r, g, b] = (skin && skinTone(r0, g0, b0)) || nearest(r0, g0, b0, fire);
    img.data[o] = r;
    img.data[o + 1] = g;
    img.data[o + 2] = b;
  }
  return img;
}

/** 这个像素像皮肤的话：降一点饱和度，再只在肤色和墨色里找最近色；不像皮肤返回 null */
const SKIN_PALETTE = TUNING.skin.colors.map((n) => hexToRgb(PALETTE_NAMED[n]));
const SKIN_LAB = SKIN_PALETTE.map((p) => toLab(p[0], p[1], p[2]));
function skinTone(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max / 255;
  const s = max === 0 ? 0 : (max - min) / max;
  if (max === min) return null;
  let h = max === r ? ((g - b) / (max - min)) * 60 : max === g ? ((b - r) / (max - min)) * 60 + 120 : ((r - g) / (max - min)) * 60 + 240;
  if (h < 0) h += 360;
  const t = TUNING.skin;
  if (h < t.hue[0] || h > t.hue[1] || s < t.sat[0] || s > t.sat[1] || v < t.minValue) return null;
  // 降饱和：往灰（同亮度的最大值）那边拉一点
  const k = t.desaturate;
  const [R, G, B] = [r, g, b].map((c) => c + (max - c) * k);
  const [L, A, Bb] = toLab(R, G, B);
  let best = SKIN_PALETTE[0], bestD = Infinity;
  SKIN_LAB.forEach(([l2, a2, b2], i) => {
    const d = (L - l2) ** 2 + (A - a2) ** 2 + (Bb - b2) ** 2;
    if (d < bestD) {
      bestD = d;
      best = SKIN_PALETTE[i];
    }
  });
  return best;
}

/**
 * 调色板里离 (r, g, b) 最近的颜色。距离在 CIELAB 色彩空间里算（最接近人眼的感觉），
 * 这样肤色这类介于几种颜色之间的地方，会一整片落到同一种颜色上，不会花成斑点。
 */
/** 颜色差的权重（1 = 和明暗一样重要；小一点 = 更看重明暗，颜色更统一）。觉得图套色后发灰就调大 */
const CHROMA_WEIGHT = 1;
const PALETTE_LAB = PALETTE.map((p) => toLab(p[0], p[1], p[2]));
const FIRE_INDEX = new Set(TUNING.fire.colors.map((n) => Object.keys(PALETTE_NAMED).indexOf(n)));
const nearestCache = [new Map(), new Map()];
function nearest(r, g, b, fire = false) {
  const key = (r << 16) | (g << 8) | b;
  const cache = nearestCache[fire ? 1 : 0];
  const hit = cache.get(key);
  if (hit) return hit;
  const [L, A, B] = toLab(r, g, b);
  let best = PALETTE[0];
  let bestD = Infinity;
  PALETTE_LAB.forEach(([l2, a2, b2], i) => {
    if (!fire && FIRE_INDEX.has(i)) return;
    // 明暗差算足，颜色深浅（饱和度）差打折：原图偏艳的肤色会落到 skin / skinDark，而不是橙色
    const d = (L - l2) ** 2 + CHROMA_WEIGHT * ((A - a2) ** 2 + (B - b2) ** 2);
    if (d < bestD) {
      bestD = d;
      best = PALETTE[i];
    }
  });
  cache.set(key, best);
  return best;
}

/** sRGB → CIELAB（D65 白点） */
function toLab(r, g, b) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// =================================================================
//  小工具
// =================================================================

function blank(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4) };
}

function blit(src, dst, ox, oy) {
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const s = (y * src.w + x) * 4;
      const d = ((oy + y) * dst.w + ox + x) * 4;
      if (src.data[s + 3] === 0) continue;
      src.data.copy(dst.data, d, s, s + 4);
    }
  }
}

function writePng(img, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const png = new PNG({ width: img.w, height: img.h });
  img.data.copy(png.data);
  fs.writeFileSync(file, PNG.sync.write(png));
}

// =================================================================
//  预览页
// =================================================================

function writePreview(report) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rows = report
    .map((r) => {
      if (r.skipped) return `<section class="skip"><h2>${esc(r.file)}</h2><p>${esc(r.skipped)}</p></section>`;
      const outs = r.outputs
        .map((o) => {
          const { file, frameWidth, frameHeight, frames } = o.entry;
          return `<figure><img src="../assets/${esc(file)}" onload="this.style.width=this.naturalWidth*4+'px'"><figcaption>${esc(file)}<br>${frameWidth}×${frameHeight}，${frames.length} 格：${esc(frames.join(' / '))}</figcaption></figure>`;
        })
        .join('');
      let warn = r.split === 'even' ? '<p class="warn">没找到格子之间的空隙，是按平均分格切的。如果切歪了，让 ChatGPT 把格子间距留大一点再出一次。</p>' : '';
      if (r.outputs.bgNote) warn += `<p class="warn">${esc(r.outputs.bgNote)}</p>`;
      return `<section><h2>${esc(r.file)}</h2>${warn}<div class="pair"><figure class="raw"><img src="raw/${esc(r.file)}"><figcaption>原图</figcaption></figure><div class="outs">${outs}</div></div></section>`;
    })
    .join('\n');
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>美术预览</title>
<style>
  body { margin: 0; padding: 16px; background: #EFE4C8; color: #3B3540; font: 15px/1.5 "PingFang SC", sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 0 0 8px; }
  section { background: #fff8; border: 1px solid #D9C59A; border-radius: 6px; padding: 12px; margin: 12px 0; }
  .pair { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
  .raw img { width: 320px; max-width: 100%; }
  .outs { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
  .outs img { image-rendering: pixelated; background: repeating-conic-gradient(#D9C59A 0 25%, #EFE4C8 0 50%) 0 0 / 16px 16px; }
  figure { margin: 0; } figcaption { font-size: 12px; color: #5E5A63; }
  .warn { color: #A8402F; } .skip { opacity: .7; }
</style></head><body>
<h1>美术预览</h1>
<p>左边是 art_raw/ 里的原图，右边是整理后、放大 4 倍的样子（格子底纹 = 透明的地方）。生成时间：${esc(new Date().toLocaleString('zh-CN'))}</p>
${rows || '<p>art_raw/ 里还没有认得出的图。</p>'}
</body></html>`;
  fs.writeFileSync(path.join(PREVIEW_DIR, 'index.html'), html);
}

main();
