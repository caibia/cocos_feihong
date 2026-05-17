import { Controller } from "../../../../fairyGUI/Controller";
import { GButton } from "../../../../fairyGUI/GButton";
import { GComponent } from "../../../../fairyGUI/GComponent";
import { IServerGroup } from "../../../../../../dts/repo/login/IServerListRepo";

/** 区段树节点渲染器：区段名 + 是否推荐 */
export default class LoginGroupCell {
    /** 把一行数据写入 cell 节点 */
    public static update(cell: GComponent, group: IServerGroup | null): void {
        if (!cell) return;
        (cell as GButton).title = group?.name || "";
        const ctrl = cell.getController("isRecommend") as Controller;
        if (ctrl) ctrl.selectedIndex = group?.isRecommend ? 1 : 0;
    }
}
