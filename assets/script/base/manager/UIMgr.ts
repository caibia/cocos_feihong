
/**
*Author  : XW
*Desc    : 
*/

import UIDefine, { CACHETYPE_ENUM, LAYER_CONST, UIDefineType, UINAME, UIArgMap, UIInstanceMap, UINameType } from "../../app/define/UIDefine";
import XComponent from "../ui/XComponent"
import XDEBUGLOG from "../debug/XDEBUGLOG";
import ResMgr from "./ResMgr";
import { XResConst } from "../define/XResConst";
import { GComponent } from "../../fairyGUI/GComponent";
import { GRoot } from "../../fairyGUI/GRoot";
import { GObject } from "../../fairyGUI/GObject";
import NodePoolMgr from "./NodePoolMgr";
import { XNODEPOOL_KEY } from "../define/XNodePoolDefine";
import SceneMgr from "./SceneMgr";
import { ExtendTime } from "../extend/ExtendTime";
import TimerMgr from "./TimerMgr";
import EventMgr from "./EventMgr";
import { EVENTNAME } from "../../app/define/EventDefine";
import XWindow from "../ui/XWindow";
import { EventTouch, NodeEventType, TextAsset, Tween, game, tween } from "cc";
import { GLoader3D } from "../../fairyGUI/GLoader3D";
import { UIPackage } from "../../fairyGUI/UIPackage";

type FinishCallback<T extends UINameType = UINameType> = (ui: UIInstanceMap[T]) => void;

export default class UIMgr {
    /**ui缓存时间 */
    private _uiCacheReleaseTime: number = 60 * 1000; //60000 默认60秒
    /** 界面实例 */
    private _uiMap: Partial<Record<UINameType, XComponent>>;
    /** 界面缓存池 */
    private _uiCache: Partial<Record<UINameType, XComponent>>;
    /** 界面参数映射 */
    private _uiMapArg: Partial<Record<UINameType, any>>;
    /** 记录“UI加载中”期间收到的 show 请求，等待加载完成后再补执行（同名UI仅保留最后一次参数） */
    private _loadingShowMap: Partial<Record<UINameType, { arg: any, finishCb?: FinishCallback }>>;
    /**ui层级 */
    private _layers: GComponent[];
    /**UiMgr打开的顺序，用于避免异步加载导致界面的上下层级错乱的问题 */
    private _showIndex: number;
    /**当前顶层的全屏界面 */
    private fullScreenHideInfo = { isHideBottom: false, topUiName: undefined, isLoading: undefined };
    /**最近一次模糊的ui名称 */
    private lastBlurName: UINameType
    /** 全屏遮挡使用的隐藏原因 key，用于 hideByReason/forceUnHide 与场景显隐的统一标识 */
    private _UIFullScreen: string = "UIFullScreen";
    /** 界面进场等待使用的隐藏原因 */
    private _UIEntering: string = "UIEntering";
    /** 全屏遮挡检测执行中的 Promise */
    private _fullScreenCheckPromise: Promise<void> | null = null;
    /** 全屏遮挡检测执行中的互斥锁 */
    private _checkingFullScreen = false;
    /** 全屏遮挡执行中收到的重检标记 */
    private _needFullScreenRecheck = false;
    /** 被全屏界面临时隐藏的 UI */
    private _fullScreenHiddenMap: Partial<Record<UINameType, boolean>>;
    /** 景深检测执行中的互斥锁，避免并发执行 checkDepthOfFieldImpl */
    private _checkingDepthOfField = false;
    /** 执行中若再次收到检测请求则置位，当前轮结束后立刻补跑一次 */
    private _needDepthOfFieldRecheck = false;

    private static _inst: UIMgr;
    public static get inst(): UIMgr {
        if (!UIMgr._inst) {
            UIMgr._inst = new UIMgr();
        }
        return UIMgr._inst;
    }

    public init() {
        UIDefine.init();
        this._uiMap = {};
        this._uiCache = {};
        this._uiMapArg = {};
        this._loadingShowMap = {};
        this._fullScreenHiddenMap = {};
        this._layers = [];
        this._showIndex = 0;
        let parent: GRoot = GRoot.inst;
        for (let i = 0; i <= LAYER_CONST.MAX; i++) {
            let layer: GComponent = new GComponent();
            layer.name = "UILayer_" + i;
            this._layers.push(layer);
            parent.addChild(layer);
        }
        // this.addClickEff();
        //每10s检测一次缓存
        TimerMgr.inst.setInterval(this.checkCache.bind(this), 10 * 1000, this);
    }

