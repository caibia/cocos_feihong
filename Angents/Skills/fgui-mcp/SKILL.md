---
name: fgui-mcp
description: Use when cocos_feihong 需要通过 FairyGUI MCP 操作编辑器、修改组件、控制器、资源、页面、预览截图、发布核对、处理业务代码绑定边界，或判断 FGUI 操作边界。
---

# FGUI MCP

## 目标
- 统一 FGUI 页面修改流程。
- 只做可验证的编辑器操作，不做猜测和兜底。
- 让改界面、切状态、查问题、截图核对走同一套路径。

## 触发场景
- 修改 `FGUIProject/UIProject/assets/` 下任意 UI 包。
- 新增、修改、删除控制器、组件子元素、资源、动画。
- 打开组件、切换控制器页、预览、截图、发布。
- 需要判断能不能直接改 XML，或需要先看哪些边界。

## 当前能力
- 资源：`fg_import_resource`、`fg_create_resource`、`fg_update_resource`、`fg_move_resource`、`fg_delete_resource`
- 组件：`fg_read_component`、`fg_parse_component`、`fg_validate_component`、`fg_adjust_component`、`fg_add_component_element`、`fg_delete_component_element`、`fg_move_component_element`
- 控制器：`fg_add_controller`、`fg_update_controller`、`fg_delete_controller`、`fg_editor_list_controllers`、`fg_editor_switch_controller`
- 编辑器：`fg_editor_status`、`fg_editor_activate`、`fg_editor_reload`、`fg_editor_open_component`、`fg_editor_save`、`fg_editor_close`、`fg_editor_select_element`
- 预览与截图：`fg_editor_preview`、`fg_editor_start_test`、`fg_editor_capture_preview`、`fg_editor_stop_test`、`fg_editor_screenshot`
- 发布：`fg_editor_publish_package`、`fg_editor_publish_all`

## 组件链路
1. 导入或创建资源。
2. 在编辑器对象模型里修改组件。
3. 通过编辑器保存并刷新包。
4. 需要时再读取、解析、校验结果。

## 使用顺序
1. 先确认编辑器已运行，插件已加载。
2. 先读结构，再改内容。
3. 只用明确名称或 ID 定位目标，不做模糊猜测。
4. 改完保存，再刷新、预览或截图核对。
5. 发现前置条件不满足时，直接报错，不静默绕过。
6. 发现 MCP 缺少必要编辑能力时，先补 MCP 工具，再通过工具完成编辑器修改。
7. 修改 `displayList` 的新增、删除、移动、层级后，必须保存、关闭组件、重新打开组件，再读回结构核对。

## 硬边界
- 不直接编辑 FGUI XML、`package.xml`、`.bin`、`.meta`。
- 不用运行时代码绕过编辑器配置；位置、尺寸、pivot、touchable、relation、gear、分组和控制器布局应在 FGUI 中维护。
- 任何新增、删除、移动、改名、改位置、改尺寸、改层级的 FGUI 控件，必须先调用 `fg_editor_status` 确认 MCP 可用。
- 若 MCP 配置存在但当前工具列表没有 `fg_*` 工具，视为 MCP 不可用；不得改 XML，不得解 bin，不得用业务代码绕过，必须停下让用户修复工具暴露问题。
- 适合在 FGUI 编辑器中摆放和维护的固定控件，必须通过 FGUI MCP 加到编辑器中，业务代码只能绑定这些已存在控件，并播放资源、切动画、同步业务状态。
- 运行时临时对象、拖拽代理、一次性特效、动态列表项等不属于固定页面结构的对象，可以按业务需要用代码创建。
- 不把“读取结构”当成“已修改成功”，保存和刷新要单独确认。
- 不猜测补全元素名、控制器名、页面名。
- 不自动创建缺失对象，不自动兜底。
- 不跨包乱改外部资源路径或外部包引用。
- `fg_editor_select_element` 只保证选中状态，不保证右侧检查器自动同步。
- `fg_editor_switch_controller` 的 `page_index` 从 `0` 开始，`page_name` 只做明确映射。
- `fg_add_component_element` 默认追加到顶层 `displayList`；若关心层级，必须显式传 `position: { mode: "before"|"after"|"index", ... }`，不得使用 `{ after: "xxx" }` 这类非工具协议格式。
- 新增控件但暂时不知道实际尺寸时，默认设置 `size="50,50"`，避免编辑器里控件过小导致难以选中或手动调整。
- `fg_delete_component_element`、`fg_move_component_element` 只按 `name` 或 `id` 精确匹配。
- MCP 修改后编辑器左侧显示列表可能缓存旧状态；必须以关闭重开后的 `fg_read_component` 结果作为结构依据。
- 编辑器未运行、插件未加载、路径不对时，命令会超时，不做自动绕过。
- 删除资源、删除控制器、批量移动前，先确认引用和影响范围。

