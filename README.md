# 云岭 Cloud Ridge

> **开工前先读 [`docs/技术方案.md`](docs/技术方案.md)。** 那是和 Zeyu 逐项确认过的定稿，所有做法以它为准。

明清风中式玄幻的种田悬疑游戏。网页版，Mac 和 iPhone 都能玩，能离线。

> 现在是**原型**：能在农场里走动、开垦、浇水、割草、砍树桩、睡觉、存档。
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
| 背包 | Q（还没做） | | 「背包」按钮 |
| 菜单 | M | | 右上「菜单」按钮 |

现在能做的事：锄头开垦草地、水桶浇田、镰刀割草、斧头砍树桩和火灾残骸。
每件事花体力，体力用完或熬到凌晨两点会昏倒，第二天在草棚醒来（数值都在 `src/data/time.ts`）。

### 存档

- **3 个存档位**。开新游戏时选一个存档位。
- **点草棚**会出床边菜单：「睡觉」= 结束这一天并自动存档；「存档（不睡）」= 白天也能存，存完接着玩。
  时间、位置、体力、钱、每一格田（包括今天浇没浇水）都会记下来。
- **临时进度**：游戏切到后台（切 app、锁屏、关网页）时会自动存一份，和存档位分开。下次打开会问你要不要接着玩。
- **备份**：游戏里按 M（或点「菜单」）→「导出存档」，会下载一个 `.json` 文件；标题画面「导入存档」可以把它读回来，换设备也能用。

**iPhone 离线玩：** 用 Safari 打开游戏网址 → 点「分享」→「添加到主屏幕」。之后从主屏幕图标打开，没网也能玩，存档也不容易被系统清掉。

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
| 游戏里显示的任何中文字 | `src/locales/zh.ts` | 搜你想改的那句话，改引号里的字 |
| 游戏名 | `src/locales/zh.ts` | `game.title` |
| 农场地图（树、石头、田放在哪） | `src/world/farmMap.ts` | 用字符画的地图，文件开头有字符对照表 |
| 哪个工具对什么东西有用、做完变成什么 | `src/world/actions.ts` | `TOOL_ACTIONS` |
| 每件事花多少体力、体力多少算「累」 | `src/data/time.ts` | `stamina` |
| 一天过多快 | `src/data/time.ts` | `clock.realSecondsPerGameHour`（现实几秒 = 游戏一小时） |
| 开局有多少钱、带什么种子 | `src/data/start.ts` | `cash`、`inventory` |
| 作物生长天数、价格 | `src/data/crops.ts` | 每种作物的 `growDays`、`sellPrice` |
| 物品价格 | `src/data/items.ts` | `buyPrice`、`sellPrice` |
| 打工任务和报酬 | `src/data/jobs.ts` | `reward` 等 |
| 修房子要什么材料 | `src/data/housing.ts` | `materials`、`cost` |

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
  config/settings.ts   ★ 常调设置：速度、按键、颜色、摇杆
  locales/zh.ts        ★ 所有中文文字
  locales/i18n.ts      多语言工具（以后加英文版用）
  data/*.ts            ★ 数值表：时间、作物、物品、打工、房子、开局
  data/types.ts        数值表的格式说明（打错了会报错就靠它）
  world/farmMap.ts     ★ 农场地图（字符画）
  world/actions.ts     ★ 对什么东西能做什么（工具规则、床边菜单）
  scenes/
    BootScene.ts       画占位图（以后换成加载美术图片）
    TitleScene.ts      标题画面：继续 / 新游戏 / 导入存档
    FarmScene.ts       农场：地图、走路、点东西、开垦浇水、睡觉存档
    HudScene.ts        界面：日期时间体力、工具栏、对话框、小菜单、手机按钮
  systems/
    Clock.ts           游戏时钟（季节、天、时辰）
    GameState.ts       全局状态（钱、体力、背包……）
    pathfind.ts        点远处时自动找路
    save/              存档：格式和自动升级、3 个存档位、临时进度、存储
  ui/
    ListMenu.ts        小菜单
    fileTransfer.ts    导出 / 导入存档文件
  input/Controls.ts    键盘、鼠标、手机摇杆和点击，统一成同一套指令
public/icons/          主屏幕图标
```

带 ★ 的是你最可能想改的。

## 加英文版

所有玩家看到的字都在 `src/locales/zh.ts`，代码里不写死中文。加英文时复制一份改名 `en.ts`，
把类型写成 `LocaleStrings` 再翻译（漏翻会报错），然后在 `src/locales/i18n.ts` 里加一行即可。
数据表里的名字已经有 `zh` / `en` 两栏。

## 技术说明（给程序用）

- Phaser 3 + TypeScript + Vite，PWA（vite-plugin-pwa）离线。
- 本地运行：`npm install`，然后 `npm run dev`；打包：`npm run build`（会先做类型检查）。
- 发布：Cloudflare Pages 连接本仓库，构建命令 `npm run build`，输出目录 `dist`，Node 版本见 `.node-version`。推到 `main` 自动发布。
- 存档：带 `saveVersion` 的 JSON，存在 IndexedDB（`src/systems/save/storage.ts`，转 app 时只换这一层）。改存档格式时把 `SAVE_VERSION` 加 1，并在 `saveFormat.ts` 的 `MIGRATIONS` 里写升级步骤。
- 以后转 app：iOS 用 Capacitor，Mac 用 Tauri 套壳，不用重写。