    public getUILayer(idx: number) {
        return this._layers[idx];
    }

    public showNetLoading() {
        UIMgr.inst.show(UINAME.NetLoadingView);
    }

    /**获取最顶层UI */
    public getTopUI() {
        let topUiName: string;
        for (let i = LAYER_CONST.MAX; i >= 0; i--) {
            let layer = this._layers[i];
            for (let j = layer._children.length - 1; j >= 0; j--) {
                let child = layer._children[j];
                if (child instanceof XComponent && child.UINAME) {
                    topUiName = child.UINAME;
                    return child;
                }
            }
        }
        return null;
    }

    private igonerUI = {
        // [UINAME.GuideStepView]: true,
        // [UINAME.GuideClickView]: true,
        // [UINAME.GuideSpeakView]: true,
        // [UINAME.GuideBlockView]: true,
        // [UINAME.GuideSlideView]:true,
    }
    /**
     * 检测一个界面是否在最上层(基本是做为弱指引的判断接口的)
     * 1、需要在 igonerUI 表里存在(不存在可能是场景的，只要判断是否有二级界面就行)
     * 2、判断是否是二级界面(如果是，需要在最上层，如果不是只要没有二级界面)
     * @param uiName ui名字
     * @param ignoreMap 忽视的ui合集
     * @returns 
     */
    public checkIsTop(uiName: string, ignoreMap?: { [uiName: string]: boolean }) {
        ignoreMap = ignoreMap || this.igonerUI;
        let cfg = UIDefine.ALL_UI[uiName];
        //是否存在二级界面
        let isExistSubview = this.checkIsExistSubView(ignoreMap);
        //不是界面
        if (!cfg && !isExistSubview) {
            return true;
        }
        let uiView = this.getUI(uiName as UINameType);
        //界面被销毁了，直接不是
        if (!uiView) { return false; }
        //不是二级界面，且不存在二级界面
        if (!(uiView instanceof XWindow) && !isExistSubview) {
            return true;
        }
        let topUi: XComponent;
        let layer: GComponent;
        let child: GObject;
        //从window层检测
        for (let i = LAYER_CONST.MAX; i >= 2; i--) {
            layer = this._layers[i];
            for (let j = layer._children.length - 1; j >= 0; j--) {
                child = layer._children[j];
                if (child instanceof XComponent && child.UINAME && !ignoreMap[child.UINAME]) {
                    topUi = child;
                    break
                }
            }
            if (topUi) break;
        }
        if (topUi && topUi.UINAME != uiName) {
            XDEBUGLOG.warn(`最上层是--->>>${topUi.UINAME}`)
            return false;
        }
        return true;
    }

    /** 检测全屏界面 */
    public checkFullScreen(): Promise<void> {
        if (this._checkingFullScreen) {
            this._needFullScreenRecheck = true;
            return this._fullScreenCheckPromise || Promise.resolve();
        }
        this._checkingFullScreen = true;
        this._fullScreenCheckPromise = this.checkFullScreenImpl();
        return this._fullScreenCheckPromise;
    }

