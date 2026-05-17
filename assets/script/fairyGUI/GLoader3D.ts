import { sp, dragonBones, assetManager, Color, isValid, resources, Vec2, Node, UITransform, Asset, math, Vec3, Sprite, SpriteFrame, ImageAsset, UIOpacity } from "cc";
import { AlignType, LoaderFillType, ObjectPropID, PackageItemType, VertAlignType } from "./FieldTypes";
import { GObject } from "./GObject";
import { PackageItem } from "./PackageItem";
import { UIConfig } from "./UIConfig";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";
import ResMgr from "../base/manager/ResMgr";

/**
 * 动画完成回调；统一透出 `Spine` 与 `DragonBones` 的完成事件对象。
 */
type CompleteEventCallback = (l3d: GLoader3D, eventObj: sp.spine.TrackEntry | dragonBones.EventObject) => void

/**
 * 动画帧事件回调；统一透出 `Spine` 与 `DragonBones` 的逐帧事件信息。
 */
type FramEventCallback = (l3d: GLoader3D, track: sp.spine.TrackEntry | dragonBones.EventObject, event?: sp.spine.Event) => void;

/**
 * 骨骼/三维资源加载组件，负责装载 Spine、DragonBones 并同步 FairyGUI 布局属性。
 */
export class GLoader3D extends GObject {
    /**
     * 当前资源地址；支持 `ui://` 包内地址与外部骨骼资源路径。
     */
    private _url: string;
    /**
     * 水平对齐方式。
     */
    private _align: AlignType;
    /**
     * 垂直对齐方式。
     */
    private _verticalAlign: VertAlignType;
    /**
     * 是否根据资源原始尺寸自动调整组件大小。
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
     * 当前播放状态。
     */
    private _playing: boolean;
    /**
     * 当前动画帧索引。
     */
    private _frame: number = 0;
    /**
     * 循环开关。
     */
    private _loop: boolean;
    /**
     * 当前要播放的动画名称。
     */
    private _animationName: string;
    /**
     * 当前使用的皮肤名称。
     */
    private _skinName: string;
    /**
     * 颜色。
     */
    private _color: Color;
    /**
     * 内容项。
     */
    private _contentItem: PackageItem;
    /**
     * 承载骨骼显示节点的容器；布局、对齐和裁剪都围绕它计算。
     */
    private _container: Node;
    /**
     * 内部底层显示内容。
     */
    public _content: sp.Skeleton | dragonBones.ArmatureDisplay;
    /**
     * 是否正在执行内部布局刷新，避免递归触发尺寸联动。
     */
    private _updatingLayout: boolean;

    /**
     * 当前 `SpineUnit` 是否已创建完成；某些业务逻辑会依赖它判断资源可否复用。
     */
    public spineUnitCreated: boolean;
    /**
     * 当前 Spine 资源地址缓存。
     */
    public spineUrl: string;
    /**
     * 当前 DragonBones 资源地址缓存。
     */
    public dragonBonesUrl: string;


    /**
     * 初始化骨骼显示默认状态，并创建承载骨骼节点的包装容器。
     */
    public constructor() {
        super();

        this._node.name = "GLoader3D";
        this._playing = true;
        this._url = "";
        this._fill = LoaderFillType.None;
        this._align = AlignType.Center;
        this._verticalAlign = VertAlignType.Middle;
        this._color = new Color(255, 255, 255, 255);

        this._container = new Node("Wrapper");
        this._container.layer = UIConfig.defaultUILayer;
        this._container.addComponent(UITransform).setAnchorPoint(0, 1);
        this._node.addChild(this._container);

        // let sp = this._node.addComponent(Sprite);
        // sp.sizeMode = Sprite.SizeMode.CUSTOM;
        // ResMgr.inst.loadRes("textures/tongyong_wuping_kuang_00/spriteFrame",SpriteFrame,(asset)=>{
        //     sp.spriteFrame = asset;
        // });

        // let sp1 = this._container.addComponent(Sprite);
        // sp1.sizeMode = Sprite.SizeMode.CUSTOM;
        // ResMgr.inst.loadRes("textures/tongyong_wuping_kuang_01/spriteFrame",SpriteFrame,(asset)=>{
        //     sp1.spriteFrame = asset;
        // });
    }

