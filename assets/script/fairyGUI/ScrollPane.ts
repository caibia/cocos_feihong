import { Component, director, game, isValid, Mask, math, Node, Rect, screen, sys, UITransform, Vec2, View } from "cc"
import { Controller } from "./Controller";
import { FEvent as FUIEvent } from "./event/Event";
import { ScrollBarDisplayType, ScrollType } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GList } from "./GList";
import { Decls, GObject } from "./GObject";
import { GScrollBar } from "./GScrollBar";
import { Margin } from "./Margin";
import { GTween } from "./tween/GTween";
import { GTweener } from "./tween/GTweener";
import { UIConfig } from "./UIConfig";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 轴向类型；滚动、补间和循环修正逻辑都通过它统一区分 `x` 与 `y` 两个方向。
 */
type AxisType = "x" | "y";

/**
 * 滚动面板组件，负责裁剪、拖拽滚动、惯性动画、分页与滚动条同步。
 */
export class ScrollPane extends Component {
    /**
     * 所属宿主对象引用。
     */
    private _owner: GComponent;
    /**
     * 滚动内容容器节点。
     */
    private _container: Node;
    /**
     * 裁剪遮罩容器节点。
     */
    private _maskContainer: Node;
    /**
     * 遮罩容器上的 `UITransform` 组件。
     */
    private _maskContainerUITrans: UITransform;

    /**
     * 当前滚动方向类型。
     */
    private _scrollType: number;
    /**
     * 基础滚动步长。
     */
    private _scrollStep: number;
    /**
     * 鼠标滚轮滚动步长。
     */
    private _mouseWheelStep: number;
    /**
     * 惯性减速系数。
     */
    private _decelerationRate: number;
    /**
     * 滚动条边距配置。
     */
    private _scrollBarMargin: Margin;
    /**
     * 是否启用回弹效果。
     */
    private _bouncebackEffect: boolean;
    /**
     * 是否启用触摸滚动效果。
     */
    private _touchEffect: boolean;
    /**
     * 是否自动显示滚动条。
     */
    private _scrollBarDisplayAuto?: boolean;
    /**
     * 当前是否无需显示垂直滚动。
     */
    private _vScrollNone: boolean;
    /**
     * 当前是否无需显示水平滚动。
     */
    private _hScrollNone: boolean;
    /**
     * 当前是否需要刷新滚动状态。
     */
    private _needRefresh: boolean;
    /**
     * 刷新条所在轴向。
     */
    private _refreshBarAxis: AxisType;

    /**
     * 垂直滚动条是否显示在左侧。
     */
    private _displayOnLeft: boolean;
    /**
     * 是否吸附到子项边界。
     */
    private _snapToItem: boolean;
    /**
     * 吸附策略编号。
     */
    private _snappingPolicy: number;
    /**
     * 某个方向是否按内容需求启用滚动显示；内容不足一屏时可退化为不显示滚动条。
     */
    public _displayInDemand: boolean;
    /**
     * 是否启用鼠标滚轮滚动。
     */
    private _mouseWheelEnabled: boolean;
    /**
     * 是否启用分页模式。
     */
    private _pageMode: boolean;
    /**
     * 是否禁用惯性滚动。
     */
    private _inertiaDisabled?: boolean;
    /**
     * 滚动条是否浮动显示。
     */
    private _floating: boolean;
    /**
     * 是否禁用裁剪。
     */
    private _dontClip: boolean;
    /**
     * 是否把边距区域也纳入不裁剪范围。
     */
    private _dontClipMargin: boolean;

    /**
     * 当前横向滚动位置。
     */
    private _xPos: number;
    /**
     * 当前纵向滚动位置。
     */
    private _yPos: number;

    /**
     * 当前可视区域尺寸。
     */
    private _viewSize: Vec2;
    /**
     * 当前内容区域尺寸。
     */
    private _contentSize: Vec2;
    /**
     * 当前可滚动重叠尺寸。
     */
    private _overlapSize: Vec2;
    /**
     * 分页模式下的页面尺寸。
     */
    private _pageSize: Vec2;
    /**
     * 内容容器当前位置缓存。
     */
    private _containerPos: Vec2;
    /**
     * 触摸开始位置。
     */
    private _beginTouchPos: Vec2;
    /**
     * 上一次触摸位置。
     */
    private _lastTouchPos: Vec2;
    /**
     * 上一次触摸全局位置。
     */
    private _lastTouchGlobalPos: Vec2;
    /**
     * 当前滚动速度。
     */
    private _velocity: Vec2;
    /**
     * 滚动速度缩放倍率。
     */
    private _velocityScale: number;
    /**
     * 上一次移动时间戳。
     */
    private _lastMoveTime: number;
    /**
     * 是否已完成按住区域判定。
     */
    private _isHoldAreaDone: boolean;
    /**
     * 滚动动画状态标记。
     */
    private _aniFlag: number = 0;
    /**
     * 循环滚动模式标记；不同取值约定由列表和滚动面板共同使用。
     */
    public _loop: number;
    /**
     * 头部锁定尺寸。
     */
    private _headerLockedSize: number;
    /**
     * 尾部锁定尺寸。
     */
    private _footerLockedSize: number;
    /**
     * 当前是否正在派发刷新事件。
     */
    private _refreshEventDispatching: boolean;
    /**
     * 当前是否处于拖拽滚动中。
     */
    private _dragged: boolean;
    /**
     * 当前鼠标是否悬停在滚动区域内。
     */
    private _hover: boolean;

    /**
     * 当前补间滚动状态标记。
     */
    private _tweening: number;
    /**滚动条是否正在执行动画滚动中 */
    public get isTweening() { return this._tweening; }
    /**滚动动画用的时长，秒 */
    public scrollTweenDuration = 0;
    /**
     * 当前补间已运行时间。
     */
    private _tweenTime: Vec2;
    /**
     * 当前补间总时长。
     */
    private _tweenDuration: Vec2;
    /**
     * 补间起始位置。
     */
    private _tweenStart: Vec2;
    /**
     * 补间目标变化量。
     */
    private _tweenChange: Vec2;

    /**
     * 页码同步控制器。
     */
    private _pageController: Controller;

    /**
     * 水平滚动条对象。
     */
    private _hzScrollBar: GScrollBar;
    /**
     * 垂直滚动条对象。
     */
    private _vtScrollBar: GScrollBar;
    /**
     * 下拉刷新头部组件。
     */
    private _header: GComponent;
    /**
     * 上拉加载尾部组件。
     */
    private _footer: GComponent;

    /**
     * 当前全局正在被拖拽的滚动面板；用于避免多个 `ScrollPane` 同时抢占输入。
     */
    public static draggingPane: ScrollPane;

    /**
     * 根据包内配置初始化滚动容器、遮罩、滚动条以及拖拽监听。
     */
    public setup(buffer: ByteBuffer): void {
        const o = this._owner = <GComponent>GObject.cast(this.node);

        this._maskContainer = new Node("ScrollPane");
        this._maskContainer.layer = UIConfig.defaultUILayer;
        this._maskContainerUITrans = this._maskContainer.addComponent(UITransform);
        this._maskContainerUITrans.setAnchorPoint(0, 1);
        this._maskContainer.parent = o.node;

        this._container = o._container;
        this._container.parent = this._maskContainer;

        this._scrollBarMargin = new Margin();
        this._mouseWheelEnabled = true;
        this._xPos = 0;
        this._yPos = 0;
        this._aniFlag = 0;
        this._tweening = 0;
        this._footerLockedSize = 0;
        this._headerLockedSize = 0;
        this._viewSize = new Vec2();
        this._contentSize = new Vec2();
        this._pageSize = new Vec2(1, 1);
        this._overlapSize = new Vec2();
        this._tweenTime = new Vec2();
        this._tweenStart = new Vec2();
        this._tweenDuration = new Vec2();
        this._tweenChange = new Vec2();
        this._velocity = new Vec2();
        this._containerPos = new Vec2();
        this._beginTouchPos = new Vec2();
        this._lastTouchPos = new Vec2();
        this._lastTouchGlobalPos = new Vec2();
        this._scrollStep = UIConfig.defaultScrollStep;
        this._mouseWheelStep = this._scrollStep * 2;
        this._decelerationRate = UIConfig.defaultScrollDecelerationRate;
        this._snappingPolicy = 0;

        o.on(FUIEvent.TOUCH_BEGIN, this.onTouchBegin, this);
        o.on(FUIEvent.TOUCH_MOVE, this.onTouchMove, this);
        o.on(FUIEvent.TOUCH_END, this.onTouchEnd, this);
        o.on(FUIEvent.MOUSE_WHEEL, this.onMouseWheel, this);

        this._scrollType = buffer.readByte();
        var scrollBarDisplay: ScrollBarDisplayType = buffer.readByte();
        var flags: number = buffer.readInt();

        if (buffer.readBool()) {
            this._scrollBarMargin.top = buffer.readInt();
            this._scrollBarMargin.bottom = buffer.readInt();
            this._scrollBarMargin.left = buffer.readInt();
            this._scrollBarMargin.right = buffer.readInt();
        }

        var vtScrollBarRes: string = buffer.readS();
        var hzScrollBarRes: string = buffer.readS();
        var headerRes: string = buffer.readS();
        var footerRes: string = buffer.readS();

        if ((flags & 1) != 0) this._displayOnLeft = true;
        if ((flags & 2) != 0) this._snapToItem = true;
        if ((flags & 4) != 0) this._displayInDemand = true;
        if ((flags & 8) != 0) this._pageMode = true;
        if (flags & 16)
            this._touchEffect = true;
        else if (flags & 32)
            this._touchEffect = false;
        else
            this._touchEffect = UIConfig.defaultScrollTouchEffect;
        if (flags & 64)
            this._bouncebackEffect = true;
        else if (flags & 128)
            this._bouncebackEffect = false;
        else
            this._bouncebackEffect = UIConfig.defaultScrollBounceEffect;
        if ((flags & 256) != 0) this._inertiaDisabled = true;
        if ((flags & 512) != 0) this._dontClip = true;
        if ((flags & 1024) != 0) this._floating = true;
        if ((flags & 2048) != 0) this._dontClipMargin = true;

        if (!this._dontClip)
            this._maskContainer.addComponent(Mask);

        if (scrollBarDisplay == ScrollBarDisplayType.Default)
            scrollBarDisplay = UIConfig.defaultScrollBarDisplay;

        if (scrollBarDisplay != ScrollBarDisplayType.Hidden) {
            if (this._scrollType == ScrollType.Both || this._scrollType == ScrollType.Vertical) {
                var res: string = vtScrollBarRes ? vtScrollBarRes : UIConfig.verticalScrollBar;
                if (res) {
                    this._vtScrollBar = <GScrollBar><any>(UIPackage.createObjectFromURL(res));
                    if (!this._vtScrollBar)
                        throw new Error("cannot create scrollbar from " + res);
                    this._vtScrollBar.setScrollPane(this, true);
                    this._vtScrollBar.node.parent = o.node;
                }
            }
            if (this._scrollType == ScrollType.Both || this._scrollType == ScrollType.Horizontal) {
                var res: string = hzScrollBarRes ? hzScrollBarRes : UIConfig.horizontalScrollBar;
                if (res) {
                    this._hzScrollBar = <GScrollBar><any>(UIPackage.createObjectFromURL(res));
                    if (!this._hzScrollBar)
                        throw new Error("cannot create scrollbar from " + res);
                    this._hzScrollBar.setScrollPane(this, false);
                    this._hzScrollBar.node.parent = o.node;
                }
            }

            if (scrollBarDisplay == ScrollBarDisplayType.Auto)
                this._scrollBarDisplayAuto = true;
            if (this._scrollBarDisplayAuto) {
                if (this._vtScrollBar)
                    this._vtScrollBar.node.active = false;
                if (this._hzScrollBar)
                    this._hzScrollBar.node.active = false;

                o.on(FUIEvent.ROLL_OVER, this.onRollOver, this);
                o.on(FUIEvent.ROLL_OUT, this.onRollOut, this);
            }
        }

        if (headerRes) {
            this._header = <GComponent>(UIPackage.createObjectFromURL(headerRes));
            if (this._header == null)
                throw new Error("cannot create scrollPane header from " + headerRes);
            else
                this._maskContainer.insertChild(this._header.node, 0);
        }

        if (footerRes) {
            this._footer = <GComponent><any>(UIPackage.createObjectFromURL(footerRes));
            if (this._footer == null)
                throw new Error("cannot create scrollPane footer from " + footerRes);
            else
                this._maskContainer.insertChild(this._footer.node, 0);
        }

        this._refreshBarAxis = (this._scrollType == ScrollType.Both || this._scrollType == ScrollType.Vertical) ? "y" : "x";

        this.setSize(o.width, o.height);
    }

