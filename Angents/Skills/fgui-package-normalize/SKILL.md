---
name: fgui-package-normalize
description: Use when cocos_feihong 需要规范化或适配 FairyGUI 包，处理包清理、改名、全屏化、分组、relation、组件整理或发布前结构核对。
---

# FGUI 包规范化与适配工作流

## 目标

把 FairyGUI 包整理成稳定可维护的 `view/`、`widget/`、`img/` 和脚本边界。正文只保留总流程和硬边界，命名、分组、全屏化、锚点、relation 和核对清单读 reference。

## 使用时机

- 用户要求整理、规范、改名、清理或适配某个 FGUI 包。
- 需要把 view 全屏化、内容居中、分组或补多分辨率适配。
- 需要判断隐形锚点 graph、relation、widget 导出或脚本归属。

不命中：只新增单个组件、只调一个元素属性或只做业务代码绑定；这类按 `fgui-mcp` 和命中的业务 Skill 处理。

## 硬边界

1. 所有 FGUI 页面修改必须走 FGUI MCP；禁止直接编辑 XML、解 bin、改 `.meta` 或用业务代码绕过编辑器配置。
2. 新增、删除、移动、改名、改尺寸、改层级、分组、导出、描边和 relation 都属于 FGUI 修改。
3. MCP 缺能力时，先补 MCP 工具，再修改包结构。
4. 整理包必须覆盖 `view/`、`widget/`、`img/` 和关联脚本；不能只整理 View。
5. `view/` 下会被 `UIMgr.show` 打开的组件必须导出，并有对应 `*View.ts`。
6. `widget/` 下被 View 固定引用、需要处理自身业务、动态创建或注册到 `UIObjectFactoryDefine` 的组件，必须导出并有对应脚本。
7. View 只绑定 widget 根节点并调用 widget 对外方法，不直接操作 widget 内部控件。
8. 文本在复杂背景上不显眼时，优先在 FGUI 文本属性补黑色描边，不用运行时代码补视觉样式。
9. 每次改过 `displayList` 后，必须保存、关闭、重开、读回核对；关键组件再截图或预览。

## 总流程

1. 读包现状：用 FGUI MCP 列资源、读组件结构，先标出 view、widget、img 和脚本影响范围。
2. 整理命名：组件名、子元素名、目录归位和重复占位清理一次规划；改名和迁目录尽量一次操作完成。
3. 对齐脚本：核对导出、脚本类、工厂注册、View/widget 责任分离和业务绑定名称。
4. 整理图片：本包图片归入 `/img/`；外部包引用不跨包乱改。
5. 处理布局：View 负责全屏、分组和必要 relation；widget 默认保持原尺寸，只按业务区块分组，默认不加 relation。
6. 验证交付：保存、关闭、重开、读回；改 relation、控制器、资源或关键 View/widget 时加截图、预览或 validate。

## References（命中时必须读取）

1. `references/package-normalize-workflow.md`
    - 适用：执行包整理、命名归位、view 全屏化、widget 分组、锚点清理、脚本归属、完成核对。
2. `references/relation-sidepair.md`
    - 适用：需要查 sidePair 语义、`RelationType` 枚举值、宽高拉伸和边对齐差异。

## 常见错误

- 只整理 View，漏掉被 View 固定引用的 widget、图片或脚本。
- 直接改 XML，或者 MCP 不可用时用业务代码修位置和尺寸。
- View 脚本跨层绑定 widget 内部控件，导致组件责任不清。
- 建完组后不同时处理必要 relation，等运行时再补位置逻辑。
- 修改 `displayList` 后只保存，不关闭重开读回。
