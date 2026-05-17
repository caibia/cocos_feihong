# 模块 Model 落地自查清单

> 配合 `SKILL.md` §5 使用，交付/合并前逐项过一遍。任何一项打 ❌ 都先停下补完。

## A. 数据访问

- [ ] 新增/修改字段在 `dts/repo/<module>/I*Repo.d.ts` → `Local*Repo` → `XxxDB` → `XxxView` 链路一致。
- [ ] `XxxDB` 内**没有**直接 `ResMgr.loadRes` / `XStorageMgr.getItem|setItem`；这些只能出现在 `Local*Repo`。
- [ ] `XxxView` 内**没有**直接读 json、没有直接调 `XStorageMgr` 写关键业务字段；状态读写必须经 `XxxDB`。
- [ ] 新增数据源已在 `RepoFactory` 暴露 `getXxxRepo()` 工厂方法。

## B. 数据合法性与兜底

- [ ] 关键字段缺失/类型不对的分支是 `throw new Error(...)` 或 `return + warn`，**没有**用空对象 / 空数组 / 默认 0 把流程"硬撑过去"。
- [ ] 写入入口（如 `setCurXxx`）在收到非法 id / 未知键时直接 `warn` 并 `return`，**不允许**改写为"最接近的合法值"。
- [ ] 没有给"将来可能会用"的字段提前加占位实现。

## C. 单例与生命周期

- [ ] `XxxDB extends BaseData`，`init()` 调 `super.init()`。
- [ ] `XxxDB.clearData()` 已实现，并已在 `GameApp.clearAllData()` 中调用。
- [ ] `(window as any)["XxxDB"] = XxxDB` 已在文件末尾追加。
- [ ] `GameApp.initModel()` 已加 `XxxDB.inst.init()`。
- [ ] 异步加载有防重入标记（如 `_loading`）+ 缓存（`_snapshot` 类）+ 完成事件派发。

## D. View 业务

- [ ] 继承手写结构绑定基类 `IXxxView`；`interfaces/I*.ts` 只放字段声明 / `UIPackage.createObject` / `initComponentByView` / `Transition` 取值，**没有**业务逻辑。FGUI 工程字段改动时已手动同步。
- [ ] `getFairyPackageArr()` 返回真实依赖包。
- [ ] `onCreate` 仅做事件绑定、静态文案、过渡启动；动态数据走 `onRefresh` + 异步引导。
- [ ] 所有 `EventMgr.addEventListener` 在 `onDestroy` 有对应 `removeListener`。
- [ ] 视频/Tween/定时器在 `onDestroy` 停止并置空。
- [ ] 关键异步动作有 `_entering` / `_loading` 这类防重入标记。

## E. Cell 渲染器

- [ ] 提供 `static update(cell: GComponent, data: ...): void`。
- [ ] 入口写 `if (!cell || !data) return;`。
- [ ] **不**持有 cell 引用、**不**订阅事件、**不**有内部状态。

## F. 定义集中

- [ ] 新事件名落 `EventDefine.ts:EVENTNAME` + `EventDataMap`。
- [ ] 新存档键落 `StorageDefine.ts:STORAGE_TYPE` + `StorageDataMap`。
- [ ] 新 UI 落 `UIDefine.ts:UINAME`、`initUI()` 已注册、`UIInstanceMap` 已映射；强类型参数走 `UISpecificArgMap` + `IUIArg`。
- [ ] 运行时枚举单独落 `app/define/<Xxx>Define.ts`，名字全大写下划线。
- [ ] 文件顶部资源 URL / 音效 URL / 提示 id 用 `const` 集中声明，**没有**散落的魔法字符串。

## G. 日志

- [ ] 关键 API、状态切换、异常分支有 `XDEBUGLOG.debug / warn / error("[XxxView|XxxDB|LocalXxxRepo]", ...)` 日志。
- [ ] 错误分支日志带可定位的上下文字段（`serverId`、`account` 等）。

## H. 文档

- [ ] `docs/设计方案/<模块名>的设计方案.md` 存在且最新；命名严格"xxx的设计方案.md"。
- [ ] 涉及稳定化/重构时，已同步 `docs/规范/模块/<模块名>稳定实现规范.md`。
- [ ] 若改了 FGUI 工程、跨包公共资源、资源 `id` 桥接，已同步 `CONVERTO_FGUI.md`。

## I. 命名

- [ ] 模块目录命名：`app/module/<PascalCase>`、`app/repo/<lowercase>`、`dts/repo/<lowercase>`。
- [ ] 业务/接口/实现类名：`XxxView` / `IXxxView` / `IXxxRepo` / `LocalXxxRepo` / `XxxCell` / `XxxDB`。
- [ ] 文件名与导出主体一致。

## J. 联网预留（仅在切远端时检查）

- [ ] `dts/repo/<module>/I*Repo.d.ts` 接口签名未改动。
- [ ] 新增 `Remote*Repo.ts` 与既有 `Local*Repo.ts` 平级。
- [ ] `RepoFactory.MODE` 改为 `"remote"`，View / DB 零改动。
- [ ] 若发现必须改 View 才能切远端，回退本次改动，把抽象推回 Repo 层后重做。
