import { AssetManager, Color, Font, Layers, resources } from "cc";
import { ScrollBarDisplayType } from "./FieldTypes";

/**
 * 界面全局配置表，集中维护默认字体、滚动条、模态层等参数。
 */
export class UIConfig {
    /**
     * 初始化全局 UI 默认配置值。
     */
    public constructor() {
    }

    //Default font name
    /**
     * 全局默认字体名称。
     */
    public static defaultFont: string = "Arial";

    //Resource using in Window.ShowModalWait for locking the window.
    /**
     * 窗口级模态等待界面资源地址。
     */
    public static windowModalWaiting: string;
    //Resource using in GRoot.ShowModalWait for locking the screen.
    /**
     * 全局模态等待界面资源地址。
     */
    public static globalModalWaiting: string;

    //When a modal window is in front, the background becomes dark.
    /**
     * 模态层覆盖颜色。
     */
    public static modalLayerColor: Color = new Color(0x33, 0x33, 0x33, 0x33);

    //Default button click sound
    /**
     * 按钮点击音效资源地址。
     */
    public static buttonSound: string;
    /**
     * 按钮音效音量缩放倍率。
     */
    public static buttonSoundVolumeScale: number = 1;

    /**
     * 水平滚动条资源地址。
     */
    public static horizontalScrollBar: string;
    /**
     * 垂直滚动条资源地址。
     */
    public static verticalScrollBar: string;

    //Scrolling step in pixels
    /**
     * 默认滚动步长。
     */
    public static defaultScrollStep: number = 25;
    //Deceleration ratio of scrollpane when its in touch dragging.
    /**
     * 默认滚动减速系数。
     */
    public static defaultScrollDecelerationRate: number = 0.967;
    //Default scrollbar display mode. Recommened visible for Desktop and Auto for mobile.
    /**
     * 默认滚动条显示策略。
     */
    public static defaultScrollBarDisplay: number = ScrollBarDisplayType.Visible;
    //Allow dragging the content to scroll. Recommeded true for mobile.
    /**
     * 默认是否允许触摸滚动。
     */
    public static defaultScrollTouchEffect: boolean = true;
    //The "rebound" effect in the scolling container. Recommeded true for mobile.
    /**
     * 默认是否启用回弹效果。
     */
    public static defaultScrollBounceEffect: boolean = true;

    //Resources for PopupMenu.
    /**
     * 默认弹出菜单资源地址。
     */
    public static popupMenu: string;
    //Resources for seperator of PopupMenu.
    /**
     * 弹出菜单分隔项资源地址。
     */
    public static popupMenu_seperator: string;
    //In case of failure of loading content for GLoader, use this sign to indicate an error.
    /**
     * Loader 错误占位资源地址。
     */
    public static loaderErrorSign: string;
    //Resources for tooltips.
    /**
     * 默认提示窗口资源地址。
     */
    public static tooltipsWin: string;

    //Max items displayed in combobox without scrolling.
    /**
     * 下拉框默认可见项数量。
     */
    public static defaultComboBoxVisibleItemCount: number = 10;

    // Pixel offsets of finger to trigger scrolling.
    /**
     * 触摸滚动灵敏度阈值。
     */
    public static touchScrollSensitivity: number = 20;

    //Default Gloader assetsBundle Name.
    /**
     * Loader 默认外部资源包名。
     */
    public static loaderAssetsBundleName:string;

    // Pixel offsets of finger to trigger dragging.
    /**
     * 触摸拖拽触发阈值。
     */
    public static touchDragSensitivity: number = 10;

    // Pixel offsets of mouse pointer to trigger dragging.
    /**
     * 点击拖拽触发阈值。
     */
    public static clickDragSensitivity: number = 2;

    // When click the window, brings to front automatically.
    /**
     * 点击窗口时是否自动前置。
     */
    public static bringWindowToFrontOnClick: boolean = true;

    /**
     * 异步构建 UI 每帧允许占用的时间预算。
     */
    public static frameTimeForAsyncUIConstruction: number = 0.002;

    /**
     * 链接文本是否默认显示下划线。
     */
    public static linkUnderline: boolean = true;

    //Default group name of UI node.<br/>
    /**
     * 默认 UI 节点层级。
     */
    public static defaultUILayer: number = Layers.Enum.UI_2D;
}

let _fontRegistry: { [index: string]: Font } = {};
/**
 * 注册字体到全局字体表；可直接传入 `Font` 实例，也可传入资源路径延迟加载。
 * @param name 字体注册名。
 * @param font `Font` 实例或字体资源路径。
 * @param bundle 可选资源包。
 */
export function registerFont(name: string, font?: Font | string, bundle?: AssetManager.Bundle): void {
    if (font instanceof Font)
        _fontRegistry[name] = font;
    else {
        (bundle || resources).load(font || name, Font, (err: Error | null, asset: Font) => {
            _fontRegistry[name] = asset;
        });
    }
};

/**
 * 按名称从全局字体表中获取已注册字体。
 * @param name 字体注册名。
 * @returns 已注册字体对象。
 */
export function getFontByName(name: string): Font {
    return _fontRegistry[name];
}
