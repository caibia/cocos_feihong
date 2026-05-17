
/**
 * 补间值容器，用于在缓动系统中统一保存标量和向量结果。
 */
export class TweenValue {
    /**
     * 第一分量数值。
     */
    public x: number;
    /**
     * 第二分量数值。
     */
    public y: number;
    /**
     * 第三分量数值。
     */
    public z: number;
    /**
     * 第四分量数值。
     */
    public w: number;

    /**
     * 初始化补间值容器的各个分量与颜色字段。
     */
    public constructor() {
        this.x = this.y = this.z = this.w = 0;
    }

    /**
     * 获取当前颜色。
     */
    public get color(): number {
        return (this.w << 24) + (this.x << 16) + (this.y << 8) + this.z;
    }

    /**
     * 设置颜色，并同步到底层渲染组件。
     * @param value 32 位整型颜色值。
     */
    public set color(value: number) {
        this.x = (value & 0xFF0000) >> 16;
        this.y = (value & 0x00FF00) >> 8;
        this.z = (value & 0x0000FF);
        this.w = (value & 0xFF000000) >> 24;
    }

    /**
     * 按索引读取补间值容器中的指定分量。
     * @param index 分量索引，范围为 `0` 到 `3`。
     * @returns 对应分量的值。
     */
    public getField(index: number): number {
        switch (index) {
            case 0:
                return this.x;
            case 1:
                return this.y;
            case 2:
                return this.z;
            case 3:
                return this.w;
            default:
                throw new Error("Index out of bounds: " + index);
        }
    }

    /**
     * 按索引写入补间值容器中的指定分量。
     * @param index 分量索引，范围为 `0` 到 `3`。
     * @param value 要写入的分量值。
     */
    public setField(index: number, value: number): void {
        switch (index) {
            case 0:
                this.x = value;
                break;
            case 1:
                this.y = value;
                break;
            case 2:
                this.z = value;
                break;
            case 3:
                this.w = value;
                break;
            default:
                throw new Error("Index out of bounds: " + index);
        }
    }

    /**
     * 将补间值容器的全部分量清零。
     */
    public setZero(): void {
        this.x = this.y = this.z = this.w = 0;
    }
}
