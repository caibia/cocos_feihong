
/**
 * 缓动类型枚举，定义补间可使用的插值曲线。
 */
export enum EaseType {
    /**
     * 线性插值。
     */
    Linear = 0,
    /**
     * 正弦缓入。
     */
    SineIn = 1,
    /**
     * 正弦缓出。
     */
    SineOut = 2,
    /**
     * 正弦缓入缓出。
     */
    SineInOut = 3,
    /**
     * 二次方缓入。
     */
    QuadIn = 4,
    /**
     * 二次方缓出。
     */
    QuadOut = 5,
    /**
     * 二次方缓入缓出。
     */
    QuadInOut = 6,
    /**
     * 三次方缓入。
     */
    CubicIn = 7,
    /**
     * 三次方缓出。
     */
    CubicOut = 8,
    /**
     * 三次方缓入缓出。
     */
    CubicInOut = 9,
    /**
     * 四次方缓入。
     */
    QuartIn = 10,
    /**
     * 四次方缓出。
     */
    QuartOut = 11,
    /**
     * 四次方缓入缓出。
     */
    QuartInOut = 12,
    /**
     * 五次方缓入。
     */
    QuintIn = 13,
    /**
     * 五次方缓出。
     */
    QuintOut = 14,
    /**
     * 五次方缓入缓出。
     */
    QuintInOut = 15,
    /**
     * 指数缓入。
     */
    ExpoIn = 16,
    /**
     * 指数缓出。
     */
    ExpoOut = 17,
    /**
     * 指数缓入缓出。
     */
    ExpoInOut = 18,
    /**
     * 圆形缓入。
     */
    CircIn = 19,
    /**
     * 圆形缓出。
     */
    CircOut = 20,
    /**
     * 圆形缓入缓出。
     */
    CircInOut = 21,
    /**
     * 弹性缓入。
     */
    ElasticIn = 22,
    /**
     * 弹性缓出。
     */
    ElasticOut = 23,
    /**
     * 弹性缓入缓出。
     */
    ElasticInOut = 24,
    /**
     * 回退缓入。
     */
    BackIn = 25,
    /**
     * 回退缓出。
     */
    BackOut = 26,
    /**
     * 回退缓入缓出。
     */
    BackInOut = 27,
    /**
     * 弹跳缓入。
     */
    BounceIn = 28,
    /**
     * 弹跳缓出。
     */
    BounceOut = 29,
    /**
     * 弹跳缓入缓出。
     */
    BounceInOut = 30,
    /**
     * 自定义缓动。
     */
    Custom = 31,
}

