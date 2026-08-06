/**
 *Author  : XW
 *Desc    : 通用数据类型定义
 */

/** 通用数据类型定义 */
declare namespace IData {
    /** 玩家头像信息 */
    export interface IPlayerHead {
        /** 头像编号 */
        id?: number;
        /** 头像资源 */
        icon?: string;
        /** 头像框编号 */
        frameId?: number;
        /** 头像框资源 */
        frameIcon?: string;
    }
}
