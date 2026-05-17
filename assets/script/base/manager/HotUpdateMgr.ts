import { assetManager, game, JsonAsset, native, sys } from "cc";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import { HotUpdateConfig } from "../define/HotUpdateDefine";
import XStorageMgr from "./XStorageMgr";
import { STORAGE_TYPE } from "../../app/define/StorageDefine";

/**
 * 热更新下载进度信息
 */
export interface HotUpdateProgressInfo {
    /** 引擎返回的状态消息（可能为空） */
    message: string;
    /** 当前进度百分比，范围 0~1 */
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

/**
 * 热更新执行结果（下载阶段）
 */
export interface HotUpdateResult {
    /** true 表示本次流程被跳过（配置关闭/平台不支持/忙碌等） */
    skipped: boolean;
    /** true 表示更新已成功完成并触发重启 */
    updated: boolean;
    /** 非成功场景的原因标识，便于日志和排查 */
    reason?: string;
}

/**
 * 热更新检测结果（仅检查阶段）
 */
export interface HotUpdateCheckResult {
    /** true 表示本次检测被跳过 */
    skipped: boolean;
    /** true 表示检测到新版本，需要进入下载更新 */
    needUpdate: boolean;
    /** 检测跳过或无需更新时的原因标识 */
    reason?: string;
}

type HotUpdateState = "idle" | "checking" | "updating";

export default class HotUpdateMgr {
    /** 单例实例 */
    private static _inst: HotUpdateMgr;
    public static get inst(): HotUpdateMgr {
        if (!this._inst) {
            this._inst = new HotUpdateMgr();
        }
        return this._inst;
    }

    /** Cocos 原生热更新管理器实例 */
    private _assetsManager: any = null;
    /** 当前流程状态，避免并发检测/更新 */
    private _state: HotUpdateState = "idle";
    /** 热更缓存目录（writablePath + storageDir） */
    private _storagePath = "";
    /** 运行时本地 manifest 文件路径 */
    private _manifestTempPath = "";
    /** 更新失败后可用的重试次数 */
    private _retryLeft = 0;
    /** 是否已经完成“可更新”准备（check 后且发现新版本） */
    private _preparedForUpdate = false;
    /** 当前准备阶段对应的配置签名，防止跨配置误用 */
    private _preparedConfigKey = "";
    /** 更新完成后待应用的 searchPaths（由 View 决定何时重启） */
    private _pendingSearchPaths: string[] | null = null;

    /** checkNeedUpdate Promise 的 resolve 引用 */
    private _resolveCheck: ((value: HotUpdateCheckResult) => void) | null = null;
    /** startHotUpdate Promise 的 resolve 引用 */
    private _resolveUpdate: ((value: HotUpdateResult) => void) | null = null;
    /** 下载进度回调（由外部 UI 传入） */
    private _onProgress: ((info: HotUpdateProgressInfo) => void) | null = null;

    /**
     * 应用之前保存的 searchPaths。
     * 用于在热更新完成后重启游戏时，恢复正常的资源搜索路径。
     */
    /** */
    public applySavedSearchPaths(): void {
        if (!this.isNativeHotUpdateReady()) return;
        try {
            const savedPaths = XStorageMgr.inst.getItem(STORAGE_TYPE.HOT_UPDATE_SEARCH_PATHS);
            if (!Array.isArray(savedPaths) || savedPaths.length === 0) return;
            const current = native.fileUtils.getSearchPaths() || [];
            const merged = this.mergeSearchPaths(savedPaths, current);
            native.fileUtils.setSearchPaths(merged);
        } catch (error) {
            XDEBUGLOG.warn("applySavedSearchPaths failed", error);
        }
    }

    /**
     * 仅检测是否需要热更新，不执行下载。
     * 供 LoginView 调用。
     */
    public async checkNeedUpdate(config: HotUpdateConfig): Promise<HotUpdateCheckResult> {
        const pre = await this.prepare(config);
        if (pre) return pre;

        this._state = "checking";
        try {
            return await new Promise<HotUpdateCheckResult>((resolve) => {
                this._resolveCheck = resolve;
                this._assetsManager.setEventCallback(this.onCheckNeedEvent.bind(this));
                this._assetsManager.checkUpdate();
            });
        } finally {
            this._state = "idle";
            this._resolveCheck = null;
            if (this._assetsManager) {
                this._assetsManager.setEventCallback(null);
            }
        }
    }

    /**
     * 执行下载更新。
     * 建议在 checkNeedUpdate 返回 needUpdate=true 后调用。
     */
    public async startHotUpdate(config: HotUpdateConfig, onProgress?: (info: HotUpdateProgressInfo) => void): Promise<HotUpdateResult> {
        const key = this.getConfigKey(config);
        if (!this._preparedForUpdate || this._preparedConfigKey !== key) {
            const check = await this.checkNeedUpdate(config);
            if (check.skipped) {
                return { skipped: true, updated: false, reason: check.reason };
            }
            if (!check.needUpdate) {
                return { skipped: false, updated: false, reason: check.reason || "already-up-to-date" };
            }
        }

        if (this._state !== "idle") {
            return { skipped: true, updated: false, reason: "busy" };
        }

        this._state = "updating";
        this._onProgress = onProgress || null;
        try {
            return await new Promise<HotUpdateResult>((resolve) => {
                this._resolveUpdate = resolve;
                this._assetsManager.setEventCallback(this.onUpdateEvent.bind(this));
                this._assetsManager.update();
            });
        } finally {
            this._state = "idle";
            this._resolveUpdate = null;
            this._onProgress = null;
            if (this._assetsManager) {
                this._assetsManager.setEventCallback(null);
            }
            this._preparedForUpdate = false;
            this._preparedConfigKey = "";
        }
    }

