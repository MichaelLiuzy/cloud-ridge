/**
 * 标题画面：显示游戏名，按回车或点屏幕开始。
 * 游戏名在 src/locales/zh.json 的 game.title 里改。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { font, t } from '../locales/i18n';
import { isTouchDevice } from '../input/Controls';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const res = window.devicePixelRatio || 1;
    const title = this.add
      .text(0, 0, t('game.title'), { fontFamily: font(), fontSize: '72px', color: SETTINGS.colors.hudText })
      .setOrigin(0.5)
      .setResolution(res);
    const sub = this.add
      .text(0, 0, t('game.subtitle'), { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#c9bfa8' })
      .setOrigin(0.5)
      .setResolution(res);
    const press = this.add
      .text(0, 0, t('game.pressToStart'), { fontFamily: font(), fontSize: '18px', color: '#c9bfa8' })
      .setOrigin(0.5)
      .setResolution(res);
    this.tweens.add({ targets: press, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });

    const layout = () => {
      const { width, height } = this.scale;
      title.setPosition(width / 2, height * 0.38);
      sub.setPosition(width / 2, height * 0.38 + 60);
      press.setPosition(width / 2, height * 0.75);
    };
    layout();
    this.scale.on('resize', layout);

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      this.scale.off('resize', layout);
      this.scene.start('Farm');
      this.scene.launch('Hud', { touch: isTouchDevice() });
    };
    // 按「确认」键开始（是哪个键见 settings.ts 的 keys.action）
    for (const k of SETTINGS.keys.action) this.input.keyboard?.addKey(k).once('down', start);
    this.input.once('pointerdown', start);
  }
}
