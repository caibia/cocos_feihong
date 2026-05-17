/**
*Author  : XW
*Desc    : 背景音乐播放器，负责背景音乐资源加载、循环播放与释放
*/

import { AudioClip, AudioSource } from "cc";
import ResMgr from "../manager/ResMgr";

export class AudioMusic extends AudioSource {
    /** 背景音乐开关 */
    public switch: boolean = true;
    /** 当前正在请求或播放的音乐资源地址 */
    private _url: string = "";

    /**
     * 播放背景音乐。
     * @param url 音乐资源地址。
     * @param isLoop 是否循环播放。
     */
    public async playMusic(url: string, isLoop: boolean = true) {
        this._url = url;
        if (!this._url) return;
        if (!this.switch) return;
        let audioClip: AudioClip = await ResMgr.inst.loadRes(url, AudioClip);
        if (!audioClip) return;
        //加载完成的 跟 播放的不是同一个
        if (this._url != url) return;
        this.playing && this.stop();
        this.release();
        this.loop = isLoop;
        this.clip = audioClip;
        this.play();
    }

    /** 停止当前背景音乐 */
    public stopMusic() {
        this.switch && this.playing && this.stop();
    }

    /** 释放当前已加载的背景音乐资源 */
    public release() {
        if (this.clip) {
            this.stop();
            this.clip.destroy();
            this.clip = null;
        }
    }
}
