
/**
*Author  : XW
*Desc    : 手势触摸数据对象，负责记录触摸起止信息、超时状态和对象池复用
*/

import GestureLog from "./GestureLog";

/** 手势触摸数据 */
export default class GestureTouchData {
    private static _pool: GestureTouchData[] = [];
    /** 对象池最大数量限制 */
    private static maxPool: number = 200;

    private static hashCode: number = 0;
    /** 唯一标识 */
    public hashCode: number;

    // ===== 回收时需要重置的变量，记得检查一下 =====
    /** 是否完成响应 */
    public isOver: boolean;
    /** 超时定时器 */
    public timer: number;
    /** 触摸起始X坐标 */
    public beginX: number;
    /** 触摸起始Y坐标 */
    public beginY: number;
    /** 触摸结束X坐标 */
    public endX: number;
    /** 触摸结束Y坐标 */
    public endY: number;
    /** 是否正在滑动中 */
    public isMoving: boolean;
    // =============================================

    /**
     * 创建一个手势触摸数据对象。
     * @param beginX 触摸起始X坐标
     * @param beginY 触摸起始Y坐标
     * @param limitTime 响应超时时间（毫秒）
     * @returns 手势触摸数据对象。
     */
    public static create(beginX: number, beginY: number, limitTime?: number): GestureTouchData {
        let data = this._pool.pop();
        if (!data) {
            data = new GestureTouchData();
        }
        data.init(beginX, beginY, limitTime);
        return data;
    }

    private constructor() {
        this.hashCode = GestureTouchData.hashCode++;
    }

    /** 标记当前手势已完成响应 */
    public respond(): void {
        this.isOver = true;
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    /** 回收到对象池 */
    public recover(): void {
        // ====== 重置变量 ======
        this.isOver = null;
        this.timer = null;
        this.beginX = null;
        this.beginY = null;
        this.endX = null;
        this.endY = null;
        this.isMoving = null;
        // ======================
        if (GestureTouchData._pool.length < GestureTouchData.maxPool) {
            GestureTouchData._pool.push(this);
        }
    }

    /**
     * 初始化触摸数据。
     * @param beginX 触摸起始X坐标。
     * @param beginY 触摸起始Y坐标。
     * @param limitTime 响应超时时间（毫秒）。
     */
    private init(beginX: number, beginY: number, limitTime?: number): void {
        this.isOver = false;
        this.beginX = beginX;
        this.beginY = beginY;
        if (limitTime > 0) {
            this.timer = setTimeout(() => {
                if (!this.isOver) {
                    GestureLog.log(`手势响应[${this.hashCode}]已超时`);
                    this.isOver = true;
                    this.timer = null;
                }
            }, limitTime);
        }
    }
}
