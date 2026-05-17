# Login 模块参考索引

> Login 是当前仓库里唯一一套完整跑通的「View + DB + Repo + 定义」样例。新模块或重构对照查这里。

## 1. 文件清单

| 角色 | 文件 |
| --- | --- |
| 设计方案 | [docs/设计方案/登录模块的设计方案.md](../../../../docs/设计方案/登录模块的设计方案.md) |
| 主视图 | [assets/script/app/module/login/LoginView.ts](../../../../assets/script/app/module/login/LoginView.ts) |
| 弹窗视图 | [assets/script/app/module/login/LoginServerListPopView.ts](../../../../assets/script/app/module/login/LoginServerListPopView.ts) |
| 全屏 PV 视图 | [assets/script/app/module/login/PvPlayView.ts](../../../../assets/script/app/module/login/PvPlayView.ts) |
| 结构绑定基类（手写） | [assets/script/app/module/login/interfaces/ILoginView.ts](../../../../assets/script/app/module/login/interfaces/ILoginView.ts) |
| 列表 Cell | [assets/script/app/module/login/cells/LoginServerCell.ts](../../../../assets/script/app/module/login/cells/LoginServerCell.ts) |
| 模块 DB | [assets/script/app/data/LoginDB.ts](../../../../assets/script/app/data/LoginDB.ts) |
| 通用 DB | [assets/script/app/data/UserDB.ts](../../../../assets/script/app/data/UserDB.ts) |
| Repo 接口 | [dts/repo/login/IServerListRepo.d.ts](../../../../dts/repo/login/IServerListRepo.d.ts) / [dts/repo/login/IUserAccountRepo.d.ts](../../../../dts/repo/login/IUserAccountRepo.d.ts) |
| Repo 本地实现 | [assets/script/app/repo/login/LocalServerListRepo.ts](../../../../assets/script/app/repo/login/LocalServerListRepo.ts) / [assets/script/app/repo/login/LocalUserAccountRepo.ts](../../../../assets/script/app/repo/login/LocalUserAccountRepo.ts) |
| Repo 工厂 | [assets/script/app/repo/RepoFactory.ts](../../../../assets/script/app/repo/RepoFactory.ts) |
| 事件名 | [assets/script/app/define/EventDefine.ts](../../../../assets/script/app/define/EventDefine.ts) |
| 存档键 | [assets/script/app/define/StorageDefine.ts](../../../../assets/script/app/define/StorageDefine.ts) |
| UI 注册 | [assets/script/app/define/UIDefine.ts](../../../../assets/script/app/define/UIDefine.ts) |
| 运行时枚举 | [assets/script/app/define/ServerDefine.ts](../../../../assets/script/app/define/ServerDefine.ts) |
| UI 参数 | [dts/IUIArg.d.ts](../../../../dts/IUIArg.d.ts) |

## 2. 关键代码段索引

### 2.1 DB 单例形态

