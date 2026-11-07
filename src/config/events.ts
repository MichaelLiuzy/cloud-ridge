/**
 * 场景之间互相传的消息名字（都放在这里，免得场景之间互相导入）。
 */

/** 界面和地图之间互相传的消息 */
export const UI_EVENTS = {
  /** 显示一句话。参数：语言文件里的名字（如 'hint.rock'），以及要替换的内容 */
  say: 'ui:say',
  /** 弹出小菜单。参数：MenuOption 列表 */
  showMenu: 'ui:showMenu',
  /** 下面这些是转给地图的：回车交互、空格用工具、手机「使用」键、点屏幕 */
  worldAction: 'ui:worldAction',
  worldUseTool: 'ui:worldUseTool',
  worldSmart: 'ui:worldSmart',
  worldTap: 'ui:worldTap',
  /** 播一段剧本对话。参数：剧本里的段落名（knot），播完后调用的函数 */
  playDialogue: 'ui:playDialogue',
  /** 让玩家选数量。参数：标题、最多几个、选好后调用的函数（取消时传 null） */
  askQuantity: 'ui:askQuantity',
} as const;

/** 农场场景另外听的消息（M 菜单的测试选项、开通收货服务） */
export const FARM_EVENTS = {
  /** 直接过几天。参数：天数 */
  debugDays: 'farm:debugDays',
  /** 给够材料，请木匠修下一阶段 */
  debugBuild: 'farm:debugBuild',
  /** 一天天过到本周日（不清空本周统计） */
  debugToSunday: 'farm:debugToSunday',
  /** 收货服务开通了：门口放上收货筐 */
  basketUnlocked: 'farm:basketUnlocked',
} as const;

/** 设置面板发出的消息 */
export const SETTINGS_EVENTS = {
  /** 设置里选了要界面配合的一项。参数：项目 id（rename / export / backToTitle / debug） */
  action: 'settings:action',
} as const;

/** 标题画面出现了（这时可以安全地换上新版本，见 main.ts） */
export const TITLE_SHOWN = 'title:shown';
