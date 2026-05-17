import { Node, Vec2 } from "cc";
import { FEvent as FUIEvent } from "./event/Event";
import { RelationType } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GObject } from "./GObject";
import { GRoot } from "./GRoot";
import { UIConfig } from "./UIConfig";
import { UIPackage } from "./UIPackage";

/**
 * 窗口异步资源接口，约束窗口外部依赖资源的加载协议。
 */
export interface IUISource {
    /**
     * 资源文件名。
     */
    fileName: string;
    /**
     * 资源是否已经完成加载。
     */
    loaded: boolean;

    load(callback: () => void, target: any): void;
}

/**
 * 窗口基类，负责模态显示、打开关闭流程与窗口内部内容装配。
 */
export class Window extends GComponent {
    /**
     * 窗口内容面板。
     */
    private _contentPane: GComponent;
    /**
     * 模态等待面板。
     */
    private _modalWaitPane: GObject;
    /**
     * 关闭按钮对象。
     */
    private _closeButton: GObject;
    /**
     * 拖拽区域对象。
     */
    private _dragArea: GObject;
    /**
     * 内容区域对象。
     */
    private _contentArea: GObject;
    /**
     * 窗口标准 `frame` 组件。
     */
    private _frame: GComponent;
    /**
     * 当前是否按模态方式显示。
     */
    private _modal: boolean;

    /**
     * 窗口依赖的外部 UI 资源源列表。
     */
    private _uiSources?: Array<IUISource>;
    /**
     * 窗口是否已完成初始化。
     */
    private _inited?: boolean;
    /**
     * 窗口是否仍在加载资源。
     */
    private _loading?: boolean;

    /**
     * 当前模态等待对应的请求命令标记。
     */
    protected _requestingCmd: number = 0;

    /**
     * 点击窗口时是否自动前置到最上层。
     */
    public bringToFontOnClick: boolean;

    /**
     * 初始化窗口默认状态，并注册窗口级触摸监听以支持点按前置与拖拽。
     */
    public constructor() {
        super();
        this._uiSources = new Array<IUISource>();
        this.bringToFontOnClick = UIConfig.bringWindowToFrontOnClick;

        this._node.on(FUIEvent.TOUCH_BEGIN, this.onTouchBegin_1, this, true);
    }

    /**
     * 向窗口注册一个外部异步资源源。
     * @param source 外部 UI 资源源。
     */
    public addUISource(source: IUISource): void {
        this._uiSources.push(source);
    }

    /**
     * 设置窗口内容面板，并同步窗口尺寸、标准 `frame` 子节点以及默认关闭/拖拽区域绑定。
     * @param val 窗口内容面板对象。
     */
    public set contentPane(val: GComponent) {
        if (this._contentPane != val) {
            if (this._contentPane)
                this.removeChild(this._contentPane);
            this._contentPane = val;
            if (this._contentPane) {
                this.addChild(this._contentPane);
                this.setSize(this._contentPane.width, this._contentPane.height);
                this._contentPane.addRelation(this, RelationType.Size);
                this._frame = <GComponent>(this._contentPane.getChild("frame"));
                if (this._frame) {
                    this.closeButton = this._frame.getChild("closeButton");
                    this.dragArea = this._frame.getChild("dragArea");
                    this.contentArea = this._frame.getChild("contentArea");
                }
            }
        }
    }

    /**
     * 获取当前内容面板。
     */
    public get contentPane(): GComponent {
        return this._contentPane;
    }

    /**
     * 获取窗口内部的 `frame` 组件，用于访问关闭按钮、拖拽区等标准子节点。
     */
    public get frame(): GComponent {
        return this._frame;
    }

    /**
     * 获取当前关闭按钮。
     */
    public get closeButton(): GObject {
        return this._closeButton;
    }

    /**
     * 设置关闭按钮，并自动维护点击关闭事件的注册与解绑。
     * @param value 关闭按钮对象。
     */
    public set closeButton(value: GObject) {
        if (this._closeButton)
            this._closeButton.offClick(this.closeEventHandler, this);
        this._closeButton = value;
        if (this._closeButton)
            this._closeButton.onClick(this.closeEventHandler, this);
    }

