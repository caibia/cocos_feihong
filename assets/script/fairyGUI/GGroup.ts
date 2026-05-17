import { GroupLayoutType } from "./FieldTypes";
import { GObject } from "./GObject";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 分组组件，负责对子对象执行统一布局、尺寸分配与显示联动。
 */
export class GGroup extends GObject {
    /**
     * 当前分组布局模式。
     */
    private _layout: number = 0;
    /**
     * 行间距。
     */
    private _lineGap: number = 0;
    /**
     * 列间距。
     */
    private _columnGap: number = 0;
    /**
     * 是否在布局时排除不可见子项。
     */
    private _excludeInvisibles: boolean;
    /**
     * 是否禁用自动尺寸计算。
     */
    private _autoSizeDisabled: boolean;
    /**
     * 主网格索引。
     */
    private _mainGridIndex: number = -1;
    /**
     * 主网格最小尺寸。
     */
    private _mainGridMinSize: number = 50;

    /**
     * 边界是否已标记为脏。
     */
    private _boundsChanged: boolean;
    /**
     * 百分比尺寸缓存是否已准备完成。
     */
    private _percentReady: boolean;
    /**
     * 主子对象索引。
     */
    private _mainChildIndex: number = -1;
    /**
     * 当前累计总尺寸。
     */
    private _totalSize: number = 0;
    /**
     * 当前参与布局的子对象数量。
     */
    private _numChildren: number = 0;

    /**
     * 当前内部布局更新标记。
     */
    public _updating: number = 0;

    /**
     * 初始化分组默认状态，并关闭分组自身的交互能力。
     */
    constructor() {
        super();

        this._node.name = "GGroup";
        this._touchDisabled = true;
    }

    /**
     * 清空分组的边界脏标记后，继续执行基类资源释放逻辑。
     */
    public dispose(): void {
        this._boundsChanged = false;

        super.dispose();
    }

    /**
     * 获取当前布局模式。
     */
    public get layout(): number {
        return this._layout;
    }

    /**
     * 设置布局模式，并触发边界重算。
     * @param value 布局模式枚举值。
     */
    public set layout(value: number) {
        if (this._layout != value) {
            this._layout = value;
            this.setBoundsChangedFlag();
        }
    }

    /**
     * 获取当前行间距。
     */
    public get lineGap(): number {
        return this._lineGap;
    }

    /**
     * 设置行间距，并触发布局或虚拟列表刷新。
     * @param value 行间距。
     */
    public set lineGap(value: number) {
        if (this._lineGap != value) {
            this._lineGap = value;
            this.setBoundsChangedFlag(true);
        }
    }

    /**
     * 获取当前列间距。
     */
    public get columnGap(): number {
        return this._columnGap;
    }

    /**
     * 设置列间距，并触发布局或虚拟列表刷新。
     * @param value 列间距。
     */
    public set columnGap(value: number) {
        if (this._columnGap != value) {
            this._columnGap = value;
            this.setBoundsChangedFlag(true);
        }
    }

    /**
     * 获取当前是否排除不可见子项。
     */
    public get excludeInvisibles(): boolean {
        return this._excludeInvisibles;
    }

    /**
     * 设置是否在分组布局时忽略不可见子项，并触发边界重算。
     * @param value 是否忽略不可见子项。
     */
    public set excludeInvisibles(value: boolean) {
        if (this._excludeInvisibles != value) {
            this._excludeInvisibles = value;
            this.setBoundsChangedFlag();
        }
    }

    /**
     * 获取当前禁用自动尺寸开关。
     */
    public get autoSizeDisabled(): boolean {
        return this._autoSizeDisabled;
    }

    /**
     * 设置是否禁用分组自动尺寸计算。
     * @param value 是否禁用自动尺寸计算。
     */
    public set autoSizeDisabled(value: boolean) {
        this._autoSizeDisabled = value;
    }

    /**
     * 获取当前主网格最小尺寸。
     */
    public get mainGridMinSize(): number {
        return this._mainGridMinSize;
    }

