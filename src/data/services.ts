/**
 * 服务：杂货铺上门收货
 * ================================================================
 *  开局家里没有出货箱，卖东西、买种子都要去镇上的店。
 *  杂货铺掌柜的好感度到 unlockHearts 颗心后，他会主动提出上门收货；付 fee 文开通。
 *  开通后家门口出现一个收货筐：晚上放进去的东西，第二天早上按杂货铺的收购价结算。
 *  （赶集日的涨价只在镇上当面卖才有，收货筐没有。）
 *  完整格式见 types.ts。改错了 npm run build 会报错。
 */

import type { ServicesTable } from './types';

export const SERVICES: ServicesTable = {
  schemaVersion: 1,  // 数据格式版本号（程序用，不用改）
  pickup: {
    shop: "general_store",  // 哪家店收（按这家店的收购价）
    npc: "store_keeper",  // 谁来提
    unlockHearts: 2,  // 好感度几颗心
    fee: 1000,  // 开通要付多少文
  },
};
