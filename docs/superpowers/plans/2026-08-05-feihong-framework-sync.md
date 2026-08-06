# cocos_feihong 框架同步实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将 `cocos_jianghu` 当前可复用的公共框架、协议/资源工具和 Skill 规则迁移到 `cocos_feihong`，保留本项目文字渐变改动并排除江湖业务。

**架构：** 以源仓库公共层当前文件为基线，分为规则体系、公共运行时、协议工具链三组迁移；所有项目接点通过本项目现有 `app/define`、Login/Repo 结构重新校准。文件删除和重命名先完成引用迁移，再清理旧入口，不操作 `.meta`。

**技术栈：** Cocos Creator 3.8.8、TypeScript 5.9.3、FairyGUI、protobufjs 8.4.2、Node.js 工具脚本。

## 全局约束

- 思考、回复、Todos、代码注释使用简体中文；文本文件使用 UTF-8。
- `AGENTS.md` 和 Skill 以 `cocos_jianghu` 当前版本为基础，项目名、路径和实际能力适配为 `cocos_feihong`。
- 删除 `Angents/Skills/check-doc`、`Angents/Skills/module-model` 及其 references，不保留旧路由。
- 不读取或修改 `导出的资源素材/`；不新增、编辑、重命名 `.meta`。
- 不迁移江湖地图、创角、主场景、NPC、业务服务端、配置表、FGUI 包和二进制资源。
- 不新增兼容别名、空实现或固定假数据；缺失前置条件必须显式报错。
- 每项行为改动完成后检查直接调用点、用户现有工作区改动和 `git diff`。

---

### 任务 1：同步 AGENTS 与 Skill 体系

**文件：**
- 修改：`AGENTS.md`
- 删除：`Angents/Skills/check-doc/SKILL.md`
- 删除：`Angents/Skills/module-model/SKILL.md`
- 删除：`Angents/Skills/module-model/references/module-model-checklist.md`
- 删除：`Angents/Skills/module-model/references/login-module-reference.md`
- 创建/修改：源仓库的以下 Skill 目录及文件
  - `Angents/Skills/code-quality-review/SKILL.md`
  - `Angents/Skills/code-quality-review/references/test-catalog.md`
  - `Angents/Skills/code-quality-review/references/verification-matrix.md`
  - `Angents/Skills/code-style/SKILL.md`
  - `Angents/Skills/code-style/references/code-style-checklist.md`
  - `Angents/Skills/code-style/references/project-code-examples.md`
  - `Angents/Skills/code-style/references/ts-cocos-guide.md`
  - `Angents/Skills/config-runtime-pipeline/SKILL.md`
  - `Angents/Skills/db-data-pattern/SKILL.md`
  - `Angents/Skills/editor-change-spec/SKILL.md`
  - `Angents/Skills/editor-change-spec/references/cross-table-field-design.md`
  - `Angents/Skills/editor-change-spec/references/editor-baseline.md`
  - `Angents/Skills/editor-change-spec/references/editor-change-checklist.md`
  - `Angents/Skills/fgui-mcp/SKILL.md`
  - `Angents/Skills/fgui-mcp/agents/openai.yaml`
  - `Angents/Skills/fgui-package-normalize/SKILL.md`
  - `Angents/Skills/fgui-package-normalize/references/package-normalize-workflow.md`
  - `Angents/Skills/fgui-package-normalize/references/relation-sidepair.md`
  - `Angents/Skills/game-runtime-quality/SKILL.md`
  - `Angents/Skills/language-text/SKILL.md`
  - `Angents/Skills/local-server-protocol/SKILL.md`
  - `Angents/Skills/resource-lifecycle/SKILL.md`
  - `Angents/Skills/resource-lifecycle/references/asset-import-pipeline.md`
  - `Angents/Skills/runtime-debug-tracing/SKILL.md`
  - `Angents/Skills/scene-flow-contract/SKILL.md`
  - `Angents/Skills/scoped-git-upload/SKILL.md`

**接口：**
- 消费：源仓库当前 `AGENTS.md` 与 `Angents/Skills` 内容。
- 产出：仅保留 14 个源仓库 Skill，所有项目标识和路径指向 `cocos_feihong`。

- [ ] **步骤 1：建立源文件清单并检查目标用户改动**

