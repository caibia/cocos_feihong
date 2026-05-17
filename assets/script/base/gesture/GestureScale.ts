
/**
*Author  : XW
*Desc    : 缩放手势脚本
*/

import { Vec2, v2 } from "cc";
import { GObject } from "../../fairyGUI/GObject";
import { GRoot } from "../../fairyGUI/GRoot";
import { FEvent } from "../../fairyGUI/event/Event";
import BaseGesture from "./BaseGesture";
import { GESTURETYPE, GESTURE_SLIDETYPE, GestureArg } from "./GestureDefine";
import GestureLog from "./GestureLog";
import GestureManager from "./GestureManager";
import GestureTouchData from "./GestureTouchData";
import Extend from "../extend/Extend";

/**缩放手势脚本 */
export default class GestureScale extends BaseGesture {
    /** 当前参与缩放的起始触摸数据列表 */
    private startTouch: GestureTouchData[] = [];
    /** 是否正在计算缩放量 */
    private isCompute: boolean;

    /**
     * 创建缩放手势。
     * @param type 手势类型。
     * @param target 目标对象。
     * @param onUpdate 手势进行中的回调。
     * @param onComplete 手势完成回调。
     */
    createGesture(type: GESTURETYPE, target: GObject, onUpdate?: (arg: GestureArg) => void, onComplete?: (arg?: GestureArg) => void) {
        super.createGesture(type, target, onUpdate, onComplete);
        if (!onUpdate) {
            GestureLog.warn("[缩放手势]注册失败！原因：未注册[onUpdate]回调，该回调为必传参数")
        }

        let evtFunMap: { [touchHash: number]: { moveFun: (evt: FEvent) => void, endFun: (evt: FEvent) => void } } = {};
        target.node.on(FEvent.TOUCH_BEGIN, (evt: FEvent) => {
            evt.propagationStopped = true;
            if (this.startTouch.length >= 2) {
                GestureLog.log("目前限制为2点触控");
                return;
            }

            let touch = GestureTouchData.create(evt.pos.x, evt.pos.y);
            // console.log(`创建touch[${touch.hashCode}]`)
            this.startTouch.push(touch);
            if (this.startTouch.length >= 2) {
                GestureManager.isMove = true;
            }

            let moveEvtFun = (moveEvt: FEvent) => {
                // moveEvt.stopPropagation();
                moveEvt.propagationImmediateStopped = true; // 这里要阻止单指滑动的事件
                if (this.startTouch.length <= 0) {
                    GestureLog.warn(`startTouch存储异常，[空]`);
                    return;
                }
                let [sTouch1, sTouch2] = this.startTouch;
                if (sTouch1 && sTouch2) {
                    GestureManager.isMove = true;
                }

                // 两个触点，就注册了两个move事件。
                // 当一个触点在移动时，两个moveEvtFun都会响应。
                // 此时就要找到正确的touch进行<划动点赋值>
                let dis1 = 0, dis2 = 0;
                if (sTouch1) {
                    dis1 = Vec2.len(v2(moveEvt.pos.x - (sTouch1.endX || sTouch1.beginX), moveEvt.pos.y - (sTouch1.endY || sTouch1.beginY)));
                }
                if (sTouch2) {
                    dis2 = Vec2.len(v2(moveEvt.pos.x - (sTouch2.endX || sTouch2.beginX), moveEvt.pos.y - (sTouch2.endY || sTouch2.beginY)));
                }
                // 距离谁近就是谁的滑动值（毕竟滑动嘛，总不可能坐标一下子跳很远，跳很远还叫滑动吗？？？对吧~）
                if (sTouch1 && !sTouch2) {
                    sTouch1.endX = moveEvt.pos.x;
                    sTouch1.endY = moveEvt.pos.y;
                    // console.log(`touch[${touch.hashCode}]滑动(逻辑1)，坐标：[${moveEvt.pos.x}, ${moveEvt.pos.y}]`)
                } else if (sTouch2 && !sTouch1) {
                    sTouch2.endX = moveEvt.pos.x;
                    sTouch2.endY = moveEvt.pos.y;
                    // console.log(`touch[${touch.hashCode}]滑动(逻辑2)，坐标：[${moveEvt.pos.x}, ${moveEvt.pos.y}]`)
                } else if (dis1 <= dis2) {
                    sTouch1.endX = moveEvt.pos.x;
                    sTouch1.endY = moveEvt.pos.y;
                    // console.log(`touch[${touch.hashCode}]滑动(逻辑3)，坐标：[${moveEvt.pos.x}, ${moveEvt.pos.y}]`)
                } else {
                    sTouch2.endX = moveEvt.pos.x;
                    sTouch2.endY = moveEvt.pos.y;
                    // console.log(`touch[${touch.hashCode}]滑动(逻辑4)，坐标：[${moveEvt.pos.x}, ${moveEvt.pos.y}]`)
                }

                if (!this.isCompute) {
                    this.computeScale();
                }
            }

            let endEvtFun = (endEvt: FEvent) => {
                endEvt.propagationStopped = true;
                GestureManager.isMove = false;
                target.node.off(FEvent.TOUCH_MOVE, moveEvtFun);
                GRoot.inst.node.off(FEvent.TOUCH_MOVE, moveEvtFun);
                GRoot.inst.node.off(FEvent.TOUCH_END, endEvtFun);

                // console.log(`touch[${touch.hashCode}]弹起`)
                if (touch == this.startTouch[0]) {
                    this.startTouch.shift();
                } else if (touch == this.startTouch[1]) {
                    this.startTouch.pop();
                } else {
                    let idx = this.startTouch.indexOf(touch);
                    GestureLog.warn(`startTouch存储异常，下标[${idx}]`);
                }
                delete evtFunMap[touch.hashCode];
                touch.recover();
                if (this.onComplete) {
                    this.onComplete();
                }
            }

            evtFunMap[touch.hashCode] = {
                moveFun: moveEvtFun,
                endFun: endEvtFun,
            }

            target.node.on(FEvent.TOUCH_MOVE, moveEvtFun);
            GRoot.inst.node.on(FEvent.TOUCH_MOVE, moveEvtFun);
            GRoot.inst.node.on(FEvent.TOUCH_END, endEvtFun);
        });

        // 回收时执行
        this.removeEvt = () => {
            target.node.off(FEvent.TOUCH_BEGIN);
            target.node.off(FEvent.TOUCH_MOVE);
            this.startTouch.length = 0;
            this.isCompute = null;
            for (let k in evtFunMap) {
                let { moveFun, endFun } = evtFunMap[k];
                GRoot.inst.node.off(FEvent.TOUCH_MOVE, moveFun);
                GRoot.inst.node.off(FEvent.TOUCH_END, endFun);
            }
        }
    }

