
/**
*Author  : XW
*Desc    : 
*/

import { Texture2D, assetManager, resources, sp } from "cc";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import ResMgr from "./ResMgr";
import TimerMgr from "./TimerMgr";

export class SpineMgr {
	/** spine的引用计数，url例子："spine/login/login" */
	private _refMap: {
		//ref是引用计数， useCount是累计使用次数
		[url: string]: { asset: sp.SkeletonData, ref: number, useCount: number }
	};
	private _tmpTexture: Texture2D;
	/** 是否仅清理贴图 */
	private _isOnlyClearTexture: boolean;

	public constructor() {
		this._refMap = {};
		this._tmpTexture = new Texture2D();
		this._tmpTexture.name = "__tempTexture__";
		TimerMgr.inst.setInterval(this._intervalGC.bind(this), 10 * 1000, this);
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
	public async loadSpine(url: string) {
		let refference = this.retainSpine(url);
		let skeletonData: sp.SkeletonData;
		skeletonData = ResMgr.inst.getRes(url, sp.SkeletonData);
		if (!skeletonData) {
			//如果还没加载，则加载skeletonData
			XDEBUGLOG.spine("spine未加载，开始异步加载----->", url);
			skeletonData = await ResMgr.inst.loadRes(url, sp.SkeletonData);
		}
		if (!skeletonData) {
			XDEBUGLOG.error("spine文件不存在", url);
			return;
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
	public retainSpine(url: string, asset?: sp.SkeletonData) {
		let refference = this._refMap[url];
		if (!refference) {
			this._refMap[url] = { asset: asset, ref: 0, useCount: 1 };
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
	public releaseSpine(url: string, isOnlyClearTexture?: boolean) {
		if (!this._refMap[url]) return;
		this._refMap[url].ref -= 1;
		this._isOnlyClearTexture = isOnlyClearTexture;
	}

	/** 定时释放spine资源 */
	private _intervalGC() {
		for (const url in this._refMap) {
			let refference = this._refMap[url];
			if (refference.ref > 0) continue;
			let skeletonData: sp.SkeletonData = refference.asset;
			if (!skeletonData) continue;
			if (skeletonData["$_isReleaseTexture"]) continue;
			this.unloadTexture(skeletonData);
			if (!this._isOnlyClearTexture) {
				this.unloadTexture(skeletonData);
				assetManager.releaseAsset(refference.asset);
				XDEBUGLOG.spineRelease("释放spine数据+贴图数据", url);
			}
		}
	}

	/**
	 * 释放spine的贴图
	 * @param skeletonData Spine 的骨骼数据
	 */
	public unloadTexture(skeletonData: sp.SkeletonData) {
		//已经释放过贴图的，禁止再次释放
		if (skeletonData["$_isReleaseTexture"]) return;
		//正在reloading贴图过程中的，禁止释放贴图
		if (skeletonData["$_isReloading"]) return;
		let texture: Texture2D;
		let assetInfo: { uuid: string, path: string };
		let uuid: string;
		//释放贴图的标记
		skeletonData["$_isReleaseTexture"] = true;
		//spine的贴图路径合集
		skeletonData["$_reloadTextures"] = [];
		for (let i = 0; i < skeletonData.textures.length; i++) {
			texture = skeletonData.textures[i];
			uuid = texture.uuid;
			let bundle = resources;
			assetInfo = <any>bundle.getAssetInfo(uuid);
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
				//释放资源以及其依赖资源
				assetManager.releaseAsset(texture);
				XDEBUGLOG.spineRelease("释放spine贴图", texture.name);
				//先替换为临时贴图，避免报错
				skeletonData.textures[i] = this._tmpTexture;
			}
		}
	}
	/**
	 * 重新加载spine的贴图
	 * @param skeletonData Spine 的骨骼数据
	 * @param url texture 的路径
	 */
	public async reloadTexture(skeletonData: sp.SkeletonData, url: string) {
		if (!skeletonData["$_isReleaseTexture"]) return;
		XDEBUGLOG.spine("spine reload texture", url);
		//加载中的标记
		skeletonData["$_isReloading"] = true;
		//spine的贴图路径合集
		let reloadTextures: string[] = skeletonData["$_reloadTextures"];
		let promiseArr = [];
		let path: string;
		//加载图集
		for (let i = 0; i < reloadTextures.length; i++) {
			path = reloadTextures[i];
			promiseArr.push(await ResMgr.inst.loadRes(path, Texture2D));
		}
		await Promise.all(promiseArr);
		let ccTexture2D: Texture2D;
		for (let i = 0; i < reloadTextures.length; i++) {
			path = reloadTextures[i];
			ccTexture2D = ResMgr.inst.getRes(path, Texture2D);
			ccTexture2D.name = "reloadTexture";
			skeletonData.textures[i] = ccTexture2D;
		}
		skeletonData["$_isReleaseTexture"] = undefined;
		skeletonData["$_reloadTextures"] = undefined;
		skeletonData["$_isReloading"] = undefined;
	}
}

window["SpineMgr"] = SpineMgr;