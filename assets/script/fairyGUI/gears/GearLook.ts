import { GTween } from "../tween/GTween";
import { GTweener } from "../tween/GTweener";
import { ByteBuffer } from "../utils/ByteBuffer";
import { GearBase } from "./GearBase";

/**
 * 外观 Gear，负责在控制器切换时同步透明度、旋转与可触摸性。
 */
export class GearLook extends GearBase {
    /**
     * 各控制器页面对应的外观状态缓存表。
     */
    private _storage: { [index: string]: GearLookValue };
    /**
     * 未命中特定页面时使用的默认外观状态。
     */
    private _default: GearLookValue;

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    protected init(): void {
        this._default = {
            alpha: this._owner.alpha,
            rotation: this._owner.rotation,
            grayed: this._owner.grayed,
            touchable: this._owner.touchable
        };
        this._storage = {};
    }

    /**
     * 记录当前控制器页面对应的一份属性快照。
     * @param pageId 控制器页面 ID；为空时写入默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected addStatus(pageId: string, buffer: ByteBuffer): void {
        var gv: GearLookValue;
        if (!pageId)
            gv = this._default;
        else {
            gv = {};
            this._storage[pageId] = gv;
        }

        gv.alpha = buffer.readFloat();
        gv.rotation = buffer.readFloat();
        gv.grayed = buffer.readBool();
        gv.touchable = buffer.readBool();
    }

    /**
     * 将记录状态应用到目标对象。
     */
    public apply(): void {
        var gv: GearLookValue = this._storage[this._controller.selectedPageId] || this._default;

        if (this.allowTween) {
            this._owner._gearLocked = true;
            this._owner.grayed = gv.grayed;
            this._owner.touchable = gv.touchable;
            this._owner._gearLocked = false;

            if (this._tweenConfig._tweener) {
                if (this._tweenConfig._tweener.endValue.x != gv.alpha || this._tweenConfig._tweener.endValue.y != gv.rotation) {
                    this._tweenConfig._tweener.kill(true);
                    this._tweenConfig._tweener = null;
                }
                else
                    return;
            }

            var a: boolean = gv.alpha != this._owner.alpha;
            var b: boolean = gv.rotation != this._owner.rotation;
            if (a || b) {
                if (this._owner.checkGearController(0, this._controller))
                    this._tweenConfig._displayLockToken = this._owner.addDisplayLock();

                this._tweenConfig._tweener = GTween.to2(this._owner.alpha, this._owner.rotation, gv.alpha, gv.rotation, this._tweenConfig.duration)
                    .setDelay(this._tweenConfig.delay)
                    .setEase(this._tweenConfig.easeType)
                    .setUserData((a ? 1 : 0) + (b ? 2 : 0))
                    .setTarget(this)
                    .onUpdate(this.__tweenUpdate, this)
                    .onComplete(this.__tweenComplete, this);
            }
        }
        else {
            this._owner._gearLocked = true;
            this._owner.grayed = gv.grayed;
            this._owner.alpha = gv.alpha;
            this._owner.rotation = gv.rotation;
            this._owner.touchable = gv.touchable;
            this._owner._gearLocked = false;
        }
    }

    /**
     * 在外观补间进行中持续同步透明度和旋转值。
     * @param tweener 当前运行中的补间器。
     */
    private __tweenUpdate(tweener: GTweener): void {
        var flag: number = tweener.userData;
        this._owner._gearLocked = true;
        if ((flag & 1) != 0)
            this._owner.alpha = tweener.value.x;
        if ((flag & 2) != 0)
            this._owner.rotation = tweener.value.y;
        this._owner._gearLocked = false;
    }

    /**
     * 在外观补间完成后释放显示锁并清理补间引用。
     */
    private __tweenComplete(): void {
        if (this._tweenConfig._displayLockToken != 0) {
            this._owner.releaseDisplayLock(this._tweenConfig._displayLockToken);
            this._tweenConfig._displayLockToken = 0;
        }
        this._tweenConfig._tweener = null;
    }

    /**
     * 把当前宿主对象状态回写到 Gear 缓存。
     */
    public updateState(): void {
        var gv: GearLookValue = this._storage[this._controller.selectedPageId];
        if (!gv) {
            gv = {};
            this._storage[this._controller.selectedPageId] = gv;
        }

        gv.alpha = this._owner.alpha;
        gv.rotation = this._owner.rotation;
        gv.grayed = this._owner.grayed;
        gv.touchable = this._owner.touchable;
    }
}

interface GearLookValue {
    /**
     * 透明度数值。
     */
    alpha?: number;
    /**
     * 旋转角度。
     */
    rotation?: number;
    /**
     * 是否处于灰度状态。
     */
    grayed?: boolean;
    /**
     * 是否允许响应交互。
     */
    touchable?: boolean;
}
