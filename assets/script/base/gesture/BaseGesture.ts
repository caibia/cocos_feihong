
/**
*Author  : XW
*Desc    : 手势基类，负责统一保存目标对象、回调和回收逻辑
*/

import { GObject } from "../../fairyGUI/GObject";
import { GESTURETYPE, GestureArg } from "./GestureDefine";
import GestureLog from "./GestureLog";
import GestureManager from "./GestureManager";

/** 手势脚本基类 */
export default class BaseGesture {
    /** 手势进行中的回调 */
    protected onUpdate: (arg?: GestureArg) => void;
    /** 手势完成时的回调 */
    protected onComplete: (arg?: GestureArg) => void;
    /** 手势作用的目标对象 */
    protected target: GObject;

    /** 回收时执行，派生类必须重写该方法（因为不同手势，会有不用的回收逻辑） */
    protected removeEvt: () => void;

    /** 当前手势类型 */
    protected _gestureType: GESTURETYPE;
    get gestureType(): GESTURETYPE {
        return this._gestureType;
    }

    /**
     * 创建手势脚本。
     * @param type 手势类型。
     * @param target 目标对象。
     * @param onUpdate 手势进行中的回调。
     * @param onComplete 手势完成时的回调。
     */
    public createGesture(type: GESTURETYPE, target: GObject, onUpdate?: (arg?: GestureArg) => void, onComplete?: (arg?: GestureArg) => void): void {
        this._gestureType = type;
        GestureLog.warn(`手势[${type}]开始注册`);
        this.onUpdate = onUpdate;
        this.target = target;
        this.onComplete = onComplete;
        this.removeEvt = () => {
            GestureLog.warn(`手势[${type}]未重写removeEvt方法`);
        }
    }

    /** 回收当前手势实例 */
    public recover(): void {
        this.removeEvt();
        this.onUpdate = null;
        this.onComplete = null;
        GestureManager.recoverGesture(this);
    }
}
