import { Node } from "cc";
import { Controller } from "./Controller";
import { FEvent as FUIEvent } from "./event/Event";
import { GComponent } from "./GComponent";
import { GList } from "./GList";
import { GObject } from "./GObject";
import { GTreeNode } from "./GTreeNode";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 树形列表组件，基于 GList 扩展节点展开、缩进和层级渲染逻辑。
 */
export class GTree extends GList {

    /**
     * 树节点渲染回调。
     */
    public treeNodeRender: (node: GTreeNode, obj: GComponent) => void;
    /**
     * 树节点展开/收起前的拦截回调。
     */
    public treeNodeWillExpand: (node: GTreeNode, expanded: boolean) => void;

    /**
     * 树节点缩进宽度。
     */
    private _indent: number;
    /**
     * 点击节点时的展开策略。
     */
    private _clickToExpand: number;
    /**
     * 树的根节点。
     */
    private _rootNode: GTreeNode;
    /**
     * 事件触发时记录的展开状态。
     */
    private _expandedStatusInEvt: boolean;

    /**
     * 初始化树组件默认根节点、缩进宽度和展开状态缓存。
     */
    constructor() {
        super();

        this._indent = 15;

        this._rootNode = new GTreeNode(true);
        this._rootNode._setTree(this);
        this._rootNode.expanded = true;
    }

    /**
     * 获取树的根节点。
     */
    public get rootNode(): GTreeNode {
        return this._rootNode;
    }

    /**
     * 获取树节点缩进宽度。
     */
    public get indent(): number {
        return this._indent;
    }

    /**
     * 设置树节点缩进宽度，并刷新已显示节点的位置。
     */
    public set indent(value: number) {
        this._indent = value;
    }

    /**
     * 获取当前点击到Expand。
     */
    public get clickToExpand(): number {
        return this._clickToExpand;
    }

    /**
     * 设置点击节点时是否直接切换展开状态。
     */
    public set clickToExpand(value: number) {
        this._clickToExpand = value;
    }

    /**
     * 获取当前选中的树节点。
     * @returns 当前选中的树节点；未命中时返回空值。
     */
    public getSelectedNode(): GTreeNode {
        if (this.selectedIndex != -1)
            return this.getChildAt(this.selectedIndex)._treeNode;
        else
            return null;
    }

    /**
     * 获取当前所有选中的树节点。
     * @param result 可选结果数组；传入时会复用该数组。
     * @returns 当前所有选中的树节点数组。
     */
    public getSelectedNodes(result?: Array<GTreeNode>): Array<GTreeNode> {
        if (!result)
            result = new Array<GTreeNode>();

        s_list.length = 0;
        super.getSelection(s_list);
        var cnt: number = s_list.length;
        var ret: Array<GTreeNode> = new Array<GTreeNode>();
        for (var i: number = 0; i < cnt; i++) {
            var node: GTreeNode = this.getChildAt(s_list[i])._treeNode;
            ret.push(node);
        }
        return ret;
    }

    /**
     * 处理当前对象的选择状态变更逻辑。
     * @param node 目标树节点。
     * @param scrollItToView 是否滚动到可视区域。
     */
    public selectNode(node: GTreeNode, scrollItToView?: boolean): void {
        var parentNode: GTreeNode = node.parent;
        while (parentNode && parentNode != this._rootNode) {
            parentNode.expanded = true;
            parentNode = parentNode.parent;
        }

        if (!node._cell)
            return;

        this.addSelection(this.getChildIndex(node._cell), scrollItToView);
    }

    /**
     * 取消指定树节点的选中状态。
     * @param node 目标树节点。
     */
    public unselectNode(node: GTreeNode): void {
        if (!node._cell)
            return;

        this.removeSelection(this.getChildIndex(node._cell));
    }

    /**
     * 展开当前树中的全部节点。
     * @param folderNode 可选起始文件夹节点。
     */
    public expandAll(folderNode?: GTreeNode): void {
        if (!folderNode)
            folderNode = this._rootNode;

        folderNode.expanded = true;
        var cnt: number = folderNode.numChildren;
        for (var i: number = 0; i < cnt; i++) {
            var node: GTreeNode = folderNode.getChildAt(i);
            if (node.isFolder)
                this.expandAll(node);
        }
    }

    /**
     * 收起当前树中的全部节点。
     * @param folderNode 可选起始文件夹节点。
     */
    public collapseAll(folderNode?: GTreeNode): void {
        if (!folderNode)
            folderNode = this._rootNode;

        if (folderNode != this._rootNode)
            folderNode.expanded = false;
        var cnt: number = folderNode.numChildren;
        for (var i: number = 0; i < cnt; i++) {
            var node: GTreeNode = folderNode.getChildAt(i);
            if (node.isFolder)
                this.collapseAll(node);
        }
    }

