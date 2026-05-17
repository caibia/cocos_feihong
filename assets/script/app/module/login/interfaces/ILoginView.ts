/*
*Author  : XW
*Desc    : LoginView 结构绑定基类（手写维护，字段名需与 FGUI 包 login/LoginLayer 组件结构一致）
*/

import XWindow from "../../../../base/ui/XWindow";
import { UIPackage } from "../../../../fairyGUI/UIPackage";
import { UIADAPT_TYPE } from "../../../../base/ui/XComponent";
import { Transition } from "../../../../fairyGUI/Transition";
import { GButton } from "../../../../fairyGUI/GButton";
import { GGraph } from "../../../../fairyGUI/GGraph";
import { GLoader } from "../../../../fairyGUI/GLoader";
import { GTextField } from "../../../../fairyGUI/GTextField";

export default class ILoginView extends XWindow {
    /** 入场动画 */
    protected enterTransition: Transition;
    /** 待机循环动画 */
    protected loopTransition: Transition;

    /** 背景兜底图 Loader（视频未就绪时显示，视频通过 VideoUnit 叠加在 view 上覆盖此图） */
    protected bgComp: GLoader;
    /** 主 LOGO */
    protected logonImg: GLoader;
    /** 「点击进入游戏」按钮 */
    protected globalLoginComp: GButton;
    /** 当前服按钮（显示服名与状态） */
    protected serverBtn: GButton;
    /** 当前服整行触摸区（与按钮同义） */
    protected serverTouch: GGraph;
    /** 隐私协议复选框 */
    protected checkBtn: GButton;
    /** 协议描述文本 */
    protected agreementText1: GTextField;
    /** 协议整行触摸区 */
    protected selectTouch: GGraph;
    /** 重播 PV 按钮 */
    protected movieBtn: GButton;
    /** 音效开关按钮 */
    protected voiceBtn: GButton;
    /** 版本号文本 */
    protected versionTxt: GTextField;
    /** 版权文本（可空） */
    protected copyrightTxt: GTextField;
    /** 左上 SDK 角标（仅装饰） */
    protected Criware: GLoader;
    /** DEBUG 入口（仅 debug 构建可见） */
    protected btnDebug: GButton;

    public onCreate() {
        super.onCreate();
        this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;
        this.view = UIPackage.createObject("login", "LoginLayer").asCom;
        this.addChild(this.view);
        this.initComponentByView(this.view);
        this.initControllerByView(this.view);
        this.enterTransition = this.view.getTransition("enter");
        this.loopTransition = this.view.getTransition("loop");
    }
}
