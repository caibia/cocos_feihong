/**
*Author  : XW
*Desc    : DragonBones 资源管理器
*/

import { Texture2D, assetManager, dragonBones, resources } from "cc";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import TimerMgr from "./TimerMgr";

type DragonBonesLoadResult = {
	/** 骨骼数据 */
	ske: dragonBones.DragonBonesAsset;
	/** 贴图数据 */
	tex: dragonBones.DragonBonesAtlasAsset;
};

interface IDragonBonesRecord {
	/** 骨骼数据 */
	asset: dragonBones.DragonBonesAsset;
	/** 贴图数据 */
	atlasAsset: dragonBones.DragonBonesAtlasAsset;
	/** 引用计数 */
	ref: number;
	/** 累计使用次数 */
	useCount: number;
	/** 加载任务 */
	loading: Promise<DragonBonesLoadResult | null> | null;
	/** 是否仅清理贴图 */
	isOnlyClearTexture: boolean;
}

export class DragonBonesMgr {
	/** dragonBones 的引用计数，url例子："dragonBones/login/login" */
	private _refMap: { [url: string]: IDragonBonesRecord };
	private _tmpTexture: Texture2D;

	public constructor() {
		this._refMap = {};
		this._tmpTexture = new Texture2D();
		this._tmpTexture.name = "__tempTexture__";
		TimerMgr.inst.setInterval(this._intervalGC.bind(this), 10 * 1000, this);
	}

	private static _inst: DragonBonesMgr;
	public static get inst(): DragonBonesMgr {
		if (!DragonBonesMgr._inst) {
			DragonBonesMgr._inst = new DragonBonesMgr;
		}
		return DragonBonesMgr._inst;
	}

	/**
	 * 加载dragonBones资源
	 * @param url 例子："dragonBones/ui/mainCity/XZC_cjtx"
	 */
	public async loadDragonBones(url: string): Promise<DragonBonesLoadResult | null> {
		let refference = this.retainDragonBones(url);
		let skeletonData: dragonBones.DragonBonesAsset = refference.asset || resources.get(url + "_ske", dragonBones.DragonBonesAsset);
		let skeletonAtlasData: dragonBones.DragonBonesAtlasAsset = refference.atlasAsset || resources.get(url + "_tex", dragonBones.DragonBonesAtlasAsset);
		if (!skeletonData || !skeletonAtlasData) {
			XDEBUGLOG.spine("dragonBones未加载，开始异步加载----->", url);
			if (!refference.loading) {
				refference.loading = this.loadDragonBonesAssets(url).then((assets) => {
					refference.loading = null;
					if (assets) {
						refference.asset = assets.ske;
						refference.atlasAsset = assets.tex;
					}
					return assets;
				});
			}
			const assets = await refference.loading;
			skeletonData = assets?.ske;
			skeletonAtlasData = assets?.tex;
		}

		if (!skeletonData || !skeletonAtlasData) {
			this.rollbackDragonBonesRef(url, refference);
			XDEBUGLOG.error("dragonBones 文件不存在", url);
			return null;
		}
		if (skeletonAtlasData["$_isReleaseTexture"]) {
			await this.reloadTexture(skeletonAtlasData, url);
		}
		refference.asset = skeletonData;
		refference.atlasAsset = skeletonAtlasData;
		return { ske: skeletonData, tex: skeletonAtlasData };
	}

	/**
	 * retain 一个 draonBones 资源的引用计数
	 * @param url 资源地址
	 * @param asset 骨骼数据
	 * @param atlasAsset 贴图数据
	 */
	public retainDragonBones(url: string, asset?: dragonBones.DragonBonesAsset, atlasAsset?: dragonBones.DragonBonesAtlasAsset): IDragonBonesRecord {
		let refference = this._refMap[url];
		if (!refference) {
			this._refMap[url] = { asset: asset, atlasAsset: atlasAsset, ref: 0, useCount: 0, loading: null, isOnlyClearTexture: false };
			refference = this._refMap[url];
		}
		refference.ref += 1;
		refference.useCount += 1;
		return refference;
	}

	/**
	 * dragonBones 的引用计数减一
	 * @param url 资源地址
	 * @param isOnlyClearTexture 是否仅清理贴图
	 */
	public releaseDragonBones(url: string, isOnlyClearTexture?: boolean): void {
		let refference = this._refMap[url];
		if (!refference) return;
		refference.ref = Math.max(0, refference.ref - 1);
		refference.isOnlyClearTexture = isOnlyClearTexture === true;
	}

