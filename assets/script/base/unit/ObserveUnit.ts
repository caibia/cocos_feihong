/**
*Author  : XW
*Desc    : 观察者单元，负责观察事件注册、暂停恢复与释放
*/

import ObserveMgr, { ObserveFunc } from "../manager/ObserveMgr";

export default class ObserveUnit {

    /** 观察者对象 */
    private _observer: any;
    /** 当前是否处于暂停状态 */
    public isPause: boolean;

    /**
     * 初始化观察者单元。
     * @param ob 观察者对象。
     */
    constructor(ob: any) {
        this._observer = ob;
    }

    /** 暂停观察响应 */
    public pause() {
        if (this.isPause) return;
        this.isPause = true;
        this._observer["$_Pause"] = true;
    }

    /** 恢复观察响应 */
    public resume() {
        if (!this.isPause) return;
        this.isPause = false;
        this._observer["$_Pause"] = false;
    }
    /**
     * 添加观察。
     * @param subFunc 被观察函数
     * @param obFunc 观察者回调
     * @param args 参数
     */
    public addObserve(subFunc: Function, obFunc: Function, ...args: any[]) {
        ObserveMgr.inst.addObserve(subFunc, obFunc, this._observer, ...args);
    }

    /**
     * 取消订阅
     * @param subFunc 被观察函数
     * @param obFunc 观察者回调
     */
    public removeObserve(subFunc: Function, obFunc: Function,) {
        ObserveMgr.inst.removeObserve(subFunc, obFunc, this._observer);
    }

    /** 取消所有订阅 */
    public removeAllObserve() {
        ObserveMgr.inst.removeAllObserve(this._observer);
    }

    /** 释放观察者单元 */
    public dispose() {
        this.removeAllObserve();
        this._observer = undefined;
    }

}
