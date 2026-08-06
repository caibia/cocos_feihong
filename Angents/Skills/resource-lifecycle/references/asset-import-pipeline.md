# 资源导入流水线

资源导入任务必须先证明源目录、导入类型、运行时路径和加载入口一致，再改代码或资源常量。不要只因为文件存在就假设 Cocos 运行时能按预期加载。

## 源目录和运行时目录

1. 外部源目录必须由当前任务或仓库内真实构建脚本确定，不沿用其它项目的固定目录。
2. 运行时动态资源必须位于 `assets/resources` 下，并通过 `XResConst`、配置或明确 loader 引用。
3. FGUI 包内资源由 FGUI 工程和包加载流程管理，不复制成 resources 动态资源。
4. 用户只要求处理 runtime/config 时，不主动扩大到 FGUI 包或其它资源源目录。

## `.meta` 与导入类型

1. `.meta` 文件由用户或编辑器生成，Codex 不新增、不重命名、不手动编辑。
2. 删除资源、脚本或目录时，才允许同步删除对应 `.meta`。
3. 涉及 Cocos 资源类型时，先检查已有 `.meta` 的 importer/type，再按需检查 `library` 输出或运行时加载结果。
4. 不确定导入类型前，不设计 loader、配置字段或兼容入口。

## 运行时类型

| 资源 | 运行时类型 | 入口 |
| --- | --- | --- |
| 音频 | `AudioClip` | `AudioMgr` / `AudioMusic` |
| 字体 | `Font` | `registerFont` / `ResMgr` |
| 图片 | `SpriteFrame` | `GLoader` / `ResMgr` |
| protobuf 描述 | `BufferAsset` | `ProtoBinLoader` |
| FGUI 包 | 包描述与依赖资源 | `ResMgr.loadFGUIPackage()` |

新增 TMX、Spine、DragonBones 或其它资源类型时，先确认引擎 importer、运行时类型和项目管理器，再建立 `XResConst` 映射与专项测试。

## owner 与失败路径

1. `ResMgr.loadRes(url, Type, owner)` 的 `url`、`Type` 和 owner 必须明确。
2. 加载成功后由真实持有者释放；读完即转内存的数据在 `finally` 中释放。
3. 加载失败、解析失败、异步过期和对象销毁都必须归还已经登记的 owner。
4. 不直接 `destroy()` 由 `ResMgr` 管理的资源，也不新增绕过专属管理器的 loader。

## 路径证据

资源改动至少留下以下证据中的可执行组合：

- `XResConst` 映射或配置引用能指向真实 `assets/resources` 文件。
- 已有 `.meta` importer/type 与运行时 loader 类型一致。
- `library` 输出或专项脚本能证明 Cocos 导入结果。
- 成功、失败、取消和释放路径有专项测试或明确的编辑器运行证据。
