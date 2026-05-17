import XScene from "../../../base/ui/XScene";
import { GRoot } from "../../../fairyGUI/GRoot";

/** 游戏主场景 */
export default class GameMainScene extends XScene {
    /** 场景创建 */
    public onCreate(): void {
        super.onCreate();
    }

    /**
     * 场景刷新。
     * @param arg 场景参数
     */
    public onRefresh(arg?: any): void {
        super.onRefresh(arg);
        void arg;
    }

    /** 屏幕尺寸变化 */
    public onStageResize(): void {
        super.onStageResize();
        this.setSize(GRoot.inst.width, GRoot.inst.height);
    }

    /** 场景销毁 */
    public dispose(): void {
        super.dispose();
    }
}
