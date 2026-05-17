---
name: module-model
description: 业务模块（含 View / DB / Repo / 定义）的新建、修改、重构规则。用户提到"做个新模块"、"重构 XxxDB"、"加一个 View / 弹窗 / Cell"、"接一个新数据源"、"切联网"、"加一个 Repo"等场景时使用本 Skill。
---

# 业务模块 Model Skill

## 1. 适用范围

任一动作命中即走本 Skill：

1. 在 `assets/script/app/module/` 下**新建模块目录**、新建 `XxxView.ts` / 弹窗 / Cell。
2. 在 `assets/script/app/data/` 下新建或重构 `XxxDB.ts`。
3. 在 `assets/script/app/repo/` 下新建/修改 `Local*Repo` 或后续 `Remote*Repo`，或动 `RepoFactory.ts`。
4. 新增/修改 `dts/repo/<module>/I*Repo.d.ts` 数据源接口。
5. 在 `app/define/` 下增删 `EVENTNAME` / `STORAGE_TYPE` / `UINAME` / 运行时枚举。
6. 在 `dts/IUIArg.d.ts` 下加 UI 参数命名空间。
7. 改 `GameApp.initModel()` 调用顺序、`UIDefine.initUI()` 注册表、`clearAllData()` 清理表。

## 2. 标杆样例

**当前唯一可参照的完整样例是 Login 模块**。结构如下：

```text
assets/script/app
├─ data/
│  ├─ LoginDB.ts                       # 模块 DB 单例（continues 列表、当前服、加载状态）
│  └─ UserDB.ts                        # 跨模块共用 DB（账号/登录/进入游戏）
├─ define/
│  ├─ EventDefine.ts                   # EVENTNAME + EventDataMap
│  ├─ StorageDefine.ts                 # STORAGE_TYPE + StorageDataMap
│  ├─ UIDefine.ts                      # UINAME + ALL_UI 注册 + UIInstanceMap + UISpecificArgMap
│  └─ ServerDefine.ts                  # 运行时枚举（SERVER_STATE）
├─ module/login/
│  ├─ LoginView.ts                     # 业务视图（继承 ILoginView）
│  ├─ LoginServerListPopView.ts        # 弹窗视图
│  ├─ PvPlayView.ts                    # 全屏弹窗
│  ├─ interfaces/                      # 手写的 UI 结构绑定基类（按 FGUI 组件结构维护）
│  │  ├─ ILoginView.ts
│  │  ├─ ILoginServerListPopView.ts
│  │  └─ IPvPlayView.ts
│  └─ cells/                           # 列表/树渲染器（纯渲染，无状态）
│     ├─ LoginServerCell.ts
│     ├─ LoginServerMyCell.ts
│     └─ LoginGroupCell.ts
└─ repo/
   ├─ RepoFactory.ts                   # 唯一取数源入口（local/remote 切换点）
   └─ login/
      ├─ LocalServerListRepo.ts        # 本地实现：读 json + 写存档
      └─ LocalUserAccountRepo.ts

dts/repo/login/                        # 纯类型，分模块子目录
├─ IServerListRepo.d.ts
└─ IUserAccountRepo.d.ts
```

新建/重构其它模块**目录骨架与命名形态必须与之对齐**，除非任务说明里写清楚为什么偏离。

## 3. 强制规则（红线，不得降级）

1. **数据源必须走 Repo**：DB 与 View **不得**直接读 `assets/resources/*.json`、不得直接调网络/SDK；所有外部数据通过 `RepoFactory.getXxxRepo()` 取到的接口访问。新增数据维度时**必须**先定义 `dts/repo/<module>/IXxxRepo.d.ts` 再写实现。
2. **本地单机版边界**：禁止引入 socket / sendXxx / 第三方 SDK 弹窗 / 防沉迷 / 网关代码。即便接口形式异步（`Promise`），本地实现也只做存档读写或 json 加载。
3. **不得使用兜底**：
    - Repo 拿不到关键数据（如 `serverlist.json` 字段不合法）必须直接 `throw`，不得伪造空数据让流程"继续走"。参见 `LocalServerListRepo.fetchServerList` 的写法。
    - DB 中"前置条件不满足"分支（如 `setCurServer` 收到未知 id），必须 `XDEBUGLOG.warn` 并直接 return，不允许默默修正成"看起来合理"的值。
    - 不要给"以后可能用上"的字段做空对象兜底；先把规则补清楚再加字段。
