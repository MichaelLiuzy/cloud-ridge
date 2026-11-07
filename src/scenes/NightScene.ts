/**
 * 一天结束时盖在整个画面上的一层：睡觉过场，以及周日晚上的「本周总结」。
 *  - 睡觉（sleep = true）：画面慢慢变暗、中间出现「Zzz……」→ 下面一行「××睡着了。」→ 天亮淡入。
 *    时长在 src/config/settings.ts 的 sleepCutscene。点屏幕、按回车或空格可以提前结束。
 *  - 昏倒（sleep = false）：不放睡觉过场，只是周日昏倒时也要看本周总结，所以很快地黑一下屏。
 *  - 黑屏的那一刻调用 onBlack()：农场在这时换到第二天（玩家看不到地图突然变了），
 *    它返回本周总结（不是周日就是 null）。有总结就先显示总结，关掉以后再天亮。
 * 这一层开着时游戏时间暂停、主角不能动（gameState.menuOpen）。
 */
import { displayName } from '../systems/playerName';
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { setupUiCamera, uiSize } from '../config/view';
import { toColor } from '../config/palette';
import { t } from '../locales/i18n';
import { gameState } from '../systems/GameState';
import type { WeekSummary } from '../systems/weekSummary';
import { drawPanel, pixelText } from '../ui/pixelUi';

export interface NightData {
  /** true = 睡觉（放过场）；false = 昏倒（只为了显示本周总结） */
  sleep: boolean;
  /** 黑屏时调用：换到第二天，返回本周总结（没有就是 null） */
  onBlack: () => WeekSummary | null;
  /** 天亮以后调用 */
  onDone: () => void;
}

type Phase = 'fadeOut' | 'hold' | 'summary' | 'fadeIn' | 'done';

export class NightScene extends Phaser.Scene {
  private data0!: NightData;
  private phase: Phase = 'fadeOut';
  private shade!: Phaser.GameObjects.Rectangle;
  private zzz?: Phaser.GameObjects.Text;
  private line?: Phaser.GameObjects.Text;
  private panel?: Phaser.GameObjects.Container;
  private timer?: Phaser.Time.TimerEvent;
  private summaryAt = 0;

  constructor() {
    super('Night');
  }

  create(data: NightData) {
    this.data0 = data;
    this.phase = 'fadeOut';
    this.panel = undefined;
    this.zzz = undefined;
    this.line = undefined;
    gameState.menuOpen = true;
    setupUiCamera(this);
    const { w: W, h: H } = uiSize();
    const cfg = SETTINGS.sleepCutscene;
    // 挡住下面的点击
    this.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
    this.shade = this.add.rectangle(0, 0, W, H, toColor(SETTINGS.backgroundColor), 1).setOrigin(0).setAlpha(0);

    if (data.sleep) {
      this.zzz = pixelText(this, W / 2, H / 2 - 10, t('sleep.zzz'), { color: cfg.zzzColor }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: this.shade, alpha: 1, duration: cfg.fadeOutMs, onComplete: () => this.startHold() });
      this.tweens.add({ targets: this.zzz, alpha: 1, duration: cfg.fadeOutMs, delay: cfg.fadeOutMs / 2 });
    } else {
      this.tweens.add({ targets: this.shade, alpha: 1, duration: 300, onComplete: () => this.goBlack() });
    }

    this.input.on('pointerdown', () => this.skip());
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'Escape'].includes(e.key)) this.skip();
    };
    this.input.keyboard?.on('keydown', onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', onKey));
  }

  /** 黑屏后：显示「××睡着了。」，停一会儿 */
  private startHold() {
    if (this.phase !== 'fadeOut') return;
    this.phase = 'hold';
    const { w: W, h: H } = uiSize();
    const cfg = SETTINGS.sleepCutscene;
    const name = displayName();
    this.line = pixelText(this, W / 2, H / 2 + 14, t('sleep.line', { name }), { color: cfg.lineColor }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.line, alpha: 1, duration: 300 });
    this.timer = this.time.delayedCall(cfg.holdMs, () => this.goBlack());
  }

  /** 点一下 / 回车 / 空格：过场跳到下一步 */
  private skip() {
    if (this.phase === 'fadeOut' || this.phase === 'hold') {
      this.tweens.killAll();
      this.timer?.remove();
      this.shade.setAlpha(1);
      this.zzz?.setAlpha(1);
      this.goBlack();
    } else if (this.phase === 'summary' && this.time.now - this.summaryAt > 400) {
      this.panel?.destroy();
      this.panel = undefined;
      this.fadeIn();
    }
  }

  /** 全黑了：换到第二天；周日的话先显示本周总结 */
  private goBlack() {
    if (this.phase === 'summary' || this.phase === 'fadeIn' || this.phase === 'done') return;
    this.phase = 'summary'; // 先占住，免得 onBlack 被调两次
    const summary = this.data0.onBlack();
    if (summary) return this.showSummary(summary);
    this.fadeIn();
  }

  private fadeIn() {
    this.phase = 'fadeIn';
    const targets = [this.shade, this.zzz, this.line].filter(Boolean);
    this.tweens.add({
      targets,
      alpha: 0,
      duration: SETTINGS.sleepCutscene.fadeInMs,
      onComplete: () => this.finish(),
    });
  }

  private finish() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.scene.stop();
    // 等这一下按键处理完再放开，免得同一下回车又在农场里触发
    setTimeout(() => {
      gameState.menuOpen = false;
      this.data0.onDone();
    }, 0);
  }

  /** 本周总结：一块纸面板，上面标题，中间这周做了什么，下面下周提要 */
  private showSummary(s: WeekSummary) {
    this.phase = 'summary';
    this.summaryAt = this.time.now;
    this.zzz?.setAlpha(0);
    this.line?.setAlpha(0);
    const ui = SETTINGS.ui;
    const { w: W, h: H } = uiSize();
    const pw = Math.min(360, W - 24);
    const pad = 12;
    const inner = pw - pad * 2;
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = pad;
    const write = (text: string, color: string = ui.text, gap = 4, x = pad, title = false) => {
      const tx = pixelText(this, x, y, text, { color, wrap: inner - (x - pad), title });
      items.push(tx);
      y += Math.ceil(tx.height) + gap;
    };
    write(s.title, ui.money, 0, pad, true);
    write(s.subtitle, ui.textDim2, 8);
    const body = s.lines.length ? s.lines : [t('weekSummary.quiet')];
    for (const l of body) write(`· ${l}`, s.lines.length ? ui.text : ui.textDim2, 3);
    if (s.next) {
      y += 6;
      write(s.next.title, ui.money, 3);
      for (const l of s.next.lines) write(l, ui.textDim2, 2, pad + 8);
    }
    y += 6;
    write(t('weekSummary.close'), ui.textDim, 0);
    const ph = Math.min(H - 16, y + pad);
    const g = this.add.graphics();
    drawPanel(g, 0, 0, pw, ph);
    this.panel = this.add.container(Math.round((W - pw) / 2), Math.round((H - ph) / 2), [g, ...items]).setAlpha(0);
    this.tweens.add({ targets: this.panel, alpha: 1, duration: 250 });
  }
}
