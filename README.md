# 云岭 Cloud Ridge

> **开工前先读 [`docs/技术方案.md`](docs/技术方案.md)。** 那是和 Zeyu 逐项确认过的定稿，所有做法以它为准。

明清风中式玄幻的种田悬疑游戏。网页版，Mac 和 iPhone 都能玩，能离线。

**在线试玩：** https://cloud-ridge.michaelliuzy83.workers.dev/

> 现在是**原型**：能在农场里走动、开垦、浇水、割草、砍树桩、睡觉、存档。
> 画面是 320×180 的像素风，整数倍放大铺满屏幕（多出来的地方留黑边）。有昼夜变化，夜里灯笼会亮。
> 还没有正式美术的地方用调色板色块占位；把 ChatGPT 出的图放进 `art_raw/`，就会自动换上（见下面「换美术图」）。

---

## 怎么玩

Mac 和手机用同一套规则：**想干什么就直接点那个东西**。只有一件事可做就直接做，有好几件就弹出小菜单让你选；离得远会自动走过去再做。

| | Mac（键盘） | Mac（鼠标） | iPhone（触屏，请横屏） |
|---|---|---|---|
| 走路 | W A S D 或方向键 | 点地面 →「走到这里」 | 左半边屏幕按住拖动（摇杆） |
| 做事 | 回车 = 查看 / 交互；空格 = 用手上的工具 | 点那个东西 | 轻点那个东西；或按右下「使用」对面前一格 |
| 小菜单 | 上下键选，回车确认，Esc 取消 | 点选项，点外面取消 | 点选项，点外面取消 |
| 换工具 | 数字键 1~9 | 点底部工具栏 | 点底部工具栏 |
| 背包 | Q（还没做） | | 「背包」按钮 |
| 菜单 | M | | 右上「菜单」按钮 |

现在能做的事：锄头开垦草地、水桶浇田、镰刀割草、斧头砍树桩和火灾残骸。

**测试用：** 按 M 打开菜单，最下面有「时间快进 3 小时」（看傍晚和夜里）和「回忆模式 开 / 关」（画面去色，只有灯笼保留颜色）。
Mac 上也可以按 F8 开关回忆模式。正式给朋友玩之前，把 `src/config/settings.ts` 里的 `debugMenu` 改成 `false`。
每件事花体力，体力用完或熬到凌晨两点会昏倒，第二天在草棚醒来（数值都在 `src/data/time.ts`）。

### 存档

- **3 个存档位**。开新游戏时选一个存档位。
- **点草棚**会出床边菜单：「睡觉」= 结束这一天并自动存档；「存档（不睡）」= 白天也能存，存完接着玩。
  时间、位置、体力、钱、每一格田（包括今天浇没浇水）都会记下来。
- **临时进度**：游戏切到后台（切 app、锁屏、关网页）时会自动存一份，和存档位分开。下次打开会问你要不要接着玩。
- **备份**：游戏里按 M（或点「菜单」）→「导出存档」，会下载一个 `.json` 文件；标题画面「导入存档」可以把它读回来，换设备也能用。

**iPhone 离线玩：** 用 Safari 打开游戏网址 → 点「分享」→「添加到主屏幕」。之后从主屏幕图标打开，没网也能玩，存档也不容易被系统清掉。

---

## 换美术图（不用修图，也不用写代码）

1. **把图放进 `art_raw/` 文件夹。** 文件名要照规则起，比如主角站立图叫 `player_stand.png`（完整对照表见 [`art_raw/README.md`](art_raw/README.md)）。
   - 在 GitHub 网页上：打开 `art_raw` → **Add file** → **Upload files** → 拖进去 → **Commit changes**。
   - 或者放进自己电脑上的仓库文件夹，让本地的 Claude Code 帮你提交推送。
2. **整理脚本会自动运行。** 在 GitHub 上传后，Cloudflare 发布时会自动跑一遍（一两分钟），刷新游戏就能看到新图。
   在自己电脑上，打开终端进到仓库文件夹，输入 `npm run art` 回车；`npm run dev` 启动时也会先自动跑一遍。
   它会把大图缩小、抠掉品红背景、切格子、套 24 色，结果放进 `public/assets/`。