4. **DB 单例形态固定**：
    - `extends BaseData`、`private static _inst` + `public static get inst()`。
    - `init()` 必调 `super.init()`（触发 `ObserveMgr.reComplie`）。
    - `clearData()` **必须**实现，并在 `GameApp.clearAllData()` 里追加调用。
    - 末尾追加 `(window as any)["XxxDB"] = XxxDB;` 用于调试。
5. **View 业务与结构绑定分层**：
    - `interfaces/I<XxxView>.ts` 是**手写**的结构绑定基类（不再依赖 FGUI 导出器生成）；只放字段声明、`UIPackage.createObject` 调用、`initComponentByView` / `initControllerByView` 调用、`Transition` 取值，禁止写业务逻辑。
    - 字段名需与 FGUI 包内组件命名严格一致；FGUI 工程改了字段，本文件**人手同步**。
    - 业务写在继承类 `<XxxView>.ts` 中。
    - `getFairyPackageArr()` 必须返回真实依赖的 FGUI 包名数组。
6. **事件 / 存档 / UI 字符串集中管理**：
    - 事件名必落 `EventDefine.ts:EVENTNAME` 并在 `EventDataMap` 中声明 payload 类型。
    - 存档键必落 `StorageDefine.ts:STORAGE_TYPE` 并在 `StorageDataMap` 中声明值类型。
    - UI 名必落 `UIDefine.ts:UINAME`，在 `UIDefine.initUI()` 注册 `ALL_UI`、在 `UIInstanceMap` 加映射；带强类型参数的 UI 在 `UISpecificArgMap` 加映射，参数本体落 `dts/IUIArg.d.ts:IUIArg`。
    - 运行时枚举落 `app/define/<Xxx>Define.ts`，命名 `XXX_STATE` / `XXX_TYPE` 这类全大写下划线。
7. **资源释放成对**：
    - View 在 `onCreate` / `onRefresh` 注册的 `EventMgr` 监听、视频单元、tween，必须在 `onDestroy` 全部解除/停止/置空。
    - Cell 不持有节点引用、不订阅事件，只在 `static update` 中按 data 写回字段。
8. **关键流程：先校验，再写入，最后派发事件**：
    - 进入游戏、切服、登录成功这类关键动作，顺序必须是「校验前置 → 调 Repo → 写本地状态 → 派发 `EVENTNAME.*`」。看 `LoginDB.setCurServer` 与 `UserDB.enterGame`。
    - 关键写入与外部异步动作之间禁止丢失防重入标记（参见 `LoginView._entering`）。
9. **日志规范**：
    - 统一 `XDEBUGLOG.debug / warn / error("[XxxView]" | "[XxxDB]" | "[LocalXxxRepo]", ...)`，前缀方括号 + 类名。
    - 关键 API、状态切换、异常分支都要有一条日志（按 AGENTS.md "每加入一条 API、驱动界面变化或关键业务行为变化，尽量增加 XDEBUG 级别的重要日志输出"）。
10. **文件头与注释**：
    - 新建 `.ts` 必带文件头（`Author : XW` + `Desc : ...`）。
    - 函数、参数、属性需中文短注；注释只点语义/职责，不展开实现、不复述生命周期。

## 4. 标准操作步骤

### 4.1 新建模块

