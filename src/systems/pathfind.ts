/**
 * 找路：点了远处的东西时，算出一条绕开树、石头、篱笆的路。
 * 用的是最简单的「一圈一圈往外找」（广度优先搜索），只走上下左右。
 */
export interface Cell {
  x: number;
  y: number;
}

/**
 * 从 start 走到 goals 里任意一格，返回要经过的格子（不含起点）。
 * 走不到返回 null；已经站在目标上返回空数组。
 */
export function findPath(start: Cell, goals: Cell[], walkable: (c: Cell) => boolean, maxSteps = 4000): Cell[] | null {
  const key = (c: Cell) => `${c.x},${c.y}`;
  const goalSet = new Set(goals.filter(walkable).map(key));
  if (goalSet.size === 0) return null;
  if (goalSet.has(key(start))) return [];
  const prev = new Map<string, Cell | null>([[key(start), null]]);
  const queue: Cell[] = [start];
  let steps = 0;
  while (queue.length && steps++ < maxSteps) {
    const cur = queue.shift()!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      const k = key(n);
      if (prev.has(k) || !walkable(n)) continue;
      prev.set(k, cur);
      if (goalSet.has(k)) {
        const path: Cell[] = [n];
        let p = cur;
        while (key(p) !== key(start)) {
          path.unshift(p);
          p = prev.get(key(p))!;
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}
