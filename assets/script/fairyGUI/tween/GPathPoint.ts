
/**
 * 曲线类型枚举，用于区分直线、贝塞尔和样条等路径段。
 */
export enum CurveType {
    CRSpline,
    Bezier,
    CubicBezier,
    Straight
}

/**
 * 路径关键点数据，描述直线、贝塞尔曲线或样条路径上的点信息。
 */
export class GPathPoint {
    /**
     * 路径点 X 坐标。
     */
    public x: number;
    /**
     * 路径点 Y 坐标。
     */
    public y: number;

    /**
     * 第一控制点的 X 坐标。
     */
    public control1_x: number;
    /**
     * 第一控制点的 Y 坐标。
     */
    public control1_y: number;

    /**
     * 第二控制点的 X 坐标。
     */
    public control2_x: number;
    /**
     * 第二控制点的 Y 坐标。
     */
    public control2_y: number;

    /**
     * 当前路径点对应的曲线类型。
     */
    public curveType: number;

    /**
     * 初始化路径点默认值和控制点数据。
     */
    constructor() {
        this.x = 0;
        this.y = 0;
        this.control1_x = 0;
        this.control1_y = 0;
        this.control2_x = 0;
        this.control2_y = 0;
        this.curveType = 0;
    }

    /**
     * 创建一个直线路径点。
     * @param x 路径点 X 坐标。
     * @param y 路径点 Y 坐标。
     * @param curveType 曲线类型；未传时默认使用样条类型。
     * @returns 新创建的路径点对象。
     */
    public static newPoint(x: number, y: number, curveType: number): GPathPoint {
        var pt: GPathPoint = new GPathPoint();
        pt.x = x || 0;
        pt.y = y || 0;
        pt.control1_x = 0;
        pt.control1_y = 0;
        pt.control2_x = 0;
        pt.control2_y = 0;
        pt.curveType = curveType || CurveType.CRSpline;

        return pt;
    }

    /**
     * 创建一个二次贝塞尔路径点。
     * @param x 路径点 X 坐标。
     * @param y 路径点 Y 坐标。
     * @param control1_x 第一控制点 X 坐标。
     * @param control1_y 第一控制点 Y 坐标。
     * @returns 新创建的贝塞尔路径点对象。
     */
    public static newBezierPoint(x: number, y: number, control1_x: number, control1_y: number): GPathPoint {
        var pt: GPathPoint = new GPathPoint();
        pt.x = x || 0;
        pt.y = y || 0;
        pt.control1_x = control1_x || 0;
        pt.control1_y = control1_y || 0;
        pt.control2_x = 0;
        pt.control2_y = 0;
        pt.curveType = CurveType.Bezier;

        return pt;
    }

    /**
     * 创建一个三次贝塞尔路径点。
     * @param x 路径点 X 坐标。
     * @param y 路径点 Y 坐标。
     * @param control1_x 第一控制点 X 坐标。
     * @param control1_y 第一控制点 Y 坐标。
     * @param control2_x 第二控制点 X 坐标。
     * @param control2_y 第二控制点 Y 坐标。
     * @returns 新创建的三次贝塞尔路径点对象。
     */
    public static newCubicBezierPoint(x: number, y: number, control1_x: number, control1_y: number,
        control2_x: number, control2_y: number): GPathPoint {
        var pt: GPathPoint = new GPathPoint();
        pt.x = x || 0;
        pt.y = y || 0;
        pt.control1_x = control1_x || 0;
        pt.control1_y = control1_y || 0;
        pt.control2_x = control2_x || 0;
        pt.control2_y = control2_y || 0;
        pt.curveType = CurveType.CubicBezier;

        return pt;
    }

    /**
     * 克隆当前对象并返回副本。
     */
    public clone(): GPathPoint {
        var ret: GPathPoint = new GPathPoint();
        ret.x = this.x;
        ret.y = this.y;
        ret.control1_x = this.control1_x;
        ret.control1_y = this.control1_y;
        ret.control2_x = this.control2_x;
        ret.control2_y = this.control2_y;
        ret.curveType = this.curveType;

        return ret;
    }
}
