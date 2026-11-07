/**
 * 画面的两层放大倍数（程序自己算，一般不用改；想调界面大小去 settings.ts 的 ui.scale）。
 * ================================================================
 *  - 世界层（地图、人物、过场图）：按 320×180 画，放大 world 倍。
 *  - 界面层（时辰框、工具栏、背包、菜单、对话框、提示字）：放大 ui 倍。
 *    ui 大约是 world 的一半（「中」档），所以界面按大约 640×360 排版：同样 12 像素的字，屏幕上只有原来一半大，
 *    但每个像素仍然是整整齐齐的小方块，不会糊。
 *  画布的大小就是屏幕的真实像素（Retina 屏也算进去），两层都是整数倍，所以都清晰。
 */
import { SETTINGS } from './settings';
import { loadPrefs } from '../systems/prefs';

/** 事件：changed = 倍数变了（各场景重新排版）；refit = 请重新算一次（比如设置里改了界面大小） */
export const VIEW_EVENTS = { changed: 'view:changed', refit: 'view:refit' } as const;

export const VIEW = {
  /** 画布上几个像素 = 世界的 1 像素 */
  world: 1,
  /** 画布上几个像素 = 界面的 1 像素 */
  ui: 1,
  /** 画布的宽高（真实像素） */
  canvasW: SETTINGS.gameWidth,
  canvasH: SETTINGS.gameHeight,
};

/** 按现在的窗口大小和「界面大小」设置，算出两层的倍数。返回 true = 和上次不一样 */
export function computeView() {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min((window.innerWidth * dpr) / SETTINGS.gameWidth, (window.innerHeight * dpr) / SETTINGS.gameHeight);
  const world = Math.max(1, Math.floor(fit));
  const ratio = SETTINGS.ui.scale[loadPrefs().uiSize] ?? SETTINGS.ui.scale.medium;
  const ui = Math.max(1, Math.round(world / ratio));
  const changed = world !== VIEW.world || ui !== VIEW.ui;
  VIEW.world = world;
  VIEW.ui = ui;
  VIEW.canvasW = SETTINGS.gameWidth * world;
  VIEW.canvasH = SETTINGS.gameHeight * world;
  return changed;
}

/** 网页里的放大倍数：画布 1 像素 = 屏幕 1 个真实像素 */
export function cssZoom() {
  return 1 / (window.devicePixelRatio || 1);
}

/** 界面层有多大（界面像素）：按这个排版 */
export function uiSize() {
  return { w: Math.floor(VIEW.canvasW / VIEW.ui), h: Math.floor(VIEW.canvasH / VIEW.ui) };
}

/** 世界层的场景：镜头放大 world 倍，左上角对齐（不跟随主角的场景用） */
export function setupWorldCamera(scene: Phaser.Scene) {
  scene.cameras.main.setSize(scene.scale.width, scene.scale.height).setOrigin(0, 0).setZoom(VIEW.world);
}

/** 界面层的场景：镜头放大 ui 倍，左上角对齐 */
export function setupUiCamera(scene: Phaser.Scene) {
  scene.cameras.main.setSize(scene.scale.width, scene.scale.height).setOrigin(0, 0).setZoom(VIEW.ui);
}
