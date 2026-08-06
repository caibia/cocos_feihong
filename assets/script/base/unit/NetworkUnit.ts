/**
 *Author  : XW
 *Desc    : 网络功能单元，负责协议发送与监听
 */

import { ProtoDataMap } from "../../app/define/ProtoDefine";
import NetWorkMgr from "../net/NetWorkMgr";

type ProtoName = keyof ProtoDataMap & string;
type SuccessCb<T extends ProtoName> = (protocol: T, msg: ProtoDataMap[T]) => void;
type FailCb = (msg: any) => void;

export default class NetworkUnit {
    /** 当前单元发起的所有 RPC 句柄 */
    private _allRPCHandlerIdArr: number[] = [];
    /** 当前单元注册的所有协议监听 */
    private _allListenHandler: { [key: string | number]: Function } = {};
    /** 是否暂停接收协议 */
    public isPause: boolean = false;

    /** 初始化单元 */
    public onCreate(): void {
        this._allRPCHandlerIdArr = [];
        this._allListenHandler = {};
        this.isPause = false;
    }

    /** 暂停接收协议 */
    public pause(): void {
        if (!this.isPause) {
            this.isPause = true;
        }
    }

    /** 恢复接收协议 */
    public resume(): void {
        if (this.isPause) {
            this.isPause = false;
        }
    }

    /**
     * 发送协议。
     * @param protoName 协议名
     * @param msg 协议数据
     * @param isShowNetLoading 是否显示网络加载界面
     * @returns 是否发送成功
     */
    public send<T extends ProtoName>(protoName: T, msg: ProtoDataMap[T], isShowNetLoading: boolean = false): boolean {
        return NetWorkMgr.inst.send(protoName, msg, isShowNetLoading);
    }

    /**
     * 发起请求-应答协议。
     * @param protoName 发送协议名
     * @param msg 发送协议数据
     * @param recvProtoArr 期望回包协议名（不传默认与发送协议同名）
     * @param successCb 成功回调
     * @param failCb 失败回调
     * @returns RPC 句柄
     */
    public sendRPC<TSend extends ProtoName, TRecv extends ProtoName>(
        protoName: TSend,
        msg: ProtoDataMap[TSend],
        recvProtoArr?: TRecv[] | TRecv,
        successCb?: SuccessCb<TRecv>,
        failCb?: FailCb,
    ): number {
        let recvList: TRecv[] | undefined;
        if (typeof recvProtoArr === "string") {
            recvList = [recvProtoArr];
        } else if (Array.isArray(recvProtoArr)) {
            recvList = recvProtoArr;
        }

        if (!recvList || recvList.length === 0) {
            recvList = [protoName as unknown as TRecv];
        }

        const handlerId = NetWorkMgr.inst.sendRPC<TSend, TRecv>(
            protoName,
            msg,
            recvList as TRecv[],
            successCb as any,
            failCb,
        );
        this._allRPCHandlerIdArr.push(handlerId);
        return handlerId;
    }

    /**
     * 添加协议监听。
     * @param protoNameArr 协议名集合
     * @param callback 回调函数
     * @returns 监听句柄
     */
    public addProtoListener<T extends ProtoName>(protoNameArr: T[], callback: SuccessCb<T>): number {
        const wrapCb = (protoName: string, msg: any) => {
            if (this.isPause) {
                return;
            }
            callback(protoName as T, msg as ProtoDataMap[T]);
        };
        const listenerId = NetWorkMgr.inst.addProtoListener(protoNameArr as unknown as string[], wrapCb);
        this._allListenHandler[listenerId] = callback;
        return listenerId;
    }

    /**
     * 根据监听句柄移除协议监听。
     * @param listenerId 监听句柄
     */
    public removeProtoListener(listenerId: number): void {
        if (!this._allListenHandler[listenerId]) {
            return;
        }
        NetWorkMgr.inst.removeProtoListener(listenerId);
        delete this._allListenHandler[listenerId];
    }

    /** 清理当前单元发起的全部 RPC */
    public clearAllRPC(): void {
        this._allRPCHandlerIdArr.forEach((handlerId) => {
            NetWorkMgr.inst.clearRPC(handlerId);
        });
        this._allRPCHandlerIdArr = [];
    }

    /** 释放单元资源 */
    public dispose(): void {
        this.clearAllRPC();
        for (const listenerId of Object.keys(this._allListenHandler)) {
            NetWorkMgr.inst.removeProtoListener(listenerId);
        }
        this._allListenHandler = {};
    }
}
