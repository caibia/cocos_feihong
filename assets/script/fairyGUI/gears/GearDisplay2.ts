import { GearBase } from "./GearBase";

/**
 * 扩展显示 Gear，负责处理条件组合下的显示门控逻辑。
 */
export class GearDisplay2 extends GearBase {
    /**
     * 当前 Gear 生效的页面 ID 列表。
     */
    public pages: string[] = null;
    /**
     * 页面命中条件；决定多个页面规则按与还是按或生效。
     */
    public condition: number = 0;

    /**
     * 当前 Gear 判定得到的可见状态。
     */
    private _visible: number = 0;

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    protected init(): void {
        this.pages = null;
    }

    /**
     * 将记录状态应用到目标对象。
     */
    public apply(): void {
        if (this.pages == null || this.pages.length == 0
            || this.pages.indexOf(this._controller.selectedPageId) != -1)
            this._visible = 1;
        else
            this._visible = 0;
    }

    /**
     * 计算当前 Gear 的生效结果。
     * @param connected 当前对象是否已满足上游显示连接条件。
     * @returns 当前 Gear 是否判定为可显示。
     */
    public evaluate(connected: boolean): boolean {
        var v: boolean = this._controller == null || this._visible > 0;
        if (this.condition == 0)
            v = v && connected;
        else
            v = v || connected;
        return v;
    }
}
