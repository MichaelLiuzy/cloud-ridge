/**
 * 游戏入口：把所有场景接起来，启动 Phaser。
 * 场景顺序：Boot（画占位图）→ Title（标题）→ Farm（农场）+ Hud（界面叠在上面）
 */
import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { SETTINGS } from './config/settings';
import { t } from './locales/i18n';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { FarmScene } from './scenes/FarmScene';
import { HudScene } from './scenes/HudScene';

document.title = t('game.title');
const rotate = document.getElementById('rotate');
if (rotate) rotate.textContent = t('game.rotateDevice');

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: SETTINGS.backgroundColor,
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, FarmScene, HudScene],
});

// 方便调试：在浏览器控制台里可以用 __game 看游戏状态
(window as unknown as { __game: Phaser.Game }).__game = game;

// 离线功能：第一次打开后把游戏存到手机/电脑里，之后没网也能玩
// （嵌在别的网页里预览时不注册，因为那里不支持）
if (window.top === window.self) registerSW({ immediate: true });
