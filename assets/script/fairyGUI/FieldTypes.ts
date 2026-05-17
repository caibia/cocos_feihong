
/**
 * 按钮交互模式，决定按钮是否维护选中态以及如何响应点击。
 */
export enum ButtonMode {
    /**
     * 普通按钮模式，不维护选中状态。
     */
    Common,
    /**
     * 勾选按钮模式，点击后可切换选中状态。
     */
    Check,
    /**
     * 单选按钮模式，通常与控制器或分组联动。
     */
    Radio
}
/**
 * 自动尺寸策略，决定内容变化时组件如何调整宽度和高度。
 */
export enum AutoSizeType {
    /**
     * 不自动调整尺寸。
     */
    None,
    /**
     * 同时根据内容调整宽度和高度。
     */
    Both,
    /**
     * 仅根据内容调整高度。
     */
    Height,
    /**
     * 保持外框不变，必要时缩小内容。
     */
    Shrink
}
/**
 * 水平方向对齐方式。
 */
export enum AlignType {
    /**
     * 左对齐。
     */
    Left,
    /**
     * 居中对齐。
     */
    Center,
    /**
     * 右对齐。
     */
    Right
}
/**
 * 垂直方向对齐方式。
 */
export enum VertAlignType {
    /**
     * 顶部对齐。
     */
    Top,
    /**
     * 垂直居中。
     */
    Middle,
    /**
     * 底部对齐。
     */
    Bottom
}
/**
 * Loader 内容缩放与填充策略。
 */
export enum LoaderFillType {
    /**
     * 不缩放，按原始尺寸显示。
     */
    None,
    /**
     * 按比例完整缩放到可视区域内。
     */
    Scale,
    /**
     * 优先匹配高度等比缩放。
     */
    ScaleMatchHeight,
    /**
     * 优先匹配宽度等比缩放。
     */
    ScaleMatchWidth,
    /**
     * 宽高可分别缩放以填满区域。
     */
    ScaleFree,
    /**
     * 按比例放大直至铺满区域，可能裁剪边缘。
     */
    ScaleNoBorder
}
/**
 * 列表布局方式，决定子项在容器中的排列规则。
 */
export enum ListLayoutType {
    /**
     * 单列纵向排列。
     */
    SingleColumn,
    /**
     * 单行横向排列。
     */
    SingleRow,
    /**
     * 水平流式排列。
     */
    FlowHorizontal,
    /**
     * 垂直流式排列。
     */
    FlowVertical,
    /**
     * 分页排列。
     */
    Pagination
}
/**
 * 列表选择模式，决定列表如何处理单选、多选和禁选。
 */
export enum ListSelectionMode {
    /**
     * 单选模式。
     */
    Single,
    /**
     * 多选模式。
     */
    Multiple,
    /**
     * 单击即可切换的多选模式。
     */
    Multiple_SingleClick,
    /**
     * 不允许选中。
     */
    None
}
/**
 * 内容溢出处理方式。
 */
export enum OverflowType {
    /**
     * 超出区域仍然可见。
     */
    Visible,
    /**
     * 超出区域的内容被裁剪隐藏。
     */
    Hidden,
    /**
     * 超出区域时启用滚动容器。
     */
    Scroll
}
/**
 * 包资源项类型，用于区分图片、组件、字体、骨骼等资源。
 */
export enum PackageItemType {
    /**
     * Image 资源项。
     */
    Image,
    /**
     * MovieClip 资源项。
     */
    MovieClip,
    /**
     * Sound 资源项。
     */
    Sound,
    /**
     * Component 资源项。
     */
    Component,
    /**
     * Atlas 资源项。
     */
    Atlas,
    /**
     * Font 资源项。
     */
    Font,
    /**
     * Swf 资源项。
     */
    Swf,
    /**
     * Misc 资源项。
     */
    Misc,
    /**
     * Unknown 资源项。
     */
    Unknown,
    /**
     * Spine 资源项。
     */
    Spine,
    /**
     * DragonBones 资源项。
     */
    DragonBones
}
/**
 * 对象类型枚举，用于工厂创建对应的 GUI 组件实例。
 */
