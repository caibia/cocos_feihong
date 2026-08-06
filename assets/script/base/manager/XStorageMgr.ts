
/**
*Author  : XW
*Desc    : 
*/

import { sys } from "cc";
import TimerMgr, { ITimer } from "./TimerMgr";
import XDEBUGLOG from "../debug/XDEBUGLOG";

type StorageKey = keyof IStorage.DataMap;

export default class XStorageMgr {
	/**延迟存储计时器 */
	private saveTimer: ITimer;
	/**所有本地存储的数据 */
	private _allStorage: Partial<Record<StorageKey, { type: string, data: unknown }>>;
	/**要存储的key的合集 */
	private _saveKeyMap: Partial<Record<StorageKey, true>>;

	private static _inst: XStorageMgr
	public static get inst(): XStorageMgr {
		if (!this._inst) {
			this._inst = new XStorageMgr();
		}
		return this._inst;
	}

	constructor() {
		this._allStorage = {};
		this._saveKeyMap = {};
	}

	/**
	 * 本地存储数据
	 * @param key key
	 * @param data 数据
	 * @param isNoDelay 是否立即存储
	 */
	public setItem<K extends StorageKey>(key: K, data: IStorage.DataMap[K], isNoDelay?: boolean): void {
		if (typeof data === "number" && Number.isNaN(data)) {
			XDEBUGLOG.warn("本地存储数据为NaN", key);
			return;
		}
		this._allStorage[key] = { type: typeof (data), data: data };
		this._saveKeyMap[key] = true;

		if (isNoDelay) {
			this.flush();
		} else {
			if (!this.saveTimer) {
				this.saveTimer = TimerMgr.inst.setTimeout(this.flush.bind(this), 10 * 1000, this);
			}
		}
	}

	/**删除本地存储 */
	public removeItem<K extends StorageKey>(key: K) {
		delete this._allStorage[key];
		delete this._saveKeyMap[key];
		sys.localStorage.removeItem(key);
	}

	/**清空本地存储 */
	public clearAllItem() {
		sys.localStorage.clear();
	}

	/**刷新到本地存储 */
	public flush() {
		if (this.saveTimer) {
			TimerMgr.inst.removeTimer(this.saveTimer);
			this.saveTimer = undefined;
		}
		for (let key in this._saveKeyMap) {
			const typedKey = key as StorageKey;
			delete this._saveKeyMap[typedKey];
			let value = this._allStorage[typedKey];
			if (!value) continue;
			let data = value.data;
			if (data == undefined) {
				this.removeItem(typedKey);
				continue;
			}
			data = JSON.stringify(value);
			sys.localStorage.setItem(typedKey, data);
		}
	}

	/**
	 * 获取本地存储数据
	 * @param key 
	 * @returns 
	 */
	public getItem<K extends StorageKey>(key: K): IStorage.DataMap[K] | null | undefined {
		let value = this._allStorage[key];
		if (value) return value.data as IStorage.DataMap[K];
		if (key in this._allStorage) {
			return;
		}
		let data = sys.localStorage.getItem(key);
		if (!data) return null;
		try {
			value = JSON.parse(data);
		} catch (error) {
			XDEBUGLOG.warn(`本地存储解析失败: ${key}`);
			return null;
		}
		this._allStorage[key] = value;
		return value.data as IStorage.DataMap[K];
	}

	public clear(): void {

	}
}

window["XStorageMgr"] = XStorageMgr;
