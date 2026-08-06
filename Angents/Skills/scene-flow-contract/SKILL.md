---
name: scene-flow-contract
description: Use when cocos_feihong 涉及场景跳转、SceneMgr.show、SceneDefine、SceneArgMap、UIArgMap、LoadingView、NetLoading、协议回包后跳转、切场景后的异步回调或场景参数类型。
---

# 场景流程合同

## 目标

场景流必须明确入口、状态、协议、Loading、目标界面和场景参数的归属。不要用 `any`、临时包装函数、页面互相等待或协议回包兜底把流程跑通。

## 合同源

1. 场景名和场景参数以 `assets/script/app/define/SceneDefine.ts` 为准。
2. `SceneArgMap` 必须为每个 `SceneName` 显式声明具体参数或 `undefined`，禁止字符串索引和 `any` 兜底。
3. UI 参数以 `assets/script/app/define/UIDefine.ts` 的 `UIArgMap` 为准。
4. 纯数据类型放到 `dts/`，配置形状复用 `IConfig.XxxDB`。
5. `SceneMgr.inst.show(name, arg)` 的 `arg` 必须能被 `SceneArgMap[name]` 校验。

## 归属规则

1. `View` 负责界面输入、显示状态、打开 UI、跳场景和接收 DB 观察者回调。
2. `DB` 负责协议发送、协议返回校验、模块状态和 post 观察者；除已有明确合同外，不直接切场景。
3. `LoadingView` 负责页面级加载目标、最短展示时长、目标资源预加载和加载完成后的目标 UI 打开。
4. 网络转圈归协议请求本身：`NetworkUnit.send(proto, msg, true)` 只表示该协议需要 `NetLoading`。
5. `NetLoading` 的显示和关闭归 `NetWorkMgr` 与 `NetLoadingTracker`，必须按 `C2S_` / `S2C_` 匹配和 pending 计数关闭，不由调用方拿实例控制。
6. 页面级 Loading、协议级 NetLoading、场景资源加载是三件事，禁止互相替代。
7. 所有 UI 页面和编辑器摆放的子组件，固定控件绑定、事件绑定和观察绑定只放在创建路径；重复打开、缓存恢复和业务变化只刷新状态。
8. 目标场景需要异步准备时统一实现 `prepare(arg)`；`SceneMgr.show()` 必须等待准备成功后再销毁 Loading 和旧场景，准备失败时保留当前界面并释放目标场景资源。

## UI 与子组件

1. 父 `View` 只管理页面级控制器、背景、页面动画、页面切换和子组件刷新入口；子组件内部按钮、输入框、文本、点击事件和局部观察者归子组件自己。
2. 子组件不通过 `UIMgr.inst.getUI(父界面)` 反向控制父界面；需要选择结果这类本地回调时，由打开方传明确回调刷新自身。
3. 父界面不向子组件注入单点按钮回调；按钮业务归持有按钮的组件。
4. 不为单点动作新增包装函数、状态字段或二次封装数据；只转调、只赋值或只被一个地方调用的函数直接内联或归真实 owner。
5. `onRefresh()` 是 UI 状态刷新入口；`onCreate()` 只做一次性创建、固定绑定和注册。
6. `getFairyPackageArr()` 只声明当前 UI 自身创建必需的 FGUI 包；后续目标资源由目标 UI 或 Loading 流程声明和预加载。

## UI 缓存生命周期

1. `UI_ONHIDE` 和 `UI_ONDESTROY` 必须分离；缓存隐藏只触发 `UI_ONHIDE`，真实销毁或缓存过期释放才触发 `UI_ONDESTROY`。
2. `UIMgr.show()` 复用缓存实例时，应回到和新建成功一致的完成路径，再执行页面刷新。
3. 缓存实例恢复必须回到 `onRefresh()` 路径，不新增单独的业务恢复钩子。
4. 业务 UI 的 `onRefresh()` 必须恢复该页面的默认入口状态，避免缓存实例重新打开时停留在旧的子状态。
5. 全屏页面切换的进场、离场顺序归 `UIMgr.show()` / `UIMgr.replace()`；业务 UI 不为等待动画新增包装、等待接口或页面互相编排。
6. 全屏遮挡和缓存隐藏由 `UIMgr.checkFullScreen()` 找到真实顶层全屏 UI，只限制动画播放条件。
7. `UIMgr` 只对 `layerIndex === LAYER_CONST.WINDOW` 的 UI 播放页面进场和离场动画；Loading、NetLoading、Top、Guide 等非页面层只处理遮挡、缓存和显示状态。

## 修改流程

1. 新增场景：补 `SceneName`、`SceneArgMap`、`SceneDefine.ALL_SCENE` 和专项检查；需要异步资源准备时按参数合同实现 `prepare(arg)`。
2. 新增 UI 参数：补 `UIArgMap`，调用 `UIMgr.show()` 或 `UIMgr.replace()` 时传入同一合同类型。
3. 改业务跳转链路：先追 `View -> DB -> 协议 -> DB post -> View -> Loading/SceneMgr`，确认每段 owner 唯一。
4. 改协议回包后跳转：确认失败 code、空数据、重复点击、页面关闭和切场景后回包都不会继续操作过期 UI。
5. 改 Loading 或场景准备：先区分协议转圈、页面加载和场景加载；等待和失败释放统一由持有目标资源的层管理。

## 验证要求

| 场景 | 必跑或必查 |
| --- | --- |
| 网络转圈归属 | `node tools/test/net/net_loading_tracker_test.js` |
| 公共框架项目边界 | `node tools/test/framework/framework_adaptation_check.js` |
| 场景或 UI 参数类型 | `npx tsc --noEmit --skipLibCheck --pretty false`，并核对 `SceneArgMap` / `UIArgMap` |
| 场景异步准备 | 为 `prepare()` 的成功、失败、销毁和过期回调补专项测试 |
| UI 缓存生命周期 | 为新建、缓存恢复、隐藏和销毁路径补专项测试 |

## 常见错误

- 在 `SceneArgMap` 或 `UIArgMap` 里用 `any` 先跑通。
- `DB` 在没有明确合同的情况下直接切场景。
- 页面拿 `LoadingView` 实例等待完成，导致页面互相编排。
- 把协议转圈和页面级 Loading 混成一个流程。
- 协议回包晚到时继续刷新已经关闭的 UI 或已切走的场景。
- 父界面绑定子组件内部控件，或子组件反向获取父界面刷新。
- 把后续目标 UI 的 FGUI 包写进当前 UI 的 `getFairyPackageArr()`。
- 在 `onRefresh()` 中启动无法由 `SceneMgr.show()` 等待的场景准备任务。
