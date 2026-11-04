/**
 * ================================================================
 *  游戏设置总表 —— 想调手感、颜色、按键，先来这里
 * ================================================================
 *  这里放的是「经常想调一下」的东西。改完保存，刷新网页就能看到效果。
 *  每一项后面都有中文说明。数字改大改小都可以试试，改坏了就改回原来的数。
 *
 *  其他好找的地方：
 *   - 游戏里显示的所有中文字：src/locales/zh.json
 *   - 作物、物品、打工、时间等数值：src/data/*.json
 *   - 农场地图长什么样：src/world/farmMap.ts
 */

export const SETTINGS = {
  // ---------------- 画面 ----------------
  /** 一个地图格子多大（像素）。美术定稿后可能会改成 16 或 32。 */
  tileSize: 32,
  /** 屏幕上竖着大约能看到几格地图。数字越小，画面放得越大。 */
  tilesVisibleVertically: 11,
  /** 游戏最外面的背景色（地图外面露出来的部分）。 */
  backgroundColor: '#1d2b24',

  // ---------------- 主角 ----------------
  /** 主角走路速度（每秒走多少像素）。32 像素 = 一格。 */
  playerSpeed: 110,
  /** 点了远处的东西时，自动走过去的速度（一般和走路一样） */
  autoWalkSpeed: 110,
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
    /** 打开菜单（先没做） */
    menu: ['M'],
    /**
     * 切换工具：按 1~9 选工具栏第几格。
     * 小菜单打开时，上面的 up/down（W S 或方向键上下）用来移动选项，action（回车）确认。
     */
    toolSlots: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'],
  },

  // ---------------- 触屏（iPhone） ----------------
  touch: {
    /** 摇杆底盘的半径（像素）。手指拖多远算「推到底」。 */
    joystickRadius: 60,
    /** 手指只是轻轻碰一下、没超过这个距离时不走路（防误触）。 */
    joystickDeadZone: 8,
    /** 手指按下又很快抬起、几乎没移动，算作「点一下」而不是摇杆（毫秒） */
    tapMaxMs: 280,
    /** 右下角「使用」大按钮的半径（按一下 = 对面前那一格做最合适的事） */
    actionButtonRadius: 46,
    /** 背包、菜单小按钮的半径 */
    smallButtonRadius: 28,
    /** 按钮透明度：0 完全透明，1 完全不透明 */
    buttonAlpha: 0.55,
  },

  // ---------------- 颜色（占位美术用） ----------------
  /**
   * 现在还没有正式美术，地图和人物先用色块代替。
   * 颜色写法是 0x 加六位十六进制，和网页颜色 #RRGGBB 一样，比如 0xff0000 是红色。
   */
  colors: {
    grass: 0x6f9a4f,
    grassDark: 0x5f8a42,
    path: 0xc8a97a,
    tilled: 0x7a5534,
    /** 浇过水的田（颜色深一点） */
    watered: 0x4f3622,
    water: 0x4a7fa8,
    tree: 0x2f5a35,
    treeTrunk: 0x5a3d24,
    rock: 0x8f8f8a,
    weed: 0x4f7a2f,
    stump: 0x7a5a3a,
    fireDebris: 0x3a3330,
    fence: 0xa07a50,
    hutWall: 0xb89a6a,
    hutRoof: 0x8a6a3a,
    /** 主角衣服颜色 */
    playerBody: 0x3f5f8f,
    playerSkin: 0xf0d0a8,
    playerHair: 0x2a2020,
    /** 对话框底色和文字颜色 */
    dialogBg: 0x1d2b24,
    dialogText: '#f3ead7',
    /** 小菜单里当前选中那一项的底色 */
    menuHighlight: 0x6a5a30,
    /** 工具栏里当前拿着的工具的边框颜色 */
    toolSelected: 0xe8c872,
    hudText: '#f3ead7',
  },

  // ---------------- 调试 ----------------
  /** 打开后会显示碰撞框，方便检查哪里走不过去。正式玩时保持 false。 */
  debugPhysics: false,
};
