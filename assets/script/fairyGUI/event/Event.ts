import { Event as CCEvent, Node, Touch, Vec2 } from 'cc';
import { GObject } from '../GObject';
import { InputProcessor } from './InputProcessor';

/**
 * FairyGUI 自定义事件对象，封装事件发起者、输入数据与通用事件常量。
 */
export class FEvent extends CCEvent {
    /**
     * 触摸按下事件名。
     */
    public static TOUCH_BEGIN: string = "fui_touch_begin";
    /**
     * 触摸移动事件名。
     */
    public static TOUCH_MOVE: string = "fui_touch_move";
    /**
     * 触摸结束事件名。
     */
    public static TOUCH_END: string = "fui_touch_end";
    /**
     * 点击事件名。
     */
    public static CLICK: string = "fui_click";
    /**
     * 鼠标移入事件名。
     */
    public static ROLL_OVER: string = "fui_roll_over";
    /**
     * 鼠标移出事件名。
     */
    public static ROLL_OUT: string = "fui_roll_out";
    /**
     * 鼠标滚轮事件名。
     */
    public static MOUSE_WHEEL: string = "fui_mouse_wheel"

    /**
     * 显示事件名。
     */
    public static DISPLAY: string = "fui_display";
    /**
     * 隐藏事件名。
     */
    public static UNDISPLAY: string = "fui_undisplay";
    /**
     * Gear 停止事件名。
     */
    public static GEAR_STOP: string = "fui_gear_stop";
    /**
     * 文本链接点击事件名。
     */
    public static LINK: string = "fui_text_link";
    /**
     * 输入提交事件名。
     */
    public static Submit: string = "editing-return";
    /**
     * 文本变更事件名。
     */
    public static TEXT_CHANGE: string = "text-changed";

    /**
     * 状态变化事件名。
     */
    public static STATUS_CHANGED: string = "fui_status_changed";
    /**
     * 坐标变化事件名。
     */
    public static XY_CHANGED: string = "fui_xy_changed";
    /**
     * 尺寸变化事件名。
     */
    public static SIZE_CHANGED: string = "fui_size_changed";
    /**
     * 延迟尺寸变化事件名。
     */
    public static SIZE_DELAY_CHANGE: string = "fui_size_delay_change";

    /**
     * 拖拽开始事件名。
     */
    public static DRAG_START: string = "fui_drag_start";
    /**
     * 拖拽移动事件名。
     */
    public static DRAG_MOVE: string = "fui_drag_move";
    /**
     * 拖拽结束事件名。
     */
    public static DRAG_END: string = "fui_drag_end";
    /**
     * 拖放落下事件名。
     */
    public static DROP: string = "fui_drop";

    /**
     * 滚动事件名。
     */
    public static SCROLL: string = "fui_scroll";
    /**
     * 滚动结束事件名。
     */
    public static SCROLL_END: string = "fui_scroll_end";
    /**
     * 下拉释放事件名。
     */
    public static PULL_DOWN_RELEASE: string = "fui_pull_down_release";
    /**
     * 上拉释放事件名。
     */
    public static PULL_UP_RELEASE: string = "fui_pull_up_release";

    /**
     * 列表项点击事件名。
     */
    public static CLICK_ITEM: string = "fui_click_item";

    /**
     * 事件发起者对象。
     */
    public initiator: GObject;
    /**
     * 当前事件对应的全局位置。
     */
    public pos: Vec2 = new Vec2();
    /**
     * 当前触点 ID。
     */
    public touchId: number = 0;
    /**
     * 当前连续点击次数。
     */
    public clickCount: number = 0;
    /**
     * 当前鼠标按键编号。
     */
    public button: number = 0;
    /**
     * 键盘修饰键状态位。
     */
    public keyModifiers: number = 0;
    /**
     * 鼠标滚轮滚动增量。
     */
    public mouseWheelDelta: number = 0;
    /**
     * 关联的输入处理器实例。
     */
    public _processor: InputProcessor;

    /**
     * 初始化 FairyGUI 事件对象，并记录触发者、输入数据和事件名。
     * @param type 事件类型名。
     * @param bubbles 是否允许事件冒泡。
     */
    constructor(type: string, bubbles: boolean) {
        super(type, bubbles);
    }

    /**
     * 获取当前事件的派发接收者对象。
     */
    public get sender(): GObject | null {
        return GObject.cast(<Node>this.currentTarget);
    }

    /**
     * 获取当前是否按下 Shift 键。
     */
    public get isShiftDown(): boolean {
        return false;
    }

    /**
     * 获取当前是否按下 Ctrl 键。
     */
    public get isCtrlDown(): boolean {
        return false;
    }

    /**
     * TOUCH_MOVE 只有两种情况会触发，
     * 1、在TOUCH_BEGIN里调用了evt.captureTouch()，那么后续的移动事件都会在这个对象上触发（无论手指或指针位置是不是在该对象上方）。
     * 2、GRoot上的TOUCH_MOVE始终会触发，不需要使用captureTouch捕获。
     */
    public captureTouch() {
        let obj = GObject.cast(<Node>this.currentTarget);
        if (obj)
            this._processor.addTouchMonitor(this.touchId, obj);
    }
}

var eventPool: Array<FEvent> = new Array<FEvent>();

/**
 * 从事件池中借出一个 `FEvent`；若池中为空则新建实例。
 * @param type 事件类型名。
 * @param bubbles 是否允许事件冒泡。
 * @returns 可复用的 `FEvent` 实例。
 */
export function borrowEvent(type: string, bubbles?: boolean): FEvent {
    let evt: FEvent;
    if (eventPool.length) {
        evt = eventPool.pop();
        evt.type = type;
        evt.bubbles = bubbles;
    }
    else {
        evt = new FEvent(type, bubbles);
    }
    return evt;
}

/**
 * 将事件对象归还到事件池，供后续重复复用。
 * @param evt 要归还的事件对象。
 */
export function returnEvent(evt: FEvent) {
    evt.initiator = null;
    evt.unuse();

    eventPool.push(evt);
}
