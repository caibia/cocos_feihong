/** 登录结果 */
export interface ILoginResult {
    /** 是否成功 */
    ok: boolean;
    /** 返回码：0=成功，其它为错误码 */
    code: number;
    /** 登录令牌（远端实现才会有） */
    token?: string;
}

/** 账号/登录数据源接口 */
export interface IUserAccountRepo {
    /** 进入游戏前的"登录"动作：本地实现写存档即可；远端实现发协议 */
    login(account: string, serverId: number): Promise<ILoginResult>;
    /** 读上次登录账号 */
    fetchLastAccount(): Promise<string>;
}
