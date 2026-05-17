/*
*Author  : XW
*Desc    : 通用资源 url 与 FGUI 包路径工具
*/

export class XResourcesUrl {

    /** 公共包包名。0Common 已从 FGUI 工程移除，待新公共包就绪后改回 */
    // public static COM_PACKAGE = "0Common";
    public static COM_PACKAGE = "";
    /** 公共常驻包合集（不参与 ref 计数）。0Common 移除后暂为空 */
    // public static RES_COMMON_PACKAGEARR = [XResourcesUrl.COM_PACKAGE];
    public static RES_COMMON_PACKAGEARR: string[] = [];
    /** 半透黑色背景图资源。0Common 移除后暂为空 */
    // public static ALL_BLACK_IMGURL = `ui://${XResourcesUrl.COM_PACKAGE}/heidibg`;
    public static ALL_BLACK_IMGURL = "";

    /**
     * FGUI的包路径
     * @param pkgName 包名 Comom
     * return ui://Comom/Comom
    */
    public static getUIPackageUrl(pkgName: string): string {
        return `ui/${pkgName}/${pkgName}`;
    }

}
