/**
*Author  : XW
*Desc    : 
*/

import { Vec2, v3 } from "cc";

export default class ExtendMath {

	/**
	 * 小数取模。 在js中小数取模会有误差问题，这里先放大scale倍转换为整数之后再处理
	 * //https://stackoverflow.com/questions/3966484/why-does-modulus-operator-return-fractional-number-in-javascript
	*/
	public static floatMod(float1: number, mod: number) {
		let scale = 1000000;
		let t0 = Math.round(float1 * scale);
		let t1 = Math.round(mod * scale);
		return (t0 % t1) / scale;
	}

	public static XRandomSeed: number = 5;
	/**可修改种子的随机函数, 线性同余生成器（LCG, Linear Congruential Generator) */
	public static XRandom() {
		this.XRandomSeed = (this.XRandomSeed * 9301 + 49297) % 233280;
		return this.XRandomSeed / 233280.0;
	}
	/**返回[lower, upper]之间的随机整数，取值包含上限和下限 */
	public static XRandomInt(lower: number, upper: number) {
		let r: number = this.XRandom();
		return Math.floor(r * (upper - lower + 1)) + lower;
	}

	/**给数字每隔3位加个逗号 */
	public static getEnNumber(num: number) {
		num = Math.floor(num);
		let numStr: string = num.toString()
		let result: string = '';
		while (numStr.length > 3) {
			result = ',' + numStr.slice(-3) + result;
			numStr = numStr.slice(0, numStr.length - 3);
		}
		if (numStr) { result = numStr + result; }
		return result;
	}

	/**小于100的数字 前面补0 */
	public static frontRepairZero(num: number) {
		let str = num.toString();
		while (str.length < 3) {
			str = '0' + str;
		}
		return str;
	}

	/**
	 * 以某点为圆心，生成圆周上等分点的坐标
	 * @param {number} r 半径
	 * @param {Vec2} pos 圆心坐标
	 * @param {number} count 等分点数量
	 * @param {number} [randomScope=80] 等分点的随机波动范围
	 * @returns {Vec2[]} 返回等分点坐标
	 */
	public static getCirclePoints(r: number, pos: Vec2, count: number, randomScope: number = 60): Vec2[] {
		let points = [];
		let radians = (Math.PI / 180) * Math.round(360 / count);
		for (let i = 0; i < count; i++) {
			let x = pos.x + r * Math.sin(radians * i);
			let y = pos.y + r * Math.cos(radians * i);
			points.unshift(v3(x + Math.random() * randomScope, y + Math.random() * randomScope, 0));
		}
		return points;
	}

}