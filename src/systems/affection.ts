/**
 * 好感度（数值在 src/data/affection.ts）：按点数记，每 100 点算 1 颗心，最多 10 颗心。
 * 好感度怎么涨（聊天、送礼、做任务各加多少）还没定，以后都调用 addAffection。
 */
import { AFFECTION } from '../data/affection';
import type { NpcId } from '../data/types';
import { gameState } from './GameState';

const MAX_POINTS = AFFECTION.pointsPerHeart * AFFECTION.maxHearts;

/** 现在多少点 */
export function affectionOf(npc: NpcId): number {
  return gameState.affection[npc] ?? 0;
}

/** 现在几颗心（不满一颗不算） */
export function heartsOf(npc: NpcId): number {
  return Math.min(AFFECTION.maxHearts, Math.floor(affectionOf(npc) / AFFECTION.pointsPerHeart));
}

/** 加（或减）好感度点数，限制在 0 ~ 上限之间。以后聊天、送礼、做任务都走这里 */
export function addAffection(npc: NpcId, points: number) {
  gameState.affection[npc] = Math.max(0, Math.min(MAX_POINTS, affectionOf(npc) + points));
}

/** （测试用）直接设成多少点 */
export function debugSetAffection(npc: NpcId, points: number) {
  addAffection(npc, points - affectionOf(npc));
}