    /**
     * 兼容旧调用：检测并直接更新。
     */
    public async checkAndUpdate(
        config: HotUpdateConfig,
        onProgress?: (info: HotUpdateProgressInfo) => void
    ): Promise<HotUpdateResult> {
        const check = await this.checkNeedUpdate(config);
        if (check.skipped) {
            return { skipped: true, updated: false, reason: check.reason };
        }
        if (!check.needUpdate) {
            return { skipped: false, updated: false, reason: check.reason || "already-up-to-date" };
        }
        const ret = await this.startHotUpdate(config, onProgress);
        if (ret.updated) {
            this.applyUpdateAndRestart();
        }
        return ret;
    }

    /**
     * 应用热更结果并重启游戏。
     * 建议在 HotUpdateView 收到 updated=true 后调用。
     */
    public applyUpdateAndRestart(delayMs: number = 100): boolean {
        if (!this._pendingSearchPaths || this._pendingSearchPaths.length === 0) {
            return false;
        }
        const currentPaths = native.fileUtils.getSearchPaths() || [];
        const merged = this.mergeSearchPaths(this._pendingSearchPaths, currentPaths);
        XStorageMgr.inst.setItem(STORAGE_TYPE.HOT_UPDATE_SEARCH_PATHS, merged, true);
        native.fileUtils.setSearchPaths(merged);
        this._pendingSearchPaths = null;
        setTimeout(() => { game.restart(); }, delayMs);
        return true;
    }

    private async prepare(config: HotUpdateConfig): Promise<HotUpdateCheckResult | null> {
        if (!config.enable) {
            return { skipped: true, needUpdate: false, reason: "disabled" };
        }
        if (!this.isNativeHotUpdateReady()) {
            return { skipped: true, needUpdate: false, reason: "non-native" };
        }
        if (!config.packageUrl || config.packageUrl.indexOf("http") !== 0) {
            return { skipped: true, needUpdate: false, reason: "invalid-package-url" };
        }
        if (this._state !== "idle") {
            return { skipped: true, needUpdate: false, reason: "busy" };
        }

        this._retryLeft = Math.max(0, config.retryCount);
        this._storagePath = `${native.fileUtils.getWritablePath()}${config.storageDir}`;
        this.ensureDirectory(this._storagePath);

        const manifestData = await this.loadManifestJson(config.manifestResourcePath);
        if (!manifestData) {
            return { skipped: true, needUpdate: false, reason: "manifest-not-found" };
        }
        this.patchManifestRemoteUrls(manifestData, config.packageUrl);
        this._manifestTempPath = `${this._storagePath}/project.manifest`;
        const wrote = native.fileUtils.writeStringToFile(JSON.stringify(manifestData), this._manifestTempPath);
        if (!wrote) {
            return { skipped: true, needUpdate: false, reason: "write-manifest-failed" };
        }

        this.initAssetsManager();
        this._assetsManager.loadLocalManifest(this._manifestTempPath);
        if (!this._assetsManager.getLocalManifest() || !this._assetsManager.getLocalManifest().isLoaded()) {
            return { skipped: true, needUpdate: false, reason: "local-manifest-invalid" };
        }

        this._preparedForUpdate = false;
        this._preparedConfigKey = this.getConfigKey(config);
        return null;
    }

    private onCheckNeedEvent(event: any): void {
        const code = event.getEventCode();
        const C = native.EventAssetsManager;
        switch (code) {
            case C.ERROR_NO_LOCAL_MANIFEST:
                this.resolveCheckSafe({ skipped: true, needUpdate: false, reason: "no-local-manifest" });
                break;
            case C.ERROR_DOWNLOAD_MANIFEST:
            case C.ERROR_PARSE_MANIFEST:
                this.resolveCheckSafe({ skipped: true, needUpdate: false, reason: "download-manifest-failed" });
                break;
            case C.ALREADY_UP_TO_DATE:
                this.resolveCheckSafe({ skipped: false, needUpdate: false, reason: "already-up-to-date" });
                break;
            case C.NEW_VERSION_FOUND:
                this._preparedForUpdate = true;
                this.resolveCheckSafe({ skipped: false, needUpdate: true });
                break;
            default:
                break;
        }
    }

