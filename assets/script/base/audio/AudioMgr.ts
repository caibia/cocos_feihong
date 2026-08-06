
/**
*Author  : XW
*Desc    : 音频管理器，负责背景音乐与音效的统一播放、暂停、恢复和本地配置保存
*/

import { AudioClip, Node, NodePool } from "cc";
import XStorageMgr from "../manager/XStorageMgr";
import { GRoot } from "../../fairyGUI/GRoot";
import { AudioMusic } from "./AudioMusic";
import AudioSound from "./AudioSound";
import { STORAGE_TYPE } from "../../app/define/StorageDefine";
import EventMgr from "../manager/EventMgr";
import { EVENTNAME } from "../../app/define/EventDefine";
import ResMgr from "../manager/ResMgr";

export default class AudioMgr {
    /**音乐音量 */
    private _musicVolume: number = 1;
    /**音乐开关 */
    private _musicSwitch: boolean = true;
    /**音效音量 */
    private _soundVolume: number = 1;
    /**音效开关 */
    private _soundSwitch: boolean = true;
    /**音乐播放器 */
    private audioMusic: AudioMusic;
    /**音效播放器池子 */
    private audioSoundPool: NodePool;
    /**正在播放的音效 */
    private audioSoundMap: Map<string, AudioSound>;
    /** 正在播放的音效资源地址 */
    private _audioSoundUrlMap: Map<string, string> = new Map();
    /** 音效停止序号 */
    private _soundStopVersion: number = 0;
    /**音效唯一id */
    private static soundId: number = 0;

    /** 单例实例 */
    private static _inst: AudioMgr
    public static get inst(): AudioMgr {
        if (!this._inst) {
            this._inst = new AudioMgr();
        }
        return this._inst;
    }

    /**
     * 获取新的音效唯一 ID。
     * @returns 音效唯一 ID。
     */
    public static getSoundId() {
        if (AudioMgr.soundId == 300000) AudioMgr.soundId = 0;
        AudioMgr.soundId++;
        return AudioMgr.soundId;
    }

    /** 初始化音频系统并读取本地音量与开关配置 */
    public init(): void {
        AudioMgr.soundId = 0;
        this.audioSoundMap = new Map();
        this.audioSoundPool = new NodePool();
        let musicNode: Node = new Node("audioMusic");
        this.audioMusic = musicNode.addComponent(AudioMusic);
        GRoot.inst.node.addChild(musicNode);

        let localData: IStorage.IMusicSound = XStorageMgr.inst.getItem(STORAGE_TYPE.MUSIC_SOUND) || {};
        this._musicVolume = this.audioMusic.volume = localData.musicVolume ?? 1;
        this._musicSwitch = localData.musicSwitch ?? true;
        this.audioMusic.switch = this._musicSwitch;
        this._soundVolume = localData.soundVolume ?? 1;
        this._soundSwitch = localData.soundSwitch ?? true;
        EventMgr.inst.removeListener(EVENTNAME.PLAY_SOUND, this.onPlaySound, this);
        EventMgr.inst.addEventListener(EVENTNAME.PLAY_SOUND, this.onPlaySound, this);
    }

    /**背景音乐音量 */
    get musicVolume(): number { return this._musicVolume; }
    set musicVolume(value: number) {
        this._musicVolume = value;
        this.audioMusic.volume = value;
        this.saveMusicSound();
    }

    /**背景音乐开关 */
    get musicSwitch(): boolean { return this._musicSwitch; }
    set musicSwitch(value: boolean) {
        this.audioMusic.switch = this._musicSwitch = value;
        if (!value) this.audioMusic.stopMusic();
        this.saveMusicSound();
    }
    /**
     * 播放背景音乐
     * @param url 音乐资源地址。
     * @param isLoop 是否循环
     */
    public async playMusic(url: string, isLoop: boolean = true): Promise<void> {
        if (!url) return;
        this.audioMusic.playMusic(url, isLoop);
    }

    /** 停止当前背景音乐 */
    public stopMusic(): void {
        this.audioMusic.stopMusic();
    }

