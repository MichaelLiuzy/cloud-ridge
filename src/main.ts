/**
 * 游戏入口：把所有场景接起来，启动 Phaser。
 * 场景顺序：Boot（读图）→ Title（标题）→ Farm（农场）+ Atmosphere（昼夜色层）+ Hud（界面叠在最上面）
 *
 * 画面：地图按 320×180 画，再整数倍放大铺满屏幕，放不满的地方留黑边（美术规范定的）；
 * 界面另外按大约 640×360 排版（两倍精度），字小一半但依然清晰。两层的倍数见 src/config/view.ts。
 */
import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { SETTINGS } from './config/settings';
import { VIEW, VIEW_EVENTS, computeView, cssZoom } from './config/view';
import { t } from './locales/i18n';
import { gameState } from './systems/GameState';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { FarmScene } from './scenes/FarmScene';
import { AtmosphereScene } from './scenes/AtmosphereScene';
import { HudScene } from './scenes/HudScene';
import { StoryScene } from './scenes/StoryScene';
import { GameMenuScene } from './scenes/GameMenuScene';
import { SettingsScene } from './scenes/SettingsScene';
import { NightScene } from './scenes/NightScene';
import { UiOverlayScene } from './scenes/UiOverlayScene';

document.title = t('game.title');
const rotate = document.getElementById('rotate');
if (rotate) rotate.textContent = t('game.rotateDevice');

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
  computeView();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW.canvasW,
    height: VIEW.canvasH,
    backgroundColor: SETTINGS.backgroundColor,
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.NONE, zoom: cssZoom(), autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { activePointers: 3 },
    scene: [BootScene, TitleScene, StoryScene, FarmScene, AtmosphereScene, HudScene, GameMenuScene, SettingsScene, UiOverlayScene, NightScene],
  });

  // 窗口变大小、手机转方向、设置里改了界面大小时，重新算放大倍数；倍数变了就通知各个场景重新排版
  const refit = () => {
    const changed = computeView();
    if (changed) game.scale.resize(VIEW.canvasW, VIEW.canvasH);
    game.scale.setZoom(cssZoom());
    game.scale.refresh();
    if (changed) game.events.emit(VIEW_EVENTS.changed);
  };
  window.addEventListener('resize', refit);
  window.visualViewport?.addEventListener('resize', refit);
  game.events.on(VIEW_EVENTS.refit, refit);

  // 方便调试：在浏览器控制台里可以用 __game、__gameState 看游戏状态
  Object.assign(window, { __game: game, __gameState: gameState });
  gameRef = game;
  // 回到标题画面时，如果有新版本在等，就换上
  game.events.on(TITLE_SHOWN, applyUpdateIfSafe);
}

/**
 * 更新：网上有新版本时，手机 / 电脑上存的旧版本不会自己马上换掉。
 *  - 每次打开、从后台切回来、开着的时候每半小时，都去看一下有没有新版本；
 *  - 有新版本：在标题画面就立刻刷新换上；在玩的时候先不动，等回到标题画面再换（不会丢进度）。
 */
export const TITLE_SHOWN = 'title:shown';
let gameRef: Phaser.Game | null = null;
let updateWaiting = false;
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

function applyUpdateIfSafe() {
  if (!updateWaiting || !updateSW) return;
  // 游戏还没开始画（还在读图）或者在标题画面：可以换
  const atTitle = !gameRef || gameRef.scene.isActive('Title') || gameRef.scene.isActive('Boot');
  if (atTitle) void updateSW(true);
}

void start();

// 离线功能：第一次打开后把游戏存到手机/电脑里，之后没网也能玩
// （嵌在别的网页里预览时不注册，因为那里不支持）
if (window.top === window.self) {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateWaiting = true;
      applyUpdateIfSafe();
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => void reg.update().catch(() => {});
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    },
  });
}
