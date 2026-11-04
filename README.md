# 云岭 Cloud Ridge

明清风中式玄幻的种田悬疑游戏。网页版，Mac 和 iPhone 都能玩，能离线。

> 现在是**最小原型**：小人能在农场里走动，对着东西按「使用」会显示说明，左上角有日期、时辰和钱。
> 地图和人物还是色块占位，等美术定了再换。

---

## 怎么玩

Mac 和手机用同一套规则：**想干什么就直接点那个东西**。只有一件事可做就直接做，有好几件就弹出小菜单让你选；离得远会自动走过去再做。

| | Mac（键盘） | Mac（鼠标） | iPhone（触屏，请横屏） |
|---|---|---|---|
| 走路 | W A S D 或方向键 | 点地面 →「走到这里」 | 左半边屏幕按住拖动（摇杆） |
| 做事 | 回车 = 查看 / 交互；空格 = 用手上的工具 | 点那个东西 | 轻点那个东西；或按右下「使用」对面前一格 |
| 小菜单 | 上下键选，回车确认，Esc 取消 | 点选项，点外面取消 | 点选项，点外面取消 |
| 换工具 | 数字键 1~9 | 点底部工具栏 | 点底部工具栏 |
| 背包 | Q | | 「背包」按钮 |
| 菜单 | M | | 右上「菜单」按钮 |

现在能做的事：锄头开垦草地、水桶浇田、镰刀割草、斧头砍树桩和火灾残骸、对着草棚睡觉。
每件事花体力，体力用完或熬到凌晨两点会昏倒，第二天在草棚醒来（数值都在 `src/data/time.json`）。

**iPhone 离线玩：** 用 Safari 打开游戏网址 → 点底部「分享」→「添加到主屏幕」。之后从主屏幕图标打开，没网也能玩。

---

## 想改什么，去哪里改

所有文件都在 `src/` 文件夹里。每个文件开头都有中文说明，常调的东西旁边都写了注释。

| 想改的东西 | 打开这个文件 | 找哪一项 |
|---|---|---|
| 走路速度 | `src/config/settings.ts` | `playerSpeed` |
| 画面放大缩小 | `src/config/settings.ts` | `tilesVisibleVertically`（数字越小画面越大） |
| 按键（比如把背包改成 B） | `src/config/settings.ts` | `keys` 里的 `bag: ['Q']` 改成 `['B']` |
| 手机摇杆、按钮大小和透明度 | `src/config/settings.ts` | `touch` |
| 草地、水、人物衣服等颜色 | `src/config/settings.ts` | `colors` |
| 游戏里显示的任何中文字 | `src/locales/zh.json` | 搜你想改的那句话，改引号里的字 |
| 游戏名 | `src/locales/zh.json` | `game.title` |
| 农场地图（树、石头、田放在哪） | `src/world/farmMap.ts` | 用字符画的地图，文件开头有字符对照表 |
| 哪个工具对什么东西有用、做完变成什么 | `src/world/actions.ts` | `TOOL_ACTIONS` |
| 每件事花多少体力、体力多少算「累」 | `src/data/time.json` | `stamina` |
| 一天过多快 | `src/data/time.json` | `realSecondsPerGameHour`（现实几秒 = 游戏一小时） |
| 开局有多少钱、带什么种子 | `src/data/start.json` | `cash`、`inventory` |
| 作物生长天数、价格 | `src/data/crops.json` | 每种作物的 `growDays`、`sellPrice` |
| 物品价格 | `src/data/items.json` | `buyPrice`、`sellPrice` |
| 打工任务和报酬 | `src/data/jobs.json` | |
| 修房子要什么材料 | `src/data/housing.json` | |

> `src/data/` 里的数值表来自设计主管窗口。改 JSON 文件时注意：引号、逗号不要删，最后一项后面不能多逗号。

### 在 GitHub 网页上直接改（不用装任何软件）

1. 打开仓库页面，点进想改的文件（比如 `src/config/settings.ts`）。
2. 点右上角的铅笔图标 ✏️（Edit this file）。
3. 改好后点绿色的 **Commit changes…**，再点一次确认。
4. 等一两分钟，网站会自动重新发布，刷新游戏网址就能看到效果。
   （如果改坏了打不开，告诉编程窗口，或者在文件的 History 里看改了什么、改回去。）

---

## 文件结构（给好奇的你）

```
src/
  main.ts              游戏入口，把各个场景接起来
  config/settings.ts   ★ 常调设置：速度、按键、颜色、摇杆
  locales/zh.json      ★ 所有中文文字
  locales/i18n.ts      多语言工具（以后加英文版用）
  data/*.json          ★ 数值表：时间、作物、物品、打工、房子、开局
  world/farmMap.ts     ★ 农场地图（字符画）
  scenes/
    BootScene.ts       画占位图（以后换成加载美术图片）
    TitleScene.ts      标题画面
    FarmScene.ts       农场：地图、主角走路、碰撞、按「使用」
    HudScene.ts        界面：日期时间、对话框、手机按钮
  world/actions.ts     ★ 对什么东西能做什么（工具规则）
  systems/
    Clock.ts           游戏时钟（季节、天、时辰）
    pathfind.ts        点远处时自动找路
    GameState.ts       全局状态（以后的存档也在这）
  input/Controls.ts    键盘、鼠标、手机摇杆和点击，统一成同一套指令
public/icons/          主屏幕图标
```

带 ★ 的是你最可能想改的。

## 加英文版

所有玩家看到的字都在 `src/locales/zh.json`，代码里不写死中文。加英文时复制一份改名 `en.json` 翻译，
再在 `src/locales/i18n.ts` 里加一行即可。数据表里的名字已经有 `zh` / `en` 两栏。

## 技术说明（给程序用）

- Phaser 3 + TypeScript + Vite，PWA（vite-plugin-pwa）离线。
- 本地运行：`npm install`，然后 `npm run dev`；打包：`npm run build`。
- 推到 `main` 后由 GitHub Actions 自动发布到 GitHub Pages。
- 以后转 app：iOS 用 Capacitor，Mac 用 Tauri 套壳，不用重写。
