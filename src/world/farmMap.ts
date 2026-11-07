/**
 * 农场地图 —— 用文字「画」出来的地图
 * ================================================================
 *  下面每一个字符代表地图上的一格。想改地图，直接改这些字符就行。
 *  每一行的长度要一样，不然地图会歪。
 *
 *  字符对照表：
 *    .  草地（能走）        ,  深色草地（能走，只是装饰）
 *    =  小路（能走）        o  开垦好的田地（能走）
 *    O  浇过水的田（能走，第二天会变回 o）
 *    P  主角出生的位置（那一格是草地）
 *    D  草棚门口（能走）
 *    T  农场边缘的林子（挡路，不能砍，也点不了）   ~  水塘（挡路；拿水桶对着它就能打满水）
 *    y  树苗   u  小树   Y  大树（挡路，用斧头砍；每天会自己长大，也会在空地上自己长出来，见 src/data/trees.ts）
 *    #  篱笆（挡路）        H  草棚（挡路，连在一起的 H 会画成一座房子）
    G  篱笆上的门（能走；现在画成小路的样子，以后美术补门的图）
 *    r  石头（挡路）        g  杂草（挡路）
 *    s  树桩（挡路）        x  火灾残骸（挡路）
 *    L  灯笼（挡路，夜里会亮）
 *    Q  烧毁的老宅（挡路，连在一起的 Q 会画成一整栋烧毁的房子 house_old_ruin）
 *    R  老宅四周的废墟：开新档时随机变成下面三种（比例在 src/data/housing.ts 的 ruins.mix）
 *    w  废墟里的杂草   k  熏黑的碎石   j  烧焦的木头（挡路；和普通的杂草、石头、木头一样处理，清掉后变成地基 _）
 *    _  清干净的老宅地基（能走）
 *    K  重建好的老宅（挡路；第 2 阶段修好后，地基上会自动盖起来，见下面的 HOUSE_SITE）
 *    E  老宅门口（能走）
 *    B  收货筐（挡路；开通杂货铺上门收货后自动出现在 BASKET_CELL）
 *
 *  中间被篱笆 # 围起来的就是 15×12 的农田区（数值来自 src/data/start.ts）。
 *  田有两个门 G：左边小路通进来一个、下面一排篱笆中间一个，都是 2 格宽。
 *  以后正式地图会改用 Tiled 地图编辑器的格式，这份文字地图只是原型用。
 */

import { HOUSING } from '../data/housing';

export const FARM_MAP: string[] = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T,.....RRQQQQRRR........,T',
  'T..HHH.RRQQQQRRR......~~.T',
  'T..HHH.RRQQQQRRR.....~~~.T',
  'T..LD..RRQQQQRRR......~..T',
  'T...=..RRRRRRRRR.........T',
  'T...=.#################..T',
  'T...=.#ooo.....g.....x#..T',
  'T...=.#ooo..r.....g..x#..T',
  'T...=.#.......g.......#,.T',
  'T,..=.#...g......s....#..T',
  'T...==G.......P.......#..T',
  'T....=G..r.........g..#..T',
  'T....=#......g........#..T',
  'T....=#...s.......r...#..T',
  'T....=#.g.........g...#..T',
  'T....=#..........x....#..T',
  'T....=#...............#..T',
  'T....=####GG###########..T',
  'T....=====================',
  'T,.......................T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTT',
];

/**
 * 每种字符是什么：
 *  kind   程序用的种类名（工具规则在 src/world/actions.ts 里按它判断）
 *  solid  挡不挡路
 *  hint   鼠标停在它上面（手机长按、键盘面朝它）时显示的说明（语言文件 src/locales/zh.ts 里的名字）
 *  ground 脚下画哪种地面（名字见 src/config/assets.ts 的 GROUND_TILES）
 *  object 上面再放什么东西（图片名，见 src/config/assets.ts 的 ASSETS）；没有就不写
 *  light  夜里会不会亮（挖出暖色光圈）
 *  fire   是不是火光类（回忆模式里画面去色，只有它保留颜色）
 */
export interface TileType {
  kind: string;
  solid: boolean;
  hint: string;
  ground: string;
  object?: string;
  light?: boolean;
  fire?: boolean;
  /** 是老宅废墟里的东西（清掉后变成地基 _，算清废墟的进度） */
  ruin?: boolean;
}

