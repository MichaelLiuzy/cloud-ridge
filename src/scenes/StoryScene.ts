/**
 * 剧情场景：开场的漫画式过场 + 医馆对话。
 *  - 过场一次放一格（数据在 src/data/cutscenes.ts）。点屏幕、按回车或空格只翻一格：
 *    这一格的出场效果还没播完，就先直接播完；播完了才翻到下一格。没有「一键跳过整段」。
 *  - 过场最后一格的图留着当医馆对话的背景，对话剧本在 src/story/zh/prologue.ink。
 *  - 对话播完 → 黑屏淡出 → 进农场。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { PALETTE, toColor } from '../config/palette';
import { CUTSCENES, type CutsceneFrame } from '../data/cutscenes';
import { t } from '../locales/i18n';
import { gameState } from '../systems/GameState';
import { currentSave } from '../systems/save/snapshot';
import { saveToSlot } from '../systems/save/saveManager';
import { isTouchDevice } from '../input/Controls';
import { DialogueBox } from '../ui/DialogueBox';
import { pixelText } from '../ui/pixelUi';
import { PLACEHOLDERS } from './BootScene';

export class StoryScene extends Phaser.Scene {
  private frames: CutsceneFrame[] = [];
  private index = -1;
  /** 这一格的出场效果（播完前点一下会直接播完） */
  private effects: Phaser.Tweens.Tween[] = [];
  /** 这一格什么时候出现的（停留时间没到时点了也不翻） */
  private shownAt = 0;
  private layer!: Phaser.GameObjects.Container;
  private dialogue?: DialogueBox;
  private leaving = false;

  constructor() {
    super('Story');
  }

  /** step：opening = 从过场开始；clinic = 直接从医馆对话开始（中途退出后重来） */
  create(data: { step: 'opening' | 'clinic' }) {
    this.cameras.main.setBackgroundColor('#000000');
    this.layer = this.add.container(0, 0);
    this.frames = CUTSCENES.opening;
    this.index = -1;
    this.effects = [];
    this.leaving = false;
    this.dialogue = new DialogueBox(this);

    // 点一下 / 回车 / 空格：只前进一步。按住不放不会连着翻（忽略按键的自动重复）
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['Enter', ' ', 'Spacebar'].includes(e.key)) this.step();
    };
    this.input.keyboard?.on('keydown', onKey);
    this.input.on('pointerdown', () => this.step());
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', onKey);
      this.dialogue?.destroy();
    });

    if (data?.step === 'clinic') {
      this.index = this.frames.length - 1;
      this.showFrame(this.frames[this.index], true);
      this.startClinic();
    } else {
      this.next();
    }
  }

  private step() {
    if (this.leaving) return;
    if (this.dialogue?.active) return this.dialogue.advance();
    // 效果还没播完：先播完
    const running = this.effects.filter((tw) => tw.isPlaying());
    if (running.length) {
      for (const tw of running) tw.complete();
      return;
    }
    const hold = this.frames[this.index]?.holdMs ?? 0;
    if (this.time.now - this.shownAt < hold) return;
    this.next();
  }

  private next() {
    this.index += 1;
    if (this.index >= this.frames.length) return;
    const frame = this.frames[this.index];
    this.showFrame(frame);
    if (this.index === this.frames.length - 1) {
      // 最后一格：进入医馆对话，这张图留着当背景
      this.time.delayedCall(700, () => {
        if (!this.dialogue?.active) {
          for (const tw of this.effects) tw.complete();
          this.startClinic();
        }
      });
    }
  }

  /** 画一格 */
  private showFrame(frame: CutsceneFrame, instant = false) {
    const { gameWidth: W, gameHeight: H } = SETTINGS;
    this.layer.removeAll(true);
    this.effects = [];
    this.shownAt = this.time.now;
    const parts: Phaser.GameObjects.GameObject[] = [];
    let picture: Phaser.GameObjects.Image | undefined;
    if (frame.image && frame.effect !== 'black' && frame.effect !== 'swirl') {
      picture = this.add.image(0, 0, frame.image).setOrigin(0);
      parts.push(picture);
      if (PLACEHOLDERS.has(frame.image)) {
        // 还没有美术图：色块上写一句这格画的是什么
        const dark = ['cg_walk_home', 'cg_penn_station'].includes(frame.image);
        parts.push(pixelText(this, W / 2, 50, t(`cg.${frame.image}`), { color: dark ? PALETTE.paper : PALETTE.outline, wrap: W - 40, align: 'center' }).setOrigin(0.5));
      }
    }
    let caption: Phaser.GameObjects.Container | undefined;
    if (frame.text) {
      const text = pixelText(this, W / 2, 0, t(frame.text), { color: PALETTE.paper, wrap: W - 32, align: 'center' }).setOrigin(0.5, 0);
      const h = Math.ceil(text.height) + 8;
      // 黑底白字那一格（「不知过了多久……」）放在正中间，其他的放在底下
      const y = frame.image ? H - h - 6 : Math.round((H - h) / 2);
      const bg = this.add.rectangle(0, 0, W, h, toColor(PALETTE.ink), frame.image ? 0.75 : 0).setOrigin(0);
      text.setY(4);
      caption = this.add.container(0, y, [bg, text]);
      parts.push(caption);
    }
    this.layer.add(parts);
    if (instant) return;

    const tween = (cfg: Phaser.Types.Tweens.TweenBuilderConfig) => this.effects.push(this.tweens.add(cfg));
    if (frame.effect === 'fade' && picture) {
      picture.setAlpha(0);
      tween({ targets: picture, alpha: 1, duration: 700 });
    }
    if (frame.effect === 'white') {
      const flash = this.add.rectangle(0, 0, W, H, 0xffffff, 1).setOrigin(0);
      this.layer.add(flash);
      tween({ targets: flash, alpha: 0, duration: 900, ease: 'Quad.easeIn' });
    }
    if (frame.effect === 'swirl') this.swirl(W, H, tween);
    if (caption) {
      caption.setAlpha(0);
      tween({ targets: caption, alpha: 1, duration: 500, delay: frame.effect === 'fade' ? 400 : 0 });
    }
  }

  /** 漩涡：一圈圈的螺旋，转着变大再淡出（代码画，不用美术图） */
  private swirl(W: number, H: number, tween: (cfg: Phaser.Types.Tweens.TweenBuilderConfig) => void) {
    const g = this.add.graphics({ x: W / 2, y: H / 2 });
    const colors = [PALETTE.eric, PALETTE.indigo, PALETTE.teal];
    for (let arm = 0; arm < 3; arm++) {
      g.fillStyle(toColor(colors[arm]));
      for (let i = 0; i < 70; i++) {
        const a = i * 0.25 + (arm * Math.PI * 2) / 3;
        const r = i * 1.3;
        const size = 1 + Math.floor(i / 25);
        g.fillRect(Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r), size, size);
      }
    }
    g.setScale(0.3).setAlpha(0);
    this.layer.add(g);
    tween({ targets: g, angle: 540, scale: 1.4, duration: 2200, ease: 'Sine.easeIn' });
    tween({ targets: g, alpha: { from: 0, to: 1 }, duration: 600, yoyo: true, hold: 1000 });
  }

  /** 医馆对话（中途退出的话，下次从这段对话的开头重来） */
  private startClinic() {
    if (this.dialogue?.active) return;
    gameState.prologue = 'clinic';
    void saveToSlot(currentSave());
    this.dialogue!.play('clinic', () => this.toFarm());
  }

  /** 对话播完：黑屏淡出，进农场 */
  private toFarm() {
    this.leaving = true;
    gameState.prologue = 'tutorial';
    void saveToSlot(currentSave());
    this.cameras.main.fadeOut(1200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Farm');
      this.scene.launch('Atmosphere');
      this.scene.launch('Hud', { touch: isTouchDevice() });
    });
  }
}
