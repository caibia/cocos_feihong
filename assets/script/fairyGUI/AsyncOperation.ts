import { Component, director, game, Node } from "cc";
import { PackageItemType, ObjectType } from "./FieldTypes";
import { GComponent } from "./GComponent";
import { GList } from "./GList";
import { constructingDepth, GObject } from "./GObject";
import { PackageItem } from "./PackageItem";
import { UIConfig } from "./UIConfig";
import { UIObjectFactory } from "./UIObjectFactory";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 异步构建器，负责分帧创建包内对象并在完成后回调结果。
 */
export class AsyncOperation {
    /**
     * 异步构建完成后的回调函数。
     */
    public callback: (obj: GObject) => void;

    /**
     * 承载异步构建流程的临时根节点。
     */
    private _node: Node;

    /**
     * 创建指定包资源对应的对象实例。
     * @param pkgName 包名称。
     * @param resName 资源名称。
     */
    public createObject(pkgName: string, resName: string): void {
        if (this._node)
            throw 'Already running';

        var pkg: UIPackage = UIPackage.getByName(pkgName);
        if (pkg) {
            var pi: PackageItem = pkg.getItemByName(resName);
            if (!pi)
                throw new Error("resource not found: " + resName);

            this.internalCreateObject(pi);
        }
        else
            throw new Error("package not found: " + pkgName);
    }

    /**
     * 根据 URL 创建对象实例。
     * @param url FairyGUI 资源 URL。
     */
    public createObjectFromURL(url: string): void {
        if (this._node)
            throw 'Already running';

        var pi: PackageItem = UIPackage.getItemByURL(url);
        if (pi)
            this.internalCreateObject(pi);
        else
            throw new Error("resource not found: " + url);
    }

    /**
     * 取消当前进行中的流程或状态。
     */
    public cancel(): void {
        if (this._node) {
            this._node.destroy();
            this._node = null;
        }
    }

    /**
     * 执行内部对象构建流程。
     * @param item 要构建的包资源项。
     */
    private internalCreateObject(item: PackageItem): void {
        this._node = new Node("[AsyncCreating:" + item.name + "]");
        game.addPersistRootNode(this._node);
        this._node.on("#", this.completed, this);
        this._node.addComponent(AsyncOperationRunner).init(item);
    }

    /**
     * 处理异步构建完成后的回调流程。
     * @param result 异步构建得到的目标对象。
     */
    private completed(result: GObject): void {
        this.cancel();

        if (this.callback)
            this.callback(result);
    }
}

class AsyncOperationRunner extends Component {

    /**
     * 异步构建流程中待处理的显示列表项数组。
     */
    private _itemList: Array<DisplayListItem>;
    /**
     * 异步构建过程中复用的对象池数组。
     */
    private _objectPool: Array<GObject>;
    /**
     * 当前处理到的索引位置。
     */
    private _index: number;

    /**
     * 初始化异步构建运行器的显示列表缓存和临时对象池。
     */
    public constructor() {
        super();

        this._itemList = new Array<DisplayListItem>();
        this._objectPool = new Array<GObject>();
    }

    /**
     * 根据根资源项预展开整棵待构建显示列表，准备后续分帧创建。
     * @param item 根包资源项。
     */
    public init(item: PackageItem): void {
        this._itemList.length = 0;
        this._objectPool.length = 0;

        var di: DisplayListItem = { pi: item, type: item.objectType };
        di.childCount = this.collectComponentChildren(item);
        this._itemList.push(di);

        this._index = 0;
    }

    /**
     * 组件销毁时清空未完成构建的临时对象，避免中途中断后泄漏。
     */
    protected onDestroy(): void {
        this._itemList.length = 0;
        var cnt: number = this._objectPool.length;
        if (cnt > 0) {
            for (var i: number = 0; i < cnt; i++)
                this._objectPool[i].dispose();
            this._objectPool.length = 0;
        }
    }