	/** 定时释放dragonBones资源 */
	private _intervalGC(): void {
		for (const url in this._refMap) {
			let refference = this._refMap[url];
			if (refference.ref > 0 || refference.loading) continue;
			let skeletonData: dragonBones.DragonBonesAsset = refference.asset;
			let atlasAsset: dragonBones.DragonBonesAtlasAsset = refference.atlasAsset;
			if (!skeletonData || !atlasAsset) {
				delete this._refMap[url];
				continue;
			}
			if (atlasAsset["$_isReleaseTexture"]) continue;
			this.unloadTexture(atlasAsset);
			if (!refference.isOnlyClearTexture) {
				assetManager.releaseAsset(refference.atlasAsset);
				XDEBUGLOG.spineRelease("释放 dragonBones 贴图数据", refference.atlasAsset.name);
				assetManager.releaseAsset(refference.asset);
				XDEBUGLOG.spineRelease("释放 dragonBones 骨骼数据", refference.asset.name);
			}
			delete this._refMap[url];
		}
	}

	/**
	 * 释放dragonBones的贴图
	 * @param atlasAsset dragonBones 的贴图数据
	 */
	public unloadTexture(atlasAsset: dragonBones.DragonBonesAtlasAsset): void {
		if (atlasAsset["$_isReleaseTexture"]) return;
		if (atlasAsset["$_isReloading"]) return;
		atlasAsset["$_isReleaseTexture"] = true;
		atlasAsset["$_reloadTexture"] = undefined;
		let uuid: string = atlasAsset.texture.uuid;
		let assetInfo: { uuid: string, path: string } = <any>resources.getAssetInfo(uuid);
		if (!assetInfo) {
			atlasAsset["$_isReleaseTexture"] = false;
			return;
		}
		atlasAsset["$_reloadTexture"] = assetInfo.path;
		let texture: Texture2D = atlasAsset.texture;
		assetManager.releaseAsset(texture);
		XDEBUGLOG.spineRelease("释放 dragonBones 贴图", texture.nativeUrl);
		atlasAsset.texture = this._tmpTexture;
	}

	/**
	 * 重新加载dragonBones的贴图
	 * @param atlasAsset dragonBones 的贴图数据
	 * @param url texture 的路径
	 */
	public async reloadTexture(atlasAsset: dragonBones.DragonBonesAtlasAsset, url: string): Promise<void> {
		if (!atlasAsset["$_isReleaseTexture"]) return;
		XDEBUGLOG.spine("dragonBones reload texture", url);
		atlasAsset["$_isReloading"] = true;
		let path: string = atlasAsset["$_reloadTexture"];
		let ccTexture2D = await this.loadTexture(path);
		if (ccTexture2D) {
			ccTexture2D.name = "reloadTexture";
			atlasAsset.texture = ccTexture2D;
		}
		atlasAsset["$_isReleaseTexture"] = undefined;
		atlasAsset["$_reloadTexture"] = undefined;
		atlasAsset["$_isReloading"] = undefined;
	}

	/**
	 * 加载 DragonBones 资源
	 * @param url 资源路径
	 */
	private async loadDragonBonesAssets(url: string): Promise<DragonBonesLoadResult | null> {
		const ske = await this.loadDragonBonesAsset(url + "_ske");
		const tex = await this.loadDragonBonesAtlasAsset(url + "_tex");
		if (!ske || !tex) {
			return null;
		}
		return { ske, tex };
	}

	/**
	 * 加载骨骼数据
	 * @param path 资源路径
	 */
	private async loadDragonBonesAsset(path: string): Promise<dragonBones.DragonBonesAsset | null> {
		return await new Promise<dragonBones.DragonBonesAsset | null>((resolve) => {
			resources.load(path, dragonBones.DragonBonesAsset, (err: Error, asset: dragonBones.DragonBonesAsset) => {
				if (err || !asset) {
					resolve(null);
					return;
				}
				resolve(asset);
			});
		});
	}

	/**
	 * 加载贴图数据
	 * @param path 资源路径
	 */
	private async loadDragonBonesAtlasAsset(path: string): Promise<dragonBones.DragonBonesAtlasAsset | null> {
		return await new Promise<dragonBones.DragonBonesAtlasAsset | null>((resolve) => {
			resources.load(path, dragonBones.DragonBonesAtlasAsset, (err: Error, asset: dragonBones.DragonBonesAtlasAsset) => {
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
	 * 回滚dragonBones引用
	 * @param url 资源路径
	 * @param refference 资源记录
	 */
	private rollbackDragonBonesRef(url: string, refference: IDragonBonesRecord): void {
		refference.ref = Math.max(0, refference.ref - 1);
		if (refference.ref <= 0 && !refference.asset && !refference.atlasAsset && !refference.loading) {
			delete this._refMap[url];
		}
	}
}

window["DragonBonesMgr"] = DragonBonesMgr;
