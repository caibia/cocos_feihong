import { Component, Vec2, RichText, sys, Node, EventMouse, EventTouch, director, Vec3, game } from "cc";
import { GObject } from "../GObject";
import { GRichTextField } from "../GRichTextField";
import { UIContentScaler } from "../UIContentScaler";
import { borrowEvent, FEvent as FUIEvent, returnEvent } from "./Event";

/**
 * 输入处理器，负责触摸、鼠标与键盘事件在 FairyGUI 中的派发与命中。
 */
export class InputProcessor extends Component {
    /**
     * 所属宿主对象引用。
     */
    private _owner: GObject;
    /**
     * 底层触摸监听器引用。
     */
    private _touchListener: any;
    /**
     * 当前触摸坐标缓存。
     */
    private _touchPos: Vec2;
    /**
     * 全部触点状态数组。
     */
    private _touches: Array<TouchInfo>;
    /**
     * 上一帧鼠标移出链路缓存。
     */
    private _rollOutChain: Array<GObject>;
    /**
     * 当前帧鼠标移入链路缓存。
     */
    private _rollOverChain: Array<GObject>;

    /**
     * 事件捕获阶段的回调函数。
     */
    public _captureCallback: (evt: FUIEvent) => void;

    /**
     * 初始化输入处理器的触摸缓存、鼠标状态和命中测试上下文。
     */
    public constructor() {
        super();

        this._touches = new Array<TouchInfo>();
        this._rollOutChain = new Array<GObject>();
        this._rollOverChain = new Array<GObject>();
        this._touchPos = new Vec2();
    }

    onLoad() {
        this._owner = GObject.cast(this.node);
    }

    onEnable() {
        let node: Node = this.node;
        node.on(Node.EventType.TOUCH_START, this.touchBeginHandler, this);
        node.on(Node.EventType.TOUCH_MOVE, this.touchMoveHandler, this);
        node.on(Node.EventType.TOUCH_END, this.touchEndHandler, this);
        node.on(Node.EventType.TOUCH_CANCEL, this.touchCancelHandler, this);

        node.on(Node.EventType.MOUSE_DOWN, this.mouseDownHandler, this);
        node.on(Node.EventType.MOUSE_MOVE, this.mouseMoveHandler, this);
        node.on(Node.EventType.MOUSE_UP, this.mouseUpHandler, this);
        node.on(Node.EventType.MOUSE_WHEEL, this.mouseWheelHandler, this);

        this._touchListener = (<any>this.node.eventProcessor).touchListener;
    }

    onDisable() {
        let node: Node = this.node;
        node.off(Node.EventType.TOUCH_START, this.touchBeginHandler, this);
        node.off(Node.EventType.TOUCH_MOVE, this.touchMoveHandler, this);
        node.off(Node.EventType.TOUCH_END, this.touchEndHandler, this);
        node.off(Node.EventType.TOUCH_CANCEL, this.touchCancelHandler, this);

        node.off(Node.EventType.MOUSE_DOWN, this.mouseDownHandler, this);
        node.off(Node.EventType.MOUSE_MOVE, this.mouseMoveHandler, this);
        node.off(Node.EventType.MOUSE_UP, this.mouseUpHandler, this);
        node.off(Node.EventType.MOUSE_WHEEL, this.mouseWheelHandler, this);

        this._touchListener = null;
    }

    /**
     * 获取当前所有处于激活状态的触点 ID。
     * @param touchIds 可选结果数组；传入时会复用该数组。
     * @returns 所有激活触点的 ID 列表。
     */
    public getAllTouches(touchIds?: Array<number>): Array<number> {
        touchIds = touchIds || new Array<number>();
        let cnt = this._touches.length;
        for (let i = 0; i < cnt; i++) {
            let ti = this._touches[i];
            if (ti.touchId != -1)
                touchIds.push(ti.touchId);
        }
        return touchIds;
    }

    /**
     * 返回指定触点当前的全局坐标。
     * @param touchId 触点 ID；未传时返回第一个有效触点的位置。
     * @returns 对应触点的全局坐标；未命中时返回 `Vec2.ZERO`。
     */
    public getTouchPosition(touchId?: number): Vec2 {
        if (touchId === undefined) touchId = -1;
        let cnt = this._touches.length;
        for (let i = 0; i < cnt; i++) {
            let ti = this._touches[i];
            if (ti.touchId != -1 && (touchId == -1 || ti.touchId == touchId))
                return ti.pos;
        }
        return Vec2.ZERO;
    }

