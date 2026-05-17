
/**
*Author  : XW
*Desc    : 
*/

import { Texture2D, assetManager, dragonBones, resources, sp } from "cc";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import ResMgr from "./ResMgr";
import TimerMgr from "./TimerMgr";

export class DragonBonesMgr {
	/** 仅清理贴图 */
	private _isOnlyClearTexture: boolean;
	/** dragonBones 的引用计数，url例子："dragonBones/login/login" */
	private _refMap: {
		//ref是引用计数， useCount是累计使用次数
		[url: string]: { asset: dragonBones.DragonBonesAsset, atlasAsset: dragonBones.DragonBonesAtlasAsset, ref: number, useCount: number }
	};
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
	 * @returns 
	 */
	public async loadDragonBones(url: string) {
		let refference = this.retainDragonBones(url);
		let skeletonData: dragonBones.DragonBonesAsset = ResMgr.inst.getRes(url + "_ske", dragonBones.DragonBonesAsset);
		let skeletonAtlasData: dragonBones.DragonBonesAtlasAsset = ResMgr.inst.getRes(url + "_tex", dragonBones.DragonBonesAtlasAsset);
		if (!skeletonData) {
			//如果还没加载，则加载skeletonData
			XDEBUGLOG.spine("dragonBones未加载，开始异步加载----->", url);
			skeletonData = await ResMgr.inst.loadRes(url + "_ske", dragonBones.DragonBonesAsset);
			skeletonAtlasData = await ResMgr.inst.loadRes(url + "_tex", dragonBones.DragonBonesAtlasAsset);
		}

		if (!skeletonData) {
			XDEBUGLOG.error("dragonBones 文件不存在", url);
			return;
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
	 * @returns 
	 */
	public retainDragonBones(url: string, asset?: dragonBones.DragonBonesAsset, atlasAsset?: dragonBones.DragonBonesAtlasAsset) {
		let refference = this._refMap[url];
		if (!refference) {
			this._refMap[url] = { asset: asset, atlasAsset: atlasAsset, ref: 0, useCount: 1 };
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
	 * @returns 
	 */
	public releaseDragonBones(url: string, isOnlyClearTexture?: boolean) {
		if (!this._refMap[url]) return;
		this._refMap[url].ref -= 1;
		this._isOnlyClearTexture = isOnlyClearTexture;
	}

	/** 定时释放dragonBones资源 */
	private _intervalGC() {
		for (const url in this._refMap) {
			let refference = this._refMap[url];
			if (refference.ref > 0) continue;
			let skeletonData: dragonBones.DragonBonesAsset = refference.asset;
			let atlasAsset: dragonBones.DragonBonesAtlasAsset = refference.atlasAsset;
			if (!skeletonData) continue;
			if (!atlasAsset) continue;
			if (atlasAsset["$_isReleaseTexture"]) continue;
			this.unloadTexture(atlasAsset);
			if (!this._isOnlyClearTexture) {
				assetManager.releaseAsset(refference.atlasAsset);
				XDEBUGLOG.spineRelease("释放 dragonBones 贴图数据", refference.atlasAsset.name);
				assetManager.releaseAsset(refference.asset);
				XDEBUGLOG.spineRelease("释放 dragonBones 骨骼数据", refference.asset.name);
			}
		}
	}

	/**
	 * 释放dragonBones的贴图
	 * @param atlasAsset dragonBones 的贴图数据
	 * @returns 
	 */
	public unloadTexture(atlasAsset: dragonBones.DragonBonesAtlasAsset) {
		//已经释放过贴图的，禁止再次释放
		if (atlasAsset["$_isReleaseTexture"]) return;
		//正在reloading贴图过程中的，禁止释放贴图
		if (atlasAsset["$_isReloading"]) return;
		let assetInfo: { uuid: string, path: string };
		//释放贴图的标记
		atlasAsset["$_isReleaseTexture"] = true;
		//dragonBones 的贴图路径
		atlasAsset["$_reloadTexture"] = undefined;
		let bundle = resources;
		let uuid: string = atlasAsset.texture.uuid;
		assetInfo = <any>bundle.getAssetInfo(uuid);
		if (!assetInfo) {
			atlasAsset["$_isReleaseTexture"] = false;
		}
		atlasAsset["$_reloadTexture"] = assetInfo.path;

		if (!atlasAsset["$_isReleaseTexture"]) {
			atlasAsset["$_reloadTexture"] = undefined;
		}
		if (atlasAsset["$_isReleaseTexture"]) {
			let texture: Texture2D = atlasAsset.texture;
			//释放资源以及其依赖资源
			assetManager.releaseAsset(texture);
			XDEBUGLOG.spineRelease("释放 dragonBones 贴图", texture.nativeUrl);
			//先替换为临时贴图，避免报错
			atlasAsset.texture = this._tmpTexture;
		}
	}
	/**
	 * 重新加载dragonBones的贴图
	 * @param atlasAsset dragonBones 的贴图数据
	 * @param url texture 的路径
	 */
	public async reloadTexture(atlasAsset: dragonBones.DragonBonesAtlasAsset, url: string) {
		if (!atlasAsset["$_isReleaseTexture"]) return;
		XDEBUGLOG.spine("dragonBones reload texture", url);
		//加载中的标记
		atlasAsset["$_isReloading"] = true;
		//dragonBones的贴图路径
		let reloadTexture: string = atlasAsset["$_reloadTexture"];
		let promiseArr = [];
		//加载图集
		let path: string = reloadTexture;
		promiseArr.push(await ResMgr.inst.loadRes(path, Texture2D));
		await Promise.all(promiseArr);
		let ccTexture2D: Texture2D;
		path = reloadTexture;
		ccTexture2D = ResMgr.inst.getRes(path, Texture2D);
		ccTexture2D.name = "reloadTexture";
		atlasAsset.texture = ccTexture2D;

		atlasAsset["$_isReleaseTexture"] = undefined;
		atlasAsset["$_reloadTexture"] = undefined;
		atlasAsset["$_isReloading"] = undefined;
	}
}

window["DragonBonesMgr"] = DragonBonesMgr;