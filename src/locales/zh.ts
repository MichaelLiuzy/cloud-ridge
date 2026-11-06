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
  // ===== 人名（暂名）=====
  // 人名只在这里写一次。剧本和线索表里写 @zhou、@fan 这种，会自动换成这里的名字。
  names: {
    zhou: "周里正",
    doctor: "大夫",
    fan: "老范",
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
    map: "地图",
  },
  bag: {
    empty: "（空）",
    count: "×{n}",
    tool: "工具",
  },
  map: {
    placeholder: "地图（待做）",
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
    /** 「操作」栏：每一项分 Mac 键盘和手机两种说法 */
    controls: {
      move: { keyboard: "走路：W A S D 或方向键", touch: "走路：在屏幕左半边按住拖动" },
      tools: { keyboard: "换工具：数字键 1~9；用工具：空格", touch: "换工具：点底下的工具栏；点地里的东西就会去干活" },
      interact: { keyboard: "查看、说话：回车，或者用鼠标点", touch: "查看、说话：轻点人或东西；「使用」键对着面前一格做事" },
      save: { keyboard: "存档：点草棚，选「睡觉」或「存档（不睡）」", touch: "存档：点草棚，选「睡觉」或「存档（不睡）」" },
      menu: { keyboard: "菜单：Q 打开，Tab 切换栏目", touch: "菜单：点「背包」打开，点栏目名切换" },
    },
    /** 「已学会」栏 */
    learned: {
      got_notebook: "@zhou 给了我一本笔记本。记不住的事，就写下来。",
    },
  },

  // ===== 日历 =====
  calendar: {
    /** 每月 28 天的叫法，用逗号隔开，按顺序 */
    dayNames: "初一,初二,初三,初四,初五,初六,初七,初八,初九,初十,十一,十二,十三,十四,十五,十六,十七,十八,十九,二十,廿一,廿二,廿三,廿四,廿五,廿六,廿七,廿八",
  },

  hud: {
    date: "{month}{day}",
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
    debugPoster: "测试：触发「看到寻人启事」",
    rename: "改名字",
  },
};

/** 文字表的格式：每种语言都必须有和中文一模一样的条目 */
type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };
export type LocaleStrings = Strings<typeof zh>;
