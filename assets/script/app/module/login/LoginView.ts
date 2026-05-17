/**
 * Author : XW
 * Desc   : 登录主界面（本地单机版）
 * 说明     : 不接第三方 SDK、不联网；服务器列表与登录均由 RepoFactory 提供，
 *           未来切联网只需替换 Repo 实现，本 View 与 DB 层不动。
 */

import { DEBUG } from "cc/env";
import { Controller } from "../../../fairyGUI/Controller";
import XDEBUGLOG from "../../../base/debug/XDEBUGLOG";
import AudioMgr from "../../../base/audio/AudioMgr";
import EventMgr from "../../../base/manager/EventMgr";
import SceneMgr from "../../../base/manager/SceneMgr";
import UIMgr from "../../../base/manager/UIMgr";
import VideoUnit from "../../../base/unit/VideoUnit";
import { EVENTNAME } from "../../define/EventDefine";
import { SceneName } from "../../define/SceneDefine";
import { UINAME } from "../../define/UIDefine";
import XStorageMgr from "../../../base/manager/XStorageMgr";
import LoginDB from "../../data/LoginDB";
import UserDB from "../../data/UserDB";
import { SERVER_STATE } from "../../define/ServerDefine";
import { STORAGE_TYPE } from "../../define/StorageDefine";
import ILoginView from "./interfaces/ILoginView";

/** 登录页背景循环视频 */
const BG_VIDEO_URL = "movie/login/login03";
/** 登录页 BGM */
const BGM_URL = "audio/bgm/Music_Main_Menu";
/** 进入游戏音效 */
const SFX_ENTER = "audio/ui/UI_Basic_Game_Start";
/** 通用点击音效 */
const SFX_CLICK = "audio/ui/UI_Click_Small";
/** 协议未勾选提示 id（占位） */
const TIP_LAW_REQUIRED = 10001;
/** 默认本地账号（单机版无登录注册流程） */
const DEFAULT_LOCAL_ACCOUNT = "localPlayer";

export default class LoginView extends ILoginView {
    /** 背景视频播放单元 */
    private _bgVideo: VideoUnit | null = null;
    /** 是否正在进入游戏（防重复点） */
    private _entering = false;

    /** 本界面依赖的 FGUI 包（含跨包传递依赖） */
    public getFairyPackageArr(): string[] {
        return ["login", "base_new", "base", "text_new", "icon"];
    }

    public onCreate(): void {
        super.onCreate();
        XDEBUGLOG.debug("[LoginView] onCreate");
        this.bindEvents();
        this.applyStaticTexts();
        this.startBgVideo();
        AudioMgr.inst.playMusic(BGM_URL, true);
        EventMgr.inst.addEventListener(EVENTNAME.SERVER_CHANGED, this.refreshCurServerBtn, this);
        EventMgr.inst.addEventListener(EVENTNAME.SERVER_LIST_READY, this.refreshCurServerBtn, this);
        EventMgr.inst.addEventListener(EVENTNAME.LOGIN_SUCCESS, this.onLoginSuccess, this);
    }

    public onRefresh(arg?: any): void {
        super.onRefresh(arg);
        if (this.btnDebug) this.btnDebug.visible = DEBUG;
        if (this.checkBtn) this.checkBtn.selected = !!XStorageMgr.inst.getItem(STORAGE_TYPE.LOGIN_LAW_AGREED);
        this.syncMuteBtn();
        this.runEnterTransition();
        // 异步加载服务器列表 + 决定是否播首次 PV
        this.bootstrapAsync();
    }

