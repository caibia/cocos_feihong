/**
 * 该文件由 extensions/proto/export-proto.js 自动生成。
 * 请勿手动修改。
 */

import { ProtName } from "./ProtoDefine";

/** protobuf 反射结构 */
export const PROTO_SCHEMA_JSON = {
    "nested": {
        "C2SLogin": {
            "fields": {
                "account": {
                    "type": "string",
                    "id": 1
                }
            }
        },
        "S2CLogin": {
            "fields": {
                "code": {
                    "type": "uint32",
                    "id": 1
                },
                "token": {
                    "type": "string",
                    "id": 2
                }
            }
        }
    }
} as const;

/** 协议名 -> protobuf 类型全名 */
export const PROTO_MESSAGE_NAME_MAP: Record<ProtName, string> = {
    [ProtName.C2S_LOGIN]: "C2SLogin",
    [ProtName.S2C_LOGIN]: "S2CLogin",
};
