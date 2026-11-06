/**
 * 游戏入口：把所有场景接起来，启动 Phaser。
 * 场景顺序：Boot（读图）→ Title（标题）→ Farm（农场）+ Atmosphere（昼夜色层）+ Hud（界面叠在最上面）
 *
 * 画面：先按 320×180 画，再整数倍放大铺满屏幕，放不满的地方留黑边（美术规范定的）。
 */
import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { SETTINGS } from './config/settings';
import { t } from './locales/i18n';
import { gameState } from './systems/GameState';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { FarmScene } from './scenes/FarmScene';
import { AtmosphereScene } from './scenes/AtmosphereScene';
import { HudScene } from './scenes/HudScene';

document.title = t('game.title');
const rotate = document.getElementById('rotate');
if (rotate) rotate.textContent = t('game.rotateDevice');

/**
 * 放大几倍：在屏幕的「真实像素」上取整数倍，这样每个游戏像素都是整整齐齐的小方块。
 * 返回的是网页里的倍数（Retina 屏上可能是 4.5 这种数，换成真实像素就是整数 9）。
 */
function pixelZoom() {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min((window.innerWidth * dpr) / SETTINGS.gameWidth, (window.innerHeight * dpr) / SETTINGS.gameHeight);
  return Math.max(1, Math.floor(fit)) / dpr;
}

/** 先把像素字体读进来（不然第一屏的字会用系统字体） */
async function loadFont() {
  try {
    const face = new FontFace('FusionPixel', `url(${import.meta.env.BASE_URL}assets/fonts/fusion-pixel-12px.woff2)`);
    (document.fonts as unknown as Set<FontFace>).add(await Promise.race([face.load(), new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), 8000))]));
  } catch {
    // 字体没读到也能玩，只是字不是像素风
  }
}

async function start() {
  await loadFont();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: SETTINGS.gameWidth,
    height: SETTINGS.gameHeight,
    backgroundColor: SETTINGS.backgroundColor,
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.NONE, zoom: pixelZoom(), autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { activePointers: 3 },
    scene: [BootScene, TitleScene, FarmScene, AtmosphereScene, HudScene],
  });

  // 窗口变大小、手机转方向时，重新算放大倍数
  const refit = () => {
    game.scale.setZoom(pixelZoom());
    game.scale.refresh();
  };
  window.addEventListener('resize', refit);
  window.visualViewport?.addEventListener('resize', refit);

  // 方便调试：在浏览器控制台里可以用 __game、__gameState 看游戏状态
  Object.assign(window, { __game: game, __gameState: gameState });
}

void start();

// 离线功能：第一次打开后把游戏存到手机/电脑里，之后没网也能玩
// （嵌在别的网页里预览时不注册，因为那里不支持）
if (window.top === window.self) registerSW({ immediate: true });
