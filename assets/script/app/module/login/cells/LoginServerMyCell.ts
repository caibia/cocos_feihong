import { Controller } from "../../../../fairyGUI/Controller";
import { GComponent } from "../../../../fairyGUI/GComponent";
import { GTextField } from "../../../../fairyGUI/GTextField";
import { IServerInfo } from "../../../../../../dts/repo/login/IServerListRepo";

/** 我的服务器卡片渲染器：服名 + 角色名 + 等级 + 状态点 */
export default class LoginServerMyCell {
    /** 把一行数据写入 cell 节点 */
    public static update(cell: GComponent, data: IServerInfo): void {
        if (!cell || !data) return;
        const txtName = cell.getChild("serverIdTxt") as GTextField;
        if (txtName) txtName.text = data.name;
        const txtUser = cell.getChild("userNameTxt") as GTextField;
        if (txtUser) txtUser.text = data.playerName || "";
        const txtLv = cell.getChild("levelTxt") as GTextField;
        if (txtLv) txtLv.text = data.level ? `Lv.${data.level}` : "";
        const ctrl = cell.getController("type") as Controller;
        if (ctrl) ctrl.selectedIndex = data.state;
        // 头像 iconId 留给后续接 icon 加载器：cell.getChild("serverIconComp")
    }
}
