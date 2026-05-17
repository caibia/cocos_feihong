import { Asset, assetManager, Color, ImageAsset, isValid, Node, resources, Sprite, SpriteFrame, Texture2D, UITransform, Vec2 } from "cc";
import { MovieClip } from "./display/MovieClip";
import { AlignType, VertAlignType, LoaderFillType, FillMethod, FillOrigin, PackageItemType, ObjectPropID } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GObject } from "./GObject";
import { GObjectPool } from "./GObjectPool";
import { PackageItem } from "./PackageItem";
import { UIConfig } from "./UIConfig";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 资源加载组件，负责显示包内图片、外部纹理或组件内容，并处理对齐与错误占位。
 */
export class GLoader extends GObject {
    /** 外部资源 URL 的全局引用计数（仅统计 external，不含 ui://） 所有Gloader 公用一张表 */
    private static _externalUrlRefMap: Map<string, number> = new Map();

    /**
     * 底层 `MovieClip` 显示对象；静态图片和序列帧资源最终都会落在这里显示。
     */
    public _content: MovieClip;

    /**
     * 当前资源地址；支持 `ui://` 包资源、外部路径以及业务层自定义加载协议。
     */
    protected _url: string;
    /**
     * 水平对齐方式。
     */
    private _align: AlignType;
    /**
     * 垂直对齐方式。
     */
    private _verticalAlign: VertAlignType;
    /**
     * 是否根据内容自动调整尺寸。
     */
    private _autoSize: boolean;
    /**
     * 内容填充策略。
     */
    private _fill: LoaderFillType;
    /**
     * 是否只允许缩小，不允许放大内容。
     */
    private _shrinkOnly: boolean;
    /**
     * 是否显示错误占位图。
     */
    private _showErrorSign: boolean;
    /**
     * 当前播放状态。
     */
    private _playing: boolean;
    /**
     * 当前播放帧索引。
     */
    private _frame: number = 0;
    /**
     * 颜色。
     */
    private _color: Color;
    /**
     * 内容项。
     */
    private _contentItem: PackageItem;
    /**
     * 承载显示内容的容器节点。
     */
    private _container: Node;
    /**
     * 错误占位显示对象。
     */
    private _errorSign?: GObject;
    /**
     * 组件类型内容对象。
     */
    private _content2?: GComponent;
    /**
     * 是否正在执行布局刷新。
     */
    private _updatingLayout: boolean;
    /**
     * 外部资源所属资源包名称。
     */
    private _assetBundle: string;
    /**
     * 容器节点上的 `UITransform` 组件。
     */
    private _containerUITrans: UITransform;
    /** 当前 GLoader 绑定的 external url，用于切换/销毁时做 -1 */
    private _externalUrlRefKey: string | null = null;
    /** 当前 GLoader 持有的外部 SpriteFrame 引用，用于 decRef 释放 */
    private _externalSpriteFrame: SpriteFrame | null = null;

    /**
     * 静态errorSign对象池。
     */
    private static _errorSignPool: GObjectPool = new GObjectPool();

    /**
     * 初始化默认显示状态，创建承载图片的容器节点和底层 `MovieClip` 组件。
     */
    public constructor() {
        super();

        this._node.name = "GLoader";
        this._playing = true;
        this._url = "";
        this._fill = LoaderFillType.None;
        this._align = AlignType.Left;
        this._verticalAlign = VertAlignType.Top;
        this._showErrorSign = true;
        this._color = new Color(255, 255, 255, 255);

        this._container = new Node("Image");
        this._container.layer = UIConfig.defaultUILayer;
        this._containerUITrans = this._container.addComponent(UITransform);
        this._containerUITrans.setAnchorPoint(0, 1);
        this._node.addChild(this._container);

        this._content = this._container.addComponent(MovieClip);
        this._content.sizeMode = Sprite.SizeMode.CUSTOM;
        this._content.trim = false;
        this._content.setPlaySettings();
    }

    /**
     * 释放当前 Loader 持有的外部资源引用、组件内容和底层显示对象状态。
     */
    public dispose(): void {
        this.releaseExternalRef();
        if (this._contentItem == null) {
            if (this._content.spriteFrame)
                this.freeExternal(this._content.spriteFrame);
        }
        if (this._content2)
            this._content2.dispose();
        super.dispose();
    }

