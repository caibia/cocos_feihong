/**
*Author  : XW
*Desc    :
*/

import { DEBUG } from "cc/env";
import UserDB from "../../data/UserDB";
import { SceneName } from "../../define/SceneDefine";
import { UINAME } from "../../define/UIDefine";
import XDEBUGLOG from "../../../base/debug/XDEBUGLOG";
import { HOT_UPDATE_DEFAULT_CONFIG } from "../../../base/define/HotUpdateDefine";
import HotUpdateMgr from "../../../base/manager/HotUpdateMgr";
import SceneMgr from "../../../base/manager/SceneMgr";
import UIMgr from "../../../base/manager/UIMgr";
import NetWorkMgr from "../../../base/net/NetWorkMgr";
import { GLoader3D } from "../../../fairyGUI/GLoader3D";
import ILoginView from "./Interfaces/ILoginView";

/** 默认网关 IP（本地联调用） */
const DEFAULT_GATEWAY_IP = "127.0.0.1";
/** 默认网关端口（本地联调用） */
const DEFAULT_GATEWAY_PORT = 17001;

export default class LoginView extends ILoginView {
    /** 角色 Spine 加载器 */
    private loader3D: GLoader3D = null!;
    /** 角色背景 Spine 加载器 */
    private loader3Dbg: GLoader3D = null!;
    /** 是否正在检查热更 */
    private _isCheckingHotUpdate = false;
    /** 是否已完成热更检查 */
    private _hotUpdateChecked = false;
    /** 是否正在连接网关 */
    private _isConnectingGateway = false;

    public getFairyPackageArr(): string[] {
        return ["Login"];
    }

    public onCreate() {
        super.onCreate();
        this.eventUnit.addClickEvent(this.btnEnterGame, this.onClickEnterGame, this);
        this.eventUnit.addClickEvent(this.btnNotice, this.onClickNotice, this);
        this.eventUnit.addClickEvent(this.loaderServerBg, this.onClickChooseServer, this);
        this.eventUnit.addClickEvent(this.btnDebug, this.onClickDebugEnterMain, this);
    }

    /** 点击进入游戏 */
    private onClickEnterGame(): void {
        UIMgr.inst.switchFGUIStringsSource("uilanguage/fgui_language_en");
        if (this.ctrl.selectedIndex !== 0) {
            // LoginDB.inst.sendEnterGame(LoginDB.inst.selServerInfo.id);
            return;
        }

        const account: string = (this.inputAccount.text || "").trim();
        if (account === "") {
            UIMgr.inst.showLabelTip(10000);
            return;
        }

        this.ensureConnectedThenLogin(account);
    }

    /**
     * 确保已连接后发送登录。
     * @param account 登录账号
     */
    private ensureConnectedThenLogin(account: string): void {
        if (NetWorkMgr.inst.isConnected()) {
            this.sendLoginRequest(account);
            return;
        }
        if (this._isConnectingGateway) {
            XDEBUGLOG.net("正在连接网关，请稍后再试");
            return;
        }

        this._isConnectingGateway = true;
        XDEBUGLOG.net("开始连接登录网关", `${DEFAULT_GATEWAY_IP}:${DEFAULT_GATEWAY_PORT}`);
        NetWorkMgr.inst.socketConnect(
            DEFAULT_GATEWAY_IP,
            DEFAULT_GATEWAY_PORT,
            () => {
                this._isConnectingGateway = false;
                XDEBUGLOG.net("登录网关连接成功");
                this.sendLoginRequest(account);
            },
            () => {
                this._isConnectingGateway = false;
                XDEBUGLOG.warn("登录网关连接失败，请确认服务端是否启动");
            }
        );
    }

    /**
     * 发送登录请求。
     * @param account 登录账号
     */
    private sendLoginRequest(account: string): void {
        const ok = UserDB.inst.sendLogin(account);
        if (!ok) {
            XDEBUGLOG.warn("登录请求发送失败，请确认网络连接状态");
        }
    }

    private onClickNotice() {
    }

    private onClickChooseServer() {
    }

    /**
     * 调试模式直接进入主场景。
     */
    private onClickDebugEnterMain(): void {
        if (!DEBUG) {
            return;
        }
        XDEBUGLOG.debug("调试入口：直接进入主场景");
        SceneMgr.inst.show(SceneName.GameMainScene);
    }

    public onRefresh(arg?: any) {
        this.ctrl.selectedIndex = 0;
        this.btnDebug.visible = DEBUG;
        this.checkNeedHotUpdate();
    }

    /**
     * LoginView 只负责“检测是否需要热更”。
     * 需要热更时打开 HotUpdateView，由 HotUpdateView 自己执行下载和重启。
     */
    private async checkNeedHotUpdate() {
        if (this._hotUpdateChecked || this._isCheckingHotUpdate) {
            return;
        }
        this._isCheckingHotUpdate = true;
        try {
            const ret = await HotUpdateMgr.inst.checkNeedUpdate(HOT_UPDATE_DEFAULT_CONFIG);
            XDEBUGLOG.debug("HotUpdateCheck(LoginView)", ret);
            if (ret.needUpdate) {
                UIMgr.inst.show(UINAME.HotUpdateView);
            }
        } finally {
            this._hotUpdateChecked = true;
            this._isCheckingHotUpdate = false;
        }
    }

    private async localSpine(url: string) {
        if (!this.loader3Dbg) {
            this.loader3Dbg = new GLoader3D();
            this.loader3Dbg.setPivot(0.5, 0.5, true);
            this.loader3Dbg.scaleX = 0.75;
            this.loader3Dbg.scaleY = 0.75;
            this.spineCom.addChildAt(this.loader3Dbg, 0);
        }
        this.spineUnit.play("spine/pic/510060/510060_bg", this.spineCom, 1, 300, this.loader3Dbg, "bg");

        if (!this.loader3D) {
            this.loader3D = new GLoader3D();
            this.loader3D.setPivot(0.5, 0.5, true);
            this.loader3D.scaleX = 0.75;
            this.loader3D.scaleY = 0.75;
            this.spineCom.addChildAt(this.loader3D, 1);
        }
        this.spineUnit.play(url, this.spineCom, 1, 250, this.loader3D, "idle");
    }

    public onClickClose(): void {
        super.onClickClose();
    }

    protected onDestroy(): void {
        super.onDestroy();
    }
}
