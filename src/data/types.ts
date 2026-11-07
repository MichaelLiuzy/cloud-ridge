/**
 * 数值表的「格式说明书」（TypeScript 类型）
 * ================================================================
 *  这个文件规定 src/data/ 里每张表长什么样：每个字段叫什么、填数字还是文字、单位是什么。
 *  作用：你手改数值表时如果打错了（数字写成了文字、物品 id 拼错、漏了一项），
 *  运行 npm run build 会直接报错，告诉你哪个文件第几行不对。
 *
 *  单位约定：
 *    钱 = 文（1 两 = 1000 文）   时间 = 游戏小时 / 游戏天   体力 = 点
 *    比例 = 0~1 的小数（0.2 = 20%）
 *
 *  加新物品 / 新作物 / 新店铺时：除了在表里加一条，还要把它的 id 加到下面对应的列表
 *  （ItemId、CropId、ShopId……）里，不然别的表引用它时会报「拼错」。
 */

// ---------------- 通用 ----------------

/** 名字：zh 中文，en 英文（英文版以后再填，可以先空着 ""） */
export interface LocalName {
  zh: string;
  en: string;
}

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

/** 24 节气的 id（按一年里的顺序） */
export type SolarTermId =
  | 'lichun' | 'yushui' | 'jingzhe' | 'chunfen' | 'qingming' | 'guyu'
  | 'lixia' | 'xiaoman' | 'mangzhong' | 'xiazhi' | 'xiaoshu' | 'dashu'
  | 'liqiu' | 'chushu' | 'bailu' | 'qiufen' | 'hanlu' | 'shuangjiang'
  | 'lidong' | 'xiaoxue' | 'daxue' | 'dongzhi' | 'xiaohan' | 'dahan';

/** 所有物品的 id。在 items.ts 加新物品时，也要加到这里。 */
export type ItemId =
  | 'bok_choy_seed' | 'bok_choy' | 'radish_seed' | 'radish' | 'potato_seed' | 'potato'
  | 'pea_seed' | 'pea' | 'chive_seed' | 'chive' | 'cucumber_seed' | 'cucumber'
  | 'eggplant_seed' | 'eggplant' | 'cowpea_seed' | 'cowpea' | 'chili_seed' | 'chili'
  | 'watermelon_seed' | 'watermelon' | 'napa_cabbage_seed' | 'napa_cabbage' | 'taro_seed' | 'taro'
  | 'sweet_potato_seed' | 'sweet_potato' | 'pumpkin_seed' | 'pumpkin' | 'spinach_seed' | 'spinach'
  | 'garlic_seed' | 'garlic' | 'mustard_greens_seed' | 'mustard_greens' | 'tree_seed'
  | 'wood' | 'thatch' | 'stone' | 'roof_tile' | 'brick' | 'fence' | 'path' | 'firewood' | 'plant_ash'
  | 'mantou' | 'tea' | 'veg_porridge' | 'radish_soup' | 'roast_sweet_potato'
  | 'hoe' | 'bucket' | 'sickle' | 'axe' | 'pickaxe'
  | 'notebook' | 'burnt_paper';

/** 所有作物的 id。在 crops.ts 加新作物时，也要加到这里。 */
export type CropId =
  | 'bok_choy' | 'radish' | 'potato' | 'pea' | 'chive' | 'cucumber' | 'eggplant' | 'cowpea'
  | 'chili' | 'watermelon' | 'napa_cabbage' | 'taro' | 'sweet_potato' | 'pumpkin' | 'spinach' | 'garlic'
  | 'mustard_greens';

/** 店铺 id */
export type ShopId = 'general_store' | 'carpenter' | 'blacksmith' | 'kiln' | 'teahouse' | 'market';

/** 营业的地方（店铺 + 医馆） */
export type PlaceId = 'general_store' | 'carpenter' | 'blacksmith' | 'kiln' | 'teahouse' | 'clinic';

/**
 * 镇上的人（人名 id，显示的名字在 src/locales/zh.ts 的 names；职位见 names 的注释）。
 * Eric 已失踪，不在这里（没有好感度）。
 */
export type NpcId =
  | 'zhou' | 'doctor' | 'qian' | 'liu' | 'ma' | 'he' | 'wen' | 'du' | 'shi' | 'zhao'
  | 'fan' | 'que' | 'shen' | 'daoist' | 'soldier';

/** 会花体力的动作 */
export type StaminaAction = 'hoe' | 'water' | 'plant' | 'harvest' | 'cut_grass' | 'chop_wood' | 'chop_small_tree' | 'chop_tree' | 'mine_rock' | 'flatten' | 'remove_fence';

/** 重建老宅的阶段 id */
export type HouseStageId = 'clear_ruins' | 'timber_frame' | 'tiled_roof' | 'courtyard';

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'snow';

// ---------------- time.ts：时间、体力、昏倒、天气 ----------------