    /**
     * 组件销毁时解除输入监听、动画与滚动条引用，防止节点销毁后仍被调度。
     */
    protected onDestroy(): void {
        delete this._pageController;

        if (this._hzScrollBar)
            this._hzScrollBar.dispose();
        if (this._vtScrollBar)
            this._vtScrollBar.dispose();
        if (this._header)
            this._header.dispose();
        if (this._footer)
            this._footer.dispose();
    }

    /**
     * 执行命中检测，判断当前坐标是否落在可交互区域内。
     * @param pt 待检测的局部坐标。
     * @param globalPt 待检测的全局坐标。
     * @returns 命中的目标对象；未命中时返回空值。
     */
    public hitTest(pt: Vec2, globalPt: Vec2): GObject {
        let target: GObject;
        if (this._vtScrollBar) {
            target = this._vtScrollBar.hitTest(globalPt);
            if (target)
                return target;
        }
        if (this._hzScrollBar) {
            target = this._hzScrollBar.hitTest(globalPt);
            if (target)
                return target;
        }
        if (this._header && this._header.node.activeInHierarchy) {
            target = this._header.hitTest(globalPt);
            if (target)
                return target;
        }
        if (this._footer && this._footer.node.activeInHierarchy) {
            target = this._footer.hitTest(globalPt);
            if (target)
                return target;
        }

        if (this._dontClip)
            return this._owner;
        else if (this._dontClipMargin) {
            if (pt.x >= 0 && pt.y >= 0 && pt.x < this._owner.width && pt.y < this._owner.height)
                return this._owner;
        }
        else {
            if (pt.x >= this._owner.margin.left && pt.y >= this._owner.margin.top
                && pt.x < this._owner.margin.left + this._viewSize.x && pt.y < this._owner.margin.top + this._viewSize.y)
                return this._owner;
        }

        return null;
    }

    /**
     * 获取当前滚动面板所属组件。
     */
    public get owner(): GComponent {
        return this._owner;
    }

    /**
     * 获取横向滚动条组件。
     */
    public get hzScrollBar(): GScrollBar {
        return this._hzScrollBar;
    }

    /**
     * 获取纵向滚动条组件。
     */
    public get vtScrollBar(): GScrollBar {
        return this._vtScrollBar;
    }

    /**
     * 获取下拉刷新头部组件。
     */
    public get header(): GComponent {
        return this._header;
    }

    /**
     * 获取上拉加载尾部组件。
     */
    public get footer(): GComponent {
        return this._footer;
    }

    /**
     * 获取回弹效果开关状态。
     * @returns 当前是否启用回弹效果。
     */
    public get bouncebackEffect(): boolean {
        return this._bouncebackEffect;
    }

    /**
     * 设置回弹效果开关。
     * @param sc 是否启用回弹效果。
     */
    public set bouncebackEffect(sc: boolean) {
        this._bouncebackEffect = sc;
    }

    /**
     * 获取触摸滚动开关状态。
     * @returns 当前是否启用触摸滚动。
     */
    public get touchEffect(): boolean {
        return this._touchEffect;
    }

    /**
     * 设置触摸滚动开关。
     * @param sc 是否启用触摸滚动。
     */
    public set touchEffect(sc: boolean) {
        this._touchEffect = sc;
    }

    /**
     * 设置基础滚动步长，并同步滚轮步长。
     * @param val 基础滚动步长。
     */
    public set scrollStep(val: number) {
        this._scrollStep = val;
        if (this._scrollStep == 0)
            this._scrollStep = UIConfig.defaultScrollStep;
        this._mouseWheelStep = this._scrollStep * 2;
    }

    /**
     * 获取惯性减速系数。
     */
    public get decelerationRate(): number {
        return this._decelerationRate;
    }

    /**
     * 设置惯性减速系数。
     * @param val 惯性减速系数。
     */
    public set decelerationRate(val: number) {
        this._decelerationRate = val;
    }

    /**
     * 获取基础滚动步长。
     */
    public get scrollStep(): number {
        return this._scrollStep;
    }

    /**
     * 获取子项吸附开关状态。
     */
    public get snapToItem(): boolean {
        return this._snapToItem;
    }

    /**
     * 设置子项吸附开关。
     * @param value 是否吸附到子项边界。
     */
    public set snapToItem(value: boolean) {
        this._snapToItem = value;
    }

    /**
     * 获取吸附策略编号。
     */
    public get snappingPolicy(): number {
        return this._snappingPolicy;
    }

    /**
     * 设置吸附策略编号。
     * @param value 吸附策略编号。
     */
    public set snappingPolicy(value: number) {
        this._snappingPolicy = value;
    }

    /**
     * 获取鼠标滚轮开关状态。
     */
    public get mouseWheelEnabled(): boolean {
        return this._mouseWheelEnabled;
    }

    /**
     * 设置鼠标滚轮开关。
     * @param value 是否启用鼠标滚轮滚动。
     */
    public set mouseWheelEnabled(value: boolean) {
        this._mouseWheelEnabled = value;
    }

    /**
     * 获取当前是否处于拖拽滚动中。
     */
    public get isDragged(): boolean {
        return this._dragged;
    }

    /**
     * 获取当前横向滚动百分比。
     */
    public get percX(): number {
        return this._overlapSize.x == 0 ? 0 : this._xPos / this._overlapSize.x;
    }

    /**
     * 设置横向滚动百分比，并换算为实际滚动位置。
     * @param value 横向滚动百分比。
     */
    public set percX(value: number) {
        this.setPercX(value, false);
    }

    /**
     * 按百分比设置横向滚动位置。
     * @param value 横向滚动百分比。
     * @param ani 是否使用动画。
     */
    public setPercX(value: number, ani?: boolean): void {
        this._owner.ensureBoundsCorrect();
        this.setPosX(this._overlapSize.x * math.clamp01(value), ani);
    }

    /**
     * 获取当前纵向滚动百分比。
     */
    public get percY(): number {
        return this._overlapSize.y == 0 ? 0 : this._yPos / this._overlapSize.y;
    }

    /**
     * 设置纵向滚动百分比，并换算为实际滚动位置。
     * @param value 纵向滚动百分比。
     */
    public set percY(value: number) {
        this.setPercY(value, false);
    }

    /**
     * 按百分比设置纵向滚动位置。
     * @param value 纵向滚动百分比。
     * @param ani 是否使用动画。
     */
    public setPercY(value: number, ani?: boolean): void {
        this._owner.ensureBoundsCorrect();
        this.setPosY(this._overlapSize.y * math.clamp01(value), ani);
    }

    /**
     * 获取当前横向滚动位置。
     */
    public get posX(): number {
        return this._xPos;
    }

    /**
     * 设置横向滚动位置，并驱动容器移动。
     * @param value 横向滚动位置。
     */
    public set posX(value: number) {
        this.setPosX(value, false);
    }

    /**
     * 设置横向滚动位置，并按需触发滚动动画。
     * @param value 横向滚动位置。
     * @param ani 是否使用动画。
     */
    public setPosX(value: number, ani?: boolean): void {
        this._owner.ensureBoundsCorrect();

        if (this._loop == 1)
            value = this.loopCheckingNewPos(value, "x");

        value = math.clamp(value, 0, this._overlapSize.x);
        if (value != this._xPos) {
            this._xPos = value;
            this.posChanged(ani);
        }
    }

    /**
     * 获取当前纵向滚动位置。
     */
    public get posY(): number {
        return this._yPos;
    }