    /** 执行全屏界面检测 */
    private async checkFullScreenImpl(): Promise<void> {
        try {
            /** 顶层ui所在的层。低于这个层级的ui都要隐藏， -1表示没有全屏界面 */
            let topLayerIdx = -1;
            /** 顶层ui所在的child索引。低于这个child索引的ui都要隐藏 */
            let topChildIdx = -1;
            /** 顶层UI */
            let topUiName: string;
            let topUi: XComponent;
            for (let i = LAYER_CONST.MAX; i >= 0; i--) {
                let layer = this._layers[i];
                for (let j = layer._children.length - 1; j >= 0; j--) {
                    let child = layer._children[j];
                    if (child instanceof XComponent && child.UINAME) {
                        if (child.UINAME == UINAME.NetLoadingView) continue;
                        if (child.isLoading) continue;
                        if (child.hideBottom) {
                            topLayerIdx = i;
                            topChildIdx = j;
                            topUiName = child.UINAME;
                            topUi = child;
                            break;
                        }
                    }
                }
                if (topLayerIdx >= 0) break;
            }
            let hideChange = this.fullScreenHideInfo.topUiName != topUiName;
            let promiseArr: Promise<void>[] = [];
            //顶层以下的所有ui都隐藏，顶层以上的ui都取消隐藏
            for (let i = 0; i <= LAYER_CONST.MAX; i++) {
                let layer = this._layers[i];
                for (let j = 0; j < layer._children.length; j++) {
                    let child = layer._children[j];
                    //当前层级 > 顶层UI所在的层级 或者当前层级 = 顶层UI所在的层级 且 当前zIndex > 顶层UI的zIndex索引，则显示
                    let isVisible = i > topLayerIdx || (i == topLayerIdx && j >= topChildIdx);
                    if (child instanceof XComponent && child.UINAME == UINAME.NetLoadingView) continue;
                    XDEBUGLOG.ui(`全屏界面---${child.name} ----> ${isVisible})`);
                    if (child instanceof XComponent && child.UINAME) {
                        if (isVisible) {
                            if (this._fullScreenHiddenMap[child.UINAME]) {
                                promiseArr.push(this.restoreFullScreenHiddenUI(child));
                            } else {
                                child.hideByReason(this._UIFullScreen, true);
                            }
                        } else if (!this._fullScreenHiddenMap[child.UINAME]) {
                            promiseArr.push(this.hideFullScreenCoveredUI(child));
                        }
                    } else {
                        child.hideByReason(this._UIFullScreen, isVisible);
                    }
                }
            }
            /** 打开了全屏界面时，把scene隐藏掉 */
            SceneMgr.inst.setSceneVisible(this._UIFullScreen, topLayerIdx == -1);
            await Promise.all(promiseArr);
            this.fullScreenHideInfo.isHideBottom = topUiName != undefined;
            if (topUiName) {
                this.fullScreenHideInfo.topUiName = topUiName;
                this.fullScreenHideInfo.isLoading = topUi.isLoading;
            } else {
                this.fullScreenHideInfo.topUiName = undefined;
                this.fullScreenHideInfo.isLoading = undefined;
            }
            if (hideChange) {
                if (topUiName) {
                    XDEBUGLOG.ui(`顶层是全屏界面${topUiName}，隐藏底层的所有ui`);
                } else {
                    XDEBUGLOG.ui(`顶层没有全屏界面，恢复所有ui的显示`);
                }
            }
        } finally {
            this._checkingFullScreen = false;
            if (this._needFullScreenRecheck) {
                this._needFullScreenRecheck = false;
                await this.checkFullScreen();
            } else {
                this._fullScreenCheckPromise = null;
            }
        }
    }

    /**
     * 隐藏被全屏界面遮挡的 UI。
     * @param uiObj UI 实例
     */
    private async hideFullScreenCoveredUI(uiObj: XComponent): Promise<void> {
        let uiName = uiObj.UINAME;
        this._fullScreenHiddenMap[uiName] = true;
        if (uiObj.layerIndex === LAYER_CONST.WINDOW) {
            try {
                await uiObj.onHideAni();
            } catch (error) {
                XDEBUGLOG.error(`全屏遮挡关闭动画失败: ${uiName}`, error);
            }
        }
        if (this._uiMap[uiName] !== uiObj || uiObj.isDisposed) {
            delete this._fullScreenHiddenMap[uiName];
            return;
        }
        uiObj.hideByReason(this._UIFullScreen, false);
        uiObj.onCache();
        let isWindow = uiObj instanceof XWindow;
        EventMgr.inst.dispatchEvent(EVENTNAME.UI_ONHIDE, { name: uiName, isWindow: isWindow, isCache: true });
    }

