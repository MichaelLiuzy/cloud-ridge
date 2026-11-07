# art_raw/：ChatGPT 生成的原图放这里

这里放**没处理过的原图**，也就是从 ChatGPT 下载下来的 PNG。整理脚本（`npm run art`）
会自动缩小、抠掉品红背景、切格子、套用 24 色调色板，把能直接用的图放进 `public/assets/`。
你不需要修图，也不需要自己切图。

- 在 GitHub 网页上传的图：Cloudflare 发布时会自动整理，一两分钟后刷新游戏就能看到。
- 在自己电脑上：终端里输入 `npm run art`（`npm run dev` 启动时也会自动跑）。
- 检查结果：打开预览页 https://cloud-ridge.michaelliuzy83.workers.dev/art_preview/
  （自己电脑上是 `public/art_preview/index.html`），每张原图旁边是处理后放大 4 倍的样子。

## 怎么放进来

两种方法任选一种：

- **在 GitHub 网页上传：** 打开仓库的 `art_raw` 文件夹 → 右上角 **Add file** → **Upload files** →
  把图拖进去 → 点绿色的 **Commit changes**。
- **在自己电脑上：** 把图复制到本地仓库的 `art_raw/` 文件夹里，然后让本地的 Claude Code 帮你提交并推送。

放好后，告诉编程窗口「art_raw 里有新图了」。

## 文件名规则（最重要）

脚本**靠文件名**判断这是什么图、该怎么切，所以名字必须完全一样：英文小写，用下划线连接，后缀 `.png`。
ChatGPT 每次出完图会告诉你文件名，照着存就行。