    /**
     * 设置纵向滚动位置，并驱动容器移动。
     * @param value 纵向滚动位置。
     */
    public set posY(value: number) {
        this.setPosY(value, false);
    }

    /**
     * 设置纵向滚动位置，并按需触发滚动动画。
     * @param value 纵向滚动位置。
     * @param ani 是否使用动画。
     */
    public setPosY(value: number, ani?: boolean): void {
        this._owner.ensureBoundsCorrect();

        if (this._loop == 1)
            value = this.loopCheckingNewPos(value, "y");

        value = math.clamp(value, 0, this._overlapSize.y);
        if (value != this._yPos) {
            this._yPos = value;
            this.posChanged(ani);
        }
    }

    /**
     * 获取内容区域宽度。
     */
    public get contentWidth(): number {
        return this._contentSize.x;
    }

    /**
     * 获取内容区域高度。
     */
    public get contentHeight(): number {
        return this._contentSize.y;
    }

    /**
     * 获取当前可视区域宽度。
     */
    public get viewWidth(): number {
        return this._viewSize.x;
    }

    /**
     * 设置可视区域宽度，并同步滚动视口或容器尺寸。
     * @param value 可视区域宽度。
     */
    public set viewWidth(value: number) {
        value = value + this._owner.margin.left + this._owner.margin.right;
        if (this._vtScrollBar && !this._floating)
            value += this._vtScrollBar.width;
        this._owner.width = value;
    }

    /**
     * 获取当前可视区域高度。
     */
    public get viewHeight(): number {
        return this._viewSize.y;
    }

    /**
     * 设置可视区域高度，并同步滚动视口或容器尺寸。
     * @param value 可视区域高度。
     */
    public set viewHeight(value: number) {
        value = value + this._owner.margin.top + this._owner.margin.bottom;
        if (this._hzScrollBar && !this._floating)
            value += this._hzScrollBar.height;
        this._owner.height = value;
    }

    /**
     * 获取当前横向页码。
     */
    public get currentPageX(): number {
        if (!this._pageMode)
            return 0;

        var page: number = Math.floor(this._xPos / this._pageSize.x);
        if (this._xPos - page * this._pageSize.x > this._pageSize.x * 0.5)
            page++;

        return page;
    }

    /**
     * 设置横向页码，并滚动到对应页面。
     * @param value 横向页码。
     */
    public set currentPageX(value: number) {
        this.setCurrentPageX(value, false);
    }

    /**
     * 获取当前纵向页码。
     */
    public get currentPageY(): number {
        if (!this._pageMode)
            return 0;

        var page: number = Math.floor(this._yPos / this._pageSize.y);
        if (this._yPos - page * this._pageSize.y > this._pageSize.y * 0.5)
            page++;

        return page;
    }

    /**
     * 设置纵向页码，并滚动到对应页面。
     * @param value 纵向页码。
     */
    public set currentPageY(value: number) {
        this.setCurrentPageY(value, false);
    }

    /**
     * 切换到指定横向页码，并可选使用缓动动画。
     * @param value 横向页码。
     * @param ani 是否使用动画。
     */
    public setCurrentPageX(value: number, ani?: boolean): void {
        if (!this._pageMode)
            return;

        this._owner.ensureBoundsCorrect();

        if (this._overlapSize.x > 0)
            this.setPosX(value * this._pageSize.x, ani);
    }

    /**
     * 切换到指定纵向页码，并可选使用缓动动画。
     * @param value 纵向页码。
     * @param ani 是否使用动画。
     */
    public setCurrentPageY(value: number, ani?: boolean): void {
        if (!this._pageMode)
            return;

        this._owner.ensureBoundsCorrect();

        if (this._overlapSize.y > 0)
            this.setPosY(value * this._pageSize.y, ani);
    }

    /**
     * 判断当前是否已经滚动到底部边界。
     */
    public get isBottomMost(): boolean {
        return this._yPos == this._overlapSize.y || this._overlapSize.y == 0;
    }

    /**
     * 判断当前是否已经滚动到右侧边界。
     */
    public get isRightMost(): boolean {
        return this._xPos == this._overlapSize.x || this._overlapSize.x == 0;
    }

    /**
     * 获取页码同步控制器。
     */
    public get pageController(): Controller {
        return this._pageController;
    }

    /**
     * 设置页码控制器，并在翻页时回写页签。
     * @param value 页码控制器。
     */
    public set pageController(value: Controller) {
        this._pageController = value;
    }

    /**
     * 获取滚动中的横向位置。
     */
    public get scrollingPosX(): number {
        return math.clamp(-this._container.position.x, 0, this._overlapSize.x);
    }

    /**
     * 获取滚动中的纵向位置。
     */
    public get scrollingPosY(): number {
        return math.clamp(-(-this._container.position.y), 0, this._overlapSize.y);
    }

    /**
     * 把内容滚动到顶部位置。
     * @param ani 是否使用动画。
     */
    public scrollTop(ani?: boolean): void {
        this.setPercY(0, ani);
    }

    /**
     * 把内容滚动到底部位置。
     * @param ani 是否使用动画。
     */
    public scrollBottom(ani?: boolean): void {
        this.setPercY(1, ani);
    }

    /**
     * 按比例向上滚动内容。
     * @param ratio 滚动比例。
     * @param ani 是否使用动画。
     */
    public scrollUp(ratio?: number, ani?: boolean): void {
        if (ratio == undefined) ratio = 1;
        if (this._pageMode)
            this.setPosY(this._yPos - this._pageSize.y * ratio, ani);
        else
            this.setPosY(this._yPos - this._scrollStep * ratio, ani);;
    }

    /**
     * 按比例向下滚动内容。
     * @param ratio 滚动比例。
     * @param ani 是否使用动画。
     */
    public scrollDown(ratio?: number, ani?: boolean): void {
        if (ratio == undefined) ratio = 1;
        if (this._pageMode)
            this.setPosY(this._yPos + this._pageSize.y * ratio, ani);
        else
            this.setPosY(this._yPos + this._scrollStep * ratio, ani);
    }

    /**
     * 按比例向左滚动内容。
     * @param ratio 滚动比例。
     * @param ani 是否使用动画。
     */
    public scrollLeft(ratio?: number, ani?: boolean): void {
        if (ratio == undefined) ratio = 1;
        if (this._pageMode)
            this.setPosX(this._xPos - this._pageSize.x * ratio, ani);
        else
            this.setPosX(this._xPos - this._scrollStep * ratio, ani);
    }

    /**
     * 按比例向右滚动内容。
     * @param ratio 滚动比例。
     * @param ani 是否使用动画。
     */
    public scrollRight(ratio?: number, ani?: boolean): void {
        if (ratio == undefined) ratio = 1;
        if (this._pageMode)
            this.setPosX(this._xPos + this._pageSize.x * ratio, ani);
        else
            this.setPosX(this._xPos + this._scrollStep * ratio, ani);
    }

    /**
     * 将目标内容滚动到可视区域内，可选是否使用动画。
     * @param obj 目标对象。
     * @param ani 是否使用动画。
     * @param setFirst 是否优先对齐到首部。
     */
    public scrollToView(target: any, ani?: boolean, setFirst?: boolean): void {
        this._owner.ensureBoundsCorrect();
        if (this._needRefresh)
            this.refresh();

        var rect: Rect;
        if (target instanceof GObject) {
            if (target.parent != this._owner) {
                target.parent.localToGlobalRect(target.x, target.y,
                    target.width, target.height, s_rect);
                rect = this._owner.globalToLocalRect(s_rect.x, s_rect.y,
                    s_rect.width, s_rect.height, s_rect);
            }
            else {
                rect = s_rect;
                rect.x = target.x;
                rect.y = target.y;
                rect.width = target.width;
                rect.height = target.height;
            }
        }
        else
            rect = <Rect>target;

        if (this._overlapSize.y > 0) {
            var bottom: number = this._yPos + this._viewSize.y;
            if (setFirst || rect.y <= this._yPos || rect.height >= this._viewSize.y) {
                if (this._pageMode)
                    this.setPosY(Math.floor(rect.y / this._pageSize.y) * this._pageSize.y, ani);
                else
                    this.setPosY(rect.y, ani);
            }
            else if (rect.y + rect.height > bottom) {
                if (this._pageMode)
                    this.setPosY(Math.floor(rect.y / this._pageSize.y) * this._pageSize.y, ani);
                else if (rect.height <= this._viewSize.y / 2)
                    this.setPosY(rect.y + rect.height * 2 - this._viewSize.y, ani);
                else
                    this.setPosY(rect.y + rect.height - this._viewSize.y, ani);
            }
        }
        if (this._overlapSize.x > 0) {
            var right: number = this._xPos + this._viewSize.x;
            if (setFirst || rect.x <= this._xPos || rect.width >= this._viewSize.x) {
                if (this._pageMode)
                    this.setPosX(Math.floor(rect.x / this._pageSize.x) * this._pageSize.x, ani);
                else
                    this.setPosX(rect.x, ani);
            }
            else if (rect.x + rect.width > right) {
                if (this._pageMode)
                    this.setPosX(Math.floor(rect.x / this._pageSize.x) * this._pageSize.x, ani);
                else if (rect.width <= this._viewSize.x / 2)
                    this.setPosX(rect.x + rect.width * 2 - this._viewSize.x, ani);
                else
                    this.setPosX(rect.x + rect.width - this._viewSize.x, ani);
            }
        }

        if (!ani && this._needRefresh)
            this.refresh();
    }

    /**
     * 判断指定子对象当前是否处于滚动面板可视区域内。
     * @param obj 目标对象。
     * @returns 当前是否处于可视区域内。
     */
    public isChildInView(obj: GObject): boolean {
        if (this._overlapSize.y > 0) {
            var dist: number = obj.y + (-this._container.position.y);
            if (dist < -obj.height || dist > this._viewSize.y)
                return false;
        }

        if (this._overlapSize.x > 0) {
            dist = obj.x + this._container.position.x;
            if (dist < -obj.width || dist > this._viewSize.x)
                return false;
        }

        return true;
    }

    /**
     * 强制取消当前拖拽滚动状态并清理中间标记。
     */
    public cancelDragging(): void {
        if (ScrollPane.draggingPane == this)
            ScrollPane.draggingPane = null;

        _gestureFlag = 0;
        this._dragged = false;
    }

