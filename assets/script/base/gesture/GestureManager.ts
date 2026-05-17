
/**
*Author  : XW
*Desc    : 手势管理器，负责手势实例创建、对象池复用与手势状态协调
*/

import { GObject } from "../../fairyGUI/GObject";
import BaseGesture from "./BaseGesture";
import { GESTURETYPE, GestureArg } from "./GestureDefine";
import GestureLog from "./GestureLog";
import GestureScale from "./GestureScale";
import GestureSlide from "./GestureSlide";

export default class GestureManager {
    /** 单例实例 */
    private static _inst: GestureManager
    public static get inst(): GestureManager {
        if (!this._inst) {
            this._inst = new GestureManager();
        }
        return this._inst;
    }

    /** 是否正在触摸滑动中
     ** 针对双指缩放的时候，不应该响应单指滑动事件
     */
    static isMove: boolean;
    /** 手势对象池 */
    private static _gesturePool: { [gestureType: number]: BaseGesture[] } = {};
    /**
     * 回收手势对象到池子。
     * @param gesture 要回收的手势对象。
     */
    static recoverGesture(gesture: BaseGesture): void {
        let type = gesture.gestureType;
        if (!GestureManager._gesturePool[type]) {
            GestureManager._gesturePool[type] = [];
        }
        GestureManager._gesturePool[type].push(gesture);
    }

    /**
     * 创建手势
     * @param target 目标对象
     * @param type 手势类型
     * @param onUpdate 手势进行中的回调（缩放手势必传）
     * @param onComplete 手势执行完成的回调（滑动手势必传）
     */
    public createGesture(target: GObject, type: GESTURETYPE, onUpdate?: (arg?: GestureArg) => void, onComplete?: (arg?: GestureArg) => void): BaseGesture {
        let gesture: BaseGesture;
        let gestureArr: BaseGesture[] = GestureManager._gesturePool[type];

        if (gestureArr && gestureArr.length > 0) {
            gesture = gestureArr.pop();

        } else {
            switch (type) {
                case GESTURETYPE.ROWSLIDE:
                case GESTURETYPE.COLUMNSLIDE:
                    gesture = new GestureSlide();
                    break;

                case GESTURETYPE.SCALE:
                    gesture = new GestureScale();
                    break;

                default:
                    GestureLog.warn(`手势[${type}]创建失败：GestureType中不存在该类型`)
                    break;
            }
        }
        if (gesture) {
            gesture.createGesture(type, target, onUpdate, onComplete);
        }
        return gesture;
    }
}
