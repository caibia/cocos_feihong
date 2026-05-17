/**
*Author  : XW
*Desc    : 音效播放器，负责单次音效资源加载、播放完成回调与资源释放
*/

import { AudioClip, AudioSource } from "cc";
import ResMgr from "../manager/ResMgr";

export default class AudioSound extends AudioSource {
    /** 音效开关 */
    public switch: boolean = true;
    /** 当前正在请求或播放的音效资源地址 */
    private _url: string = "";
    /** 播放完成回调 */
    public onComplete: (audio: AudioSound) => void | null = null;

    /** 注册音效播放结束监听 */
    public start(): void {
        this.node.on(AudioSource.EventType.ENDED, this.onAudioEnded, this);
    }

    /**
     * 播放音效。
     * @param url 音效资源地址。
     */
    public async playSound(url: string) {
        this._url = url;
        if (!this._url) return;
        if (!this.switch) return;
        let audioClip: AudioClip = await ResMgr.inst.loadRes(url, AudioClip);
        if (!audioClip) return;
        //加载完成的 跟 播放的不是同一个
        if (this._url != url) return;
        this.playing && this.stop();
        this.release();
        this.loop = false;
        this.clip = audioClip;
        this.play();
    }

    /** 停止当前音效播放 */
    public stopSound() {
        this.switch && this.playing && this.stop();
    }

    /** 处理音效播放结束回调 */
    private onAudioEnded() {
        this.onComplete && this.onComplete(this);
    }

    /** 释放当前已加载的音效资源 */
    public release() {
        if (this.clip) {
            this.stop();
            this.clip.destroy();
            this.clip = null;
        }
    }
}