运行：

```powershell
git status --short
rg -n "cocos_jianghu|D:\\work\\LocalGames\\cocos_jianghu" Angents AGENTS.md
```

预期：只报告源仓库引用和当前已知脏文件，不读取 `导出的资源素材/`。

- [ ] **步骤 2：复制源 Skill 文本并适配项目标识**

从 `D:\work\LocalGames\cocos_jianghu\AGENTS.md` 与 `Angents/Skills` 复制上述清单，使用 UTF-8；仅将 `cocos_jianghu`、源仓库绝对路径、源项目特有目录改为本项目实际名称和路径，保留源仓库的规则结构。

- [ ] **步骤 3：删除旧 Skill 路由**

删除 `check-doc`、`module-model` 两个目录及其 references，并从 `AGENTS.md` 的 Skill 表中移除对应入口。

- [ ] **步骤 4：验证 Skill 结构**

运行：

```powershell
rg -n "cocos_jianghu|D:\\work\\LocalGames\\cocos_jianghu|module-model|check-doc" AGENTS.md Angents/Skills
Get-ChildItem Angents/Skills -Recurse -File | Where-Object Extension -eq '.md' | ForEach-Object { Get-Content $_.FullName -Raw -Encoding UTF8 | Out-Null }
```

预期：无旧项目名、旧 Skill 路由或源绝对路径；所有 Markdown 可按 UTF-8 读取。

- [ ] **步骤 5：运行 Skill frontmatter 校验**

运行 `python C:\Users\Jax\.codex\skills\.system\skill-creator\scripts\quick_validate.py Angents/Skills/<skill>`，对 14 个 Skill 逐目录执行。

预期：每个目录的 `name`、`description` 和目录名校验通过。

### 任务 2：迁移公共资源、场景和 FairyGUI 运行时

**文件：**
- 修改：`assets/script/base/audio/AudioMgr.ts`、`AudioMusic.ts`、`AudioSound.ts`
- 修改：`assets/script/base/define/HotUpdateDefine.ts`、`XConst.ts`
- 创建：`assets/script/base/define/XResConst.ts`
- 修改：`assets/script/base/extend/Extend.ts`、`ExtendAlgorithm.ts`、`ExtendAni.ts`、`ExtendColor.ts`
- 创建：`assets/script/base/manager/ScreenShotMgr.ts`
- 修改：`assets/script/base/manager/ConfigMgr.ts`、`DragonBonesMgr.ts`、`EventMgr.ts`、`HotUpdateMgr.ts`、`LanguageMgr.ts`、`MaterialMgr.ts`、`ObserveMgr.ts`、`ResMgr.ts`、`SceneMgr.ts`、`SpineMgr.ts`、`TimerMgr.ts`、`UIMgr.ts`、`XStorageMgr.ts`
- 修改：`assets/script/base/net/NetWorkMgr.ts`、`ProtoCodec.ts`、`SocketMgr.ts`
- 创建：`assets/script/base/net/NetLoadingTracker.ts`、`ProtoBinLoader.ts`、`ProtoBinParser.ts`
- 修改：`assets/script/base/procedure/Procedure.ts`、`ProcedureQueueMgr.ts`
- 修改：`assets/script/base/ui/XComponent.ts`、`XScene.ts`、`XWindow.ts`
- 修改：`assets/script/base/unit/DragonBonesUnit.ts`、`EventUnit.ts`、`NetworkUnit.ts`、`ObserveUnit.ts`、`RedPointUnit.ts`、`SpineUnit.ts`、`TimerUnit.ts`
- 修改：`assets/script/fairyGUI/GButton.ts`、`GComboBox.ts`、`GLabel.ts`、`GLoader.ts`、`GLoader3D.ts`、`GObject.ts`、`GTextField.ts`、`GVideoPlayer.ts`、`UIConfig.ts`、`utils/UBBParser.ts`
- 删除（完成引用迁移后）：`assets/script/base/define/XResourcesUrl.ts`、`assets/script/base/extend/ExtendScreenShot.ts`、`assets/script/base/ui/XLoader.ts`
- 保留：`assets/script/base/path/AStarPathFinder.ts`、`assets/script/base/unit/VideoUnit.ts`，除非直接调用点检查证明其为本项目无用文件

