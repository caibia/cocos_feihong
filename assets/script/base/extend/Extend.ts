/**
*Author  : XW
*Desc    : 通用扩展工具集合，提供断言、拷贝、格式化、字符串与分帧执行等辅助能力
*/

import { Director, director, screen, view } from "cc";
import LanguageMgr from "../manager/LanguageMgr";
import { DEBUG } from "cc/env";

export default class Extend {

	/**
	 * 断言对象有效；断言失败时抛出异常。
	 * @param obj 要检查的对象。
	 * @param errmsg 断言失败时的附加错误信息。
	 */
	public static assert(obj: any, errmsg?: string) {
		if (obj === undefined || obj === null || obj === false) {
			let msg = "assertion fail";
			if (errmsg) {
				msg = msg + " : " + errmsg;
			}
			throw new Error(msg);
		}
	}

	/**
	 * 判断键值对（或数组）是否为空的（没有元素）
	 */
	/**
	 * 判断对象、数组或键值结构是否为空。
	 * @param obj 目标对象。
	 * @returns 是否为空。
	 */
	public static isEmpty(obj: any) {
		if (!obj) return true;
		for (let k in obj) {
			let v = obj[k];
			if (v || v === 0 || v === "") {
				return false;
			}
		}
		return true;
	}

	/**
	 * 判断对象是否为空值、`NaN` 或无穷值。
	 * @param obj 目标对象。
	 * @returns 是否为空值。
	 */
	public static isNull(obj: any) {
		if (obj === undefined || obj === null) {
			return true;
		}
		if (typeof obj == "number" && isNaN(obj)) return true;
		if (typeof obj == "number" && !isFinite(obj)) return true;
		return false;
	}

	/**
	 * 深拷贝对象或数组。
	 * @param obj 源对象。
	 * @returns 深拷贝后的新对象。
	 */
	public static deepClone(obj): any {
		let newObj = Array.isArray(obj) ? [] : {}

		if (obj && typeof obj === "object") {
			for (let key in obj) {
				if (obj.hasOwnProperty && obj.hasOwnProperty(key)) {
					newObj[key] = (obj && typeof obj[key] === 'object') ? Extend.deepClone(obj[key]) : obj[key];
				}
			}
		}
		return newObj;
	}

	/**
	 * 合并两个数组并去重。
	 * @param arr1 第一个数组。
	 * @param arr2 第二个数组。
	 * @returns 合并后的新数组。
	 */
	public static combindArray(arr1: any[], arr2: any[]) {
		arr1 = arr1 || [];
		let arr = arr1.concat();
		if (arr2) {
			for (let i = 0; i < arr2.length; i++) {
				let v = arr2[i];
				if (arr.indexOf(v) == -1) {
					arr.push(v);
				}
			}
		}
		return arr;
	}

	/** 对象 转 数组 
	 ** 例：{a:{name:1,age:2},b:{name:11,age:22}} ==>> [{name:1,age:2}, {name:11,age:22}] 
	*/
	public static objAsArr(obj: any): any[] {
		if (Object.prototype.toString.call(obj) === '[object Object]') {
			return Object.keys(obj).map(key => obj[key])
		}
		return obj
	}

	/**
	 * 去除字符串首尾空格。
	 * @param str 原始字符串。
	 * @returns 去除首尾空格后的字符串。
	 */
	public static trim(str) {
		return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}
	/**
	 * 判断字符串是否以指定内容结尾。
	 * @param str 原始字符串。
	 * @param endStr 结尾字符串。
	 * @returns 是否以指定内容结尾。
	 */
	public static EndsWith(str, endStr) {
		var d = str.length - endStr.length;
		return (d >= 0 && str.lastIndexOf(endStr) == d);
	}
	/**
	 * 判断字符串是否以指定内容开头。
	 * @param str 原始字符串。
	 * @param startStr 开头字符串。
	 * @returns 是否以指定内容开头。
	 */
	public static StartsWith(str, startStr) {
		return (str.indexOf(startStr) == 0);
	}

	/** 生成随机 UUID 所用的字符表 */
	private static randomUUIDChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
	/**
	 * 获取一个随机 UUID 字符串。
	 */
	public static get randomUUID() {
		let uuid = [];
		// rfc4122, version 4 form
		let r;
		// rfc4122 requires these characters
		uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
		uuid[14] = '4';
		// Fill in random data.  At i==19 set the high bits of clock sequence as
		// per rfc4122, sec. 4.1.5
		for (let i = 0; i < 36; i++) {
			if (!uuid[i]) {
				r = 0 | Math.random() * 16;
				uuid[i] = this.randomUUIDChars[(i === 19) ? (r & 0x3) | 0x8 : r];
			}
		}
		return uuid.join('');
	}

	/**
	 * 安全地把 JSON 字符串解析为对象。
	 * @param jsonStr JSON 字符串。
	 * @returns 解析后的对象；失败时返回空值。
	 */
	public static jsonSafeParse(jsonStr: string) {
		let jobj = null;
		if (jsonStr) try { jobj = JSON.parse(jsonStr); } catch (e) { console.warn("failedToParseJson", jsonStr); }
		return jobj;
	}

	/**
	 * 对比两个对象是否所有属性都相等。
	 * @param a 对象 A。
	 * @param b 对象 B。
	 * @returns 是否完全相等。
	 */
	public static isObjEqual(a: any, b: any) {
		if (a == b) {
			return true;
		}
		if (typeof a != "object" || typeof b != "object") {
			return false;
		}
		for (let k in a) {
			if (b[k] != a[k]) return false;
		}
		for (let k in b) {
			if (b[k] != a[k]) return false;
		}
		return true;
	}


