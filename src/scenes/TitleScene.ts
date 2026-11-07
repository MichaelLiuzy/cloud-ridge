/**
 * 标题画面：游戏名 + 「继续游戏 / 新游戏 / 导入存档」。
 *  - 如果上次没存档就离开了（切到后台时自动存了临时进度），会先问要不要接着玩。
 *  - 游戏名在 src/locales/zh.ts 的 game.title 里改。
 */
import { TITLE_SHOWN } from '../config/events';
import { enterFarm } from './FarmScene';
import Phaser from 'phaser';
import { PLACEHOLDERS } from './BootScene';
import { SETTINGS } from '../config/settings';
import { followView, setupWorldCamera } from '../config/view';
import { t } from '../locales/i18n';
import { pixelText } from '../ui/pixelUi';
import { ListMenu, type MenuOption } from '../ui/ListMenu';
import { pickTextFile } from '../ui/fileTransfer';
import { describeClock } from '../systems/Clock';
import { gameState, resetGameState } from '../systems/GameState';
import { currentSave } from '../systems/save/snapshot';
import type { SaveData } from '../systems/save/saveFormat';
import { clearTemp, listSlots, loadTemp, parseImport, saveToSlot, slotLabel } from '../systems/save/saveManager';

export class TitleScene extends Phaser.Scene {
  private menu?: ListMenu;
  private status!: Phaser.GameObjects.Text;
  private homeTip?: Phaser.GameObjects.Text;

  constructor() {
    super('Title');
  }

