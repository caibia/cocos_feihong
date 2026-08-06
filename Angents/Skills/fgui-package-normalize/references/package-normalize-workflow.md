# FGUI 包规范化细则

## 1. 资源和命名

1. 先用 FGUI MCP 读取包资源和组件结构，给每个组件标记 `view` / `widget` / `img`。
2. 组件文件名统一从 snake_case、`_01`、拼音或临时名改成 `PascalCase`；view 加 `View` 后缀，widget 加 `Item`、`Com`、`Bar`、`Icon` 等语义后缀。
3. 包根除 `package.xml` 外不放组件文件；全屏视图放 `/view/`，列表项、子面板、图标、进度条等放 `/widget/`，图片放 `/img/`。
4. 改名同时迁目录，尽量一次调用完成；不要先改名留在原目录，再二次迁移。
5. 占位重复文件先确认引用和内容；确属重复时用 FGUI MCP 删除占位，再移动保留真实引用的资源。
6. 图片从公共包扩散出的无意义子目录迁平到 `/img/`；空目录可在文件系统中删除。

## 2. 子元素命名

子元素命名按是否会被代码访问区分：

1. 会被脚本绑定、事件监听、动态修改属性、读取状态或参与业务刷新的元素，必须使用 `camelCase` 和语义前缀。
2. 纯展示、纯装饰、不会被代码访问的元素，不强制语义命名，按 FGUI 默认顺序使用 `n1`、`n2`、`n3` 这类名称。
3. `n1`、`n2` 只能用于不被脚本访问的元素；一旦后续需要代码访问，先通过 FGUI MCP 改成语义名、保存、关闭重开读回，再写业务代码。

需要代码访问的元素使用下列前缀：

| 前缀 | 用途 | 示例 |
| --- | --- | --- |
| `bg` | 背景图 | `bg`、`bgInput`、`bgTitle` |
| `lab` | 文本标签 | `labTitle`、`labRate` |
| `btn` | 按钮或可点击元素 | `btnLogin`、`btnConfirm` |
| `img` | 装饰图、图标 | `imgArrow`、`imgLineLeft` |
| `list` | 列表 | `listServer` |
| `input` | 输入框 | `inputAccount` |
| `loader` | GLoader / GLoader3D | `loaderServerBg` |
| `anchor` | 保留的隐形锚点 | `anchorMid` |

按钮元素即使原类型是文本，只要语义是点击入口，也用 `btn` 前缀。`bg`、`nick`、`lv`、`content` 这类短且清晰的名字可保留。同组件内重名按状态或位置加后缀，例如 `bgFrameAll`、`bgFrameFavorite`、`labAllActive`。

## 3. 导出和脚本归属

1. View 负责流程调度和打开 UI，通过 widget 暴露的方法交互。
2. widget 内控件绑定、交互和状态刷新由自己的脚本处理。
3. 被 View 固定引用并承载业务的 widget 必须有对应脚本，例如 `ExampleView.contentCom` 对应 `ExampleContentCom`。
4. widget 被代码绑定、动态创建或注册到 `UIObjectFactoryDefine` 时，必须在 FGUI 中设置导出，并创建同名脚本类和工厂注册。
5. 组件名、脚本类名、FGUI 导出名和业务绑定名保持一致。

以通用页面为例：

1. `contentCom` 必须生成 `ExampleContentCom` 类，面板内部按钮、输入和状态刷新放在该组件中处理。
2. `toolbarCom` 必须生成 `ExampleToolbarCom` 类，工具栏内部交互和展示逻辑放在该组件中处理。
3. `ExampleView` 只绑定 `contentCom` / `toolbarCom` 根组件并调用它们暴露的方法，不直接操作 widget 内部控件。

## 4. View 全屏化

1. 舞台基准为 `1334 x 750`；所有 view 组件目标尺寸为 `1334 x 750`。
2. 已经是目标尺寸的 View 跳过。
3. 弹窗类小尺寸 View 改成全屏后，按 `shift = (667 - oldW / 2, 375 - oldH / 2)` 整体平移内容到舞台中心。
4. 大背景场景 View 通常把背景改成 `1334 x 750`、中心点放到 `667,375`，并给背景加父级宽高拉伸 relation。
5. widget、item、bar、icon 等组件不改 size，避免破坏父组件引用尺寸。

## 5. 分组和 relation

1. 每个 View 按位置语义分组，例如 `grpContent`、`grpTopRight`、`grpCenterBottom`。
2. widget 也按业务区块分组，例如 `grpRolePreview`、`grpPartTabs`、`grpFaceRow`；默认只组织结构，不加 relation。
3. group 的 `xy` / `size` 必须覆盖子元素视觉外接矩形，计算时考虑 pivot、rotation、scale 和 scale9grid。
4. 需要适配的组必须启用高级模式并设置 relation；不需要适配的组或元素不要加 relation。
5. 全屏背景这类不在组里的元素可以单独设置父级宽高拉伸 relation。
6. View 中常用 sidePair 见 [relation-sidepair.md](relation-sidepair.md)。

## 6. 隐形锚点 graph

1. `Mid_Mid`、`Up_Right`、`Down_Left`、`Down_Mid` 等隐形 graph 只有被 relation 引用时才有保留价值。
2. 清理前先搜索整个包的 `<relation` 和目标引用。
3. 如果全包零引用，删除这些隐形锚点；需要适配时优先直接 `target=""` 关联父组件。

## 7. 验证清单

1. `view/` 与 `widget/` 组件均已命名归位，包根除 `package.xml` 外不放组件。
2. 需要脚本绑定或动态创建的 View/widget 均已导出，并有对应脚本和 `UIObjectFactoryDefine` 注册。
3. View 只通过 widget 对外方法调用，不直接操作 widget 内部控件。
4. View 已按位置语义分组并完成必要 relation；widget 已按业务区块分组但默认不加 relation。
5. 低可读文本已在 FGUI 中补黑色描边。
6. 代码访问元素已语义命名；纯展示元素允许保留 `n1`、`n2`；`n1`、`n2` 被代码访问前已先改语义名并读回。
7. 每个改过 `displayList` 的组件已执行保存、关闭、重开、读回核对。
8. 关键组件已执行 validate，并至少截图核对一个 View 和一个代表性 widget。

## 8. 已知坑

1. 解析或校验工具对刚改名的组件可能有缓存，遇到误报时关闭重开后再读回。
2. FGUI 编辑器热加载有时不彻底，关掉组件标签重开能强制读到最新结构。
3. `fg_validate_component` 和 `fg_editor_status` 只是结构检查，不能替代保存、关闭、重开、读回和截图。
4. group 的外接矩形算错会让 relation 跑偏。
5. 旋转图片修正后，要同步清理组件上的旧 rotation / scale，并交换宽高，避免二次旋转。
