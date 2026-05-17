/**
 * 该文件由 extensions/proto/export-proto.js 自动生成。
 * 请勿手动修改。
 */

export const enum ProtName {
    /** 登录请求 */
    C2S_LOGIN = "C2S_LOGIN",
    /** 登录响应 */
    S2C_LOGIN = "S2C_LOGIN",
}

/** 协议数据映射 */
export interface ProtoDataMap {
    /** 登录请求 */
    [ProtName.C2S_LOGIN]: IC2SProto.ILogin;
    /** 登录响应 */
    [ProtName.S2C_LOGIN]: IS2CProto.ILogin;
}