[LoginDB.ts:13-33](../../../../assets/script/app/data/LoginDB.ts#L13-L33)

```ts
export default class LoginDB extends BaseData {
    private static _inst: LoginDB;
    public static get inst(): LoginDB {
        if (!this._inst) this._inst = new LoginDB();
        return this._inst;
    }

    public init(): void {
        super.init();
        XDEBUGLOG.debug("[LoginDB] 初始化完成");
    }
}
```

末尾必带 `(window as any)["LoginDB"] = LoginDB;`，方便调试。

### 2.2 异步首次加载 + 防重入 + 派发事件

[LoginDB.ts:41-61](../../../../assets/script/app/data/LoginDB.ts#L41-L61)

```ts
public async ensureLoaded(): Promise<void> {
    if (this._snapshot) return;
    if (this._loading) return;
    this._loading = true;
    try {
        const repo = RepoFactory.getServerListRepo();
        this._snapshot = await repo.fetchServerList();
        // ...索引构建 / 选默认服...
        EventMgr.inst.dispatchEvent(EVENTNAME.SERVER_LIST_READY);
    } finally {
        this._loading = false;
    }
}
```

### 2.3 写入入口：先校验、再写、最后派发

[LoginDB.ts:103-113](../../../../assets/script/app/data/LoginDB.ts#L103-L113)

```ts
public async setCurServer(id: number): Promise<void> {
    if (this._curServerId === id) return;                       // 1. 校验：等价输入
    if (!this._serverMap.has(id)) {                             // 2. 校验：非法输入
        XDEBUGLOG.warn("[LoginDB] setCurServer 未知 id", id);
        return;                                                 // ↑ 注意：不假装"修正成合法值"
    }
    this._curServerId = id;                                     // 3. 写本地状态
    await RepoFactory.getServerListRepo().saveLastLoginServerId(id);  // 4. 调 Repo 持久化
    EventMgr.inst.dispatchEvent(EVENTNAME.SERVER_CHANGED, { serverId: id });  // 5. 派发事件
}
```

### 2.4 本地 Repo：不合法数据直接 throw（不兜底）

[LocalServerListRepo.ts:17-29](../../../../assets/script/app/repo/login/LocalServerListRepo.ts#L17-L29)

```ts
const asset = await ResMgr.inst.loadRes<JsonAsset>(SERVER_LIST_URL, JsonAsset);
const json = asset?.json as IServerListSnapshot;
if (!json || !Array.isArray(json.servers) || !Array.isArray(json.groups)) {
    XDEBUGLOG.error("[LocalServerListRepo] serverlist.json 缺失或格式异常", json);
    throw new Error("serverlist.json invalid");
}
```

### 2.5 RepoFactory 模式（local/remote 切换点）

[RepoFactory.ts:6-23](../../../../assets/script/app/repo/RepoFactory.ts#L6-L23)

```ts
const MODE: "local" | "remote" = "local";

public static getServerListRepo(): IServerListRepo {
    if (!this._serverRepo) {
        this._serverRepo = MODE === "local"
            ? new LocalServerListRepo()
            /* : new RemoteServerListRepo() */
            : new LocalServerListRepo();
    }
    return this._serverRepo;
}
```

### 2.6 View：onCreate / onRefresh / onDestroy 三段式

[LoginView.ts:50-70](../../../../assets/script/app/module/login/LoginView.ts#L50-L70)、[LoginView.ts:244-252](../../../../assets/script/app/module/login/LoginView.ts#L244-L252)

- `onCreate`：调 super、绑事件、应用静态文案、启动视频/BGM、订阅 `EventMgr`。
- `onRefresh`：刷新动态状态、跑过渡、跑异步引导 `bootstrapAsync`。
- `onDestroy`：解 `EventMgr`、停视频、置空成员。

### 2.7 关键流程：防重入 + 校验 + 调 Repo + 切场景

[LoginView.ts:162-186](../../../../assets/script/app/module/login/LoginView.ts#L162-L186)

```ts
private onClickEnterGame(): void {
    if (this._entering) return;                          // 防重入
    AudioMgr.inst.playSound(SFX_CLICK);
    if (!this.checkBtn?.selected && !XStorageMgr.inst.getItem(STORAGE_TYPE.LOGIN_LAW_AGREED)) {
        UIMgr.inst.showLabelTip(TIP_LAW_REQUIRED);       // 协议未勾选拦截
        return;
    }
    const serverId = LoginDB.inst.getCurServerId();
    if (!serverId) {
        UIMgr.inst.showDebugLabelTip("尚未選擇分線");      // 服未选拦截
        return;
    }
    this._entering = true;
    UserDB.inst.enterGame(DEFAULT_LOCAL_ACCOUNT, serverId).then(/* ... */);
}
```

### 2.8 Cell：纯渲染、无状态

[LoginServerCell.ts:7-16](../../../../assets/script/app/module/login/cells/LoginServerCell.ts#L7-L16)

```ts
export default class LoginServerCell {
    public static update(cell: GComponent, data: IServerInfo): void {
        if (!cell || !data) return;
        const txt = cell.getChild("serverIdTxt") as GTextField;
        if (txt) txt.text = data.name;
        const ctrl = cell.getController("type") as Controller;
        if (ctrl) ctrl.selectedIndex = data.state;
    }
}
```

### 2.9 UI 注册全套：UINAME + initUI + UIInstanceMap + UISpecificArgMap

[UIDefine.ts:21-30](../../../../assets/script/app/define/UIDefine.ts#L21-L30)、[UIDefine.ts:51-70](../../../../assets/script/app/define/UIDefine.ts#L51-L70)、[UIDefine.ts:86-96](../../../../assets/script/app/define/UIDefine.ts#L86-L96)

每加一个 UI 都要四处同步：
1. `UINAME` 字面量
2. `initUI()` 里 `define[UINAME.XxxView] = { ctrl: XxxView, ... }`
3. `UIInstanceMap` 加 `[UINAME.XxxView]: XxxView`
4. 带强类型参数时，`UISpecificArgMap` + `IUIArg.IXxxViewArg`

### 2.10 GameApp 注册位

[GameApp.ts:55-58](../../../../assets/script/GameApp.ts#L55-L58)、[GameApp.ts:110-114](../../../../assets/script/GameApp.ts#L110-L114)

```ts
public initModel() {
    RedPointDB.inst.init();
    UserDB.inst.init();
    // 新模块 DB 加在这里
}

public static clearAllData() {
    RedPointDB.inst.clearData();
    UserDB.inst.clearData();
    // 新模块 DB 的 clearData 加在这里
}
```

## 3. 命名样本

- 模块目录 `Login`（PascalCase）；Repo 目录 `login`（小写）。
- `LoginDB` / `UserDB` / `LoginView` / `LoginServerListPopView` / `PvPlayView`。
- `ILoginView`（手写结构绑定基类）/ `IServerListRepo`（接口）/ `LocalServerListRepo`（实现）。
- `LoginServerCell` / `LoginServerMyCell` / `LoginGroupCell`。
- 事件名：`SERVER_LIST_READY` / `SERVER_CHANGED` / `LOGIN_SUCCESS` / `LOGIN_FAIL`。
- 存档键：`LOGIN_PV_PLAYED` / `LOGIN_LAW_AGREED` / `LOGIN_MUTE` / `LOGIN_LAST_SERVER_ID` / `LOGIN_LAST_ACCOUNT` / `LOGIN_LAST_TIME`。
- 文件顶部资源常量：`BG_VIDEO_URL` / `BGM_URL` / `SFX_ENTER` / `SFX_CLICK` / `TIP_LAW_REQUIRED` / `DEFAULT_LOCAL_ACCOUNT`。
