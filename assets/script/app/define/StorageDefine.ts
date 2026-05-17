export const enum STORAGE_TYPE {
    /** 音乐/音效设置 */
    MUSIC_SOUND = "music_sound",
    /** 主热更新 searchPaths */
    HOT_UPDATE_SEARCH_PATHS = "hot_update_search_paths",
}

export interface StorageDataMap {
    [STORAGE_TYPE.MUSIC_SOUND]: IStorage.IMusicSound;
    [STORAGE_TYPE.HOT_UPDATE_SEARCH_PATHS]: string[];
}
