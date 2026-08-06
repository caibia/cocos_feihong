/**
 *Author  : XW
 *Desc    : 热更新类型定义
 */

/** 热更新类型定义 */
declare namespace IHotUpdate {
    /** 热更新配置 */
    export interface Config {
        /** 是否启用热更新流程 */
        enable: boolean;
        /** resources 内基线 manifest 的加载路径 */
        manifestResourcePath: string;
        /** 远端热更根地址 */
        packageUrl: string;
        /** 本地可写目录下的热更缓存子目录 */
        storageDir: string;
        /** 下载失败后重试次数 */
        retryCount: number;
    }

    /** 热更新下载进度信息 */
    export interface ProgressInfo {
        /** 引擎返回的状态消息 */
        message: string;
        /** 当前进度百分比 */
        percent: number;
        /** 已下载文件数 */
        downloadedFiles: number;
        /** 总文件数 */
        totalFiles: number;
        /** 已下载字节数 */
        downloadedBytes: number;
        /** 总字节数 */
        totalBytes: number;
    }

    /** 热更新执行结果 */
    export interface Result {
        /** 是否跳过本次流程 */
        skipped: boolean;
        /** 是否更新完成 */
        updated: boolean;
        /** 非成功场景的原因标识 */
        reason?: string;
    }

    /** 热更新检测结果 */
    export interface CheckResult {
        /** 是否跳过本次检测 */
        skipped: boolean;
        /** 是否需要下载更新 */
        needUpdate: boolean;
        /** 跳过或无需更新时的原因标识 */
        reason?: string;
    }
}