    /**
     * 获取当前正在显示或准备加载的资源地址。
     */
    public get url(): string | null {
        return this._url;
    }

    /**
     * 设置资源地址，并立即触发重载流程。
     */
    public set url(value: string | null) {
        if (this._url == value)
            return;

        this._url = value;
        this.loadContent();
        this.updateGear(7);
    }
    /**
     * 设置图片
     * @param url 
     * @param bundleStr 远程包名称
     */
    public setUrlWithBundle(url: string, bundleStr: string = ''): void {
        this.bundle = bundleStr
        this.url = url;
    }

    /**
     * 设置外部资源默认使用的资源包名称；仅在非 `ui://` 加载路径下参与解析。
     */
    public set bundle(val: string) {
        this._assetBundle = val;
    }

    /**
     * 获取当前外部资源查找时使用的资源包名称。
     */
    public get bundle(): string {
        if (this._assetBundle) {
            return this._assetBundle;
        }
        return UIConfig.loaderAssetsBundleName;
    }

    /**
     * 预留给业务层覆写的自定义 URL 加载入口；默认实现为空。
     */
    public async loadByUrl(url: string, succFn?, setUrlBl = true) { }

    /**
     * 以图标接口形式返回当前资源地址，便于与其他 GUI 组件统一访问。
     */
    public get icon(): string | null {
        return this._url;
    }

    /**
     * 设置图标资源标识，并同步到实际图标承载对象。
     */
    public set icon(value: string | null) {
        this.url = value;
    }

    /**
     * 获取当前水平对齐方式。
     */
    public get align(): AlignType {
        return this._align;
    }

    /**
     * 设置水平对齐方式，并刷新排版或布局。
     */
    public set align(value: AlignType) {
        if (this._align != value) {
            this._align = value;
            this.updateLayout();
        }
    }

    /**
     * 获取当前垂直对齐方式。
     */
    public get verticalAlign(): VertAlignType {
        return this._verticalAlign;
    }

    /**
     * 设置垂直对齐方式，并刷新排版或布局。
     */
    public set verticalAlign(value: VertAlignType) {
        if (this._verticalAlign != value) {
            this._verticalAlign = value;
            this.updateLayout();
        }
    }

    /**
     * 获取当前填充策略。
     */
    public get fill(): LoaderFillType {
        return this._fill;
    }

    /**
     * 设置填充策略，并重新计算内容布局。
     */
    public set fill(value: LoaderFillType) {
        if (this._fill != value) {
            this._fill = value;
            this.updateLayout();
        }
    }

    /**
     * 获取当前是否只允许缩小显示内容。
     */
    public get shrinkOnly(): boolean {
        return this._shrinkOnly;
    }

    /**
     * 设置仅缩小开关，并重新计算内容缩放结果。
     */
    public set shrinkOnly(value: boolean) {
        if (this._shrinkOnly != value) {
            this._shrinkOnly = value;
            this.updateLayout();
        }
    }

    /**
     * 获取当前自动尺寸策略。
     */
    public get autoSize(): boolean {
        return this._autoSize;
    }

    /**
     * 设置自动尺寸策略，并按策略刷新布局或排版。
     */
    public set autoSize(value: boolean) {
        if (this._autoSize != value) {
            this._autoSize = value;
            this.updateLayout();
        }
    }

    /**
     * 获取当前播放状态。
     */
    public get playing(): boolean {
        return this._playing;
    }

    /**
     * 设置播放状态，并同步到底层动画组件。
     */
    public set playing(value: boolean) {
        if (this._playing != value) {
            this._playing = value;
            if (this._content instanceof MovieClip)
                this._content.playing = value;
            this.updateGear(5);
        }
    }

    /**
     * 获取当前帧索引。
     */
    public get frame(): number {
        return this._frame;
    }

    /**
     * 设置当前帧索引，并同步到底层动画或显示对象。
     */
    public set frame(value: number) {
        if (this._frame != value) {
            this._frame = value;
            if (this._content instanceof MovieClip)
                this._content.frame = value;
            this.updateGear(5);
        }
    }

