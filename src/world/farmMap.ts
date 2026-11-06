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
 *    L  灯笼（挡路，夜里会亮）
 *
 *  中间被篱笆 # 围起来的就是 15×12 的农田区（数值来自 src/data/start.ts）。
 *  以后正式地图会改用 Tiled 地图编辑器的格式，这份文字地图只是原型用。
 */

export const FARM_MAP: string[] = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T,......................,T',
  'T..HHH......,.........~~.T',
  'T..HHH...............~~~.T',
  'T..LD....,............~..T',
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

/**
 * 每种字符是什么：
 *  kind   程序用的种类名（工具规则在 src/world/actions.ts 里按它判断）
 *  solid  挡不挡路
 *  hint   对着它「查看」时显示哪句话（语言文件 src/locales/zh.ts 里的名字）
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
}

export const TILE_TYPES: Record<string, TileType> = {
  '.': { kind: 'grass', solid: false, hint: 'hint.grass', ground: 'grass' },
  ',': { kind: 'grassDark', solid: false, hint: 'hint.grass', ground: 'grass' },
  'P': { kind: 'grass', solid: false, hint: 'hint.grass', ground: 'grass' },
  '=': { kind: 'path', solid: false, hint: 'hint.path', ground: 'path' },
  'D': { kind: 'path', solid: false, hint: 'hint.hut', ground: 'path' },
  'o': { kind: 'tilled', solid: false, hint: 'hint.tilled', ground: 'tilled' },
  'O': { kind: 'watered', solid: false, hint: 'hint.tilled', ground: 'watered' },
  'T': { kind: 'tree', solid: true, hint: 'hint.tree', ground: 'grass', object: 'prop_tree' },
  '~': { kind: 'water', solid: true, hint: 'hint.water', ground: 'water' },
  '#': { kind: 'fence', solid: true, hint: 'hint.fence', ground: 'fence' },
  'H': { kind: 'hut', solid: true, hint: 'hint.hut', ground: 'dirt' },
  'r': { kind: 'rock', solid: true, hint: 'hint.rock', ground: 'grass', object: 'debris_rock' },
  'g': { kind: 'weed', solid: true, hint: 'hint.weed', ground: 'grass', object: 'debris_weed' },
  's': { kind: 'stump', solid: true, hint: 'hint.stump', ground: 'grass', object: 'debris_stump' },
  'x': { kind: 'fireDebris', solid: true, hint: 'hint.fireDebris', ground: 'grass', object: 'debris_fire' },
  'L': { kind: 'lantern', solid: true, hint: 'hint.lantern', ground: 'grass', object: 'prop_lantern', light: true, fire: true },
};
