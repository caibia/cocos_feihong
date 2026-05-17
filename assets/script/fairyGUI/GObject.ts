import { Vec2, Rect, Component, director, Node, UITransform, UIOpacity, Vec3 } from "cc";
import { Controller } from "./Controller";
import { BlendMode, BlendModeUtils } from "./display/BlendMode";
import { FEvent as FUIEvent } from "./event/Event";
import { RelationType, ObjectPropID } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GearAnimation } from "./gears/GearAnimation";
import { GearBase } from "./gears/GearBase";
import { GearColor } from "./gears/GearColor";
import { GearDisplay } from "./gears/GearDisplay";
import { GearDisplay2 } from "./gears/GearDisplay2";
import { GearFontSize } from "./gears/GearFontSize";
import { GearIcon } from "./gears/GearIcon";
import { GearLook } from "./gears/GearLook";
import { GearSize } from "./gears/GearSize";
import { GearText } from "./gears/GearText";
import { GearXY } from "./gears/GearXY";
// 注：TypeScript模块化不允许循环引用，所以这里不能引入GGroup，只能用抛弃类型信息的方式去实现这些代码了
// import { GGroup } from "./GGroup";
import { GTreeNode } from "./GTreeNode";
import { PackageItem } from "./PackageItem";
import { Relations } from "./Relations";
import { UIConfig } from "./UIConfig";
import { ByteBuffer } from "./utils/ByteBuffer";
import Extend from "../base/extend/Extend";

/**
 * 所有 FairyGUI 显示对象的基类，统一管理节点、尺寸、关系、Gear 与交互状态。
 */
export class GObject {
    /** FairyGUI 中挂载的自定义业务数据 */
    public data?: any;
    /**
     * 对象池复用标识；来自 `GObjectPool` 时用于记录原始资源键。
     */
    public poolKey?: string;
    /**
     * 当前对象关联的包资源项；从编辑器导出资源构建时会回填该值。
     */
    public packageItem?: PackageItem;
    /**
     * 当前全局正在被拖拽的对象；同一时刻只允许一个拖拽源生效。
     */
    public static draggingObject: GObject | null;

    /**
     * 逻辑 X 坐标；与底层节点位置保持同步，并参与关系系统和 GearXY 计算。
     */
    protected _x: number = 0;
    /**
     * 逻辑 Y 坐标；与底层节点位置保持同步，并参与关系系统和 GearXY 计算。
     */
    protected _y: number = 0;
    /**
     * 逻辑透明度；最终通过 `UIOpacity` 写到底层节点。
     */
    protected _alpha: number = 1;
    /**
     * 对外可见开关；会与控制器、父级可见性和 GearDisplay 共同决定最终显示结果。
     */
    protected _visible: boolean = true;
    /**
     * 是否允许接收输入事件；禁用后对象仍可显示，但不会继续参与交互处理。
     */
    protected _touchable: boolean = true;
    /**
     * 灰化标记；子类会据此切换自身到不可用视觉表现。
     */
    protected _grayed?: boolean;
    /**
     * 是否启用拖拽能力；开启后会注册拖拽相关输入监听。
     */
    protected _draggable?: boolean;
    /**
     * 水平方向倾斜角。
     */
    protected _skewX: number = 0;
    /**
     * 垂直方向倾斜角。
     */
    protected _skewY: number = 0;
    /**
     * 是否把枢轴点当作锚点；影响对象平移、旋转与缩放的参考点。
     */
    protected _pivotAsAnchor?: boolean;
    /**
     * 在父组件中的排序优先级；用于插入排序子对象时决定前后关系。
     */
    protected _sortingOrder: number = 0;
    /**
     * 关系系统、分组和构建阶段计算后的内部可见状态。
     */
    protected _internalVisible: boolean = true;
    /**
     * 控制器切页时的保护标记，避免属性回写再次触发控制器联动。
     */
    protected _handlingController?: boolean;
    /**
     * 当前对象的提示文本；鼠标移入时通常由 `GRoot` 统一展示。
     */
    protected _tooltips?: string;
    /**
     * 当前对象使用的混合模式；会映射到底层材质或渲染状态。
     */
    protected _blendMode: BlendMode;
    /**
     * 是否把最终位置吸附到像素边界，以减轻 UI 在缩放和位移时的模糊。
     */
    protected _pixelSnapping?: boolean;
    /**
     * 拖拽判定中的中间状态；按下后尚未正式进入拖动前会先保持为真。
     */
    protected _dragTesting?: boolean;
    /**
     * 拖拽开始时记录的全局触点位置，用于判断是否越过拖拽阈值。
     */
    protected _dragStartPos?: Vec2;

    /**
     * 关系管理器；负责维护当前对象与其他对象之间的位置尺寸约束。
     */
    protected _relations: Relations;
    /**
     * 所属分组；分组会统一影响成员布局、透明度和可见性。
     */
    protected _group: any | null;
    /**
     * 当前对象已创建的 Gear 实例列表；不同索引承载不同联动能力。
     */
    protected _gears: GearBase[];
    /**
     * 对应的底层 Cocos 节点；所有显示和输入最终都落在该节点上。
     */
    protected _node: Node;
    /**
     * 拖拽可活动矩形边界；设置后对象拖动时会被限制在该范围内。
     */
    protected _dragBounds?: Rect;

    /**
     * 资源原始宽度；来自包资源或外部资源本身，不受缩放和布局影响。
     */
    public sourceWidth: number = 0;
    /**
     * 资源原始高度；来自包资源或外部资源本身，不受缩放和布局影响。
     */
    public sourceHeight: number = 0;
    /**
     * 对象初始宽度；常作为重置和默认布局时的参考值。
     */
    public initWidth: number = 0;
    /**
     * 对象初始高度；常作为重置和默认布局时的参考值。
     */
    public initHeight: number = 0;
    /**
     * 允许设置的最小宽度限制。
     */
    public minWidth: number = 0;
    /**
     * 允许设置的最小高度限制。
     */
    public minHeight: number = 0;
    /**
     * 允许设置的最大宽度限制。
     */
    public maxWidth: number = 0;
    /**
     * 允许设置的最大高度限制。
     */
    public maxHeight: number = 0;

