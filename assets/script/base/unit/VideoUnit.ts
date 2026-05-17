import { VideoClip, VideoPlayer, assetManager, isValid, resources } from "cc";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import { GComponent } from "../../fairyGUI/GComponent";
import { GVideoPlayer } from "../../fairyGUI/GVideoPlayer";

/** 视频播放选项 */
export interface IVideoOptions {
    /** 资源路径（相对 resources，无扩展名） */
    url: string;
    /** 是否循环 */
    loop?: boolean;
    /** 静音 */
    mute?: boolean;
    /** 宽度，省略则用父容器宽 */
    width?: number;
    /** 高度，省略则用父容器高 */
    height?: number;
    /** 层级 z */
    zOrder?: number;
    /** 播放结束回调（仅 loop=false 时触发一次） */
    onComplete?: () => void;
}

/**
 * 视频播放单元，包装 GVideoPlayer。
 * - playLoop：循环背景视频（登录页背景）
 * - playOnceWithSubtitle：主视频 + 字幕视频双层叠加，主视频播完回调（PV 开场）
 */
export default class VideoUnit {
    /** 主视频实例 */
    private _main: GVideoPlayer | null = null;
    /** 字幕视频实例（PV 字幕层） */
    private _subtitle: GVideoPlayer | null = null;
    /** 当前挂的父容器 */
    private _parent: GComponent | null = null;

    /** 在父容器 parent 上循环播放一段视频；重复调用同 url 不重复加载 */
    public playLoop(parent: GComponent, opts: IVideoOptions): void {
        this._parent = parent;
        this._main = this._ensurePlayer(this._main, parent, opts, opts.zOrder ?? 0);
        if (this._main) {
            this._main.videoPlayer.loop = true;
            this._main.videoPlayer.mute = !!opts.mute;
        }
        XDEBUGLOG.debug("[VideoUnit] playLoop", opts.url);
    }

    /**
     * 主视频 + 字幕视频双层叠加，主视频播完回调。
     * 字幕视频 alpha 通道叠加在主视频之上（zOrder=10）
     */
    public playOnceWithSubtitle(parent: GComponent, mainOpts: IVideoOptions, subtitleUrl?: string): void {
        this._parent = parent;
        const mainOnComplete = mainOpts.onComplete;
        const wrappedOpts: IVideoOptions = { ...mainOpts, loop: false, onComplete: undefined };
        this._main = this._ensurePlayer(this._main, parent, wrappedOpts, mainOpts.zOrder ?? 0);
        if (this._main) {
            const vp = this._main.videoPlayer;
            vp.loop = false;
            vp.mute = !!mainOpts.mute;
            vp.node.off(VideoPlayer.EventType.COMPLETED);
            if (mainOnComplete) {
                vp.node.on(VideoPlayer.EventType.COMPLETED, () => {
                    XDEBUGLOG.debug("[VideoUnit] 主视频播放结束", mainOpts.url);
                    mainOnComplete();
                });
            }
        }
        if (subtitleUrl) {
            const subOpts: IVideoOptions = {
                url: subtitleUrl,
                loop: false,
                width: mainOpts.width,
                height: mainOpts.height,
                zOrder: 10,
                mute: true,
            };
            this._subtitle = this._ensurePlayer(this._subtitle, parent, subOpts, 10);
            if (this._subtitle) {
                this._subtitle.videoPlayer.loop = false;
                this._subtitle.videoPlayer.mute = true;
            }
        }
        XDEBUGLOG.debug("[VideoUnit] playOnceWithSubtitle", mainOpts.url, subtitleUrl || "(无字幕)");
    }

    /** 停止并销毁所有视频实例 */
    public stop(): void {
        this._dispose(this._main);
        this._dispose(this._subtitle);
        this._main = null;
        this._subtitle = null;
        this._parent = null;
        XDEBUGLOG.debug("[VideoUnit] stop");
    }

    /** 在外部需要静音切换时使用 */
    public setMute(mute: boolean): void {
        if (this._main) this._main.videoPlayer.mute = mute;
    }

    /** 创建或复用一个 GVideoPlayer，已存在则只换 url；尺寸/层级随父容器对齐 */
    private _ensurePlayer(player: GVideoPlayer | null, parent: GComponent, opts: IVideoOptions, zOrder: number): GVideoPlayer | null {
        if (!parent) return null;
        if (!player) {
            player = new GVideoPlayer();
            parent.addChild(player);
        }
        const w = opts.width ?? parent.width;
        const h = opts.height ?? parent.height;
        player.setSize(w, h);
        player.setPosition(0, 0);
        if (zOrder !== undefined) {
            player.sortingOrder = zOrder;
        }
        // 走 GVideoPlayer.url 触发 loadContent；resources.load(url, Asset) 会按 meta 解析为 VideoClip
        player.url = opts.url;
        return player;
    }

    /** 安全销毁 GVideoPlayer 实例 */
    private _dispose(player: GVideoPlayer | null): void {
        if (!player) return;
        try {
            const vp = player.videoPlayer;
            if (vp && isValid(vp.node)) {
                vp.node.off(VideoPlayer.EventType.COMPLETED);
                vp.stop();
            }
            player.removeFromParent();
            player.dispose();
        } catch (e) {
            XDEBUGLOG.warn("[VideoUnit] dispose 出错", e);
        }
        // 标记未使用以避免 lint
        void assetManager;
        void resources;
        void VideoClip;
    }
}
