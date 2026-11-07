/**
 * 字体子集（npm run fonts，打包前自动跑）
 * ================================================================
 *  游戏用霞鹜文楷（LXGW WenKai，SIL OFL 1.1）：正文用常规体，标题、人名用粗体。
 *  整套中文字体每个快 20MB，太大，所以只留游戏里用得到的字：
 *    - src/ 里所有文件（语言文件、ink 剧本、数据表……）出现过的字；
 *    - 常用汉字（GB2312 一级字 3755 个），玩家起名字常用的字基本都在里面；
 *    - 英文字母、数字、常用标点。
 *  做成 public/assets/fonts/ 下的两个 woff2。子集里没有的字（生僻的名字）会用系统中文字体显示。
 *
 *  完整字体放在 fonts_raw/（不提交，太大）；没有的话从霞鹜文楷的 GitHub 发布页下载。
 *  下载不了时保留上一次做好的 woff2（已经提交在仓库里），打包照样能过。
 */
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RAW = path.join(ROOT, 'fonts_raw');
const OUT = path.join(ROOT, 'public', 'assets', 'fonts');
const VERSION = 'v1.330';
const FONTS = [
  { file: 'LXGWWenKai-Regular.ttf', out: 'wenkai-regular.woff2' },
  { file: 'LXGWWenKai-Bold.ttf', out: 'wenkai-bold.woff2' },
];

/** src/ 下所有文本文件里出现过的字 */
function usedChars() {
  const chars = new Set();
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(ts|ink|json|html)$/.test(f.name)) for (const ch of fs.readFileSync(p, 'utf8')) chars.add(ch);
    }
  };
  walk(path.join(ROOT, 'src'));
  for (const ch of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')) chars.add(ch);
  // 常用汉字：GB2312 一级字（区码 B0A1 ~ D7F9）
  const gbk = new TextDecoder('gbk');
  for (let a = 0xb0; a <= 0xd7; a++) for (let b = 0xa1; b <= 0xfe && !(a === 0xd7 && b > 0xf9); b++) chars.add(gbk.decode(new Uint8Array([a, b])));
  // 英文、数字、常用标点
  for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
  for (const ch of '，。、！？；：“”‘’（）《》〈〉「」『』【】…—·～×÷ ') chars.add(ch);
  return [...chars].filter((ch) => ch.codePointAt(0) >= 0x20).join('');
}

async function source(file) {
  const p = path.join(RAW, file);
  if (fs.existsSync(p)) return fs.readFileSync(p);
  const url = `https://github.com/lxgw/LxgwWenKai/releases/download/${VERSION}/${file}`;
  console.log(`下载 ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败：${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(RAW, { recursive: true });
  fs.writeFileSync(p, buf);
  return buf;
}

const text = usedChars();
fs.mkdirSync(OUT, { recursive: true });
for (const f of FONTS) {
  try {
    const out = await subsetFont(await source(f.file), text, { targetFormat: 'woff2' });
    fs.writeFileSync(path.join(OUT, f.out), out);
    console.log(`✓ ${f.out}：${text.length} 个字，${(out.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    const kept = fs.existsSync(path.join(OUT, f.out));
    console.log(`⚠ ${f.file} 做子集没成功（${e.message}）${kept ? '，先用上一次做好的' : ''}`);
    if (!kept) process.exitCode = 1;
  }
}
