import { EaseType } from "./EaseType";
import { GPath } from "./GPath";
import { evaluateEase } from "./EaseManager";
import { Vec2 } from "cc";
import { TweenValue } from "./TweenValue";

var s_vec2: Vec2 = new Vec2();

/**
 * 单条补间任务对象，负责插值计算、生命周期与回调触发。
 */
export class GTweener {
    /**
     * 当前补间关联的目标对象。
     */
    public _target: any;
    /**
     * 当前补间驱动的属性类型或属性写入标识。
     */
    public _propType: any;
    /**
     * 当前补间是否已被终止。
     */
    public _killed: boolean;
    /**
     * 当前补间是否处于暂停状态。
     */
    public _paused: boolean;

    /**
     * 补间开始前的延迟时间。
     */
    private _delay: number = 0;
    /**
     * 补间持续时间。
     */
    private _duration: number = 0;
    /**
     * 补间提前终止时间点。
     */
    private _breakpoint: number = 0;
    /**
     * 缓动类型。
     */
    private _easeType: number = 0;
    /**
     * 回弹或弹性缓动参数。
     */
    private _easeOvershootOrAmplitude: number = 0;
    /**
     * 弹性缓动周期参数。
     */
    private _easePeriod: number = 0;
    /**
     * 补间重复次数。
     */
    private _repeat: number = 0;
    /**
     * 是否启用往返播放。
     */
    private _yoyo: boolean = false;
    /**
     * 时间缩放倍率。
     */
    private _timeScale: number = 1;
    /**
     * 是否对结果做吸附取整。
     */
    private _snapping: boolean = false;
    /**
     * 调用方附加的用户数据。
     */
    private _userData: any;
    /**
     * 路径补间使用的路径数据对象。
     */
    private _path: GPath | null;

    /**
     * 更新回调函数。
     */
    private _onUpdate: Function | null;
    /**
     * 开始回调函数。
     */
    private _onStart: Function | null;
    /**
     * 完成回调函数。
     */
    private _onComplete: Function | null;
    /**
     * 更新回调绑定的调用者。
     */
    private _onUpdateCaller: any | null;
    /**
     * 开始回调绑定的调用者。
     */
    private _onStartCaller: any | null;
    /**
     * 完成回调绑定的调用者。
     */
    private _onCompleteCaller: any | null;

    /**
     * 补间起始值容器。
     */
    private _startValue: TweenValue;
    /**
     * 补间目标值容器。
     */
    private _endValue: TweenValue;
    /**
     * 补间当前值容器。
     */
    private _value: TweenValue;
    /**
     * 补间当前帧增量值容器。
     */
    private _deltaValue: TweenValue;
    /**
     * 当前值容器实际使用的分量数量。
     */
    private _valueSize: number;

    /**
     * 补间是否已经真正开始。
     */
    private _started: boolean;
    /**
     * 补间结束状态标记。
     */
    private _ended: number;
    /**
     * 当前已流逝的总时间。
     */
    private _elapsedTime: number;
    /**
     * 当前归一化时间进度，通常位于 `0` 到 `1` 之间。
     */
    private _normalizedTime: number;

    /**
     * 初始化补间任务的默认运行参数。
     */
    public constructor() {
        this._startValue = new TweenValue();
        this._endValue = new TweenValue();
        this._value = new TweenValue();
        this._deltaValue = new TweenValue();

        this._reset();
    }

    /**
     * 设置补间开始前的延迟时长。
     * @param value 延迟时间。
     * @returns 当前补间器，便于链式调用。
     */
    public setDelay(value: number): GTweener {
        this._delay = value;
        return this;
    }

    /**
     * 获取当前补间开始前的延迟时长。
     */
    public get delay(): number {
        return this._delay;
    }

    /**
     * 设置补间持续时间。
     * @param value 补间持续时间。
     * @returns 当前补间器，便于链式调用。
     */
    public setDuration(value: number): GTweener {
        this._duration = value;
        return this;
    }

