/*
*Author  : XW
*Desc    : 登录模块数据层（本地单机版）；持有服务器列表快照、当前选中服 id，通过 RepoFactory.getServerListRepo() 访问数据源
*/

import BaseData from "../../base/data/BaseData";
import XDEBUGLOG from "../../base/debug/XDEBUGLOG";
import EventMgr from "../../base/manager/EventMgr";
import { EVENTNAME } from "../define/EventDefine";
import { IServerGroup, IServerInfo, IServerListSnapshot } from "../../../../dts/repo/login/IServerListRepo";
import RepoFactory from "../repo/RepoFactory";

export default class LoginDB extends BaseData {
    private static _inst: LoginDB;
    public static get inst(): LoginDB {
        if (!this._inst) this._inst = new LoginDB();
        return this._inst;
    }

    /** 缓存快照 */
    private _snapshot: IServerListSnapshot | null = null;
    /** 当前选中服 id */
    private _curServerId: number = 0;
    /** 加载状态 */
    private _loading: boolean = false;
    /** 服 id → IServerInfo 索引 */
    private _serverMap: Map<number, IServerInfo> = new Map();

    /** 模块初始化 */
    public init(): void {
        super.init();
        XDEBUGLOG.debug("[LoginDB] 初始化完成");
    }

    /** 是否已加载 */
    public isReady(): boolean {
        return this._snapshot !== null;
    }

    /** 主动加载一次（已加载则直接返回缓存） */
    public async ensureLoaded(): Promise<void> {
        if (this._snapshot) return;
        if (this._loading) return;
        this._loading = true;
        try {
            const repo = RepoFactory.getServerListRepo();
            this._snapshot = await repo.fetchServerList();
            this._serverMap.clear();
            for (const s of this._snapshot.servers) {
                this._serverMap.set(s.id, s);
            }
            const lastId = await repo.fetchLastLoginServerId();
            this._curServerId = lastId && this._serverMap.has(lastId)
                ? lastId
                : (this._snapshot.myServerIds[0] || (this._snapshot.servers[0]?.id ?? 0));
            XDEBUGLOG.debug("[LoginDB] ready", `curServerId=${this._curServerId}`);
            EventMgr.inst.dispatchEvent(EVENTNAME.SERVER_LIST_READY);
        } finally {
            this._loading = false;
        }
    }

    /** 获取全部分组 */
    public getGroups(): IServerGroup[] {
        return this._snapshot?.groups ?? [];
    }

    /** 按分组取该组下服务器（按 id 升序） */
    public getServersByGroup(groupId: string): IServerInfo[] {
        if (!this._snapshot) return [];
        return this._snapshot.servers
            .filter(s => s.groupId === groupId)
            .sort((a, b) => a.id - b.id);
    }

    /** 我玩过的服列表（按 myServerIds 顺序） */
    public getMyServers(): IServerInfo[] {
        if (!this._snapshot) return [];
        const out: IServerInfo[] = [];
        for (const id of this._snapshot.myServerIds) {
            const s = this._serverMap.get(id);
            if (s) out.push(s);
        }
        return out;
    }

    /** 按 id 取单服 */
    public getServerById(id: number): IServerInfo | undefined {
        return this._serverMap.get(id);
    }

    /** 取当前服 id */
    public getCurServerId(): number {
        return this._curServerId;
    }

    /** 取当前服信息 */
    public getCurServer(): IServerInfo | undefined {
        return this._serverMap.get(this._curServerId);
    }

    /** 选中某服并持久化（同 id 跳过） */
    public async setCurServer(id: number): Promise<void> {
        if (this._curServerId === id) return;
        if (!this._serverMap.has(id)) {
            XDEBUGLOG.warn("[LoginDB] setCurServer 未知 id", id);
            return;
        }
        this._curServerId = id;
        await RepoFactory.getServerListRepo().saveLastLoginServerId(id);
        XDEBUGLOG.debug("[LoginDB] 当前服切换", id);
        EventMgr.inst.dispatchEvent(EVENTNAME.SERVER_CHANGED, { serverId: id });
    }

    /** 清理模块数据 */
    public clearData(): void {
        this._snapshot = null;
        this._curServerId = 0;
        this._loading = false;
        this._serverMap.clear();
    }
}

(window as any)["LoginDB"] = LoginDB;
