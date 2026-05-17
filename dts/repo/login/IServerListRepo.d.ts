/** 单个服务器条目 */
export interface IServerInfo {
    /** 服务器唯一 id */
    id: number;
    /** 所属区段 id */
    groupId: string;
    /** 显示名（"ASIA63-巴爾之冠"） */
    name: string;
    /** 状态值，取值定义见 app/define/ServerDefine.ts:SERVER_STATE */
    state: number;
    /** 开服时间戳，0 表示已开服；>0 未来时间戳，禁选并显示倒计时 */
    openTime: number;
    /** 角色名（仅"我的伺服器"使用） */
    playerName?: string;
    /** 角色等级（仅"我的伺服器"使用） */
    level?: number;
    /** 头像 id（仅"我的伺服器"使用） */
    iconId?: number;
}

/** 区段分组 */
export interface IServerGroup {
    /** 区段唯一标识 */
    id: string;
    /** 区段显示名（"61-70區"） */
    name: string;
    /** 是否高亮推荐 */
    isRecommend: boolean;
    /** 区段编号范围，供工具校验 */
    range: [number, number];
}

/** 一次拉取的完整服务器快照 */
export interface IServerListSnapshot {
    /** 区段列表 */
    groups: IServerGroup[];
    /** 全部服务器（含未玩过的） */
    servers: IServerInfo[];
    /** "我玩过的服" id 列表 */
    myServerIds: number[];
}

/** 服务器列表数据源接口。本地实现读 json，未来联网实现走 http/socket */
export interface IServerListRepo {
    /** 拉取全部服务器列表（含分组与我的服） */
    fetchServerList(): Promise<IServerListSnapshot>;
    /** 取上次登录服 id，无则返回 0 */
    fetchLastLoginServerId(): Promise<number>;
    /** 写上次登录服 id（本地：写存档；远端：调接口） */
    saveLastLoginServerId(serverId: number): Promise<void>;
}