**接口：**
- 消费：本项目现有 `app/define`、Login/Repo 定义和 FGUI 运行时类。
- 产出：公共底座使用 `XResConst`、`ScreenShotMgr`、源仓库资源生命周期和 FairyGUI 修复；本项目文字渐变行为继续可用。

- [ ] **步骤 1：记录旧入口调用点并写迁移映射**

运行：

```powershell
rg -n "XResourcesUrl|ExtendScreenShot|XLoader|ProtoSchema|XResConst|ScreenShotMgr" assets/script -g '*.ts'
```

预期：所有旧入口调用点被列出，后续改为 `XResConst`、`ScreenShotMgr` 或源协议加载器。

- [ ] **步骤 2：迁移源仓库公共脚本**

将任务文件清单中对应源仓库文件复制到目标，跳过所有 `.meta`、`assets/script/base/map/**` 和江湖业务引用；复制后逐个检查 import 是否指向本项目现有 `app/define`。

- [ ] **步骤 3：合并文字渐变实现**

以源仓库 `ExtendColor.ts`、`GTextField.ts` 为公共基线，将本项目当前未提交的渐变 API、材质使用和字段保持合入；不得恢复旧 `XResourcesUrl` 注释代码，不得丢失 `assets/resources/shaders/text-gradient.effect` 的调用约定。

- [ ] **步骤 4：完成重命名和资源生命周期引用迁移**

把 `XResourcesUrl.*` 全部改为 `XResConst.*`，把 `ExtendScreenShot.inst` 改为 `ScreenShotMgr.inst`；删除 `XLoader` 依赖并使用 `GLoader`/源资源管理接口。确认 `rg` 不再找到可执行代码中的旧入口后删除三个旧脚本。

- [ ] **步骤 5：检查公共层直接调用点**

运行：

```powershell
rg -n "XResourcesUrl|ExtendScreenShot|XLoader" assets/script -g '*.ts'
rg -n "from .*app/server|assets/script/app/server" assets/script/base assets/script/fairyGUI -g '*.ts'
```

预期：旧入口无有效 import；公共底座不引用源仓库专属 `app/server`。

### 任务 3：切换协议运行时和导出工具

**文件：**
- 修改：`package.json`、`package-lock.json`
- 修改：`tools/proto/export-proto.js`
- 修改/保留：`tools/proto/protos/user.proto`，按本项目现有 Login 协议内容生成源格式 `proto.bin`
- 修改：`assets/script/app/define/ProtoDefine.ts`
- 删除：`assets/script/app/define/ProtoSchema.ts`
- 创建：`assets/resources/config/proto/proto.bin`（由工具生成）
- 创建/修改：`dts/IProto.d.ts`（由工具生成）
- 修改：`assets/script/base/net/ProtoCodec.ts`、`ProtoBinLoader.ts`、`ProtoBinParser.ts`

**接口：**
- 消费：本项目 `tools/proto/protos/user.proto` 和现有 Login 协议消息。
- 产出：运行时只依赖 `assets/resources/config/proto/proto.bin`，不再依赖 `ProtoSchema.ts` 或 `proto.json`。

- [ ] **步骤 1：更新依赖与脚本入口**

将 `protobufjs` 版本更新为源仓库的 `^8.4.2`，在 `package.json` 增加 `"export-proto": "node tools/proto/export-proto.js"`，通过 `npm install --package-lock-only` 更新锁文件。

- [ ] **步骤 2：适配导出脚本而不覆盖业务协议**

保留本项目 `user.proto` 的 Login 消息，将源仓库导出器的 `proto.bin`、`ProtoDefine.ts`、`dts/IProto.d.ts` 生成逻辑合入；协议源目录的读取规则必须明确，缺失源文件或多余不支持文件时抛错。

- [ ] **步骤 3：生成并核对运行时产物**

运行：

```powershell
npm run export-proto
```

预期：生成 `assets/resources/config/proto/proto.bin`、更新 `ProtoDefine.ts` 和 `dts/IProto.d.ts`，不生成 `ProtoSchema.ts` 或 `proto.json`。

- [ ] **步骤 4：删除旧反射 JSON 入口**