## MCP 工具实现与验证
- 修改 MCP 插件源码不是 live 验证；FairyGUI Editor 可能继续运行旧插件代码，必须 reload 或重启后再重新执行对应 `fg_*` 命令核对。
- 修复或扩展 `MCPBridge` 时，不直接改 `content.children`、`parent.children` 等内部列表；删除、移动和调层级必须走 `RemoveChild`、`RemoveChildAt` 或编辑器对象 API。
- 如果对象 API 无法移除或移动目标，直接暴露失败原因，不用内部列表手术伪造成功状态。

## 业务绑定边界
- FairyGUI 不再生成绑定文件，业务类直接创建并绑定编辑器中已存在的控件。
- UI 创建和扩展注册直接使用真实包名、组件名和组件 URL，不再封装二次映射。
- `getFairyPackageArr()` 直接返回真实包名字符串数组，例如 `return ["Login"];`，不通过中间变量或包名映射。
- 禁止新增 `FGUI_COMPONENT_MAP`、`FGUI_URL_MAP` 这类只转发固定值的结构。
- 脚本中的组件属性名、控制器属性名必须和 FGUI 中的名称完全一致，通过 `initComponentByView`、`initControllerByView` 绑定，禁止手写别名映射。
- 通过 `initComponentByView`、`initControllerByView` 绑定的同名控件和控制器是页面结构契约，业务代码直接使用，不额外写存在性判断。
- 可选对象、动态创建对象、外部接口返回值、异步数据和运行时状态仍需显式校验。

## 最短流程
### 改组件
1. `fg_editor_open_component`
2. `fg_read_component` 或 `fg_parse_component`
3. `fg_adjust_component`、`fg_add_component_element`、`fg_delete_component_element`、`fg_move_component_element`
4. `fg_editor_save`
5. 若改了 `displayList`，执行 `fg_editor_close` 后重新 `fg_editor_open_component`
6. `fg_read_component` 核对显示列表顺序
7. `fg_editor_reload`
8. `fg_editor_screenshot` 或 `fg_editor_preview`

### 改控制器
1. `fg_editor_open_component`
2. `fg_editor_list_controllers`
3. `fg_add_controller`、`fg_update_controller` 或 `fg_delete_controller`
4. `fg_editor_switch_controller`
5. `fg_editor_save`
6. `fg_editor_screenshot`

### 改资源
1. `fg_import_resource`、`fg_create_resource`、`fg_update_resource`、`fg_move_resource` 或 `fg_delete_resource`
2. `fg_editor_reload`
3. `fg_editor_open_component`
4. 核对引用和显示结果

## 常用约束
- 控制器命名、页面名、元素命名保持语义明确。
- 多页、多选、批量改动，先确认目标清单，再执行。
- 需要状态切换时，至少检查一个正常态和一个异常态。
- 发布前先刷新，再发布。
- 修改后至少保存一次，并用截图或预览核对结果。

## 一句话规则
- 能读先读，能精确就不猜，能一次做完就不分几轮，改完必须保存并核对。
