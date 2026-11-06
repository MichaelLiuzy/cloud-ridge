/**
 * 线索笔记本的「主线」：章节、线索、问题
 * ================================================================
 *  这张表以后由故事主编往里填。规则：
 *   - 线索只在它所属的章节开始之后才拿得到。
 *   - 拿到线索 → 笔记本记下线索和主角的推断；它引出的问题记成「未解决」。
 *   - 拿到某个问题的 answeredBy 线索 → 这个问题划掉，变成「已解决」。
 *   - 某章的解锁条件全部满足 → 这一章自动开始。
 *   - 笔记本不会提示「还差几条」「去找谁」。
 *
 *  文字里提到人名时写 @fan、@zhou、@eric 这种（名字在 src/locales/zh.ts 的 names 里，只写一次）。
 *  剧本里用 <<clue:线索id=显示的字>> 把关键句标黄，玩家读到就拿到这条线索。
 *
 *  加新条目时，先把 id 加到下面对应的列表（ChapterId / ClueId / QuestionId），
 *  再在表里写内容。引用了不存在的 id，npm run build 会报错。
 */
import type { LocalName } from './types';

/** 章节 id */
export type ChapterId = 'prologue' | 'who_is_eric';
/** 线索 id */
export type ClueId = 'woke_up' | 'better_forgotten';
/** 问题 id */
export type QuestionId = 'where_am_i' | 'why_better_forgotten';
/** 剧情事件 id（比如看过某段过场）。游戏里用 fireStoryEvent('事件id') 触发 */
export type StoryEventId = 'saw_missing_poster';

export interface Chapter {
  /** 第几章（0 = 序章） */
  number: number;
  name: LocalName;
  /** 解锁条件：要拿到哪些线索、发生过哪些事件，全部满足才开始。都不写 = 开新档就开始 */
  unlock: { clues?: ClueId[]; events?: StoryEventId[] };
}

export interface Clue {
  /** 属于哪一章（这章没开始时拿不到） */
  chapter: ChapterId;
  /** 笔记本里显示的文字 */
  text: LocalName;
  /** 主角的推断（可以不写） */
  inference?: LocalName;
}

export interface Question {
  /** 笔记本里显示的问题 */
  text: LocalName;
  /** 由哪条线索引出 */
  raisedBy: ClueId;
  /** 由哪条线索解答（还没答案就写 null） */
  answeredBy: ClueId | null;
}

/** 章节：按顺序排 */
export const CHAPTERS: Record<ChapterId, Chapter> = {
  prologue: {
    number: 0,
    name: { zh: '序章：醒来', en: 'Prologue: Waking Up' },
    unlock: {},
  },
  who_is_eric: {
    number: 1,
    name: { zh: '第一章：@eric 是谁', en: 'Chapter 1: Who Is @eric' },
    // 第一次去镇上看到寻人启事、播完那段过场
    unlock: { events: ['saw_missing_poster'] },
  },
};

/** 线索（下面是序章的示例数据，让系统能跑通，以后故事主编会替换） */
export const CLUES: Record<ClueId, Clue> = {
  woke_up: {
    chapter: 'prologue',
    text: { zh: '醒来：在医馆醒来，大家都以为我失忆了。', en: '' },
    inference: { zh: '这具身体原来的主人发生了什么？', en: '' },
  },
  better_forgotten: {
    chapter: 'prologue',
    text: { zh: '「不记得了也好」：@fan 说的这句话。', en: '' },
    inference: { zh: '他好像在为我难过，但不想让我想起什么。', en: '' },
  },
};

/** 问题 */
export const QUESTIONS: Record<QuestionId, Question> = {
  where_am_i: {
    text: { zh: '这里是哪里？我为什么会在这儿？', en: '' },
    raisedBy: 'woke_up',
    answeredBy: null,
  },
  why_better_forgotten: {
    text: { zh: '@fan 为什么说「不记得了也好」？', en: '' },
    raisedBy: 'better_forgotten',
    answeredBy: null,
  },
};