    /**
     * 获取当前颜色。
     */
    public get color(): Color {
        return this._color;
    }

    /**
     * 设置颜色，并同步到底层渲染组件。
     */
    public set color(value: Color) {
        this._color.set(value);
        this.updateGear(4);
        this._content.color = value;
    }

    /**
     * 获取当前填充方法。
     */
    public get fillMethod(): FillMethod {
        return this._content.fillMethod;
    }

    /**
     * 设置填充方法，并同步到底层渲染组件。
     */
    public set fillMethod(value: FillMethod) {
        this._content.fillMethod = value;
    }

    /**
     * 获取当前填充起点。
     */
    public get fillOrigin(): FillOrigin {
        return this._content.fillOrigin;
    }

    /**
     * 设置填充起点，并同步到底层渲染组件。
     */
    public set fillOrigin(value: FillOrigin) {
        this._content.fillOrigin = value;
    }

    /**
     * 获取当前是否按顺时针方向填充。
     */
    public get fillClockwise(): boolean {
        return this._content.fillClockwise;
    }

    /**
     * 设置填充方向，并同步到底层渲染组件。
     */
    public set fillClockwise(value: boolean) {
        this._content.fillClockwise = value;
    }

    /**
     * 获取当前填充比例。
     */
    public get fillAmount(): number {
        return this._content.fillAmount;
    }

    /**
     * 设置填充比例，并同步到底层渲染组件。
     */
    public set fillAmount(value: number) {
        this._content.fillAmount = value;
    }

    /**
     * 获取当前错误占位显示开关。
     */
    public get showErrorSign(): boolean {
        return this._showErrorSign;
    }

    /**
     * 设置错误占位显示开关。
     * @param value 是否显示错误占位图。
     */
    public set showErrorSign(value: boolean) {
        this._showErrorSign = value;
    }

    /**
     * 获取当前 Loader 内部承载的组件内容；仅当加载结果是 `Component` 时才会有值。
     */
    public get component(): GComponent {
        return this._content2;
    }

    /**
     * 获取当前显示中的纹理帧；包资源和外部资源最终都会转换成它。
     */
    public get texture(): SpriteFrame {
        return this._content.spriteFrame;
    }

    /**
     * 设置当前纹理帧，并刷新内容尺寸和布局。
     * @param value 目标纹理帧。
     */
    public set texture(value: SpriteFrame) {
        this.url = null;

        this._content.spriteFrame = value;
        this._content.type = Sprite.Type.SIMPLE;
        if (value != null) {
            this.sourceWidth = value.rect.width;
            this.sourceHeight = value.rect.height;
        }
        else {
            this.sourceWidth = this.sourceHeight = 0;
        }

        this.updateLayout();
    }

    /**
     * 根据当前资源地址选择包内资源或外部资源加载流程。
     */
    protected loadContent(): void {
        this.clearContent();

        if (!this._url)
            return;

        if (this._url.startsWith("ui://"))
            this.loadFromPackage(this._url);
        else
            this.loadExternal();
    }

    /**
     * 从 UIPackage 中解析资源项，并构建可显示内容。
     * @param itemURL 包内资源地址。
     */
    protected loadFromPackage(itemURL: string) {
        let contentItem = UIPackage.getItemByURL(itemURL);
        this._contentItem = contentItem;
        if (!contentItem) {
            this.setErrorState();
            return;
        }

        contentItem = contentItem.getBranch();
        this.sourceWidth = contentItem.width;
        this.sourceHeight = contentItem.height;
        contentItem = contentItem.getHighResolution();
        contentItem.load();

        if (this._autoSize)
            this.setSize(this.sourceWidth, this.sourceHeight);

        if (contentItem.type == PackageItemType.Image) {
            if (!contentItem.asset) {
                this.setErrorState();
            }
            else {
                this._content.spriteFrame = <SpriteFrame>contentItem.asset;
                if (this._content.fillMethod == 0) {
                    if (contentItem.scale9Grid)
                        this._content.type = Sprite.Type.SLICED;
                    else if (contentItem.scaleByTile)
                        this._content.type = Sprite.Type.TILED;
                    else
                        this._content.type = Sprite.Type.SIMPLE;
                }
                else {
                    this._content.type = Sprite.Type.FILLED;
                }
                this.updateLayout();
            }
        }
        else if (contentItem.type == PackageItemType.MovieClip) {
            this._content.interval = contentItem.interval;
            this._content.swing = contentItem.swing;
            this._content.repeatDelay = contentItem.repeatDelay;
            this._content.frames = contentItem.frames;
            this.updateLayout();
        }
        else if (contentItem.type == PackageItemType.Component) {
            var obj: GObject = UIPackage.createObjectFromURL(itemURL);
            if (!obj)
                this.setErrorState();
            else if (!(obj instanceof GComponent)) {
                obj.dispose();
                this.setErrorState();
            }
            else {
                this._content2 = obj;
                this._container.addChild(this._content2.node);
                this.updateLayout();
            }
        }
        else
            this.setErrorState();
    }

