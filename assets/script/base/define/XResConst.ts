/**
 *Author  : XW
 *Desc    : 通用资源路径常量
 */

export class XResConst {
    /** 公共包包名 */
    public static COM_PACKAGE = "";
    /** 公共常驻包名列表 */
    public static RES_COMMON_PACKAGEARR: string[] = [];
    /** 半透黑色背景图资源地址 */
    public static ALL_BLACK_IMGURL = "";
    /** protobuf 二进制描述文件路径 */
    public static PROTO_DESCRIPTOR = "config/proto/proto";
    /** 音频资源集合 */
    public static AUDIO_MAP: { [name: string]: string } = {
        buttonClick: "audio/ui/UI_Click_Small",
    };

    /** 获取 FairyGUI 包资源地址 */
    public static getUIPackageUrl(pkgName: string): string {
        return `ui/${pkgName}/${pkgName}`;
    }
}
