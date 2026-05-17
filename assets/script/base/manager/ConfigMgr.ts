
/**
*Author  : XW
*Desc    : 
*/

import { Asset, JsonAsset, assetManager } from "cc";
import ResMgr from "./ResMgr";
import XDEBUGLOG from "../debug/XDEBUGLOG";

export default class ConfigMgr {

	private isBinary = false;
	private fileName = "json";
	private cacheData: Map<string, any> = new Map<string, any>();
	private static _inst: ConfigMgr;

	public static get inst(): ConfigMgr {
		if (!this._inst) {
			this._inst = new ConfigMgr();
		}
		return this._inst;
	}

	public async init() {
		let allCfg: Asset[];
		if (this.isBinary) {
			this.fileName = "gz";
			allCfg = await ResMgr.inst.loadPackage("config/" + this.fileName, Asset);
			for (let i = 0; i < allCfg.length; i++) {
				let asset: Asset = allCfg[i];
				let binary: Uint8Array = await ResMgr.inst.parseAssetToBinary(asset);
				assetManager.releaseAsset(asset);
				let jsonData = ResMgr.inst.parseGzToJson(binary);
				if (jsonData) {
					XDEBUGLOG.debug('解析成功：', asset.name, jsonData);
					this.cacheData.set(asset.name, jsonData);
				}
			}
		} else {
			this.fileName = "json";
			allCfg = await ResMgr.inst.loadPackage("config/" + this.fileName, JsonAsset);
			for (let i = 0; i < allCfg.length; i++) {
				let jsonAsset: JsonAsset = allCfg[i] as JsonAsset;
				this.cacheData.set(jsonAsset.name, jsonAsset.json);
				assetManager.releaseAsset(jsonAsset);
			}
		}
	}

	public getConfig(name: string) {
		if (!this.cacheData.has(name)) {
			XDEBUGLOG.warn("缺少配置表：", name);
			return null;
		}
		return this.cacheData.get(name);
	}

}


window["ConfigMgr"] = ConfigMgr;