    /**
     * 恢复被全屏界面遮挡的 UI。
     * @param uiObj UI 实例
     */
    private async restoreFullScreenHiddenUI(uiObj: XComponent): Promise<void> {
        let uiName = uiObj.UINAME;
        delete this._fullScreenHiddenMap[uiName];
        if (this._uiMap[uiName] !== uiObj || uiObj.isDisposed) {
            return;
        }
        uiObj.hideByReason(this._UIFullScreen, true);
        uiObj.onRefresh(this._uiMapArg[uiName]);
        if (uiObj.layerIndex === LAYER_CONST.WINDOW) {
            try {
                await uiObj.onShowAni();
            } catch (error) {
                XDEBUGLOG.error(`全屏遮挡打开动画失败: ${uiName}`, error);
            }
        }
        if (this._uiMap[uiName] !== uiObj || uiObj.isDisposed) {
            return;
        }
        EventMgr.inst.dispatchEvent(EVENTNAME.UI_ONSHOW, { name: uiName });
    }
    /**检测深度模糊 */
    public async checkDepthOfField() {
        if (this._checkingDepthOfField) {
            this._needDepthOfFieldRecheck = true;
            return;
        }
        this._checkingDepthOfField = true;
        try {
            await this.checkDepthOfFieldImpl();
        } finally {
            this._checkingDepthOfField = false;
            if (this._needDepthOfFieldRecheck) {
                this._needDepthOfFieldRecheck = false;
                this.checkDepthOfField();
            }
        }
    }
    /**检测深度模糊实现 */
    private async checkDepthOfFieldImpl() {
        let topUi: XComponent;
        let layer: GComponent;
        let child: GObject;
        let uiCfg: UIDefineType;
        for (let i = LAYER_CONST.MAX; i >= 0; i--) {
            layer = this._layers[i];
            for (let j = layer._children.length - 1; j >= 0; j--) {
                child = layer._children[j];
                if (child instanceof XComponent && child.UINAME) {
                    if (child.isLoading) continue;
                    uiCfg = UIDefine.ALL_UI[child.UINAME];
                    if (uiCfg.blur) {
                        topUi = child;
                        break;
                    }
                }
            }
            if (topUi) break;
        }
        if (topUi) {
            if (this.lastBlurName != topUi.UINAME) {
                this.lastBlurName = topUi.UINAME;
                //先把所有背后的界面、场景都显示出来用于截图
                let uiObj: XComponent, uiName: UINameType, oldSceneVisible: boolean;
                for (const name in this._uiMap) {
                    uiName = name as UINameType;
                    uiObj = this._uiMap[uiName];
                    uiObj["$_oldVisible"] = uiObj.visible;
                    uiObj.visible = true;
                }
                let curScene = SceneMgr.inst.getCurScene();
                if (curScene) {
                    oldSceneVisible = curScene.visible;
                    if (oldSceneVisible == false) {
                        curScene.visible = true;
                    }
                }
                await topUi.setDepthOfField();
                for (const name in this._uiMap) {
                    uiName = name as UINameType;
                    uiObj = this._uiMap[uiName];
                    uiObj.visible = uiObj["$_oldVisible"];
                    delete uiObj["$_oldVisible"];
                }
                if (curScene && oldSceneVisible == false) {
                    SceneMgr.inst.setSceneVisible(this._UIFullScreen, false);
                }
            }
        }
    }
    /** 当stage尺寸变化时，通知所有ui刷新 */
    public onStageResize() {
        let ui: XComponent;
        for (let name in this._uiMap) {
            const uiName = name as UINameType;
            ui = this._uiMap[uiName]
            if (ui && !ui.isLoading) {
                ui.onStageResize();
            }
        }
    }

    /** 语言切换后，重建当前所有已打开UI并清空缓存UI */
    public async rebuildAllUIForLanguageSwitch() {
        type RebuildItem = { name: UINameType, arg: any, showIndex: number };
        const reopenList: RebuildItem[] = [];
        for (const name in this._uiMap) {
            const uiName = name as UINameType;
            const uiObj = this._uiMap[uiName];
            if (!uiObj || uiObj.isDisposed || uiObj.isLoading) {
                continue;
            }
            reopenList.push({
                name: uiName,
                arg: this._uiMapArg[uiName],
                showIndex: uiObj.showIndex,
            });
        }
        reopenList.sort((a, b) => a.showIndex - b.showIndex);

        for (const name in this._uiCache) {
            const uiName = name as UINameType;
            const uiObj = this._uiCache[uiName];
            if (!uiObj) {
                continue;
            }
            uiObj.dispose();
            delete this._uiCache[uiName];
        }

        for (let i = 0; i < reopenList.length; i++) {
            this.destroy(reopenList[i].name, true);
        }
        for (let i = 0; i < reopenList.length; i++) {
            const item = reopenList[i];
            await this.show(item.name, item.arg);
        }
    }

