/** 存储的数据类型定义 */
declare namespace IStorage {
    /** 音乐/音效设置 */
    export interface IMusicSound {
        /** 音乐音量 0-1 */
        musicVolume?: number,
        /** 音乐开关 */
        musicSwitch?: boolean,
        /** 音效音量 0-1 */
        soundVolume?: number,
        /** 音效开关 */
        soundSwitch?: boolean,
    }
}