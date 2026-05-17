/**
*Author  : XW
*Desc    : 手势单元，负责在对象上注册、缓存和释放各类手势能力
*/

import { GObject } from "../../fairyGUI/GObject";
import BaseGesture from "../gesture/BaseGesture";
import { GESTURETYPE, GESTURE_SLIDETYPE, GestureArg } from "../gesture/GestureDefine";
import GestureManager from "../gesture/GestureManager";

/** 手势工具 */
export default class GestureUnit {

    /** 正在监听手势中... */
    public gestListen: boolean = true;
    private gestureMap: { [type: number]: { [uuid: number]: BaseGesture } } = {};

    constructor() {

    }

    /**
     * 横向滑动
     * @param target 
     * @param onLeft 左滑回调
     * @param onRight 右滑回调
     * @returns 
     */
    public rowSlide(target: GObject, onLeft: () => void, onRight: () => void) {
        let gestType = GESTURETYPE.ROWSLIDE;
        if (this.gestureMap[gestType] && this.gestureMap[gestType][target.id]) {
            return; // 重复注册
        }

        let gesture = GestureManager.inst.createGesture(target, gestType, undefined, (arg?: GestureArg) => {
            if (!this.gestListen) return;
            if (arg.slideCode == GESTURE_SLIDETYPE.LEFT) {
                onLeft();
            } else if (arg.slideCode == GESTURE_SLIDETYPE.RIGHT) {
                onRight();
            }
        })

        if (!this.gestureMap[gestType]) {
            this.gestureMap[gestType] = {};
        }
        this.gestureMap[gestType][target.id] = gesture;
        return gesture;
    }

    /**
     * 纵向滑动
     * @param target 
     * @param onUp 上滑回调
     * @param onDown 下滑回调
     * @returns 
     */
    public columnSlide(target: GObject, onUp: () => void, onDown: () => void): void {
        let gestType = GESTURETYPE.ROWSLIDE;
        if (this.gestureMap[gestType] && this.gestureMap[gestType][target.id]) {
            return; // 重复注册
        }

        let gesture = GestureManager.inst.createGesture(target, gestType, undefined, (arg?: GestureArg) => {
            if (!this.gestListen) return;
            if (arg.slideCode == GESTURE_SLIDETYPE.UP) {
                onUp();
            } else if (arg.slideCode == GESTURE_SLIDETYPE.DOWN) {
                onDown();
            }
        })

        if (!this.gestureMap[gestType]) {
            this.gestureMap[gestType] = {};
        }
        this.gestureMap[gestType][target.id] = gesture;
    }

    /**
     * 缩放
     * @param target 
     * @param minScaleX 
     * @param minScaleY 
     * @param maxScaleX 
     * @param maxScaleY 
     * @param onUpdate 缩放过程回调（传入此参数将覆盖原有的缩放逻辑）
     * @param onComplete 缩放结束回调（传入此参数将覆盖原有的缩放逻辑）
     * @returns 
     */
    public scale(target: GObject, onUpdate?: (scaleX: number, scaleY: number, centerPos: any) => void, onComplete?: () => void, minScaleX: number = 0.5, minScaleY: number = 0.5, maxScaleX: number = 2, maxScaleY: number = 2): void {
        let gestType = GESTURETYPE.SCALE;
        if (this.gestureMap[gestType] && this.gestureMap[gestType][target.id]) {
            return; // 重复注册
        }
        let currScaleX = target.scaleX;
        let currScaleY = target.scaleY;
        let gesture = GestureManager.inst.createGesture(target, gestType, (arg?: GestureArg) => {
            if (!this.gestListen) return;
            let changeScleX = currScaleX + arg.scaleCode;
            let changeScleY = currScaleY + arg.scaleCode;
            // 缩放X限制范围
            changeScleX = Math.max(minScaleX, changeScleX);
            changeScleX = Math.min(maxScaleX, changeScleX);
            // 缩放Y限制范围
            changeScleY = Math.max(minScaleY, changeScleY);
            changeScleY = Math.min(maxScaleY, changeScleY);
            if (onUpdate) {
                // target.setScale(changeScleX, changeScleY)
                onUpdate(changeScleX, changeScleY, arg.centerPos);
            }

        }, (arg?: GestureArg) => {
            if (!this.gestListen) return;
            currScaleX = target.scaleX;
            currScaleY = target.scaleY;
            if (onComplete) {
                onComplete();
            }
        });

        if (!this.gestureMap[gestType]) {
            this.gestureMap[gestType] = {};
        }
        this.gestureMap[gestType][target.id] = gesture;
    }

    public dispose(): void {
        for (let type in this.gestureMap) {
            let gestureInfo = this.gestureMap[type];
            for (let id in gestureInfo) {
                let gesture = gestureInfo[id];
                gesture.recover();
            }
        }
    }

}
