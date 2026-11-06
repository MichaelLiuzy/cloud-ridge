/**
 * 剧本播放器：把 ink 剧本一句一句读出来。
 *  - 剧本放在 src/story/<语言>/ 下，打包时编译（写错了打包会报错）。
 *  - 游戏状态是唯一的数据来源：每读一句之前，把名字等变量从游戏传给剧本，剧本只读。
 */
import { Story } from 'inkjs';
import prologueZh from './zh/prologue.ink';
import { getLanguage } from '../locales/i18n';
import { gameState } from '../systems/GameState';
import { isTouchDevice } from '../input/Controls';

/** 每种语言有哪些剧本文件（加新剧本时在这里加一项） */
const SCRIPTS: Record<string, string[]> = {
  zh: [prologueZh],
};

/** 读出来的一句 */
export interface DialogueLine {
  /** 原文（可能带 <<clue:...>> 和 @名字） */
  text: string;
  /** 谁说的（names 里的 id）；没有 = 旁白 */
  speaker?: string;
  /** 语气 */
  mood?: string;
  /** 其他标签：input、clue、learn、learned、give…… */
  tags: Record<string, string>;
}

export class DialogueRunner {
  private story: Story;

  /** knot = 剧本里 === 名字 === 那一段 */
  constructor(knot: string) {
    const files = SCRIPTS[getLanguage()] ?? SCRIPTS.zh;
    for (const json of files) {
      const story = new Story(json);
      try {
        story.ChoosePathString(knot);
        this.story = story;
        return;
      } catch {
        // 不在这个文件里，找下一个
      }
    }
    throw new Error(`剧本里找不到这一段：${knot}`);
  }

  /** 把游戏里的数据传给剧本 */
  private syncVariables() {
    const vars = this.story.variablesState;
    vars['player_name'] = gameState.playerName;
    vars['is_touch'] = isTouchDevice();
  }

  /** 下一句；没有了返回 null */
  next(): DialogueLine | null {
    this.syncVariables();
    while (this.story.canContinue) {
      const text = (this.story.Continue() ?? '').trim();
      const tags: Record<string, string> = {};
      for (const tag of this.story.currentTags ?? []) {
        const [k, ...rest] = tag.split(':');
        tags[k.trim()] = rest.join(':').trim();
      }
      if (!text && Object.keys(tags).length === 0) continue;
      return { text, speaker: tags.speaker, mood: tags.mood, tags };
    }
    return null;
  }
}
