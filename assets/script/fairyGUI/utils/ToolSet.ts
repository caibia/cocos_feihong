import { Color } from "cc";

/**
 * 通用工具集合，提供若干字符串、几何与资源处理辅助逻辑。
 */
export class ToolSet{

    /**
     * 把输入颜色转换为灰化后的等效颜色。
     * @param c 原始颜色对象。
     * @returns 灰化后的颜色对象。
     */
    public static toGrayedColor(c: Color): Color {
        let v = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
        return new Color(v, v, v, c.a);
    }
}
