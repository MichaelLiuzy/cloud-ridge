/**
 * 线索笔记本的「主线」：章节、线索、问题
 * ================================================================
 *  内容来自主线剧情大纲（https://claude.ai/artifact/C85WTk7UxMhA4qVurQSAF9）。人名都是暂名。规则：
 *   - 线索只在它所属的章节开始之后才拿得到。
 *   - 拿到线索 → 笔记本记下线索和主角的推断；它引出的问题记成「未解决」。
 *   - 拿到某个问题的 answeredBy 线索 → 这个问题划掉，变成「已解决」。
 *   - 某章的解锁条件全部满足 → 这一章自动开始。
 *   - 笔记本不会提示「还差几条」「去找谁」。
 *
 *  文字里提到人名时写 @fan、@zhou、@eric 这种（名字在 src/locales/zh.ts 的 names 里，只写一次）。
 *  剧本里用 <<clue:线索id=显示的字>> 把关键句标黄，玩家读到就拿到这条线索。
 *
 *  加新条目时，先把 id 加到下面对应的列表（ChapterId / ClueId / QuestionId），
 *  再在表里写内容。引用了不存在的 id，npm run build 会报错。
 */
import type { LocalName } from './types';

/** 章节 id */
export type ChapterId = 'prologue' | 'who_is_eric' | 'that_month' | 'that_night' | 'how_i_lived' | 'epilogue';

/** 线索 id */
export type ClueId =
  // 序章
  | 'woke_up' | 'better_forgotten'
  // 第一章
  | 'missing_poster' | 'old_friend' | 'found_outside' | 'many_gifts' | 'everyone_knows'
  // 第二章
  | 'diary_soldiers' | 'fan_warning_month' | 'diary_wants_to_flee' | 'fan_warning_three_days' | 'the_raid'
  // 第三章
  | 'sister_away' | 'two_shadows' | 'fire_from_inside' | 'last_diary_page' | 'diary_backhill' | 'backhill_scorch'
  // 第四章
  | 'case_record' | 'outer_soul' | 'the_stranger';

/** 问题 id */
export type QuestionId =
  | 'whose_body' | 'why_better_forgotten'
  | 'who_is_eric' | 'where_is_eric' | 'who_pulled_me_out' | 'why_silent'
  | 'what_did_fan_say' | 'did_they_arrest'
  | 'anyone_saw' | 'how_fire_started' | 'what_in_backhill' | 'tell_sister'
  | 'why_alive';

/** 剧情事件 id（比如看过某段过场）。游戏里用 fireStoryEvent('事件id') 触发 */
export type StoryEventId = 'saw_missing_poster';

export interface Chapter {
  /** 第几章（0 = 序章） */
  number: number;
  name: LocalName;
  /** 解锁条件：要拿到哪些线索、发生过哪些事件，全部满足才开始。都不写 = 开新档就开始 */
  unlock: { clues?: ClueId[]; events?: StoryEventId[] };
}

export interface Clue {
  /** 属于哪一章（这章没开始时拿不到） */
  chapter: ChapterId;
  /** 笔记本里显示的文字 */
  text: LocalName;
  /** 主角的推断（可以不写） */
  inference?: LocalName;
}

export interface Question {
  /** 笔记本里显示的问题 */
  text: LocalName;
  /** 由哪条线索引出 */
  raisedBy: ClueId;
  /** 由哪条线索解答（还没答案就写 null） */
  answeredBy: ClueId | null;
}

/** 章节：按顺序排 */
export const CHAPTERS: Record<ChapterId, Chapter> = {
  prologue: {
    number: 0,
    name: { zh: '序章：醒来', en: 'Prologue: Waking Up' },
    unlock: {},
  },
  who_is_eric: {
    number: 1,
    name: { zh: '第一章：@eric 是谁', en: 'Chapter 1: Who Is @eric' },
    // 第一次去镇上看到寻人启事、播完那段过场
    unlock: { events: ['saw_missing_poster'] },
  },
  that_month: {
    number: 2,
    name: { zh: '第二章：那一个月', en: 'Chapter 2: That Month' },
    unlock: { clues: ['missing_poster', 'old_friend', 'found_outside', 'many_gifts', 'everyone_knows'] },
  },
  that_night: {
    number: 3,
    name: { zh: '第三章：那一夜', en: 'Chapter 3: That Night' },
    unlock: { clues: ['diary_soldiers', 'fan_warning_month', 'diary_wants_to_flee', 'fan_warning_three_days', 'the_raid'] },
  },
  how_i_lived: {
    number: 4,
    name: { zh: '第四章：我是怎么活过来的', en: 'Chapter 4: How I Lived' },
    unlock: { clues: ['sister_away', 'two_shadows', 'fire_from_inside', 'last_diary_page'] },
  },
  // 结局是留白：拼齐全部真相后，日子照常过下去
  epilogue: {
    number: 5,
    name: { zh: '尾声：日子照常', en: 'Epilogue: Life Goes On' },
    unlock: { clues: ['case_record', 'outer_soul', 'the_stranger'] },
  },
};