确认 `rg -n "ProtoSchema|PROTO_SCHEMA_JSON|proto\.json" assets tools dts -g '!导出的资源素材/**'` 只剩无效历史文本后，删除 `ProtoSchema.ts` 及其允许删除的 `.meta`；公共协议运行时统一使用 `ProtoBinLoader`。

- [ ] **步骤 5：验证协议工具**

运行 `npm run export-proto` 两次，第二次应报告产物 unchanged；检查 `git diff --stat`，确认重复生成不会产生非确定性变化。

### 任务 4：项目入口和依赖适配

**文件：**
- 修改：`assets/script/GameApp.ts`
- 修改：`assets/script/app/define/EventDefine.ts`、`ProtoDefine.ts`、`SceneDefine.ts`、`StorageDefine.ts`、`UIDefine.ts`、`UIObjectFactoryDefine.ts`
- 修改：`assets/script/app/data/LoginDB.ts`、`UserDB.ts`
- 修改：`assets/script/app/module/loading/LoadingView.ts`、`netLoading/NetLoadingView.ts`
- 保留：`assets/script/app/repo/RepoFactory.ts`、`assets/script/app/repo/login/LocalServerListRepo.ts`、`LocalUserAccountRepo.ts`
- 修改：`settings/v2/packages/project.json`（若本项目存在该文件）

**接口：**
- 消费：任务 2 的公共底座和任务 3 的 `proto.bin` 管线。
- 产出：本项目 Login/Loading 入口仍能初始化、清理数据和加载公共资源，不引用江湖业务模块。

- [ ] **步骤 1：对齐公共初始化顺序**

按源仓库 `GameApp.ts` 的公共管理器初始化/释放顺序检查本项目入口，只加入本项目已有管理器和协议编解码器；不加入 `CreatCharDB`、`GameMainDB` 或源仓库服务端导入。

- [ ] **步骤 2：修正定义文件的公共接口变化**

逐个编译错误修正 `EventDefine`、`SceneDefine`、`UIDefine` 和 `ProtoDefine` 的类型引用；不得复制源仓库地图、创角 UI 名称或业务枚举。

- [ ] **步骤 3：验证 Login/Loading 直接调用点**

运行：

```powershell
rg -n "CreatChar|GameMain|app/server|XResourcesUrl|ProtoSchema" assets/script/app assets/script/GameApp.ts -g '*.ts'
```

预期：本项目入口无江湖业务或旧协议入口残留；Login/Repo 引用仍指向本项目实现。

### 任务 5：全量验证和差异审查

**文件：**
- 检查：本次所有修改文件、`AGENTS.md`、`Angents/Skills`、`package-lock.json`
- 不修改：`导出的资源素材/`

**接口：**
- 消费：任务 1 至任务 4 的迁移结果。
- 产出：可编译的公共框架、通过规则校验的 Skill、可复现的协议产物和清晰的差异报告。

- [ ] **步骤 1：安装依赖并执行 TypeScript 检查**

运行：

```powershell
npm install
npx tsc --noEmit
```

预期：依赖安装成功；若 Cocos `temp/tsconfig.cocos.json` 不存在，记录真实阻塞，不生成假配置。

- [ ] **步骤 2：执行工具和 Skill 检查**

运行 `npm run export-proto`，对 14 个 Skill 运行 `quick_validate.py`，再检查所有 references 链接目标存在。

- [ ] **步骤 3：检查项目标识和排除内容**

运行：

```powershell
rg -n "cocos_jianghu|D:\\work\\LocalGames\\cocos_jianghu|CreatChar|GameMain|app/server" AGENTS.md Angents/Skills assets/script tools package.json -g '!导出的资源素材/**'
git status --short
git diff --check
```

预期：规则和公共代码无源项目名、源绝对路径或江湖业务引用；用户原有未提交文件仍在。

- [ ] **步骤 4：检查 `.meta` 和最终差异**

运行 `git diff --name-status -- '*.meta'` 与 `git diff --stat`。

预期：没有新增、编辑或重命名 `.meta`；差异只包含本计划范围和用户原有改动。

- [ ] **步骤 5：完成最终报告**

记录编译、协议导出、Skill 校验、旧入口扫描和 `.meta` 检查的真实输出；对无法运行的 Cocos 编辑器或 FGUI MCP 验证明确写出原因。
