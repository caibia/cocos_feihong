import { Asset, AssetManager, assetManager, resources } from "cc";
import Extend from "../extend/Extend";
import { UIPackage } from "../../fairyGUI/UIPackage";

type TMemoryMap = Record<string, number>;
type TTextureMemResult = [TMemoryMap, TMemoryMap];
type TTextureAsset = Asset & {
    _native?: string;
    width?: number;
    height?: number;
};

export default class DebugMemory {
    /**
     * 统计当前已加载纹理资源的估算内存。
     * @param totalBl 是否只返回总内存字符串。
     * @param refBl 预留兼容参数，当前版本未使用。
     * @returns 当 `totalBl` 为 `true` 时返回总内存字符串，否则返回一级目录和二级目录统计结果。
     */
    public static getTextureMem(totalBl = false, refBl = false): string | TTextureMemResult {
        void refBl;

        let total = 0;
        let pngTotal = 0;
        let jpgTotal = 0;
        let pkmTotal = 0;
        const urlDic: TMemoryMap = {};
        const urlSec: TMemoryMap = {};
        const failFiles: string[] = [];

        assetManager.assets.forEach((asset: Asset, uuid: string): void => {
            const textureAsset = asset as TTextureAsset;
            const nativeExt = textureAsset._native || "";
            const mem = this.getTextureSize(textureAsset);
            if (mem <= 0) {
                return;
            }

            total += mem;
            if (nativeExt === ".jpg") {
                jpgTotal += mem;
            } else if (nativeExt === ".png") {
                pngTotal += mem;
            } else if (nativeExt === ".pkm" || nativeExt === ".astc") {
                pkmTotal += mem;
            }

            const assetPath = this.getAssetPath(uuid);
            if (!assetPath) {
                failFiles.push(uuid);
                return;
            }

            const { firstDir, secondDir } = this.getPathDirs(assetPath);
            this.addMemory(urlDic, firstDir, mem);
            this.addMemory(urlSec, secondDir, mem);
        });

        const totalStr = this.ChangeUint(total);
        const pngTotalStr = this.ChangeUint(pngTotal);
        const jpgTotalStr = this.ChangeUint(jpgTotal);
        const pkmTotalStr = this.ChangeUint(pkmTotal);
        if (totalBl) {
            return totalStr;
        }

        console.error("----------MemoryDebug.总信息-----------------");
        console.log(`----------总占用内存：${totalStr}`);
        console.log(`----------png占用内存：${pngTotalStr}`);
        console.log(`----------jpg占用内存：${jpgTotalStr}`);
        console.log(`----------pkm占用内存：${pkmTotalStr}`);
        if (failFiles.length > 0) {
            console.warn(`----------有 ${failFiles.length} 个资源未找到路径信息，未参与目录归类`);
        }

        for (const dic of [urlDic, urlSec]) {
            const arr1: Array<{ url: string; mem: number }> = [];
            for (const url in dic) {
                arr1.push({ url, mem: dic[url] });
            }

            arr1.sort((a, b) => b.mem - a.mem);
            if (dic === urlSec) {
                console.error("----------二级目录内存占用：");
                console.warn("-------------fugi包");
            }

            const notPkgArr: Array<[string, number]> = [];
            for (const item of arr1) {
                const url = item.url;
                let pkgName = url.replace("ui1/", "");
                pkgName = Extend.trim(pkgName);
                if (UIPackage.getByName(pkgName)) {
                    console.warn(`----------${url}包占内存：${this.ChangeUint(item.mem)}`);
                } else if (dic === urlSec) {
                    notPkgArr.push([url, item.mem]);
                } else {
                    console.log(`----------${url}文件夹占用内存：${this.ChangeUint(item.mem)}`);
                }
            }

            if (dic === urlSec) {
                console.warn("-------------非fgui");
            }
            for (let i = 0; i < notPkgArr.length; i++) {
                const item = notPkgArr[i];
                console.log(`----------${item[0]}文件夹占用内存：${this.ChangeUint(item[1])}`);
            }
        }

        return [urlDic, urlSec];
    }

