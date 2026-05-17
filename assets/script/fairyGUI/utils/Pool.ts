/**
 * 通用对象池，负责按需创建、回收和复用普通对象实例。
 */
export class Pool<T extends Object>
{
    /**
     * 对象池内部缓存数组。
     */
    pool: Array<T> = [];
    /**
     * 对象借出时执行的初始化回调。
     */
    _init?: (arg0: T, ...argArray: any[]) => void;
    /**
     * 对象归还时执行的重置回调。
     */
    _reset?: (arg0: T) => void;
    /**
     * 对象构造函数。
     */
    _ct: new () => T;

    /**
     * 初始化通用对象池的创建函数和缓存容器。
     * @param type 对象构造函数。
     * @param init 对象借出时执行的初始化回调。
     * @param reset 对象归还时执行的重置回调。
     */
    public constructor(type: new () => T, init?: (arg0: T) => void, reset?: (arg0: T) => void) {
        this._init = init;
        this._reset = reset;
        this._ct = type;
    }

    /**
     * 从对象池中借出一个可复用实例。
     * @param argArray 透传给初始化回调的参数列表。
     * @returns 可用的对象实例。
     */
    public borrow(...argArray: any[]): T {
        let ret: T;
        if (this.pool.length > 0)
            ret = this.pool.pop();
        else
            ret = new this._ct();

        if (this._init)
            this._init(ret, ...argArray);

        return ret;
    }

    /**
     * 将实例归还到对象池中。
     * @param element 单个对象或对象数组。
     */
    public returns(element: T | Array<T>) {
        if (Array.isArray(element)) {
            let count = element.length;
            for (let i = 0; i < count; i++) {
                let element2 = element[i];
                if (this._reset)
                    this._reset(element2);
                this.pool.push(element2);
            }
            element.length = 0;
        }
        else {
            if (this._reset)
                this._reset(element);
            this.pool.push(element);
        }
    }
}