1. **先写设计方案**：`docs/设计方案/<模块名>的设计方案.md`（落点遵循 [feedback_design_doc_path](../../../C:/Users/Administrator/.claude/projects/e--work-creator-cocos-feihong/memory/feedback_design_doc_path.md) 的偏好；命名必须用"xxx的设计方案.md"）。方案至少明确：模块边界、视图清单、数据结构、Repo 接口、存档键、事件名。
2. **建接口骨架**：
    - `dts/repo/<module>/IXxxRepo.d.ts`：先把数据结构与 method 签名定下来。
    - `app/define/`：把要新增的 `EVENTNAME` / `STORAGE_TYPE` / `UINAME` / 枚举先补齐。
    - `dts/IUIArg.d.ts`：补带强类型参数的 UI Arg。
3. **建 Repo 实现 + 工厂入口**：
    - `app/repo/<module>/Local<Xxx>Repo.ts`：实现接口；本地版只走 json / 存档。
    - `app/repo/RepoFactory.ts`：加 `getXxxRepo()` 工厂方法，遵循现有 `MODE === "local"` 分支模式。
4. **建 DB 单例**：`app/data/<Module>DB.ts`，按 §3.4 形态实现 `ensureLoaded` / `getXxx` / 写入入口 / `clearData`。
5. **跑 FGUI 工程**（如本模块新增包）：按 [CONVERTO_FGUI.md](../../../CONVERTO_FGUI.md) §6 还原或新建包，导出 `.fui` 资源；`interfaces/I*.ts` **人手新建/维护**，字段、控制器、过渡名严格对齐 FGUI 组件结构。
6. **写业务 View**：
    - `app/module/<Module>/<XxxView>.ts` 继承生成类。
    - `getFairyPackageArr` 列依赖包；`onCreate` 绑事件 / 静态文案 / 视频音频；`onRefresh` 跑过渡 + 异步引导；`onDestroy` 成对释放。
7. **注册到入口**：
    - `app/define/UIDefine.ts`：`UINAME` + `initUI()` + `UIInstanceMap`（必要时 `UISpecificArgMap`）。
    - `GameApp.initModel()`：追加 `XxxDB.inst.init()`。
    - `GameApp.clearAllData()`：追加 `XxxDB.inst.clearData()`。
8. **自查清单**：跑 §5 自查表。

### 4.2 修改已有模块

1. 先在设计方案里确认要改的字段/视图/流程，未明确就停下补方案。
2. 改字段链路：`dts/repo/.../*.d.ts` → 本地 Repo 实现 → DB → View / Cell，**逐层同步**。
3. 改事件 / 存档键 / UI 名：先改 `*Define.ts`，再全局检索旧名，逐处替换；禁止"半套旧名"残留。
4. 改 UI 结构：FGUI 工程字段变动后，`interfaces/I*.ts` **人手同步**字段名/控制器/过渡名，继承类按新字段名一并同步；不允许靠类型 `as any` 模糊兼容。

### 4.3 重构

1. 先写一段"重构动机 + 边界"贴在设计方案顶部，避免顺手扩散。
2. 同步更新 `docs/规范/模块/<模块名>稳定实现规范.md`（无则新建），用稳定规范作为长期规则锚点。
3. 旧字段、旧事件名、旧存档键、旧 UI 名一次性清干净，不留 `// removed`、`_unused` 之类残留。
4. 重构后必须跑过一遍 §5 自查表。

### 4.4 切到联网（未来动作）

1. 在 `dts/repo/<module>/IXxxRepo.d.ts` 不动接口签名的前提下，新增 `app/repo/<module>/Remote<Xxx>Repo.ts`。
2. `RepoFactory` 的 `MODE` 切换到 `"remote"`；现有 `Local*Repo` 不删，留作离线回放/测试。
3. View 与 DB **零改动**。如果发现必须改 View 才能切远端，说明前面把抽象漏在了 View 里——退回去把它推到 Repo 层。

## 5. 自查清单（交付前过一遍）

数据流：

