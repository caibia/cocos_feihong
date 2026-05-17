import { Vec2 } from "cc";
import { FEvent as FUIEvent } from "./event/Event";
import { GComponent } from "./GComponent";
import { GObject } from "./GObject";
import { ScrollPane } from "./ScrollPane";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 滚动条组件，负责滑块位置、箭头按钮与 ScrollPane 状态同步。
 */
export class GScrollBar extends GComponent {
    /**
     * 滑块对象。
     */
    private _grip: GObject;
    /**
     * 前向箭头按钮。
     */
    private _arrowButton1: GObject;
    /**
     * 后向箭头按钮。
     */
    private _arrowButton2: GObject;
    /**
     * 滑道对象。
     */
    private _bar: GObject;
    /**
     * 当前补间驱动的目标对象。
     */
    private _target: ScrollPane;

    /**
     * 是否为垂直滚动条。
     */
    private _vertical: boolean;
    /**
     * 当前滚动百分比。
     */
    private _scrollPerc: number;
    /**
     * 是否固定滑块尺寸。
     */
    private _fixedGripSize: boolean;

    /**
     * 滑块拖拽偏移量。
     */
    private _dragOffset: Vec2;
    /**
     * 当前是否正在拖拽滑块。
     */
    private _gripDragging: boolean;

    /**
     * 初始化滚动条默认状态，并准备拖拽滑块所需的中间字段。
     */
    public constructor() {
        super();

        this._node.name = "GScrollBar";
        this._dragOffset = new Vec2();
        this._scrollPerc = 0;
    }

    /**
     * 绑定宿主滚动面板并指定滚动条方向。
     * @param target 目标滚动面板。
     * @param vertical 是否为垂直滚动条。
     */
    public setScrollPane(target: ScrollPane, vertical: boolean): void {
        this._target = target;
        this._vertical = vertical;
    }

    /**
     * 按可视比例刷新滑块尺寸。
     * @param value 当前可视比例。
     */
    public setDisplayPerc(value: number) {
        if (this._vertical) {
            if (!this._fixedGripSize)
                this._grip.height = Math.floor(value * this._bar.height);
            this._grip.y = this._bar.y + (this._bar.height - this._grip.height) * this._scrollPerc;

        }
        else {
            if (!this._fixedGripSize)
                this._grip.width = Math.floor(value * this._bar.width);
            this._grip.x = this._bar.x + (this._bar.width - this._grip.width) * this._scrollPerc;
        }
        this._grip.visible = value != 0 && value != 1;
    }

    /**
     * 按滚动百分比刷新滑块位置。
     * @param val 当前滚动百分比。
     */
    public setScrollPerc(val: number) {
        this._scrollPerc = val;
        if (this._vertical)
            this._grip.y = this._bar.y + (this._bar.height - this._grip.height) * this._scrollPerc;
        else
            this._grip.x = this._bar.x + (this._bar.width - this._grip.width) * this._scrollPerc;
    }

    /**
     * 获取滚动条的最小占用尺寸。
     * @returns 滚动条最小尺寸。
     */
    public get minSize(): number {
        if (this._vertical)
            return (this._arrowButton1 ? this._arrowButton1.height : 0) + (this._arrowButton2 ? this._arrowButton2.height : 0);
        else
            return (this._arrowButton1 ? this._arrowButton1.width : 0) + (this._arrowButton2 ? this._arrowButton2.width : 0);
    }

    /**
     * 获取当前是否正在拖拽滑块。
     */
    public get gripDragging(): boolean {
        return this._gripDragging;
    }

    /**
     * 从扩展数据中读取组件特有配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected constructExtension(buffer: ByteBuffer): void {
        buffer.seek(0, 6);

        this._fixedGripSize = buffer.readBool();

        this._grip = this.getChild("grip");
        if (!this._grip) {
            console.error("需要定义grip");
            return;
        }

        this._bar = this.getChild("bar");
        if (!this._bar) {
            console.error("需要定义bar");
            return;
        }

        this._arrowButton1 = this.getChild("arrow1");
        this._arrowButton2 = this.getChild("arrow2");

        this._grip.on(FUIEvent.TOUCH_BEGIN, this.onGripTouchDown, this);
        this._grip.on(FUIEvent.TOUCH_MOVE, this.onGripTouchMove, this);
        this._grip.on(FUIEvent.TOUCH_END, this.onGripTouchEnd, this);

        if (this._arrowButton1)
            this._arrowButton1.on(FUIEvent.TOUCH_BEGIN, this.onClickArrow1, this);
        if (this._arrowButton2)
            this._arrowButton2.on(FUIEvent.TOUCH_BEGIN, this.onClickArrow2, this);

        this.on(FUIEvent.TOUCH_BEGIN, this.onBarTouchBegin, this);
    }

    /**
     * 滑块按下时记录拖拽起点，为后续拖动滚动条做准备。
     * @param evt 触摸开始事件对象。
     */
    private onGripTouchDown(evt: FUIEvent): void {
        evt.propagationStopped = true;
        evt.captureTouch();

        this._gripDragging = true;
        this._target.updateScrollBarVisible();

        this.globalToLocal(evt.pos.x, evt.pos.y, this._dragOffset);
        this._dragOffset.x -= this._grip.x;
        this._dragOffset.y -= this._grip.y;
    }

    /**
     * 拖动滑块时按位移比例换算滚动百分比，并回写给宿主 `ScrollPane`。
     * @param evt 触摸移动事件对象。
     */
    private onGripTouchMove(evt: FUIEvent): void {
        if (!this.onStage)
            return;

        var pt: Vec2 = this.globalToLocal(evt.pos.x, evt.pos.y, s_vec2);
        if (this._vertical) {
            var curY: number = pt.y - this._dragOffset.y;
            this._target.setPercY((curY - this._bar.y) / (this._bar.height - this._grip.height), false);
        }
        else {
            var curX: number = pt.x - this._dragOffset.x;
            this._target.setPercX((curX - this._bar.x) / (this._bar.width - this._grip.width), false);
        }
    }

    /**
     * 滑块拖动结束后清理拖拽标记。
     * @param evt 触摸结束事件对象。
     */
    private onGripTouchEnd(evt: FUIEvent): void {
        if (!this.onStage)
            return;

        this._gripDragging = false;
        this._target.updateScrollBarVisible();
    }

    /**
     * 点击前向箭头按钮时，推动宿主滚动一个步长。
     * @param evt 触摸开始事件对象。
     */
    private onClickArrow1(evt: FUIEvent): void {
        evt.propagationStopped = true;

        if (this._vertical)
            this._target.scrollUp();
        else
            this._target.scrollLeft();
    }

    /**
     * 点击后向箭头按钮时，推动宿主滚动一个步长。
     * @param evt 触摸开始事件对象。
     */
    private onClickArrow2(evt: FUIEvent): void {
        evt.propagationStopped = true;

        if (this._vertical)
            this._target.scrollDown();
        else
            this._target.scrollRight();
    }

    /**
     * 点击滑道空白区域时，按页或按段推动宿主滚动。
     * @param evt 触摸开始事件对象。
     */
    private onBarTouchBegin(evt: FUIEvent): void {
        evt.propagationStopped = true;
        var pt: Vec2 = this._grip.globalToLocal(evt.pos.x, evt.pos.y, s_vec2);
        if (this._vertical) {
            if (pt.y < 0)
                this._target.scrollUp(4);
            else
                this._target.scrollDown(4);
        }
        else {
            if (pt.x < 0)
                this._target.scrollLeft(4);
            else
                this._target.scrollRight(4);
        }
    }
}

var s_vec2: Vec2 = new Vec2();
