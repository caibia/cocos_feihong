/**
*Author  : XW
*Desc    : 资源生命周期管理器
*/

import { Asset, AssetManager, __private, assetManager, resources } from "cc";
import { UIPackage } from "../../fairyGUI/UIPackage";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import { XResConst } from "../define/XResConst";
import TimerMgr from "./TimerMgr";
import * as pako from 'pako';

interface IManagedResRecord<T extends Asset = Asset> {
    /** 资源路径 */
    url: string;
    /** 资源类型名称 */
    typeName: string;
    /** 资源对象 */
    asset: T | null;
    /** 加载任务 */
    loading: Promise<T> | null;
    /** 持有者计数 */
    owners: Map<string, number>;
    /** 引用总数 */
    refCount: number;
    /** 释放时间 */
    releaseAt: number;
}

interface IManagedPackageRecord<T extends Asset = Asset> {
    /** 目录路径 */
    url: string;
    /** 资源类型名称 */
    typeName: string;
    /** 资源列表 */
    assets: T[];
    /** 加载任务 */
    loading: Promise<T[]> | null;
    /** 持有者计数 */
    owners: Map<string, number>;
    /** 引用总数 */
    refCount: number;
    /** 释放时间 */
    releaseAt: number;
}

interface IFGUIPackageRecord {
    /** 包名 */
    pkgName: string;
    /** 包路径 */
    pkgUrl: string;
    /** 加载任务 */
    loading: Promise<boolean> | null;
    /** 持有者计数 */
    owners: Map<string, number>;
    /** 引用总数 */
    refCount: number;
    /** 释放时间 */
    releaseAt: number;
}

/** 资源释放延迟时间 */
const RELEASE_DELAY_MS = 60 * 1000;
/** 默认资源持有者 */
const GENERIC_OWNER = "__generic__";

export default class ResMgr {
    /** 单资源记录 */
    private _managedResMap: Map<string, IManagedResRecord>;
    /** 目录资源记录 */
    private _managedPackageMap: Map<string, IManagedPackageRecord>;
    /** UI包的引用计数 */
    private _uiPackRefMap: Map<string, IFGUIPackageRecord>;
    private static _inst: ResMgr;
    public static get inst(): ResMgr {
        if (!ResMgr._inst) {
            ResMgr._inst = new ResMgr;
        }
        return ResMgr._inst;
    }

    constructor() {
        this._managedResMap = new Map();
        this._managedPackageMap = new Map();
        this._uiPackRefMap = new Map();
    }

    public async init(): Promise<void> {
        for (const packageName of XResConst.RES_COMMON_PACKAGEARR) {
            await this.loadFGUIPackage(XResConst.getUIPackageUrl(packageName), "common");
        }
        TimerMgr.inst.setInterval(this._intervalGC.bind(this), 1 * 1000, this);
    }

    /**
     * 加载bundle包
     * @param bundleName 包名
     */
    private loadBundle(bundleName: string): Promise<AssetManager.Bundle | null> {
        return new Promise<AssetManager.Bundle | null>((resolve) => {
            assetManager.loadBundle(bundleName, (err: Error, bundle: AssetManager.Bundle) => {
                if (err) {
                    XDEBUGLOG.error(`loadBundle ${bundleName} 失败 ！ 错误：${err}`);
                    resolve(null);
                    return;
                }
                XDEBUGLOG.res(`loadBundle ${bundleName} 完成！`);
                resolve(bundle);
            });
        });
    }

