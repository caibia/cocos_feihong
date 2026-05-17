## 介绍

该目录为 FairyGUI 工程（`UIProject`），用于管理 UI 包资源与导出代码。

## 目录结构

```text
UIProject
├─ assets
│  ├─ 0Common
│  │  ├─ img          // 图片资源
│  │  ├─ view         // 需要导出脚本代码的界面组件
│  │  ├─ widget       // 需要导出脚本代码的控件组件
│  │  └─ basewidget   // 不需要导出脚本代码的基础控件
│  ├─ Loading
│  ├─ Login
│  └─ NetLoading
├─ plugins            // 导出插件（如 export-ccc3）
└─ settings
```

## 资源包约定

每个资源包建议包含以下内容：

1. 图片资源（`img`）
2. 需要导出脚本的界面组件（`view`）
3. 需要导出脚本的控件组件（`widget`）
4. 不导出脚本的基础控件（`basewidget`）

## 脚本导出说明（可选）

1. 导出的脚本主要包含组件下的子控件引用。
2. 导出代码默认会按模块落到项目脚本目录（通常在 `assets/script/app/module/<模块>/Interfaces/`）。
3. `view` 下的界面脚本建议由业务界面类继承实现，避免直接修改自动生成文件。

## export-ccc3 发布代码机制（分析）

本工程使用 `plugins/export-ccc3` 接管 FairyGUI 默认代码导出流程。

### 1. 触发入口与接管方式

1. 插件入口是 `plugins/export-ccc3/main.js`，由 `plugins/export-ccc3/package.json` 的 `main` 指向。
2. 发布时触发 `onPublish(handler)`。
3. 当 `handler.genCode` 为 `true` 时，插件会先执行 `handler.genCode = false`，关闭 FairyGUI 默认生成，再调用自定义 `genCode(handler)`。
4. 自定义实现位于 `plugins/export-ccc3/GenCode_TS.js`（`GenCode_TS.ts` 是源码版本）。

结论：当前项目真正生效的是 JS 文件，不是 TS 文件。

### 2. 发布配置与输出目录

关键发布配置在 `settings/Publish.json`：

1. 资源发布路径：`path = ../../assets/resources/ui/{publish_file_name}`
2. 代码生成根路径：`codeGeneration.codePath = ../../assets/script/app/module`
3. 类名前缀：`codeGeneration.classNamePrefix = I`
4. 成员名前缀：`codeGeneration.memberNamePrefix = ""`

插件内部代码目录计算优先级：

1. `handler.exportCodePath`（对应 `codePath`）
2. `handler.exportPath`（对应资源发布 `path`）
3. 回退：`<project.basePath>/../../assets/script/app/module`

最终目录规则：

`<代码根路径>/<包名标准化>/Interfaces`

示例：`Login` 包会导出到 `assets/script/app/module/Login/Interfaces/`。

### 3. 组件筛选规则（最关键）

插件只会为 `view`、`widget` 目录下的组件生成接口类：

1. 通过 `classInfo.res.path` 路径分段匹配 `view` 或 `widget`。
2. `basewidget`、`img` 等目录不会生成代码。
3. 路径比较前会统一转小写并把 `\` 变 `/`，兼容 Windows 路径差异。

结论：组件放错目录，是“没有生成 Ixxx 文件”的第一原因。

### 4. 命名与类型处理规则

#### 4.1 类名

1. 会先按 `classNamePrefix` 去前缀（当前是 `I`）。
2. 最终输出类名固定为 `I` + 组件名。
3. 文件名固定为 `I组件名.ts`。

#### 4.2 字段名

1. 优先使用 `memberInfo.name`，没有再用 `memberInfo.varName`。
2. 会去掉 `memberNamePrefix` 和 `m_` 前缀。
3. 字段名以 `n` 开头会被过滤掉（用于排除 `n0/n1` 这类默认命名控件）。

注意：如果你手工命名控件本身就以 `n` 开头，也会被过滤。

#### 4.3 字段类型

1. 会去掉 `fgui.` 前缀，例如 `fgui.GButton -> GButton`。
2. 如果字段类型是“本次也会生成的自定义组件”，类型会改成 `Ixxx` 并自动加本地导入。
3. FairyGUI 内置类型按需导入，路径固定在 `../../../../fairyGUI/*`。
4. 所有 import 会排序，保证生成结果稳定，减少无意义 diff。

### 5. 基类与 onCreate 生成规则

继承基类规则：

1. 组件名以 `btn` 开头 -> `XButton`
2. 组件名以 `View` 结尾 -> `XWindow`
3. 其他 -> `XComponent`

`onCreate` 规则：

1. 所有类都会先 `super.onCreate()`。
2. `view` 目录组件会强制 `this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen`。
3. `XButton`/`XComponent` 直接对 `this` 调 `initComponentByView`、`initControllerByView`。
4. `XWindow` 会执行 `UIPackage.createObject(包名, 组件名).asCom`，挂到 `this.view` 后初始化。

可参考现有生成结果：

1. `assets/script/app/module/GameMain/Interfaces/IGameMainView.ts`
2. `assets/script/app/module/Login/Interfaces/ILoginView.ts`

### 6. 发布日志与自检

发布后控制台会输出：

`[export-ccc3] package=包名, classes=总数, matched=命中数, generated=生成数, out=输出目录`

排查建议：

1. `matched=0`：先检查组件是否在 `view/widget` 目录。
2. `generated` 比预期少：检查控件名是否以 `n` 开头被过滤。
3. 输出目录不对：检查 `settings/Publish.json` 的 `codePath` 与 `path`。
4. 出现 `IIxxx` 命名异常：检查 `classNamePrefix` 与组件命名规范是否一致。

### 7. 维护建议

1. 自动生成文件位于 `assets/script/app/module/*/Interfaces/`，不要直接手改。
2. 业务逻辑写在继承类中（例如 `LoginView.ts`），接口类仅作结构绑定。
3. 如果修改了插件 TS 源码（`GenCode_TS.ts` / `main.ts`），需要同步更新对应 JS 文件（`GenCode_TS.js` / `main.js`），否则发布时不会生效。
