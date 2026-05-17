/**
 * 热更新配置
 */
export interface HotUpdateConfig {
    /** 是否启用热更新流程（false 时直接跳过） */
    enable: boolean;
    /** resources 内基线 manifest 的加载路径（不含 .json 扩展名） */
    manifestResourcePath: string;
    /** 远端热更根地址（CDN/静态服务器目录） */
    packageUrl: string;
    /** 本地可写目录下的热更缓存子目录 */
    storageDir: string;
    /** 下载失败后重试次数（仅重试失败分片） */
    retryCount: number;
}

/**
 * 默认热更新配置
 *
 * 说明：
 * - 本地开发可先用 127.0.0.1 联调；
 * - 正式环境请替换为线上 CDN 地址；
 * - manifestResourcePath 对应 assets/resources/hotupdate/project.json。
 */
export const HOT_UPDATE_DEFAULT_CONFIG: HotUpdateConfig = {
    enable: true,
    manifestResourcePath: "hotupdate/project",
    packageUrl: "http://127.0.0.1:8080/hotupdate/android",
    storageDir: "hot-update-assets",
    retryCount: 3,
};