    /**
     * 执行外部资源加载流程，并在回调中校验当前地址有效性。
     */
    protected loadExternal(): void {
        let url = this.url;
        if (!url) return;
        // 切换 external url 前，先释放上一条 external 引用
        this.releaseExternalRef();
        this._externalUrlRefKey = url;
        GLoader.retainExternalUrl(url);
        let callback = (err: Error | null, asset: Asset) => {
            //因为是异步返回的，而这时可能url已经被改变，所以不能直接用返回的结果

            if (this._url != url || !isValid(this._node))
                return;

            if (err)
                console.warn(err);

            if (asset instanceof SpriteFrame) {
                this.retainExternalAsset(asset);
                this.onExternalLoadSuccess(asset);
            }
            else if (asset instanceof Texture2D) {
                let sf = new SpriteFrame();
                sf.texture = asset;
                this.retainExternalAsset(sf);
                this.onExternalLoadSuccess(sf);
            }
            else if (asset instanceof ImageAsset) {
                let texture = new Texture2D();
                texture.image = asset;
                let sf = new SpriteFrame();
                sf.texture = texture;
                this.retainExternalAsset(sf);
                this.onExternalLoadSuccess(sf);
            }
            else {
                console.warn("GLoader:cant load", this.url);
            }
        };
        if (this._url.startsWith("http://")
            || this._url.startsWith("https://")
            || this._url.startsWith('/'))
            assetManager.loadRemote(this._url, callback);
        else if (this._url.startsWith('data:image/')) {
            const img = new Image();
            img.src = this._url;
            img.onload = () => {
                const tex = new Texture2D();
                tex.reset({
                    width: img.width,
                    height: img.height,
                });
                tex.uploadData(img, 0, 0);
                callback(null, tex);
            }
        }
        else {
            let bundle = resources;
            //如果有设置远程包 从远程包加载
            if (this.bundle && assetManager.bundles.has(this.bundle)) {
                bundle = assetManager.getBundle(this.bundle);
            }
            bundle.load(this._url + "/spriteFrame", Asset, callback);
        }
    }

    /**GLoader不会释放用url设置的external的图片，如果在dispose时需要释放资源，需要在这里自己写。 */
    protected freeExternal(texture: SpriteFrame): void {
        // external 资源由 releaseExternalRef 统一释放
    }

    /**
     * 处理外部资源加载成功后的显示回写与布局刷新。
     * @param texture 目标纹理帧。
     */
    protected onExternalLoadSuccess(texture: SpriteFrame): void {
        this._content.spriteFrame = texture;
        this._content.type = Sprite.Type.SIMPLE;
        this.sourceWidth = texture.originalSize.width;
        this.sourceHeight = texture.originalSize.height;
        if (this._autoSize)
            this.setSize(this.sourceWidth, this.sourceHeight);
        this.updateLayout();
    }

    /**
     * 处理外部资源加载失败后的降级显示逻辑。
     * @param err 加载错误对象。
     */
    protected onExternalLoadFailed(): void {
        this.setErrorState();
    }