- [ ] 新增字段在 `dts/repo/.../*.d.ts` → `Local*Repo` → DB → View 全链路一致，没有半路 `as any`。
- [ ] DB 的所有外部数据访问都经过 `RepoFactory`，没有直接 `ResMgr.loadRes` / `XStorageMgr` 出现在 DB 里（这些必须封装在 Repo 实现中）。
- [ ] 关键写入路径是「校验 → 调 Repo → 改本地状态 → 派发事件」顺序，没有反过来。

定义集中：

- [ ] 新事件名落 `EventDefine.ts:EVENTNAME` 且 `EventDataMap` payload 类型有声明。
- [ ] 新存档键落 `StorageDefine.ts:STORAGE_TYPE` 且 `StorageDataMap` 值类型有声明。
- [ ] 新 UI 名落 `UIDefine.ts:UINAME`、`initUI()` 已注册、`UIInstanceMap` 已加映射、必要时 `UISpecificArgMap` 与 `IUIArg` 已声明。
- [ ] 模块运行时枚举单独落 `app/define/<Xxx>Define.ts`，没有散落在 View 顶部。

模块入口：

- [ ] `GameApp.initModel()` 已加 `XxxDB.inst.init()`。
- [ ] `GameApp.clearAllData()` 已加 `XxxDB.inst.clearData()`。
- [ ] 模块 View 的 `getFairyPackageArr()` 列出了真实依赖包。

释放与防重入：

- [ ] `onCreate` / `onRefresh` 注册的事件、Tween、视频、定时器，在 `onDestroy` 全部解除/停止/置空。
- [ ] 关键异步动作（进入游戏、登录、切服）有防重入标记。

兜底与日志：

- [ ] 关键数据缺失/不合法分支是 `throw` 或 `return` + warn 日志，不是悄悄塞默认值。
- [ ] 新增 API、状态切换、异常分支都有 `XDEBUGLOG.debug / warn / error("[XxxView]", ...)` 日志。

文档：

- [ ] 设计方案落 `docs/设计方案/<模块名>的设计方案.md`，文件名严格"xxx的设计方案.md"格式。
- [ ] 模块级稳定规范落 `docs/规范/模块/<模块名>稳定实现规范.md`（重构/稳定化时必须有）。
- [ ] 若同时动了 FGUI 工程、跨包公共资源或资源 `id` 桥接，已同步更新 [CONVERTO_FGUI.md](../../../CONVERTO_FGUI.md)。

## 6. 命名形态速查

| 类别 | 形态 | 示例 |
| --- | --- | --- |
| 模块目录（`app/module`） | `PascalCase`，首字母大写 | `Login`、`HotUpdate` |
| 模块目录（`app/repo`、`dts/repo`） | 全小写 | `login/` |
| View 业务类 | `XxxView` / `XxxPopView` | `LoginView`、`LoginServerListPopView` |
| FGUI 生成类 | `IXxxView` | `ILoginView` |
| Cell 类 | `XxxCell` | `LoginServerCell` |
| DB 单例 | `XxxDB` | `LoginDB`、`UserDB` |
| Repo 接口 | `IXxxRepo` | `IServerListRepo` |
| Repo 实现 | `LocalXxxRepo` / `RemoteXxxRepo` | `LocalServerListRepo` |
| 运行时枚举 | `XXX_TYPE` / `XXX_STATE`，全大写下划线 | `SERVER_STATE`、`STORAGE_TYPE` |
| 事件名常量 | 全大写下划线 | `LOGIN_SUCCESS`、`SERVER_CHANGED` |
| UI 名 | 与 View 类名同名，作为 `UINAME` 的 key | `LoginView`、`PvPlayView` |
| 资源路径常量 | 文件顶部 `const`，描述用途 | `BG_VIDEO_URL`、`SFX_CLICK` |

## 7. References

1. `references/module-model-checklist.md` — 落地前的可勾选清单（与 §5 配套）。
2. `references/login-module-reference.md` — Login 模块各文件的角色与关键代码段索引，写新模块时对照参考。
