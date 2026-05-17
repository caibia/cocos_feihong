/*
*Author  : XW
*Desc    : 服务器相关运行时枚举与常量
*/

/** 服务器状态：0 流暢 / 1 火熱 / 2 爆滿 / 3 維護 */
export const enum SERVER_STATE {
    NORMAL = 0,
    HOT = 1,
    FULL = 2,
    MAINTAIN = 3,
}
