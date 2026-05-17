import { director, Color, Vec2, AudioClip, View, AudioSourceComponent, UITransform } from "cc";
import { EDITOR } from "cc/env";
import { InputProcessor } from "./event/InputProcessor";
import { RelationType, PopupDirection } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GGraph } from "./GGraph";
import { Decls, GObject } from "./GObject";
import { UIConfig } from "./UIConfig";
import { UIContentScaler, updateScaler } from "./UIContentScaler";
import { UIPackage } from "./UIPackage";
import { Window } from "./Window";
import { FEvent as FUIEvent } from "./event/Event";

/**
 * 根节点组件，负责全局弹窗、模态层、焦点、提示与窗口管理。
 */
export class GRoot extends GComponent {
    /**
     * 模态遮罩层对象。
     */
    private _modalLayer: GGraph;
    /**
     * 当前弹窗栈。
     */
    private _popupStack: Array<GObject>;
    /**
     * 刚关闭的弹窗列表。
     */
    private _justClosedPopups: Array<GObject>;
    /**
     * 模态等待面板。
     */
    private _modalWaitPane: GObject;
    /**
     * 当前提示窗口对象。
     */
    private _tooltipWin: GObject;
    /**
     * 默认提示窗口对象。
     */
    private _defaultTooltipWin: GObject;
    /**
     * 全局音量缩放倍率。
     */
    private _volumeScale: number;
    /**
     * 根节点输入处理器。
     */
    private _inputProcessor: InputProcessor;
    /**
     * 尺寸变化监听回调引用。
     */
    private _thisOnResized: () => void;
    /**
     * 音频播放组件。
     */
    private audioEngine: AudioSourceComponent;

    /**
     * 单例实例引用。
     */
    private static _inst: GRoot;

    /**
     * 获取当前单例实例。
     */
    public static get inst(): GRoot {
        if (!GRoot._inst)
            throw 'Call GRoot.create first!';

        return GRoot._inst;
    }

    /**
     * 创建全局根节点实例并挂到场景 Canvas 下。
     */
    public static create(): GRoot {
        GRoot._inst = new GRoot();
        director.getScene().getChildByName('Canvas').addChild(GRoot._inst.node);
        GRoot._inst.onWinResize();

        return GRoot._inst;
    }

    /**
     * 初始化根节点输入系统、模态层和全局窗口/弹窗管理所需状态。
     */
    public constructor() {
        super();

        this._node.name = "GRoot";
        this.opaque = false;
        this._volumeScale = 1;
        this._popupStack = new Array<GObject>();
        this._justClosedPopups = new Array<GObject>();

        this._modalLayer = new GGraph();
        this._modalLayer.setSize(this.width, this.height);
        this._modalLayer.drawRect(0, Color.TRANSPARENT, UIConfig.modalLayerColor);
        this._modalLayer.addRelation(this, RelationType.Size);

        this._thisOnResized = this.onWinResize.bind(this);

        this._inputProcessor = this.node.addComponent(InputProcessor);
        this._inputProcessor._captureCallback = this.onTouchBegin_1;

        View.instance.on('design-resolution-changed', this.onWinResize, this);
        if (!EDITOR) {
            View.instance.on('canvas-resize', this._thisOnResized);
            window.addEventListener('orientationchange', this._thisOnResized);
        }
    }

    /**
     * 根节点销毁时解除窗口尺寸监听、输入处理器和全局单例引用。
     */
    protected onDestroy(): void {
        View.instance.off('design-resolution-changed', this.onWinResize, this);
        if (!EDITOR) {
            View.instance.off('canvas-resize', this._thisOnResized);
            window.removeEventListener('orientationchange', this._thisOnResized);
        }

        if (this == GRoot._inst)
            GRoot._inst = null;
    }

    /**
     * 返回指定触点当前的全局坐标。
     * @param touchId 触点 ID。
     * @returns 对应触点的全局坐标。
     */
    public getTouchPosition(touchId?: number): Vec2 {
        return this._inputProcessor.getTouchPosition(touchId);
    }

    /**
     * 获取当前触摸命中的 GUI 对象。
     * @returns 当前触摸命中的 GUI 对象；未命中时返回空值。
     */
    public get touchTarget(): GObject {
        return this._inputProcessor.getTouchTarget();
    }

    /**
     * 获取当前输入处理器。
     * @returns 当前根节点使用的输入处理器。
     */
    public get inputProcessor(): InputProcessor {
        return this._inputProcessor;
    }