    /**
     * 当前所属父组件；为 `null` 时表示对象尚未挂入 FairyGUI 树。
     */
    public _parent: GComponent | null;
    /**
     * 当前逻辑宽度；可能与资源原始宽度不同。
     */
    public _width: number = 0;
    /**
     * 当前逻辑高度；可能与资源原始高度不同。
     */
    public _height: number = 0;
    /**
     * 最近一次原始宽度值；用于尺寸变化时做关系和缩放补偿。
     */
    public _rawWidth: number = 0;
    /**
     * 最近一次原始高度值；用于尺寸变化时做关系和缩放补偿。
     */
    public _rawHeight: number = 0;
    /**
     * FairyGUI 对象唯一标识；默认取底层节点的 `uuid`。
     */
    public _id: string;
    /**
     * 对象名称；用于编辑器查找、路径访问和业务层绑定。
     */
    public _name: string;
    /**
     * 构建保护标记；对象从包数据创建期间会临时抑制部分联动逻辑。
     */
    public _underConstruct: boolean = false;
    /**
     * Gear 回写保护标记；避免 Gear 应用属性时又触发新的 Gear 更新。
     */
    public _gearLocked?: boolean;
    /**
     * 在分组自动布局中的尺寸占比缓存，用于分配剩余空间。
     */
    public _sizePercentInGroup: number = 0;
    /**
     * 强制禁用触摸标记；某些纯展示对象会通过它直接屏蔽交互。
     */
    public _touchDisabled?: boolean;
    /**
     * 节点上的桥接组件；负责调度能力和生命周期回调转发。
     */
    public _partner: GObjectPartner;
    /**
     * 当对象作为树列表单元时，对应的树节点数据引用。
     */
    public _treeNode?: GTreeNode;
    /**
     * 底层 `UITransform` 组件，用于同步尺寸、锚点和坐标换算。
     */
    public _uiTrans: UITransform;
    /**
     * 底层 `UIOpacity` 组件，用于同步透明度。
     */
    public _uiOpacity: UIOpacity;

    /**
     * 命中检测时复用的临时坐标对象。
     */
    private _hitTestPt?: Vec2;

    /**
     * 初始化基础节点、关系系统、Gear 容器以及与引擎交互的桥接组件。
     */
    public constructor() {
        this._node = new Node();
        this._uiTrans = this._node.addComponent(UITransform);
        this._uiOpacity = this.node.addComponent(UIOpacity);

        (<any>this._node)["$gobj"] = this;
        this._node.layer = UIConfig.defaultUILayer;
        this._uiTrans.setAnchorPoint(0, 1);
        this._node.on(Node.EventType.ANCHOR_CHANGED, this.handleAnchorChanged, this);

        this._id = this._node.uuid;
        this._name = "";

        this._relations = new Relations(this);
        this._gears = new Array<GearBase>(10);
        this._blendMode = BlendMode.Normal;

        this._partner = this._node.addComponent(GObjectPartner);
    }

    /**
     * 获取当前对象的唯一标识。
     */
    public get id(): string {
        return this._id;
    }

    /**
     * 获取当前对象名称。
     */
    public get name(): string {
        return this._name;
    }

    /**
     * 设置对象名称，并同步到底层节点名称。
     * @param value 对象名称。
     */
    public set name(value: string) {
        this._name = value;
        this._node.name = value || "";
    }

    /**
     * 获取当前逻辑 X 坐标。
     */
    public get x(): number {
        return this._x;
    }

    /**
     * 设置逻辑 X 坐标，并通过统一定位流程回写节点位置与关系联动。
     * @param value 目标 X 坐标。
     */
    public set x(value: number) {
        this.setPosition(value, this._y);
    }

    /**
     * 获取当前逻辑 Y 坐标。
     */
    public get y(): number {
        return this._y;
    }

    /**
     * 设置逻辑 Y 坐标，并通过统一定位流程回写节点位置与关系联动。
     * @param value 目标 Y 坐标。
     */
    public set y(value: number) {
        this.setPosition(this._x, value);
    }

    /**
     * 统一设置对象位置，并同步关系、Gear 和拖拽边界。
     * @param xv 目标 X 坐标。
     * @param yv 目标 Y 坐标。
     */
    public setPosition(xv: number, yv: number): void {
        if (this._x != xv || this._y != yv) {
            var dx: number = xv - this._x;
            var dy: number = yv - this._y;
            this._x = xv;
            this._y = yv;

            this.handlePositionChanged();
            if (this['moveChildren']) {
                this['moveChildren'](dx, dy);
            }
            // if (this instanceof GGroup)
            //     this.moveChildren(dx, dy);

            this.updateGear(1);

            if (this._parent && !("setVirtual" in this._parent)/*not list*/) {
                this._parent.setBoundsChangedFlag();
                if (this._group)
                    this._group.setBoundsChangedFlag(true);
                this._node.emit(FUIEvent.XY_CHANGED, this);
            }

            if (GObject.draggingObject == this && !s_dragging)
                this.localToGlobalRect(0, 0, this._width, this._height, sGlobalRect);
        }
    }

    /**
     * 获取左边界在父坐标系中的位置。
     */
    public get xMin(): number {
        return this._pivotAsAnchor ? (this._x - this._width * this._uiTrans.anchorX) : this._x;
    }

    /**
     * 设置左边界位置，并在保持宽度不变的前提下调整 X 坐标。
     */
    public set xMin(value: number) {
        if (this._pivotAsAnchor)
            this.setPosition(value + this._width * this._uiTrans.anchorX, this._y);
        else
            this.setPosition(value, this._y);
    }

    /**
     * 获取上边界在父坐标系中的位置。
     */
    public get yMin(): number {
        return this._pivotAsAnchor ? (this._y - this._height * (1 - this._uiTrans.anchorY)) : this._y;
    }

    /**
     * 设置上边界位置，并在保持高度不变的前提下调整 Y 坐标。
     */
    public set yMin(value: number) {
        if (this._pivotAsAnchor)
            this.setPosition(this._x, value + this._height * (1 - this._uiTrans.anchorY));
        else
            this.setPosition(this._x, value);
    }

    /**
     * 获取像素对齐开关状态。
     */
    public get pixelSnapping(): boolean {
        return this._pixelSnapping;
    }

    /**
     * 设置像素对齐开关，并在后续定位时启用像素吸附。
     */
    public set pixelSnapping(value: boolean) {
        if (this._pixelSnapping != value) {
            this._pixelSnapping = value;
            this.handlePositionChanged();
        }
    }

    /**
     * 将当前对象居中到父容器或根节点区域。
     */
    public center(restraint?: boolean): void {
        var r: GComponent;
        if (this._parent)
            r = this.parent;
        else
            r = Decls.GRoot.inst;

        this.setPosition((r.width - this._width) / 2, (r.height - this._height) / 2);
        if (restraint) {
            this.addRelation(r, RelationType.Center_Center);
            this.addRelation(r, RelationType.Middle_Middle);
        }
    }

    /**
     * 获取当前逻辑宽度。
     */
    public get width(): number {
        this.ensureSizeCorrect();
        if (this._relations.sizeDirty)
            this._relations.ensureRelationsSizeCorrect();
        return this._width;
    }

    /**
     * 设置逻辑宽度，并触发尺寸、关系和 GearSize 联动。
     */
    public set width(value: number) {
        this.setSize(value, this._rawHeight);
    }

