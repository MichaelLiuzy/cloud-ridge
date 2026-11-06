/**
 * 输入名字的框。
 * 用的是网页里真正的输入框（叠在游戏画面上面），这样 iPhone 能弹出系统键盘、能用中文输入法。
 * 规则（能用什么字、多长）在 src/config/settings.ts 的 nameRules 里。
 */
import type Phaser from 'phaser';
import { SETTINGS } from '../config/settings';
import { t } from '../locales/i18n';
import { checkName } from '../systems/playerName';

interface Options {
  /** 框上面的标题 */
  title: string;
  /** 一开始填好的名字 */
  initial?: string;
  /** 能不能取消。起名字那一步不能取消 */
  cancellable?: boolean;
}

/** 弹出输入框，等玩家填好。取消返回 null */
export function askName(game: Phaser.Game, opts: Options): Promise<string | null> {
  const ui = SETTINGS.ui;
  const keyboard = game.input.keyboard;
  // 打字时不要让游戏把 W A S D、空格这些键当成操作
  if (keyboard) keyboard.enabled = false;

  const wrap = document.createElement('div');
  wrap.style.cssText = `position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;
    background:rgba(30,26,31,.55);font-family:FusionPixel,"PingFang SC",sans-serif;touch-action:auto;`;
  const box = document.createElement('form');
  box.style.cssText = `background:${ui.panel};border:2px solid ${ui.border};box-shadow:inset 0 0 0 2px ${ui.innerBorder};
    color:${ui.text};padding:16px 18px;width:min(86vw,340px);box-sizing:border-box;`;
  const title = document.createElement('div');
  title.textContent = opts.title;
  title.style.cssText = 'font-size:16px;margin-bottom:10px;';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = opts.initial ?? '';
  input.placeholder = t('nameInput.placeholder');
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  // 字号至少 16px，iPhone 才不会自动把网页放大
  input.style.cssText = `width:100%;box-sizing:border-box;font:16px FusionPixel,"PingFang SC",sans-serif;padding:8px;
    border:2px solid ${ui.border};background:#fff;color:${ui.text};border-radius:0;outline:none;
    -webkit-user-select:text;user-select:text;touch-action:auto;`;
  const error = document.createElement('div');
  error.style.cssText = `min-height:20px;font-size:13px;color:${ui.staminaLow};margin:6px 0;line-height:1.4;`;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
  const button = (label: string, primary: boolean) => {
    const b = document.createElement('button');
    b.type = primary ? 'submit' : 'button';
    b.textContent = label;
    b.style.cssText = `font:16px FusionPixel,"PingFang SC",sans-serif;padding:6px 16px;border:2px solid ${ui.border};
      background:${primary ? ui.innerBorder : ui.panel};color:${ui.text};border-radius:0;`;
    return b;
  };
  const ok = button(t('nameInput.ok'), true);
  const cancel = opts.cancellable ? button(t('nameInput.cancel'), false) : null;
  if (cancel) row.append(cancel);
  row.append(ok);
  box.append(title, input, error, row);
  wrap.append(box);
  document.body.append(wrap);
  // 不让点击、按键穿到游戏里
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'keydown', 'keyup']) {
    wrap.addEventListener(type, (e) => e.stopPropagation());
  }
  setTimeout(() => input.focus(), 50);

  return new Promise((resolve) => {
    const finish = (value: string | null) => {
      wrap.remove();
      if (keyboard) keyboard.enabled = true;
      resolve(value);
    };
    input.addEventListener('input', () => (error.textContent = ''));
    box.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = input.value.trim();
      const problem = checkName(name);
      if (problem) {
        error.textContent = problem;
        input.focus();
        return;
      }
      input.blur();
      finish(name);
    });
    cancel?.addEventListener('click', () => finish(null));
    if (opts.cancellable) {
      wrap.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Escape') finish(null);
      });
    }
  });
}
