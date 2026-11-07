/**
 * 素材清单：游戏用到哪些图、每张多大、缺图时用什么颜色的色块代替。
 * ================================================================
 *  图片由整理脚本（npm run art）从 art_raw/ 生成，放在 public/assets/ 里。
 *  游戏启动时先找真图；找不到的，就按这里写的大小和颜色画一个占位色块。
 *  所以没有图也能玩，图到了自动换上，不用改代码。
 *
 *  颜色写调色板里的名字（见 src/config/palette.json），例如 'leaf' 是草绿。
 *  shape 是占位色块的样子（只是为了占位时好认）：
 *    full = 整格填满；object = 地上的小东西（留点边）；char = 人物（头 + 身子，带一个点表示朝向）；
 *    tree = 树（树冠 + 树干）；lantern = 灯笼（杆子 + 灯）；building = 房子（墙 + 屋顶 + 门）；icon = 图标
 *    crop = 作物（5 格：种子、幼苗、半大、成熟、枯萎，一格比一格高）
 */
import type { PaletteName } from './palette';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';

export interface AssetSpec {
  /** 每格宽、高（像素） */
  w: number;
  h: number;
  /** 每格叫什么（顺序和 tools/art_rules.json 一样）。单张图写一个名字就行 */
  frames: string[];
  /** 占位色块的颜色：一个颜色 = 每格都用它；一串 = 每格各用各的 */
  color: PaletteName | PaletteName[];
  shape: 'full' | 'object' | 'char' | 'tree' | 'lantern' | 'building' | 'icon' | 'portrait' | 'cg' | 'crop';
}

const DIRS = ['down', 'left', 'right', 'up'];
/** 头像四格：平常、笑、担忧、惊讶（和 tools/art_rules.json 的 portrait_ 一样） */
const MOODS = ['normal', 'smile', 'worried', 'surprised'];
/** 剧情画面 320×180 */
const cg = (color: PaletteName): AssetSpec => ({ w: 320, h: 180, frames: ['main'], color, shape: 'cg' });

