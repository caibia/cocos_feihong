# 编辑器基础规则

## 统一目录和读写

1. 编辑器统一命名为 `edit-xxx`。
2. 编辑器统一目录为 `tools/edit-xxx/`；历史 `tools/editor-*` 按存量工程兼容处理。
3. 默认读取 `tools/edit-xxx/config/拼音首字母-xxx配置表.xlsx`，例如 `tools/edit-item/config/D-道具配置表.xlsx`。
4. 默认 Sheet 为 `xxxDB`，例如 `ItemDB`。
5. 默认导出 `xxxDB.json`、`xxxDB.gz`。
6. 默认导出目录为 `tools/edit-xxx/output/`。
7. `xlsx` 使用四列结构：字段中文含义、字段类型、字段默认值、字段值；字段类型仅允许 `number`、`string`、`json`。
8. 业务扩展字段允许新增，但不能破坏以上基础规则。

## 字段强制规则

1. `ID` 字段必须自动生成且不可编辑，不保留手填兜底。
2. 关联字段必须显示值与存储值分离：界面显示名称，落库存 ID 或 ID 数组。
3. `json` 字段必须保证最终落库结构合法，并通过解析校验。
4. 删除字段必须清理 schema、UI、校验、联表、导出和文档残留。
5. 图片/图标字段必须使用选择器、只读展示和预览，禁止手填路径。
6. 图片/图标最终保存值统一为 `resources` 相对路径，不带扩展名。
7. 跨表 ID + 数量优先结构化，例如 `{ [id]: num }` 或对象数组，避免长期拆字段。

## 全链路同步点

| 层级 | 必查内容 |
| --- | --- |
| schema | 字段定义、默认值、控件配置、`optionKey` |
| options | 静态下拉、类型定义、显示文案 |
| UI | 渲染、读写映射、筛选、批量、导入导出 |
| validator | 必填、类型、枚举、结构校验 |
| reference-service | 联表选项加载、检索、显示映射 |
| enums | Enum 导出、命名、中文注释 |
| docs | 字段表、交互说明、校验条目 |

## 导出与声明

1. 编辑器必须支持导出 `json` / `gz` 二选一，默认选择 `json`。
2. 若工程使用统一导出目录，可同步导出到 `tools-export/config/XxxDB.json|gz`。
3. 需要导出 `.d.ts` 时，放到 `tools-export/dts/config/` 并提示成功。
4. 若存在可稳定导出的静态选项，必须同步导出 Enum 到 `tools-export/enums/`。
5. Enum 文件命名为 `XxxDB -> EXxx.ts`，例如 `ItemDB -> EItem.ts`。
6. Enum 与枚举成员必须带中文注释。
7. 修改静态选项时，必须校验 DB 导出与 Enum 导出使用同一份定义。
8. 影响运行时配置时，必须验证 `assets/resources/config/json/*.json`、`dts/IConfig.d.ts` 和业务 `ConfigMgr.getConfig()` 读取名。

## UI 和验证

1. 弹窗、按钮、提示、日志统一中文。
2. 风格与现有编辑器保持一致，优先复用组件。
3. 多选场景必须包含已选数量、清空、确认。
4. 关联字段优先选择器，不优先手动输入。
5. 改动 JS 执行 `node --check`。
6. 字段改动后用 `rg` 检查遗漏与残留引用。
7. validator 至少验证 1 条合法样例和 1 条非法样例。
8. 修改运行时配置链路后，按 `config-runtime-pipeline` 跑导出脚本和命中的专项配置测试。