	/**
	 * 把数字转换为xx万、xx亿、xxK、xxM这种形式的字符串
	 * @param num 数字
	 * @param isShowOnlyInt 是否只显示整数部分(默认：显示小数部分 3.3万)
	 * @param isShowWan 是否过万就显示万(默认：10万以上才显示万)
	 */
	public static getFormatNumber(num: number, isShowOnlyInt: boolean = false, isShowWan: boolean = false): string {
		if (!num || typeof num !== "number") return "0";

		const units = [LanguageMgr.get(1002304), LanguageMgr.get(1002305), LanguageMgr.get(1002306)]; // 万、亿、万亿
		let suffix = "";

		if (num >= 1e12) { // 万亿级别
			num /= 1e12;
			suffix = units[2];
		} else if (num >= 1e8) { // 亿级别
			num /= 1e8;
			suffix = units[1];
		} else if ((num >= 1e5 && !isShowWan) || (num >= 1e4 && isShowWan)) { // 万级别
			num /= 1e4;
			suffix = units[0];
		}

		let numStr: string;
		if (num >= 1000 || isShowOnlyInt) { // 显示整数部分
			numStr = Math.floor(num).toString();
		} else { // 显示小数部分
			const decimal = num < 100 ? 2 : 1; // 100以下保留2位小数，否则保留1位
			numStr = num.toString();
			const index = numStr.indexOf('.');
			if (index !== -1) {
				numStr = numStr.substring(0, index + decimal + 1);
			}
			if (num < Math.floor(num) + Math.pow(0.1, decimal)) { // 避免显示 x.00
				numStr = Math.floor(num).toString();
			}
		}

		return `${numStr}${suffix}`;
	}

	/**
	 * 一帧之内做不完的事，可以用这个方法分派到多帧去做，避免卡帧。
	 * @param doSomething 要做的事情，返回true/false，true代表还没做完，false代表全部做完了，可以结束帧循环调用了。
	 * @param thisobj 要绑定的this对象
	 */
	public static doFrameJob(doSomething: () => boolean, thisobj: any) {
		let totalCount = 0;
		let onUpdate = () => {
			let t1 = Date.now();
			let count = 0;
			while (Date.now() - t1 < 16) {
				totalCount++;
				count++;
				// console.log(`doFrameJob ${count}`);
				if (doSomething.call(thisobj)) {

				} else {
					director.off(Director.EVENT_AFTER_UPDATE, onUpdate, this);
					// console.log(`frameJobFinished ${totalCount}`);
					break;
				}
			}
		}
		director.on(Director.EVENT_AFTER_UPDATE, onUpdate, this);
		return {
			stop: () => {
				director.off(Director.EVENT_AFTER_UPDATE, onUpdate, this);
			}
		};
	}

	/**
	 * 获取键值对中元素的数量
	 */
	public static objsize(obj: any) {
		if (!obj) return 0;
		let count = 0;
		for (let k in obj) {
			let v = obj[k];
			if (v || v === 0) {
				count += 1;
			}
		}
		return count;
	}

	/**
	 * 转换带运算的字符串(固定skillLevel格式的) 例如："妙蛙种子用藤鞭攻击敌方单体目标，造成80%特攻+$(skillLevel*4*24)$的特殊伤害";
	 * @param str 转换的字符串
	 * @param skillLevel 参数
	 * @returns 
	 */
	public static parserSkillDesc(str: string, skillLevel: number) {
		const variables = {
			skillLevel: skillLevel,
		};
		// 1. 提取 $(...) 格式的表达式
		const expressionRegex = /\$\(([^)]+)\)\$/g;
		// 2. 替换表达式为计算结果
		const result = str.replace(expressionRegex, (match, expr) => {
			// 替换变量
			for (const key in variables) {
				expr = expr.replace(new RegExp(key, 'g'), variables[key]);
			}

			// 使用 eval 计算表达式
			try {
				return eval(expr); // 计算表达式的值
			} catch (e) {
				console.error(`计算表达式失败: ${expr}`, e);
				return match; // 如果计算失败，返回原表达式
			}
		});
		return result;
	}

	// static trackNodePosition(node: Node) {
	// 	const origSetPosition = node.setPosition.bind(node);
	// 	const origSetWorldPosition = node.setWorldPosition?.bind(node);

	// 	node.setPosition = (...args: any[]) => {
	// 		console.trace(`[setPosition] ${node.name}`, ...args);
	// 		return origSetPosition(...args);
	// 	};

	// 	if (origSetWorldPosition) {
	// 		node.setWorldPosition = (...args: any[]) => {
	// 			console.trace(`[setWorldPosition] ${node.name}`, ...args);
	// 			return origSetWorldPosition(...args);
	// 		};
	// 	}

	// 	const pos = node.position;
	// 	const origSet = pos.set.bind(pos);
	// 	//@ts-ignore
	// 	pos.set = (...args: any[]) => {
	// 		console.trace(`[Vec3.set] ${node.name}.position`, ...args);
	// 		return origSet(...args);
	// 	};
	// }

	/** 宽高比，若达不到，缩小GRoot的宽度 */
	public static get ccviewgetScaleX() {
		let size = screen.windowSize;
		let scaleC = size.height / size.width; // 760 1.66666
		let dsize = view.getDesignResolutionSize();
		let scaleD = dsize.height / dsize.width; // 720 1.7777
		if (scaleD - scaleC > 0.01) {
			if (DEBUG) {
				console.warn("ccviewgetScaleX: diff", scaleD - scaleC, "scalex:", size.width / dsize.width);
			}
			return size.width / dsize.width;
		}
		return view.getScaleX();
	}
}

window["Extend"] = Extend;
