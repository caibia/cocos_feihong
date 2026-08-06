/**
*Author  : XW
*Desc    : 
*/

import { DEBUG } from "cc/env"
import XDEBUGLOG from "../debug/XDEBUGLOG"
import Extend from "../extend/Extend"

export const enum TIMERTYPE {
    TIMEOUT = "timeout",
    INTERVAL = "interval",
}

export type ITimer = {
    /**句柄id */
    handler: number,
    /**pid */
    pid: number,
    /**来自哪个类 */
    fromClass?: string,
    /**计时器类型 */
    timerType: TIMERTYPE,
    /**执行时间间隔, 单位毫秒 */
    interval?: number,
    /**当前执行次数 */
    count?: number,
    /**最大可执行次数 */
    maxCount?: number,
    /**回调函数 */
    callback: Function,
    /**创建定时器时的时间戳，单位毫秒(用来做暂停恢复) */
    startTimestamp?: number,
    /**执行的时刻对应的时间戳，单位毫秒 */
    endTimestamp?: number,
}

export default class TimerMgr {

    private static _inst: TimerMgr;
    public static get inst(): TimerMgr {
        if (!TimerMgr._inst) {
            TimerMgr._inst = new TimerMgr();
        }
        return TimerMgr._inst;
    }

    /**定时器id */
    private pid = 0;
    /**定时器警告数量阈值 */
    private warnThreshold = 50;
    /**全局定时器(除去TimerUnit外的 所有定时器数据) */
    private globalAllTimer: { [key: string | number]: ITimer };

    public init() {
        this.globalAllTimer = {};
    }

    /**
     * 单次定时器
     * @param callback 回调函数
     * @param time 间隔时间，单位毫秒
     * @param isPause 是否暂停
     * @param isPrivate 是否属于私有的(是否记录在timeUnit的定时器列表中)
    */
    public setTimeout(callback: Function, time: number, fromClass?: Object, isPause?: boolean, isPrivate?: boolean): ITimer {
        if (!callback) {
            XDEBUGLOG.warn("setTimeout的callback不能为空");
            return;
        }
        if (Extend.isNull(time)) {
            XDEBUGLOG.warn("setTimeout的time不能为空");
            return;
        }
        let pid = ++this.pid;
        let callbackWrapper = () => {
            delete this.globalAllTimer[pid];
            try {
                callback()
            } catch (error) {
                XDEBUGLOG.error("TimerMgr.setTimeout callback error", error);
            }
        }
        let handler: number;
        if (!isPause) {
            //unit的定时器不需重新组装回调函数
            handler = setTimeout(isPrivate ? callback : callbackWrapper, time);
        }
        let timestamp = Date.now() + time;
        let timer: ITimer = { pid: pid, handler: handler, fromClass: fromClass?.constructor.name, timerType: TIMERTYPE.TIMEOUT, callback: callbackWrapper, endTimestamp: timestamp };
        //不是unit的定时器才记录
        !isPrivate && (this.globalAllTimer[pid] = timer);
        let size = Extend.objsize(this.globalAllTimer);
        if (size > this.warnThreshold) {
            XDEBUGLOG.warn(`TimerMgr.setTimeout定时器过多：${size},超过${this.warnThreshold}`);
            this.warnThreshold *= 2;
        }
        return timer;
    }