| 文件名 | 是什么 | 图里怎么排 |
|---|---|---|
| `player_stand.png` | 主角站立图 | 1 行 4 格：朝下、朝左、朝右、朝上 |
| `tiles_farm.png` | 农田地面 | 2 行 3 格：草地、黄土、锄过的地、浇过水的地、小路、篱笆 |
| `tiles_water.png` | 水面 | 1 行 2 格：`water`（平静水面）、`water_shimmer`（带波光的水面）。游戏里两格轮流换，做出水波 |
| `debris.png` | 田间杂物 | 1 行 4 格：野草、石头、树桩、火灾残骸 |
| `house_straw_hut.png` | 草棚 | 1 格，整栋房子 |
| `crop_bok_choy.png` | 小白菜 | 1 行 5 格：种子、幼苗、半大、成熟、枯萎 |
| `crop_radish.png` | 萝卜 | 同上 |
| `icons_batch1.png` | 第一批图标 | 2 行 5 格：锄头、水桶、镰刀、斧头、馒头；小白菜种子、萝卜种子、小白菜、萝卜、草木灰 |
| `icons_batch2.png` | 第二批图标 | 1 行 3 格：`pickaxe`（镐）、`notebook`（笔记本）、`burnt_paper`（烧焦的纸页） |
| `icons_batch3.png` | 第三批图标 | 1 行 4 格：木材、纤维、石块、树种 |
| `icons_materials.png` | 建材图标 | 1 行 3 格：瓦片、砖、柴火 |
| `icons_food.png` | 食物图标（可用火光色） | 1 行 4 格：茶、菜粥、萝卜汤、烤红薯 |
| `icons_crops_1.png` ~ `icons_crops_4.png` | 作物和种子图标 | 第一行是种子，第二行是对应的菜（顺序见 `tools/art_rules.json`）；`icons_crops_2` 可用火光色（南瓜橙） |
| `icons_ui.png` | 界面小图标 | 1 行 5 格：齿轮、钱袋、体力、锁、背包。有图就换掉代码画的那几个 |
| `prop_gate.png` | 田地篱笆上的门（16×16） | 1 格。没图时篱笆门就画成小路 |
| `cg_title.png` | 标题画面背景 | 整张画，上方中间留天空放标题字；没图时是纯色底 |
| `portrait_qian.png` / `npc_qian_stand.png` | 钱掌柜（杂货铺）的头像 / 站立图 | 同主角头像 / 站立图 |
| `portrait_eric.png` / `npc_eric_stand.png` | Eric 的头像 / 站立图（先登记，暂时不用） | 同上 |
| `house_old_ruin.png` | 烧毁的老宅（64×64） | 1 格，整栋烧毁的房子。立在宅基地上，四周废墟里的杂草、碎石、焦木（用的是 `debris_` 那几张图）清完、木匠搭好梁架后换成 `house_timber_frame` |
| `portrait_player.png` | 主角头像 | 1 行 4 格：平常、笑、担忧、惊讶 |
| `player_walk.png` | 主角走路（以后再画） | 4 行 5 格：每行一个方向（下、左、右、上），每行是站立 + 走路 4 格。有了它游戏会自动改用真的走路动画 |
| `prop_lantern.png` | 灯笼（可用火光色） | 1 行 2 格（每格 16×32）：`on` 点着、`off` 灭了 |
| `prop_mailbox.png` | 家门口的信箱 | 1 行 2 格（每格 16×32，脚底占 1 格）：`empty` 小旗放下、`flag` 小旗竖起露出信封 |
| `ui_letter.png` | 读信界面的信纸 | 整张画，横版 16:10，四边内侧淡朱红边框，纸面留空；没图时用浅色底加细边框 |
| `prop_tree.png` | 农场边缘的林子 | 1 格（16×32） |
| `tree_sapling.png` / `tree_small.png` / `tree_big.png` | 农场里自己长的树：树苗、小树、大树 | 1 格；树苗 16×16，小树 16×32，大树 32×48 |
| `portrait_zhou.png` / `portrait_doctor.png` / `portrait_fan.png` | 周里正 / 大夫 / 老范的头像 | 同主角头像 |
| `npc_zhou_stand.png` | 周里正站立图 | 同主角站立图 |
| `cg_office.png` 等 | 开场过场的整张画 | 1 张，横版（最好 16:9）；会从正中裁成 320×180，不抠背景。要的几张：`cg_office`（写字楼加班）、`cg_walk_home`（下班路上）、`cg_penn_station`（车站）、`cg_headlights`（车灯）、`cg_hospital_bed`（病床）、`cg_clinic_wake`（医馆醒来） |

以后的同类图照这个格式起名：

- 其他作物：`crop_` + 作物 id，例如 `crop_potato.png`（作物 id 见 `src/data/crops.ts`）
- 镇上的人：`npc_` + 人物 id + `_stand`，例如 `npc_doctor_stand.png`（人物 id 用人名，见 `src/locales/zh.ts` 的 names）；头像是 `portrait_` + 人物 id
- 其他房子：`house_` + 房子 id，例如 `house_thatched_cottage.png`（房子 id 见 `src/data/housing.ts`）。
  默认缩成 48×48；其他大小要在 `tools/art_rules.json` 的 `sizes` 里写一行（烧毁的老宅 `house_old_ruin` 和重建各阶段已写好 64×64）
- 其他地面：`tiles_` + 名字，2 行 3 格
- 其他摆设：`prop_` + 名字，默认 16×32

想加一种全新的图（比如 3 行 4 格的特效），在 `tools/art_rules.json` 里照着已有的规则加一条，不用改脚本。

## 出图要求（项目说明里已经写了，这里再提醒一下）

- 背景用纯品红 `#FF00FF`（地面纹理 `tiles_*` 除外），格子之间留品红空隙，不要画格线、不要写字。
- 尺寸不用管，ChatGPT 给多大都行，脚本会缩。
- 同一个文件名再放一次，就会替换掉旧图。想留着旧版，就先把旧的改名，比如 `player_stand_old.png`，
  脚本会跳过认不出的名字。

完整的美术规范见美术主管窗口的「美术规范 v0.1」文档。