    /**
     * 获取当前补间持续时间。
     */
    public get duration(): number {
        return this._duration;
    }

    /**
     * 设置补间的提前终止时间点。
     * @param value 提前终止时间点。
     * @returns 当前补间器，便于链式调用。
     */
    public setBreakpoint(value: number): GTweener {
        this._breakpoint = value;
        return this;
    }

    /**
     * 设置补间使用的缓动类型。
     * @param value 缓动类型枚举值。
     * @returns 当前补间器，便于链式调用。
     */
    public setEase(value: number): GTweener {
        this._easeType = value;
        return this;
    }

    /**
     * 设置弹性缓动使用的周期参数。
     * @param value 周期参数。
     * @returns 当前补间器，便于链式调用。
     */
    public setEasePeriod(value: number): GTweener {
        this._easePeriod = value;
        return this;
    }

    /**
     * 设置回弹或弹性缓动使用的超调/振幅参数。
     * @param value 超调或振幅参数。
     * @returns 当前补间器，便于链式调用。
     */
    public setEaseOvershootOrAmplitude(value: number): GTweener {
        this._easeOvershootOrAmplitude = value;
        return this;
    }

    /**
     * 设置补间重复次数，并决定是否使用往返播放。
     * @param repeat 重复次数；`-1` 通常表示无限循环。
     * @param yoyo 是否启用往返播放。
     * @returns 当前补间器，便于链式调用。
     */
    public setRepeat(repeat: number, yoyo?: boolean): GTweener {
        this._repeat = repeat;
        this._yoyo = yoyo;
        return this;
    }

    /**
     * 获取补间重复次数。
     */
    public get repeat(): number {
        return this._repeat;
    }

    /**
     * 设置补间时间缩放倍率。
     * @param value 时间缩放倍率。
     * @returns 当前补间器，便于链式调用。
     */
    public setTimeScale(value: number): GTweener {
        this._timeScale = value;
        return this;
    }

    /**
     * 设置补间结果是否按像素或整数进行吸附。
     * @param value 是否启用吸附取整。
     * @returns 当前补间器，便于链式调用。
     */
    public setSnapping(value: boolean): GTweener {
        this._snapping = value;
        return this;
    }

    /**
     * 设置补间目标对象以及可选的属性类型。
     * @param value 目标对象。
     * @param propType 可选属性类型或属性写入方式。
     * @returns 当前补间器，便于链式调用。
     */
    public setTarget(value: any, propType?: any): GTweener {
        this._target = value;
        this._propType = propType;
        return this;
    }

    /**
     * 获取当前补间要驱动的目标对象。
     */
    public get target(): any {
        return this._target;
    }

    /**
     * 为补间指定路径数据，使插值沿路径运行。
     * @param value 路径对象。
     * @returns 当前补间器，便于链式调用。
     */
    public setPath(value: GPath): GTweener {
        this._path = value;
        return this;
    }

    /**
     * 给当前补间附加一份用户自定义数据。
     * @param value 用户自定义数据。
     * @returns 当前补间器，便于链式调用。
     */
    public setUserData(value: any): GTweener {
        this._userData = value;
        return this;
    }

    /**
     * 获取调用方附加到当前补间上的用户数据。
     */
    public get userData(): any {
        return this._userData;
    }

    /**
     * 注册补间更新回调；每次插值刷新后都会调用。
     * @param callback 更新回调函数。
     * @param target 回调绑定的 `this` 对象。
     * @returns 当前补间器，便于链式调用。
     */
    public onUpdate(callback: Function, target?: any): GTweener {
        this._onUpdate = callback;
        this._onUpdateCaller = target;
        return this;
    }

    /**
     * 注册补间开始回调；第一次真正进入播放时调用。
     * @param callback 开始回调函数。
     * @param target 回调绑定的 `this` 对象。
     * @returns 当前补间器，便于链式调用。
     */
    public onStart(callback: Function, target?: any): GTweener {
        this._onStart = callback;
        this._onStartCaller = target;
        return this;
    }

