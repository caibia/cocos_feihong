import { math } from "cc";
import { ProgressTitleType, ObjectPropID, FillMethod } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GImage } from "./GImage";
import { GLoader } from "./GLoader";
import { GObject } from "./GObject";
import { EaseType } from "./tween/EaseType";
import { GTween } from "./tween/GTween";
import { GTweener } from "./tween/GTweener";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 进度条组件，负责标题文本、填充条长度与最大值进度映射。
 */
export class GProgressBar extends GComponent {
    /**
     * 进度条最小值。
     */
    private _min: number = 0;
    /**
     * 进度条最大值。
     */
    private _max: number = 0;
    /**
     * 当前进度值。
     */
    private _value: number = 0;
    /**
     * 标题显示模式。
     */
    private _titleType: ProgressTitleType;
    /**
     * 是否反向填充进度条。
     */
    private _reverse: boolean;

    /**
     * 标题显示对象。
     */
    private _titleObject: GObject;
    /**
     * 动画显示对象。
     */
    private _aniObject: GObject;
    /**
     * 水平方向进度条对象。
     */
    private _barObjectH: GObject;
    /**
     * 垂直方向进度条对象。
     */
    private _barObjectV: GObject;
    /**
     * 进度条最大宽度。
     */
    private _barMaxWidth: number = 0;
    /**
     * 进度条最大高度。
     */
    private _barMaxHeight: number = 0;
    /**
     * 进度条宽度增量基准。
     */
    private _barMaxWidthDelta: number = 0;
    /**
     * 进度条高度增量基准。
     */
    private _barMaxHeightDelta: number = 0;
    /**
     * 进度条起始 X 坐标。
     */
    private _barStartX: number = 0;
    /**
     * 进度条起始 Y 坐标。
     */
    private _barStartY: number = 0;

    /**
     * 初始化进度条默认范围、标题模式和补间更新状态。
     */
    public constructor() {
        super();

        this._node.name = "GProgressBar";
        this._titleType = ProgressTitleType.Percent;
        this._value = 50;
        this._max = 100;
    }

    /**
     * 获取当前标题显示模式。
     */
    public get titleType(): ProgressTitleType {
        return this._titleType;
    }

    /**
     * 设置标题显示模式，并刷新进度文案。
     * @param value 标题显示模式。
     */
    public set titleType(value: ProgressTitleType) {
        if (this._titleType != value) {
            this._titleType = value;
            this.update(this._value);
        }
    }

    /**
     * 获取当前最小值。
     */
    public get min(): number {
        return this._min;
    }

    /**
     * 设置最小值边界。
     * @param value 最小值。
     */
    public set min(value: number) {
        if (this._min != value) {
            this._min = value;
            this.update(this._value);
        }
    }

    /**
     * 获取当前最大值。
     */
    public get max(): number {
        return this._max;
    }

    /**
     * 设置最大值边界。
     * @param value 最大值。
     */
    public set max(value: number) {
        if (this._max != value) {
            this._max = value;
            this.update(this._value);
        }
    }

    /**
     * 获取当前值。
     */
    public get value(): number {
        return this._value;
    }

    /**
     * 设置当前值，并立即刷新对应显示状态。
     * @param value 当前进度值。
     */
    public set value(value: number) {

        if (this._value != value) {
            GTween.kill(this, false, this.update);

            this._value = value;
            this.update(value);
        }
    }

    /**
     * 按补间方式把当前值平滑过渡到目标值。
     * @param value 目标进度值。
     * @param duration 补间持续时间。
     * @returns 对应的补间器。
     */
    public tweenValue(value: number, duration: number): GTweener {
        var oldValule: number;

        var tweener: GTweener = GTween.getTween(this, this.update);
        if (tweener) {
            oldValule = tweener.value.x;
            tweener.kill();
        }
        else
            oldValule = this._value;

        this._value = value;
        return GTween.to(oldValule, this._value, duration).setTarget(this, this.update).setEase(EaseType.Linear);
    }