    /**
     * 锁定头部刷新区域尺寸，常用于下拉刷新流程。
     * @param size 头部锁定尺寸。
     */
    public lockHeader(size: number): void {
        if (this._headerLockedSize == size)
            return;

        let cx: number = this._container.position.x;
        let cy: number = -this._container.position.y;
        let cr: number = this._refreshBarAxis == "x" ? cx : cy;

        this._headerLockedSize = size;

        if (!this._refreshEventDispatching && cr >= 0) {
            this._tweenStart.x = cx;
            this._tweenStart.y = cy;
            this._tweenChange.set(Vec2.ZERO);
            this._tweenChange[this._refreshBarAxis] = this._headerLockedSize - this._tweenStart[this._refreshBarAxis];
            this._tweenDuration.x = this._tweenDuration.y = TWEEN_TIME_DEFAULT;
            this.startTween(2);
        }
    }

    /**
     * 锁定尾部加载区域尺寸，常用于上拉加载流程。
     * @param size 尾部锁定尺寸。
     */
    public lockFooter(size: number): void {
        if (this._footerLockedSize == size)
            return;

        let cx: number = this._container.position.x;
        let cy: number = -this._container.position.y;
        let cr: number = this._refreshBarAxis == "x" ? cx : cy;

        this._footerLockedSize = size;

        if (!this._refreshEventDispatching && cr <= -this._overlapSize[this._refreshBarAxis]) {
            this._tweenStart.x = cx;
            this._tweenStart.y = cy;
            this._tweenChange.set(Vec2.ZERO);
            var max: number = this._overlapSize[this._refreshBarAxis];
            if (max == 0)
                max = Math.max(this._contentSize[this._refreshBarAxis] + this._footerLockedSize - this._viewSize[this._refreshBarAxis], 0);
            else
                max += this._footerLockedSize;
            this._tweenChange[this._refreshBarAxis] = -max - this._tweenStart[this._refreshBarAxis];
            this._tweenDuration.x = this._tweenDuration.y = TWEEN_TIME_DEFAULT;
            this.startTween(2);
        }
    }

    /**
     * 响应宿主组件尺寸变化，并同步滚动面板布局。
     * @param dWidth 宽度变化量。
     * @param dHeight 高度变化量。
     * @param dWidth2 第二阶段宽度变化量。
     * @param dHeight2 第二阶段高度变化量。
     */
    public onOwnerSizeChanged(): void {
        this.setSize(this._owner.width, this._owner.height);
        this.posChanged(false);
    }

    /**
     * 响应控制器页签变化，刷新当前对象的联动状态。
     * @param c 当前变化的控制器。
     */
    public handleControllerChanged(c: Controller): void {
        if (this._pageController == c) {
            if (this._scrollType == ScrollType.Horizontal)
                this.setCurrentPageX(c.selectedIndex, true);
            else
                this.setCurrentPageY(c.selectedIndex, true);
        }
    }

    /**
     * 把当前页码同步回关联控制器。
     */
    private updatePageController(): void {
        if (this._pageController && !this._pageController.changing) {
            var index: number;
            if (this._scrollType == ScrollType.Horizontal)
                index = this.currentPageX;
            else
                index = this.currentPageY;
            if (index < this._pageController.pageCount) {
                var c: Controller = this._pageController;
                this._pageController = null; //防止HandleControllerChanged的调用
                c.selectedIndex = index;
                this._pageController = c;
            }
        }
    }

    /**
     * 调整遮罩容器位置与尺寸，以匹配当前显示区域。
     */
    public adjustMaskContainer(): void {
        var mx: number = 0;
        if (this._displayOnLeft && this._vtScrollBar && !this._floating)
            mx = this._vtScrollBar.width;

        const o = this._owner;

        if (this._dontClipMargin)
            this._maskContainerUITrans.setAnchorPoint((o.margin.left + o._alignOffset.x) / o.width,
                1 - (o.margin.top + o._alignOffset.y) / o.height);
        else
            this._maskContainerUITrans.setAnchorPoint(o._alignOffset.x / this._viewSize.x, 1 - o._alignOffset.y / this._viewSize.y);

        if (o._customMask)
            this._maskContainer.setPosition(mx + o._alignOffset.x, -o._alignOffset.y);
        else
            this._maskContainer.setPosition(o._pivotCorrectX + mx + o._alignOffset.x, o._pivotCorrectY - o._alignOffset.y);
    }

    /**
     * 更新可视区域尺寸，并重新计算滚动布局。
     * @param aWidth 可视区域宽度。
     * @param aHeight 可视区域高度。
     */
    public setSize(aWidth: number, aHeight: number): void {
        if (this._hzScrollBar) {
            this._hzScrollBar.y = aHeight - this._hzScrollBar.height;
            if (this._vtScrollBar) {
                this._hzScrollBar.width = aWidth - this._vtScrollBar.width - this._scrollBarMargin.left - this._scrollBarMargin.right;
                if (this._displayOnLeft)
                    this._hzScrollBar.x = this._scrollBarMargin.left + this._vtScrollBar.width;
                else
                    this._hzScrollBar.x = this._scrollBarMargin.left;
            }
            else {
                this._hzScrollBar.width = aWidth - this._scrollBarMargin.left - this._scrollBarMargin.right;
                this._hzScrollBar.x = this._scrollBarMargin.left;
            }
        }
        if (this._vtScrollBar) {
            if (!this._displayOnLeft)
                this._vtScrollBar.x = aWidth - this._vtScrollBar.width;
            if (this._hzScrollBar)
                this._vtScrollBar.height = aHeight - this._hzScrollBar.height - this._scrollBarMargin.top - this._scrollBarMargin.bottom;
            else
                this._vtScrollBar.height = aHeight - this._scrollBarMargin.top - this._scrollBarMargin.bottom;
            this._vtScrollBar.y = this._scrollBarMargin.top;
        }

        this._viewSize.x = aWidth;
        this._viewSize.y = aHeight;
        if (this._hzScrollBar && !this._floating)
            this._viewSize.y -= this._hzScrollBar.height;
        if (this._vtScrollBar && !this._floating)
            this._viewSize.x -= this._vtScrollBar.width;
        this._viewSize.x -= (this._owner.margin.left + this._owner.margin.right);
        this._viewSize.y -= (this._owner.margin.top + this._owner.margin.bottom);

        this._viewSize.x = Math.max(1, this._viewSize.x);
        this._viewSize.y = Math.max(1, this._viewSize.y);
        this._pageSize.x = this._viewSize.x;
        this._pageSize.y = this._viewSize.y;

        this.adjustMaskContainer();
        this.handleSizeChanged();
    }

    /**
     * 更新内容区域尺寸，并根据新边界修正滚动范围。
     * @param aWidth 内容区域宽度。
     * @param aHeight 内容区域高度。
     */
    public setContentSize(aWidth: number, aHeight: number): void {
        if (this._contentSize.x == aWidth && this._contentSize.y == aHeight)
            return;

        this._contentSize.x = aWidth;
        this._contentSize.y = aHeight;
        this.handleSizeChanged();

        if (this._snapToItem && this._snappingPolicy != 0 && this._xPos == 0 && this._yPos == 0)
            this.posChanged(false);
    }

    /**
     * 在滚动过程中动态修改内容尺寸，并修正当前位置。
     * @param deltaWidth 宽度变化量。
     * @param deltaHeight 高度变化量。
     * @param deltaPosX X 方向位置变化量。
     * @param deltaPosY Y 方向位置变化量。
     */
    public changeContentSizeOnScrolling(deltaWidth: number, deltaHeight: number,
        deltaPosX: number, deltaPosY: number): void {
        var isRightmost: boolean = this._xPos == this._overlapSize.x;
        var isBottom: boolean = this._yPos == this._overlapSize.y;

        this._contentSize.x += deltaWidth;
        this._contentSize.y += deltaHeight;
        this.handleSizeChanged();

        if (this._tweening == 1) {
            //如果原来滚动位置是贴边，加入处理继续贴边。
            if (deltaWidth != 0 && isRightmost && this._tweenChange.x < 0) {
                this._xPos = this._overlapSize.x;
                this._tweenChange.x = -this._xPos - this._tweenStart.x;
            }

            if (deltaHeight != 0 && isBottom && this._tweenChange.y < 0) {
                this._yPos = this._overlapSize.y;
                this._tweenChange.y = -this._yPos - this._tweenStart.y;
            }
        }
        else if (this._tweening == 2) {
            //重新调整起始位置，确保能够顺滑滚下去
            if (deltaPosX != 0) {
                this._container.setPosition(this._container.position.x - deltaPosX, this._container.position.y);
                this._tweenStart.x -= deltaPosX;
                this._xPos = -this._container.position.x;
            }
            if (deltaPosY != 0) {
                this._container.setPosition(this._container.position.x, this._container.position.y + deltaPosY);
                this._tweenStart.y -= deltaPosY;
                this._yPos = -(-this._container.position.y);
            }
        }
        else if (this._dragged) {
            if (deltaPosX != 0) {
                this._container.setPosition(this._container.position.x - deltaPosX, this._container.position.y);
                this._containerPos.x -= deltaPosX;
                this._xPos = -this._container.position.x;
            }
            if (deltaPosY != 0) {
                this._container.setPosition(this._container.position.x, this._container.position.y + deltaPosY);
                this._containerPos.y -= deltaPosY;
                this._yPos = -(-this._container.position.y);
            }
        }
        else {
            //如果原来滚动位置是贴边，加入处理继续贴边。
            if (deltaWidth != 0 && isRightmost) {
                this._xPos = this._overlapSize.x;
                this._container.setPosition(-this._xPos, this._container.position.y);
            }

            if (deltaHeight != 0 && isBottom) {
                this._yPos = this._overlapSize.y;
                this._container.setPosition(this._container.position.x, this._yPos);
            }
        }

        if (this._pageMode)
            this.updatePageController();
    }

