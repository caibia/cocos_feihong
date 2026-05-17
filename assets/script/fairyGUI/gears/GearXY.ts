import { GTween } from "../tween/GTween";
import { GTweener } from "../tween/GTweener";
import { ByteBuffer } from "../utils/ByteBuffer";
import { GearBase } from "./GearBase";

/**
 * 坐标 Gear，负责在控制器切换时同步位置。
 */
export class GearXY extends GearBase {
    /**
     * 是否以父容器百分比坐标记录位置。
     */
    public positionsInPercent: boolean;

    /**
     * 各控制器页面对应的位置状态缓存表。
     */
    private _storage: { [index: string]: GearXYValue };
    /**
     * 未命中特定页面时使用的默认位置状态。
     */
    private _default: GearXYValue;

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    protected init(): void {
        this._default = {
            x: this._owner.x,
            y: this._owner.y,
            px: this._owner.x / this._owner.parent.width,
            py: this._owner.y / this._owner.parent.height
        };
        this._storage = {};
    }

    /**
     * 记录当前控制器页面对应的一份属性快照。
     * @param pageId 控制器页面 ID；为空时写入默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected addStatus(pageId: string, buffer: ByteBuffer): void {
        var gv: GearXYValue;
        if (!pageId)
            gv = this._default;
        else {
            gv = {};
            this._storage[pageId] = gv;
        }
        gv.x = buffer.readInt();
        gv.y = buffer.readInt();
    }

    /**
     * 记录扩展状态快照，供额外插值或偏移逻辑使用。
     * @param pageId 控制器页面 ID；为空时写入默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    public addExtStatus(pageId: string, buffer: ByteBuffer): void {
        var gv: GearXYValue;
        if (!pageId)
            gv = this._default;
        else
            gv = this._storage[pageId];
        gv.px = buffer.readFloat();
        gv.py = buffer.readFloat();
    }

    /**
     * 将记录状态应用到目标对象。
     */
    public apply(): void {
        var pt: GearXYValue = this._storage[this._controller.selectedPageId] || this._default;
        var ex: number;
        var ey: number;

        if (this.positionsInPercent && this._owner.parent) {
            ex = pt.px * this._owner.parent.width;
            ey = pt.py * this._owner.parent.height;
        }
        else {
            ex = pt.x;
            ey = pt.y;
        }

        if (this.allowTween) {
            if (this._tweenConfig._tweener) {
                if (this._tweenConfig._tweener.endValue.x != ex || this._tweenConfig._tweener.endValue.y != ey) {
                    this._tweenConfig._tweener.kill(true);
                    this._tweenConfig._tweener = null;
                }
                else
                    return;
            }

            var ox: number = this._owner.x;
            var oy: number = this._owner.y;

            if (ox != ex || oy != ey) {
                if (this._owner.checkGearController(0, this._controller))
                    this._tweenConfig._displayLockToken = this._owner.addDisplayLock();

                this._tweenConfig._tweener = GTween.to2(ox, oy, ex, ey, this._tweenConfig.duration)
                    .setDelay(this._tweenConfig.delay)
                    .setEase(this._tweenConfig.easeType)
                    .setTarget(this)
                    .onUpdate(this.__tweenUpdate, this)
                    .onComplete(this.__tweenComplete, this);
            }
        }
        else {
            this._owner._gearLocked = true;
            this._owner.setPosition(ex, ey);
            this._owner._gearLocked = false;
        }
    }

    /**
     * 在位置补间进行中持续同步对象坐标。
     * @param tweener 当前运行中的补间器。
     */
    private __tweenUpdate(tweener: GTweener): void {
        this._owner._gearLocked = true;
        this._owner.setPosition(tweener.value.x, tweener.value.y);
        this._owner._gearLocked = false;
    }

    /**
     * 在位置补间完成后释放显示锁并清理补间引用。
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
        var pt: GearXYValue = this._storage[this._controller.selectedPageId];
        if (!pt) {
            pt = {};
            this._storage[this._controller.selectedPageId] = pt;
        }

        pt.x = this._owner.x;
        pt.y = this._owner.y;
        pt.px = this._owner.x / this._owner.parent.width;
        pt.py = this._owner.y / this._owner.parent.height;
    }

    /**
     * 当关系系统改动位置或尺寸时，把差值同步到 Gear 缓存。
     * @param dx X 方向变化量。
     * @param dy Y 方向变化量。
     */
    public updateFromRelations(dx: number, dy: number): void {
        if (this._controller == null || this._storage == null || this.positionsInPercent)
            return;

        for (var key in this._storage) {
            var pt: GearXYValue = this._storage[key];
            pt.x += dx;
            pt.y += dy;
        }
        this._default.x += dx;
        this._default.y += dy;

        this.updateState();
    }
}

interface GearXYValue {
    x?: number,
    y?: number,
    /**
     * X 方向百分比坐标。
     */
    px?: number;
    /**
     * Y 方向百分比坐标。
     */
    py?: number
}
