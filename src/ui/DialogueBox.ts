/**
 * 剧情对话框：播一段 ink 剧本。
 *  - 有说话人：左上方显示头像（64×64，没图时是色块），框上方显示名字。
 *  - 旁白：不显示名字和头像，字用另一种颜色。
 *  - 黄字：<<clue:id=字>>，这条线索能拿时标黄并给线索；不能拿时按普通字显示。
 *  - 一句太长时分几页，点一下翻一页。
 * 位置和颜色按 320×180 的画面排，颜色在 src/config/settings.ts 的 ui 里。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { MOOD_FRAMES } from '../config/assets';
import { t } from '../locales/i18n';
import { DialogueRunner, type DialogueLine } from '../story/runner';
import { parseClueMarks } from '../story/text';
import { addItem, gameState, giveStartKit } from '../systems/GameState';
import { addLearned, canGetClue, giveClue, learnControl } from '../systems/story/notebook';
import { askName } from './nameInput';
import { drawPanel, pixelText } from './pixelUi';
import { drawLines, wrapRuns, type Run } from './richText';

const BOX = { x: 4, y: 124, w: 312, h: 52 };
const TEXT = { x: 11, y: 129, w: 298, lineH: 14, lines: 3 };
const PORTRAIT = { x: 4, y: 54, size: 64 };

export class DialogueBox {
  private container: Phaser.GameObjects.Container;
  private content: Phaser.GameObjects.GameObject[] = [];
  private arrow: Phaser.GameObjects.Text;
  private runner?: DialogueRunner;
  private pages: Run[][][] = [];
  private page = 0;
  private waiting = false;
  private onDone?: () => void;

  constructor(private scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this.arrow = pixelText(scene, BOX.x + BOX.w - 12, BOX.y + BOX.h - 14, t('cutscene.next'), { color: SETTINGS.ui.text }).setDepth(71).setVisible(false);
    scene.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
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

    // 框、头像、名字
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
      const label = pixelText(this.scene, nameX + 5, BOX.y - 14, name);
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
    for (const o of this.content) o.destroy();
    const lines = this.pages[this.page];
    this.content = drawLines(this.scene, lines, TEXT.x, TEXT.y, TEXT.lineH, narration ? 'center' : 'left', TEXT.w);
    this.container.add(this.content);
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
