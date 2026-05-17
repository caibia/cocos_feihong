import { Controller } from "../Controller";
import { constructingDepth, GObject } from "../GObject";
import { EaseType } from "../tween/EaseType";
import { GTweener } from "../tween/GTweener";
import { ByteBuffer } from "../utils/ByteBuffer";

/**
 * Gear 基类，定义控制器驱动属性同步的公共接口与补间配置。
 */
export class GearBase {
    /**
     * 静态全局禁用补间效果开关。
     */
    public static disableAllTweenEffect?: boolean;

    /**
     * 当前 Gear 关联的宿主对象。
     */
    public _owner: GObject;
    /**
     * 当前 Gear 的驱动控制器。
     */
    protected _controller: Controller;
    /**
     * 当前 Gear 的补间配置。
     */
    protected _tweenConfig: GearTweenConfig;

    /**
     * 释放 Gear 运行时持有的补间器和显示锁引用。
     */
    public dispose(): void {
        if (this._tweenConfig && this._tweenConfig._tweener) {
            this._tweenConfig._tweener.kill();
            this._tweenConfig._tweener = null;
        }
    }

    /**
     * 获取当前控制器。
     */
    public get controller(): Controller {
        return this._controller;
    }

    /**
     * 设置当前 Gear 关联的控制器；后续页签切换都以它作为驱动源。
     * @param val 要关联的控制器实例。
     */
    public set controller(val: Controller) {
        if (val != this._controller) {
            this._controller = val;
            if (this._controller)
                this.init();
        }
    }

    /**
     * 获取当前补间配置。
     */
    public get tweenConfig(): GearTweenConfig {
        if (!this._tweenConfig)
            this._tweenConfig = new GearTweenConfig();
        return this._tweenConfig;
    }

    /**
     * 获取当前允许补间开关。
     */
    protected get allowTween(): boolean {
        return this._tweenConfig && this._tweenConfig.tween && constructingDepth.n == 0 && !GearBase.disableAllTweenEffect;
    }

    /**
     * 根据序列化数据初始化当前对象配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    public setup(buffer: ByteBuffer): void {
        this._controller = this._owner.parent.getControllerAt(buffer.readShort());
        this.init();

        var i: number;
        var page: string;
        var cnt: number = buffer.readShort();

        if ("pages" in this) {
            (<any>this).pages = buffer.readSArray(cnt);
        }
        else {
            for (i = 0; i < cnt; i++) {
                page = buffer.readS();
                if (page == null)
                    continue;

                this.addStatus(page, buffer);
            }

            if (buffer.readBool())
                this.addStatus(null, buffer);
        }

        if (buffer.readBool()) {
            this._tweenConfig = new GearTweenConfig();
            this._tweenConfig.easeType = buffer.readByte();
            this._tweenConfig.duration = buffer.readFloat();
            this._tweenConfig.delay = buffer.readFloat();
        }

        if (buffer.version >= 2) {
            if ("positionsInPercent" in this) {
                if (buffer.readBool()) {
                    (<any>this).positionsInPercent = true;
                    for (i = 0; i < cnt; i++) {
                        page = buffer.readS();
                        if (page == null)
                            continue;

                        (<any>this).addExtStatus(page, buffer);
                    }

                    if (buffer.readBool())
                        (<any>this).addExtStatus(null, buffer);
                }
            }
            else if ("condition" in this)
                (<any>this).condition = buffer.readByte();
        }
    }

    /**
     * 当关系系统改动位置或尺寸时，把差值同步到 Gear 缓存。
     * @param dx X 方向变化量。
     * @param dy Y 方向变化量。
     */
    public updateFromRelations(dx: number, dy: number): void {

    }

    /**
     * 记录当前控制器页面对应的一份属性快照。
     * @param pageId 控制器页面 ID。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected addStatus(pageId: string, buffer: ByteBuffer): void {

    }

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    protected init(): void {

    }

    /**
     * 将记录状态应用到目标对象。
     */
    public apply(): void {
    }

    /**
     * 把当前宿主对象状态回写到 Gear 缓存。
     */
    public updateState(): void {
    }
}

/**
 * Gear 补间配置，描述缓动时间、延迟与缓动类型等参数。
 */
export class GearTweenConfig {
    /**
     * 是否启用补间过渡。
     */
    public tween: boolean;
    /**
     * 缓动类型。
     */
    public easeType: number;
    /**
     * 补间持续时间。
     */
    public duration: number;
    /**
     * 延迟时间。
     */
    public delay: number;

    /**
     * 运行时申请到的显示锁令牌。
     */
    public _displayLockToken: number;
    /**
     * 当前运行中的补间器实例。
     */
    public _tweener: GTweener;

    /**
     * 初始化 Gear 补间配置的默认参数。
     */
    constructor() {
        this.tween = true;
        this.easeType = EaseType.QuadOut;
        this.duration = 0.3;
        this.delay = 0;
    }
}

    /**
     * `IGearTweenObject` 接口，约束支持 Gear 补间对象的必要能力。
     */
export interface IGearXY {

}