    /**
     * 在尺寸变化后同步底层节点尺寸、布局和裁剪范围。
     */
    private handleSizeChanged(): void {
        if (this._displayInDemand) {
            this._vScrollNone = this._contentSize.y <= this._viewSize.y;
            this._hScrollNone = this._contentSize.x <= this._viewSize.x;
        }

        if (this._vtScrollBar) {
            if (this._contentSize.y == 0)
                this._vtScrollBar.setDisplayPerc(0);
            else
                this._vtScrollBar.setDisplayPerc(Math.min(1, this._viewSize.y / this._contentSize.y));
        }
        if (this._hzScrollBar) {
            if (this._contentSize.x == 0)
                this._hzScrollBar.setDisplayPerc(0);
            else
                this._hzScrollBar.setDisplayPerc(Math.min(1, this._viewSize.x / this._contentSize.x));
        }

        this.updateScrollBarVisible();

        var maskWidth: number = this._viewSize.x;
        var maskHeight: number = this._viewSize.y;
        if (this._vScrollNone && this._vtScrollBar)
            maskWidth += this._vtScrollBar.width;
        if (this._hScrollNone && this._hzScrollBar)
            maskHeight += this._hzScrollBar.height;
        if (this._dontClipMargin) {
            maskWidth += (this._owner.margin.left + this._owner.margin.right);
            maskHeight += (this._owner.margin.top + this._owner.margin.bottom);
        }
        this._maskContainerUITrans.setContentSize(maskWidth, maskHeight);

        if (this._vtScrollBar)
            this._vtScrollBar.handlePositionChanged();
        if (this._hzScrollBar)
            this._hzScrollBar.handlePositionChanged();
        if (this._header)
            this._header.handlePositionChanged();
        if (this._footer)
            this._footer.handlePositionChanged();

        if (this._scrollType == ScrollType.Horizontal || this._scrollType == ScrollType.Both)
            this._overlapSize.x = Math.ceil(Math.max(0, this._contentSize.x - this._viewSize.x));
        else
            this._overlapSize.x = 0;
        if (this._scrollType == ScrollType.Vertical || this._scrollType == ScrollType.Both)
            this._overlapSize.y = Math.ceil(Math.max(0, this._contentSize.y - this._viewSize.y));
        else
            this._overlapSize.y = 0;

        //边界检查
        this._xPos = math.clamp(this._xPos, 0, this._overlapSize.x);
        this._yPos = math.clamp(this._yPos, 0, this._overlapSize.y);

        var max: number = this._overlapSize[this._refreshBarAxis];
        if (max == 0)
            max = Math.max(this._contentSize[this._refreshBarAxis] + this._footerLockedSize - this._viewSize[this._refreshBarAxis], 0);
        else
            max += this._footerLockedSize;

        if (this._refreshBarAxis == "x")
            this._container.setPosition(math.clamp(this._container.position.x, -max, this._headerLockedSize),
                -math.clamp((-this._container.position.y), -this._overlapSize.y, 0));
        else
            this._container.setPosition(math.clamp(this._container.position.x, -this._overlapSize.x, 0),
                -math.clamp((-this._container.position.y), -max, this._headerLockedSize));

        if (this._header) {
            if (this._refreshBarAxis == "x")
                this._header.height = this._viewSize.y;
            else
                this._header.width = this._viewSize.x;
        }

        if (this._footer) {
            if (this._refreshBarAxis == "y")
                this._footer.height = this._viewSize.y;
            else
                this._footer.width = this._viewSize.x;
        }

        this.updateScrollBarPos();
        if (this._pageMode)
            this.updatePageController();
    }

    /**
     * 标记滚动位置变化，并决定是否触发刷新或缓动。
     * @param ani 是否使用缓动动画。
     */
    private posChanged(ani: boolean): void {
        if (this._aniFlag == 0)
            this._aniFlag = ani ? 1 : -1;
        else if (this._aniFlag == 1 && !ani)
            this._aniFlag = -1;

        this._needRefresh = true;
        if (!director.getScheduler().isScheduled(this.refresh, <any>this))
            this.scheduleOnce(this.refresh);
    }

    /**
     * 刷新滚动位置、滚动条状态与回弹结果。
     * @param dt 调度器回调透传的时间参数。
     */
    private refresh(dt?: number): void {
        this._needRefresh = false;
        this.unschedule(this.refresh);

        if (this._pageMode || this._snapToItem) {
            sEndPos.x = -this._xPos;
            sEndPos.y = -this._yPos;
            this.alignPosition(sEndPos, false);
            this._xPos = -sEndPos.x;
            this._yPos = -sEndPos.y;
        }

        this.refresh2();

        this._owner.node.emit(FUIEvent.SCROLL, this._owner);
        if (this._needRefresh) //在onScroll事件里开发者可能修改位置，这里再刷新一次，避免闪烁
        {
            this._needRefresh = false;
            this.unschedule(this.refresh);

            this.refresh2();
        }

        this.updateScrollBarPos();
        this._aniFlag = 0;
    }

    /**
     * 执行一次完整的滚动状态同步与事件派发。
     */
    private refresh2() {
        if (this._aniFlag == 1 && !this._dragged) {
            var posX: number;
            var posY: number;

            if (this._overlapSize.x > 0)
                posX = -Math.floor(this._xPos);
            else {
                if (this._container.position.x != 0)
                    this._container.setPosition(0, this._container.position.y);
                posX = 0;
            }
            if (this._overlapSize.y > 0)
                posY = -Math.floor(this._yPos);
            else {
                if (this._container.position.y != 0)
                    this._container.setPosition(this._container.position.x, 0);
                posY = 0;
            }

            if (posX != this._container.position.x || posY != (-this._container.position.y)) {
                this._tweenDuration.x = this._tweenDuration.y = this.scrollTweenDuration || TWEEN_TIME_GO;
                this._tweenStart.x = this._container.position.x;
                this._tweenStart.y = (-this._container.position.y);
                this._tweenChange.x = posX - this._tweenStart.x;
                this._tweenChange.y = posY - this._tweenStart.y;
                this.startTween(1);
            }
            else if (this._tweening != 0)
                this.killTween();
        }
        else {
            if (this._tweening != 0)
                this.killTween();

            this._container.setPosition(Math.floor(-this._xPos), -Math.floor(-this._yPos));

            this.loopCheckingCurrent();
        }

        if (this._pageMode)
            this.updatePageController();
    }

    /**
     * 响应触摸开始事件，初始化拖拽判定与速度采样。
     * @param evt 触摸开始事件对象。
     */
    private onTouchBegin(evt: FUIEvent): void {
        if (!this._touchEffect)
            return;

        evt.captureTouch();

        if (this._tweening != 0) {
            this.killTween();
            Decls.GRoot.inst.inputProcessor.cancelClick(evt.touchId);
            this._dragged = true;
        }
        else
            this._dragged = false;

        var pt: Vec2 = this._owner.globalToLocal(evt.pos.x, evt.pos.y, s_vec2);

        this._containerPos.x = this._container.position.x;
        this._containerPos.y = -this._container.position.y;
        this._beginTouchPos.set(pt);
        this._lastTouchPos.set(pt);
        this._lastTouchGlobalPos.set(evt.pos);
        this._isHoldAreaDone = false;
        this._velocity.set(Vec2.ZERO);;
        this._velocityScale = 1;
        this._lastMoveTime = game.totalTime / 1000;
    }

