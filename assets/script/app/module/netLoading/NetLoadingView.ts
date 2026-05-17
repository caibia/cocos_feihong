/**
*Author  : XW
*Desc    : 
*/

import { UIADAPT_TYPE } from "../../../base/ui/XComponent";
import XWindow, { OPEN_ANIMSTYLE } from "../../../base/ui/XWindow";
import { GLoader3D } from "../../../fairyGUI/GLoader3D";
import { UIPackage } from "../../../fairyGUI/UIPackage";

export default class NetLoadingView extends XWindow {

    private loadSpine: GLoader3D = null!;

    /**本界面依赖的fgui包 */
    public getFairyPackageArr(): string[] {
        return ['NetLoading'];
    }

    public onCreate() {
        super.onCreate();

        /**界面打开效果 */
        this.openAniStyle = OPEN_ANIMSTYLE.NONE
        this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;

        this.view = UIPackage.createObject('NetLoading', 'NetLoadingView').asCom;
        this.addChild(this.view);
        /**半透黑色背景 */
        this.showBack(false);

        this.initComponentByView(this.view);
    }

    public onRefresh(arg?: any) {
        super.onRefresh(arg);
        let url = "spine/ui/UI_13/UI_13";
        this.spineUnit.play(url, null, null, null, this.loadSpine, "A01");
    }

}
