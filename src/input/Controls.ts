/**
 * 操作输入：把「键盘」「鼠标」「手机触屏」统一成同一套指令。
 * 游戏其他地方只关心「往哪走」「按了交互」「点了屏幕哪里」，不关心是用什么设备。
 * 按键是哪几个，在 src/config/settings.ts 的 keys 里改。
 *
 * 规则（Mac 和手机一样）：
 *  - 点 / 鼠标点 地图上的东西：只有一件事可做就直接做，有好几件就弹小菜单；离得远会自动走过去。
 *  - 键盘：WASD 或方向键走路，回车交互，空格用工具，数字键换工具，Q 背包。
 *  - 手机：左半屏按住拖动是摇杆；轻点一下（左右半屏都行）就是「点那个东西」。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { toColor } from '../config/palette';
import { uiSize } from '../config/view';
import { pixelText, artIcon } from '../ui/pixelUi';

/** 指令名称。游戏里用 game.events.on(INPUT_EVENTS.xxx, ...) 来接收。 */
export const INPUT_EVENTS = {
  /** 交互 / 确认（回车、手机「使用」键） */
  action: 'input:action',
  /** 用工具（空格） */
  useTool: 'input:useTool',
  /** 取消（Esc） */
  cancel: 'input:cancel',
  bag: 'input:bag',
  menu: 'input:menu',
  /** 带一个参数：第几格工具（0 开始） */
  toolSlot: 'input:toolSlot',
  /** 方向键按了一下（用于在小菜单里上下选）。参数：'up' | 'down' */
  nav: 'input:nav',
  /** 点了屏幕（鼠标或手指）。参数：界面坐标 x, y */
  tap: 'input:tap',
  /** （测试用）切换回忆模式 */
  debugMemory: 'input:debugMemory',
} as const;

/** 触屏摇杆的当前方向，由 TouchControls 写入，范围 -1 ~ 1 */
export const touchMove = { x: 0, y: 0 };

/** 键盘部分 */
export class KeyboardControls {
  private dirKeys: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key[]>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const make = (names: string[]) => names.map((n) => kb.addKey(n, true, false));
    this.dirKeys = {
      up: make(SETTINGS.keys.up),
      down: make(SETTINGS.keys.down),
      left: make(SETTINGS.keys.left),
      right: make(SETTINGS.keys.right),
    };
    const ev = scene.game.events;
    const bind = (names: string[], event: string, arg?: unknown) => {
      for (const k of make(names)) k.on('down', () => ev.emit(event, arg));
    };
    bind(SETTINGS.keys.action, INPUT_EVENTS.action);
    bind(SETTINGS.keys.useTool, INPUT_EVENTS.useTool);
    bind(SETTINGS.keys.cancel, INPUT_EVENTS.cancel);
    bind(SETTINGS.keys.bag, INPUT_EVENTS.bag);
    bind(SETTINGS.keys.menu, INPUT_EVENTS.menu);
    if (SETTINGS.debugMenu) bind(SETTINGS.keys.debugMemory, INPUT_EVENTS.debugMemory);
    bind(SETTINGS.keys.up, INPUT_EVENTS.nav, 'up');
    bind(SETTINGS.keys.down, INPUT_EVENTS.nav, 'down');
    SETTINGS.keys.toolSlots.forEach((name, i) => bind([name], INPUT_EVENTS.toolSlot, i));
  }

  /** 现在想往哪走：键盘和摇杆合在一起，返回 x、y 各在 -1 ~ 1 之间 */
  moveVector(): { x: number; y: number } {
    const held = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);
    let x = (held(this.dirKeys.right) ? 1 : 0) - (held(this.dirKeys.left) ? 1 : 0);
    let y = (held(this.dirKeys.down) ? 1 : 0) - (held(this.dirKeys.up) ? 1 : 0);
    if (x === 0 && y === 0) {
      x = touchMove.x;
      y = touchMove.y;
    }
    const len = Math.hypot(x, y);
    if (SETTINGS.normalizeDiagonal && len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }
}

/**
 * 鼠标 / 手指「点一下」：
 *  - 电脑上：鼠标点哪就是点哪。
 *  - 手机上：左半屏按住拖动是摇杆；在哪儿都是快速轻点（抬手时）才算「点」，按住不放是长按（看说明，见 HudScene）。
 * 点到按钮、工具栏、小菜单这些界面时，不算点地图（由按钮自己处理）。
 */
