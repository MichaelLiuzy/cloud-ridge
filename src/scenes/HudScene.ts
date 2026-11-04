/**
 * 界面场景：叠在地图上面，不跟着镜头动。
 * 负责：左上角的日期/时间/钱、底部的对话框、手机上的摇杆和按钮。
 * 文字内容在 src/locales/zh.json，颜色在 src/config/settings.ts。
 */
import Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { font, localName, t } from '../locales/i18n';
import { INPUT_EVENTS, TouchControls } from '../input/Controls';
import { gameState } from '../systems/GameState';
import itemsData from '../data/items.json';

/** 界面和地图之间互相传的消息 */
export const UI_EVENTS = {
  /** 让对话框显示一句话，参数是语言文件里的名字，比如 'hint.rock' */
  say: 'ui:say',
  /** 对话框没开时按了「使用」，交给地图去处理 */
  interactWorld: 'ui:interactWorld',
} as const;

export class HudScene extends Phaser.Scene {
  private dateText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private dialog!: Phaser.GameObjects.Container;
  private dialogBg!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;

  constructor() {
    super('Hud');
  }

  create(data: { touch: boolean }) {
    const res = window.devicePixelRatio || 1;
    const style = { fontFamily: font(), fontSize: '18px', color: SETTINGS.colors.hudText };

    // ---- 左上角：日期、时间、钱 ----
    this.add.rectangle(12, 12, 210, 82, 0x000000, 0.35).setOrigin(0);
    this.dateText = this.add.text(24, 20, '', style).setResolution(res);
    this.timeText = this.add.text(24, 44, '', style).setResolution(res);
    this.moneyText = this.add.text(24, 68, '', { ...style, fontSize: '16px', color: '#e8c872' }).setResolution(res);

    // ---- 底部对话框 ----
    this.dialogBg = this.add.rectangle(0, 0, 100, 100, SETTINGS.colors.dialogBg, 0.92).setOrigin(0).setStrokeStyle(2, 0xc9a86a);
    this.dialogText = this.add
      .text(0, 0, '', { fontFamily: font(), fontSize: '20px', color: SETTINGS.colors.dialogText, wordWrap: { width: 100, useAdvancedWrap: true } })
      .setResolution(res);
    this.dialog = this.add.container(0, 0, [this.dialogBg, this.dialogText]).setVisible(false).setDepth(50);
    // 点对话框也能关掉（手机上方便）
    this.dialogBg.setInteractive().on('pointerdown', (_p: unknown, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.closeDialog();
    });

    // ---- 手机触屏按钮 ----
    if (data?.touch) {
      new TouchControls(this, { action: t('buttons.action'), bag: t('buttons.bag'), menu: t('buttons.menu') }, font());
    }

    this.layout();
    this.scale.on('resize', this.layout, this);

    // ---- 接收指令 ----
    const ev = this.game.events;
    const onAction = () => {
      if (gameState.uiBusy) this.closeDialog();
      else ev.emit(UI_EVENTS.interactWorld);
    };
    const onBag = () => !gameState.uiBusy && this.say('msg.bagNotReady');
    const onMenu = () => (gameState.uiBusy ? this.closeDialog() : this.say('msg.menuNotReady'));
    const onSay = (key: string) => this.say(key);
    ev.on(INPUT_EVENTS.action, onAction);
    ev.on(INPUT_EVENTS.bag, onBag);
    ev.on(INPUT_EVENTS.menu, onMenu);
    ev.on(UI_EVENTS.say, onSay);
    this.events.once('shutdown', () => {
      ev.off(INPUT_EVENTS.action, onAction);
      ev.off(INPUT_EVENTS.bag, onBag);
      ev.off(INPUT_EVENTS.menu, onMenu);
      ev.off(UI_EVENTS.say, onSay);
      this.scale.off('resize', this.layout, this);
    });
  }

  update() {
    const clock = gameState.clock;
    if (!clock) return;
    this.dateText.setText(clock.dateText());
    this.timeText.setText(clock.timeText());
    this.moneyText.setText(t('hud.money', { amount: gameState.cash, unit: localName(itemsData.currency.name) }));
  }

  /** 显示一句话 */
  say(key: string) {
    this.dialogText.setText(t(key));
    this.dialog.setVisible(true);
    gameState.uiBusy = true;
  }

  closeDialog() {
    this.dialog.setVisible(false);
    gameState.uiBusy = false;
  }

  /** 按屏幕大小摆放对话框 */
  private layout() {
    const { width, height } = this.scale;
    // 对话框宽度：屏幕宽度减去两边，手机上给右下角按钮留位置
    const w = Math.min(720, width - 260);
    const h = 96;
    const x = (width - w) / 2;
    const y = height - h - 16;
    this.dialogBg.setPosition(x, y).setSize(w, h);
    this.dialogBg.input?.hitArea.setTo(0, 0, w, h);
    this.dialogText.setPosition(x + 18, y + 14).setWordWrapWidth(w - 36, true);
  }
}
