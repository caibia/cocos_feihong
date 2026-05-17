import { GComponent } from "../GComponent";
import { Controller } from "../Controller";
import { ByteBuffer } from "../utils/ByteBuffer";
import { ControllerAction } from "./ControllerAction";

/**
 * 页面切换动作，在控制器状态变化时同步另一个控制器的页签。
 */
export class ChangePageAction extends ControllerAction {
    /**
     * 对象Id。
     */
    public objectId: string;
    /**
     * 控制器Name。
     */
    public controllerName: string;
    /**
     * 目标页面。
     */
    public targetPage: string;

    /**
     * 初始化切页动作的目标控制器与目标页配置。
     */
    constructor() {
        super();
    }

    /**
     * 在进入命中条件时执行动作。
     */
    protected enter(controller: Controller): void {
        if (!this.controllerName)
            return;

        var gcom: GComponent;
        if (this.objectId)
            gcom = <GComponent>controller.parent.getChildById(this.objectId);
        else
            gcom = controller.parent;
        if (gcom) {
            var cc: Controller = gcom.getController(this.controllerName);
            if (cc && cc != controller && !cc.changing) {
                if (this.targetPage == "~1") {
                    if (controller.selectedIndex < cc.pageCount)
                        cc.selectedIndex = controller.selectedIndex;
                }
                else if (this.targetPage == "~2")
                    cc.selectedPage = controller.selectedPage;
                else
                    cc.selectedPageId = this.targetPage;
            }
        }
    }

    /**
     * 根据序列化数据初始化当前对象配置。
     */
    public setup(buffer: ByteBuffer): void {
        super.setup(buffer);

        this.objectId = buffer.readS();
        this.controllerName = buffer.readS();
        this.targetPage = buffer.readS();
    }
}