export class PointerControls {
  constructor(scene: Phaser.Scene, touch: boolean) {
    const ev = scene.game.events;
    const cfg = SETTINGS.touch;
    let stickId: number | null = null;
    let downAt = 0;
    let downX = 0;
    let downY = 0;

    // 摇杆的样子（只在手机上出现）
    const base = scene.add
      .circle(0, 0, cfg.joystickRadius, toColor(SETTINGS.ui.panel), 0.2)
      .setStrokeStyle(1, toColor(SETTINGS.ui.panel), 0.5)
      .setDepth(100)
      .setVisible(false);
    const knob = scene.add.circle(0, 0, Math.round(cfg.joystickRadius * 0.45), toColor(SETTINGS.ui.panel), 0.5).setDepth(101).setVisible(false);
    if (touch) scene.input.addPointer(2); // 允许同时按住摇杆和点别处

    // 手指 / 鼠标在界面上的位置（画布坐标按这个场景的镜头换算）
    const ui = (p: Phaser.Input.Pointer) => scene.cameras.main.getWorldPoint(p.x, p.y);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0) return; // 点在界面上了
      if (touch && stickId === null) {
        // 手机：先记下来（左半屏当作摇杆），抬手时如果很快、没怎么动，再算作「点」
        stickId = p.id;
        downAt = p.downTime;
        downX = ui(p).x;
        downY = ui(p).y;
        base.setPosition(ui(p).x, ui(p).y);
        knob.setPosition(ui(p).x, ui(p).y);
        return;
      }
      ev.emit(INPUT_EVENTS.tap, ui(p).x, ui(p).y);
    });

    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== stickId || downX >= uiSize().w / 2) return; // 右半屏不当摇杆
      const dx = ui(p).x - base.x;
      const dy = ui(p).y - base.y;
      const dist = Math.hypot(dx, dy);
      if (dist < cfg.joystickDeadZone) {
        touchMove.x = 0;
        touchMove.y = 0;
        return;
      }
      base.setVisible(true);
      knob.setVisible(true);
      const r = cfg.joystickRadius;
      const clamped = Math.min(dist, r);
      const ang = Math.atan2(dy, dx);
      knob.setPosition(base.x + Math.cos(ang) * clamped, base.y + Math.sin(ang) * clamped);
      touchMove.x = (Math.cos(ang) * clamped) / r;
      touchMove.y = (Math.sin(ang) * clamped) / r;
    });

    const end = (p: Phaser.Input.Pointer) => {
      if (p.id !== stickId) return;
      stickId = null;
      touchMove.x = 0;
      touchMove.y = 0;
      base.setVisible(false);
      knob.setVisible(false);
      const quick = p.upTime - downAt < cfg.tapMaxMs;
      const still = Math.hypot(ui(p).x - downX, ui(p).y - downY) < cfg.joystickDeadZone * 2;
      if (quick && still) ev.emit(INPUT_EVENTS.tap, downX, downY);
    };
    scene.input.on('pointerup', end);
    scene.input.on('pointerupoutside', end);
  }
}

/** 做一个圆形触屏按钮（手机右下角的「使用」「背包」「菜单」） */
export function makeRoundButton(scene: Phaser.Scene, label: string, radius: number, onPress: () => void, icon?: string) {
  const alpha = SETTINGS.touch.buttonAlpha;
  const fill = toColor(SETTINGS.ui.panel);
  const circle = scene.add.circle(0, 0, radius, fill, alpha).setStrokeStyle(1, toColor(SETTINGS.ui.border), 0.8);
  // icon：有这张图标就用图代替文字（比如背包按钮）
  const text = (icon && artIcon(scene, icon, 0, 0, 1)) || pixelText(scene, 0, 0, label).setOrigin(0.5);
  const c = scene.add.container(0, 0, [circle, text]).setDepth(100).setSize(radius * 2, radius * 2);
  // 感应区的坐标从按钮方框的左上角算起，所以圆心在 (radius, radius)（以前写 (0, 0)，只有左上四分之一按得到）
  c.setInteractive(new Phaser.Geom.Circle(radius, radius, radius), Phaser.Geom.Circle.Contains);
  c.on('pointerdown', () => {
    circle.setFillStyle(toColor(SETTINGS.ui.innerBorder), 0.9);
    onPress();
  });
  const release = () => circle.setFillStyle(fill, alpha);
  c.on('pointerup', release);
  c.on('pointerout', release);
  return c;
}

/** 这台设备有没有触屏 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