    /**
     * 获取当前触点命中的目标对象。
     * @returns 第一个有效触点当前命中的 `GObject`；未命中时返回空值。
     */
    public getTouchTarget(): GObject {
        let cnt = this._touches.length;
        for (let i = 0; i < cnt; i++) {
            let ti = this._touches[i];
            if (ti.touchId != -1)
                return ti.target;
        }
        return null;
    }


    /**
     * 将指定对象加入当前触点的监控链路。
     * @param touchId 触点 ID。
     * @param target 要加入监控链路的目标对象。
     */
    public addTouchMonitor(touchId: number, target: GObject) {
        let ti = this.getInfo(touchId, false);
        if (!ti)
            return;

        let index = ti.touchMonitors.indexOf(target);
        if (index == -1)
            ti.touchMonitors.push(target);
    }

    /**
     * 把指定对象从全部触点监控链路中移除。
     * @param target 要移除的目标对象。
     */
    public removeTouchMonitor(target: GObject) {
        let cnt = this._touches.length;
        for (let i = 0; i < cnt; i++) {
            let ti: TouchInfo = this._touches[i];
            let index = ti.touchMonitors.indexOf(target);
            if (index != -1)
                ti.touchMonitors.splice(index, 1);
        }
    }

    /**
     * 取消当前点击判定流程。
     * @param touchId 触点 ID。
     */
    public cancelClick(touchId: number) {
        let ti = this.getInfo(touchId, false);
        if (ti)
            ti.clickCancelled = true;
    }

    /**
     * 模拟一次点击流程。
     * @param target 接收点击事件的目标对象。
     */
    public simulateClick(target: GObject) {
        let evt: FUIEvent;

        evt = borrowEvent(FUIEvent.TOUCH_BEGIN, true);

        evt.initiator = target;
        evt.pos.set(target.localToGlobal());
        evt.touchId = 0;
        evt.clickCount = 1;
        evt.button = 0;
        evt._processor = this;

        if (this._captureCallback)
            this._captureCallback.call(this._owner, evt);

        target.node.dispatchEvent(evt);

        evt.unuse();
        evt.type = FUIEvent.TOUCH_END;
        evt.bubbles = true;

        target.node.dispatchEvent(evt);

        evt.unuse();
        evt.type = FUIEvent.CLICK;
        evt.bubbles = true;

        target.node.dispatchEvent(evt);

        returnEvent(evt);
    }

    /**
     * 处理触摸开始事件。
     */
    private touchBeginHandler(evt: EventTouch): Boolean {
        let ti: TouchInfo = this.updateInfo(evt.getID(), evt.getLocation());
        this.setBegin(ti);
        if (this._touchListener) {
            this._touchListener.setSwallowTouches(ti.target != this._owner);
        } else {
            // since cc3.4.0, setSwallowTouches removed
            let e = evt as any;
            e.preventSwallow = (ti.target == this._owner);
        }

        let evt2 = this.getEvent(ti, ti.target, FUIEvent.TOUCH_BEGIN, true);

        if (this._captureCallback)
            this._captureCallback.call(this._owner, evt2);

        ti.target.node.dispatchEvent(evt2);

        this.handleRollOver(ti, ti.target);

        return true;
    }

    /**
     * 处理触摸移动事件。
     */
    private touchMoveHandler(evt: EventTouch): void {
        let ti = this.updateInfo(evt.getID(), evt.getLocation());
        if (!this._touchListener) {
            let e = evt as any;
            e.preventSwallow = (ti.target == this._owner);
        }
        this.handleRollOver(ti, ti.target);

        if (ti.began) {
            let evt2 = this.getEvent(ti, ti.target, FUIEvent.TOUCH_MOVE, false);

            let done = false;
            let cnt = ti.touchMonitors.length;
            for (let i = 0; i < cnt; i++) {
                let mm = ti.touchMonitors[i];
                if (mm.node == null || !mm.node.activeInHierarchy)
                    continue;

                evt2.unuse();
                evt2.type = FUIEvent.TOUCH_MOVE;
                mm.node.dispatchEvent(evt2);
                if (mm == this._owner)
                    done = true;
            }

            if (!done && this.node) {
                evt2.unuse();
                evt2.type = FUIEvent.TOUCH_MOVE;
                this.node.dispatchEvent(evt2);
            }

            returnEvent(evt2);
        }
    }