3. **看预览页，检查切得对不对。** 每张原图旁边是处理后放大 4 倍的样子。
   - 网上：游戏网址后面加 `/art_preview/`，即 https://cloud-ridge.michaelliuzy83.workers.dev/art_preview/
   - 自己电脑上：跑完 `npm run art` 后，双击打开 `public/art_preview/index.html`。
   - 如果某张图被标成红字「按平均分格切的」，说明没找到格子间的品红空隙，切歪了的话让 ChatGPT 把格子间距留大一点重出。

没图的东西会用同样大小的色块代替，所以随时都能玩。`public/assets/` 和预览页是自动生成的，不会提交到 GitHub。

---

## 想改什么，去哪里改

所有文件都在 `src/` 文件夹里。每个文件开头都有中文说明，常调的东西旁边都写了注释。

| 想改的东西 | 打开这个文件 | 找哪一项 |
|---|---|---|
| 走路速度 | `src/config/settings.ts` | `playerSpeed` |
| 开场过场不操作时，等几秒自动翻页 | `src/config/settings.ts` | `cutscene.autoAdvanceMs` |
| 过场某一格单独停久一点或短一点 | `src/data/cutscenes.ts` | 那一格的 `autoMs` |
| 过场时最上方「按任意键翻页」的提示：文字 / 颜色、透明度、闪烁快慢 | `src/locales/zh.ts`、`src/config/settings.ts` | `cutscene.hintKey`、`cutscene.hintTap`；`cutscene.hintColor`、`hintAlpha`、`hintBlinkMs` |
| 被墙角、门框卡住时自动往通道挪多少（贴边滑入） | `src/config/settings.ts` | `cornerSlidePixels`（0 = 关掉） |
| 按键（比如把背包改成 B） | `src/config/settings.ts` | `keys` 里的 `bag: ['Q']` 改成 `['B']` |
| 手机摇杆、按钮大小和透明度 | `src/config/settings.ts` | `touch` |
| 对话框、物品栏、时辰框的颜色 | `src/config/settings.ts` | `ui` |
| 左上角时辰框的位置、大小、内边距，体力条的长和粗 | `src/config/settings.ts` | `ui.infoBox`、`ui.staminaBar` |
| 水面波光多久换一次 | `src/config/settings.ts` | `waterShimmerMs` |
| 没有图时占位色块的颜色和样子 | `src/config/assets.ts` | 每张图的 `color`、`shape` |
| 27 色调色板 | `src/config/palette.json` | `colors` |
| 昼夜颜色、几点变色、灯光多亮、回忆模式 | `src/config/atmosphere.ts` | `dayTint`、`lightLevel`、`light`、`memory` |
| 走路颠动、工具挥动的快慢 | `src/config/settings.ts` | `walkBob…`、`toolSwingMs` |
| 新的一种美术图怎么切（几行几格、多大） | `tools/art_rules.json` | 照着已有的规则加一条 |
| 抠图有多狠、空隙多宽算空隙 | `tools/art.mjs` | 开头的 `TUNING` |
| 游戏里显示的任何中文字 | `src/locales/zh.ts` | 搜你想改的那句话，改引号里的字 |
| 游戏名 | `src/locales/zh.ts` | `game.title` |
| 农场地图（树、石头、田放在哪） | `src/world/farmMap.ts` | 用字符画的地图，文件开头有字符对照表 |
| 哪个工具对什么东西有用、做完变成什么 | `src/world/actions.ts` | `TOOL_ACTIONS` |
| 每件事花多少体力、体力多少算「累」 | `src/data/time.ts` | `stamina` |
| 一天过多快 | `src/data/time.ts` | `clock.realSecondsPerGameHour`（现实几秒 = 游戏一小时） |
| 作物生长天数、价格、播种时节、耐不耐寒 | `src/data/crops.ts` | 每种作物的 `growDays`、`sellPrice`、`sowWindows`、`frostHardy`、`perennial` |
| 月份、节气表、赶集日、节日表、霜降和冻土规则 | `src/data/time.ts` | `calendar` 里的 `solarTerms`、`marketDays`、`festivals`、`farmingRules` |
| 开局日期（现在是正月十六） | `src/data/start.ts` | `startDay` |
| 物品价格 | `src/data/items.ts` | `buyPrice`、`sellPrice` |
| 打工任务和报酬 | `src/data/jobs.ts` | `reward` 等 |
| 重建老宅的四个阶段：材料、工钱、体力上限、修好后学会什么 | `src/data/housing.ts` | `stages` 里每阶段的 `materials`、`cost`、`maxStamina`、`learns` |
| 清废墟每格花多少体力、能用哪些工具 | `src/data/time.ts`、`src/data/housing.ts` | `stamina.costs.clear_ruin`；`ruins.tools` |
| 废墟在地图上的位置、老宅盖在哪 | `src/world/farmMap.ts` | 地图里的 `R`（四周的破瓦焦木）、`Q`（烧毁的老宅）；`HOUSE_SITE` |
| 田地篱笆上的门 | `src/world/farmMap.ts` | 地图里的 `G` |
| 人物图套色时的肤色保护 | `tools/art.mjs` | `TUNING.skin` |
| 每个阶段找到哪一页日记、在哪找到 | `src/data/diary.ts` | `DIARY_PAGES`（找到的位置文字在 `src/locales/zh.ts` 的 `diary.where`） |
| 赶集日涨价多少、哪些种子只在赶集日卖 | `src/data/time.ts` | `calendar.marketPriceBonus`、`calendar.marketOnlySeeds` |
| 杂货铺上门收货：几颗心解锁、开通要多少钱 | `src/data/services.ts` | `pickup.unlockHearts`、`pickup.fee`（掌柜的台词在 `prologue.ink` 的 `pickup_offer`） |
| 周里正交给你的开局物资 | `src/data/start.ts` | `cash`、`inventory` |
| 好感度：每颗心多少点、最多几颗心 | `src/data/affection.ts` | `pointsPerHeart`、`maxHearts` |
| 草棚（柴房）箱子能放几种东西 | `src/data/housing.ts` | `hut.storageSlots` |
| 开场过场：有几格、顺序、每格用哪张图和什么效果 | `src/data/cutscenes.ts` | `CUTSCENES.opening`（每格的字在 `src/locales/zh.ts` 的 `cutscene`） |
| 医馆对话、周里正教学、所有剧情台词 | `src/story/zh/prologue.ink` | 文件开头有写法说明：`#speaker:` 谁说、`<<clue:id=字>>` 标黄字、`@fan` 写人名 |
| 人物名字（周里正、老范……） | `src/locales/zh.ts` | `names` |
| 线索、问题、章节和每章怎么解锁 | `src/data/clues.ts` | `CHAPTERS`、`CLUES`、`QUESTIONS` |
| 笔记本「操作」「已学会」两栏的字 | `src/locales/zh.ts` | `notebook.controls`、`notebook.learned` |
| Q 菜单有哪几栏、顺序 | `src/data/menuTabs.ts` | `MENU_TABS` |
| 名字能多长、汉字和字母各算多宽 | `src/config/settings.ts` | `nameRules` |
| 背包几行几列、格子多大 | `src/config/settings.ts` | `bag` |
| 对话框里旁白、黄字的颜色 | `src/config/settings.ts` | `ui` 里的 `textDim2`、`clueText`、`clueMark` |

