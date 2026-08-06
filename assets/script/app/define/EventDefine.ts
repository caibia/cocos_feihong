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
    /**UI隐藏 { name: string, isWindow: boolean, isCache: boolean }*/
    UI_ONHIDE = "UI_ONHIDE",
    /**UI销毁 { name: string, isWindow: boolean }*/
    UI_ONDESTROY = "UI_ONDESTROY",
    /**UI打开 { name: string } */
    UI_ONSHOW = "UI_ONSHOW",
    /**播放音效 { url: "audio/button_click" } */
    PLAY_SOUND = "PLAY_SOUND",

    /** 登录：服务器列表加载完成 */
    SERVER_LIST_READY = "SERVER_LIST_READY",
    /** 登录：当前服切换 { serverId } */
    SERVER_CHANGED = "SERVER_CHANGED",
    /** 登录：登录成功 { account, serverId } */
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    /** 登录：登录失败 { code } */
    LOGIN_FAIL = "LOGIN_FAIL",
}
