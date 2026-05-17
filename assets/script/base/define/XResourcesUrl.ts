/**
*Author  : XW
*Desc    : 
*/

export class XResourcesUrl {

	/**公共包 */
	public static COM_PACKAGE = "0Common";
	/**公共的包合集 */
	public static RES_COMMON_PACKAGEARR = [XResourcesUrl.COM_PACKAGE];
	/**半透黑色背景图资源 */
	public static ALL_BLACK_IMGURL = `ui://${XResourcesUrl.COM_PACKAGE}/heidibg`;

	/**
	 * FGUI的包路径 
	 * @param pkgName 包名 Comom
	 * return ui://Comom/Comom
	*/
	public static getUIPackageUrl(pkgName: string): string {
		return `ui/${pkgName}/${pkgName}`;
	}

}