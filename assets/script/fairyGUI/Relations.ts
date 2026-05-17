import { GComponent } from "./GComponent";
import { GObject } from "./GObject";
import { RelationItem } from "./RelationItem";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 关联管理器，负责集中维护对象与目标之间的关系集合。
 */
export class Relations {
    /**
     * 所属宿主对象引用。
     */
    private _owner: GObject;
    /**
     * 关系项集合。
     */
    private _items: Array<RelationItem>;

    /**
     * 当前是否正处于关系回写处理中。
     */
    public handling: GObject | null;
    /**
     * 关系尺寸是否已标记为脏。
     */
    public sizeDirty: boolean = false;

    /**
     * 初始化关系集合，并记录所属对象引用。
     */
    public constructor(owner: GObject) {
        this._owner = owner;
        this._items = new Array<RelationItem>();
    }

    /**
     * 添加一条新的关系定义。
     * @param target 关系目标对象。
     * @param relationType 关系类型。
     * @param usePercent 是否按百分比处理。
     */
    public add(target: GObject, relationType: number, usePercent?: boolean): void {
        var length: number = this._items.length;
        for (var i: number = 0; i < length; i++) {
            var item: RelationItem = this._items[i];
            if (item.target == target) {
                item.add(relationType, usePercent);
                return;
            }
        }
        var newItem: RelationItem = new RelationItem(this._owner);
        newItem.target = target;
        newItem.add(relationType, usePercent);
        this._items.push(newItem);
    }

    /**
     * 移除一条关系定义。
     * @param target 关系目标对象。
     * @param relationType 关系类型。
     */
    public remove(target: GObject, relationType?: number): void {
        relationType = relationType || 0;
        var cnt: number = this._items.length;
        var i: number = 0;
        while (i < cnt) {
            var item: RelationItem = this._items[i];
            if (item.target == target) {
                item.remove(relationType);
                if (item.isEmpty) {
                    item.dispose();
                    this._items.splice(i, 1);
                    cnt--;
                }
                else
                    i++;
            }
            else
                i++;
        }
    }

    /**
     * 判断当前关联集合中是否包含指定目标和关系类型。
     */
    public contains(target: GObject): boolean {
        var length: number = this._items.length;
        for (var i: number = 0; i < length; i++) {
            var item: RelationItem = this._items[i];
            if (item.target == target)
                return true;
        }
        return false;
    }

    /**
     * 清除指定目标上的全部关系定义。
     * @param target 关系目标对象。
     */
    public clearFor(target: GObject): void {
        var cnt: number = this._items.length;
        var i: number = 0;
        while (i < cnt) {
            var item: RelationItem = this._items[i];
            if (item.target == target) {
                item.dispose();
                this._items.splice(i, 1);
                cnt--;
            }
            else
                i++;
        }
    }

    /**
     * 清空全部关系定义。
     */
    public clearAll(): void {
        var length: number = this._items.length;
        for (var i: number = 0; i < length; i++) {
            var item: RelationItem = this._items[i];
            item.dispose();
        }
        this._items.length = 0;
    }

    /**
     * 从目标对象拷贝当前所需的数据或配置。
     * @param source 源关系容器。
     */
    public copyFrom(source: Relations): void {
        this.clearAll();

        var arr: Array<RelationItem> = source._items;
        var length: number = arr.length;
        for (var i: number = 0; i < length; i++) {
            var ri: RelationItem = arr[i];
            var item: RelationItem = new RelationItem(this._owner);
            item.copyFrom(ri);
            this._items.push(item);
        }
    }

    /**
     * 释放全部关联项并清空内部集合。
     */
    public dispose(): void {
        this.clearAll();
    }

    /**
     * 响应宿主组件尺寸变化，并同步滚动面板布局。
     * @param dWidth 宽度变化量。
     * @param dHeight 高度变化量。
     * @param applyPivot 是否考虑枢轴补偿。
     */
    public onOwnerSizeChanged(dWidth: number, dHeight: number, applyPivot: boolean): void {
        if (this._items.length == 0)
            return;

        var length: number = this._items.length;
        for (var i: number = 0; i < length; i++) {
            var item: RelationItem = this._items[i];
            item.applyOnSelfResized(dWidth, dHeight, applyPivot);
        }
    }

    /**
     * 确保`RelationsSizeCorrect`已处于可用状态。
     */
    public ensureRelationsSizeCorrect(): void {
        if (this._items.length == 0)
            return;

        this.sizeDirty = false;
        var length: number = this._items.length;
        for (var i: number = 0; i < length; i++) {
            var item: RelationItem = this._items[i];
            item.target.ensureSizeCorrect();
        }
    }

    /**
     * 获取当前集合是否为空。
     */
    public get empty(): boolean {
        return this._items.length == 0;
    }

    /**
     * 根据序列化数据初始化当前对象配置。
     */
    public setup(buffer: ByteBuffer, parentToChild: boolean): void {
        var cnt: number = buffer.readByte();
        var target: GObject;
        for (var i: number = 0; i < cnt; i++) {
            var targetIndex: number = buffer.readShort();
            if (targetIndex == -1)
                target = this._owner.parent;
            else if (parentToChild)
                target = (<GComponent>this._owner).getChildAt(targetIndex);
            else
                target = this._owner.parent.getChildAt(targetIndex);

            var newItem: RelationItem = new RelationItem(this._owner);
            newItem.target = target;
            this._items.push(newItem);

            var cnt2: number = buffer.readByte();
            for (var j: number = 0; j < cnt2; j++) {
                var rt: number = buffer.readByte();
                var usePercent: boolean = buffer.readBool();
                newItem.internalAdd(rt, usePercent);
            }
        }
    }
}