    /**
     * 处理触摸结束事件。
     */
    private touchEndHandler(evt: EventTouch): void {
        let ti = this.updateInfo(evt.getID(), evt.getLocation());
        if (!this._touchListener) {
            let e = evt as any;
            e.preventSwallow = (ti.target == this._owner);
        }
        this.setEnd(ti);

        let evt2 = this.getEvent(ti, ti.target, FUIEvent.TOUCH_END, false);

        let cnt = ti.touchMonitors.length;
        for (let i = 0; i < cnt; i++) {
            let mm = ti.touchMonitors[i];
            if (mm == ti.target || mm.node == null || !mm.node.activeInHierarchy
                || ('isAncestorOf' in mm) && (<any>mm).isAncestorOf(ti.target))
                continue;

            evt2.unuse();
            evt2.type = FUIEvent.TOUCH_END;
            mm.node.dispatchEvent(evt2);
        }
        ti.touchMonitors.length = 0;

        if (ti.target && ti.target.node) {
            if (ti.target instanceof GRichTextField)
                ti.target.node.getComponent(RichText)["_onTouchEnded"](evt);

            evt2.unuse();
            evt2.type = FUIEvent.TOUCH_END;
            evt2.bubbles = true;
            ti.target.node.dispatchEvent(evt2);
        }

        returnEvent(evt2);

        ti.target = this.clickTest(ti);
        if (ti.target) {
            evt2 = this.getEvent(ti, ti.target, FUIEvent.CLICK, true);
            ti.target.node.dispatchEvent(evt2);
            returnEvent(evt2);
        }

        if (sys.isMobile)     //on mobile platform, trigger RollOut on up event, but not on PC
            this.handleRollOver(ti, null);
        else
            this.handleRollOver(ti, ti.target);

        ti.target = null;
        ti.touchId = -1;
        ti.button = -1;
    }

    /**
     * 处理触摸取消事件。
     */
    private touchCancelHandler(evt: EventTouch): void {
        let ti = this.updateInfo(evt.getID(), evt.getLocation());
        if (!this._touchListener) {
            let e = evt as any;
            e.preventSwallow = (ti.target == this._owner);
        }

        let evt2 = this.getEvent(ti, ti.target, FUIEvent.TOUCH_END, false);

        let cnt = ti.touchMonitors.length;
        for (let i = 0; i < cnt; i++) {
            let mm = ti.touchMonitors[i];
            if (mm == ti.target || mm.node == null || !mm.node.activeInHierarchy
                || ('isAncestorOf' in mm) && (<any>mm).isAncestorOf(ti.target))
                continue;

            evt2.initiator = mm;
            mm.node.dispatchEvent(evt2);
        }
        ti.touchMonitors.length = 0;

        if (ti.target && ti.target.node) {
            evt2.bubbles = true;
            ti.target.node.dispatchEvent(evt2);
        }

        returnEvent(evt2);

        this.handleRollOver(ti, null);

        ti.target = null;
        ti.touchId = -1;
        ti.button = -1;
    }

    /**
     * 处理鼠标按下事件。
     */
    private mouseDownHandler(evt: EventMouse) {
        let ti = this.getInfo(0, true);
        ti.button = evt.getButton();
    }

    /**
     * 处理鼠标抬起事件。
     */
    private mouseUpHandler(evt: EventMouse) {
        let ti = this.getInfo(0, true);
        ti.button = evt.getButton();
    }