    /**
     * 获取当前逻辑高度。
     */
    public get height(): number {
        this.ensureSizeCorrect();
        if (this._relations.sizeDirty)
            this._relations.ensureRelationsSizeCorrect();
        return this._height;
    }

    /**
     * 设置逻辑高度，并触发尺寸、关系和 GearSize 联动。
     */
    public set height(value: number) {
        this.setSize(this._rawWidth, value);
    }

    /**
     * 更新可视区域尺寸，并重新计算滚动布局。
     */
    public setSize(wv: number, hv: number, ignorePivot?: boolean): void {
        if (this._rawWidth != wv || this._rawHeight != hv) {
            this._rawWidth = wv;
            this._rawHeight = hv;
            if (wv < this.minWidth)
                wv = this.minWidth;
            if (hv < this.minHeight)
                hv = this.minHeight;
            if (this.maxWidth > 0 && wv > this.maxWidth)
                wv = this.maxWidth;
            if (this.maxHeight > 0 && hv > this.maxHeight)
                hv = this.maxHeight;
            var dWidth: number = wv - this._width;
            var dHeight: number = hv - this._height;
            this._width = wv;
            this._height = hv;

            this.handleSizeChanged();
            if ((this._uiTrans.anchorX != 0 || this._uiTrans.anchorY != 1) && !this._pivotAsAnchor && !ignorePivot)
                this.setPosition(this.x - this._uiTrans.anchorX * dWidth, this.y - (1 - this._uiTrans.anchorY) * dHeight);
            else
                this.handlePositionChanged();

            // if (this instanceof GGroup)
            //     this.resizeChildren(dWidth, dHeight);
            if (this['resizeChildren']) {
                this['resizeChildren'](dWidth, dHeight);
            }

            this.updateGear(2);

            if (this._parent) {
                this._relations.onOwnerSizeChanged(dWidth, dHeight, this._pivotAsAnchor || !ignorePivot);
                this._parent.setBoundsChangedFlag();
                if (this._group)
                    this._group.setBoundsChangedFlag();
            }

            this._node.emit(FUIEvent.SIZE_CHANGED, this);
        }
    }

    /**
     * 让当前对象尺寸铺满根节点可视区域。
     */
    public makeFullScreen(): void {
        this.setSize(Decls.GRoot.inst.width, Decls.GRoot.inst.height);
    }

    /**
     * 确保当前尺寸缓存已完成刷新并可安全读取。
     */
    public ensureSizeCorrect(): void {
    }

    /**
     * 获取叠加缩放后的实际显示宽度。
     */
    public get actualWidth(): number {
        return this.width * Math.abs(this._node.scale.x);
    }

    /**
     * 获取叠加缩放后的实际显示高度。
     */
    public get actualHeight(): number {
        return this.height * Math.abs(this._node.scale.y);
    }

    /**
     * 获取当前横向缩放值。
     */
    public get scaleX(): number {
        return this._node.scale.x;
    }

    /**
     * 设置横向缩放值，并同步最终显示尺寸。
     */
    public set scaleX(value: number) {
        this.setScale(value, this._node.scale.y);
    }

    /**
     * 获取当前纵向缩放值。
     */
    public get scaleY(): number {
        return this._node.scale.y;
    }

    /**
     * 设置纵向缩放值，并同步最终显示尺寸。
     */
    public set scaleY(value: number) {
        this.setScale(this._node.scale.x, value);
    }

    /**
     * 统一设置对象缩放值，并同步尺寸和 Gear。
     */
    public setScale(sx: number, sy: number) {
        if (this._node.scale.x != sx || this._node.scale.y != sy) {
            this._node.setScale(sx, sy);

            this.updateGear(2);
        }
    }

    /**
     * 获取当前横向倾斜角。
     */
    public get skewX(): number {
        return this._skewX;
    }

    /**
     * 获取当前枢轴点的横向比例。
     */
    public get pivotX(): number {
        return this._uiTrans.anchorX;
    }

    /**
     * 设置枢轴横向比例，并重新计算定位补偿。
     */
    public set pivotX(value: number) {
        this._uiTrans.anchorX = value;
    }

    /**
     * 获取当前枢轴点的纵向比例。
     */
    public get pivotY(): number {
        return 1 - this._uiTrans.anchorY;
    }

    /**
     * 设置枢轴纵向比例，并重新计算定位补偿。
     */
    public set pivotY(value: number) {
        this._uiTrans.anchorY = 1 - value;
    }

    /**
     * 统一设置对象枢轴点，并按需把枢轴当作锚点。
     */
    public setPivot(xv: number, yv: number, asAnchor?: boolean): void {
        if (this._uiTrans.anchorX != xv || this._uiTrans.anchorY != 1 - yv) {
            this._pivotAsAnchor = asAnchor;
            this._uiTrans.setAnchorPoint(xv, 1 - yv);
        }
        else if (this._pivotAsAnchor != asAnchor) {
            this._pivotAsAnchor = asAnchor;
            this.handlePositionChanged();
        }
    }

    /**
     * 获取当前是否把枢轴点当作锚点。
     */
    public get pivotAsAnchor(): boolean {
        return this._pivotAsAnchor;
    }

    /**
     * 获取当前是否允许接收交互事件。
     */
    public get touchable(): boolean {
        return this._touchable;
    }

    /**
     * 设置交互开关，并同步到底层节点的事件接收能力。
     */
    public set touchable(value: boolean) {
        if (this._touchable != value) {
            this._touchable = value;
            this.updateGear(3);
        }
    }

    /**
     * 获取当前灰化状态。
     */
    public get grayed(): boolean {
        return this._grayed;
    }

    /**
     * 设置灰化状态，并通知子类刷新灰化显示。
     */
    public set grayed(value: boolean) {
        if (this._grayed != value) {
            this._grayed = value;
            this.handleGrayedChanged();
            this.updateGear(3);
        }
    }

    /**
     * 获取当前启用状态；它综合了触摸开关和灰化状态。
     */
    public get enabled(): boolean {
        return !this._grayed && this._touchable;
    }

    /**
     * 设置启用状态；它会联动灰化和触摸开关。
     */
    public set enabled(value: boolean) {
        this.grayed = !value;
        this.touchable = value;
    }

    /**
     * 获取当前旋转角度。
     */
    public get rotation(): number {
        return -this._node.angle;
    }

    /**
     * 设置旋转角度，并同步到底层节点。
     */
    public set rotation(value: number) {
        value = -value;
        if (this._node.angle != value) {
            this._node.angle = value;
            this.updateGear(3);
        }
    }

    /**
     * 获取当前透明度。
     */
    public get alpha(): number {
        return this._alpha;
    }