export interface TimeTable {
  schemaVersion: number;
  clock: {
    /** 每天几点醒（游戏小时） */
    dayStartHour: number;
    /** 几点强制昏倒（26 = 第二天凌晨 2 点） */
    dayEndHour: number;
    /** 现实几秒 = 游戏一小时 */
    realSecondsPerGameHour: number;
    /** 时钟每次跳几分钟 */
    tickMinutes: number;
    pauseDuringDialogue: boolean;
  };
  shichenDisplay: { from: number; name: string }[];
  calendar: {
    /** 12 个月（正月……腊月），按顺序 */
    months: { id: string; name: LocalName }[];
    /** 每月几天 */
    daysPerMonth: number;
    /** 每周几天 */
    daysPerWeek: number;
    /** 季节：包含哪几个月（1 = 正月） */
    seasons: { id: SeasonId; name: LocalName; months: number[] }[];
    /** 24 节气：在哪个月哪一天。每个节气从当天算到下一个节气的前一天 */
    solarTerms: { id: SolarTermId; name: LocalName; month: number; day: number }[];
    /** 每月哪几天赶集 */
    marketDays: number[];
    /** 赶集日镇上所有买卖价格的涨幅（0.1 = 贵 10%），收货筐不算 */
    marketPriceBonus: number;
    /** 只在赶集日卖的种子 */
    marketOnlySeeds: ItemId[];
    /** 节日。placeholder = 空位（还没定是什么节，day 为 null） */
    festivals: { id: string; name: LocalName; month: number; day: number | null; activities: string[]; placeholder?: boolean }[];
    /** 农事规则 */
    farmingRules: {
      /** 霜降：这个节气当天，不耐寒（frostHardy: false）的作物枯死；多年生的休眠 */
      frost: { term: SolarTermId; killsNonHardy: boolean };
      /** 冻土期：从 from 节气到 until 节气的前一天，所有作物停止生长，不枯死 */
      frozenGround: { from: SolarTermId; until: SolarTermId };
    };
  };
  /** 营业时间 [开门, 关门]（游戏小时） */
  openingHours: Record<PlaceId, [number, number]>;
  stamina: {
    base: number;
    lowThreshold: number;
    lowSpeedMultiplier: number;
    /** 每个动作花几点体力 */
    costs: Record<StaminaAction, number>;
    /** 水桶：装满有多少水、浇一格用掉多少 */
    bucket: { capacity: number; perWater: number };
  };
  sleep: { beforeMidnightRestore: number; afterMidnightRestore: number };
  /** 晕倒：收现金的几成、最多多少文，第二天醒来体力几点 */
  faint: { feeFraction: number; feeMax: number; nextDayStamina: number };
  /** 饿肚子：前一天一整天没吃东西，第二天醒来体力最多是 nextDayStamina（点数，不是比例） */
  hunger: { nextDayStamina: number };
  weather: {
    /** 每月 1 日固定是什么天气 */
    firstDayOfMonth: Weather;
    rainWatersCrops: boolean;
    /** 各季节天气概率（加起来是 1） */
    chances: Record<SeasonId, Record<Weather, number>>;
  };
}

// ---------------- crops.ts：作物 ----------------

export interface Crop {
  id: CropId;
  name: LocalName;
  /** 哪几段时间能播种：[起始节气, 结束节气]，含结束节气整整 14 天。可以有好几段 */
  sowWindows: [SolarTermId, SolarTermId][];
  /** 耐不耐寒：false 的作物霜降当天枯死 */
  frostHardy: boolean;
  /** 多年生：霜降时不死而是休眠，立春自动重新生长 */
  perennial?: boolean;
  /** 种子是哪个物品 */
  seedItem: ItemId;
  /** 几天成熟 */
  growDays: number;
  /** 收完后几天再长（null = 收一次就没了） */
  regrowDays: number | null;
  /** 收获得到的物品 */
  harvestItem: ItemId;
  /** 一次收几个 */
  yield: number;
  /** 有几率多收：chance 几率（0~1），amount 多收几个 */
  extraYield?: { chance: number; amount: number };
}

export interface CropsTable {
  schemaVersion: number;
  rules: {
    needsWaterToGrow: boolean;
    unwateredDies: boolean;
    fertilizer: { item: ItemId; growDaysReduction: number; minReductionDays: number };
  };
  crops: Crop[];
}

// ---------------- items.ts：物品、店铺、货币 ----------------

