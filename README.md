# cocos_jianghu

## 项目简介

这是一个基于 `Cocos Creator 3.8.8` 的游戏项目仓库，当前仓库内可确认的核心内容包括：

- 主游戏工程代码：`assets/script`
- FairyGUI 原始工程：`FGUIProject/UIProject`
- Cocos MCP 扩展：`extensions/cocos-mcp-server`

原 README 中大量编辑器、脚本与 `doc/` 文档路径已不存在，已移除，避免继续误导使用者。

## 环境要求

1. `Cocos Creator 3.8.8`
2. `Node.js`（用于扩展或本地工具链）
3. FairyGUI 编辑器（如需维护 `FGUIProject/UIProject`）

## 目录结构

```text
.
├─ assets/script                 # 游戏主代码
│  ├─ app                        # 业务模块、数据与定义
│  ├─ base                       # 基础层：管理器、网络、UI、流程等
│  └─ fairyGUI                   # FairyGUI 运行时封装
├─ assets/resources              # 资源目录
├─ FGUIProject/UIProject         # FairyGUI 原始工程
└─ extensions/cocos-mcp-server   # Cocos MCP 扩展
```

## 启动入口

主入口文件：`assets/script/GameApp.ts`

当前代码中可确认的启动顺序如下：

1. 创建 `GRoot` 并将节点设为常驻。
2. 应用历史热更搜索路径：`HotUpdateMgr.inst.applySavedSearchPaths()`。
3. 初始化核心管理器：`TimerMgr`、`UIMgr`、`SceneMgr`、`NetWorkMgr`、`AudioMgr`。
4. 初始化 UI 工厂与基础资源：`UIObjectFactoryDefine`、`LanguageMgr`、`MaterialMgr`、`ConfigMgr`、`ResMgr`。
5. 初始化数据模型：`RedPointDB`、`UserDB`。
6. 进入首场景：`SceneName.LoginScene`。

## FairyGUI 说明

- FairyGUI 工程说明见：`FGUIProject/UIProject/README.md`
- 发布配置文件：`FGUIProject/UIProject/settings/Publish.json`
- 当前发布资源目录：`assets/resources/ui/{publish_file_name}`
- 当前导出代码根目录：`assets/script/app/module`

## 当前仓库现状说明

1. 根目录 `package.json` 中保留了历史脚本，但其中部分脚本依赖的扩展目录已不在当前仓库内。
2. 因此，执行 npm 脚本前应先核对对应目录与脚本入口是否真实存在。
3. 如需继续清理历史脚本或补一版可执行的开发说明，建议单独处理 `package.json` 与工具链目录。

## 相关文件

- 项目约束：`AGENTS.md`
- 代码规范：`Angents/Skills/code-style/SKILL.md`
- 文档检查规范：`Angents/Skills/check-doc/SKILL.md`
- FairyGUI 工程说明：`FGUIProject/UIProject/README.md`
- MCP 扩展说明：`extensions/cocos-mcp-server/README.md`
