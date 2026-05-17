
/**
*Author  : XW
*Desc    : 
*/

import { GComponent } from "../../fairyGUI/GComponent";
import { GLoader3D } from "../../fairyGUI/GLoader3D";
import { GObject } from "../../fairyGUI/GObject";
import { UIPackage } from "../../fairyGUI/UIPackage";
import { DragonBonesMgr } from "./DragonBonesMgr";
import { SpineMgr } from "./SpineMgr";

export default class NodePoolMgr {

    private _poolMap: { [key: string]: GObject[] };

    private static _inst: NodePoolMgr
    public static get inst(): NodePoolMgr {
        if (!this._inst) {
            this._inst = new NodePoolMgr();
        }
        return this._inst;
    }

    public constructor() {
        this.clear();
        this._poolMap = {}
    }

    /**
     * 获取节点池中的对象
     * @param key 节点池key标记
     * @param packName 包名
     * @param comName 组件名
     * @param userClass 绑定的类
     */
    public get(key: string, packName: string, comName: string, userClass?: new () => GObject): GObject {
        if (!this._poolMap[key]) this._poolMap[key] = [];
        let pool = this._poolMap[key];
        let obj: GObject;
        if (pool.length == 0) {
            if (packName && comName) {
                obj = UIPackage.createObject(packName, comName, userClass);
            } else {
                obj = new userClass();
            }
            obj.poolKey = key;
        } else {
            obj = pool.pop();
            obj.node.active = true;
        }
        return obj;
    }

    public put(obj: GComponent | GObject) {
        let poolKey: string = obj.poolKey;
        if (!poolKey) {
            obj.dispose();
            return;
        }
        let pool = this._poolMap[poolKey];
        //判断对象池存在
        if (pool && pool.indexOf(obj) == -1) {
            obj.node.active = false;
            //移除舞台
            obj.removeFromParent();
            //释放spine资源
            if (obj instanceof GLoader3D) {
                if (obj.spineUrl) {
                    SpineMgr.inst.releaseSpine(obj.spineUrl);
                    obj.spineUrl = undefined;
                }
                if(obj.dragonBonesUrl){
                    DragonBonesMgr.inst.releaseDragonBones(obj.dragonBonesUrl);
                    obj.dragonBonesUrl = undefined;
                }
            }
            //存放对象
            pool.push(obj);
        }
    }

    public clearPool(key: string) {
        if (!this._poolMap) return;
        let pool: GObject[] = this._poolMap[key];
        if (!pool) return;
        pool.forEach(com => {
            com.dispose();
        })
        delete this._poolMap[key];
    }

    public clear(): void {
        if (this._poolMap) {
            for (let key in this._poolMap) {
                let pool: GObject[] = this._poolMap[key];
                pool.forEach(com => {
                    com.dispose();
                })
            }
            this._poolMap = {};
        }
    }
}

window["NodePoolMgr"] = NodePoolMgr;