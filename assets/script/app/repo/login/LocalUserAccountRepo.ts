import XDEBUGLOG from "../../../base/debug/XDEBUGLOG";
import XStorageMgr from "../../../base/manager/XStorageMgr";
import { STORAGE_TYPE } from "../../define/StorageDefine";
import { ILoginResult, IUserAccountRepo } from "../../../../../dts/repo/login/IUserAccountRepo";

/** 本地登录实现：只写本地存档，不连任何后台 */
export default class LocalUserAccountRepo implements IUserAccountRepo {
    /** 本地"登录"：写存档并立即返回成功 */
    public async login(account: string, serverId: number): Promise<ILoginResult> {
        XStorageMgr.inst.setItem(STORAGE_TYPE.LOGIN_LAST_ACCOUNT, account, true);
        XStorageMgr.inst.setItem(STORAGE_TYPE.LOGIN_LAST_SERVER_ID, serverId, true);
        XStorageMgr.inst.setItem(STORAGE_TYPE.LOGIN_LAST_TIME, Date.now(), true);
        XDEBUGLOG.debug("[LocalUserAccountRepo] 本地登录", `account=${account}`, `serverId=${serverId}`);
        return { ok: true, code: 0 };
    }

    /** 读上次登录账号 */
    public async fetchLastAccount(): Promise<string> {
        return XStorageMgr.inst.getItem(STORAGE_TYPE.LOGIN_LAST_ACCOUNT) || "";
    }
}
