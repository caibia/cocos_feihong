---
name: editor-change-spec
description: 处理编辑器相关改动。用于修改 `tools/edit-*/`、`tools/editor-*/`、`tools/editor-common/`、编辑器字段结构、联表选项、前端控件、导入导出、校验逻辑等场景，确保 schema、UI、校验、联表、导出与文档保持一致。
---

# 编辑器修改规范技能

## 核心目标

确保编辑器改动“全链路一致”，避免只改局部导致运行错误、保存异常、联表失效、导出结构不一致或文档过期。

---

## 统一编辑器基础规则（必须遵循）

1. 编辑器统一命名：`edit-xxx`。
2. 编辑器统一目录：`tools/edit-xxx/`（历史目录 `tools/editor-*` 按存量工程兼容处理）。
3. 默认读取：`tools/edit-xxx/config/拼音首字母-xxx配置表.xlsx`。
   - 例如：`tools/edit-item/config/D-道具配置表.xlsx`
4. 默认 Sheet：`xxxDB`。
   - 例如：`ItemDB`
5. 默认导出：`xxxDB.json`、`xxxDB.gz`。
6. 默认导出目录：`tools/edit-xxx/output/`。
7. `xlsx` 统一四列结构：
   - 第一列：字段中文含义
   - 第二列：字段类型（仅允许 `number/string/json`）
   - 第三列：字段默认值
   - 第四列：字段值
8. 业务扩展字段允许新增，但不能破坏以上基础规则。

---

## 触发条件

以下任一情况命中本 Skill：

1. 修改 `tools/edit-*/`、`tools/editor-*/` 或 `tools/editor-common/`。
2. 新建编辑器目录、schema、脚本、UI、配置。
3. 新增/删除/改名字段，或调整类型、默认值、控件、联表来源。
4. 调整表单、弹窗、列表、筛选、批量操作、导入导出。
5. 修改 `config/options.json`、静态下拉类型或导出 DB/Enum 逻辑。
6. 修改编辑器方案文档（`doc/edit/*编辑器完整方案.md` 或统一规则文档）。

---

## 执行流程（标准）

### 1) 收集上下文
- 必读对应方案文档（例如 `doc/edit/道具编辑器完整方案.md`）。
- 明确本次目标：修 bug / 扩字段 / 调交互 / 改导出 / 补校验。

### 2) 生成变更清单
- 列出字段变化：新增、删除、改名、类型、默认值、控件、联表。
- 标记影响范围：schema、UI、validator、reference-service、导出、文档。

### 3) 全链路同步修改
- `config/*-schema.json`：字段定义、默认值、控件配置、`optionKey`。
- `config/options.json`：静态下拉与显示文案。
- `editor.js`：渲染、读写映射、筛选、批量、导入导出。
- `scripts/validator.js`：必填、类型、枚举、结构校验。
- `scripts/reference-service.js`：联表选项加载、检索、显示映射。
- `tools-export/enums/*.ts`：Enum 导出、命名、中文注释。
- 文档：同步更新对应方案文档与规则文档。

### 4) 回归验证
- 语法检查、引用检查、最小样例导入导出验证。
- 确认“显示值”和“存储值”符合预期后再交付。

---

## 强制规则（不可降级）

1. `ID` 字段必须自动生成且不可编辑，不保留手填兜底。
2. 关联字段必须“显示值与存储值分离”：界面显示名称，落库存 ID/ID 数组。
3. `json` 字段必须保证最终落库结构合法（对象/数组）并通过解析校验。
4. 删除字段必须清理残留：schema/UI/校验/联表/文档。
5. 图片/图标字段必须“选择器 + 只读展示 + 预览”，禁止手填路径。
6. 图片/图标最终保存值统一为 `resources` 相对路径（不带扩展名）。
7. 跨表“ID+数量”优先结构化（如 `{[id]: num}`），避免长期拆字段。

---

## 导出与声明约束

1. 编辑器必须支持导出 `json`/`gz` 二选一，默认选择 `json`。
2. 若工程使用统一导出目录，可同步导出到 `tools-export/config/XxxDB.json|gz`。
3. 需要导出 `.d.ts` 时，放到 `tools-export/dts/config/` 并提示成功。
4. 若存在可稳定导出的静态选项，必须同步导出 Enum 到 `tools-export/enums/`。
5. Enum 文件命名：`XxxDB -> EXxx.ts`（例：`ItemDB -> EItem.ts`）。
6. Enum 与枚举成员必须带中文注释。
7. 修改静态选项时，必须校验 DB 导出与 Enum 导出使用同一份定义。

---

## UI 与文案约束

1. 弹窗、按钮、提示、日志统一中文。
2. 风格与现有编辑器保持一致，优先复用组件。
3. 多选场景必须包含：已选数量、清空、确认。
4. 关联字段优先选择器，不优先手动输入。

---

## 验证要求

1. 对改动 JS 执行 `node --check`。
2. 使用 `rg` 检查字段遗漏与残留引用。
3. `validator` 至少验证 1 条合法 + 1 条非法样例。
4. 字段改动后，文档字段表/交互说明/校验条目必须一致。
5. 修改静态下拉后，验证 Enum 路径、命名、注释、内容。

---

## 输出规范

1. 先给结果摘要，再给文件级改动点。
2. 文件路径可点击，必要时附行号。
3. 明确“已执行验证 / 未执行验证”。

---

## References（命中时必须读取）

1. `references/editor-change-checklist.md`  
   - 适用：新增编辑器、改字段、改控件、改导出、改方案文档。
2. `references/cross-table-field-design.md`  
   - 适用：跨表字段设计、关联 ID、ID+数量结构取舍。
3. `doc/统一编辑器规则-edit-equip.md`  
   - 适用：确认统一编辑器基础规范（命名、目录、xlsx 四列、默认读写）。
