# AGENTS.md

## 基本约定

- 对话统一使用中文。
- 所有文本文件统一使用 UTF-8 编码，默认 4 个空格缩进，内容尽量紧凑、易读。
- 读取/解析仓库内 `*.md` 文档时，必须显式使用 UTF-8 编码；若出现乱码，先按 UTF-8 复核，不得直接按系统默认编码读取。

## 编码原则

- 代码注释默认使用中文，除非用户明确要求英文。
- 函数、函数参数、属性需要添加中文注释。
- 不得使用兜底：配置缺失、数据不合法或前置条件不满足时，必须显式暴露问题并按真实约束处理。

## 文档规范

- 涉及修改规则、生成 Markdown 方案、说明等文档内容时，需同步更新 `doc/` 目录下对应的 `.md` 文件，且文件命名尽量使用中文。
- 在回复中引用仓库内文件时，统一使用可直接打开的 Markdown 链接格式，路径相对于仓库根目录：`[AGENTS.md](AGENTS.md)`；需要定位行号时追加 `#L行号`，例如：`[AGENTS.md:1](AGENTS.md#L1)`。

## 任务开始前

1. 阅读本文件。
2. 查看 [Angents/Skills](Angents/Skills) 目录，确认当前任务命中的 Skill 并阅读对应 `SKILL.md`。

## 本地 Skills

| Skill | 命中场景 |
| --- | --- |
| [code-style](Angents/Skills/code-style/SKILL.md) | 代码、脚本、类型声明、命名、重构、配置结构调整 |
| [check-doc](Angents/Skills/check-doc/SKILL.md) | 策划文档、说明文档、需求文档检查 |
| [editor-change-spec](Angents/Skills/editor-change-spec/SKILL.md) | 编辑器相关改动（`tools/edit-*/`、字段结构、联表选项、导入导出、校验逻辑） |
