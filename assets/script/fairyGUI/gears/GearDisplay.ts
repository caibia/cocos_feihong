import { GearBase } from "./GearBase";

/**
 * 显示 Gear，负责根据控制器页签决定对象是否可显示。
 */
export class GearDisplay extends GearBase {
    /**
     * 当前 Gear 生效的页面 ID 列表。
     */
    public pages: string[] = null;

    /**
     * 当前 Gear 判定得到的可见状态。
     */
    private _visible: number = 0;
    /**
     * 当前持有的显示锁令牌。
     */
    private _displayLockToken: number = 1;

    /**
     * 初始化当前对象的内部状态与运行时依赖。
     */
    protected init(): void {
        this.pages = null;
    }

    /**
     * 申请一个显示锁令牌，避免对象在 Gear 判定期间被提前隐藏。
     */
    public addLock(): number {
        this._visible++;
        return this._displayLockToken;
    }

    /**
     * 释放显示锁令牌。
     * @param token 要释放的显示锁令牌。
     */
    public releaseLock(token: number): void {
        if (token == this._displayLockToken)
            this._visible--;
    }

    /**
     * 获取当前连接状态。
     */
    public get connected(): boolean {
        return this._controller == null || this._visible > 0;
    }

    /**
     * 将记录状态应用到目标对象。
     */
    public apply(): void {
        this._displayLockToken++;
        if (this._displayLockToken <= 0)
            this._displayLockToken = 1;

        if (this.pages == null || this.pages.length == 0
            || this.pages.indexOf(this._controller.selectedPageId) != -1)
            this._visible = 1;
        else
            this._visible = 0;
    }
}