/**
 * 线索
 *  每条后面的注释写的是「从哪里拿到」，给写剧本和做系统的人看。
 */
export const CLUES: Record<ClueId, Clue> = {
  // ---------------- 序章 ----------------
  // 医馆醒来那段剧本的最后一句
  woke_up: {
    chapter: 'prologue',
    text: { zh: '在医馆醒来：我穿进了一具陌生的身体，大家都以为我失忆了。', en: '' },
    inference: { zh: '先去镇上买种子、卖东西，顺便认识一下镇上的人吧。', en: '' },
  },
  // 医馆醒来，@fan 那句标黄的话
  better_forgotten: {
    chapter: 'prologue',
    text: { zh: '「不记得了也好」：@fan 说的这句话。', en: '' },
    inference: { zh: '他好像在为我难过，但不想让我想起什么。', en: '' },
  },

  // ---------------- 第一章：@eric 是谁 ----------------
  // 寻人启事过场里拿到
  missing_poster: {
    chapter: 'who_is_eric',
    text: { zh: '寻人启事：@que 贴的，找她哥哥 @eric。', en: '' },
    inference: { zh: '她看我的眼神，好像我该认识他。', en: '' },
  },
  // @que 2 心
  old_friend: {
    chapter: 'who_is_eric',
    text: { zh: '@que 说，我和 @eric 从小一起长大，形影不离。', en: '' },
    inference: { zh: '他是这具身体原来的主人最好的朋友。', en: '' },
  },
  // 大夫 2 心
  found_outside: {
    chapter: 'who_is_eric',
    text: { zh: '大夫说，那晚我是在着火的屋子外面被发现的。', en: '' },
    inference: { zh: '我自己爬出来的？还是有人把我弄了出来？', en: '' },
  },
  // 收集到第 3 件 @eric 送过的礼物时给（礼物本身在各 NPC 的好感度剧情里）
  many_gifts: {
    chapter: 'who_is_eric',
    text: { zh: '镇上好像人人都收过 @eric 送的东西。', en: '' },
    inference: { zh: '大家都喜欢他。可一提起他，又都不说话了。', en: '' },
  },
  // @zhou 4 心
  everyone_knows: {
    chapter: 'who_is_eric',
    text: { zh: '@zhou 压低声音说：@eric 有异能，镇上的人其实都知道。', en: '' },
    inference: { zh: '大家心照不宣，替他瞒着。城里驻着兵，谁也不敢明说。', en: '' },
  },

  // ---------------- 第二章：那一个月 ----------------
  // 修房第一阶段，在废墟里捡到的日记碎片
  diary_soldiers: {
    chapter: 'that_month',
    text: { zh: '日记碎片：「范爷又来了，说城里来了兵，叫我们小心些。」', en: '' },
    inference: { zh: '范爷……是 @fan 吗？', en: '' },
  },
  // @fan 4 心
  fan_warning_month: {
    chapter: 'that_month',
    text: { zh: '@fan 说，火灾前一个月，皇帝派兵进驻了山顶的城区。他提醒过我们俩。', en: '' },
    inference: { zh: '「我们」：是我和 @eric。可我们没当回事。', en: '' },
  },
  // 修房第二阶段，日记碎片
  diary_wants_to_flee: {
    chapter: 'that_month',
    text: { zh: '日记碎片：「我想走。可他说舍不得这里。」', en: '' },
    inference: { zh: '原来的我想带 @eric 逃走，他不肯。', en: '' },
  },
  // @fan 6 心
  fan_warning_three_days: {
    chapter: 'that_month',
    text: { zh: '@fan 说，火灾前三天，驻军要抓 @eric，我也会被连坐。他劝我们一起逃。', en: '' },
    inference: { zh: '所以他才说「不记得了也好」。', en: '' },
  },
  // 驻军小兵 4 心（山顶城区）
  the_raid: {
    chapter: 'that_month',
    text: { zh: '@soldier 说漏了嘴：火灾那晚，他们包围了 @eric 家，人从后门跑了。', en: '' },
    inference: { zh: '就在同一个晚上。', en: '' },
  },

  // ---------------- 第三章：那一夜 ----------------
  // @que 6 心
  sister_away: {
    chapter: 'that_night',
    text: { zh: '@que 说，那晚她在朋友家过夜，什么都不知道。', en: '' },
  },
  // @shen 6 心
  two_shadows: {
    chapter: 'that_night',
    text: { zh: '@shen 说，那晚她看见两个人影从 @eric 家后巷往我家跑。', en: '' },
    inference: { zh: '@eric 那晚跟我在一起。', en: '' },
  },
  // 修房第三阶段，看废墟里的焦痕
  fire_from_inside: {
    chapter: 'that_night',
    text: { zh: '废墟的焦痕：火是从屋子正中间一下子炸开的。', en: '' },
    inference: { zh: '这不是寻常的失火。', en: '' },
  },
  // 修房最后阶段，最后一片日记
  last_diary_page: {
    chapter: 'that_night',
    text: { zh: '最后一片日记：「明晚我去找他。这次一定带他走。」', en: '' },
    inference: { zh: '那晚他去带 @eric 走，两人逃回了这里，然后屋子烧了起来。原来的我，死在了那场火里。', en: '' },
  },
  // 可选：修房时捡到的日记碎片（不算进解锁条件）
  diary_backhill: {
    chapter: 'that_night',
    text: { zh: '日记碎片：「他又去后山练了，回来袖口都焦了。」', en: '' },
  },
  // 可选：去后山看到的焦痕
  backhill_scorch: {
    chapter: 'that_night',
    text: { zh: '后山的石头上全是烧过的痕迹。', en: '' },
    inference: { zh: '@eric 的异能是火。他一直在偷偷练着控制它。', en: '' },
  },

  // ---------------- 第四章：我是怎么活过来的 ----------------
  // 大夫 6 心，给看病案
  case_record: {
    chapter: 'how_i_lived',
    text: { zh: '病案：伤势本该致命，人却有呼吸和心跳，昏迷了十几天。', en: '' },
    inference: { zh: '大夫自己也说，这不合医理。', en: '' },
  },
  // @daoist 4 心
  outer_soul: {
    chapter: 'how_i_lived',
    text: { zh: '@daoist 看着我说：「你不是这身子原来的魂。」', en: '' },
  },
  // @daoist 8 心
  the_stranger: {
    chapter: 'how_i_lived',
    text: { zh: '@daoist 说，那晚他看见一个陌生人带着一个年轻人，连夜进了山。那年轻人是自己跟着走的。', en: '' },
    inference: { zh: '有人救活了这具身体，@eric 跟那个人走了。我只是碰巧被引来的魂。', en: '' },
  },
};

