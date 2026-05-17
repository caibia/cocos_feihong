import { GearBase } from "./GearBase";
import { ByteBuffer } from "../utils/ByteBuffer";
import { ObjectPropID } from "../FieldTypes";

/**
 * 动画 Gear，负责在控制器切换时同步播放状态与帧索引。
 */
export class GearAnimation extends GearBase {
    /**
     * 各控制器页面对应的动画状态缓存表。
     */
    private _storage: { [index: string]: GearAnimationValue };
    /**
     * 未命中特定页面时使用的默认动画状态。
     */
    private _default: GearAnimationValue;

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    protected init(): void {
        this._default = {
            playing: this._owner.getProp(ObjectPropID.Playing),
            frame: this._owner.getProp(ObjectPropID.Frame)
        };
        this._storage = {};
    }

    /**
     * 记录当前控制器页面对应的一份属性快照。
     * @param pageId 控制器页面 ID；为空时写入默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected addStatus(pageId: string, buffer: ByteBuffer): void {
        var gv: GearAnimationValue;
        if (!pageId)
            gv = this._default;
        else {
            gv = {};
            this._storage[pageId] = gv;
        }
        gv.playing = buffer.readBool();
        gv.frame = buffer.readInt();
    }

    /**
     * 将记录状态应用到目标对象。
     */
    public apply(): void {
        this._owner._gearLocked = true;

        var gv: GearAnimationValue = this._storage[this._controller.selectedPageId] || this._default;
        this._owner.setProp(ObjectPropID.Playing, gv.playing);
        this._owner.setProp(ObjectPropID.Frame, gv.frame);

        this._owner._gearLocked = false;
    }

    /**
     * 把当前宿主对象状态回写到 Gear 缓存。
     */
    public updateState(): void {
        var gv: GearAnimationValue = this._storage[this._controller.selectedPageId];
        if (!gv) {
            gv = {};
            this._storage[this._controller.selectedPageId] = gv;
        }

        gv.playing = this._owner.getProp(ObjectPropID.Playing);
        gv.frame = this._owner.getProp(ObjectPropID.Frame);
    }
}

interface GearAnimationValue {
    /**
     * 播放状态开关。
     */
    playing?: boolean;
    /**
     * 当前帧索引。
     */
    frame?: number;
}

