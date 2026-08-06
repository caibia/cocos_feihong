
/**
*Author  : XW
*Desc    : 多语言文本管理
*/

import { JsonAsset } from "cc";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import ExtendString from "../extend/ExtendString";
import ResMgr from "./ResMgr";

export default class LanguageMgr {

	private static _cacheData: { [id: string]: string } | null = null;

	public static async init(): Promise<void> {
		const owner = "LanguageMgr";
		const asset = await ResMgr.inst.loadRes("config/json/Language", JsonAsset, owner);
		if (!asset) {
			XDEBUGLOG.error("没有语言配置：Language");
			return;
		}
		this._cacheData = asset.json;
		ResMgr.inst.releaseRes("config/json/Language", JsonAsset, owner);
	}

	/**
	 * @param id language_zh.json中的id
	 * @param ...args 配置表中用{0}、{1}、{2}这样的占位符来表示要替换的变量， args[0]对应{0}、args[1]对应{1}
	 * 例子：
	 * Language.get(91, 1000);
	 * */
	public static get(id: number | string, ...args: any[]): string {
		let cfg = this._cacheData;
		if (!cfg) {
			XDEBUGLOG.error("没有语言配置：Language");
			return "";
		}
		let content = cfg[id];
		if (!content) {
			XDEBUGLOG.warn("language 中没有该id", id);
			return "";
		}
		if (args.length > 0) {
			return ExtendString.substitute(content, ...args);
		}
		return content;
	}
}
