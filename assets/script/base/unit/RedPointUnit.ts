import { GComponent } from "../../fairyGUI/GComponent";
import { GLoader } from "../../fairyGUI/GLoader";
import { GObject } from "../../fairyGUI/GObject";
import RedPointDB from "../data/RedPointDB";
import XConst from "../define/XConst";
import ObserveUnit from "./ObserveUnit";
import { XNODEPOOL_KEY } from "../define/XNodePoolDefine";
import NodePoolMgr from "../manager/NodePoolMgr";
import { XResourcesUrl } from "../define/XResourcesUrl";

/**
 * 红点单元，负责红点监听、显示绑定和释放。
 */
export default class RedPointUnit {
    public isPause: boolean;
    private observeUnit: ObserveUnit;
    /**红点id对应的监听者组件 */
    private targetMap: { [redId: number]: GComponent[] } = {};
    /**组件红点偏移数据 */
    private offsetMap: { [uuid: number]: { offset?: number[], scale?: number } } = {};
    /**组件绑定的红点合集 */
    private bindRedPointMap: { [uuid: number]: number[] } = {};

    constructor() {
        this.observeUnit = new ObserveUnit(this);
        this.observeUnit.addObserve(RedPointDB.inst.postUpdateRedpoint, this.onRedpointChange);
    }

    /**
     * 获取组件的唯一标识 uuid
     * @param target 组件
     * @returns 
     */
    private getTargetUUId(target: GComponent): string {
        return target.node.uuid;
    }

    /**
     * 获取组件对应的红点偏移及缩放
     * @param uuid 
     * @returns 
     */
    private getOffsetByUUId(uuid: string): { offset?: number[], scale?: number } {
        let offsetInfo: { offset?: number[], scale?: number } = this.offsetMap[uuid];
        return offsetInfo || {};
    }

    /**
     * 获取组件所监听着的红点id
     * @param uuid 
     * @returns 
     */
    private getRedIdsByUUId(uuid: string): number[] {
        let bindRedIds: number[] = this.bindRedPointMap[uuid];
        if (!bindRedIds) {
            bindRedIds = this.bindRedPointMap[uuid] = [];
        }
        return bindRedIds;
    }

    /**
     * 绑定红点id
     * @param target 需要添加红点的组件
     * @param redIds 红点ID
     * @param offset 偏移
     * @param scale 缩放
     */
    public bind(target: GComponent, redIds: number[], offset?: number[], scale?: number): void {
        let uuid: string = this.getTargetUUId(target);
        let bindRedIds: number[] = this.getRedIdsByUUId(uuid);
        for (let id of redIds) {
            // 该组件未绑定该红点
            if (bindRedIds.indexOf(id) < 0) {
                bindRedIds.push(id);
                if (!this.targetMap[id]) { this.targetMap[id] = [] };
                this.targetMap[id].push(target);
            }
        }
        if (offset || scale) {
            this.offsetMap[uuid] = { offset, scale };
        }
        // 绑定时 刷新下红点展示
        this.updateRedPoint(target);
    }

    /**
     * 刷新目标组件红点
     * @param target 目标组件
     * @returns 
     */
    private updateRedPoint(target: GComponent): void {
        let uuid: string = this.getTargetUUId(target);
        let redIds: number[] = this.getRedIdsByUUId(uuid);
        //没有监听红点，移除掉target身上的所有红点
        if (redIds.length == 0) {
            this.deleteRedpointImg(target);
            return;
        }
        if (RedPointDB.inst.isHaveRedPoint(redIds)) {
            let { offset, scale } = this.getOffsetByUUId(uuid);
            this.addRedpointImg(target, offset, scale);
        } else {
            this.deleteRedpointImg(target);
        }
    }

    /**
     * 添加组件 红点
     * @param targetCom 要添加红点的组件
     * @param offset 偏移数据[x,y]
     * @param scale 缩放数据
     * @returns 
     */
    public addRedpointImg(targetCom: GComponent, offset?: number[], scale?: number) {
        let child: GObject;
        for (let i = 0, len = targetCom.numChildren; i < len; i++) {
            child = targetCom.getChildAt(i);
            if (child.name == XConst.RED_POINT_NAME) {
                //防止重复添加红点
                return child as GLoader;
            }
        }
        let redpoint: GComponent = NodePoolMgr.inst.get(XNODEPOOL_KEY.RED_POINT_POOL, XResourcesUrl.COM_PACKAGE, "RedPointCom") as GComponent;
        redpoint.name = XConst.RED_POINT_NAME;
        targetCom.addChild(redpoint);
        if (scale) {
            redpoint.scaleX = redpoint.scaleY = scale;
        }
        if (offset && offset[0] != null && offset[1] != null) {
            redpoint.x = offset[0];
            redpoint.y = offset[1];
        } else {
            redpoint.x = targetCom.width * 0.7;
            redpoint.y = 10;
        }
        return redpoint;
    }

    /**
     * 删除目标组件 红点
     * @param targetCom 目标组件
     */
    public deleteRedpointImg(targetCom: GComponent): void {
        let child: GComponent;
        for (let i = 0, len = targetCom.numChildren; i < len; i++) {
            child = targetCom.getChildAt(i);
            if (child.name == XConst.RED_POINT_NAME) {
                // === 红点初始化属性 再入池
                child.grayed = false;
                child.scaleX = 1;
                child.scaleY = 1;
                // ======================= 
                NodePoolMgr.inst.put(child);
                break;
            }
        }
    }

    /**
     * 全量刷新本组件的所有红点
     */
    public refreshAll() {
        let repeatMap = {}
        for (let redId in this.targetMap) {
            let comArr: GComponent[] = this.targetMap[redId];
            for (let com of comArr) {
                if (!repeatMap[com.node.uuid]) {
                    repeatMap[com.node.uuid] = 1;
                    this.updateRedPoint(com);
                }
            }
        }
    }

    /**
     * 观察红点更新回调 postUpdateRedpoint
     * @param changeIdMap 变化的红点集合
     */
    private onRedpointChange(changeIdMap?: { [redId: number]: boolean }): void {
        let changeTargetMap = {};
        if (changeIdMap) {
            for (let redId in changeIdMap) {
                let targets: GComponent[] = this.targetMap[redId];
                // 该红点没有组件监听，跳过
                if (!targets) continue;
                for (let target of targets) {
                    changeTargetMap[target.node.uuid] = target;
                }
            }
        }
        for (let uuid in changeTargetMap) {
            //汇总要改变的组件，再统一刷新
            let target = changeTargetMap[uuid];
            this.updateRedPoint(target);
        }
    }

    public pause() {
        if (!this.isPause) {
            this.isPause = true;
            this.observeUnit.pause();
        }
    }

    public resume() {
        if (this.isPause) {
            this.isPause = false;
            this.observeUnit.resume();
            this.refreshAll();
        }
    }

    public dispose() {
        this.observeUnit.dispose();
        this.targetMap = {};
        this.offsetMap = {};
        this.bindRedPointMap = {};
    }

}
