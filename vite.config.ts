// 打包设置。一般不用动。
// BASE：网站放在哪个路径下。Cloudflare Pages 挂在根路径，所以默认是 /
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * 剧本（.ink 文件）在打包时就编译好：剧本写错了（比如少了 -> 、选项没接上），
 * 打包会直接报错，告诉你是哪个文件第几行。
 */
function inkPlugin(): Plugin {
  const { Compiler } = createRequire(import.meta.url)('inkjs/full');
  return {
    name: 'ink',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('.ink')) return null;
      const source = fs.readFileSync(id, 'utf8');
      const compiler = new Compiler(source);
      let json: string;
      try {
        json = compiler.Compile().ToJson();
      } catch {
        throw new Error(`剧本 ${id} 有错：\n${(compiler.errors as string[]).join('\n')}`);
      }
      for (const w of compiler.warnings as string[]) this.warn(`剧本 ${id}：${w}`);
      return `export default ${JSON.stringify(json)};`;
    },
  };
}

const base = process.env.BASE ?? '/';

/** 版本号：这次打包用的是哪一次提交（标题画面右上角会显示，方便确认手机上是不是最新版） */
function buildVersion() {
  const sha = process.env.WORKERS_CI_COMMIT_SHA ?? process.env.CF_PAGES_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base,
  define: { __BUILD_VERSION__: JSON.stringify(buildVersion()) },
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [
    inkPlugin(),
    // PWA：让游戏可以「添加到主屏幕」并离线游玩
    VitePWA({
      // 有新版本时不马上刷新（玩到一半会丢进度），由 src/main.ts 决定什么时候换：在标题画面就换
      includeAssets: ['icons/*.png'],
      manifest: {
        name: '云岭',
        short_name: '云岭',
        description: '云岭 Cloud Ridge',
        lang: 'zh-CN',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: "#1E1A1F",
        theme_color: "#1E1A1F",
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,svg,woff2}'],
        // 美术预览页（里面有大原图）不用存到手机里离线
        globIgnores: ['art_preview/**'],
        // 打开预览页时不要被离线缓存换成游戏首页
        navigateFallbackDenylist: [/art_preview/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // 只有文件名里带指纹的程序文件（index-xxxxxxxx.js）才当作「永远不变」。
        // 美术图和 manifest.json 也放在 assets/ 里，但文件名不变、内容会变：
        // 不写这一行的话，手机 / 电脑第一次存下的旧图会一直用下去，新图（比如周里正的头像）永远出不来。
        dontCacheBustURLsMatching: /-[A-Za-z0-9_-]{8}\.(js|css)$/,
      },
    }),
  ],
});
