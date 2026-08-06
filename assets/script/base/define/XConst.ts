const enum FRAME_TYPE {
	FPS_30 = 30,
	FPS_60 = 60,
	DEFAULT_FPS = 60,
}

export default class XConst {
	/** 实际分辨率 */
	public static REAL_SCREEN_WIDTH = 1334;
	/** 实际分辨率 */
	public static REAL_SCREEN_HEIGHT = 750;
	/** 被察者函数 遇到此key return 不通知观察者 */
	public static OBSERVE_RETURN = "OBSERVE_RETURN";
	/** 红点组件key */
	public static RED_POINT_NAME = "$_redpoint";
	/** FPS */
	public static FPS = FRAME_TYPE.FPS_60;
	/** 每帧时间，单位秒 */
	public static FPS_TIME = 1 / XConst.FPS;
	/** 每帧时间，单位毫秒 */
	public static FPS_UTIME = 1000 / XConst.FPS;
	/** 是否在后台 */
	public static inBackground: boolean = false;
	/** 登录网关 IP */
	public static LOGIN_GATEWAY_IP = "127.0.0.1";
	/** 登录网关端口 */
	public static LOGIN_GATEWAY_PORT = 17001;
	/** 是否启用热更检测 */
	public static ENABLE_HOT_UPDATE_CHECK = false;
	/** 是否刘海屏 */
	public static IS_LIUHAI = false;
	/** 刘海屏顶部高度 */
	public static TOP_LIUHAI_HEIGHT = 0;
	/** 刘海屏底部高度 */
	public static BOTTOM_LIUHAI_HEIGHT = 0;
}
