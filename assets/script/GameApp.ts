import { _decorator, Component, director, DynamicAtlasManager, Game, game, screen, sys, view } from 'cc';
import UIMgr from './base/manager/UIMgr';
import XDEBUGLOG from './base/debug/XDEBUGLOG';
import ConfigMgr from './base/manager/ConfigMgr';
import SceneMgr from './base/manager/SceneMgr';
import ResMgr from './base/manager/ResMgr';
import NetWorkMgr from './base/net/NetWorkMgr';
import TimerMgr from './base/manager/TimerMgr';
import { GRoot } from './fairyGUI/GRoot';
import { registerFont, UIConfig } from './fairyGUI/UIConfig';
import MaterialMgr from './base/manager/MaterialMgr';
import AudioMgr from './base/audio/AudioMgr';
import RedPointDB from './base/data/RedPointDB';
import LanguageMgr from './base/manager/LanguageMgr';
import { UIObjectFactoryDefine } from './app/define/UIObjectFactoryDefine';
import { SceneName } from './app/define/SceneDefine';
import UserDB from './app/data/UserDB';
import LoginDB from './app/data/LoginDB';
import XConst from './base/define/XConst';
import XStorageMgr from './base/manager/XStorageMgr';
import Extend from './base/extend/Extend';
import { ProcedureQueueMgr } from './base/procedure/ProcedureQueueMgr';
import HotUpdateMgr from './base/manager/HotUpdateMgr';
import ProtoCodec from './base/net/ProtoCodec';
const { ccclass } = _decorator;

@ccclass('GameApp')
export class GameApp extends Component {
    public start(): void {
        GRoot.create();
        director.addPersistRootNode(this.node);
        HotUpdateMgr.inst.applySavedSearchPaths();
        this.init();
    }

    public async init(): Promise<void> {
        // UIPackage.branch = "zh";
        XDEBUGLOG.init();
        TimerMgr.inst.init();
        await ResMgr.inst.init();
        UIMgr.inst.init();
        SceneMgr.inst.init();
        await ProtoCodec.inst.init();
        NetWorkMgr.inst.init();
        UIObjectFactoryDefine.init();
        AudioMgr.inst.init();
        await LanguageMgr.init();
        await MaterialMgr.inst.preload();
        await ConfigMgr.inst.init();
        await registerFont("GameFont", "font/SourceHanSansCN-Regular");
        UIConfig.defaultFont = "GameFont";
        this.initSystem();
        this.initModel();
        SceneMgr.inst.show(SceneName.LoginScene);

    }

    public initModel(): void {
        RedPointDB.inst.init();
        UserDB.inst.init();
        LoginDB.inst.init();
    }

    public initSystem(): void {
        screen.on('window-resize', this.onStageResize, this);
        game.on(Game.EVENT_HIDE, this.onHideToBackground, this);
        game.on(Game.EVENT_SHOW, this.onShowFromBackground, this);
        //不需要动态合图，大部分合图都在fgui、自动图集中处理完了，开启了反而有反效果。
        DynamicAtlasManager.instance.enabled = false;
    }

    public onStageResize(width: number, height: number): void {
        XDEBUGLOG.debug(`窗口大小改变: 宽度 = ${width}, 高度 = ${height}`);
        let size = screen.windowSize;
        let rw = size.width / Extend.ccviewgetScaleX;
        let rh = size.height / view.getScaleY();
        XConst.REAL_SCREEN_WIDTH = rw;
        XConst.REAL_SCREEN_HEIGHT = rh;
        //TODO cocos官方有这个判断异形屏安全区域的接口，可以试试， sys.getSafeAreaRect();
        let rate = rh / rw;
        if (rate > 2.01) {
            XConst.IS_LIUHAI = true;
            // 避免过大或过小太过异常
            if (XConst.TOP_LIUHAI_HEIGHT < 40 || XConst.TOP_LIUHAI_HEIGHT > 85) {
                XConst.TOP_LIUHAI_HEIGHT = rh * 0.038;
                if (rate > 2.167) { // iphone15 pro或max
                    XConst.TOP_LIUHAI_HEIGHT += 20;
                }
            }
            XConst.BOTTOM_LIUHAI_HEIGHT = rh * 0.017;
        } else {
            XConst.IS_LIUHAI = false;
            XConst.TOP_LIUHAI_HEIGHT = 0;
            XConst.BOTTOM_LIUHAI_HEIGHT = 0;
        }
        XDEBUGLOG.debug("onStageResize", `cc size:(${size.width.toFixed(2)}, ${size.height.toFixed(2)})`, `real size:(${rw.toFixed(2)}, ${rh.toFixed(2)})`, `liuhai:${XConst.TOP_LIUHAI_HEIGHT.toFixed(2)}`);
        // 在这里调整你的游戏逻辑
        SceneMgr.inst.onStageResize();
        UIMgr.inst.onStageResize();
    }

    public onHideToBackground(): void {
        XDEBUGLOG.debug("onHideToBackground");
        XConst.inBackground = true;
        //立即写入数据，防止数据丢失
        XStorageMgr.inst.flush();
    }

    public onShowFromBackground(): void {
        XConst.inBackground = false;
        XDEBUGLOG.debug("onShowFromBackground");
        NetWorkMgr.inst.CheckReconnect();
    }
    public static clearAllData(): void {
        RedPointDB.inst.clearData();
        UserDB.inst.clearData();
        LoginDB.inst.clearData();
        ProcedureQueueMgr.inst.clearData();
    }
}


