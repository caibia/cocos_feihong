/**
 *Author  : XW
 *Desc    : protobuf 编解码管理器（仅支持 protobuf）
 */

import type * as protobufNamespace from "protobufjs";
import { PROTO_MESSAGE_NAME_MAP, ProtoDataMap } from "../../app/define/ProtoDefine";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import ProtoBinLoader from "./ProtoBinLoader";

/** 协议名类型约束 */
export type ProtoName = keyof ProtoDataMap & string;

/** 协议解码结果 */
export interface IProtoDecodeResult<T extends ProtoName = ProtoName> {
    /** 协议名 */
    protoName: T;
    /** 协议体 */
    msg: ProtoDataMap[T];
}

export default class ProtoCodec {
    /** 帧头-协议名长度字段字节数 */
    private static readonly HEADER_PROTO_NAME_LEN = 2;
    /** 帧头-body 长度字段字节数 */
    private static readonly HEADER_BODY_LEN = 4;

    /** protobuf root */
    private _root: protobufNamespace.Root | null = null;
    /** 初始化任务 */
    private _initPromise: Promise<void> | null = null;
    /** 协议名到消息类型映射 */
    private _typeMap: Map<ProtoName, protobufNamespace.Type> = new Map();

    private static _inst: ProtoCodec;
    public static get inst(): ProtoCodec {
        if (!this._inst) {
            this._inst = new ProtoCodec();
        }
        return this._inst;
    }

    /** 初始化 protobuf 反射结构 */
    public async init(): Promise<void> {
        if (this._root) {
            return;
        }
        if (this._initPromise) {
            return this._initPromise;
        }
        this._initPromise = this.loadProtoBin();
        try {
            await this._initPromise;
        } catch (err) {
            this._initPromise = null;
            throw err;
        }
    }

    /** 加载 protobuf 二进制描述 */
    private async loadProtoBin(): Promise<void> {
        const root = await ProtoBinLoader.inst.loadRoot();
        const protoMap = PROTO_MESSAGE_NAME_MAP as Record<string, string>;
        const protoNames = Object.keys(protoMap);
        if (protoNames.length === 0) {
            XDEBUGLOG.error("protobuf 协议映射为空");
            throw new Error("protobuf 协议映射为空");
        }

        const typeMap = new Map<ProtoName, protobufNamespace.Type>();
        for (const protoName of protoNames) {
            const messageName = protoMap[protoName];
            try {
                const messageType = root.lookupType(messageName);
                typeMap.set(protoName as ProtoName, messageType);
            } catch (err) {
                XDEBUGLOG.error(`初始化协议类型失败: 协议=${protoName}, 消息=${messageName}`, err);
                throw err;
            }
        }

        this._typeMap = typeMap;
        this._root = root;
        XDEBUGLOG.net("protobuf 编解码器初始化完成", `协议数量=${this._typeMap.size}`);
    }

    /**
     * 编码协议为二进制包。
     * @param protoName 协议名
     * @param msg 协议数据
     * @returns 二进制包，失败返回 null
     */
    public encodePacket<T extends ProtoName>(protoName: T, msg: ProtoDataMap[T]): ArrayBuffer | null {
        const messageType = this.getMessageType(protoName);
        if (!messageType) {
            XDEBUGLOG.warn("发送失败，未找到协议类型", protoName);
            return null;
        }

        try {
            const message = messageType.create(msg as unknown as Record<string, unknown>);
            const bodyBytes = messageType.encode(message).finish();
            const protoNameBytes = this.encodeProtoName(protoName);

            if (protoNameBytes.length > 0xffff) {
                XDEBUGLOG.error("发送失败，协议名长度超过 65535 字节", protoName);
                return null;
            }

            const headerBytes = ProtoCodec.HEADER_PROTO_NAME_LEN + ProtoCodec.HEADER_BODY_LEN;
            const packetBytes = new Uint8Array(headerBytes + protoNameBytes.length + bodyBytes.length);
            const view = new DataView(packetBytes.buffer);

            let offset = 0;
            view.setUint16(offset, protoNameBytes.length, false);
            offset += ProtoCodec.HEADER_PROTO_NAME_LEN;
            packetBytes.set(protoNameBytes, offset);
            offset += protoNameBytes.length;
            view.setUint32(offset, bodyBytes.length, false);
            offset += ProtoCodec.HEADER_BODY_LEN;
            packetBytes.set(bodyBytes, offset);

            return packetBytes.buffer;
        } catch (err) {
            XDEBUGLOG.error("发送失败，protobuf 编码异常", protoName, err);
            return null;
        }
    }

