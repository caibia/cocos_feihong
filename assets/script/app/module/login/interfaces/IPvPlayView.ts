/*
*Author  : XW
*Desc    : PvPlayView 结构绑定基类（手写维护，字段名需与 FGUI 包对应组件结构一致）
*/

import XWindow from "../../../../base/ui/XWindow";
import { UIPackage } from "../../../../fairyGUI/UIPackage";
import { UIADAPT_TYPE } from "../../../../base/ui/XComponent";
import { GButton } from "../../../../fairyGUI/GButton";
import { GGraph } from "../../../../fairyGUI/GGraph";

export default class IPvPlayView extends XWindow {
    /** 视频占位（主视频 + 字幕视频两层） */
    protected videoPlaceHolder: GGraph;
    /** 全屏触摸 */
    protected touchComp: GGraph;
    /** 右上跳过按钮 */
    protected skipBtn: GButton;

    public onCreate() {
        super.onCreate();
        this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;
        this.view = UIPackage.createObject("login", "PvPlayLayer").asCom;
        this.addChild(this.view);
        this.initComponentByView(this.view);
        this.initControllerByView(this.view);
    }
}
