# cocos_feihong 框架同步设计

## 目标

以 `D:\work\LocalGames\cocos_jianghu` 当前工作区为参考，将其中可复用的 Cocos/FairyGUI 公共框架能力、工具约束和 Skill 体系同步到 `cocos_feihong`，并按本项目现有业务边界完成适配。同步不能覆盖本项目已有的未提交改动，也不能把江湖专属业务带入本项目。

## 当前基线

- 两个仓库使用相同的 Cocos `uuid` 和 `3.8.8` 引擎版本，但 Git 历史独立，不能直接使用提交级合并。
- `cocos_feihong` 当前有未提交的 `AGENTS.md`、文字渐变脚本、渐变材质、FGUI 插件、工具和文档；这些改动属于本项目现状，必须保留。
- `cocos_jianghu` 的公共层与本项目存在同路径差异：`assets/script/base` 有 37 个公共脚本变化，`assets/script/fairyGUI` 有 10 个脚本变化；源仓库还新增资源生命周期、协议拆分、截图管理等能力。
- 源仓库同时包含地图、创角、主场景、江湖配置和服务端业务，这些不属于本次同步范围。

## 范围

### 纳入同步

1. `assets/script/base` 中可复用的资源生命周期、场景/UI 生命周期、网络协议底座、调试入口、音频、材质、截图和 FairyGUI 适配改动。
2. `assets/script/fairyGUI` 中通用组件行为修复，包括 `GTextField`、`GObject`、`GLoader`、`GLoader3D`、`UIConfig`、`UBBParser` 等；与本项目文字渐变实现冲突时做合并。
3. 运行公共底座所必需的 `GameApp` 初始化/释放接点、协议工具、`package.json`/`package-lock.json` 和 Cocos 设置；仅同步公共依赖与工具链变化。
4. 源仓库 `AGENTS.md` 的规则体系及全部 `Angents/Skills` 内容，按本项目名称、目录和现有业务约束重写。
5. 源仓库当前全部 Skill 及其 references；本项目原有 `module-model`、`check-doc` 及其 references 从 Skill 体系中移除，不保留旧路由。

### 排除同步

- 江湖地图、创角、角色外观、主场景、NPC、业务服务端和业务配置。
- 江湖专属 FGUI 包、图片、音频、Spine/DragonBones、场景和配置表产物。
- 源仓库的 Excel 工作区产物和与本项目无关的未提交改动。
- 任何 `.meta` 的新增、编辑、重命名；删除脚本时才允许删除其对应旧 `.meta`，新增资源元数据由 Cocos 编辑器生成。

## 方案

采用按子系统择取并适配的当前状态迁移：

1. 先生成源仓库公共层清单，将改动分为公共底座、项目接点、江湖业务三类。
2. 以源仓库公共底座代码为参考，逐文件迁移；涉及本项目未提交文件时先保留本项目功能，再合入源仓库修复。
3. 对文件删除和重命名执行调用点扫描，禁止保留旧命名兼容导出；必要的新脚本不手工补 `.meta`。
4. 对 `AGENTS.md` 和 Skill 做内容迁移而非目录覆盖：统一 `cocos_feihong` 项目标识、路径和规则，保留本项目资源禁读与 Login 业务约束。
5. 每个公共子系统迁移后立即执行对应专项检查，最后执行全量 TypeScript 编译和差异审查。

## 适配边界

- `assets/script/app` 只同步公共定义和底座接点，不同步源仓库的江湖业务模块；本项目现有 Login/Repo/DB 结构作为适配目标。
- 协议相关改动必须符合本项目现有运行时产物和调用链；如果源仓库依赖不存在的 `app/server` 或业务协议，保留本项目入口并只迁移通用编码/加载能力。
- 文案规则必须适配本项目已有的语言方案；不把源仓库用户可见明文直接复制到客户端代码。
- FGUI 结构、XML、bin 和资源包不在本次代码同步范围；若公共脚本引用了源仓库专有包，必须剔除或改为本项目已有包。

## Skill 与 AGENTS 适配

目标 Skill 集合完全采用源仓库的 `code-quality-review`、`code-style`、`config-runtime-pipeline`、`db-data-pattern`、`editor-change-spec`、`fgui-mcp`、`fgui-package-normalize`、`game-runtime-quality`、`language-text`、`local-server-protocol`、`resource-lifecycle`、`runtime-debug-tracing`、`scene-flow-contract`、`scoped-git-upload`；本项目原有 `check-doc`、`module-model` 及其 references 删除。

适配要求：

- 所有描述、引用和路径中的 `cocos_jianghu` 改为 `cocos_feihong`。
- 按实际目录修正 `doc/` 与 `docs/`、工具路径、协议产物路径和 FGUI MCP 配置。
- `AGENTS.md` 只保留本项目能执行的硬边界；源仓库的服务端、地图、江湖模块规则不得伪装成本项目现状。
- 每个 Skill 的 YAML `name`、`description`、目录名和一级引用保持一致，避免重复路由和过期链接。
- Skill 目录不增加 README、安装说明等非必要文档；references 只保留实际被 Skill 引用的内容。

## 验证与验收

1. `git diff` 确认本项目原有未提交改动仍存在，且没有 `导出的资源素材/` 内容被读取或改写。
2. 全局扫描不存在 `cocos_jianghu`、源仓库绝对路径和被排除的江湖业务引用。
3. 运行 `npm install`/锁文件一致性检查，执行 Cocos TypeScript 配置下的 `npx tsc --noEmit`；若缺少 Cocos 临时配置，明确记录阻塞，不伪造通过。
4. 对 `assets/script/base`、`assets/script/fairyGUI`、协议工具和资源管理分别执行最小专项检查，覆盖删除/重命名后的直接调用点。
5. 使用 `skill-creator` 的 `quick_validate.py` 校验每个 Skill 的 frontmatter 和目录命名，检查 references 链接可达。
6. 检查 `.meta` 差异，确认没有新增、编辑或重命名 `.meta`。
7. 最终验收以“公共框架可编译、Login 入口不被破坏、文字渐变保留、江湖业务未混入、规则与 Skill 可触发”为准。

## 非目标

- 不重构本项目 Login 业务，不迁移江湖地图或创角功能。
- 不修改 FGUI 工程文件、资源包和二进制资源。
- 不建立历史兼容别名，不为了通过编译增加兜底数据或空实现。
