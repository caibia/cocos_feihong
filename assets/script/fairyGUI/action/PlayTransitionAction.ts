import { ControllerAction } from "./ControllerAction";
import { Controller } from "../Controller";
import { Transition } from "../Transition";
import { ByteBuffer } from "../utils/ByteBuffer";

/**
 * 过渡播放动作，在控制器命中指定页签时触发 Transition。
 */
export class PlayTransitionAction extends ControllerAction {
    /**
     * 要播放的过渡动画名称。
     */
    public transitionName: string;
    /**
     * 过渡动画播放次数。
     */
    public playTimes: number = 1;
    /**
     * 延迟时间。
     */
    public delay: number = 0;
    /**
     * 离开命中页签时是否停止当前过渡动画。
     */
    public stopOnExit: boolean;

    /**
     * 当前动作命中的过渡动画实例引用。
     */
    private _currentTransition: Transition;

    /**
     * 初始化播放过渡动作的默认参数。
     */
    constructor() {
        super();
    }

    /**
     * 在进入命中条件时执行动作。
     * @param controller 当前触发动作的控制器。
     */
    protected enter(controller: Controller): void {
        var trans: Transition = controller.parent.getTransition(this.transitionName);
        if (trans) {
            if (this._currentTransition && this._currentTransition.playing)
                trans.changePlayTimes(this.playTimes);
            else
                trans.play(null, this.playTimes, this.delay);
            this._currentTransition = trans;
        }
    }

    /**
     * 在离开命中条件时执行动作。
     * @param controller 当前触发动作的控制器。
     */
    protected leave(controller: Controller): void {
        if (this.stopOnExit && this._currentTransition) {
            this._currentTransition.stop();
            this._currentTransition = null;
        }
    }

    /**
     * 根据序列化数据初始化当前对象配置。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    public setup(buffer: ByteBuffer): void {
        super.setup(buffer);

        this.transitionName = buffer.readS();
        this.playTimes = buffer.readInt();
        this.delay = buffer.readFloat();
        this.stopOnExit = buffer.readBool();
    }
}