    /**
     * 返回骨骼显示节点实际挂载的容器节点。
     */
    public get container() {
        return this._container;
    }

    /**
     * 获取骨骼容器节点上的 `UITransform`。
     */
    public get containerUITrans() {
        return this._container.getComponent(UITransform);
    }

    /**
     * 释放骨骼容器、事件回调以及当前骨骼显示对象的运行时引用。
     */
    public dispose(): void {
        this.onSpineCreateEvent = null;
        if (this._container) {
            let n = this._container;
            this._container = undefined;
            n.destroyAllChildren();
            n.destroy();
        }
        super.dispose();
    }

    /**
     * 获取当前骨骼资源地址。
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
     * 以图标接口形式返回当前骨骼资源地址。
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
            this.updateGear(5);

            this.onChange();
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
            this.updateGear(5);

            this.onChange();
        }
    }

    /**
     * 获取当前动画名称。
     */
    public get animationName(): string | null {
        return this._animationName;
    }

    /**
     * 设置当前动画名，并在下次刷新时同步到底层骨骼组件。
     */
    public set animationName(value: string | null) {
        if (this._animationName != value) {
            this._animationName = value;
            this.onChange();
        }
    }

    /**
     * 获取当前皮肤名称。
     */
    public get skinName(): string | null {
        return this._skinName;
    }

    /**
     * 设置当前皮肤名，并在下次刷新时同步到底层骨骼组件。
     */
    public set skinName(value: string | null) {
        if (this._skinName != value) {
            this._skinName = value;
            this.onChange();
        }
    }

    /**
     * 获取当前循环播放开关。
     */
    public get loop(): boolean {
        return this._loop;
    }

