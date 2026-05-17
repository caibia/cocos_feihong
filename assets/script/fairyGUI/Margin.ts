
/**
 * 边距数据结构，用于统一保存上下左右四个方向的留白。
 */
export class Margin {
    /**
     * 左边距。
     */
    public left: number = 0;
    /**
     * 右边距。
     */
    public right: number = 0;
    /**
     * 上边距。
     */
    public top: number = 0;
    /**
     * 下边距。
     */
    public bottom: number = 0;

    /**
     * 初始化四个方向的边距值。
     */
    public constructor() {
    }

    /**
     * 将目标数据拷贝到当前对象。
     * @param source 源边距对象。
     */
    public copy(source: Margin): void {
        this.top = source.top;
        this.bottom = source.bottom;
        this.left = source.left;
        this.right = source.right;
    }

    /**
     * 判断当前边距是否全部为零。
     */
    public isNone(): boolean {
        return this.left == 0 && this.right == 0 && this.top == 0 && this.bottom == 0;
    }
}
