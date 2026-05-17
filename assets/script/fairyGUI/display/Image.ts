import { Material, Sprite, UITransform, Vec2 } from "cc";
import { FillMethod, FillOrigin, FlipType } from "../FieldTypes";

/**
 * 底层图片渲染组件，扩展 Sprite 以支持翻转、九宫格与填充效果。
 */
export class Image extends Sprite {
    /**
     * 当前图片翻转方式。
     */
    private _flip: FlipType = FlipType.None;
    /**
     * 当前填充方法。
     */
    private _fillMethod: FillMethod = FillMethod.None;
    /**
     * 当前填充起点方向。
     */
    private _fillOrigin: FillOrigin = FillOrigin.Left;
    /**
     * 当前填充比例。
     */
    private _fillAmount: number = 0;
    /**
     * 当前是否按顺时针方向填充。
     */
    private _fillClockwise: boolean;

    /**
     * 初始化底层图片渲染组件的翻转、填充和九宫格相关默认状态。
     */
    public constructor() {
        super();
    }

    /**
     * 获取当前图片翻转方式。
     */
    public get flip(): FlipType {
        return this._flip;
    }

    /**
     * 设置图片翻转方式，并立即刷新顶点和 UV 结果。
     * @param value 目标翻转方式。
     */
    public set flip(value: FlipType) {
        if (this._flip != value) {
            this._flip = value;

            let sx = 1, sy = 1;
            if (this._flip == FlipType.Horizontal || this._flip == FlipType.Both)
                sx = -1;
            if (this._flip == FlipType.Vertical || this._flip == FlipType.Both)
                sy = -1;

            if (sx != 1 || sy != 1) {
                let uiTrans = this.node.getComponent(UITransform)!;
                uiTrans.setAnchorPoint(0.5, 0.5);
            }
            this.node.setScale(sx, sy);
        }
    }

    /**
     * 获取当前填充方法。
     */
    public get fillMethod(): FillMethod {
        return this._fillMethod;
    }

    /**
     * 设置填充方法，并同步到底层渲染组件。
     * @param value 目标填充方法。
     */
    public set fillMethod(value: FillMethod) {
        if (this._fillMethod != value) {
            this._fillMethod = value;
            if (this._fillMethod != 0) {
                this.type = Sprite.Type.FILLED;
                if (this._fillMethod <= 3)
                    this.fillType = <number>this._fillMethod - 1;
                else
                    this.fillType = Sprite.FillType.RADIAL;
                this.fillCenter = new Vec2(0.5, 0.5);

                this.setupFill();
            }
            else {
                this.type = Sprite.Type.SIMPLE;
            }
        }
    }

    /**
     * 获取当前填充起点。
     */
    public get fillOrigin(): FillOrigin {
        return this._fillOrigin;
    }

    /**
     * 设置填充起点，并同步到底层渲染组件。
     * @param value 目标填充起点方向。
     */
    public set fillOrigin(value: FillOrigin) {
        if (this._fillOrigin != value) {
            this._fillOrigin = value;
            if (this._fillMethod != 0)
                this.setupFill();
        }
    }

    /**
     * 获取当前是否按顺时针方向填充。
     */
    public get fillClockwise(): boolean {
        return this._fillClockwise;
    }

    /**
     * 设置填充方向，并同步到底层渲染组件。
     * @param value 是否按顺时针方向填充。
     */
    public set fillClockwise(value: boolean) {
        if (this._fillClockwise != value) {
            this._fillClockwise = value;
            if (this._fillMethod != 0)
                this.setupFill();
        }
    }

    /**
     * 获取当前填充比例。
     */
    public get fillAmount(): number {
        return this._fillAmount;
    }

    /**
     * 设置填充比例，并同步到底层渲染组件。
     * @param value 填充比例，通常取值范围为 `0` 到 `1`。
     */
    public set fillAmount(value: number) {
        if (this._fillAmount != value) {
            this._fillAmount = value;
            if (this._fillMethod != 0) {
                if (this._fillClockwise)
                    this.fillRange = - this._fillAmount;
                else
                    this.fillRange = this._fillAmount;
            }
        }
    }

    /**
     * 根据填充方式配置底层 Sprite 的填充参数。
     */
    private setupFill(): void {
        if (this._fillMethod == FillMethod.Horizontal) {
            this._fillClockwise = this._fillOrigin == FillOrigin.Right || this._fillOrigin == FillOrigin.Bottom;
            this.fillStart = this._fillClockwise ? 1 : 0;
        }
        else if (this._fillMethod == FillMethod.Vertical) {
            this._fillClockwise = this._fillOrigin == FillOrigin.Left || this._fillOrigin == FillOrigin.Top;
            this.fillStart = this._fillClockwise ? 1 : 0;
        }
        else {
            switch (this._fillOrigin) {
                case FillOrigin.Right:
                    this.fillOrigin = 0;
                    break;
                case FillOrigin.Top:
                    this.fillStart = 0.25;
                    break;
                case FillOrigin.Left:
                    this.fillStart = 0.5;
                    break;
                case FillOrigin.Bottom:
                    this.fillStart = 0.75;
                    break;
            }
        }
    }
}
