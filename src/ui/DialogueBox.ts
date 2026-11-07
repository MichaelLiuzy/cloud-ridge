/**
 * 剧情对话框：播一段 ink 剧本。
 *  - 有说话人：左上方显示头像（64×64，没图时是色块），框上方显示名字。
 *  - 旁白：不显示名字和头像，字用另一种颜色。
 *  - 黄字：<<clue:id=字>>，这条线索能拿时标黄并给线索；不能拿时按普通字显示。
 *  - 一句太长时分几页，点一下翻一页。
 *  - 字一个一个出来（快慢看设置里的「文字速度」）；还没出完时点一下，先全部显示。
 * 对话框画在界面层，整体再放大 SETTINGS.ui.dialogueScale 倍（比别的界面字大一档）；
 * 里面按「界面大小 ÷ 放大倍数」（大约 320×180）排版。颜色在 src/config/settings.ts 的 ui 里。
 */
import { noteMet } from '../systems/weekStats';
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { VIEW, uiSize } from '../config/view';
import { loadPrefs } from '../systems/prefs';
import { MOOD_FRAMES } from '../config/assets';
import { t } from '../locales/i18n';
import { DialogueRunner, type DialogueLine } from '../story/runner';
import { parseClueMarks } from '../story/text';
import { gameState, giveStartKit } from '../systems/GameState';
import { addItem } from '../systems/inventory';
import { addLearned, canGetClue, giveClue, learnControl } from '../systems/story/notebook';
import { askName } from './nameInput';
import { drawPanel, pixelText } from './pixelUi';
import { drawLines, wrapRuns, type Run } from './richText';

/** 框、字、头像的位置：按对话框自己的坐标（界面大小 ÷ 放大倍数）算，底部居中 */
function layout() {
  const { w: uw, h: uh } = uiSize();
  // 放大倍数：按屏幕真实像素算，保证是整数倍（字才清楚）。
  // 先用「界面倍数 × dialogueScale」，屏幕太窄（放不下 300 宽）就一档档减小，但不小于界面倍数。
  let px = VIEW.ui * Math.max(1, SETTINGS.ui.dialogueScale);
  while (px > VIEW.ui && VIEW.canvasW / px < 300) px -= 1;
  const scale = px / VIEW.ui;
  const lw = Math.floor(uw / scale);
  const lh = Math.floor(uh / scale);
  const w = Math.min(lw - 8, 400);
  const x = Math.round((lw - w) / 2);
  const BOX = { x, y: lh - 56, w, h: 52 };
  return {
    scale,
    BOX,
    TEXT: { x: x + 7, y: BOX.y + 5, w: w - 14, lineH: 14, lines: 3 },
    PORTRAIT: { x, y: BOX.y - 70, size: 64 },
  };
}

export class DialogueBox {
  private container: Phaser.GameObjects.Container;
  private content: Phaser.GameObjects.GameObject[] = [];
  private arrow: Phaser.GameObjects.Text;
  private runner?: DialogueRunner;
  private pages: Run[][][] = [];
  private page = 0;
  private waiting = false;
  private onDone?: () => void;

  /** 逐字显示：每个字的文字对象和完整内容；timer 每次多显示一个字 */
  private typing: { obj: Phaser.GameObjects.Text; full: string }[] = [];
  private typed = 0;
  private typeTimer?: Phaser.Time.TimerEvent;
  private L = layout();

  constructor(private scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this.arrow = pixelText(scene, 0, 0, t('cutscene.next'), { color: SETTINGS.ui.text }).setDepth(71).setVisible(false);
    this.relayout();
    scene.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
  }

  /** 按现在的界面大小重新算位置（界面大小变了以后，下一句开始生效） */
  private relayout() {
    this.L = layout();
    const { BOX, scale } = this.L;
    this.container.setScale(scale);
    this.arrow.setScale(scale).setPosition((BOX.x + BOX.w - 12) * scale, (BOX.y + BOX.h - 14) * scale);
  }

  /** 正在播吗 */
  get active() {
    return !!this.runner;
  }

  /** 开始播一段剧本。播完调用 onDone */
  play(knot: string, onDone?: () => void) {
    this.runner = new DialogueRunner(knot);
    this.onDone = onDone;
    this.container.setVisible(true);
    this.nextLine();
  }

  /** 点一下 / 回车：翻页或者下一句 */
  advance() {
    if (!this.runner || this.waiting) return;
    if (this.typeTimer) return this.finishTyping();
    if (this.page < this.pages.length - 1) {
      this.page += 1;
      this.drawPage();
    } else {
      this.nextLine();
    }
  }

  private nextLine() {
    const line = this.runner?.next();
    if (!line) return this.finish();
    this.show(line);
    if (line.tags.input === 'player_name') void this.askPlayerName();
  }

  private async askPlayerName() {
    this.waiting = true;
    this.arrow.setVisible(false);
    const name = await askName(this.scene.game, { title: t('nameInput.title'), initial: gameState.playerName });
    gameState.playerName = name ?? gameState.playerName;
    this.waiting = false;
    this.nextLine();
  }

