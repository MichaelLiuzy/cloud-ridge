/**
 * 中文文字表 —— 游戏里玩家能看到的所有中文字都在这里
 * ================================================================
 *  想改哪句话，搜一下那句话，改引号里的字就行。左边的英文名字不要动。
 *  {xxx} 是会被自动替换的内容，比如 {day} 会变成第几天，{slot} 会变成存档位编号。
 *
 *  以后加英文版：复制这个文件改名 en.ts，把 zh 改成 en、把中文翻成英文。
 *  漏翻或多写了条目，npm run build 会报错提醒。
 */

export const zh = {
  // ===== 标题画面上的游戏名和提示 =====
  game: {
    title: "云岭",
    subtitle: "Cloud Ridge",
    pressToStart: "按回车键或点一下屏幕",
    rotateDevice: "请把手机横过来玩",
    // iPhone / iPad 用 Safari 打开、还没「添加到主屏幕」时，标题画面下方显示这两行
    addToHomeTip: "添加到主屏幕后可以离线玩，存档也更安全。",
    addToHomeHow: "怎么添加：点 Safari 的「分享」按钮（方框加向上箭头）→「添加到主屏幕」",
  },

  // ===== 标题画面的菜单：继续 / 新游戏 / 导入存档 / 选存档位 =====
  title: {
    continue: "继续游戏",
    newGame: "新游戏",
    importSave: "导入存档",
    back: "返回",
    pickSlotContinue: "读取哪个存档？",
    pickSlotNew: "新游戏放在哪个存档位？",
    pickSlotImport: "导入的存档放进哪个存档位？",
    slotFull: "存档{n}　{date}　{time}　{cash}文",
    slotEmpty: "存档{n}　（空）",
    overwrite: "存档{n}里已经有进度了，确定要覆盖吗？",
    overwriteYes: "覆盖",
    overwriteNo: "不要",
    resumePrompt: "上次没玩完就离开了（{date}　{time}），要接着玩吗？",
    resume: "接着玩",
    discard: "不用了",
    importBad: "这个文件读不出来，不是云岭的存档，或者已经损坏了。",
    importDone: "已导入到存档{n}。",
  },

  // ===== 左上角：日期、时间、钱、体力 =====
  hud: {
    date: "{season} · 第{day}天",
    time: "{shichen}（{hour}:{minute}）",
    money: "{amount} {unit}",
    stamina: "体力 {value}/{max}",
  },

  // ===== 手机右下角的按钮 =====
  buttons: {
    action: "使用",
    bag: "背包",
    menu: "菜单",
  },

  // ===== 小菜单里的选项名字 =====
  action: {
    look: "查看",
    walk: "走到这里",
    till: "开垦",
    water: "浇水",
    cutGrass: "割草",
    chop: "砍掉",
    mine: "敲碎",
    sleep: "睡觉",
    cancel: "算了",
    saveOnly: "存档（不睡）",
  },

  // ===== 对着东西「查看」时显示的话 =====
  hint: {
    nothing: "这里什么也没有。",
    tilled: "一块开垦好的田地，可以种东西了。",
    grass: "一片野草地。开垦之后就能种菜。",
    weed: "杂草长得乱七八糟，得用镰刀割掉。",
    rock: "一块石头，挡在地里。要用铁镐才敲得碎，铁匠铺有卖。",
    stump: "一截老树桩，要用斧头才砍得动。",
    fireDebris: "烧焦的木头和瓦片……是那场火留下的。",
    water: "一口小池塘，水很清。",
    tree: "一棵大树。",
    fence: "旧篱笆。",
    hut: "镇上的人帮忙搭的草棚。晚上可以在这里睡觉。",
    path: "通往镇上的小路。",
    lantern: "门口挂着一盏灯笼，天黑了会点上。",
  },

  // ===== 各种提示消息（对话框里显示） =====
  msg: {
    bagNotReady: "背包还在做，下一版就有。",
    lateNightFaint: "已经凌晨两点了……你眼前一黑，倒了下去。醒来时已经是第二天早上，巡夜人把你送回了草棚。",
    newDay: "新的一天开始了。",
    cantUseTool: "{tool}在这里用不上。",
    noTool: "手上没有工具。",
    cantReach: "走不过去。",
    toolSelected: "拿起了{tool}。",
    sleep: "你躺下睡了。新的一天开始了。（已自动存进存档{slot}）",
    exhaustedFaint: "你累得眼前一黑……醒来时已经是第二天早上，有人把你送回了草棚，还收了{fee}文辛苦钱。",
    saved: "已存档（存档{slot}）。现在的时间、位置和田地都记下了。",
    saveFailed: "存档没成功……可以再试一次，或者在菜单里先导出一份备份。",
    exported: "存档文件已导出。",
  },

  // ===== 游戏中的「菜单」（M 键 / 右上菜单按钮） =====
  menu: {
    title: "菜单",
    export: "导出存档（备份成文件）",
    backToTitle: "回到标题画面",
    backConfirm: "回标题前，没存的进度会丢掉。确定吗？",
    yes: "确定",
    close: "继续玩",
    // 下面是测试用的选项（src/config/settings.ts 里 debugMenu 改成 false 就不显示）
    debugSkipTime: "测试：时间快进 3 小时",
    debugMemory: "测试：回忆模式 开 / 关",
  },
};

/** 文字表的格式：每种语言都必须有和中文一模一样的条目 */
type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };
export type LocaleStrings = Strings<typeof zh>;
