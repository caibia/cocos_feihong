import { Sprite, Color } from "cc";
import { MovieClip } from "./display/MovieClip";
import { ObjectPropID } from "./FieldTypes";
import { GObject } from "./GObject";
import { PackageItem } from "./PackageItem";
import { ByteBuffer } from "./utils/ByteBuffer";


/**
 * 帧动画组件，封装 FairyGUI MovieClip 的播放控制与资源构建流程。
 */
export class GMovieClip extends GObject {
    /**
     * 底层帧动画显示组件。
     */
    public _content: MovieClip;

    /**
     * 初始化帧动画显示组件与默认播放配置。
     */
    public constructor() {
        super();

        this._node.name = "GMovieClip";
        this._touchDisabled = true;

        this._content = this._node.addComponent(MovieClip);
        this._content.sizeMode = Sprite.SizeMode.CUSTOM;
        this._content.trim = false;
        this._content.setPlaySettings();
    }

    /**
     * 获取当前颜色。
     */
    public get color(): Color {
        return this._content.color;
    }

    /**
     * 设置颜色，并同步到底层渲染组件。
     * @param value 动画颜色。
     */
    public set color(value: Color) {
        this._content.color = value;
        this.updateGear(4);
    }

    /**
     * 获取当前播放状态。
     */
    public get playing(): boolean {
        return this._content.playing;
    }

    /**
     * 设置播放状态，并同步到底层动画组件。
     * @param value 是否播放。
     */
    public set playing(value: boolean) {
        if (this._content.playing != value) {
            this._content.playing = value;
            this.updateGear(5);
        }
    }

    /**
     * 获取当前帧索引。
     */
    public get frame(): number {
        return this._content.frame;
    }

    /**
     * 设置当前帧索引，并同步到底层动画或显示对象。
     * @param value 目标帧索引。
     */
    public set frame(value: number) {
        if (this._content.frame != value) {
            this._content.frame = value;
            this.updateGear(5);
        }
    }

    /**
     * 获取当前时间缩放倍率。
     */
    public get timeScale(): number {
        return this._content.timeScale;
    }

    /**
     * 设置播放时间缩放倍率，并立即同步到底层 `MovieClip`。
     * @param value 时间缩放倍率。
     */
    public set timeScale(value: number) {
        this._content.timeScale = value;
    }

    /**
     * 将播放进度重置到起始位置。
     */
    public rewind(): void {
        this._content.rewind();
    }

    /**
     * 同步另一实例的播放状态、帧进度或运行时表现。
     * @param anotherMc 目标帧动画实例。
     */
    public syncStatus(anotherMc: GMovieClip): void {
        this._content.syncStatus(anotherMc._content);
    }

    /**
     * 按指定时间推进当前动画或补间状态。
     * @param timeInSeconds 推进时间，单位为秒。
     */
    public advance(timeInSeconds: number): void {
        this._content.advance(timeInSeconds);
    }

    /**
     * 配置播放区间、循环次数和结束回调。
     * @param start 起始帧索引。
     * @param end 结束帧索引，`-1` 表示最后一帧。
     * @param times 播放次数，`0` 表示无限循环。
     * @param endAt 播放结束后停留的帧索引，`-1` 表示使用 `end`。
     * @param endCallback 播放结束回调。
     */
    public setPlaySettings(start?: number, end?: number, times?: number, endAt?: number, endCallback?: (() => void) | null): void {
        this._content.setPlaySettings(start, end, times, endAt, endCallback);
    }

    /**
     * 在灰度状态变化后同步底层渲染组件效果。
     */
    protected handleGrayedChanged(): void {
        this._content.grayscale = this._grayed;
    }

    /**
     * 在尺寸变化后同步底层节点尺寸、布局和裁剪范围。
     */
    protected handleSizeChanged(): void {
        super.handleSizeChanged();

        //不知道原因，尺寸改变必须调用一次这个，否则大小不对
        this._content.sizeMode = Sprite.SizeMode.CUSTOM;
    }

    /**
     * 按 FairyGUI 属性编号读取当前运行时属性值。
     * @param index FairyGUI 属性编号。
     * @returns 对应属性的当前值。
     */
    public getProp(index: number): any {
        switch (index) {
            case ObjectPropID.Color:
                return this.color;
            case ObjectPropID.Playing:
                return this.playing;
            case ObjectPropID.Frame:
                return this.frame;
            case ObjectPropID.TimeScale:
                return this.timeScale;
            default:
                return super.getProp(index);
        }
    }

    /**
     * 按 FairyGUI 属性编号写入当前运行时属性值，并触发必要联动。
     * @param index FairyGUI 属性编号。
     * @param value 要写入的属性值。
     */
    public setProp(index: number, value: any): void {
        switch (index) {
            case ObjectPropID.Color:
                this.color = value;
                break;
            case ObjectPropID.Playing:
                this.playing = value;
                break;
            case ObjectPropID.Frame:
                this.frame = value;
                break;
            case ObjectPropID.TimeScale:
                this.timeScale = value;
                break;
            case ObjectPropID.DeltaTime:
                this.advance(value);
                break;
            default:
                super.setProp(index, value);
                break;
        }
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

        this._content.interval = contentItem.interval;
        this._content.swing = contentItem.swing;
        this._content.repeatDelay = contentItem.repeatDelay;
        this._content.frames = contentItem.frames;
        this._content.smoothing = contentItem.smoothing;
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
        buffer.readByte(); //flip
        this._content.frame = buffer.readInt();
        this._content.playing = buffer.readBool();
    }
}