    /** 计算当前双指缩放量并回调给外部 */
    private computeScale(): void {

        // 缩放逻辑：
        // 只要两点坐标的距离越来越远，那就是放大，反之就是缩小
        let [sTouch1, sTouch2] = this.startTouch;

        // 如果有个触点还没开始move 此时是没有end坐标的
        if (!sTouch1 || !sTouch2) return;
        if (null == sTouch1.endX || null == sTouch1.endY || null == sTouch2.endX || null == sTouch2.endY) {
            return;
        }

        this.isCompute = true;
        // 两点间按下时的初始距离
        let dis1 = Vec2.len(v2(sTouch2.beginX - sTouch1.beginX, sTouch2.beginY - sTouch1.beginY));
        // 两点间滑动后的距离
        let dis2 = Vec2.len(v2(sTouch2.endX - sTouch1.endX, sTouch2.endY - sTouch1.endY));
        // 缩放变化量
        let scale = dis2 / dis1 - 1;
        let centerX = (sTouch1.beginX + sTouch2.beginX) / 2;
        let centerY = (sTouch1.beginY + sTouch2.beginY) / 2;
        if (!Extend.isNull(scale)) {          //这里有时候会计算到scale是NAN，避免影响模块导致错误
            this.onUpdate({ scaleCode: scale, centerPos: { x: centerX, y: centerY } });
        }
        this.isCompute = false;
    }
}
