import { Color, Graphics, misc, Vec2 } from "cc";
import { ObjectPropID } from "./FieldTypes";
import { GObject } from "./GObject";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 图形组件，负责绘制矩形、圆角矩形、椭圆及多边形等基础图元。
 */
export class GGraph extends GObject {
    /**
     * 内部底层显示内容。
     */
    public _content: Graphics;

    /**
     * 当前图元类型。
     */
    private _type: number = 0;
    /**
     * 描边线宽。
     */
    private _lineSize: number = 0;
    /**
     * 描边颜色。
     */
    private _lineColor: Color;
    /**
     * 填充颜色。
     */
    private _fillColor: Color;
    /**
     * 圆角半径数组。
     */
    private _cornerRadius?: Array<number>;
    /**
     * 正多边形边数。
     */
    private _sides?: number;
    /**
     * 正多边形起始角度。
     */
    private _startAngle?: number;
    /**
     * 多边形顶点坐标数组。
     */
    private _polygonPoints?: Array<number>;
    /**
     * 多边形各边距离缩放数组。
     */
    private _distances?: Array<number>;
    /**
     * 当前是否已绘制图形内容。
     */
    private _hasContent: boolean;

    /**
     * 初始化图形组件的底层绘制节点与默认图元状态。
     */
    public constructor() {
        super();

        this._node.name = "GGraph";
        this._lineSize = 1;
        this._lineColor = new Color();
        this._fillColor = new Color(255, 255, 255, 255);

        this._content = this._node.addComponent(Graphics);
    }

    /**
     * 绘制矩形或圆角矩形。
     * @param lineSize 描边线宽。
     * @param lineColor 描边颜色。
     * @param fillColor 填充颜色。
     * @param corner 可选圆角半径数组。
     */
    public drawRect(lineSize: number, lineColor: Color, fillColor: Color, corner?: Array<number>): void {
        this._type = 1;
        this._lineSize = lineSize;
        this._lineColor.set(lineColor);
        this._fillColor.set(fillColor);
        this._cornerRadius = corner;
        this.updateGraph();
    }

    /**
     * 绘制椭圆。
     * @param lineSize 描边线宽。
     * @param lineColor 描边颜色。
     * @param fillColor 填充颜色。
     */
    public drawEllipse(lineSize: number, lineColor: Color, fillColor: Color): void {
        this._type = 2;
        this._lineSize = lineSize;
        this._lineColor.set(lineColor);
        this._fillColor.set(fillColor);
        this.updateGraph();
    }

    /**
     * 绘制正多边形。
     * @param lineSize 描边线宽。
     * @param lineColor 描边颜色。
     * @param fillColor 填充颜色。
     * @param sides 多边形边数。
     * @param startAngle 起始角度。
     * @param distances 各边距离缩放数组。
     */
    public drawRegularPolygon(lineSize: number, lineColor: Color, fillColor: Color, sides: number, startAngle?: number, distances?: number[]): void {
        this._type = 4;
        this._lineSize = lineSize;
        this._lineColor.set(lineColor);
        this._fillColor.set(fillColor);
        this._sides = sides;
        this._startAngle = startAngle || 0;
        this._distances = distances;
        this.updateGraph();
    }

    /**
     * 绘制自定义多边形。
     * @param lineSize 描边线宽。
     * @param lineColor 描边颜色。
     * @param fillColor 填充颜色。
     * @param points 顶点坐标数组。
     */
    public drawPolygon(lineSize: number, lineColor: Color, fillColor: Color, points: Array<number>): void {
        this._type = 3;
        this._lineSize = lineSize;
        this._lineColor.set(lineColor);
        this._fillColor.set(fillColor);
        this._polygonPoints = points;
        this.updateGraph();
    }

    /**
     * 获取图形圆角或多边形边长数组。
     */
    public get distances(): number[] {
        return this._distances;
    }

    /**
     * 设置圆角/多边形边长数组，并立即触发图形重绘。
     * @param value 圆角或边长数组。
     */
    public set distances(value: number[]) {
        this._distances = value;
        if (this._type == 3)
            this.updateGraph();
    }

    /**
     * 清理`Graphics`相关状态或缓存。
     */
    public clearGraphics(): void {
        this._type = 0;
        if (this._hasContent) {
            this._content.clear();
            this._hasContent = false;
        }
    }

    /**
     * 获取当前类型。
     */
    public get type(): number {
        return this._type;
    }

    /**
     * 获取当前颜色。
     */
    public get color(): Color {
        return this._fillColor;
    }

    /**
     * 设置颜色，并同步到底层渲染组件。
     * @param value 填充颜色。
     */
    public set color(value: Color) {
        this._fillColor.set(value);
        if (this._type != 0)
            this.updateGraph();
    }

