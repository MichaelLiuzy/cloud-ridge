/** 让 TypeScript 认识 .ink 剧本文件：import 进来是编译好的剧本（JSON 文字） */
declare module '*.ink' {
  const json: string;
  export default json;
}