    /**
     * 设置透明度，并同步到底层 `UIOpacity`。
     */
    public set alpha(value: number) {
        if (this._alpha != value) {
            this._alpha = value;

            this._uiOpacity.opacity = this._alpha * 255;

            if (this['handleAlphaChanged']) {
                this['handleAlphaChanged']();
            }
            // if (this instanceof GGroup)
            //     this.handleAlphaChanged();

            this.updateGear(3);
        }
    }

    /**
     * 获取当前外部可见状态。
     */
    public get visible(): boolean {
        return this._visible;
    }

    /**
     * 设置外部可见状态，并重新计算最终显示结果。
     */
    public set visible(value: boolean) {
        if (this._visible != value) {
            this._visible = value;

            this.handleVisibleChanged();

            if (this._group && this._group.excludeInvisibles)
                this._group.setBoundsChangedFlag();
        }
    }

    /**
     * 获取当前对象在分组可见性参与后的最终可见结果。
     */
    public get _finalVisible(): boolean {
        return this._visible && this._internalVisible && (!this._group || this._group._finalVisible);
    }

    /**
     * 获取综合控制器、父级和分组后的最终可见状态。
     */
    public get internalVisible3(): boolean {
        return this._visible && this._internalVisible;
    }

    /**
     * 获取当前排序层级。
     */
    public get sortingOrder(): number {
        return this._sortingOrder;
    }

    /**
     * 设置排序层级，并请求父组件重排显示顺序。
     */
    public set sortingOrder(value: number) {
        if (value < 0)
            value = 0;
        if (this._sortingOrder != value) {
            var old: number = this._sortingOrder;
            this._sortingOrder = value;
            if (this._parent)
                this._parent.childSortingOrderChanged(this, old, this._sortingOrder);
        }
    }

    /**
     * 请求将输入焦点切换到当前对象。
     */
    public requestFocus(): void {
    }

    /**
     * 获取当前提示文本。
     */
    public get tooltips(): string | null {
        return this._tooltips;
    }

    /**
     * 设置提示文本，并更新鼠标移入时的提示逻辑。
     */
    public set tooltips(value: string | null) {
        if (this._tooltips) {
            this._node.off(FUIEvent.ROLL_OVER, this.onRollOver, this);
            this._node.off(FUIEvent.ROLL_OUT, this.onRollOut, this);
        }

        this._tooltips = value;

        if (this._tooltips) {
            this._node.on(FUIEvent.ROLL_OVER, this.onRollOver, this);
            this._node.on(FUIEvent.ROLL_OUT, this.onRollOut, this);
        }
    }

    /**
     * 获取当前混合模式。
     */
    public get blendMode(): BlendMode {
        return this._blendMode;
    }

    /**
     * 设置混合模式，并立即刷新底层渲染状态。
     */
    public set blendMode(value: BlendMode) {
        if (this._blendMode != value) {
            this._blendMode = value;
            BlendModeUtils.apply(this._node, value);
        }
    }

    /**
     * 判断当前对象是否已经挂到舞台树上。
     */
    public get onStage(): boolean {
        return this._node && this._node.activeInHierarchy;
    }

    /**
     * 获取当前对象对应的包资源 URL。
     */
    public get resourceURL(): string | null {
        if (this.packageItem)
            return "ui://" + this.packageItem.owner.id + this.packageItem.id;
        else
            return null;
    }

    /**
     * 设置所属分组，并让父组件或分组重新评估布局与显示。
     */
    public set group(value: any) {
        if (this._group != value) {
            if (this._group)
                this._group.setBoundsChangedFlag();
            this._group = value;
            if (this._group)
                this._group.setBoundsChangedFlag();
        }
    }

    /**
     * 获取当前所属分组。
     */
    public get group(): any {
        return this._group;
    }

    /**
     * 获取Gear。
     */
    public getGear(index: number): GearBase {
        var gear: GearBase = this._gears[index];
        if (!gear)
            this._gears[index] = gear = createGear(this, index);
        return gear;
    }

    /**
     * 重新计算并同步`Gear`相关结果。
     */
    protected updateGear(index: number): void {
        if (this._underConstruct || this._gearLocked)
            return;

        var gear: GearBase = this._gears[index];
        if (gear && gear.controller)
            gear.updateState();
    }

    /**
     * 检查Gear控制器条件，并在需要时修正状态。
     */
    public checkGearController(index: number, c: Controller): boolean {
        return this._gears[index] && this._gears[index].controller == c;
    }

    /**
     * 重新计算并同步Gear从Relations相关结果。
     */
    public updateGearFromRelations(index: number, dx: number, dy: number): void {
        if (this._gears[index])
            this._gears[index].updateFromRelations(dx, dy);
    }

    /**
     * 新增显示Lock相关对象、监听或状态。
     */
    public addDisplayLock(): number {
        var gearDisplay: GearDisplay = <GearDisplay>this._gears[0];
        if (gearDisplay && gearDisplay.controller) {
            var ret: number = gearDisplay.addLock();
            this.checkGearDisplay();

            return ret;
        }
        else
            return 0;
    }

    /**
     * 释放显示锁令牌。
     */
    public releaseDisplayLock(token: number): void {
        var gearDisplay: GearDisplay = <GearDisplay>this._gears[0];
        if (gearDisplay && gearDisplay.controller) {
            gearDisplay.releaseLock(token);
            this.checkGearDisplay();
        }
    }

    /**
     * 检查Gear显示条件，并在需要时修正状态。
     */
    private checkGearDisplay(): void {
        if (this._handlingController)
            return;

        var connected: boolean = this._gears[0] == null || (<GearDisplay>this._gears[0]).connected;
        if (this._gears[8])
            connected = (<GearDisplay2>this._gears[8]).evaluate(connected);

        if (connected != this._internalVisible) {
            this._internalVisible = connected;
            this.handleVisibleChanged();

            if (this._group && this._group.excludeInvisibles)
                this._group.setBoundsChangedFlag();
        }
    }

    /**
     * 获取当前位置联动用的 `GearXY` 实例；不存在时会按需创建。
     */
    public get gearXY(): GearXY {
        return <GearXY>this.getGear(1);
    }

    /**
     * 获取尺寸联动用的 `GearSize` 实例；不存在时会按需创建。
     */
    public get gearSize(): GearSize {
        return <GearSize>this.getGear(2);
    }

    /**
     * 获取外观联动用的 `GearLook` 实例；不存在时会按需创建。
     */
    public get gearLook(): GearLook {
        return <GearLook>this.getGear(3);
    }

    /**
     * 获取当前对象的关系管理器。
     */
    public get relations(): Relations {
        return this._relations;
    }

    /**
     * 新增`Relation`相关对象、监听或状态。
     * @param target 关系目标对象。
     * @param relationType 关系类型。
     * @param usePercent 是否按百分比处理。
     */
    public addRelation(target: GObject, relationType: number, usePercent?: boolean): void {
        this._relations.add(target, relationType, usePercent);
    }