    /**
     * 获取当前拖拽区域。
     */
    public get dragArea(): GObject {
        return this._dragArea;
    }

    /**
     * 设置拖拽区域，并自动维护拖拽能力和 `DRAG_START` 监听。
     * @param value 拖拽区域对象。
     */
    public set dragArea(value: GObject) {
        if (this._dragArea != value) {
            if (this._dragArea) {
                this._dragArea.draggable = false;
                this._dragArea.off(FUIEvent.DRAG_START, this.onDragStart_1, this);
            }

            this._dragArea = value;
            if (this._dragArea) {
                this._dragArea.draggable = true;
                this._dragArea.on(FUIEvent.DRAG_START, this.onDragStart_1, this);
            }
        }
    }

    /**
     * 获取当前内容区域。
     */
    public get contentArea(): GObject {
        return this._contentArea;
    }

    /**
     * 设置内容区域对象；该区域通常用于对外暴露窗口正文可用范围。
     * @param value 内容区域对象。
     */
    public set contentArea(value: GObject) {
        this._contentArea = value;
    }

    /**
     * 显示当前对象或界面内容。
     */
    public show(): void {
        GRoot.inst.showWindow(this);
    }

    /**
     * 把当前对象显示到指定宿主或根节点上。
     * @param root 目标宿主或根节点。
     */
    public showOn(root: GRoot): void {
        root.showWindow(this);
    }

    /**
     * 隐藏当前对象或界面内容。
     */
    public hide(): void {
        if (this.isShowing)
            this.doHideAnimation();
    }

    /**
     * 立即隐藏当前对象，并跳过动画或延迟流程。
     */
    public hideImmediately(): void {
        var r: GRoot = (this.parent instanceof GRoot) ? this.parent : null;
        if (!r)
            r = GRoot.inst;
        r.hideWindowImmediately(this);
    }

    /**
     * 将当前窗口居中到目标根节点或宿主区域。
     * @param r 目标根节点。
     * @param restraint 是否限制后续拖动仍保持在根节点范围内。
     */
    public centerOn(r: GRoot, restraint?: boolean) {
        this.setPosition(Math.round((r.width - this.width) / 2), Math.round((r.height - this.height) / 2));
        if (restraint) {
            this.addRelation(r, RelationType.Center_Center);
            this.addRelation(r, RelationType.Middle_Middle);
        }
    }

    /**
     * 在显示和隐藏状态之间切换当前对象。
     */
    public toggleStatus(): void {
        if (this.isTop)
            this.hide();
        else
            this.show();
    }

    /**
     * 判断窗口当前是否处于显示状态。
     */
    public get isShowing(): boolean {
        return this.parent != null;
    }

    /**
     * 判断窗口当前是否位于同级窗口栈顶。
     */
    public get isTop(): boolean {
        return this.parent && this.parent.getChildIndex(this) == this.parent.numChildren - 1;
    }

    /**
     * 获取窗口当前是否按模态方式显示。
     */
    public get modal(): boolean {
        return this._modal;
    }

    /**
     * 设置窗口是否为模态窗口；模态状态会影响根节点上的模态层显示逻辑。
     * @param val 是否按模态方式显示。
     */
    public set modal(val: boolean) {
        this._modal = val;
    }

    /**
     * 将当前对象提升到同级显示列表前端。
     */
    public bringToFront(): void {
        GRoot.inst.bringToFront(this);
    }

    /**
     * 显示模态等待层或加载遮罩。
     * @param requestingCmd 可选请求命令标记。
     */
    public showModalWait(requestingCmd?: number): void {
        if (requestingCmd != null)
            this._requestingCmd = requestingCmd;

        if (UIConfig.windowModalWaiting) {
            if (!this._modalWaitPane)
                this._modalWaitPane = UIPackage.createObjectFromURL(UIConfig.windowModalWaiting);

            this.layoutModalWaitPane();

            this.addChild(this._modalWaitPane);
        }
    }

