import { GTween } from "../tween/GTween";
import { GTweener } from "../tween/GTweener";
import { ByteBuffer } from "../utils/ByteBuffer";
import { GearBase } from "./GearBase";

/**
 * 尺寸 Gear，负责在控制器切换时同步尺寸与缩放。
 */
export class GearSize extends GearBase {
    /**
     * 各控制器页面对应的尺寸状态缓存表。
     */
    private _storage: { [index: string]: GearSizeValue };
    /**
     * 未命中特定页面时使用的默认尺寸状态。
     */
    private _default: GearSizeValue;

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    protected init(): void {
        this._default = {
            width: this._owner.width,
            height: this._owner.height,
            scaleX: this._owner.scaleX,
            scaleY: this._owner.scaleY
        };
        this._storage = {};
    }

    /**
     * 记录当前控制器页面对应的一份属性快照。
     * @param pageId 控制器页面 ID；为空时写入默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected addStatus(pageId: string, buffer: ByteBuffer): void {
        var gv: GearSizeValue;
        if (!pageId)
            gv = this._default;
        else {
            gv = {};
            this._storage[pageId] = gv;
        }

        gv.width = buffer.readInt();
        gv.height = buffer.readInt();
        gv.scaleX = buffer.readFloat();
        gv.scaleY = buffer.readFloat();
    }

    /**
     * 将记录状态应用到目标对象。
     */
    public apply(): void {
        var gv: GearSizeValue = this._storage[this._controller.selectedPageId] || this._default;

        if (this.allowTween) {
            if (this._tweenConfig._tweener) {
                if (this._tweenConfig._tweener.endValue.x != gv.width || this._tweenConfig._tweener.endValue.y != gv.height
                    || this._tweenConfig._tweener.endValue.z != gv.scaleX || this._tweenConfig._tweener.endValue.w != gv.scaleY) {
                    this._tweenConfig._tweener.kill(true);
                    this._tweenConfig._tweener = null;
                }
                else
                    return;
            }

            var a: boolean = gv.width != this._owner.width || gv.height != this._owner.height;
            var b: boolean = gv.scaleX != this._owner.scaleX || gv.scaleY != this._owner.scaleY;
            if (a || b) {
                if (this._owner.checkGearController(0, this._controller))
                    this._tweenConfig._displayLockToken = this._owner.addDisplayLock();

                this._tweenConfig._tweener = GTween.to4(this._owner.width, this._owner.height, this._owner.scaleX, this._owner.scaleY, gv.width, gv.height, gv.scaleX, gv.scaleY, this._tweenConfig.duration)
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
            this._owner.setSize(gv.width, gv.height, this._owner.checkGearController(1, this._controller));
            this._owner.setScale(gv.scaleX, gv.scaleY);
            this._owner._gearLocked = false;
        }
    }

    /**
     * 在尺寸补间进行中持续同步宽高和缩放值。
     * @param tweener 当前运行中的补间器。
     */
    private __tweenUpdate(tweener: GTweener): void {
        var flag: number = tweener.userData;
        this._owner._gearLocked = true;
        if ((flag & 1) != 0)
            this._owner.setSize(tweener.value.x, tweener.value.y, this._owner.checkGearController(1, this._controller));
        if ((flag & 2) != 0)
            this._owner.setScale(tweener.value.z, tweener.value.w);
        this._owner._gearLocked = false;
    }

    /**
     * 在尺寸补间完成后释放显示锁并清理补间引用。
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
        var gv: GearSizeValue = this._storage[this._controller.selectedPageId];
        if (!gv) {
            gv = {};
            this._storage[this._controller.selectedPageId] = gv;
        }

        gv.width = this._owner.width;
        gv.height = this._owner.height;
        gv.scaleX = this._owner.scaleX;
        gv.scaleY = this._owner.scaleY;
    }

    /**
     * 当关系系统改动位置或尺寸时，把差值同步到 Gear 缓存。
     * @param dx X 方向变化量。
     * @param dy Y 方向变化量。
     */
    public updateFromRelations(dx: number, dy: number): void {
        if (this._controller == null || this._storage == null)
            return;

        for (var key in this._storage) {
            var gv: GearSizeValue = this._storage[key];
            gv.width += dx;
            gv.height += dy;
        }
        this._default.width += dx;
        this._default.height += dy;

        this.updateState();
    }
}

interface GearSizeValue {
    /**
     * 宽度值。
     */
    width?: number;
    /**
     * 高度值。
     */
    height?: number;
    /**
     * X 方向缩放值。
     */
    scaleX?: number;
    /**
     * Y 方向缩放值。
     */
    scaleY?: number;
}

