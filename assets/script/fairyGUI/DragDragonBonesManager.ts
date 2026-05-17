import { Vec2 } from "cc";
import { FEvent as FUIEvent } from "./event/Event";
import { AlignType, VertAlignType } from "./FieldTypes";
import { GObject } from "./GObject";
import { GRoot } from "./GRoot";
import { GLoader3D } from "./GLoader3D";
import { SpineUnit } from "../base/unit/SpineUnit";
import XComponent from "../base/ui/XComponent";

/**
 * DragonBones 拖拽管理器，负责龙骨预览对象的拖放代理。
 */
export class DragDragonBonesManager {

    /**
     * 拖拽代理使用的 `GLoader3D` 实例。
     */
    private _l3d: GLoader3D;
    /**
     * 当前拖拽源携带的业务数据。
     */
    private _sourceData: any;
    /**
     * 当前拖拽代理使用的骨骼单元实例。
     */
    private _spineUnit: SpineUnit;

    /**
     * 单例实例引用。
     */
    private static _inst: DragDragonBonesManager;
    /**
     * 获取当前单例实例。
     */
    public static get inst(): DragDragonBonesManager {
        if (!DragDragonBonesManager._inst)
            DragDragonBonesManager._inst = new DragDragonBonesManager();
        return DragDragonBonesManager._inst;
    }

    /**
     * 初始化 DragonBones 拖拽代理、根节点引用和拖拽状态。
     */
    public constructor() {

        this._spineUnit = new SpineUnit();

        this._l3d = new GLoader3D();
        this._l3d.draggable = true;
        this._l3d.touchable = false;//important
        this._l3d.setSize(100, 100);
        this._l3d.setPivot(0.5, 0.5, true);
        this._l3d.align = AlignType.Center;
        this._l3d.verticalAlign = VertAlignType.Middle;
        this._l3d.sortingOrder = 1000000;
        this._l3d.on(FUIEvent.DRAG_END, this.onDragEnd, this);
    }

    /**
     * 获取拖拽代理对象。
     */
    public get dragAgent(): GObject {
        return this._l3d;
    }

    /**
     * 获取当前是否处于拖拽中。
     */
    public get dragging(): boolean {
        return this._l3d.parent != null;
    }

    /**
     * 开始当前对象的拖拽流程。
     * @param url DragonBones 资源地址。
     * @param sourceData 拖拽携带的业务数据。
     * @param touchId 触点 ID。
     */
    public startDrag(url: string | null, sourceData?: any, touchId?: number): void {
        if (this._l3d.parent)
            return;

        GRoot.inst.addChild(this._l3d);
        
        this._sourceData = sourceData;
        this._l3d.scaleX = (this._sourceData && this._sourceData.dirType == 1) ? -1 : 1;
        if(sourceData instanceof XComponent){
            this._l3d.setPivot(0.5,0.5,true);
        }
        // this._agent.url = url;
        // this._agent.animationName = SpineState.IDLE;
		// this._agent.autoSize = true;
		// this._agent.loop = true;
		// this._agent.playing = true;

        let pt: Vec2 = GRoot.inst.getTouchPosition(touchId);
        pt = GRoot.inst.globalToLocal(pt.x, pt.y);
        this._spineUnit.play(url, null, pt.x, pt.y, this._l3d,"COMBAT_CARDSPINE_STATE")
        // this._agent.setPosition(pt.x, pt.y);
        this._l3d.startDrag(touchId);
    }

    /**
     * 取消当前进行中的流程或状态。
     */
    public cancel(): void {
        if (this._l3d.parent) {
            this._l3d.stopDrag();
            GRoot.inst.removeChild(this._l3d);
            this._sourceData = null;
        }
        this._spineUnit.stopAndRelease(this._l3d);
    }

    /**
     * 拖拽结束后清理代理显示和内部状态。
     */
    private onDragEnd(): void {
        if (!this._l3d.parent) //cancelled
            return;

        GRoot.inst.removeChild(this._l3d);

        this._spineUnit.stopAndRelease(this._l3d);
        
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
