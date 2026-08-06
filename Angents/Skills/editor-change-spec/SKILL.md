---
name: editor-change-spec
description: Use when cocos_feihong 需要修改编辑器工具、tools/edit-*、tools/editor-*、tools/editor-common、字段结构、联表选项、前端控件、导入导出或校验逻辑。
---

# 编辑器修改规范技能

## 核心目标

编辑器改动必须证明“字段结构、UI、校验、联表、导入导出、文档和运行时配置”全链路一致，避免只改局部导致保存异常、联表失效或导出结构不一致。

## 使用时机

- 修改 `tools/edit-*/`、历史 `tools/editor-*/` 或 `tools/editor-common/`。
- 新建编辑器目录、schema、脚本、UI、配置或回归脚本。
- 新增、删除、改名字段，或调整类型、默认值、控件、联表来源。
- 调整表单、弹窗、列表、筛选、批量操作、导入导出或校验逻辑。
- 修改 `config/options.json`、静态下拉类型、导出 DB/Enum 逻辑或编辑器方案文档。

影响运行时配置 JSON、`dts/IConfig.d.ts` 或 `ConfigMgr.getConfig()` 时，同时使用 `config-runtime-pipeline`。

## 执行流程

1. 收集上下文：读取对应方案文档和当前编辑器目录，明确本次是修 bug、扩字段、改交互、改导出还是补校验。
2. 读取基础规则：命中目录命名、Excel 结构、默认读写、字段强制规则或导出约束时，先读 `references/editor-baseline.md`。
3. 生成变更清单：列出字段新增、删除、改名、类型、默认值、控件、联表和影响文件。
4. 全链路同步：schema、options、UI、validator、reference-service、导出、Enum、文档和回归脚本一起核对。
5. 回归验证：执行 JS 语法检查、字段残留搜索、最小合法/非法样例、导入导出或运行时配置专项验证。
6. 交付说明：写清文件级改动、已执行验证、未执行验证和剩余风险。

## 不可降级边界

1. `ID`、图片/图标、静态下拉、跨表关联和 `json` 字段按基础规则执行，不保留手填兜底或旧控件兼容。
2. 关联字段必须做到显示值与存储值分离；跨表 ID + 数量优先结构化。
3. 删除字段必须清理 schema、UI、校验、联表、导出、文档和残留引用。
4. 弹窗、按钮、提示和日志统一中文，风格与现有编辑器保持一致。
5. 修改静态选项时，DB 导出与 Enum 导出必须使用同一份定义。
6. 影响运行时配置产物时，必须同步验证运行时 JSON、`IConfig.d.ts` 和业务读取名。

## References（命中时必须读取）

1. `references/editor-baseline.md`
    - 适用：统一编辑器基础规范、字段强制规则、导出声明、UI 与验证底线。
2. `references/editor-change-checklist.md`
    - 适用：新增编辑器、改字段、改控件、改导出、改方案文档时填写检查表。
3. `references/cross-table-field-design.md`
    - 适用：跨表字段设计、关联 ID、ID + 数量结构取舍。

## 常见错误

- 只改 `editor.js`，漏掉 schema、validator、reference-service、options 或文档。
- 字段删改后没有搜索旧字段、旧路径和旧控件残留。
- 只验证合法样例，不验证非法样例和保存失败分支。
- 静态下拉改了 UI，但 Enum 导出仍用旧定义。
- 运行时配置受影响，却没有跑配置导出和读取名检查。
