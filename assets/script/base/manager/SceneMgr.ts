
/**
*Author  : XW
*Desc    : 
*/

import { DEBUG } from "cc/env";
import { GComponent } from "../../fairyGUI/GComponent";
import { GRoot } from "../../fairyGUI/GRoot";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import { EVENTNAME } from "../../app/define/EventDefine";
import SceneDefine, { SceneArgMap, SceneDefineType, SceneName, SceneNameType } from "../../app/define/SceneDefine";
import { UIArgMap, UINameType } from "../../app/define/UIDefine";
import XScene from "../ui/XScene";
import { XResConst } from "../define/XResConst";
import EventMgr from "./EventMgr";
import ResMgr from "./ResMgr";
import TimerMgr from "./TimerMgr";
import UIMgr from "./UIMgr";
import XConst from "../define/XConst";
import Extend from "../extend/Extend";

type SceneCacheMap = Partial<Record<SceneNameType, XScene>>;
type OpenSceneArg<T extends SceneNameType = SceneNameType> = { name: T, arg?: SceneArgMap[T] };
type OpenUiArg<T extends UINameType = UINameType> = { name: T, arg?: UIArgMap[T] };
type ReOpenUI = Partial<Record<SceneNameType, OpenUiArg[]>>;
type SceneBackArg = {
    /** 返回上一场景时是否丢弃参数 */
    notSaveArg?: boolean;
};

export default class SceneMgr {

    /**(伪)场景root */
    private _sceneRootCom: GComponent;
    /**当前场景 */
    private _curScene: XScene;
    /** 当前场景的显示请求序号 */
    private _curSceneRequestId: number = 0;
    /**当前加载中的场景名 */
    private _loadingSceneName: string;
    /** 最新场景显示请求序号 */
    private _sceneRequestId: number = 0;
    /**场景缓存，用于避免反复创建场景， 只有配置了cache=true的场景才会缓存 */
    private sceneCacheMap: SceneCacheMap;
    /** 切换场景时，记录要重新打开上次的界面。 一般仅用于战斗场景退出后，恢复之前的界面 */
    private reopenUiMap: ReOpenUI;
    /** 场景栈， 用于实现返回上一场景的功能 */
    private sceneStack: OpenSceneArg[];
    /** 用于记录sceneStack的创建场景的arg参数 */
    private lastSceneArg: OpenSceneArg;


    private static _inst: SceneMgr
    public static get inst(): SceneMgr {
        if (!this._inst) {
            this._inst = new SceneMgr();
        }
        return this._inst;
    }

    public init(): void {
        SceneDefine.init();
        this._sceneRootCom = new GComponent();
        this._sceneRootCom.name = "SceneRoot";
        GRoot.inst.addChildAt(this._sceneRootCom, 0);
        this.sceneCacheMap = {};
        this.reopenUiMap = {};
        this.sceneStack = [];
    }

    public isLoading(): boolean {
        return !Extend.isNull(this._loadingSceneName);
    }

    /**获取当前场景(伪) */
    public getCurScene(): XScene {
        return this._curScene;
    }

    /**设置当前场景的可见性 */
    public setSceneVisible(reason: string, bool: boolean) {
        let scene = this.getCurScene();
        if (scene) {
            scene.hideByReason(reason, bool);
        }
    }

    /**销毁当前场景 */
    public destroyCurScene() {
        //上一个场景的arg参数
        if (this.lastSceneArg) {
            this.sceneStack.push(this.lastSceneArg);
        }
        this._curSceneRequestId = 0;
        if (this._curScene) {
            let sceneName = this._curScene.SCENENAME;
            let define = SceneDefine.ALL_SCENE[sceneName];
            if (define?.isCache) {
                this._curScene.removeFromParent();
                this._curScene.node.active = false;
                this.sceneCacheMap[sceneName] = this._curScene;
            } else {
                this._curScene.dispose();
                delete this.sceneCacheMap[sceneName];
            }
            this._curScene = null;
            return sceneName;
        }
    }

