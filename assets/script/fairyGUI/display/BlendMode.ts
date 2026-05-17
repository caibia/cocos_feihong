import { gfx, Node, UIRenderer } from "cc";

/**
 * 混合模式枚举，定义不同渲染叠加方式。
 */
export enum BlendMode {
    /**
     * 标准透明混合。
     */
    Normal,
    /**
     * 不做透明混合，源与目标都按全量参与。
     */
    None,
    /**
     * 叠加混合，常用于发光效果。
     */
    Add,
    /**
     * 正片叠底混合，结果通常更暗。
     */
    Multiply,
    /**
     * 滤色混合，结果通常更亮。
     */
    Screen,
    /**
     * 擦除混合，用源透明度从目标中扣除内容。
     */
    Erase,
    /**
     * 蒙版混合，用源透明度作为遮罩。
     */
    Mask,
    /**
     * 绘制到目标内容下方。
     */
    Below,
    /**
     * 关闭颜色混合，直接输出源颜色。
     */
    Off,
    /**
     * 自定义混合模式 1。
     */
    Custom1,
    /**
     * 自定义混合模式 2。
     */
    Custom2,
    /**
     * 自定义混合模式 3。
     */
    Custom3
}

/**
 * 混合模式工具，负责把 FairyGUI 混合模式映射到底层渲染材质参数。
 */
export class BlendModeUtils {
    /**
     * 将指定混合模式应用到目标节点及其所有 `UIRenderer` 子组件。
     * @param node 要应用混合模式的目标节点。
     * @param blendMode FairyGUI 定义的混合模式枚举值。
     */
    public static apply(node: Node, blendMode: BlendMode) {
        let f = factors[<number>blendMode];
        let renderers = node.getComponentsInChildren(UIRenderer);
        renderers.forEach(element => {
            (<any>element).srcBlendFactor = f[0];
            (<any>element).dstBlendFactor = f[1];
        });
    }

    /**
     * 用自定义混合因子覆写指定混合模式的默认渲染配置。
     * @param blendMode 要覆写的混合模式。
     * @param srcFactor 源混合因子。
     * @param dstFactor 目标混合因子。
     */
    public static override(blendMode: BlendMode, srcFactor: number, dstFactor: number) {
        factors[<number>blendMode][0] = srcFactor;
        factors[<number>blendMode][1] = dstFactor;
    }
}

/**
 * 混合模式到渲染混合因子的映射表。
 * 数组索引与 `BlendMode` 枚举值一一对应，每项依次表示 `srcBlendFactor` 与 `dstBlendFactor`。
 */
const factors = [
    [gfx.BlendFactor.SRC_ALPHA, gfx.BlendFactor.ONE_MINUS_SRC_ALPHA],
    [gfx.BlendFactor.ONE, gfx.BlendFactor.ONE],
    [gfx.BlendFactor.SRC_ALPHA, gfx.BlendFactor.ONE],
    [gfx.BlendFactor.DST_COLOR, gfx.BlendFactor.ONE_MINUS_SRC_ALPHA],
    [gfx.BlendFactor.ONE, gfx.BlendFactor.ONE_MINUS_SRC_COLOR],
    [gfx.BlendFactor.ZERO, gfx.BlendFactor.ONE_MINUS_SRC_ALPHA],
    [gfx.BlendFactor.ZERO, gfx.BlendFactor.SRC_ALPHA],
    [gfx.BlendFactor.ONE_MINUS_DST_ALPHA, gfx.BlendFactor.DST_ALPHA],
    [gfx.BlendFactor.ONE, gfx.BlendFactor.ZERO],
    [gfx.BlendFactor.SRC_ALPHA, gfx.BlendFactor.ONE_MINUS_SRC_ALPHA],
    [gfx.BlendFactor.SRC_ALPHA, gfx.BlendFactor.ONE_MINUS_SRC_ALPHA],
    [gfx.BlendFactor.SRC_ALPHA, gfx.BlendFactor.ONE_MINUS_SRC_ALPHA],
];
