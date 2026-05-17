import { ByteBuffer } from "../utils/ByteBuffer";
import { GearBase } from "./GearBase";

/**
 * 文本 Gear，负责在控制器切换时同步文本内容。
 */
export class GearText extends GearBase {
    /**
     * 各控制器页面对应的文本缓存表。
     */
    private _storage: { [index: string]: string };
    /**
     * 未命中特定页面时使用的默认文本。
     */
    private _default: string;

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    protected init(): void {
        this._default = this._owner.text;
        this._storage = {};
    }

    /**
     * 记录当前控制器页面对应的一份属性快照。
     * @param pageId 控制器页面 ID；为空时写入默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected addStatus(pageId: string, buffer: ByteBuffer): void {
        if (pageId == null)
            this._default = buffer.readS();
        else
            this._storage[pageId] = buffer.readS();
    }

    /**
     * 将记录状态应用到目标对象。
     */
    public apply(): void {
        this._owner._gearLocked = true;

        var data: any = this._storage[this._controller.selectedPageId];
        if (data !== undefined)
            this._owner.text = data;
        else
            this._owner.text = this._default;

        this._owner._gearLocked = false;
    }

    /**
     * 把当前宿主对象状态回写到 Gear 缓存。
     */
    public updateState(): void {
        this._storage[this._controller.selectedPageId] = this._owner.text;
    }
}
