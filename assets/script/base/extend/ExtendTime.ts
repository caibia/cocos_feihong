/**
*Author  : XW
*Desc    : 时间扩展工具，提供时间格式化、补零和秒数转换等能力
*/

import LanguageMgr from "../manager/LanguageMgr";

export const enum TIME_STRTYPE {
	/**格式： 时分秒 例如：24：00：00*/
	HMS = 1,
	/**格式： 天时分秒 例如：1天1时1分1秒 */
	DHMS = 2,
	/**格式： 天小时 / 小时分钟 / 分钟秒 例如：1天12小时 / 12小时50分钟 / 50分钟10秒 */
	DH_HM_MS = 3,
	/**格式： 分:秒 例如：159：59 */
	MS = 4,
	/**格式： 时分/分秒 例如：12:50 / 59:10 */
	HM_MS = 5,
	/**格式： 
	 * 大于24小时 显示X天
	 * 小于24小时 显示X时
	 * 小于60分钟 显示x分
	 * 小于60秒钟 显示x秒
	 */
	D_H_M_S = 6,
	/**格式： 天时分/时分秒 */
	DHM_HMS = 7,
}

export class ExtendTime {

	/**
	 * 获取当前服务器时间。
	 * @returns 当前时间戳。
	 */
	public static getServerTime(): number {
		return Date.now();
	}
	/**
	 * 在数字前面补0
	 * 例如 a: number 如果 a 小于2位数的时候需要在前面补0
	 * let b = TimeMgr.PrefixToNumber(a, 2)  此时如果 a = 5 则 b 为 05
	 * @param num		需要处理的数字
	 * @param length	输出的长度 此参数决定了输出多少位数
	 */
	public static PrefixToNumber(num: number, length: number) {
		return (Array(length).join('0') + num).slice(-length);
	}

	/**
	 * 秒数转成时间格式 hh:mm:ss
	 * @param time 总秒数
	 * @returns 格式化后的时间字符串。
	 */
	public static timeConvert(time: number): string {
		if (time <= 0) { return ""; }
		let hour = Math.floor(time / 3600);
		let minute = Math.floor((time - hour * 3600) / 60);
		let second = time - hour * 3600 - minute * 60;
		let hourstr = ExtendTime.PrefixToNumber(hour, 2);
		let minutestr = ExtendTime.PrefixToNumber(minute, 2);
		let secondstr = ExtendTime.PrefixToNumber(second, 2);
		let timestr = `${hourstr}:${minutestr}:${secondstr}`;
		return timestr;
	}

	/**
	 * 时间转为字符串
	 * @param time 剩余时间(秒)
	 * @param type 类型 TIME_STRTYPE
	 * @returns 格式化后的时间字符串。
	 */
	public static convertToStr(time: number, type: number = TIME_STRTYPE.HMS): string {
		let timeStr: string;
		let day = Math.floor(time / 3600 / 24);
		let hour = Math.floor(time / 3600);
		let minute = Math.floor((time - hour * 3600) / 60);
		let second = Math.floor(time - hour * 3600 - minute * 60);

		let dayStr = day > 0 ? LanguageMgr.get(1002204, [day]) : "";
		let hourStr = hour >= 10 ? `${hour}` : `0${hour}`;
		let minuteStr = minute >= 10 ? `${minute}` : `0${minute}`;
		let secondStr = second >= 10 ? `${second}` : `0${second}`;

		switch (type) {
			case TIME_STRTYPE.HMS:
				timeStr = `${hourStr}:${minuteStr}:${secondStr}`;
				break;
			case TIME_STRTYPE.DHMS:
				hourStr = (hour % 24) >= 10 ? `${hour}` : `0${hour}`;
				timeStr = LanguageMgr.get(1002209, [dayStr, hourStr, minuteStr, secondStr]);
				break;
			case TIME_STRTYPE.DH_HM_MS:
				hour = hour % 24;
				if (day > 0) {
					timeStr = `${dayStr}${hour}${LanguageMgr.get(1002205)}`;
				} else if (hour > 0) {
					timeStr = `${hour}${LanguageMgr.get(1002205)}${minute}${LanguageMgr.get(1002206)}`;
				} else {
					timeStr = `${minute}${LanguageMgr.get(1002206)}`;
				}
				break;
			case TIME_STRTYPE.MS:
				timeStr = `${minuteStr}:${secondStr}`;
				break;
			case TIME_STRTYPE.HM_MS:
				if (hour > 0) {
					timeStr = `${hour}:${minuteStr}`;
				} else {
					timeStr = `${minuteStr}:${secondStr}`;
				}
				break;
			case TIME_STRTYPE.D_H_M_S:
				hour = hour % 24;
				if (day > 0) {
					timeStr = LanguageMgr.get(1002204, [day]);
				} else if (hour > 0) {
					timeStr = LanguageMgr.get(1002201, [hour]);
				} else if (minute > 0) {
					timeStr = LanguageMgr.get(1002202, [minute]);
				} else {
					timeStr = LanguageMgr.get(1002203, [second]);
				}
				break;
			case TIME_STRTYPE.DHM_HMS:
				let tDay = ExtendTime.PrefixToNumber(day, 2);
				let tHour = ExtendTime.PrefixToNumber(hour - day * 24, 2);
				let tMin = ExtendTime.PrefixToNumber(minute, 2);
				let tSec = ExtendTime.PrefixToNumber(second, 2);
				if (day > 0) {
					timeStr = LanguageMgr.get(1002208, [tDay, tHour, tMin]);
				} else {
					timeStr = LanguageMgr.get(1002210, [tHour, tMin, tSec]);
				}
				break;
		}

		return timeStr;
	}
}
