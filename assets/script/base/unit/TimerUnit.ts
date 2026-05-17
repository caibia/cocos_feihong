
/**
*Author  : XW
*Desc    : 定时器单元，负责定时器创建、暂停恢复和统一释放
*/

import XDEBUGLOG from "../debug/XDEBUGLOG";
import { EVENTNAME } from "../../app/define/EventDefine"
import EventMgr from "../manager/EventMgr"
import TimerMgr, { ITimer, TIMERTYPE } from "../manager/TimerMgr"
import XComponent from "../ui/XComponent";

export default class TimerUnit {

    /**所有定时器数据 */
    private allTimer: { [key: string | number]: ITimer };
    /**是否暂停 */
    public isPause: boolean;
    /**时间缩放 */
    private _timeScale: number = 1;
    /** 定时器所属对象 */
    private _fromCom: XComponent | Object;

    /**
     * 初始化定时器单元。
     * @param fromCom 定时器所属对象。
     */
    constructor(fromCom: XComponent | Object) {
        this.allTimer = {};
        this._fromCom = fromCom;
        EventMgr.inst.addEventListener(EVENTNAME.TIME_SCALE_CHANGE, this.onTimeScaleChange, this);
    }

    /**
     * 设置时间缩放倍率。
     * @param v 时间缩放倍率。
     */
    public set TimeScale(v: number) {
        v = Math.max(0.1, v);
        XDEBUGLOG.debug("调整TimerUnit时间缩放:", v);
        this._timeScale = v;
        EventMgr.inst.dispatchEvent(EVENTNAME.TIME_SCALE_CHANGE);
    }
    /** 获取时间缩放倍率 */
    public get TimeScale() {
        return this._timeScale;
    }
    /**
     * 单次定时器
     * @param callback 回调函数
     * @param time 间隔时间，单位毫秒
     */
    public setTimeout(callback: Function, time: number): ITimer {
        let timer: ITimer = TimerMgr.inst.setTimeout(() => {
            callback();
            delete this.allTimer[timer.pid];
        }, time, this._fromCom, this.isPause, true);
        this.allTimer[timer.pid] = timer;
        return timer;
    }

    /**
     * 循环定时器
    * @param callback 回调函数
     * @param interval 间隔时间，单位毫秒
     * @param autoexec 是否立即执行一次
     */
    public setInterval(callback: Function, interval: number, autoexec?: boolean): ITimer {
        let timer: ITimer = TimerMgr.inst.setInterval(callback, interval, this._fromCom, autoexec, this.isPause, true);
        this.allTimer[timer.pid] = timer;
        return timer;
    }
    /**循环定时器之指定循环次数
     * @param callback 回调函数
     * @param interval 间隔时间，单位毫秒
     * @param count 循环次数
     * @param autoexec 是否立即执行一次
     */
    public setIntervalCount(callback: Function, interval: number, count: number, autoexec?: boolean): ITimer {
        let timer: ITimer = TimerMgr.inst.setIntervalCount(() => {
            callback();
            this.allTimer[timer.pid].count += 1;
            if (this.allTimer[timer.pid].count >= this.allTimer[timer.pid].maxCount) {
                this.removeTimer(timer);
                delete this.allTimer[timer.pid];
            }
        }, interval, count, this._fromCom, autoexec, this.isPause, true);
        this.allTimer[timer.pid] = timer;
        return timer;
    }

    /** 暂停全部定时器 */
    public pause() {
        if (this.isPause) return;
        this.isPause = true;
        for (let pid in this.allTimer) {
            let timer: ITimer = this.allTimer[pid];
            if (timer.timerType == TIMERTYPE.TIMEOUT) {
                clearTimeout(timer.handler);
            } else {
                clearInterval(timer.handler);
            }
        }
    }

    /** 恢复全部定时器 */
    public resume() {
        if (!this.isPause) return;
        this.isPause = false;
        let pid: number | string;
        let now = Date.now();
        let delta: number;
        for (pid in this.allTimer) {
            let timer = this.allTimer[pid];
            if (timer.timerType == TIMERTYPE.TIMEOUT) {
                delta = Math.max(0, timer.endTimestamp - now);
                timer.handler = setTimeout(timer.callback, delta / this.TimeScale);
            } else {
                timer.handler = setInterval(timer.callback, timer.interval / this.TimeScale);
            }
        }
    }

    /** 响应时间缩放变化并重建定时器 */
    private onTimeScaleChange() {
        //如果已经在暂停中，那么可以跳过处理，下次resume的时候就会自动重置定时器
        if (this.isPause) return;
        this.pause();
        this.resume();
    }

    /**
     * 移除一个定时器
     * @param timer 定时器
     */
    public removeTimer(timer: ITimer) {
        if (timer.timerType == TIMERTYPE.TIMEOUT) {
            clearTimeout(timer.handler);
        } else {
            clearInterval(timer.handler)
        }
        delete this.allTimer[timer.pid];
    }

    /** 移除所有计时器 */
    public removeAllTimer() {
        for (let pid in this.allTimer) {
            let timer: ITimer = this.allTimer[pid];
            if (timer.timerType == TIMERTYPE.TIMEOUT) {
                clearTimeout(timer.handler);
            } else {
                clearInterval(timer.handler);
            }
        }
        this.allTimer = {};
    }

    /** 释放定时器单元 */
    public dispose() {
        this._fromCom = null;
        this.removeAllTimer();
        EventMgr.inst.removeListener(EVENTNAME.TIME_SCALE_CHANGE, this.onTimeScaleChange, this);
    }

}
