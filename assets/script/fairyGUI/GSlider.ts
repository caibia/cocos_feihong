import { math, Vec2 } from "cc";
import { FEvent as FUIEvent } from "./event/Event";
import { ProgressTitleType } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GObject } from "./GObject";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 滑块组件，负责拖拽取值、标题格式化与进度百分比映射。
 */
export class GSlider extends GComponent {
    /**
     * 滑块最小值。
     */
    private _min: number = 0;
    /**
     * 滑块最大值。
     */
    private _max: number = 0;
    /**
     * 当前滑块值。
     */
    private _value: number = 0;
    /**
     * 标题显示模式。
     */
    private _titleType: ProgressTitleType;
    /**
     * 是否反向映射滑块值。
     */
    private _reverse: boolean;
    /**
     * 是否只允许整数值。
     */
    private _wholeNumbers: boolean;

    /**
     * 标题显示对象。
     */
    private _titleObject: GObject;
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
     * 滑块把手对象。
     */
    private _gripObject: GObject;
    /**
     * 点击起始位置。
     */
    private _clickPos: Vec2;
    /**
     * 点击起始时的进度百分比。
     */
    private _clickPercent: number = 0;
    /**
     * 进度条起始 X 坐标。
     */
    private _barStartX: number = 0;
    /**
     * 进度条起始 Y 坐标。
     */
    private _barStartY: number = 0;

    /**
     * 点击轨道时是否立即改变值。
     */
    public changeOnClick: boolean = true;
    /**
     * 当前是否允许拖拽把手。
     */
    public canDrag: boolean = true;

    /**
     * 初始化滑块默认范围、标题格式和拖拽状态字段。
     */
    public constructor() {
        super();

        this._node.name = "GSlider";
        this._titleType = ProgressTitleType.Percent;
        this._value = 50;
        this._max = 100;
        this._clickPos = new Vec2();
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
        this._titleType = value;
    }

    /**
     * 获取当前是否按整数模式取值。
     */
    public get wholeNumbers(): boolean {
        return this._wholeNumbers;
    }