    /**
     * 显示指定窗口。
     * @param win 目标窗口。
     */
    public showWindow(win: Window): void {
        this.addChild(win);
        win.requestFocus();

        if (win.x > this.width)
            win.x = this.width - win.width;
        else if (win.x + win.width < 0)
            win.x = 0;

        if (win.y > this.height)
            win.y = this.height - win.height;
        else if (win.y + win.height < 0)
            win.y = 0;

        this.adjustModalLayer();
    }

    /**
     * 隐藏指定窗口。
     * @param win 目标窗口。
     */
    public hideWindow(win: Window): void {
        win.hide();
    }

    /**
     * 立即隐藏指定窗口。
     * @param win 目标窗口。
     */
    public hideWindowImmediately(win: Window): void {
        if (win.parent == this)
            this.removeChild(win);

        this.adjustModalLayer();
    }

    /**
     * 将当前对象提升到同级显示列表前端。
     * @param win 要前置的窗口对象。
     */
    public bringToFront(win: Window): void {
        var cnt: number = this.numChildren;
        var i: number;
        if (this._modalLayer.parent && !win.modal)
            i = this.getChildIndex(this._modalLayer) - 1;
        else
            i = cnt - 1;

        for (; i >= 0; i--) {
            var g: GObject = this.getChildAt(i);
            if (g == win)
                return;
            if (g instanceof Window)
                break;
        }

        if (i >= 0)
            this.setChildIndex(win, i);
    }

    /**
     * 显示模态等待层或加载遮罩。
     * @param msg 可选提示文本。
     */
    public showModalWait(msg?: string): void {
        if (UIConfig.globalModalWaiting != null) {
            if (this._modalWaitPane == null)
                this._modalWaitPane = UIPackage.createObjectFromURL(UIConfig.globalModalWaiting);
            this._modalWaitPane.setSize(this.width, this.height);
            this._modalWaitPane.addRelation(this, RelationType.Size);

            this.addChild(this._modalWaitPane);
            this._modalWaitPane.text = msg;
        }
    }

    /**
     * 关闭当前模态等待层。
     */
    public closeModalWait(): void {
        if (this._modalWaitPane && this._modalWaitPane.parent)
            this.removeChild(this._modalWaitPane);
    }

    /**
     * 关闭除模态窗口外的全部窗口。
     */
    public closeAllExceptModals(): void {
        var arr: Array<GObject> = this._children.slice();
        var cnt: number = arr.length;
        for (var i: number = 0; i < cnt; i++) {
            var g: GObject = arr[i];
            if ((g instanceof Window) && !g.modal)
                g.hide();
        }
    }

    /**
     * 关闭当前根节点上的所有窗口。
     */
    public closeAllWindows(): void {
        var arr: Array<GObject> = this._children.slice();
        var cnt: number = arr.length;
        for (var i: number = 0; i < cnt; i++) {
            var g: GObject = arr[i];
            if (g instanceof Window)
                g.hide();
        }
    }

    /**
     * 获取顶层窗口。
     * @returns 当前顶层窗口；未命中时返回空值。
     */
    public getTopWindow(): Window {
        var cnt: number = this.numChildren;
        for (var i: number = cnt - 1; i >= 0; i--) {
            var g: GObject = this.getChildAt(i);
            if (g instanceof Window) {
                return g;
            }
        }

        return null;
    }

    /**
     * 获取当前模态层。
     * @returns 当前模态遮罩层对象。
     */
    public get modalLayer(): GGraph {
        return this._modalLayer;
    }

    /**
     * 获取当前是否存在模态窗口。
     * @returns 当前是否存在模态窗口。
     */
    public get hasModalWindow(): boolean {
        return this._modalLayer.parent != null;
    }

    /**
     * 判断当前是否处于模态等待状态。
     * @returns 当前是否处于模态等待状态。
     */
    public get modalWaiting(): boolean {
        return this._modalWaitPane && this._modalWaitPane.node.activeInHierarchy;
    }

