
/**
*Author  : XW
*Desc    : 
*/

import BaseData from "../data/BaseData";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import XConst from "../define/XConst";

export type ObserveFunc = {
    /**观察者回调 */
    obFunc: Function,
    /**回调对象 */
    obCallThis: any,
    /**回调参数 */
    obArgs: any[],
}

export default class ObserveMgr {

    private _observeFunMap: { [name: string]: ObserveFunc[] } = {};

    private static _inst: ObserveMgr
    public static get inst(): ObserveMgr {
        if (!this._inst) {
            this._inst = new ObserveMgr();
        }
        return this._inst;
    }

    constructor() {
        this._observeFunMap = {};
    }

    /**
     * 获取观察函数名称。
     * @param subFunc 被观察函数
     */
    private getObserveName(subFunc: Function): string {
        return subFunc ? (subFunc["_obName"] || subFunc.name || "") : "";
    }

    /**
     * 重写对象下的所有方法 函数名以post开头的才会被重写
     * @param complieObj 重写的类 
     * @param ex 函数名必须以post开头的
     */
    public reComplie(complieObj: BaseData, ex: string = "post"): void {
        let className: string = complieObj.constructor.name;
        if (!(complieObj instanceof BaseData)) {
            XDEBUGLOG.warn(`${className}未继承 BaseData`);
            return;
        }
        let _class = complieObj.constructor;
        let attrNameArr: string[] = Object.getOwnPropertyNames(_class);
        for (let i = 0; i < attrNameArr.length; i++) {
            let name = attrNameArr[i];
            this._reComplieFunction(_class, name, ex, true);
        }
        let protoClass = complieObj.constructor.prototype;
        attrNameArr = Object.getOwnPropertyNames(protoClass);
        for (let i = 0; i < attrNameArr.length; i++) {
            let name = attrNameArr[i];
            this._reComplieFunction(complieObj, name, ex);
        }
    }

    /**
     * 观察者订阅
     * @param subFunc 被观察函数
     * @param obFun 观察者回调
     * @param obCallThis this绑定
     * @param args 参数
     */
    public addObserve(subFunc: Function, obFunc: Function, obCallThis: any, ...args: any[]): void {
        if (!subFunc || !obFunc) return;
        let obName: string = this.getObserveName(subFunc);
        if (!obName) return;
        let funcs = this._observeFunMap[obName];
        if (!funcs) this._observeFunMap[obName] = funcs = [];
        let idx: number = this._getFuncExistIndex(funcs, obFunc, obCallThis);
        if (idx === -1) {
            funcs.push({ obFunc: obFunc, obCallThis: obCallThis, obArgs: args });
        }
    }

    /**
     * 取消订阅
     * @param subFunc 被观察函数
     * @param obFunc 观察者回调
     * @param obCallThis this绑定
     */
    public removeObserve(subFunc: Function, obFunc: Function, obCallThis: any): void {
        if (!subFunc || !obFunc) return;
        let obName: string = this.getObserveName(subFunc);
        if (!obName) return;
        let funcs = this._observeFunMap[obName];
        if (!funcs) return;
        let idx: number = this._getFuncExistIndex(funcs, obFunc, obCallThis);
        if (idx > -1) {
            funcs.splice(idx, 1);
        }
    }

    /**
     * 取消所有的订阅
     * @param obCallThis 观察着回调对象this
     */
    public removeAllObserve(obCallThis: any): void {
        for (let obName in this._observeFunMap) {
            let funcs = this._observeFunMap[obName];
            let func: ObserveFunc;
            let idx: number = funcs.length - 1;
            while (idx >= 0) {
                func = funcs[idx];
                if (func.obCallThis == obCallThis) {
                    funcs.splice(idx, 1);
                }
                idx--;
            }
        }
    }

    /**
     * obFun 在 funcs里是否存在
     * @param funcs 监听的函数合集
     * @param obFun 要监听的函数
     * @param obCallThis 要监听的函数对象 this
     */
    private _getFuncExistIndex(funcs: ObserveFunc[], obFun: Function, obCallThis: any): number {
        for (let i = 0, len = funcs.length; i < len; i++) {
            if (funcs[i].obCallThis == obCallThis && funcs[i].obFunc == obFun) {
                return i;
            }
        }
        return -1;
    }

    /** 寻找静态函数对应的父类 */
    private _findParent(cls: any, funcName: string): any {
        let parent = cls.prototype.constructor;
        let clsFunNames: string[] = Object.getOwnPropertyNames(parent);
        if (clsFunNames.indexOf(funcName) > -1) {
            return parent;
        } else {
            this._findParent(parent, funcName);
        }
    }

    private _getUIName(obCallThis: any) {
        let uiObj = obCallThis;
        let name = "";
        if (uiObj) {
            name = obCallThis.name || obCallThis._name || obCallThis.UINAME || obCallThis.toString();
        }
        if (uiObj.getParentUIName) {
            let _n = uiObj.getParentUIName() || uiObj.name;
            if (_n) {
                name = _n;
            } else {
                XDEBUGLOG.warn("没有找到对象的__UINAME__或name");
            }
        }
        return name;
    }

    /**
     * 重写观察者绑定的函数
     * @param callClass 函数所在类
     * @param funcName 函数名
     * @param ex 函数名头
     * @param isStatic 是否为静态函数
     */
    private _reComplieFunction(callClass: any, funcName: string, ex: string, isStatic?: boolean) {
        //funcName 不是 function 类型的 或者 不是以post开头的函数
        if (typeof callClass[funcName] !== "function" || funcName.indexOf(ex) === -1) return;
        //原始函数
        let baseFunc: Function = callClass[funcName];
        //这个静态 有可能是父类的静态 所以要找到父类 进行重写
        if (isStatic) {
            let clsFunNames: string[] = Object.getOwnPropertyNames(callClass)
            if (clsFunNames.indexOf(funcName) === -1) {
                callClass = this._findParent(callClass, funcName);
            }
        }
        if (callClass[funcName]["_obName"]) return;
        let observeName = `${callClass.constructor?.name || callClass.name || "Anonymous"}.${funcName}`;
        //重写函数 
        callClass[funcName] = (...arg: any) => {
            //调用原始函数
            let reArg = isStatic ? baseFunc(...arg) : baseFunc.apply(callClass, arg);
            //处理观察者绑定的函数
            if (reArg == XConst.OBSERVE_RETURN) return;
            let funcs = this._observeFunMap[observeName] || [];
            for (let fun of funcs) {
                if (fun.obCallThis["$_Pause"]) continue;
                let time1 = Date.now();
                fun.obFunc.apply(fun.obCallThis, [reArg, ...fun.obArgs]);
                let dt = Date.now() - time1;
                if (dt >= 2) {
                    let name = this._getUIName(fun.obCallThis);
                    let lag = dt >= 150 ? "耗时较高" : "";
                    XDEBUGLOG.warn(`${name}观察回调${funcName}耗时${dt}ms ${lag}`);
                }
            }
        }
        callClass[funcName]["_obName"] = observeName;
    }
}