    /**
     * 递归收集组件资源内的子显示列表项，并返回直接子节点数量。
     * @param item 目标组件资源项。
     * @returns 直接子节点数量。
     */
    private collectComponentChildren(item: PackageItem): number {
        var buffer: ByteBuffer = item.rawData;
        buffer.seek(0, 2);

        var di: DisplayListItem;
        var pi: PackageItem;
        var i: number;
        var dataLen: number;
        var curPos: number;
        var pkg: UIPackage;

        var dcnt: number = buffer.readShort();
        for (i = 0; i < dcnt; i++) {
            dataLen = buffer.readShort();
            curPos = buffer.position;

            buffer.seek(curPos, 0);

            var type: number = buffer.readByte();
            var src: string = buffer.readS();
            var pkgId: string = buffer.readS();

            buffer.position = curPos;

            if (src != null) {
                if (pkgId != null)
                    pkg = UIPackage.getById(pkgId);
                else
                    pkg = item.owner;

                pi = pkg != null ? pkg.getItemById(src) : null;
                di = { pi: pi, type: type };

                if (pi && pi.type == PackageItemType.Component)
                    di.childCount = this.collectComponentChildren(pi);
            }
            else {
                di = { type: type };
                if (type == ObjectType.List) //list
                    di.listItemCount = this.collectListChildren(buffer);
            }

            this._itemList.push(di);
            buffer.position = curPos + dataLen;
        }

        return dcnt;
    }

    /**
     * 收集列表模板中声明的默认子项资源，并返回可预建的列表项数量。
     * @param buffer 当前列表配置缓冲区。
     * @returns 可预建的列表项数量。
     */
    private collectListChildren(buffer: ByteBuffer): number {
        buffer.seek(buffer.position, 8);

        var listItemCount: number = 0;
        var i: number;
        var nextPos: number;
        var url: string;
        var pi: PackageItem;
        var di: DisplayListItem;
        var defaultItem: string = buffer.readS();
        var itemCount: number = buffer.readShort();

        for (i = 0; i < itemCount; i++) {
            nextPos = buffer.readShort();
            nextPos += buffer.position;

            url = buffer.readS();
            if (url == null)
                url = defaultItem;
            if (url) {
                pi = UIPackage.getItemByURL(url);
                if (pi) {
                    di = { pi: pi, type: pi.objectType };
                    if (pi.type == PackageItemType.Component)
                        di.childCount = this.collectComponentChildren(pi);

                    this._itemList.push(di);
                    listItemCount++;
                }
            }
            buffer.position = nextPos;
        }

        return listItemCount;
    }

    /**
     * 分帧执行对象构建；每次在预算时间内尽量多创建几个节点，直到全部完成。
     */
    protected update(): void {
        var obj: GObject;
        var di: DisplayListItem;
        var poolStart: number;
        var k: number;
        var t: number = game.totalTime / 1000;
        var frameTime: number = UIConfig.frameTimeForAsyncUIConstruction;
        var totalItems: number = this._itemList.length;

        while (this._index < totalItems) {
            di = this._itemList[this._index];
            if (di.pi) {
                obj = UIObjectFactory.newObject(di.pi);
                this._objectPool.push(obj);

                constructingDepth.n++;
                if (di.pi.type == PackageItemType.Component) {
                    poolStart = this._objectPool.length - di.childCount - 1;

                    (<GComponent>obj).constructFromResource2(this._objectPool, poolStart);

                    this._objectPool.splice(poolStart, di.childCount);
                }
                else {
                    obj.constructFromResource();
                }
                constructingDepth.n--;
            }
            else {
                obj = UIObjectFactory.newObject(di.type);
                this._objectPool.push(obj);

                if (di.type == ObjectType.List && di.listItemCount > 0) {
                    poolStart = this._objectPool.length - di.listItemCount - 1;

                    for (k = 0; k < di.listItemCount; k++) //把他们都放到pool里，这样GList在创建时就不需要创建对象了
                        (<GList>obj).itemPool.returnObject(this._objectPool[k + poolStart]);

                    this._objectPool.splice(poolStart, di.listItemCount);
                }
            }

            this._index++;
            if ((this._index % 5 == 0) && game.totalTime / 1000 - t >= frameTime)
                return;
        }

        var result: GObject = this._objectPool[0];
        this._itemList.length = 0;
        this._objectPool.length = 0;

        this.node.emit("#", result);
    }
}

interface DisplayListItem {
    /**
     * 当前显示列表项的对象类型。
     */
    type: ObjectType;
    /**
     * 关联的包资源项引用。
     */
    pi?: PackageItem;
    /**
     * 当前项直接子对象数量。
     */
    childCount?: number;
    /**
     * 当前项关联的列表模板项数量。
     */
    listItemCount?: number;
}
