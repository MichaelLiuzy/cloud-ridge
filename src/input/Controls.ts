/**
 * 操作输入：把「键盘」和「手机触屏」统一成同一套指令。
 * 游戏其他地方只关心「往哪走」「按了使用」「按了背包」，不关心是键盘还是手指。
 * 按键是哪几个，在 src/config/settings.ts 的 keys 里改。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';

/** 指令名称。游戏里用 game.events.on('input:action', ...) 来接收。 */
export const INPUT_EVENTS = {
  action: 'input:action',
  bag: 'input:bag',
  menu: 'input:menu',
  /** 带一个参数：第几格工具（0 开始） */
  toolSlot: 'input:toolSlot',
} as const;

/** 触屏摇杆的当前方向，由 TouchControls 写入，范围 -1 ~ 1 */
export const touchMove = { x: 0, y: 0 };

/** 键盘部分 */
export class KeyboardControls {
  private dirKeys: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key[]>;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const make = (names: string[]) => names.map((n) => kb.addKey(n));
    this.dirKeys = {
      up: make(SETTINGS.keys.up),
      down: make(SETTINGS.keys.down),
      left: make(SETTINGS.keys.left),
      right: make(SETTINGS.keys.right),
    };
    const emit = (names: string[], event: string, arg?: number) => {
      for (const k of make(names)) k.on('down', () => scene.game.events.emit(event, arg));
    };
    emit(SETTINGS.keys.action, INPUT_EVENTS.action);
    emit(SETTINGS.keys.bag, INPUT_EVENTS.bag);
    emit(SETTINGS.keys.menu, INPUT_EVENTS.menu);
    SETTINGS.keys.toolSlots.forEach((name, i) => emit([name], INPUT_EVENTS.toolSlot, i));
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
 * 手机触屏部分：
 *  - 左半边屏幕：手指按哪里，摇杆就出现在哪里，拖动走路
 *  - 右下角：「使用」大按钮；上面是「背包」「菜单」小按钮
 * 只在有触屏的设备上显示。
 */
export class TouchControls {
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private stickPointer: number | null = null;
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor(private scene: Phaser.Scene, labels: { action: string; bag: string; menu: string }, fontFamily: string) {
    const cfg = SETTINGS.touch;
    scene.input.addPointer(2); // 允许同时按住摇杆和按钮

    this.base = scene.add.circle(0, 0, cfg.joystickRadius, 0xffffff, 0.15).setStrokeStyle(2, 0xffffff, 0.4);
    this.knob = scene.add.circle(0, 0, cfg.joystickRadius * 0.45, 0xffffff, 0.45);
    this.base.setVisible(false).setDepth(100);
    this.knob.setVisible(false).setDepth(101);

    const makeButton = (label: string, radius: number, event: string) => {
      const circle = scene.add.circle(0, 0, radius, 0x000000, cfg.buttonAlpha).setStrokeStyle(2, 0xffffff, 0.6);
      const text = scene.add
        .text(0, 0, label, { fontFamily, fontSize: `${Math.round(radius * 0.55)}px`, color: '#ffffff' })
        .setOrigin(0.5)
        .setResolution(window.devicePixelRatio || 1);
      const c = scene.add.container(0, 0, [circle, text]).setDepth(100).setSize(radius * 2, radius * 2);
      c.setInteractive(new Phaser.Geom.Circle(0, 0, radius), Phaser.Geom.Circle.Contains);
      c.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        circle.setFillStyle(0xffffff, 0.35);
        scene.game.events.emit(event);
      });
      const release = () => circle.setFillStyle(0x000000, cfg.buttonAlpha);
      c.on('pointerup', release);
      c.on('pointerout', release);
      this.buttons.push(c);
      return c;
    };
    makeButton(labels.action, cfg.actionButtonRadius, INPUT_EVENTS.action);
    makeButton(labels.bag, cfg.smallButtonRadius, INPUT_EVENTS.bag);
    makeButton(labels.menu, cfg.smallButtonRadius, INPUT_EVENTS.menu);
    this.layout();
    scene.scale.on('resize', () => this.layout());

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.stickPointer !== null) return;
      if (p.x > scene.scale.width / 2) return; // 只有左半屏是摇杆区
      this.stickPointer = p.id;
      this.base.setPosition(p.x, p.y).setVisible(true);
      this.knob.setPosition(p.x, p.y).setVisible(true);
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.stickPointer) return;
      const dx = p.x - this.base.x;
      const dy = p.y - this.base.y;
      const dist = Math.hypot(dx, dy);
      const r = cfg.joystickRadius;
      const clamped = Math.min(dist, r);
      const ang = Math.atan2(dy, dx);
      this.knob.setPosition(this.base.x + Math.cos(ang) * clamped, this.base.y + Math.sin(ang) * clamped);
      if (dist < cfg.joystickDeadZone) {
        touchMove.x = 0;
        touchMove.y = 0;
      } else {
        touchMove.x = (Math.cos(ang) * clamped) / r;
        touchMove.y = (Math.sin(ang) * clamped) / r;
      }
    });
    const end = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.stickPointer) return;
      this.stickPointer = null;
      touchMove.x = 0;
      touchMove.y = 0;
      this.base.setVisible(false);
      this.knob.setVisible(false);
    };
    scene.input.on('pointerup', end);
    scene.input.on('pointerupoutside', end);
  }

  /** 按屏幕大小摆放按钮（横竖屏切换、窗口变大小时都会重新摆） */
  private layout() {
    const { width, height } = this.scene.scale;
    const cfg = SETTINGS.touch;
    const margin = 24;
    const [action, bag, menu] = this.buttons;
    const ax = width - margin - cfg.actionButtonRadius - 10;
    const ay = height - margin - cfg.actionButtonRadius - 10;
    action.setPosition(ax, ay);
    bag.setPosition(ax - cfg.actionButtonRadius - cfg.smallButtonRadius - 18, ay + 10);
    menu.setPosition(width - margin - cfg.smallButtonRadius, margin + cfg.smallButtonRadius + 40);
  }
}

/** 这台设备有没有触屏 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
