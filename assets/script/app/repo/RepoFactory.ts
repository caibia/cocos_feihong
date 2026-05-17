import LocalServerListRepo from "./login/LocalServerListRepo";
import LocalUserAccountRepo from "./login/LocalUserAccountRepo";
import { IServerListRepo } from "../../../../dts/repo/login/IServerListRepo";
import { IUserAccountRepo } from "../../../../dts/repo/login/IUserAccountRepo";

/** 数据源模式：未来切联网时改这一行为 "remote" */
const MODE: "local" | "remote" = "local";

/** Repo 工厂：业务层只通过这里取数据源，未来联网时业务代码不动 */
export default class RepoFactory {
    private static _serverRepo: IServerListRepo;
    private static _userRepo: IUserAccountRepo;

    /** 获取服务器列表数据源 */
    public static getServerListRepo(): IServerListRepo {
        if (!this._serverRepo) {
            this._serverRepo = MODE === "local"
                ? new LocalServerListRepo()
                /* : new RemoteServerListRepo() */
                : new LocalServerListRepo();
        }
        return this._serverRepo;
    }

    /** 获取账号/登录数据源 */
    public static getUserAccountRepo(): IUserAccountRepo {
        if (!this._userRepo) {
            this._userRepo = MODE === "local"
                ? new LocalUserAccountRepo()
                /* : new RemoteUserAccountRepo() */
                : new LocalUserAccountRepo();
        }
        return this._userRepo;
    }
}
