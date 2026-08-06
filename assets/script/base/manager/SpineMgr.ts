/**
*Author  : XW
*Desc    : Spine 资源管理器
*/

import { Texture2D, assetManager, resources, sp } from "cc";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import TimerMgr from "./TimerMgr";

interface ISpineRecord {
	/** 骨骼数据 */
	asset: sp.SkeletonData;
	/** 引用计数 */
	ref: number;
	/** 累计使用次数 */
	useCount: number;
	/** 加载任务 */
	loading: Promise<sp.SkeletonData | null> | null;
	/** 是否仅清理贴图 */
	isOnlyClearTexture: boolean;
}

export class SpineMgr {
	/** spine的引用计数，url例子："spine/login/login" */
	private _refMap: { [url: string]: ISpineRecord };
	private _tmpTexture: Texture2D;

	public constructor() {
		this._refMap = {};
		this._tmpTexture = new Texture2D();
		this._tmpTexture.name = "__tempTexture__";
		TimerMgr.inst.setInterval(this._intervalGC.bind(this), 60 * 1000, this);
	}

	private static _inst: SpineMgr;
	public static get inst(): SpineMgr {
		if (!SpineMgr._inst) {
			SpineMgr._inst = new SpineMgr;
		}
		return SpineMgr._inst;
	}

	/**
	 * 加载spine资源
	 * @param url 例子："spine/login/login"
	 */
	public async loadSpine(url: string): Promise<sp.SkeletonData | null> {
		let refference = this.retainSpine(url);
		let skeletonData: sp.SkeletonData = refference.asset || resources.get(url, sp.SkeletonData);
		if (!skeletonData) {
			XDEBUGLOG.spine("spine未加载，开始异步加载----->", url);
			if (!refference.loading) {
				refference.loading = this.loadSkeletonData(url).then((asset) => {
					refference.loading = null;
					if (asset) {
						refference.asset = asset;
					}
					return asset;
				});
			}
			skeletonData = await refference.loading;
		}
		if (!skeletonData) {
			this.rollbackSpineRef(url, refference);
			XDEBUGLOG.error("spine文件不存在", url);
			return null;
		}
		if (skeletonData["$_isReleaseTexture"]) {
			await this.reloadTexture(skeletonData, url);
		}
		refference.asset = skeletonData;
		return skeletonData;
	}

	/**
	 * retain 一个spine资源的引用计数
	 * @param url 资源路径
	 * @param asset 骨骼数据
	 */
	public retainSpine(url: string, asset?: sp.SkeletonData): ISpineRecord {
		let refference = this._refMap[url];
		if (!refference) {
			this._refMap[url] = { asset: asset, ref: 0, useCount: 0, loading: null, isOnlyClearTexture: false };
			refference = this._refMap[url];
		}
		refference.ref += 1;
		refference.useCount += 1;
		return refference;
	}

	/**
	 * spine的引用计数减一
	 * @param url 资源路径
	 * @param isOnlyClearTexture 是否仅清理贴图
	 */
	public releaseSpine(url: string, isOnlyClearTexture?: boolean): void {
		let refference = this._refMap[url];
		if (!refference) return;
		refference.ref = Math.max(0, refference.ref - 1);
		refference.isOnlyClearTexture = isOnlyClearTexture === true;
	}

	/** 定时释放spine资源 */
	private _intervalGC(): void {
		for (const url in this._refMap) {
			let refference = this._refMap[url];
			if (refference.ref > 0 || refference.loading) continue;
			let skeletonData: sp.SkeletonData = refference.asset;
			if (!skeletonData) {
				delete this._refMap[url];
				continue;
			}
			if (skeletonData["$_isReleaseTexture"]) continue;
			this.unloadTexture(skeletonData);
			if (!refference.isOnlyClearTexture) {
				assetManager.releaseAsset(refference.asset);
				XDEBUGLOG.spineRelease("释放spine数据+贴图数据", url);
			}
			delete this._refMap[url];
		}
	}

	/**
	 * 释放spine的贴图
	 * @param skeletonData Spine 的骨骼数据
	 */
	public unloadTexture(skeletonData: sp.SkeletonData): void {
		if (skeletonData["$_isReleaseTexture"]) return;
		if (skeletonData["$_isReloading"]) return;
		let texture: Texture2D;
		let assetInfo: { uuid: string, path: string };
		let uuid: string;
		skeletonData["$_isReleaseTexture"] = true;
		skeletonData["$_reloadTextures"] = [];
		for (let i = 0; i < skeletonData.textures.length; i++) {
			texture = skeletonData.textures[i];
			uuid = texture.uuid;
			assetInfo = <any>resources.getAssetInfo(uuid);
			if (!assetInfo) {
				skeletonData["$_isReleaseTexture"] = false;
				break;
			}
			skeletonData["$_reloadTextures"].push(assetInfo.path);
		}
		if (!skeletonData["$_isReleaseTexture"]) {
			skeletonData["$_reloadTextures"] = undefined;
		}
		if (skeletonData["$_isReleaseTexture"]) {
			for (let i = 0; i < skeletonData.textures.length; i++) {
				let texture: Texture2D = skeletonData.textures[i];
				XDEBUGLOG.spineRelease("释放spine贴图", texture.name);
				assetManager.releaseAsset(texture);
				skeletonData.textures[i] = this._tmpTexture;
			}
		}
	}

	/**
	 * 重新加载spine的贴图
	 * @param skeletonData Spine 的骨骼数据
	 * @param url texture 的路径
	 */
	public async reloadTexture(skeletonData: sp.SkeletonData, url: string): Promise<void> {
		if (!skeletonData["$_isReleaseTexture"]) return;
		XDEBUGLOG.spine("spine reload texture", url);
		skeletonData["$_isReloading"] = true;
		let reloadTextures: string[] = skeletonData["$_reloadTextures"];
		for (let i = 0; i < reloadTextures.length; i++) {
			const path = reloadTextures[i];
			const ccTexture2D = await this.loadTexture(path);
			if (!ccTexture2D) continue;
			ccTexture2D.name = "reloadTexture";
			skeletonData.textures[i] = ccTexture2D;
		}
		skeletonData["$_isReleaseTexture"] = undefined;
		skeletonData["$_reloadTextures"] = undefined;
		skeletonData["$_isReloading"] = undefined;
	}

	/**
	 * 加载骨骼数据
	 * @param url 资源路径
	 */
	private async loadSkeletonData(url: string): Promise<sp.SkeletonData | null> {
		return await new Promise<sp.SkeletonData | null>((resolve) => {
			resources.load(url, sp.SkeletonData, (err: Error, asset: sp.SkeletonData) => {
				if (err || !asset) {
					resolve(null);
					return;
				}
				resolve(asset);
			});
		});
	}

	/**
	 * 加载贴图
	 * @param path 贴图路径
	 */
	private async loadTexture(path: string): Promise<Texture2D | null> {
		return await new Promise<Texture2D | null>((resolve) => {
			resources.load(path, Texture2D, (err: Error, asset: Texture2D) => {
				if (err || !asset) {
					resolve(null);
					return;
				}
				resolve(asset);
			});
		});
	}

	/**
	 * 回滚spine引用
	 * @param url 资源路径
	 * @param refference 资源记录
	 */
	private rollbackSpineRef(url: string, refference: ISpineRecord): void {
		refference.ref = Math.max(0, refference.ref - 1);
		if (refference.ref <= 0 && !refference.asset && !refference.loading) {
			delete this._refMap[url];
		}
	}
}

window["SpineMgr"] = SpineMgr;
