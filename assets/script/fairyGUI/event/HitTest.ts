import { Vec2 } from "cc";
import { GObject } from "../GObject";
import { ByteBuffer } from "../utils/ByteBuffer";

/**
 * IHitTest 接口，约束当前模块对象的结构与能力边界。
 */
export interface IHitTest {
    /**
     * 执行命中检测。
     * @param pt 待检测的局部坐标。
     * @param globalPt 待检测的全局坐标。
     * @returns 是否命中有效区域。
     */
    hitTest(pt: Vec2, globalPt: Vec2): boolean;
}

/**
 * 像素级命中检测器，依据位图遮罩判断点击是否命中有效区域。
 */
export class PixelHitTest implements IHitTest {
    /**
     * 像素命中检测所依赖的数据对象。
     */
    private _data: PixelHitTestData;

    /**
     * 命中区域的横向偏移量。
     */
    public offsetX: number;
    /**
     * 命中区域的纵向偏移量。
     */
    public offsetY: number;
    /**
     * 命中区域的横向缩放系数。
     */
    public scaleX: number;
    /**
     * 命中区域的纵向缩放系数。
     */
    public scaleY: number;

    /**
     * 初始化像素命中检测器，并记录偏移、缩放和像素数据来源。
     * @param data 像素命中测试所依赖的数据对象。
     * @param offsetX 横向偏移量。
     * @param offsetY 纵向偏移量。
     */
    constructor(data: PixelHitTestData, offsetX?: number, offsetY?: number) {
        this._data = data;
        this.offsetX = offsetX == undefined ? 0 : offsetX;
        this.offsetY = offsetY == undefined ? 0 : offsetY;

        this.scaleX = 1;
        this.scaleY = 1;
    }

    /**
     * 执行命中检测，判断当前坐标是否落在可交互区域内。
     * @param pt 待检测的局部坐标。
     * @returns 是否命中有效像素区域。
     */
    public hitTest(pt: Vec2): boolean {
        let x: number = Math.floor((pt.x / this.scaleX - this.offsetX) * this._data.scale);
        let y: number = Math.floor((pt.y / this.scaleY - this.offsetY) * this._data.scale);
        if (x < 0 || y < 0 || x >= this._data.pixelWidth)
            return false;

        var pos: number = y * this._data.pixelWidth + x;
        var pos2: number = Math.floor(pos / 8);
        var pos3: number = pos % 8;

        if (pos2 >= 0 && pos2 < this._data.pixels.length)
            return ((this._data.pixels[pos2] >> pos3) & 0x1) == 1;
        else
            return false;
    }
}

/**
 * 像素命中数据容器，保存像素测试所需的位图与采样信息。
 */
export class PixelHitTestData {
    /**
     * 位图每行的像素宽度。
     */
    public pixelWidth: number;
    /**
     * 位图导出时使用的缩放比例。
     */
    public scale: number;
    /**
     * 位图命中数据的位集合。
     */
    public pixels: Uint8Array;

    /**
     * 初始化像素命中数据容器，并按导出格式读取位图命中信息。
     * @param ba 序列化后的像素命中数据缓冲区。
     */
    constructor(ba: ByteBuffer) {
        ba.readInt();
        this.pixelWidth = ba.readInt();
        this.scale = 1 / ba.readByte();
        this.pixels = ba.readBuffer().data;
    }
}

/**
 * 子节点命中区域代理，把点击检测转交给指定子对象处理。
 */
export class ChildHitArea implements IHitTest {
    /**
     * 被代理执行命中测试的目标子对象。
     */
    private _child: GObject;

    /**
     * 初始化子节点命中代理，把命中测试转发给指定子对象。
     * @param child 接收命中测试的目标对象。
     */
    constructor(child: GObject) {
        this._child = child;
    }

    /**
     * 执行命中检测，判断当前坐标是否落在可交互区域内。
     * @param pt 待检测的局部坐标。
     * @param globalPt 待检测的全局坐标。
     * @returns 是否命中代理目标。
     */
    public hitTest(pt: Vec2, globalPt: Vec2): boolean {
        return this._child.hitTest(globalPt, false) != null;
    }
}
