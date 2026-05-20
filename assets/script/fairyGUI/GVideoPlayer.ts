import { Asset, Sprite, VideoClip, VideoPlayer, assetManager, isValid, resources } from "cc";
import { GObject } from "./GObject";
import { UIConfig } from "./UIConfig";

/**
 * 视频组件封装，负责接入底层视频播放节点与 FairyGUI 属性同步。
 */
export class GVideoPlayer extends GObject {
    /**
     * 当前视频资源地址。
     */
    protected _url: string;
    /**
     * 外部资源所属资源包名称。
     */
    private _assetBundle: string;
    /**
     * 底层视频播放器组件。
     */
    private _videoPlayer: VideoPlayer;

    /**
     * 初始化视频播放器包装对象和底层视频组件引用。
     */
    public constructor(){
        super();

        this._node.name = "GVideoPlayer";
        this._node.layer = UIConfig.defaultUILayer;
        
        this._videoPlayer = this._node.addComponent(VideoPlayer);
        // this._videoPlayer.fullScreenOnAwake = true;
        // web 平台 video 是 DOM 元素，默认渲染在 canvas 之上会盖住 UI。
        // 打开 stayOnBottom 让 video 沉到 canvas 之下，UI 才能浮在视频之上。
        this._videoPlayer.stayOnBottom = true;
        this._videoPlayer.loop = true;
        this._videoPlayer.playOnAwake = true;
    }

    /**
     * 获取当前视频播放器。
     */
    public get videoPlayer(): VideoPlayer { return this._videoPlayer; }

    /**
     * 获取当前资源地址。
     */
    public get url(): string | null {
        return this._url;
    }

    /**
     * 设置资源地址，并立即触发重载流程。
     * @param value 视频资源地址。
     */
    public set url(value: string | null) {
        if (this._url == value)
            return;

        this._url = value;
        this.loadContent();
    }

    /**
     * 设置资源包名称，供外部资源加载时使用。
     * @param val 资源包名称。
     */
    public set bundle(val: string) {
        this._assetBundle = val;
    }

    /**
     * 获取当前资源包名称。
     */
    public get bundle(): string {
        if (this._assetBundle) {
            return this._assetBundle;
        }
        return UIConfig.loaderAssetsBundleName;
    }

    /**
     * 根据当前资源地址选择包内资源或外部资源加载流程。
     */
    private loadContent(): void {
        let url = this.url;
        let callback = (err: Error | null, asset: Asset) => {
            //因为是异步返回的，而这时可能url已经被改变，所以不能直接用返回的结果

            if (this._url != url || !isValid(this._node))
                return;

            if (err)
                console.warn(err);

            if (asset instanceof VideoClip) {
                this._videoPlayer.clip = asset;
                this._videoPlayer.play();
            }
            else {
                console.warn("GLoader:cant load", this.url);
            }
        };
        let bundle = resources;
        //如果有设置远程包 从远程包加载
        if (this.bundle && assetManager.bundles.has(this.bundle)) {
            bundle = assetManager.getBundle(this.bundle);
        }
        bundle.load(this._url, Asset, callback);
    }
}
