/**
 * 空的界面层场景：剧情场景（开场过场、医馆）用它来画对话框和「按任意键翻页」提示。
 * 过场的图按地图的倍数放大；这一层按界面的倍数放大（大约 640×360），所以字更小更细。
 */
import Phaser from 'phaser';
import { VIEW_EVENTS, setupUiCamera } from '../config/view';

export class UiOverlayScene extends Phaser.Scene {
  constructor() {
    super('UiOverlay');
  }

  create() {
    setupUiCamera(this);
    const rezoom = () => setupUiCamera(this);
    this.game.events.on(VIEW_EVENTS.changed, rezoom);
    this.events.once('shutdown', () => this.game.events.off(VIEW_EVENTS.changed, rezoom));
  }
}
