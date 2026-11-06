// 打包设置。一般不用动。
// BASE：网站放在哪个路径下。Cloudflare Pages 挂在根路径，所以默认是 /
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.BASE ?? '/';

export default defineConfig({
  base,
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [
    // PWA：让游戏可以「添加到主屏幕」并离线游玩
    VitePWA({
      registerType: 'autoUpdate',
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
      },
    }),
  ],
});
