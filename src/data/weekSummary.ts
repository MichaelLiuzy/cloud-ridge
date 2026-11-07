/**
 * 每周总结：周日晚上睡觉（或昏倒）时弹出的「本周总结」画面显示哪几项、按什么顺序。
 * ================================================================
 *  想去掉一项：把那一行删掉（或在行首加 // ）。想调顺序：上下挪。
 *  每一项的标题和句子在 src/locales/zh.ts 的 weekSummary 里。
 *  某一项这周是 0 就不显示；整周什么都没做时显示 weekSummary.quiet 那句话。
 *  「下周提要」（nextWeek）每周都显示。
 *
 *  可用的项：
 *    money     卖东西收入、买东西支出、净赚多少文
 *    harvest   收获了多少作物、收得最多的是哪一种
 *    land      新开垦了几格田、清了几格废墟
 *    house     修房的进展（比如「老宅：立梁架完工」）
 *    people    新认识了几个镇民（第一次和某人说话就算认识）
 *    clues     笔记本里新记下了几条线索（只显示条数）
 *    nextWeek  下周提要：节气、节日、赶集日各是哪天
 */
export type WeekSummaryItem = 'money' | 'harvest' | 'land' | 'house' | 'people' | 'clues' | 'nextWeek';

export const WEEK_SUMMARY_ITEMS: WeekSummaryItem[] = [
  'money',
  'harvest',
  'land',
  'house',
  'people',
  'clues',
  'nextWeek',
];
