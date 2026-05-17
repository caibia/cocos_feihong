
/**
*Author  : XW
*Desc    : 手势日志工具，负责在调试环境输出手势相关日志
*/

import { DEBUG } from "cc/env"

export default class GestureLog {
    /**
     * 输出普通日志。
     * @param str 日志文本。
     */
    public static log(str: string): void {
        if (DEBUG) {
            console.log(`%c ${str} `, 'background:#41b883;color:#ffffff;border-radius: 5px')
        }
    }
    /**
     * 输出警告日志。
     * @param str 日志文本。
     */
    public static warn(str: string): void {
        if (DEBUG) {
            console.log(`%c ${str} `, 'background:#FFE724;color:#b40b0b;border-radius: 5px')
        }
    }

}
