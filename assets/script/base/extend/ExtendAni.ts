/**
*Author  : XW
*Desc    : 
*/

import { Tween, TweenEasing } from "cc";
import TimerUnit from "../unit/TimerUnit";
import TweenUnit from "../unit/TweenUnit";
import { GTextField } from "../../fairyGUI/GTextField";
import { GList } from "../../fairyGUI/GList";
import { ListLayoutType } from "../../fairyGUI/FieldTypes";
import { GObject } from "../../fairyGUI/GObject";

/** 列表的缓动表现形式集 */
export const enum LIST_TWEENDIRECTION_TYPE {
    /** 纵向列表 从右往左逐条出现 */
    FromRightToLeftVertical = 1,
    /** 纵向列表 从左往右逐条出现 */
    FromLeftToRightVertical,
    /** 横向列表 从上往下逐条出现 */
    FromTopToBottomHorizontal,
    /** 横向列表 从下往上逐条出现 */
    FromBottomToTopHorizontal,
    /** 横向列表 从右往左逐条出现 */
    FromRightToLeftHorizontalQueue,
    /** 纵向列表 从下往上逐条出现 */
    FromBottomToTopVerticalQueue,
    /** 纵向列表 从上往下逐条出现（弹性） */
    FromTopToBottomVerticalSpring,
    /** 横向流动列表 从右往左逐条出现 */
    FromRightToLeftFlowHorizontal,
    /** 横向流动列表 从下往上逐条出现 */
    FromBottomToTopFlowHorizontal,
    /** 横向流动列表 从右往左队列式逐条出现 */
    FromRightToLeftFlowHorizontalQueue,
    /** 横向流动列表 从下往上队列式逐条出现 */
    FromBottomToTopFlowHorizontalQueue,
    /** 纵向流动列表 从右往左逐条出现 */
    FromRightToLeftFlowVertical,
    /** 纵向流动列表 从下往上逐条出现 */
    FromBottomToTopFlowVertical,
    /** 纵向流动列表 从右往左队列式逐条出现 */
    FromRightToLeftFlowVerticalQueue,
    /** 纵向流动列表 从下往上队列式逐条出现 */
    FromBottomToTopFlowVerticalQueue,
    /** 横向流动列表 从上往下逐条退出 */
    ReverseBottomToTopFlowHorizontalQueue = FromBottomToTopFlowHorizontalQueue + 10000,
    /** 纵向列表 从上往下逐条退出 */
    ReverseBottomToTopVertical = FromBottomToTopVerticalQueue + 10000
}

interface IXComponent {
    tweenUnit: TweenUnit;
    timerUnit: TimerUnit;
}

type ANIEXTRA = {
    /** 动画从开始到结束执行的时长 秒为单位 毫秒请用小数 */
    aniTime?: number,
    /** 下一个动画在什么时候开始执行 范围从0~1 比如1表示上一个动画执行完之后开始执行下一个动画 0.5表示上一个动画执行完一半开始执行下一个动画 */
    delay?: number,
    /** 缓动函数 如: 'quadOut' */
    easing?: TweenEasing,
    /** 动画的表现形式 */
    direction?: number,
    /** 完成动画后的回调 默认会在最后一个动作结束后进行调用 */
    complete?: Function,
    /** 延时回调 在动画完成后延时再进行回调 */
    completeDelay?: number,
    /** 一些特殊动画需要的值（有需要再在这里进行拓展） */
    props?: {
        /** 起始大小 */
        startScale: number,
        /** 结束大小 */
        endScale: number,
        /** 起始透明度 */
        startAlpha: number,
        /** 结束透明度 */
        endAlpha: number
    }
}

/** 拓展动画类 */
export default class ExtendAni {

    /**
     * 数字动态变化
     * @param ui 当前界面的this指针
     * @param textField 变化的文本组件
     * @param startNum 其实数字
     * @param endNum 最终数字
     * @param onComplete 完成回调
     * @param isContinue 如果动画还没跑完，再次调用该接口，起点数值是否接着跑
     * @param prefix 数值前缀
     * @returns 
     */
    public static tweenTextField(ui: IXComponent, textField: GTextField, startNum: number, endNum: number, onComplete?: () => void, isContinue: boolean = true, prefix: string = "", backfix: string = ""): void {
        Tween.stopAllByTarget(textField); // 先停掉动画 - 避免动画显示异常

        let changeNum: number = Math.abs(endNum - startNum);
        if (changeNum <= 1) {
            textField.text = endNum + "";
            onComplete && onComplete();
            return;
        }

        let changeSec = Math.log(changeNum); // 倍率：以常数e为底数的对数函数
        changeSec = Number((changeSec / 10).toFixed(1)); // JS里底数固定为常数e的，所以倍率/10 看上去比较舒服

        // 把变化属性挂在textField上  方便停止动画
        textField["$_tweenCode"] = isContinue ? textField["$_tweenCode"] || startNum : startNum;

        let tw = ui.tweenUnit.getTween(textField);
        tw.to(changeSec, { $_tweenCode: endNum }, {
            onUpdate: () => {
                textField.text = prefix + Math.floor(textField["$_tweenCode"]) + backfix;
            }
        }).call(() => {
            textField["$_tweenCode"] = null;
            onComplete && onComplete();
        }).start();
    }