    /**
     * 移除`Relation`相关对象、监听或状态。
     * @param target 关系目标对象。
     * @param relationType 关系类型。
     */
    public removeRelation(target: GObject, relationType: number): void {
        this._relations.remove(target, relationType);
    }

    /**
     * 获取当前对象对应的底层节点。
     */
    public get node(): Node {
        return this._node;
    }

    /**
     * 获取当前父组件。
     */
    public get parent(): GComponent {
        return this._parent;
    }

    /**
     * 移除从Parent相关对象、监听或状态。
     */
    public removeFromParent(): void {
        if (this._parent)
            this._parent.removeChild(this);
    }

    /**
     * 向上查找满足条件的父级对象。
     */
    public findParent(): GObject {
        if (this._parent)
            return this._parent;

        //可能有些不直接在children里，但node挂着的
        let pn: Node = this._node.parent;
        while (pn) {
            let gobj = (<any>pn)["$gobj"];
            if (gobj)
                return gobj;

            pn = pn.parent;
        }

        return null;
    }

    /**
     * 将当前对象按组件类型返回。
     */
    public get asCom(): GComponent {
        return <GComponent><any>this;
    }

    /**
     * 把节点或组件转换为对应的 GObject。
     */
    public static cast(obj: Node): GObject {
        return (<any>obj)["$gobj"];
    }

    /**
     * 获取文本接口默认值；基类不直接承载文本，子类会覆写该访问器。
     */
    public get text(): string | null {
        return null;
    }

    /**
     * 文本接口默认空实现；供文本类或复合组件子类覆写。
     */
    public set text(value: string | null) {
    }

    /**
     * 获取图标接口默认值；基类不直接承载图标，子类会覆写该访问器。
     */
    public get icon(): string | null {
        return null;
    }

    /**
     * 设置图标资源标识，并同步到实际图标承载对象。
     * @param value 图标资源标识。
     */
    public set icon(value: string | null) {
    }

    /**
     * 获取当前绑定的树节点数据；仅在树组件场景下会有值。
     */
    public get treeNode(): GTreeNode {
        return this._treeNode;
    }

    /**
     * 判断当前对象是否已经执行过销毁；销毁后底层节点引用会被清空。
     */
    public get isDisposed(): boolean {
        return this._node == null;
    }

    /**
     * 释放当前对象持有的关系、Gear、节点监听以及底层节点引用。
     */
    public dispose(): void {
        let n = this._node;
        if (!n)
            return;

        this.removeFromParent();
        this._relations.dispose();

        this._node = null;
        n.destroy();

        for (var i: number = 0; i < 10; i++) {
            var gear: GearBase = this._gears[i];
            if (gear)
                gear.dispose();
        }
    }

    /**
     * 当前隐藏原因标记集合。
     */
    private _hideReason: { [reason: string]: number };
    /**
     * 用于隐藏公共UI，一段时间后再显示出来。用这个接口可以便于查找问题。
     * 多个模块可以同时使用这个接口隐藏，只有当所有reason都显示出来了，公共UI才会显示。
     * 注意：并不适用于以下这种情形：先把公共UI显示出来，然后再把公共隐藏, 这样的使用顺序，可能由于记录了reason导致公共UI永远都不会显示出来.
     * @param reason 隐藏或恢复显示的原因标记。
     * @param isVisible 是否按该原因恢复显示；`false` 表示隐藏，`true` 表示移除该隐藏原因。
     */
    public hideByReason(reason: string, isVisible: boolean) {
        if (!this._hideReason) {
            this._hideReason = {}
        }
        if (isVisible == true) {
            delete this._hideReason[reason];
        } else {
            this._hideReason[reason] = (this._hideReason[reason] || 0) + 1;
        }
        if (Extend.isEmpty(this._hideReason)) {
            if (this._visible != true) {
                this.visible = true;
            }
        } else {
            if (this._visible != false) {
                this.visible = false;
            }
        }
    }
    /**
     * 强制清空全部隐藏原因，并立即恢复对象显示。
     */
    public forceUnHide() {
        this._hideReason = {};
        this.visible = true;
    }
    /**
     * 生命周期占位回调：对象启用时由桥接组件触发，子类可覆写。
     */
    protected onEnable() {
    }

    /**
     * 生命周期占位回调：对象禁用时由桥接组件触发，子类可覆写。
     */
    protected onDisable() {
    }

    /**
     * 生命周期占位回调：对象每帧更新时由桥接组件触发，子类可覆写。
     */
    protected onUpdate() {
    }

    /**
     * 生命周期占位回调：对象销毁时由桥接组件触发，子类可覆写。
     */
    protected onDestroy() {
    }

    /**
     * 响应点击事件。
     * @param listener 点击回调函数。
     * @param target 回调绑定的 `this` 对象。
     */
    public onClick(listener: Function, target?: any): void {
        this._node.on(FUIEvent.CLICK, listener, target);
    }

    /**
     * 注册一次性点击事件监听。
     * @param listener 点击回调函数。
     * @param target 回调绑定的 `this` 对象。
     */
    public onceClick(listener: Function, target?: any): void {
        this._node.once(FUIEvent.CLICK, listener, target);
    }

    /**
     * 移除点击事件监听。
     * @param listener 点击回调函数。
     * @param target 回调绑定的 `this` 对象。
     */
    public offClick(listener: Function, target?: any): void {
        this._node.off(FUIEvent.CLICK, listener, target);
    }

    /**
     * 清理点击相关状态或缓存。
     */
    public clearClick(): void {
        this._node.off(FUIEvent.CLICK);
    }

    /**
     * 判断当前对象是否注册了点击监听。
     */
    public hasClickListener(): boolean {
        return this._node.hasEventListener(FUIEvent.CLICK);
    }

    /**
     * 注册指定事件监听。
     * @param type 事件类型名。
     * @param listener 事件回调函数。
     * @param target 回调绑定的 `this` 对象。
     */
    public on(type: string, listener: Function, target?: any): void {
        if (type == FUIEvent.DISPLAY || type == FUIEvent.UNDISPLAY)
            this._partner._emitDisplayEvents = true;

        this._node.on(type, listener, target);
    }

    /**
     * 注册一次性事件监听。
     * @param type 事件类型名。
     * @param listener 事件回调函数。
     * @param target 回调绑定的 `this` 对象。
     */
    public once(type: string, listener: Function, target?: any): void {
        if (type == FUIEvent.DISPLAY || type == FUIEvent.UNDISPLAY)
            this._partner._emitDisplayEvents = true;

        this._node.once(type, listener, target);
    }

    /**
     * 移除指定事件监听。
     * @param type 事件类型名。
     * @param listener 事件回调函数。
     * @param target 回调绑定的 `this` 对象。
     */
    public off(type: string, listener?: Function, target?: any): void {
        this._node.off(type, listener, target);
    }

