/**
 * 剧情场景：开场的漫画式过场 + 医馆对话。
 *  - 过场一次放一格（数据在 src/data/cutscenes.ts）。按任意键、点屏幕只翻一格：
 *    这一格的出场效果还没播完，就先直接播完；播完了才翻到下一格。没有「一键跳过整段」。
 *  - 不操作的话，出场效果播完后等几秒自动翻（设置里可以关、可以改秒数；默认值在 settings.ts 的 prefsDefaults，每格可单独设 autoMs）。
 *  - 过场时屏幕最上方有一行淡淡的「按任意键翻页」，进入对话就消失。
 *  - 过场最后一格的图留着当医馆对话的背景，对话剧本在 src/story/zh/prologue.ink。
 *  - 对话播完 → 黑屏淡出 → 进农场。
 */
import { enterFarm } from './FarmScene';
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { followView, setupWorldCamera, uiSize } from '../config/view';
import { loadPrefs } from '../systems/prefs';
import { PALETTE, toColor } from '../config/palette';
import { CUTSCENES, type CutsceneFrame } from '../data/cutscenes';
import { t } from '../locales/i18n';
import { gameState, type PrologueStep } from '../systems/GameState';
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
  /** 这一格什么时候出现的（没到 minShowMs 时点了也不翻） */
  private shownAt = 0;
  /** 这一格的出场效果什么时候播完的（自动翻页从这时开始计时；还没播完是 null） */
  private settledAt: number | null = null;
  /** 最上方「按任意键翻页」的提示 */
  private hint?: Phaser.GameObjects.Text;
  private layer!: Phaser.GameObjects.Container;
  private dialogue?: DialogueBox;
  private leaving = false;
  /** 界面层（对话框、提示画在这里） */
  private ui?: Phaser.Scene;

  constructor() {
    super('Story');
  }

  /** step：opening = 从过场开始；clinic = 直接从医馆对话开始（中途退出后重来） */
  create(data: { step: Extract<PrologueStep, 'opening' | 'clinic'> }) {
    this.cameras.main.setBackgroundColor('#000000');
    // 过场的图按地图的倍数放大；对话框和提示画在上面的界面层（UiOverlay，更细）
    followView(this, () => setupWorldCamera(this));
    this.layer = this.add.container(0, 0);
    this.frames = CUTSCENES.opening;
    this.index = -1;
    this.effects = [];
    this.leaving = false;
    this.settledAt = null;
    this.dialogue = undefined;

    // 过场：任意键 / 点一下只前进一格；医馆对话：回车、空格、点一下。
    // 按住不放不会连着翻（忽略按键的自动重复）；输入名字时打的字不算
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing) return;
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;
      if (this.dialogue?.active && !['Enter', ' ', 'Spacebar'].includes(e.key)) return;
      this.step();
    };
    this.input.keyboard?.on('keydown', onKey);
    this.input.on('pointerdown', () => this.step());
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', onKey);
      this.dialogue?.destroy();
      this.dialogue = undefined;
      this.hint = undefined;
      this.scene.stop('UiOverlay');
    });

    // 等界面层准备好，再开始放
    const overlay = this.scene.get('UiOverlay');
    overlay.events.once('create', () => {
      this.ui = overlay;
      this.dialogue = new DialogueBox(overlay);
      this.showHint();
      if (data?.step === 'clinic') {
        this.index = this.frames.length - 1;
        this.showFrame(this.frames[this.index], true);
        this.startClinic();
      } else {
        this.next();
      }
    });
    this.scene.launch('UiOverlay');
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
    if (this.time.now - this.shownAt < SETTINGS.cutscene.minShowMs) return;
    this.next();
  }

  /** 自动翻页：出场效果播完后开始计时，到时间没操作就翻下一格（对话里、最后一格不翻） */
  update() {
    if (!this.dialogue || this.leaving || this.dialogue.active || this.index < 0 || this.index >= this.frames.length - 1) return;
    if (this.effects.some((tw) => tw.isPlaying())) return;
    const now = this.time.now;
    if (this.settledAt === null) this.settledAt = now;
    const prefs = loadPrefs();
    if (!prefs.autoAdvance) return;
    const wait = this.frames[this.index].autoMs ?? prefs.autoAdvanceSec * 1000;
    if (now - this.settledAt >= wait) this.next();
  }

  /** 屏幕最上方居中的一行淡淡的提示，慢慢闪 */
  private showHint() {
    const cfg = SETTINGS.cutscene;
    const text = t(isTouchDevice() ? 'cutscene.hintTap' : 'cutscene.hintKey');
    const ui = this.ui!;
    this.hint = pixelText(ui, uiSize().w / 2, 3, text, { color: cfg.hintColor, size: SETTINGS.ui.smallFontSize }).setOrigin(0.5, 0).setAlpha(cfg.hintAlpha).setDepth(100);
    // 1 像素的深色影子：亮的画面上也看得清
    this.hint.setShadow(1, 1, PALETTE.ink, 0, false, true);
    ui.tweens.add({ targets: this.hint, alpha: cfg.hintAlpha * 0.35, duration: cfg.hintBlinkMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private hideHint() {
    if (!this.hint) return;
    this.ui?.tweens.killTweensOf(this.hint);
    this.hint.destroy();
    this.hint = undefined;
  }

  private next() {
    this.index += 1;
    this.settledAt = null;
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
    this.hideHint();
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
      enterFarm(this);
    });
  }
}