    /**音效音量 */
    get soundVolume(): number { return this._soundVolume; }
    set soundVolume(value: number) {
        this._soundVolume = value;
        this.saveMusicSound();
    }
    /**音效开关 */
    get soundSwitch(): boolean { return this._soundSwitch; }
    set soundSwitch(value: boolean) {
        this._soundSwitch = value;
        if (!value) this.stopSound();
        this.saveMusicSound();
    }
    /**
     * 播放音效
     * @param url 音效资源地址。
     */
    public async playSound(url: string): Promise<void> {
        if (!url) return;
        if (!this._soundSwitch) return;
        let soundNode: Node = this.audioSoundPool.get();
        if (!soundNode) {
            soundNode = new Node();
            soundNode.addComponent(AudioSound);
            GRoot.inst.node.addChild(soundNode);
        }
        let soundId: number = AudioMgr.getSoundId();
        soundNode.name = `audioSound_${soundId}`;
        let audioSound: AudioSound = soundNode.getComponent(AudioSound);
        const owner = soundNode.name;
        const stopVersion = this._soundStopVersion;
        const clip = await ResMgr.inst.loadRes(url, AudioClip, owner);
        if (!clip) {
            this.audioSoundPool.put(soundNode);
            return;
        }
        if (!this._soundSwitch || this._soundStopVersion !== stopVersion) {
            ResMgr.inst.releaseRes(url, AudioClip, owner);
            this.audioSoundPool.put(soundNode);
            return;
        }
        this.audioSoundMap.set(soundNode.name, audioSound);
        this._audioSoundUrlMap.set(soundNode.name, url);
        audioSound.volume = this._soundVolume;
        audioSound.playAudioClip(clip);
        audioSound.onComplete = (audio: AudioSound) => {
            this.recycleSound(audio, soundNode, url);
        }
    }

    /** 停止当前全部正在播放的音效 */
    public stopSound(): void {
        this._soundStopVersion++;
        const sounds = Array.from(this.audioSoundMap.entries());
        sounds.forEach(([nodeName, sound]) => {
            this.recycleSound(sound, sound.node, this._audioSoundUrlMap.get(nodeName));
        });
    }

    /**
     * 回收音效播放器。
     * @param audio 音效播放器。
     * @param soundNode 音效节点。
     * @param url 音效资源地址。
     */
    private recycleSound(audio: AudioSound, soundNode: Node, url?: string): void {
        if (!audio || !soundNode || !this.audioSoundMap.has(soundNode.name)) return;
        audio.stop();
        audio.release();
        if (url) {
            ResMgr.inst.releaseRes(url, AudioClip, soundNode.name);
        }
        this.audioSoundMap.delete(soundNode.name);
        this._audioSoundUrlMap.delete(soundNode.name);
        this.audioSoundPool.put(soundNode);
    }

    /**
     * 播放事件传入的音效。
     * @param _eventName 事件名称。
     * @param data 音效事件数据。
     */
    private onPlaySound(_eventName: EVENTNAME.PLAY_SOUND, data: IEvent.Data<EVENTNAME.PLAY_SOUND>): void {
        if (!data || !data.url) return;
        void this.playSound(data.url);
    }

    /** 暂停当前背景音乐与全部音效 */
    public pasue() {
        this.musicSwitch && this.audioMusic.playing && this.audioMusic.pause();
        if (this.soundSwitch) {
            this.audioSoundMap.forEach((sound: AudioSound) => {
                sound.pause();
            });
        }
    }

    /** 恢复当前背景音乐与全部音效 */
    public resume() {
        this.musicSwitch && this.audioMusic.playing && this.audioMusic.play();
        if (this.soundSwitch) {
            this.audioSoundMap.forEach((sound: AudioSound) => {
                sound.play();
            });
        }
    }

    /** 保存音乐与音效配置到本地存储 */
    private saveMusicSound(): void {
        let localData: IStorage.IMusicSound = {
            musicVolume: this._musicVolume,
            musicSwitch: this._musicSwitch,
            soundVolume: this._soundVolume,
            soundSwitch: this._soundSwitch,
        }
        XStorageMgr.inst.setItem(STORAGE_TYPE.MUSIC_SOUND, localData);
    }

    /** 清理音频管理器运行时状态 */
    public clear(): void {
        EventMgr.inst.removeListener(EVENTNAME.PLAY_SOUND, this.onPlaySound, this);
        this.audioMusic?.release();
        this.stopSound();
    }
}

window["AudioMgr"] = AudioMgr;