    /**
     * 响应触摸移动事件，更新滚动偏移、速度和回弹检测。
     * @param evt 触摸移动事件对象。
     */
    private onTouchMove(evt: FUIEvent): void {
        if (!isValid(this._owner.node))
            return;

        if (!this._touchEffect)
            return;

        if (GObject.draggingObject && GObject.draggingObject.onStage)
            return;

        if (ScrollPane.draggingPane && ScrollPane.draggingPane != this && ScrollPane.draggingPane._owner.onStage)
            return;

        var pt: Vec2 = this._owner.globalToLocal(evt.pos.x, evt.pos.y, s_vec2);

        var sensitivity: number = UIConfig.touchScrollSensitivity;
        var diff: number, diff2: number;
        var sv: boolean, sh: boolean, st: boolean;

        if (this._scrollType == ScrollType.Vertical) {
            if (!this._isHoldAreaDone) {
                //表示正在监测垂直方向的手势
                _gestureFlag |= 1;

                diff = Math.abs(this._beginTouchPos.y - pt.y);
                if (diff < sensitivity)
                    return;

                if ((_gestureFlag & 2) != 0) //已经有水平方向的手势在监测，那么我们用严格的方式检查是不是按垂直方向移动，避免冲突
                {
                    diff2 = Math.abs(this._beginTouchPos.x - pt.x);
                    if (diff < diff2) //不通过则不允许滚动了
                        return;
                }
            }

            sv = true;
        }
        else if (this._scrollType == ScrollType.Horizontal) {
            if (!this._isHoldAreaDone) {
                _gestureFlag |= 2;

                diff = Math.abs(this._beginTouchPos.x - pt.x);
                if (diff < sensitivity)
                    return;

                if ((_gestureFlag & 1) != 0) {
                    diff2 = Math.abs(this._beginTouchPos.y - pt.y);
                    if (diff < diff2)
                        return;
                }
            }

            sh = true;
        }
        else {
            _gestureFlag = 3;

            if (!this._isHoldAreaDone) {
                diff = Math.abs(this._beginTouchPos.y - pt.y);
                if (diff < sensitivity) {
                    diff = Math.abs(this._beginTouchPos.x - pt.x);
                    if (diff < sensitivity)
                        return;
                }
            }

            sv = sh = true;
        }

        var newPosX: number = Math.floor(this._containerPos.x + pt.x - this._beginTouchPos.x);
        var newPosY: number = Math.floor(this._containerPos.y + pt.y - this._beginTouchPos.y);

        if (sv) {
            if (newPosY > 0) {
                if (!this._bouncebackEffect)
                    this._container.setPosition(this._container.position.x, 0);
                else if (this._header && this._header.maxHeight != 0)
                    this._container.setPosition(this._container.position.x, - Math.floor(Math.min(newPosY * 0.5, this._header.maxHeight)));
                else
                    this._container.setPosition(this._container.position.x, - Math.floor(Math.min(newPosY * 0.5, this._viewSize.y * PULL_RATIO)));
            }
            else if (newPosY < -this._overlapSize.y) {
                if (!this._bouncebackEffect)
                    this._container.setPosition(this._container.position.x, this._overlapSize.y);
                else if (this._footer && this._footer.maxHeight > 0)
                    this._container.setPosition(this._container.position.x, - Math.floor(Math.max((newPosY + this._overlapSize.y) * 0.5, -this._footer.maxHeight) - this._overlapSize.y));
                else
                    this._container.setPosition(this._container.position.x, - Math.floor(Math.max((newPosY + this._overlapSize.y) * 0.5, -this._viewSize.y * PULL_RATIO) - this._overlapSize.y));
            }
            else
                this._container.setPosition(this._container.position.x, - newPosY);
        }

        if (sh) {
            if (newPosX > 0) {
                if (!this._bouncebackEffect)
                    this._container.setPosition(0, this._container.position.y);
                else if (this._header && this._header.maxWidth != 0)
                    this._container.setPosition(Math.floor(Math.min(newPosX * 0.5, this._header.maxWidth)), this._container.position.y);
                else
                    this._container.setPosition(Math.floor(Math.min(newPosX * 0.5, this._viewSize.x * PULL_RATIO)), this._container.position.y);
            }
            else if (newPosX < 0 - this._overlapSize.x) {
                if (!this._bouncebackEffect)
                    this._container.setPosition(-this._overlapSize.x, this._container.position.y);
                else if (this._footer && this._footer.maxWidth > 0)
                    this._container.setPosition(Math.floor(Math.max((newPosX + this._overlapSize.x) * 0.5, -this._footer.maxWidth) - this._overlapSize.x), this._container.position.y);
                else
                    this._container.setPosition(Math.floor(Math.max((newPosX + this._overlapSize.x) * 0.5, -this._viewSize.x * PULL_RATIO) - this._overlapSize.x), this._container.position.y);
            }
            else
                this._container.setPosition(newPosX, this._container.position.y);
        }


        //更新速度
        var now: number = game.totalTime / 1000;
        var deltaTime: number = Math.max(now - this._lastMoveTime, 1 / 60);
        var deltaPositionX: number = pt.x - this._lastTouchPos.x;
        var deltaPositionY: number = pt.y - this._lastTouchPos.y;
        if (!sh)
            deltaPositionX = 0;
        if (!sv)
            deltaPositionY = 0;
        if (deltaTime != 0) {
            var frameRate: number = 60;
            var elapsed: number = deltaTime * frameRate - 1;
            if (elapsed > 1) //速度衰减
            {
                var factor: number = Math.pow(0.833, elapsed);
                this._velocity.x = this._velocity.x * factor;
                this._velocity.y = this._velocity.y * factor;
            }
            this._velocity.x = math.lerp(this._velocity.x, deltaPositionX * 60 / frameRate / deltaTime, deltaTime * 10);
            this._velocity.y = math.lerp(this._velocity.y, deltaPositionY * 60 / frameRate / deltaTime, deltaTime * 10);
        }

        /*速度计算使用的是本地位移，但在后续的惯性滚动判断中需要用到屏幕位移，所以这里要记录一个位移的比例。
        */
        var deltaGlobalPositionX: number = this._lastTouchGlobalPos.x - evt.pos.x;
        var deltaGlobalPositionY: number = this._lastTouchGlobalPos.y - evt.pos.y;
        if (deltaPositionX != 0)
            this._velocityScale = Math.abs(deltaGlobalPositionX / deltaPositionX);
        else if (deltaPositionY != 0)
            this._velocityScale = Math.abs(deltaGlobalPositionY / deltaPositionY);

        this._lastTouchPos.set(pt);
        this._lastTouchGlobalPos.set(evt.pos);
        this._lastMoveTime = now;

        //同步更新pos值
        if (this._overlapSize.x > 0)
            this._xPos = math.clamp(-this._container.position.x, 0, this._overlapSize.x);
        if (this._overlapSize.y > 0)
            this._yPos = math.clamp(-(-this._container.position.y), 0, this._overlapSize.y);

        //循环滚动特别检查
        if (this._loop != 0) {
            newPosX = this._container.position.x;
            newPosY = (-this._container.position.y);
            if (this.loopCheckingCurrent()) {
                this._containerPos.x += this._container.position.x - newPosX;
                this._containerPos.y += (-this._container.position.y) - newPosY;
            }
        }

        ScrollPane.draggingPane = this;
        this._isHoldAreaDone = true;
        this._dragged = true;

        this.updateScrollBarPos();
        this.updateScrollBarVisible();
        if (this._pageMode)
            this.updatePageController();

        this._owner.node.emit(FUIEvent.SCROLL);
    }

    /**
     * 响应触摸结束事件，计算惯性目标并启动后续缓动。
     * @param evt 触摸结束事件对象。
     */
    private onTouchEnd(evt: FUIEvent): void {
        if (ScrollPane.draggingPane == this)
            ScrollPane.draggingPane = null;

        _gestureFlag = 0;

        if (!this._dragged || !this._touchEffect || !this._owner.node.activeInHierarchy) {
            this._dragged = false;
            return;
        }

        this._dragged = false;

        this._tweenStart.x = this._container.position.x;
        this._tweenStart.y = -this._container.position.y;

        sEndPos.set(this._tweenStart);
        var flag: boolean = false;
        if (this._container.position.x > 0) {
            sEndPos.x = 0;
            flag = true;
        }
        else if (this._container.position.x < -this._overlapSize.x) {
            sEndPos.x = -this._overlapSize.x;
            flag = true;
        }
        if ((-this._container.position.y) > 0) {
            sEndPos.y = 0;
            flag = true;
        }
        else if ((-this._container.position.y) < -this._overlapSize.y) {
            sEndPos.y = -this._overlapSize.y;
            flag = true;
        }
        if (flag) {
            this._tweenChange.x = sEndPos.x - this._tweenStart.x;
            this._tweenChange.y = sEndPos.y - this._tweenStart.y;
            if (this._tweenChange.x < -UIConfig.touchDragSensitivity || this._tweenChange.y < -UIConfig.touchDragSensitivity) {
                this._refreshEventDispatching = true;
                this._owner.node.emit(FUIEvent.PULL_DOWN_RELEASE), this._owner;
                this._refreshEventDispatching = false;
            }
            else if (this._tweenChange.x > UIConfig.touchDragSensitivity || this._tweenChange.y > UIConfig.touchDragSensitivity) {
                this._refreshEventDispatching = true;
                this._owner.node.emit(FUIEvent.PULL_UP_RELEASE, this._owner);
                this._refreshEventDispatching = false;
            }

            if (this._headerLockedSize > 0 && sEndPos[this._refreshBarAxis] == 0) {
                sEndPos[this._refreshBarAxis] = this._headerLockedSize;
                this._tweenChange.x = sEndPos.x - this._tweenStart.x;
                this._tweenChange.y = sEndPos.y - this._tweenStart.y;
            }
            else if (this._footerLockedSize > 0 && sEndPos[this._refreshBarAxis] == -this._overlapSize[this._refreshBarAxis]) {
                var max: number = this._overlapSize[this._refreshBarAxis];
                if (max == 0)
                    max = Math.max(this._contentSize[this._refreshBarAxis] + this._footerLockedSize - this._viewSize[this._refreshBarAxis], 0);
                else
                    max += this._footerLockedSize;
                sEndPos[this._refreshBarAxis] = -max;
                this._tweenChange.x = sEndPos.x - this._tweenStart.x;
                this._tweenChange.y = sEndPos.y - this._tweenStart.y;
            }

            this._tweenDuration.x = this._tweenDuration.y = TWEEN_TIME_DEFAULT;
        }
        else {
            //更新速度
            if (!this._inertiaDisabled) {
                var frameRate: number = 60;
                var elapsed: number = (game.totalTime / 1000 - this._lastMoveTime) * frameRate - 1;
                if (elapsed > 1) {
                    var factor: number = Math.pow(0.833, elapsed);
                    this._velocity.x = this._velocity.x * factor;
                    this._velocity.y = this._velocity.y * factor;
                }
                //根据速度计算目标位置和需要时间
                this.updateTargetAndDuration(this._tweenStart, sEndPos);
            }
            else
                this._tweenDuration.x = this._tweenDuration.y = TWEEN_TIME_DEFAULT;
            sOldChange.x = sEndPos.x - this._tweenStart.x;
            sOldChange.y = sEndPos.y - this._tweenStart.y;

            //调整目标位置
            this.loopCheckingTarget(sEndPos);
            if (this._pageMode || this._snapToItem)
                this.alignPosition(sEndPos, true);

            this._tweenChange.x = sEndPos.x - this._tweenStart.x;
            this._tweenChange.y = sEndPos.y - this._tweenStart.y;
            if (this._tweenChange.x == 0 && this._tweenChange.y == 0) {
                this.updateScrollBarVisible();
                return;
            }

            //如果目标位置已调整，随之调整需要时间
            if (this._pageMode || this._snapToItem) {
                this.fixDuration("x", sOldChange.x);
                this.fixDuration("y", sOldChange.y);
            }
        }

        this.startTween(2);
    }

    /**
     * 响应鼠标移入滚动区域事件。
     */
    private onRollOver(): void {
        this._hover = true;
        this.updateScrollBarVisible();
    }

    /**
     * 响应鼠标移出滚动区域事件。
     */
    private onRollOut(): void {
        this._hover = false;
        this.updateScrollBarVisible();
    }

    /**
     * 响应鼠标滚轮输入，并按方向推动内容滚动。
     * @param evt 鼠标滚轮事件对象。
     */
    private onMouseWheel(evt: FUIEvent) {
        if (!this._mouseWheelEnabled)
            return;

        let delta = evt.mouseWheelDelta > 0 ? -1 : 1;
        if (this._overlapSize.x > 0 && this._overlapSize.y == 0) {
            if (this._pageMode)
                this.setPosX(this._xPos + this._pageSize.x * delta, false);
            else
                this.setPosX(this._xPos + this._mouseWheelStep * delta, false);
        }
        else {
            if (this._pageMode)
                this.setPosY(this._yPos + this._pageSize.y * delta, false);
            else
                this.setPosY(this._yPos + this._mouseWheelStep * delta, false);
        }
    }

