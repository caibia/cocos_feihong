# 验证矩阵

质量检查时按本次实际改动类型选择最小验证组合。一个任务命中多类时合并验证；工作区有无关脏文件时，只把本次范围内的验证结论算入交付。具体命令查 [test-catalog.md](test-catalog.md)。

| 改动类型 | 最小验证 | 需要加验的情况 |
| --- | --- | --- |
| 规则、Skill、`AGENTS.md` | `quick_validate.py`；`node tools/test/agents/skill_registry_check.js`；`node tools/test/framework/framework_adaptation_check.js`；UTF-8 读取；`git diff --check` | 新增 Skill 时加前向触发检查；改总入口时检查 Skill 表、description、Markdown 链接和领域细节残留 |
| TypeScript / Cocos 代码 | 专项测试或最小脚本；引用搜索；`npx tsc --noEmit --skipLibCheck --pretty false`；`git diff --check` | 改公共类型、管理器、事件、场景入口时追调用链和反向引用 |
| 新功能、Bug 修复、重构、行为变化 | 最小专项验证；有明确回归价值时先写失败用例；至少有脚本或可复现步骤证明改动点 | 缺少自动测试时补静态检查和手动路径，并明确未覆盖风险 |
| 运行时报错、黑屏、流程卡住 | 先读 `runtime-debug-tracing`；保留错误文本、入口、触发路径、状态流、失败位置和最小复现 | 能写脚本时补失败检查；协议、资源或场景问题合并对应领域验证 |
| 协议运行时 | `npm run export-proto`；`node tools/script/proto/verify_proto_bin.js`；`node tools/test/proto/proto_runtime_init_test.js`；客户端服务端边界搜索 | 改协议映射时核对所有消息类型；改失败路径时验证重试和资源释放 |
| Loading、场景流、网络回包 | 入口、请求、回包、状态 owner 和 UI 刷新调用链；`node tools/test/net/net_loading_tracker_test.js` | 改场景参数时核对 `SceneArgMap` / `UIArgMap`；新增场景准备或业务跳转时补对应专项测试 |
| 事件和计时 | `node tools/test/event/event_unit_click_test.js`；注册、暂停、恢复、移除和销毁路径检查 | 修改长按、双击、定时器或异步回调时补对应专项测试 |
| FGUI 页面和包结构 | MCP 保存、关闭、重开、读回；必要时截图；业务代码只绑定已存在控件 | 改 `displayList`、relation、控制器或资源包时必须读回验证 |
| 配置运行时链路 | 运行时 JSON、`dts/IConfig.d.ts` 和 `ConfigMgr.inst.getConfig()` 引用检查；类型检查 | 新增导出工具或配置行为时补合法、非法和缺失配置样例 |
| 资源生命周期 | `XResConst` 路径、owner 获取和释放、异步过期、页面关闭和切场景检查；`.meta` 不手改 | 新增资源类型或 loader 时补成功、失败、取消和重复释放测试 |
| 文本和多语言 | 明文展示文本搜索；文本 id、重复 id 和参数占位检查 | 新增服务端错误 code 时检查客户端提示映射 |
| 编辑器工具 | `node --check`；字段和类型引用搜索；最小导入导出样例 | 改字段结构、联表选项或导出结构时加合法和非法样例 |
| 文档检查 | 核对引用、术语、前后矛盾和缺失项 | 用户要求正式报告或问题较多时写检查报告 |
| 提交、上传、push | 合并 staged 改动命中的专项验证；核对 status、暂存范围和 `git diff --cached --check` | 脏工作区先证明 staged scope；没有明确全量上传不使用 `git add .` |

## 输出要求

- 已执行的验证写清命令或动作。
- 未执行的验证写清原因，不能用“看起来没问题”替代。
- 如果全工作区验证被无关改动干扰，说明本次范围已验证，另列无关风险。