    /**
     * 为指定树节点创建显示单元。
     * @param node 目标树节点。
     */
    private createCell(node: GTreeNode): void {
        var child: GObject = this.getFromPool(node._resURL);
        if (!(child instanceof GComponent))
            throw new Error("cannot create tree node object.");

        child._treeNode = node;
        node._cell = child;

        var indentObj: GObject = child.getChild("indent");
        if (indentObj)
            indentObj.width = (node.level - 1) * this._indent;

        var cc: Controller;

        cc = child.getController("expanded");
        if (cc) {
            cc.on(FUIEvent.STATUS_CHANGED, this.__expandedStateChanged, this);
            cc.selectedIndex = node.expanded ? 1 : 0;
        }

        cc = child.getController("leaf");
        if (cc)
            cc.selectedIndex = node.isFolder ? 0 : 1;

        if (node.isFolder)
            node._cell.on(FUIEvent.TOUCH_BEGIN, this.__cellMouseDown, this);

        if (this.treeNodeRender)
            this.treeNodeRender(node, child);
    }

    /**
     * 在Inserted后刷新相关状态。
     */
    public _afterInserted(node: GTreeNode): void {
        if (!node._cell)
            this.createCell(node);

        var index: number = this.getInsertIndexForNode(node);
        this.addChildAt(node._cell, index);
        if (this.treeNodeRender)
            this.treeNodeRender(node, node._cell);

        if (node.isFolder && node.expanded)
            this.checkChildren(node, index);
    }

    /**
     * 获取Insert Index For Node。
     */
    private getInsertIndexForNode(node: GTreeNode): number {
        var prevNode: GTreeNode = node.getPrevSibling();
        if (prevNode == null)
            prevNode = node.parent;
        var insertIndex: number = this.getChildIndex(prevNode._cell) + 1;
        var myLevel: number = node.level;
        var cnt: number = this.numChildren;
        for (var i: number = insertIndex; i < cnt; i++) {
            var testNode: GTreeNode = this.getChildAt(i)._treeNode;
            if (testNode.level <= myLevel)
                break;

            insertIndex++;
        }

        return insertIndex;
    }

    /**
     * 在Removed后刷新相关状态。
     */
    public _afterRemoved(node: GTreeNode): void {
        this.removeNode(node);
    }

    /**
     * 在Expanded后刷新相关状态。
     */
    public _afterExpanded(node: GTreeNode): void {
        if (node == this._rootNode) {
            this.checkChildren(this._rootNode, 0);
            return;
        }

        if (this.treeNodeWillExpand != null)
            this.treeNodeWillExpand(node, true);

        if (node._cell == null)
            return;

        if (this.treeNodeRender)
            this.treeNodeRender(node, node._cell);

        var cc: Controller = node._cell.getController("expanded");
        if (cc)
            cc.selectedIndex = 1;

        if (node._cell.parent)
            this.checkChildren(node, this.getChildIndex(node._cell));
    }

    /**
     * 在Collapsed后刷新相关状态。
     */
    public _afterCollapsed(node: GTreeNode): void {
        if (node == this._rootNode) {
            this.checkChildren(this._rootNode, 0);
            return;
        }

        if (this.treeNodeWillExpand)
            this.treeNodeWillExpand(node, false);

        if (node._cell == null)
            return;

        if (this.treeNodeRender)
            this.treeNodeRender(node, node._cell);

        var cc: Controller = node._cell.getController("expanded");
        if (cc)
            cc.selectedIndex = 0;

        if (node._cell.parent)
            this.hideFolderNode(node);
    }

    /**
     * 在Moved后刷新相关状态。
     */
    public _afterMoved(node: GTreeNode): void {
        var startIndex: number = this.getChildIndex(node._cell);
        var endIndex: number;
        if (node.isFolder)
            endIndex = this.getFolderEndIndex(startIndex, node.level);
        else
            endIndex = startIndex + 1;
        var insertIndex: number = this.getInsertIndexForNode(node);
        var i: number;
        var cnt: number = endIndex - startIndex;
        var obj: GObject;
        if (insertIndex < startIndex) {
            for (i = 0; i < cnt; i++) {
                obj = this.getChildAt(startIndex + i);
                this.setChildIndex(obj, insertIndex + i);
            }
        }
        else {
            for (i = 0; i < cnt; i++) {
                obj = this.getChildAt(startIndex);
                this.setChildIndex(obj, insertIndex);
            }
        }
    }

    /**
     * 获取Folder End Index。
     */
    private getFolderEndIndex(startIndex: number, level: number): number {
        var cnt: number = this.numChildren;
        for (var i: number = startIndex + 1; i < cnt; i++) {
            var node: GTreeNode = this.getChildAt(i)._treeNode;
            if (node.level <= level)
                return i;
        }

        return cnt;
    }

