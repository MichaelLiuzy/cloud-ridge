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
 *    T  树（挡路）          ~  水塘（挡路）
 *    #  篱笆（挡路）        H  草棚（挡路，连在一起的 H 会画成一座房子）
 *    r  石头（挡路）        g  杂草（挡路）
 *    s  树桩（挡路）        x  火灾残骸（挡路）
 *
 *  中间被篱笆 # 围起来的就是 15×12 的农田区（数值来自 src/data/start.ts）。
 *  以后正式地图会改用 Tiled 地图编辑器的格式，这份文字地图只是原型用。
 */

export const FARM_MAP: string[] = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T,......................,T',
  'T..HHH......,.........~~.T',
  'T..HHH...............~~~.T',
  'T...D....,............~..T',
  'T...=....................T',
  'T...=.#################..T',
  'T...=.#ooo.....g.....x#..T',
  'T...=.#ooo..r.....g..x#..T',
  'T...=.#.......g.......#,.T',
  'T,..=.#...g......s....#..T',
  'T...==#.......P.......#..T',
  'T....=#..r.........g..#..T',
  'T....=#......g........#..T',
  'T....=#...s.......r...#..T',
  'T....=#.g.........g...#..T',
  'T....=#..........x....#..T',
  'T....=#...............#..T',
  'T....=####=############..T',
  'T....=====================',
  'T,.......................T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTT',
];

/** 每种字符是什么地块、能不能走、对着它按「使用」显示哪句话（语言文件里的名字） */
export const TILE_TYPES: Record<string, { kind: string; solid: boolean; hint: string }> = {
  '.': { kind: 'grass', solid: false, hint: 'hint.grass' },
  ',': { kind: 'grassDark', solid: false, hint: 'hint.grass' },
  'P': { kind: 'grass', solid: false, hint: 'hint.grass' },
  '=': { kind: 'path', solid: false, hint: 'hint.path' },
  'D': { kind: 'path', solid: false, hint: 'hint.hut' },
  'o': { kind: 'tilled', solid: false, hint: 'hint.tilled' },
  'O': { kind: 'watered', solid: false, hint: 'hint.tilled' },
  'T': { kind: 'tree', solid: true, hint: 'hint.tree' },
  '~': { kind: 'water', solid: true, hint: 'hint.water' },
  '#': { kind: 'fence', solid: true, hint: 'hint.fence' },
  'H': { kind: 'hut', solid: true, hint: 'hint.hut' },
  'r': { kind: 'rock', solid: true, hint: 'hint.rock' },
  'g': { kind: 'weed', solid: true, hint: 'hint.weed' },
  's': { kind: 'stump', solid: true, hint: 'hint.stump' },
  'x': { kind: 'fireDebris', solid: true, hint: 'hint.fireDebris' },
};
