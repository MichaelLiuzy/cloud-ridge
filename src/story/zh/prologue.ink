// =====================================================================
//  序章剧本（中文）
// =====================================================================
//  写法说明（改台词只要改文字，不用懂代码）：
//   - 一行一句。行尾的 #speaker:zhou 表示谁说的（名字在 src/locales/zh.ts 的 names 里），
//     #mood:excited 表示语气（以后对应不同表情的头像）。没有 #speaker 的是旁白。
//   - 台词里要提到人名时写 @fan、@zhou 这种（名字只在语言文件里写一次，以后改名只改一处）。
//   - {player_name} 是玩家输入的名字。
//   - <<clue:线索id=显示的字>> 会把这几个字标成黄色，并让玩家拿到这条线索（线索表在 src/data/clues.ts）。
//   - #input:player_name 表示这句说完弹出输入名字的框。
//   - #clue:线索id 表示这句话之后拿到线索；#learn:操作id 把一项操作记进笔记本「操作」栏；
//     #learned:条目id 记进「已学会」栏；#give:物品id 给玩家一件东西。
//   - 标着 // 草稿 的台词是先补上的，可以直接改。
//   - 以 // 开头的行是说明，游戏里不显示。
//
//  这些变量由游戏传进来，剧本只读、不要改：
VAR player_name = ""
VAR is_touch = false

// ---------------------------------------------------------------------
//  医馆醒来（开局过场的最后一格之后）
// ---------------------------------------------------------------------
=== clinic ===
……你醒啦。 #speaker:zhou
甚好！此乃奇迹！ #speaker:doctor #mood:excited
……？ #speaker:player #mood:surprised
（你尝试坐起来。）
别急着起来，好好歇着。我和@fan给你备了些应急的物件，回头一起给你带回去。 #speaker:zhou
哎，可怜的孩子…… #speaker:fan #mood:worried
你们……是谁？我在哪里？ #speaker:player #mood:worried
完了！失忆了！ #speaker:doctor #mood:surprised
你不记得发生什么了？ #speaker:zhou #mood:worried
（你摇了摇头。）
大夫，这可怎么办？ #speaker:zhou #mood:worried
告诉我，你记得些什么？ #speaker:doctor
我叫…… #speaker:player #input:player_name
……{player_name}。 #speaker:player
（众人愣神。）
看来病得不轻啊！ #speaker:zhou #mood:worried
// 草稿
诸位莫要大惊小怪。他刚从鬼门关回来，记不清事是常有的。让他慢慢来，别逼他。 #speaker:doctor
……我不理解。 #speaker:player #mood:worried
// 草稿
没关系，孩子，没关系。 #speaker:fan
// 草稿
对对，镇上的人都会帮你的。 #speaker:zhou #mood:smile
<<clue:better_forgotten=不记得了也好>>……不记得了，就重新开始过日子吧。以后我们就叫你「{player_name}」了。 #speaker:fan #mood:worried
（你听着他们谈论着你的名字，又沉沉睡了过去……） #clue:woke_up
-> END

// ---------------------------------------------------------------------
//  在农场醒来，和周里正说话：教基本操作，给笔记本
// ---------------------------------------------------------------------
=== tutorial ===
醒了？身子骨可还撑得住？ #speaker:zhou #mood:smile
这片地往后就交给你了。地里的活不难，我教你几样。 #speaker:zhou
{ is_touch:
    （操作：在屏幕左半边按住拖动，就能走路。） #learn:move
- else:
    （操作：W A S D 或方向键走路。） #learn:move
}
锄头开荒，水桶浇地，镰刀割草，斧头劈柴。手上拿什么，就干什么活。 #speaker:zhou
{ is_touch:
    （操作：点底下的工具栏换工具。点地里的东西，就会走过去用手上的工具，或者弹出能做的事让你选。） #learn:tools
- else:
    （操作：数字键 1~9 换工具，空格用工具对着面前那一格干活。） #learn:tools
}
有事找人、看看东西，凑过去就是。 #speaker:zhou
{ is_touch:
    （操作：轻点人或东西就能查看、说话。右下角的「使用」键，对着面前那一格做最合适的事。） #learn:interact
- else:
    （操作：回车查看东西、和人说话。也可以直接用鼠标点。） #learn:interact
}
累了就回草棚歇着。床边能存一存今天的进度，不睡也行。 #speaker:zhou
（操作：点草棚，选「睡觉」会结束这一天并存档；选「存档（不睡）」只存档。） #learn:save
// 草稿
对了，这个本子你拿着。记不住的事，就写下来。 #speaker:zhou #mood:smile
（你拿到了笔记本。） #give:notebook #learned:got_notebook
{ is_touch:
    （操作：点「背包」打开菜单，里面有背包、笔记本和地图，点上面的栏目名切换。） #learn:menu
- else:
    （操作：按 Q 打开菜单，里面有背包、笔记本和地图，按 Tab 切换栏目。） #learn:menu
}
// 草稿
好了，我也该回镇上了。有事就来找我。 #speaker:zhou
-> END

// ---------------------------------------------------------------------
//  教完之后再找周里正说话
// ---------------------------------------------------------------------
=== zhou_idle ===
// 草稿
地里的活慢慢来，别把身子累垮了。 #speaker:zhou #mood:smile
-> END