  /** 显示一句：拆黄字、处理标签、排版 */
  private show(line: DialogueLine) {
    const ui = SETTINGS.ui;
    const narration = !line.speaker;
    const baseColor = narration ? ui.textDim2 : ui.text;
    const runs: Run[] = parseClueMarks(line.text).map((p) => {
      if (p.clue && canGetClue(p.clue)) {
        giveClue(p.clue);
        return { text: p.text, color: ui.clueText, mark: ui.clueMark };
      }
      return { text: p.text, color: baseColor };
    });
    this.applyTags(line);
    if (line.speaker) noteMet(line.speaker); // 第一次说话就算认识（每周总结用）

    // 框、头像、名字
    this.relayout();
    const { BOX, PORTRAIT, TEXT } = this.L;
    this.container.removeAll(true);
    const g = this.scene.add.graphics();
    drawPanel(g, BOX.x, BOX.y, BOX.w, BOX.h);
    this.container.add(g);
    if (line.speaker) {
      const key = `portrait_${line.speaker}`;
      let nameX = BOX.x;
      if (this.scene.textures.exists(key)) {
        const pg = this.scene.add.graphics();
        drawPanel(pg, PORTRAIT.x, PORTRAIT.y, PORTRAIT.size + 4, PORTRAIT.size + 4);
        const frame = MOOD_FRAMES[line.mood ?? 'normal'] ?? 0;
        const frames = this.scene.textures.get(key).frameTotal - 1; // frameTotal 里多算了一张整图
        const img = this.scene.add.image(PORTRAIT.x + 2, PORTRAIT.y + 2, key, frame < frames ? frame : 0).setOrigin(0);
        this.container.add([pg, img]);
        nameX = PORTRAIT.x + PORTRAIT.size + 6;
      }
      const name = line.speaker === 'player' ? gameState.playerName || t('names.playerUnknown') : t(`names.${line.speaker}`);
      const label = pixelText(this.scene, nameX + 5, BOX.y - 14, name, { title: true });
      const ng = this.scene.add.graphics();
      drawPanel(ng, nameX, BOX.y - 17, Math.ceil(label.width) + 10, 18);
      this.container.add([ng, label]);
    }

    // 排版、分页
    const lines = wrapRuns(runs, TEXT.w);
    this.pages = [];
    for (let i = 0; i < lines.length; i += TEXT.lines) this.pages.push(lines.slice(i, i + TEXT.lines));
    if (!this.pages.length) this.pages.push([]);
    this.page = 0;
    this.drawPage(narration);
  }

  private drawPage(narration = false) {
    const { TEXT } = this.L;
    for (const o of this.content) o.destroy();
    const lines = this.pages[this.page];
    this.content = drawLines(this.scene, lines, TEXT.x, TEXT.y, TEXT.lineH, narration ? 'center' : 'left', TEXT.w);
    this.container.add(this.content);
    this.startTyping();
  }

  /** 字一个一个出来（设置里的「文字速度」；「立即」就直接全出来） */
  private startTyping() {
    this.typeTimer?.remove();
    this.typeTimer = undefined;
    this.typing = this.content
      .filter((o): o is Phaser.GameObjects.Text => o instanceof Phaser.GameObjects.Text)
      .map((obj) => ({ obj, full: obj.text }));
    const ms = SETTINGS.textSpeedMs[loadPrefs().textSpeed] ?? 0;
    if (ms <= 0 || !this.typing.length) return this.finishTyping();
    for (const it of this.typing) it.obj.setText('');
    // 黄字底下的深色底块等文字出来再显示
    for (const o of this.content) if (!(o instanceof Phaser.GameObjects.Text)) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible?.(false);
    this.typed = 0;
    this.arrow.setVisible(false);
    const total = this.typing.reduce((n, it) => n + [...it.full].length, 0);
    this.typeTimer = this.scene.time.addEvent({
      delay: ms,
      loop: true,
      callback: () => {
        this.typed += 1;
        let left = this.typed;
        for (const it of this.typing) {
          const chars = [...it.full];
          it.obj.setText(chars.slice(0, Math.max(0, left)).join(''));
          left -= chars.length;
        }
        if (this.typed >= total) this.finishTyping();
      },
    });
  }

  private finishTyping() {
    this.typeTimer?.remove();
    this.typeTimer = undefined;
    for (const it of this.typing) it.obj.setText(it.full);
    for (const o of this.content) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible?.(true);
    this.typing = [];
    this.arrow.setVisible(!this.waiting);
  }

  /** 行尾标签：线索、操作、已学会、给东西、给开局物资 */
  private applyTags(line: DialogueLine) {
    const { clue, learn, learned, give } = line.tags;
    if (give) addItem(give, 1);
    if ('give_start' in line.tags) {
      giveStartKit();
      this.scene.game.events.emit('ui:toolsChanged');
    }
    if (clue) giveClue(clue);
    if (learn) learnControl(learn);
    if (learned) addLearned(learned);
  }

  private finish() {
    this.typeTimer?.remove();
    this.typeTimer = undefined;
    this.typing = [];
    this.runner = undefined;
    this.container.removeAll(true);
    this.content = [];
    this.container.setVisible(false);
    this.arrow.setVisible(false);
    const done = this.onDone;
    this.onDone = undefined;
    done?.();
  }

  destroy() {
    this.container.destroy();
    this.arrow.destroy();
  }
}
