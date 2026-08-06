/**
 *Author  : XW
 *Desc    : protobuf 二进制描述加载器
 */

import { BufferAsset } from "cc";
import * as protobufNamespace from "protobufjs";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import { XResConst } from "../define/XResConst";
import ResMgr from "../manager/ResMgr";
import { createRootFromProtoBin } from "./ProtoBinParser";

export default class ProtoBinLoader {
    /** protobuf root */
    private _root: protobufNamespace.Root | null = null;
    /** 加载任务 */
    private _loadPromise: Promise<protobufNamespace.Root> | null = null;

    private static _inst: ProtoBinLoader;
    public static get inst(): ProtoBinLoader {
        if (!this._inst) {
            this._inst = new ProtoBinLoader();
        }
        return this._inst;
    }

    /** 加载 protobuf root */
    public async loadRoot(): Promise<protobufNamespace.Root> {
        if (this._root) {
            return this._root;
        }
        if (this._loadPromise) {
            return this._loadPromise;
        }
        this._loadPromise = this.loadRootInternal();
        try {
            return await this._loadPromise;
        } catch (err) {
            this._loadPromise = null;
            throw err;
        }
    }

    /** 执行 protobuf root 加载 */
    private async loadRootInternal(): Promise<protobufNamespace.Root> {
        const owner = "ProtoBinLoader";
        const asset = await ResMgr.inst.loadRes(XResConst.PROTO_DESCRIPTOR, BufferAsset, owner);
        if (!asset) {
            XDEBUGLOG.error("protobuf 描述文件加载失败", XResConst.PROTO_DESCRIPTOR);
            throw new Error(`protobuf 描述文件加载失败: ${XResConst.PROTO_DESCRIPTOR}`);
        }
        try {
            this._root = createRootFromProtoBin(new Uint8Array(asset.buffer()));
            return this._root;
        } finally {
            ResMgr.inst.releaseRes(XResConst.PROTO_DESCRIPTOR, BufferAsset, owner);
        }
    }
}