export const ASSETS: Record<string, AssetSpec> = {
  // ---- 人物 ----
  /** 主角站立：下、左、右、上 */
  player_stand: { w: 16, h: 32, frames: DIRS, color: 'leaf', shape: 'char' },

  /** 周里正站立（序章在农场里教操作） */
  npc_zhou_stand: { w: 16, h: 32, frames: DIRS, color: 'indigo', shape: 'char' },
  npc_doctor_stand: { w: 16, h: 32, frames: DIRS, color: 'vermilion', shape: 'char' },
  npc_fan_stand: { w: 16, h: 32, frames: DIRS, color: 'ochre', shape: 'char' },
  /** 杂货铺掌柜（上门收货的剧情里说话） */
  npc_qian_stand: { w: 16, h: 32, frames: DIRS, color: 'ochreLight', shape: 'char' },
  /** Eric（先登记，暂时不用） */
  npc_eric_stand: { w: 16, h: 32, frames: DIRS, color: 'indigo', shape: 'char' },

  // ---- 头像 64×64：平常、笑、担忧、惊讶 ----
  portrait_player: { w: 64, h: 64, frames: MOODS, color: 'leaf', shape: 'portrait' },
  portrait_zhou: { w: 64, h: 64, frames: MOODS, color: 'indigo', shape: 'portrait' },
  portrait_doctor: { w: 64, h: 64, frames: MOODS, color: 'mist', shape: 'portrait' },
  portrait_fan: { w: 64, h: 64, frames: MOODS, color: 'ochre', shape: 'portrait' },
  portrait_qian: { w: 64, h: 64, frames: MOODS, color: 'ochreLight', shape: 'portrait' },
  /** Eric 的头像（先登记，暂时不用） */
  portrait_eric: { w: 64, h: 64, frames: MOODS, color: 'indigo', shape: 'portrait' },

  // ---- 剧情画面 320×180（开场过场；没图时是色块加说明） ----
  cg_office: cg('stone'),
  cg_walk_home: cg('pine'),
  cg_penn_station: cg('outline'),
  cg_headlights: cg('paper'),
  cg_hospital_bed: cg('mist'),
  cg_clinic_wake: cg('ochreLight'),
  /** 标题画面背景（没图时标题画面保持纯色底，不画色块） */
  cg_title: cg('ink'),
  /** 读信界面的信纸（256×160；没图时用浅色底加细边框，不画色块） */
  ui_letter: { w: 256, h: 160, frames: ['main'], color: 'paper', shape: 'cg' },

  // ---- 地面 ----
  /** 农田地面：草地、黄土、锄过的地、浇过水的地、小路、篱笆 */
  tiles_farm: {
    w: 16, h: 16,
    frames: ['grass', 'dirt', 'tilled', 'watered', 'path', 'fence'],
    color: ['leaf', 'ochreLight', 'ochre', 'brown', 'paperDark', 'brownDark'],
    shape: 'full',
  },
  /** 水塘：平静水面、带波光的水面（两格轮流换，间隔在 settings.ts 的 waterShimmerMs） */
  tiles_water: { w: 16, h: 16, frames: ['water', 'water_shimmer'], color: 'indigo', shape: 'full' },

  // ---- 地上的东西 ----
  debris_weed: { w: 16, h: 16, frames: ['main'], color: 'leafDark', shape: 'object' },
  debris_rock: { w: 16, h: 16, frames: ['main'], color: 'stone', shape: 'object' },
  debris_stump: { w: 16, h: 16, frames: ['main'], color: 'ochre', shape: 'object' },
  debris_fire: { w: 16, h: 16, frames: ['main'], color: 'ink', shape: 'object' },
  /** 门口的收货筐（开通杂货铺上门收货后出现） */
  prop_basket: { w: 16, h: 16, frames: ['main'], color: 'ochre', shape: 'object' },
  /** 田地篱笆上的门（地图上的 G） */
  prop_gate: { w: 16, h: 16, frames: ['main'], color: 'brownDark', shape: 'object' },
  /** 农场边缘的林子（不能砍） */
  prop_tree: { w: 16, h: 32, frames: ['main'], color: 'leafDark', shape: 'tree' },
  /** 农场里自己长的树：树苗、小树、大树（能砍，见 src/data/trees.ts） */
  tree_sapling: { w: 16, h: 16, frames: ['main'], color: 'leafLight', shape: 'object' },
  tree_small: { w: 16, h: 32, frames: ['main'], color: 'leaf', shape: 'tree' },
  tree_big: { w: 32, h: 48, frames: ['main'], color: 'leafDark', shape: 'tree' },
  /** 门口的灯笼：开着、关着 */
  prop_lantern: { w: 16, h: 32, frames: ['on', 'off'], color: ['vermilion', 'ash'], shape: 'lantern' },
  /** 家门口的信箱：没信（小旗放下）、有新信（小旗竖起） */
  prop_mailbox: { w: 16, h: 32, frames: ['empty', 'flag'], color: ['brown', 'vermilion'], shape: 'object' },

  // ---- 房子 ----
  house_straw_hut: { w: 48, h: 48, frames: ['main'], color: 'ochreLight', shape: 'building' },
  /** 搬进老宅后，草棚改成的柴房（先用占位） */
  house_woodshed: { w: 48, h: 48, frames: ['main'], color: 'brown', shape: 'building' },
  /** 烧毁的老宅（64×64）：重建的第 1 阶段，立在宅基地上；四周的废墟清完、木匠搭好梁架后换掉 */
  house_old_ruin: { w: 64, h: 64, frames: ['main'], color: 'ash', shape: 'building' },
  /** 重建老宅：第 2、3、4 阶段的样子（64×64） */
  house_timber_frame: { w: 64, h: 64, frames: ['main'], color: 'paperDark', shape: 'building' },
  house_tiled_roof: { w: 64, h: 64, frames: ['main'], color: 'paper', shape: 'building' },
  house_courtyard: { w: 64, h: 64, frames: ['main'], color: 'paper', shape: 'building' },

  // ---- 图标（工具栏、背包）：物品表里每样东西都有 icon_物品id；下面单独写了颜色的用写的，其余见 itemIcons() ----
  ...itemIcons(),
  icon_hoe: { w: 16, h: 16, frames: ['main'], color: 'ochre', shape: 'icon' },
  icon_bucket: { w: 16, h: 16, frames: ['main'], color: 'teal', shape: 'icon' },
  icon_sickle: { w: 16, h: 16, frames: ['main'], color: 'ash', shape: 'icon' },
  icon_axe: { w: 16, h: 16, frames: ['main'], color: 'vermilion', shape: 'icon' },
  icon_pickaxe: { w: 16, h: 16, frames: ['main'], color: 'stone', shape: 'icon' },
  icon_mantou: { w: 16, h: 16, frames: ['main'], color: 'paper', shape: 'icon' },
  icon_bok_choy_seed: { w: 16, h: 16, frames: ['main'], color: 'leafLight', shape: 'icon' },
  icon_radish_seed: { w: 16, h: 16, frames: ['main'], color: 'skin', shape: 'icon' },
  icon_bok_choy: { w: 16, h: 16, frames: ['main'], color: 'leaf', shape: 'icon' },
  icon_radish: { w: 16, h: 16, frames: ['main'], color: 'mist', shape: 'icon' },
  icon_plant_ash: { w: 16, h: 16, frames: ['main'], color: 'ash', shape: 'icon' },
  icon_notebook: { w: 16, h: 16, frames: ['main'], color: 'vermilion', shape: 'icon' },
  icon_burnt_paper: { w: 16, h: 16, frames: ['main'], color: 'ash', shape: 'icon' },
  icon_wood: { w: 16, h: 16, frames: ['main'], color: 'brown', shape: 'icon' },
  icon_stone: { w: 16, h: 16, frames: ['main'], color: 'stone', shape: 'icon' },
  icon_thatch: { w: 16, h: 16, frames: ['main'], color: 'ochreLight', shape: 'icon' },
  icon_tree_seed: { w: 16, h: 16, frames: ['main'], color: 'leafDark', shape: 'icon' },

  // ---- 作物（每种 5 格：种子、幼苗、半大、成熟、枯萎；颜色是成熟时果实的颜色）----
  ...cropSheets(),
};