    /**
     * 设置整数模式开关，并限制后续取值结果。
     * @param value 是否只允许整数值。
     */
    public set wholeNumbers(value: boolean) {
        if (this._wholeNumbers != value) {
            this._wholeNumbers = value;
            this.update();
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
            this.update();
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
            this.update();
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
     * @param value 当前滑块值。
     */
    public set value(value: number) {
        if (this._value != value) {
            this._value = value;
            this.update();
        }
    }

    /**
     * 刷新当前对象的显示结果或内部状态。
     */
    public update(): void {
        this.updateWithPercent((this._value - this._min) / (this._max - this._min));
    }

    /**
     * 重新计算并同步With百分比相关结果。
     * @param percent 当前进度百分比。
     * @param manual 是否由手动交互触发。
     */
    private updateWithPercent(percent: number, manual?: boolean): void {
        percent = math.clamp01(percent);
        if (manual) {
            var newValue: number = math.clamp(this._min + (this._max - this._min) * percent, this._min, this._max);
            if (this._wholeNumbers) {
                newValue = Math.round(newValue);
                percent = math.clamp01((newValue - this._min) / (this._max - this._min));
            }

            if (newValue != this._value) {
                this._value = newValue;
                this._node.emit(FUIEvent.STATUS_CHANGED, this);
            }
        }

        if (this._titleObject) {
            switch (this._titleType) {
                case ProgressTitleType.Percent:
                    this._titleObject.text = Math.floor(percent * 100) + "%";
                    break;

                case ProgressTitleType.ValueAndMax:
                    this._titleObject.text = this._value + "/" + this._max;
                    break;

                case ProgressTitleType.Value:
                    this._titleObject.text = "" + this._value;
                    break;

                case ProgressTitleType.Max:
                    this._titleObject.text = "" + this._max;
                    break;
            }
        }

        var fullWidth: number = this.width - this._barMaxWidthDelta;
        var fullHeight: number = this.height - this._barMaxHeightDelta;
        if (!this._reverse) {
            if (this._barObjectH)
                this._barObjectH.width = Math.round(fullWidth * percent);
            if (this._barObjectV)
                this._barObjectV.height = Math.round(fullHeight * percent);
        }
        else {
            if (this._barObjectH) {
                this._barObjectH.width = Math.round(fullWidth * percent);
                this._barObjectH.x = this._barStartX + (fullWidth - this._barObjectH.width);
            }
            if (this._barObjectV) {
                this._barObjectV.height = Math.round(fullHeight * percent);
                this._barObjectV.y = this._barStartY + (fullHeight - this._barObjectV.height);
            }
        }
    }

    /**
     * 从扩展数据中读取组件特有配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected constructExtension(buffer: ByteBuffer): void {
        buffer.seek(0, 6);

        this._titleType = buffer.readByte();
        this._reverse = buffer.readBool();
        if (buffer.version >= 2) {
            this._wholeNumbers = buffer.readBool();
            this.changeOnClick = buffer.readBool();
        }

        this._titleObject = this.getChild("title");
        this._barObjectH = this.getChild("bar");
        this._barObjectV = this.getChild("bar_v");
        this._gripObject = this.getChild("grip");

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
        if (this._gripObject) {
            this._gripObject.on(FUIEvent.TOUCH_BEGIN, this.onGripTouchBegin, this);
            this._gripObject.on(FUIEvent.TOUCH_MOVE, this.onGripTouchMove, this);
        }

        this._node.on(FUIEvent.TOUCH_BEGIN, this.onBarTouchBegin, this);
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
            this.update();
    }

    /**
     * 在对象加入父级后，继续补充依赖父级、控制器或运行时环境的配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_afterAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_afterAdd(buffer, beginPos);

        if (!buffer.seek(beginPos, 6)) {
            this.update();
            return;
        }

        if (buffer.readByte() != this.packageItem.objectType) {
            this.update();
            return;
        }

        this._value = buffer.readInt();
        this._max = buffer.readInt();
        if (buffer.version >= 2)
            this._min = buffer.readInt();

        this.update();
    }

    /**
     * 按下滑块把手时记录拖拽起点。
     * @param evt 触摸开始事件对象。
     */
    private onGripTouchBegin(evt: FUIEvent): void {
        this.canDrag = true;
        evt.propagationStopped = true;
        evt.captureTouch();

        this._clickPos = this.globalToLocal(evt.pos.x, evt.pos.y);
        this._clickPercent = math.clamp01((this._value - this._min) / (this._max - this._min));
    }

    /**
     * 拖动滑块把手时按位移换算当前值，并刷新进度表现。
     * @param evt 触摸移动事件对象。
     */
    private onGripTouchMove(evt: FUIEvent): void {
        if (!this.canDrag) {
            return;
        }

        var pt: Vec2 = this.globalToLocal(evt.pos.x, evt.pos.y, s_vec2);
        var deltaX: number = pt.x - this._clickPos.x;
        var deltaY: number = pt.y - this._clickPos.y;
        if (this._reverse) {
            deltaX = -deltaX;
            deltaY = -deltaY;
        }

        var percent: number;
        if (this._barObjectH)
            percent = this._clickPercent + deltaX / this._barMaxWidth;
        else
            percent = this._clickPercent + deltaY / this._barMaxHeight;
        this.updateWithPercent(percent, true);
    }

    /**
     * 点击轨道时直接跳转或推进到对应位置。
     * @param evt 触摸开始事件对象。
     */
    private onBarTouchBegin(evt: FUIEvent): void {
        if (!this.changeOnClick)
            return;

        var pt: Vec2 = this._gripObject.globalToLocal(evt.pos.x, evt.pos.y, s_vec2);
        var percent: number = math.clamp01((this._value - this._min) / (this._max - this._min));
        var delta: number = 0;
        if (this._barObjectH != null)
            delta = (pt.x - this._gripObject.width / 2) / this._barMaxWidth;
        if (this._barObjectV != null)
            delta = (pt.y - this._gripObject.height / 2) / this._barMaxHeight;
        if (this._reverse)
            percent -= delta;
        else
            percent += delta;
        this.updateWithPercent(percent, true);
    }
}

var s_vec2: Vec2 = new Vec2();
