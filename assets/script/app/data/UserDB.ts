/**
 * Author : XW
 * Desc   : 用户数据模块（本地单机版）
 * 说明     : 所有登录通过 RepoFactory.getUserAccountRepo() 完成；
 *           本地实现写存档即成功，未来切远端只需新增 RemoteUserAccountRepo。
 */

import BaseData from "../../base/data/BaseData";
import XDEBUGLOG from "../../base/debug/XDEBUGLOG";
import EventMgr from "../../base/manager/EventMgr";
import { EVENTNAME } from "../define/EventDefine";
import RepoFactory from "../repo/RepoFactory";

export default class UserDB extends BaseData {
    private static _inst: UserDB;
    public static get inst(): UserDB {
        if (!this._inst) {
            this._inst = new UserDB();
        }
        return this._inst;
    }

    /** 模块初始化（本地版只读存档） */
    public init(): void {
        super.init();
        XDEBUGLOG.debug("[UserDB] 本地单机版初始化完成");
    }

    /**
     * 进入游戏：调用 IUserAccountRepo.login；成功后派发 LOGIN_SUCCESS。
     * @param account 账号（本地版无意义，用默认 localPlayer 即可）
     * @param serverId 当前选中服 id
     */
    public async enterGame(account: string, serverId: number): Promise<boolean> {
        const repo = RepoFactory.getUserAccountRepo();
        try {
            const ret = await repo.login(account, serverId);
            if (!ret.ok || ret.code !== 0) {
                XDEBUGLOG.warn("[UserDB] 登录失败", ret);
                EventMgr.inst.dispatchEvent(EVENTNAME.LOGIN_FAIL, { code: ret.code });
                return false;
            }
            XDEBUGLOG.debug("[UserDB] 登录成功", `account=${account}`, `serverId=${serverId}`);
            EventMgr.inst.dispatchEvent(EVENTNAME.LOGIN_SUCCESS, { account, serverId });
            return true;
        } catch (e) {
            XDEBUGLOG.error("[UserDB] enterGame 异常", e);
            EventMgr.inst.dispatchEvent(EVENTNAME.LOGIN_FAIL, { code: -1 });
            return false;
        }
    }

    /** 清理模块数据 */
    public clearData(): void {
        // 单机版无网络资源需要释放
    }
}

(window as any)["UserDB"] = UserDB;