    /**
     * 获取当前是否启用了拖拽能力。
     */
    public get draggable(): boolean {
        return this._draggable;
    }

    /**
     * 设置拖拽开关，并根据结果注册或移除拖拽相关监听。
     * @param value 是否启用拖拽能力。
     */
    public set draggable(value: boolean) {
        if (this._draggable != value) {
            this._draggable = value;
            this.initDrag();
        }
    }

    /**
     * 获取当前拖拽活动边界。
     */
    public get dragBounds(): Rect {
        return this._dragBounds;
    }

    /**
     * 设置拖拽边界；拖拽过程中对象位置会被限制在该矩形范围内。
     * @param value 拖拽边界矩形。
     */
    public set dragBounds(value: Rect) {
        this._dragBounds = value;
    }

    /**
     * 开始当前对象的拖拽流程。
     * @param touchId 触点 ID。
     */
    public startDrag(touchId?: number): void {
        if (!this._node.activeInHierarchy)
            return;

        this.dragBegin(touchId);
    }

    /**
     * 停止当前对象的拖拽流程。
     */
    public stopDrag(): void {
        this.dragEnd();
    }

    /**
     * 获取当前是否处于拖拽中。
     */
    public get dragging(): boolean {
        return GObject.draggingObject == this;
    }

    /**
     * 将本地坐标转换为全局坐标。
     * @param ax 本地 X 坐标。
     * @param ay 本地 Y 坐标。
     * @param result 可选结果坐标对象。
     * @returns 转换后的全局坐标。
     */
    public localToGlobal(ax?: number, ay?: number, result?: Vec2): Vec2 {
        ax = ax || 0;
        ay = ay || 0;
        s_vec3.x = ax;
        s_vec3.y = -ay;
        if (!this._pivotAsAnchor) {
            s_vec3.x -= this._uiTrans.anchorX * this._width;
            s_vec3.y += (1 - this._uiTrans.anchorY) * this._height;
        }
        this._uiTrans.convertToWorldSpaceAR(s_vec3, s_vec3);
        s_vec3.y = Decls.GRoot.inst.height - s_vec3.y;

        result = result || new Vec2();
        result.x = s_vec3.x;
        result.y = s_vec3.y;
        return result;
    }

    /**
     * 将全局坐标转换为本地坐标。
     * @param ax 全局 X 坐标。
     * @param ay 全局 Y 坐标。
     * @param result 可选结果坐标对象。
     * @returns 转换后的本地坐标。
     */
    public globalToLocal(ax?: number, ay?: number, result?: Vec2): Vec2 {
        ax = ax || 0;
        ay = ay || 0;
        s_vec3.x = ax;
        s_vec3.y = Decls.GRoot.inst.height - ay;
        this._uiTrans.convertToNodeSpaceAR(s_vec3, s_vec3);
        if (!this._pivotAsAnchor) {
            s_vec3.x += this._uiTrans.anchorX * this._width;
            s_vec3.y -= (1 - this._uiTrans.anchorY) * this._height;
        }

        result = result || new Vec2();
        result.x = s_vec3.x;
        result.y = -s_vec3.y;
        return result;
    }

    /** 
     * 从cocos的世界坐标转换到fgui的local坐标
     * 新增一个吧  globalToLocal 不能改，改了按钮的Y触发都会反向了
     * */
    public CCGlobalToLocal(ax?: number, ay?: number, result?: Vec2): Vec2 {
        ax = ax || 0;
        ay = ay || 0;
        s_vec3.x = ax;
        s_vec3.y = ay;
        this._uiTrans.convertToNodeSpaceAR(s_vec3, s_vec3);
        if (!this._pivotAsAnchor) {
            s_vec3.x += this._uiTrans.anchorX * this._width;
            s_vec3.y -= (1 - this._uiTrans.anchorY) * this._height;
        }
        result = result || new Vec2();
        result.x = s_vec3.x;
        result.y = -s_vec3.y;
        return result;
    }

    /**
     * 将本地矩形区域转换为全局矩形区域。
     * @param ax 本地起始 X 坐标。
     * @param ay 本地起始 Y 坐标。
     * @param aw 本地矩形宽度。
     * @param ah 本地矩形高度。
     * @param result 可选结果矩形对象。
     * @returns 转换后的全局矩形区域。
     */
    public localToGlobalRect(ax?: number, ay?: number, aw?: number, ah?: number, result?: Rect): Rect {
        ax = ax || 0;
        ay = ay || 0;
        aw = aw || 0;
        ah = ah || 0;
        result = result || new Rect();
        var pt: Vec2 = this.localToGlobal(ax, ay);
        result.x = pt.x;
        result.y = pt.y;
        pt = this.localToGlobal(ax + aw, ay + ah, pt);
        result.xMax = pt.x;
        result.yMax = pt.y;
        return result;
    }

    /**
     * 将全局矩形区域转换为本地矩形区域。
     * @param ax 全局起始 X 坐标。
     * @param ay 全局起始 Y 坐标。
     * @param aw 全局矩形宽度。
     * @param ah 全局矩形高度。
     * @param result 可选结果矩形对象。
     * @returns 转换后的本地矩形区域。
     */
    public globalToLocalRect(ax?: number, ay?: number, aw?: number, ah?: number, result?: Rect): Rect {
        ax = ax || 0;
        ay = ay || 0;
        aw = aw || 0;
        ah = ah || 0;
        result = result || new Rect();
        var pt: Vec2 = this.globalToLocal(ax, ay);
        result.x = pt.x;
        result.y = pt.y;
        pt = this.globalToLocal(ax + aw, ay + ah, pt);
        result.xMax = pt.x;
        result.yMax = pt.y;
        return result;
    }

    /**
     * 响应控制器页签变化，刷新当前对象的联动状态。
     */
    public handleControllerChanged(c: Controller): void {
        this._handlingController = true;
        for (var i: number = 0; i < 10; i++) {
            var gear: GearBase = this._gears[i];
            if (gear && gear.controller == c)
                gear.apply();
        }
        this._handlingController = false;

        this.checkGearDisplay();
    }

    /**
     * 在锚点变化后重新同步对象布局与定位结果。
     */
    protected handleAnchorChanged(): void {
        this.handlePositionChanged();
    }

    /**
     * 在位置变化后同步内部容器与骨骼节点位置。
     */
    public handlePositionChanged(): void {
        var xv: number = this._x;
        var yv: number = -this._y;
        if (!this._pivotAsAnchor) {
            xv += this._uiTrans.anchorX * this._width;
            yv -= (1 - this._uiTrans.anchorY) * this._height;
        }
        if (this._pixelSnapping) {
            xv = Math.round(xv);
            yv = Math.round(yv);
        }
        this._node.setPosition(xv, yv);
    }

