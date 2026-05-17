import { Color } from "cc";
import { ObjectPropID } from "../FieldTypes";
import { ByteBuffer } from "../utils/ByteBuffer";
import { GearBase } from "./GearBase";

/**
 * 颜色 Gear，负责在控制器切换时同步颜色与描边色。
 */
export class GearColor extends GearBase {
    /**
     * 各控制器页面对应的颜色状态缓存表。
     */
    private _storage: { [index: string]: GearColorValue };
    /**
     * 未命中特定页面时使用的默认颜色状态。
     */
    private _default: GearColorValue;

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    protected init(): void {
        this._default = {
            color: this._owner.getProp(ObjectPropID.Color),
            strokeColor: this._owner.getProp(ObjectPropID.OutlineColor)
        };
        this._storage = {};
    }

    /**
     * 记录当前控制器页面对应的一份属性快照。
     * @param pageId 控制器页面 ID；为空时写入默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected addStatus(pageId: string, buffer: ByteBuffer): void {
        var gv: GearColorValue;
        if (!pageId)
            gv = this._default;
        else {
            gv = {};
            this._storage[pageId] = gv;
        }

        gv.color = buffer.readColor();
        gv.strokeColor = buffer.readColor();
    }

    /**
     * 将记录状态应用到目标对象。
     */
    public apply(): void {
        this._owner._gearLocked = true;

        var gv: GearColorValue = this._storage[this._controller.selectedPageId] || this._default;
        this._owner.setProp(ObjectPropID.Color, gv.color);
        this._owner.setProp(ObjectPropID.OutlineColor, gv.strokeColor);

        this._owner._gearLocked = false;
    }

    /**
     * 把当前宿主对象状态回写到 Gear 缓存。
     */
    public updateState(): void {
        var gv: GearColorValue = this._storage[this._controller.selectedPageId];
        if (!gv) {
            gv = {};
            this._storage[this._controller.selectedPageId] = gv;
        }

        gv.color = this._owner.getProp(ObjectPropID.Color);
        gv.strokeColor = this._owner.getProp(ObjectPropID.OutlineColor);
    }
}

interface GearColorValue {
    /**
     * 主颜色值。
     */
    color?: Color;
    /**
     * 描边颜色值。
     */
    strokeColor?: Color;
}
