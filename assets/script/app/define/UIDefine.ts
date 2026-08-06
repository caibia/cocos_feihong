import { BlockView } from "../../app/module/alert/BlockView";
// 0Common 公共包移除后暂不用：待 HotUpdateView / DialogView 源就绪后取消注释
// import HotUpdateView from "../../app/module/hotUpdate/HotUpdateView";
// import DialogView from "../module/dialog/DialogView";
import NetLoadingView from "../../app/module/netLoading/NetLoadingView";
import XComponent from "../../base/ui/XComponent";

/** UI layer order */
export const enum LAYER_CONST {
    BOTTOM = 0,
    MAINUI = 1,
    MAINUI_TOP = 2,
    WINDOW = 3,
    GUIDE = 4,
    TOP = 5,
    MAX = 6,
}

export const UINAME = {
    // HotUpdateView: "HotUpdateView",
    // DialogView: "DialogView",
    NetLoadingView: "NetLoadingView",
    BlockView: "BlockView",
    // GameMainView: "GameMainView",
} as const;

/** UI缓存类型 */
export const enum CACHETYPE_ENUM {
    NONE = 0,
    /** UI缓存时间1分钟 */
    TIME1 = 1,
}

export type UIDefineType = {
    ctrl: new (...args: any[]) => XComponent,
    fullscreen: boolean,
    layer: LAYER_CONST,
    blur?: boolean,
    cache: CACHETYPE_ENUM,
}

export type UINameType = typeof UINAME[keyof typeof UINAME];
/** UI定义表：保证每个 UINAME 都必须有配置 */
export type UIDefineMap = { [name: string]: UIDefineType } & Record<UINameType, UIDefineType>;
/** UI实例类型映射：用于 UIMgr.getUI(name) 按 name 推导具体返回类型 */
export type UIInstanceMap = {
    // [UINAME.HotUpdateView]: HotUpdateView;
    // [UINAME.DialogView]: DialogView;
    [UINAME.NetLoadingView]: NetLoadingView;
    [UINAME.BlockView]: BlockView;
};

/**
 * 按需强约束的 UI 参数
 * 只需要把"想强类型校验"的 UI 写在这里；
 * 没写到的 UI 会在 UIArgMap 里自动回退为 any。
 */
type UISpecificArgMap = {
    [UINAME.BlockView]: IUIArg.IBlockViewArg;
    // [UINAME.DialogView]: IUIArg.IDialogViewArg;
};

/**
 * UI 参数总映射：
 * 1) 在 UISpecificArgMap 里声明过的 UI，使用声明的精确类型
 * 2) 未声明的 UI，默认 any（渐进式收紧类型）
 */
export type UIArgMap = { [K in UINameType]: K extends keyof UISpecificArgMap ? UISpecificArgMap[K] : any; };

export default class UIDefine {
    public static ALL_UI: UIDefineMap;

    public static init() {
        UIDefine.initUI();
    }

    public static initUI() {
        let define: UIDefineMap = {} as UIDefineMap;
        // define[UINAME.HotUpdateView] = { ctrl: HotUpdateView, fullscreen: true, layer: LAYER_CONST.TOP, cache: CACHETYPE_ENUM.NONE, };
        // define[UINAME.DialogView] = { ctrl: DialogView, fullscreen: false, layer: LAYER_CONST.WINDOW, cache: CACHETYPE_ENUM.NONE, };
        define[UINAME.NetLoadingView] = { ctrl: NetLoadingView, fullscreen: false, layer: LAYER_CONST.TOP, cache: CACHETYPE_ENUM.NONE, };
        define[UINAME.BlockView] = { ctrl: BlockView, fullscreen: false, layer: LAYER_CONST.TOP, cache: CACHETYPE_ENUM.NONE, };
        UIDefine.ALL_UI = define;
    }
}