    /**
     * 切换FGUI静态文本并实时刷新当前已打开UI
     * @param source XML内容，或resources路径（如：uilanguage/fgui_language_en.xml）
     * @param isReleaseXmlRes 是否在读取后释放xml资源（默认false）
     */
    public async switchFGUIStringsSource(source: string, isReleaseXmlRes: boolean = false): Promise<boolean> {
        UIPackage.prepareForLanguageSwitch();
        const input = (source || "").trim();
        if (!input) {
            UIPackage.clearStringsSource();
            await this.rebuildAllUIForLanguageSwitch();
            return true;
        }

        let xmlSource = input;
        let resPath = "";
        if (!input.startsWith("<")) {
            resPath = input.toLowerCase().endsWith(".xml") ? input.substring(0, input.length - 4) : input;
            const owner = "UIMgr.switchFGUIStringsSource";
            let textAsset: TextAsset;
            textAsset = await ResMgr.inst.loadRes(resPath, TextAsset, owner);
            if (!textAsset) {
                XDEBUGLOG.warn(`FGUI静态文本切换失败，资源不可用：${resPath}`);
                return false;
            }
            xmlSource = textAsset?.text || "";
            ResMgr.inst.releaseRes(resPath, TextAsset, owner);
            if (!xmlSource) {
                XDEBUGLOG.warn(`FGUI静态文本切换失败，资源内容为空：${resPath}`);
                return false;
            }
        }

        UIPackage.setStringsSource(xmlSource);
        await this.rebuildAllUIForLanguageSwitch();
        return true;
    }
    /**
     * 显示一个UI
     * @param name ui名称 在UIDefine里配置 
     * @param arg 参数
     * @param finishCb 显示完成回调
     */
    public async show<T extends UINameType>(name: T, arg?: UIArgMap[T], finishCb?: FinishCallback<T>): Promise<void> {
        let cachelog = this._uiCache[name] ? "使用缓存实例" : (this._uiMap[name] ? "更新已有实例" : "创建新实例");
        XDEBUGLOG.ui("show", name, cachelog);
        let cfg = UIDefine.ALL_UI[name];
        if (!cfg || cfg.layer == null) {
            XDEBUGLOG.warn("ui不存在", name);
            return;
        }
        if (!cfg.ctrl) {
            XDEBUGLOG.warn(`没有定义window[${name}]`);
            return;
        }
        let isFromCache = !!this._uiCache[name];
        //保存最新参数，始终以最新参数传到界面
        this._uiMapArg[name] = arg;
        let uiObj: XComponent = this._uiMap[name] || this._uiCache[name];
        if (uiObj && uiObj.isDisposed) {
            this.releaseUI(name, uiObj);
            uiObj = undefined;
        }
        try {
            if (uiObj) {
                if (uiObj.isLoading) {
                    XDEBUGLOG.ui("ui is loading...", name);
                    // UI 还在异步加载时，不立即刷新；先缓存本次参数，待加载结束后统一补发。
                    this._loadingShowMap[name] = { arg: this._uiMapArg[name], finishCb };
                    return;
                }
                //若ui对象本身已存在，置顶并调用onRefresh即可
                const isFullScreenHidden = !!this._fullScreenHiddenMap[name];
                delete this._fullScreenHiddenMap[name];
                this._uiMap[name] = uiObj;
                delete this._uiCache[name];
                uiObj.showIndex = ++this._showIndex;
                uiObj.removeFromParent();
                uiObj.forceUnHide();
                let layer: GComponent = this._layers[cfg.layer];
                let childIndex = this.fixChildIndex(uiObj.layerIndex, uiObj.showIndex);
                uiObj.node.active = true;
                layer.addChildAt(uiObj, childIndex);
                if (!uiObj.created) uiObj.onCreate();
                uiObj.onStageResize();
                uiObj.onRefresh(this._uiMapArg[name]);
                const isShowValid = await this.playShowTransition(name, uiObj);
                if (!isShowValid) {
                    return;
                }
                this.onShowSuccess(name, uiObj, finishCb);
            } else {
                const ctrl = cfg.ctrl;
                uiObj = new ctrl();
                if (!uiObj || !(uiObj instanceof XComponent)) {
                    XDEBUGLOG.ui("ui文件未继承XComponent", name);
                    return;
                }
                //若ui对象不存在，创建新的加载资源包，并显示
                uiObj.UINAME = name;
                uiObj.name = name;
                uiObj.node.name = name;
                uiObj.isLoading = true;
                uiObj.showIndex = ++this._showIndex;
                this._uiMap[name] = uiObj;
                let layer: GComponent = this._layers[cfg.layer];
                uiObj.layerIndex = cfg.layer;
                let childIndex = this.fixChildIndex(uiObj.layerIndex, uiObj.showIndex);
                layer.addChildAt(uiObj, childIndex);
                //加载fgui包
                let preloadArr = uiObj.getFairyPackageArr();
                if (preloadArr && preloadArr.length > 0) {
                    await this.loadFairyPackage(name, preloadArr, uiObj);
                }
                uiObj.isLoading = false;
                if (!this._uiMap[name] || uiObj.isDisposed) {
                    //有可能加载完之后，UI已经因为切场景等原因被销毁了，此时终止步骤即可
                    return;
                }
                uiObj.onCreate();
                uiObj.onStageResize();
                uiObj.onRefresh(this._uiMapArg[name]);
                const isShowValid = await this.playShowTransition(name, uiObj);
                if (!isShowValid) {
                    return;
                }
                this.onShowSuccess(name, uiObj, finishCb);
            }
        } catch (error) {
            XDEBUGLOG.error(`创建/刷新${name}界面失败:`, error);
            this.releaseUI(name, uiObj);
            return;
        }
        this.flushPendingShow(name);
        this.checkDepthOfField();
    }