> 改错了，打包会报错（比如数字写成了文字、物品 id 拼错）。看报错信息里的文件名和行号，或者直接告诉编程窗口。
> 每张数值表的完整格式说明在 `src/data/types.ts`。加新物品、新作物时，要把它的 id 也加进 `types.ts` 里对应的列表。

### 在 GitHub 网页上直接改（不用装任何软件）

1. 打开仓库页面，点进想改的文件（比如 `src/config/settings.ts`）。
2. 点右上角的铅笔图标 ✏️（Edit this file）。
3. 改好后点绿色的 **Commit changes…**，再点一次确认。
4. 等一两分钟，Cloudflare Pages 会自动重新发布，刷新游戏网址就能看到效果。
   （如果改坏了打不开，告诉编程窗口，或者在文件的 History 里看改了什么、改回去。）

---

## 文件结构（给好奇的你）

```
docs/技术方案.md        ★ 技术方案定稿（开工前先读）
src/
  main.ts              游戏入口，把各个场景接起来
  config/settings.ts   ★ 常调设置：速度、按键、界面颜色、摇杆
  config/assets.ts     ★ 素材清单：用哪些图、缺图时的占位色块
  config/atmosphere.ts ★ 昼夜叠色、灯光、回忆模式
  config/palette.json  ★ 24 色调色板（整理脚本和游戏共用）
  locales/zh.ts        ★ 所有中文文字
  locales/i18n.ts      多语言工具（以后加英文版用）
  data/*.ts            ★ 数值表：时间、作物、物品、打工、房子、开局
  data/types.ts        数值表的格式说明（打错了会报错就靠它）
  world/farmMap.ts     ★ 农场地图（字符画）
  world/actions.ts     ★ 对什么东西能做什么（工具规则、床边菜单）
  scenes/
    BootScene.ts       读美术图；缺的画占位色块
    TitleScene.ts      标题画面：继续 / 新游戏 / 导入存档
    FarmScene.ts       农场：地图、走路、点东西、开垦浇水、睡觉存档
    AtmosphereScene.ts 昼夜色层、灯笼光圈、回忆模式
    HudScene.ts        界面：日期时间体力、工具栏、对话框、小菜单、手机按钮
  systems/
    Clock.ts           游戏时钟（季节、天、时辰）
    GameState.ts       全局状态（钱、体力、背包……）
    pathfind.ts        点远处时自动找路
    save/              存档：格式和自动升级、3 个存档位、临时进度、存储
  ui/
    pixelUi.ts         画界面框、写像素字
    ListMenu.ts        小菜单
    fileTransfer.ts    导出 / 导入存档文件
  input/Controls.ts    键盘、鼠标、手机摇杆和点击，统一成同一套指令
public/icons/          主屏幕图标
public/assets/fonts/   像素字体 Fusion Pixel 12px（开源字体，许可证在同一个文件夹）
public/assets/         整理好的美术图（npm run art 自动生成，不提交）
art_raw/               ★ ChatGPT 生成的美术原图放这里（命名规则见 art_raw/README.md）
tools/art.mjs          美术整理脚本（npm run art）
tools/art_rules.json   ★ 每种图怎么切、切成多大
```