    /** 绑定按钮点击事件 */
    private bindEvents(): void {
        if (this.globalLoginComp) this.eventUnit.addClickEvent(this.globalLoginComp, this.onClickEnterGame, this);
        if (this.serverBtn) this.eventUnit.addClickEvent(this.serverBtn, this.onClickChooseServer, this);
        if (this.serverTouch) this.eventUnit.addClickEvent(this.serverTouch, this.onClickChooseServer, this);
        if (this.selectTouch) this.eventUnit.addClickEvent(this.selectTouch, this.onClickToggleAgreement, this);
        if (this.checkBtn) this.eventUnit.addClickEvent(this.checkBtn, this.onClickToggleAgreement, this);
        if (this.movieBtn) this.eventUnit.addClickEvent(this.movieBtn, this.onClickReplayPv, this);
        if (this.voiceBtn) this.eventUnit.addClickEvent(this.voiceBtn, this.onClickToggleMute, this);
        if (this.btnDebug) this.eventUnit.addClickEvent(this.btnDebug, this.onClickDebugEnter, this);
    }

    /** 静态文本：版本号、协议、版权 */
    private applyStaticTexts(): void {
        if (this.versionTxt) {
            this.versionTxt.text = `v ${(window as any)["PROJECT_VERSION"] || "0.0.1"}`;
        }
        if (this.agreementText1) {
            this.agreementText1.text = "我已詳閱並同意《用戶協議》、《隱私保護協議》";
        }
        if (this.copyrightTxt) {
            this.copyrightTxt.text = "";
        }
    }

    /** 启动背景视频循环播放（叠在 bgComp 兜底图之上） */
    private startBgVideo(): void {
        if (!this.view) {
            XDEBUGLOG.warn("[LoginView] view 不存在，跳过背景视频");
            return;
        }
        if (!this._bgVideo) this._bgVideo = new VideoUnit();
        this._bgVideo.playLoop(this.view, {
            url: BG_VIDEO_URL,
            loop: true,
            mute: !!XStorageMgr.inst.getItem(STORAGE_TYPE.LOGIN_MUTE),
            width: this.view.width,
            height: this.view.height,
            zOrder: 0,
        });
    }

    /** 同步 voiceBtn 的视觉状态（按钮上若挂了 mute Controller 一并切换） */
    private syncMuteBtn(): void {
        const mute = !!XStorageMgr.inst.getItem(STORAGE_TYPE.LOGIN_MUTE);
        AudioMgr.inst.musicSwitch = !mute;
        AudioMgr.inst.soundSwitch = !mute;
        if (this.voiceBtn) {
            const ctrl = this.voiceBtn.getController("mute") as Controller;
            if (ctrl) ctrl.selectedIndex = mute ? 1 : 0;
        }
    }

    /** 跑入场过渡 */
    private runEnterTransition(): void {
        if (this.enterTransition) this.enterTransition.play();
        if (this.loopTransition) this.loopTransition.play(undefined, -1);
    }

    /** 异步引导：加载服务器列表 → 刷新当前服按钮 → 决定 PV 播放 */
    private async bootstrapAsync(): Promise<void> {
        try {
            await LoginDB.inst.ensureLoaded();
            this.refreshCurServerBtn();
        } catch (e) {
            XDEBUGLOG.warn("[LoginView] 服务器列表加载失败", e);
        }
        if (!XStorageMgr.inst.getItem(STORAGE_TYPE.LOGIN_PV_PLAYED)) {
            this.openPv(true);
        }
    }

    /** 刷新当前服按钮（文本 + 状态 controller） */
    private refreshCurServerBtn(): void {
        if (!this.serverBtn) return;
        const cur = LoginDB.inst.getCurServer();
        if (!cur) {
            this.serverBtn.title = "選擇分線";
            return;
        }
        this.serverBtn.title = cur.name;
        const stateCtrl = this.serverBtn.getController("state") as Controller;
        if (stateCtrl) stateCtrl.selectedIndex = cur.state ?? SERVER_STATE.NORMAL;
    }