    public showPreScene(callback?: () => void) {
        let preScene = this.sceneStack.pop();
        if (!preScene) {
            preScene = { name: SceneName.LoginScene, arg: null };
        }
        //如果不保存参数就清空
        if ((preScene.arg as SceneBackArg | undefined)?.notSaveArg) {
            preScene.arg = null;
        }
        this.show(preScene.name, preScene.arg, callback, true);
    }

    public onStageResize() {
        let curScene = this.getCurScene();
        if (curScene) {
            curScene.onStageResize();
        }
    }

    /**
     * 释放未完成显示的场景。
     * @param name 场景名
     * @param sceneObj 场景实例
     */
    private disposePendingScene(name: SceneNameType, sceneObj: XScene): void {
        if (this.sceneCacheMap[name] === sceneObj) {
            delete this.sceneCacheMap[name];
        }
        sceneObj.dispose();
    }

    /**
     * 显示一个场景
     * @param name 场景名 在SceneDefine里配置
     * @param arg 参数
     * @param finishCb 完成回调
     * @param isPreScene 是否是上一个场景，如果是，则不入栈
     * @param uiArgs 绑定的界面参数，格式为{ [uiName: string]: uiArg } 
     * @例如：
     * let uiArgs = { [UINAME.CombatView]: { selfTeam: arg.selfTeam, enemyTeam: arg.enemyTeam } };
     * SceneMgr.inst.show(SceneName.CombatScene, null, null, false, uiArgs);
     */
    public async show<T extends SceneNameType>(name: T, arg?: SceneArgMap[T], finishCb?: () => void, isPreScene?: boolean, uiArgs?: Partial<UIArgMap>): Promise<void> {
        if (this._curScene && this._curScene.SCENENAME == name) {
            XDEBUGLOG.scene("禁止切换相同的scene", name);
            return;
        }
        if (this._loadingSceneName == name) {
            XDEBUGLOG.scene("加载该场景中，禁止再次加载", name)
            return;
        }
        let define: SceneDefineType = SceneDefine.ALL_SCENE[name];
        if (!define || !define.ctrl) {
            XDEBUGLOG.warn("scene不存在", name);
            return;
        }
        let sceneObj: XScene = define.isCache ? this.sceneCacheMap[name] : undefined;
        const isCachedScene: boolean = !!sceneObj;
        if (!sceneObj) {
            let ctrl = define.ctrl;
            sceneObj = new ctrl();
        }

        if (!sceneObj || !(sceneObj instanceof XScene)) {
            XDEBUGLOG.warn("scene文件未继承XScene", name);
            return;
        }

        if (isCachedScene) {
            delete this.sceneCacheMap[name];
        }
        const requestId: number = ++this._sceneRequestId;
        sceneObj.SCENENAME = name;
        sceneObj.name = name;
        this.setGRootTouchable(false);
        let oldSceneName = this._curScene ? this._curScene.SCENENAME : "";
        XDEBUGLOG.scene("show  scene", name, isCachedScene ? "使用缓存实例" : "创建新实例");
        this._loadingSceneName = name;
        if (!isCachedScene) {
            //加载资源
            let preloadPackages: string[] = sceneObj.getFairyPackageArr();
            let promiseArr: Promise<void>[] = [];
            if (preloadPackages && preloadPackages.length > 0) {
                for (let i = 0; i < preloadPackages.length; i++) {
                    let pkgPath: string = XResConst.getUIPackageUrl(preloadPackages[i]);
                    let tpromise: Promise<void> = ResMgr.inst.loadFGUIPackage(pkgPath, sceneObj.node.uuid);
                    if (tpromise) {
                        promiseArr.push(tpromise);
                    }
                }
            }
            if (promiseArr.length > 0) {
                //因为fairy.loadpackage内部没catch某几个Promise，这种Promise如果reject的话就会永久pending下去，所以这里加30秒超时判定
                let overtime: string = "overtime";
                let timeoutP = new Promise((resolve, reject) => { TimerMgr.inst.setTimeout(() => { if (overtime) resolve(overtime); }, 30 * 1000, this); });
                let ret = await Promise.race([timeoutP, Promise.all(promiseArr)]);
                if (ret === overtime) {
                    XDEBUGLOG.error(`load scene:${name} error`, overtime);
                }
                overtime = undefined;
                if (this._sceneRequestId !== requestId) {
                    //await之后，可能已经切换到其他场景了，此时需要把旧场景后续的流程都终止掉
                    XDEBUGLOG.warn(`${name}在加载过程中切换到了${this._loadingSceneName}, 原场景取消显示`);
                    this.disposePendingScene(name, sceneObj);
                    return;
                }
            }
            XDEBUGLOG.scene("load scene finish:", name);
        } else {
            //缓存场景，直接显示
            XDEBUGLOG.scene("use cache scene:", name);
        }

        let isPrepared = false;
        try {
            isPrepared = await sceneObj.prepare(arg);
        } catch (error: unknown) {
            XDEBUGLOG.error(`prepare scene:${name} error`, error);
        }
        if (this._sceneRequestId !== requestId) {
            this.disposePendingScene(name, sceneObj);
            return;
        }
        if (!isPrepared) {
            XDEBUGLOG.warn("scene准备失败", name);
            this._loadingSceneName = null;
            this.disposePendingScene(name, sceneObj);
            this.setGRootTouchable(true);
            return;
        }

        EventMgr.inst.dispatchEvent(EVENTNAME.BEFORE_SCENE_CHANGE, { newSceneName: name, oldSceneName });
        //需要打开的ui合集
        let uiArr: UINameType[] = define.uiArr || [];
        let exceptUiMap: { [key: string]: boolean } = {};
        for (let uiName of uiArr) {
            exceptUiMap[uiName] = true;
        }
        //点击PreScene时，本场景不应入栈
        isPreScene && (this.lastSceneArg = null);
        //销毁除需要打开的 所有UI
        UIMgr.inst.destroyAll(exceptUiMap);
        //销毁上一个场景
        this.destroyCurScene();
        this.lastSceneArg = { name: name, arg: arg };
        // 不能上移, 因为删除 UiMgr.destroyAll 要获取当前场景的 reason
        this._curScene = sceneObj;
        this._curSceneRequestId = requestId;
        this._sceneRootCom.addChild(sceneObj);
        sceneObj.node.active = true;
        sceneObj.onCreate();
        sceneObj.onStageResize();
        sceneObj.onRefresh(arg);

        // 后续没有需要异步等待的了，清掉loadingSceneName
        this._loadingSceneName = null;
        let promiseArr: Promise<void>[] = [];
        //打开绑定场景的界面
        for (let i = 0; i < uiArr.length; i++) {
            let uiName = uiArr[i];
            let uiArg = uiArgs ? uiArgs[uiName] : null;
            promiseArr.push(UIMgr.inst.show(uiName, uiArg));
        }
        if (promiseArr.length > 0) {
            await Promise.all(promiseArr);
            if (this._curScene !== sceneObj || this._curSceneRequestId !== requestId) {
                return;
            }
            XDEBUGLOG.scene("show ui finish have use UIMgr.inst.getUI :", uiArr);
        }
        sceneObj.onUIShow(uiArr);
        void UIMgr.inst.checkFullScreen();
        XDEBUGLOG.scene("change scene success:", name);
        EventMgr.inst.dispatchEvent(EVENTNAME.AFTER_SCENE_CHANGE, { sceneName: name, oldSceneName });
        finishCb && finishCb();
        TimerMgr.inst.setTimeout(() => {
            if (this._sceneRequestId === requestId) {
                this.setGRootTouchable(true);
            }
        }, XConst.FPS_UTIME * 3, this);
    }

    /**
     * 设置 GRoot 点击状态。
     * @param isTouchable 是否允许点击
     */
    public setGRootTouchable(isTouchable: boolean): void {
        GRoot.inst.touchable = isTouchable;
        //如果设置了不可点击，需要增加定时器设置成可点击
        if (!isTouchable) {
            const requestId: number = this._sceneRequestId;
            TimerMgr.inst.setTimeout(() => {
                if (this._sceneRequestId === requestId) {
                    this.setGRootTouchable(true);
                }
            }, 2 * 1000, this);
        }
    }

    public clear(): void {

    }
}