    /**
     * 设置主网格最小尺寸，并触发边界重算。
     * @param value 主网格最小尺寸。
     */
    public set mainGridMinSize(value: number) {
        if (this._mainGridMinSize != value) {
            this._mainGridMinSize = value;
            this.setBoundsChangedFlag();
        }
    }

    /**
     * 获取当前主网格索引。
     */
    public get mainGridIndex(): number {
        return this._mainGridIndex;
    }

    /**
     * 设置主网格索引，并重新评估分组内的尺寸分配规则。
     * @param value 主网格索引。
     */
    public set mainGridIndex(value: number) {
        if (this._mainGridIndex != value) {
            this._mainGridIndex = value;
            this.setBoundsChangedFlag();
        }
    }

    /**
     * 标记分组边界已失效，并根据需要决定是否只重算位置。
     * @param positionChangedOnly 是否仅重算位置相关结果。
     */
    public setBoundsChangedFlag(positionChangedOnly: boolean = false): void {
        if (this._updating == 0 && this._parent) {
            if (!positionChangedOnly)
                this._percentReady = false;

            if (!this._boundsChanged) {
                this._boundsChanged = true;
                if (this._layout != GroupLayoutType.None)
                    this._partner.callLater(this._ensureBoundsCorrect);
            }
        }
    }

    /**
     * 延迟执行一次边界刷新，避免在同一帧内重复重算。
     */
    private _ensureBoundsCorrect(): void {
        let _t = <GGroup>GObject.cast(this.node);
        _t.ensureBoundsCorrect();
    }

    /**
     * 确保当前尺寸缓存已完成刷新并可安全读取。
     */
    public ensureSizeCorrect(): void {
        if (this._parent == null || !this._boundsChanged || this._layout == 0)
            return;

        this._boundsChanged = false;
        if (this._autoSizeDisabled)
            this.resizeChildren(0, 0);
        else {
            this.handleLayout();
            this.updateBounds();
        }
    }

    /**
     * 确保当前边界缓存已经刷新完成，避免后续读取到过期范围。
     */
    public ensureBoundsCorrect(): void {
        if (this._parent == null || !this._boundsChanged)
            return;

        this._boundsChanged = false;
        if (this._layout == 0)
            this.updateBounds();
        else {
            if (this._autoSizeDisabled)
                this.resizeChildren(0, 0);
            else {
                this.handleLayout();
                this.updateBounds();
            }
        }
    }

    /**
     * 重新计算内容边界，并同步容器尺寸或滚动范围。
     */
    private updateBounds(): void {
        this._partner.unschedule(this._ensureBoundsCorrect);

        var cnt: number = this._parent.numChildren;
        var i: number;
        var child: GObject;
        var ax: number = Number.POSITIVE_INFINITY, ay: number = Number.POSITIVE_INFINITY;
        var ar: number = Number.NEGATIVE_INFINITY, ab: number = Number.NEGATIVE_INFINITY;
        var tmp: number;
        var empty: boolean = true;
        for (i = 0; i < cnt; i++) {
            child = this._parent.getChildAt(i);
            if (child.group != this || this._excludeInvisibles && !child.internalVisible3)
                continue;

            tmp = child.xMin;
            if (tmp < ax)
                ax = tmp;
            tmp = child.yMin;
            if (tmp < ay)
                ay = tmp;
            tmp = child.xMin + child.width;
            if (tmp > ar)
                ar = tmp;
            tmp = child.yMin + child.height;
            if (tmp > ab)
                ab = tmp;
            empty = false;
        }

        var w: number = 0, h: number = 0;
        if (!empty) {
            this._updating |= 1;
            this.setPosition(ax, ay);
            this._updating &= 2;

            w = ar - ax;
            h = ab - ay;
        }

        if ((this._updating & 2) == 0) {
            this._updating |= 2;
            this.setSize(w, h);
            this._updating &= 1;
        }
        else {
            this._updating &= 1;
            this.resizeChildren(this._width - w, this._height - h);
        }
    }

