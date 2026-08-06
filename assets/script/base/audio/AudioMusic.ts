/**
*Author  : XW
*Desc    : 背景音乐播放器，负责背景音乐资源加载、循环播放与释放
*/

import { AudioClip, AudioSource } from "cc";
import ResMgr from "../manager/ResMgr";

export class AudioMusic extends AudioSource {
    /** 背景音乐开关 */
    public switch: boolean = true;
    /** 资源持有者 */
    private _owner: string = "AudioMusic";
    /** 当前正在请求或播放的音乐资源地址 */
    private _url: string = "";
    /** 当前持有的音乐资源地址 */
    private _clipUrl: string = "";
    /** 当前播放请求序号 */
    private _playVersion: number = 0;

    /**
     * 播放背景音乐。
     * @param url 音乐资源地址。
     * @param isLoop 是否循环播放。
     */
    public async playMusic(url: string, isLoop: boolean = true): Promise<void> {
        if (this._clipUrl && this._clipUrl !== url) {
            ResMgr.inst.releaseRes(this._clipUrl, AudioClip, this._owner);
            this._clipUrl = "";
            this.release();
        }
        const playVersion = ++this._playVersion;
        this._url = url;
        if (!this._url) return;
        if (!this.switch) return;
        let audioClip: AudioClip = await ResMgr.inst.loadRes(url, AudioClip, this._owner);
        if (!audioClip) return;
        if (this._url != url || this._playVersion !== playVersion || !this.switch) {
            ResMgr.inst.releaseRes(url, AudioClip, this._owner);
            return;
        }
        this.playing && this.stop();
        this.release();
        this.loop = isLoop;
        this.clip = audioClip;
        this._clipUrl = url;
        this.play();
    }

    /** 停止当前背景音乐 */
    public stopMusic(): void {
        this._playVersion++;
        this._url = "";
        this.release();
    }

    /** 释放当前已加载的背景音乐资源 */
    public release(): void {
        if (this.clip) {
            this.stop();
            this.clip = null;
        }
        if (this._clipUrl) {
            ResMgr.inst.releaseRes(this._clipUrl, AudioClip, this._owner);
            this._clipUrl = "";
        }
    }
}
