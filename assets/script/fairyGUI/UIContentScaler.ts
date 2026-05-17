import { Size, screen, view } from "cc";

/**
 * 内容缩放工具，负责根据屏幕尺寸和策略计算 UI 适配结果。
 */
export class UIContentScaler {
    /**
     * 当前内容缩放系数。
     */
    public static scaleFactor: number = 1;
    /**
     * 当前资源缩放等级。
     */
    public static scaleLevel: number = 0;
    /**
     * 根节点可用尺寸缓存。
     */
    public static rootSize: Size = new Size();
}

/**
 * 根据当前屏幕尺寸和视图缩放结果更新 FairyGUI 的根尺寸与缩放等级。
 */
export function updateScaler(): void {
    let size = screen.windowSize;
    size.width /= view.getScaleX();
    size.height /= view.getScaleY();
    UIContentScaler.rootSize.set(size);

    var ss: number = Math.max(view.getScaleX(), view.getScaleY());
    UIContentScaler.scaleFactor = ss;
    if (ss >= 3.5)
        UIContentScaler.scaleLevel = 3; //x4
    else if (ss >= 2.5)
        UIContentScaler.scaleLevel = 2; //x3
    else if (ss >= 1.5)
        UIContentScaler.scaleLevel = 1; //x2
    else
        UIContentScaler.scaleLevel = 0;
}
