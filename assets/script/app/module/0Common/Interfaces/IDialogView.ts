/** This is an automatically generated class by FairyGUI. Please do not modify it. **/

import XWindow from "../../../../base/ui/XWindow";
import { UIPackage } from "../../../../fairyGUI/UIPackage";
import { UIADAPT_TYPE } from "../../../../base/ui/XComponent";
import { GButton } from "../../../../fairyGUI/GButton";
import { GTextField } from "../../../../fairyGUI/GTextField";

export default class IDialogView extends XWindow {
	protected labTitle: GTextField;
	protected labContent: GTextField;
	protected btnOk: GButton;
	protected btnCancel: GButton;

	public onCreate() {
		super.onCreate();
		this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;
		this.view = UIPackage.createObject("0Common", "DialogView").asCom;
		this.addChild(this.view);
		this.initComponentByView(this.view);
		this.initControllerByView(this.view);
	}
}