    /**
     * 处理鼠标移动事件。
     */
    private mouseMoveHandler(evt: EventMouse) {
        let ti = this.getInfo(0, false);
        if (ti
            && Math.abs(ti.pos.x - evt.getLocationX()) < 1
            && Math.abs(ti.pos.y - (UIContentScaler.rootSize.height - evt.getLocationY())) < 1)
            return;

        ti = this.updateInfo(0, evt.getLocation());
        this.handleRollOver(ti, ti.target);

        if (ti.began) {
            let evt2 = this.getEvent(ti, ti.target, FUIEvent.TOUCH_MOVE, false);

            let done = false;
            let cnt = ti.touchMonitors.length;
            for (let i = 0; i < cnt; i++) {
                let mm = ti.touchMonitors[i];
                if (mm.node == null || !mm.node.activeInHierarchy)
                    continue;

                evt2.initiator = mm;
                mm.node.dispatchEvent(evt2);
                if (mm == this._owner)
                    done = true;
            }

            if (!done && this.node) {
                evt2.initiator = this._owner;
                this.node.dispatchEvent(evt2);
                returnEvent(evt2);
            }

            returnEvent(evt2);
        }
    }

    /**
     * 处理鼠标滚轮事件。
     */
    private mouseWheelHandler(evt: EventMouse) {
        let ti = this.updateInfo(0, evt.getLocation());
        ti.mouseWheelDelta = Math.max(evt.getScrollX(), evt.getScrollY());

        let evt2 = this.getEvent(ti, ti.target, FUIEvent.MOUSE_WHEEL, true);
        ti.target.node.dispatchEvent(evt2);
        returnEvent(evt2);
    }

    /**
     * 重新计算并同步`Info`相关结果。
     * @param touchId 触点 ID。
     * @param pos 当前输入事件对应的位置。
     * @returns 更新后的触点状态对象。
     */
    private updateInfo(touchId: number, pos: Vec2): TouchInfo {
        const camera = director.root!.batcher2D.getFirstRenderCamera(this.node);
        if (camera) {
            s_vec3.set(pos.x, pos.y);

            camera.screenToWorld(s_vec3_2, s_vec3);
            this._touchPos.set(s_vec3_2.x, s_vec3_2.y);
        }
        else
            this._touchPos.set(pos);
        this._touchPos.y = UIContentScaler.rootSize.height - this._touchPos.y;
        let target = this._owner.hitTest(this._touchPos);
        if (!target)
            target = this._owner;

        let ti = this.getInfo(touchId);
        ti.target = target;
        ti.pos.set(this._touchPos);
        ti.button = EventMouse.BUTTON_LEFT;
        ti.touchId = touchId;

        return ti;
    }

    /**
     * 获取或创建指定触点对应的状态信息。
     * @param touchId 触点 ID。
     * @param createIfNotExisits 未命中时是否自动创建。
     * @returns 对应触点的状态对象。
     */
    private getInfo(touchId: number, createIfNotExisits?: boolean): TouchInfo {
        if (createIfNotExisits === undefined) createIfNotExisits = true;
        let ret = null;
        let cnt = this._touches.length;
        for (let i = 0; i < cnt; i++) {
            let ti = this._touches[i];
            if (ti.touchId == touchId)
                return ti;
            else if (ti.touchId == -1)
                ret = ti;
        }

        if (!ret) {
            if (!createIfNotExisits)
                return null;

            ret = new TouchInfo();
            this._touches.push(ret);
        }
        ret.touchId = touchId;
        return ret;
    }

    /**
     * 在一次按下开始时重置点击判定状态，并记录按下路径上的目标链。
     * @param ti 当前触点状态对象。
     */
    private setBegin(ti: TouchInfo) {
        ti.began = true;
        ti.clickCancelled = false;
        ti.downPos.set(ti.pos);

        ti.downTargets.length = 0;
        let obj: GObject = ti.target;
        while (obj) {
            ti.downTargets.push(obj);
            obj = obj.findParent();
        }
    }

    /**
     * 在一次按下结束时结算点击次数、双击判定和最近点击时间。
     * @param ti 当前触点状态对象。
     */
    private setEnd(ti: TouchInfo) {
        ti.began = false;

        let now = game.totalTime / 1000;
        let elapsed = now - ti.lastClickTime;

        if (elapsed < 0.45) {
            if (ti.clickCount == 2)
                ti.clickCount = 1;
            else
                ti.clickCount++;
        }
        else
            ti.clickCount = 1;
        ti.lastClickTime = now;
    }

