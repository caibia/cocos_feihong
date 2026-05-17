import { Vec2 } from "cc";
import { FEvent as FUIEvent } from "./event/Event";
import { AlignType, VertAlignType } from "./FieldTypes";
import { GLoader } from "./GLoader";
import { GObject } from "./GObject";
import { GRoot } from "./GRoot";

/**
 * 拖拽管理器，负责普通 GUI 对象的拖放代理与投递事件。
 */
export class DragDropManager {

    /**
     * 拖拽代理使用的 `GLoader` 实例。
     */
    private _agent: GLoader;
    /**
     * 当前拖拽源携带的业务数据。
     */
    private _sourceData: any;

    /**
     * 单例实例引用。
     */
    private static _inst: DragDropManager;
    /**
     * 获取当前单例实例。
     */
    public static get inst(): DragDropManager {
        if (!DragDropManager._inst)
            DragDropManager._inst = new DragDropManager();
        return DragDropManager._inst;
    }

    /**
     * 初始化通用拖拽代理、根节点引用和拖拽状态。
     */
    public constructor() {
        this._agent = new GLoader();
        this._agent.draggable = true;
        this._agent.touchable = false;//important
        this._agent.setSize(100, 100);
        this._agent.setPivot(0.5, 0.5, true);
        this._agent.align = AlignType.Center;
        this._agent.verticalAlign = VertAlignType.Middle;
        this._agent.sortingOrder = 1000000;
        this._agent.on(FUIEvent.DRAG_END, this.onDragEnd, this);
    }

    /**
     * 获取拖拽代理对象。
     */
    public get dragAgent(): GObject {
        return this._agent;
    }

    /**
     * 获取当前是否处于拖拽中。
     */
    public get dragging(): boolean {
        return this._agent.parent != null;
    }

    /**
     * 开始当前对象的拖拽流程。
     * @param source 拖拽源对象。
     * @param icon 图标资源地址。
     * @param sourceData 拖拽携带的业务数据。
     * @param touchId 触点 ID。
     */
    public startDrag(source: GObject, icon: string | null, sourceData?: any, touchId?: number): void {
        if (this._agent.parent)
            return;

        this._sourceData = sourceData;
        this._agent.url = icon;
        GRoot.inst.addChild(this._agent);
        let pt: Vec2 = GRoot.inst.getTouchPosition(touchId);
        pt = GRoot.inst.globalToLocal(pt.x, pt.y);
        this._agent.setPosition(pt.x, pt.y);
        this._agent.startDrag(touchId);
    }

    /**
     * 取消当前进行中的流程或状态。
     */
    public cancel(): void {
        if (this._agent.parent) {
            this._agent.stopDrag();
            GRoot.inst.removeChild(this._agent);
            this._sourceData = null;
        }
    }

    /**
     * 拖拽结束后清理代理显示和内部状态。
     */
    private onDragEnd(): void {
        if (!this._agent.parent) //cancelled
            return;

        GRoot.inst.removeChild(this._agent);

        var sourceData: any = this._sourceData;
        this._sourceData = null;

        var obj: GObject = GRoot.inst.touchTarget;
        while (obj) {
            if (obj.node.hasEventListener(FUIEvent.DROP)) {
                obj.requestFocus();
                obj.node.emit(FUIEvent.DROP, obj, sourceData);
                return;
            }

            obj = obj.parent;
        }
    }
}
