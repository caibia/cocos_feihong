/**
 *Author  : XW
 *Desc    : 事件参数类型定义
 */

/** 事件参数类型定义 */
declare namespace IEvent {
    /** UI 显隐事件参数 */
    export interface IUILifeCycleArg {
        /** UI 名称 */
        name: string;
        /** 是否为窗口 */
        isWindow: boolean;
        /** 是否进入缓存 */
        isCache: boolean;
    }

    /** 自定义事件参数 */
    export interface DataMap {
        SOCKET_CONNECTTED: undefined;
        SOCKET_DISCONNECTTED: undefined;
        SOCKET_ERROR: undefined;
        TIME_SCALE_CHANGE: undefined;
        BEFORE_SCENE_CHANGE: { newSceneName: string; oldSceneName: string };
        AFTER_SCENE_CHANGE: { sceneName: string; oldSceneName: string };
        UI_ONHIDE: IUILifeCycleArg;
        UI_ONDESTROY: IUILifeCycleArg;
        UI_ONSHOW: { name: string };
        PLAY_SOUND: { url: string };
        SERVER_LIST_READY: undefined;
        SERVER_CHANGED: { serverId: number };
        LOGIN_SUCCESS: { account: string; serverId: number };
        LOGIN_FAIL: { code: number };
    }

    /** 自定义事件名 */
    export type Name = keyof DataMap;

    /** 事件数据 */
    export type Data<T extends Name> = DataMap[T];

    /** 事件回调 */
    export type CallBack<T extends Name = Name> = (eventName: T, data: Data<T>) => void;
}
