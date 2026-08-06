
/**
*Author  : XW
*Desc    : 配置表管理器
*/

import { Asset, JsonAsset } from "cc";
import ResMgr from "./ResMgr";
import XDEBUGLOG from "../debug/XDEBUGLOG";

export default class ConfigMgr {

	private isBinary = false;
	private fileName = "json";
	private cacheData: Map<string, unknown> = new Map<string, unknown>();
	private static _inst: ConfigMgr;

	public static get inst(): ConfigMgr {
		if (!this._inst) {
			this._inst = new ConfigMgr();
		}
		return this._inst;
	}

	public async init(): Promise<void> {
		const owner = "ConfigMgr";
		let allCfg: Asset[];
		if (this.isBinary) {
			this.fileName = "gz";
			allCfg = await ResMgr.inst.loadPackage("config/" + this.fileName, Asset, owner);
			if (!allCfg) {
				XDEBUGLOG.error("配置目录加载失败：", this.fileName);
				return;
			}
			for (let i = 0; i < allCfg.length; i++) {
				let asset: Asset = allCfg[i];
				let binary: Uint8Array = await ResMgr.inst.parseAssetToBinary(asset);
					let jsonData = ResMgr.inst.parseGzToJson(binary);
					if (jsonData) {
						XDEBUGLOG.debug('解析成功：', asset.name, jsonData);
						this.cacheData.set(asset.name, jsonData);
				}
			}
			ResMgr.inst.releasePackage("config/" + this.fileName, Asset, owner);
		} else {
			this.fileName = "json";
			allCfg = await ResMgr.inst.loadPackage("config/" + this.fileName, JsonAsset, owner);
			if (!allCfg) {
				XDEBUGLOG.error("配置目录加载失败：", this.fileName);
				return;
			}
			for (let i = 0; i < allCfg.length; i++) {
				let jsonAsset: JsonAsset = allCfg[i] as JsonAsset;
				this.cacheData.set(jsonAsset.name, jsonAsset.json);
			}
			ResMgr.inst.releasePackage("config/" + this.fileName, JsonAsset, owner);
		}
	}

	/**
	 * 获取配置表。
	 * @param name 配置表名
	 */
	public getConfig<K extends IConfig.ConfigName>(name: K): IConfig.ConfigMap[K] | null;
	public getConfig(name: string): unknown | null;
	public getConfig(name: string): unknown | null {
		if (!this.cacheData.has(name)) {
			XDEBUGLOG.warn("缺少配置表：", name);
			return null;
		}
		return this.cacheData.get(name);
	}

}


window["ConfigMgr"] = ConfigMgr;