    /**
     * 根据当前布局模式重新排列子对象的位置和尺寸。
     */
    private handleLayout(): void {
        this._updating |= 1;

        var child: GObject;
        var i: number;
        var cnt: number;

        if (this._layout == GroupLayoutType.Horizontal) {
            var curX: number = this.x;
            cnt = this._parent.numChildren;
            for (i = 0; i < cnt; i++) {
                child = this._parent.getChildAt(i);
                if (child.group != this)
                    continue;
                if (this._excludeInvisibles && !child.internalVisible3)
                    continue;

                child.xMin = curX;
                if (child.width != 0)
                    curX += child.width + this._columnGap;
            }
        }
        else if (this._layout == GroupLayoutType.Vertical) {
            var curY: number = this.y;
            cnt = this._parent.numChildren;
            for (i = 0; i < cnt; i++) {
                child = this._parent.getChildAt(i);
                if (child.group != this)
                    continue;
                if (this._excludeInvisibles && !child.internalVisible3)
                    continue;

                child.yMin = curY;
                if (child.height != 0)
                    curY += child.height + this._lineGap;
            }
        }

        this._updating &= 2;
    }

    /**
     * 批量移动当前容器下的子对象位置偏移。
     */
    public moveChildren(dx: number, dy: number): void {
        if ((this._updating & 1) != 0 || this._parent == null)
            return;

        this._updating |= 1;

        var cnt: number = this._parent.numChildren;
        var i: number
        var child: GObject;
        for (i = 0; i < cnt; i++) {
            child = this._parent.getChildAt(i);
            if (child.group == this) {
                child.setPosition(child.x + dx, child.y + dy);
            }
        }

        this._updating &= 2;
    }

