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
    version: "版本 {v}",
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
  // ===== 人名（暂名）=====
  // 人名只在这里写一次。剧本和线索表里写 @zhou、@fan 这种，会自动换成这里的名字。
  names: {
    zhou: "周里正",
    doctor: "大夫",
    fan: "老范",
    store_keeper: "杂货铺掌柜",
    eric: "Eric",
    // 下面几个是主线大纲里的暂名，可以随时改
    /** Eric 的妹妹 */
    que: "阙儿",
    /** 原主的青梅，开绣庄 */
    shen: "沈禾",
    /** 上城山路边的守庙人 */
    daoist: "老道",
    /** 驻在山顶城区的年轻士兵 */
    soldier: "驻军小兵",
    /** 主角还没起名字时，对话框上显示的名字 */
    playerUnknown: "？？？",
  },

  // ===== 开场过场：每一格配的字 =====
  cutscene: {
    /** 过场时屏幕最上方的小提示（电脑 / 手机） */
    hintKey: "按任意键翻页",
    hintTap: "轻点屏幕翻页",
    opening: {
      office: "曼哈顿，又一个加班到深夜的晚上。老板指着我的鼻子骂。",
      walkHome: "回家的路上，我垂着头，叹了口气。",
      crossing: "Penn Station 门口，我低着头过马路。",
      headlights: "——车灯迎面打来。",
      hospital: "病床上的那个人是我。身上插满了管子，一动不动。",
      timePassed: "不知过了多久……",
      clinic: "……我睁开眼。",
    },
    /** 点一下翻页的提示 */
    next: "▼",
  },

  // ===== 剧情画面没有美术图时，色块上写的说明 =====
  cg: {
    cg_office: "【占位】曼哈顿写字楼里，老板指着主角的鼻子骂",
    cg_walk_home: "【占位】夜里，主角垂着头走在回家路上",
    cg_penn_station: "【占位】Penn Station 门口的马路",
    cg_headlights: "【占位】车灯迎面打来",
    cg_hospital_bed: "【占位】上帝视角：主角躺在病床上，插着管子，重度昏迷",
    cg_clinic_wake: "【占位】第一人称：医馆的床上。周里正和大夫站在床边，老范在床尾收拾东西",
  },

  // ===== 起名字 =====
  nameInput: {
    title: "你叫什么名字？",
    renameTitle: "改名字",
    placeholder: "输入名字",
    ok: "确定",
    cancel: "算了",
    errEmpty: "名字不能是空的。",
    errChars: "只能用汉字、英文字母和数字，不能有空格、标点或表情符号。",
    errLong: "名字太长了：最多 {max} 个汉字（一个字母或数字算半个）。",
    renamed: "以后大家就叫你「{name}」了。",
    /** 旧存档第一次读进来时，补填名字 */
    fillIn: "这份存档还没有名字，先给主角起个名字吧。",
  },

  // ===== Q 总菜单 =====
  menuTabs: {
    bag: "背包",
    notebook: "笔记本",
    calendar: "日历",
    map: "地图",
  },
  bag: {
    empty: "（空）",
    count: "×{n}",
    tool: "工具",
    toolbarLabel: "工具栏",
    bagLabel: "背包",
    locked: "已上锁",
    discard: "丢弃",
    lock: "上锁",
    unlock: "解锁",
    move: "移动",
    putHere: "放到这里",
    keyHint: "回车 拿起 / 放下　X 丢弃　L 上锁　E 吃",
    eat: "吃一个",
    cantEat: "这个不能吃。",
    touchHint: "点一样东西拿起来，再点另一格放下",
    picked: "拿起了{name}，选一格放下（Esc 取消）",
    pickedTouch: "拿起了{name}，点一格放下",
    nothing: "这一格是空的。",
    cantDiscardTool: "工具不能丢。",
    cantDiscardLocked: "上了锁的东西不能丢，先解锁。",
    discardHowMany: "丢掉几个{name}？",
    discardConfirm: "确定丢掉 {n} 个{name}吗？丢了就没了。",
    discardYes: "丢掉",
    discarded: "丢掉了 {n} 个{name}。",
    lockedNow: "{name}上锁了：不能丢，也不能卖。",
    unlockedNow: "{name}解锁了。",
  },
  map: {
    placeholder: "地图（待做）",
  },

  // ===== Q 菜单里的日历 =====
  calendarTab: {
    /** 顶上：「正月 · 春」 */
    header: "{month} · {season}",
    /** 图例 */
    legendToday: "今天",
    legendTerm: "节气",
    legendFestival: "节日",
    legendMarket: "赶集日",
    keyHint: "方向键 选日子（翻过头就到别的月）　[ ] 翻月",
    touchHint: "点一天看说明，点 ◀ ▶ 翻月",
    /** 选中一天时下面的说明 */
    dayTitle: "{month}{day} {weekday}",
    today: "今天",
    festival: "{name}",
    term: "节气：{name}",
    market: "赶集日：镇上买卖价格 +{pct}%",
    nothing: "平常的一天。",
  },

  // ===== 笔记本 =====
  notebook: {
    sections: {
      story: "主线",
      controls: "操作",
      learned: "已学会",
    },
    none: "还没有写下什么。",
    noNotebook: "你还没有笔记本。",
    inference: "我想：{text}",
    open: "未解决",
    solved: "已解决",
    answer: "答案：{text}",
    newChapter: "笔记本里写下了新的一页：{name}",
    /** 每章唯一一句明确的去处提示（按章节 id，没写的章就没有） */
    goals: {
      prologue: "去镇上买种子、卖东西，认识一下镇上的人。",
    },
    /** 「操作」栏：每一项分 Mac 键盘和手机两种说法 */
    controls: {
      move: { keyboard: "走路：W A S D 或方向键", touch: "走路：在屏幕左半边按住拖动" },
      tools: { keyboard: "换手上的东西：数字键 1~9；用它干活：空格", touch: "换手上的东西：点工具栏；点地里的东西就用它干活" },
      interact: { keyboard: "查看、说话：回车，或者用鼠标点", touch: "查看、说话：轻点人或东西；「使用」键对着面前一格做事" },
      save: { keyboard: "存档：点草棚，选「睡觉」或「存档（不睡）」", touch: "存档：点草棚，选「睡觉」或「存档（不睡）」" },
      menu: { keyboard: "菜单：Q 打开，Tab 切换栏目", touch: "菜单：点「背包」打开，点栏目名切换" },
    },
    /** 「已学会」栏 */
    learned: {
      got_notebook: "@zhou 给了我一本笔记本。记不住的事，就写下来。",
      recipe_veg_porridge: "菜谱：菜粥",
      recipe_radish_soup: "菜谱：萝卜汤",
      recipe_roast_sweet_potato: "菜谱：烤红薯",
      make_plant_ash: "烧草木灰（灶台里的灰，撒在地里能让菜长得快些）",
    },
  },

  // ===== 日历 =====
  calendar: {
    /** 每月 28 天的叫法，用逗号隔开，按顺序 */
    /** 星期的叫法（每月 1、8、15、22 日是周一），用逗号隔开 */
    weekdays: "周一,周二,周三,周四,周五,周六,周日",
    /** 时辰框里「赶集日」的叫法，和几样东西连起来时中间用的符号 */
    market: "赶集日",
    joiner: " · ",
    dayNames: "初一,初二,初三,初四,初五,初六,初七,初八,初九,初十,十一,十二,十三,十四,十五,十六,十七,十八,十九,二十,廿一,廿二,廿三,廿四,廿五,廿六,廿七,廿八",
  },

  // ===== 天气 =====
  weather: {
    sunny: "晴",
    cloudy: "阴",
    rain: "雨",
    snow: "雪",
  },

  hud: {
    date: "{month}{day} · {term}",
    /** 时辰框第一行：「正月十六 周二」 */
    dateWeek: "{date} {weekday}",
    /** 时辰框第二行：「辰时 · 8:00 am」 */
    timeRow: "{shichen} · {clock}",
    /** 左上角时辰框里的短日期 */
    shortDate: "{month}{day}",
    time: "{shichen}（{hour}:{minute}）",
    money: "{amount} {unit}",
    stamina: "体力 {value}/{max}",
    /** 时辰框里的钟点（整点）。am / pm 用小写 */
    clock: "{hour}:00 {ampm}",
    am: "am",
    pm: "pm",
    /** 体力条旁边的字，以及鼠标移上去 / 点一下弹出的数字 */
    staminaLabel: "体力",
    staminaTip: "{value}/{max}",
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
    talk: "说话",
    walk: "走到这里",
    till: "开垦",
    water: "浇水",
    cutGrass: "割草",
    chop: "砍掉",
    mine: "敲碎",
    sleep: "睡觉",
    cancel: "算了",
    saveOnly: "存档（不睡）",
    clearRuin: "清理废墟",
    sow: "种{name}（还有 {n} 包）",
    harvest: "收{name}",
    clearDead: "拔掉枯苗",
    basketPut: "放进收货筐",
    basketTake: "把筐里的东西拿回来",
    houseStatus: "看看老宅",
    chest: "打开箱子",
    chestPut: "放东西进箱子",
    chestTake: "从箱子里拿",
  },

  // ===== 对着东西「查看」时显示的话 =====
  hint: {
    sowHow: "锄好的地。手上拿着种子点这里，就能种下去。",
    nothing: "这里什么也没有。",
    tilled: "一块开垦好的田地，可以种东西了。",
    grass: "一片野草地。开垦之后就能种菜。",
    weed: "杂草长得乱七八糟，得用镰刀割掉。",
    rock: "一块石头，挡在地里。要用铁镐才敲得碎，铁匠铺有卖。",
    stump: "一截老树桩，要用斧头才砍得动。",
    fireDebris: "烧焦的木头和瓦片……是那场火留下的。",
    ruin: "烧塌下来的破瓦和焦木，堆在老宅四周。",
    oldHouse: "烧剩下的老宅，只剩几根黑乎乎的柱子和半截墙。",
    site: "老宅的地基，已经清干净了。",
    house: "老宅，一点点重新立起来了。",
    basket: "门口的收货筐。晚上放进去的东西，第二天一早杂货铺来收。",
    cropGrowing: "{name}正在长。",
    cropRipe: "{name}熟了，可以收了。",
    cropDead: "{name}枯死了。",
    cropDormant: "{name}在过冬，开春会自己发芽。",
    water: "一口小池塘，水很清。",
    tree: "一棵大树。",
    fence: "旧篱笆。",
    gate: "篱笆上的门，从这里进出田地。",
    hut: "镇上的人帮忙搭的草棚。晚上可以在这里睡觉，里面还有个箱子。",
    shed: "以前住的草棚，现在当柴房用。里面的箱子还在。",
    path: "通往镇上的小路。",
    lantern: "门口挂着一盏灯笼，天黑了会点上。",
  },

  // ===== 各种提示消息（对话框里显示） =====
  msg: {
    bagNotReady: "背包还在做，下一版就有。",
    lateNightFaint: "已经凌晨两点了……你眼前一黑，倒了下去。醒来时已经是第二天早上，巡夜人把你送回了草棚。",
    newDay: "新的一天开始了。",
    cantUseTool: "{tool}在这里用不上。",
    noTool: "手上没拿东西。先在下面的工具栏里选一格。",
    bagFull: "工具栏和背包都满了，放不下。先丢掉或放进箱子里一些东西吧。",
    lockedCantSell: "能卖的东西都上了锁。想卖的话，先在背包里解锁。",
    cantReach: "走不过去。",
    toolSelected: "拿起了{tool}。",
    sleep: "你躺下睡了。新的一天开始了。（已自动存进存档{slot}）",
    ate: "吃了一个{name}，体力 +{n}。",
    hungry: "昨天一整天没吃东西，今天浑身没力气（体力只有 {n}）。记得每天吃点东西。",
    rainy: "外面下着雨。地里的田都淋透了，今天不用浇水。",
    exhaustedFaint: "你累得眼前一黑……醒来时已经是第二天早上，有人把你送回了草棚，还收了{fee}文辛苦钱。",
    saved: "已存档（存档{slot}）。现在的时间、位置和田地都记下了。",
    saveFailed: "存档没成功……可以再试一次，或者在菜单里先导出一份备份。",
    exported: "存档文件已导出。",
    notSowTime: "现在不是种{name}的时节，{term}以后再种吧。",
    harvested: "收了 {n} 个{name}。",
    frost: "霜降了。地里 {n} 棵怕冷的菜一夜之间冻死了。",
    dormant: "韭菜的叶子枯了，根还活着，要过冬了。",
    woke: "开春了，过冬的韭菜又冒出了新芽。",
    basketSold: "杂货铺的伙计一早来过了，收货筐里的东西卖了 {total} 文。",
    nothingToSell: "身上没有杂货铺收的东西。",
    basketPut: "把 {n} 个{name}放进了收货筐。明天一早结算。",
    taken: "拿回了 {n} 个{name}。",
    chestTitle: "箱子（{used}/{slots} 格）",
    chestPut: "把 {n} 个{name}放进了箱子。",
    chestFull: "箱子满了，最多只能放 {slots} 种东西。",
    nothingToStore: "身上没有能放进箱子的东西。",
    debugDays: "（测试）过了 {n} 天，今天是{date}。",
    debugToSunday: "（测试）到本周日了，今天是{date}。今晚睡觉会看到本周总结。",
  },

  // ===== 重建老宅 =====
  // ===== 睡觉过场 =====
  sleep: {
    zzz: "Zzz……",
    line: "{name}睡着了。",
  },

  // ===== 每周总结（周日晚上睡觉时弹出；显示哪几项在 src/data/weekSummary.ts）=====
  weekSummary: {
    title: "本周总结",
    /** 标题下面一行：「正月 第三周」 */
    subtitle: "{month} 第{week}周",
    weekNames: "一,二,三,四",
    money: "卖东西收入 {income} 文，买东西支出 {spend} 文，净赚 {net} 文。",
    moneyLoss: "卖东西收入 {income} 文，买东西支出 {spend} 文，倒贴 {net} 文。",
    harvest: "收获了 {n} 个作物，收得最多的是{name}（{most} 个）。",
    tilled: "新开垦了 {n} 格田。",
    ruins: "清了 {n} 格废墟。",
    house: "老宅：{name}完工了。",
    people: "新认识了 {n} 位镇民。",
    clues: "笔记本里新记下了 {n} 条线索。",
    quiet: "这一周过得很安静。",
    nextWeek: "下周提要",
    nextNothing: "下周没有节气和节日。",
    nextItem: "{date}（{weekday}）{what}",
    nextMarket: "赶集日：{days}",
    close: "回车 / 点一下 继续",
  },

  house: {
    ruinsCleared: "老宅四周的破瓦焦木终于清干净了。接下来可以去镇上请木匠来修了。",
    building: "木匠正在修「{name}」，还要 {days} 天。",
    statusRuins: "老宅四周堆满了废墟，还有 {left} 格没清。拿斧头或锄头一点点清吧。",
    statusNext: "下一步是「{name}」：要{mats}，还有 {cost} 文工钱。去镇上找木匠。",
    allDone: "老宅已经完全修好了。",
    busy: "木匠已经在修了，还要 {days} 天。",
    clearFirst: "得先把废墟清干净，木匠才好动工。",
    notEnough: "材料或工钱还不够。",
    started: "木匠来了，开始修「{name}」，要 {days} 天。",
    finished: "「{name}」修好了！",
    learned: "有了灶台，能做几样吃的了。（记在笔记本「已学会」里）",
    hutToShed: "搬进老宅了。原来的草棚改成柴房，箱子还留在里面。",
  },

  // ===== 日记碎片 =====
  diary: {
    where: {
      bed: "烧塌的床板下",
      stove: "灶台边的砖缝里",
      beam: "房梁的缝里",
      backdoor: "后门外的土里",
    },
    foundReadable: "在{where}找到一页日记，记进了笔记本。",
    foundPaper: "在{where}找到一片烧焦的纸片。字迹模糊，看不清写了什么。",
  },

  // ===== 选数量的小框 =====
  quantity: {
    count: "{n} 个（最多 {max}）",
    askBasket: "放几个{name}进收货筐？",
    askChest: "放几个{name}进箱子？",
    askTake: "拿回几个{name}？",
    one: "1个",
    half: "一半",
    all: "全部",
    ok: "确定",
    cancel: "算了",
  },

  // ===== 杂货铺上门收货 =====
  pickup: {
    question: "付 {fee} 文，请杂货铺每天上门收货？",
    pay: "付 {fee} 文开通",
    noMoney: "钱不够，要 {fee} 文。",
    unlocked: "开通了。家门口多了一个收货筐。",
    already: "（测试）上门收货已经开通了。",
  },

  // ===== 游戏中的「菜单」（M 键 / 右上菜单按钮） =====
  // ===== 设置（右上角齿轮 / M / Esc）=====
  settings: {
    title: "设置",
    /** 每一项的名字（项目列表在 src/data/settingsMenu.ts） */
    items: {
      rename: "改名字",
      textSpeed: "文字速度",
      autoAdvance: "过场自动翻页",
      autoAdvanceSec: "自动翻页等几秒",
      uiSize: "界面大小",
      musicVolume: "音乐音量",
      sfxVolume: "音效音量",
      controls: "操作说明",
      export: "导出存档（备份成文件）",
      import: "导入存档",
      backToTitle: "回到标题画面",
      debug: "测试……",
    },
    /** 选项的叫法 */
    options: {
      slow: "慢",
      medium: "中",
      fast: "快",
      instant: "立即",
      small: "小",
      large: "大",
    },
    on: "开",
    off: "关",
    seconds: "秒",
    back: "返回",
    cancel: "算了",
    backConfirm: "上次睡觉存档之后的进度会丢失，确定吗？",
    yesBackToTitle: "确定，回到标题画面",
    importPick: "放进哪个存档位？（正在玩的这个不能覆盖）",
    importDone: "已经导入到存档 {n}。回到标题画面就能读。",
    controlsSettings: { keyboard: "设置：Esc 或 M，或点右上角齿轮", touch: "设置：点右上角齿轮" },
  },

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
    debugPoster: "测试：触发「看到寻人启事」",
    debug: "测试……",
    debugDay1: "测试：直接睡到明天",
    debugDay7: "测试：快进 7 天",
    debugToSunday: "测试：跳到本周日（本周统计不清空）",
    debugBuild: "测试：请木匠修下一阶段（材料不够直接给）",
    debugPickup: "测试：杂货铺掌柜好感加到 200 点（2 颗心）",
    debugChapter: "测试：直接进入下一章",
    rename: "改名字",
  },
};

/** 文字表的格式：每种语言都必须有和中文一模一样的条目 */
type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };
export type LocaleStrings = Strings<typeof zh>;
