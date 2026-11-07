/**
 * 找路：点了远处的东西时，算出一条绕开树、石头、篱笆的路。
 * 用的是最简单的「一圈一圈往外找」（广度优先搜索），只走上下左右。
 * 点到走不到的地方（水塘中央、栅栏那边）时，用 findPathNear 走到离它最近、能走到的格子。
 */
import { SETTINGS } from '../config/settings';
export interface Cell {
  x: number;
  y: number;
}

/** 作物、树、收货筐、掉落物按「x,y」记格子 */
export function cellKey(c: Cell) {
  return `${c.x},${c.y}`;
}

/** 「x,y」→ 格子 */
export function parseCellKey(key: string): Cell {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

/**
 * 从 start 一圈一圈往外找能走的格子（最多看 maxSteps 格），记下每格是从哪一格走来的。
 * order 按走到的先后排（也就是路程从近到远）；stop(格子) 为 true 就停下，那一格是 hit。
 */
function search(start: Cell, walkable: (c: Cell) => boolean, maxSteps: number, stop?: (c: Cell) => boolean) {
  const prev = new Map<string, Cell | null>([[cellKey(start), null]]);
  const order: Cell[] = [start];
  let hit = stop?.(start) ? start : null;
  for (let i = 0; i < order.length && i < maxSteps && !hit; i++) {
    const cur = order[i];
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      if (prev.has(cellKey(n)) || !walkable(n)) continue;
      prev.set(cellKey(n), cur);
      order.push(n);
      if (stop?.(n)) {
        hit = n;
        break;
      }
    }
  }
  return { prev, order, hit };
}

/** 顺着 prev 倒推出从起点走到 end 要经过的格子（不含起点） */
function pathTo(prev: Map<string, Cell | null>, end: Cell) {
  const path: Cell[] = [];
  for (let p = end, from = prev.get(cellKey(p)); from; p = from, from = prev.get(cellKey(p))) path.unshift(p);
  return path;
}

/**
 * 从 start 走到 goals 里任意一格，返回要经过的格子（不含起点）。
 * 走不到返回 null；已经站在目标上返回空数组。最多看几格在 settings.ts 的 pathMaxSteps。
 */
export function findPath(start: Cell, goals: Cell[], walkable: (c: Cell) => boolean): Cell[] | null {
  const goalSet = new Set(goals.filter(walkable).map(cellKey));
  if (goalSet.size === 0) return null;
  const { prev, hit } = search(start, walkable, SETTINGS.pathMaxSteps, (c) => goalSet.has(cellKey(c)));
  return hit ? pathTo(prev, hit) : null;
}

/**
 * 去不到 target 时用：找离它最近（按直线距离）、又能走到的一格，距离一样就选路程短的。
 * 返回去那一格的路（原地就是最近的话是空数组）。
 */
export function findPathNear(start: Cell, target: Cell, walkable: (c: Cell) => boolean): Cell[] {
  const { prev, order } = search(start, walkable, SETTINGS.pathMaxSteps);
  const dist = (c: Cell) => Math.hypot(c.x - target.x, c.y - target.y);
  // order 是按路程从近到远排的，只在「更近」时才换，所以距离一样时留下的是路程短的
  let best = order[0];
  for (const c of order) if (dist(c) < dist(best)) best = c;
  return pathTo(prev, best);
}