    /**
     * 注册补间完成回调；补间结束时调用。
     * @param callback 完成回调函数。
     * @param target 回调绑定的 `this` 对象。
     * @returns 当前补间器，便于链式调用。
     */
    public onComplete(callback: Function, target?: any): GTweener {
        this._onComplete = callback;
        this._onCompleteCaller = target;
        return this;
    }

    /**
     * 获取补间起始值容器。
     */
    public get startValue(): TweenValue {
        return this._startValue;
    }

    /**
     * 获取补间目标值容器。
     */
    public get endValue(): TweenValue {
        return this._endValue;
    }

    /**
     * 获取补间当前帧插值结果。
     */
    public get value(): TweenValue {
        return this._value;
    }

    /**
     * 获取当前帧相对上一帧的增量值。
     */
    public get deltaValue(): TweenValue {
        return this._deltaValue;
    }

    /**
     * 获取当前补间归一化时间进度。
     */
    public get normalizedTime(): number {
        return this._normalizedTime;
    }

    /**
     * 判断当前补间是否已完成一次。
     */
    public get completed(): boolean {
        return this._ended != 0;
    }

    /**
     * 判断当前补间是否已经彻底结束。
     */
    public get allCompleted(): boolean {
        return this._ended == 1;
    }

    /**
     * 设置当前补间的暂停状态。
     * @param paused 是否暂停。
     * @returns 当前补间器，便于链式调用。
     */
    public setPaused(paused: boolean): GTweener {
        this._paused = paused;
        return this;
    }

    /**
     * 将补间进度跳转到指定时间点。
     * @param time 要跳转到的时间点，单位为秒。
     */
    public seek(time: number): void {
        if (this._killed)
            return;

        this._elapsedTime = time;
        if (this._elapsedTime < this._delay) {
            if (this._started)
                this._elapsedTime = this._delay;
            else
                return;
        }

        this.update();
    }

    /**
     * 终止当前补间任务。
     * @param complete 是否先补到完成态再终止。
     */
    public kill(complete?: boolean): void {
        if (this._killed)
            return;

        if (complete) {
            if (this._ended == 0) {
                if (this._breakpoint >= 0)
                    this._elapsedTime = this._delay + this._breakpoint;
                else if (this._repeat >= 0)
                    this._elapsedTime = this._delay + this._duration * (this._repeat + 1);
                else
                    this._elapsedTime = this._delay + this._duration * 2;
                this.update();
            }

            this.callCompleteCallback();
        }

        this._killed = true;
    }

    /**
     * 配置一维数值补间的起止值。
     * @param start 起始值。
     * @param end 结束值。
     * @param duration 补间持续时间。
     * @returns 当前补间器。
     */
    public _to(start: number, end: number, duration: number): GTweener {
        this._valueSize = 1;
        this._startValue.x = start;
        this._endValue.x = end;
        this._value.x = start;
        this._duration = duration;
        return this;
    }