    /** list 每个item展开的特效
     * @param ui  当前界面的this指针
     * @param list  需要展示动画的list
     * @param extra 动画参数对象
     */
    public static tweenListUnfold(ui: IXComponent, list: GList, extra?: ANIEXTRA) {
        let aniTime = extra && extra.aniTime ? extra.aniTime : 0.25;
        let delay = extra && extra.delay ? extra.delay : 0;
        let direction = extra && extra.direction ? extra.direction : 0;
        let complete = extra && extra.complete ? extra.complete : () => { };
        let completeDelay = extra && extra.completeDelay ? extra.completeDelay : 0;
        let easing = extra && extra.easing ? extra.easing : "quadOut";
        //重置数据集合 因为设置了 setPivot 为中心点，所以需要重置回原来的位置，否则会出现按钮点击位置偏差
        let resetDataArr: { item: GObject, pivotX: number, pivotY: number, pivotAsAnchor: boolean }[] = [];
        // list.touchable = false;
        for (let i = 0; i < list.numChildren; i++) {
            let item = list.getChildAt(i);
            // cc.Tween.stopAllByTarget(item);	//	注释备用
            let tw = ui.tweenUnit.getTween(item);
            resetDataArr.push({ item: item, pivotX: item.pivotX, pivotY: item.pivotY, pivotAsAnchor: item.pivotAsAnchor, });
            item.setPivot(0.5, 0.5);
            let values = {};
            if (direction == 0) {
                //	上下展开
                item.scaleY = 0;
                values = { scaleY: 1 };
            } else {
                //	左右展开
                item.scaleX = 0;
                values = { scaleX: 1 };
            }
            if (i == list.numChildren - 1) {
                tw.delay(aniTime * delay * i).to(aniTime, values, { easing: easing }).delay(completeDelay).call(() => {
                    while (resetDataArr.length > 0) {
                        let idx = resetDataArr.length - 1;
                        let data = resetDataArr.splice(idx, 1)[0];
                        data.item.setPivot(data.pivotX, data.pivotY);
                    }
                    // list.touchable = true;
                    complete && complete();
                }).start();
            } else {
                tw.delay(aniTime * delay * i).to(aniTime, values, { easing: easing }).start();
            }
        }
    }

    /** list 每个item缩放的特效
     * @param ui  当前界面的this指针
     * @param list  需要展示动画的list
     * @param extra 动画参数对象
     */
    public static tweenListScale(ui: IXComponent, list: GList, extra?: ANIEXTRA) {// aniTime: number = 0.25, delay: number = 0, scale: number = 1.2, easing: string = 'quadOut') {
        let aniTime = extra && extra.aniTime ? extra.aniTime : 0.25;
        let delay = extra && extra.delay ? extra.delay : 0;
        let startScale = extra && extra.props && extra.props.startScale ? extra.props.startScale : 1.2;
        let endScale = extra && extra.props && extra.props.endScale ? extra.props.endScale : 1;
        let startAlpha = extra && extra.props && extra.props.startAlpha ? extra.props.startAlpha : 0;
        let endAlpha = extra && extra.props && extra.props.endAlpha ? extra.props.endAlpha : 1;
        let complete = extra && extra.complete ? extra.complete : () => { };
        let completeDelay = extra && extra.completeDelay ? extra.completeDelay : 0;
        let easing = extra && extra.easing ? extra.easing : "quadOut";
        //重置数据集合 因为设置了 setPivot 为中心点，所以需要重置回原来的位置，否则会出现按钮点击位置偏差
        let resetDataArr: { item: GObject, pivotX: number, pivotY: number, pivotAsAnchor: boolean }[] = [];
        // list.touchable = false;
        for (let i = 0; i < list.numChildren; i++) {
            let item = list.getChildAt(i);
            let tw = ui.tweenUnit.getTween(item);
            resetDataArr.push({ item: item, pivotX: item.pivotX, pivotY: item.pivotY, pivotAsAnchor: item.pivotAsAnchor, });
            item.setPivot(0.5, 0.5);
            item.alpha = startAlpha;
            item.scaleX = item.scaleY = startScale;
            let values = { scaleX: endScale, scaleY: endScale, alpha: endAlpha };
            if (i == list.numChildren - 1) {
                tw.delay(aniTime * delay * i).to(aniTime, values, { easing: easing }).delay(completeDelay).call(() => {
                    while (resetDataArr.length > 0) {
                        let idx = resetDataArr.length - 1;
                        let data = resetDataArr.splice(idx, 1)[0];
                        data.item.setPivot(data.pivotX, data.pivotY);
                    }
                    // list.touchable = true;
                    complete();
                }).start();
            } else {
                tw.delay(aniTime * delay * i).to(aniTime, values, { easing: easing }).start();
            }
        }
    }