    /**
     * 从二进制包中解码协议。
     * @param data 二进制数据
     * @returns 解码结果，失败返回 null
     */
    public decodePacket(data: ArrayBuffer): IProtoDecodeResult | null {
        if (!data || data.byteLength < ProtoCodec.HEADER_PROTO_NAME_LEN + ProtoCodec.HEADER_BODY_LEN) {
            XDEBUGLOG.warn("接收失败，二进制包长度不足", data ? data.byteLength : 0);
            return null;
        }

        const bytes = new Uint8Array(data);
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

        let offset = 0;
        const protoNameByteLen = view.getUint16(offset, false);
        offset += ProtoCodec.HEADER_PROTO_NAME_LEN;

        if (bytes.byteLength < offset + protoNameByteLen + ProtoCodec.HEADER_BODY_LEN) {
            XDEBUGLOG.warn("接收失败，协议名长度非法", protoNameByteLen, `包总长=${bytes.byteLength}`);
            return null;
        }

        const protoName = this.decodeProtoName(bytes.subarray(offset, offset + protoNameByteLen));
        offset += protoNameByteLen;

        const bodyLen = view.getUint32(offset, false);
        offset += ProtoCodec.HEADER_BODY_LEN;

        if (bytes.byteLength < offset + bodyLen) {
            XDEBUGLOG.warn("接收失败，协议体长度非法", bodyLen, `包总长=${bytes.byteLength}`);
            return null;
        }

        const messageType = this.getMessageType(protoName as ProtoName);
        if (!messageType) {
            XDEBUGLOG.warn("接收失败，未找到协议类型", protoName);
            return null;
        }

        try {
            const bodyBytes = bytes.subarray(offset, offset + bodyLen);
            const decoded = messageType.decode(bodyBytes);
            const msg = messageType.toObject(decoded, {
                longs: Number,
                enums: Number,
                defaults: true,
            }) as ProtoDataMap[ProtoName];
            return {
                protoName: protoName as ProtoName,
                msg: this.stripFailedResponse(msg),
            };
        } catch (err) {
            XDEBUGLOG.error("接收失败，protobuf 解码异常", protoName, err);
            return null;
        }
    }

    /**
     * 通过协议名获取 protobuf 类型。
     * @param protoName 协议名
     * @returns protobuf 类型
     */
    private getMessageType(protoName: ProtoName): protobufNamespace.Type | null {
        if (!this._root) {
            XDEBUGLOG.error("protobuf 尚未初始化", protoName);
            return null;
        }
        return this._typeMap.get(protoName) || null;
    }

    /**
     * 裁剪失败响应字段。
     * @param msg 协议数据
     */
    private stripFailedResponse<T extends ProtoName>(msg: ProtoDataMap[T]): ProtoDataMap[T] {
        const record = msg as unknown as Record<string, unknown>;
        if (typeof record.code !== "number" || record.code === 0) {
            return msg;
        }
        return { code: record.code } as ProtoDataMap[T];
    }

    /**
     * 协议名编码为 ASCII 字节。
     * @param protoName 协议名
     * @returns 字节数组
     */
    private encodeProtoName(protoName: string): Uint8Array {
        const out = new Uint8Array(protoName.length);
        for (let i = 0; i < protoName.length; i++) {
            out[i] = protoName.charCodeAt(i) & 0xff;
        }
        return out;
    }

    /**
     * 协议名字节解码为字符串。
     * @param bytes 协议名字节
     * @returns 协议名
     */
    private decodeProtoName(bytes: Uint8Array): string {
        let text = "";
        for (let i = 0; i < bytes.length; i++) {
            text += String.fromCharCode(bytes[i]);
        }
        return text;
    }
}