    /**
     * 刷新当前对象的显示结果或内部状态。
     * @param newValue 要刷新的进度值。
     */
    public update(newValue: number): void {
        var percent: number = math.clamp01((newValue - this._min) / (this._max - this._min));
        if (this._titleObject) {
            switch (this._titleType) {
                case ProgressTitleType.Percent:
                    this._titleObject.text = Math.floor(percent * 100) + "%";
                    break;

                case ProgressTitleType.ValueAndMax:
                    this._titleObject.text = Math.floor(newValue) + "/" + Math.floor(this._max);
                    break;

                case ProgressTitleType.Value:
                    this._titleObject.text = "" + Math.floor(newValue);
                    break;

                case ProgressTitleType.Max:
                    this._titleObject.text = "" + Math.floor(this._max);
                    break;
            }
        }

        var fullWidth: number = this.width - this._barMaxWidthDelta;
        var fullHeight: number = this.height - this._barMaxHeightDelta;
        if (!this._reverse) {
            if (this._barObjectH) {
                if (!this.setFillAmount(this._barObjectH, percent))
                    this._barObjectH.width = Math.round(fullWidth * percent);
            }
            if (this._barObjectV) {
                if (!this.setFillAmount(this._barObjectV, percent))
                    this._barObjectV.height = Math.round(fullHeight * percent);
            }
        }
        else {
            if (this._barObjectH) {
                if (!this.setFillAmount(this._barObjectH, 1 - percent)) {
                    this._barObjectH.width = Math.round(fullWidth * percent);
                    this._barObjectH.x = this._barStartX + (fullWidth - this._barObjectH.width);
                }

            }
            if (this._barObjectV) {
                if (!this.setFillAmount(this._barObjectV, 1 - percent)) {
                    this._barObjectV.height = Math.round(fullHeight * percent);
                    this._barObjectV.y = this._barStartY + (fullHeight - this._barObjectV.height);
                }
            }
        }
        if (this._aniObject)
            this._aniObject.setProp(ObjectPropID.Frame, Math.floor(percent * 100));
    }

    /**
     * 按百分比把进度写到指定条形对象的填充属性上。
     * @param bar 目标条形对象。
     * @param percent 当前进度百分比。
     * @returns 是否成功通过填充属性更新进度。
     */
    private setFillAmount(bar: GObject, percent: number): boolean {
        if (((bar instanceof GImage) || (bar instanceof GLoader)) && bar.fillMethod != FillMethod.None) {
            bar.fillAmount = percent;
            return true;
        }
        else
            return false;
    }

    /**
     * 从扩展数据中读取组件特有配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected constructExtension(buffer: ByteBuffer): void {
        buffer.seek(0, 6);

        this._titleType = buffer.readByte();
        this._reverse = buffer.readBool();

        this._titleObject = this.getChild("title");
        this._barObjectH = this.getChild("bar");
        this._barObjectV = this.getChild("bar_v");
        this._aniObject = this.getChild("ani");

        if (this._barObjectH) {
            this._barMaxWidth = this._barObjectH.width;
            this._barMaxWidthDelta = this.width - this._barMaxWidth;
            this._barStartX = this._barObjectH.x;
        }
        if (this._barObjectV) {
            this._barMaxHeight = this._barObjectV.height;
            this._barMaxHeightDelta = this.height - this._barMaxHeight;
            this._barStartY = this._barObjectV.y;
        }
    }

    /**
     * 在尺寸变化后同步底层节点尺寸、布局和裁剪范围。
     */
    protected handleSizeChanged(): void {
        super.handleSizeChanged();

        if (this._barObjectH)
            this._barMaxWidth = this.width - this._barMaxWidthDelta;
        if (this._barObjectV)
            this._barMaxHeight = this.height - this._barMaxHeightDelta;
        if (!this._underConstruct)
            this.update(this._value);
    }

    /**
     * 在对象加入父级后，继续补充依赖父级、控制器或运行时环境的配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_afterAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_afterAdd(buffer, beginPos);

        if (!buffer.seek(beginPos, 6)) {
            this.update(this._value);
            return;
        }

        if (buffer.readByte() != this.packageItem.objectType) {
            this.update(this._value);
            return;
        }

        this._value = buffer.readInt();
        this._max = buffer.readInt();
        if (buffer.version >= 2)
            this._min = buffer.readInt();

        this.update(this._value);
    }
}