/** 问题 */
export const QUESTIONS: Record<QuestionId, Question> = {
  // 序章
  whose_body: {
    text: { zh: '这具身体原来是谁？他出了什么事？', en: '' },
    raisedBy: 'woke_up',
    answeredBy: 'last_diary_page',
  },
  why_better_forgotten: {
    text: { zh: '@fan 为什么说「不记得了也好」？', en: '' },
    raisedBy: 'better_forgotten',
    answeredBy: 'fan_warning_three_days',
  },
  // 第一章
  who_is_eric: {
    text: { zh: '@eric 是谁？我以前认识他吗？', en: '' },
    raisedBy: 'missing_poster',
    answeredBy: 'old_friend',
  },
  where_is_eric: {
    text: { zh: '@eric 去哪儿了？', en: '' },
    raisedBy: 'missing_poster',
    answeredBy: 'the_stranger',
  },
  who_pulled_me_out: {
    text: { zh: '是谁把我从火里弄出来的？', en: '' },
    raisedBy: 'found_outside',
    answeredBy: 'the_stranger',
  },
  why_silent: {
    text: { zh: '为什么一提 @eric，大家就不说话了？@zhou 大概知道些什么。', en: '' },
    raisedBy: 'many_gifts',
    answeredBy: 'everyone_knows',
  },
  // 第二章
  what_did_fan_say: {
    text: { zh: '@fan 那时候跟我们说了什么？', en: '' },
    raisedBy: 'diary_soldiers',
    answeredBy: 'fan_warning_month',
  },
  did_they_arrest: {
    text: { zh: '那晚官兵真的去抓人了吗？山顶城里的兵也许知道。', en: '' },
    raisedBy: 'fan_warning_three_days',
    answeredBy: 'the_raid',
  },
  // 第三章（the_raid 属于第二章，所以这个问题会显示在第二章下面）
  anyone_saw: {
    text: { zh: '@eric 从后门跑了。那晚有没有人看见他？', en: '' },
    raisedBy: 'the_raid',
    answeredBy: 'two_shadows',
  },
  how_fire_started: {
    text: { zh: '这火到底是怎么起的？', en: '' },
    raisedBy: 'fire_from_inside',
    answeredBy: 'last_diary_page',
  },
  what_in_backhill: {
    text: { zh: '后山有什么？', en: '' },
    raisedBy: 'diary_backhill',
    answeredBy: 'backhill_scorch',
  },
  tell_sister: {
    text: { zh: '@que 什么都不知道……我该告诉她吗？', en: '' },
    raisedBy: 'sister_away',
    answeredBy: null,
  },
  // 第四章
  why_alive: {
    text: { zh: '我当时应该已经死了。那我为什么还活着？', en: '' },
    raisedBy: 'case_record',
    answeredBy: 'the_stranger',
  },
};