    /**
     * 将字节数转换为便于阅读的单位字符串。
     * @param byte 待转换的字节数。
     * @returns 转换后的字符串结果。
     */
    public static ChangeUint(byte: number): string {
        const k = 1024;
        const m = 1024 * k;
        const g = 1024 * m;
        let retStr = "";
        const value = byte;
        if (value > g) {
            retStr = (value / g).toFixed(3) + "G";
        } else if (value > m) {
            retStr = (value / m).toFixed(3) + "M";
        } else if (value > k) {
            retStr = (value / k).toFixed(3) + "K";
        } else {
            retStr = value + "B";
        }
        return retStr;
    }

    /**
     * 估算单个纹理资源的显存占用。
     * @param asset 当前要统计的资源对象。
     * @returns 估算后的字节数，无法识别时返回 `0`。
     */
    private static getTextureSize(asset: TTextureAsset): number {
        const nativeExt = asset._native || "";
        const width = asset.width || 0;
        const height = asset.height || 0;
        if (!nativeExt || width <= 0 || height <= 0) {
            return 0;
        }

        if (nativeExt === ".png" || nativeExt === ".jpg") {
            return width * height * 4;
        }
        if (nativeExt === ".pkm" || nativeExt === ".astc") {
            return width * height * 0.5;
        }
        return 0;
    }

    /**
     * 根据资源 UUID 查找资源路径。
     * @param uuid 资源 UUID。
     * @returns 资源在 bundle 内的相对路径，找不到时返回空字符串。
     */
    private static getAssetPath(uuid: string): string {
        let assetPath = "";
        assetManager.bundles.forEach((bundle: AssetManager.Bundle): void => {
            if (assetPath) {
                return;
            }
            assetPath = this.getAssetPathInBundle(bundle, uuid);
        });

        if (assetPath) {
            return assetPath;
        }

        return this.getAssetPathInBundle(resources, uuid);
    }

    /**
     * 在指定 bundle 中查找资源路径。
     * @param bundle 要查询的资源包。
     * @param uuid 资源 UUID。
     * @returns 资源路径，找不到时返回空字符串。
     */
    private static getAssetPathInBundle(bundle: AssetManager.Bundle, uuid: string): string {
        const info = bundle.getAssetInfo(uuid) as { path?: string; redirect?: string } | null;
        if (!info) {
            return "";
        }
        if (info.path) {
            return info.path;
        }
        if (!info.redirect) {
            return "";
        }

        const redirectBundle = assetManager.bundles.get(info.redirect);
        if (!redirectBundle) {
            return "";
        }

        const redirectInfo = redirectBundle.getAssetInfo(uuid) as { path?: string } | null;
        return redirectInfo?.path || "";
    }

    /**
     * 将资源路径拆分为一级目录和二级目录。
     * @param assetPath bundle 内的相对路径。
     * @returns 目录拆分结果。
     */
    private static getPathDirs(assetPath: string): { firstDir: string; secondDir: string } {
        const segments = assetPath.split("/").filter(Boolean);
        const firstDir = segments[0] || "";
        const secondDir = segments.length > 1 ? `${segments[0]}/${segments[1]}` : "";
        return { firstDir, secondDir };
    }

    /**
     * 给目录统计表累加内存值。
     * @param dic 目标统计表。
     * @param key 目录键名。
     * @param memory 要累加的内存值。
     */
    private static addMemory(dic: TMemoryMap, key: string, memory: number): void {
        if (!key) {
            return;
        }
        if (!dic[key]) {
            dic[key] = 0;
        }
        dic[key] += memory;
    }
}

(globalThis as typeof globalThis & { DebugMemory?: typeof DebugMemory }).DebugMemory = DebugMemory;