    /**
     * 计算弹窗的显示位置。
     * @param popup 弹窗对象。
     * @param target 可选目标对象。
     * @param dir 弹出方向策略。
     * @param result 可选结果坐标对象。
     * @returns 计算后的弹窗位置。
     */
    public getPopupPosition(popup: GObject, target?: GObject, dir?: PopupDirection | boolean, result?: Vec2): Vec2 {
        let pos = result || new Vec2();
        var sizeW: number = 0, sizeH: number = 0;
        if (target) {
            pos = target.localToGlobal();
            this.globalToLocal(pos.x, pos.y, pos);
            let pos2 = target.localToGlobal(target.width, target.height);
            this.globalToLocal(pos2.x, pos2.y, pos2);
            sizeW = pos2.x - pos.x;
            sizeH = pos2.y - pos.y;
        }
        else {
            pos = this.getTouchPosition();
            pos = this.globalToLocal(pos.x, pos.y);
        }

        if (pos.x + popup.width > this.width)
            pos.x = pos.x + sizeW - popup.width;
        pos.y += sizeH;
        if (((dir === undefined || dir === PopupDirection.Auto) && pos.y + popup.height > this.height)
            || dir === false || dir === PopupDirection.Up) {
            pos.y = pos.y - sizeH - popup.height - 1;
            if (pos.y < 0) {
                pos.y = 0;
                pos.x += sizeW / 2;
            }
        }

        return pos;
    }

    /**
     * 显示指定弹窗，并处理弹出方向与位置。
     * @param popup 弹窗对象。
     * @param target 可选目标对象。
     * @param dir 弹出方向策略。
     */
    public showPopup(popup: GObject, target?: GObject | null, dir?: PopupDirection | boolean): void {
        if (this._popupStack.length > 0) {
            var k: number = this._popupStack.indexOf(popup);
            if (k != -1) {
                for (var i: number = this._popupStack.length - 1; i >= k; i--)
                    this.removeChild(this._popupStack.pop());
            }
        }
        this._popupStack.push(popup);

        if (target) {
            var p: GObject = target;
            while (p) {
                if (p.parent == this) {
                    if (popup.sortingOrder < p.sortingOrder) {
                        popup.sortingOrder = p.sortingOrder;
                    }
                    break;
                }
                p = p.parent;
            }
        }

        this.addChild(popup);
        this.adjustModalLayer();

        let pt = this.getPopupPosition(popup, target, dir);
        popup.setPosition(pt.x, pt.y);
    }

    /**
     * 切换指定弹窗的显示状态。
     * @param popup 弹窗对象。
     * @param target 可选目标对象。
     * @param dir 弹出方向策略。
     */
    public togglePopup(popup: GObject, target?: GObject, dir?: PopupDirection | boolean): void {
        if (this._justClosedPopups.indexOf(popup) != -1)
            return;

        this.showPopup(popup, target, dir);
    }

    /**
     * 隐藏弹窗，可按需限定触发对象。
     * @param popup 弹窗对象。
     */
    public hidePopup(popup?: GObject): void {
        if (popup) {
            var k: number = this._popupStack.indexOf(popup);
            if (k != -1) {
                for (var i: number = this._popupStack.length - 1; i >= k; i--)
                    this.closePopup(this._popupStack.pop());
            }
        }
        else {
            var cnt: number = this._popupStack.length;
            for (i = cnt - 1; i >= 0; i--)
                this.closePopup(this._popupStack[i]);
            this._popupStack.length = 0;
        }
    }

    /**
     * 获取当前是否存在弹窗。
     * @returns 当前是否存在弹窗。
     */
    public get hasAnyPopup(): boolean {
        return this._popupStack.length != 0;
    }

    /**
     * 关闭指定弹窗对象。
     * @param target 弹窗对象。
     */
    private closePopup(target: GObject): void {
        if (target.parent) {
            if (target instanceof Window)
                target.hide();
            else
                this.removeChild(target);
        }
    }

    /**
     * 显示文本提示。
     * @param msg 提示文本。
     */
    public showTooltips(msg: string): void {
        if (this._defaultTooltipWin == null) {
            var resourceURL: string = UIConfig.tooltipsWin;
            if (!resourceURL) {
                console.error("UIConfig.tooltipsWin not defined");
                return;
            }

            this._defaultTooltipWin = UIPackage.createObjectFromURL(resourceURL);
        }

        this._defaultTooltipWin.text = msg;
        this.showTooltipsWin(this._defaultTooltipWin);
    }

