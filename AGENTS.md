# AGENTS.md
1.使用终端禁止中文乱码
## 执行方式

1. 用户直接指令和本文件优先于 Skill；本文件只放总入口和硬边界，细则写入对应 Skill。
2. 只读取与当前任务直接命中的本地 Skill，不扫描、串联或加载无关 Skill。
3. 需求明确且风险满足“快速通道”时直接执行；不要因为任务可能命中某个流程 Skill 就自动叠加完整流程。
4. 用户明确要求，或任务存在跨模块、高风险、重大歧义、连续失败时，才使用直接相关的 `superpowers:*` 流程 Skill。
5. 同时命中流程 Skill 与本地领域 Skill 时，流程 Skill 只负责当前必要步骤，项目边界以本文件和最具体的本地领域 Skill 为准。

## 快速通道

- 适用：需求明确、改动集中在单一模块，且不涉及协议结构、FGUI 固定结构、资源导入与 owner、数据迁移、登录会话、复杂状态机或破坏性外部操作。
- 流程：检查当前实现与调用点，直接修改，运行能覆盖改动的最小专项验证，再检查本次 diff。
- 快速通道不创建规格文档、计划文档、worktree、subagent brief/report 或独立 Review 报告，也不等待额外开工确认。
- 快速通道不强制执行 TDD 的 RED/GREEN 仪式；Bug 修复或有明确回归价值的行为变化仍应补最小专项测试。
- 执行中发现范围扩大、状态归属不清、生命周期风险或验证连续失败时，退出快速通道并升级到对应流程 Skill。

## 规则优先级

1. 本次用户直接指令优先。
2. 本文件的硬边界优先于所有 Skill、说明文档和历史记忆。
3. 快速通道与复杂任务的分流规则优先于 Skill 的宽泛触发描述。
4. 同一问题命中多个本地 Skill 时，先按更具体的领域 Skill 执行；通用 Skill 只补充基础规则。
5. 已验证并写入 `AGENTS.md` 或 `Angents/Skills` 的新规则，优先于旧描述、历史记忆和 `doc/` 说明。
6. 发现规则冲突时，按上述优先级执行，并把过期规则收敛到最小合适文件；不要保留互斥描述。

## 硬边界

- 思考、回复、Todos、代码注释统一使用中文。
- 所有文本文件统一使用 UTF-8；读取仓库内 `*.md` 必须显式使用 UTF-8，乱码时先按 UTF-8 复核。
- `.meta` 文件由用户或编辑器生成，Codex 不新增、不重命名、不编辑；删除资源、脚本或目录时允许同步删除对应 `.meta`。
- 本项目处于初版阶段，不使用补丁流程；需要改动时直接修改对应文件。
- 本项目处于初版阶段，不做历史兼容；禁止新增或保留兼容入口、旧命名别名导出；`window["xxx"]` 只允许用于 `DB` / `Mgr` 调试入口，其它类禁止挂载到 `window`。
- FGUI 页面修改必须使用 FGUI MCP，禁止直接修改 XML、解 bin 或用业务代码绕过编辑器配置。
- 业务客户端代码禁止 import、引用或直接调用 `assets/script/app/server/`，必须通过协议交互。
- 本地服务端脚本必须按真实服务端模型处理登录态、会话、参数、数据归属和状态前置条件，禁止为跑通界面写固定假数据或无条件成功。
- 协议运行时固定使用 `assets/resources/config/proto/proto.bin`，不生成、不依赖 `proto.json`。
- 代码里禁止出现用户可见的明文文本，展示文本统一通过 `LanguageMgr` 读取并维护到 `Language.json`。
- `导出的资源素材/` 是资源产物目录，未经用户明确说明，不得读取、查看或修改；该目录不纳入 Git。
- 快速通道最终回复前只检查本次 diff、最小专项验证和直接受影响调用点；跨模块、高风险、用户明确要求 Review 或上传前需要深度质量门时，执行 [code-quality-review](Angents/Skills/code-quality-review/SKILL.md)。
- 修改执行规则时，更新本文件或 [Angents/Skills](Angents/Skills) 下对应 Skill；说明文档才写入 `doc/`。
- 回复中引用仓库文件时使用相对路径 Markdown 链接，例如 `[AGENTS.md](AGENTS.md)` 或 `[AGENTS.md:1](AGENTS.md#L1)`。

## 本地 Skills

### 流程类

| Skill | 命中场景 |
| --- | --- |
| [runtime-debug-tracing](Angents/Skills/runtime-debug-tracing/SKILL.md) | 需要追查运行时入口、调用链、状态来源和错误根因的问题 |
| [scoped-git-upload](Angents/Skills/scoped-git-upload/SKILL.md) | 脏工作区定范围提交、上传、push、核对暂存区、串联验证矩阵、防止无关文件混入提交 |

### 基础与质量类

| Skill | 命中场景 |
| --- | --- |
| [db-data-pattern](Angents/Skills/db-data-pattern/SKILL.md) | `assets/script/app/data/*DB.ts`、`BaseData` 数据模块、`LoginDB` 风格、协议状态、send/post 入口和业务数据对象结构 |
| [code-style](Angents/Skills/code-style/SKILL.md) | TypeScript、Cocos 客户端基础规范、类型声明、命名、重构、配置结构、文档和工具目录规范 |
| [code-quality-review](Angents/Skills/code-quality-review/SKILL.md) | 跨模块、高风险、明确 Review 或上传前的深度质量检查 |

### 领域类

| Skill | 命中场景 |
| --- | --- |
| [local-server-protocol](Angents/Skills/local-server-protocol/SKILL.md) | 本地服务端、协议收发、`LocalServer`、`ServerDefine`、`proto.bin`、`ProtoCodec`、服务端错误码 |
| [language-text](Angents/Skills/language-text/SKILL.md) | 用户可见文案、`Language.json`、`LanguageMgr`、文本 id 号段、服务端错误码提示、明文文本检查 |
| [config-runtime-pipeline](Angents/Skills/config-runtime-pipeline/SKILL.md) | 配置表 Excel、运行时 JSON、`IConfig.d.ts`、`ConfigMgr.getConfig`、配置导入导出和运行时配置缺失 |
| [scene-flow-contract](Angents/Skills/scene-flow-contract/SKILL.md) | 场景跳转、`SceneDefine`、`SceneArgMap`、`UIArgMap`、Loading、协议回包后跳转和异步场景准备 |
| [resource-lifecycle](Angents/Skills/resource-lifecycle/SKILL.md) | 资源导入、`.dmeo`、Cocos import 类型、`.meta`、资源 owner、`ResMgr`、FGUI 包、音频、动态碎图、材质、TMX、Spine、DragonBones、`GLoader3D`、释放泄漏 |
| [game-runtime-quality](Angents/Skills/game-runtime-quality/SKILL.md) | 性能、事件、计时、异步过期、批量刷新和运行时生命周期风险 |
| [fgui-mcp](Angents/Skills/fgui-mcp/SKILL.md) | FGUI MCP 使用规范、边界与常用流程 |
| [fgui-package-normalize](Angents/Skills/fgui-package-normalize/SKILL.md) | FGUI 包规范化与适配（改名、清理资源、view 全屏化、分组、relation 适配） |

### 文档与工具类

| Skill | 命中场景 |
| --- | --- |
| [editor-change-spec](Angents/Skills/editor-change-spec/SKILL.md) | 编辑器相关改动（`tools/edit-*/`、字段结构、联表选项、导入导出、校验逻辑） |
