import { Rect, Sprite, SpriteFrame } from "cc";
import { Image } from "./Image";

/**
 * Frame 接口，约束当前模块对象的结构与能力边界。
 */
export interface Frame {
    /**
     * 区域矩形数据。
     */
    rect: Rect;
    /**
     * 附加延迟时间。
     */
    addDelay: number;
    /**
     * 关联的纹理帧资源。
     */
    texture: SpriteFrame | null;
}

/**
 * 底层序列帧组件，负责按时间轴切换帧并支持循环、摆动与补间控制。
 */
export class MovieClip extends Image {
    /**
     * 每帧基础播放间隔。
     */
    public interval: number = 0;
    /**
     * 是否启用往返摆动播放。
     */
    public swing: boolean = false;
    /**
     * 每轮循环结束后的附加等待时间。
     */
    public repeatDelay: number = 0;
    /**
     * 播放时间缩放倍率。
     */
    public timeScale: number = 1;

    /**
     * 当前播放状态。
     */
    private _playing: boolean = true;
    /**
     * 总帧数。
     */
    private _frameCount: number = 0;
    /**
     * 序列帧数据数组。
     */
    private _frames: Array<Frame> | null;
    /**
     * 当前播放到的帧索引。
     */
    private _frame: number = 0;
    /**
     * 播放起始帧。
     */
    private _start: number = 0;
    /**
     * 播放结束帧。
     */
    private _end: number = 0;
    /**
     * 剩余播放次数或目标播放次数。
     */
    private _times: number = 0;
    /**
     * 播放结束后停留的帧索引。
     */
    private _endAt: number = 0;
    /**
     * 当前播放流程状态标记。
     */
    private _status: number = 0; //0-none, 1-next loop, 2-ending, 3-ended
    /**
     * 播放结束后的回调函数。
     */
    private _callback: () => void | null;
    /**
     * 当前是否启用平滑采样。
     */
    private _smoothing: boolean = true;

    /**
     * 当前帧已累计的播放时间。
     */
    private _frameElapsed: number = 0; //当前帧延迟
    /**
     * 当前是否按反向方向播放。
     */
    private _reversed: boolean = false;
    /**
     * 已经完成的循环次数。
     */
    private _repeatedCount: number = 0;

    /**
     * 初始化序列帧播放状态、时间轴参数和底层渲染默认值。
     */
    public constructor() {
        super();
    }

    /**
     * 获取当前序列帧数组。
     */
    public get frames(): Array<Frame> {
        return this._frames;
    }

    /**
     * 设置序列帧数组，并按新帧数重置当前播放索引与显示内容。
     * @param value 新的序列帧数据数组。
     */
    public set frames(value: Array<Frame>) {
        this._frames = value;
        if (this._frames) {
            this._frameCount = this._frames.length;

            if (this._end == -1 || this._end > this._frameCount - 1)
                this._end = this._frameCount - 1;
            if (this._endAt == -1 || this._endAt > this._frameCount - 1)
                this._endAt = this._frameCount - 1;

            if (this._frame < 0 || this._frame > this._frameCount - 1)
                this._frame = this._frameCount - 1;

            this.type = Sprite.Type.SIMPLE;
            this.drawFrame();

            this._frameElapsed = 0;
            this._repeatedCount = 0;
            this._reversed = false;
        }
        else {
            this._frameCount = 0;
        }
    }

    /**
     * 获取当前帧数量。
     */
    public get frameCount(): number {
        return this._frameCount;
    }

    /**
     * 获取当前帧索引。
     */
    public get frame(): number {
        return this._frame;
    }

    /**
     * 设置当前帧索引，并同步到底层动画或显示对象。
     * @param value 目标帧索引。
     */
    public set frame(value: number) {
        if (this._frame != value) {
            if (this._frames && value >= this._frameCount)
                value = this._frameCount - 1;

            this._frame = value;
            this._frameElapsed = 0;
            this.drawFrame();
        }
    }

    /**
     * 获取当前播放状态。
     */
    public get playing(): boolean {
        return this._playing;
    }

    /**
     * 设置播放状态，并同步到底层动画组件。
     * @param value 是否继续播放。
     */
    public set playing(value: boolean) {
        if (this._playing != value) {
            this._playing = value;
        }
    }

    /**
     * 获取当前是否启用平滑采样。
     */
    public get smoothing(): boolean {
        return this._smoothing;
    }

    /**
     * 设置平滑采样开关，并同步到底层 `SpriteFrame` 渲染表现。
     * @param value 是否启用平滑采样。
     */
    public set smoothing(value: boolean) {
        this._smoothing = value;
    }

    /**
     * 将播放进度重置到起始位置。
     */
    public rewind(): void {
        this._frame = 0;
        this._frameElapsed = 0;
        this._reversed = false;
        this._repeatedCount = 0;

        this.drawFrame();
    }

    /**
     * 同步另一实例的播放状态、帧进度或运行时表现。
     */
    public syncStatus(anotherMc: MovieClip): void {
        this._frame = anotherMc._frame;
        this._frameElapsed = anotherMc._frameElapsed;
        this._reversed = anotherMc._reversed;
        this._repeatedCount = anotherMc._repeatedCount;

        this.drawFrame();
    }

