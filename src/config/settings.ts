/**
 * ================================================================
 *  游戏设置总表 —— 想调手感、颜色、按键，先来这里
 * ================================================================
 *  这里放的是「经常想调一下」的东西。改完保存，刷新网页就能看到效果。
 *  每一项后面都有中文说明。数字改大改小都可以试试，改坏了就改回原来的数。
 *
 *  其他好找的地方：
 *   - 游戏里显示的所有中文字：src/locales/zh.ts
 *   - 作物、物品、打工、时间等数值：src/data/*.ts
 *   - 农场地图长什么样：src/world/farmMap.ts
 */

export const SETTINGS = {
  // ---------------- 画面 ----------------
  /**
   * 游戏画面的「原始大小」（像素）。整张画面先按这个大小画，再整数倍放大铺满屏幕
   * （Mac 一般放大 4 倍，iPhone 横屏 2~3 倍），放不满的地方留黑边。这是美术规范定的，一般不改。
   */
  gameWidth: 320,
  gameHeight: 180,
  /** 一个地图格子多大（像素）。美术规范定的 16，一般不改。 */
  tileSize: 16,
  /** 地图外面露出来的地方的颜色 */
  backgroundColor: '#1E1A1F',
  /** 水面每隔多久（毫秒）在「平静」和「波光」两格之间换一次，做出水波。800 = 0.8 秒 */
  waterShimmerMs: 800,
  /**
   * 刚种下去的种子往上挪几个像素（作物图都贴着格子底边画，种子在图的最下面）。
   * 0 = 贴着格子底边；4 = 往上挪 4 像素（一格 16 像素）。长大以后的苗不受影响。
   */
  seedOffsetY: 5,

  // ---------------- 主角 ----------------
  /** 主角走路速度（每秒走多少像素）。16 像素 = 一格。 */
  playerSpeed: 56,
  /** 点了远处的东西时，自动走过去的速度（一般和走路一样） */
  autoWalkSpeed: 56,
  /** 走路时身体上下颠动几像素（没有走路动画图时用） */
  walkBobPixels: 1,
  /** 颠动快慢：每秒颠几下 */
  walkBobPerSecond: 8,
  /** 有走路动画图（player_walk.png）时，每秒播几帧 */
  walkFrameRate: 8,
  /** 用工具时，工具图标在面前挥一下要多久（毫秒） */
  toolSwingMs: 220,
  /**
   * 贴边滑入：直着走被墙角、门框挡住，而旁边差不到这么多像素就能对准通道时，
   * 自动往通道那边挪一点，顺势走进去（对所有门和窄路都有效）。0 = 关掉。
   */
  cornerSlidePixels: 6,
  /** 斜着走时是否和直走一样快（true = 一样快，更自然）。 */
  normalizeDiagonal: true,

  // ---------------- 键盘（Mac） ----------------
  /**
   * 按键设置。名字用英文大写，例如 'W'、'ENTER'、'SPACE'、'UP'（方向键上）。
   * 一个动作可以绑定好几个键，用逗号隔开写在方括号里。
   */
  keys: {
    up: ['W', 'UP'],
    down: ['S', 'DOWN'],
    left: ['A', 'LEFT'],
    right: ['D', 'RIGHT'],
    /** 交互 / 确认：和人说话、查看东西、翻对话、在小菜单里选中 */
    action: ['ENTER'],
    /** 用手上拿着的工具（锄地、浇水、割草……），对着面前那一格 */
    useTool: ['SPACE'],
    /** 关掉小菜单或对话框 */
    cancel: ['ESC'],
    /** 打开背包 */
    bag: ['Q'],
    /** 打开设置面板 */
    menu: ['M'],
    /** （测试用）切换回忆模式：画面去色、只有火光保留颜色 */
    debugMemory: ['F8'],
    /** 收起 / 展开左上角的时辰框 */
    foldInfo: ['H'],
    /**
     * 切换工具：按 1~9 选工具栏第几格。
     * 小菜单打开时，上面的 up/down（W S 或方向键上下）用来移动选项，action（回车）确认。
     */
    toolSlots: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'],
    /** Q 菜单里换栏目（加 Shift 往回） */
    switchTab: ['TAB'],
    /** 背包、箱子里：整理、放进 / 拿出箱子、丢弃、上锁、吃（按钮上显示的字母取第一个键） */
    bagSort: ['R'],
    bagTransfer: ['F'],
    bagDiscard: ['X'],
    bagLock: ['L'],
    bagEat: ['E'],
    /** 箱子翻页、日历翻月：上一页 / 下一页（[ 和 ]） */
    pagePrev: ['OPEN_BRACKET'],
    pageNext: ['CLOSED_BRACKET'],
  },

  // ---------------- 触屏（iPhone） ----------------
  /** 下面的大小都按界面层算（大约 640×360，见 ui.scale） */
  /** 自动走路找路时最多看多少格（点到很远或走不到的地方时不至于卡） */
  pathMaxSteps: 4000,

  touch: {
    /** 摇杆底盘的半径（像素）。手指拖多远算「推到底」。 */
    joystickRadius: 40,
    /** 手指只是轻轻碰一下、没超过这个距离时不走路（防误触）。 */
    joystickDeadZone: 6,
    /** 手指按下又很快抬起、几乎没移动，算作「点一下」而不是摇杆（毫秒） */
    tapMaxMs: 280,
    /** 右下角交互按钮（外面一圈、中间一个实心圆点；按一下 = 对面前那一格做最合适的事）的半径 */
    actionButtonRadius: 28,
    /** 交互按钮离屏幕右边、下边多远（像素）：右手拇指好按的位置 */
    actionButtonMargin: { right: 14, bottom: 12 },
    /** 按下时按钮缩到多大（1 = 不缩） */
    actionButtonPressScale: 0.88,
    /** 按钮透明度：0 完全透明，1 完全不透明 */
    buttonAlpha: 0.55,
  },

  // ---------------- 界面颜色 ----------------
  /**
   * 对话框、物品栏、体力条、时辰框都用代码画（美术规范定的）。
   * 颜色写法和网页一样：#RRGGBB。最好从 src/config/palette.json 的 27 色里挑。
   * 地图、人物没有图时的占位色块颜色在 src/config/assets.ts 里改。
   */
  ui: {
    /** 读信：信纸底色、边框、信件列表里「没读过」的小红点（有 ui_letter 的图时信纸用图） */
    letter: { paper: '#EFE4C8', border: '#A8402F', unread: '#A8402F' },
    /**
     * 右下角的提示字幕（得到东西、背包满了这类系统提示）：
     * holdMs 停多久（毫秒）、fadeMs 渐隐多久、maxLines 最多同时几条、maxW 一条最宽多少（超过就折行）、
     * right 离右边多远、gap 条与条之间空多少，字的颜色和描边颜色。
     */
    subtitle: { holdMs: 3000, fadeMs: 600, maxLines: 3, maxW: 260, right: 8, gap: 2, color: '#EFE4C8', stroke: '#2B2622' },
    /**
     * 界面层比地图细几倍。地图按 320×180 放大；界面按「地图倍数 ÷ 这个数」放大，
     * 所以 2 = 界面按大约 640×360 排版，字在屏幕上是原来的一半大，但依然清晰。
     * 三档对应设置里的「界面大小」：数越大，界面越小。
     */
    scale: { small: 3, medium: 2, large: 1.5 } as Record<string, number>,
    /** 对话框（剧情对话、医馆）再放大几倍（整数）：比别的界面字大一档，好读 */
    dialogueScale: 2,
    /** 背包、工具栏里的物品图标放大几倍（整数；图标原图 16×16） */
    iconScale: 2,
    /** 小字（翻页提示、体力数字提示）的字号 */
    smallFontSize: 8,
    /** 框的底色（米白） */
    panel: '#EFE4C8',
    /** 框的 1 像素外边 */
    border: '#3B3540',
    /** 框里面再一圈（旧纸色） */
    innerBorder: '#D9C59A',
    /** 框里的字 */
    text: '#3B3540',
    /** 灰掉的字（不能选的选项） */
    textDim: '#8A8B8C',
    /** 旁白的字（对话框里没有说话人的句子） */
    textDim2: '#6E4A2E',
    /** 对话里的黄字（关键句，读到就拿到线索），以及垫在它后面的深色底 */
    clueText: '#F2C46B',
    clueMark: '#3B3540',
    /** 小菜单里当前选中那一项的底色 */
    highlight: '#D9C59A',
    /** 工具栏里当前拿着的工具的框 */
    toolSelected: '#D97B3A',
    /** 钱的颜色 */
    money: '#9C6B3E',
    /** 体力条：满 / 低 */
    staminaFull: '#6F8A4C',
    staminaLow: '#A8402F',
    /**
     * 左上角的时辰框（按界面层算，单位：界面像素）。
     * 第一行：日期和星期（正月十六 周二）；第二行：时辰和钟点（辰时 · 8:00 am，每小时才跳一次）；
     * 第三行：天气；今天有节日 / 节气 / 赶集时再多一行；最后一行：铜钱 + 钱数（左），「体力」+ 体力条（右）。
     */
    infoBox: {
      /** 框的左上角在哪 */
      x: 4,
      y: 4,
      /** 框至少多宽、多高。字放不下时框会自动变宽 */
      w: 150,
      h: 34,
      /** 框里的东西离框边几像素（框本身的边占 2 像素，这里算在里面） */
      padding: 4,
      /** 每行字的行距 */
      lineH: 14,
      /** 字往上挪几像素（像素字体上面自带一点空白，挪掉能省地方；0 = 不挪） */
      textNudgeY: -2,
    },
    /** 体力条（在时辰框第二行右边，「体力」两个字后面）：长、粗 */
    staminaBar: { w: 44, h: 5 },
    /**
     * 时辰框可以收起（按 keys.foldInfo 或点框右边的小箭头）：
     * arrowW 框右边箭头那一条多宽；tabW、tabH 收起后左上角小标签的宽高（上面写钟点，放不下就只写箭头）；slideMs 滑动多久（毫秒）
     */
    infoFold: { arrowW: 10, tabW: 64, tabH: 18, slideMs: 200 },
    /** 鼠标移到体力条上（手机上点一下）弹出的「81/100」小提示：手机上几毫秒后自动消失 */
    staminaTipMs: 2000,
    /** 右上角齿轮（设置）、笔记本按钮的大小 */
    cornerButton: 24,
    /**
     * 地图上一格的说明（以前点「查看」才有）：
     *  delayMs 鼠标停住多久才弹出；longPressMs 手机上按住多久算长按（松手就收起）；
     *  maxW 说明框最宽多少（界面像素，超过自动换行）；offsetX / offsetY 框离鼠标多远。
     *  键盘玩时，面前那一格的说明显示在工具栏上面。
     */
    hoverTip: { delayMs: 250, longPressMs: 400, maxW: 170, offsetX: 10, offsetY: 12 },
    /** 标题画面：背景和字 */
    titleBg: '#1E1A1F',
    titleText: '#EFE4C8',
    titleSubText: '#B89A64',
  },
  /** 门口灯笼灭了、又没有熄灭的图时，把灯笼的图调成这个颜色（越深越暗） */
  lanternOffTint: '#7A7068',

  /**
   * 字号（界面像素，界面大约 640×360；对话框再放大 ui.dialogueScale 倍）。字体是霞鹜文楷，怎么换见 README。
   * 正文：对话、菜单选项、信息框、字幕、物品名、数字
   */
  fontSize: 10,
  /** 标题：说话人名字、菜单栏目名、章节名、列表菜单标题、周总结标题（游戏名是它的 3 倍） */
  titleFontSize: 11,

  // ---------------- 对话 ----------------
  /** 对话逐字出现：每个字间隔多少毫秒（设置里的「文字速度」四档；0 = 一下子全出来） */
  textSpeedMs: { slow: 70, medium: 35, fast: 12, instant: 0 } as Record<string, number>,

  /**
   * 设置菜单里各项的默认值（玩家改过以后存在这台设备上，见 src/systems/prefs.ts）。
   *  uiSize 界面大小 small / medium / large；textSpeed 文字速度 slow / medium / fast / instant；
   *  autoAdvance 过场自动翻页开不开；autoAdvanceSec 等几秒；musicVolume / sfxVolume 音量 0~100
   */
  prefsDefaults: {
    uiSize: 'medium',
    textSpeed: 'medium',
    autoAdvance: true,
    autoAdvanceSec: 4,
    musicVolume: 70,
    sfxVolume: 70,
    infoFolded: false,
  },

  // ---------------- 开场过场 ----------------
  cutscene: {
    /**
     * 自动翻页：每一格的出场效果播完后，等几秒没操作就自动翻到下一格。
     * 默认几秒、开不开在上面的 prefsDefaults（autoAdvance、autoAdvanceSec），玩家可以在设置里改。
     * 某一格想停久一点或短一点，在 src/data/cutscenes.ts 里给那一格写 autoMs。
     * minShowMs：每一格至少显示多久（毫秒）才能手动翻走，防止手快一下翻过两格。
     */
    minShowMs: 400,
    /** 屏幕最上方「按任意键翻页」那行小字：颜色、透明度（0~1），以及慢慢闪一次要多久（毫秒） */
    hintColor: '#EFE4C8',
    hintAlpha: 0.45,
    hintBlinkMs: 1800,
  },

  // ---------------- 睡觉过场 ----------------
  /**
   * 在床边选「睡觉」后的小过场（毫秒）：画面慢慢变暗、出现「Zzz……」→ 停一会儿、下面出现「××睡着了。」→ 天亮淡入。
   * 点屏幕、按回车或空格可以提前结束。昏倒时不放这段。
   */
  sleepCutscene: {
    /** 变暗用多久 */
    fadeOutMs: 1000,
    /** 黑屏上停多久（「Zzz……」和「睡着了」那行字） */
    holdMs: 1500,
    /** 天亮淡入用多久 */
    fadeInMs: 800,
    /** 「Zzz……」的颜色、「睡着了」那行小字的颜色 */
    zzzColor: '#EFE4C8',
    lineColor: '#B89A64',
  },

  // ---------------- 雨雪画面 ----------------
  /**
   * 下雨、下雪时叠在农场上的画面（不用美术图，程序画的）。室内不显示。
   *  - shade：整个画面叠一层颜色（雨天稍暗、雪天稍亮），alpha 越大越明显。
   *  - perSecond：每秒落下几根雨丝 / 几片雪花；手机上乘 touchFactor（少一些，省电）。
   *  - speedY / speedX：往下、往旁边落的速度（像素/秒，负数往左）；length：雨丝长几像素；size：雪花几像素。
   */
  weatherFx: {
    touchFactor: 0.5,
    rain: { shade: '#2E3A4A', alpha: 0.18, perSecond: 90, speedY: 240, speedX: -60, length: 5, color: '#C9D6E0', dropAlpha: 0.6 },
    snow: { shade: '#F4F1EA', alpha: 0.12, perSecond: 25, speedY: 18, speedX: -6, sway: 10, size: 2, color: '#FFFFFF', dropAlpha: 0.9 },
  },

  // ---------------- 名字 ----------------
  /**
   * 玩家名字的规则：只能用汉字、英文字母和数字（不能有空格、标点、表情符号）。
   * 长度按「汉字宽度」算：一个汉字算 cjkWidth，一个字母或数字算 latinWidth，
   * 加起来要在 minWidth 和 maxWidth 之间。现在是最多 10 个汉字，或者 20 个字母。
   */
  nameRules: {
    cjkWidth: 1,
    latinWidth: 0.5,
    minWidth: 0.5,
    maxWidth: 10,
  },

  // ---------------- 背包 ----------------
  /** Q 菜单里背包每格多大（界面像素；图标放大 ui.iconScale 倍后是 32）。格子数在下面 inventory 里 */
  bag: {
    slotSize: 36,
  },

  // ---------------- 物品栏 ----------------
  inventory: {
    /** 屏幕下方工具栏几格（数字键 1 ~ 9 选） */
    toolbarSlots: 9,
    /** 背包几格（Q 菜单「背包」里工具栏下面那 3 行） */
    bagSlots: 27,
    /** 同一种东西一格最多叠几个（工具不叠；箱子也一样） */
    stackMax: 99,
    /** 箱子每页几行、每行几格。最后一页放满了会自动加一页，页数不限 */
    chestRows: 6,
    chestCols: 9,
    /**
     * 背包、箱子里「整理」按钮的类别顺序（用 src/data/items.ts 里每样东西的 type）。
     * tool 工具、seed 种子、crop 作物、food 食物、material 材料、fertilizer 肥料；没写到的类别排在最后。
     * 同一类里按名字排。背包整理不动工具栏那 9 格。
     */
    sortOrder: ['tool', 'seed', 'crop', 'food', 'material', 'fertilizer'],
  },

  // ---------------- 调试 ----------------
  /** 打开后会显示碰撞框，方便检查哪里走不过去。正式玩时保持 false。 */
  debugPhysics: false,
  /** 菜单里显示「测试」选项（时间快进、回忆模式）。正式给朋友玩时改成 false。 */
  debugMenu: true,
};
