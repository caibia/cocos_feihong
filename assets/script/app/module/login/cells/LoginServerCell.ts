import { Controller } from "../../../../fairyGUI/Controller";
import { GComponent } from "../../../../fairyGUI/GComponent";
import { GTextField } from "../../../../fairyGUI/GTextField";
import { IServerInfo } from "../../../../../../dts/repo/login/IServerListRepo";

/** 普通服务器卡片渲染器：服名 + 状态点（type 控制器） */
export default class LoginServerCell {
    /** 把一行数据写入 cell 节点 */
    public static update(cell: GComponent, data: IServerInfo): void {
        if (!cell || !data) return;
        const txt = cell.getChild("serverIdTxt") as GTextField;
        if (txt) txt.text = data.name;
        const ctrl = cell.getController("type") as Controller;
        if (ctrl) ctrl.selectedIndex = data.state;
    }
}