    /**
     * 按指定时间推进当前动画或补间状态。
     */
    public advance(timeInSeconds: number): void {
        var beginFrame: number = this._frame;
        var beginReversed: boolean = this._reversed;
        var backupTime: number = timeInSeconds;

        while (true) {
            var tt: number = this.interval + this._frames[this._frame].addDelay;
            if (this._frame == 0 && this._repeatedCount > 0)
                tt += this.repeatDelay;
            if (timeInSeconds < tt) {
                this._frameElapsed = 0;
                break;
            }

            timeInSeconds -= tt;

            if (this.swing) {
                if (this._reversed) {
                    this._frame--;
                    if (this._frame <= 0) {
                        this._frame = 0;
                        this._repeatedCount++;
                        this._reversed = !this._reversed;
                    }
                }
                else {
                    this._frame++;
                    if (this._frame > this._frameCount - 1) {
                        this._frame = Math.max(0, this._frameCount - 2);
                        this._repeatedCount++;
                        this._reversed = !this._reversed;
                    }
                }
            }
            else {
                this._frame++;
                if (this._frame > this._frameCount - 1) {
                    this._frame = 0;
                    this._repeatedCount++;
                }
            }

            if (this._frame == beginFrame && this._reversed == beginReversed) //走了一轮了
            {
                var roundTime: number = backupTime - timeInSeconds; //这就是一轮需要的时间
                timeInSeconds -= Math.floor(timeInSeconds / roundTime) * roundTime; //跳过
            }
        }

        this.drawFrame();
    }

    /**
     * 配置序列帧的播放区间、循环次数和结束回调。
     * @param start 起始帧索引，默认为 `0`。
     * @param end 结束帧索引，`-1` 表示最后一帧。
     * @param times 播放次数，`0` 表示无限循环。
     * @param endAt 播放结束后停留的帧索引，`-1` 表示使用 `end`。
     * @param endCallback 播放结束后的回调函数。
     */
    public setPlaySettings(start?: number, end?: number, times?: number, endAt?: number, endCallback?: (() => void) | null): void {
        if (start == undefined) start = 0;
        if (end == undefined) end = -1;
        if (times == undefined) times = 0;
        if (endAt == undefined) endAt = -1;

        this._start = start;
        this._end = end;
        if (this._end == -1 || this._end > this._frameCount - 1)
            this._end = this._frameCount - 1;
        this._times = times;
        this._endAt = endAt;
        if (this._endAt == -1)
            this._endAt = this._end;
        this._status = 0;
        this._callback = endCallback;

        this.frame = start;
    }

    /**
     * 刷新当前对象的显示结果或内部状态。
     * @param dt 本帧时间增量，单位为秒。
     */
    protected update(dt: number): void {
        if (!this._playing || this._frameCount == 0 || this._status == 3)
            return;

        if (this.timeScale != 1)
            dt *= this.timeScale;

        this._frameElapsed += dt;
        var tt: number = this.interval + this._frames[this._frame].addDelay;
        if (this._frame == 0 && this._repeatedCount > 0)
            tt += this.repeatDelay;
        if (this._frameElapsed < tt)
            return;

        this._frameElapsed -= tt;
        if (this._frameElapsed > this.interval)
            this._frameElapsed = this.interval;

        if (this.swing) {
            if (this._reversed) {
                this._frame--;
                if (this._frame <= 0) {
                    this._frame = 0;
                    this._repeatedCount++;
                    this._reversed = !this._reversed;
                }
            }
            else {
                this._frame++;
                if (this._frame > this._frameCount - 1) {
                    this._frame = Math.max(0, this._frameCount - 2);
                    this._repeatedCount++;
                    this._reversed = !this._reversed;
                }
            }
        }
        else {
            this._frame++;
            if (this._frame > this._frameCount - 1) {
                this._frame = 0;
                this._repeatedCount++;
            }
        }

        if (this._status == 1) //new loop
        {
            this._frame = this._start;
            this._frameElapsed = 0;
            this._status = 0;
        }
        else if (this._status == 2) //ending
        {
            this._frame = this._endAt;
            this._frameElapsed = 0;
            this._status = 3; //ended

            //play end
            if (this._callback != null) {
                let callback = this._callback;
                this._callback = null;
                callback();
            }
        }
        else {
            if (this._frame == this._end) {
                if (this._times > 0) {
                    this._times--;
                    if (this._times == 0)
                        this._status = 2;  //ending
                    else
                        this._status = 1; //new loop
                }
                else if (this._start != 0)
                    this._status = 1; //new loop
            }
        }

        this.drawFrame();
    }

    /**
     * 根据当前帧数据刷新底层渲染内容。
     */
    private drawFrame(): void {
        if (this._frameCount > 0 && this._frame < this._frames.length) {
            var frame: Frame = this._frames[this._frame];
            this.spriteFrame = frame.texture;
        }
    }
}