    /**
     * 设置循环播放开关，并在下次刷新时同步到底层动画组件。
     */
    public set loop(value: boolean) {
        if (this._loop != value) {
            this._loop = value;
            this.onChange();
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

        if (this._content)
            this._content.color = value;
    }

    /**
     * 获取当前实际挂载的骨骼显示对象，可能是 `sp.Skeleton` 或 `ArmatureDisplay`。
     */
    public get content(): sp.Skeleton | dragonBones.ArmatureDisplay {
        return this._content;
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
     * @param itemURL 包内资源地址，通常为 `ui://` 开头的完整 URL。
     */
    protected loadFromPackage(itemURL: string) {
        this._contentItem = UIPackage.getItemByURL(itemURL);
        if (this._contentItem) {
            this._contentItem = this._contentItem.getBranch();
            this.sourceWidth = this._contentItem.width;
            this.sourceHeight = this._contentItem.height;
            this._contentItem = this._contentItem.getHighResolution();

            if (this._autoSize)
                this.setSize(this.sourceWidth, this.sourceHeight);

            if (this._contentItem.type == PackageItemType.Spine || this._contentItem.type == PackageItemType.DragonBones)
                this._contentItem.owner.getItemAssetAsync(this._contentItem, this.onLoaded.bind(this));
        }
    }

    /**
     * 响应资源加载完成回调。
     * @param err 加载失败时的错误对象；为空表示加载成功。
     * @param item 已完成加载的包资源项，用于校验是否仍是当前请求。
     */
    private onLoaded(err: Error, item: PackageItem): void {
        if (this._contentItem != item)
            return;

        if (err)
            console.warn(err);

        if (!this._contentItem.asset)
            return;

        if (this._contentItem.type == PackageItemType.Spine)
            this.setSpine(<sp.SkeletonData>this._contentItem.asset, this._contentItem.skeletonAnchor);
        else if (this._contentItem.type == PackageItemType.DragonBones)
            this.setDragonBones(<dragonBones.DragonBonesAsset>this._contentItem.asset, this._contentItem.atlasAsset, this._contentItem.skeletonAnchor);
    }

    /**
     * 把传入的 Spine 资源挂到当前容器上，并同步锚点、透明度和播放状态。
     * @param asset Spine 骨骼数据资源。
     * @param anchor 骨骼内容在容器内的锚点偏移，单位为像素。
     * @param pma 是否启用预乘 Alpha；未传时沿用引擎默认值。
     */
    public setSpine(asset: sp.SkeletonData, anchor: Vec2, pma?: boolean): void {
        this.freeSpine();

        let node = new Node("spine");
        this._container.addChild(node);
        node.layer = UIConfig.defaultUILayer;
        node.setPosition(anchor.x, -anchor.y);

        // 统一设置锚点，避免平台差异
        let uitrans = node.addComponent(UITransform);
        uitrans.setAnchorPoint(0.5, 0); // 设置统一的锚点

        this._content = node.addComponent(sp.Skeleton);
        this._content.premultipliedAlpha = pma;
        this._content.skeletonData = asset;
        this._content.color = this._color;
        this.onChangeSpine();
        this.updateLayout();
        this.onSpineCreateEvent && this.onSpineCreateEvent(this);
    }
    /**
     * Spine 创建完成后的回调；创建并挂载完成后立即触发。
     */
    protected onSpineCreateEvent: (l3d: GLoader3D) => void;

    /**
     * 释放当前 Spine 显示对象与相关监听。
     */
    public freeSpine() {
        if (this._content) {
            this._content.destroy();
        }
    }

    /**
     * 把传入的 DragonBones 资源挂到当前容器上，并同步锚点、透明度和播放状态。
     * @param asset DragonBones 骨骼数据资源。
     * @param atlasAsset DragonBones 图集资源。
     * @param anchor 骨骼内容在容器内的锚点偏移，单位为像素。
     * @param pma 是否启用预乘 Alpha；未传时沿用引擎默认值。
     */
    public setDragonBones(asset: dragonBones.DragonBonesAsset, atlasAsset: dragonBones.DragonBonesAtlasAsset, anchor: Vec2, pma?: boolean): void {
        this.freeDragonBones();

        let node = new Node("dragonBones");
        node.layer = UIConfig.defaultUILayer;
        this._container.addChild(node);
        node.setPosition(anchor.x, -anchor.y);

        this._content = node.addComponent(dragonBones.ArmatureDisplay);
        this._content.premultipliedAlpha = pma;
        this._content.dragonAsset = asset;
        this._content.dragonAtlasAsset = atlasAsset;
        this._content.color = this._color;

        let armatureKey = asset["init"](dragonBones.CCFactory.getInstance(), atlasAsset["_uuid"]);
        let dragonBonesData = this._content["_factory"].getDragonBonesData(armatureKey);
        this._content.armatureName = dragonBonesData.armatureNames[0];

        this.onChangeDragonBones();

        this.updateLayout();
    }

    /**
     * 动画帧事件监听器；统一透出 Spine 与 DragonBones 的帧事件。
     */
    private _framEventListener: FramEventCallback;
    /**
     * 注册动画帧事件监听。
     * @param func 帧事件回调；触发时返回当前 `GLoader3D` 与底层事件对象。
     */
    public addFrameEventListener(func: FramEventCallback): void {
        this._framEventListener = func;
        if (this.content instanceof sp.Skeleton) {
            this.content.setEventListener(this.onSpineFrameEvent.bind(this));
        }
        if (this.content instanceof dragonBones.ArmatureDisplay) {
            this.content.addEventListener(dragonBones.EventObject.FRAME_EVENT, this.onDragonBonesFrameEvent, this)
        }
    }
    /**
     * 处理 DragonBones 的帧事件回调。
     * @param event DragonBones 帧事件对象。
     */
    private onDragonBonesFrameEvent(event: dragonBones.EventObject): void {
        this._framEventListener && this._framEventListener(this, event);
    }
    /**
     * 处理 Spine 的帧事件回调。
     * @param track 当前动画轨道信息。
     * @param event 当前帧事件数据。
     */
    private onSpineFrameEvent(track: sp.spine.TrackEntry, event: sp.spine.Event): void {
        this._framEventListener && this._framEventListener(this, track, event);
    }

    /**
     * 动画播放完成事件监听器；统一透出 Spine 与 DragonBones 的完成事件。
     */
    private _completeEventListener: CompleteEventCallback;
    /**
     * 注册动画播放完成监听。
     * @param func 完成回调；触发时返回当前 `GLoader3D` 与底层完成事件对象。
     */
    public addCompleteEventListener(func: CompleteEventCallback): void {
        this._completeEventListener = func;
        if (this.content instanceof sp.Skeleton) {
            this.content.setCompleteListener(this.onSpineCompleteEvent.bind(this));
        }
        if (this.content instanceof dragonBones.ArmatureDisplay) {
            this.content.addEventListener(dragonBones.EventObject.COMPLETE, this.onDragonBonesCompleteEvent, this)
        }
    }
    /**
     * 处理 Spine 动画播放完成回调。
     * @param eventObj Spine 轨道完成事件对象。
     */
    public onSpineCompleteEvent(eventObj: sp.spine.TrackEntry): void {
        this._completeEventListener && this._completeEventListener(this, eventObj);
    }
    /**
     * 处理 DragonBones 动画播放完成回调。
     * @param eventObj DragonBones 完成事件对象。
     */
    public onDragonBonesCompleteEvent(eventObj: dragonBones.EventObject): void {
        this._completeEventListener && this._completeEventListener(this, eventObj);
    }

    /**
     * 释放当前 DragonBones 显示对象与相关监听。
     */
    public freeDragonBones(): void {
        if (this._content) {
            this._content.destroy();
        }
    }

    /**
     * 在关键属性变化后统一刷新骨骼内容表现。
     */
    private onChange(): void {
        // if (this._contentItem == null)
        //     return;

        // if (this._contentItem.type == PackageItemType.Spine) {
        this.onChangeSpine();
        // }
        // if (this._contentItem.type == PackageItemType.DragonBones) {
        this.onChangeDragonBones();
        // }
    }

    /**
     * 把最新的状态配置同步到 Spine 显示对象。
     */
    private onChangeSpine(): void {
        if (!(this._content instanceof sp.Skeleton))
            return;

        if (this._animationName) {
            let trackEntry = this._content.getCurrent(0);
            if (!trackEntry || trackEntry.animation.name != this._animationName || trackEntry.isComplete() && !trackEntry.loop) {
                this._content.animation = this._animationName;
                trackEntry = this._content.setAnimation(0, this._animationName, this._loop);
            }

            if (this._playing)
                this._content.paused = false;
            else {
                this._content.paused = true;
                trackEntry.trackTime = math.lerp(0, trackEntry.animationEnd - trackEntry.animationStart, this._frame / 100);
            }
        }
        else
            this._content.clearTrack(0);

        let skin = this._skinName || this._content.skeletonData.getRuntimeData().skins[0].name;
        if (this._content["_skeleton"].skin?.name != skin)
            this._content.setSkin(skin);
    }

    /**
     * 把最新的状态配置同步到 DragonBones 显示对象。
     */
    private onChangeDragonBones(): void {
        if (!(this._content instanceof dragonBones.ArmatureDisplay))
            return;

        if (this._animationName) {
            if (this._playing)
                this._content.playAnimation(this._animationName, this._loop ? 0 : 1);
            else
                this._content.armature().animation.gotoAndStopByFrame(this._animationName, this._frame);
        }
        else
            this._content.armature().animation.reset();
    }

    /**
     * 执行外部资源加载流程，并在回调中校验当前地址有效性。
     */
    protected loadExternal(): void {
        // if (this._url.startsWith("http://")
        //     || this._url.startsWith("https://")
        //     || this._url.startsWith('/'))
        //     assetManager.loadRemote(this._url, sp.SkeletonData, this.onLoaded2.bind(this));
        // else
        //     resources.load(this._url, sp.SkeletonData, this.onLoaded2.bind(this));

        if (this._url.startsWith("dragonBones")) {
            let asset: dragonBones.DragonBonesAsset = ResMgr.inst.getRes(this._url + "_ske", dragonBones.DragonBonesAsset);
            let atlasAsset: dragonBones.DragonBonesAtlasAsset = ResMgr.inst.getRes(this._url + "_tex", dragonBones.DragonBonesAtlasAsset);
            this.setDragonBones(asset, atlasAsset, Vec2.ZERO);
        } else {
            // 先屏蔽掉GLoader3D里的加载代码，强制要求所有spine必须通过spineUnit来播放.
            let asset: sp.SkeletonData = resources.get(this._url, sp.SkeletonData);
            this.onLoaded2(null, asset);
        }
    }

    /**
     * 处理外部骨骼资源加载回调，并校验当前 URL 是否仍然匹配。
     * @param err 加载失败时的错误对象；为空表示加载成功。
     * @param asset 已加载完成的外部资源对象。
     */
    private onLoaded2(err: Error, asset: Asset): void {
        //因为是异步返回的，而这时可能url已经被改变，所以不能直接用返回的结果
        if (!this._url || !isValid(this._node))
            return;

        if (err)
            console.warn(err);

        let sk: sp.SkeletonData = asset as sp.SkeletonData;
        let runtimeData = sk.getRuntimeData();
        if (!runtimeData) { }
        else if (!runtimeData.width) { }
        else if (runtimeData.width <= 0) { }
        else if (!runtimeData.height) { }
        else if (runtimeData.height <= 0) { }
        else {
            this.sourceWidth = runtimeData.width;
            this.sourceHeight = runtimeData.height;
            if (this._autoSize) {
                this.setSize(this.sourceWidth, this.sourceHeight);
            }
        }
        this.setSpine(sk, Vec2.ZERO, false);
    }

    /**
     * 在位置变化后同步内部容器与骨骼节点位置。
     */
    public handlePositionChanged(): void {
        super.handlePositionChanged();
    }

    /**
     * 按照尺寸、对齐、填充与缩放规则重新计算内容布局。
     */
    private updateLayout(): void {
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
            if (cw == this._width && ch == this._height) {
                this._container.setScale(1, 1);
                this._container.setPosition(pivotCorrectX, pivotCorrectY);
                //TODO：测试代码，保证spine节点 和 Gloader3D节点的位置/大小一致
                this.containerUITrans.setContentSize(this._width, this._height);
                if (this._content instanceof sp.Skeleton) {
                    // let uitrans = this._content.node.getComponent(UITransform);
                    // let x = uitrans.width * 0.5;
                    // let y = uitrans.height * (uitrans.anchorY);
                    // this._content.node.setPosition(new Vec3(x, y, 0));
                    this._content.node.setPosition(new Vec3(this._width * 0.5, -this._height * 0.5, 0));
                }
                return;
            }
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

        this._container.setScale(sx, sy);

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
        this._contentItem = null;
        if (this._content) {
            this._content.node.destroy();
            this._content = null;
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
     * 在锚点变化后重新计算骨骼容器布局，避免显示节点与 GLoader3D 偏移脱节。
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
    }

    /**
     * 按 FairyGUI 属性编号读取当前运行时属性值。
     * @param index FairyGUI 属性编号。
     * @returns 对应属性的当前值；未命中时回退父类实现。
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
                return 1;
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
                break;
            case ObjectPropID.DeltaTime:
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
        this._animationName = buffer.readS();
        this._skinName = buffer.readS();
        this._playing = buffer.readBool();
        this._frame = buffer.readInt();
        this._loop = buffer.readBool();

        if (buffer.readBool())
            this.color = buffer.readColor();

        if (this._url)
            this.loadContent();
    }
}