    private onUpdateEvent(event: any): void {
        const code = event.getEventCode();
        const C = native.EventAssetsManager;
        switch (code) {
            case C.UPDATE_PROGRESSION:
                this.emitProgress(event);
                break;
            case C.UPDATE_FINISHED:
                this.cachePendingSearchPaths();
                this.resolveUpdateSafe({ skipped: false, updated: true });
                break;
            case C.UPDATE_FAILED:
                if (this._retryLeft > 0) {
                    this._retryLeft--;
                    XDEBUGLOG.warn("Hot update failed, retry left:", this._retryLeft);
                    this._assetsManager.downloadFailedAssets();
                } else {
                    this.resolveUpdateSafe({ skipped: true, updated: false, reason: "update-failed" });
                }
                break;
            case C.ERROR_UPDATING:
            case C.ERROR_DECOMPRESS:
                XDEBUGLOG.error("Hot update error", event.getMessage && event.getMessage());
                break;
            default:
                break;
        }
    }

    private emitProgress(event: any): void {
        if (!this._onProgress) return;
        this._onProgress({
            message: (event.getMessage && event.getMessage()) || "",
            percent: (event.getPercent && event.getPercent()) || 0,
            downloadedFiles: (event.getDownloadedFiles && event.getDownloadedFiles()) || 0,
            totalFiles: (event.getTotalFiles && event.getTotalFiles()) || 0,
            downloadedBytes: (event.getDownloadedBytes && event.getDownloadedBytes()) || 0,
            totalBytes: (event.getTotalBytes && event.getTotalBytes()) || 0,
        });
    }

    private cachePendingSearchPaths(): void {
        const newPaths = this._assetsManager.getLocalManifest().getSearchPaths() || [];
        this._pendingSearchPaths = Array.isArray(newPaths) ? newPaths : [];
    }

    private mergeSearchPaths(nextPaths: string[], currentPaths: string[]): string[] {
        const merged: string[] = [];
        const pushed: Record<string, true> = {};
        const all = [...nextPaths, ...currentPaths];
        for (let i = 0; i < all.length; i++) {
            const path = all[i];
            if (!path || pushed[path]) continue;
            pushed[path] = true;
            merged.push(path);
        }
        return merged;
    }

    private initAssetsManager(): void {
        if (this._assetsManager) {
            const oldPath = this._assetsManager.getStoragePath && this._assetsManager.getStoragePath();
            if (oldPath === this._storagePath) return;
            this._assetsManager.setEventCallback(null);
            this._assetsManager = null;
        }
        this._assetsManager = new native.AssetsManager("", this._storagePath, this.versionCompareHandle.bind(this));
        this._assetsManager.setVerifyCallback(this.verifyCallback.bind(this));
        if (sys.os === sys.OS.ANDROID) {
            this._assetsManager.setMaxConcurrentTask(2);
        }
    }

    private isNativeHotUpdateReady(): boolean {
        return !!(sys.isNative && typeof native !== "undefined" && native.fileUtils && native.AssetsManager);
    }

    private patchManifestRemoteUrls(manifest: Record<string, any>, packageUrl: string): void {
        const normalized = packageUrl.endsWith("/") ? packageUrl.slice(0, -1) : packageUrl;
        manifest.packageUrl = normalized;
        manifest.remoteManifestUrl = `${normalized}/project.manifest`;
        manifest.remoteVersionUrl = `${normalized}/version.manifest`;
        if (!manifest.version) manifest.version = "1.0.0";
    }

    private ensureDirectory(dirPath: string): void {
        if (!native.fileUtils.isDirectoryExist(dirPath)) {
            native.fileUtils.createDirectory(dirPath);
        }
    }

    private getConfigKey(config: HotUpdateConfig): string {
        return `${config.packageUrl}|${config.storageDir}|${config.manifestResourcePath}`;
    }

    private versionCompareHandle(versionA: string, versionB: string): number {
        const a = versionA.split(".");
        const b = versionB.split(".");
        const len = Math.max(a.length, b.length);
        for (let i = 0; i < len; i++) {
            const na = parseInt(a[i] || "0", 10);
            const nb = parseInt(b[i] || "0", 10);
            if (na !== nb) return na - nb;
        }
        return 0;
    }

    private verifyCallback(path: string, asset: any): boolean {
        if (asset.compressed) return true;
        return !!asset.md5;
    }

    private resolveCheckSafe(result: HotUpdateCheckResult): void {
        if (!this._resolveCheck) return;
        this._resolveCheck(result);
    }

    private resolveUpdateSafe(result: HotUpdateResult): void {
        if (!this._resolveUpdate) return;
        this._resolveUpdate(result);
    }

    private async loadManifestJson(resourcePath: string): Promise<Record<string, any> | null> {
        return await new Promise<Record<string, any> | null>((resolve) => {
            assetManager.loadBundle("resources", (bundleErr, bundle) => {
                if (bundleErr || !bundle) {
                    resolve(null);
                    return;
                }
                bundle.load(resourcePath, JsonAsset, (err, asset: JsonAsset) => {
                    if (err || !asset || !asset.json) {
                        resolve(null);
                        return;
                    }
                    resolve(asset.json as Record<string, any>);
                });
            });
        });
    }
}

window["HotUpdateMgr"] = HotUpdateMgr;
