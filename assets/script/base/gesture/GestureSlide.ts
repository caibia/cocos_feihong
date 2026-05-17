
/**
*Author  : XW
*Desc    : 滑动手势脚本
*/

import { GObject } from "../../fairyGUI/GObject";
import { GRoot } from "../../fairyGUI/GRoot";
import { FEvent } from "../../fairyGUI/event/Event";
import BaseGesture from "./BaseGesture";
import { GESTURETYPE, GESTURE_SLIDETYPE, GestureArg } from "./GestureDefine";
import GestureLog from "./GestureLog";
import GestureTouchData from "./GestureTouchData";

/**滑动手势脚本 */
export default class GestureSlide extends BaseGesture {
    /** 滑动方向判定允许的最大切线值 */
    private static MAX_TANGENT = Math.tan(30 * Math.PI / 180);   //delaY和deltaX构成的角度不要超过30度

    /** 触发手势的最小距离 */
    public deviation: number = 200;

    /**
     * 创建滑动手势。
     * @param type 手势类型。
     * @param target 目标对象。
     * @param onUpdate 手势进行中的回调。
     * @param onComplete 手势完成回调。
     */
    createGesture(type: GESTURETYPE, target: GObject, onUpdate?: (arg?: GestureArg) => void, onComplete?: (arg?: GestureArg) => void) {
        super.createGesture(type, target, onUpdate, onComplete);
        if (!onComplete) {
            GestureLog.warn("[滑动手势]注册失败！原因：未注册[onComplete]回调，该回调为必传参数")
        }

        let endEvtFun: (evt: FEvent) => void;
        target.node.on(FEvent.TOUCH_BEGIN, (evt: FEvent) => {
            let touch = GestureTouchData.create(evt.pos.x, evt.pos.y, 1000);
            endEvtFun = (evt: FEvent) => {
                // evt.stopPropagation();
                this.onSlide(evt, type, touch);
                GRoot.inst.node.off(FEvent.TOUCH_END, endEvtFun);
                target.node.off(FEvent.TOUCH_END, endEvtFun);
            }
            GRoot.inst.node.once(FEvent.TOUCH_END, endEvtFun);
            target.node.once(FEvent.TOUCH_END, endEvtFun);
        });

        // 回收时执行
        this.removeEvt = () => {
            target.node.off(FEvent.TOUCH_BEGIN)
            target.node.off(FEvent.TOUCH_END);
            if (endEvtFun) {
                GRoot.inst.node.off(FEvent.TOUCH_END, endEvtFun);
            }
        }
    }

    /**
     * 根据触摸轨迹计算滑动方向并触发完成回调。
     * @param evt 触摸结束事件对象。
     * @param type 手势类型。
     * @param touch 触摸数据对象。
     */
    private onSlide(evt: FEvent, type: GESTURETYPE, touch: GestureTouchData): void {
        if (touch.isOver) { // 可能是超时了...
            touch.recover();
            return;
        }

        touch.respond();
        let { x: ePx, y: ePy } = evt.pos;
        if (type == GESTURETYPE.ROWSLIDE) { // 计算横向
            let deviation = Math.abs(ePx - touch.beginX)
            if (deviation >= this.deviation) {
                let dValueX = Math.abs(ePx - touch.beginX);
                let dValueY = Math.abs(ePy - touch.beginY);
                if ((dValueY / dValueX) <= GestureSlide.MAX_TANGENT) {
                    if (ePx > touch.beginX) {
                        this.onComplete({ slideCode: GESTURE_SLIDETYPE.RIGHT });
                    } else {
                        this.onComplete({ slideCode: GESTURE_SLIDETYPE.LEFT });
                    }
                }
            } else {
                // GestureLog.log(`横向划动距离[${deviation}]不足以触发滑动手势`);
            }
        } else if (type == GESTURETYPE.COLUMNSLIDE) { // 计算纵向
            let deviation = Math.abs(ePy - touch.beginY)
            if (deviation >= this.deviation) {
                let dValueX = Math.abs(ePx - touch.beginX);
                let dValueY = Math.abs(ePy - touch.beginY);
                if ((dValueX / dValueY) <= GestureSlide.MAX_TANGENT) {
                    if (ePy > touch.beginY) {
                        this.onComplete({ slideCode: GESTURE_SLIDETYPE.DOWN });
                    } else {
                        this.onComplete({ slideCode: GESTURE_SLIDETYPE.UP });
                    }
                }
            } else {
                // GestureLog.log(`纵向划动距离[${deviation}]不足以触发滑动手势`);
            }
        }
        touch.recover();
    }
}