    /** 「点击进入游戏」 */
    private onClickEnterGame(): void {
        if (this._entering) return;
        AudioMgr.inst.playSound(SFX_CLICK);
        if (!this.checkBtn || !this.checkBtn.selected) {
            UIMgr.inst.showLabelTip(TIP_LAW_REQUIRED);
            XDEBUGLOG.debug("[LoginView] 未勾选协议，拦截");
            return;
        }
        const serverId = LoginDB.inst.getCurServerId();
        if (!serverId) {
            UIMgr.inst.showDebugLabelTip("尚未選擇分線");
            XDEBUGLOG.warn("[LoginView] 当前服为空，拦截进入游戏");
            return;
        }
        this._entering = true;
        AudioMgr.inst.playSound(SFX_ENTER);
        XDEBUGLOG.debug("[LoginView] 点击进入游戏", `serverId=${serverId}`);
        UserDB.inst.enterGame(DEFAULT_LOCAL_ACCOUNT, serverId).then(
            () => { this._entering = false; },
            (err) => {
                XDEBUGLOG.error("[LoginView] enterGame 失败", err);
                this._entering = false;
            },
        );
    }

    /** 切換分線 */
    private onClickChooseServer(): void {
        AudioMgr.inst.playSound(SFX_CLICK);
        XDEBUGLOG.debug("[LoginView] 打开服务器列表弹窗");
        UIMgr.inst.show(UINAME.LoginServerListPopView);
    }

    /** 隐私协议复选框切换 */
    private onClickToggleAgreement(): void {
        AudioMgr.inst.playSound(SFX_CLICK);
        const next = !XStorageMgr.inst.getItem(STORAGE_TYPE.LOGIN_LAW_AGREED);
        XStorageMgr.inst.setItem(STORAGE_TYPE.LOGIN_LAW_AGREED, next, true);
        if (this.checkBtn) this.checkBtn.selected = next;
        XDEBUGLOG.debug("[LoginView] 协议勾选", next);
    }

    /** 重播 PV（不修改 played 标记） */
    private onClickReplayPv(): void {
        AudioMgr.inst.playSound(SFX_CLICK);
        XDEBUGLOG.debug("[LoginView] 重播 PV");
        this.openPv(false);
    }

    /** 静音 / 取消静音 */
    private onClickToggleMute(): void {
        AudioMgr.inst.playSound(SFX_CLICK);
        const next = !XStorageMgr.inst.getItem(STORAGE_TYPE.LOGIN_MUTE);
        XStorageMgr.inst.setItem(STORAGE_TYPE.LOGIN_MUTE, next, true);
        this.syncMuteBtn();
        if (this._bgVideo) this._bgVideo.setMute(next);
        XDEBUGLOG.debug("[LoginView] 切换静音", next);
    }

    /** DEBUG 入口直接进入主场景 */
    private onClickDebugEnter(): void {
        if (!DEBUG) return;
        XDEBUGLOG.debug("[LoginView] DEBUG 直接进入主场景");
        // SceneMgr.inst.show(SceneName.GameMainScene);
    }

    /** 打开 PV 弹窗。markPlayed=true 时播完写 pv_first_play */
    private openPv(markPlayed: boolean): void {
        UIMgr.inst.show(UINAME.PvPlayView, {
            pvName: "movie/pv/pv2new",
            zimuName: "movie/pv/pv2zimu_tw",
            bgm: "audio/bgm/PV_First",
            markPlayed,
        });
    }

    /** 登录成功事件回调，切场景 */
    private onLoginSuccess(_name: any, data: { account: string; serverId: number }): void {
        XDEBUGLOG.debug("[LoginView] 登录成功，切到主场景", data);
        // SceneMgr.inst.show(SceneName.GameMainScene);
    }

    public dispose(): void {
        EventMgr.inst.removeListener(EVENTNAME.SERVER_CHANGED, this.refreshCurServerBtn, this);
        EventMgr.inst.removeListener(EVENTNAME.SERVER_LIST_READY, this.refreshCurServerBtn, this);
        EventMgr.inst.removeListener(EVENTNAME.LOGIN_SUCCESS, this.onLoginSuccess, this);
        if (this._bgVideo) {
            this._bgVideo.stop();
            this._bgVideo = null;
        }
        super.dispose();
    }
}
