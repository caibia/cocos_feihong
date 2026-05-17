/**
 *Author  : XW
 *Desc    : Socket 管理器（protobuf 协议收发）
 */

import { ProtoDataMap } from "../../app/define/ProtoDefine";
import { UINAME } from "../../app/define/UIDefine";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import { EVENTNAME } from "../../app/define/EventDefine";
import EventMgr from "../manager/EventMgr";
import UIMgr from "../manager/UIMgr";
import NetWorkMgr from "./NetWorkMgr";
import ProtoCodec, { ProtoName } from "./ProtoCodec";

export default class SocketMgr {
    /** socket 实例 */
    private _socket: WebSocket | null = null;
    /** 当前连接 ip */
    public ip: string = "";
    /** 当前连接端口 */
    public port: number = 0;

    private static _inst: SocketMgr;
    public static get inst(): SocketMgr {
        if (!this._inst) {
            this._inst = new SocketMgr();
        }
        return this._inst;
    }

    /** 初始化 */
    public init(): void {
        ProtoCodec.inst.init();
    }

    /**
     * 建立 socket 连接。
     * @param ip 服务器 IP
     * @param port 服务器端口
     */
    public connect(ip: string, port: number): void {
        if (this._socket && this._socket.readyState === WebSocket.OPEN) {
            XDEBUGLOG.net("重复连接 socket，已忽略");
            return;
        }

        this.ip = ip;
        this.port = port;
        ProtoCodec.inst.init();

        if (this._socket) {
            return;
        }

        const url = `ws://${this.ip}:${this.port}`;
        XDEBUGLOG.net("开始连接 socket", url);
        this._socket = new WebSocket(url);
        this._socket.binaryType = "arraybuffer";
        this._socket.onmessage = this.onReceiveMessage.bind(this);
        this._socket.onopen = this.onSocketOpen.bind(this);
        this._socket.onclose = this.onSocketClose.bind(this);
        this._socket.onerror = this.onSocketError.bind(this);
    }

    /** 断开连接 */
    public disconnect(): void {
        if (!this._socket) {
            return;
        }

        this._socket.onmessage = null;
        this._socket.onopen = null;
        this._socket.onerror = null;
        this._socket.onclose = null;
        this._socket.close();
        this._socket = null;
    }

    /**
     * 是否已连接。
     * @returns 是否处于 OPEN 状态
     */
    public isConnected(): boolean {
        return !!this._socket && this._socket.readyState === WebSocket.OPEN;
    }

    /**
     * 输出网络日志。
     * @param tag 日志标签
     * @param protoName 协议名
     * @param msg 协议数据
     * @param bytes 数据字节数
     * @param cost 耗时
     */
    private netLog(tag: string, protoName: string, msg: unknown, bytes: number, cost: number): void {
        const now = new Date();
        const timeText = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        XDEBUGLOG.net(`[${timeText}] ${tag} ${bytes}bytes`, protoName, msg, `${cost}ms`);
    }

    /**
     * 发送协议。
     * @param protoName 协议名
     * @param msg 协议数据
     * @returns 是否发送成功
     */
    public send(protoName: string, msg: any): boolean {
        if (!this.isConnected() || !this._socket) {
            XDEBUGLOG.warn(`socket 已断开，无法发送协议: ${protoName}`);
            return false;
        }

        const startTime = Date.now();
        const packet = ProtoCodec.inst.encodePacket(protoName as ProtoName, msg as ProtoDataMap[ProtoName]);
        if (!packet) {
            XDEBUGLOG.warn(`协议编码失败，发送终止: ${protoName}`);
            return false;
        }

        UIMgr.inst.show(UINAME.NetLoadingView);
        try {
            this._socket.send(packet);
            const cost = Date.now() - startTime;
            this.netLog("发送", protoName, msg, packet.byteLength, cost);
            return true;
        } catch (err) {
            UIMgr.inst.destroy(UINAME.NetLoadingView);
            XDEBUGLOG.error(`发送协议失败: ${protoName}`, err);
            return false;
        }
    }

    /** socket 连接成功回调 */
    private onSocketOpen(): void {
        XDEBUGLOG.net("socket 连接成功", this.ip, this.port);
        EventMgr.inst.dispatchEvent(EVENTNAME.SOCKET_CONNECTTED);
    }

    /**
     * socket 收包回调。
     * @param event websocket 事件
     */
    private onReceiveMessage(event: MessageEvent): void {
        if (event.data instanceof ArrayBuffer) {
            this.handleReceiveBuffer(event.data);
            return;
        }

        if (event.data instanceof Blob) {
            event.data.arrayBuffer()
                .then((buffer) => this.handleReceiveBuffer(buffer))
                .catch((err) => XDEBUGLOG.error("读取二进制消息失败", err));
            return;
        }

        XDEBUGLOG.warn("收到非二进制消息，已忽略", typeof event.data);
    }

    /**
     * 处理二进制收包。
     * @param data 收到的二进制数据
     */
    private handleReceiveBuffer(data: ArrayBuffer): void {
        const startTime = Date.now();
        const decodeResult = ProtoCodec.inst.decodePacket(data);
        if (!decodeResult) {
            return;
        }

        const cost = Date.now() - startTime;
        this.netLog("接收", decodeResult.protoName, decodeResult.msg, data.byteLength, cost);
        NetWorkMgr.inst.onReceiveMessage(decodeResult.protoName, decodeResult.msg);
    }

    /** socket 关闭回调 */
    private onSocketClose(): void {
        XDEBUGLOG.net("socket 已断开");
        if (this._socket) {
            this._socket.onclose = null;
            this._socket = null;
        }
        EventMgr.inst.dispatchEvent(EVENTNAME.SOCKET_DISCONNECTTED);
    }

    /**
     * socket 错误回调。
     * @param err 错误信息
     */
    private onSocketError(err: Event): void {
        XDEBUGLOG.net("socket 连接错误", err);
        EventMgr.inst.dispatchEvent(EVENTNAME.SOCKET_ERROR);
    }

    /** 清理资源 */
    public clear(): void {
        this.disconnect();
    }
}