    /**
     * 按照当前分配策略重新调整子对象尺寸。
     */
    public resizeChildren(dw: number, dh: number): void {
        if (this._layout == GroupLayoutType.None || (this._updating & 2) != 0 || this._parent == null)
            return;

        this._updating |= 2;

        if (this._boundsChanged) {
            this._boundsChanged = false;
            if (!this._autoSizeDisabled) {
                this.updateBounds();
                return;
            }
        }

        var cnt: number = this._parent.numChildren;
        var i: number;
        var child: GObject;

        if (!this._percentReady) {
            this._percentReady = true;
            this._numChildren = 0;
            this._totalSize = 0;
            this._mainChildIndex = -1;

            var j: number = 0;
            for (i = 0; i < cnt; i++) {
                child = this._parent.getChildAt(i);
                if (child.group != this)
                    continue;

                if (!this._excludeInvisibles || child.internalVisible3) {
                    if (j == this._mainGridIndex)
                        this._mainChildIndex = i;

                    this._numChildren++;

                    if (this._layout == 1)
                        this._totalSize += child.width;
                    else
                        this._totalSize += child.height;
                }

                j++;
            }

            if (this._mainChildIndex != -1) {
                if (this._layout == 1) {
                    child = this._parent.getChildAt(this._mainChildIndex);
                    this._totalSize += this._mainGridMinSize - child.width;
                    child._sizePercentInGroup = this._mainGridMinSize / this._totalSize;
                }
                else {
                    child = this._parent.getChildAt(this._mainChildIndex);
                    this._totalSize += this._mainGridMinSize - child.height;
                    child._sizePercentInGroup = this._mainGridMinSize / this._totalSize;
                }
            }

            for (i = 0; i < cnt; i++) {
                child = this._parent.getChildAt(i);
                if (child.group != this)
                    continue;

                if (i == this._mainChildIndex)
                    continue;

                if (this._totalSize > 0)
                    child._sizePercentInGroup = (this._layout == 1 ? child.width : child.height) / this._totalSize;
                else
                    child._sizePercentInGroup = 0;
            }
        }

        var remainSize: number = 0;
        var remainPercent: number = 1;
        var priorHandled: boolean = false;

        if (this._layout == 1) {
            remainSize = this.width - (this._numChildren - 1) * this._columnGap;
            if (this._mainChildIndex != -1 && remainSize >= this._totalSize) {
                child = this._parent.getChildAt(this._mainChildIndex);
                child.setSize(remainSize - (this._totalSize - this._mainGridMinSize), child._rawHeight + dh, true);
                remainSize -= child.width;
                remainPercent -= child._sizePercentInGroup;
                priorHandled = true;
            }

            var curX: number = this.x;
            for (i = 0; i < cnt; i++) {
                child = this._parent.getChildAt(i);
                if (child.group != this)
                    continue;

                if (this._excludeInvisibles && !child.internalVisible3) {
                    child.setSize(child._rawWidth, child._rawHeight + dh, true);
                    continue;
                }

                if (!priorHandled || i != this._mainChildIndex) {
                    child.setSize(Math.round(child._sizePercentInGroup / remainPercent * remainSize), child._rawHeight + dh, true);
                    remainPercent -= child._sizePercentInGroup;
                    remainSize -= child.width;
                }

                child.xMin = curX;
                if (child.width != 0)
                    curX += child.width + this._columnGap;
            }
        }
        else {
            remainSize = this.height - (this._numChildren - 1) * this._lineGap;
            if (this._mainChildIndex != -1 && remainSize >= this._totalSize) {
                child = this._parent.getChildAt(this._mainChildIndex);
                child.setSize(child._rawWidth + dw, remainSize - (this._totalSize - this._mainGridMinSize), true);
                remainSize -= child.height;
                remainPercent -= child._sizePercentInGroup;
                priorHandled = true;
            }

            var curY: number = this.y;
            for (i = 0; i < cnt; i++) {
                child = this._parent.getChildAt(i);
                if (child.group != this)
                    continue;

                if (this._excludeInvisibles && !child.internalVisible3) {
                    child.setSize(child._rawWidth + dw, child._rawHeight, true);
                    continue;
                }

                if (!priorHandled || i != this._mainChildIndex) {
                    child.setSize(child._rawWidth + dw, Math.round(child._sizePercentInGroup / remainPercent * remainSize), true);
                    remainPercent -= child._sizePercentInGroup;
                    remainSize -= child.height;
                }

                child.yMin = curY;
                if (child.height != 0)
                    curY += child.height + this._lineGap;
            }
        }

        this._updating &= 1;
    }

    /**
     * 在透明度变化后，把分组透明度同步给当前分组内的所有子对象。
     */
    public handleAlphaChanged(): void {
        if (this._underConstruct)
            return;

        var cnt: number = this._parent.numChildren;
        for (var i: number = 0; i < cnt; i++) {
            var child: GObject = this._parent.getChildAt(i);
            if (child.group == this)
                child.alpha = this.alpha;
        }
    }

    /**
     * 处理Visible Changed变化。
     */
    public handleVisibleChanged(): void {
        if (!this._parent)
            return;

        var cnt: number = this._parent.numChildren;
        for (var i: number = 0; i < cnt; i++) {
            var child: GObject = this._parent.getChildAt(i);
            if (child.group == this)
                child.handleVisibleChanged();
        }
    }

    /**
     * 在对象加入父级前，从包数据中读取基础属性和默认状态。
     */
    public setup_beforeAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_beforeAdd(buffer, beginPos);

        buffer.seek(beginPos, 5);

        this._layout = buffer.readByte();
        this._lineGap = buffer.readInt();
        this._columnGap = buffer.readInt();
        if (buffer.version >= 2) {
            this._excludeInvisibles = buffer.readBool();
            this._autoSizeDisabled = buffer.readBool();
            this._mainGridIndex = buffer.readShort();
        }
    }

    /**
     * 在对象加入父级后，读取主网格索引与自动尺寸字段，并立即标记边界需要重算。
     */
    public setup_afterAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_afterAdd(buffer, beginPos);

        if (!this.visible)
            this.handleVisibleChanged();
    }
}
