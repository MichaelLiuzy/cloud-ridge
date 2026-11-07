/**
 * 农场里自己长的树（数值在 src/data/trees.ts）：每天早上先让已有的树长大，再看要不要长出一棵新的。
 * 树记在农场地图上：y 树苗、u 小树、Y 大树。玩家自己种的记在 gameState.plantedTrees（不算进自然树的上限）。
 */
import { TREES } from '../../data/trees';
import { gameState } from '../GameState';

export const TREE_CHARS = { sapling: 'y', small: 'u', big: 'Y' } as const;
const TREE_SET = new Set<string>(Object.values(TREE_CHARS));

/** 能长新树的空地：草地，而且四周没有路、门、田、房子（不挡路） */
function isOpenGround(grid: string[][], x: number, y: number) {
  if (grid[y]?.[x] !== '.' && grid[y]?.[x] !== ',') return false;
  const near = [grid[y - 1]?.[x], grid[y + 1]?.[x], grid[y]?.[x - 1], grid[y]?.[x + 1]];
  return near.every((c) => c !== undefined && '.,TyuYrgsx#~'.includes(c));
}

/**
 * 过一夜：返回要改的格子（x, y, 新字符）。冻土期什么都不做。
 * avoid = 不能长树的格子（主角站的地方）
 */
export function treesOvernight(grid: string[][], frozen: boolean, avoid: { x: number; y: number }, rand = Math.random) {
  const changes: { x: number; y: number; ch: string }[] = [];
  if (frozen) return changes;
  let wild = 0;
  grid.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (!TREE_SET.has(ch)) return;
      if (!gameState.plantedTrees.includes(`${x},${y}`)) wild++;
      if (ch === TREE_CHARS.sapling && rand() < TREES.grow.sapling) changes.push({ x, y, ch: TREE_CHARS.small });
      else if (ch === TREE_CHARS.small && rand() < TREES.grow.small) changes.push({ x, y, ch: TREE_CHARS.big });
    }),
  );
  if (wild >= TREES.maxWild || rand() >= TREES.spawnChance) return changes;
  const spots: { x: number; y: number }[] = [];
  grid.forEach((row, y) => row.forEach((_, x) => isOpenGround(grid, x, y) && !(x === avoid.x && y === avoid.y) && spots.push({ x, y })));
  if (!spots.length) return changes;
  const at = spots[Math.floor(rand() * spots.length)];
  const s = TREES.spawnStage;
  const r = rand();
  changes.push({ ...at, ch: r < s.sapling ? TREE_CHARS.sapling : r < s.sapling + s.small ? TREE_CHARS.small : TREE_CHARS.big });
  return changes;
}