    /**
     * 切换到资源加载失败时的错误占位显示状态。
     */
    private setErrorState(): void {
        if (!this._showErrorSign)
            return;

        if (this._errorSign == null) {
            if (UIConfig.loaderErrorSign != null) {
                this._errorSign = GLoader._errorSignPool.getObject(UIConfig.loaderErrorSign);
            }
        }

        if (this._errorSign) {
            this._errorSign.setSize(this.width, this.height);
            this._container.addChild(this._errorSign.node);
        }
    }

    /**
     * 清除错误占位显示，恢复正常内容展示。
     */
    private clearErrorState(): void {
        if (this._errorSign) {
            this._container.removeChild(this._errorSign.node);
            GLoader._errorSignPool.returnObject(this._errorSign);
            this._errorSign = null;
        }
    }

    /**
     * 按照尺寸、对齐、填充与缩放规则重新计算内容布局。
     */
    private updateLayout(): void {
        if (this._content2 == null && this._content == null) {
            if (this._autoSize) {
                this._updatingLayout = true;
                this.setSize(50, 30);
                this._updatingLayout = false;
            }
            return;
        }

        let cw = this.sourceWidth;
        let ch = this.sourceHeight;

        let pivotCorrectX = -this.pivotX * this._width;
        let pivotCorrectY = this.pivotY * this._height;

        if (this._autoSize) {
            this._updatingLayout = true;
            if (cw == 0)
                cw = 50;
            if (ch == 0)
                ch = 30;

            this.setSize(cw, ch);
            this._updatingLayout = false;

            this._containerUITrans.setContentSize(this._width, this._height);
            this._container.setPosition(pivotCorrectX, pivotCorrectY);
            if (this._content2) {
                this._content2.setPosition(pivotCorrectX + this._width * this.pivotX, pivotCorrectY - this._height * this.pivotY);
                this._content2.setScale(1, 1);
            }
            if (cw == this._width && ch == this._height)
                return;
        }

        var sx: number = 1, sy: number = 1;
        if (this._fill != LoaderFillType.None) {
            sx = this.width / this.sourceWidth;
            sy = this.height / this.sourceHeight;

            if (sx != 1 || sy != 1) {
                if (this._fill == LoaderFillType.ScaleMatchHeight)
                    sx = sy;
                else if (this._fill == LoaderFillType.ScaleMatchWidth)
                    sy = sx;
                else if (this._fill == LoaderFillType.Scale) {
                    if (sx > sy)
                        sx = sy;
                    else
                        sy = sx;
                }
                else if (this._fill == LoaderFillType.ScaleNoBorder) {
                    if (sx > sy)
                        sy = sx;
                    else
                        sx = sy;
                }
                if (this._shrinkOnly) {
                    if (sx > 1)
                        sx = 1;
                    if (sy > 1)
                        sy = 1;
                }
                cw = this.sourceWidth * sx;
                ch = this.sourceHeight * sy;
            }
        }

        this._containerUITrans.setContentSize(cw, ch);
        if (this._content2) {
            this._content2.setPosition(pivotCorrectX + this._width * this.pivotX, pivotCorrectY - this._height * this.pivotY);
            this._content2.setScale(sx, sy);
        }

        var nx: number, ny: number;
        if (this._align == AlignType.Left)
            nx = 0;
        else if (this._align == AlignType.Center)
            nx = Math.floor((this._width - cw) / 2);
        else
            nx = this._width - cw;
        if (this._verticalAlign == VertAlignType.Top)
            ny = 0;
        else if (this._verticalAlign == VertAlignType.Middle)
            ny = Math.floor((this._height - ch) / 2);
        else
            ny = this._height - ch;
        ny = -ny;
        this._container.setPosition(pivotCorrectX + nx, pivotCorrectY + ny);
    }

    /**
     * 清理当前显示内容，并重置关联的资源引用或组件实例。
     */
    private clearContent(): void {
        this.clearErrorState();
        // 清内容时同步释放 external 引用，避免 url 频繁切换时泄漏
        this.releaseExternalRef();

        if (!this._contentItem) {
            var texture: SpriteFrame = this._content.spriteFrame;
            if (texture)
                this.freeExternal(texture);
        }
        if (this._content2) {
            this._container.removeChild(this._content2.node);
            this._content2.dispose();
            this._content2 = null;
        }
        this._content.frames = null;
        this._content.spriteFrame = null;
        this._contentItem = null;
    }

