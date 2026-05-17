import { Mask, Vec2, Size, Node, UITransform, Constructor } from "cc";
import { Controller } from "./Controller";
import { FEvent as FUIEvent } from "./event/Event";
import { IHitTest, PixelHitTest, ChildHitArea } from "./event/HitTest";
import { ChildrenRenderOrder, OverflowType, ObjectType } from "./FieldTypes";
import { GGraph } from "./GGraph";
import { GGroup } from "./GGroup";
import { GImage } from "./GImage";
import { GObject } from "./GObject";
import { Margin } from "./Margin";
import { PackageItem } from "./PackageItem";
import { ScrollPane } from "./ScrollPane";
import { Transition } from "./Transition";
import { TranslationHelper } from "./TranslationHelper";
import { UIConfig } from "./UIConfig";
import { UIContentScaler } from "./UIContentScaler";
import { Decls, UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";
import EventUnit from "../base/unit/EventUnit";

/**
 * 复合组件基类，负责子对象树、控制器、过渡动画、滚动与命名查询。
 */
export class GComponent extends GObject {
    /**
     * 自定义命中区域；设置后会覆盖默认矩形命中规则。
     */
    public hitArea?: IHitTest;

    /**
     * 参与排序规则的子对象数量。
     */
    private _sortingChildCount: number = 0;
    /**
     * 当前是否按不透明矩形参与命中。
     */
    private _opaque: boolean;
    /**
     * 当前正在应用的控制器。
     */
    private _applyingController?: Controller;
    /**
     * 矩形遮罩组件引用。
     */
    private _rectMask?: Mask;
    /**
     * 当前绑定的遮罩目标对象。
     */
    private _maskContent?: GObject;
    /**
     * 当前遮罩是否使用反向裁剪。
     */
    private _invertedMask?: boolean = false;
    /**
     * 容器节点上的 `UITransform` 组件。
     */
    private _containerUITrans: UITransform;

    /**
     * 内容边距；影响子对象布局、滚动视口尺寸和遮罩区域大小。
     */
    protected _margin: Margin;
    /**
     * 是否自动跟踪子对象边界；开启后增删子对象或尺寸变化会触发边界重算。
     */
    protected _trackBounds: boolean;
    /**
     * 边界脏标记；置位后会在下一轮刷新时重新计算内容边界。
     */
    protected _boundsChanged: boolean;
    /**
     * 子对象渲染顺序策略；决定原生显示列表应如何重排。
     */
    protected _childrenRenderOrder: ChildrenRenderOrder = ChildrenRenderOrder.Ascent;
    /**
     * 弧形渲染模式下的视觉焦点索引。
     */
    protected _apexIndex: number = 0;

    /**
     * 正在重建原生显示列表的保护标记，避免过程中重复联动。
     */
    public _buildingDisplayList: boolean;
    /**
     * 当前组件持有的子对象列表，顺序与 FairyGUI 逻辑顺序一致。
     */
    public _children: Array<GObject>;
    /**
     * 当前组件拥有的控制器列表；用于驱动页签和 Gear 联动。
     */
    public _controllers: Array<Controller>;
    /**
     * 当前组件挂载的过渡动画列表。
     */
    public _transitions: Array<Transition>;
    /**
     * 真正承载子对象节点的容器；滚动、对齐和遮罩通常围绕它建立。
     */
    public _container: Node;
    /**
     * 当前组件绑定的滚动面板；仅在溢出模式为滚动时创建。
     */
    public _scrollPane?: ScrollPane;
    /**
     * 内容对齐偏移；当子内容未铺满容器时用于记录附加位移。
     */
    public _alignOffset: Vec2;
    /**
     * 运行时实际生效的自定义遮罩组件引用。
     */
    public _customMask?: Mask;
    /** UI 控件与类属性的绑定记录 */
    protected _binding: string[];
    /**
     * 组件级事件辅助单元。
     */
    private _eventUnit: EventUnit;

    /**
     * 初始化容器节点、子对象数组、控制器数组以及组件级事件辅助单元。
     */
    public constructor() {
        super();

        this._node.name = "GComponent";
        this._children = new Array<GObject>();
        this._controllers = new Array<Controller>();
        this._transitions = new Array<Transition>();
        this._margin = new Margin();
        this._alignOffset = new Vec2();

        this._container = new Node("Container");
        this._container.layer = UIConfig.defaultUILayer;
        this._containerUITrans = this._container.addComponent(UITransform);
        this._containerUITrans.setAnchorPoint(0, 1);
        this._node.addChild(this._container);
    }

    /**事件 */
    public get eventUnit(): EventUnit {
        if (!this._eventUnit) {
            this._eventUnit = new EventUnit();
        }
        return this._eventUnit;
    }

    /**
     * 清理由缓存恢复场景留下的临时状态，并递归通知子对象同步清理。
     */
    public clearByCache() {
        if (this._eventUnit) {
            this.eventUnit.pause();
        }

        let child: GObject, i: number;
        for (i = this._children.length - 1; i >= 0; i--) {      //倒序遍历
            child = this._children[i];
            if (!child) continue;
            if (child instanceof GComponent) {
                //注意：遍历过程中，可能会有增删_children数组的情况，这种情况容易出错
                child.clearByCache();
            } else if (child["clearByCache"]) {
                child["clearByCache"]();
            }
        }
    }
    /**
     * 把类的属性和ui中的同名控件绑定起来 
     * */
    public initComponentByView(view: GComponent) {
        this._binding = this._binding || [];
        let cnt = view._children.length;
        let name;
        for (var i = 0; i < cnt; ++i) {
            name = view._children[i].name
            if (name && name != "") {
                //比如在GButton里绑定title时，GButton.title = GTextField; 
                //这一步步导致了GTextField._text变成了一个GTextField，而且这个bug隐藏了接近一年才被发现。
                if (name == "title" && typeof this[name] == "string") continue;
                if (name == "icon" && typeof this[name] == "string") continue;
                this[name] = view._children[i];
                this._binding.push(name);
            }
        }
    }

    /**把fgui里创建的controller关联到类属性上方便使用 */
    protected initControllerByView(view: GComponent) {
        this._binding = this._binding || [];
        if (view.controllers && view.controllers.length > 0) {
            for (let c of view.controllers) {
                this[c.name] = c;
                this._binding.push(c.name);
            }
        }
    }

    /**
     * 释放子对象、控制器、过渡动画、滚动面板和组件级缓存。
     */
    public dispose(): void {
        if (this._eventUnit) {
            this._eventUnit.dispose();
            this._eventUnit = undefined;
        }

        var i: number;
        var cnt: number;
        if (this._binding) {
            for (const key of this._binding) {
                delete this[`${key}`];
            }
            this._binding = undefined;
        }

        cnt = this._transitions.length;
        for (i = 0; i < cnt; ++i) {
            var trans: Transition = this._transitions[i];
            trans.dispose();
        }

        cnt = this._controllers.length;
        for (i = 0; i < cnt; ++i) {
            var cc: Controller = this._controllers[i];
            cc.dispose();
        }

        if (this._scrollPane)
            this._scrollPane.destroy();

        cnt = this._children.length;
        for (i = cnt - 1; i >= 0; --i) {
            var obj: GObject = this._children[i];
            obj._parent = null;//avoid removeFromParent call
            obj.dispose();
        }

        this._boundsChanged = false;
        super.dispose();
    }

    /**
     * 获取原生显示列表真正挂载的容器节点。
     */
    public get displayListContainer(): Node {
        return this._container;
    }

    /**
     * 将子对象追加到当前组件末尾。
     * @param child 要添加的子对象。
     * @returns 添加后的子对象。
     */
    public addChild(child: GObject): GObject {
        this.addChildAt(child, this._children.length);
        return child;
    }

    /**
     * 将子对象插入到指定索引，并同步显示列表与边界状态。
     * @param child 要插入的子对象。
     * @param index 目标插入索引。
     * @returns 插入后的子对象。
     */
    public addChildAt(child: GObject, index: number): GObject {
        if (!child)
            throw new Error("child is null");

        var numChildren: number = this._children.length;

        if (index >= 0 && index <= numChildren) {
            if (child.parent == this) {
                this.setChildIndex(child, index);
            }
            else {
                child.removeFromParent();
                child._parent = this;

                var cnt: number = this._children.length;
                if (child.sortingOrder != 0) {
                    this._sortingChildCount++;
                    index = this.getInsertPosForSortingChild(child);
                }
                else if (this._sortingChildCount > 0) {
                    if (index > (cnt - this._sortingChildCount))
                        index = cnt - this._sortingChildCount;
                }

                if (index == cnt)
                    this._children.push(child);
                else
                    this._children.splice(index, 0, child);

                this.onChildAdd(child, index);
                this.setBoundsChangedFlag();
            }

            return child;
        }
        else {
            throw new Error("Invalid child index");
        }
    }

    /**
     * 获取带排序规则子对象的插入位置。
     * @param target 目标子对象。
     * @returns 应插入的索引位置。
     */
    private getInsertPosForSortingChild(target: GObject): number {
        var cnt: number = this._children.length;
        var i: number = 0;
        for (i = 0; i < cnt; i++) {
            var child: GObject = this._children[i];
            if (child == target)
                continue;

            if (target.sortingOrder < child.sortingOrder)
                break;
        }
        return i;
    }

    /**
     * 从当前组件中移除指定子对象。
     * @param child 要移除的子对象。
     * @param dispose 是否同时销毁子对象。
     * @returns 被移除的子对象。
     */
    public removeChild(child: GObject, dispose?: boolean): GObject {
        var childIndex: number = this._children.indexOf(child);
        if (childIndex != -1) {
            this.removeChildAt(childIndex, dispose);
        }
        return child;
    }

    /**
     * 按索引移除子对象。
     * @param index 子对象索引。
     * @param dispose 是否同时销毁子对象。
     * @returns 被移除的子对象。
     */
    public removeChildAt(index: number, dispose?: boolean): GObject {
        if (index >= 0 && index < this.numChildren) {
            var child: GObject = this._children[index];
            child._parent = null;

            if (child.sortingOrder != 0)
                this._sortingChildCount--;

            this._children.splice(index, 1);
            child.group = null;
            this._container.removeChild(child.node);
            if (this._childrenRenderOrder == ChildrenRenderOrder.Arch)
                this._partner.callLater(this.buildNativeDisplayList);

            if (dispose)
                child.dispose();
            else
                child.node.parent = null;

            this.setBoundsChangedFlag();

            return child;
        }
        else {
            throw new Error("Invalid child index");
        }
    }

    /**
     * 批量移除指定范围内的子对象。
     * @param beginIndex 起始索引。
     * @param endIndex 结束索引。
     * @param dispose 是否同时销毁子对象。
     */
    public removeChildren(beginIndex?: number, endIndex?: number, dispose?: boolean): void {
        if (beginIndex == undefined) beginIndex = 0;
        if (endIndex == undefined) endIndex = -1;

        if (endIndex < 0 || endIndex >= this.numChildren)
            endIndex = this.numChildren - 1;

        for (var i: number = beginIndex; i <= endIndex; ++i)
            this.removeChildAt(beginIndex, dispose);
    }

    public getChildAt<T extends GObject>(index: number, classType?: Constructor<T>): T {
        if (index >= 0 && index < this.numChildren)
            return this._children[index] as T;
        else
            throw new Error("Invalid child index");
    }

    public getChild<T extends GObject>(name: string, classType?: Constructor<T>): T {
        var cnt: number = this._children.length;
        for (var i: number = 0; i < cnt; ++i) {
            if (this._children[i].name == name)
                return this._children[i] as T;
        }

        return null;
    }

    public getChildByPath<T extends GObject>(path: String, classType?: Constructor<T>): T {
        var arr: string[] = path.split(".");
        var cnt: number = arr.length;
        var gcom: GComponent = this;
        var obj: GObject;
        for (var i: number = 0; i < cnt; ++i) {
            obj = gcom.getChild(arr[i]);
            if (!obj)
                break;

            if (i != cnt - 1) {
                if (!(obj instanceof GComponent)) {
                    obj = null;
                    break;
                }
                else
                    gcom = obj;
            }
        }

        return obj as T;
    }

    /**
     * 根据名称获取可见子对象。
     * @param name 子对象名称。
     * @returns 命中的可见子对象；未命中时返回空值。
     */
    public getVisibleChild(name: string): GObject {
        var cnt: number = this._children.length;
        for (var i: number = 0; i < cnt; ++i) {
            var child: GObject = this._children[i];
            if (child._finalVisible && child.name == name)
                return child;
        }

        return null;
    }

    /**
     * 在指定分组中按名称获取子对象。
     * @param name 子对象名称。
     * @param group 目标分组。
     * @returns 命中的子对象；未命中时返回空值。
     */
    public getChildInGroup(name: string, group: GGroup): GObject {
        var cnt: number = this._children.length;
        for (var i: number = 0; i < cnt; ++i) {
            var child: GObject = this._children[i];
            if (child.group == group && child.name == name)
                return child;
        }

        return null;
    }

    /**
     * 根据子对象 ID 获取子对象。
     * @param id 子对象 ID。
     * @returns 命中的子对象；未命中时返回空值。
     */
    public getChildById(id: string): GObject {
        var cnt: number = this._children.length;
        for (var i: number = 0; i < cnt; ++i) {
            if (this._children[i]._id == id)
                return this._children[i];
        }

        return null;
    }

    /**
     * 获取子对象在当前组件中的索引。
     * @param child 目标子对象。
     * @returns 子对象索引；未命中时返回 `-1`。
     */
    public getChildIndex(child: GObject): number {
        return this._children.indexOf(child);
    }

    /**
     * 调整子对象在当前组件中的显示顺序。
     * @param child 目标子对象。
     * @param index 目标索引。
     */
    public setChildIndex(child: GObject, index: number): void {
        var oldIndex: number = this._children.indexOf(child);
        if (oldIndex == -1)
            throw new Error("Not a child of this container");

        if (child.sortingOrder != 0) //no effect
            return;

        var cnt: number = this._children.length;
        if (this._sortingChildCount > 0) {
            if (index > (cnt - this._sortingChildCount - 1))
                index = cnt - this._sortingChildCount - 1;
        }

        this._setChildIndex(child, oldIndex, index);
    }

    /**
     * 尽量把子对象移动到指定索引之前，并返回最终索引。
     * @param child 目标子对象。
     * @param index 参考索引。
     * @returns 最终索引。
     */
    public setChildIndexBefore(child: GObject, index: number): number {
        var oldIndex: number = this._children.indexOf(child);
        if (oldIndex == -1)
            throw new Error("Not a child of this container");

        if (child.sortingOrder != 0) //no effect
            return oldIndex;

        var cnt: number = this._children.length;
        if (this._sortingChildCount > 0) {
            if (index > (cnt - this._sortingChildCount - 1))
                index = cnt - this._sortingChildCount - 1;
        }

        if (oldIndex < index)
            return this._setChildIndex(child, oldIndex, index - 1);
        else
            return this._setChildIndex(child, oldIndex, index);
    }

    /**
     * 在树节点内部调整子节点顺序。
     * @param child 目标子对象。
     * @param oldIndex 原索引。
     * @param index 新索引。
     * @returns 最终索引。
     */
    private _setChildIndex(child: GObject, oldIndex: number, index: number): number {
        var cnt: number = this._children.length;
        if (index > cnt)
            index = cnt;

        if (oldIndex == index)
            return oldIndex;

        this._children.splice(oldIndex, 1);
        this._children.splice(index, 0, child);

        if (this._childrenRenderOrder == ChildrenRenderOrder.Ascent)
            child.node.setSiblingIndex(index);
        else if (this._childrenRenderOrder == ChildrenRenderOrder.Descent)
            child.node.setSiblingIndex(cnt - index);
        else
            this._partner.callLater(this.buildNativeDisplayList);

        this.setBoundsChangedFlag();

        return index;
    }

    /**
     * 交换两个子对象的位置。
     * @param child1 第一个子对象。
     * @param child2 第二个子对象。
     */
    public swapChildren(child1: GObject, child2: GObject): void {
        var index1: number = this._children.indexOf(child1);
        var index2: number = this._children.indexOf(child2);
        if (index1 == -1 || index2 == -1)
            throw new Error("Not a child of this container");
        this.swapChildrenAt(index1, index2);
    }

    /**
     * 按索引交换两个子对象的位置。
     * @param index1 第一个索引。
     * @param index2 第二个索引。
     */
    public swapChildrenAt(index1: number, index2: number): void {
        var child1: GObject = this._children[index1];
        var child2: GObject = this._children[index2];

        this.setChildIndex(child1, index2);
        this.setChildIndex(child2, index1);
    }

    /**
     * 获取当前子对象数量。
     */
    public get numChildren(): number {
        return this._children.length;
    }

    /**
     * 判断当前组件是否是目标对象的祖先节点。
     * @param child 目标子对象。
     * @returns 当前组件是否为其祖先节点。
     */
    public isAncestorOf(child: GObject): boolean {
        if (child == null)
            return false;

        var p: GComponent = child.parent;
        while (p) {
            if (p == this)
                return true;

            p = p.parent;
        }
        return false;
    }

    /**
     * 向当前组件注册一个控制器，并立即应用其当前页状态。
     * @param controller 要添加的控制器。
     */
    public addController(controller: Controller): void {
        this._controllers.push(controller);
        controller.parent = this;
        this.applyController(controller);
    }

    /**
     * 按索引获取控制器。
     * @param index 控制器索引。
     * @returns 对应控制器。
     */
    public getControllerAt(index: number): Controller {
        return this._controllers[index];
    }

    /**
     * 按名称获取控制器。
     * @param name 控制器名称。
     * @returns 对应控制器；未命中时返回空值。
     */
    public getController(name: string): Controller {
        var cnt: number = this._controllers.length;
        for (var i: number = 0; i < cnt; ++i) {
            var c: Controller = this._controllers[i];
            if (c.name == name)
                return c;
        }

        return null;
    }

    /**
     * 从当前组件中移除一个控制器，并通知所有子对象刷新联动状态。
     * @param c 要移除的控制器。
     */
    public removeController(c: Controller): void {
        var index: number = this._controllers.indexOf(c);
        if (index == -1)
            throw new Error("controller not exists");

        c.parent = null;
        this._controllers.splice(index, 1);

        var length: number = this._children.length;
        for (var i: number = 0; i < length; i++) {
            var child: GObject = this._children[i];
            child.handleControllerChanged(c);
        }
    }

    /**
     * 获取当前组件持有的控制器数组。
     */
    public get controllers(): Array<Controller> {
        return this._controllers;
    }

    /**
     * 子对象加入后把节点挂到容器里，并同步显示列表和边界状态。
     * @param child 新加入的子对象。
     * @param index 插入索引。
     */
    private onChildAdd(child: GObject, index: number): void {
        child.node.parent = this._container;
        child.node.active = child._finalVisible;

        if (this._buildingDisplayList)
            return;

        let cnt: number = this._children.length;
        if (this._childrenRenderOrder == ChildrenRenderOrder.Ascent)
            child.node.setSiblingIndex(index);
        else if (this._childrenRenderOrder == ChildrenRenderOrder.Descent)
            child.node.setSiblingIndex(cnt - index);
        else
            this._partner.callLater(this.buildNativeDisplayList);
    }

    /**
     * 按当前子对象顺序重建底层原生显示列表。
     * @param dt 调度器回调透传的时间参数。
     */
    private buildNativeDisplayList(dt?: number): void {
        if (!isNaN(dt)) {
            let _t = <GComponent>GObject.cast(this.node);
            _t.buildNativeDisplayList();
            return;
        }

        let cnt: number = this._children.length;
        if (cnt == 0)
            return;

        let child: GObject;
        switch (this._childrenRenderOrder) {
            case ChildrenRenderOrder.Ascent:
                {
                    let j = 0;
                    for (let i = 0; i < cnt; i++) {
                        child = this._children[i];
                        child.node.setSiblingIndex(j++);
                    }
                }
                break;
            case ChildrenRenderOrder.Descent:
                {
                    let j = 0;
                    for (let i = cnt - 1; i >= 0; i--) {
                        child = this._children[i];
                        child.node.setSiblingIndex(j++);
                    }
                }
                break;

            case ChildrenRenderOrder.Arch:
                {
                    let j = 0;
                    for (let i = 0; i < this._apexIndex; i++) {
                        child = this._children[i];
                        child.node.setSiblingIndex(j++);
                    }
                    for (let i = cnt - 1; i >= this._apexIndex; i--) {
                        child = this._children[i];
                        child.node.setSiblingIndex(j++);
                    }
                }
                break;
        }
    }

    /**
     * 把指定控制器结果应用到当前对象及其子对象。
     * @param c 当前要应用的控制器。
     */
    public applyController(c: Controller): void {
        this._applyingController = c;
        var child: GObject;
        var length: number = this._children.length;
        for (var i: number = 0; i < length; i++) {
            child = this._children[i];
            child.handleControllerChanged(c);
        }
        this._applyingController = null;

        c.runActions();
    }

    /**
     * 把全部控制器结果应用到当前对象。
     */
    public applyAllControllers(): void {
        var cnt: number = this._controllers.length;
        for (var i: number = 0; i < cnt; ++i) {
            this.applyController(this._controllers[i]);
        }
    }

    /**
     * 调整单选按钮组的显示层级，确保交互表现正确。
     * @param obj 当前按钮对象。
     * @param c 关联控制器。
     */
    public adjustRadioGroupDepth(obj: GObject, c: Controller): void {
        var cnt: number = this._children.length;
        var i: number;
        var child: GObject;
        var myIndex: number = -1, maxIndex: number = -1;
        for (i = 0; i < cnt; i++) {
            child = this._children[i];
            if (child == obj) {
                myIndex = i;
            }
            else if (("relatedController" in child)/*is button*/ && (<any>child).relatedController == c) {
                if (i > maxIndex)
                    maxIndex = i;
            }
        }
        if (myIndex < maxIndex) {
            if (this._applyingController)
                this._children[maxIndex].handleControllerChanged(this._applyingController);
            this.swapChildrenAt(myIndex, maxIndex);
        }
    }

    /**
     * 按索引获取过渡动画。
     * @param index 过渡动画索引。
     * @returns 对应过渡动画。
     */
    public getTransitionAt(index: number): Transition {
        return this._transitions[index];
    }

    /**
     * 按名称获取过渡动画。
     * @param transName 过渡动画名称。
     * @returns 对应过渡动画；未命中时返回空值。
     */
    public getTransition(transName: string): Transition {
        var cnt: number = this._transitions.length;
        for (var i: number = 0; i < cnt; ++i) {
            var trans: Transition = this._transitions[i];
            if (trans.name == transName)
                return trans;
        }

        return null;
    }

    /**
     * 判断指定子对象当前是否处于滚动面板可视区域内。
     * @param child 目标子对象。
     * @returns 当前是否处于可视区域内。
     */
    public isChildInView(child: GObject): boolean {
        if (this._rectMask) {
            return child.x + child.width >= 0 && child.x <= this.width
                && child.y + child.height >= 0 && child.y <= this.height;
        }
        else if (this._scrollPane) {
            return this._scrollPane.isChildInView(child);
        }
        else
            return true;
    }

    /**
     * 返回当前可视区域内的第一个子项索引。
     * @returns 当前可视区域内的第一个子项索引。
     */
    public getFirstChildInView(): number {
        var cnt: number = this._children.length;
        for (var i: number = 0; i < cnt; ++i) {
            var child: GObject = this._children[i];
            if (this.isChildInView(child))
                return i;
        }
        return -1;
    }

    /**
     * 获取当前组件绑定的滚动面板。
     */
    public get scrollPane(): ScrollPane {
        return this._scrollPane;
    }

    /**
     * 获取当前是否按不透明矩形参与命中。
     */
    public get opaque(): boolean {
        return this._opaque;
    }

    /**
     * 设置不透明命中开关，并同步到底层遮罩/命中逻辑。
     * @param value 是否按不透明矩形参与命中。
     */
    public set opaque(value: boolean) {
        this._opaque = value;
    }

    /**
     * 获取当前内容边距配置。
     */
    public get margin(): Margin {
        return this._margin;
    }

    /**
     * 设置内容边距，并刷新布局与滚动区域。
     * @param value 目标边距配置。
     */
    public set margin(value: Margin) {
        this._margin.copy(value);
        this.handleSizeChanged();
    }

    /**
     * 获取当前子对象渲染顺序策略。
     */
    public get childrenRenderOrder(): ChildrenRenderOrder {
        return this._childrenRenderOrder;
    }

    /**
     * 设置子对象渲染顺序策略，并重建原生显示列表。
     * @param value 子对象渲染顺序策略。
     */
    public set childrenRenderOrder(value: ChildrenRenderOrder) {
        if (this._childrenRenderOrder != value) {
            this._childrenRenderOrder = value;
            this.buildNativeDisplayList();
        }
    }

    /**
     * 获取弧形渲染模式的中心索引。
     */
    public get apexIndex(): number {
        return this._apexIndex;
    }

    /**
     * 设置弧形渲染中心索引，并刷新显示顺序。
     * @param value 弧形渲染中心索引。
     */
    public set apexIndex(value: number) {
        if (this._apexIndex != value) {
            this._apexIndex = value;

            if (this._childrenRenderOrder == ChildrenRenderOrder.Arch)
                this.buildNativeDisplayList();
        }
    }

    /**
     * 获取当前绑定的遮罩对象。
     */
    public get mask(): GObject {
        return this._maskContent;
    }

    /**
     * 设置遮罩对象，并更新当前组件的裁剪关系。
     * @param value 遮罩对象。
     */
    public set mask(value: GObject) {
        this.setMask(value, false);
    }

    /**
     * 设置当前组件的遮罩对象，并决定是否按反向遮罩显示。
     * @param value 遮罩对象。
     * @param inverted 是否使用反向遮罩。
     */
    public setMask(value: GObject, inverted: boolean): void {
        if (this._maskContent) {
            this._maskContent.node.off(Node.EventType.TRANSFORM_CHANGED, this.onMaskContentChanged, this);
            this._maskContent.node.off(Node.EventType.SIZE_CHANGED, this.onMaskContentChanged, this);
            this._maskContent.node.off(Node.EventType.ANCHOR_CHANGED, this.onMaskContentChanged, this);
            this._maskContent.visible = true;
        }

        this._maskContent = value;
        if (this._maskContent) {
            if (!(value instanceof GImage) && !(value instanceof GGraph))
                return;

            if (!this._customMask) {
                let maskNode: Node = new Node("Mask");
                maskNode.layer = UIConfig.defaultUILayer;
                maskNode.addComponent(UITransform);
                maskNode.parent = this._node;
                if (this._scrollPane)
                    this._container.parent.parent = maskNode;
                else
                    this._container.parent = maskNode;
                this._customMask = maskNode.addComponent(Mask);
            }

            value.visible = false;
            value.node.on(Node.EventType.TRANSFORM_CHANGED, this.onMaskContentChanged, this);
            value.node.on(Node.EventType.SIZE_CHANGED, this.onMaskContentChanged, this);
            value.node.on(Node.EventType.ANCHOR_CHANGED, this.onMaskContentChanged, this);

            this._invertedMask = inverted;
            if (this._node.activeInHierarchy)
                this.onMaskReady();
            else
                this.on(FUIEvent.DISPLAY, this.onMaskReady, this);

            this.onMaskContentChanged();
            if (this._scrollPane)
                this._scrollPane.adjustMaskContainer();
            else
                this._container.setPosition(0, 0);
        }
        else if (this._customMask) {
            if (this._scrollPane)
                this._container.parent.parent = this._node;
            else
                this._container.parent = this._node;
            this._customMask.node.destroy();
            this._customMask = null;

            if (this._scrollPane)
                this._scrollPane.adjustMaskContainer();
            else
                this._container.setPosition(this._pivotCorrectX, this._pivotCorrectY);
        }
    }

    /**
     * 遮罩对象可用后，正式把遮罩关系挂到当前组件上。
     */
    private onMaskReady() {
        this.off(FUIEvent.DISPLAY, this.onMaskReady, this);

        if (this._maskContent instanceof GImage) {
            this._customMask.type = Mask.Type.SPRITE_STENCIL;
            this._customMask.alphaThreshold = 0.0001;
            this._customMask.spriteFrame = this._maskContent._content.spriteFrame;
        }
        else if (this._maskContent instanceof GGraph) {
            if (this._maskContent.type == 2)
                this._customMask.type = Mask.Type.GRAPHICS_ELLIPSE;
            else
                this._customMask.type = Mask.Type.GRAPHICS_RECT;
        }

        this._customMask.inverted = this._invertedMask;
    }

    /**
     * 遮罩内容变化后同步刷新遮罩尺寸、位置和依赖状态。
     */
    private onMaskContentChanged() {
        let maskNode: Node = this._customMask.node;
        let maskUITrans: UITransform = maskNode.getComponent(UITransform);

        let contentNode: Node = this._maskContent.node;
        let contentUITrans: UITransform = this._maskContent._uiTrans;

        let w: number = this._maskContent.width * this._maskContent.scaleX;
        let h: number = this._maskContent.height * this._maskContent.scaleY;

        maskUITrans.setContentSize(w, h);

        let left: number = contentNode.position.x - contentUITrans.anchorX * w;
        let top: number = contentNode.position.y - contentUITrans.anchorY * h;
        maskUITrans.setAnchorPoint(-left / maskUITrans.width, -top / maskUITrans.height);

        maskNode.setPosition(this._pivotCorrectX, this._pivotCorrectY);
    }

    /**
     * 获取枢轴修正后的 X 偏移量。
     */
    public get _pivotCorrectX(): number {
        return -this.pivotX * this._width + this._margin.left;
    }

    /**
     * 获取枢轴修正后的 Y 偏移量。
     */
    public get _pivotCorrectY(): number {
        return this.pivotY * this._height - this._margin.top;
    }

    /**
     * 获取包资源上记录的基础用户数据。
     */
    public get baseUserData(): string {
        var buffer: ByteBuffer = this.packageItem.rawData;
        buffer.seek(0, 4);
        return buffer.readS();
    }

    /**
     * 根据包配置初始化滚动面板。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected setupScroll(buffer: ByteBuffer): void {
        this._scrollPane = this._node.addComponent(ScrollPane);
        this._scrollPane.setup(buffer);
    }

    /**
     * 根据溢出策略初始化裁剪或滚动行为。
     * @param overflow 溢出处理策略。
     */
    protected setupOverflow(overflow: OverflowType): void {
        if (overflow == OverflowType.Hidden)
            this._rectMask = this._container.addComponent(Mask);

        if (!this._margin.isNone)
            this.handleSizeChanged();
    }

    /**
     * 在锚点变化后重新同步对象布局与定位结果。
     */
    protected handleAnchorChanged(): void {
        super.handleAnchorChanged();

        if (this._customMask)
            this._customMask.node.setPosition(this._pivotCorrectX, this._pivotCorrectY);
        else if (this._scrollPane)
            this._scrollPane.adjustMaskContainer();
        else
            this._container.setPosition(this._pivotCorrectX + this._alignOffset.x, this._pivotCorrectY - this._alignOffset.y);
    }

    /**
     * 在尺寸变化后同步底层节点尺寸、布局和裁剪范围。
     */
    protected handleSizeChanged(): void {
        super.handleSizeChanged();

        if (this._customMask)
            this._customMask.node.setPosition(this._pivotCorrectX, this._pivotCorrectY);
        else if (!this._scrollPane)
            this._container.setPosition(this._pivotCorrectX, this._pivotCorrectY);

        if (this._scrollPane)
            this._scrollPane.onOwnerSizeChanged();
        else
            this._containerUITrans.setContentSize(this.viewWidth, this.viewHeight);
    }

    /**
     * 在灰度状态变化后同步底层渲染组件效果。
     */
    protected handleGrayedChanged(): void {
        var c: Controller = this.getController("grayed");
        if (c) {
            c.selectedIndex = this.grayed ? 1 : 0;
            return;
        }

        var v: boolean = this.grayed;
        var cnt: number = this._children.length;
        for (var i: number = 0; i < cnt; ++i) {
            this._children[i].grayed = v;
        }
    }

    /**
     * 响应控制器页签变化，刷新当前对象的联动状态。
     * @param c 当前变化的控制器。
     */
    public handleControllerChanged(c: Controller): void {
        super.handleControllerChanged(c);

        if (this._scrollPane)
            this._scrollPane.handleControllerChanged(c);
    }

    /**
     * 执行命中检测，判断当前坐标是否落在可交互区域内。
     * @param pt 待检测的局部坐标。
     * @param globalPt 待检测的全局坐标。
     * @returns 命中的目标对象；未命中时返回空值。
     */
    protected _hitTest(pt: Vec2, globalPt: Vec2): GObject {
        if (this._customMask) {
            s_vec2.set(globalPt);
            s_vec2.y = UIContentScaler.rootSize.height - globalPt.y;
            let b = this._customMask.isHit(s_vec2) || false;
            if (!b)
                return null;
        }

        if (this.hitArea) {
            if (!this.hitArea.hitTest(pt, globalPt))
                return null;
        }
        else if (this._rectMask) {
            s_vec2.set(pt);
            s_vec2.x += this._container.position.x;
            s_vec2.y += this._container.position.y;

            let clippingSize: Size = this._containerUITrans.contentSize;
            if (s_vec2.x < 0 || s_vec2.y < 0 || s_vec2.x >= clippingSize.width || s_vec2.y >= clippingSize.height)
                return null;
        }

        if (this._scrollPane) {
            let target = this._scrollPane.hitTest(pt, globalPt);
            if (!target)
                return null;

            if (target != this)
                return target;
        }

        let target: GObject = null;

        let cnt = this._children.length;
        for (let i = cnt - 1; i >= 0; i--) {
            let child = this._children[i];
            if (this._maskContent == child || child._touchDisabled)
                continue;

            target = child.hitTest(globalPt);
            if (target)
                break;
        }

        if (!target && this._opaque && (this.hitArea || pt.x >= 0 && pt.y >= 0 && pt.x < this._width && pt.y < this._height))
            target = this;

        return target;
    }

    /**
     * 标记分组边界已失效，并根据需要决定是否只重算位置。
     */
    public setBoundsChangedFlag(): void {
        if (!this._scrollPane && !this._trackBounds)
            return;

        if (!this._boundsChanged) {
            this._boundsChanged = true;

            this._partner.callLater(this.refresh);
        }
    }

    /**
     * 刷新滚动位置、滚动条状态与回弹结果。
     * @param dt 调度器回调透传的时间参数。
     */
    private refresh(dt?: number): void {
        if (!isNaN(dt)) {
            let _t = <GComponent>GObject.cast(this.node);
            _t.refresh();
            return;
        }

        if (this._boundsChanged) {
            var len: number = this._children.length;
            if (len > 0) {
                for (var i: number = 0; i < len; i++) {
                    var child: GObject = this._children[i];
                    child.ensureSizeCorrect();
                }
            }

            this.updateBounds();
        }
    }

    /**
     * 确保当前边界缓存已经刷新完成，避免后续读取到过期范围。
     */
    public ensureBoundsCorrect(): void {
        var len: number = this._children.length;
        if (len > 0) {
            for (var i: number = 0; i < len; i++) {
                var child: GObject = this._children[i];
                child.ensureSizeCorrect();
            }
        }

        if (this._boundsChanged)
            this.updateBounds();
    }

    /**
     * 重新计算内容边界，并同步容器尺寸或滚动范围。
     */
    protected updateBounds(): void {
        var ax: number = 0, ay: number = 0, aw: number = 0, ah: number = 0;
        var len: number = this._children.length;
        if (len > 0) {
            ax = Number.POSITIVE_INFINITY, ay = Number.POSITIVE_INFINITY;
            var ar: number = Number.NEGATIVE_INFINITY, ab: number = Number.NEGATIVE_INFINITY;
            var tmp: number = 0;
            var i: number = 0;

            for (var i: number = 0; i < len; i++) {
                var child: GObject = this._children[i];
                tmp = child.x;
                if (tmp < ax)
                    ax = tmp;
                tmp = child.y;
                if (tmp < ay)
                    ay = tmp;
                tmp = child.x + child.actualWidth;
                if (tmp > ar)
                    ar = tmp;
                tmp = child.y + child.actualHeight;
                if (tmp > ab)
                    ab = tmp;
            }
            aw = ar - ax;
            ah = ab - ay;
        }

        this.setBounds(ax, ay, aw, ah);
    }

    /**
     * 直接写入当前组件的内容边界矩形。
     * @param ax X 方向起始边界。
     * @param ay Y 方向起始边界。
     * @param aw 边界宽度。
     * @param ah 边界高度。
     */
    public setBounds(ax: number, ay: number, aw: number, ah: number = 0): void {
        this._boundsChanged = false;

        if (this._scrollPane)
            this._scrollPane.setContentSize(Math.round(ax + aw), Math.round(ay + ah));
    }

    /**
     * 获取当前可视区域宽度。
     */
    public get viewWidth(): number {
        if (this._scrollPane)
            return this._scrollPane.viewWidth;
        else
            return this.width - this._margin.left - this._margin.right;
    }

    /**
     * 设置可视区域宽度，并同步滚动视口或容器尺寸。
     * @param value 可视区域宽度。
     */
    public set viewWidth(value: number) {
        if (this._scrollPane)
            this._scrollPane.viewWidth = value;
        else
            this.width = value + this._margin.left + this._margin.right;
    }

    /**
     * 获取当前可视区域高度。
     */
    public get viewHeight(): number {
        if (this._scrollPane)
            return this._scrollPane.viewHeight;
        else
            return this.height - this._margin.top - this._margin.bottom;
    }

    /**
     * 设置可视区域高度，并同步滚动视口或容器尺寸。
     * @param value 可视区域高度。
     */
    public set viewHeight(value: number) {
        if (this._scrollPane)
            this._scrollPane.viewHeight = value;
        else
            this.height = value + this._margin.top + this._margin.bottom;
    }

    /**
     * 根据布局和吸附策略计算目标吸附位置。
     * @param xValue 目标 X 坐标。
     * @param yValue 目标 Y 坐标。
     * @param resultPoint 可选结果坐标对象。
     * @returns 计算后的吸附坐标。
     */
    public getSnappingPosition(xValue: number, yValue: number, resultPoint?: Vec2): Vec2 {
        if (!resultPoint)
            resultPoint = new Vec2();

        var cnt: number = this._children.length;
        if (cnt == 0) {
            resultPoint.x = 0;
            resultPoint.y = 0;
            return resultPoint;
        }

        this.ensureBoundsCorrect();

        var obj: GObject = null;
        var prev: GObject = null;
        var i: number = 0;
        if (yValue != 0) {
            for (; i < cnt; i++) {
                obj = this._children[i];
                if (yValue < obj.y) {
                    if (i == 0) {
                        yValue = 0;
                        break;
                    }
                    else {
                        prev = this._children[i - 1];
                        if (yValue < prev.y + prev.actualHeight / 2) //top half part
                            yValue = prev.y;
                        else //bottom half part
                            yValue = obj.y;
                        break;
                    }
                }
            }

            if (i == cnt)
                yValue = obj.y;
        }

        if (xValue != 0) {
            if (i > 0)
                i--;
            for (; i < cnt; i++) {
                obj = this._children[i];
                if (xValue < obj.x) {
                    if (i == 0) {
                        xValue = 0;
                        break;
                    }
                    else {
                        prev = this._children[i - 1];
                        if (xValue < prev.x + prev.actualWidth / 2) //top half part
                            xValue = prev.x;
                        else //bottom half part
                            xValue = obj.x;
                        break;
                    }
                }
            }

            if (i == cnt)
                xValue = obj.x;
        }

        resultPoint.x = xValue;
        resultPoint.y = yValue;
        return resultPoint;
    }

    /**
     * 在子对象排序值变化后重建同级排序结果。
     * @param child 目标子对象。
     * @param oldValue 旧排序值。
     * @param newValue 新排序值。
     */
    public childSortingOrderChanged(child: GObject, oldValue: number, newValue: number = 0): void {
        if (newValue == 0) {
            this._sortingChildCount--;
            this.setChildIndex(child, this._children.length);
        }
        else {
            if (oldValue == 0)
                this._sortingChildCount++;

            var oldIndex: number = this._children.indexOf(child);
            var index: number = this.getInsertPosForSortingChild(child);
            if (oldIndex < index)
                this._setChildIndex(child, oldIndex, index - 1);
            else
                this._setChildIndex(child, oldIndex, index);
        }
    }

    /**
     * 根据包内资源描述构建底层显示对象、尺寸与初始数据。
     */
    public constructFromResource(): void {
        this.constructFromResource2(null, 0);
    }

    /**
     * 继续从包资源中构建子对象、控制器与过渡动画。
     * @param objectPool 对象池。
     * @param poolIndex 对象池读取游标。
     */
    public constructFromResource2(objectPool: Array<GObject>, poolIndex: number): void {
        var contentItem: PackageItem = this.packageItem.getBranch();

        if (!contentItem.decoded) {
            contentItem.decoded = true;
            TranslationHelper.translateComponent(contentItem);
        }

        var i: number;
        var dataLen: number;
        var curPos: number;
        var nextPos: number;
        var f1: number;
        var f2: number;
        var i1: number;
        var i2: number;

        var buffer: ByteBuffer = contentItem.rawData;
        buffer.seek(0, 0);

        this._underConstruct = true;

        this.sourceWidth = buffer.readInt();
        this.sourceHeight = buffer.readInt();
        this.initWidth = this.sourceWidth;
        this.initHeight = this.sourceHeight;

        this.setSize(this.sourceWidth, this.sourceHeight);

        if (buffer.readBool()) {
            this.minWidth = buffer.readInt();
            this.maxWidth = buffer.readInt();
            this.minHeight = buffer.readInt();
            this.maxHeight = buffer.readInt();
        }

        if (buffer.readBool()) {
            f1 = buffer.readFloat();
            f2 = buffer.readFloat();
            this.setPivot(f1, f2, buffer.readBool());
        }

        if (buffer.readBool()) {
            this._margin.top = buffer.readInt();
            this._margin.bottom = buffer.readInt();
            this._margin.left = buffer.readInt();
            this._margin.right = buffer.readInt();
        }

        var overflow: number = buffer.readByte();
        if (overflow == OverflowType.Scroll) {
            var savedPos: number = buffer.position;
            buffer.seek(0, 7);
            this.setupScroll(buffer);
            buffer.position = savedPos;
        }
        else
            this.setupOverflow(overflow);

        if (buffer.readBool())
            buffer.skip(8);

        this._buildingDisplayList = true;

        buffer.seek(0, 1);

        var controllerCount: number = buffer.readShort();
        for (i = 0; i < controllerCount; i++) {
            nextPos = buffer.readShort();
            nextPos += buffer.position;

            var controller: Controller = new Controller();
            this._controllers.push(controller);
            controller.parent = this;
            controller.setup(buffer);

            buffer.position = nextPos;
        }

        buffer.seek(0, 2);

        var child: GObject;
        var childCount: number = buffer.readShort();
        for (i = 0; i < childCount; i++) {
            dataLen = buffer.readShort();
            curPos = buffer.position;

            if (objectPool)
                child = objectPool[poolIndex + i];
            else {
                buffer.seek(curPos, 0);

                var type: ObjectType = buffer.readByte();
                var src: string = buffer.readS();
                var pkgId: string = buffer.readS();

                var pi: PackageItem = null;
                if (src != null) {
                    var pkg: UIPackage;
                    if (pkgId != null)
                        pkg = UIPackage.getById(pkgId);
                    else
                        pkg = contentItem.owner;

                    pi = pkg ? pkg.getItemById(src) : null;
                }

                if (pi) {
                    child = Decls.UIObjectFactory.newObject(pi);
                    child.constructFromResource();
                }
                else
                    child = Decls.UIObjectFactory.newObject(type);
            }

            child._underConstruct = true;
            child.setup_beforeAdd(buffer, curPos);
            child._parent = this;
            child.node.parent = this._container;
            this._children.push(child);

            buffer.position = curPos + dataLen;
        }

        buffer.seek(0, 3);
        this.relations.setup(buffer, true);

        buffer.seek(0, 2);
        buffer.skip(2);

        for (i = 0; i < childCount; i++) {
            nextPos = buffer.readShort();
            nextPos += buffer.position;

            buffer.seek(buffer.position, 3);
            this._children[i].relations.setup(buffer, false);

            buffer.position = nextPos;
        }

        buffer.seek(0, 2);
        buffer.skip(2);

        for (i = 0; i < childCount; i++) {
            nextPos = buffer.readShort();
            nextPos += buffer.position;

            child = this._children[i];
            child.setup_afterAdd(buffer, buffer.position);
            child._underConstruct = false;

            buffer.position = nextPos;
        }

        buffer.seek(0, 4);

        buffer.skip(2); //customData
        this.opaque = buffer.readBool();
        var maskId: number = buffer.readShort();
        if (maskId != -1) {
            this.setMask(this.getChildAt(maskId), buffer.readBool());
        }

        var hitTestId: string = buffer.readS();
        i1 = buffer.readInt();
        i2 = buffer.readInt();

        if (hitTestId != null) {
            pi = contentItem.owner.getItemById(hitTestId);
            if (pi && pi.hitTestData)
                this.hitArea = new PixelHitTest(pi.hitTestData, i1, i2);
        }
        else if (i1 != 0 && i2 != -1) {
            this.hitArea = new ChildHitArea(this.getChildAt(i2));
        }

        buffer.seek(0, 5);

        var transitionCount: number = buffer.readShort();
        for (i = 0; i < transitionCount; i++) {
            nextPos = buffer.readShort();
            nextPos += buffer.position;

            var trans: Transition = new Transition(this);
            trans.setup(buffer);
            this._transitions.push(trans);

            buffer.position = nextPos;
        }

        this.applyAllControllers();

        this._buildingDisplayList = false;
        this._underConstruct = false;

        this.buildNativeDisplayList();
        this.setBoundsChangedFlag();

        if (contentItem.objectType != ObjectType.Component)
            this.constructExtension(buffer);

        this.onConstruct();
    }

    /**
     * 从扩展数据中读取组件特有配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected constructExtension(buffer: ByteBuffer): void {
    }

    /**
     * 组件构建完成钩子；子类可在这里接管扩展构造后的补充逻辑。
     */
    protected onConstruct(): void {
    }

    /**
     * 在对象加入父级后，继续补充依赖父级、控制器或运行时环境的配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_afterAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_afterAdd(buffer, beginPos);

        buffer.seek(beginPos, 4);

        var pageController: number = buffer.readShort();
        if (pageController != -1 && this._scrollPane)
            this._scrollPane.pageController = this._parent.getControllerAt(pageController);

        var cnt: number = buffer.readShort();
        for (var i: number = 0; i < cnt; i++) {
            var cc: Controller = this.getController(buffer.readS());
            var pageId: string = buffer.readS();
            if (cc)
                cc.selectedPageId = pageId;
        }

        if (buffer.version >= 2) {
            cnt = buffer.readShort();
            for (i = 0; i < cnt; i++) {
                var target: string = buffer.readS();
                var propertyId: number = buffer.readShort();
                var value: String = buffer.readS();
                var obj: GObject = this.getChildByPath(target);
                if (obj)
                    obj.setProp(propertyId, value);
            }
        }
    }

    /**
     * 组件启用时，恢复滚动面板与子级节点的运行态。
     */
    protected onEnable(): void {
        if (this._eventUnit && this._eventUnit.isPause) {
            this._eventUnit.resume();
        }
        let cnt: number = this._transitions.length;
        for (let i: number = 0; i < cnt; ++i)
            this._transitions[i].onEnable();
    }

    /**
     * 组件禁用时，暂停滚动与显示相关的运行态逻辑。
     */
    protected onDisable(): void {
        let cnt: number = this._transitions.length;
        for (let i: number = 0; i < cnt; ++i)
            this._transitions[i].onDisable();
    }
}

var s_vec2: Vec2 = new Vec2();
