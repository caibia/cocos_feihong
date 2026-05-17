import { GTweener } from "./GTweener";
import { TweenManager } from "./TweenManager";

/**
 * 补间静态入口，提供创建、查询和停止补间任务的便捷 API。
 */
export class GTween {
    /**
     * 是否捕获补间回调内部异常。
     */
    public static catchCallbackExceptions: boolean = true;

    /**
     * 配置一维数值补间的起止值。
     * @param start 起始值。
     * @param end 结束值。
     * @param duration 补间持续时间。
     * @returns 新创建的补间器。
     */
    public static to(start: number, end: number, duration: number): GTweener {
        return TweenManager.createTween()._to(start, end, duration);
    }

    /**
     * 配置二维数值补间的起止值。
     * @param start 第一维起始值。
     * @param start2 第二维起始值。
     * @param end 第一维结束值。
     * @param end2 第二维结束值。
     * @param duration 补间持续时间。
     * @returns 新创建的补间器。
     */
    public static to2(start: number, start2: number, end: number, end2: number, duration: number): GTweener {
        return TweenManager.createTween()._to2(start, start2, end, end2, duration);
    }

    /**
     * 配置三维数值补间的起止值。
     * @param start 第一维起始值。
     * @param start2 第二维起始值。
     * @param start3 第三维起始值。
     * @param end 第一维结束值。
     * @param end2 第二维结束值。
     * @param end3 第三维结束值。
     * @param duration 补间持续时间。
     * @returns 新创建的补间器。
     */
    public static to3(start: number, start2: number, start3: number,
        end: number, end2: number, end3: number, duration: number): GTweener {
        return TweenManager.createTween()._to3(start, start2, start3, end, end2, end3, duration);
    }

    /**
     * 配置四维数值补间的起止值。
     * @param start 第一维起始值。
     * @param start2 第二维起始值。
     * @param start3 第三维起始值。
     * @param start4 第四维起始值。
     * @param end 第一维结束值。
     * @param end2 第二维结束值。
     * @param end3 第三维结束值。
     * @param end4 第四维结束值。
     * @param duration 补间持续时间。
     * @returns 新创建的补间器。
     */
    public static to4(start: number, start2: number, start3: number, start4: number,
        end: number, end2: number, end3: number, end4: number, duration: number): GTweener {
        return TweenManager.createTween()._to4(start, start2, start3, start4, end, end2, end3, end4, duration);
    }

    /**
     * 配置颜色补间的起止值。
     * @param start 起始颜色值。
     * @param end 结束颜色值。
     * @param duration 补间持续时间。
     * @returns 新创建的补间器。
     */
    public static toColor(start: number, end: number, duration: number): GTweener {
        return TweenManager.createTween()._toColor(start, end, duration);
    }

    /**
     * 创建一个延迟调用补间。
     * @param delay 延迟时间。
     * @returns 新创建的延迟补间器。
     */
    public static delayedCall(delay: number): GTweener {
        return TweenManager.createTween().setDelay(delay);
    }

    /**
     * 配置震动补间。
     * @param startX 起始 X 坐标。
     * @param startY 起始 Y 坐标。
     * @param amplitude 震动幅度。
     * @param duration 震动持续时间。
     * @returns 新创建的补间器。
     */
    public static shake(startX: number, startY: number, amplitude: number, duration: number): GTweener {
        return TweenManager.createTween()._shake(startX, startY, amplitude, duration);
    }

    /**
     * 判断目标对象当前是否存在正在运行的补间。
     * @param target 目标对象。
     * @param propType 可选属性类型过滤条件。
     * @returns 是否存在命中条件的补间。
     */
    public static isTweening(target: any, propType?: any): Boolean {
        return TweenManager.isTweening(target, propType);
    }

    /**
     * 终止当前补间任务。
     * @param target 目标对象。
     * @param complete 是否先补到完成态再终止。
     * @param propType 可选属性类型过滤条件。
     */
    public static kill(target: any, complete?: boolean, propType?: any): void {
        TweenManager.killTweens(target, complete, propType);
    }

    /**
     * 返回命中条件的补间实例。
     * @param target 目标对象。
     * @param propType 可选属性类型过滤条件。
     * @returns 命中的补间实例；未找到时返回空值。
     */
    public static getTween(target: any, propType?: any): GTweener {
        return TweenManager.getTween(target, propType);
    }
}