    /**
     * 递归检查并挂载文件夹节点下应显示的可见子节点。
     * @param folderNode 目标文件夹节点。
     * @param index 当前插入索引。
     * @returns 处理后的最新索引。
     */
    private checkChildren(folderNode: GTreeNode, index: number): number {
        var cnt: number = folderNode.numChildren;
        for (var i: number = 0; i < cnt; i++) {
            index++;
            var node: GTreeNode = folderNode.getChildAt(i);
            if (node._cell == null)
                this.createCell(node);

            if (!node._cell.parent)
                this.addChildAt(node._cell, index);

            if (node.isFolder && node.expanded)
                index = this.checkChildren(node, index);
        }

        return index;
    }

    /**
     * 递归隐藏文件夹节点下的可见后代。
     * @param folderNode 目标文件夹节点。
     */
    private hideFolderNode(folderNode: GTreeNode): void {
        var cnt: number = folderNode.numChildren;
        for (var i: number = 0; i < cnt; i++) {
            var node: GTreeNode = folderNode.getChildAt(i);
            if (node._cell)
                this.removeChild(node._cell);
            if (node.isFolder && node.expanded)
                this.hideFolderNode(node);
        }
    }

    /**
     * 递归移除树节点及其关联显示单元。
     * @param node 目标树节点。
     */
    private removeNode(node: GTreeNode): void {
        if (node._cell) {
            if (node._cell.parent)
                this.removeChild(node._cell);
            this.returnToPool(node._cell);
            node._cell._treeNode = null;
            node._cell = null;
        }

        if (node.isFolder) {
            var cnt: number = node.numChildren;
            for (var i: number = 0; i < cnt; i++) {
                var node2: GTreeNode = node.getChildAt(i);
                this.removeNode(node2);
            }
        }
    }

    /**
     * 响应树节点单元格按下事件，记录展开状态。
     * @param evt 触摸开始事件对象。
     */
    private __cellMouseDown(evt: FUIEvent): void {
        var node: GTreeNode = GObject.cast(<Node>evt.currentTarget)._treeNode;
        this._expandedStatusInEvt = node.expanded;
    }

    /**
     * 响应展开控制器状态变化，并同步树节点展开状态。
     * @param cc 展开状态控制器。
     */
    private __expandedStateChanged(cc: Controller): void {
        var node: GTreeNode = cc.parent._treeNode;
        node.expanded = cc.selectedIndex == 1;
    }

    /**
     * 派发列表项级别的点击或交互事件。
     * @param item 目标列表项对象。
     * @param evt 交互事件对象。
     */
    protected dispatchItemEvent(item: GObject, evt: FUIEvent): void {
        if (this._clickToExpand != 0) {
            var node: GTreeNode = item._treeNode;
            if (node && this._expandedStatusInEvt == node.expanded) {
                if (this._clickToExpand == 2) {
                    //if (evt.clickCount == 2)
                    // node.expanded = !node.expanded;
                }
                else
                    node.expanded = !node.expanded;
            }
        }

        super.dispatchItemEvent(item, evt);
    }

    /**
     * 在对象加入父级前，从包数据中读取基础属性和默认状态。
     * @param buffer FairyGUI 二进制配置缓冲区。
     * @param beginPos 当前对象配置段在缓冲区中的起始位置。
     */
    public setup_beforeAdd(buffer: ByteBuffer, beginPos: number): void {
        super.setup_beforeAdd(buffer, beginPos);

        buffer.seek(beginPos, 9);

        this._indent = buffer.readInt();
        this._clickToExpand = buffer.readByte();
    }

    /**
     * 从包数据中读取列表项配置并逐项创建对象。
     * @param buffer FairyGUI 二进制配置缓冲区。
     */
    protected readItems(buffer: ByteBuffer): void {
        var cnt: number;
        var i: number;
        var nextPos: number;
        var str: string;
        var isFolder: boolean;
        var lastNode: GTreeNode;
        var level: number;
        var prevLevel: number = 0;

        cnt = buffer.readShort();
        for (i = 0; i < cnt; i++) {
            nextPos = buffer.readShort();
            nextPos += buffer.position;

            str = buffer.readS();
            if (str == null) {
                str = this.defaultItem;
                if (!str) {
                    buffer.position = nextPos;
                    continue;
                }
            }

            isFolder = buffer.readBool();
            level = buffer.readByte();

            var node: GTreeNode = new GTreeNode(isFolder, str);
            node.expanded = true;
            if (i == 0)
                this._rootNode.addChild(node);
            else {
                if (level > prevLevel)
                    lastNode.addChild(node);
                else if (level < prevLevel) {
                    for (var j: number = level; j <= prevLevel; j++)
                        lastNode = lastNode.parent;
                    lastNode.addChild(node);
                }
                else
                    lastNode.parent.addChild(node);
            }
            lastNode = node;
            prevLevel = level;

            this.setupItem(buffer, node.cell);

            buffer.position = nextPos;
        }
    }
}

var s_list: Array<number> = new Array<number>();
