import { GObject } from "./GObject";
import { UIPackage } from "./UIPackage";

/**
 * 对象池，负责缓存可复用的 GUI 对象并按资源地址取回实例。
 */
export class GObjectPool {
    /**
     * 对象池内部缓存数组。
     */
    private _pool: { [index: string]: Array<GObject> };
    /**
     * 当前对象池中的缓存对象数量。
     */
    private _count: number = 0;

    /**
     * 初始化对象池字典和计数状态。
     */
    public constructor() {
        this._pool = {};
    }

    /**
     * 清空对象池并释放池中所有缓存对象。
     */
    public clear(): void {
        for (var i1 in this._pool) {
            var arr: Array<GObject> = this._pool[i1];
            var cnt: number = arr.length;
            for (var i: number = 0; i < cnt; i++)
                arr[i].dispose();
        }
        this._pool = {};
        this._count = 0;
    }

    /**
     * 获取当前数量。
     */
    public get count(): number {
        return this._count;
    }

    /**
     * 从对象池中取出一个可复用对象；若池中为空则新建。
     * @param url 资源地址。
     * @returns 可复用的对象实例。
     */
    public getObject(url: string): GObject {
        url = UIPackage.normalizeURL(url);
        if (url == null)
            return null;

        var arr: Array<GObject> = this._pool[url];
        if (arr && arr.length) {
            this._count--;
            return arr.shift();
        }

        var child: GObject = UIPackage.createObjectFromURL(url);
        return child;
    }

    /**
     * 把对象归还到对象池中，等待后续复用。
     * @param obj 要归还的对象。
     */
    public returnObject(obj: GObject): void {
        var url: string = obj.resourceURL;
        if (!url)
            return;

        var arr: Array<GObject> = this._pool[url];
        if (arr == null) {
            arr = new Array<GObject>();
            this._pool[url] = arr;
        }

        this._count++;
        arr.push(obj);
    }
}
