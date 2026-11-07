/**
 * 农场里自己长的东西（数值在 src/data/trees.ts）：
 *  - 树：每天早上先让已有的树长大，再看要不要长出一棵新的（篱笆里外的空地都行）。
 *    树记在农场地图上：y 树苗、u 小树、Y 大树。玩家自己种的记在 gameState.plantedTrees（不算进自然树的上限）。
 *  - 田里的杂物：每周一早上整体重新摆一次（reshuffleDebris）。
 */
import { FIELD_DEBRIS, TREES } from '../../data/trees';
import { FARM_FIELD, FARM_MAP } from '../../world/farmMap';
import { gameState } from '../GameState';
import { cellKey } from '../pathfind';

export const TREE_CHARS = { sapling: 'y', small: 'u', big: 'Y' } as const;
const TREE_SET = new Set<string>(Object.values(TREE_CHARS));

/** 上下左右四格的地图字符（出了地图是 undefined） */
function neighbors(grid: string[][], x: number, y: number) {
  return [grid[y - 1]?.[x], grid[y + 1]?.[x], grid[y]?.[x - 1], grid[y]?.[x + 1]];
}

/** 能长新树的空地：草地、没种东西，而且四周没有路、门、田、房子、废墟（不挡路） */
function isOpenGround(grid: string[][], x: number, y: number) {
  if ((grid[y]?.[x] !== '.' && grid[y]?.[x] !== ',') || gameState.crops[cellKey({ x, y })]) return false;
  const near = neighbors(grid, x, y);
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
      if (!gameState.plantedTrees.includes(cellKey({ x, y }))) wild++;
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

/** 田里的杂物：杂草 g、石头 r、树桩 s、焦木 x */
const DEBRIS = ['g', 'r', 's', 'x'];
/** 在不在农场田区里（固定范围，见 farmMap.ts 的 FARM_FIELD；拆了栅栏也不变） */
const inField = (x: number, y: number) => x >= FARM_FIELD.x0 && x <= FARM_FIELD.x1 && y >= FARM_FIELD.y0 && y <= FARM_FIELD.y1;
const countIn = (rows: ArrayLike<string>[], ch: string) =>
  rows.reduce((n, row, y) => n + Array.from(row).filter((c, x) => c === ch && inField(x, y)).length, 0);

/**
 * 每周一早上：田里的杂物全部拿掉，再按开新档时每种的数量（FIELD_DEBRIS.keepCount）随机摆到田里的空地上。
 * 空地 = 草地、没种东西、不是主角站的格子、不挨着门；放不下就能放多少放多少。返回要改的格子。
 */
export function reshuffleDebris(grid: string[][], avoid: { x: number; y: number }, rand = Math.random) {
  const want = DEBRIS.map((ch) => [ch, countIn(FIELD_DEBRIS.keepCount ? FARM_MAP : grid, ch)] as const);
  const changes: { x: number; y: number; ch: string }[] = [];
  const spots: { x: number; y: number }[] = [];
  grid.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (!inField(x, y)) return;
      const was = DEBRIS.includes(ch);
      if (was) changes.push({ x, y, ch: '.' });
      const ground = was || ch === '.' || ch === ',';
      const nearGate = neighbors(grid, x, y).includes('G');
      if (ground && !nearGate && !gameState.crops[cellKey({ x, y })] && !(x === avoid.x && y === avoid.y)) spots.push({ x, y });
    }),
  );
  for (const [ch, n] of want) {
    for (let i = 0; i < n && spots.length; i++) {
      const at = spots.splice(Math.floor(rand() * spots.length), 1)[0];
      changes.push({ ...at, ch });
    }
  }
  return changes;
}
