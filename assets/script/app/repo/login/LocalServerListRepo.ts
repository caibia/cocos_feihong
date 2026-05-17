import { JsonAsset } from "cc";
import XDEBUGLOG from "../../../base/debug/XDEBUGLOG";
import ResMgr from "../../../base/manager/ResMgr";
import XStorageMgr from "../../../base/manager/XStorageMgr";
import { STORAGE_TYPE } from "../../define/StorageDefine";
import { IServerListRepo, IServerListSnapshot } from "../../../../../dts/repo/login/IServerListRepo";

/** 服务器列表 json 在 resources 下的相对路径 */
const SERVER_LIST_URL = "config/json/serverlist";

/** 本地服务器列表实现：读 `assets/resources/config/json/serverlist.json` */
export default class LocalServerListRepo implements IServerListRepo {
    /** 内存缓存的快照 */
    private _cache: IServerListSnapshot | null = null;

    /** 拉取全部服务器列表（含分组与我的服） */
    public async fetchServerList(): Promise<IServerListSnapshot> {
        if (this._cache) {
            return this._cache;
        }
        const asset = await ResMgr.inst.loadRes<JsonAsset>(SERVER_LIST_URL, JsonAsset);
        const json = asset?.json as IServerListSnapshot;
        if (!json || !Array.isArray(json.servers) || !Array.isArray(json.groups)) {
            XDEBUGLOG.error("[LocalServerListRepo] serverlist.json 缺失或格式异常", json);
            throw new Error("serverlist.json invalid");
        }
        this._cache = json;
        XDEBUGLOG.debug("[LocalServerListRepo] serverlist 已加载", `groups=${json.groups.length}`, `servers=${json.servers.length}`, `my=${json.myServerIds.length}`);
        return this._cache;
    }

    /** 取上次登录服 id，无则返回 0 */
    public async fetchLastLoginServerId(): Promise<number> {
        return XStorageMgr.inst.getItem(STORAGE_TYPE.LOGIN_LAST_SERVER_ID) || 0;
    }

    /** 写上次登录服 id */
    public async saveLastLoginServerId(serverId: number): Promise<void> {
        XStorageMgr.inst.setItem(STORAGE_TYPE.LOGIN_LAST_SERVER_ID, serverId, true);
    }
}