带 ★ 的是你最可能想改的。

## 加英文版

所有玩家看到的字都在 `src/locales/zh.ts`，代码里不写死中文。加英文时复制一份改名 `en.ts`，
把类型写成 `LocaleStrings` 再翻译（漏翻会报错），然后在 `src/locales/i18n.ts` 里加一行即可。
数据表里的名字已经有 `zh` / `en` 两栏。

## 技术说明（给程序用）

- Phaser 3 + TypeScript + Vite，PWA（vite-plugin-pwa）离线。
- 本地运行：`npm install`，然后 `npm run dev`；打包：`npm run build`（会先跑 `npm run art`，再做类型检查）。
- 画面：320×180，`Scale.NONE` + 按真实像素取整的 zoom，`pixelArt`/`roundPixels`。主角位置 = 脚底，按 y 排遮挡。
- 发布：Cloudflare（Workers & Pages）连接本仓库，构建命令 `npm run build`，部署命令 `npx wrangler deploy`（设置在 `wrangler.jsonc`），Node 版本见 `.node-version`。推到 `main` 自动发布。
- 存档：带 `saveVersion` 的 JSON，存在 IndexedDB（`src/systems/save/storage.ts`，转 app 时只换这一层）。改存档格式时把 `SAVE_VERSION` 加 1，并在 `saveFormat.ts` 的 `MIGRATIONS` 里写升级步骤。
- 以后转 app：iOS 用 Capacitor，Mac 用 Tauri 套壳，不用重写。