    /**
     * 显示自定义提示窗口。
     * @param tooltipWin 提示窗口对象。
     */
    public showTooltipsWin(tooltipWin: GObject): void {
        this.hideTooltips();

        this._tooltipWin = tooltipWin;

        let pt: Vec2 = this.getTouchPosition();
        pt.x += 10;
        pt.y += 20;

        this.globalToLocal(pt.x, pt.y, pt);

        if (pt.x + this._tooltipWin.width > this.width) {
            pt.x = pt.x - this._tooltipWin.width - 1;
            if (pt.x < 0)
                pt.x = 10;
        }
        if (pt.y + this._tooltipWin.height > this.height) {
            pt.y = pt.y - this._tooltipWin.height - 1;
            if (pt.y < 0)
                pt.y = 10;
        }

        this._tooltipWin.setPosition(pt.x, pt.y);
        this.addChild(this._tooltipWin);
    }

    /**
     * 隐藏当前提示内容。
     */
    public hideTooltips(): void {
        if (this._tooltipWin) {
            if (this._tooltipWin.parent)
                this.removeChild(this._tooltipWin);
            this._tooltipWin = null;
        }
    }

    /**
     * 获取当前音量缩放。
     * @returns 当前全局音量缩放倍率。
     */
    public get volumeScale(): number {
        return this._volumeScale;
    }

    /**
     * 设置全局 UI 音效音量缩放；后续通过 `playOneShotSound` 播放的音效都会受它影响。
     * @param value 全局音量缩放倍率。
     */
    public set volumeScale(value: number) {
        this._volumeScale = value;
    }

    /**
     * 播放一次性音效。
     * @param clip 音频资源。
     * @param volumeScale 额外音量缩放倍率。
     */
    public playOneShotSound(clip: AudioClip, volumeScale?: number): void {
        if (!this.audioEngine) {
            this.audioEngine = this.node.addComponent(AudioSourceComponent);
        }

        if (volumeScale === undefined) volumeScale = 1;

        if (this.audioEngine.isValid) {
            this.audioEngine.clip = clip;
            this.audioEngine.volume = this._volumeScale * volumeScale
            this.audioEngine.loop = false;
            this.audioEngine.play();
        }
    }

    /**
     * 调整模态层层级，使其与窗口栈保持一致。
     */
    private adjustModalLayer(): void {
        var cnt: number = this.numChildren;

        if (this._modalWaitPane && this._modalWaitPane.parent)
            this.setChildIndex(this._modalWaitPane, cnt - 1);

        for (var i: number = cnt - 1; i >= 0; i--) {
            var g: GObject = this.getChildAt(i);
            if ((g instanceof Window) && g.modal) {
                if (this._modalLayer.parent == null)
                    this.addChildAt(this._modalLayer, i);
                else
                    this.setChildIndexBefore(this._modalLayer, i);
                return;
            }
        }

        if (this._modalLayer.parent)
            this.removeChild(this._modalLayer);
    }

    /**
     * 响应按下事件，记录按压状态并准备点击流程。
     * @param evt 触摸开始事件对象。
     */
    private onTouchBegin_1(evt: FUIEvent): void {
        if (this._tooltipWin)
            this.hideTooltips();

        this._justClosedPopups.length = 0;
        if (this._popupStack.length > 0) {
            let mc: GObject = evt.initiator;
            while (mc && mc != this) {
                let pindex: number = this._popupStack.indexOf(mc);
                if (pindex != -1) {
                    for (let i: number = this._popupStack.length - 1; i > pindex; i--) {
                        var popup: GObject = this._popupStack.pop();
                        this.closePopup(popup);
                        this._justClosedPopups.push(popup);
                    }
                    return;
                }
                mc = mc.findParent();
            }

            let cnt: number = this._popupStack.length;
            for (let i: number = cnt - 1; i >= 0; i--) {
                popup = this._popupStack[i];
                this.closePopup(popup);
                this._justClosedPopups.push(popup);
            }
            this._popupStack.length = 0;
        }
    }

    /**
     * 窗口尺寸变化时刷新缩放器、根节点尺寸和模态层布局。
     */
    public onWinResize(): void {
        updateScaler();

        this.setSize(UIContentScaler.rootSize.width, UIContentScaler.rootSize.height);
        let anchorPoint = this.node.getParent().getComponent(UITransform).anchorPoint;
        this.node.setPosition(-this._width * anchorPoint.x, this._height * (1 - anchorPoint.y));
    }

    /**
     * 在位置变化后同步内部容器与骨骼节点位置。
     */
    public handlePositionChanged() {
        //nothing here
    }
}

Decls.GRoot = GRoot;