    /**
     * 重新计算并同步`Graph`相关结果。
     */
    private updateGraph(): void {
        let ctx = this._content;
        if (this._hasContent) {
            this._hasContent = false;
            ctx.clear();
        }

        var w: number = this._width;
        var h: number = this._height;
        if (w == 0 || h == 0)
            return;

        var px: number = -this.pivotX * this._width;
        var py: number = this.pivotY * this._height;

        let ls = this._lineSize / 2;
        ctx.lineWidth = this._lineSize;
        ctx.strokeColor = this._lineColor;
        ctx.fillColor = this._fillColor;

        if (this._type == 1) {
            if (this._cornerRadius) {
                ctx.roundRect(px + ls, -h + py + ls, w - this._lineSize, h - this._lineSize, this._cornerRadius[0]);
            }
            else
                ctx.rect(px + ls, -h + py + ls, w - this._lineSize, h - this._lineSize);
        }
        else if (this._type == 2) {
            ctx.ellipse(w / 2 + px, -h / 2 + py, w / 2 - ls, h / 2 - ls);
        }
        else if (this._type == 3) {
            this.drawPath(ctx, this._polygonPoints, px, py);
        }
        else if (this._type == 4) {
            if (!this._polygonPoints)
                this._polygonPoints = [];
            var radius: number = Math.min(w, h) / 2 - ls;
            this._polygonPoints.length = 0;
            var angle: number = misc.degreesToRadians(this._startAngle);
            var deltaAngle: number = 2 * Math.PI / this._sides;
            var dist: number;
            for (var i: number = 0; i < this._sides; i++) {
                if (this._distances) {
                    dist = this._distances[i];
                    if (isNaN(dist))
                        dist = 1;
                }
                else
                    dist = 1;

                var xv: number = radius + radius * dist * Math.cos(angle);
                var yv: number = radius + radius * dist * Math.sin(angle);
                this._polygonPoints.push(xv, yv);

                angle += deltaAngle;
            }

            this.drawPath(ctx, this._polygonPoints, px, py);
        }

        if (ls != 0)
            ctx.stroke();
        if (this._fillColor.a != 0)
            ctx.fill();

        this._hasContent = true;
    }

    /**
     * 根据路径点序列绘制路径图形。
     * @param ctx 底层绘图上下文。
     * @param points 顶点坐标数组。
     * @param px X 方向偏移量。
     * @param py Y 方向偏移量。
     */
    private drawPath(ctx: Graphics, points: number[], px: number, py: number): void {
        var cnt: number = points.length;
        ctx.moveTo(points[0] + px, -points[1] + py);
        for (var i: number = 2; i < cnt; i += 2)
            ctx.lineTo(points[i] + px, -points[i + 1] + py);
        ctx.lineTo(points[0] + px, -points[1] + py);
    }

    /**
     * 在尺寸变化后同步底层节点尺寸、布局和裁剪范围。
     */
    protected handleSizeChanged(): void {
        super.handleSizeChanged();

        if (this._type != 0)
            this.updateGraph();
    }

    /**
     * 在锚点变化后重新同步对象布局与定位结果。
     */
    protected handleAnchorChanged(): void {
        super.handleAnchorChanged();

        if (this._type != 0)
            this.updateGraph();
    }

    /**
     * 按 FairyGUI 属性编号读取当前运行时属性值。
     */
    public getProp(index: number): any {
        if (index == ObjectPropID.Color)
            return this.color;
        else
            return super.getProp(index);
    }

    /**
     * 按 FairyGUI 属性编号写入当前运行时属性值，并触发必要联动。
     */
    public setProp(index: number, value: any): void {
        if (index == ObjectPropID.Color)
            this.color = value;
        else
            super.setProp(index, value);
    }

    /**
     * 执行命中检测，判断当前坐标是否落在可交互区域内。
     */
    protected _hitTest(pt: Vec2): GObject {
        if (pt.x >= 0 && pt.y >= 0 && pt.x < this._width && pt.y < this._height) {
            if (this._type == 3) {
                let points = this._polygonPoints;
                let len: number = points.length / 2;
                let i: number;
                let j: number = len - 1;
                let oddNodes: boolean = false;
                let w: number = this._width;
                let h: number = this._height;

                for (i = 0; i < len; ++i) {
                    let ix: number = points[i * 2];
                    let iy: number = points[i * 2 + 1];
                    let jx: number = points[j * 2];
                    let jy: number = points[j * 2 + 1];
                    if ((iy < pt.y && jy >= pt.y || jy < pt.y && iy >= pt.y) && (ix <= pt.x || jx <= pt.x)) {
                        if (ix + (pt.y - iy) / (jy - iy) * (jx - ix) < pt.x)
                            oddNodes = !oddNodes;
                    }

                    j = i;
                }

                return oddNodes ? this : null;
            }
            else
                return this;
        }
        else
            return null;
    }

    /**
     * 在对象加入父级前，从包数据中读取基础属性和默认状态。
     */
    public setup_beforeAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_beforeAdd(buffer, beginPos);

        buffer.seek(beginPos, 5);

        this._type = buffer.readByte();
        if (this._type != 0) {
            var i: number;
            var cnt: number;

            this._lineSize = buffer.readInt();
            this._lineColor.set(buffer.readColor(true));
            this._fillColor.set(buffer.readColor(true));
            if (buffer.readBool()) {
                this._cornerRadius = new Array<number>(4);
                for (i = 0; i < 4; i++)
                    this._cornerRadius[i] = buffer.readFloat();
            }

            if (this._type == 3) {
                cnt = buffer.readShort();
                this._polygonPoints = [];
                this._polygonPoints.length = cnt;
                for (i = 0; i < cnt; i++)
                    this._polygonPoints[i] = buffer.readFloat();
            }
            else if (this._type == 4) {
                this._sides = buffer.readShort();
                this._startAngle = buffer.readFloat();
                cnt = buffer.readShort();
                if (cnt > 0) {
                    this._distances = [];
                    for (i = 0; i < cnt; i++)
                        this._distances[i] = buffer.readFloat();
                }
            }

            this.updateGraph();
        }
    }
}