    /**
     * 在尺寸变化后同步底层节点尺寸、布局和裁剪范围。
     */
    protected handleSizeChanged(): void {
        this._uiTrans.setContentSize(this._width, this._height);
    }

    /**
     * 在灰度状态变化后同步底层渲染组件效果。
     */
    protected handleGrayedChanged(): void {
        //nothing is base
    }

    /**
     * 处理Visible Changed变化。
     */
    public handleVisibleChanged(): void {
        this._node.active = this._finalVisible;

        // if (this instanceof GGroup)
        //     this.handleVisibleChanged();

        if (this._parent)
            this._parent.setBoundsChangedFlag();
    }

    /**
     * 执行命中检测，判断当前坐标是否落在可交互区域内。
     */
    public hitTest(globalPt: Vec2, forTouch?: boolean): GObject {
        if (forTouch == null) forTouch = true;
        if (forTouch && (this._touchDisabled || !this._touchable || !this._node.activeInHierarchy))
            return null;

        if (!this._hitTestPt)
            this._hitTestPt = new Vec2();
        this.globalToLocal(globalPt.x, globalPt.y, this._hitTestPt);
        if (this._pivotAsAnchor) {
            this._hitTestPt.x += this._uiTrans.anchorX * this._width;
            this._hitTestPt.y += (1 - this._uiTrans.anchorY) * this._height;
        }
        return this._hitTest(this._hitTestPt, globalPt);
    }

    /**
     * 执行命中检测，判断当前坐标是否落在可交互区域内。
     */
    protected _hitTest(pt: Vec2, globalPt: Vec2): GObject {
        if (pt.x >= 0 && pt.y >= 0 && pt.x < this._width && pt.y < this._height)
            return this;
        else
            return null;
    }

    /**
     * 按 FairyGUI 属性编号读取当前运行时属性值。
     * @param index FairyGUI 属性编号。
     * @returns 对应属性的当前值。
     */
    public getProp(index: number): any {
        switch (index) {
            case ObjectPropID.Text:
                return this.text;
            case ObjectPropID.Icon:
                return this.icon;
            case ObjectPropID.Color:
                return null;
            case ObjectPropID.OutlineColor:
                return null;
            case ObjectPropID.Playing:
                return false;
            case ObjectPropID.Frame:
                return 0;
            case ObjectPropID.DeltaTime:
                return 0;
            case ObjectPropID.TimeScale:
                return 1;
            case ObjectPropID.FontSize:
                return 0;
            case ObjectPropID.Selected:
                return false;
            default:
                return undefined;
        }
    }

    /**
     * 按 FairyGUI 属性编号写入当前运行时属性值，并触发必要联动。
     * @param index FairyGUI 属性编号。
     * @param value 要写入的属性值。
     */
    public setProp(index: number, value: any): void {
        switch (index) {
            case ObjectPropID.Text:
                this.text = value;
                break;

            case ObjectPropID.Icon:
                this.icon = value;
                break;
        }
    }

    /**
     * 根据包内资源描述构建底层显示对象、尺寸与初始数据。
     */
    public constructFromResource(): void {
    }

    /**
     * 在对象加入父级前，从包数据中读取基础属性和默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_beforeAdd(buffer: ByteBuffer, beginPos: number): void {
        buffer.seek(beginPos, 0);
        buffer.skip(5);

        var f1: number;
        var f2: number;

        this._id = buffer.readS();
        this.name = buffer.readS();
        f1 = buffer.readInt();
        f2 = buffer.readInt();
        this.setPosition(f1, f2);

        if (buffer.readBool()) {
            this.initWidth = buffer.readInt();
            this.initHeight = buffer.readInt();
            this.setSize(this.initWidth, this.initHeight, true);
        }

        if (buffer.readBool()) {
            this.minWidth = buffer.readInt();
            this.maxWidth = buffer.readInt();
            this.minHeight = buffer.readInt();
            this.maxHeight = buffer.readInt();
        }

        if (buffer.readBool()) {
            f1 = buffer.readFloat();
            f2 = buffer.readFloat();
            this.setScale(f1, f2);
        }

        if (buffer.readBool()) {
            f1 = buffer.readFloat();
            f2 = buffer.readFloat();
            //this.setSkew(f1, f2);
        }

        if (buffer.readBool()) {
            f1 = buffer.readFloat();
            f2 = buffer.readFloat();
            this.setPivot(f1, f2, buffer.readBool());
        }

        f1 = buffer.readFloat();
        if (f1 != 1)
            this.alpha = f1;

        f1 = buffer.readFloat();
        if (f1 != 0)
            this.rotation = f1;

        if (!buffer.readBool())
            this.visible = false;
        if (!buffer.readBool())
            this.touchable = false;
        if (buffer.readBool())
            this.grayed = true;
        this.blendMode = buffer.readByte();

        var filter: number = buffer.readByte();
        if (filter == 1) {
            //TODO: filter support
        }

        var str: string = buffer.readS();
        if (str != null)
            this.data = str;
    }

    /**
     * 在对象加入父级后，继续补充依赖父级、控制器或运行时环境的配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_afterAdd(buffer: ByteBuffer, beginPos: number): void {
        buffer.seek(beginPos, 1);

        var str: string = buffer.readS();
        if (str != null)
            this.tooltips = str;

        var groupId: number = buffer.readShort();
        if (groupId >= 0)
            this.group = <any>this.parent.getChildAt(groupId);

        buffer.seek(beginPos, 2);

        var cnt: number = buffer.readShort();
        for (var i: number = 0; i < cnt; i++) {
            var nextPos: number = buffer.readShort();
            nextPos += buffer.position;

            var gear: GearBase = this.getGear(buffer.readByte());
            gear.setup(buffer);

            buffer.position = nextPos;
        }
    }

    //toolTips support
    private onRollOver(): void {
        Decls.GRoot.inst.showTooltips(this.tooltips);
    };
    /**
     * 响应鼠标移出滚动区域事件。
     */
    private onRollOut(): void {
        Decls.GRoot.inst.hideTooltips();
    };

    //drag support
    //-------------------------------------------------------------------
    private initDrag(): void {
        if (this._draggable) {
            this.on(FUIEvent.TOUCH_BEGIN, this.onTouchBegin_0, this);
            this.on(FUIEvent.TOUCH_MOVE, this.onTouchMove_0, this);
            this.on(FUIEvent.TOUCH_END, this.onTouchEnd_0, this);
        }
        else {
            this.off(FUIEvent.TOUCH_BEGIN, this.onTouchBegin_0, this);
            this.off(FUIEvent.TOUCH_MOVE, this.onTouchMove_0, this);
            this.off(FUIEvent.TOUCH_END, this.onTouchEnd_0, this);
        }
    }

