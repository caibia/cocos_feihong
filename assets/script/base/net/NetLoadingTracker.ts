/**
 *Author  : XW
 *Desc    : 网络加载界面归属记录
 */

import XDEBUGLOG from "../debug/XDEBUGLOG";

/** 网络加载界面归属记录 */
export default class NetLoadingTracker {
    /** 返回协议等待次数 */
    private _pendingMap: Record<string, number> = {};
    /** 等待协议总数 */
    private _pendingTotal: number = 0;

    /**
     * 记录发送协议。
     * @param sendProtoName 发送协议名
     */
    public addSendProto(sendProtoName: string): void {
        const recvProtoName = this.toReceiveProtoName(sendProtoName);
        if (!recvProtoName) {
            return;
        }
        this._pendingMap[recvProtoName] = (this._pendingMap[recvProtoName] || 0) + 1;
        this._pendingTotal += 1;
    }

    /**
     * 消耗返回协议。
     * @param recvProtoName 返回协议名
     * @returns 是否匹配到等待项
     */
    public consumeReceiveProto(recvProtoName: string): boolean {
        const count = this._pendingMap[recvProtoName] || 0;
        if (count <= 0) {
            return false;
        }
        if (count === 1) {
            delete this._pendingMap[recvProtoName];
        } else {
            this._pendingMap[recvProtoName] = count - 1;
        }
        this._pendingTotal -= 1;
        return true;
    }

    /**
     * 消耗发送协议。
     * @param sendProtoName 发送协议名
     * @returns 是否匹配到等待项
     */
    public consumeSendProto(sendProtoName: string): boolean {
        const recvProtoName = this.toReceiveProtoName(sendProtoName);
        if (!recvProtoName) {
            return false;
        }
        return this.consumeReceiveProto(recvProtoName);
    }

    /** 是否存在等待项 */
    public hasPending(): boolean {
        return this._pendingTotal > 0;
    }

    /** 清空等待项 */
    public clear(): void {
        this._pendingMap = {};
        this._pendingTotal = 0;
    }

    /**
     * 转成返回协议名。
     * @param sendProtoName 发送协议名
     * @returns 返回协议名
     */
    private toReceiveProtoName(sendProtoName: string): string | null {
        if (!sendProtoName.startsWith("C2S_")) {
            XDEBUGLOG.warn(`NetLoading 只能记录发送协议: ${sendProtoName}`);
            return null;
        }
        return `S2C_${sendProtoName.slice(4)}`;
    }
}