    /**
     * 播放界面进场流程。
     * @param name ui名称
     * @param uiObj ui实例
     */
    private async playShowTransition<T extends UINameType>(name: T, uiObj: XComponent): Promise<boolean> {
        if (!uiObj.hideBottom) {
            if (uiObj.layerIndex === LAYER_CONST.WINDOW) {
                await uiObj.onShowAni();
            }
            return !!this._uiMap[name] && !uiObj.isDisposed;
        }
        uiObj.hideByReason(this._UIEntering, false);
        await this.checkFullScreen();
        if (!this._uiMap[name] || uiObj.isDisposed) {
            uiObj.hideByReason(this._UIEntering, true);
            return false;
        }
        uiObj.hideByReason(this._UIEntering, true);
        if (uiObj.layerIndex === LAYER_CONST.WINDOW) {
            await uiObj.onShowAni();
        }
        return !!this._uiMap[name] && !uiObj.isDisposed;
    }

    /**
     * UI 显示成功后的通知。
     * @param name ui名称
     * @param uiObj ui实例
     * @param finishCb 显示完成回调
     */
    private onShowSuccess<T extends UINameType>(name: T, uiObj: XComponent, finishCb?: FinishCallback<T>): void {
        EventMgr.inst.dispatchEvent(EVENTNAME.UI_ONSHOW, { name: name });
        finishCb && finishCb(uiObj as UIInstanceMap[T]);
    }
    /**
     * 刷新并补发“加载期间挂起”的 show 请求。
     * 场景：同一 UI 在 isLoading 阶段被重复调用 show，这里会在当前 show 流程结束后再触发一次，
     * 以保证最后一次参数生效，避免请求丢失。
     */
    private flushPendingShow<T extends UINameType>(name: T) {
        const pending = this._loadingShowMap[name];
        if (!pending) return;
        // 先删后调，避免重入时重复执行。
        delete this._loadingShowMap[name];
        this.show(name, pending.arg, pending.finishCb as FinishCallback<T>);
    }
    /**
     * 替换界面。
     * @param oldName 旧 ui 名称
     * @param newName 新 ui 名称
     * @param arg 新 ui 参数
     * @param finishCb 显示完成回调
     */
    public async replace<TOld extends UINameType, TNew extends UINameType>(oldName: TOld, newName: TNew, arg?: UIArgMap[TNew], finishCb?: FinishCallback<TNew>): Promise<void> {
        const oldUi = this._uiMap[oldName];
        if (oldUi && !oldUi.isDisposed && !oldUi.isLoading && oldUi.layerIndex === LAYER_CONST.WINDOW) {
            await oldUi.onHideAni();
        }
        this.destroy(oldName, true, false);
        await this.show(newName, arg, finishCb);
    }