    /**
     * 增加外部 URL 的全局引用计数。
     * @param url 外部资源地址。
     */
    private static retainExternalUrl(url: string): void {
        const ref = this._externalUrlRefMap.get(url) || 0;
        this._externalUrlRefMap.set(url, ref + 1);
    }

    /** 返回释放后的剩余引用数 */
    private static releaseExternalUrl(url: string): number {
        const ref = this._externalUrlRefMap.get(url) || 0;
        if (ref <= 1) {
            this._externalUrlRefMap.delete(url);
            return 0;
        }
        const next = ref - 1;
        this._externalUrlRefMap.set(url, next);
        return next;
    }

    /**
     * 为当前对象持有的外部资源增加引用。
     * @param url 外部资源地址。
     */
    private retainExternalAsset(sf: SpriteFrame): void {
        if (!sf) return;
        // 单个 GLoader 对资源持有一份引用，避免其它 loader 先释放导致失效
        sf.addRef();
        this._externalSpriteFrame = sf;
    }

    /**
     * 释放当前对象持有的外部 URL 与资源引用。
     */
    private releaseExternalRef(): void {
        if (!this._externalUrlRefKey) return;

        const key = this._externalUrlRefKey;
        this._externalUrlRefKey = null;
        GLoader.releaseExternalUrl(key);

        if (this._externalSpriteFrame) {
            // 释放当前 loader 自己持有的资源引用
            this._externalSpriteFrame.decRef();
            this._externalSpriteFrame = null;
        }
    }

    /**
     * 在尺寸变化后同步底层节点尺寸、布局和裁剪范围。
     */
    protected handleSizeChanged(): void {
        super.handleSizeChanged();

        if (!this._updatingLayout)
            this.updateLayout();
    }

    /**
     * 在锚点变化后重新计算内容布局，保证容器定位与显示区域一致。
     */
    protected handleAnchorChanged(): void {
        super.handleAnchorChanged();

        if (!this._updatingLayout)
            this.updateLayout();
    }

    /**
     * 在灰度状态变化后同步底层渲染组件效果。
     */
    protected handleGrayedChanged(): void {
        this._content.grayscale = this._grayed;
    }

    /**
     * 执行命中检测，判断当前坐标是否落在可交互区域内。
     * @param pt 待检测的局部坐标。
     * @param globalPt 待检测的全局坐标。
     * @returns 命中的目标对象；未命中时返回空值。
     */
    protected _hitTest(pt: Vec2, globalPt: Vec2): GObject {
        if (this._content2) {
            let obj: GObject = this._content2.hitTest(globalPt);
            if (obj)
                return obj;
        }

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
            case ObjectPropID.Color:
                return this.color;
            case ObjectPropID.Playing:
                return this.playing;
            case ObjectPropID.Frame:
                return this.frame;
            case ObjectPropID.TimeScale:
                return this._content.timeScale;
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
                this._content.timeScale = value;
                break;
            case ObjectPropID.DeltaTime:
                this._content.advance(value);
                break;
            default:
                super.setProp(index, value);
                break;
        }
    }

    /**
     * 在对象加入父级前，从包数据中读取基础属性和默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_beforeAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_beforeAdd(buffer, beginPos);

        buffer.seek(beginPos, 5);

        this._url = buffer.readS();
        this._align = buffer.readByte();
        this._verticalAlign = buffer.readByte();
        this._fill = buffer.readByte();
        this._shrinkOnly = buffer.readBool();
        this._autoSize = buffer.readBool();
        this._showErrorSign = buffer.readBool();
        this._playing = buffer.readBool();
        this._frame = buffer.readInt();

        if (buffer.readBool())
            this.color = buffer.readColor();
        this._content.fillMethod = buffer.readByte();
        if (this._content.fillMethod != 0) {

            this._content.fillOrigin = buffer.readByte();
            this._content.fillClockwise = buffer.readBool();
            this._content.fillAmount = buffer.readFloat();
        }

        if (this._url)
            this.loadContent();
    }
}
