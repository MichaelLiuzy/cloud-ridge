/**
 * 重建老宅（数值在 src/data/housing.ts）：
 *  1. 自己清废墟：地图上的 R 一格格清掉，清完 = 第 1 阶段完成；
 *  2~4. 请木匠来修：付材料和钱，动工 buildDays 天，每天早上算一次。
 * 每个阶段修好：体力上限变化、学会新本事、找到一片日记。
 * 日记碎片：所属章节还没开始时是「烧焦的纸片」，章节开始后自动变成线索。
 */
import { HOUSING } from '../../data/housing';
import { DIARY_PAGES } from '../../data/diary';
import { CLUES } from '../../data/clues';
import { RUIN_TILES } from '../../world/farmMap';
import { addItem, gameState } from '../GameState';
import { addLearned, chapterStarted, giveClue, hasClue, storyEvents, STORY_EVENTS } from '../story/notebook';

const PAPER = 'burnt_paper';

/** 某一阶段的数据 */
export function stageInfo(stage: number) {
  return HOUSING.stages.find((s) => s.stage === stage);
}

/** 现在住的地方的数据（草棚，或者修到第几阶段的老宅） */
export function dwelling() {
  return gameState.houseStage >= 2 ? stageInfo(gameState.houseStage)! : HOUSING.hut;
}

/** 清掉了一格废墟。清完最后一格时第 1 阶段完成，返回找到的东西 */
export function ruinCleared() {
  gameState.ruinsCleared = Math.min(RUIN_TILES, gameState.ruinsCleared + 1);
  if (gameState.ruinsCleared >= RUIN_TILES && gameState.houseStage < 1) return completeStage(1);
  return null;
}

/** 请木匠修下一阶段：材料、钱够就扣掉并动工。返回 null = 成功，否则是不能修的原因（语言文件的名字） */
export function requestBuild(): string | null {
  if (gameState.build) return 'house.busy';
  const next = stageInfo(gameState.houseStage + 1);
  if (!next) return 'house.allDone';
  if (!next.byCarpenter) return 'house.clearFirst';
  const lacking = Object.entries(next.materials).some(([id, n]) => (gameState.inventory[id] ?? 0) < (n ?? 0));
  if (lacking || gameState.cash < next.cost) return 'house.notEnough';
  for (const [id, n] of Object.entries(next.materials)) addItem(id, -(n ?? 0));
  gameState.cash -= next.cost;
  gameState.build = { stage: next.stage, daysLeft: HOUSING.buildDays };
  return null;
}

/** 新的一天早上：木匠的活干了一天。修好了就返回这一阶段的结果 */
export function buildOvernight() {
  const b = gameState.build;
  if (!b) return null;
  b.daysLeft -= 1;
  if (b.daysLeft > 0) return null;
  gameState.build = null;
  return completeStage(b.stage);
}

/** 某阶段修好了：体力上限、学会的本事、日记碎片 */
function completeStage(stage: number) {
  const info = stageInfo(stage)!;
  gameState.houseStage = stage;
  gameState.maxStamina = Math.max(gameState.maxStamina, info.maxStamina);
  for (const id of info.learns) addLearned(id);
  const page = findDiary(stage);
  return { stage, page };
}

/** 修到这一阶段时找到日记。返回在哪找到的、能不能读 */
function findDiary(stage: number) {
  const page = DIARY_PAGES.find((p) => p.stage === stage);
  if (!page || gameState.diaryFound.includes(stage)) return null;
  gameState.diaryFound.push(stage);
  if (chapterStarted(CLUES[page.clue].chapter)) {
    giveClue(page.clue);
    return { where: page.where, readable: true };
  }
  addItem(PAPER, 1);
  return { where: page.where, readable: false };
}

/** 新的章节开始了：之前捡到的纸片里，属于已开始章节的那几张变成能读的线索 */
export function refreshDiary() {
  for (const stage of gameState.diaryFound) {
    const page = DIARY_PAGES.find((p) => p.stage === stage);
    if (!page || hasClue(page.clue) || !chapterStarted(CLUES[page.clue].chapter)) continue;
    if (giveClue(page.clue)) addItem(PAPER, -1);
  }
}
storyEvents.on(STORY_EVENTS.chapterStart, refreshDiary);