export interface Item {
  id: ItemId;
  name: LocalName;
  /** 种类：种子 / 农产品 / 材料 / 食物 / 肥料 / 工具 / 重要物品（不能卖、不会用完，比如笔记本） */
  type: 'seed' | 'crop' | 'material' | 'food' | 'fertilizer' | 'tool' | 'key';
  /** 买入价格（文，null = 店里买不到） */
  buyPrice: number | null;
  /** 卖出价格（文，null = 卖不掉） */
  sellPrice: number | null;
  /** 哪些店有卖 */
  soldAt: ShopId[];
  /** （材料）怎么采集：用什么动作，一次得几个 [最少, 最多] */
  /** （食物、肥料）怎么做：在哪做、要什么材料、做出几个 */
  craft?: { station: string; inputs: Partial<Record<ItemId, number>>; output: number };
  /** （食物）吃了回几点体力 */
  stamina?: number;
  /** （工具）做什么动作 */
  action?: StaminaAction;
  /** 在背包里选中时显示的一句说明（可以不写） */
  desc?: LocalName;
  /** 用不完的东西（比如「小路」）：一直在背包里，不显示数量，不能丢、不能卖、不能放进箱子或收货筐 */
  infinite?: boolean;
}

export interface ItemsTable {
  schemaVersion: number;
  currency: { unit: string; name: LocalName; bigUnit: { name: LocalName; value: number } };
  shops: { id: ShopId; name: LocalName; buysCrops?: boolean }[];
  items: Item[];
}

// ---------------- housing.ts：重建老宅 ----------------

/** 住的地方：开局的草棚，或者重建好的老宅 */
export interface Dwelling {
  /** 体力上限 */
  maxStamina: number;
  /** 解锁的家具或功能 */
  unlocks: string[];
}

export interface HouseStage extends Dwelling {
  /** 第几阶段（1 ~ 4） */
  stage: number;
  id: HouseStageId;
  name: LocalName;
  /** 要什么材料、各多少个（第 1 阶段自己清，不要材料） */
  materials: Partial<Record<ItemId, number>>;
  /** 要花多少文 */
  cost: number;
  /** 是不是请木匠来修（false = 玩家自己动手，比如清废墟） */
  byCarpenter: boolean;
  /** 修好后自动学会的本事（记进笔记本「已学会」栏，文字在语言文件 notebook.learned） */
  learns: string[];
}

export interface HousingTable {
  schemaVersion: number;
  /** 木匠动工要几天 */
  buildDays: number;
  builder: NpcId;
  /** 开局住的草棚（镇上的人在废墟旁搭的） */
  hut: Dwelling;
  /** 废墟里随机生成的东西：杂草、石头、木头各占几成（加起来是 1） */
  ruins: { mix: { weed: number; rock: number; wood: number } };
  /** 重建的四个阶段，按顺序 */
  stages: HouseStage[];
}

// ---------------- services.ts：服务 ----------------

export interface ServicesTable {
  schemaVersion: number;
  /** 杂货铺上门收货 */
  pickup: {
    /** 哪家店收（按这家店的收购价结算） */
    shop: ShopId;
    /** 谁来提这件事 */
    npc: NpcId;
    /** 这个人的好感度到几颗心才会提 */
    unlockHearts: number;
    /** 开通要付多少文 */
    fee: number;
  };
}

// ---------------- jobs.ts：打工 ----------------

export interface Job {
  id: string;
  name: LocalName;
  /** 种类：送货 / 采集 / 体力活 / 坐班 / 手艺 / 主线线索 */
  type: 'delivery' | 'gather' | 'heavy' | 'shift' | 'skill' | 'clue';
  /** 谁给的活 */
  giver: NpcId;
  /** 在哪接活：告示栏 / 和人说话 */
  source: 'notice_board' | 'talk';
  /** 要花几个游戏小时 */
  timeCostHours: number;
  /** 花几点体力 */
  staminaCost: number;
  /** 报酬（文，null = 按别的规则算） */
  reward: number | null;
  /** 做完后好感度变化 */
  affection: Partial<Record<NpcId, number>>;
  repeatable: boolean;
  /** 什么时候解锁（null = 一开始就有） */
  unlock: { affection?: Partial<Record<NpcId, number>>; storyChapter?: number } | null;
  /** 和主线线索的关联（等剧情窗口填） */
  clueHook: string | null;
  note: LocalName;
  /** 几天内做完（0 = 当天） */
  deadlineDays?: number;
  /** 要交的东西 */
  requires?: Partial<Record<ItemId, number>>;
  /** 报酬倍数 */
  rewardMultiplier?: number;
}

export interface JobsTable {
  schemaVersion: number;
  noticeBoard: { refreshHour: number; postsPerDay: [number, number] };
  npcRoles: NpcId[];
  jobs: Job[];
}

// ---------------- start.ts：开局 ----------------

export interface StartTable {
  schemaVersion: number;
  /** 开局日期：几月（1 = 正月）几日 */
  startDay: { month: number; day: number };
  /** 开局的钱（文） */
  cash: number;
  /** 开局背包：物品 → 数量 */
  inventory: Partial<Record<ItemId, number>>;
  farm: { width: number; height: number; preTilledTiles: number; debris: string[] };
  /** 开局好感度 */
  affection: Record<NpcId, number>;
}
