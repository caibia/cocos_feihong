/** 手势类型 */
export const enum GESTURETYPE {
    /** 横向滑动 */
    ROWSLIDE = "横向滑动",
    /** 纵向滑动 */
    COLUMNSLIDE = "纵向滑动",
    /** 缩放 */
    SCALE = "缩放",
    /** 旋转 */
    ROTATE = "旋转",
}

export const enum GESTURE_SLIDETYPE {
    /** 从右往左滑动了一次  */
    LEFT,
    /** 从左往右滑动了一次 */
    RIGHT,
    /** 从下往上滑动了一次 */
    UP,
    /** 从上往下滑动了一次 */
    DOWN,
}

/** 手势回调参数 */
export type GestureArg = {
    /** 滑动值 */
    slideCode?: GESTURE_SLIDETYPE,
    /** 缩放值 */
    scaleCode?: number,
    /** 旋转值 */
    rotateCode?: number,
    /** 中心位置 */
    centerPos?: { x: number, y: number };
}