    /** list 每个item从指定方向出现 作用于纵向列表
     * @param list 			GList       需要展示动画的list
     * @param extra.aniTime 		number      动画从开始到结束执行的时长 秒为单位 毫秒请用小数
     * @param extra.delay 		number      下一个动画在什么时候开始执行 范围从0~1 比如1表示上一个动画执行完之后开始执行下一个动画 0.5表示上一个动画执行完一半开始执行下一个动画
     * @param extra.direction 	number      动画的表现形式 参考：ListTweenDirection(注意：因为算法可能会无限拓展 所以传入此参数请用枚举ListTweenDirection 不要直接传数值)
     * @param extra.complete      function    完成动画后的回调 默认会在最后一个动作结束后进行调用
     * @param extra.completeDelay number      延时回调 在动画完成后延时再进行回调
     * @param extra.easing		string      缓动函数 如: 'quadOut'
     */
    public static tweenAppearFromOneSide(ui: IXComponent, list: GList, extra?: ANIEXTRA) {//aniTime: number = 0.2, delay: number = 0.3, direction: number = -1, complete: Function = () => { },
        // completeDelay: number = 0, easing: string = 'quadOut') {
        if (!list) return;
        let aniTime = extra && (extra.aniTime >= 0) ? extra.aniTime : 0.25;
        let delay = extra && (extra.delay >= 0) ? extra.delay : 0.3;
        let direction = extra && extra.direction ? extra.direction : -1;
        let complete = extra && extra.complete ? extra.complete : () => { };
        let completeDelay = extra && extra.completeDelay ? extra.completeDelay : 0;
        let easing = extra && extra.easing ? extra.easing : "quadOut";
        let special = false;
        list.touchable = false;
        for (let i = 0; i < list.numChildren; i++) {
            let item = list.getChildAt(i);
            // cc.Tween.stopAllByTarget(item);
            let tw = ui.tweenUnit.getTween(item);
            item.setPivot(0, 0);

            let values = {};
            let dValue = 0;
            let index = i;
            if (direction == -1) {
                //	如果没有指定动画 则根据列表类型赋值一个默认动画(目前只针对单列横排和单列竖排 后续有需求再继续扩展)
                switch (list.layout) {
                    case ListLayoutType.SingleColumn:
                        direction = LIST_TWEENDIRECTION_TYPE.FromRightToLeftVertical;
                        break;
                    case ListLayoutType.SingleRow:
                        direction = LIST_TWEENDIRECTION_TYPE.FromRightToLeftHorizontalQueue;
                        break;
                    case ListLayoutType.FlowHorizontal:
                        direction = LIST_TWEENDIRECTION_TYPE.FromRightToLeftFlowHorizontal;
                        break;
                    case ListLayoutType.FlowVertical:
                        direction = LIST_TWEENDIRECTION_TYPE.FromBottomToTopFlowVertical;
                        break;
                }
            }
            switch (direction) {
                case LIST_TWEENDIRECTION_TYPE.FromRightToLeftVertical:
                    item.x = list.width;
                    values = { x: 0 };
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromLeftToRightVertical:
                    item.x = -item.width;
                    values = { x: 0 };
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromTopToBottomHorizontal:
                    item.y = -item.height;
                    values = { y: 0 };
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromBottomToTopHorizontal:
                    item.y = list.height;
                    values = { y: 0 };
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromRightToLeftHorizontalQueue:
                    dValue = i * (item.width + list.columnGap);
                    item.x = list.width + dValue;
                    values = { x: dValue };
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromBottomToTopVerticalQueue:
                    dValue = i * (item.height + list.lineGap);
                    item.y = list.height + dValue;
                    values = { y: dValue };
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromRightToLeftFlowHorizontal:
                    {
                        let itemWidth = item.width + list.columnGap;
                        dValue = Math.floor(i % Math.round(list.width / itemWidth)) * itemWidth;
                        item.x = list.width;
                        values = { x: dValue };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromBottomToTopFlowHorizontal:
                    {
                        let itemWidth = item.width + list.columnGap;
                        let itemHeight = item.height + list.lineGap;
                        dValue = Math.floor(i / Math.round(list.width / itemWidth)) * itemHeight;
                        item.y = list.height + dValue;
                        values = { y: dValue };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromRightToLeftFlowHorizontalQueue:
                    {
                        let itemWidth = item.width + list.columnGap;
                        index = Math.floor(i % Math.round(list.width / itemWidth));
                        dValue = index * itemWidth;
                        item.x = list.width;
                        values = { x: dValue };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromBottomToTopFlowHorizontalQueue:
                    {
                        let itemWidth = item.width + list.columnGap;
                        let itemHeight = item.height + list.lineGap;
                        index = Math.floor(i / Math.round(list.width / itemWidth));
                        dValue = index * itemHeight;
                        item.y = list.height + dValue;
                        values = { y: dValue };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromRightToLeftFlowVertical:
                    {
                        let itemWidth = item.width + list.columnGap;
                        let itemHeight = item.height + list.lineGap;
                        let average = Math.floor((list.numChildren + 1) / 2);
                        if (i % 2 == 0) {
                            index = Math.floor(i / 2);
                        } else {
                            index = i + average - Math.floor((i + 1) / 2);
                        }
                        dValue = Math.floor(i / Math.round(list.height / itemHeight)) * itemWidth;
                        item.x = list.width + dValue;
                        values = { x: dValue };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromBottomToTopFlowVertical:
                    {
                        let itemHeight = item.height + list.lineGap;
                        dValue = Math.floor(i % Math.round(list.height / itemHeight)) * itemHeight;
                        item.y = list.height;
                        values = { y: dValue };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromRightToLeftFlowVerticalQueue:
                    {
                        let itemWidth = item.width + list.columnGap;
                        let itemHeight = item.height + list.lineGap;
                        index = Math.floor(i / Math.round(list.height / itemHeight));
                        dValue = index * itemWidth;
                        item.x = list.width + dValue;
                        values = { x: dValue };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromBottomToTopFlowVerticalQueue:
                    {
                        let itemHeight = item.height + list.lineGap;
                        index = Math.floor(i % Math.round(list.height / itemHeight));
                        dValue = index * itemHeight;
                        item.y = list.height;
                        values = { y: dValue };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.ReverseBottomToTopFlowHorizontalQueue:
                    {
                        let itemWidth = item.width + list.columnGap;
                        let itemHeight = item.height + list.lineGap;
                        index = Math.floor((list.numChildren + 1) / 2) - Math.floor(i / Math.round(list.width / itemWidth)) - 1;
                        dValue = index * itemHeight;
                        values = { y: list.height };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.ReverseBottomToTopVertical:
                    {
                        index = list.numChildren - 1 - i;
                        values = { y: list.height };
                    }
                    break;
                case LIST_TWEENDIRECTION_TYPE.FromTopToBottomVerticalSpring:
                    {
                        special = true;
                        item.y = (-item.height) + (item.height + list.lineGap) * i;
                        item.alpha = 0;
                        dValue = (item.height + list.lineGap) * i + 20;
                        values = { y: dValue, alpha: 1 };
                        let values1 = { y: dValue - 20 };
                        if (i == list.numChildren - 1) {
                            tw.delay(aniTime * delay * index).to(aniTime, values, { easing: easing }).to(aniTime, values1, { easing: easing }).delay(completeDelay).call(() => { list.touchable = true; complete(); }).start();
                        } else {
                            tw.delay(aniTime * delay * index).to(aniTime, values, { easing: easing }).to(aniTime, values1, { easing: easing }).start();
                        }
                    }
                    break;
            }

            if (!special) {
                if (easing) {
                    if (i == list.numChildren - 1) {
                        tw.delay(aniTime * delay * index).to(aniTime, values, { easing: easing }).delay(completeDelay).call(() => { list.touchable = true; complete(); }).start();
                    } else {
                        tw.delay(aniTime * delay * index).to(aniTime, values, { easing: easing }).start();
                    }
                } else {
                    if (i == list.numChildren - 1) {
                        tw.delay(aniTime * delay * index).to(aniTime, values).delay(completeDelay).call(() => { list.touchable = true; complete(); }).start();
                    } else {
                        tw.delay(aniTime * delay * index).to(aniTime, values).start();
                    }
                }
            }
        }
    }
}


window["ExtendAni"] = ExtendAni;