/*
*Author  : XW
*Desc    : LoginServerListPopView 结构绑定基类（手写维护，字段名需与 FGUI 包对应组件结构一致）
*/

import XWindow from "../../../../base/ui/XWindow";
import { UIPackage } from "../../../../fairyGUI/UIPackage";
import { UIADAPT_TYPE } from "../../../../base/ui/XComponent";
import { Controller } from "../../../../fairyGUI/Controller";
import { GButton } from "../../../../fairyGUI/GButton";
import { GComponent } from "../../../../fairyGUI/GComponent";
import { GList } from "../../../../fairyGUI/GList";
import { GTree } from "../../../../fairyGUI/GTree";

export default class ILoginServerListPopView extends XWindow {
    /** 空列表 / 非空列表 控制器 */
    protected ctrlState: Controller;
    /** 是否展示区段折叠列 */
    protected ctrlIsShowGroup: Controller;

    /** 顶部标题栏（含返回按钮） */
    protected topBar: GComponent;
    /** 左侧分类树：我的伺服器 / 所有分線 */
    protected kindTree: GTree;
    /** 右侧服务器卡片列表 */
    protected serverList: GList;
    /** 区段列表（与 kindTree 二选一） */
    protected groupList: GList;

    public onCreate() {
        super.onCreate();
        this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;
        this.view = UIPackage.createObject("login", "LoginServerListPop").asCom;
        this.addChild(this.view);
        this.initComponentByView(this.view);
        this.initControllerByView(this.view);
        this.ctrlState = this.view.getController("state");
        this.ctrlIsShowGroup = this.view.getController("isShowGroup");
    }
}
