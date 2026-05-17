
/**
*Author  : XW
*Desc    : 
*/

import XConst from "../define/XConst";
import Extend from "../extend/Extend";
import BaseData from "./BaseData";
import NodePoolMgr from "../manager/NodePoolMgr";
import { XNODEPOOL_KEY } from "../define/XNodePoolDefine";

type RedInfo = { id: number, count: number }

export default class RedPointDB extends BaseData {

    private _allRedpointMap: { [redId: number]: RedInfo } = {};

    private static _inst: RedPointDB
    public static get inst(): RedPointDB {
        if (!this._inst) {
            this._inst = new RedPointDB();
        }
        return this._inst;
    }

    /**
     * 红点变化
     * @param redInfos 
     * @returns 
     */
    public postUpdateRedpoint(redInfos: RedInfo[]): { [key: number]: boolean } | string {
        if (!redInfos || redInfos.length <= 0) return XConst.OBSERVE_RETURN;
        let changeIdMap: { [key: number]: boolean } = {};
        for (let redInfo of redInfos) {
            redInfo.count = redInfo.count || 0;
            let redId: number = redInfo.id;
            let count: number = redInfo.count;
            let oldRedInfo = this._allRedpointMap[redId];
            if (!oldRedInfo) {
                //如果数据没发生变化，则直接跳过
                if (redInfo.count <= 0) {
                    continue;
                }
            } else {
                //如果数据没发生变化，则直接跳过
                if (Extend.isObjEqual(redInfo, oldRedInfo)) {
                    if (oldRedInfo.count == 0)
                        delete this._allRedpointMap[redId];
                    continue;
                }
            }
            changeIdMap[redId] = true; // 记录发生变化的红点id
            if (count <= 0) {
                delete this._allRedpointMap[redId];
            } else {
                this._allRedpointMap[redId] = redInfo;
            }
        }
        if (Extend.isEmpty(changeIdMap)) return XConst.OBSERVE_RETURN;
        return changeIdMap;
    }

    /**
     * 是否有红点数据
     * @param redIdArr 红点合集
     * @returns 
     */
    public isHaveRedPoint(redIdArr: number[]): boolean {
        for (let id of redIdArr) {
            if (this._allRedpointMap[id]) {
                return true;
            }
        }
        return false;
    }

    /**
     * 获取红点集合的累积数量
     * @param redIds 红点id合集
     * @returns 数量
     */
    public getRedPointCount(redIds: number[]): number {
        let count = 0;
        let info: RedInfo;
        for (let id of redIds) {
            info = this._allRedpointMap[id]
            if (info) {
                count = count + info.count;
            }
        }
        return count;
    }

    /**
     * 获取红点数据
     * @param redId 红点id
     * @returns 
     */
    public getRedPointData(redId: number): RedInfo {
        return this._allRedpointMap[redId];
    }

    /**
     * 添加红点
     * @param redId 红点id
     * @param count 数量
     */
    public addRedPointCount(redId: number, count: number = 1): void {
        let redInfo: RedInfo = this._allRedpointMap[redId];
        let rcount = redInfo ? redInfo.count + count : count;
        redInfo = { id: redId, count: rcount };
        this.postUpdateRedpoint([redInfo]);
    }

    /**
     * 删除红点
     * @param redId 红点id
     * @param count 数量
     */
    public decRedPointCount(redId: number, count: number = 1) {
        let redInfo: RedInfo = this._allRedpointMap[redId];
        if (!redInfo) return;
        redInfo = { id: redId, count: redInfo.count - count }
        this.postUpdateRedpoint([redInfo]);
    }

    /**
     * 删除红点数据(数量清0)
     * @param redIds 红点合集
     */
    public deleteRedPointById(redIds: number[]) {
        for (let i = 0; i < redIds.length; i++) {
            this.postUpdateRedpoint([{ id: redIds[i], count: 0 }]);
        }
    }

    public clearData() {
        this._allRedpointMap = {};
        NodePoolMgr.inst.clearPool(XNODEPOOL_KEY.RED_POINT_POOL);
    }
}

window["RedPointDB"] = RedPointDB;