    /**
     * 获取UI
     * @param name ui名称
     * @param isIncludeLoading 是否包含正在异步加载中的界面
     */
    public getUI<T extends UINameType>(name: T, isIncludeLoading?: boolean): UIInstanceMap[T] | undefined {
        let uiObj: XComponent = this._uiMap[name];
        if (!uiObj) return;
        if (!isIncludeLoading && uiObj.isLoading) return;
        return this._uiMap[name] as UIInstanceMap[T];
    }

    /**
     * 销毁一个UI
     * @param name ui名称
     * @param release 是否释放
     * @param shouldCheckFullScreen 是否检查全屏遮挡
     */
    public destroy<T extends UINameType>(name: T, release?: boolean, shouldCheckFullScreen: boolean = true) {
        let uiObj: XComponent = this._uiMap[name];
        if (!uiObj) {
            return;
        }
        let cfg = UIDefine.ALL_UI[name];
        if (!cfg) {
            let isWindow = uiObj instanceof XWindow;
            this.releaseUI(name, uiObj);
            EventMgr.inst.dispatchEvent(EVENTNAME.UI_ONDESTROY, { name: name, isWindow: isWindow, isCache: false });
            return;
        }
        if (uiObj.isLoading) {
            let isWindow = uiObj instanceof XWindow;
            this.releaseUI(name, uiObj);
            EventMgr.inst.dispatchEvent(EVENTNAME.UI_ONDESTROY, { name: name, isWindow: isWindow, isCache: false });
            XDEBUGLOG.uiDestory(`destroy ui: ${name} cache=false loading=true`);
            this.checkDepthOfField();
            if (shouldCheckFullScreen) {
                void this.checkFullScreen();
            }
            return;
        }
        let isCache = ((cfg.cache != CACHETYPE_ENUM.NONE) && !release);

        delete this._uiMap[name];
        delete this._loadingShowMap[name];
        delete this._uiMapArg[name];
        uiObj.removeFromParent();
        uiObj.node.active = false;
        uiObj.hideByReason(this._UIFullScreen, true);
        if (isCache) {
            uiObj.cacheTime = ExtendTime.getServerTime();
            this._uiCache[name] = uiObj;
            uiObj.onCache();
        } else {
            this.releaseUI(name, uiObj);
        }
        if (this.lastBlurName == name) this.lastBlurName = undefined;
        let isWindow = uiObj instanceof XWindow;
        if (isCache) {
            EventMgr.inst.dispatchEvent(EVENTNAME.UI_ONHIDE, { name: name, isWindow: isWindow, isCache: true });
        } else {
            EventMgr.inst.dispatchEvent(EVENTNAME.UI_ONDESTROY, { name: name, isWindow: isWindow, isCache: false });
        }
        XDEBUGLOG.uiDestory(`destroy ui: ${name} cache=${isCache}`);
        this.checkDepthOfField();
        if (shouldCheckFullScreen) {
            void this.checkFullScreen();
        }
    }

    /**
     * 释放 UI 实例和管理器记录。
     * @param name ui名称
     * @param uiObj ui实例
     */
    private releaseUI<T extends UINameType>(name: T, uiObj: XComponent): void {
        delete this._uiMap[name];
        delete this._uiCache[name];
        delete this._uiMapArg[name];
        delete this._loadingShowMap[name];
        if (uiObj) {
            uiObj.removeFromParent();
            uiObj.dispose();
        }
    }

    /**
     * 销毁除 exceptMap 里的所有UI
     * @param exceptMap 指定的界面不销毁  示例：{MainUI:true, GuideBlock:true, ...}
     */
    public destroyAll(exceptMap?: { [key: string]: boolean }) {
        exceptMap = exceptMap || {};
        for (let uname in this._uiMap) {
            const uiName = uname as UINameType;
            if (!exceptMap[uname]) {
                this.destroy(uiName);
            }
        }
    }

    /**
     * 根据showIndex的排序，返回uiObj的ChildIndex
     * @param layerIndex 所在layer的索引
     * @param showIndex 节点的显示层级
     * @returns 
     */
    private fixChildIndex(layerIndex: number, showIndex: number): number {
        let layer = this._layers[layerIndex];
        let i: number, child: GObject, len: number = layer._children.length;
        let index = len;
        for (i = len - 1; i >= 0; i--) {
            child = layer._children[i];
            if (!(child instanceof XComponent)) continue;
            if (child.showIndex > showIndex) {
                index = i;
            }
        }
        return index;
    }

