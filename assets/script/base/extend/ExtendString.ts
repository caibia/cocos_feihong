/**
*Author  : XW
*Desc    : 
*/

export default class ExtendString {
	/**
	 * @param template 用{0}、{1}、{2}这样的占位符来表示要替换的变量
	 * @param args args[0]对应{0}、args[1]对应{1}
	 * 例子1： substitute("获得{0}元宝{1}铜钱", 5, 10)
	 * 例子2： substitute("获得{0}元宝{1}铜钱", [5, 10])
	 * */
	public static substitute(template: string, ...args) {
		if (!args) return template;
		if (!template) return template;
		let params = args;
		if (args.length == 1 && args[0] instanceof Array) {
			params = args[0];
		}
		for (let i = 0; i < params.length; i++) {
			let reg = new RegExp("\\{" + i + "\\}", 'g');
			template = template.replace(reg, params[i]);
		}
		return ExtendString.escape(template);
	}

	/** 将文本中的 "#r" 替换成换行符（\n） 
	 ** 配置表中如果直接写 \n 导表后都会变成 /n
	 ** 所以改用 #r 作为换行标识
	 */
	public static escape(str: string): string {
		return str.replace(/#r/g, "\n");
	}

	/** 把键值对转换为 a=9&c=3 的形式*/
	public static joinHttpQuery(args) {
		if (!args) return "";
		let arr2 = [];
		for (let k in args) {
			arr2.push(`${k}=${args[k]}`);
		}
		return arr2.join("&");
	}
}