  create() {
    // 告诉入口：现在在标题画面，有新版本可以换（见 src/main.ts）
    this.game.events.emit(TITLE_SHOWN);
    const { gameWidth: W, gameHeight: H } = SETTINGS;
    const ui = SETTINGS.ui;
    this.menu = undefined;
    this.cameras.main.setBackgroundColor(ui.titleBg);
    // 标题画面和地图一样按 320×180 放大
    followView(this, () => setupWorldCamera(this));
    // 标题背景图（cg_title）：有图就铺在最下面，上方中间的天空放标题字；没图就是纯色底
    if (!PLACEHOLDERS.has('cg_title')) this.add.image(0, 0, 'cg_title').setOrigin(0).setDisplaySize(W, H);
    // 游戏名：12 像素的字放大 3 倍，保持像素方块
    pixelText(this, W / 2, 34, t('game.title'), { color: ui.titleText, title: true, size: SETTINGS.titleFontSize * 3 }).setOrigin(0.5);
    pixelText(this, W / 2, 60, t('game.subtitle'), { color: ui.titleSubText }).setOrigin(0.5);
    this.status = pixelText(this, W / 2, 76, '', { color: SETTINGS.ui.toolSelected, align: 'center' }).setOrigin(0.5);
    const press = pixelText(this, W / 2, needsAddToHomeTip() ? 104 : 124, t('game.pressToStart'), { color: ui.titleSubText }).setOrigin(0.5);
    this.tweens.add({ targets: press, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
    // 右上角淡淡的版本号：和汇报里的提交编号对得上，就说明手机/电脑上已经是最新版
    pixelText(this, W - 4, 3, t('game.version', { v: __BUILD_VERSION__ }), { color: ui.titleSubText }).setOrigin(1, 0).setAlpha(0.5);

    // iPhone / iPad 的 Safari、还没添加到主屏幕：提示添加（离线能玩、存档不容易被系统清掉）
    this.homeTip = needsAddToHomeTip()
      ? pixelText(this, W / 2, H - 3, `${t('game.addToHomeTip')}\n${t('game.addToHomeHow')}`, {
          color: ui.titleSubText,
          align: 'center',
          wrap: W - 16,
        }).setOrigin(0.5, 1)
      : undefined;

    this.events.once('shutdown', () => this.menu?.destroy());

    // 先「按任意键/点一下」，再出菜单（浏览器要先有一次操作，键盘和声音才能用）
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      press.destroy();
      this.homeTip?.destroy();
      this.homeTip = undefined;
      void this.firstMenu();
    };
    this.input.keyboard?.once('keydown', begin);
    this.input.once('pointerdown', begin);
  }

  /** 换一个菜单显示 */
  private show(options: MenuOption[], title?: string, onCancel?: () => void) {
    this.menu?.destroy();
    this.menu = new ListMenu(this, options, { title, width: 120, ownKeys: true, onCancel });
    // 菜单放在游戏名下面；太高放不下时往上挪，别超出画面
    const h = this.menu.container.height;
    const top = Math.max(2, Math.min(86, SETTINGS.gameHeight - 4 - h));
    this.menu.centerAt(SETTINGS.gameWidth / 2, top + h / 2);
  }

  private say(text: string) {
    this.status.setText(text);
  }

  // ---------------- 各个菜单 ----------------

  /** 一打开：有没有没存就离开的临时进度？ */
  private async firstMenu() {
    const temp = await loadTemp();
    if (!temp) return this.mainMenu();
    const { date, time } = describeClock(temp.clock);
    this.show(
      [
        { label: t('title.resume'), run: () => this.startGame(temp.slot, temp) },
        { label: t('title.discard'), run: async () => { await clearTemp(); void this.mainMenu(); } },
      ],
      t('title.resumePrompt', { date, time }),
    );
  }

  private async mainMenu() {
    const slots = await listSlots();
    const any = slots.some(Boolean);
    this.show([
      { label: t('title.continue'), run: () => this.slotMenu('continue'), disabled: !any },
      { label: t('title.newGame'), run: () => this.slotMenu('new') },
      { label: t('title.importSave'), run: () => this.importFlow() },
    ]);
  }

  /** 选存档位：继续 / 新游戏 / 放导入的存档 */
  private async slotMenu(mode: 'continue' | 'new' | 'import', imported?: SaveData) {
    const slots = await listSlots();
    const options: MenuOption[] = slots.map((save, i) => {
      const n = i + 1;
      const label = slotLabel(save, n);
      return {
        label,
        disabled: mode === 'continue' && !save,
        run: () => {
          if (mode === 'continue') return this.startGame(n, save);
          const go = () => (mode === 'new' ? this.startGame(n, null) : this.finishImport(n, imported!));
          if (save) this.confirmOverwrite(n, go, () => this.slotMenu(mode, imported));
          else go();
        },
      };
    });
    options.push({ label: t('title.back'), run: () => this.mainMenu() });
    const titleKey = mode === 'continue' ? 'title.pickSlotContinue' : mode === 'new' ? 'title.pickSlotNew' : 'title.pickSlotImport';
    this.show(options, t(titleKey), () => this.mainMenu());
  }

  private confirmOverwrite(n: number, yes: () => void, no: () => void) {
    this.show(
      [
        { label: t('title.overwriteNo'), run: no },
        { label: t('title.overwriteYes'), run: yes },
      ],
      t('title.overwrite', { n }),
      no,
    );
  }

  private async importFlow() {
    this.say('');
    const text = await pickTextFile();
    if (!text) return;
    const data = parseImport(text);
    if (!data) return this.say(t('title.importBad'));
    void this.slotMenu('import', data);
  }

  private async finishImport(n: number, data: SaveData) {
    await saveToSlot({ ...data, slot: n });
    this.say(t('title.importDone', { n }));
    void this.mainMenu();
  }

  /** 进游戏。save = null 是新游戏 */
  private startGame(slot: number, save: SaveData | null) {
    resetGameState(slot, save);
    const step = gameState.prologue;
    if (!save) void saveToSlot(currentSave()); // 新游戏：马上存一次，存档位里就是这局新游戏了
    if (step === 'opening' || step === 'clinic') {
      // 序章还没看完：从开场过场（或医馆对话的开头）重来
      this.scene.start('Story', { step });
      return;
    }
    enterFarm(this);
  }
}

/** 是不是 iPhone / iPad 上的 Safari，而且不是从主屏幕图标打开的 */
function needsAddToHomeTip() {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1); // 新 iPad 会假装是 Mac
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
  return iOS && !standalone;
}