    /**
     * 根据当前窗口尺寸重新布局模态等待层。
     */
    protected layoutModalWaitPane(): void {
        if (this._contentArea) {
            var pt: Vec2 = this._frame.localToGlobal();
            pt = this.globalToLocal(pt.x, pt.y, pt);
            this._modalWaitPane.setPosition(pt.x + this._contentArea.x, pt.y + this._contentArea.y);
            this._modalWaitPane.setSize(this._contentArea.width, this._contentArea.height);
        }
        else
            this._modalWaitPane.setSize(this.width, this.height);
    }

    /**
     * 关闭当前模态等待层。
     * @param requestingCmd 可选请求命令标记；传入时需与当前标记一致才会关闭。
     * @returns 是否成功关闭等待层。
     */
    public closeModalWait(requestingCmd?: number): boolean {
        if (requestingCmd != null) {
            if (this._requestingCmd != requestingCmd)
                return false;
        }
        this._requestingCmd = 0;

        if (this._modalWaitPane && this._modalWaitPane.parent)
            this.removeChild(this._modalWaitPane);

        return true;
    }

    /**
     * 判断当前是否处于模态等待状态。
     */
    public get modalWaiting(): boolean {
        return this._modalWaitPane && this._modalWaitPane.parent != null;
    }


    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    public init(): void {
        if (this._inited || this._loading)
            return;

        if (this._uiSources.length > 0) {
            this._loading = false;
            var cnt: number = this._uiSources.length;
            for (var i: number = 0; i < cnt; i++) {
                var lib: IUISource = this._uiSources[i];
                if (!lib.loaded) {
                    lib.load(this.__uiLoadComplete, this);
                    this._loading = true;
                }
            }

            if (!this._loading)
                this._init();
        }
        else
            this._init();
    }

    /**
     * 窗口初始化钩子；首次显示前会调用，子类可在这里创建内容。
     */
    protected onInit(): void {
    }

    /**
     * 窗口显示完成钩子；适合在这里刷新数据或启动入场表现。
     */
    protected onShown(): void {
    }

    /**
     * 窗口隐藏钩子；适合在这里做临时状态回收。
     */
    protected onHide(): void {
    }

    /**
     * 执行打开动画，并在结束后进入显示状态。
     */
    protected doShowAnimation(): void {
        this.onShown();
    }

    /**
     * 执行关闭动画，并在结束后完成隐藏清理。
     */
    protected doHideAnimation(): void {
        this.hideImmediately();
    }

    /**
     * 处理界面资源加载完成后的装配逻辑。
     */
    private __uiLoadComplete(): void {
        var cnt: number = this._uiSources.length;
        for (var i: number = 0; i < cnt; i++) {
            var lib: IUISource = this._uiSources[i];
            if (!lib.loaded)
                return;
        }

        this._loading = false;
        this._init();
    }

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    private _init(): void {
        this._inited = true;
        this.onInit();

        if (this.isShowing)
            this.doShowAnimation();
    }

    /**
     * 释放窗口自身资源，并解除与根节点、按钮和拖拽区的关联。
     */
    public dispose(): void {
        if (this.parent)
            this.hideImmediately();

        super.dispose();
    }

    /**
     * 处理关闭按钮或关闭事件触发后的回调逻辑。
     * @param evt 关闭事件对象。
     */
    protected closeEventHandler(evt: Event): void {
        this.hide();
    }

    /**
     * 节点启用时同步窗口显示状态与舞台关系。
     */
    protected onEnable(): void {
        super.onEnable();

        if (!this._inited)
            this.init();
        else
            this.doShowAnimation();
    }

    /**
     * 节点禁用时同步窗口隐藏状态与舞台关系。
     */
    protected onDisable(): void {
        super.onDisable();

        this.closeModalWait();
        this.onHide();
    }

    /**
     * 响应按下事件，记录按压状态并准备点击流程。
     * @param evt 触摸开始事件对象。
     */
    private onTouchBegin_1(evt: FUIEvent): void {
        if (this.isShowing && this.bringToFontOnClick)
            this.bringToFront();
    }

    /**
     * 拦截拖拽起始事件，并把窗口拖动控制权切到窗口本体上。
     * @param evt 拖拽开始事件对象。
     */
    private onDragStart_1(evt: FUIEvent): void {
        var original: GObject = GObject.cast(<Node>evt.currentTarget);
        original.stopDrag();

        this.startDrag(evt.touchId);
    }
}
