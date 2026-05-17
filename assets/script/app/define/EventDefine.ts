/** 自定义事件名 */
export const enum EVENTNAME {
    /**socket 建立连接 */
    SOCKET_CONNECTTED = "SOCKET_CONNECTTED",
    /**socket 断开连接*/
    SOCKET_DISCONNECTTED = "SOCKET_DISCONNECTTED",
    /**socket 错误 */
    SOCKET_ERROR = "SOCKET_ERROR",

    /**TimerUnit时间缩放 */
    TIME_SCALE_CHANGE = "TIME_SCALE_CHANGE",
    /**场景切换前 { newSceneName: MainScene, oldSceneName: LoginScene }*/
    BEFORE_SCENE_CHANGE = "BEFORE_SCENE_CHANGE",
    /**场景切换 { sceneName: MainScene, oldSceneName: LoginScene } */
    AFTER_SCENE_CHANGE = "AFTER_SCENE_CHANGE",
    /**UI销毁 { name: "LoginView", isWindow: true }*/
    UI_ONDESTROY = "UI_ONDESTROY",
    /**UI打开 { name: "LoginView" } */
    UI_ONSHOW = "UI_ONSHOW",
}
/** 自定义事件参数 */
export interface EventDataMap {
    [EVENTNAME.SOCKET_CONNECTTED]: undefined;
    [EVENTNAME.SOCKET_DISCONNECTTED]: undefined;
    [EVENTNAME.SOCKET_ERROR]: undefined;
    [EVENTNAME.TIME_SCALE_CHANGE]: undefined;
    [EVENTNAME.BEFORE_SCENE_CHANGE]: { newSceneName: string; oldSceneName: string };
    [EVENTNAME.AFTER_SCENE_CHANGE]: { sceneName: string; oldSceneName: string };
    [EVENTNAME.UI_ONDESTROY]: { name: string; isWindow: boolean };
    [EVENTNAME.UI_ONSHOW]: { name: string };
}
