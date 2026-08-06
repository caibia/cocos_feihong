# 验证命令索引

先按 [verification-matrix.md](verification-matrix.md) 选择改动类型，再从本文件挑具体命令。只运行能覆盖当前改动的组合，不用类型检查替代行为测试。

## Skill 与规则

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 单个 Skill 基础校验 | `python -X utf8 "$env:USERPROFILE/.codex/skills/.system/skill-creator/scripts/quick_validate.py" Angents/Skills/<skill>` | 校验 frontmatter、命名和基本结构 |
| 全部本地 Skill 基础校验 | `Get-ChildItem -Directory Angents/Skills \| ForEach-Object { python -X utf8 "$env:USERPROFILE/.codex/skills/.system/skill-creator/scripts/quick_validate.py" $_.FullName }` | 批量修改 Skill 时运行 |
| Skill 注册检查 | `node tools/test/agents/skill_registry_check.js` | 检查入口、目录、frontmatter、Markdown 链接和删除项残留 |
| 项目适配边界 | `node tools/test/framework/framework_adaptation_check.js` | 检查分辨率、本地模式、视频层级、Skill 业务残留和测试路径 |
| 触发词和冲突搜索 | `rg -n "<关键词>" AGENTS.md Angents/Skills` | 确认入口可命中且旧规则已移除 |

## 协议与网络

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 导出协议 | `npm run export-proto` | 修改 proto 源文件或导出链路时运行 |
| 协议产物 | `node tools/script/proto/verify_proto_bin.js` | 校验 `proto.bin` 和协议映射 |
| 协议初始化 | `node tools/test/proto/proto_runtime_init_test.js` | 修改 `ProtoBinLoader` 或 `ProtoCodec` 时运行 |
| 网络转圈 | `node tools/test/net/net_loading_tracker_test.js` | 修改 `NetLoadingTracker` 或协议级 Loading 时运行 |
| 客户端服务端边界 | `rg -n "assets/script/app/server\|app/server" assets/script --glob "*.ts"` | 客户端改动涉及协议边界时检查 |

## 事件与框架

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 点击事件 | `node tools/test/event/event_unit_click_test.js` | 修改点击节流、点击音效或监听移除时运行 |
| TypeScript | `npx tsc --noEmit --skipLibCheck --pretty false` | 检查类型错误，并单独说明既有业务错误 |
| JS 语法 | `node --check <file.js>` | 修改工具或测试脚本时运行 |
| 字符串与引用 | `rg -n "<类型名/函数名/协议名/资源键>" <scope>` | 查旧入口、失效引用、资源路径和配置值 |

## FGUI 与编辑器

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| FGUI 页面结构 | FGUI MCP 保存、关闭、重开、读回，必要时截图 | 改 relation、displayList、控制器或固定结构时运行 |
| 编辑器 JS 语法 | `node --check tools/edit-*/<file.js>` | 修改编辑器工具脚本时运行 |
| 编辑器字段残留 | `rg -n "<旧字段>\|<新字段>" tools/edit-* tools/config dts assets/script` | 修改字段结构、选项或导入导出时运行 |

## Git 与文本

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 工作区状态 | `git status --short --branch -uall` | 核对分支和脏文件范围 |
| 本次差异 | `git diff --name-status` | 核对实际修改和删除项 |
| 补丁空白 | `git diff --check` | 检查尾随空白和冲突标记 |
| UTF-8 读取 | `Get-Content -Raw -Encoding UTF8 <file> > $null` | 修改 Markdown、JSON 或中文注释时确认编码 |
