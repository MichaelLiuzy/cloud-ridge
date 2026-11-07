/**
 * 来信
 * ================================================================
 *  信是驿卒老范每天一早顺路送来的：每天早上 6 点检查一遍下面的信，条件都满足的放进家门口的信箱。
 *  同一封信只寄一次。标题和正文写在语言文件 src/locales/zh.ts 的 letters.<信的 id> 里（title、body），
 *  正文里可以用黄字线索记号 <<clue:id=字>>，规则和对话里一样。
 *
 *  加一封新信：在下面加一项，再到语言文件 letters 里加同名的 title 和 body。
 *   - from：寄信人（语言文件 names 里的人物代号，比如 zhou；没署名写 'unknown'）
 *   - items：随信附的东西（物品 id → 数量），money：随信附的钱（文），都可以不写
 *   - when：什么时候寄到，写了几条就要几条都满足（都不写 = 第一天早上就到）：
 *       date 某月某日（或之后）、houseStage 老宅修到第几阶段之后、pickup 开通上门收货之后、
 *       event 某个剧情事件发生之后、affection 某人好感度到多少点（人物代号见 types.ts 的 NpcId）、chapter 某一章开始之后
 *  人物、物品、事件、章节的 id 写错了 npm run build 会报错。
 */
import type { ChapterId, StoryEventId } from './clues';
import type { ItemId, NpcId } from './types';
import type { zh } from '../locales/zh';

/** 寄信人：语言文件 names 里的人（对话里 #speaker: 用的同一套代号） */
export type Sender = Exclude<keyof (typeof zh)['names'], 'playerUnknown'> | 'unknown';

export interface Letter {
  id: string;
  from: Sender;
  items?: Partial<Record<ItemId, number>>;
  money?: number;
  when: {
    date?: { month: number; day: number };
    houseStage?: number;
    pickup?: boolean;
    event?: StoryEventId;
    affection?: { npc: NpcId; points: number };
    chapter?: ChapterId;
    /** 晕倒后的第二天早上：paid = 收了钱，free = 身上没钱、没收（信里用 {fee} 写收了多少） */
    fainted?: 'paid' | 'free';
  };
  /** 每次条件满足都寄一封（晕倒的信）；不写 = 一辈子只寄一次 */
  repeat?: boolean;
  /** 测试用：只能用测试菜单寄，不会自己寄来 */
  debugOnly?: boolean;
}

export const LETTERS: Letter[] = [
  // 周里正的问候：正月十七早上到，附小白菜种子 5 包
  { id: 'zhou_greeting', from: 'zhou', items: { bok_choy_seed: 5 }, when: { date: { month: 1, day: 17 } } },
  // 测试用：测试菜单「寄一封测试信」，附 1 个馒头和 10 文
  // 晕倒后第二天，医馆的大夫来信（每次晕倒都寄）
  { id: 'clinic_faint', from: 'doctor', when: { fainted: 'paid' }, repeat: true },
  { id: 'clinic_faint_free', from: 'doctor', when: { fainted: 'free' }, repeat: true },
  { id: 'debug_test', from: 'unknown', items: { mantou: 1 }, money: 10, when: {}, debugOnly: true },
];
