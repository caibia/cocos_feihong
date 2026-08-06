/**
 * 该文件由 tools/proto/export-proto.js 自动生成。
 * 请勿手动修改。
 */

declare namespace IC2SProto {
    /** 登录请求 */
    interface ILogin {
        /** 帐号 */
        account: string;
    }
}

declare namespace IS2CProto {
    /** 登录响应 */
    interface ILogin {
        /** 返回码，0 表示成功 */
        code: number;
        /** 登录成功后的 token */
        token?: string;
    }
}
