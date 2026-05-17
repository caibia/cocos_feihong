
/**
*Author  : XW
*Desc    : 
*/

import { UIADAPT_TYPE } from "../../../base/ui/XComponent";
import XWindow, { OPEN_ANIMSTYLE } from "../../../base/ui/XWindow";
import { UIPackage } from "../../../fairyGUI/UIPackage";

export default class LoadingView extends XWindow {

    /**本界面依赖的fgui包 */
    public getFairyPackageArr(): string[] {
        return ['Loading'];
    }

    public onCreate() {
        super.onCreate();

        /**界面打开效果 */
        this.openAniStyle = OPEN_ANIMSTYLE.NONE
        this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;

        this.view = UIPackage.createObject('Loading', 'LoadingView').asCom;
        this.addChild(this.view);
        this.initComponentByView(this.view);
    }

    public onRefresh(arg?: any) {
        super.onRefresh(arg);
    }

}

window["LoadingView"] = LoadingView;