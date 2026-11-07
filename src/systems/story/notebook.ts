/**
 * 线索笔记本的规则（数据在 src/data/clues.ts）：
 *  - 线索只在它所属的章节开始之后才拿得到；
 *  - 拿到线索 → 记下；它引出的问题变成「未解决」；拿到答案线索 → 问题「已解决」；
 *  - 某章的解锁条件全满足 → 自动开始这一章。
 * 游戏状态（gameState）是唯一的数据来源，剧本（ink）只读。
 */
import { noteClue } from '../weekStats';
import Phaser from 'phaser';
import { CHAPTERS, CLUES, QUESTIONS, type ChapterId, type ClueId, type QuestionId, type StoryEventId } from '../../data/clues';
import { gameState } from '../GameState';
import { hasItem } from '../inventory';

/** 笔记本有新内容、新章节开始时发出的消息（界面听这个来闪图标、显示提示） */
export const storyEvents = new Phaser.Events.EventEmitter();
export const STORY_EVENTS = {
  /** 笔记本有新内容（参数：线索 id 或 null） */
  notebookNew: 'notebook:new',
  /** 新的一章开始了（参数：章节 id） */
  chapterStart: 'chapter:start',
} as const;

/** 章节按编号排好 */
export function chaptersInOrder(): ChapterId[] {
  return (Object.keys(CHAPTERS) as ChapterId[]).sort((a, b) => CHAPTERS[a].number - CHAPTERS[b].number);
}

/** 这一章开始了没有 */
export function chapterStarted(id: ChapterId) {
  return CHAPTERS[id].number <= gameState.chapter;
}

export function hasClue(id: string) {
  return gameState.clues.includes(id);
}

/** 这条线索现在能不能拿：存在、所属章节已开始、还没拿过 */
export function canGetClue(id: string): id is ClueId {
  const clue = CLUES[id as ClueId];
  if (!clue) {
    console.warn(`剧本里用了不存在的线索 id：${id}（线索表在 src/data/clues.ts）`);
    return false;
  }
  return chapterStarted(clue.chapter) && !hasClue(id);
}

/** 给玩家一条线索。拿到了返回 true */
export function giveClue(id: string): boolean {
  if (!canGetClue(id)) return false;
  gameState.clues.push(id);
  noteClue();
  notifyNew(id);
  checkChapters();
  return true;
}

/** 发生了一个剧情事件（比如看完寻人启事的过场） */
export function fireStoryEvent(id: StoryEventId) {
  gameState.flags[`event:${id}`] = true;
  checkChapters();
}

export function eventHappened(id: StoryEventId) {
  return gameState.flags[`event:${id}`] === true;
}

/** 看看下一章的条件满足了没有，满足就开始（可能连着开好几章） */
export function checkChapters() {
  for (const id of chaptersInOrder()) {
    const ch = CHAPTERS[id];
    if (ch.number !== gameState.chapter + 1) continue;
    const cluesOk = (ch.unlock.clues ?? []).every((c) => hasClue(c));
    const eventsOk = (ch.unlock.events ?? []).every((e) => eventHappened(e));
    if (!cluesOk || !eventsOk) return;
    gameState.chapter = ch.number;
    storyEvents.emit(STORY_EVENTS.chapterStart, id);
    notifyNew(null);
  }
}

/** （测试用）不管条件，直接进入下一章 */
export function debugNextChapter() {
  const next = chaptersInOrder().find((id) => CHAPTERS[id].number === gameState.chapter + 1);
  if (!next) return;
  gameState.chapter += 1;
  storyEvents.emit(STORY_EVENTS.chapterStart, next);
  notifyNew(null);
}

/** 问题现在的状态：hidden = 还没被引出；open = 未解决；solved = 已解决 */
export function questionState(id: QuestionId): 'hidden' | 'open' | 'solved' {
  const q = QUESTIONS[id];
  if (!hasClue(q.raisedBy)) return 'hidden';
  return q.answeredBy && hasClue(q.answeredBy) ? 'solved' : 'open';
}

/** 记进「操作」栏 */
export function learnControl(id: string) {
  if (gameState.notebook.controls.includes(id)) return;
  gameState.notebook.controls.push(id);
  notifyNew(null);
}

/** 记进「已学会」栏 */
export function addLearned(id: string) {
  if (gameState.notebook.learned.includes(id)) return;
  gameState.notebook.learned.push(id);
  notifyNew(null);
}

function notifyNew(clue: string | null) {
  if (hasItem('notebook')) storyEvents.emit(STORY_EVENTS.notebookNew, clue);
}
