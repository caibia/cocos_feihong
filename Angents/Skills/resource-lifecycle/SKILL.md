---
name: resource-lifecycle
description: Use when cocos_feihong 涉及资源导入、.dmeo、Cocos import 类型、library 输出、资源路径、XResConst、ResMgr owner 引用、FGUI 包、音频、动态碎图、材质、TMX、Spine、DragonBones、GLoader3D、场景资源取消、常驻资源或释放泄漏风险。
---

# 资源生命周期规则

## 使用时机

- 修改资源路径、资源常量、`XResConst`、资源映射或动态加载入口。
- 从 `.dmeo`、构建脚本或外部目录导入资源，核对 Cocos import 类型、`.meta`、`library` 输出或运行时资源目录。
- 修改 `ResMgr` owner 引用、释放、空闲回收、常驻资源或资源泄漏相关逻辑。
- 修改 FGUI 包加载释放、音频、动态碎图、材质、TMX、Spine、DragonBones、`GLoader3D` 或场景切换资源取消逻辑。
- 排查页面关闭、切场景、异步回调过期、重复打开或低端设备下的资源问题。

## References

- 涉及资源导入、`.dmeo`、Cocos import 类型、`library` 输出、TMX、Spine 或 runtime 资源路径时，读取 [asset-import-pipeline.md](references/asset-import-pipeline.md)。

## 资源入口

1. 资源路径必须统一定义在 `XResConst`，业务脚本禁止直接写 `spine/...`、`audio/...`、`ui://...` 等资源路径。
2. 资源集合按类型使用 `SPINE_MAP`、`AUDIO_MAP`、`PREFAB_MAP`、`TEXTURE_MAP` 这类静态映射名，映射键使用业务语义 `camelCase`。
3. Spine 配置使用 `{ res: string, anim: Record<string, string> }`，音频配置使用字符串路径。
4. 已有明确资源映射键时，不再额外新增单独别名常量；例如直接使用 `XResConst.SPINE_MAP.loginBg`。
5. `XResConst.COM_PACKAGE` 固定为 `"0Common"`。
6. `RES_COMMON_PACKAGEARR` 表示不释放的公共包名列表，公共包不走普通关闭释放路径。
7. 常驻资源必须在 `XResConst.FONT_MAP`、`XResConst.MATERIAL_MAP` 等映射中登记，并由固定 owner 持有引用。

## 导入链路

1. 导入资源前先确认源目录、运行时目录、`.meta` importer/type 和 loader 类型一致。
2. 运行时资源必须落在 `assets/resources` 下，并能通过 `XResConst`、配置表或固定 loader 路径追到。
3. TMX 地图按 `TiledMapAsset` 资源处理，优先保留 `tmxXmlStr` 中的 legacy 对象属性。
4. 资源导入任务如果用户范围只指向 runtime/config，不主动转去检查 FGUI 包。

## owner 与释放

1. 普通 resources 资源统一通过 `ResMgr.loadRes(url, Type, owner)` 加载并持有引用。
2. 业务模块必须声明真实 owner，不直接决定资源销毁时机。
3. 资源不用时通过 `ResMgr.releaseRes(url, Type, owner)`、`ResMgr.releasePackage(path, Type, owner)` 或 `ResMgr.releaseOwner(owner)` 归还引用。
4. 空闲释放由 `ResMgr` 在引用计数归零 60 秒后统一处理。
5. 读完即转内存的数据资源必须读取后立即释放 owner 引用，例如语言表、proto descriptor、配置目录、FGUI 静态文本和热更 manifest。
6. 异步加载回调必须确认请求仍有效；过期回调返回前必须归还已持有的 owner 引用。
7. `dispose` 必须释放当前对象持有的资源 owner，并允许重复调用。

## 音频与动态图片

1. 音频资源由 `ResMgr` 管理生命周期。
2. `AudioMgr` 负责按播放节点 owner 加载和释放引用。
3. `AudioMusic` 负责背景音乐 owner。
4. 播放器组件不得直接 `destroy()` 音频资源。
5. `AudioMusic` 和 `AudioMgr` 的异步音频加载必须保留请求序号。
6. 停止播放、关闭开关或过期回调返回时必须释放 owner 引用，并禁止继续播放已取消资源。
7. 动态碎图统一使用 `GLoader.url` 加载 resources 下的 `SpriteFrame`。
8. 切换 URL、异步过期或 `dispose()` 时必须释放旧 owner 引用。
9. 禁止新增或恢复 `XLoader`、`XLoader.loadTexture` 或其它绕过 `GLoader` 的 Loader 入口。

## FGUI 包与场景

1. FGUI 包通过 `ResMgr.loadFGUIPackage(pkgUrl, owner)` 持有引用。
2. 关闭或销毁时必须用 `unloadFGUIPakcageRef(pkgName, owner)` 归还。
3. 公共包按 `RES_COMMON_PACKAGEARR` 常驻，不在普通页面关闭时释放。
4. `SceneMgr` 场景 FGUI 包异步加载被新场景打断时，必须 `dispose()` 未展示场景并归还已加载包引用。
5. 禁止只丢弃回调或只清空当前场景名，不归还资源引用。

## 材质与骨骼

1. `MaterialMgr` 预加载的材质只作为共享基础材质。
2. 给 UI、Spine、图片等渲染对象设置带参数材质时，必须为渲染对象使用独立材质实例。
3. 禁止直接对共享基础材质 `setProperty()` 导致参数串扰。
4. `SpineMgr` 和 `DragonBonesMgr` 保留独立骨骼贴图卸载、重载和临时贴图逻辑。
5. 不用普通 `ResMgr.releaseRes()` 替代 `unloadTexture()`、`reloadTexture()` 或 `_tmpTexture` 替换。
6. `GLoader3D` 只负责展示已注入的 Spine / DragonBones 资源。
7. 外部骨骼必须由 `SpineUnit` / `DragonBonesUnit` 通过 `SpineMgr` / `DragonBonesMgr` 加载后调用 `setExternalSpine()` / `setExternalDragonBones()` 注入。
8. 禁止用 `GLoader3D.url = "spine/..."` 或 `GLoader3D.url = "dragonBones/..."` 绕过骨骼管理器。
9. Spine / DragonBones 每条资源记录必须保存自身的 `loading`、`ref`、`useCount` 和 `isOnlyClearTexture` 状态。
10. 禁止使用全局 `isOnlyClearTexture` 影响多资源释放。

## 自查清单

1. 新增资源是否有 `XResConst` 映射和真实 owner。
2. 每条加载路径是否有对应 release 或 owner 归还。
3. 页面关闭、切场景、重复打开和异步过期时是否不会继续使用旧资源。
4. FGUI 公共包是否只由常驻列表管理，不输出警告式补丁。
5. 音频、材质、骨骼是否没有绕过专属管理器。
6. 共享材质是否没有被业务对象直接改参数。
7. 导入资源是否核对源目录、runtime 目录、`.meta`/import 类型、`library` 或专项加载证据。