    /**
     * 根据ui名称，加载所需的资源包
     * @param name uiName
     * @param preloadArr 资源包合集 string[]
     * @param uiObj 绑定的ui对象，用uuid来做资源管理
     */
    public async loadFairyPackage(name: string, preloadArr: string[], uiObj: XComponent) {
        let pkgName: string, pkgPath: string;
        let promiseArr: Promise<void>[] = [];
        for (let i = 0; i < preloadArr.length; i++) {
            pkgName = preloadArr[i];
            pkgPath = XResConst.getUIPackageUrl(pkgName);
            let tpromise: Promise<void> = ResMgr.inst.loadFGUIPackage(pkgPath, uiObj.node.uuid);
            if (tpromise) {
                promiseArr.push(tpromise);
            }
        }
        await Promise.all(promiseArr);
        XDEBUGLOG.ui(`【${name}】界面关联的 fgui包加载完成！【${preloadArr.join(',')}】`);
    }
    /** 检查缓存界面是否过期 */
    public checkCache() {
        let uiObj: XComponent;
        let curTime = ExtendTime.getServerTime();
        for (let name in this._uiCache) {
            uiObj = this._uiCache[name];
            let cacheTime = uiObj.cacheTime;
            let cacheType = UIDefine.ALL_UI[name].cache;
            if (cacheType == CACHETYPE_ENUM.TIME1 && (curTime - cacheTime >= this._uiCacheReleaseTime)) {
                let uiName = name as UINameType;
                let isWindow = uiObj instanceof XWindow;
                this.releaseUI(name as UINameType, uiObj);
                EventMgr.inst.dispatchEvent(EVENTNAME.UI_ONDESTROY, { name: uiName, isWindow: isWindow, isCache: false });
            }
        }
    }

    /**
     * 判断是否存在二级界面(继承Xwindow的算二级界面)
     * @param ignoreViews 忽略的界面
     */
    public checkIsExistSubView(ignoreViews?: { [key: string]: boolean }) {
        if (!ignoreViews) { ignoreViews = {}; }
        let ui: any;
        let isExist = false;
        for (let uiName in this._uiMap) {
            ui = this._uiMap[uiName as UINameType]
            if (!ignoreViews[uiName] && ui instanceof XWindow) {
                isExist = true;
                break
            }
        }
        return isExist;
    }
    static isMoveAddEffEnable = true;
    /** 添加点击特效 */
    private addClickEff() {
        let layer = this.getUILayer(LAYER_CONST.MAX);
        let clickTime: number = 0;
        let clickFun = (evt: EventTouch, isMove?: boolean) => {
            let currTime = game.totalTime;
            if (currTime - clickTime < 80) return;
            clickTime = currTime;
            let worldPos = evt.getUILocation();
            let localPos = layer.CCGlobalToLocal(worldPos.x, worldPos.y);
            let effCom = NodePoolMgr.inst.get(XNODEPOOL_KEY.CLICK_EFF_POOL, XResConst.COM_PACKAGE, "Com").asCom;
            let loader3D: GLoader3D = effCom.getChild("loader3D") as GLoader3D;
            // this._dragonBonesUnit.play("dragonBones/ui/com/dianjitexiao", effCom, 0, 0, loader3D, "effect", false, (l3d: GLoader3D) => {
            //     l3d.addCompleteEventListener((l3d: GLoader3D) => {
            //         Tween.stopAllByTarget(effCom);
            //         NodePoolMgr.inst.put(effCom);
            //     });
            // });
            effCom.setPivot(0.5, 0.5, true);
            effCom.setScale(1, 1);
            effCom.setPosition(localPos.x, localPos.y);
            layer.addChild(effCom);
            evt.preventSwallow = true;
            return effCom;
        }
        let moveFun = (evt: EventTouch) => {
            if (!UIMgr.isMoveAddEffEnable) return;
            let eff = clickFun(evt, true);
            if (!eff) return;
            tween(eff).to(0.8, { scaleX: 0.2, scaleY: 0.2 }).start();
        }
        GRoot.inst.node.on(NodeEventType.TOUCH_START, clickFun, this);
        GRoot.inst.node.on(NodeEventType.TOUCH_MOVE, moveFun, this);
    }
}

window["UIMgr"] = UIMgr;