    /**
     * asset对象转为二进制数据
     * @param asset 资源对象
     */
    public async parseAssetToBinary(asset: Asset): Promise<Uint8Array> {
        return await new Promise<Uint8Array>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.responseType = "arraybuffer";
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300 && xhr.response instanceof ArrayBuffer) {
                        resolve(new Uint8Array(xhr.response));
                    } else {
                        reject(null);
                    }
                }
            };
            xhr.open("GET", asset.nativeUrl, true);
            xhr.send(null);
        }).catch(() => null);
    }

    /**
     * 以二进制形式加载资源
     * @param url 资源路径
     * @param callback 回调
     */
    public async loadBinary(url: string, callback?: (asset) => void): Promise<Uint8Array> {
        let asset: Asset = await this._loadAsset(url, Asset);
        if (!asset) {
            return null;
        }
        callback && callback(asset);
        let binary = await this.parseAssetToBinary(asset);
        asset.decRef();
        return binary;
    }

    /**
    * 解压缩 .gz 文件并解析为 JSON
    * @param uint8Array 二进制数据
    */
    public parseGzToJson(uint8Array: Uint8Array): any {
        const decompressedData = pako.ungzip(uint8Array);
        const jsonString = new TextDecoder('utf-8').decode(decompressedData);
        try {
            const jsonData = JSON.parse(jsonString);
            XDEBUGLOG.debug('解析成功:', jsonData);
            return jsonData;
        } catch (error) {
            XDEBUGLOG.error('解析 JSON 失败:', error);
            return null;
        }
    }

    /**
     * 加载单个配置表数据到缓存中
     * @param url 资源路径
     */
    public async loadConfig(url: string): Promise<any> {
        const uint8Array = await this.loadBinary(url);
        if (!uint8Array) {
            return null;
        }
        return this.parseGzToJson(uint8Array);
    }

    /**
     * 加载包里的单个资源
     * @param url 资源路径
     * @param type 资源类型
     * @param owner 资源持有者
     */
    public async loadRes<T extends Asset>(url: string, type?: __private.__types_globals__Constructor<T>, owner?: string): Promise<T | null> {
        const record = this.getManagedResRecord(url, type);
        this.addManagedRef(record, owner);
        if (!owner) {
            XDEBUGLOG.warn(`资源 ${url} 加载缺少 owner`);
        }
        if (record.asset) {
            return record.asset;
        }
        if (!record.loading) {
            record.loading = this._loadAsset(url, type).then((asset) => {
                if (asset) {
                    record.asset = asset;
                }
                record.loading = null;
                return asset;
            });
        }
        const asset = await record.loading.catch((error) => {
            XDEBUGLOG.error(`资源加载失败 ${url} 错误：${error}`);
            record.loading = null;
            return null;
        });
        if (!asset) {
            this.rollbackManagedRef(record, owner);
        }
        return asset;
    }

    /**
     * 释放包里的单个资源
     * @param url 资源路径
     * @param type 资源类型
     * @param owner 资源持有者
     */
    public releaseRes<T extends Asset>(url: string, type?: __private.__types_globals__Constructor<T>, owner?: string): void {
        const key = this.getResKey(url, type);
        const record = this._managedResMap.get(key);
        if (!record) {
            XDEBUGLOG.warn(`释放资源 ${url} 时未找到记录`);
            return;
        }
        this.releaseManagedRef(record, owner);
    }

    /**
     * 释放持有者的所有资源
     * @param owner 资源持有者
     */
    public releaseOwner(owner: string): void {
        this._managedResMap.forEach((record) => this.releaseRecordOwner(record, owner));
        this._managedPackageMap.forEach((record) => this.releaseRecordOwner(record, owner));
        this._uiPackRefMap.forEach((record) => this.releaseFGUIPackageOwner(record, owner));
    }

    /**
     * 加载资源
     * @param url 资源路径
     * @param type 资源类型
     */
    private _loadAsset<T extends Asset>(url: string, type?: __private.__types_globals__Constructor<T> | null): Promise<T | null> {
        return new Promise<T | null>((resolve) => {
            resources.load(url, type, (err: Error, data: T) => {
                if (err) {
                    XDEBUGLOG.error(`资源加载失败 ${url} 错误：${err}`);
                    resolve(null);
                    return;
                }
                XDEBUGLOG.res(`资源加载成功 bundle包：${resources.name} url：${url}`);
                resolve(data);
            });
        });
    }

    /**
     * 同步获取资源
     * @param path 资源路径
     * @param type 资源类型
     */
    public getRes<T extends Asset>(path: string, type?: __private.__types_globals__Constructor<T> | null): T | null {
        return resources.get(path, type);
    }

    /**
     * 加载整个包/文件夹里的资源
     * @param packagePath 资源包名
     * @param type 资源类型
     * @param owner 资源持有者
     */
    public async loadPackage<T extends Asset>(packagePath: string, type?: __private.__types_globals__Constructor<T> | null, owner?: string): Promise<T[] | null> {
        const record = this.getManagedPackageRecord(packagePath, type);
        this.addPackageRef(record, owner);
        if (!owner) {
            XDEBUGLOG.warn(`资源目录 ${packagePath} 加载缺少 owner`);
        }
        if (record.assets.length > 0) {
            return record.assets;
        }
        if (!record.loading) {
            record.loading = new Promise<T[]>((resolve) => {
                resources.loadDir(packagePath, type, (err: Error, data: T[]) => {
                    if (err) {
                        XDEBUGLOG.error(`资源包 ${resources.name} ${packagePath} 加载失败！ 错误：${err}`);
                        resolve(null);
                        return;
                    }
                    XDEBUGLOG.res(`资源包 ${resources.name} ${packagePath} 加载完成！`);
                    resolve(data);
                });
            }).then((assets) => {
                if (assets) {
                    record.assets = assets;
                }
                record.loading = null;
                return assets;
            });
        }
        const assets = await record.loading.catch((error) => {
            XDEBUGLOG.error(`资源包 ${resources.name} ${packagePath} 加载失败！ 错误：${error}`);
            record.loading = null;
            return null;
        });
        if (!assets) {
            this.rollbackManagedRef(record, owner);
        }
        return assets;
    }

    /**
     * 释放整个包/文件夹里的资源
     * @param packagePath 资源包名
     * @param type 资源类型
     * @param owner 资源持有者
     */
    public releasePackage<T extends Asset>(packagePath: string, type?: __private.__types_globals__Constructor<T> | null, owner?: string): void {
        const key = this.getResKey(packagePath, type);
        const record = this._managedPackageMap.get(key);
        if (!record) {
            XDEBUGLOG.warn(`释放资源目录 ${packagePath} 时未找到记录`);
            return;
        }
        this.releaseManagedRef(record, owner);
    }

    /**
     * 载入一个FGUI资源包
     * @param pkgUrl 包路径
     * @param uuid 包绑定的界面id
     * @param onComplete 回调
     */
    public async loadFGUIPackage(pkgUrl: string, uuid: string, onComplete?: (error: any, pkg: UIPackage) => void): Promise<void> {
        let pkgName = pkgUrl.split("/")[1];
        let bundle = resources;
        if (XResConst.RES_COMMON_PACKAGEARR.indexOf(pkgName) !== -1) {
            return await this.loadCommonFGUIPackage(bundle, pkgUrl, onComplete);
        }
        let record = this.getFGUIPackageRecord(pkgName, pkgUrl);
        this.addFGUIPackageRef(record, uuid);
        if (this.isFGUIPackageExist(pkgUrl)) {
            onComplete && onComplete(undefined, UIPackage.getById(pkgUrl));
            return;
        }
        if (!record.loading) {
            record.loading = new Promise<boolean>((resolve) => {
                UIPackage.loadPackage(bundle, pkgUrl, (err: any, pkg: UIPackage) => {
                    onComplete && onComplete(err, pkg);
                    if (err) {
                        XDEBUGLOG.error(`ui资源包 ${bundle.name} ${pkgUrl} 加载失败！ 错误：${err}`);
                        resolve(false);
                        return;
                    }
                    XDEBUGLOG.res(`ui资源包 ${bundle.name} ${pkgUrl} 加载完成！`);
                    resolve(true);
                });
            }).then((loaded) => {
                record.loading = null;
                return loaded;
            });
        }
        const loaded = await record.loading.catch((error) => {
            XDEBUGLOG.error(`ui资源包 ${bundle.name} ${pkgUrl} 加载失败！ 错误：${error}`);
            record.loading = null;
            return false;
        });
        if (!loaded) {
            this.rollbackFGUIPackageRef(record, uuid);
        }
    }

    /**
     * 释放非公共 FGUI资源包引用
     * @param pkgName 资源包名
     * @param uuid 界面uuid
     */
    public unloadFGUIPakcageRef(pkgName: string, uuid: string): void {
        if (XResConst.RES_COMMON_PACKAGEARR.indexOf(pkgName) !== -1) {
            return;
        }
        let refInfo = this._uiPackRefMap.get(pkgName);
        if (!refInfo) {
            XDEBUGLOG.warn(`释放ui资源包 ${pkgName} 时未找到记录`);
            return;
        }
        this.releaseFGUIPackageOwner(refInfo, uuid);
    }

    /**
     * 输出资源记录
     */
    public dumpManagedRes(): void {
        const res = [];
        const packages = [];
        const fguiPackages = [];
        this._managedResMap.forEach((record) => {
            res.push(this.formatRecordDump(record));
        });
        this._managedPackageMap.forEach((record) => {
            packages.push(this.formatRecordDump(record));
        });
        this._uiPackRefMap.forEach((record) => {
            fguiPackages.push({
                pkgName: record.pkgName,
                pkgUrl: record.pkgUrl,
                refCount: record.refCount,
                releaseAt: record.releaseAt,
                owners: Array.from(record.owners.entries()),
            });
        });
        XDEBUGLOG.res("资源计数：", { res, packages, fguiPackages });
    }

    /**
     * 输出资源记录
     */
    public dump(): void {
        this.dumpManagedRes();
    }

    /**
     * 资源包是否存在
     * @param url 资源包路径
     */
    public isFGUIPackageExist(url: string): boolean {
        return UIPackage.getById(url) !== undefined;
    }

    /**
     * 资源记录键名
     * @param url 资源路径
     * @param type 资源类型
     */
    private getResKey<T extends Asset>(url: string, type?: __private.__types_globals__Constructor<T> | null): string {
        return `${url}::${this.getTypeName(type)}`;
    }

    /**
     * 资源类型名称
     * @param type 资源类型
     */
    private getTypeName<T extends Asset>(type?: __private.__types_globals__Constructor<T> | null): string {
        return type?.name || "Asset";
    }

    /**
     * 获取单资源记录
     * @param url 资源路径
     * @param type 资源类型
     */
    private getManagedResRecord<T extends Asset>(url: string, type?: __private.__types_globals__Constructor<T> | null): IManagedResRecord<T> {
        const key = this.getResKey(url, type);
        let record = this._managedResMap.get(key) as IManagedResRecord<T>;
        if (!record) {
            record = {
                url,
                typeName: this.getTypeName(type),
                asset: null,
                loading: null,
                owners: new Map(),
                refCount: 0,
                releaseAt: 0,
            };
            this._managedResMap.set(key, record);
        }
        return record;
    }

    /**
     * 获取目录资源记录
     * @param url 资源路径
     * @param type 资源类型
     */
    private getManagedPackageRecord<T extends Asset>(url: string, type?: __private.__types_globals__Constructor<T> | null): IManagedPackageRecord<T> {
        const key = this.getResKey(url, type);
        let record = this._managedPackageMap.get(key) as IManagedPackageRecord<T>;
        if (!record) {
            record = {
                url,
                typeName: this.getTypeName(type),
                assets: [],
                loading: null,
                owners: new Map(),
                refCount: 0,
                releaseAt: 0,
            };
            this._managedPackageMap.set(key, record);
        }
        return record;
    }

    /**
     * 增加单资源引用
     * @param record 资源记录
     * @param owner 资源持有者
     */
    private addManagedRef(record: IManagedResRecord, owner?: string): void {
        this.addRecordOwner(record, owner || GENERIC_OWNER);
    }

    /**
     * 增加目录资源引用
     * @param record 目录资源记录
     * @param owner 资源持有者
     */
    private addPackageRef(record: IManagedPackageRecord, owner?: string): void {
        this.addRecordOwner(record, owner || GENERIC_OWNER);
    }

    /**
     * 增加资源持有者
     * @param record 资源记录
     * @param owner 资源持有者
     */
    private addRecordOwner(record: IManagedResRecord | IManagedPackageRecord, owner: string): void {
        record.owners.set(owner, (record.owners.get(owner) || 0) + 1);
        record.refCount++;
        record.releaseAt = 0;
    }

    /**
     * 回滚资源引用
     * @param record 资源记录
     * @param owner 资源持有者
     */
    private rollbackManagedRef(record: IManagedResRecord | IManagedPackageRecord, owner?: string): void {
        this.releaseRecordOwnerOnce(record, owner || GENERIC_OWNER);
    }

    /**
     * 释放资源引用
     * @param record 资源记录
     * @param owner 资源持有者
     */
    private releaseManagedRef(record: IManagedResRecord | IManagedPackageRecord, owner?: string): void {
        this.releaseRecordOwnerOnce(record, owner || GENERIC_OWNER);
    }

    /**
     * 释放持有者一次引用
     * @param record 资源记录
     * @param owner 资源持有者
     */
    private releaseRecordOwnerOnce(record: IManagedResRecord | IManagedPackageRecord, owner: string): void {
        const count = record.owners.get(owner);
        if (!count) {
            XDEBUGLOG.warn(`释放资源 ${record.url} 时 owner ${owner} 不存在`);
            return;
        }
        if (count <= 1) {
            record.owners.delete(owner);
        } else {
            record.owners.set(owner, count - 1);
        }
        record.refCount = Math.max(0, record.refCount - 1);
        if (record.refCount === 0) {
            record.releaseAt = Date.now() + RELEASE_DELAY_MS;
        }
    }

    /**
     * 释放持有者全部引用
     * @param record 资源记录
     * @param owner 资源持有者
     */
    private releaseRecordOwner(record: IManagedResRecord | IManagedPackageRecord, owner: string): void {
        const count = record.owners.get(owner);
        if (!count) {
            return;
        }
        record.owners.delete(owner);
        record.refCount = Math.max(0, record.refCount - count);
        if (record.refCount === 0) {
            record.releaseAt = Date.now() + RELEASE_DELAY_MS;
        }
    }

    /**
     * 获取FGUI包记录
     * @param pkgName 包名
     * @param pkgUrl 包路径
     */
    private getFGUIPackageRecord(pkgName: string, pkgUrl: string): IFGUIPackageRecord {
        let record = this._uiPackRefMap.get(pkgName);
        if (!record) {
            record = {
                pkgName,
                pkgUrl,
                loading: null,
                owners: new Map(),
                refCount: 0,
                releaseAt: 0,
            };
            this._uiPackRefMap.set(pkgName, record);
        }
        return record;
    }

    /**
     * 增加FGUI包引用
     * @param record 包记录
     * @param owner 资源持有者
     */
    private addFGUIPackageRef(record: IFGUIPackageRecord, owner: string): void {
        record.owners.set(owner, (record.owners.get(owner) || 0) + 1);
        record.refCount++;
        record.releaseAt = 0;
    }

    /**
     * 释放FGUI包持有者
     * @param record 包记录
     * @param owner 资源持有者
     */
    private releaseFGUIPackageOwner(record: IFGUIPackageRecord, owner: string): void {
        const count = record.owners.get(owner);
        if (!count) {
            XDEBUGLOG.warn(`释放ui资源包 ${record.pkgName} 时 owner ${owner} 不存在`);
            return;
        }
        record.owners.delete(owner);
        record.refCount = Math.max(0, record.refCount - count);
        if (record.refCount === 0) {
            record.releaseAt = Date.now() + RELEASE_DELAY_MS;
        }
    }

    /**
     * 回滚FGUI包引用
     * @param record 包记录
     * @param owner 资源持有者
     */
    private rollbackFGUIPackageRef(record: IFGUIPackageRecord, owner: string): void {
        this.releaseFGUIPackageOwner(record, owner);
    }

    /**
     * 加载公共FGUI包
     * @param bundle 资源包
     * @param pkgUrl 包路径
     * @param onComplete 回调
     */
    private async loadCommonFGUIPackage(bundle: AssetManager.Bundle, pkgUrl: string, onComplete?: (error: any, pkg: UIPackage) => void): Promise<void> {
        if (this.isFGUIPackageExist(pkgUrl)) {
            onComplete && onComplete(undefined, UIPackage.getById(pkgUrl));
            return;
        }
        await new Promise<void>((resolve) => {
            UIPackage.loadPackage(bundle, pkgUrl, (err: any, pkg: UIPackage) => {
                onComplete && onComplete(err, pkg);
                if (err) {
                    XDEBUGLOG.error(`ui资源包 ${bundle.name} ${pkgUrl} 加载失败！ 错误：${err}`);
                    resolve();
                    return;
                }
                XDEBUGLOG.res(`ui资源包 ${bundle.name} ${pkgUrl} 加载完成！`);
                resolve();
            });
        });
    }

    /**
     * 释放 FGUI资源包
     */
    private unloadFGUIPakcage(): void {
        this._uiPackRefMap.forEach((refInfo, pkgName) => {
            if (this.canReleaseRecord(refInfo)) {
                UIPackage.removePackage(pkgName);
                this._uiPackRefMap.delete(pkgName);
                XDEBUGLOG.uiRelease(`释放ui资源包：${pkgName}`);
            }
        });
    }

    /**
     * 释放空闲单资源
     */
    private releaseIdleManagedRes(): void {
        this._managedResMap.forEach((record, key) => {
            if (!this.canReleaseRecord(record) || !record.asset) {
                return;
            }
            assetManager.releaseAsset(record.asset);
            this._managedResMap.delete(key);
            XDEBUGLOG.res(`释放资源：${record.url}`);
        });
    }

    /**
     * 释放空闲目录资源
     */
    private releaseIdleManagedPackages(): void {
        this._managedPackageMap.forEach((record, key) => {
            if (!this.canReleaseRecord(record) || record.assets.length <= 0) {
                return;
            }
            record.assets.forEach((asset) => assetManager.releaseAsset(asset));
            this._managedPackageMap.delete(key);
            XDEBUGLOG.res(`释放资源目录：${record.url}`);
        });
    }

    /**
     * 是否可释放资源
     * @param record 资源记录
     */
    private canReleaseRecord(record: IManagedResRecord | IManagedPackageRecord | IFGUIPackageRecord): boolean {
        if (record.refCount > 0 || record.releaseAt <= 0) {
            return false;
        }
        return Date.now() >= record.releaseAt;
    }

    /**
     * 格式化资源记录
     * @param record 资源记录
     */
    private formatRecordDump(record: IManagedResRecord | IManagedPackageRecord): object {
        return {
            url: record.url,
            typeName: record.typeName,
            refCount: record.refCount,
            releaseAt: record.releaseAt,
            owners: Array.from(record.owners.entries()),
        };
    }

    /**
     * 定时释放资源
     */
    private _intervalGC(): void {
        this.unloadFGUIPakcage();
        this.releaseIdleManagedRes();
        this.releaseIdleManagedPackages();
    }
}

window['ResMgr'] = ResMgr;
