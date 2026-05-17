/** This is an automatically generated class by FairyGUI. Please do not modify it. **/

import XWindow from "../../../../base/ui/XWindow";
import { UIPackage } from "../../../../fairyGUI/UIPackage";
import { UIADAPT_TYPE } from "../../../../base/ui/XComponent";
import { GLoader } from "../../../../fairyGUI/GLoader";
import { GProgressBar } from "../../../../fairyGUI/GProgressBar";
import { GTextField } from "../../../../fairyGUI/GTextField";

export default class IHotUpdateView extends XWindow {
	protected loaderBg: GLoader;
	protected loadingBar: GProgressBar;
	protected labBar: GTextField;
	protected labTip: GTextField;

	public onCreate() {
		super.onCreate();
		this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;
		this.view = UIPackage.createObject("HotUpdate", "HotUpdateView").asCom;
		this.addChild(this.view);
		this.initComponentByView(this.view);
		this.initControllerByView(this.view);
	}
}