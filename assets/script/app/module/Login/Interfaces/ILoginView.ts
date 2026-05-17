/** This is an automatically generated class by FairyGUI. Please do not modify it. **/

import XWindow from "../../../../base/ui/XWindow";
import { UIPackage } from "../../../../fairyGUI/UIPackage";
import { UIADAPT_TYPE } from "../../../../base/ui/XComponent";
import { Controller } from "../../../../fairyGUI/Controller";
import { GButton } from "../../../../fairyGUI/GButton";
import { GComponent } from "../../../../fairyGUI/GComponent";
import { GLoader } from "../../../../fairyGUI/GLoader";
import { GTextField } from "../../../../fairyGUI/GTextField";
import { GTextInput } from "../../../../fairyGUI/GTextInput";

export default class ILoginView extends XWindow {
	protected ctrl: Controller;
	protected spineCom: GComponent;
	protected loaderServerBg: GLoader;
	protected labServerTitle: GTextField;
	protected labServerName: GTextField;
	protected laoderStatus: GLoader;
	protected loaderInputBg: GLoader;
	protected labInputTitle: GTextField;
	protected inputAccount: GTextInput;
	protected btnEnterGame: GButton;
	protected btnNotice: GButton;
	protected btnDebug: GButton;

	public onCreate() {
		super.onCreate();
		this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;
		this.view = UIPackage.createObject("Login", "LoginView").asCom;
		this.addChild(this.view);
		this.initComponentByView(this.view);
		this.initControllerByView(this.view);
	}
}