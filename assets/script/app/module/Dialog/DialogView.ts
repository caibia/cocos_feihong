
/**
*Author  : XW
*Desc    : 
*/

import { XResourcesUrl } from "../../../base/define/XResourcesUrl";
import { UIADAPT_TYPE } from "../../../base/ui/XComponent";
import { OPEN_ANIMSTYLE } from "../../../base/ui/XWindow";
import { UIPackage } from "../../../fairyGUI/UIPackage";
import IDialogView from "../0Common/Interfaces/IDialogView";

export default class DialogView extends IDialogView {

    private mData: IUIArg.IDialogViewArg;

    public onCreate() {
        super.onCreate();

        /**界面打开效果 */
        this.openAniStyle = OPEN_ANIMSTYLE.POPUP;
        this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;

        this.view = UIPackage.createObject(XResourcesUrl.COM_PACKAGE, 'DialogView').asCom;
        this.addChild(this.view);
        /**半透黑色背景 true点击关闭 false阻止点击关闭 */
        this.showBack(false);

        this.initComponentByView(this.view);
    }

    public onRefresh(arg: IUIArg.IDialogViewArg) {
        super.onRefresh(arg);
        this.mData = arg;
        this.labTitle.text = arg.title;
        this.labContent.text = arg.content;
        this.btnOk.title = arg.okBtnText;
        this.btnCancel.title = arg.cancelBtnText;
        this.eventUnit.addClickEvent(this.btnOk, this.onClickOk, this);
        this.eventUnit.addClickEvent(this.btnCancel, this.onClickCancel, this);
    }

    private onClickOk() {
        this.mData.okFunc && this.mData.okFunc();
        this.onClickClose();
    }

    private onClickCancel() {
        this.mData.cancelFunc && this.mData.cancelFunc();
        this.onClickClose();
    }

}