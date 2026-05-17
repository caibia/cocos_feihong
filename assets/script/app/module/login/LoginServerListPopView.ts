/**
 * Author : XW
 * Desc   : 切換分線弹窗（本地单机版，由 LoginDB 驱动）
 */

import { Controller } from "../../../fairyGUI/Controller";
import { FEvent as FUIEvent } from "../../../fairyGUI/event/Event";
import { GButton } from "../../../fairyGUI/GButton";
import { GComponent } from "../../../fairyGUI/GComponent";
import { GTreeNode } from "../../../fairyGUI/GTreeNode";
import XDEBUGLOG from "../../../base/debug/XDEBUGLOG";
import AudioMgr from "../../../base/audio/AudioMgr";
import { OPEN_ANIMSTYLE } from "../../../base/ui/XWindow";
import LoginGroupCell from "./cells/LoginGroupCell";
import LoginServerCell from "./cells/LoginServerCell";
import LoginServerMyCell from "./cells/LoginServerMyCell";
import ILoginServerListPopView from "./interfaces/ILoginServerListPopView";
import LoginDB from "../../data/LoginDB";
import { IServerInfo } from "../../../../../dts/repo/login/IServerListRepo";

/** 树节点 data 类型 */
type TreeData =
    | { kind: "my" }
    | { kind: "all" }
    | { kind: "group"; groupId: string };

/** 通用点击音效 */
const SFX_CLICK = "audio/ui/UI_Click_Small";
const SFX_OPEN = "audio/ui/UI_Page_Open_01";
const SFX_CLOSE = "audio/ui/UI_Page_Close_01";

export default class LoginServerListPopView extends ILoginServerListPopView {
    /** 当前显示的服务器列表（来自树选择） */
    private _curServers: IServerInfo[] = [];
    /** 当前选中的树节点 */
    private _curTreeData: TreeData | null = null;

    public getFairyPackageArr(): string[] {
        return ["login", "base_new", "base", "text_new", "icon"];
    }

    public onCreate(): void {
        super.onCreate();
        this.openAniStyle = OPEN_ANIMSTYLE.POPUP;
        this.showBack(true);
        AudioMgr.inst.playSound(SFX_OPEN);
        this.initTree();
        this.initServerList();
        XDEBUGLOG.debug("[LoginServerListPopView] onCreate");
    }

    public onRefresh(arg?: any): void {
        super.onRefresh(arg);
        this.buildTreeData();
        // 默认进入"我的伺服器"
        this.selectFirstTreeNode();
    }

    /** 初始化树（事件绑定） */
    private initTree(): void {
        if (!this.kindTree) return;
        this.kindTree.treeNodeRender = (node, obj) => {
            const data = node.data as TreeData;
            if (data?.kind === "my") {
                this.renderRootCell(obj, "我的伺服器", false);
            } else if (data?.kind === "all") {
                this.renderRootCell(obj, "所有分線", false);
            } else if (data?.kind === "group") {
                const group = LoginDB.inst.getGroups().find(g => g.id === data.groupId) || null;
                LoginGroupCell.update(obj, group);
            }
        };
        this.kindTree.on(FUIEvent.CLICK_ITEM, this.onClickTreeItem, this);
    }

    /** 渲染一级根节点（我的/全部） */
    private renderRootCell(cell: GComponent, title: string, isRecommend: boolean): void {
        if (!cell) return;
        (cell as GButton).title = title;
        const ctrl = cell.getController("isRecommend") as Controller;
        if (ctrl) ctrl.selectedIndex = isRecommend ? 1 : 0;
    }

    /** 初始化右侧服务器列表 */
    private initServerList(): void {
        if (!this.serverList) return;
        this.serverList.removeChildrenToPool();
        this.serverList.itemRenderer = this.renderServerItem.bind(this);
        this.serverList.on(FUIEvent.CLICK_ITEM, this.onClickServerItem, this);
    }

    /** 按当前选择渲染右侧 List 的某一行 */
    private renderServerItem(index: number, obj: any): void {
        const data = this._curServers[index];
        if (!data) return;
        if (this._curTreeData?.kind === "my") {
            LoginServerMyCell.update(obj as GComponent, data);
        } else {
            LoginServerCell.update(obj as GComponent, data);
        }
    }

    /** 构造树数据：我的 + 全部分线（含区段子节点） */
    private buildTreeData(): void {
        if (!this.kindTree) return;
        this.kindTree.rootNode.removeChildren();

        const myNode = new GTreeNode(false);
        myNode.data = { kind: "my" } as TreeData;
        this.kindTree.rootNode.addChild(myNode);

        const allNode = new GTreeNode(true);
        allNode.data = { kind: "all" } as TreeData;
        this.kindTree.rootNode.addChild(allNode);

        const groups = LoginDB.inst.getGroups();
        for (const g of groups) {
            const sub = new GTreeNode(false);
            sub.data = { kind: "group", groupId: g.id } as TreeData;
            allNode.addChild(sub);
        }
        allNode.expanded = true;
    }

    /** 默认选中"我的伺服器" */
    private selectFirstTreeNode(): void {
        if (!this.kindTree || this.kindTree.rootNode.numChildren === 0) return;
        const myNode = this.kindTree.rootNode.getChildAt(0);
        if (myNode) {
            this.kindTree.selectNode(myNode);
            this.refreshServerList({ kind: "my" });
        }
    }

    /** 树节点点击 */
    private onClickTreeItem(_evt: any, node: GTreeNode): void {
        if (!node || !node.data) return;
        AudioMgr.inst.playSound(SFX_CLICK);
        this.refreshServerList(node.data as TreeData);
    }

    /** 根据树节点 data 刷新右侧服务器列表 */
    private refreshServerList(data: TreeData): void {
        this._curTreeData = data;
        if (data.kind === "my") {
            this._curServers = LoginDB.inst.getMyServers();
        } else if (data.kind === "all") {
            this._curServers = [];
        } else if (data.kind === "group") {
            this._curServers = LoginDB.inst.getServersByGroup(data.groupId);
        }
        if (this.serverList) {
            this.serverList.numItems = this._curServers.length;
        }
        if (this.ctrlState) {
            this.ctrlState.selectedIndex = this._curServers.length > 0 ? 0 : 1;
        }
        XDEBUGLOG.debug("[LoginServerListPopView] 树选中", data, `count=${this._curServers.length}`);
    }

    /** 服务器条目点击 → 选服并关闭弹窗 */
    private async onClickServerItem(_evt: any, obj: any): Promise<void> {
        const index = this.serverList.getChildIndex(obj);
        const data = this._curServers[index];
        if (!data) return;
        AudioMgr.inst.playSound(SFX_CLICK);
        await LoginDB.inst.setCurServer(data.id);
        XDEBUGLOG.debug("[LoginServerListPopView] 选中服务器", data.id, data.name);
        this.onClickClose();
    }

    public async onHideAni(): Promise<void> {
        AudioMgr.inst.playSound(SFX_CLOSE);
        await super.onHideAni();
    }
}
