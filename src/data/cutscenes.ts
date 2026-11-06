/**
 * 漫画式过场：一格一格地放图，每格可以配一句字。
 * ================================================================
 *  每段过场是一个列表，从上往下依次播放。玩家点一下（或按回车、空格）只翻一格。
 *  每一格：
 *    image  图片名（320×180 的剧情画面，美术图放 art_raw/ 起名 cg_xxx.png；没图时显示色块和 desc 说明）
 *           写 null 表示这一格没有图（比如纯黑屏）
 *    text   配的字：语言文件 src/locales/zh.ts 里的名字（可以不写）
 *    effect 出场效果：fade = 从黑里淡入；black = 黑屏；white = 白光闪过；swirl = 黑屏上出现漩涡
 *    holdMs （可选）这一格至少停留多少毫秒，没到时间点了也不翻，防止手快点过去
 *  想改顺序就调换这些行；想改字去语言文件里改。
 */
export type CutsceneEffect = 'fade' | 'black' | 'white' | 'swirl';

export interface CutsceneFrame {
  image: string | null;
  text?: string;
  effect: CutsceneEffect;
  holdMs?: number;
}

export const CUTSCENES: Record<string, CutsceneFrame[]> = {
  /** 开新档时的开场：从曼哈顿到医馆 */
  opening: [
    { image: 'cg_office', text: 'cutscene.opening.office', effect: 'fade' },
    { image: 'cg_walk_home', text: 'cutscene.opening.walkHome', effect: 'fade' },
    { image: 'cg_penn_station', text: 'cutscene.opening.crossing', effect: 'fade' },
    { image: 'cg_headlights', text: 'cutscene.opening.headlights', effect: 'white' },
    { image: null, effect: 'black', holdMs: 600 },
    { image: 'cg_hospital_bed', text: 'cutscene.opening.hospital', effect: 'fade' },
    { image: null, effect: 'swirl' },
    { image: null, text: 'cutscene.opening.timePassed', effect: 'black', holdMs: 600 },
    { image: 'cg_clinic_wake', text: 'cutscene.opening.clinic', effect: 'fade' },
  ],
};
