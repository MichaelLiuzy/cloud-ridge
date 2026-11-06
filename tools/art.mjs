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
const PALETTE = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'config', 'palette.json'), 'utf8')).colors).map(
  (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)],
);

/** 可以调的数 */
const TUNING = {
  /** 和纯品红 #FF00FF 的颜色距离小于这个，就算背景（0~441，越大抠得越狠） */
  keyDistance: 110,
  /** 挨着背景的像素，如果「偏品红」超过这个程度（红和蓝都比绿高这么多），也当杂边去掉 */
  fringeStrength: 60,
  /** 去杂边做几圈 */
  fringePasses: 2,
  /** 一列（或一行）里非背景像素少于这个比例，算作空隙（防止零星噪点把空隙打断） */
  gapNoise: 0.004,
  /** 缩小后不透明度低于这个（0~1）就变全透明，高于就变全不透明 */
  alphaCut: 0.5,
  /** 地面纹理每格四周往里收几成（去掉贴着空隙的杂色边），0.03 = 3% */
  tileInset: 0.03,
  /** 生成精灵表的输出文件夹（每次运行先清空，fonts 等别的文件夹不动） */
  outFolders: ['chars', 'tiles', 'objects', 'buildings', 'crops', 'icons', 'portraits'],
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
    } catch (err) {
      console.log(`✗ ${file} 处理失败：${err.message}`);
      report.push({ file, skipped: `处理失败：${err.message}` });
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writePreview(report);
  console.log(`\n整理完：${Object.keys(manifest.textures).length} 张图 → ${path.relative(ROOT, OUT_DIR)}/`);
  console.log(`预览页：${path.relative(ROOT, path.join(PREVIEW_DIR, 'index.html'))}`);
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
  const isTile = !!rule.tile;
  const [cw, ch] = rule.sizes?.[id] ?? rule.cell;

  // 1. 哪些像素是背景
  const bg = backgroundMask(img, !isTile);
  // 2. 抠图（地面纹理不抠）
  if (!isTile) for (let i = 0; i < bg.length; i++) if (bg[i]) img.data[i * 4 + 3] = 0;

  // 3. 切格
  const { cells, split } = splitCells(bg, img.w, img.h, rule.rows, rule.cols);

  // 4~5. 每格：裁边 → 缩小 → 硬边 → 套色
  const frames = cells.map((c) => {
    const box = contentBox(bg, img.w, c);
    if (!box) return blank(cw, ch);
    if (isTile) {
      const ix = Math.round(box.w * TUNING.tileInset);
      const iy = Math.round(box.h * TUNING.tileInset);
      const inner = { x: box.x + ix, y: box.y + iy, w: Math.max(1, box.w - 2 * ix), h: Math.max(1, box.h - 2 * iy) };
      return quantize(hardEdge(resize(img, inner, cw, ch, false), true));
    }
    const scale = Math.min(cw / box.w, ch / box.h);
    const w = Math.max(1, Math.min(cw, Math.round(box.w * scale)));
    const h = Math.max(1, Math.min(ch, Math.round(box.h * scale)));
    const small = quantize(hardEdge(resize(img, box, w, h, true), false));
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

/** 每个像素换成调色板里最近的颜色（按人眼感觉加权的距离），不抖动 */
function quantize(img) {
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4;
    if (img.data[o + 3] === 0) {
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 0;
      continue;
    }
    const [r, g, b] = nearest(img.data[o], img.data[o + 1], img.data[o + 2]);
    img.data[o] = r;
    img.data[o + 1] = g;
    img.data[o + 2] = b;
  }
  return img;
}

function nearest(r, g, b) {
  let best = PALETTE[0];
  let bestD = Infinity;
  for (const p of PALETTE) {
    const rm = (r + p[0]) / 2;
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
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
      const warn = r.split === 'even' ? '<p class="warn">没找到格子之间的品红空隙，是按平均分格切的。如果切歪了，让 ChatGPT 把格子间距留大一点再出一次。</p>' : '';
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