    /**
     * 响应拖拽开始事件，并初始化拖拽状态。
     */
    private dragBegin(touchId: number): void {
        if (GObject.draggingObject) {
            let tmp: GObject = GObject.draggingObject;
            tmp.stopDrag();
            GObject.draggingObject = null;

            tmp._node.emit(FUIEvent.DRAG_END);
        }

        if (touchId == undefined)
            touchId = Decls.GRoot.inst.inputProcessor.getAllTouches()[0];

        sGlobalDragStart.set(Decls.GRoot.inst.getTouchPosition(touchId));
        this.localToGlobalRect(0, 0, this._width, this._height, sGlobalRect);

        GObject.draggingObject = this;
        this._dragTesting = false;
        Decls.GRoot.inst.inputProcessor.addTouchMonitor(touchId, this);

        this.on(FUIEvent.TOUCH_MOVE, this.onTouchMove_0, this);
        this.on(FUIEvent.TOUCH_END, this.onTouchEnd_0, this);
    }

    /**
     * 响应拖拽结束事件，并清理拖拽状态。
     */
    private dragEnd(): void {
        if (GObject.draggingObject == this) {
            this._dragTesting = false;
            GObject.draggingObject = null;
        }
        s_dragQuery = false;
    }

    /**
     * 拖拽判定入口：记录按下位置并捕获触摸，为后续是否开始拖拽做准备。
     */
    private onTouchBegin_0(evt: FUIEvent): void {
        if (this._dragStartPos == null)
            this._dragStartPos = new Vec2();

        this._dragStartPos.set(evt.pos);
        this._dragTesting = true;
        evt.captureTouch();
    }

    /**
     * 拖拽移动处理：先判断是否越过拖拽阈值，进入拖拽后持续更新对象位置。
     */
    private onTouchMove_0(evt: FUIEvent): void {
        if (GObject.draggingObject != this && this._draggable && this._dragTesting) {
            var sensitivity: number = UIConfig.touchDragSensitivity;
            if (this._dragStartPos
                && Math.abs(this._dragStartPos.x - evt.pos.x) < sensitivity
                && Math.abs(this._dragStartPos.y - evt.pos.y) < sensitivity)
                return;

            this._dragTesting = false;

            s_dragQuery = true;
            this._node.emit(FUIEvent.DRAG_START, evt);
            if (s_dragQuery)
                this.dragBegin(evt.touchId);
        }

        if (GObject.draggingObject == this) {

            var xx: number = evt.pos.x - sGlobalDragStart.x + sGlobalRect.x;
            var yy: number = evt.pos.y - sGlobalDragStart.y + sGlobalRect.y;

            if (this._dragBounds) {
                var rect: Rect = Decls.GRoot.inst.localToGlobalRect(this._dragBounds.x, this._dragBounds.y,
                    this._dragBounds.width, this._dragBounds.height, s_rect);
                if (xx < rect.x)
                    xx = rect.x;
                else if (xx + sGlobalRect.width > rect.xMax) {
                    xx = rect.xMax - sGlobalRect.width;
                    if (xx < rect.x)
                        xx = rect.x;
                }

                if (yy < rect.y)
                    yy = rect.y;
                else if (yy + sGlobalRect.height > rect.yMax) {
                    yy = rect.yMax - sGlobalRect.height;
                    if (yy < rect.y)
                        yy = rect.y;
                }
            }

            s_dragging = true;
            var pt: Vec2 = this.parent.globalToLocal(xx, yy, s_vec2);
            this.setPosition(Math.round(pt.x), Math.round(pt.y));
            s_dragging = false;
            this._node.emit(FUIEvent.DRAG_MOVE, evt);
        }
    }

    /**
     * 拖拽结束处理：结束拖拽状态、派发 `DRAG_END` 并清理中间标记。
     */
    private onTouchEnd_0(evt: Event): void {
        if (GObject.draggingObject == this) {
            GObject.draggingObject = null;

            this._node.emit(FUIEvent.DRAG_END, evt);
        }
    }
}

//-------------------------------------------------------------------

export class GObjectPartner extends Component {
    /**
     * 是否向外派发显示相关事件。
     */
    public _emitDisplayEvents?: boolean;

    /**
     * 把目标回调延后到后续调度阶段执行。
     * @param callback 目标回调函数。
     * @param delay 延迟时间。
     */
    public callLater(callback: any, delay?: number): void {
        if (!director.getScheduler().isScheduled(callback, <any>this))
            this.scheduleOnce(callback, delay);
    }

    /**
     * 把富文本里的链接点击转发成 FairyGUI 的 `LINK` 事件。
     * @param evt 原始事件对象。
     * @param text 链接文本。
     */
    public onClickLink(evt: Event, text: string) {
        this.node.emit(FUIEvent.LINK, text, evt);
    }

    /**
     * 节点启用时把引擎生命周期转发回 `GObject`，并按需派发 `DISPLAY` 事件。
     */
    protected onEnable() {
        (<any>this.node)["$gobj"].onEnable();

        if (this._emitDisplayEvents)
            this.node.emit(FUIEvent.DISPLAY);
    }

    /**
     * 节点禁用时把引擎生命周期转发回 `GObject`，并按需派发 `UNDISPLAY` 事件。
     */
    protected onDisable() {
        (<any>this.node)["$gobj"].onDisable();

        if (this._emitDisplayEvents)
            this.node.emit(FUIEvent.UNDISPLAY);
    }

    /**
     * 刷新当前对象的显示结果或内部状态。
     * @param dt 本帧时间增量。
     */
    protected update(dt: number) {
        (<any>this.node)["$gobj"].onUpdate(dt);
    }

    /**
     * 节点销毁时把引擎生命周期转发回 `GObject`，完成对象级清理。
     */
    protected onDestroy() {
        (<any>this.node)["$gobj"].onDestroy();
    }
}

//-------------------------------------------------------------------

let GearClasses: Array<typeof GearBase> = [
    GearDisplay, GearXY, GearSize, GearLook, GearColor,
    GearAnimation, GearText, GearIcon, GearDisplay2, GearFontSize
];

function createGear(owner: GObject, index: number): GearBase {
    let ret = new (GearClasses[index])();
    ret._owner = owner;
    return ret;
}

var s_vec2: Vec2 = new Vec2();
var s_vec3: Vec3 = new Vec3();
var s_rect: Rect = new Rect();

var sGlobalDragStart: Vec2 = new Vec2();
var sGlobalRect: Rect = new Rect();
var s_dragging: boolean;
var s_dragQuery: boolean;

/**
 * IGRoot 接口，约束当前模块对象的结构与能力边界。
 */
export interface IGRoot {
    /**
     * 全局根节点实例。
     */
    inst: any;
}

export var Decls: { GRoot?: IGRoot } = {};

export var constructingDepth: { n: number } = { n: 0 };