export enum ObjectType {
    /**
     * Image 类型对象。
     */
    Image,
    /**
     * MovieClip 类型对象。
     */
    MovieClip,
    /**
     * Swf 类型对象。
     */
    Swf,
    /**
     * Graph 类型对象。
     */
    Graph,
    /**
     * Loader 类型对象。
     */
    Loader,
    /**
     * Group 类型对象。
     */
    Group,
    /**
     * Text 类型对象。
     */
    Text,
    /**
     * RichText 类型对象。
     */
    RichText,
    /**
     * InputText 类型对象。
     */
    InputText,
    /**
     * Component 类型对象。
     */
    Component,
    /**
     * List 类型对象。
     */
    List,
    /**
     * Label 类型对象。
     */
    Label,
    /**
     * Button 类型对象。
     */
    Button,
    /**
     * ComboBox 类型对象。
     */
    ComboBox,
    /**
     * ProgressBar 类型对象。
     */
    ProgressBar,
    /**
     * Slider 类型对象。
     */
    Slider,
    /**
     * ScrollBar 类型对象。
     */
    ScrollBar,
    /**
     * Tree 类型对象。
     */
    Tree,
    /**
     * Loader3D 类型对象。
     */
    Loader3D
}
/**
 * 进度条标题的显示格式。
 */
export enum ProgressTitleType {
    /**
     * 显示百分比。
     */
    Percent,
    /**
     * 显示当前值和最大值。
     */
    ValueAndMax,
    /**
     * 仅显示当前值。
     */
    Value,
    /**
     * 仅显示最大值。
     */
    Max
}
/**
 * 滚动条显示策略。
 */
export enum ScrollBarDisplayType {
    /**
     * 使用默认显示策略。
     */
    Default,
    /**
     * 始终显示。
     */
    Visible,
    /**
     * 仅在需要滚动时自动显示。
     */
    Auto,
    /**
     * 始终隐藏。
     */
    Hidden
}
/**
 * 滚动方向限制。
 */
export enum ScrollType {
    /**
     * 仅允许水平滚动。
     */
    Horizontal,
    /**
     * 仅允许垂直滚动。
     */
    Vertical,
    /**
     * 同时允许水平和垂直滚动。
     */
    Both
}
/**
 * 图片翻转方式。
 */
export enum FlipType {
    /**
     * 不翻转。
     */
    None,
    /**
     * 水平翻转。
     */
    Horizontal,
    /**
     * 垂直翻转。
     */
    Vertical,
    /**
     * 水平和垂直同时翻转。
     */
    Both
}
/**
 * 子对象渲染顺序策略。
 */
export enum ChildrenRenderOrder {
    /**
     * 按子项顺序正向渲染。
     */
    Ascent,
    /**
     * 按子项顺序倒序渲染。
     */
    Descent,
    /**
     * 按弧形规则动态调整渲染顺序。
     */
    Arch
}
/**
 * 分组布局方式。
 */
export enum GroupLayoutType {
    /**
     * 不自动布局。
     */
    None,
    /**
     * 按水平方向布局。
     */
    Horizontal,
    /**
     * 按垂直方向布局。
     */
    Vertical
}
/**
 * 弹窗展开方向。
 */
export enum PopupDirection {
    /**
     * 根据可用空间自动决定方向。
     */
    Auto,
    /**
     * 优先向上弹出。
     */
    Up,
    /**
     * 优先向下弹出。
     */
    Down
}
/**
 * 对象关联类型，定义两个对象之间的位置与尺寸约束。
 */
