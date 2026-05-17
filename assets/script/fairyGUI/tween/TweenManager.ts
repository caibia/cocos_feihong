import { director, game, macro, Node } from "cc";
import { GObject } from "../GObject";
import { Pool } from "../utils/Pool";
import { GTweener } from "./GTweener";

/**
 * 补间调度器，负责统一驱动所有 GTweener 的更新与回收。
 */
export class TweenManager {
    /**
     * 创建并初始化一个 GTweener 实例。
     * @returns 可立即配置的补间器实例。
     */
    public static createTween(): GTweener {
        if (!_root) {
            _root = new Node("[TweenManager]");
            game.addPersistRootNode(_root);
            director.getScheduler().schedule(TweenManager.update, _root, 0, macro.REPEAT_FOREVER, 0, false);
        }

        var tweener: GTweener = _tweenerPool.borrow();
        _activeTweens[_totalActiveTweens++] = tweener;

        return tweener;
    }

    /**
     * 判断目标对象当前是否存在正在运行的补间。
     * @param target 目标对象。
     * @param propType 可选属性类型过滤条件。
     * @returns 是否存在命中条件的补间。
     */
    public static isTweening(target: any, propType?: any): boolean {
        if (target == null)
            return false;

        var anyType: boolean = !propType;
        for (var i: number = 0; i < _totalActiveTweens; i++) {
            var tweener: GTweener = _activeTweens[i];
            if (tweener && tweener.target == target && !tweener._killed
                && (anyType || tweener._propType == propType))
                return true;
        }

        return false;
    }

    /**
     * 停止匹配条件的全部补间任务。
     * @param target 目标对象。
     * @param completed 是否先补到完成态再终止。
     * @param propType 可选属性类型过滤条件。
     * @returns 是否至少终止了一个补间任务。
     */
    public static killTweens(target: any, completed?: boolean, propType?: any): boolean {
        if (target == null)
            return false;

        var flag: boolean = false;
        var cnt: number = _totalActiveTweens;
        var anyType: boolean = !propType;
        for (var i: number = 0; i < cnt; i++) {
            var tweener: GTweener = _activeTweens[i];
            if (tweener && tweener.target == target && !tweener._killed
                && (anyType || tweener._propType == propType)) {
                tweener.kill(completed);
                flag = true;
            }
        }

        return flag;
    }

    /**
     * 返回命中条件的补间实例。
     * @param target 目标对象。
     * @param propType 可选属性类型过滤条件。
     * @returns 命中的补间实例；未找到时返回空值。
     */
    public static getTween(target: any, propType?: any): GTweener {
        if (target == null)
            return null;

        var cnt: number = _totalActiveTweens;
        var anyType: boolean = !propType;
        for (var i: number = 0; i < cnt; i++) {
            var tweener: GTweener = _activeTweens[i];
            if (tweener && tweener.target == target && !tweener._killed
                && (anyType || tweener._propType == propType)) {
                return tweener;
            }
        }

        return null;
    }

    /**
     * 刷新当前对象的显示结果或内部状态。
     * @param dt 本帧时间增量。
     * @returns 当前更新循环是否需要继续保留调度。
     */
    private static update(dt: number): boolean {
        let tweens: Array<GTweener> = _activeTweens;
        var cnt: number = _totalActiveTweens;
        var freePosStart: number = -1;
        for (var i: number = 0; i < cnt; i++) {
            var tweener: GTweener = tweens[i];
            if (tweener == null) {
                if (freePosStart == -1)
                    freePosStart = i;
            }
            else if (tweener._killed) {
                tweener._reset();
                _tweenerPool.returns(tweener);
                tweens[i] = null;

                if (freePosStart == -1)
                    freePosStart = i;
            }
            else {
                if (tweener._target && ('isDisposed' in tweener._target) && tweener._target.isDisposed)
                    tweener._killed = true;
                else if (!tweener._paused)
                    tweener._update(dt);

                if (freePosStart != -1) {
                    tweens[freePosStart] = tweener;
                    tweens[i] = null;
                    freePosStart++;
                }
            }
        }

        if (freePosStart >= 0) {
            if (_totalActiveTweens != cnt) //new tweens added
            {
                var j: number = cnt;
                cnt = _totalActiveTweens - cnt;
                for (i = 0; i < cnt; i++)
                    tweens[freePosStart++] = tweens[j++];
            }
            _totalActiveTweens = freePosStart;
        }

        return false;
    }
}

var _activeTweens: GTweener[] = new Array();
var _tweenerPool: Pool<GTweener> = new Pool<GTweener>(GTweener, e => e._init(), e => e._reset());
var _totalActiveTweens: number = 0;
var _inited: boolean = false;
var _root: Node;
