/**
 * Author : XW
 * Desc   : 首次开场 PV 播放层
 * 说明     : 双层视频（主视频 + 字幕视频）+ 右上跳过按钮（点屏淡入、3s 后淡出）
 */

import XDEBUGLOG from "../../../base/debug/XDEBUGLOG";
import AudioMgr from "../../../base/audio/AudioMgr";
import VideoUnit from "../../../base/unit/VideoUnit";
import XStorageMgr from "../../../base/manager/XStorageMgr";
import { ITimer } from "../../../base/manager/TimerMgr";
import { STORAGE_TYPE } from "../../define/StorageDefine";
import IPvPlayView from "./interfaces/IPvPlayView";

/** 跳过按钮淡出延时（秒） */
const SKIP_BTN_FADEOUT_DELAY = 3;
/** 跳过按钮淡出时长（秒） */
const SKIP_BTN_FADEOUT_DURATION = 0.5;

export default class PvPlayView extends IPvPlayView {
    /** 视频单元 */
    private _video: VideoUnit | null = null;
    /** 是否已关闭，避免重复触发 */
    private _closed: boolean = false;
    /** 是否在播完时把 PV 标记为已播 */
    private _markPlayed: boolean = false;
    /** 上一次 BGM 资源（关闭时恢复） */
    private _resumeBgm: string = "audio/bgm/Music_Main_Menu";
    /** 跳过按钮淡出延时定时器 */
    private _fadeTimer: ITimer | null = null;

    public getFairyPackageArr(): string[] {
        return ["login", "base_new", "base", "text_new", "icon"];
    }

    public onCreate(): void {
        super.onCreate();
        XDEBUGLOG.debug("[PvPlayView] onCreate");
        if (this.skipBtn) {
            this.skipBtn.visible = false;
            this.eventUnit.addClickEvent(this.skipBtn, this.onClickSkip, this);
        }
        if (this.touchComp) {
            this.eventUnit.addClickEvent(this.touchComp, this.onClickTouch, this);
        }
    }

    public onRefresh(arg?: IUIArg.IPvPlayViewArg): void {
        super.onRefresh(arg);
        this._closed = false;
        this._markPlayed = !!arg?.markPlayed;
        const pvName = arg?.pvName || "movie/pv/pv2new";
        const zimuName = arg?.zimuName;
        const bgm = arg?.bgm || "audio/bgm/PV_First";

        // PV 期间换 BGM
        if (bgm) {
            AudioMgr.inst.playMusic(bgm, false);
        }

        if (!this._video) this._video = new VideoUnit();
        const holder = this.videoPlaceHolder as any;
        if (!holder) {
            XDEBUGLOG.warn("[PvPlayView] videoPlaceHolder 不存在，无法播放");
            this.endPv();
            return;
        }
        this._video.playOnceWithSubtitle(holder, {
            url: pvName,
            loop: false,
            mute: false,
            onComplete: () => this.endPv(),
        }, zimuName);
        XDEBUGLOG.debug("[PvPlayView] 开始播放 PV", pvName, zimuName || "(无字幕)");
    }

    /** 点击屏幕 → 唤醒跳过按钮 */
    private onClickTouch(): void {
        if (!this.skipBtn || this._closed) return;
        this.skipBtn.visible = true;
        this.skipBtn.alpha = 1;
        if (this._fadeTimer) {
            this.timerUnit.removeTimer(this._fadeTimer);
            this._fadeTimer = null;
        }
        this._fadeTimer = this.timerUnit.setTimeout(() => {
            this._fadeTimer = null;
            this.fadeOutSkipBtn();
        }, SKIP_BTN_FADEOUT_DELAY * 1000);
    }

    /** 跳过按钮淡出 */
    private fadeOutSkipBtn(): void {
        if (!this.skipBtn || this._closed) return;
        this.tweenUnit.getTween(this.skipBtn)
            .to(SKIP_BTN_FADEOUT_DURATION, { alpha: 0 })
            .call(() => {
                if (this.skipBtn) this.skipBtn.visible = false;
            })
            .start();
    }

    /** 点跳过按钮 */
    private onClickSkip(): void {
        XDEBUGLOG.debug("[PvPlayView] 用户点击跳过 PV");
        this.endPv();
    }

    /** 结束 PV：清视频 → 写 played → 恢复 BGM → 关闭弹窗 */
    private endPv(): void {
        if (this._closed) return;
        this._closed = true;
        if (this._video) {
            this._video.stop();
            this._video = null;
        }
        if (this._markPlayed) {
            XStorageMgr.inst.setItem(STORAGE_TYPE.LOGIN_PV_PLAYED, true, true);
            XDEBUGLOG.debug("[PvPlayView] PV 首播完成，已写存档");
        }
        AudioMgr.inst.playMusic(this._resumeBgm, true);
        this.destroyWithAni();
    }

    public dispose(): void {
        if (this._fadeTimer) {
            this.timerUnit.removeTimer(this._fadeTimer);
            this._fadeTimer = null;
        }
        if (this._video) {
            this._video.stop();
            this._video = null;
        }
        super.dispose();
    }
}