    /**
     * 同步滚动条滑块位置与可视比例。
     */
    private updateScrollBarPos(): void {
        if (this._vtScrollBar)
            this._vtScrollBar.setScrollPerc(this._overlapSize.y == 0 ? 0 : math.clamp(this._container.position.y, 0, this._overlapSize.y) / this._overlapSize.y);

        if (this._hzScrollBar)
            this._hzScrollBar.setScrollPerc(this._overlapSize.x == 0 ? 0 : math.clamp(-this._container.position.x, 0, this._overlapSize.x) / this._overlapSize.x);

        this.checkRefreshBar();
    }

    /**
     * 根据悬停状态和滚动需求更新滚动条显隐。
     */
    public updateScrollBarVisible(): void {
        if (this._vtScrollBar) {
            if (this._viewSize.y <= this._vtScrollBar.minSize || this._vScrollNone)
                this._vtScrollBar.node.active = false;
            else
                this.updateScrollBarVisible2(this._vtScrollBar);
        }

        if (this._hzScrollBar) {
            if (this._viewSize.x <= this._hzScrollBar.minSize || this._hScrollNone)
                this._hzScrollBar.node.active = false;
            else
                this.updateScrollBarVisible2(this._hzScrollBar);
        }
    }

    /**
     * 重新计算并同步滚动BarVisible2相关结果。
     * @param bar 目标滚动条对象。
     */
    private updateScrollBarVisible2(bar: GScrollBar): void {
        if (this._scrollBarDisplayAuto)
            GTween.kill(bar, false, "alpha");

        if (this._scrollBarDisplayAuto && !this._hover && this._tweening == 0 && !this._dragged && !bar.gripDragging) {
            if (bar.node.active)
                GTween.to(1, 0, 0.5).setDelay(0.5).onComplete(this.__barTweenComplete, this).setTarget(bar, "alpha");
        }
        else {
            bar.alpha = 1;
            bar.node.active = true;
        }
    }

    /**
     * 处理滚动条Tween Complete。
     */
    private __barTweenComplete(tweener: GTweener): void {
        var bar: GObject = <GObject>(tweener.target);
        bar.alpha = 1;
        bar.node.active = false;
    }

    /**
     * 返回循环滚动模式下单个重复区段的尺寸。
     */
    private getLoopPartSize(division: number, axis: AxisType): number {
        return (this._contentSize[axis] + (axis == "x" ? (<GList><any>this._owner).columnGap : (<GList><any>this._owner).lineGap)) / division;
    }

    /**
     * 在循环滚动模式下修正当前位置。
     */
    private loopCheckingCurrent(): boolean {
        var changed: boolean = false;
        if (this._loop == 1 && this._overlapSize.x > 0) {
            if (this._xPos < 0.001) {
                this._xPos += this.getLoopPartSize(2, "x");
                changed = true;
            }
            else if (this._xPos >= this._overlapSize.x) {
                this._xPos -= this.getLoopPartSize(2, "x");
                changed = true;
            }
        }
        else if (this._loop == 2 && this._overlapSize.y > 0) {
            if (this._yPos < 0.001) {
                this._yPos += this.getLoopPartSize(2, "y");
                changed = true;
            }
            else if (this._yPos >= this._overlapSize.y) {
                this._yPos -= this.getLoopPartSize(2, "y");
                changed = true;
            }
        }

        if (changed) {
            this._container.setPosition(Math.floor(-this._xPos), -Math.floor(-this._yPos));
        }

        return changed;
    }

    /**
     * 在循环滚动模式下修正目标位置。
     * @param endPos 目标位置。
     */
    private loopCheckingTarget(endPos: Vec2): void {
        if (this._loop == 1)
            this.loopCheckingTarget2(endPos, "x");

        if (this._loop == 2)
            this.loopCheckingTarget2(endPos, "y");
    }

    /**
     * 在循环滚动模式下修正目标位置。
     * @param endPos 目标位置。
     * @param axis 目标轴向。
     */
    private loopCheckingTarget2(endPos: Vec2, axis: AxisType): void {
        var halfSize: number;
        var tmp: number;
        if (endPos[axis] > 0) {
            halfSize = this.getLoopPartSize(2, axis);
            tmp = this._tweenStart[axis] - halfSize;
            if (tmp <= 0 && tmp >= -this._overlapSize[axis]) {
                endPos[axis] -= halfSize;
                this._tweenStart[axis] = tmp;
            }
        }
        else if (endPos[axis] < -this._overlapSize[axis]) {
            halfSize = this.getLoopPartSize(2, axis);
            tmp = this._tweenStart[axis] + halfSize;
            if (tmp <= 0 && tmp >= -this._overlapSize[axis]) {
                endPos[axis] += halfSize;
                this._tweenStart[axis] = tmp;
            }
        }
    }

    /**
     * 在循环滚动模式下修正新位置结果。
     * @param value 新位置值。
     * @param axis 目标轴向。
     * @returns 修正后的新位置值。
     */
    private loopCheckingNewPos(value: number, axis: AxisType): number {
        if (this._overlapSize[axis] == 0)
            return value;

        var pos: number = axis == "x" ? this._xPos : this._yPos;
        var changed: boolean = false;
        var v: number;
        if (value < 0.001) {
            value += this.getLoopPartSize(2, axis);
            if (value > pos) {
                v = this.getLoopPartSize(6, axis);
                v = Math.ceil((value - pos) / v) * v;
                pos = math.clamp(pos + v, 0, this._overlapSize[axis]);
                changed = true;
            }
        }
        else if (value >= this._overlapSize[axis]) {
            value -= this.getLoopPartSize(2, axis);
            if (value < pos) {
                v = this.getLoopPartSize(6, axis);
                v = Math.ceil((pos - value) / v) * v;
                pos = math.clamp(pos - v, 0, this._overlapSize[axis]);
                changed = true;
            }
        }

        if (changed) {
            if (axis == "x")
                this._container.setPosition(-Math.floor(pos), this._container.position.y);
            else
                this._container.setPosition(this._container.position.x, Math.floor(pos));
        }

        return value;
    }

    /**
     * 根据分页或吸附规则对齐滚动目标位置。
     * @param pos 目标位置。
     * @param inertialScrolling 是否为惯性滚动。
     */
    private alignPosition(pos: Vec2, inertialScrolling: boolean): void {
        let ax: number = 0, ay: number = 0;
        if (this._snappingPolicy == 1) {
            if (this._owner.numChildren > 0) {
                //assume all children are same size
                let obj = this._owner.getChildAt(0);
                ax = Math.floor(this._viewSize.x * 0.5 - obj.width * 0.5);
                ay = Math.floor(this._viewSize.y * 0.5 - obj.height * 0.5);
            }
        }
        else if (this._snappingPolicy == 2) {
            if (this._owner.numChildren > 0) {
                //assume all children are same size
                let obj = this._owner.getChildAt(0);
                ax = Math.floor(this._viewSize.x - obj.width);
                ay = Math.floor(this._viewSize.y - obj.height);
            }
        }

        pos.x -= ax;
        pos.y -= ay;
        if (this._pageMode) {
            pos.x = this.alignByPage(pos.x, "x", inertialScrolling);
            pos.y = this.alignByPage(pos.y, "y", inertialScrolling);
        }
        else if (this._snapToItem) {
            var pt: Vec2 = this._owner.getSnappingPosition(-pos.x, -pos.y, s_vec2);
            if (pos.x < 0 && pos.x > -this._overlapSize.x)
                pos.x = -pt.x;
            if (pos.y < 0 && pos.y > -this._overlapSize.y)
                pos.y = -pt.y;
        }
        pos.x += ax;
        pos.y += ay;
    }

    /**
     * 按页模式对齐指定坐标。
     * @param pos 目标坐标。
     * @param axis 目标轴向。
     * @param inertialScrolling 是否为惯性滚动。
     * @returns 对齐后的坐标。
     */
    private alignByPage(pos: number, axis: AxisType, inertialScrolling: boolean): number {
        var page: number;

        if (pos > 0)
            page = 0;
        else if (pos < -this._overlapSize[axis])
            page = Math.ceil(this._contentSize[axis] / this._pageSize[axis]) - 1;
        else {
            page = Math.floor(-pos / this._pageSize[axis]);
            var change: number = inertialScrolling ? (pos - this._containerPos[axis]) : (pos - (axis == "x" ? this._container.position.x : (-this._container.position.y)));
            var testPageSize: number = Math.min(this._pageSize[axis], this._contentSize[axis] - (page + 1) * this._pageSize[axis]);
            var delta: number = -pos - page * this._pageSize[axis];

            //页面吸附策略
            if (Math.abs(change) > this._pageSize[axis])//如果滚动距离超过1页,则需要超过页面的一半，才能到更下一页
            {
                if (delta > testPageSize * 0.5)
                    page++;
            }
            else //否则只需要页面的1/3，当然，需要考虑到左移和右移的情况
            {
                if (delta > testPageSize * (change < 0 ? 0.3 : 0.7))
                    page++;
            }

            //重新计算终点
            pos = -page * this._pageSize[axis];
            if (pos < -this._overlapSize[axis]) //最后一页未必有pageSize那么大
                pos = -this._overlapSize[axis];
        }

        //惯性滚动模式下，会增加判断尽量不要滚动超过一页
        if (inertialScrolling) {
            var oldPos: number = this._tweenStart[axis];
            var oldPage: number;
            if (oldPos > 0)
                oldPage = 0;
            else if (oldPos < -this._overlapSize[axis])
                oldPage = Math.ceil(this._contentSize[axis] / this._pageSize[axis]) - 1;
            else
                oldPage = Math.floor(-oldPos / this._pageSize[axis]);
            var startPage: number = Math.floor(-this._containerPos[axis] / this._pageSize[axis]);
            if (Math.abs(page - startPage) > 1 && Math.abs(oldPage - startPage) <= 1) {
                if (page > startPage)
                    page = startPage + 1;
                else
                    page = startPage - 1;
                pos = -page * this._pageSize[axis];
            }
        }

        return pos;
    }

