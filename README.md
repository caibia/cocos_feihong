# cocos_feihong

## 项目简介

基于 `Cocos Creator 3.8.8` + FairyGUI 的**本地单机版**游戏工程：

- 不联网、不接第三方 SDK，所有数据从本地 json / 存档读出。
- 所有数据访问统一走 `Repo` 抽象，未来切远端只需新增 `RemoteXxxRepo`，业务层与 DB 层不动。
- UI 由 FairyGUI 编辑器产出二进制包，运行时通过 `UIPackage` 加载。

## 环境要求

1. `Cocos Creator 3.8.8`
2. `Node.js`（用于扩展或本地工具链）
3. FairyGUI 编辑器（维护 `FGUIProject/UIProject` 时需要）

## 目录结构

```text
.
├─ assets/script
│  ├─ GameApp.ts                # 引擎入口组件
│  ├─ app                       # 业务层
│  │  ├─ data                   # 模块 DB 单例（XxxDB.ts，继承 BaseData）
│  │  ├─ define                 # 事件名、UI 名、存档键、场景名、运行时枚举等
│  │  ├─ module                 # 各业务模块的视图与 Cell（FGUI 业务类）
│  │  │  └─ Login               # 登录模块 View / 弹窗 / Cell / Interfaces
│  │  └─ repo                   # 数据源实现 + RepoFactory（本地/远端切换点）
│  ├─ base                      # 基础层：管理器、ui 基类、网络、流程、单元等
│  └─ fairyGUI                  # FairyGUI 运行时封装
├─ assets/resources             # 运行时可加载资源
│  ├─ audio                     # 音频
│  ├─ bg                        # 静态背景图（兜底）
│  ├─ config/json               # 本地配置 json（含 serverlist.json）
│  ├─ font                      # 字体
│  ├─ movie                     # 视频（背景、PV、字幕）
│  └─ ui                        # FGUI 发布产物（运行时由 UIPackage 读取）
├─ dts                          # 工程级 .d.ts
│  ├─ IUIArg.d.ts               # UI 参数命名空间
│  ├─ IStorage.d.ts             # 存档结构
│  └─ repo                      # 各模块 Repo 接口（纯类型，按模块分子目录）
├─ FGUIProject/UIProject        # FairyGUI 原始工程
│  ├─ assets/0Common            # 跨包公共资源（预留）
│  ├─ assets/Login              # 登录模块包
│  └─ plugins/codex-fgui-bridge # 资源 id 分配 / 列表清空属性桥接插件
├─ docs/设计方案                # 模块设计方案（命名：xxx的设计方案.md）
├─ Angents/Skills               # 本仓库 skill 集
```

## 启动入口

主入口：`assets/script/GameApp.ts:GameApp.start`。当前可确认的启动顺序：

1. 创建 `GRoot`，把节点设为常驻：`GRoot.create()` + `director.addPersistRootNode`。
2. 应用历史热更搜索路径：`HotUpdateMgr.inst.applySavedSearchPaths()`。
3. 初始化日志与基础管理器：`XDEBUGLOG`、`TimerMgr`、`UIMgr`、`SceneMgr`、`NetWorkMgr`、`UIObjectFactoryDefine`、`AudioMgr`。
4. 异步预热：`LanguageMgr.init` → `MaterialMgr.preload` → `ConfigMgr.init` → `ResMgr.init`。
5. 注册字体：`registerFont("GameFont", "font/yuehei")` 并设为默认。
6. 初始化模块 DB：`RedPointDB.inst.init()`、`UserDB.inst.init()`。
7. 进入登录场景：`SceneMgr.inst.show(SceneName.LoginScene)`。

## 业务层分层约定

| 层 | 落点 | 职责 |
| --- | --- | --- |
| View 接口 | `app/module/<module>/interfaces/IXxxView.ts` | 手写的 UI 结构绑定基类（字段名对齐 FGUI 组件结构），**不写业务** |
| View 业务 | `app/module/Xxx/XxxView.ts` | 继承 `IXxxView`，处理交互、动画、事件、订阅 DB |
| Cell | `app/module/Xxx/Cells/XxxCell.ts` | List/Tree item 的纯渲染函数（`static update`） |
| DB | `app/data/XxxDB.ts` | 模块数据单例，继承 `BaseData`，**只通过 Repo 访问数据源** |
| Repo 接口 | `dts/repo/<module>/IXxxRepo.d.ts` | 纯类型，描述模块数据源契约 |
| Repo 实现 | `app/repo/<module>/LocalXxxRepo.ts` | 本地实现；未来 `Remote*Repo` 平级新增 |
| Repo 工厂 | `app/repo/RepoFactory.ts` | 业务唯一取数源入口；切远端只改这里 |
| 定义/枚举 | `app/define/*.ts` | 事件名、UI 名、存档键、场景名、运行时枚举 |

## FairyGUI 说明

- FGUI 工程说明：`FGUIProject/UIProject/README.md`
- 发布配置：`FGUIProject/UIProject/settings/Publish.json`
- 发布产物目录：`assets/resources/ui/{publish_file_name}`
- 自动导出代码根：`assets/script/app/module/<Package>/Interfaces`
- 资源 id / 列表清空属性的桥接插件：`FGUIProject/UIProject/plugins/codex-fgui-bridge`
- `.fui` → 源工程的还原规则、`0Common` 归档、`package.xml` 与桥接调用：见 [CONVERTO_FGUI.md](CONVERTO_FGUI.md)

## 相关文档

- 项目约束总纲：[AGENTS.md](AGENTS.md)
- 代码规范 skill：[Angents/Skills/code-style/SKILL.md](Angents/Skills/code-style/SKILL.md)
- FGUI 转换/还原规则：[CONVERTO_FGUI.md](CONVERTO_FGUI.md)

## 当前仓库现状说明

1. 根目录 `package.json` 中保留了历史脚本，其中部分脚本依赖的扩展目录已不在当前仓库内；执行 npm 脚本前先核对入口存在性。
2. `导出的资源素材/` 是资源产物来源目录，按 `AGENTS.md` 约定**默认不读**；做模块复刻时按场景明确读取。
