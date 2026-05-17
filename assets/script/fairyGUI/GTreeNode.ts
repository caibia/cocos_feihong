import { GComponent } from "./GComponent";
import { GTree } from "./GTree";

/**
 * 树节点数据结构，负责维护父子关系、展开状态与关联显示对象。
 */
export class GTreeNode {
    /**
     * 节点绑定的业务数据；树组件本身不解释其内容，仅负责透传和保存。
     */
    public data?: any;

    /**
     * 当前父节点。
     */
    private _parent: GTreeNode;
    /**
     * 子节点列表。
     */
    private _children: Array<GTreeNode>;
    /**
     * 当前展开状态。
     */
    private _expanded: boolean;
    /**
     * 当前层级深度。
     */
    private _level: number = 0;
    /**
     * 当前所属树对象。
     */
    private _tree: GTree;

    /**
     * 当前节点对应的可视单元格对象；只有节点真正显示到树列表中时才会存在。
     */
    public _cell: GComponent;
    /**
     * 节点创建单元格时优先使用的资源模板地址。
     */
    public _resURL?: string;

    /**
     * 初始化树节点基础结构，并根据 `hasChild` 决定是否创建子节点数组。
     * @param hasChild 是否为可拥有子节点的文件夹节点。
     * @param resURL 可视单元格资源地址。
     */
    constructor(hasChild?: boolean, resURL?: string) {
        this._resURL = resURL;
        if (hasChild)
            this._children = new Array<GTreeNode>();
    }

    /**
     * 设置节点展开状态，并同步树列表显示。
     * @param value 是否展开。
     */
    public set expanded(value: boolean) {
        if (this._children == null)
            return;

        if (this._expanded != value) {
            this._expanded = value;
            if (this._tree) {
                if (this._expanded)
                    this._tree._afterExpanded(this);
                else
                    this._tree._afterCollapsed(this);
            }
        }
    }

    /**
     * 获取当前节点展开状态。
     */
    public get expanded(): boolean {
        return this._expanded;
    }

    /**
     * 判断当前节点是否为可拥有子节点的文件夹节点。
     */
    public get isFolder(): boolean {
        return this._children != null;
    }

    /**
     * 获取当前父节点。
     */
    public get parent(): GTreeNode {
        return this._parent;
    }

    /**
     * 获取当前节点文本；若节点尚未生成可视单元格，则返回 `null`。
     */
    public get text(): string | null {
        if (this._cell)
            return this._cell.text;
        else
            return null;
    }

    /**
     * 设置节点文本；若节点已有可视单元格，也会立即同步到单元格显示。
     * @param value 节点文本。
     */
    public set text(value: string | null) {
        if (this._cell)
            this._cell.text = value;
    }

    /**
     * 获取当前节点图标资源标识；若节点尚未生成可视单元格，则返回 `null`。
     */
    public get icon(): string | null {
        if (this._cell)
            return this._cell.icon;
        else
            return null;
    }

    /**
     * 设置图标资源标识，并同步到实际图标承载对象。
     * @param value 图标资源标识。
     */
    public set icon(value: string | null) {
        if (this._cell)
            this._cell.icon = value;
    }

    /**
     * 获取当前节点绑定的单元格对象。
     */
    public get cell(): GComponent {
        return this._cell;
    }

    /**
     * 获取当前节点层级深度。
     */
    public get level(): number {
        return this._level;
    }

    /**
     * 设置节点层级深度，并同步其子节点层级。
     * @param value 层级深度。
     */
    public _setLevel(value: number): void {
        this._level = value;
    }

    /**
     * 将子对象追加到当前组件末尾。
     * @param child 目标子节点。
     * @returns 添加后的子节点。
     */
    public addChild(child: GTreeNode): GTreeNode {
        this.addChildAt(child, this._children.length);
        return child;
    }

    /**
     * 将子对象插入到指定索引，并同步显示列表与边界状态。
     * @param child 目标子节点。
     * @param index 目标索引。
     * @returns 插入后的子节点。
     */
    public addChildAt(child: GTreeNode, index: number): GTreeNode {
        if (!child)
            throw new Error("child is null");

        var numChildren: number = this._children.length;

        if (index >= 0 && index <= numChildren) {
            if (child._parent == this) {
                this.setChildIndex(child, index);
            }
            else {
                if (child._parent)
                    child._parent.removeChild(child);

                var cnt: number = this._children.length;
                if (index == cnt)
                    this._children.push(child);
                else
                    this._children.splice(index, 0, child);

                child._parent = this;
                child._level = this._level + 1;
                child._setTree(this._tree);
                if (this._tree && this == this._tree.rootNode || this._cell && this._cell.parent && this._expanded)
                    this._tree._afterInserted(child);
            }

            return child;
        }
        else {
            throw new RangeError("Invalid child index");
        }
    }

    /**
     * 从当前组件中移除指定子对象。
     * @param child 目标子节点。
     * @returns 被移除的子节点。
     */
    public removeChild(child: GTreeNode): GTreeNode {
        var childIndex: number = this._children.indexOf(child);
        if (childIndex != -1) {
            this.removeChildAt(childIndex);
        }
        return child;
    }