export const TILE_TYPES: Record<string, TileType> = {
  '.': { kind: 'grass', solid: false, hint: 'hint.grass', ground: 'grass' },
  ',': { kind: 'grassDark', solid: false, hint: 'hint.grass', ground: 'grass' },
  'P': { kind: 'grass', solid: false, hint: 'hint.grass', ground: 'grass' },
  '=': { kind: 'path', solid: false, hint: 'hint.path', ground: 'path' },
  'D': { kind: 'path', solid: false, hint: 'hint.hut', ground: 'path' },
  'o': { kind: 'tilled', solid: false, hint: 'hint.tilled', ground: 'tilled' },
  'O': { kind: 'watered', solid: false, hint: 'hint.tilled', ground: 'watered' },
  'T': { kind: 'forest', solid: true, hint: 'hint.forest', ground: 'grass', object: 'prop_tree' },
  'y': { kind: 'sapling', solid: true, hint: 'hint.sapling', ground: 'grass', object: 'tree_sapling' },
  'u': { kind: 'smallTree', solid: true, hint: 'hint.smallTree', ground: 'grass', object: 'tree_small' },
  'Y': { kind: 'bigTree', solid: true, hint: 'hint.bigTree', ground: 'grass', object: 'tree_big' },
  '~': { kind: 'water', solid: true, hint: 'hint.water', ground: 'water' },
  '#': { kind: 'fence', solid: true, hint: 'hint.fence', ground: 'fence' },
  'G': { kind: 'gate', solid: false, hint: 'hint.gate', ground: 'path' },
  'H': { kind: 'hut', solid: true, hint: 'hint.hut', ground: 'dirt' },
  'r': { kind: 'rock', solid: true, hint: 'hint.rock', ground: 'grass', object: 'debris_rock' },
  'g': { kind: 'weed', solid: true, hint: 'hint.weed', ground: 'grass', object: 'debris_weed' },
  's': { kind: 'stump', solid: true, hint: 'hint.stump', ground: 'grass', object: 'debris_stump' },
  'x': { kind: 'fireDebris', solid: true, hint: 'hint.fireDebris', ground: 'grass', object: 'debris_fire' },
  'Q': { kind: 'ruinHouse', solid: true, hint: 'hint.oldHouse', ground: 'dirt' },
  'w': { kind: 'weed', solid: true, hint: 'hint.ruinWeed', ground: 'dirt', object: 'debris_weed', ruin: true },
  'k': { kind: 'rock', solid: true, hint: 'hint.ruinRock', ground: 'dirt', object: 'debris_rock', ruin: true },
  'j': { kind: 'stump', solid: true, hint: 'hint.ruinWood', ground: 'dirt', object: 'debris_fire', ruin: true },
  '_': { kind: 'site', solid: false, hint: 'hint.site', ground: 'dirt' },
  'K': { kind: 'house', solid: true, hint: 'hint.house', ground: 'dirt' },
  'E': { kind: 'path', solid: false, hint: 'hint.house', ground: 'path' },
  'B': { kind: 'basket', solid: true, hint: 'hint.basket', ground: 'grass', object: 'prop_basket' },
  'L': { kind: 'lantern', solid: true, hint: 'hint.lantern', ground: 'grass', object: 'prop_lantern', light: true, fire: true },
};

/**
 * 老宅：一开始 house 这块是烧毁的老宅（Q），四周的废墟（R）清干净后变成地基（_）；
 * 第 2 阶段修好后，house 这块（左上角 x, y，宽 w、高 h，单位：格）换成新房子（K），door 那一格是门口（E）。
 * 房子的图按 house 这块的底边居中画，屋顶可以往上伸出去。
 */
export const HOUSE_SITE = {
  house: { x: 9, y: 1, w: 4, h: 4 },
  door: { x: 10, y: 5 },
};

/** 收货筐放在哪一格（开通上门收货后出现） */
export const BASKET_CELL = { x: 6, y: 4 };

/** 地图上一共有几格废墟 */
export const RUIN_TILES = FARM_MAP.reduce((n, row) => n + [...row].filter((ch) => ch === 'R').length, 0);

/** 把地图里的 R（废墟）按 housing.ts 的 ruins.mix 随机换成杂草 w、碎石 k、焦木 j（开新档、读旧存档时用一次） */
export function scatterRuins(rows: string[], rand = Math.random): string[] {
  const { weed, rock } = HOUSING.ruins.mix;
  const pick = () => {
    const r = rand();
    return r < weed ? 'w' : r < weed + rock ? 'k' : 'j';
  };
  return rows.map((row) => row.replace(/R/g, pick));
}
