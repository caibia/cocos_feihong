/**
 *Author  : XW
 *Desc    : 用户数据模块（登录协议示例）
 */

import BaseData from "../../base/data/BaseData";
import XDEBUGLOG from "../../base/debug/XDEBUGLOG";
import SceneMgr from "../../base/manager/SceneMgr";
import NetworkUnit from "../../base/unit/NetworkUnit";
import { SceneName } from "../define/SceneDefine";
import { ProtName } from "../define/ProtoDefine";
import NetWorkMgr from "../../base/net/NetWorkMgr";

const TEST_GAME_LIST_MERCHANT = "jkdscus1";

export default class UserDB extends BaseData {
    /** 网络单元 */
    private _networkUnit: NetworkUnit | null = null;
    /** 协议监听句柄 */
    private _protoListenerId: number = 0;

    private static _inst: UserDB;
    public static get inst(): UserDB {
        if (!this._inst) {
            this._inst = new UserDB();
        }
        return this._inst;
    }

    /** 初始化模块 */
    public init(): void {
        super.init();
        this._networkUnit = new NetworkUnit();
        this._networkUnit.onCreate();
        this._protoListenerId = this._networkUnit.addProtoListener([ProtName.S2C_LOGIN], this.onReceivePto.bind(this));
        XDEBUGLOG.net("UserDB 初始化完成，已监听登录响应协议");
    }

    /**
     * 发送登录请求。
     * @param account 登录账号
     */
    public sendLogin(account: string): boolean {
        if (!this._networkUnit) {
            XDEBUGLOG.warn("UserDB 未初始化，无法发送登录协议");
            return false;
        }

        const request: IC2SProto.ILogin = {
            account,
        };
        XDEBUGLOG.net("发送登录请求", request);
        return this._networkUnit.send(ProtName.C2S_LOGIN, request);
    }

    /**
     * 协议接收入口。
     * @param protocol 协议名
     * @param msg 协议数据
     */
    private onReceivePto(protocol: ProtName, msg: IS2CProto.ILogin): void {
        switch (protocol) {
            case ProtName.S2C_LOGIN:
                this.onReceiveLogin(msg);
                break;
            default:
                XDEBUGLOG.warn("收到未处理协议", protocol, msg);
                break;
        }
    }

    /**
     * 处理登录响应。
     * @param msg 登录响应数据
     */
    private onReceiveLogin(msg: IS2CProto.ILogin): void {
        if (msg.code !== 0) {
            XDEBUGLOG.warn("登录失败", `code=${msg.code}`);
            return;
        }

        XDEBUGLOG.net("登录成功", `token=${msg.token || ""}`);
        SceneMgr.inst.show(SceneName.GameMainScene);
    }

    /** 清理模块数据 */
    public clearData(): void {
        if (this._networkUnit && this._protoListenerId > 0) {
            this._networkUnit.removeProtoListener(this._protoListenerId);
            this._protoListenerId = 0;
        }
        if (this._networkUnit) {
            this._networkUnit.dispose();
            this._networkUnit = null;
        }
    }

    public testPost() {
        return NetWorkMgr.inst.sendHttp("GET", "https://www.72478607.com/wps/relay/GCSGAME_gameList", {
            gameType: "RNG",
            pageNo: 1,
            pageSize: 20,
            gameClassify: "",
            isNew: 1,
            language: "EN",
            ext: "avif",
            imgSize: "rx2",
            iconType: "",
            platform: "html5",
            clientType: 2,
        }, false, (res) => {
            XDEBUGLOG.net("测试请求成功", res);
        }, (err) => {
            XDEBUGLOG.warn("测试请求失败", err);
        }, {
            headers: {
                Merchant: TEST_GAME_LIST_MERCHANT,
            },
        });
    }
}

window["UserDB"] = UserDB;