    /**
     * 配置二维数值补间的起止值。
     * @param start 第一维起始值。
     * @param start2 第二维起始值。
     * @param end 第一维结束值。
     * @param end2 第二维结束值。
     * @param duration 补间持续时间。
     * @returns 当前补间器。
     */
    public _to2(start: number, start2: number, end: number, end2: number, duration: number): GTweener {
        this._valueSize = 2;
        this._startValue.x = start;
        this._endValue.x = end;
        this._startValue.y = start2;
        this._endValue.y = end2;
        this._value.x = start;
        this._value.y = start2;
        this._duration = duration;
        return this;
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
     * @returns 当前补间器。
     */
    public _to3(start: number, start2: number, start3: number,
        end: number, end2: number, end3: number, duration: number): GTweener {
        this._valueSize = 3;
        this._startValue.x = start;
        this._endValue.x = end;
        this._startValue.y = start2;
        this._endValue.y = end2;
        this._startValue.z = start3;
        this._endValue.z = end3;
        this._value.x = start;
        this._value.y = start2;
        this._value.z = start3;
        this._duration = duration;
        return this;
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
     * @returns 当前补间器。
     */
    public _to4(start: number, start2: number, start3: number, start4: number,
        end: number, end2: number, end3: number, end4: number, duration: number): GTweener {
        this._valueSize = 4;
        this._startValue.x = start;
        this._endValue.x = end;
        this._startValue.y = start2;
        this._endValue.y = end2;
        this._startValue.z = start3;
        this._endValue.z = end3;
        this._startValue.w = start4;
        this._endValue.w = end4;
        this._value.x = start;
        this._value.y = start2;
        this._value.z = start3;
        this._value.w = start4;
        this._duration = duration;
        return this;
    }

    /**
     * 配置颜色补间的起止值。
     * @param start 起始颜色值。
     * @param end 结束颜色值。
     * @param duration 补间持续时间。
     * @returns 当前补间器。
     */
    public _toColor(start: number, end: number, duration: number): GTweener {
        this._valueSize = 5;
        this._startValue.color = start;
        this._endValue.color = end;
        this._value.color = start;
        this._duration = duration;
        return this;
    }

    /**
     * 配置震动补间。
     * @param startX 起始 X 坐标。
     * @param startY 起始 Y 坐标。
     * @param amplitude 震动幅度。
     * @param duration 震动持续时间。
     * @returns 当前补间器。
     */
    public _shake(startX: number, startY: number, amplitude: number, duration: number): GTweener {
        this._valueSize = 6;
        this._startValue.x = startX;
        this._startValue.y = startY;
        this._startValue.w = amplitude;
        this._duration = duration;
        return this;
    }

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    public _init(): void {
        this._delay = 0;
        this._duration = 0;
        this._breakpoint = -1;
        this._easeType = EaseType.QuadOut;
        this._timeScale = 1;
        this._easePeriod = 0;
        this._easeOvershootOrAmplitude = 1.70158;
        this._snapping = false;
        this._repeat = 0;
        this._yoyo = false;
        this._valueSize = 0;
        this._started = false;
        this._paused = false;
        this._killed = false;
        this._elapsedTime = 0;
        this._normalizedTime = 0;
        this._ended = 0;
    }

    /**
     * 将补间器重置为可复用的初始状态，以便重新放回管理器或对象池。
     */
    public _reset(): void {
        this._target = null;
        this._propType = null;
        this._userData = null;
        this._path = null;
        this._onStart = this._onUpdate = this._onComplete = null;
        this._onStartCaller = this._onUpdateCaller = this._onCompleteCaller = null;
    }

    /**
     * 刷新当前对象的显示结果或内部状态。
     * @param dt 本帧时间增量。
     */
    public _update(dt: number): void {
        if (this._timeScale != 1)
            dt *= this._timeScale;
        if (dt == 0)
            return;

        if (this._ended != 0) //Maybe completed by seek
        {
            this.callCompleteCallback();
            this._killed = true;
            return;
        }

        this._elapsedTime += dt;
        this.update();

        if (this._ended != 0) {
            if (!this._killed) {
                this.callCompleteCallback();
                this._killed = true;
            }
        }
    }

    /**
     * 刷新当前对象的显示结果或内部状态。
     */
    private update(): void {
        this._ended = 0;

        if (this._valueSize == 0) //DelayedCall
        {
            if (this._elapsedTime >= this._delay + this._duration)
                this._ended = 1;

            return;
        }

        if (!this._started) {
            if (this._elapsedTime < this._delay)
                return;

            this._started = true;
            this.callStartCallback();
            if (this._killed)
                return;
        }

        var reversed: boolean = false;
        var tt: number = this._elapsedTime - this._delay;
        if (this._breakpoint >= 0 && tt >= this._breakpoint) {
            tt = this._breakpoint;
            this._ended = 2;
        }

        if (this._repeat != 0) {
            var round: number = Math.floor(tt / this._duration);
            tt -= this._duration * round;
            if (this._yoyo)
                reversed = round % 2 == 1;

            if (this._repeat > 0 && this._repeat - round < 0) {
                if (this._yoyo)
                    reversed = this._repeat % 2 == 1;
                tt = this._duration;
                this._ended = 1;
            }
        }
        else if (tt >= this._duration) {
            tt = this._duration;
            this._ended = 1;
        }

        this._normalizedTime = evaluateEase(this._easeType, reversed ? (this._duration - tt) : tt, this._duration,
            this._easeOvershootOrAmplitude, this._easePeriod);

        this._value.setZero();
        this._deltaValue.setZero();

        if (this._valueSize == 6) {
            if (this._ended == 0) {
                var r: number = this._startValue.w * (1 - this._normalizedTime);
                var rx: number = r * (Math.random() > 0.5 ? 1 : -1);
                var ry: number = r * (Math.random() > 0.5 ? 1 : -1);

                this._deltaValue.x = rx;
                this._deltaValue.y = ry;
                this._value.x = this._startValue.x + rx;
                this._value.y = this._startValue.y + ry;
            }
            else {
                this._value.x = this._startValue.x;
                this._value.y = this._startValue.y;
            }
        }
        else if (this._path) {
            let pt = this._path.getPointAt(this._normalizedTime, s_vec2);
            if (this._snapping) {
                pt.x = Math.round(pt.x);
                pt.y = Math.round(pt.y);
            }
            this._deltaValue.x = pt.x - this._value.x;
            this._deltaValue.y = pt.y - this._value.y;
            this._value.x = pt.x;
            this._value.y = pt.y;
        }
        else {
            let cnt = Math.min(this._valueSize, 4);
            for (var i: number = 0; i < cnt; i++) {
                var n1: number = this._startValue.getField(i);
                var n2: number = this._endValue.getField(i);
                var f: number = n1 + (n2 - n1) * this._normalizedTime;
                if (this._snapping)
                    f = Math.round(f);
                this._deltaValue.setField(i, f - this._value.getField(i));
                this._value.setField(i, f);
            }
        }

        if (this._target && this._propType) {
            if (this._propType instanceof Function) {
                switch (this._valueSize) {
                    case 1:
                        this._propType.call(this._target, this._value.x);
                        break;
                    case 2:
                        this._propType.call(this._target, this._value.x, this._value.y);
                        break;
                    case 3:
                        this._propType.call(this._target, this._value.x, this._value.y, this._value.z);
                        break;
                    case 4:
                        this._propType.call(this._target, this._value.x, this._value.y, this._value.z, this._value.w);
                        break;
                    case 5:
                        this._propType.call(this._target, this._value.color);
                        break;
                    case 6:
                        this._propType.call(this._target, this._value.x, this._value.y);
                        break;
                }
            }
            else {
                if (this._valueSize == 5)
                    this._target[this._propType] = this._value.color;
                else
                    this._target[this._propType] = this._value.x;
            }
        }

        this.callUpdateCallback();
    }

    /**
     * 安全调用开始回调。
     */
    private callStartCallback(): void {
        if (this._onStart) {
            try {
                this._onStart.call(this._onStartCaller, this);
            }
            catch (err) {
                console.log("error in start callback > " + err);
            }
        }
    }

    /**
     * 安全调用更新回调。
     */
    private callUpdateCallback(): void {
        if (this._onUpdate) {
            try {
                this._onUpdate.call(this._onUpdateCaller, this);
            }
            catch (err) {
                console.log("error in update callback > " + err);
            }
        }
    }

    /**
     * 安全调用完成回调。
     */
    private callCompleteCallback(): void {
        if (this._onComplete) {
            try {
                this._onComplete.call(this._onCompleteCaller, this);
            }
            catch (err) {
                console.log("error in complete callback > " + err);
            }
        }
    }
}

