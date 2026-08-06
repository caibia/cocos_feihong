/**
 * 默认热更新配置
 *
 * 说明：
 * - 本地开发可先用 127.0.0.1 联调；
 * - 正式环境请替换为线上 CDN 地址；
 * - manifestResourcePath 对应 assets/resources/hotupdate/project.json。
 */
export const HOT_UPDATE_DEFAULT_CONFIG: IHotUpdate.Config = {
    enable: true,
    manifestResourcePath: "hotupdate/project",
    packageUrl: "http://127.0.0.1:8080/hotupdate/android",
    storageDir: "hot-update-assets",
    retryCount: 3,
};
