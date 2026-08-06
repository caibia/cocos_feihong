/**
*Author  : XW
*Desc    : 音效播放器，负责单次音效资源加载、播放完成回调与资源释放
*/

import { AudioClip, AudioSource } from "cc";

export default class AudioSound extends AudioSource {
    /** 音效开关 */
    public switch: boolean = true;
    /** 播放完成回调 */
    public onComplete: (audio: AudioSound) => void | null = null;

    /** 注册音效播放结束监听 */
    public start(): void {
        this.node.on(AudioSource.EventType.ENDED, this.onAudioEnded, this);
    }

    /**
     * 播放已加载的音效资源。
     * @param audioClip 音效资源。
     */
    public playAudioClip(audioClip: AudioClip): void {
        if (!audioClip) return;
        if (!this.switch) return;
        this.playing && this.stop();
        this.release();
        this.loop = false;
        this.clip = audioClip;
        this.play();
    }

    /** 停止当前音效播放 */
    public stopSound(): void {
        this.switch && this.playing && this.stop();
    }

    /** 处理音效播放结束回调 */
    private onAudioEnded(): void {
        this.onComplete && this.onComplete(this);
    }

    /** 断开当前音效资源引用 */
    public release(): void {
        if (this.clip) {
            this.stop();
            this.clip = null;
        }
    }
}
