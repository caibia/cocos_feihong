import { Sprite, Color, SpriteFrame } from "cc";
import { Image } from "./display/Image";
import { FlipType, FillMethod, FillOrigin, ObjectPropID } from "./FieldTypes";
import { GObject } from "./GObject";
import { PackageItem } from "./PackageItem";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 静态图片组件，封装 FairyGUI 图片资源的颜色、翻转与填充控制。
 */
export class GImage extends GObject {
    /**
     * 底层图片显示组件。
     */
    public _content: Image;

    /**
     * 初始化底层图片显示组件。
     */
    public constructor() {
        super();

        this._node.name = "GImage";
        this._touchDisabled = true;
        this._content = this._node.addComponent(Image);
        this._content.sizeMode = Sprite.SizeMode.CUSTOM;
        this._content.trim = false;
    }

    /**
     * 获取当前颜色。
     */
    public get color(): Color {
        return this._content.color;
    }

    /**
     * 设置颜色，并同步到底层渲染组件。
     * @param value 图片颜色。
     */
    public set color(value: Color) {
        this._content.color = value;
        this.updateGear(4);
    }

    /**
     * 获取当前图片翻转方式。
     */
    public get flip(): FlipType {
        return this._content.flip;
    }

    /**
     * 设置图片翻转方式，并立即同步到底层 `Image` 组件。
     * @param value 图片翻转方式。
     */
    public set flip(value: FlipType) {
        this._content.flip = value;
    }

    /**
     * 获取当前填充方法。
     */
    public get fillMethod(): FillMethod {
        return this._content.fillMethod;
    }

    /**
     * 设置填充方法，并同步到底层渲染组件。
     * @param value 填充方法。
     */
    public set fillMethod(value: FillMethod) {
        this._content.fillMethod = value;
    }

    /**
     * 获取当前填充起点。
     */
    public get fillOrigin(): FillOrigin {
        return this._content.fillOrigin;
    }

    /**
     * 设置填充起点，并同步到底层渲染组件。
     * @param value 填充起点方向。
     */
    public set fillOrigin(value: FillOrigin) {
        this._content.fillOrigin = value;
    }

    /**
     * 获取当前是否按顺时针方向填充。
     */
    public get fillClockwise(): boolean {
        return this._content.fillClockwise;
    }

    /**
     * 设置填充方向，并同步到底层渲染组件。
     * @param value 是否按顺时针方向填充。
     */
    public set fillClockwise(value: boolean) {
        this._content.fillClockwise = value;
    }

    /**
     * 获取当前填充比例。
     */
    public get fillAmount(): number {
        return this._content.fillAmount;
    }

    /**
     * 设置填充比例，并同步到底层渲染组件。
     * @param value 填充比例。
     */
    public set fillAmount(value: number) {
        this._content.fillAmount = value;
    }

    /**
     * 根据包内资源描述构建底层显示对象、尺寸与初始数据。
     */
    public constructFromResource(): void {
        var contentItem: PackageItem = this.packageItem.getBranch();
        this.sourceWidth = contentItem.width;
        this.sourceHeight = contentItem.height;
        this.initWidth = this.sourceWidth;
        this.initHeight = this.sourceHeight;
        this.setSize(this.sourceWidth, this.sourceHeight);

        contentItem = contentItem.getHighResolution();
        contentItem.load();

        if (contentItem.scale9Grid)
            this._content.type = Sprite.Type.SLICED;
        else if (contentItem.scaleByTile)
            this._content.type = Sprite.Type.TILED;
        this._content.spriteFrame = <SpriteFrame>contentItem.asset;
    }

    /**
     * 在灰度状态变化后同步底层渲染组件效果。
     */
    protected handleGrayedChanged(): void {
        this._content.grayscale = this._grayed;
    }

    /**
     * 按 FairyGUI 属性编号读取当前运行时属性值。
     * @param index FairyGUI 属性编号。
     * @returns 对应属性的当前值。
     */
    public getProp(index: number): any {
        if (index == ObjectPropID.Color)
            return this.color;
        else
            return super.getProp(index);
    }

    /**
     * 按 FairyGUI 属性编号写入当前运行时属性值，并触发必要联动。
     * @param index FairyGUI 属性编号。
     * @param value 要写入的属性值。
     */
    public setProp(index: number, value: any): void {
        if (index == ObjectPropID.Color)
            this.color = value;
        else
            super.setProp(index, value);
    }

    /**
     * 在对象加入父级前，从包数据中读取基础属性和默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_beforeAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_beforeAdd(buffer, beginPos);

        buffer.seek(beginPos, 5);

        if (buffer.readBool())
            this.color = buffer.readColor();
        this._content.flip = buffer.readByte();
        this._content.fillMethod = buffer.readByte();
        if (this._content.fillMethod != 0) {
            this._content.fillOrigin = buffer.readByte();
            this._content.fillClockwise = buffer.readBool();
            this._content.fillAmount = buffer.readFloat();
        }
    }
}
