
/**
*Author  : XW
*Desc    : 
*/

import { Asset, AssetManager, __private, assetManager, resources } from "cc";
import { UIPackage } from "../../fairyGUI/UIPackage";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import { XResourcesUrl } from "../define/XResourcesUrl";
import TimerMgr from "./TimerMgr";
import * as pako from 'pako';

export default class ResMgr {
    /**UI包的引用计数 */
    private _uiPackRefMap: { [key: string]: { fromArr: string[], pkgUrl: string, reCount: number } };
    private static _inst: ResMgr;
    public static get inst(): ResMgr {
        if (!ResMgr._inst) {
            ResMgr._inst = new ResMgr;
        }
        return ResMgr._inst;
    }

    constructor() {
        this._uiPackRefMap = {};
    }

    public async init() {
        // 0Common 公共包已移除，新公共包就绪后取消注释
        // let pkgUrl: string = XResourcesUrl.getUIPackageUrl("0Common");
        // await this.loadFGUIPackage(pkgUrl, "common");
        TimerMgr.inst.setInterval(this._intervalGC.bind(this), 1 * 1000, this);
    }

    /**
     * 加载bundle包
     * @param bundleName 
     * @returns 
     */
    private loadBundle(bundleName: string) {
        return new Promise<AssetManager.Bundle>((resolve, reject) => {
            assetManager.loadBundle(bundleName, (err: Error, bundle: AssetManager.Bundle) => {
                if (err) {
                    XDEBUGLOG.error(`loadBundle ${bundleName} 失败 ！ 错误：${err}`);
                    reject(err);
                } else {
                    XDEBUGLOG.res(`loadBundle ${bundleName} 完成！`);
                    resolve(bundle);
                }
            });
        });
    }

    /**
     * asset对象转为二进制数据
     * @param asset 资源对象
     * @returns 
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
     * @returns 
     */
    public async loadBinary(url: string, callback?: (asset) => void): Promise<Uint8Array> {
        let asset: Asset = await this._loadAsset(url, Asset);
        let binary = await this.parseAssetToBinary(asset);
        asset.decRef();
        return binary;
    }

    /**
    * 解压缩 .gz 文件并解析为 JSON
    * @param {Uint8Array} uint8Array
    */
    public parseGzToJson(uint8Array: Uint8Array) {
        // 1. 使用 pako 解压缩
        const decompressedData = pako.ungzip(uint8Array);
        // 2. 将解压缩后的 Uint8Array 转换为字符串
        const jsonString = new TextDecoder('utf-8').decode(decompressedData);
        // 3. 将字符串解析为 JSON
        try {
            const jsonData = JSON.parse(jsonString);
            XDEBUGLOG.debug('解析成功:', jsonData);
            return jsonData;
        } catch (error) {
            XDEBUGLOG.error('解析 JSON 失败:', error);
            return null;
        }
    }


    /** 加载单个配置表数据到缓存中 */
    public async loadConfig(url: string): Promise<any> {
        const uint8Array = await this.loadBinary(url);
        if (!uint8Array) return;
        const jsonData = this.parseGzToJson(uint8Array);
        return jsonData;
    }

    /** 
     * 加载包里的单个资源
     * @param url 
     * @param type 
     * @returns 
     */
    public async loadRes<T extends Asset>(url: string, type?: __private.__types_globals__Constructor<T>, callback?: (asset) => void) {
        let asset: T = await this._loadAsset<T>(url, type);
        // asset.addRef();
        callback && callback(asset);
        return asset;
    }