    /**
     * 根据当前速度、边界和分页规则统一修正滚动目标位置与补间时长。
     * @param orignPos 原始位置。
     * @param resultPos 结果位置。
     */
    private updateTargetAndDuration(orignPos: Vec2, resultPos: Vec2): void {
        resultPos.x = this.updateTargetAndDuration2(orignPos.x, "x");
        resultPos.y = this.updateTargetAndDuration2(orignPos.y, "y");
    }

    /**
     * 按单轴规则修正滚动目标位置，并回算该轴所需补间时长。
     * @param pos 原始位置值。
     * @param axis 目标轴向。
     * @returns 修正后的目标位置值。
     */
    private updateTargetAndDuration2(pos: number, axis: AxisType): number {
        var v: number = this._velocity[axis];
        var duration: number = 0;
        if (pos > 0)
            pos = 0;
        else if (pos < -this._overlapSize[axis])
            pos = -this._overlapSize[axis];
        else {
            //以屏幕像素为基准
            var isMobile: boolean = sys.isMobile;
            var v2: number = Math.abs(v) * this._velocityScale;
            const winSize = screen.windowSize;
            //在移动设备上，需要对不同分辨率做一个适配，我们的速度判断以1136分辨率为基准
            if (isMobile)
                v2 *= 1136 / Math.max(winSize.width, winSize.height);
            //这里有一些阈值的处理，因为在低速内，不希望产生较大的滚动（甚至不滚动）
            var ratio: number = 0;

            if (this._pageMode || !isMobile) {
                if (v2 > 500)
                    ratio = Math.pow((v2 - 500) / 500, 2);
            }
            else {
                if (v2 > 1000)
                    ratio = Math.pow((v2 - 1000) / 1000, 2);
            }
            if (ratio != 0) {
                if (ratio > 1)
                    ratio = 1;

                v2 *= ratio;
                v *= ratio;
                this._velocity[axis] = v;

                //算法：v*（this._decelerationRate的n次幂）= 60，即在n帧后速度降为60（假设每秒60帧）。
                duration = Math.log(60 / v2) / Math.log(this._decelerationRate) / 60;

                //计算距离要使用本地速度
                //理论公式貌似滚动的距离不够，改为经验公式
                //var change:number = (v/ 60 - 1) / (1 - this._decelerationRate);
                var change: number = Math.floor(v * duration * 0.4);
                pos += change;
            }
        }

        if (duration < TWEEN_TIME_DEFAULT)
            duration = TWEEN_TIME_DEFAULT;
        this._tweenDuration[axis] = duration;

        return pos;
    }

    /**
     * 根据目标距离修正补间持续时间。
     * @param axis 目标轴向。
     * @param oldChange 旧变化量。
     */
    private fixDuration(axis: AxisType, oldChange: number): void {
        if (this._tweenChange[axis] == 0 || Math.abs(this._tweenChange[axis]) >= Math.abs(oldChange))
            return;

        var newDuration: number = Math.abs(this._tweenChange[axis] / oldChange) * this._tweenDuration[axis];
        if (newDuration < TWEEN_TIME_DEFAULT)
            newDuration = TWEEN_TIME_DEFAULT;

        this._tweenDuration[axis] = newDuration;
    }

    /**
     * 启动当前滚动补间动画。
     * @param type 补间类型标记。
     */
    private startTween(type: number): void {
        this._tweenTime.set(Vec2.ZERO);
        this._tweening = type;
        this.updateScrollBarVisible();
    }

    /**
     * 终止当前滚动补间动画。
     */
    private killTween(): void {
        if (this._tweening == 1) //取消类型为1的tween需立刻设置到终点
        {
            this._container.setPosition(this._tweenStart.x + this._tweenChange.x, -(this._tweenStart.y + this._tweenChange.y));
            this._owner.node.emit(FUIEvent.SCROLL, this._owner);
        }

        this._tweening = 0;

        this.updateScrollBarVisible();

        this._owner.node.emit(FUIEvent.SCROLL_END, this._owner);
    }

    /**
     * 检查`RefreshBar`条件，并在需要时修正状态。
     */
    private checkRefreshBar(): void {
        if (this._header == null && this._footer == null)
            return;

        var pos: number = (this._refreshBarAxis == "x" ? this._container.position.x : (-this._container.position.y));
        if (this._header) {
            if (pos > 0) {
                this._header.node.active = true;
                var pt: Vec2 = s_vec2;
                pt.x = this._header.width;
                pt.y = this._header.height;
                pt[this._refreshBarAxis] = pos;
                this._header.setSize(pt.x, pt.y);
            }
            else {
                this._header.node.active = false;
            }
        }

        if (this._footer) {
            var max: number = this._overlapSize[this._refreshBarAxis];
            if (pos < -max || max == 0 && this._footerLockedSize > 0) {
                this._footer.node.active = true;

                pt = s_vec2;
                pt.x = this._footer.x;
                pt.y = this._footer.y;
                if (max > 0)
                    pt[this._refreshBarAxis] = pos + this._contentSize[this._refreshBarAxis];
                else
                    pt[this._refreshBarAxis] = Math.max(Math.min(pos + this._viewSize[this._refreshBarAxis], this._viewSize[this._refreshBarAxis] - this._footerLockedSize),
                        this._viewSize[this._refreshBarAxis] - this._contentSize[this._refreshBarAxis]);
                this._footer.setPosition(pt.x, pt.y);

                pt.x = this._footer.width;
                pt.y = this._footer.height;
                if (max > 0)
                    pt[this._refreshBarAxis] = -max - pos;
                else
                    pt[this._refreshBarAxis] = this._viewSize[this._refreshBarAxis] - this._footer[this._refreshBarAxis];
                this._footer.setSize(pt.x, pt.y);
            }
            else {
                this._footer.node.active = false;
            }
        }
    }

    /**
     * 刷新当前对象的显示结果或内部状态。
     * @param dt 本帧时间增量。
     */
    protected update(dt: number): boolean {
        if (this._tweening == 0)
            return;

        var nx: number = this.runTween("x", dt);
        var ny: number = this.runTween("y", dt);

        this._container.setPosition(nx, -ny);

        if (this._tweening == 2) {
            if (this._overlapSize.x > 0)
                this._xPos = math.clamp(-nx, 0, this._overlapSize.x);
            if (this._overlapSize.y > 0)
                this._yPos = math.clamp(-ny, 0, this._overlapSize.y);

            if (this._pageMode)
                this.updatePageController();
        }

        if (this._tweenChange.x == 0 && this._tweenChange.y == 0) {
            this._tweening = 0;

            this.loopCheckingCurrent();

            this.updateScrollBarPos();
            this.updateScrollBarVisible();

            this._owner.node.emit(FUIEvent.SCROLL, this._owner);
            this._owner.node.emit(FUIEvent.SCROLL_END, this._owner);
        }
        else {
            this.updateScrollBarPos();
            this._owner.node.emit(FUIEvent.SCROLL, this._owner);
        }

        return true;
    }

    /**
     * 推进指定轴向的滚动补间计算。
     * @param axis 目标轴向。
     * @param dt 本帧时间增量。
     * @returns 当前轴向的新位置值。
     */
    private runTween(axis: AxisType, dt: number): number {
        var newValue: number;
        if (this._tweenChange[axis] != 0) {
            this._tweenTime[axis] += dt;
            if (this._tweenTime[axis] >= this._tweenDuration[axis]) {
                newValue = this._tweenStart[axis] + this._tweenChange[axis];
                this._tweenChange[axis] = 0;
            }
            else {
                var ratio: number = easeFunc(this._tweenTime[axis], this._tweenDuration[axis]);
                newValue = this._tweenStart[axis] + Math.floor(this._tweenChange[axis] * ratio);
            }

            var threshold1: number = 0;
            var threshold2: number = -this._overlapSize[axis];
            if (this._headerLockedSize > 0 && this._refreshBarAxis == axis)
                threshold1 = this._headerLockedSize;
            if (this._footerLockedSize > 0 && this._refreshBarAxis == axis) {
                var max: number = this._overlapSize[this._refreshBarAxis];
                if (max == 0)
                    max = Math.max(this._contentSize[this._refreshBarAxis] + this._footerLockedSize - this._viewSize[this._refreshBarAxis], 0);
                else
                    max += this._footerLockedSize;
                threshold2 = -max;
            }

            if (this._tweening == 2 && this._bouncebackEffect) {
                if (newValue > 20 + threshold1 && this._tweenChange[axis] > 0
                    || newValue > threshold1 && this._tweenChange[axis] == 0)//开始回弹
                {
                    this._tweenTime[axis] = 0;
                    this._tweenDuration[axis] = TWEEN_TIME_DEFAULT;
                    this._tweenChange[axis] = -newValue + threshold1;
                    this._tweenStart[axis] = newValue;
                }
                else if (newValue < threshold2 - 20 && this._tweenChange[axis] < 0
                    || newValue < threshold2 && this._tweenChange[axis] == 0)//开始回弹
                {
                    this._tweenTime[axis] = 0;
                    this._tweenDuration[axis] = TWEEN_TIME_DEFAULT;
                    this._tweenChange[axis] = threshold2 - newValue;
                    this._tweenStart[axis] = newValue;
                }
            }
            else {
                if (newValue > threshold1) {
                    newValue = threshold1;
                    this._tweenChange[axis] = 0;
                }
                else if (newValue < threshold2) {
                    newValue = threshold2;
                    this._tweenChange[axis] = 0;
                }
            }
        }
        else
            newValue = (axis == "x" ? this._container.position.x : (-this._container.position.y));

        return newValue;
    }
}

var _gestureFlag: number = 0;

const TWEEN_TIME_GO: number = 0.5; //调用SetPos(ani)时使用的缓动时间
const TWEEN_TIME_DEFAULT: number = 0.3; //惯性滚动的最小缓动时间
const PULL_RATIO: number = 0.5; //下拉过顶或者上拉过底时允许超过的距离占显示区域的比例

var s_vec2: Vec2 = new Vec2();
var s_rect: Rect = new Rect();
var sEndPos: Vec2 = new Vec2();
var sOldChange: Vec2 = new Vec2();

function easeFunc(t: number, d: number): number {
    return (t = t / d - 1) * t * t + 1;//cubicOut
}