/** 物品表里每样东西的图标占位（没单独写颜色的：种子土黄、菜按成熟颜色、其他纸色） */
function itemIcons(): Record<string, AssetSpec> {
  const icon = (color: PaletteName): AssetSpec => ({ w: 16, h: 16, frames: ['main'], color, shape: 'icon' });
  return Object.fromEntries(
    ITEMS.items.map((it) => [`icon_${it.id}`, icon(it.type === 'seed' ? 'ochreLight' : it.type === 'crop' ? 'leaf' : 'paperDark')]),
  );
}

/** 所有作物的图（没有美术图时按 crop 形状画占位） */
function cropSheets(): Record<string, AssetSpec> {
  const ripe: Partial<Record<string, PaletteName>> = {
    radish: 'paper', potato: 'ochreLight', pea: 'leafLight', chili: 'vermilion', watermelon: 'leafDark',
    pumpkin: 'candle', taro: 'stone', cucumber: 'leafLight', eggplant: 'indigo', sweet_potato: 'maroon', garlic: 'paper',
  };
  return Object.fromEntries(
    CROPS.crops.map((c) => [`crop_${c.id}`, { w: 16, h: 32, frames: ['seed', 'sprout', 'half', 'ripe', 'withered'], color: ripe[c.id] ?? 'leaf', shape: 'crop' } as AssetSpec]),
  );
}

/**
 * 地图上的地面名字 → 用哪张图的哪一格。
 * 地图字符用哪种地面，在 src/world/farmMap.ts 的 TILE_TYPES 里写。
 */
export const GROUND_TILES: Record<string, { texture: string; frame: string }> = {
  grass: { texture: 'tiles_farm', frame: 'grass' },
  dirt: { texture: 'tiles_farm', frame: 'dirt' },
  tilled: { texture: 'tiles_farm', frame: 'tilled' },
  watered: { texture: 'tiles_farm', frame: 'watered' },
  path: { texture: 'tiles_farm', frame: 'path' },
  fence: { texture: 'tiles_farm', frame: 'fence' },
  water: { texture: 'tiles_water', frame: 'water' },
};

/** 某张图里某一格是第几格（找不到就是第 0 格） */
export function frameIndex(texture: string, frame: string): number {
  return Math.max(0, ASSETS[texture]?.frames.indexOf(frame) ?? 0);
}

/** 有走路动画图（player_walk）时：每个方向一行，每行 5 格 = 站立 + 走路 4 格 */
export const WALK_SHEET = { framesPerDir: 5, dirs: DIRS };

/** 剧本里的语气（#mood:xxx）→ 头像第几格。没写的语气用第 0 格（平常） */
export const MOOD_FRAMES: Record<string, number> = {
  normal: 0,
  smile: 1,
  happy: 1,
  excited: 1,
  worried: 2,
  sad: 2,
  surprised: 3,
};
