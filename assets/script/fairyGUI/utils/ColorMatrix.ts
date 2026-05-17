
/**
 * 颜色矩阵工具，负责构建亮度、饱和度、对比度等颜色变换矩阵。
 */
export class ColorMatrix {
    public readonly matrix: Array<number>;

    /**
     * 初始化 4x5 颜色矩阵，并默认写入单位矩阵。
     * @param p_brightness 亮度调整值。
     * @param p_contrast 对比度调整值。
     * @param p_saturation 饱和度调整值。
     * @param p_hue 色相调整值。
     */
    public constructor(p_brightness?: number, p_contrast?: number, p_saturation?: number, p_hue?: number) {
        this.matrix = new Array<number>(LENGTH);
        this.reset();

        if (p_brightness !== undefined || p_contrast !== undefined || p_saturation !== undefined || p_hue !== undefined)
            this.adjustColor(p_brightness, p_contrast, p_saturation, p_hue);
    }

    /**
     * 重置当前对象到初始状态。
     */
    public reset(): void {
        for (var i: number = 0; i < LENGTH; i++) {
            this.matrix[i] = IDENTITY_MATRIX[i];
        }
    }

    /**
     * 对当前颜色矩阵应用反相变换。
     */
    public invert(): void {
        this.multiplyMatrix([-1, 0, 0, 0, 255,
            0, -1, 0, 0, 255,
            0, 0, -1, 0, 255,
            0, 0, 0, 1, 0]);
    }

    /**
     * 按亮度、对比度、饱和度与色相参数组合调整颜色矩阵。
     * @param p_brightness 亮度调整值。
     * @param p_contrast 对比度调整值。
     * @param p_saturation 饱和度调整值。
     * @param p_hue 色相调整值。
     */
    public adjustColor(p_brightness: number, p_contrast: number, p_saturation: number, p_hue: number): void {
        this.adjustHue(p_hue || 0);
        this.adjustContrast(p_contrast || 0);
        this.adjustBrightness(p_brightness || 0);
        this.adjustSaturation(p_saturation || 0);
    }

    /**
     * 调整颜色矩阵的亮度。
     * @param p_val 亮度调整值。
     */
    public adjustBrightness(p_val: number): void {
        p_val = this.cleanValue(p_val, 1) * 255;
        this.multiplyMatrix([
            1, 0, 0, 0, p_val,
            0, 1, 0, 0, p_val,
            0, 0, 1, 0, p_val,
            0, 0, 0, 1, 0
        ]);
    }

    /**
     * 调整颜色矩阵的对比度。
     * @param p_val 对比度调整值。
     */
    public adjustContrast(p_val: number): void {
        p_val = this.cleanValue(p_val, 1);
        var s: number = p_val + 1;
        var o: number = 128 * (1 - s);
        this.multiplyMatrix([
            s, 0, 0, 0, o,
            0, s, 0, 0, o,
            0, 0, s, 0, o,
            0, 0, 0, 1, 0
        ]);
    }

    /**
     * 调整颜色矩阵的饱和度。
     * @param p_val 饱和度调整值。
     */
    public adjustSaturation(p_val: number): void {
        p_val = this.cleanValue(p_val, 1);
        p_val += 1;

        var invSat: number = 1 - p_val;
        var invLumR: number = invSat * LUMA_R;
        var invLumG: number = invSat * LUMA_G;
        var invLumB: number = invSat * LUMA_B;

        this.multiplyMatrix([
            (invLumR + p_val), invLumG, invLumB, 0, 0,
            invLumR, (invLumG + p_val), invLumB, 0, 0,
            invLumR, invLumG, (invLumB + p_val), 0, 0,
            0, 0, 0, 1, 0
        ]);
    }

    /**
     * 调整颜色矩阵的色相。
     * @param p_val 色相调整值。
     */
    public adjustHue(p_val: number): void {
        p_val = this.cleanValue(p_val, 1);
        p_val *= Math.PI;

        var cos: number = Math.cos(p_val);
        var sin: number = Math.sin(p_val);

        this.multiplyMatrix([
            ((LUMA_R + (cos * (1 - LUMA_R))) + (sin * -(LUMA_R))), ((LUMA_G + (cos * -(LUMA_G))) + (sin * -(LUMA_G))), ((LUMA_B + (cos * -(LUMA_B))) + (sin * (1 - LUMA_B))), 0, 0,
            ((LUMA_R + (cos * -(LUMA_R))) + (sin * 0.143)), ((LUMA_G + (cos * (1 - LUMA_G))) + (sin * 0.14)), ((LUMA_B + (cos * -(LUMA_B))) + (sin * -0.283)), 0, 0,
            ((LUMA_R + (cos * -(LUMA_R))) + (sin * -((1 - LUMA_R)))), ((LUMA_G + (cos * -(LUMA_G))) + (sin * LUMA_G)), ((LUMA_B + (cos * (1 - LUMA_B))) + (sin * LUMA_B)), 0, 0,
            0, 0, 0, 1, 0
        ]);
    }

    /**
     * 将另一组矩阵结果拼接到当前颜色矩阵后面。
     * @param p_matrix 要拼接的目标矩阵。
     */
    public concat(p_matrix: Array<number>): void {
        if (p_matrix.length != LENGTH) { return; }
        this.multiplyMatrix(p_matrix);
    }

    /**
     * 克隆当前对象并返回副本。
     */
    public clone(): ColorMatrix {
        var result: ColorMatrix = new ColorMatrix();
        result.copyMatrix(this.matrix);
        return result;
    }

    /**
     * 把目标矩阵数据拷贝到当前矩阵。
     * @param p_matrix 源矩阵数据。
     */
    protected copyMatrix(p_matrix: Array<number>): void {
        var l: number = LENGTH;
        for (var i: number = 0; i < l; i++) {
            this.matrix[i] = p_matrix[i];
        }
    }

    /**
     * 将当前矩阵与目标矩阵相乘，生成复合变换结果。
     * @param p_matrix 要参与相乘的目标矩阵。
     */
    protected multiplyMatrix(p_matrix: Array<number>): void {
        var col: Array<number> = [];

        var i: number = 0;

        for (var y: number = 0; y < 4; ++y) {
            for (var x: number = 0; x < 5; ++x) {
                col[i + x] = p_matrix[i] * this.matrix[x] +
                    p_matrix[i + 1] * this.matrix[x + 5] +
                    p_matrix[i + 2] * this.matrix[x + 10] +
                    p_matrix[i + 3] * this.matrix[x + 15] +
                    (x == 4 ? p_matrix[i + 4] : 0);
            }

            i += 5;
        }

        this.copyMatrix(col);
    }

    /**
     * 把输入值裁剪到当前算法允许的合法范围内。
     * @param p_val 原始输入值。
     * @param p_limit 允许的绝对值上限。
     * @returns 清洗后的合法值。
     */
    protected cleanValue(p_val: number, p_limit: number): number {
        return Math.min(p_limit, Math.max(-p_limit, p_val));
    }
}

// identity matrix constant:
const IDENTITY_MATRIX: Array<number> = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0
];
const LENGTH: number = IDENTITY_MATRIX.length;

const LUMA_R: number = 0.299;
const LUMA_G: number = 0.587;
const LUMA_B: number = 0.114;