    /**
     * 循环定时器
     * @param callback 回调函数
     * @param interval 间隔时间，单位毫秒
     * @param fromClass 来自哪个类(只是做记录用)
     * @param autoexec 是否立即执行一次
     * @param isPause 是否暂停
     * @param isPrivate 是否属于私有的(是否记录在timeUnit的定时器列表中)
     */
    public setInterval(callback: Function, interval: number, fromClass?: Object, autoexec?: boolean, isPause?: boolean, isPrivate?: boolean): ITimer {
        if (!callback) {
            XDEBUGLOG.warn("setInterval的callback不能为空");
            return;
        }
        if (Extend.isNull(interval)) {
            XDEBUGLOG.warn("setInterval的interval不能为空");
            return;
        }
        let callbackWrapper = () => {
            if (DEBUG) {
                callback()
            } else {
                try {
                    callback()
                } catch (error) {
                    XDEBUGLOG.error("TimerMgr.setInterval callback error", error);
                }
            }
        }
        if (autoexec) {
            isPrivate ? callback() : callbackWrapper();
        }
        let pid = ++this.pid;
        let handler: number;
        if (!isPause) {
            //unit的定时器不需重新组装回调函数
            handler = setInterval(isPrivate ? callback : callbackWrapper, interval);
        }
        let now = Date.now();
        let timer: ITimer = { pid: pid, handler: handler, fromClass: fromClass?.constructor.name, timerType: TIMERTYPE.INTERVAL, interval: interval, callback: callbackWrapper, startTimestamp: now };
        //不是unit的定时器才记录
        !isPrivate && (this.globalAllTimer[pid] = timer);
        let size = Extend.objsize(this.globalAllTimer);
        if (size > this.warnThreshold) {
            XDEBUGLOG.warn(`TimerMgr.setTimeout定时器过多：${size},超过${this.warnThreshold}`);
            this.warnThreshold *= 2;
        }
        return timer;
    }
    /**循环定时器之指定循环次数
     * @param callback 回调函数
     * @param interval 间隔时间，单位毫秒
     * @param count 循环次数
     * @param autoexec 是否立即执行一次
     * @param isPause 是否暂停
     * @param isPrivate 是否属于私有的(是否记录在timeUnit的定时器列表中)
     */
    public setIntervalCount(callback: Function, interval: number, count: number, fromClass?: Object, autoexec?: boolean, isPause?: boolean, isPrivate?: boolean): ITimer {
        if (!callback) {
            XDEBUGLOG.warn("setIntervalCount的callback不能为空");
            return;
        }
        if (Extend.isNull(interval)) {
            XDEBUGLOG.warn("setIntervalCount的interval不能为空");
            return;
        }
        if (Extend.isNull(count)) {
            XDEBUGLOG.warn("setIntervalCount的count不能为空");
            return;
        }
        let callbackWrapper = () => {
            try {
                callback()
                this.globalAllTimer[timer.pid].count += 1;
                if (this.globalAllTimer[timer.pid].count >= this.globalAllTimer[timer.pid].maxCount) {
                    this.removeTimer(timer);
                    delete this.globalAllTimer[timer.pid];
                }
            } catch (error) {
                XDEBUGLOG.error("TimerMgr.setInterval callback error", error);
            }
        }
        //unit的定时器不需重新组装回调函数
        let timer: ITimer = this.setInterval(isPrivate ? callback : callbackWrapper, interval, fromClass, autoexec, isPause, isPrivate);
        timer.count = 0;
        timer.maxCount = count;
        if (fromClass) {
            timer.fromClass = fromClass.constructor.name;
        }
        //不是unit的定时器才记录
        !isPrivate && (this.globalAllTimer[timer.pid] = timer);
        return timer;
    }

    /**
     * 移除一个定时器
     * 主：只会移除 除去TimerUnit外的 全局定时器，TimerUnit的定时器由自身绑定的界面负责处理
     * @param timer 定时器
     */
    public removeTimer(timer: ITimer) {
        if (timer.timerType == TIMERTYPE.TIMEOUT) {
            clearTimeout(timer.handler);
        } else {
            clearInterval(timer.handler)
        }
        delete this.globalAllTimer[timer.pid];
    }

    /**
     * 移除所有计时器 
     * 主：只会移除 除去TimerUnit外的 全局定时器，TimerUnit的定时器由自身绑定的界面负责处理
     * */
    public removeAllTimer() {
        for (let pid in this.globalAllTimer) {
            let timer: ITimer = this.globalAllTimer[pid];
            if (timer.timerType == TIMERTYPE.TIMEOUT) {
                clearTimeout(timer.handler);
            } else {
                clearInterval(timer.handler);
            }
        }
        this.globalAllTimer = {};
    }
}

window["TimerMgr"] = TimerMgr;
