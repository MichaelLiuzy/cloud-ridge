/**
 * 好感度（还在讨论，规则以后再定）。
 * 现在只留一个接口：heartsOf(谁) 返回几颗心。存的是 gameState.affection 里的数，
 * 暂时把这个数直接当作「几颗心」。以后定了加减规则（比如几点算一颗心），只改这里。
 */
import type { NpcId } from '../data/types';
import { gameState } from './GameState';

export function heartsOf(npc: NpcId): number {
  return gameState.affection[npc] ?? 0;
}

/** （测试用）直接设成几颗心 */
export function debugSetHearts(npc: NpcId, hearts: number) {
  gameState.affection[npc] = hearts;
}
