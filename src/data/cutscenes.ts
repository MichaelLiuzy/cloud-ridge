/**
 * 漫画式过场：一格一格地放图，每格可以配一句字。
 * ================================================================
 *  每段过场是一个列表，从上往下依次播放。玩家按任意键、点一下屏幕，只翻一格；
 *  不操作的话，每格出场效果播完后等一会儿自动翻（默认几秒在 src/config/settings.ts 的 prefsDefaults.autoAdvanceSec，玩家也可以在设置里改）。
 *  每一格：
 *    image  图片名（320×180 的剧情画面，美术图放 art_raw/ 起名 cg_xxx.png；没图时显示色块和 desc 说明）
 *           写 null 表示这一格没有图（比如纯黑屏）
 *    text   配的字：语言文件 src/locales/zh.ts 里的名字（可以不写）
 *    effect 出场效果：fade = 从黑里淡入；black = 黑屏；white = 白光闪过；swirl = 黑屏上出现漩涡
 *    autoMs （可选）这一格的出场效果播完后，等多少毫秒自动翻页；不写就用 settings.ts 的默认值。
 *           字多的格可以停久一点，黑屏格可以短一点。（以前的 holdMs「至少停多久」已经合并进来：
 *           每格至少停多久统一在 settings.ts 的 cutscene.minShowMs）
 *           最后一格（医馆醒来）会接着进入对话，不自动翻。
 *  想改顺序就调换这些行；想改字去语言文件里改。
 */
export type CutsceneEffect = 'fade' | 'black' | 'white' | 'swirl';

export interface CutsceneFrame {
  image: string | null;
  text?: string;
  effect: CutsceneEffect;
  autoMs?: number;
}

export const CUTSCENES: Record<string, CutsceneFrame[]> = {
  /** 开新档时的开场：从曼哈顿到医馆 */
  opening: [
    { image: 'cg_office', text: 'cutscene.opening.office', effect: 'fade' },
    { image: 'cg_walk_home', text: 'cutscene.opening.walkHome', effect: 'fade' },
    { image: 'cg_penn_station', text: 'cutscene.opening.crossing', effect: 'fade' },
    { image: 'cg_headlights', text: 'cutscene.opening.headlights', effect: 'white' },
    { image: null, effect: 'black', autoMs: 1200 },
    { image: 'cg_hospital_bed', text: 'cutscene.opening.hospital', effect: 'fade' },
    { image: null, effect: 'swirl', autoMs: 800 },
    { image: null, text: 'cutscene.opening.timePassed', effect: 'black', autoMs: 3000 },
    { image: 'cg_clinic_wake', text: 'cutscene.opening.clinic', effect: 'fade', autoMs: 3000 },  // 最后一格：停 3 秒（按键可提前）再进医馆对话
  ],
};