    /**
     * 加载资源
     * @param url 资源路径
     * @param type 类型
     * @returns 
     */
    private _loadAsset<T extends Asset>(url: string, type?: __private.__types_globals__Constructor<T> | null): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            resources.load(url, type, (err: Error, data: T) => {
                if (err) {
                    XDEBUGLOG.error(`资源加载失败 ${url} 错误：${err}`);
                    reject(err);
                } else {
                    XDEBUGLOG.res(`资源加载成功 bundle包：${resources.name} url：${url}`);
                    resolve(data);
                }
            });
        });
    }

    /**
     * 同步获取资源(要确保已经加载过了在使用)
     * @param path 资源路径
     * @param type 资源类型
     * @returns 
     */
    public getRes<T extends Asset>(path: string, type?: __private.__types_globals__Constructor<T> | null): T | null {
        // let bundle: AssetManager.Bundle = assetManager.getBundle(bundleName);
        // if(!bundle) return;
        return resources.get(path, type);
    }

    /**
     * 加载整个包/文件夹 里的资源 例如：ResMgr.inst.loadPackage("config",JsonAsset);
     * @param packagePath 资源包名
     * @param type 资源类型
     * @returns 
     */
    public loadPackage<T extends Asset>(packagePath: string, type?: __private.__types_globals__Constructor<T> | null) {
        let bundle = resources;
        return new Promise<Asset[]>((resolve, reject) => {
            bundle.loadDir(packagePath, (err: Error, data: Asset[]) => {
                if (err) {
                    XDEBUGLOG.error(`资源包 ${bundle.name} ${packagePath} 加载失败！ 错误：${err}`);
                    reject();
                }
                XDEBUGLOG.res(`资源包 ${bundle.name} ${packagePath} 加载完成！`);
                resolve(data);
            });
        });
    }

    /**
     * 载入一个FGUI 资源包。包的资源从 resources 加载
     * @param pkgUrl 包路径 ui/Common/Common
     * @param uuid 包绑定的界面id
     * @param onComplete 回调
     */
    public async loadFGUIPackage(pkgUrl: string, uuid: string, onComplete?: (error: any, pkg: UIPackage) => void): Promise<void> {
        let pkgName = pkgUrl.split("/")[1];
        let bundle = resources;
        //公共常驻资源引用不需要处理
        if (XResourcesUrl.RES_COMMON_PACKAGEARR.indexOf(pkgName) == -1) {
            let ref = ResMgr.inst._uiPackRefMap[pkgName];
            if (!ref) {
                ResMgr.inst._uiPackRefMap[pkgName] = { fromArr: [uuid], pkgUrl: pkgUrl, reCount: 1 };
            } else {
                ref.reCount++;
                ref.fromArr.push(uuid);
            }
        }
        let promise: Promise<void>;
        if (!this.isFGUIPackageExist(pkgUrl)) {
            promise = new Promise<void>((resolve, reject) => {
                UIPackage.loadPackage(bundle, pkgUrl, (err: any, pkg: UIPackage) => {
                    if (onComplete) onComplete(err, pkg);
                    if (err) {
                        reject(err);
                    } else {
                        XDEBUGLOG.res(`ui资源包 ${bundle.name} ${pkgUrl} 加载完成！`);
                        resolve();
                    }
                });
            });
        }

        if (!promise) {
            if (onComplete) onComplete(undefined, UIPackage.getById(pkgUrl));
        }
        return promise;
    }

    /**
     * 释放 FGUI资源包 引用
     * @param pkgName 资源包名
     * @param uuid 界面uuid
     */
    public unloadFGUIPakcageRef(pkgName: string, uuid: string) {
        let refInfo = this._uiPackRefMap[pkgName];
        if (!refInfo) {
            return;
        }
        let index = refInfo.fromArr.indexOf(uuid);
        if (index !== -1) {
            refInfo.fromArr.splice(index, 1);
            refInfo.reCount--;
        }

        // if(refInfo.reCount <= 0){
        //     refInfo.fromArr.splice(index,1);
        //     UIPackage.removePackage(pkgName);
        //     delete this._uiPackRefMap[pkgName];
        //     XXDEBUGLOG.res(`释放ui资源包：${pkgName}`);
        // }
    }

    /**
     * 释放 FGUI资源包
     * @param pkgName 资源包名
     * @param uuid 界面uuid
     */
    private unloadFGUIPakcage() {
        for (const pkgName in this._uiPackRefMap) {
            let refInfo = this._uiPackRefMap[pkgName];
            if (refInfo.reCount <= 0) {
                UIPackage.removePackage(pkgName);
                delete ResMgr.inst._uiPackRefMap[pkgName];
                XDEBUGLOG.uiRelease(`释放ui资源包：${pkgName}`);
            }
        }
    }

    public dump() {
        XDEBUGLOG.res("ui包计数：", this._uiPackRefMap);
    }

    /**
     * 资源包是否存在
     * @param url 资源包路径: ui/Common/Common
     * @returns boolean
     */
    public isFGUIPackageExist(url: string) {
        return UIPackage.getById(url) != undefined;
    }

    /** 定时释放ui资源 */
    private _intervalGC() {
        this.unloadFGUIPakcage();
    }
}

window['ResMgr'] = ResMgr;