    /**
     * 按索引移除子对象。
     * @param index 子节点索引。
     * @returns 被移除的子节点。
     */
    public removeChildAt(index: number): GTreeNode {
        if (index >= 0 && index < this.numChildren) {
            var child: GTreeNode = this._children[index];
            this._children.splice(index, 1);

            child._parent = null;
            if (this._tree) {
                child._setTree(null);
                this._tree._afterRemoved(child);
            }

            return child;
        }
        else {
            throw new Error("Invalid child index");
        }
    }

    /**
     * 批量移除指定范围内的子对象。
     * @param beginIndex 起始索引。
     * @param endIndex 结束索引。
     */
    public removeChildren(beginIndex?: number, endIndex?: number): void {
        beginIndex = beginIndex || 0;
        if (endIndex == null) endIndex = -1;
        if (endIndex < 0 || endIndex >= this.numChildren)
            endIndex = this.numChildren - 1;

        for (var i: number = beginIndex; i <= endIndex; ++i)
            this.removeChildAt(beginIndex);
    }

    /**
     * 按索引获取子节点。
     * @param index 子节点索引。
     * @returns 对应子节点。
     */
    public getChildAt(index: number): GTreeNode {
        if (index >= 0 && index < this.numChildren)
            return this._children[index];
        else
            throw new Error("Invalid child index");
    }

    /**
     * 获取子节点索引。
     * @param child 目标子节点。
     * @returns 对应索引；未命中时返回 `-1`。
     */
    public getChildIndex(child: GTreeNode): number {
        return this._children.indexOf(child);
    }

    /**
     * 获取前一个兄弟节点。
     * @returns 前一个兄弟节点；未命中时返回空值。
     */
    public getPrevSibling(): GTreeNode {
        if (this._parent == null)
            return null;

        var i: number = this._parent._children.indexOf(this);
        if (i <= 0)
            return null;

        return this._parent._children[i - 1];
    }

    /**
     * 获取后一个兄弟节点。
     * @returns 后一个兄弟节点；未命中时返回空值。
     */
    public getNextSibling(): GTreeNode {
        if (this._parent == null)
            return null;

        var i: number = this._parent._children.indexOf(this);
        if (i < 0 || i >= this._parent._children.length - 1)
            return null;

        return this._parent._children[i + 1];
    }

    /**
     * 调整子对象在当前组件中的显示顺序。
     * @param child 目标子节点。
     * @param index 目标索引。
     */
    public setChildIndex(child: GTreeNode, index: number): void {
        var oldIndex: number = this._children.indexOf(child);
        if (oldIndex == -1)
            throw new Error("Not a child of this container");

        var cnt: number = this._children.length;
        if (index < 0)
            index = 0;
        else if (index > cnt)
            index = cnt;

        if (oldIndex == index)
            return;

        this._children.splice(oldIndex, 1);
        this._children.splice(index, 0, child);
        if (this._tree && this == this._tree.rootNode || this._cell && this._cell.parent && this._expanded)
            this._tree._afterMoved(child);
    }

    /**
     * 交换两个子对象的位置。
     * @param child1 第一个子节点。
     * @param child2 第二个子节点。
     */
    public swapChildren(child1: GTreeNode, child2: GTreeNode): void {
        var index1: number = this._children.indexOf(child1);
        var index2: number = this._children.indexOf(child2);
        if (index1 == -1 || index2 == -1)
            throw new Error("Not a child of this container");
        this.swapChildrenAt(index1, index2);
    }

    /**
     * 按索引交换两个子对象的位置。
     * @param index1 第一个索引。
     * @param index2 第二个索引。
     */
    public swapChildrenAt(index1: number, index2: number): void {
        var child1: GTreeNode = this._children[index1];
        var child2: GTreeNode = this._children[index2];

        this.setChildIndex(child1, index2);
        this.setChildIndex(child2, index1);
    }

    /**
     * 获取当前子对象数量。
     */
    public get numChildren(): number {
        return this._children.length;
    }

    /**
     * 沿父链向上展开，直到根节点。
     */
    public expandToRoot(): void {
        var p: GTreeNode = this;
        while (p) {
            p.expanded = true;
            p = p.parent;
        }
    }

    /**
     * 获取当前节点所属树对象。
     */
    public get tree(): GTree {
        return this._tree;
    }

    /**
     * 把节点归属到指定树对象，并递归同步给全部后代。
     * @param value 目标树对象。
     */
    public _setTree(value: GTree): void {
        this._tree = value;
        if (this._tree && this._tree.treeNodeWillExpand && this._expanded)
            this._tree.treeNodeWillExpand(this, true);

        if (this._children) {
            var cnt: number = this._children.length;
            for (var i: number = 0; i < cnt; i++) {
                var node: GTreeNode = this._children[i];
                node._level = this._level + 1;
                node._setTree(value);
            }
        }
    }
}
