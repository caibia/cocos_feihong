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

    /** 存储数据映射 */
    export interface DataMap {
        /** 音乐音效设置 */
        music_sound: IMusicSound;
        /** 热更新搜索路径 */
        hot_update_search_paths: string[];
        /** 首次 PV 是否已播放 */
        login_pv_played: boolean;
        /** 隐私协议是否已同意 */
        login_law_agreed: boolean;
        /** 登录界面是否静音 */
        login_mute: boolean;
        /** 上次登录服编号 */
        login_last_server_id: number;
        /** 上次登录账号 */
        login_last_account: string;
        /** 上次登录时间戳 */
        login_last_time: number;
    }
}
