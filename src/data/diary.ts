/**
 * 老宅里的日记碎片：重建老宅的第几阶段修好时，在哪里找到哪一页。
 * ================================================================
 *  clue  = 这一页是哪条线索（内容在 src/data/clues.ts，所属章节也看那里）
 *  stage = 修房第几阶段修好时找到（阶段见 src/data/housing.ts）
 *  where = 在哪找到的（文字在 src/locales/zh.ts 的 diary.where）
 *
 *  找到时，这条线索所属的章节还没开始：只是一张「烧焦的纸片」放进背包，不算拿到线索。
 *  等那一章开始，自动变成能读的线索，笔记本图标闪一下。
 */
import type { ClueId } from './clues';

export const DIARY_PAGES: { clue: ClueId; stage: number; where: string }[] = [
  { clue: 'diary_soldiers', stage: 1, where: 'diary.where.bed' },
  { clue: 'diary_wants_to_flee', stage: 2, where: 'diary.where.stove' },
  { clue: 'diary_backhill', stage: 3, where: 'diary.where.beam' },
  { clue: 'last_diary_page', stage: 4, where: 'diary.where.backdoor' },
];
