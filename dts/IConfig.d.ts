/**
 *Author  : XW
 *Desc    : 配置表类型定义
 */

/** 配置表类型定义 */
declare namespace IConfig {
    /** 语言配置 */
    export interface LanguageConfig {
        /** 文本编号对应的显示内容 */
        [id: string]: string;
    }

    /** 配置表映射 */
    export interface ConfigMap {
        /** 多语言文本 */
        Language: LanguageConfig;
        /** 登录服务器列表 */
        serverlist: import("./repo/login/IServerListRepo").IServerListSnapshot;
    }

    /** 配置表名称 */
    export type ConfigName = keyof ConfigMap;
}