    /**
     * 根据当前位置与按下目标判断是否成立一次点击。
     * @param ti 当前触点状态对象。
     * @returns 成立点击时对应的目标对象；否则返回空值。
     */
    private clickTest(ti: TouchInfo): GObject {
        if (ti.downTargets.length == 0
            || ti.clickCancelled
            || Math.abs(ti.pos.x - ti.downPos.x) > 50 || Math.abs(ti.pos.y - ti.downPos.y) > 50)
            return null;

        let obj = ti.downTargets[0];
        if (obj && obj.node && obj.node.activeInHierarchy)
            return obj;

        obj = ti.target;
        while (obj) {
            let index = ti.downTargets.indexOf(obj);
            if (index != -1 && obj.node && obj.node.activeInHierarchy)
                break;

            obj = obj.findParent();
        }

        return obj;
    }

    /**
     * 处理鼠标移入移出目标变化。
     * @param ti 当前触点状态对象。
     * @param target 最新命中的目标对象。
     */
    private handleRollOver(ti: TouchInfo, target: GObject) {
        if (ti.lastRollOver == target)
            return;

        let element: GObject = ti.lastRollOver;
        while (element && element.node) {
            this._rollOutChain.push(element);
            element = element.findParent();
        }

        element = target;
        while (element && element.node) {
            let i = this._rollOutChain.indexOf(element);
            if (i != -1) {
                this._rollOutChain.length = i;
                break;
            }
            this._rollOverChain.push(element);

            element = element.findParent();
        }

        ti.lastRollOver = target;

        let cnt = this._rollOutChain.length;
        for (let i = 0; i < cnt; i++) {
            element = this._rollOutChain[i];
            if (element.node && element.node.activeInHierarchy) {
                let evt = this.getEvent(ti, element, FUIEvent.ROLL_OUT, false);
                element.node.dispatchEvent(evt);
                returnEvent(evt);
            }
        }

        cnt = this._rollOverChain.length;
        for (let i = 0; i < cnt; i++) {
            element = this._rollOverChain[i];
            if (element.node && element.node.activeInHierarchy) {
                let evt = this.getEvent(ti, element, FUIEvent.ROLL_OVER, false);
                element.node.dispatchEvent(evt);
                returnEvent(evt);
            }
        }

        this._rollOutChain.length = 0;
        this._rollOverChain.length = 0;
    }

    /**
     * 构建 FairyGUI 事件对象并填充输入上下文。
     * @param ti 当前触点状态对象。
     * @param target 事件发起目标对象。
     * @param type 事件类型名。
     * @param bubbles 是否允许事件冒泡。
     * @returns 可派发的 FairyGUI 事件对象。
     */
    private getEvent(ti: TouchInfo, target: GObject, type: string, bubbles: boolean): FUIEvent {
        let evt = borrowEvent(type, bubbles);
        evt.initiator = target;
        evt.pos.set(ti.pos);
        evt.touchId = ti.touchId;
        evt.clickCount = ti.clickCount;
        evt.button = ti.button;
        evt.mouseWheelDelta = ti.mouseWheelDelta;
        evt._processor = this;

        return evt;
    }
}

class TouchInfo {
    /**
     * 当前命中的目标对象。
     */
    public target: GObject;
    /**
     * 当前触点的全局位置。
     */
    public pos: Vec2 = new Vec2();
    /**
     * 触点 ID。
     */
    public touchId: number = 0;
    /**
     * 连续点击次数。
     */
    public clickCount: number = 0;
    /**
     * 鼠标滚轮增量。
     */
    public mouseWheelDelta: number = 0;
    /**
     * 当前鼠标按键编号。
     */
    public button: number = -1;
    /**
     * 按下瞬间记录的全局位置。
     */
    public downPos: Vec2 = new Vec2();
    /**
     * 当前按下流程是否已经开始。
     */
    public began: boolean = false;
    /**
     * 当前点击是否已被取消。
     */
    public clickCancelled: boolean = false;
    /**
     * 上一次点击完成时间。
     */
    public lastClickTime: number = 0;
    /**
     * 上一次悬停命中的对象。
     */
    public lastRollOver: GObject;
    /**
     * 按下时沿父链记录的对象列表。
     */
    public downTargets: Array<GObject> = new Array<GObject>();
    /**
     * 当前触点的监控对象链；调用 `captureTouch` 后会加入其中。
     */
    public touchMonitors: Array<GObject> = new Array<GObject>();
};

var s_vec3: Vec3 = new Vec3();
var s_vec3_2: Vec3 = new Vec3();
