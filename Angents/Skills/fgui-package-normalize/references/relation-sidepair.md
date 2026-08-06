# FGUI Relation sidePair 速查

FGUI 的 `<relation target="" sidePair="..."/>` 用半角逗号分隔多条约束，每条约束的语义见下表。`target=""` 表示关联到父组件（最常用）；`target="<其他元素 id>"` 表示关联到同级别其他元素。

## RelationType 枚举（来自 `assets/script/fairyGUI/FieldTypes.ts`）

| 值 | sidePair 字面值 | 语义 |
| --- | --- | --- |
| 0  | `left-left`      | 自身 Left 对齐目标 Left（默认左贴左：左边距固定） |
| 1  | `left-center`    | 自身 Left 对齐目标 Center |
| 2  | `left-right`     | 自身 Left 对齐目标 Right |
| 3  | `center-center`  | 自身 Center 对齐目标 Center（水平居中） |
| 4  | `right-left`     | 自身 Right 对齐目标 Left |
| 5  | `right-center`   | 自身 Right 对齐目标 Center |
| 6  | `right-right`    | 自身 Right 对齐目标 Right（右贴右：右边距固定） |
| 7  | `top-top`        | 自身 Top 对齐目标 Top（顶贴顶：上边距固定） |
| 8  | `top-middle`     | 自身 Top 对齐目标 Middle |
| 9  | `top-bottom`     | 自身 Top 对齐目标 Bottom |
| 10 | `middle-middle`  | 自身 Middle 对齐目标 Middle（垂直居中） |
| 11 | `bottom-top`     | 自身 Bottom 对齐目标 Top |
| 12 | `bottom-middle`  | 自身 Bottom 对齐目标 Middle |
| 13 | `bottom-bottom`  | 自身 Bottom 对齐目标 Bottom（底贴底：下边距固定） |
| 14 | `width-width`    | 同步宽度（自身 width 跟随目标 width） |
| 15 | `height-height`  | 同步高度（自身 height 跟随目标 height） |

后面 16~ 是 `*Ext_*` 扩展系列（按比例伸缩），日常不常用。

## 一条 sidePair 必须同时给出水平 + 垂直两个维度

水平：`left-left` / `center-center` / `right-right` 这一组（或 `width-width`）
垂直：`top-top` / `middle-middle` / `bottom-bottom` 这一组（或 `height-height`）

`width-width,height-height` 也是合法的——元素的尺寸跟随父级，位置由 xy 决定（通常配合 xy=0,0）。

## 常用组合模板

| 场景 | sidePair |
| --- | --- |
| 居中弹窗、scene 中央内容 | `center-center,middle-middle` |
| 标题贴顶居中（NoticeView 标题） | `center-center,top-top` |
| 底部按钮居中（保持距底距离） | `center-center,bottom-bottom` |
| 右上图标按钮列（StartGameView 顶部那一列） | `right-right,top-top` |
| 左下角按钮列 | `left-left,bottom-bottom` |
| 右下角按钮列 | `right-right,bottom-bottom` |
| 背景全屏拉伸（LoginSceneView 的 bg） | `width-width,height-height` |
| 进度条 fill 跟着父级宽度（widget 内部） | `width-width,height-height` |
| 顶部贴顶左对齐（左上角按钮） | `left-left,top-top` |

## 把 relation 加在哪？

**加在 group**（推荐）：组内子元素的相对位置自动维持，组整体被 relation 驱动。group 必须 `advanced="true"` 否则 relation 不生效（普通 group 只是组织用，不参与 relation 引擎）。

```xml
<group id="g_content" name="grpContent" xy="X,Y" size="W,H" advanced="true">
  <relation target="" sidePair="center-center,middle-middle"/>
</group>
<image id="..." group="g_content" .../>
```

**加在单个元素**（适合不在任何组里的元素，比如全屏 bg）：

```xml
<image id="..." name="bg" xy="667,375" size="1334,750" pivot="0.5,0.5" anchor="true" src="..." fileName="...">
  <relation target="" sidePair="width-width,height-height"/>
</image>
```

注意自闭合元素 `<image .../>` 加 `<relation>` 时要改成开闭标签形式 `<image ...></image>`，把 `<relation>` 放中间。

## 反例 / 注意

1. 给组加 `<relation>` 但忘了 `advanced="true"` → relation 不生效（看起来"分了组但没适配"）。
2. 同时给组和组内元素都加 relation → 两套约束打架，运行时位置错乱。**二选一**。
3. 把 `width-width,height-height` 加在前景按钮上 → 按钮被拉得跟父级一样大。这个 sidePair 只给背景或确实要拉伸的元素用。
4. 把 relation 加在 widget 类组件（item、bar、icon）上 → widget 在列表/容器里跟着父级走，不应该自己加 relation，否则会跟父级行为冲突。
