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
    /** 确认 / 交互（和人说话、使用工具、翻对话） */
    action: ['ENTER'],
    /** 打开背包 */
    bag: ['Q'],
    /** 打开菜单 */
    menu: ['ESC'],
    /** 切换工具：按 1~9 选工具栏第几格 */
    toolSlots: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'],
  },

  // ---------------- 触屏（iPhone） ----------------
  touch: {
    /** 摇杆底盘的半径（像素）。手指拖多远算「推到底」。 */
    joystickRadius: 60,
    /** 手指只是轻轻碰一下、没超过这个距离时不走路（防误触）。 */
    joystickDeadZone: 8,
    /** 右下角「使用」大按钮的半径 */
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
    hudText: '#f3ead7',
  },

  // ---------------- 调试 ----------------
  /** 打开后会显示碰撞框，方便检查哪里走不过去。正式玩时保持 false。 */
  debugPhysics: false,
};
