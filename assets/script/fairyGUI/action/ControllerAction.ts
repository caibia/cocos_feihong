
import { Controller } from "../Controller";
import { ByteBuffer } from "../utils/ByteBuffer";

/**
 * 控制器动作基类，定义页面切换时动作触发的公共协议。
 */
export class ControllerAction {
    /**
     * 从页面。
     */
    public fromPage: Array<string>;
    /**
     * 到页面。
     */
    public toPage: Array<string>;

    /**
     * 初始化控制器动作基类的页签命中范围。
     */
    constructor() {
    }

    /**
     * 根据前后页签状态执行控制器动作。
     */
    public run(controller: Controller, prevPage: string, curPage: string): void {
        if ((!this.fromPage || this.fromPage.length == 0 || this.fromPage.indexOf(prevPage) != -1)
            && (!this.toPage || this.toPage.length == 0 || this.toPage.indexOf(curPage) != -1))
            this.enter(controller);
        else
            this.leave(controller);
    }

    /**
     * 在进入命中条件时执行动作。
     */
    protected enter(controller: Controller): void {

    }

    /**
     * 在离开命中条件时执行动作。
     */
    protected leave(controller: Controller): void {

    }

    /**
     * 根据序列化数据初始化当前对象配置。
     */
    public setup(buffer: ByteBuffer): void {
        var cnt: number;
        var i: number;

        cnt = buffer.readShort();
        this.fromPage = [];
        for (i = 0; i < cnt; i++)
            this.fromPage[i] = buffer.readS();

        cnt = buffer.readShort();
        this.toPage = [];
        for (i = 0; i < cnt; i++)
            this.toPage[i] = buffer.readS();
    }
}