export enum RelationType {
    /**
     * 将自身Left对齐或约束到目标Left。
     */
    Left_Left = 0,
    /**
     * 将自身Left对齐或约束到目标Center。
     */
    Left_Center = 1,
    /**
     * 将自身Left对齐或约束到目标Right。
     */
    Left_Right = 2,
    /**
     * 将自身Center对齐或约束到目标Center。
     */
    Center_Center = 3,
    /**
     * 将自身Right对齐或约束到目标Left。
     */
    Right_Left = 4,
    /**
     * 将自身Right对齐或约束到目标Center。
     */
    Right_Center = 5,
    /**
     * 将自身Right对齐或约束到目标Right。
     */
    Right_Right = 6,

    /**
     * 将自身Top对齐或约束到目标Top。
     */
    Top_Top = 7,
    /**
     * 将自身Top对齐或约束到目标Middle。
     */
    Top_Middle = 8,
    /**
     * 将自身Top对齐或约束到目标Bottom。
     */
    Top_Bottom = 9,
    /**
     * 将自身Middle对齐或约束到目标Middle。
     */
    Middle_Middle = 10,
    /**
     * 将自身Bottom对齐或约束到目标Top。
     */
    Bottom_Top = 11,
    /**
     * 将自身Bottom对齐或约束到目标Middle。
     */
    Bottom_Middle = 12,
    /**
     * 将自身Bottom对齐或约束到目标Bottom。
     */
    Bottom_Bottom = 13,

    /**
     * 同步宽度。
     */
    Width = 14,
    /**
     * 同步高度。
     */
    Height = 15,

    /**
     * 将自身Left扩展对齐或约束到目标Left。
     */
    LeftExt_Left = 16,
    /**
     * 将自身Left扩展对齐或约束到目标Right。
     */
    LeftExt_Right = 17,
    /**
     * 将自身Right扩展对齐或约束到目标Left。
     */
    RightExt_Left = 18,
    /**
     * 将自身Right扩展对齐或约束到目标Right。
     */
    RightExt_Right = 19,
    /**
     * 将自身Top扩展对齐或约束到目标Top。
     */
    TopExt_Top = 20,
    /**
     * 将自身Top扩展对齐或约束到目标Bottom。
     */
    TopExt_Bottom = 21,
    /**
     * 将自身Bottom扩展对齐或约束到目标Top。
     */
    BottomExt_Top = 22,
    /**
     * 将自身Bottom扩展对齐或约束到目标Bottom。
     */
    BottomExt_Bottom = 23,

    /**
     * 同时同步宽度和高度。
     */
    Size = 24
}

/**
 * 图片填充方法。
 */
export enum FillMethod {
    /**
     * 不启用填充裁剪。
     */
    None,
    /**
     * 按水平方向填充。
     */
    Horizontal,
    /**
     * 按垂直方向填充。
     */
    Vertical,
    /**
     * 按 90 度径向填充。
     */
    Radial90,
    /**
     * 按 180 度径向填充。
     */
    Radial180,
    /**
     * 按 360 度径向填充。
     */
    Radial360,
}

/**
 * 图片填充起点方向。
 */
export enum FillOrigin {
    /**
     * 从顶部开始填充。
     */
    Top,
    /**
     * 从底部开始填充。
     */
    Bottom,
    /**
     * 从左侧开始填充。
     */
    Left,
    /**
     * 从右侧开始填充。
     */
    Right
}

/**
 * 通用属性编号，用于统一读写对象的核心属性。
 */
export enum ObjectPropID {
    /**
     * 文本属性。
     */
    Text,
    /**
     * 图标属性。
     */
    Icon,
    /**
     * 颜色属性。
     */
    Color,
    /**
     * 描边颜色属性。
     */
    OutlineColor,
    /**
     * 播放状态属性。
     */
    Playing,
    /**
     * 帧索引属性。
     */
    Frame,
    /**
     * 增量时间属性。
     */
    DeltaTime,
    /**
     * 时间缩放属性。
     */
    TimeScale,
    /**
     * 字号属性。
     */
    FontSize,
    /**
     * 选中状态属性。
     */
    Selected
}